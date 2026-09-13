"""Chunk-Level Revision Deduplication & Spanner Multi-Version Binding."""

import hashlib
import logging
from typing import Any, Dict, List, Optional, Tuple

from app.services.spanner_service import spanner_service

logger = logging.getLogger("adp-questa.ingestion.deduplication")


class RevisionDeduplicationManager:
    """Manages syntactic chunk deduplication across document revisions.
    
    Unaltered Chunks: Append new doc_id to bound_document_ids via transaction (Zero Re-Embedding).
    Modified Chunks: Embedded and inserted as new knowledge units.
    """

    @staticmethod
    def compute_sha256(text: str) -> str:
        return hashlib.sha256(text.encode("utf-8")).hexdigest()

    @staticmethod
    def partition_blocks(
        blocks: List[Dict[str, Any]],
        resolved_doc_id: str
    ) -> Tuple[List[str], List[Tuple[int, Dict[str, Any]]]]:
        """Partitions visual layout blocks into existing (deduplicated) vs new blocks."""
        deduplicated_chunk_ids: List[str] = []
        new_blocks: List[Tuple[int, Dict[str, Any]]] = []

        for idx, block in enumerate(blocks):
            block_sha = RevisionDeduplicationManager.compute_sha256(block["text"])
            existing = spanner_service.find_chunk_by_hash(block_sha)
            if existing:
                # Unaltered chunk: Bind new document_id without re-embedding
                spanner_service.append_document_binding(existing["chunk_id"], resolved_doc_id)
                deduplicated_chunk_ids.append(existing["chunk_id"])
                logger.info(f"Deduplicated unaltered chunk {existing['chunk_id'][:16]}... bound to {resolved_doc_id}")
            else:
                new_blocks.append((idx, block))

        return deduplicated_chunk_ids, new_blocks


deduplication_manager = RevisionDeduplicationManager()
