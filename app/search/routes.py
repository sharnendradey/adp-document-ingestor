"""Search & Intelligence REST API Endpoints."""

import logging
import time
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.search.engine import search_engine
from app.search.intent_agent import intent_agent
from app.search.chunk_analyzer import chunk_analyzer
from app.search.circuit_breaker import circuit_breaker
from app.services.spanner_service import spanner_service

logger = logging.getLogger("adp-questa.search.routes")
router = APIRouter(prefix="/api/v1/search", tags=["Search & Intelligence"])


class SearchQueryRequest(BaseModel):
    query: str
    user_role: str = "Employee"
    business_unit: str = "MAJOR_ACCOUNTS"
    geography: str = "US"
    tenant_boundary: str = "GLOBAL"
    turn_count: int = 1
    top_k: int = 5


class IntentRequest(BaseModel):
    query: str
    user_role: str = "Employee"


@router.post("/analyze-intent")
def analyze_query_intent(req: IntentRequest) -> Dict[str, Any]:
    """Classifies user query intent using Gemini 3.1."""
    return intent_agent.analyze_intent(req.query, req.user_role)


@router.post("/query")
def execute_entitled_query(req: SearchQueryRequest) -> Dict[str, Any]:
    """Executes full agentic search: intent analysis, ScaNN retrieval, and Sebastian answer synthesis."""
    t0 = time.time()

    # 1. Intent Understanding
    intent_info = intent_agent.analyze_intent(req.query, req.user_role)
    target_products = [intent_info.get("target_product", "ALL")]
    if "ALL" not in target_products:
        target_products.append("ALL")

    required_roles = intent_info.get("required_roles") or ["All", req.user_role]

    # 2. ScaNN Vector Retrieval with ABAC Pre-filtering
    chunks = search_engine.search_entitled(
        query_text=req.query,
        tenant_boundary=req.tenant_boundary,
        product_families=target_products,
        audience_roles=required_roles,
        geographies=["GLOBAL", req.geography, "US-FED"],
        top_k=req.top_k
    )

    # 3. Answer Synthesis & Context Envelope
    analysis_res = chunk_analyzer.synthesize_answer(
        query=req.query,
        retrieved_chunks=chunks,
        intent_info=intent_info,
        user_role=req.user_role
    )

    # 4. Circuit Breaker Evaluation
    cb_status = circuit_breaker.evaluate(
        turn_count=req.turn_count,
        confidence_score=analysis_res.get("confidence_score", 0.0)
    )

    elapsed_ms = round((time.time() - t0) * 1000, 2)

    return {
        "query": req.query,
        "user_role": req.user_role,
        "latency_ms": elapsed_ms,
        "intent": intent_info,
        "response": analysis_res,
        "circuit_breaker": cb_status,
        "total_chunks_retrieved": len(chunks)
    }


@router.get("/roles")
def list_available_roles() -> List[Dict[str, str]]:
    """Returns supported audience roles for ABAC persona switching in the UI."""
    return [
        {"id": "Employee", "label": "Employee (Self-Service)", "description": "Standard workforce self-service view"},
        {"id": "Manager", "label": "Manager (People Leader)", "description": "Team lead view with approval authority"},
        {"id": "HR Practitioner", "label": "HR Practitioner / Admin", "description": "Privileged HR and compliance operations"},
        {"id": "Payroll Practitioner", "label": "Payroll Specialist", "description": "Wage, tax withholding, and payroll operations"},
        {"id": "Client Admin", "label": "Client Corporate Admin", "description": "Company-wide executive policies and settings"},
        {"id": "ADP Associate", "label": "ADP Internal Associate", "description": "Full access to call drivers and internal SOPs"}
    ]


@router.get("/documents")
def list_catalog_documents(limit: int = 50) -> Dict[str, Any]:
    """Lists parent documents from Spanner knowledge_documents table."""
    docs = spanner_service.list_macro_documents(limit=limit)
    return {
        "total": len(docs),
        "documents": docs
    }
