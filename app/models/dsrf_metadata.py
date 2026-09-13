"""DSRF and Knowledge Platform Metadata Models (August 6, 2026 Core Team Specification)."""

import hashlib
import re
from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field, field_validator, model_validator


# -----------------------------------------------------------------------------
# 0. DETERMINISTIC COMPOSITE HASH DEDUPLICATION (Parent & Child Tables)
# -----------------------------------------------------------------------------
def compute_document_hash_id(
    tenant_boundary: str,
    business_unit: str,
    product_families: List[str],
    source_reference: str,
    raw_content: str
) -> str:
    """Computes deterministic multi-column composite hash for parent document deduplication.
    Combines tenant + BU + product + source URI + raw content SHA-256.
    """
    content_sha = hashlib.sha256(raw_content.encode("utf-8")).hexdigest()
    sorted_prods = ",".join(sorted(product_families))
    raw_key = f"{tenant_boundary}|{business_unit}|{sorted_prods}|{source_reference}|{content_sha}"
    doc_hash = hashlib.sha256(raw_key.encode("utf-8")).hexdigest()
    return f"doc_{doc_hash[:32]}"


def compute_chunk_hash_id(
    document_id: str,
    chunk_index: int,
    chunk_text: str
) -> str:
    """Computes deterministic composite hash for child chunk binding and passage deduplication.
    Combines parent document hash + chunk index offset + chunk passage SHA-256.
    """
    chunk_sha = hashlib.sha256(chunk_text.encode("utf-8")).hexdigest()
    raw_key = f"{document_id}|{chunk_index:04d}|{chunk_sha}"
    chunk_hash = hashlib.sha256(raw_key.encode("utf-8")).hexdigest()
    doc_prefix = document_id[:16]
    return f"ku_{doc_prefix}_{chunk_index:04d}_{chunk_hash[:12]}"


# -----------------------------------------------------------------------------
# 1. CONTROLLED TAXONOMIC ENUMS (Aug 6, 2026 Unified Core Team Review)
# -----------------------------------------------------------------------------
class BusinessUnitEnum(str, Enum):
    MAJOR_ACCOUNTS = "majorAccounts"
    NATIONAL_ACCOUNTS = "nationalAccounts"
    HUMAN_RESOURCE_OUTSOURCING = "humanResourceOutsourcing"
    CANADA_MAS = "canadaMas"
    CANADA_NAS = "canadaNas"
    CANADA_HRO = "canadaHro"


class ProductFamilyEnum(str, Enum):
    WFN = "adpWorkforceNow"
    WFN_NEXT_GEN = "adpWorkforceNowNextGen"
    RUN = "runPoweredByAdp"
    LYRIC = "adpLyric"
    TOTALSOURCE = "adpTotalSource"
    VANTAGE = "adpVantage"
    ENTERPRISE = "adpEnterprise"


class DeliveryPlatformEnum(str, Enum):
    WEB = "web"
    MOBILE = "mobile"
    API = "API"
    FILE = "file"


class AudienceRoleEnum(str, Enum):
    EMPLOYEE = "Employee"
    MANAGER = "Manager"
    HR_PRACTITIONER = "HR Practitioner"
    PAYROLL_PRACTITIONER = "Payroll Practitioner"
    BENEFITS_ADMIN = "Benefits Admin"
    CLIENT_ADMIN = "Client Admin"
    EXECUTIVE = "Executive"
    ADP_ASSOCIATE = "ADP Associate"
    ALL = "All"


class ConfidentialityEnum(str, Enum):
    PUBLIC = "Public"
    INTERNAL = "Internal"
    CONFIDENTIAL = "Confidential"
    RESTRICTED = "Restricted"


class LifecycleStageEnum(str, Enum):
    DRAFT = "Draft"
    ACTIVE = "Active"
    UNDER_REVIEW = "Under Review"
    DEPRECATED = "Deprecated"
    ARCHIVED = "Archived"


class ClientFacingEnum(str, Enum):
    CLIENT_FACING = "Client-facing"
    ASSOCIATE_ONLY = "Associate-only"
    RESTRICTED = "Restricted"


class ExpressionStance(str, Enum):
    NORMATIVE = "Normative"           # Standard baseline rule
    AUTHORITATIVE = "Authoritative"   # Statutory legal command (e.g., IRS Code)
    ADVISORY = "Advisory"             # Recommended best practice
    INFORMATIONAL = "Informational"   # General background
    INTERPRETIVE = "Interpretive"     # Policy interpretation
    PROVISIONAL = "Provisional"       # Draft / pending legislation


class DSFDomainEnum(str, Enum):
    PAYROLL = "PAYROLL"
    TAX_COMPLIANCE = "TAX_COMPLIANCE"
    BENEFITS = "BENEFITS"
    TIME_AND_ATTENDANCE = "TIME_AND_ATTENDANCE"
    TALENT_AND_HR = "TALENT_AND_HR"
    COMMERCIAL_PLATFORM = "COMMERCIAL_PLATFORM"


class DataPlaneEnum(str, Enum):
    PUBLIC = "Public"
    ADP_PROPRIETARY = "ADP Proprietary"
    CLIENT_SPECIFIC = "Client-Specific"


# -----------------------------------------------------------------------------
# 2. DOCUMENT-LEVEL INGESTION METADATA CONTRACT (BU Admin & Catalog Scope)
# -----------------------------------------------------------------------------
class MacroDocumentMetadata(BaseModel):
    """Document-level governance metadata representing the macro ingestion envelope (NO EMBEDDINGS)."""
    document_id: str = Field(..., description="Unique deterministic composite hash identifier")
    document_title: str = Field(default="Untitled Document", description="Document title extracted from metadata or primary heading")
    source_reference: str = Field(..., description="Canonical URI: EKM::<system>::<guid>")
    content_owner_steward: str = Field(..., description="Steward identity or BU fallback: BU_Knowledge_Ops_<BU>")
    primary_language: str = Field(default="en-US", description="ISO 639-1 language code")
    confidentiality_classification: ConfidentialityEnum = Field(default=ConfidentialityEnum.INTERNAL)
    business_unit: BusinessUnitEnum = Field(..., description="Level 1 organizational alignment")
    adp_product_family: List[ProductFamilyEnum] = Field(..., min_length=1, description="Level 2 Product Family")
    product_module: Optional[str] = Field(None, description="Level 3 functional area (e.g. Time & Attendance)")
    delivery_platform: Optional[DeliveryPlatformEnum] = Field(default=DeliveryPlatformEnum.WEB)
    canonical_dsrf_domain: DSFDomainEnum = Field(..., description="Primary macro DSF domain")
    domain_path: str = Field(..., description="Minimum Level 1-3 path: DOMAIN.SERVICE.FEATURE")
    tenant_boundary: str = Field(default="GLOBAL", description="Client tenant ID or GLOBAL for shared corpus")
    data_plane: DataPlaneEnum = Field(default=DataPlaneEnum.ADP_PROPRIETARY)
    document_summary: str = Field(default="", description="Executive summary of the document for catalog search")
    whole_document_summary: Optional[str] = Field(None, description="Deprecated alias for document_summary")
    table_of_contents: List[str] = Field(default_factory=list, description="Section heading breadcrumbs outline")
    search_keywords: List[str] = Field(default_factory=list, description="Faceted keyword tags for search filtering")
    raw_content_sha256: str = Field(default="", description="Exact SHA-256 hash of raw source text for O(1) deduplication")
    whole_doc_embedding: Optional[List[float]] = Field(None, description="Deprecated - embeddings stored only in child table")

    @model_validator(mode="after")
    def sync_summary_fields(self):
        if not self.document_summary and self.whole_document_summary:
            self.document_summary = self.whole_document_summary
        elif self.document_summary and not self.whole_document_summary:
            self.whole_document_summary = self.document_summary
        return self


# -----------------------------------------------------------------------------
# 3. CHUNK-LEVEL KNOWLEDGE UNIT PAYLOAD CONTRACT (Runtime Retrieval & ABAC Scope)
# -----------------------------------------------------------------------------
class GovernedKnowledgeUnitPayload(BaseModel):
    """Chunk-level Knowledge Unit payload representing the atomic retrieval unit."""
    # Identifiers & Provenance
    chunk_id: str = Field(..., description="Deterministic UUID5 hash of parent_doc + chunk_index")
    document_id: str = Field(..., description="Binds child chunk to parent MacroDocumentMetadata")
    bound_document_ids: List[str] = Field(default_factory=list, description="All document IDs that share this chunk across versions")
    chunk_index: int = Field(..., ge=0, description="0-based sequence offset within document")
    chunk_text: str = Field(..., min_length=10, description="Sanitized, layout-preserved passage text")
    sha256_hash: str = Field(..., description="64-character hex hash for O(1) syntactic deduplication")
    chunk_headings: List[str] = Field(default_factory=list, description="Hierarchical breadcrumbs")
    
    # Tri-View Knowledge Unit Representations
    generated_qa_pairs: Optional[List[Dict[str, Any]]] = Field(default=None, description="Conversational View: Generated Q&A pairs")
    tabular_representation: Optional[Dict[str, Any]] = Field(default=None, description="Agentic View: Structured parameter rows/columns")
    
    # Runtime Entitlement & ABAC Attributes (Bucket 1 & 2)
    audience_roles: List[AudienceRoleEnum] = Field(..., min_length=1, description="Target consumer role whitelist")
    geographic_scope: List[str] = Field(default=["US-FED"], description="ISO 3166-1/2 jurisdictions (e.g. US-FED, US-NJ)")
    lifecycle_stage: LifecycleStageEnum = Field(default=LifecycleStageEnum.ACTIVE)
    effective_date: Optional[str] = Field(None, description="ISO 8601 UTC timestamp")
    effective_start_epoch: int = Field(default=0, description="Unix epoch in seconds for ScaNN numeric pre-filtering")
    effective_end_epoch: int = Field(default=2147483647, description="Unix epoch in seconds (2147483647 = indefinitely active)")
    review_expiry_date: Optional[str] = Field(None, description="Sunset timestamp for automated staleness eviction")
    retrieval_eligible: bool = Field(default=True, description="Master gating flag; False excludes chunk from Vector Search")
    
    # Legal Backing & Semantic Grounding
    citation_required: bool = Field(default=True, description="Mandates citation attachment in frontline assembly")
    citation: Optional[str] = Field(None, description="Statutory reference (e.g. NJ Rev Stat § 34:11-4.2)")
    expression_stance: ExpressionStance = Field(default=ExpressionStance.NORMATIVE)
    
    # Phase 2 Deferred AI Controls (Bucket 3)
    generative_use_allowed: bool = Field(default=True, description="Controls LLM context synthesis eligibility")
    training_use_allowed: bool = Field(default=False, description="Controls fine-tuning/eval dataset inclusion")
    restricted_prompt_context: bool = Field(default=False, description="Requires air-gapped non-logging inference")
    
    # Derived & AI-Enriched Fields (Bucket 4 & 5)
    contains_pii: bool = Field(default=False, description="Derived automatically via Cloud SDP scan")
    client_facing_allowed: ClientFacingEnum = Field(default=ClientFacingEnum.CLIENT_FACING)
    topic_tags: List[str] = Field(default_factory=list, description="Faceted search keywords")
    entity_extraction: List[str] = Field(default_factory=list, description="Named backend systems, regulations, clients")
    duplicate_near_duplicate_flag: bool = Field(default=False)
    content_quality_score: float = Field(default=1.0, ge=0.0, le=1.0)
    extraction_confidence: float = Field(default=1.0, ge=0.0, le=1.0)
    
    # Vector Embedding & Persistence Status
    vector_embedding: Optional[List[float]] = Field(None, description="768-dimensional dense vector")
    status: str = Field(default="ACTIVE", description="ACTIVE, STAGED_UNPROMOTED, or RECALLED")

    # -------------------------------------------------------------------------
    # VALIDATION ASSERTIONS (Strict AST Quality Gates)
    # -------------------------------------------------------------------------
    @field_validator("sha256_hash")
    @classmethod
    def validate_sha256(cls, v: str) -> str:
        if not re.fullmatch(r"^[a-fA-F0-9]{64}$", v):
            raise ValueError(f"Invalid SHA-256 hash format: {v}")
        return v.lower()

    @field_validator("geographic_scope")
    @classmethod
    def validate_geographic_codes(cls, geos: List[str]) -> List[str]:
        iso_pattern = re.compile(r"^(US-FED|US-[A-Z]{2}|CA-[A-Z]{2}|GLOBAL)$")
        for g in geos:
            if not iso_pattern.match(g):
                raise ValueError(f"Non-compliant ISO 3166 geographic code: {g}")
        return geos

    @model_validator(mode="after")
    def validate_temporal_order_and_bindings(self):
        if self.effective_start_epoch > self.effective_end_epoch:
            raise ValueError(
                f"Temporal invalidity: start epoch ({self.effective_start_epoch}) "
                f"exceeds end epoch ({self.effective_end_epoch})"
            )
        if not self.bound_document_ids and self.document_id:
            self.bound_document_ids = [self.document_id]
        elif self.document_id and self.document_id not in self.bound_document_ids:
            self.bound_document_ids.append(self.document_id)
        return self


def compute_extraction_confidence(
    token_probs_mean: float,
    completeness_score: float,
    grounding_score: float
) -> float:
    """Computes multi-factor deterministic confidence score.
    Formula: Confidence = 0.40 * Prob(DSRF) + 0.35 * Completeness + 0.25 * Grounding
    """
    score = (0.40 * token_probs_mean) + (0.35 * completeness_score) + (0.25 * grounding_score)
    return round(max(0.0, min(1.0, score)), 4)
