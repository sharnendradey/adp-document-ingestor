"""Unit and Integration tests for Spanner Schema, Graph Lineage, ScaNN Pre-filtering, and Tombstoning."""

import time
import pytest
from app.services.spanner_service import spanner_service
from app.agents.tools.spanner_graph_tool import spanner_graph_tool
from app.models.dsrf_metadata import (
    MacroDocumentMetadata,
    GovernedKnowledgeUnitPayload,
    BusinessUnitEnum,
    ProductFamilyEnum,
    AudienceRoleEnum,
    ConfidentialityEnum,
    LifecycleStageEnum,
    DSFDomainEnum,
    ExpressionStance,
)


def test_spanner_document_and_chunk_batch_insertion():
    """Verifies that Macro documents and Knowledge Unit chunks are persisted properly."""
    doc = MacroDocumentMetadata(
        document_id="doc_compliance_ca_001",
        source_reference="EKM::LEGAL::ca_labor_law_2026",
        content_owner_steward="BU_Knowledge_Ops_MajorAccounts",
        primary_language="en-US",
        confidentiality_classification=ConfidentialityEnum.INTERNAL,
        business_unit=BusinessUnitEnum.MAJOR_ACCOUNTS,
        adp_product_family=[ProductFamilyEnum.WFN],
        product_module="Time & Attendance",
        canonical_dsrf_domain=DSFDomainEnum.PAYROLL,
        domain_path="PAYROLL.TIME_AND_ATTENDANCE.OVERTIME_RULES",
        whole_document_summary="Comprehensive guide to California wage, hour, and daily overtime standards."
    )

    chunk = GovernedKnowledgeUnitPayload(
        chunk_id="ku_ca_overtime_001",
        document_id="doc_compliance_ca_001",
        chunk_index=0,
        chunk_text="Overtime must be calculated daily at 1.5x after 8 hours under California Labor Code Section 510.",
        sha256_hash="c5b2c3d4e5f60718293a4b5c6d7e8f90123456789abcdef0123456789abcdef1",
        audience_roles=[AudienceRoleEnum.HR_PRACTITIONER, AudienceRoleEnum.PAYROLL_PRACTITIONER],
        geographic_scope=["US-CA"],
        lifecycle_stage=LifecycleStageEnum.ACTIVE,
        effective_start_epoch=1000000000,
        effective_end_epoch=2000000000,
        retrieval_eligible=True,
        citation_required=True,
        citation="Cal. Lab. Code § 510",
        expression_stance=ExpressionStance.AUTHORITATIVE,
        content_quality_score=1.0,
        extraction_confidence=0.97
    )

    doc_ok = spanner_service.insert_macro_document(doc)
    chunk_ok = spanner_service.insert_knowledge_units([chunk])

    assert doc_ok is True
    assert chunk_ok is True
    assert "doc_compliance_ca_001" in spanner_service._mock_docs
    assert "ku_ca_overtime_001" in spanner_service._mock_chunks


def test_spanner_scann_prefiltered_vector_search():
    """Verifies that vector search strictly filters by tenant, role, geo, and epoch."""
    current_epoch = int(time.time())

    # Ensure parent document exists in knowledge_documents table for SQL JOIN
    doc = MacroDocumentMetadata(
        document_id="doc_compliance_ca_001",
        document_title="California Labor Code Compliance",
        source_reference="EKM::LEGAL::ca_labor_law_2026",
        content_owner_steward="BU_Knowledge_Ops_MajorAccounts",
        primary_language="en-US",
        confidentiality_classification=ConfidentialityEnum.INTERNAL,
        business_unit=BusinessUnitEnum.MAJOR_ACCOUNTS,
        adp_product_family=[ProductFamilyEnum.WFN],
        product_module="Time & Attendance",
        canonical_dsrf_domain=DSFDomainEnum.TIME_AND_ATTENDANCE,
        domain_path="TIME_AND_ATTENDANCE.COMPLIANCE.MEAL_REST",
        tenant_boundary="GLOBAL",
        raw_content_sha256="c5b2c3d4e5f60718293a4b5c6d7e8f90123456789abcdef0123456789abcdef1"
    )
    spanner_service.insert_macro_document(doc)

    # Active CA Chunk
    chunk_active = GovernedKnowledgeUnitPayload(
        chunk_id="ku_active_ca_rule",
        document_id="doc_compliance_ca_001",
        chunk_index=1,
        chunk_text="Active California rest break rule requires 10 min break per 4 hours.",
        sha256_hash="d5b2c3d4e5f60718293a4b5c6d7e8f90123456789abcdef0123456789abcdef2",
        audience_roles=[AudienceRoleEnum.HR_PRACTITIONER],
        geographic_scope=["US-CA"],
        lifecycle_stage=LifecycleStageEnum.ACTIVE,
        effective_start_epoch=current_epoch - 100000,
        effective_end_epoch=current_epoch + 100000,
        retrieval_eligible=True,
        citation="Cal. Lab. Code § 226.7",
        expression_stance=ExpressionStance.AUTHORITATIVE,
        content_quality_score=1.0,
        extraction_confidence=0.95,
        vector_embedding=[0.1] * 768
    )

    # Expired Chunk (historical 2023 rule)
    chunk_expired = GovernedKnowledgeUnitPayload(
        chunk_id="ku_expired_ca_rule",
        document_id="doc_compliance_ca_001",
        chunk_index=2,
        chunk_text="Expired 2022 California pandemic supplemental paid sick leave.",
        sha256_hash="e5b2c3d4e5f60718293a4b5c6d7e8f90123456789abcdef0123456789abcdef3",
        audience_roles=[AudienceRoleEnum.HR_PRACTITIONER],
        geographic_scope=["US-CA"],
        lifecycle_stage=LifecycleStageEnum.ACTIVE,
        effective_start_epoch=current_epoch - 500000,
        effective_end_epoch=current_epoch - 100000,  # Expired
        retrieval_eligible=True,
        citation="Expired Cal. SPSL 2022",
        expression_stance=ExpressionStance.NORMATIVE,
        content_quality_score=1.0,
        extraction_confidence=0.90,
        vector_embedding=[0.1] * 768
    )

    spanner_service.insert_knowledge_units([chunk_active, chunk_expired])

    # Search with current epoch and HR Practitioner role in US-CA
    results = spanner_service.search_vector_entitled(
        query_vector=[0.1] * 768,
        tenant_boundary="GLOBAL",
        product_families=["adpWorkforceNow"],
        audience_roles=["HR Practitioner"],
        geographies=["US-CA"],
        current_epoch=current_epoch,
        top_k=10
    )

    retrieved_ids = [r["chunk_id"] for r in results]
    assert "ku_active_ca_rule" in retrieved_ids
    # Expired chunk must be completely omitted by temporal pre-filter
    assert "ku_expired_ca_rule" not in retrieved_ids


def test_spanner_graph_lineage_and_exceptions():
    """Verifies that [:HAS_EXCEPTION] graph traversal identifies statutory state overrides."""
    # 1. Base Federal Rule Chunk
    fed_chunk = GovernedKnowledgeUnitPayload(
        chunk_id="ku_fed_overtime_baseline",
        document_id="doc_fed_payroll_001",
        chunk_index=0,
        chunk_text="Federal FLSA overtime standard: 1.5x after 40 hours per workweek.",
        sha256_hash="f5b2c3d4e5f60718293a4b5c6d7e8f90123456789abcdef0123456789abcdef4",
        audience_roles=[AudienceRoleEnum.HR_PRACTITIONER, AudienceRoleEnum.EMPLOYEE],
        geographic_scope=["US-FED"],
        lifecycle_stage=LifecycleStageEnum.ACTIVE,
        effective_start_epoch=1000000000,
        effective_end_epoch=2000000000,
        retrieval_eligible=True,
        citation="29 U.S.C. § 207(a)(1)",
        expression_stance=ExpressionStance.AUTHORITATIVE,
        content_quality_score=1.0,
        extraction_confidence=0.99
    )

    # 2. California Statutory Override Chunk
    ca_override_chunk = GovernedKnowledgeUnitPayload(
        chunk_id="ku_ca_daily_overtime_override",
        document_id="doc_compliance_ca_001",
        chunk_index=3,
        chunk_text="California daily overtime exception: 1.5x after 8 hours in a single workday.",
        sha256_hash="05b2c3d4e5f60718293a4b5c6d7e8f90123456789abcdef0123456789abcdef5",
        audience_roles=[AudienceRoleEnum.HR_PRACTITIONER, AudienceRoleEnum.EMPLOYEE],
        geographic_scope=["US-CA"],
        lifecycle_stage=LifecycleStageEnum.ACTIVE,
        effective_start_epoch=1000000000,
        effective_end_epoch=2000000000,
        retrieval_eligible=True,
        citation="Cal. Lab. Code § 510",
        expression_stance=ExpressionStance.AUTHORITATIVE,
        content_quality_score=1.0,
        extraction_confidence=0.98
    )

    spanner_service.insert_knowledge_units([fed_chunk, ca_override_chunk])

    # 3. Create [:HAS_EXCEPTION] graph edge linking Federal baseline to CA override
    spanner_service.insert_graph_edge(
        edge_id="edge_flsa_ca_exception_001",
        source_chunk_id="ku_fed_overtime_baseline",
        target_chunk_id="ku_ca_daily_overtime_override",
        edge_type="HAS_EXCEPTION",
        effective_epoch=1000000000,
        jurisdiction_override="US-CA"
    )

    # When querying for US-CA: override must be resolved
    ca_overrides = spanner_graph_tool.resolve_jurisdiction_exceptions(
        candidate_chunk_ids=["ku_fed_overtime_baseline"],
        jurisdiction_codes=["US-CA"]
    )
    assert len(ca_overrides) == 1
    assert ca_overrides[0]["parent_chunk_id"] == "ku_fed_overtime_baseline"
    assert ca_overrides[0]["override_chunk_id"] == "ku_ca_daily_overtime_override"
    assert "California daily overtime exception" in ca_overrides[0]["override_text"]

    # When querying for US-TX: no override exists, standard federal rule remains unmutated
    tx_overrides = spanner_graph_tool.resolve_jurisdiction_exceptions(
        candidate_chunk_ids=["ku_fed_overtime_baseline"],
        jurisdiction_codes=["US-TX"]
    )
    assert len(tx_overrides) == 0


def test_cryptographic_tombstone_eviction():
    """Verifies that tombstoned knowledge units are immediately purged from vector search."""
    chunk_to_revoke = GovernedKnowledgeUnitPayload(
        chunk_id="ku_erroneous_tax_rule",
        document_id="doc_fed_payroll_001",
        chunk_index=5,
        chunk_text="Erroneous tax withholding formula superseded due to regulatory bug.",
        sha256_hash="15b2c3d4e5f60718293a4b5c6d7e8f90123456789abcdef0123456789abcdef6",
        audience_roles=[AudienceRoleEnum.PAYROLL_PRACTITIONER],
        geographic_scope=["US-FED"],
        lifecycle_stage=LifecycleStageEnum.ACTIVE,
        effective_start_epoch=1000000000,
        effective_end_epoch=2000000000,
        retrieval_eligible=True,
        citation="ADP Internal Defect 4092",
        expression_stance=ExpressionStance.NORMATIVE,
        content_quality_score=1.0,
        extraction_confidence=0.91
    )

    spanner_service.insert_knowledge_units([chunk_to_revoke])

    # Record cryptographic tombstone
    tomb_ok = spanner_service.record_tombstone(
        chunk_id="ku_erroneous_tax_rule",
        reason="Security defect hotfix - regulatory calculation invalid",
        revoked_by="Compliance_Steward_Lead"
    )
    assert tomb_ok is True

    # Search with identical persona
    results = spanner_service.search_vector_entitled(
        query_vector=[0.1] * 768,
        tenant_boundary="GLOBAL",
        product_families=["runPoweredByAdp"],
        audience_roles=["Payroll Practitioner"],
        geographies=["US-FED"],
        current_epoch=int(time.time()),
        top_k=10
    )

    retrieved_ids = [r["chunk_id"] for r in results]
    assert "ku_erroneous_tax_rule" not in retrieved_ids
