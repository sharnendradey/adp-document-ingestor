# ADP Questa Governed Knowledge Platform
## React UI & Modular Architecture Implementation Plan
**Client Presentation Experience & Enterprise Document Intelligence Studio**

---

### Executive Summary

Yes, this is **100% possible, technically sound, and highly recommended** for client demonstrations. 

Currently, the backend operational capabilities—Google Cloud Document AI Layout Parsing, Spanner Two-Table separation, Tri-View Knowledge Unit synthesis, and Sub-5ms Entitled ScaNN retrieval—are fully functioning on live GCP infrastructure, but they lack the visual polish and interactivity expected by executive client stakeholders.

Following the modern enterprise design system and modular UX patterns, we will build a dedicated, client-facing **React + Vite + TailwindCSS application** in `sample-agent/ui` paired with cleanly separated, decoupled backend domains in `sample-agent/app/ingestion` and `sample-agent/app/search`.

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                       ADP QUESTA CLIENT WORKSPACE                                       │
├──────────────────────────────────────┬──────────────────────────────────────────────────────────────────┤
│   EXPANDABLE SEARCH & INTELLIGENCE   │                   GOVERNED INGESTION STUDIO                      │
│                DRAWER                │                                                                  │
│  [Role Selector: HR_PRACTITIONER v]  │  [ Drag & Drop File ] or [ Select from 960+ Client Files v ]     │
│  ┌─────────────────────────────────┐ │  ┌─────────────────────────────────────────────────────────────┐ │
│  │ "What is the 2026 lodging rate?"│ │  │ [> Run Governed Ingestion ]                                  │ │
│  └─────────────────────────────────┘ │  └─────────────────────────────────────────────────────────────┘ │
│                                      │                                                                  │
│  ┌─ INTENT DECOMPOSITION ──────────┐ │  ┌─ LIVE ARCHITECTURE WORKFLOW STEPPER ────────────────────────┐ │
│  │ Intent: COMPLIANCE_LOOKUP       │ │  │ [1. DocAI Layout] -> [2. Macro Metadata] -> [3. Deduplication│ │
│  │ Required Role: HR_PRACTITIONER  │ │  │  Gate (SHA-256)]  -> [4. Tri-View Synthesis] -> [5. ScaNN   │ │
│  │ Target Unit: MAJOR_ACCOUNTS     │ │  │  Index & Spanner Persistence]                               │ │
│  └─────────────────────────────────┘ │  └─────────────────────────────────────────────────────────────┘ │
│                                      │                                                                  │
│  ┌─ FRONT-LINE ANSWER & CITATION ──┐ │  ┌─ LIVE STREAMING TERMINAL (SSE) ─────────────────────────────┐ │
│  │ 2026 lodging reimbursement is   │ │  │ 12:30:11 [DocAI] Parsed 56 layout blocks                    │ │
│  │ capped at $300/night with mgr   │ │  │ 12:30:14 [Deduplication] 4 chunks unaltered -> SHA matched  │ │
│  │ pre-approval.                   │ │  │ 12:30:16 [Spanner] Appended DOC_V2 to bound_document_ids    │ │
│  │ Citation: Business Travel Sec 3 │ │  │ 12:30:18 [VerifyAI] Confidence: 0.94 -> Promoted            │ │
│  │ Confidence: 96.4%               │ │  └─────────────────────────────────────────────────────────────┘ │
│  └─────────────────────────────────┘ │                                                                  │
│                                      │  ┌─ TRI-VIEW KNOWLEDGE UNIT INSPECTOR ─────────────────────────┐ │
│  ┌─ RETRIEVED CHUNKS BREAKDOWN ────┐ │  │ [Tab: Narrative] [Tab: Conversational Q&A] [Tab: Agentic Tab]│ │
│  │ Chunk #3: $300 Rate [v2 only]   │ │  │ * Entities: Lodging, Per Diem, Reimbursement Rate           │ │
│  │ Chunk #1: General Travel [v1,v2]│ │  │ * Bound Documents: ['DOC-POLICY-V1', 'DOC-POLICY-V2']       │ │
│  │ Chunk #4: Meal Cap [v1, v2]     │ │  │ * Synthetic Q&A Matrix: 4 generated user questions          │ │
│  └─────────────────────────────────┘ │  └─────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────┴──────────────────────────────────────────────────────────────────┘
```

---

## 1. Modular Directory Structure Reorganization

We will reorganize the repository into two clean, self-contained backend functional domains (`app/ingestion` and `app/search`) and one modern frontend directory (`sample-agent/ui`), preserving all shared data models in `app/models` and database services in `app/services`:

```
sample-agent/
├── app/
│   ├── main.py                             # FastAPI unified gateway & SPA static router
│   ├── config.py                           # System settings (Spanner, Document AI, Gemini 3.1)
│   ├── models/                             # Shared Pydantic data schemas
│   │   ├── dsrf_metadata.py                # GovernedKnowledgeUnitPayload, MacroDocumentMetadata
│   │   ├── context_envelope.py             # Sebastian 10-field frontline response envelope
│   │   └── entitlements.py                 # ABAC user contexts, session roles, tenant boundaries
│   │
│   ├── services/                           # Shared low-level Google Cloud client services
│   │   ├── spanner_service.py              # Cloud Spanner DB operations & transactions
│   │   ├── vertex_embedding_service.py     # Vertex AI text-embedding-004 batch client
│   │   └── redis_session_service.py        # Redis caching for user sessions & entitlements
│   │
│   ├── ingestion/                          # DOMAIN 1: INGESTION PIPELINE & SERVICES
│   │   ├── __init__.py
│   │   ├── pipeline.py                     # Two-pass extraction orchestrator with SSE event generator
│   │   ├── layout_parser.py                # Remote Document AI Layout Parser & fallback extractors
│   │   ├── metadata_extractor.py           # Gemini 3.1 Macro DSRF & Tri-View Synthesis
│   │   ├── deduplication.py                # SHA-256 chunk-level revision deduplicator
│   │   ├── quality_gate.py                 # VerifyAI quarantine card evaluation
│   │   └── routes.py                       # Ingestion REST & SSE Endpoints:
│   │                                       #   POST /api/v1/ingest/upload
│   │                                       #   POST /api/v1/ingest/process
│   │                                       #   GET  /api/v1/ingest/stream/{job_id} (Server-Sent Events)
│   │                                       #   GET  /api/v1/ingest/samples (Scans 960+ client files)
│   │
│   └── search/                             # DOMAIN 2: SEARCH, INTENT & FRONT-LINE AGENTS
│       ├── __init__.py
│       ├── engine.py                       # ScaNN mathematical pre-filtered vector retrieval
│       ├── intent_agent.py                 # Gemini natural language query intent analyzer
│       ├── chunk_analyzer.py               # Chunk relevance evaluator & Sebastian envelope generator
│       ├── circuit_breaker.py              # 2-turn Frontline Associate escalation guardian
│       └── routes.py                       # Search REST Endpoints:
│                                           #   POST /api/v1/search/query (Full agentic pipeline)
│                                           #   POST /api/v1/search/analyze-intent
│                                           #   GET  /api/v1/search/entitlements/roles
│                                           #   GET  /api/v1/search/documents (List Spanner corpus)
│
└── ui/                                     # DOMAIN 3: CLIENT-FACING REACT + VITE FRONTEND
    ├── index.html                          # Single-page app entrypoint
    ├── package.json                        # React 18, Vite, TailwindCSS, Lucide, Framer Motion
    ├── vite.config.ts                      # Vite build & API proxy configuration (proxies /api to 8080)
    ├── tailwind.config.js                  # ADP design tokens (Dark zinc, Crimson ADP accent, Emerald)
    └── src/
        ├── App.tsx                         # Master application layout
        ├── main.tsx
        ├── index.css                       # JetBrains Mono and Inter font styles
        ├── api/
        │   ├── client.ts                   # Axios / fetch wrapper for REST & SSE subscriptions
        │   ├── ingestionApi.ts             # Upload, process trigger, and event stream listeners
        │   └── searchApi.ts                # Intent analysis and entitled query dispatchers
        ├── components/
        │   ├── Navbar.tsx                  # System status badges (Spanner, DocAI, Vertex AI)
        │   ├── WorkflowStepper.tsx         # Real-time interactive architecture pipeline graph
        │   ├── IngestionTerminal.tsx       # Streaming dark-theme terminal for live SSE telemetry
        │   ├── IngestionUploader.tsx       # Drag-and-drop file upload & sample document picker
        │   ├── DocumentMetadataCard.tsx    # Parent document catalog viewer (No vector embeddings)
        │   ├── TriViewKnowledgeUnit.tsx    # Narrative, Conversational Q&A, and Agentic Tabular inspector
        │   ├── ExpandableSearchDrawer.tsx  # Collapsible left search & intelligence panel
        │   ├── QueryIntentCard.tsx         # Visual intent breakdown, roles, and product target
        │   └── FrontlineAnswerCard.tsx     # 10-field Sebastian envelope answer & citation card
        └── types/
            ├── ingestion.ts                # ProgressEvent, LayoutBlock, TriViewPayload
            └── search.ts                   # QueryRequest, SearchResultChunk, ContextEnvelope
```

---

## 2. Ingestion Domain Implementation (`sample-agent/app/ingestion`)

### Core Functional Responsibilities:
1. **Live SSE Telemetry Streaming**:
   * Introduces an asynchronous event queue (`asyncio.Queue`) for each active ingestion job.
   * Emits structured JSON events over `GET /api/v1/ingest/stream/{job_id}`:
     * `step_started`: Which architectural stage is active (e.g., `DOCAI_LAYOUT_PARSING`).
     * `log_chunk`: Granular terminal log lines (e.g., `[DocAI] Extracted 56 blocks; 7-level TOC identified`).
     * `dedup_metric`: Revision hash match report (e.g., `Chunk ku_0001 unaltered -> Appended DOC_V2 to bound_document_ids`).
     * `tri_view_synthesized`: Live Conversational QA pairs and Agentic Tabular payload for each chunk.
     * `step_completed`: Stage success with timing latency.
     * `job_completed`: Final summary payload ready for UI display.
2. **Layout Parsing (`layout_parser.py`)**:
   * Uses remote Google Cloud Document AI Layout Parser (`projects/gemini-ai-apigee-security/locations/us/processors/6b4ece5cd2c460ab`).
   * Dispatches multi-format handlers (`.pdf`, `.docx`, `.xlsx`, `.html`, `.csv`) with high-speed fallbacks.
3. **Revision Deduplication (`deduplication.py`)**:
   * Computes SHA-256 chunk hashes; queries Spanner for existing occurrences.
   * If existing: Appends `doc_id` to `bound_document_ids` in a transaction without re-embedding (**0 redundant embeddings, 0 duplicate rows**).
   * If new: Routes to Vertex AI batch embedding and Gemini Tri-View synthesis.
4. **Metadata & Tri-View Synthesis (`metadata_extractor.py`)**:
   * Produces parent macro document metadata (`knowledge_documents`, no vector embeddings).
   * Generates Conversational View (`generated_qa_pairs`) and Agentic View (`tabular_representation`).

---

## 3. Search & Intelligence Domain Implementation (`sample-agent/app/search`)

### Core Functional Responsibilities:
1. **Query Intent Understanding Agent (`intent_agent.py`)**:
   * Receives natural language user queries (e.g., *"What is the hotel reimbursement rate for 2026?"*).
   * Uses Gemini 3.1 Flash Lite with constrained JSON decoding to classify:
     * `intent_type`: `POLICY_OVERVIEW`, `COMPLIANCE_LOOKUP`, `PROCEDURAL_GUIDE`, `RATE_LOOKUP`.
     * `target_business_unit`: `MAJOR_ACCOUNTS`, `NATIONAL_ACCOUNTS`, `SMALL_BUSINESS_SERVICES`, `ALL`.
     * `target_product_family`: `HCM`, `BENEFITS`, `TAX`, `PAYROLL`.
     * `required_roles`: Minimum audience role required to view the content.
     * `normalized_query`: Vector search query optimized for cosine similarity.
2. **Entitled ScaNN Vector Engine (`engine.py`)**:
   * Executes sub-5ms mathematical cosine similarity search over Cloud Spanner `knowledge_units`.
   * Pre-filters on ABAC dimensions (`audience_roles`, `geographic_scope`, `effective_epochs`).
   * Resolves multi-version bindings via `kd.document_id IN UNNEST(ku.bound_document_ids)`.
3. **Chunk Semantic Relevance Analyzer (`chunk_analyzer.py`)**:
   * Inspects the retrieved chunks' Tri-View representations:
     * Checks if any pre-generated question in `generated_qa_pairs` matches the user's intent.
     * Extracts exact parameters from `tabular_representation` (e.g., entity `$300/night`, condition `manager pre-approval`).
   * Synthesizes the **10-Field Sebastian Context Envelope**:
     * `canonical_answer`, `statutory_legal_citation`, `confidence_score`, `governed_scope`.
4. **Frontline Circuit Breaker (`circuit_breaker.py`)**:
   * Tracks conversation turns and confidence thresholds. If confidence falls below 0.88 or turns exceed 2, triggers human escalation to Frontline Associate.

---

## 4. React Frontend Implementation (`sample-agent/ui`)

### Key Client-Facing Features:

#### A. Expandable Left-Side Search & Intelligence Drawer
* **Collapsible / Expandable**: Glides out smoothly from the left via Framer Motion.
* **Persona & Entitlement Switcher**:
  * Dropdown permitting the client to test retrieval as `Employee`, `HR_PRACTITIONER`, `Client Admin`, or `Payroll Specialist`.
* **Query Intent Analysis Card**:
  * As soon as a user submits a query, shows real-time intent classification badges:
    * `Intent`: `COMPLIANCE_RULE`
    * `Role Permitted`: `HR_PRACTITIONER`
    * `Product`: `MAS_BENEFITS`
* **Grounded Answer & Citation Card**:
  * Clean card with the direct AI-synthesized answer, statutory policy citation, and confidence meter (e.g., `96.4% Grounded`).
* **Retrieved Knowledge Chunks Breakdown**:
  * Shows each chunk that contributed to the answer:
    * Similarity score percentage.
    * **Multi-Version Document Badges**: Displays `[v1, v2]` showing which versions share this chunk.
    * Quick toggle to inspect the chunk's Conversational QA pairs or Tabular attributes.

#### B. Ingestion Studio & Live Architecture Stepper
* **Top Architecture Stepper (Workflow Diagram)**:
  * Visual node-based workflow diagram representing the 5 pipeline stages:
    1. `Visual Layout Extraction` (DocAI Layout Parser)
    2. `Macro DSRF Classification` (Gemini 3.1 Flash Lite)
    3. `Revision Deduplication Gate` (Cloud Spanner SHA-256 Check)
    4. `Tri-View Synthesis & Quality Gate` (VerifyAI)
    5. `ScaNN Index & Spanner Persistence`
  * Each node pulses in emerald green when active, shows live item counts (e.g., `56 blocks parsed`, `4 deduplicated, 1 promoted`), and turns solid green upon completion.
* **Document Uploader & Client File Picker**:
  * Drag-and-drop zone supporting `.pdf`, `.docx`, `.xlsx`, `.html`, `.csv`.
  * Dropdown pre-populated with the **960 scanned files** from `Client-Data/Sample Data`, allowing one-click selection of real client files.
* **Real-Time Streaming Terminal (Live SSE Telemetry)**:
  * High-contrast, dark-mode terminal window with auto-scroll.
  * Streams raw extraction milestones, token latencies, batch embedding budgets, and Spanner mutations directly from the server.
* **Tri-View Knowledge Unit Inspector**:
  * Once ingestion completes, displays interactive cards for all produced chunks.
  * Three tab views per chunk:
    * **Narrative View**: Clean passage text with highlighted entities and citations.
    * **Conversational View**: Table of synthetic Q&A pairs with persona tags and intent types.
    * **Agentic View**: Key-value tabular representation showing extracted entities, attributes, and conditions.
  * **Document Revision Badge**: Clearly marks whether a chunk is newly minted (`v2 only`) or shared with prior revisions (`bound to [v1, v2]`).

---

## 5. Phased Implementation Steps

```
Phase 1: Backend Decoupling & Module Restructuring
├── Create sample-agent/app/ingestion/ & move extraction/dedup logic
├── Create sample-agent/app/search/ & move vector search/intent logic
├── Implement SSE streaming router in app/ingestion/routes.py
└── Mount both routers in sample-agent/app/main.py

Phase 2: React + Vite UI Scaffolding
├── Initialize sample-agent/ui with Vite + React 18 + TypeScript
├── Configure TailwindCSS with dark zinc palette & ADP crimson accents
├── Setup API client with Axios and EventSource (SSE stream consumer)
└── Add fast proxy in vite.config.ts targeting http://127.0.0.1:8080

Phase 3: UI Component Construction
├── Build Navigation & System Metrics Bar (Spanner, DocAI, Vertex status)
├── Build WorkflowStepper (Interactive visual architecture graph)
├── Build IngestionTerminal (Dark streaming terminal for live SSE)
├── Build IngestionUploader & Sample Document Picker
├── Build TriViewKnowledgeUnit & DocumentMetadataCard
└── Build ExpandableSearchDrawer with Intent Analysis & Sebastian Card

Phase 4: Build Integration & Production Serving
├── Configure FastAPI in app/main.py to serve sample-agent/ui/dist as SPA
├── Enable npm run build pipeline
└── Verify end-to-end hot-reload in dev mode (Vite port 3000 -> FastAPI port 8080)
```

---

## 6. Verification & Client Demo Acceptance Criteria

| Capability | Verification Criteria | Expected Outcome |
| :--- | :--- | :--- |
| **Backend Modular Separation** | Ingestion imports isolated to `app/ingestion`; Search imports isolated to `app/search`. | Pytest suite passes 20/20 with zero circular imports. |
| **Live Ingestion & Stepper** | Upload or select a client PDF/DOCX file in the UI; click "Run Ingestion". | Visual workflow stepper animates through all 5 stages; live terminal logs stream via SSE without page refresh. |
| **Revision Deduplication Visualizer** | Ingest V1 (5 chunks), then ingest V2 (4 unchanged, 1 modified). | UI terminal and cards explicitly display `4 deduplicated (0 embeddings)`, `1 newly embedded`, and shows `[v1, v2]` badges on shared chunks. |
| **Tri-View Inspector** | Toggle between Narrative, Conversational, and Agentic tabs for any chunk. | Renders synthetic Q&A questions, persona targets, and structured tabular parameter rows. |
| **Expandable Search Drawer** | Expand left drawer, enter natural query e.g. *"What is the 2026 lodging rate?"*. | Live intent analyzer displays detected intent, queries Spanner, and renders grounded Sebastian response with citations in sub-15ms. |
| **ABAC Role Entitlements** | Switch user role from `Employee` to `HR_PRACTITIONER` in the drawer. | Confirms privileged tax and compliance chunks appear for practitioner but are pre-filtered out for employee. |

---

### Approval Gate

> [!IMPORTANT]
> **Implementation Readiness**: All architecture designs, directory migrations, and component specifications are ready for execution.
> 
> Please review and reply with your approval to begin implementation.
