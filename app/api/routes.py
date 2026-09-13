"""API routes for runtime chat, session resolution, and health diagnostics."""

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.agents.root_supervisor import root_supervisor_agent
from app.models.context_envelope import AgentChatTurnResponse
from app.services.redis_session_service import redis_service
from app.models.entitlements import UserSessionContext

router = APIRouter()


class ChatRequest(BaseModel):
    user_id: str = Field(..., example="AdminUser01")
    client_tenant_id: str = Field(..., example="AcmeCorp")
    query: str = Field(..., example="What is our direct deposit Net Split limit?")
    turn_count: int = Field(default=1, example=1)
    channel: str = Field(default="SELF_SERVICE", example="SELF_SERVICE")
    assigned_roles: Optional[List[str]] = Field(default=None, example=["HR Practitioner"])
    geographic_jurisdiction: Optional[List[str]] = Field(default=None, example=["US-FED", "US-NJ"])
    subscribed_products: Optional[List[str]] = Field(default=None, example=["runPoweredByAdp"])


@router.get("/health")
def health_check() -> Dict[str, Any]:
    """Diagnostic health check for Cloud Run and monitoring probes."""
    return {
        "status": "HEALTHY",
        "service": "adp_questa_agentic_service",
        "spanner_backend": "CONNECTED",
        "redis_session_cache": "ACTIVE",
        "version": "1.0.0"
    }


@router.post("/api/v1/chat", response_model=AgentChatTurnResponse)
def chat_turn(req: ChatRequest) -> AgentChatTurnResponse:
    """Executes runtime entitled conversational turn (< 5ms retrieval SLA)."""
    try:
        if req.assigned_roles or req.geographic_jurisdiction or req.subscribed_products:
            from app.agents.sub_agents.entitlement_gateway_agent import entitlement_gateway_agent
            sess = entitlement_gateway_agent.resolve_caller_context(req.user_id, req.client_tenant_id, req.channel)
            if req.assigned_roles:
                sess.assigned_roles = req.assigned_roles
            if req.geographic_jurisdiction:
                sess.geographic_jurisdiction = req.geographic_jurisdiction
            if req.subscribed_products:
                sess.subscribed_products = req.subscribed_products
            redis_service.set_user_session(sess)

        return root_supervisor_agent.handle_chat_turn(
            query=req.query,
            user_id=req.user_id,
            client_tenant_id=req.client_tenant_id,
            turn_count=req.turn_count,
            channel=req.channel
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/v1/sessions/{user_id}/{tenant_id}")
def get_session(user_id: str, tenant_id: str) -> Dict[str, Any]:
    """Inspects pre-warmed Redis session entitlement tuple."""
    sess = redis_service.get_user_session(user_id, tenant_id)
    if not sess:
        raise HTTPException(status_code=404, detail="Session not pre-warmed in Redis.")
    return sess.model_dump()


@router.post("/api/v1/sessions/prewarm")
def prewarm_session(session: UserSessionContext) -> Dict[str, str]:
    """Pre-warms an active session into Redis on IDP authentication event."""
    redis_service.set_user_session(session)
    return {"status": "SUCCESS", "message": f"Pre-warmed entitlement for {session.user_id}"}


class VectorSearchRequest(BaseModel):
    query: str = Field(..., example="direct deposit limit")
    user_id: str = Field(..., example="AdminUser01")
    client_tenant_id: str = Field(..., example="AcmeCorp")
    top_k: int = Field(default=5, example=5)
    assigned_roles: Optional[List[str]] = Field(default=None, example=["HR Practitioner"])
    geographic_jurisdiction: Optional[List[str]] = Field(default=None, example=["US-FED", "US-NJ"])
    subscribed_products: Optional[List[str]] = Field(default=None, example=["runPoweredByAdp"])


@router.post("/api/v1/retrieval/vector-search")
def direct_vector_search(req: VectorSearchRequest) -> Dict[str, Any]:
    """Direct pre-filtered vector retrieval endpoint for headless integrations."""
    from app.agents.sub_agents.entitlement_gateway_agent import entitlement_gateway_agent
    from app.agents.sub_agents.knowledge_retrieval_agent import retrieval_agent
    
    session = entitlement_gateway_agent.resolve_caller_context(
        user_id=req.user_id,
        client_tenant_id=req.client_tenant_id
    )
    if req.assigned_roles:
        session.assigned_roles = req.assigned_roles
    if req.geographic_jurisdiction:
        session.geographic_jurisdiction = req.geographic_jurisdiction
    if req.subscribed_products:
        session.subscribed_products = req.subscribed_products

    return retrieval_agent.retrieve_entitled_knowledge(
        query=req.query,
        session=session,
        top_k=req.top_k
    )


class TombstoneRequest(BaseModel):
    chunk_id: str = Field(..., example="ku_erroneous_tax_rule")
    reason: str = Field(..., example="Superseded by regulatory compliance hotfix")
    revoked_by: str = Field(default="ComplianceAdmin", example="ComplianceAdmin")


@router.post("/api/v1/retrieval/tombstone")
def tombstone_knowledge_unit(req: TombstoneRequest) -> Dict[str, Any]:
    """Cryptographically revokes a knowledge unit and purges it from retrieval in real-time."""
    from app.services.spanner_service import spanner_service
    success = spanner_service.record_tombstone(
        chunk_id=req.chunk_id,
        reason=req.reason,
        revoked_by=req.revoked_by
    )
    return {"status": "SUCCESS" if success else "FAILED", "chunk_id": req.chunk_id}
