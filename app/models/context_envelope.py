"""The 10-Field Sebastian Context Envelope & Agent Delivery Models."""

from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class ConfidenceRatingEnum(str, Enum):
    GREEN_CERTIFIED = "GREEN_CERTIFIED"
    AMBER_PROVISIONAL = "AMBER_PROVISIONAL"
    RED_REVIEW_NEEDED = "RED_REVIEW_NEEDED"


class SebastianAnswerContext(BaseModel):
    """The official 10-Field Sebastian Context Envelope required by ADP Core Team."""
    # 1. Answer text generated or synthesized
    canonical_answer: str = Field(..., description="1. Verified answer text tailored to user persona")
    
    # 2. Statutory citation and legal backing
    statutory_citation: Optional[str] = Field(None, description="2. Statutory reference (e.g. NJ Rev Stat § 34:11-4.2)")
    
    # 3. Governing corporate policy / knowledge title
    governing_policy: str = Field(..., description="3. Parent policy document and section heading")
    
    # 4. Temporal validity range
    effective_date_range: str = Field(..., description="4. Active statutory period (e.g. 2024-01-01 to Present)")
    
    # 5. Contracted product family
    authorized_product_family: str = Field(..., description="5. Verified product family (e.g. runPoweredByAdp)")
    
    # 6. Applicable jurisdictional scope
    jurisdiction_scope: str = Field(..., description="6. Target geography (e.g. US-NJ, US-FED)")
    
    # 7. Authorized audience persona
    audience_persona: str = Field(..., description="7. Role entitlement (e.g. HR Practitioner)")
    
    # 8. Source system trace reference
    source_system_reference: str = Field(..., description="8. Canonical source URI for auditing (EKM::<id>)")
    
    # 9. Relational graph lineage status
    lineage_override_status: str = Field(default="STANDARD", description="9. STANDARD, SUPERSEDED, or EXCEPTION_OVERRIDDEN")
    
    # 10. Multi-factor confidence score
    confidence_rating: float = Field(..., ge=0.0, le=1.0, description="10. Verification score (0.0 - 1.0)")


class AgentChatTurnResponse(BaseModel):
    """API payload for conversational chat turns across Self-Service & Frontline channels."""
    session_id: str
    turn_count: int
    circuit_breaker_triggered: bool = False
    resolution_status: str = "RESOLVED"  # RESOLVED, ESCALATED_TO_FRONTLINE, QUARANTINED
    answer: str
    context_envelope: Optional[SebastianAnswerContext] = None
    retrieved_chunk_ids: List[str] = Field(default_factory=list)
    retrieval_latency_ms: float = 0.0


# Backward compatibility alias
SebastianContextEnvelope = SebastianAnswerContext
