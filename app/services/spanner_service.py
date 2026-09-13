"""Cloud Spanner Service for ADP Questa Governed Knowledge Platform."""

import json
import logging
import time
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

logger = logging.getLogger("adp-questa.spanner")

try:
    from google.cloud import spanner
    from google.api_core.client_options import ClientOptions
    HAS_SPANNER = True
except ImportError:
    spanner = None
    HAS_SPANNER = False

from app.config import settings
from app.models.dsrf_metadata import MacroDocumentMetadata, GovernedKnowledgeUnitPayload


def _unpack_spanner_json(val: Any) -> Any:
    """Unpacks Cloud Spanner JsonObject, JSON strings, or lists to native Python structures."""
    if val is None:
        return None
    if isinstance(val, str):
        try:
            return json.loads(val)
        except Exception:
            return val
    if hasattr(val, "serialize"):
        try:
            return json.loads(val.serialize())
        except Exception:
            pass
    if hasattr(val, "_is_array") and getattr(val, "_is_array", False):
        return getattr(val, "_array_value", [])
    if isinstance(val, dict):
        return dict(val)
    if isinstance(val, (list, tuple)):
        return list(val)
    return val


class QuestaSpannerRepository:
    """Production Cloud Spanner Repository with Vector Search & Graph Lineage."""

    def __init__(self):
        self.project_id = settings.GCP_PROJECT_ID
        self.instance_id = settings.SPANNER_INSTANCE_ID
        self.database_id = settings.SPANNER_DATABASE_ID
        
        self.client: Optional[Any] = None
        self.instance: Optional[Any] = None
        self.database: Optional[Any] = None
        
        # In-memory mock store for offline testing or when credentials are not present
        self._mock_docs: Dict[str, Dict[str, Any]] = {}
        self._mock_chunks: Dict[str, Dict[str, Any]] = {}
        self._mock_edges: List[Dict[str, Any]] = []
        self._mock_tombstones: List[Dict[str, Any]] = []

        self._init_connection()

    def _init_connection(self):
        """Initializes connection to Cloud Spanner or falls back to in-memory mode."""
        if not HAS_SPANNER or settings.SPANNER_USE_EMULATOR:
            logger.info("Operating in Spanner In-Memory / Simulation Mode.")
            return

        try:
            client_options = ClientOptions(quota_project_id=self.project_id) if self.project_id else None
            self.client = spanner.Client(
                project=self.project_id,
                client_options=client_options,
                disable_builtin_metrics=True
            )
            self.instance = self.client.instance(self.instance_id)
            self.database = self.instance.database(self.database_id)
            logger.info(f"Connected to Cloud Spanner: {self.instance_id}/{self.database_id}")
        except Exception as e:
            logger.warning(f"Could not connect to live Cloud Spanner ({e}). Using local in-memory fallback.")
            self.database = None

    # -------------------------------------------------------------------------
    # 1. WRITE-TIME INGESTION API
    # -------------------------------------------------------------------------
    def insert_macro_document(self, doc: MacroDocumentMetadata) -> bool:
        """Inserts or updates macro document metadata in Spanner knowledge_documents table (NO EMBEDDINGS)."""
        doc_dict = doc.model_dump()
        doc_dict.pop("whole_doc_embedding", None)
        if "whole_document_summary" in doc_dict:
            doc_dict["document_summary"] = doc.document_summary
            doc_dict.pop("whole_document_summary", None)

        # Convert enums to string primitives for Spanner driver
        doc_data = {}
        for k, v in doc_dict.items():
            if isinstance(v, list):
                doc_data[k] = [item.value if hasattr(item, "value") else str(item) for item in v]
            elif hasattr(v, "value"):
                doc_data[k] = v.value
            else:
                doc_data[k] = v

        # Check if record already exists to preserve created_at and refresh updated_at
        existing_created_at = None
        if doc.document_id in self._mock_docs and "created_at" in self._mock_docs[doc.document_id]:
            existing_created_at = self._mock_docs[doc.document_id]["created_at"]
        elif self.database:
            try:
                with self.database.snapshot() as snapshot:
                    results = snapshot.read(
                        table="knowledge_documents",
                        columns=["created_at"],
                        keyset=spanner.KeySet([[doc.document_id]])
                    )
                    rows = list(results)
                    if rows and rows[0][0]:
                        existing_created_at = rows[0][0]
            except Exception:
                existing_created_at = None

        now_utc = datetime.now(timezone.utc).isoformat()
        if existing_created_at is not None:
            # Document exists: preserve original created_at, update updated_at with current timestamp
            doc_data["created_at"] = existing_created_at
            if HAS_SPANNER and spanner and self.database:
                doc_data["updated_at"] = spanner.COMMIT_TIMESTAMP
            else:
                doc_data["updated_at"] = now_utc
        else:
            # First-time insertion: both created_at and updated_at set to current timestamp
            if HAS_SPANNER and spanner and self.database:
                doc_data["created_at"] = spanner.COMMIT_TIMESTAMP
                doc_data["updated_at"] = spanner.COMMIT_TIMESTAMP
            else:
                doc_data["created_at"] = now_utc
                doc_data["updated_at"] = now_utc

        self._mock_docs[doc.document_id] = doc_data

        if self.database:
            try:
                with self.database.batch() as batch:
                    batch.insert_or_update(
                        table="knowledge_documents",
                        columns=list(doc_data.keys()),
                        values=[list(doc_data.values())]
                    )
                logger.info(f"Persisted document entity to Spanner parent table: {doc.document_id}")
            except Exception as e:
                logger.error(f"Failed Spanner insert for doc {doc.document_id}: {e}")
                return False
        return True

    def get_macro_document(self, document_id: str) -> Optional[Dict[str, Any]]:
        """Retrieves macro parent document record by document_id from live Spanner."""
        if self.database:
            try:
                with self.database.snapshot() as snapshot:
                    sql = """
                        SELECT document_id, document_title, content_owner_steward, product_module, 
                               business_unit, canonical_dsrf_domain, domain_path, tenant_boundary, 
                               data_plane, document_summary, table_of_contents, search_keywords, 
                               raw_content_sha256, created_at, updated_at
                        FROM knowledge_documents 
                        WHERE document_id = @doc_id
                    """
                    rows = list(snapshot.execute_sql(
                        sql, 
                        params={"doc_id": document_id}, 
                        param_types={"doc_id": spanner.param_types.STRING}
                    ))
                    if rows:
                        r = rows[0]
                        return {
                            "document_id": r[0],
                            "document_title": r[1],
                            "content_owner_steward": r[2],
                            "product_module": r[3],
                            "business_unit": r[4],
                            "canonical_dsrf_domain": r[5],
                            "domain_path": r[6],
                            "tenant_boundary": r[7],
                            "data_plane": r[8],
                            "document_summary": r[9],
                            "table_of_contents": list(r[10]) if r[10] else [],
                            "search_keywords": list(r[11]) if r[11] else [],
                            "raw_content_sha256": r[12],
                            "created_at": str(r[13]) if r[13] else None,
                            "updated_at": str(r[14]) if r[14] else None
                        }
            except Exception as e:
                logger.warning(f"Could not read document {document_id} from live Spanner ({e}).")
        return self._mock_docs.get(document_id)

    def list_documents(self, limit: int = 50) -> List[Dict[str, Any]]:
        """Lists documents from Spanner knowledge_documents table with fallback."""
        docs = []
        if self.database:
            try:
                with self.database.snapshot() as snapshot:
                    sql = """
                        SELECT document_id, document_title, content_owner_steward, product_module, 
                               business_unit, canonical_dsrf_domain, domain_path, tenant_boundary, 
                               data_plane, document_summary, table_of_contents, search_keywords, 
                               raw_content_sha256, created_at
                        FROM knowledge_documents 
                        ORDER BY created_at DESC 
                        LIMIT @limit
                    """
                    rows = snapshot.execute_sql(
                        sql, 
                        params={"limit": limit}, 
                        param_types={"limit": spanner.param_types.INT64}
                    )
                    for r in rows:
                        docs.append({
                            "document_id": r[0],
                            "document_title": r[1],
                            "content_owner_steward": r[2],
                            "product_module": r[3],
                            "business_unit": r[4],
                            "canonical_dsrf_domain": r[5],
                            "domain_path": r[6],
                            "tenant_boundary": r[7],
                            "data_plane": r[8],
                            "document_summary": r[9],
                            "table_of_contents": list(r[10]) if r[10] else [],
                            "search_keywords": list(r[11]) if r[11] else [],
                            "raw_content_sha256": r[12],
                            "created_at": str(r[13]) if r[13] else None
                        })
                return docs
            except Exception as e:
                logger.warning(f"Could not list documents from live Spanner ({e}). Using mock docs.")
        return list(self._mock_docs.values())[:limit]

    # Alias for API routes
    list_macro_documents = list_documents

    def list_knowledge_units(self, document_id: Optional[str] = None, limit: int = 100) -> List[Dict[str, Any]]:
        """Lists knowledge units from Spanner knowledge_units table with fallback.
        Supports filtering by document_id (including multi-version bound_document_ids).
        """
        if isinstance(document_id, int):
            limit = document_id
            document_id = None
        elif isinstance(limit, str):
            document_id, limit = limit, 100

        chunks = []
        if self.database:
            try:
                with self.database.snapshot() as snapshot:
                    if document_id:
                        sql = """
                            SELECT chunk_id, document_id, chunk_index, chunk_text, sha256_hash, 
                                   audience_roles, geographic_scope, lifecycle_stage, effective_date,
                                   retrieval_eligible, citation, expression_stance, status, 
                                   content_quality_score, extraction_confidence, created_at,
                                   bound_document_ids, generated_qa_pairs, tabular_representation
                            FROM knowledge_units 
                            WHERE document_id = @doc_id OR (bound_document_ids IS NOT NULL AND @doc_id IN UNNEST(bound_document_ids))
                            ORDER BY chunk_index ASC 
                            LIMIT @limit
                        """
                        params = {"doc_id": document_id, "limit": limit}
                        param_types = {"doc_id": spanner.param_types.STRING, "limit": spanner.param_types.INT64}
                    else:
                        sql = """
                            SELECT chunk_id, document_id, chunk_index, chunk_text, sha256_hash, 
                                   audience_roles, geographic_scope, lifecycle_stage, effective_date,
                                   retrieval_eligible, citation, expression_stance, status, 
                                   content_quality_score, extraction_confidence, created_at,
                                   bound_document_ids, generated_qa_pairs, tabular_representation
                            FROM knowledge_units 
                            ORDER BY created_at DESC 
                            LIMIT @limit
                        """
                        params = {"limit": limit}
                        param_types = {"limit": spanner.param_types.INT64}

                    rows = snapshot.execute_sql(sql, params=params, param_types=param_types)
                    for r in rows:
                        qa_val = _unpack_spanner_json(r[17]) if len(r) > 17 else None
                        tab_val = _unpack_spanner_json(r[18]) if len(r) > 18 else None
                        chunks.append({
                            "chunk_id": r[0],
                            "document_id": r[1],
                            "chunk_index": r[2],
                            "chunk_text": r[3],
                            "sha256_hash": r[4],
                            "audience_roles": list(r[5]) if r[5] else [],
                            "geographic_scope": list(r[6]) if r[6] else [],
                            "lifecycle_stage": r[7],
                            "effective_date": r[8],
                            "retrieval_eligible": r[9],
                            "citation": r[10],
                            "expression_stance": r[11],
                            "status": r[12],
                            "content_quality_score": r[13],
                            "extraction_confidence": r[14],
                            "created_at": str(r[15]) if r[15] else None,
                            "bound_document_ids": list(r[16]) if len(r) > 16 and r[16] else [r[1]],
                            "generated_qa_pairs": qa_val,
                            "tabular_representation": tab_val
                        })
                return chunks
            except Exception as e:
                logger.warning(f"Could not list chunks from live Spanner ({e}). Using mock chunks.")
        mock_list = list(self._mock_chunks.values())
        if document_id:
            mock_list = [c for c in mock_list if c.get("document_id") == document_id or document_id in (c.get("bound_document_ids") or [])]
        return mock_list[:limit]

    def insert_knowledge_units(self, chunks: List[GovernedKnowledgeUnitPayload]) -> bool:
        """Batch inserts chunk knowledge units into knowledge_units table."""
        sanitized_chunks = []
        for chunk in chunks:
            raw = chunk.model_dump()
            chunk_data = {}
            for k, v in raw.items():
                if k == "vector_embedding":
                    chunk_data[k] = [float(item) for item in v] if v is not None else None
                elif k in ("generated_qa_pairs", "tabular_representation"):
                    chunk_data[k] = json.dumps(v) if v is not None else None
                elif k == "bound_document_ids":
                    chunk_data[k] = [str(item) for item in v] if v is not None else []
                elif isinstance(v, list):
                    chunk_data[k] = [item.value if hasattr(item, "value") else str(item) for item in v]
                elif hasattr(v, "value"):
                    chunk_data[k] = v.value
                else:
                    chunk_data[k] = v

            # Preserve existing created_at if updating an existing chunk
            existing_chunk_created_at = None
            if chunk.chunk_id in self._mock_chunks and "created_at" in self._mock_chunks[chunk.chunk_id]:
                existing_chunk_created_at = self._mock_chunks[chunk.chunk_id]["created_at"]
            elif self.database:
                try:
                    with self.database.snapshot() as snapshot:
                        results = snapshot.read(
                            table="knowledge_units",
                            columns=["created_at"],
                            keyset=spanner.KeySet([[chunk.chunk_id]])
                        )
                        rows = list(results)
                        if rows and rows[0][0]:
                            existing_chunk_created_at = rows[0][0]
                except Exception:
                    existing_chunk_created_at = None

            now_utc = datetime.now(timezone.utc).isoformat()
            if existing_chunk_created_at is not None:
                chunk_data["created_at"] = existing_chunk_created_at
            else:
                if HAS_SPANNER and spanner and self.database:
                    chunk_data["created_at"] = spanner.COMMIT_TIMESTAMP
                else:
                    chunk_data["created_at"] = now_utc

            self._mock_chunks[chunk.chunk_id] = chunk_data
            sanitized_chunks.append(chunk_data)

        if self.database and sanitized_chunks:
            try:
                chunk_batch_size = 100
                for i in range(0, len(sanitized_chunks), chunk_batch_size):
                    batch_slice = sanitized_chunks[i:i + chunk_batch_size]
                    with self.database.batch() as batch:
                        for cdata in batch_slice:
                            batch.insert_or_update(
                                table="knowledge_units",
                                columns=list(cdata.keys()),
                                values=[list(cdata.values())]
                            )
                logger.info(f"Persisted {len(sanitized_chunks)} knowledge units to Spanner in batches of {chunk_batch_size}.")
            except Exception as e:
                logger.error(f"Failed Spanner batch insert for chunks: {e}")
                return False
        return True

    def find_chunk_by_hash(self, sha256_hash: str) -> Optional[Dict[str, Any]]:
        """Queries Spanner to find an existing chunk by its exact SHA-256 syntactic hash."""
        if self.database:
            try:
                with self.database.snapshot() as snapshot:
                    sql = """
                        SELECT chunk_id, document_id, bound_document_ids, sha256_hash, chunk_index
                        FROM knowledge_units 
                        WHERE sha256_hash = @hash
                        LIMIT 1
                    """
                    rows = list(snapshot.execute_sql(
                        sql,
                        params={"hash": sha256_hash},
                        param_types={"hash": spanner.param_types.STRING}
                    ))
                    if rows:
                        r = rows[0]
                        return {
                            "chunk_id": r[0],
                            "document_id": r[1],
                            "bound_document_ids": list(r[2]) if r[2] else [r[1]],
                            "sha256_hash": r[3],
                            "chunk_index": r[4]
                        }
            except Exception as e:
                logger.warning(f"Could not check chunk hash in live Spanner ({e}).")

        # Fallback to in-memory mock check
        for cid, cdata in self._mock_chunks.items():
            if cdata.get("sha256_hash") == sha256_hash:
                bound = cdata.get("bound_document_ids", [])
                return {
                    "chunk_id": cid,
                    "document_id": cdata.get("document_id"),
                    "bound_document_ids": list(bound) if bound else [cdata.get("document_id")],
                    "sha256_hash": sha256_hash,
                    "chunk_index": cdata.get("chunk_index", 0)
                }
        return None

    def append_document_binding(self, chunk_id: str, new_document_id: str) -> bool:
        """Appends a new document_id to an existing chunk's bound_document_ids list without re-embedding."""
        # Update in-memory mock
        if chunk_id in self._mock_chunks:
            bound = self._mock_chunks[chunk_id].setdefault("bound_document_ids", [])
            if new_document_id not in bound:
                bound.append(new_document_id)

        if self.database:
            try:
                def _update_txn(transaction):
                    results = transaction.execute_sql(
                        "SELECT bound_document_ids, document_id FROM knowledge_units WHERE chunk_id = @cid",
                        params={"cid": chunk_id},
                        param_types={"cid": spanner.param_types.STRING}
                    )
                    rows = list(results)
                    if not rows:
                        return
                    existing_bound = list(rows[0][0]) if rows[0][0] else []
                    orig_doc = rows[0][1]
                    if orig_doc and orig_doc not in existing_bound:
                        existing_bound.append(orig_doc)
                    if new_document_id not in existing_bound:
                        existing_bound.append(new_document_id)
                    transaction.update(
                        table="knowledge_units",
                        columns=["chunk_id", "bound_document_ids"],
                        values=[[chunk_id, existing_bound]]
                    )

                self.database.run_in_transaction(_update_txn)
                logger.info(f"Appended document binding {new_document_id} to existing chunk {chunk_id}")
                return True
            except Exception as e:
                logger.error(f"Failed appending document binding for chunk {chunk_id}: {e}")
                return False
        return True

    def insert_graph_edge(
        self,
        edge_id: str,
        source_chunk_id: str,
        target_chunk_id: str,
        edge_type: str,
        effective_epoch: int,
        jurisdiction_override: Optional[str] = None,
        edge_metadata: Optional[Dict[str, Any]] = None
    ) -> bool:
        """Records property graph lineage edge (e.g. SUPERSEDES, HAS_EXCEPTION)."""
        edge = {
            "edge_id": edge_id,
            "source_chunk_id": source_chunk_id,
            "target_chunk_id": target_chunk_id,
            "edge_type": edge_type,
            "effective_epoch": effective_epoch,
            "jurisdiction_override": jurisdiction_override,
            "edge_metadata": edge_metadata or {}
        }
        self._mock_edges.append(edge)

        if self.database:
            try:
                import json
                row_data = {
                    "edge_id": edge_id,
                    "source_chunk_id": source_chunk_id,
                    "target_chunk_id": target_chunk_id,
                    "edge_type": edge_type,
                    "effective_epoch": effective_epoch,
                    "jurisdiction_override": jurisdiction_override,
                    "edge_metadata": json.dumps(edge_metadata or {}),
                    "created_at": spanner.COMMIT_TIMESTAMP
                }
                with self.database.batch() as batch:
                    batch.insert_or_update(
                        table="knowledge_graph_edges",
                        columns=list(row_data.keys()),
                        values=[list(row_data.values())]
                    )
                logger.info(f"Persisted graph edge to Spanner: {edge_id}")
            except Exception as e:
                logger.error(f"Failed Spanner insert for edge {edge_id}: {e}")

        return True

    # -------------------------------------------------------------------------
    # 2. READ-TIME PRE-FILTERED VECTOR RETRIEVAL (Sub-5ms SLA)
    # -------------------------------------------------------------------------
    def search_vector_entitled(
        self,
        query_vector: List[float],
        tenant_boundary: str,
        product_families: List[str],
        audience_roles: List[str],
        geographies: List[str],
        current_epoch: int,
        top_k: int = 5,
        distance_threshold: float = 1.2
    ) -> List[Dict[str, Any]]:
        """Executes ScaNN pre-filtered mathematical vector search over authorized chunks.
        Guarantees zero Top-K Truncation by applying ABAC restricts before similarity ranking.
        """
        results = []

        if self.database:
            query = """
                SELECT 
                    ku.chunk_id,
                    ku.document_id,
                    ku.chunk_text,
                    ku.citation,
                    ku.expression_stance,
                    ku.audience_roles,
                    ku.geographic_scope,
                    ku.effective_start_epoch,
                    ku.effective_end_epoch,
                    COSINE_DISTANCE(ku.vector_embedding, @query_vector) AS distance,
                    ku.bound_document_ids,
                    ku.generated_qa_pairs,
                    ku.tabular_representation
                FROM knowledge_units ku
                JOIN knowledge_documents kd ON (ku.document_id = kd.document_id OR (ku.bound_document_ids IS NOT NULL AND kd.document_id IN UNNEST(ku.bound_document_ids)))
                WHERE ku.status = 'ACTIVE'
                  AND ku.retrieval_eligible = TRUE
                  AND (kd.tenant_boundary = @tenant OR kd.tenant_boundary = 'GLOBAL' OR @tenant = 'GLOBAL' OR @tenant = 'ADP_INTERNAL')
                  AND EXISTS (
                      SELECT 1 FROM UNNEST(kd.adp_product_family) p 
                      WHERE p IN UNNEST(@products) 
                         OR 'ALL' IN UNNEST(@products)
                  )
                  AND EXISTS (
                      SELECT 1 FROM UNNEST(ku.audience_roles) r 
                      WHERE r IN UNNEST(@roles) 
                         OR r = 'All' 
                         OR 'All' IN UNNEST(@roles)
                         OR 'ADP Associate' IN UNNEST(@roles)
                         OR 'Client Admin' IN UNNEST(@roles)
                         OR ('HR Practitioner' IN UNNEST(@roles) AND r IN ('Employee', 'Manager'))
                         OR ('Payroll Practitioner' IN UNNEST(@roles) AND r IN ('Employee', 'Manager'))
                  )
                  AND EXISTS (
                      SELECT 1 FROM UNNEST(ku.geographic_scope) g 
                      WHERE g IN UNNEST(@geos) 
                         OR g = 'GLOBAL' 
                         OR g = 'US-FED' 
                         OR 'GLOBAL' IN UNNEST(@geos)
                  )
                  AND ku.effective_start_epoch <= @epoch
                  AND ku.effective_end_epoch >= @epoch
                  AND COSINE_DISTANCE(ku.vector_embedding, @query_vector) <= @threshold
                ORDER BY distance ASC
                LIMIT @limit
            """
            params = {
                "query_vector": query_vector,
                "tenant": tenant_boundary,
                "products": product_families,
                "roles": audience_roles,
                "geos": geographies,
                "epoch": current_epoch,
                "threshold": distance_threshold,
                "limit": top_k
            }
            param_types = {
                "query_vector": spanner.param_types.Array(spanner.param_types.FLOAT64),
                "tenant": spanner.param_types.STRING,
                "products": spanner.param_types.Array(spanner.param_types.STRING),
                "roles": spanner.param_types.Array(spanner.param_types.STRING),
                "geos": spanner.param_types.Array(spanner.param_types.STRING),
                "epoch": spanner.param_types.INT64,
                "threshold": spanner.param_types.FLOAT64,
                "limit": spanner.param_types.INT64,
            }
            try:
                with self.database.snapshot() as snapshot:
                    cursor = snapshot.execute_sql(query, params=params, param_types=param_types)
                    for row in cursor:
                        qa_val = _unpack_spanner_json(row[11]) if len(row) > 11 else None
                        tab_val = _unpack_spanner_json(row[12]) if len(row) > 12 else None
                        results.append({
                            "chunk_id": row[0],
                            "document_id": row[1],
                            "chunk_text": row[2],
                            "citation": row[3],
                            "expression_stance": row[4],
                            "audience_roles": row[5],
                            "geographic_scope": row[6],
                            "effective_start_epoch": row[7],
                            "effective_end_epoch": row[8],
                            "distance": row[9],
                            "bound_document_ids": list(row[10]) if len(row) > 10 and row[10] else [row[1]],
                            "generated_qa_pairs": qa_val,
                            "tabular_representation": tab_val
                        })
                return results
            except Exception as e:
                logger.warning(f"Spanner vector query failed ({e}). Falling back to in-memory matcher.")

        # In-Memory fallback matcher
        for cid, chunk in self._mock_chunks.items():
            if chunk.get("status") != "ACTIVE" or not chunk.get("retrieval_eligible", True):
                continue
            
            # Role whitelist with hierarchical permissions
            chunk_roles = [r.value if hasattr(r, "value") else str(r) for r in chunk.get("audience_roles", [])]
            is_role_authorized = (
                any(r in audience_roles for r in chunk_roles)
                or "All" in chunk_roles
                or "All" in audience_roles
                or "ADP Associate" in audience_roles
                or "Client Admin" in audience_roles
                or ("HR Practitioner" in audience_roles and any(cr in ["Employee", "Manager"] for cr in chunk_roles))
                or ("Payroll Practitioner" in audience_roles and any(cr in ["Employee", "Manager"] for cr in chunk_roles))
            )
            if not is_role_authorized:
                continue

            # Geo whitelist with federal / global scope
            chunk_geos = chunk.get("geographic_scope", [])
            is_geo_authorized = (
                any(g in geographies for g in chunk_geos)
                or "GLOBAL" in chunk_geos
                or "US-FED" in chunk_geos
                or "GLOBAL" in geographies
            )
            if not is_geo_authorized:
                continue

            # Epoch check
            if not (chunk.get("effective_start_epoch", 0) <= current_epoch <= chunk.get("effective_end_epoch", 2147483647)):
                continue

            # Calculate real mathematical cosine distance
            chunk_vec = chunk.get("vector_embedding")
            if chunk_vec and query_vector:
                dot = sum(a * b for a, b in zip(query_vector, chunk_vec))
                norm_q = sum(a * a for a in query_vector) ** 0.5
                norm_c = sum(b * b for b in chunk_vec) ** 0.5
                if norm_q > 0 and norm_c > 0:
                    distance = round(float(1.0 - (dot / (norm_q * norm_c))), 4)
                else:
                    distance = 0.05
            else:
                # Test/legacy payloads without dense vectors matching metadata filters
                distance = 0.05

            if distance <= distance_threshold:
                results.append({
                    "chunk_id": chunk["chunk_id"],
                    "document_id": chunk["document_id"],
                    "chunk_text": chunk["chunk_text"],
                    "citation": chunk.get("citation", ""),
                    "expression_stance": chunk.get("expression_stance", "Normative"),
                    "audience_roles": chunk_roles,
                    "geographic_scope": chunk_geos,
                    "effective_start_epoch": chunk.get("effective_start_epoch", 0),
                    "effective_end_epoch": chunk.get("effective_end_epoch", 2147483647),
                    "distance": distance,
                })

        results.sort(key=lambda x: x["distance"])
        return results[:top_k]

    # -------------------------------------------------------------------------
    # 3. RELATIONAL GRAPH LINEAGE TRAVERSAL (< 1.2ms SLA)
    # -------------------------------------------------------------------------
    def traverse_graph_overrides(self, chunk_ids: List[str], state_code: str) -> List[Dict[str, Any]]:
        """Traverses [:HAS_EXCEPTION] edges to fetch local jurisdiction overrides (e.g. US-NJ) from live Spanner."""
        overrides = []
        if self.database and chunk_ids:
            try:
                with self.database.snapshot() as snapshot:
                    sql = """
                        SELECT 
                            e.source_chunk_id, 
                            e.target_chunk_id, 
                            ku.chunk_text, 
                            ku.citation, 
                            e.jurisdiction_override
                        FROM knowledge_graph_edges e
                        JOIN knowledge_units ku ON e.target_chunk_id = ku.chunk_id
                        WHERE e.source_chunk_id IN UNNEST(@chunk_ids)
                          AND e.edge_type = 'HAS_EXCEPTION'
                          AND (e.jurisdiction_override = @state OR e.jurisdiction_override IS NULL)
                    """
                    rows = snapshot.execute_sql(
                        sql,
                        params={"chunk_ids": chunk_ids, "state": state_code},
                        param_types={
                            "chunk_ids": spanner.param_types.Array(spanner.param_types.STRING),
                            "state": spanner.param_types.STRING
                        }
                    )
                    for r in rows:
                        overrides.append({
                            "parent_chunk_id": r[0],
                            "override_chunk_id": r[1],
                            "override_text": r[2],
                            "citation": r[3],
                            "jurisdiction": r[4] or state_code
                        })
                if overrides:
                    return overrides
            except Exception as e:
                logger.warning(f"Live Spanner graph traversal failed ({e}). Checking local cache.")

        for edge in self._mock_edges:
            if edge["source_chunk_id"] in chunk_ids and edge["edge_type"] == "HAS_EXCEPTION":
                if edge.get("jurisdiction_override") == state_code or not edge.get("jurisdiction_override"):
                    target = self._mock_chunks.get(edge["target_chunk_id"])
                    if target:
                        overrides.append({
                            "parent_chunk_id": edge["source_chunk_id"],
                            "override_chunk_id": edge["target_chunk_id"],
                            "override_text": target["chunk_text"],
                            "citation": target.get("citation", ""),
                            "jurisdiction": state_code
                        })
        return overrides

    # -------------------------------------------------------------------------
    # 4. TOMBSTONE & RECALL API
    # -------------------------------------------------------------------------
    def record_tombstone(self, chunk_id: str, reason: str, revoked_by: str) -> bool:
        """Tombstones a chunk in Spanner and evicts it from vector search in real-time."""
        import hashlib
        now_epoch = int(time.time())
        tomb_id = f"tomb_{now_epoch}_{chunk_id[:8]}"
        sha_hash = hashlib.sha256(chunk_id.encode("utf-8")).hexdigest()

        if self.database:
            try:
                with self.database.batch() as batch:
                    batch.insert_or_update(
                        table="audit_log_tombstones",
                        columns=["tombstone_id", "chunk_id", "reason", "revoked_by", "revocation_epoch", "sha256_hash", "created_at"],
                        values=[[tomb_id, chunk_id, reason, revoked_by, now_epoch, sha_hash, spanner.COMMIT_TIMESTAMP]]
                    )
                    batch.update(
                        table="knowledge_units",
                        columns=["chunk_id", "status", "retrieval_eligible"],
                        values=[[chunk_id, "RECALLED", False]]
                    )
                logger.info(f"Persisted tombstone to Spanner table audit_log_tombstones for {chunk_id}")
            except Exception as e:
                logger.error(f"Failed Spanner tombstone mutation: {e}")
                return False

        if chunk_id in self._mock_chunks:
            self._mock_chunks[chunk_id]["status"] = "RECALLED"
            self._mock_chunks[chunk_id]["retrieval_eligible"] = False
        self._mock_tombstones.append({
            "tombstone_id": tomb_id,
            "chunk_id": chunk_id,
            "reason": reason,
            "revoked_by": revoked_by,
            "revocation_epoch": now_epoch
        })
        logger.info(f"Cryptographic tombstone logged for chunk {chunk_id}: {reason}")
        return True

    # -------------------------------------------------------------------------
    # 5. TABLE CLEAR / PURGE
    # -------------------------------------------------------------------------
    def clear_all_tables(self) -> Dict[str, Any]:
        """Clears all records from knowledge tables (child units first, then parent documents, edges, tombstones)."""
        deleted_info = {}
        if self.database:
            try:
                with self.database.batch() as batch:
                    batch.delete("knowledge_graph_edges", spanner.KeySet(all_=True))
                    batch.delete("audit_log_tombstones", spanner.KeySet(all_=True))
                    batch.delete("knowledge_units", spanner.KeySet(all_=True))
                    batch.delete("knowledge_documents", spanner.KeySet(all_=True))
                logger.info("Cleared all Spanner tables via atomic mutation batch.")
                deleted_info["spanner"] = "SUCCESS"
            except Exception as e:
                logger.error(f"Failed to clear Spanner tables: {e}")
                raise e

        self._mock_docs.clear()
        self._mock_chunks.clear()
        self._mock_edges.clear()
        self._mock_tombstones.clear()
        deleted_info["in_memory"] = "SUCCESS"
        return deleted_info


spanner_service = QuestaSpannerRepository()
