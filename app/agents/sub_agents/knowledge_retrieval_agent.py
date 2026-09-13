"""Knowledge Retrieval Sub-Agent executing Pre-Filtered Vector Search & Graph Lineage."""

import logging
import time
from typing import Any, Dict, List
from app.agents.tools.spanner_vector_tool import spanner_vector_tool
from app.agents.tools.spanner_graph_tool import spanner_graph_tool
from app.models.entitlements import UserSessionContext
from app.agents.prompts import KNOWLEDGE_RETRIEVAL_PROMPT

logger = logging.getLogger("adp-questa.agent.retrieval")


class KnowledgeRetrievalAgent:
    """Executes sub-5ms mathematical pre-filtering and graph exception traversal."""

    def __init__(self):
        self.system_prompt = KNOWLEDGE_RETRIEVAL_PROMPT

    def retrieve_entitled_knowledge(
        self,
        query: str,
        session: UserSessionContext,
        top_k: int = 5
    ) -> Dict[str, Any]:
        """Executes the dual vector + graph retrieval flow."""
        start_time = time.perf_counter()

        # Step 1: Pre-filtered ScaNN Vector Search (~2.5 ms)
        candidate_chunks = spanner_vector_tool.search_authorized_knowledge(
            query=query,
            session=session,
            top_k=top_k
        )

        candidate_ids = [c["chunk_id"] for c in candidate_chunks]

        # Step 2: Spanner Graph Lineage & Exception Traversal (~1.2 ms)
        overrides = spanner_graph_tool.resolve_jurisdiction_exceptions(
            candidate_chunk_ids=candidate_ids,
            jurisdiction_codes=session.geographic_jurisdiction
        )

        total_latency_ms = (time.perf_counter() - start_time) * 1000.0

        return {
            "query": query,
            "candidate_chunks": candidate_chunks,
            "state_overrides": overrides,
            "retrieval_latency_ms": round(total_latency_ms, 2),
            "authorized_persona": session.assigned_roles,
            "authorized_geographies": session.geographic_jurisdiction
        }


retrieval_agent = KnowledgeRetrievalAgent()
