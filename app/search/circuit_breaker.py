"""Frontline Associate 2-Turn Circuit Breaker."""

import logging
from typing import Any, Dict

logger = logging.getLogger("adp-questa.search.circuit_breaker")


class FrontlineCircuitBreaker:
    """Monitors interaction turns and confidence scores to safeguard compliance.
    
    Escalates to a human frontline associate if:
    1. Confidence score is below 0.85
    2. Consecutive interaction turns exceed 2
    """

    @staticmethod
    def evaluate(turn_count: int, confidence_score: float) -> Dict[str, Any]:
        should_escalate = (turn_count >= 2) or (confidence_score < 0.85)
        reason = None
        if confidence_score < 0.85:
            reason = "Confidence threshold below 85% safety boundary."
        elif turn_count >= 2:
            reason = "2-turn conversational limit reached; statutory review mandated."

        return {
            "escalated": should_escalate,
            "reason": reason,
            "escalation_target": "ADP Frontline Associate Queue (MAS Tier 2)" if should_escalate else None
        }


circuit_breaker = FrontlineCircuitBreaker()
