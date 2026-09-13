"""Knowledge Unit Chunk Semantic Relevance Analyzer & Spanner Agent Synthesizer."""

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
    """Analyzes retrieved Knowledge Units from Cloud Spanner across Tri-Views to synthesize grounded agent answers."""

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
        """Synthesizes a grounded answer directly from Cloud Spanner child knowledge units."""
        if not retrieved_chunks:
            return {
                "answer": "No authorized knowledge units matched your query in Cloud Spanner under your current access role and geographic entitlements.",
                "confidence_score": 0.0,
                "confidence_display": "0%",
                "confidence_rating": "RED_REVIEW_NEEDED",
                "citation": "None",
                "contributing_chunks": [],
                "circuit_breaker_triggered": False,
                "spanner_units_analyzed": 0
            }

        top_chunk = retrieved_chunks[0]
        citation = top_chunk.get("citation") or f"Cloud Spanner Unit [{top_chunk.get('chunk_id')}]"
        doc_bindings = top_chunk.get("bound_document_ids") or [top_chunk.get("document_id")]

        # Build comprehensive multi-chunk Spanner context
        context_blocks = []
        for idx, chunk in enumerate(retrieved_chunks[:5]):
            c_id = chunk.get("chunk_id", f"unit_{idx}")
            c_doc = chunk.get("document_id", "Unknown Document")
            c_text = chunk.get("chunk_text", "").strip()
            c_citation = chunk.get("citation", "")
            c_tabular = chunk.get("tabular_representation") or {}
            c_qa = chunk.get("generated_qa_pairs") or []

            block_str = f"--- [Spanner Knowledge Unit #{idx + 1}: {c_id} (Doc: {c_doc})] ---\n"
            if c_citation:
                block_str += f"Citation: {c_citation}\n"
            block_str += f"Narrative Content:\n{c_text}\n"

            if c_tabular:
                block_str += f"Extracted Tabular/Policy Matrix:\n{json.dumps(c_tabular, indent=2)}\n"

            if c_qa:
                qa_summary = "; ".join([f"Q: {q.get('question')} (Persona: {q.get('target_persona')})" for q in c_qa[:3]])
                block_str += f"Synthetic Q&A Context: {qa_summary}\n"

            context_blocks.append(block_str)

        all_spanner_context = "\n\n".join(context_blocks)

        answer_text = ""
        if self.client:
            try:
                prompt = f"""
You are the ADP Questa Knowledge Agent.
A user with the simulated role "{user_role}" has submitted the following inquiry:
"{query}"

You have retrieved the following verified knowledge records directly from Cloud Spanner (Child Table `knowledge_units`):

{all_spanner_context}

INSTRUCTIONS FOR YOUR ANSWER:
1. Analyze the retrieved Spanner records carefully (both Narrative and Tabular Matrix representations).
2. Answer the user's inquiry directly, accurately, and authoritatively based ONLY on the Spanner data above.
3. Explicitly state any exact policy limits, numbers, deadlines, eligibility criteria, and required approvals found in the Spanner rows.
4. If different rules apply based on the user's role ({user_role}), tailor your explanation for that role.
5. Provide specific citations referring to the Spanner document and section headings where the information is located.
6. Do NOT fabricate or assume any external information not present in the Spanner records.
"""
                resp = self.client.models.generate_content(
                    model=settings.SUPERVISOR_MODEL_NAME or "gemini-flash-latest",
                    contents=prompt
                )
                answer_text = resp.text.strip()
            except Exception as e:
                logger.warning(f"Gemini answer synthesis from Spanner error: {e}")

        # Fallback intelligent extraction if LLM is unreachable
        if not answer_text:
            passages = [c.get("chunk_text", "").strip() for c in retrieved_chunks[:2] if c.get("chunk_text")]
            answer_text = "\n\n".join(passages) if passages else "No passage text available in Spanner record."

        # Compute multi-factor confidence from ScaNN distance
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
            "spanner_units_analyzed": len(retrieved_chunks),
            "contributing_chunks": [
                {
                    "chunk_id": c.get("chunk_id"),
                    "document_id": c.get("document_id"),
                    "bound_document_ids": c.get("bound_document_ids") or [c.get("document_id")],
                    "similarity": round(1.0 - float(c.get("distance", 0.2)), 4),
                    "text_snippet": c.get("chunk_text", "")[:280] + "...",
                    "citation": c.get("citation", ""),
                    "qa_pairs_count": len(c.get("generated_qa_pairs") or []),
                    "tabular_keys_count": len(c.get("tabular_representation") or {})
                }
                for c in retrieved_chunks
            ]
        }


chunk_analyzer = ChunkSemanticAnalyzer()
