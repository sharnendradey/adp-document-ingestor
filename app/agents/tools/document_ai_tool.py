import csv
import hashlib
import io
import logging
import os
import re
from html.parser import HTMLParser
from typing import Any, Dict, List, Optional

import openpyxl
import docx
import pypdf

try:
    import xlrd
except ImportError:
    xlrd = None

try:
    from google.cloud import documentai
except ImportError:
    documentai = None

from app.config import settings

logger = logging.getLogger("document_ai_tool")


class _GoogleDocAILayoutExtractor:
    """Extracts high-fidelity structural layouts via Google Cloud Document AI Layout Parser.
    Automatically parses headings, nested paragraphs, tables, lists, and strips boilerplate headers/footers.
    """
    _client = None

    @classmethod
    def get_client(cls, location: str = "us"):
        if cls._client is None and documentai is not None:
            endpoint = f"{location}-documentai.googleapis.com" if location != "global" else "documentai.googleapis.com"
            cls._client = documentai.DocumentProcessorServiceClient(
                client_options={"api_endpoint": endpoint}
            )
        return cls._client

    @classmethod
    def is_available(cls) -> bool:
        processor_id = settings.DOCAI_PROCESSOR_ID or os.getenv("DOCAI_PROCESSOR_ID")
        return bool(documentai is not None and processor_id)

    @classmethod
    def get_processor_name(cls) -> str:
        proc_id = settings.DOCAI_PROCESSOR_ID or os.getenv("DOCAI_PROCESSOR_ID", "")
        project_id = settings.GCP_PROJECT_ID or os.getenv("GCP_PROJECT_ID", "gemini-ai-apigee-security")
        loc = settings.DOCAI_LOCATION or os.getenv("DOCAI_LOCATION", "us")
        if proc_id.startswith("projects/"):
            return proc_id
        return f"projects/{project_id}/locations/{loc}/processors/{proc_id}"

    @classmethod
    def extract(cls, file_bytes: bytes, mime_type: str) -> Optional[Dict[str, Any]]:
        """Processes binary file through Document AI Layout Parser."""
        if not cls.is_available():
            return None

        # Check online page limit for PDF (Document AI synchronous online processing limits to 15 pages)
        if mime_type == "application/pdf":
            try:
                reader = pypdf.PdfReader(io.BytesIO(file_bytes))
                if len(reader.pages) > 15:
                    logger.info(f"PDF has {len(reader.pages)} pages (exceeds Document AI 15-page online limit). Falling back to fast visual extractor.")
                    return None
            except Exception:
                pass

        try:
            client = cls.get_client(settings.DOCAI_LOCATION or "us")
            processor_name = cls.get_processor_name()
            raw_document = documentai.RawDocument(content=file_bytes, mime_type=mime_type)
            request = documentai.ProcessRequest(name=processor_name, raw_document=raw_document)
            result = client.process_document(request=request)
            doc = result.document

            dl = getattr(doc, "document_layout", None)
            if not dl or not dl.blocks:
                return None

            blocks = []
            toc = []
            raw_text_parts = []
            current_heading = "Overview"

            def _parse_table(tb) -> str:
                t_lines = []
                if tb.header_rows:
                    for hr in tb.header_rows:
                        vals = []
                        for cell in hr.cells:
                            c_text = " ".join(b.text_block.text for b in cell.blocks if b.text_block and b.text_block.text)
                            vals.append(c_text.replace("\n", " ").strip())
                        if any(vals):
                            t_lines.append("[TABLE_ROW]: | " + " | ".join(vals) + " |")
                if tb.body_rows:
                    for br in tb.body_rows:
                        vals = []
                        for cell in br.cells:
                            c_text = " ".join(b.text_block.text for b in cell.blocks if b.text_block and b.text_block.text)
                            vals.append(c_text.replace("\n", " ").strip())
                        if any(vals):
                            t_lines.append("[TABLE_ROW]: | " + " | ".join(vals) + " |")
                return "\n".join(t_lines)

            def _process_layout_blocks(block_list, inherited_heading: str):
                nonlocal current_heading
                for blk in block_list:
                    tb = blk.text_block
                    if tb and tb.text:
                        b_type = tb.type_ or "paragraph"
                        b_text = tb.text.strip()
                        if not b_text:
                            continue
                        if b_type in ["header", "footer"]:
                            continue
                        if b_type.startswith("heading"):
                            current_heading = b_text
                            if b_text not in toc:
                                toc.append(b_text)
                            inherited_heading = b_text
                        else:
                            raw_text_parts.append(b_text)
                            blocks.append({
                                "heading": inherited_heading,
                                "text": b_text,
                                "type": "paragraph"
                            })
                        if tb.blocks:
                            _process_layout_blocks(tb.blocks, inherited_heading)

                    tbl = blk.table_block
                    if tbl:
                        t_str = _parse_table(tbl)
                        if t_str:
                            raw_text_parts.append(t_str)
                            blocks.append({
                                "heading": inherited_heading,
                                "text": t_str,
                                "type": "table"
                            })

            _process_layout_blocks(dl.blocks, current_heading)
            return {
                "blocks": blocks,
                "toc": toc if toc else ["Overview"],
                "raw_text": "\n\n".join(raw_text_parts)
            }
        except Exception as e:
            logger.warning(f"Google Cloud Document AI parsing encountered an issue: {e}. Falling back to visual layout extractor.")
            return None


class _HTMLLayoutExtractor(HTMLParser):
    def __init__(self):
        super().__init__()
        self.blocks = []
        self.current_heading = "Overview"
        self.current_text = []
        self.toc = []
        self.in_heading = False
        self.in_table = False
        self.table_row = []

    def handle_starttag(self, tag, attrs):
        if tag in ["h1", "h2", "h3", "h4"]:
            self._flush()
            self.in_heading = True
        elif tag == "table":
            self._flush()
            self.in_table = True
        elif tag == "tr":
            self.table_row = []
        elif tag == "span" and "phcmd" in dict(attrs).get("class", "").lower():
            self._flush()
            self.current_heading = "Procedural Steps"
            if "Procedural Steps" not in self.toc:
                self.toc.append("Procedural Steps")

    def handle_endtag(self, tag):
        if tag in ["h1", "h2", "h3", "h4"]:
            self.in_heading = False
            htxt = " ".join("".join(self.current_text).split())
            if htxt:
                self.current_heading = htxt
                if htxt not in self.toc:
                    self.toc.append(htxt)
            self.current_text = []
        elif tag == "tr" and self.in_table:
            row_str = " | ".join(self.table_row)
            if row_str.strip():
                self.blocks.append({
                    "heading": self.current_heading,
                    "text": f"[TABLE_ROW]: | {row_str} |",
                    "type": "table"
                })
            self.table_row = []
        elif tag == "table":
            self.in_table = False
        elif tag in ["p", "div", "li"]:
            self._flush()

    def handle_data(self, data):
        cleaned = data.strip()
        if cleaned:
            if self.in_table:
                self.table_row.append(cleaned)
            else:
                self.current_text.append(cleaned)

    def _flush(self):
        if self.current_text and not self.in_heading:
            txt = " ".join(self.current_text)
            if len(txt) > 10:
                self.blocks.append({
                    "heading": self.current_heading,
                    "text": txt,
                    "type": "paragraph"
                })
            self.current_text = []


class _XLSXLayoutExtractor:
    """Extracts Excel workbooks (.xlsx, .xls) across multiple sheets with layout awareness."""

    @staticmethod
    def extract(file_or_stream: Any, filename: str) -> Dict[str, Any]:
        blocks = []
        toc = []
        raw_text_parts = []

        if filename.lower().endswith(".xls") and xlrd is not None and not isinstance(file_or_stream, io.BytesIO):
            # Legacy Excel format via xlrd
            workbook = xlrd.open_workbook(file_or_stream)
            toc = workbook.sheet_names()
            for s_idx, sheet_name in enumerate(toc):
                sheet = workbook.sheet_by_name(sheet_name)
                for r_idx in range(sheet.nrows):
                    row_vals = [str(sheet.cell_value(r_idx, c_idx)).strip() for c_idx in range(sheet.ncols)]
                    row_vals = [v for v in row_vals if v]
                    if row_vals:
                        line = " | ".join(row_vals)
                        raw_text_parts.append(line)
                        blocks.append({
                            "heading": f"{sheet_name} (Row {r_idx + 1})",
                            "text": f"[TABLE_ROW]: | {line} |",
                            "type": "table"
                        })
            return {"blocks": blocks, "toc": toc, "raw_text": "\n".join(raw_text_parts)}

        wb = openpyxl.load_workbook(file_or_stream, data_only=True)
        toc = list(wb.sheetnames)

        for sheetname in wb.sheetnames:
            sheet = wb[sheetname]
            headers: List[str] = []
            rows = list(sheet.iter_rows(values_only=True))

            for r_idx, row in enumerate(rows):
                vals = [str(c).strip() for c in row if c is not None and str(c).strip()]
                if not vals:
                    continue

                # Check if this row is the column header row
                if any("faq" in v.lower() or "intent" in v.lower() or "transcript" in v.lower() for v in vals):
                    headers = [str(c).strip() if c is not None and str(c).strip() else f"Col_{i}" for i, c in enumerate(row)]
                    continue

                if headers:
                    row_dict = {
                        headers[i]: str(row[i]).strip()
                        for i in range(min(len(headers), len(row)))
                        if row[i] is not None and str(row[i]).strip()
                    }
                    faq = row_dict.get("FAQ", "")
                    intent = row_dict.get("Key Intent", "")
                    # Match transcript column (including ADP formula note)
                    transcript = ""
                    for k, v in row_dict.items():
                        if "transcript" in k.lower():
                            transcript = v
                            break
                    doc_id = row_dict.get("document_id", "")

                    passage_parts = [f"Worksheet: {sheetname}"]
                    if intent:
                        passage_parts.append(f"Business Intent: {intent}")
                    if faq:
                        passage_parts.append(f"Customer FAQ: {faq}")
                    if doc_id:
                        passage_parts.append(f"Call Source ID: {doc_id}")
                    if transcript:
                        passage_parts.append(f"\nCall Transcript Dialogue:\n{transcript}")

                    item_text = "\n".join(passage_parts)
                    raw_text_parts.append(item_text)

                    heading = f"{sheetname}: {faq or intent or f'Call Record {r_idx + 1}'}"
                    blocks.append({
                        "heading": heading,
                        "text": item_text,
                        "type": "dialogue" if transcript else "faq"
                    })
                else:
                    # General spreadsheet table row
                    line = " | ".join(vals)
                    raw_text_parts.append(line)
                    blocks.append({
                        "heading": f"{sheetname} Record {r_idx + 1}",
                        "text": f"[TABLE_ROW]: | {line} |",
                        "type": "table"
                    })

        return {"blocks": blocks, "toc": toc, "raw_text": "\n".join(raw_text_parts)}


class _DOCXLayoutExtractor:
    """Extracts Word documents (.docx) preserving structural headings and embedded tables."""

    @staticmethod
    def extract(file_or_stream: Any) -> Dict[str, Any]:
        doc = docx.Document(file_or_stream)
        blocks = []
        toc = []
        raw_text_parts = []
        current_heading = "Overview"
        current_text = []

        for p in doc.paragraphs:
            txt = p.text.strip()
            if not txt:
                continue

            # Identify structural headings (Heading styles or numbered sections like 1. , 2. )
            is_heading = (
                p.style.name.startswith("Heading") or
                (len(txt) < 90 and (txt.startswith(tuple(f"{i}." for i in range(1, 20))) or txt.isupper()))
            )

            if is_heading:
                if current_text:
                    p_text = " ".join(current_text)
                    raw_text_parts.append(p_text)
                    blocks.append({
                        "heading": current_heading,
                        "text": p_text,
                        "type": "paragraph"
                    })
                    current_text = []
                current_heading = txt
                if txt not in toc:
                    toc.append(txt)
            else:
                current_text.append(txt)

        if current_text:
            p_text = " ".join(current_text)
            raw_text_parts.append(p_text)
            blocks.append({
                "heading": current_heading,
                "text": p_text,
                "type": "paragraph"
            })

        # Process all embedded tables as intact tabular structures
        for t_idx, tbl in enumerate(doc.tables):
            rows_text = []
            for r in tbl.rows:
                cell_vals = [c.text.replace("\n", " ").strip() for c in r.cells]
                if any(cell_vals):
                    rows_text.append("[TABLE_ROW]: | " + " | ".join(cell_vals) + " |")
            if rows_text:
                table_content = "\n".join(rows_text)
                raw_text_parts.append(table_content)
                blocks.append({
                    "heading": f"Structural Matrix Table {t_idx + 1}",
                    "text": table_content,
                    "type": "table"
                })

        return {"blocks": blocks, "toc": toc if toc else ["Overview"], "raw_text": "\n\n".join(raw_text_parts)}


class _PDFLayoutExtractor:
    """Extracts PDF documents page-by-page, removing banners and extracting visual reading order."""

    @staticmethod
    def extract(file_or_stream: Any) -> Dict[str, Any]:
        reader = pypdf.PdfReader(file_or_stream)
        blocks = []
        toc = []
        raw_text_parts = []

        for p_idx, page in enumerate(reader.pages):
            text = page.extract_text()
            if not text or not text.strip():
                continue

            lines = [l.strip() for l in text.split("\n") if l.strip()]
            # Filter copyright and internal banner noise
            meaningful = [
                l for l in lines
                if not l.startswith("Copyright") and
                not l.startswith("ADP Business Use") and
                not l.startswith("Proprietary and Confidential") and
                len(l) > 3
            ]

            heading = meaningful[0][:80] if meaningful else f"Section Page {p_idx + 1}"
            if heading not in toc and len(heading) > 4:
                toc.append(heading)

            page_content = "\n".join(lines)
            raw_text_parts.append(page_content)

            blocks.append({
                "heading": f"Page {p_idx + 1}: {heading}",
                "text": page_content,
                "type": "page_section"
            })

        return {"blocks": blocks, "toc": toc if toc else ["Document Pages"], "raw_text": "\n\n".join(raw_text_parts)}


class _CSVLayoutExtractor:
    """Extracts CSV tabular files preserving row schema."""

    @staticmethod
    def extract(content: str) -> Dict[str, Any]:
        reader = csv.reader(io.StringIO(content))
        blocks = []
        headers = []
        raw_text_parts = []
        rows = list(reader)

        if rows:
            headers = rows[0]
            header_str = " | ".join(headers)
            table_rows = [f"[TABLE_ROW]: | {header_str} |"]
            for r_idx, r in enumerate(rows[1:]):
                if any(r):
                    line = " | ".join(r)
                    table_rows.append(f"[TABLE_ROW]: | {line} |")
                    raw_text_parts.append(line)
                    if len(table_rows) >= 50:
                        blocks.append({
                            "heading": f"Data Table (Rows {r_idx - len(table_rows) + 2} to {r_idx + 1})",
                            "text": "\n".join(table_rows),
                            "type": "table"
                        })
                        table_rows = [f"[TABLE_ROW]: | {header_str} |"]

            if len(table_rows) > 1:
                blocks.append({
                    "heading": f"Data Table (Batch Final)",
                    "text": "\n".join(table_rows),
                    "type": "table"
                })

        return {"blocks": blocks, "toc": ["Tabular Data"], "raw_text": "\n".join(raw_text_parts)}


class DocumentAILayoutTool:
    """Parses multi-format enterprise documents (.xlsx, .xls, .docx, .pdf, .html, .csv, .txt)
    into 2D visual layout trees, preserving tables, binding footnotes,
    and enforcing Vertex AI RAG Engine 768-token sliding window geometry (100 token overlap).
    """

    def __init__(self, chunk_size_tokens: int = 768, chunk_overlap_tokens: int = 100):
        self.chunk_size_tokens = chunk_size_tokens
        self.chunk_overlap_tokens = chunk_overlap_tokens
        # Conservative token-to-word ratio for text-embedding-004 (1 token ~= 0.75 words)
        self.max_words = int(chunk_size_tokens * 0.75)
        self.overlap_words = int(chunk_overlap_tokens * 0.75)

    def _slide_window_chunk(self, text: str) -> List[str]:
        """Applies 768-token sliding window with 100-token overlap to long narrative passages."""
        words = text.split()
        if len(words) <= self.max_words:
            return [text]

        passages = []
        start = 0
        step = max(1, self.max_words - self.overlap_words)
        while start < len(words):
            end = min(start + self.max_words, len(words))
            passage = " ".join(words[start:end])
            passages.append(passage)
            if end >= len(words):
                break
            start += step
        return passages

    def parse_file(self, file_path: str) -> Dict[str, Any]:
        """Parses any physical file on disk (.xlsx, .docx, .pdf, .html, .csv, .txt)."""
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File not found: {file_path}")

        filename = os.path.basename(file_path)
        ext = os.path.splitext(filename)[1].lower()

        # Compute authentic cryptographic SHA-256 of the raw file binary
        with open(file_path, "rb") as f:
            file_bytes = f.read()
        sha256 = hashlib.sha256(file_bytes).hexdigest()

        if ext in [".xlsx", ".xls"]:
            res = _XLSXLayoutExtractor.extract(file_path, filename)
            raw_blocks = res["blocks"]
            toc = res["toc"]
            raw_text = res["raw_text"]
        elif ext == ".docx":
            res = None
            if _GoogleDocAILayoutExtractor.is_available():
                res = _GoogleDocAILayoutExtractor.extract(
                    file_bytes,
                    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                )
            if res is None:
                res = _DOCXLayoutExtractor.extract(file_path)
            raw_blocks = res["blocks"]
            toc = res["toc"]
            raw_text = res["raw_text"]
        elif ext == ".pdf":
            res = None
            if _GoogleDocAILayoutExtractor.is_available():
                res = _GoogleDocAILayoutExtractor.extract(file_bytes, "application/pdf")
            if res is None:
                res = _PDFLayoutExtractor.extract(file_path)
            raw_blocks = res["blocks"]
            toc = res["toc"]
            raw_text = res["raw_text"]
        elif ext == ".csv":
            content_str = file_bytes.decode("utf-8", errors="ignore")
            res = _CSVLayoutExtractor.extract(content_str)
            raw_blocks = res["blocks"]
            toc = res["toc"]
            raw_text = res["raw_text"]
        elif ext in [".html", ".htm"]:
            content_str = file_bytes.decode("utf-8", errors="ignore")
            parser = _HTMLLayoutExtractor()
            parser.feed(content_str)
            parser._flush()
            raw_blocks = parser.blocks
            toc = parser.toc
            raw_text = content_str
        else:
            # Markdown / Plain text
            content_str = file_bytes.decode("utf-8", errors="ignore")
            return self.parse_document(content_str, filename)

        # Apply 768/100 token sliding window geometry to long blocks (preserving tables intact)
        final_chunks = []
        for blk in raw_blocks:
            if blk["type"] == "table" or len(blk["text"].split()) <= self.max_words:
                final_chunks.append(blk)
            else:
                slides = self._slide_window_chunk(blk["text"])
                for sub_idx, slide in enumerate(slides):
                    final_chunks.append({
                        "heading": f"{blk['heading']} (Part {sub_idx + 1})" if len(slides) > 1 else blk["heading"],
                        "text": slide,
                        "type": blk.get("type", "paragraph")
                    })

        return {
            "filename": filename,
            "file_path": file_path,
            "total_blocks": len(final_chunks),
            "layout_tree": final_chunks,
            "table_of_contents": toc if toc else ["Overview"],
            "document_hash": sha256,
            "raw_text_preview": raw_text[:2000] if raw_text else filename
        }

    def parse_document(
        self,
        raw_content: str,
        filename: str,
        file_path: Optional[str] = None,
        file_bytes: Optional[bytes] = None
    ) -> Dict[str, Any]:
        """Parses documents with multi-format layout dispatch.
        Preserves cell grids, reading order, and binds footnotes to parent rows.
        Applies 768/100 sliding token geometry to narrative sections while preserving tables intact.
        """
        # If file_path is provided and exists, use physical file parsing
        if file_path and os.path.exists(file_path):
            return self.parse_file(file_path)
        if os.path.exists(filename):
            return self.parse_file(filename)
        if raw_content and os.path.exists(raw_content):
            return self.parse_file(raw_content)

        ext = os.path.splitext(filename)[1].lower()

        # Handle binary formats if file_bytes provided
        if file_bytes is not None:
            stream = io.BytesIO(file_bytes)
            sha256 = hashlib.sha256(file_bytes).hexdigest()
            res = None
            if ext in [".pdf", ".docx"] and _GoogleDocAILayoutExtractor.is_available():
                mime = "application/pdf" if ext == ".pdf" else "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                res = _GoogleDocAILayoutExtractor.extract(file_bytes, mime)
            if res is None:
                if ext in [".xlsx", ".xls"]:
                    res = _XLSXLayoutExtractor.extract(stream, filename)
                elif ext == ".docx":
                    res = _DOCXLayoutExtractor.extract(stream)
                elif ext == ".pdf":
                    res = _PDFLayoutExtractor.extract(stream)
                else:
                    res = {"blocks": [], "toc": ["Overview"], "raw_text": ""}

            raw_blocks = res["blocks"]
            toc = res["toc"]
            final_chunks = []
            for blk in raw_blocks:
                if blk["type"] == "table" or len(blk["text"].split()) <= self.max_words:
                    final_chunks.append(blk)
                else:
                    slides = self._slide_window_chunk(blk["text"])
                    for sub_idx, slide in enumerate(slides):
                        final_chunks.append({
                            "heading": f"{blk['heading']} (Part {sub_idx + 1})" if len(slides) > 1 else blk["heading"],
                            "text": slide,
                            "type": blk.get("type", "paragraph")
                        })
            return {
                "filename": filename,
                "total_blocks": len(final_chunks),
                "layout_tree": final_chunks,
                "table_of_contents": toc if toc else ["Overview"],
                "document_hash": sha256,
                "raw_text_preview": res["raw_text"][:2000]
            }

        # CSV format
        if ext == ".csv":
            res = _CSVLayoutExtractor.extract(raw_content)
            raw_blocks = res["blocks"]
            toc = res["toc"]
        # HTML content
        elif "<html" in raw_content.lower() or "<body" in raw_content.lower() or "<h1" in raw_content.lower() or ext in [".html", ".htm"]:
            parser = _HTMLLayoutExtractor()
            parser.feed(raw_content)
            parser._flush()
            raw_blocks = parser.blocks
            toc = parser.toc
        else:
            # Markdown / Line-oriented text
            lines = [l.strip() for l in raw_content.split("\n") if l.strip()]
            raw_blocks = []
            current_block = []
            current_heading = "Overview"
            toc = []

            for line in lines:
                if line.startswith("#"):
                    if current_block:
                        raw_blocks.append({
                            "heading": current_heading,
                            "text": " ".join(current_block),
                            "type": "table" if any("[TABLE_ROW]" in s for s in current_block) else "paragraph"
                        })
                        current_block = []
                    current_heading = line.lstrip("#").strip()
                    if current_heading not in toc:
                        toc.append(current_heading)
                elif "|" in line:
                    current_block.append(f"[TABLE_ROW]: {line}")
                elif line.startswith("*") and ("note" in line.lower() or "see" in line.lower() or "footnote" in line.lower()):
                    if current_block:
                        current_block[-1] += f" [BOUND_FOOTNOTE: {line.lstrip('*').strip()}]"
                    else:
                        current_block.append(f"[BOUND_FOOTNOTE: {line.lstrip('*').strip()}]")
                else:
                    current_block.append(line)

            if current_block:
                raw_blocks.append({
                    "heading": current_heading,
                    "text": " ".join(current_block),
                    "type": "table" if any("[TABLE_ROW]" in s for s in current_block) else "paragraph"
                })

        # Apply 768/100 token sliding window to narrative blocks (keep tables intact)
        final_chunks = []
        for blk in raw_blocks:
            if blk["type"] == "table" or len(blk["text"].split()) <= self.max_words:
                final_chunks.append(blk)
            else:
                slides = self._slide_window_chunk(blk["text"])
                for sub_idx, slide in enumerate(slides):
                    final_chunks.append({
                        "heading": f"{blk['heading']} (Part {sub_idx + 1})" if len(slides) > 1 else blk["heading"],
                        "text": slide,
                        "type": blk.get("type", "paragraph")
                    })

        return {
            "filename": filename,
            "total_blocks": len(final_chunks),
            "layout_tree": final_chunks,
            "table_of_contents": toc if toc else ["Overview"],
            "document_hash": hashlib.sha256(raw_content.encode("utf-8")).hexdigest(),
            "raw_text_preview": raw_content[:2000]
        }


document_ai_tool = DocumentAILayoutTool()

