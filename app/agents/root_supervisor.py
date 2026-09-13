"""Central Root Supervisor Agent orchestrating Questa Knowledge & Runtime Entitlements."""

import logging
import re
import time
from typing import Any, Dict, Optional

from app.config import settings
from app.agents.prompts import SUPERVISOR_SYSTEM_PROMPT
from app.agents.sub_agents.metadata_extraction_agent import extraction_agent
from app.agents.sub_agents.entitlement_gateway_agent import entitlement_gateway_agent
from app.agents.sub_agents.knowledge_retrieval_agent import retrieval_agent
from app.agents.sub_agents.frontline_delivery_agent import frontline_delivery_agent
from app.models.context_envelope import AgentChatTurnResponse

logger = logging.getLogger("adp-questa.agent.root")


class QuestaRootSupervisorAgent:
    """The central ADK Supervisor coordinating Ingestion, Entitlements, and Delivery."""

    def __init__(self):
        self.agent_name = settings.AGENT_NAME
        self.model_name = settings.SUPERVISOR_MODEL_NAME
        self.system_instruction = SUPERVISOR_SYSTEM_PROMPT

    # -------------------------------------------------------------------------
    # 1. SECURITY & SCRUBBING DEFENSE (Model Armor Pattern)
    # -------------------------------------------------------------------------
    def detect_prompt_injection(self, text: str) -> bool:
        """Detects adversarial jailbreak attempts and prompt injections."""
        injection_patterns = [
            r"ignore\s+(all\s+)?previous\s+instructions",
            r"you\s+are\s+now\s+in\s+developer\s+mode",
            r"reveal\s+(the\s+)?system\s+prompt",
            r"bypass\s+entitlements",
            r"show\s+all\s+client\s+data"
        ]
        for pat in injection_patterns:
            if re.search(pat, text, re.IGNORECASE):
                logger.warning(f"Adversarial prompt injection pattern detected: '{pat}'")
                return True
        return False

    def scrub_pii(self, text: str) -> str:
        """Sanitizes SSNs and credit card numbers from queries."""
        # Redact SSN
        text = re.sub(r"\b\d{3}-\d{2}-\d{4}\b", "[REDACTED_SSN]", text)
        # Redact Credit Card
        text = re.sub(r"\b(?:\d{4}-){3}\d{4}\b", "[REDACTED_CARD]", text)
        return text

    # -------------------------------------------------------------------------
    # 2. WRITE-TIME INGESTION ORCHESTRATION
    # -------------------------------------------------------------------------
    def ingest_document(
        self,
        document_id: str,
        raw_text: str,
        filename: str,
        source_system_id: str = "EKM_CORE"
    ) -> Dict[str, Any]:
        """Routes document ingestion to MetadataExtractionAgent."""
        logger.info(f"Supervisor routing document {document_id} to Extraction Pipeline")
        return extraction_agent.process_document(
            document_id=document_id,
            raw_text=raw_text,
            filename=filename,
            source_system_id=source_system_id
        )

    def ingest_file(
        self,
        file_path: str,
        source_system_id: str = "CLIENT_DATA_CORPUS",
        document_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Routes physical file ingestion (.xlsx, .docx, .pdf, .html, .csv) to MetadataExtractionAgent."""
        logger.info(f"Supervisor routing file {file_path} to Extraction Pipeline")
        return extraction_agent.process_file(
            file_path=file_path,
            source_system_id=source_system_id,
            document_id=document_id
        )


    # -------------------------------------------------------------------------
    # 3. READ-TIME RUNTIME ENTITLEMENTS & RETRIEVAL ORCHESTRATION
    # -------------------------------------------------------------------------
    def handle_chat_turn(
        self,
        query: str,
        user_id: str,
        client_tenant_id: str,
        turn_count: int = 1,
        channel: str = "SELF_SERVICE"
    ) -> AgentChatTurnResponse:
        """Coordinates Sub-5ms ABAC resolution, Vector Retrieval, and Frontline Delivery."""
        start_turn = time.perf_counter()

        # Step 1: Security & Injection Scrubbing
        if self.detect_prompt_injection(query):
            return AgentChatTurnResponse(
                session_id=f"sess_{user_id}",
                turn_count=turn_count,
                circuit_breaker_triggered=True,
                resolution_status="SECURITY_BLOCKED",
                answer="Request blocked by Model Armor security defense.",
                context_envelope=None,
                retrieved_chunk_ids=[],
                retrieval_latency_ms=0.0
            )

        clean_query = self.scrub_pii(query)

        # Step 2: Resolve ABAC Entitlement Context in < 1ms via Redis
        session_context = entitlement_gateway_agent.resolve_caller_context(
            user_id=user_id,
            client_tenant_id=client_tenant_id,
            channel=channel
        )

        # Step 3: Execute Pre-Filtered Vector & Graph Retrieval (< 4ms)
        retrieval_data = retrieval_agent.retrieve_entitled_knowledge(
            query=clean_query,
            session=session_context,
            top_k=5
        )

        # Step 4: Synthesize 10-Field Sebastian Context Envelope & Evaluate Circuit Breaker
        response = frontline_delivery_agent.synthesize_response(
            query=clean_query,
            retrieval_data=retrieval_data,
            session=session_context,
            turn_count=turn_count
        )

        total_turn_ms = (time.perf_counter() - start_turn) * 1000.0
        logger.info(
            f"Turn complete for {user_id} in {total_turn_ms:.2f}ms. "
            f"Status: {response.resolution_status}, Breaker: {response.circuit_breaker_triggered}"
        )
        return response


root_supervisor_agent = QuestaRootSupervisorAgent()
