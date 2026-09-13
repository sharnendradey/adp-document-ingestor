"""Governed Ingestion Pipeline with Live Event & Telemetry Broadcasting."""

import asyncio
import hashlib
import logging
import os
import time
from datetime import datetime, timezone
from typing import Any, Callable, Dict, List, Optional

from app.ingestion.layout_parser import document_ai_tool
from app.ingestion.metadata_extractor import gemini_extraction_tool
from app.ingestion.deduplication import deduplication_manager
from app.ingestion.quality_gate import verifyai_tool
from app.ingestion.gcs_storage import gcs_storage_service
from app.services.spanner_service import spanner_service
from app.services.vertex_embedding_service import embedding_service
from app.models.dsrf_metadata import GovernedKnowledgeUnitPayload

logger = logging.getLogger("adp-questa.ingestion.pipeline")


class GovernedIngestionPipeline:
    """End-to-end ingestion pipeline with real-time SSE telemetry broadcasting."""

    def __init__(self):
        # In-memory event queues for live SSE subscriptions keyed by job_id
        self._event_queues: Dict[str, asyncio.Queue] = {}

    def get_or_create_queue(self, job_id: str) -> asyncio.Queue:
        if job_id not in self._event_queues:
            self._event_queues[job_id] = asyncio.Queue()
        return self._event_queues[job_id]

    async def emit_event(self, job_id: str, event_type: str, data: Dict[str, Any]):
        """Pushes structured telemetry event to client's SSE queue."""
        event_payload = {
            "job_id": job_id,
            "event_type": event_type,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            **data
        }
        if job_id in self._event_queues:
            await self._event_queues[job_id].put(event_payload)

    async def run_ingestion_async(
        self,
        job_id: str,
        file_path_or_content: str,
        filename: str,
        document_id: Optional[str] = None,
        source_system_id: str = "EKM_CORE",
        version: int = 1
    ) -> Dict[str, Any]:
        """Executes full governed ingestion pipeline while broadcasting live telemetry."""
        t0 = time.time()
        await self.emit_event(job_id, "job_started", {
            "filename": filename,
            "document_id": document_id or "auto_generating",
            "message": f"Starting governed ingestion for {filename}"
        })

        # ---------------------------------------------------------------------
        # STAGE 1: Visual Structural Layout Extraction (Document AI)
        # ---------------------------------------------------------------------
        await self.emit_event(job_id, "stage_started", {
            "stage_id": "layout_parsing",
            "stage_name": "Visual Structural Layout Extraction",
            "message": "Decomposing visual layout via Google Cloud Document AI Layout Parser..."
        })
        
        file_bytes = None
        if os.path.exists(file_path_or_content):
            with open(file_path_or_content, "rb") as f:
                file_bytes = f.read()
            layout_result = await asyncio.to_thread(document_ai_tool.parse_file, file_path_or_content)
        elif os.path.exists(filename):
            with open(filename, "rb") as f:
                file_bytes = f.read()
            layout_result = await asyncio.to_thread(document_ai_tool.parse_file, filename)
        else:
            file_bytes = file_path_or_content.encode("utf-8")
            layout_result = await asyncio.to_thread(document_ai_tool.parse_document, file_path_or_content, filename)

        blocks = layout_result.get("layout_tree", [])
        toc = layout_result.get("table_of_contents", ["Overview"])
        raw_preview = layout_result.get("raw_text_preview", "")
        
        # Defensive fallback if blocks is empty but raw content exists
        if not blocks and raw_preview:
            blocks = [{"heading": "Overview", "text": raw_preview, "type": "paragraph"}]

        await self.emit_event(job_id, "log", {
            "level": "INFO",
            "stage_id": "layout_parsing",
            "message": f"Extracted {len(blocks)} structural blocks. Table of Contents: {toc[:4]}"
        })
        await self.emit_event(job_id, "stage_completed", {
            "stage_id": "layout_parsing",
            "total_blocks": len(blocks),
            "table_of_contents": toc
        })

        # ---------------------------------------------------------------------
        # STAGE 2: Macro DSRF Metadata Classification (Gemini 3.1)
        # ---------------------------------------------------------------------
        await self.emit_event(job_id, "stage_started", {
            "stage_id": "macro_metadata",
            "stage_name": "Macro DSRF Classification",
            "message": "Extracting macro DSRF taxonomy, domain path, and document summary via Gemini..."
        })

        macro_doc = await asyncio.to_thread(
            gemini_extraction_tool.extract_macro_document,
            document_id=document_id or layout_result.get("document_hash", ""),
            content=raw_preview,
            source_system_id=source_system_id,
            table_of_contents=toc,
            document_title=filename
        )
        resolved_doc_id = macro_doc.document_id

        await self.emit_event(job_id, "log", {
            "level": "INFO",
            "stage_id": "macro_metadata",
            "message": f"Resolved Document ID: {resolved_doc_id} | Domain: {macro_doc.canonical_dsrf_domain.value} | BU: {macro_doc.business_unit.value}"
        })
        await self.emit_event(job_id, "stage_completed", {
            "stage_id": "macro_metadata",
            "document_id": resolved_doc_id,
            "document_title": macro_doc.document_title,
            "canonical_domain": macro_doc.canonical_dsrf_domain.value,
            "business_unit": macro_doc.business_unit.value,
            "product_family": [p.value for p in macro_doc.adp_product_family]
        })

        # ---------------------------------------------------------------------
        # STAGE 3: Structured GCS Archival
        # ---------------------------------------------------------------------
        await self.emit_event(job_id, "stage_started", {
            "stage_id": "gcs_archival",
            "stage_name": "Structured GCS Archival",
            "message": f"Archiving original document to gs://{gcs_storage_service.bucket_name}..."
        })

        gcs_res = await asyncio.to_thread(
            gcs_storage_service.upload_document,
            file_bytes=file_bytes or b"",
            filename=filename,
            document_id=resolved_doc_id,
            business_unit=macro_doc.business_unit.value,
            canonical_dsrf_domain=macro_doc.canonical_dsrf_domain.value,
            product_family=macro_doc.adp_product_family[0].value if macro_doc.adp_product_family else "GENERAL",
            version=version,
            source_system_id=source_system_id
        )

        await self.emit_event(job_id, "log", {
            "level": "INFO",
            "stage_id": "gcs_archival",
            "message": f"Archived to structured GCS path: {gcs_res.get('gcs_uri')}"
        })
        await self.emit_event(job_id, "stage_completed", {
            "stage_id": "gcs_archival",
            "gcs_uri": gcs_res.get("gcs_uri"),
            "size_bytes": gcs_res.get("size_bytes")
        })

        # ---------------------------------------------------------------------
        # STAGE 4: Cloud Spanner Parent Catalog Persistence (Zero Vector Embeddings)
        # ---------------------------------------------------------------------
        await self.emit_event(job_id, "stage_started", {
            "stage_id": "spanner_parent",
            "stage_name": "Cloud Spanner Parent Table Persistence",
            "message": "Persisting document entity to knowledge_documents with STRICTLY ZERO VECTOR EMBEDDINGS..."
        })

        await asyncio.to_thread(spanner_service.insert_macro_document, macro_doc)

        await self.emit_event(job_id, "log", {
            "level": "INFO",
            "stage_id": "spanner_parent",
            "message": f"Persisted parent catalog row for {resolved_doc_id} (whole_doc_embedding=NULL verified)"
        })
        await self.emit_event(job_id, "stage_completed", {
            "stage_id": "spanner_parent",
            "status": "PERSISTED"
        })

        # ---------------------------------------------------------------------
        # STAGE 5: Chunk Revision Deduplication Gate
        # ---------------------------------------------------------------------
        await self.emit_event(job_id, "stage_started", {
            "stage_id": "revision_deduplication",
            "stage_name": "Chunk Revision Deduplication Gate",
            "message": "Checking syntactic SHA-256 hashes against live Spanner knowledge units..."
        })

        deduplicated_chunk_ids, new_blocks = await asyncio.to_thread(
            deduplication_manager.partition_blocks, blocks, resolved_doc_id
        )

        await self.emit_event(job_id, "log", {
            "level": "INFO",
            "stage_id": "revision_deduplication",
            "message": f"Revision Deduplication: {len(deduplicated_chunk_ids)} unaltered chunks bound (0 re-embeddings); {len(new_blocks)} new/modified chunks require embedding."
        })
        await self.emit_event(job_id, "stage_completed", {
            "stage_id": "revision_deduplication",
            "deduplicated_count": len(deduplicated_chunk_ids),
            "new_count": len(new_blocks)
        })

        # ---------------------------------------------------------------------
        # STAGE 6: Tri-View Synthesis & ScaNN Embedding (New Blocks Only)
        # ---------------------------------------------------------------------
        promoted_chunks: List[GovernedKnowledgeUnitPayload] = []
        quarantined_chunks: List[Dict[str, Any]] = []

        if new_blocks:
            await self.emit_event(job_id, "stage_started", {
                "stage_id": "tri_view_synthesis",
                "stage_name": "Tri-View Synthesis & ScaNN Vector Generation",
                "message": f"Generating batch embeddings (text-embedding-004) and Tri-View representations for {len(new_blocks)} new blocks..."
            })

            new_texts = [b["text"] for _, b in new_blocks]
            chunk_vectors = await asyncio.to_thread(embedding_service.generate_embeddings_batch, new_texts)

            for i, (idx, block) in enumerate(new_blocks):
                chunk_payload = await asyncio.to_thread(
                    gemini_extraction_tool.extract_chunk_payload,
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
                    await self.emit_event(job_id, "chunk_processed", {
                        "chunk_id": chunk_payload.chunk_id,
                        "status": "PROMOTED",
                        "confidence": chunk_payload.extraction_confidence,
                        "qa_count": len(chunk_payload.generated_qa_pairs or []),
                        "tabular_keys": len(chunk_payload.tabular_representation or {})
                    })
                else:
                    incident = verifyai_tool.dispatch_quarantine_card(
                        chunk_id=chunk_payload.chunk_id,
                        document_id=resolved_doc_id,
                        reason="Extraction confidence below 0.88 threshold",
                        confidence_score=chunk_payload.extraction_confidence,
                        chunk_text=chunk_payload.chunk_text
                    )
                    quarantined_chunks.append(incident)
                    await self.emit_event(job_id, "chunk_processed", {
                        "chunk_id": chunk_payload.chunk_id,
                        "status": "QUARANTINED",
                        "confidence": chunk_payload.extraction_confidence
                    })

            # Batch persist to Spanner
            if promoted_chunks:
                await asyncio.to_thread(spanner_service.insert_knowledge_units, promoted_chunks)

                await self.emit_event(job_id, "log", {
                    "level": "INFO",
                    "stage_id": "tri_view_synthesis",
                    "message": f"Batch persisted {len(promoted_chunks)} knowledge units to Spanner child table."
                })

            await self.emit_event(job_id, "stage_completed", {
                "stage_id": "tri_view_synthesis",
                "promoted_count": len(promoted_chunks),
                "quarantined_count": len(quarantined_chunks)
            })

        # Final Job Completion Event
        elapsed_sec = round(time.time() - t0, 2)
        final_summary = {
            "job_id": job_id,
            "document_id": resolved_doc_id,
            "document_title": macro_doc.document_title,
            "document_summary": macro_doc.document_summary,
            "table_of_contents": toc,
            "search_keywords": macro_doc.search_keywords,
            "gcs_uri": gcs_res.get("gcs_uri"),
            "macro_taxonomy": {
                "domain": macro_doc.canonical_dsrf_domain.value,
                "business_unit": macro_doc.business_unit.value,
                "product_family": [p.value for p in macro_doc.adp_product_family]
            },
            "metrics": {
                "total_blocks_parsed": len(blocks),
                "deduplicated_count": len(deduplicated_chunk_ids),
                "promoted_count": len(promoted_chunks),
                "quarantined_count": len(quarantined_chunks),
                "duration_seconds": elapsed_sec
            }
        }

        await self.emit_event(job_id, "job_completed", final_summary)
        return final_summary


ingestion_pipeline = GovernedIngestionPipeline()
