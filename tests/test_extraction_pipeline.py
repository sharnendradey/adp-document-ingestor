"""Unit and Integration tests for Two-Pass Extraction Pipeline & Pydantic Validation."""

import pytest
from app.ingestion.layout_parser import document_ai_tool
from app.agents.tools.gemini_extraction_tool import gemini_extraction_tool
from app.models.dsrf_metadata import (
    GovernedKnowledgeUnitPayload,
    AudienceRoleEnum,
    LifecycleStageEnum,
    compute_extraction_confidence,
)


def test_document_ai_layout_parsing():
    """Verifies that Document AI tool preserves table grids and binds footnotes."""
    sample_text = (
        "# Section 4: Direct Deposit Administration\n"
        "Employers must configure ACH payment limits before initiating payroll.\n"
        "| Option | Limit | Processing Time |\n"
        "| Net Split | $5,000 | 2 Business Days |\n"
        "* Note: Under NJ Rev Stat § 34:11-4.2, employee consent is required for electronic deposit.\n"
    )

    result = document_ai_tool.parse_document(sample_text, "test_doc.txt")
    assert result["total_blocks"] > 0
    
    # Verify table row preserved
    blocks = result["layout_tree"]
    text_content = " ".join([b["text"] for b in blocks])
    assert "[TABLE_ROW]:" in text_content
    assert "[BOUND_FOOTNOTE:" in text_content
    assert "NJ Rev Stat § 34:11-4.2" in text_content


def test_pydantic_schema_validation_success():
    """Verifies that valid attributes pass Pydantic quality gate."""
    payload = gemini_extraction_tool.extract_chunk_payload(
        document_id="doc_payroll_001",
        chunk_index=0,
        chunk_text="Employers may split direct deposits across up to 4 accounts per employee under RUN.",
        headings=["Section 4", "4.2 Net Split"]
    )

    assert payload.chunk_id.startswith("ku_doc_payroll_")
    assert len(payload.sha256_hash) == 64
    assert AudienceRoleEnum.HR_PRACTITIONER in payload.audience_roles or AudienceRoleEnum.EMPLOYEE in payload.audience_roles
    assert "US-FED" in payload.geographic_scope
    assert payload.effective_start_epoch <= payload.effective_end_epoch
    assert payload.extraction_confidence >= 0.88


def test_pydantic_temporal_validation_rejection():
    """Verifies that start_epoch > end_epoch raises validation error."""
    with pytest.raises(ValueError, match="Temporal invalidity"):
        GovernedKnowledgeUnitPayload(
            chunk_id="test_invalid_epoch",
            document_id="doc_001",
            chunk_index=1,
            chunk_text="Sample compliance text with invalid temporal dates.",
            sha256_hash="a" * 64,
            audience_roles=[AudienceRoleEnum.EMPLOYEE],
            geographic_scope=["US-FED"],
            lifecycle_stage=LifecycleStageEnum.ACTIVE,
            effective_start_epoch=2000000000,
            effective_end_epoch=1000000000,  # Invalid: end < start
            retrieval_eligible=True,
            citation_required=False,
            expression_stance="Normative",
            content_quality_score=1.0,
            extraction_confidence=0.9
        )


def test_pydantic_sha256_rejection():
    """Verifies that corrupt or short SHA-256 hashes are rejected."""
    with pytest.raises(ValueError, match="Invalid SHA-256"):
        GovernedKnowledgeUnitPayload(
            chunk_id="test_invalid_hash",
            document_id="doc_001",
            chunk_index=1,
            chunk_text="Sample compliance text with invalid sha256.",
            sha256_hash="invalid_hash_string",
            audience_roles=[AudienceRoleEnum.EMPLOYEE],
            geographic_scope=["US-FED"],
            lifecycle_stage=LifecycleStageEnum.ACTIVE,
            effective_start_epoch=1000000000,
            effective_end_epoch=2000000000,
            retrieval_eligible=True,
            citation_required=False,
            expression_stance="Normative",
            content_quality_score=1.0,
            extraction_confidence=0.9
        )


def test_confidence_formula():
    """Verifies deterministic confidence weighting formula."""
    # 0.40 * 0.95 + 0.35 * 1.0 + 0.25 * 0.90 = 0.38 + 0.35 + 0.225 = 0.955
    score = compute_extraction_confidence(token_probs_mean=0.95, completeness_score=1.0, grounding_score=0.90)
    assert score == 0.955


def test_parent_table_macro_metadata_no_embeddings():
    """Verifies that parent table MacroDocumentMetadata has NO embeddings and rich search facets."""
    content = (
        "# Direct Deposit Policy and Limits\n"
        "This policy governs ACH payment limits, pre-tax deductions, and wage payment workflows under RUN.\n"
        "All employers must adhere to federal electronic fund transfer mandates."
    )
    macro_doc = gemini_extraction_tool.extract_macro_document(
        document_id="doc_test_001",
        content=content,
        source_system_id="RUN_CORE",
        table_of_contents=["Direct Deposit Policy and Limits"],
        document_title="Direct Deposit Policy"
    )

    # Primary architectural rule: Parent catalog table must NOT store embeddings
    assert macro_doc.whole_doc_embedding is None
    assert macro_doc.document_title == "Direct Deposit Policy"
    assert len(macro_doc.document_summary) > 20
    assert len(macro_doc.raw_content_sha256) == 64
    assert "Direct Deposit Policy and Limits" in macro_doc.table_of_contents
    assert len(macro_doc.search_keywords) > 0


def test_deterministic_composite_hash_deduplication():
    """Verifies that composite hashes guarantee deterministic deduplication across uploads."""
    from app.models.dsrf_metadata import compute_document_hash_id, compute_chunk_hash_id

    content = "Sample statutory payroll policy for state withholding."
    doc_hash_1 = compute_document_hash_id(
        tenant_boundary="GLOBAL",
        business_unit="majorAccounts",
        product_families=["runPoweredByAdp"],
        source_reference="EKM::RUN::guid-1234",
        raw_content=content
    )
    doc_hash_2 = compute_document_hash_id(
        tenant_boundary="GLOBAL",
        business_unit="majorAccounts",
        product_families=["runPoweredByAdp"],
        source_reference="EKM::RUN::guid-1234",
        raw_content=content
    )
    # Identical input must produce identical primary key for O(1) deduplication
    assert doc_hash_1 == doc_hash_2
    assert doc_hash_1.startswith("doc_")

    # Child chunk hash binds to parent hash
    chunk_hash = compute_chunk_hash_id(doc_hash_1, 0, content)
    assert doc_hash_1[:16] in chunk_hash


def test_768_100_sliding_window_chunking():
    """Verifies that passages exceeding 768 tokens are partitioned with 100-token sliding overlap."""
    # Create long text of 700 words (~930 tokens > 768 tokens)
    repeated_sentence = "Employers must ensure timely electronic direct deposit transmissions for all active employees. "
    long_content = "# Section 1: Overview\n" + (repeated_sentence * 70)
    
    result = document_ai_tool.parse_document(long_content, "long_manual.txt")
    blocks = result["layout_tree"]
    # Long block must be sliced into multiple parts with sliding overlap
    assert len(blocks) >= 2
    assert "Part 1" in blocks[0]["heading"]
    assert "Part 2" in blocks[1]["heading"]
    assert result["table_of_contents"] == ["Section 1: Overview"]

