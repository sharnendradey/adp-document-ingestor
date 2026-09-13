"""Unit tests for ADP Questa Prompts & System Instructions."""

from app.agents.prompts import (
    SUPERVISOR_SYSTEM_PROMPT,
    METADATA_EXTRACTION_PROMPT,
    ENTITLEMENT_GATEWAY_PROMPT,
    KNOWLEDGE_RETRIEVAL_PROMPT,
    FRONTLINE_DELIVERY_PROMPT,
    VERIFYAI_QUARANTINE_PROMPT,
)
from app.agents.root_supervisor import root_supervisor_agent
from app.agents.sub_agents.metadata_extraction_agent import extraction_agent
from app.agents.sub_agents.entitlement_gateway_agent import entitlement_gateway_agent
from app.agents.sub_agents.knowledge_retrieval_agent import retrieval_agent
from app.agents.sub_agents.frontline_delivery_agent import frontline_delivery_agent


def test_prompts_exported_and_non_empty():
    """Verifies that all required prompt constants are non-empty strings."""
    prompts = [
        SUPERVISOR_SYSTEM_PROMPT,
        METADATA_EXTRACTION_PROMPT,
        ENTITLEMENT_GATEWAY_PROMPT,
        KNOWLEDGE_RETRIEVAL_PROMPT,
        FRONTLINE_DELIVERY_PROMPT,
        VERIFYAI_QUARANTINE_PROMPT,
    ]
    for p in prompts:
        assert isinstance(p, str)
        assert len(p.strip()) > 100


def test_supervisor_prompt_directives():
    """Verifies that supervisor prompt contains core safety and governance mandates."""
    assert "ZERO EXTERNAL HALLUCINATION" in SUPERVISOR_SYSTEM_PROMPT
    assert "MODEL ARMOR" in SUPERVISOR_SYSTEM_PROMPT
    assert "10-Field Sebastian Context Envelope" in SUPERVISOR_SYSTEM_PROMPT
    assert "2-TURN CIRCUIT BREAKER" in SUPERVISOR_SYSTEM_PROMPT
    assert root_supervisor_agent.system_instruction == SUPERVISOR_SYSTEM_PROMPT


def test_subagent_prompts_bound():
    """Verifies that each subagent has its corresponding prompt bound on instantiation."""
    assert extraction_agent.system_prompt == METADATA_EXTRACTION_PROMPT
    assert entitlement_gateway_agent.system_prompt == ENTITLEMENT_GATEWAY_PROMPT
    assert retrieval_agent.system_prompt == KNOWLEDGE_RETRIEVAL_PROMPT
    assert frontline_delivery_agent.system_prompt == FRONTLINE_DELIVERY_PROMPT
