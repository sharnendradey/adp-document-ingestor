export interface IngestionEvent {
  job_id: string;
  event_type: 'connected' | 'job_started' | 'stage_started' | 'log' | 'chunk_processed' | 'stage_completed' | 'job_completed' | 'error';
  timestamp?: string;
  stage_id?: string;
  stage_name?: string;
  message?: string;
  level?: string;
  total_blocks?: number;
  table_of_contents?: string[];
  document_id?: string;
  document_title?: string;
  canonical_domain?: string;
  business_unit?: string;
  product_family?: string[];
  gcs_uri?: string;
  size_bytes?: number;
  deduplicated_count?: number;
  new_count?: number;
  promoted_count?: number;
  quarantined_count?: number;
  chunk_id?: string;
  status?: string;
  confidence?: number;
  qa_count?: number;
  tabular_keys?: number;
  metrics?: {
    total_blocks_parsed: number;
    deduplicated_count: number;
    promoted_count: number;
    quarantined_count: number;
    duration_seconds: number;
  };
  macro_taxonomy?: {
    domain: string;
    business_unit: string;
    product_family: string[];
  };
  document_summary?: string;
  search_keywords?: string[];
}

export interface SampleDocument {
  filename: string;
  relative_path: string;
  full_path: string;
  format: string;
  size_bytes: number;
  size_display: string;
}

export interface KnowledgeUnit {
  chunk_id: string;
  document_id: string;
  bound_document_ids?: string[];
  chunk_index: number;
  chunk_text: string;
  sha256_hash: string;
  audience_roles: string[];
  geographic_scope: string[];
  lifecycle_stage?: string;
  effective_date?: string;
  citation?: string;
  expression_stance?: string;
  status: string;
  extraction_confidence?: number;
  created_at?: string;
  generated_qa_pairs?: Array<{
    question: string;
    intent: string;
    target_persona: string;
  }>;
  tabular_representation?: Record<string, any>;
}

export interface ParentDocument {
  document_id: string;
  document_title?: string;
  document_summary?: string;
  table_of_contents?: string[];
  search_keywords?: string[];
  canonical_dsrf_domain?: string;
  business_unit?: string;
  content_owner_steward?: string;
  product_module?: string;
  raw_content_sha256?: string;
  gcs_uri?: string;
  created_at?: string;
  chunk_count?: number;
}

