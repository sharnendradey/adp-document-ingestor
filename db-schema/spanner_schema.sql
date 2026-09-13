-- =============================================================================
-- GOOGLE CLOUD SPANNER PRODUCTION DDL: ADP QUESTA ENTERPRISE KNOWLEDGE PLATFORM
-- Instance ID: adp-test-spanner
-- Database ID: adp_governed_knowledge
-- Dialect:     GoogleSQL (Spanner Standard)
-- Target SLA:  < 2.5ms Pre-Filtered Vector Search | < 1.2ms Graph Traversal
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. DOCUMENT-LEVEL CATALOG TABLE (BU Admin & Ingress Governance Scope)
-- -----------------------------------------------------------------------------
CREATE TABLE knowledge_documents (
    document_id STRING(64) NOT NULL,
    document_title STRING(256) NOT NULL,
    source_reference STRING(512) NOT NULL,
    content_owner_steward STRING(256) NOT NULL,
    primary_language STRING(16) NOT NULL,
    confidentiality_classification STRING(32) NOT NULL,
    business_unit STRING(64) NOT NULL,
    adp_product_family ARRAY<STRING(64)> NOT NULL,
    product_module STRING(128),
    delivery_platform STRING(32),
    canonical_dsrf_domain STRING(64) NOT NULL,
    domain_path STRING(256) NOT NULL,
    tenant_boundary STRING(128) NOT NULL,
    data_plane STRING(64) NOT NULL,
    document_summary STRING(MAX) NOT NULL,
    table_of_contents ARRAY<STRING(256)>,
    search_keywords ARRAY<STRING(64)>,
    raw_content_sha256 STRING(64) NOT NULL,
    created_at TIMESTAMP NOT NULL OPTIONS (allow_commit_timestamp=true),
    updated_at TIMESTAMP NOT NULL OPTIONS (allow_commit_timestamp=true)
) PRIMARY KEY (document_id ASC);

CREATE INDEX idx_docs_tenant_bu_domain 
ON knowledge_documents (tenant_boundary, business_unit, canonical_dsrf_domain);

CREATE INDEX idx_docs_source_ref 
ON knowledge_documents (source_reference);

CREATE INDEX idx_docs_content_hash 
ON knowledge_documents (raw_content_sha256);

-- -----------------------------------------------------------------------------
-- 2. CHUNK-LEVEL KNOWLEDGE UNITS TABLE (Runtime ABAC Atom & Retrieval Core)
-- -----------------------------------------------------------------------------
CREATE TABLE knowledge_units (
    chunk_id STRING(128) NOT NULL,
    document_id STRING(128) NOT NULL,
    bound_document_ids ARRAY<STRING(128)>,
    chunk_index INT64 NOT NULL,
    chunk_text STRING(MAX) NOT NULL,
    
    -- Native Full-Text Search Token List
    chunk_tokens TOKENLIST AS (TOKENIZE_FULLTEXT(chunk_text)) HIDDEN,
    
    -- Exact Syntactic Byte Hash for O(1) Deduplication
    sha256_hash STRING(64) NOT NULL,
    chunk_headings ARRAY<STRING(256)>,
    
    -- Tri-View Knowledge Unit Components
    generated_qa_pairs JSON,          -- Conversational View: Matrix of synthetic Q&A pairs
    tabular_representation JSON,      -- Agentic View: Structured parameter rows/columns
    
    -- Runtime ABAC Whitelists (Bucket 1 & 2)
    audience_roles ARRAY<STRING(64)> NOT NULL,
    geographic_scope ARRAY<STRING(32)> NOT NULL,
    lifecycle_stage STRING(32) NOT NULL,
    effective_date STRING(64),
    effective_start_epoch INT64 NOT NULL,
    effective_end_epoch INT64 NOT NULL,
    review_expiry_date STRING(64),
    retrieval_eligible BOOL NOT NULL,
    
    -- Legal Backing & Semantic Grounding
    citation_required BOOL NOT NULL,
    citation STRING(MAX),
    expression_stance STRING(64) NOT NULL,
    
    -- Phase 2 AI Controls & Derived Flags (Bucket 3 & 4)
    generative_use_allowed BOOL NOT NULL,
    training_use_allowed BOOL NOT NULL,
    restricted_prompt_context BOOL NOT NULL,
    contains_pii BOOL NOT NULL,
    client_facing_allowed STRING(32) NOT NULL,
    topic_tags ARRAY<STRING(64)>,
    entity_extraction ARRAY<STRING(128)>,
    duplicate_near_duplicate_flag BOOL,
    content_quality_score FLOAT64 NOT NULL,
    extraction_confidence FLOAT64 NOT NULL,
    
    -- 768-Dimensional Dense Vector Embedding (text-embedding-004)
    vector_embedding ARRAY<FLOAT64>(vector_length=>768),
    
    -- Lifecycle Promotion Status (ACTIVE, STAGED_UNPROMOTED, RECALLED)
    status STRING(32) NOT NULL,
    created_at TIMESTAMP NOT NULL OPTIONS (allow_commit_timestamp=true)
) PRIMARY KEY (chunk_id ASC);

CREATE INDEX idx_ku_document_id ON knowledge_units (document_id);
CREATE INDEX idx_ku_sha256 ON knowledge_units (sha256_hash);
CREATE INDEX idx_ku_status_eligible ON knowledge_units (status, retrieval_eligible);
CREATE INDEX idx_ku_epochs ON knowledge_units (effective_start_epoch, effective_end_epoch);

-- Spanner Full-Text Search Index for Lexical Rank Fusion
CREATE SEARCH INDEX idx_ku_fts ON knowledge_units (chunk_tokens);

-- -----------------------------------------------------------------------------
-- 3. KNOWLEDGE GRAPH LINEAGE EDGES (Property Graph for Overrides & Lineage)
-- -----------------------------------------------------------------------------
CREATE TABLE knowledge_graph_edges (
    edge_id STRING(128) NOT NULL,
    source_chunk_id STRING(128) NOT NULL,
    target_chunk_id STRING(128) NOT NULL,
    edge_type STRING(64) NOT NULL, -- SUPERSEDES, HAS_EXCEPTION, DEPENDS_ON, CONTAINS
    effective_epoch INT64 NOT NULL,
    jurisdiction_override STRING(32),
    edge_metadata JSON,
    created_at TIMESTAMP NOT NULL OPTIONS (allow_commit_timestamp=true)
) PRIMARY KEY (edge_id ASC);

CREATE INDEX idx_edge_source_type ON knowledge_graph_edges (source_chunk_id, edge_type);
CREATE INDEX idx_edge_target ON knowledge_graph_edges (target_chunk_id);

-- -----------------------------------------------------------------------------
-- 4. CRYPTOGRAPHIC AUDIT & TOMBSTONE LOG TABLE (Statutory Sunset Tracking)
-- -----------------------------------------------------------------------------
CREATE TABLE audit_log_tombstones (
    tombstone_id STRING(128) NOT NULL,
    chunk_id STRING(128) NOT NULL,
    reason STRING(256) NOT NULL,
    revoked_by STRING(256) NOT NULL,
    revocation_epoch INT64 NOT NULL,
    sha256_hash STRING(64) NOT NULL,
    created_at TIMESTAMP NOT NULL OPTIONS (allow_commit_timestamp=true)
) PRIMARY KEY (tombstone_id ASC);
