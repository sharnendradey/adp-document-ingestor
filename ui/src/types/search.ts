export interface QueryIntent {
  primary_intent: string;
  confidence: number;
  target_product: string;
  target_business_unit: string;
  required_roles: string[];
  normalized_search_term: string;
  key_entities: string[];
}

export interface ContributingChunk {
  chunk_id: string;
  document_id: string;
  bound_document_ids: string[];
  similarity: number;
  text_snippet: string;
  citation: string;
  qa_pairs_count: number;
  tabular_keys_count: number;
}

export interface SebastianResponse {
  answer: string;
  confidence_score: number;
  confidence_display: string;
  confidence_rating: string;
  citation: string;
  primary_document_id?: string;
  bound_document_ids?: string[];
  top_similarity?: number;
  circuit_breaker_triggered: boolean;
  contributing_chunks: ContributingChunk[];
}

export interface SearchResult {
  query: string;
  user_role: string;
  latency_ms: number;
  intent: QueryIntent;
  response: SebastianResponse;
  circuit_breaker: {
    escalated: boolean;
    reason?: string;
    escalation_target?: string;
  };
  total_chunks_retrieved: number;
}

export interface UserRole {
  id: string;
  label: string;
  description: string;
}
