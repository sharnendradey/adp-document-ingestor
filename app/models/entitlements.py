"""Runtime Entitlement Models & ScaNN Pre-Filtering Context."""

import time
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class UserSessionContext(BaseModel):
    """User entitlement tuple pre-warmed in Redis (< 1ms lookup)."""
    user_id: str = Field(..., description="Unique employee / associate user ID")
    client_tenant_id: str = Field(..., description="Organization tenant boundary (e.g. AcmeCorp)")
    subscribed_products: List[str] = Field(default_factory=list, description="Contracted product families (RUN, WFN, etc.)")
    assigned_roles: List[str] = Field(..., min_length=1, description="Active user persona roles (e.g. ['PRACTITIONER'])")
    geographic_jurisdiction: List[str] = Field(default=["US-FED"], description="Applicable state/local codes (e.g. ['US-FED', 'US-NJ'])")
    session_epoch: int = Field(default_factory=lambda: int(time.time()), description="Current UTC epoch for temporal gating")
    channel: str = Field(default="SELF_SERVICE", description="SELF_SERVICE (ADP Assist) or FRONTLINE (Associate UI)")


class ScaNNCategoricalRestrict(BaseModel):
    """ScaNN categorical namespace whitelist restrict."""
    namespace: str
    allow_tokens: List[str]


class ScaNNNumericRestrict(BaseModel):
    """ScaNN numeric epoch range restrict."""
    namespace: str
    value_int: int
    op_type: str  # LESS_EQUAL, GREATER_EQUAL


class PreFilteredSearchQuery(BaseModel):
    """Complete mathematical pre-filtered retrieval payload sent to Spanner/Vertex."""
    query_text: str
    query_vector: Optional[List[float]] = None
    tenant_boundary: str
    categorical_restricts: List[ScaNNCategoricalRestrict] = Field(default_factory=list)
    numeric_restricts: List[ScaNNNumericRestrict] = Field(default_factory=list)
    top_k: int = 5
    distance_threshold: float = 0.85
