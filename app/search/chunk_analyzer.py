"""Knowledge Unit Chunk Semantic Relevance Analyzer & Sebastian Envelope Generator."""

import json
import logging
from typing import Any, Dict, List, Optional

logger = logging.getLogger("adp-questa.search.analyzer")

try:
    from google import genai
    HAS_GENAI = True
except ImportError:
    genai = None
    HAS_GENAI = False

from app.config import settings
from app.models.context_envelope import SebastianContextEnvelope, ConfidenceRatingEnum


class ChunkSemanticAnalyzer:
    """Analyzes retrieved Knowledge Units across Tri-Views to synthesize grounded Frontline answers."""

    def __init__(self):
        self.client: Optional[Any] = None
        if HAS_GENAI and genai:
            try:
                self.client = genai.Client()
            except Exception:
                pass

    def synthesize_answer(
        self,
        query: str,
        retrieved_chunks: List[Dict[str, Any]],
        intent_info: Dict[str, Any],
        user_role: str = "Employee"
    ) -> Dict[str, Any]:
        """Synthesizes grounded canonical answer and constructs Sebastian 10-Field Context Envelope."""
        if not retrieved_chunks:
            return {
                "answer": "No authorized knowledge units matched your query under your current access role and geographic entitlements.",
                "confidence_score": 0.0,
                "confidence_rating": "RED_REVIEW_NEEDED",
                "citation": "None",
                "contributing_chunks": [],
                "circuit_breaker_triggered": False
            }

        top_chunk = retrieved_chunks[0]
        passage_text = top_chunk.get("chunk_text", "")
        citation = top_chunk.get("citation") or "Official ADP Governance Policy"
        doc_bindings = top_chunk.get("bound_document_ids") or [top_chunk.get("document_id")]

        # Check if Tri-View Q&A or Tabular view has direct answers
        qa_pairs = top_chunk.get("generated_qa_pairs") or []
        tabular = top_chunk.get("tabular_representation") or {}

        answer_text = ""
        if self.client:
            try:
                context_summary = f"Passage: {passage_text}\n"
                if tabular:
                    context_summary += f"Tabular Matrix: {json.dumps(tabular)}\n"
                
                prompt = f"""
                You are ADP's Frontline Sebastian AI Agent.
                Answer the user query: "{query}"
                using ONLY the following grounded context:
                {context_summary}

                Guidelines:
                1. Be concise, precise, and professional.
                2. Explicitly cite any specific values, deadlines, dollar figures, or statutory policies.
                3. Do not invent any outside information.
                """
                resp = self.client.models.generate_content(
                    model=settings.SUPERVISOR_MODEL_NAME or "gemini-flash-latest",
                    contents=prompt
                )
                answer_text = resp.text.strip()
            except Exception as e:
                logger.warning(f"Gemini answer synthesis error: {e}")

        if not answer_text:
            answer_text = passage_text

        # Format 10-field Sebastian envelope
        similarity = 1.0 - float(top_chunk.get("distance", 0.15))
        confidence_pct = round(max(75.0, min(99.0, similarity * 100)), 1)
        rating = "GREEN_CERTIFIED" if confidence_pct >= 88.0 else "AMBER_PROVISIONAL"

        return {
            "answer": answer_text,
            "confidence_score": confidence_pct / 100.0,
            "confidence_display": f"{confidence_pct}%",
            "confidence_rating": rating,
            "citation": citation,
            "primary_document_id": top_chunk.get("document_id"),
            "bound_document_ids": doc_bindings,
            "top_similarity": round(similarity, 4),
            "circuit_breaker_triggered": confidence_pct < 85.0,
            "contributing_chunks": [
                {
                    "chunk_id": c.get("chunk_id"),
                    "document_id": c.get("document_id"),
                    "bound_document_ids": c.get("bound_document_ids") or [c.get("document_id")],
                    "similarity": round(1.0 - float(c.get("distance", 0.2)), 4),
                    "text_snippet": c.get("chunk_text", "")[:250] + "...",
                    "citation": c.get("citation", ""),
                    "qa_pairs_count": len(c.get("generated_qa_pairs") or []),
                    "tabular_keys_count": len(c.get("tabular_representation") or {})
                }
                for c in retrieved_chunks
            ]
        }


chunk_analyzer = ChunkSemanticAnalyzer()
