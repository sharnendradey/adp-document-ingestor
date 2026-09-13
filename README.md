# ADP Questa Governed Agentic Knowledge Platform (`sample-agent`)

Production-ready agentic service implementing **Two-Pass DSRF Metadata Extraction** and **Sub-5ms Runtime Entitlements** for ADP Questa and Sebastian, built on Google Cloud Agent Development Kit (ADK), Gemini 2.5, Cloud Spanner (with ScaNN Vector Search & Spanner Graph), Document AI, and Cloud Memorystore (Redis).

---

## 1. Architectural Overview & Mission

ADP Questa serves as the enterprise source of truth across 1,000,000+ client organizations and 10,000+ frontline associates. To prevent privilege leakage, cross-client contamination, and hallucinated policy interpretations, this service solves the **Two Fatal Technical Traps**:

1. **Privilege Leakage & Cross-Client Data Leakage**: Enforces strict mathematical Attribute-Based Access Control (ABAC) pre-filtering at the Cloud Spanner storage engine layer, completely eliminating the Top-K Truncation vulnerability.
2. **Regulatory Non-Compliance & Policy Stagnation**: Executes property graph traversal (`[:HAS_EXCEPTION]` and `[:SUPERSEDES]`) in under 1.2ms to overlay state statutory overrides (e.g. California daily overtime vs. Federal weekly overtime) onto baseline policies.

```
                  +-------------------------------------------------------------+
                  |         QuestaRootSupervisorAgent (ADK Supervisor)          |
                  +-------------------------------------------------------------+
                                       |
    +-------------------+--------------+--------------+-------------------+
    |                   |                             |                   |
    v                   v                             v                   v
+--------------+  +-------------------+  +--------------------+  +--------------------+
| Metadata     |  | Entitlement       |  | Knowledge          |  | Frontline          |
| Extraction   |  | Gateway Agent     |  | Retrieval Agent    |  | Delivery Agent     |
| Agent        |  | (Sub-1ms Redis)   |  | (ScaNN + Graph)    |  | (10-Field Context) |
+--------------+  +-------------------+  +--------------------+  +--------------------+
```

---

## 2. Agent Hierarchy & Sub-Agents

| Sub-Agent | Role & Latency SLA | Key Responsibilities |
| :--- | :--- | :--- |
| **`QuestaRootSupervisorAgent`** | Central ADK Supervisor | Model Armor prompt injection defense, PII redaction, end-to-end orchestration, turn tracking. |
| **`MetadataExtractionAgent`** | Write-Time Ingestion | Two-pass extraction: Pass 1 Document AI layout tree + Pass 2 Gemini 2.5 Flash 24-field Pydantic AST validation. |
| **`EntitlementGatewayAgent`** | Read-Time (< 1.0 ms) | Evaluates 7 caller dimensions (Identity, Tenant, Jurisdiction, Epoch, Product, Channel, Role) against pre-warmed Redis cache. |
| **`KnowledgeRetrievalAgent`** | Read-Time (< 3.8 ms) | Executes ScaNN pre-filtered vector similarity search and Spanner Graph `[:HAS_EXCEPTION]` traversal. |
| **`FrontlineDeliveryAgent`** | Read-Time Delivery | Assembles the 10-Field Sebastian Context Envelope and enforces the 2-turn self-service circuit breaker. |

---

## 3. Database Architecture (Cloud Spanner DDL)

The complete GoogleSQL DDL is located at [`db-schema/spanner_schema.sql`](file:///Users/sharnendradey/Documents/adp-ai-db/sample-agent/db-schema/spanner_schema.sql):

* **`knowledge_documents`**: Macro ingestion envelope capturing organizational taxonomy, confidentiality, and catalog vector embeddings.
* **`knowledge_units`**: Micro retrieval chunks containing layout-preserved text, SHA-256 deduplication hashes, and ABAC pre-filtering columns.
* **`knowledge_graph_edges`**: Directed property graph supporting `SUPERSEDES`, `HAS_EXCEPTION`, and `CROSS_PRODUCT_DEPENDENCY`.
* **`audit_log_tombstones`**: Cryptographic revocation ledger ensuring zero-downtime knowledge recall and vector index eviction.

---

## 4. The 10-Field Sebastian Context Envelope

Every response delivered to ADP Assist or frontline associates is packed into a cryptographically verified context structure:

```json
{
  "canonical_answer": "Standard direct deposit allows employees to designate up to 4 accounts...",
  "statutory_citation": "ADP RUN Deposit Manual v4",
  "governing_policy": "ADP runPoweredByAdp Operating Manual",
  "effective_date_range": "2024-01-01 to Present",
  "authorized_product_family": "runPoweredByAdp",
  "jurisdiction_scope": "US-FED, US-NJ",
  "audience_persona": "Employee",
  "source_system_reference": "EKM::CORE::ku_emp_deposi",
  "lineage_override_status": "STANDARD",
  "confidence_rating": 0.8842
}
```

---

## 5. API Endpoints

The service exposes high-performance FastAPI endpoints:

### Ingestion & Extraction Endpoints
* **`POST /api/v1/extract/document`**: Ingests raw document text, runs Document AI layout parser, extracts 24 DSRF metadata attributes, validates with Pydantic AST, and batches into Spanner.
* **`POST /api/v1/extract/quarantine/{incident_id}/resolve`**: Resolves quarantined ingestion defects flagged by VerifyAI quality gates.

### Runtime Retrieval & Chat Endpoints
* **`POST /api/v1/chat/turn`**: Executes the complete sub-5ms ABAC resolution, pre-filtered vector search, graph exception check, and 10-field envelope delivery.
* **`POST /api/v1/retrieval/vector-search`**: Direct pre-filtered vector search API for headless integrations.
* **`POST /api/v1/retrieval/tombstone`**: Cryptographically revokes an erroneous or compromised policy chunk in real time.
* **`GET /health`**: Microservice health and dependency readiness probe.

---

## 6. Quickstart & Local Execution

### Installation

```bash
cd sample-agent
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### Running Tests

Execute the 20 automated unit and integration tests covering extraction layout parsing, Pydantic AST validations, parent-child dual table schema, composite hash deduplication, 768/100 sliding window chunking, sub-5ms ABAC resolution, Top-K truncation elimination, graph lineage, and cryptographic tombstoning:

```bash
PYTHONPATH=. pytest tests -v
```

### Running the FastAPI Server

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8080 --reload
```

Interactive OpenAPI Swagger UI is available at `http://localhost:8080/docs`.
