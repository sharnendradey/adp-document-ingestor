"""Frontline Delivery Sub-Agent synthesizing the 10-Field Sebastian Context Envelope."""

import logging
from typing import Any, Dict, List, Optional
from app.models.context_envelope import SebastianAnswerContext, AgentChatTurnResponse
from app.models.entitlements import UserSessionContext
from app.agents.prompts import FRONTLINE_DELIVERY_PROMPT

logger = logging.getLogger("adp-questa.agent.delivery")


class FrontlineDeliveryAgent:
    """Delivers answers across Self-Service (ADP Assist) & Frontline Associates (10,000 Seats)."""

    def __init__(self):
        self.system_prompt = FRONTLINE_DELIVERY_PROMPT

    def synthesize_response(
        self,
        query: str,
        retrieval_data: Dict[str, Any],
        session: UserSessionContext,
        turn_count: int = 1
    ) -> AgentChatTurnResponse:
        """Assembles verified answer and enforces circuit breaker thresholds."""
        candidates = retrieval_data.get("candidate_chunks", [])
        overrides = retrieval_data.get("state_overrides", [])
        latency_ms = retrieval_data.get("retrieval_latency_ms", 0.0)

        if not candidates:
            # Zero candidates match ABAC restrictions
            return AgentChatTurnResponse(
                session_id=f"sess_{session.user_id}",
                turn_count=turn_count,
                circuit_breaker_triggered=False,
                resolution_status="NO_AUTHORIZED_DATA",
                answer="No authorized knowledge unit found matching your organization's subscription and persona privileges.",
                context_envelope=None,
                retrieved_chunk_ids=[],
                retrieval_latency_ms=latency_ms
            )

        # Primary matched knowledge unit
        primary_chunk = candidates[0]
        
        # Check for state override
        override_text = None
        override_citation = None
        lineage_status = "STANDARD"

        if overrides:
            for o in overrides:
                if o.get("parent_chunk_id") == primary_chunk["chunk_id"]:
                    override_text = o.get("override_text")
                    override_citation = o.get("citation")
                    lineage_status = "EXCEPTION_OVERRIDDEN"
                    break

        # Answer text formulation
        if override_text:
            answer_text = f"{override_text} (Note: State statutory override applied for {session.geographic_jurisdiction})."
            citation = override_citation or primary_chunk.get("citation")
        else:
            answer_text = primary_chunk["chunk_text"]
            citation = primary_chunk.get("citation")

        # Confidence rating
        raw_distance = primary_chunk.get("distance", 0.15)
        confidence = round(max(0.0, min(1.0, 1.0 - raw_distance)), 4)

        # Dynamic effective date range
        start_dt = primary_chunk.get("effective_date")
        if not start_dt:
            from datetime import datetime, timezone
            start_dt = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        elif isinstance(start_dt, str) and "T" in start_dt:
            start_dt = start_dt.split("T")[0]
        effective_range = f"{start_dt} to Present"

        # 10-Field Sebastian Answer Context
        envelope = SebastianAnswerContext(
            canonical_answer=answer_text,
            statutory_citation=citation or "ADP Standard Knowledge Policy",
            governing_policy=f"ADP {session.subscribed_products[0]} Operating Manual",
            effective_date_range=effective_range,
            authorized_product_family=session.subscribed_products[0],
            jurisdiction_scope=", ".join(session.geographic_jurisdiction),
            audience_persona=session.assigned_roles[0],
            source_system_reference=f"EKM::CORE::{primary_chunk['chunk_id'][:12]}",
            lineage_override_status=lineage_status,
            confidence_rating=confidence
        )

        # 2-Turn Circuit Breaker Evaluation
        circuit_breaker = False
        resolution_status = "RESOLVED"

        if session.channel == "SELF_SERVICE":
            if confidence < 0.70 or turn_count >= 2:
                circuit_breaker = True
                resolution_status = "ESCALATED_TO_FRONTLINE"
                logger.info(f"Circuit Breaker triggered at turn {turn_count} (confidence={confidence}). Escalating to human frontline associate.")

        return AgentChatTurnResponse(
            session_id=f"sess_{session.user_id}",
            turn_count=turn_count,
            circuit_breaker_triggered=circuit_breaker,
            resolution_status=resolution_status,
            answer=answer_text,
            context_envelope=envelope,
            retrieved_chunk_ids=[c["chunk_id"] for c in candidates],
            retrieval_latency_ms=latency_ms
        )


frontline_delivery_agent = FrontlineDeliveryAgent()
