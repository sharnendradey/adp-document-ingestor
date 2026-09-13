"""Metadata Extraction Sub-Agent orchestrating the Two-Pass Ingestion Pipeline."""

import hashlib
import logging
import os
from typing import Any, Dict, List, Optional

from app.agents.prompts import METADATA_EXTRACTION_PROMPT
from app.agents.tools.document_ai_tool import document_ai_tool
from app.agents.tools.gemini_extraction_tool import gemini_extraction_tool
from app.agents.tools.verifyai_quarantine_tool import verifyai_tool
from app.services.vertex_embedding_service import embedding_service
from app.services.spanner_service import spanner_service
from app.models.dsrf_metadata import MacroDocumentMetadata, GovernedKnowledgeUnitPayload

logger = logging.getLogger("adp-questa.agent.extraction")


class MetadataExtractionAgent:
    """Orchestrates Two-Pass Layout & Semantic Schema Extraction."""

    def __init__(self):
        self.system_prompt = METADATA_EXTRACTION_PROMPT

    def process_file(
        self,
        file_path: str,
        source_system_id: str = "CLIENT_DATA_CORPUS",
        document_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Executes full Two-Pass extraction directly from any file on disk (.xlsx, .docx, .pdf, .html, .csv, .txt)
        and persists Macro Document to Parent Table (No Vectors) and Child Units to Child Table (With 768d Vectors).
        """
        logger.info(f"Starting Two-Pass File Extraction for {file_path}")
        layout_result = document_ai_tool.parse_file(file_path)
        filename = layout_result["filename"]
        preview_text = layout_result.get("preview_text", filename)
        toc = layout_result.get("table_of_contents", ["Overview"])

        macro_doc = gemini_extraction_tool.extract_macro_document(
            document_id=document_id or f"doc_{os.path.splitext(filename)[0]}",
            content=preview_text,
            source_system_id=source_system_id,
            table_of_contents=toc,
            document_title=os.path.splitext(filename)[0]
        )
        resolved_doc_id = macro_doc.document_id

        # Persist Document Entity to Spanner Parent Table (No Embeddings)
        spanner_service.insert_macro_document(macro_doc)

        # Pass 2: Layout-Aware Chunk Boundary & Revision-Aware Deduplication
        promoted_chunks: List[GovernedKnowledgeUnitPayload] = []
        quarantined_chunks: List[Dict[str, Any]] = []
        deduplicated_chunk_ids: List[str] = []
        new_blocks = []

        # Check existing chunks in Spanner for revision deduplication
        for idx, block in enumerate(layout_result["layout_tree"]):
            block_sha = hashlib.sha256(block["text"].encode("utf-8")).hexdigest()
            existing = spanner_service.find_chunk_by_hash(block_sha)
            if existing:
                # Unaltered chunk: Bind new document_id without re-embedding
                spanner_service.append_document_binding(existing["chunk_id"], resolved_doc_id)
                deduplicated_chunk_ids.append(existing["chunk_id"])
            else:
                new_blocks.append((idx, block))

        # Generate batch embeddings and Tri-View representations only for new/modified blocks
        if new_blocks:
            new_texts = [b["text"] for _, b in new_blocks]
            chunk_vectors = embedding_service.generate_embeddings_batch(new_texts)

            for i, (idx, block) in enumerate(new_blocks):
                chunk_payload = gemini_extraction_tool.extract_chunk_payload(
                    document_id=resolved_doc_id,
                    chunk_index=idx,
                    chunk_text=block["text"],
                    headings=[block["heading"]],
                    vector=chunk_vectors[i] if i < len(chunk_vectors) else None,
                    bound_document_ids=[resolved_doc_id]
                )

                # Layer 4 Quality Gate & Dual-Path Routing
                if chunk_payload.extraction_confidence >= 0.88 and chunk_payload.status == "ACTIVE":
                    promoted_chunks.append(chunk_payload)
                else:
                    incident = verifyai_tool.dispatch_quarantine_card(
                        chunk_id=chunk_payload.chunk_id,
                        document_id=resolved_doc_id,
                        reason="Extraction confidence below 0.88 threshold",
                        confidence_score=chunk_payload.extraction_confidence,
                        chunk_text=chunk_payload.chunk_text
                    )
                    quarantined_chunks.append(incident)

            # Batch persist promoted chunks to Spanner Child Table (With Vectors)
            if promoted_chunks:
                spanner_service.insert_knowledge_units(promoted_chunks)

        return {
            "document_id": resolved_doc_id,
            "document_title": macro_doc.document_title,
            "document_summary": macro_doc.document_summary,
            "table_of_contents": macro_doc.table_of_contents,
            "search_keywords": macro_doc.search_keywords,
            "raw_content_sha256": macro_doc.raw_content_sha256,
            "macro_taxonomy": {
                "domain": macro_doc.canonical_dsrf_domain.value,
                "domain_path": macro_doc.domain_path,
                "business_unit": macro_doc.business_unit.value,
                "product_family": [p.value for p in macro_doc.adp_product_family],
                "source_reference": macro_doc.source_reference
            },
            "total_blocks_parsed": len(layout_result["layout_tree"]),
            "deduplicated_count": len(deduplicated_chunk_ids),
            "promoted_count": len(promoted_chunks),
            "quarantined_count": len(quarantined_chunks),
            "quarantined_incidents": quarantined_chunks
        }

    def process_document(
        self,
        document_id: str,
        raw_text: str,
        filename: str,
        source_system_id: str = "EKM_CORE"
    ) -> Dict[str, Any]:
        """Executes full extraction lifecycle from raw text or file path to Spanner persistence."""
        # If raw_text or filename is an existing file on disk, route through process_file
        if os.path.exists(raw_text):
            return self.process_file(raw_text, source_system_id=source_system_id, document_id=document_id)
        if os.path.exists(filename):
            return self.process_file(filename, source_system_id=source_system_id, document_id=document_id)

        logger.info(f"Starting Two-Pass Extraction for {document_id} ({filename})")

        # Pass 1: Visual Structural Layout Decomposition
        layout_result = document_ai_tool.parse_document(raw_text, filename)
        macro_doc = gemini_extraction_tool.extract_macro_document(
            document_id=document_id,
            content=raw_text,
            source_system_id=source_system_id,
            table_of_contents=layout_result.get("table_of_contents", ["Overview"]),
            document_title=None
        )
        resolved_doc_id = macro_doc.document_id

        # Persist Document Entity to Spanner Parent Table (No Embeddings)
        spanner_service.insert_macro_document(macro_doc)

        # ---------------------------------------------------------------------
        # Pass 2: Layout-Aware Chunk Boundary & Revision-Aware Deduplication
        # ---------------------------------------------------------------------
        promoted_chunks: List[GovernedKnowledgeUnitPayload] = []
        quarantined_chunks: List[Dict[str, Any]] = []
        deduplicated_chunk_ids: List[str] = []
        new_blocks = []

        # Check existing chunks in Spanner for revision deduplication
        for idx, block in enumerate(layout_result["layout_tree"]):
            block_sha = hashlib.sha256(block["text"].encode("utf-8")).hexdigest()
            existing = spanner_service.find_chunk_by_hash(block_sha)
            if existing:
                # Unaltered chunk: Bind new document_id without re-embedding
                spanner_service.append_document_binding(existing["chunk_id"], resolved_doc_id)
                deduplicated_chunk_ids.append(existing["chunk_id"])
            else:
                new_blocks.append((idx, block))

        # Generate batch embeddings and Tri-View representations only for new/modified blocks
        if new_blocks:
            new_texts = [b["text"] for _, b in new_blocks]
            chunk_vectors = embedding_service.generate_embeddings_batch(new_texts)

            for i, (idx, block) in enumerate(new_blocks):
                chunk_payload = gemini_extraction_tool.extract_chunk_payload(
                    document_id=resolved_doc_id,
                    chunk_index=idx,
                    chunk_text=block["text"],
                    headings=[block["heading"]],
                    vector=chunk_vectors[i] if i < len(chunk_vectors) else None,
                    bound_document_ids=[resolved_doc_id]
                )

                # Layer 4 Quality Gate & Dual-Path Routing
                if chunk_payload.extraction_confidence >= 0.88 and chunk_payload.status == "ACTIVE":
                    promoted_chunks.append(chunk_payload)
                else:
                    incident = verifyai_tool.dispatch_quarantine_card(
                        chunk_id=chunk_payload.chunk_id,
                        document_id=resolved_doc_id,
                        reason="Extraction confidence below 0.88 threshold",
                        confidence_score=chunk_payload.extraction_confidence,
                        chunk_text=chunk_payload.chunk_text
                    )
                    quarantined_chunks.append(incident)

            # Batch persist promoted chunks to Spanner Child Table (With Vectors)
            if promoted_chunks:
                spanner_service.insert_knowledge_units(promoted_chunks)

        return {
            "document_id": resolved_doc_id,
            "document_title": macro_doc.document_title,
            "document_summary": macro_doc.document_summary,
            "table_of_contents": macro_doc.table_of_contents,
            "search_keywords": macro_doc.search_keywords,
            "raw_content_sha256": macro_doc.raw_content_sha256,
            "macro_taxonomy": {
                "domain": macro_doc.canonical_dsrf_domain.value,
                "domain_path": macro_doc.domain_path,
                "business_unit": macro_doc.business_unit.value,
                "product_family": [p.value for p in macro_doc.adp_product_family],
                "source_reference": macro_doc.source_reference
            },
            "total_blocks_parsed": len(layout_result["layout_tree"]),
            "deduplicated_count": len(deduplicated_chunk_ids),
            "promoted_count": len(promoted_chunks),
            "quarantined_count": len(quarantined_chunks),
            "quarantined_incidents": quarantined_chunks
        }


extraction_agent = MetadataExtractionAgent()
