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

        block_hashes = [RevisionDeduplicationManager.compute_sha256(b["text"]) for b in blocks]
        existing_chunks_map = spanner_service.find_chunks_by_hashes(block_hashes)

        for idx, (block, b_hash) in enumerate(zip(blocks, block_hashes)):
            existing = existing_chunks_map.get(b_hash)
            if existing:
                deduplicated_chunk_ids.append(existing["chunk_id"])
            else:
                new_blocks.append((idx, block))

        if deduplicated_chunk_ids:
            spanner_service.append_document_bindings_batch(deduplicated_chunk_ids, resolved_doc_id)
            logger.info(f"Deduplicated {len(deduplicated_chunk_ids)} unaltered chunks bound to {resolved_doc_id} in 1 transaction.")

        return deduplicated_chunk_ids, new_blocks


deduplication_manager = RevisionDeduplicationManager()
