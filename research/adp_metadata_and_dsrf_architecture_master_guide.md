# Master Engineering & Architectural Guide: Metadata Engineering, DSRF/DSF Taxonomies, Extraction Lifecycles, and Runtime Entitlements

**Document ID:** ADP-QUESTA-ARCH-META-2026-V1  
**Authors:** Sharnendra Dey & Rupjit Chakraborty (Google Cloud PSO)  
**Target Audience:** ADP Core Architecture Working Group, Engineering Leads, & BU Admins  
**File Location:** `/Users/sharnendradey/Documents/adp-ai-db/research/adp_metadata_and_dsrf_architecture_master_guide.md`  

---
## 1. What is Metadata?

In standard computer science, metadata is conventionally defined as *"data about data"* (e.g., file size, creation date, MIME type). 

In enterprise GenAI and modern Knowledge Retrieval architectures, however, **metadata is the deterministic control plane of the intelligence layer**.

Without structured, canonical metadata, modern Retrieval-Augmented Generation (RAG) degrades into an unmanageable **"vector soup"**:
* A vector embedding is a high-dimensional mathematical vector (e.g., 768 or 1536 floating-point numbers) representing *semantic proximity*, not *logical truth*.
* Vector distance algorithms (cosine similarity, dot product) can determine that two paragraphs *discuss similar topics*, but they **cannot determine**:
  - Whether a tax law expired yesterday or takes effect next year.
  - Whether a document is an executive-only confidential plan or an employee-facing explainer.
  - Whether a payroll formula applies to Workforce Now enterprise clients or RUN small business accounts.
  - Whether a piece of advice is a legally binding statutory command or a speculative advisory note.

Metadata provides the **deterministic boundary conditions** that constrain probabilistic vector math. It acts as an iron-clad firewall, ensuring that AI agents reason only over facts that are legally applicable, temporally valid, and strictly authorized for the asking user.

---
## 2. What Does Metadata Mean in ADP?

At ADP, metadata is not an optional tag—it is **regulatory compliance, tenant isolation, and legal defensibility**.

### 1. The 75-Year Evolutionary Context: Eliminating Lexical Fragmentation
Over seven decades of organic product development and acquisitions (Workforce Now, RUN, TotalSource, Vantage, Lyric NextGen, GlobalView), ADP accumulated severe **lexical fragmentation**. Different engineering teams and Business Units (BUs) used completely divergent terminologies to describe identical business functions:
* *Workforce Now*: "Direct Deposit Allocation"
* *RUN*: "Bank Account Setup / ACH Routing"
* *Vantage*: "Electronic Funds Transfer (EFT)"
* *Lyric NextGen*: "Payment Routing Configuration"

Without a unified metadata layer, semantic search fails, cross-product hallucination occurs (e.g., an AI agent advising a Workforce Now client to click a RUN navigation tab), and automated cross-system ingestion is impossible.

### 2. The Client's "Sebastian" Doctrine
The client's official enterprise architecture blueprint (**"Sebastian: Building the enterprise knowledge platform for ADP"**) formalizes this philosophy:
> *"We can't afford relying on AI systems resolving knowledge at query time. Questa separates the concerns: knowledge units are governed, knowledge assembly is design-time work, knowledge delivery is contextual and resolved at runtime. That way AI delivers governed knowledge for each specific consumer in a reliable and compliant manner."*

In ADP's world, metadata governs:
1. **The Knowledge Unit (Atom)**: The smallest self-sufficient governed asset (identifiable, understandable, applicable, trustworthy, traceable, and reusable).
2. **The Knowledge Assembly (Design-Time)**: Packaging knowledge units into contract-bound bundles.
3. **The Knowledge Delivery (Runtime Late-Binding)**: Evaluating 7 request factors (Identity, Purpose, Jurisdiction, Time, Product, Channel, Policy) to serve the right answer in < 5 ms.

---
## 3. The DSRF Metadata Framework & Official KP Metadata Buckets (Unified Core Team Taxonomy)

ADP's **Domain Specific Role Framework (DSRF)** (extended from **DSF** and **DSFO**) is the foundational canonical business ontology that bridges human language, unstructured text chunks, knowledge graph relationships, and programmatic backend API actions.

```
       ┌──────────────────────────────────────────────────────────────────┐
       │                 THE DSRF / DSFO ANATOMY                          │
       │    DOMAIN  .  SERVICE  .  ROLE  .  FEATURE  .  [OPERATION]       │
       └──────────────────────────────────────────────────────────────────┘
```

| Tag Component | Definition & Architectural Meaning | Specific ADP Operational Usage | Concrete Payroll Example | Concrete Tax/Compliance Example | Concrete Benefits Example |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **D — Domain** | The macro business discipline or top-level operational vertical across ADP. | Used for **Index Partition Pruning** and BU routing. Narrows search space by 80% before vector distance calculation. | `PAYROLL` | `TAX_COMPLIANCE` | `BENEFITS` |
| **S — Service** | The specific business capability, workflow, or functional sub-vertical. | Groups knowledge units into functional capability modules for package assembly. | `DIRECT_DEPOSIT` | `WITHHOLDING_RULES` | `OPEN_ENROLLMENT` |
| **R — Role** | The authorized user persona entitled to view or execute the capability. | Enforces **Role-Based Access Control (RBAC)**. Filters out practitioner admin back-office knowledge from employees. | `PRACTITIONER` / `EMPLOYEE` | `PAYROLL_ADMIN` | `BENEFITS_SPECIALIST` |
| **F — Feature** | The granular screen, policy calculation, statutory rule, or distinct user action. | Identifies the exact functional atom within a software system or regulatory policy. | `SPLIT_ALLOCATION` | `FORM_W4_EXEMPTION` | `DEPENDENT_VERIFICATION` |
| **O — Operation** | *(In DSFO)* The technical execution verb (CRUD/REST action or state transition). | Connects conversational knowledge directly to backend microservice endpoints. | `UPDATE_ALLOCATION` | `SUBMIT_EXEMPTION` | `VERIFY_DOCUMENT` |

### Concrete Canonical Strings in Production:
* `PAYROLL.DIRECT_DEPOSIT.PRACTITIONER.SPLIT_ALLOCATION`
* `TAX_COMPLIANCE.MINIMUM_WAGE.EMPLOYEE.STATUTORY_RATE`
* `BENEFITS.RETIREMENT_401K.EXECUTIVE.DEFERRED_COMPENSATION`
* `TIME_AND_ATTENDANCE.OVERTIME.PRACTITIONER.CALIFORNIA_DOUBLETIME`

---

### 3.2 The Official ADP Knowledge Platform (KP) Metadata Buckets (Unified Core Team Review Specification)

Grounded in the authoritative **ADP KP Metadata Buckets Unified Core Team Review (August 6, 2026)**, the enterprise metadata architecture is classified into **Four Canonical Decision Buckets**:

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                          THE FOUR CANONICAL ADP KP METADATA DECISION BUCKETS                           │
├──────────────────────────────────────┬─────────────────────────────────────────────────────────────────┤
│ Bucket                               │ Architectural & Operational Definition                          │
├──────────────────────────────────────┼─────────────────────────────────────────────────────────────────┤
│ 1. Mandatory (Phase 1)               │ Required input or required populated value before content enters│
│ 2. Conditional                       │ Required when content, source, or regulatory triggers apply     │
│ 3. Phase 2 (Deferred AI Controls)    │ Explicit policy & AI permission controls (Generative/Training)  │
│ 4. Derived / Removed                 │ Programmatically derived by platform/policy or removed as dup   │
└──────────────────────────────────────┴─────────────────────────────────────────────────────────────────┘
```

#### 1. Mandatory Metadata (Phase 1 Required Ingress Attributes)

| Canonical Field | Description & Operational Purpose | EKM Facet Mapping | Current EKM Sample | Implementation & Architecture Note |
| :--- | :--- | :--- | :--- | :--- |
| **`Source reference`** | System + document ID; lineage, traceability, and deduplication start here. | No direct facet provided | *Not present* | **Critical Ingress Gap**: Must be injected via ingestion connector or automated system envelope. |
| **`Content owner / steward`** | Named accountable person; mandatory before content enters the governed estate. | No direct facet provided | *Not present* | **Critical Ingress Gap**: Must be added as an accountable owner field in Spanner. |
| **`Primary language`** | Required for retrieval routing, localization, and multilingual agent response. | `language` | `english` | Normalized to controlled ISO language codes (`en`, `es`, `fr-CA`). |
| **`Audience roles`** | Multi-select whitelist. Retrieval precision, security, and ABAC depend directly on this. | `audience` | `practitioner` | Must map to the **9 Canonical Persona Subtypes** (e.g., distinguishing HR vs Payroll Practitioner). |
| **`Confidentiality classification`** | Public, Internal, Confidential, Restricted; strictly enforced at runtime retrieval. | No direct facet provided | *Not present* | **Critical Ingress Gap**: Must be added; directly drives downstream derived security controls. |
| **`ADP Product Family`** | Prevents cross-product answer confusion (`Workforce Now` ≠ `RUN` ≠ `Lyric`). | `platform + product` | `adpWorkforceNow`, `...NextGen` | Values overlap today; requires the **4-Level Product Split** detailed below. |
| **`Business Unit (BU)`** | Operating segment and distribution/entitlement context. | `businessUnit` | `majorAccounts`, `nationalAccounts`, `humanResourceOutsourcing`, `canadaMas`, `canadaNas`, `canadaHro` | **Mandatory**: Core partition for multi-tenant and business segment isolation. |

---

#### 2. Product Leveling Architecture Around ADP Product Family

To resolve legacy EKM facet overlaps, the architecture enforces a strict **Four-Level Product Hierarchy**:

```
Level 1: Business Unit (BU) [MANDATORY]
   (e.g., majorAccounts, nationalAccounts, humanResourceOutsourcing, canadaMas, canadaNas, canadaHro)
      │
      ▼
Level 2: ADP Product Family [CONDITIONAL - Required when content is product-specific]
   (e.g., Workforce Now, RUN, Lyric, TotalSource, Vantage, GlobalView)
      │
      ▼
Level 3: ADP Product / Module [CONDITIONAL - Sub-product precision]
   (e.g., Core Payroll, Benefits Admin, Time & Attendance, Direct Deposit, Tax Compliance)
      │
      ▼
Level 4: Delivery Platform [CONDITIONAL - Runtime lane]
   (e.g., Web UI, Mobile App, REST API, File Transfer / EDI)
```

---

#### 3. Canonical Audience Roles Taxonomy (The 9 Personas)

Content owners and extraction engines must classify every Knowledge Unit into one or more of the **Nine Canonical Persona Roles**:

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                              THE 9 CANONICAL ADP AUDIENCE PERSONA ROLES                                │
├─────────────────────────┬──────────────────────────────────────────────────────────────────────────────┤
│ Persona Role            │ Authorized Operational Scope & Access Level                                  │
├─────────────────────────┼──────────────────────────────────────────────────────────────────────────────┤
│ 1. `Employee`           │ End worker self-service; benefit explainers, personal pay FAQ, PTO rules.    │
│ 2. `Manager`            │ Frontline supervisor; team timecard approval, performance, leave management. │
│ 3. `HR Practitioner`    │ Enterprise client HR administrator; onboarding SOPs, compliance workflows.   │
│ 4. `Payroll Practitioner`│ Enterprise payroll specialist; gross-to-net formulas, manual check overrides.│
│ 5. `Benefits Admin`     │ Plan sponsor administrator; open enrollment, carrier EDI feeds, ACA audits. │
│ 6. `Client Admin`       │ Executive client owner; master contract terms, billing, enterprise security. │
│ 7. `Executive`          │ Executive leadership; high-level organizational reporting and audit reviews. │
│ 8. `ADP Associate`      │ ADP's 10,000 internal support agents; internal debug runbooks, tier-2 steps. │
│ 9. `All`                │ Universal public facts; statutory holidays, general statutory labor postings.│
└─────────────────────────┴──────────────────────────────────────────────────────────────────────────────┘
```

---

#### 4. Conditional Metadata (Triggered by Content, Source, or Regulation)

| Canonical Field | Description & Operational Purpose | EKM Mapping | Condition Trigger |
| :--- | :--- | :--- | :--- |
| **`Geographic scope`** | Country, state, or municipal jurisdiction; triggers GDPR, HIPAA, and state overtime rules. | `country` | Required for all regulated, tax, or jurisdiction-specific content lanes. |
| **`Lifecycle stage`** | `Draft` vs. `Active`; controls whether content is publishable to live search. | No direct facet | Required for non-Active workflows; Phase 1 default is assumed `Active`. |
| **`Effective date`** | Authoritative start date when the policy/regulation applies (not submission date). | No direct facet | **Mandatory for time-bound rules** (e.g., minimum wage statutory phase-ins). |
| **`Review / expiry date`** | Scheduled review deadline; prevents stale content from lingering indefinitely. | No direct facet | Required for regulated, contractual, and expiry-bound knowledge units. |
| **`Retrieval eligible`** | Boolean (`true`/`false`); controls whether unit can surface in search/RAG. | No direct facet | Default `true`; content owner can explicitly restrict non-retrieval assets. |
| **`Citation required`** | Mandatory declaration for compliance content; requires AI to cite legal source. | No direct facet | Required for statutory tax, ERISA, and wage rules; citation output is mandatory. |

---

#### 5. Phase 2 (Deferred AI Governance & Permission Controls)

These fields are explicitly modeled in the architecture now to ensure forward compatibility:

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                              PHASE 2: AI GOVERNANCE & PERMISSION CONTROLS                              │
├──────────────────────────────┬───────────────┬─────────────────────────────────────────────────────────┤
│ Canonical Control Field      │ Default Value │ Architectural Behavior & Enforcement Mechanism          │
├──────────────────────────────┼───────────────┼─────────────────────────────────────────────────────────┤
│ `Generative use allowed`     │ YES (True)    │ Permits LLMs to use chunk text to synthesize answers.   │
│                              │               │ Content owner can restrict chunk to exact quoting only. │
├──────────────────────────────┼───────────────┼─────────────────────────────────────────────────────────┤
│ `Training use allowed`       │ NO (False)    │ Strict Opt-In. Explicitly prevents knowledge from being │
│                              │               │ exported into model fine-tuning or pre-training datasets│
├──────────────────────────────┼───────────────┼─────────────────────────────────────────────────────────┤
│ `Restricted prompt context`  │ NO (False)    │ Air-Gaps content from the LLM prompt window entirely.   │
│                              │               │ For legally privileged or executive content: chunk can  │
│                              │               │ be retrieved for metadata existence, but raw text never │
│                              │               │ enters the generative prompt context.                   │
└──────────────────────────────┴───────────────┴─────────────────────────────────────────────────────────┘
```

---

#### 6. AI-Enriched Metadata Lane (Generated at Ingest Time)

Generated automatically by the Two-Pass Ingestion Engine; content owners review and override as needed:

* **Discovery & Classification**:
  * **`Domain path (levels 1–3 minimum; 4–5 optional)`**: Platform-derived hierarchical routing path (`DOMAIN.SERVICE.FEATURE.[OPERATION]`).
  * **`Topic tags + entity extraction`**: Mandatory semantic tagging of products, client entities, statutory regulations, and named backend systems.
* **Relationships & Trust**:
  * **`Duplicate / near-duplicate flag`**: Mandatory programmatic detection; surfaced to content owners via VerifyAI (platform does *not* auto-delete; draws Spanner graph edges).
  * **`Content quality score`**: Mandatory numeric quality assessment based on clarity, structure, and completeness.
* **Retrieval Layer**:
  * **`Chunk headings`**: Mandatory hierarchical breadcrumb headings attached to chunks to maximize passage-level vector retrieval accuracy.
* **Explicitly Excluded Out-of-Lane Items**: Summary/abstract, non-AI synonyms, and contact dashboards are intentionally separated from the core ingestion lane to keep processing deterministic.

---

#### 7. Derived & Platform-Policy Fields (Removed from Owner Data-Entry)

To reduce human data-entry fatigue and eliminate compliance human error, these fields are derived programmatically:

1. **`Contains PII`**: Derived automatically by **Google Cloud Sensitive Data Protection (SDP)** and confidentiality classification. Manual input is removed because an incorrect default is a severe legal liability.
2. **`Client-facing allowed`**: Tri-state permission (`Client-facing` / `Associate-only` / `Restricted`). Derived programmatically from the combination of `confidentiality_classification` and `audience_roles`.
3. **`Audience type`** (`Internal` / `External` / `Both`): **Removed as redundant**; fully inferred from role mappings and confidentiality.

---

#### 8. Immediate EKM Ingress Gaps & PSO Remediation Strategy

The August 6, 2026 review identified an immediate compliance risk in legacy EKM ingestion:
> **Core Team Finding (Page 4)**: *"Immediate gap from EKM sample: Source reference, Content owner/steward, and Confidentiality classification are not present and must be added or connector-populated for phase 1 mandatory compliance."*

**Google Cloud PSO Architectural Remediation**:
1. **Source Reference Ingestion Filter**: Google Cloud Ingestion Connectors (Dataflow CDC / GCS Event Triggers) automatically synthesize the `source_reference` by combining the source system URI, document GUID, and ingestion batch timestamp:
   `source_reference = "EKM::" + source_system_id + "::" + document_guid`
2. **Owner / Steward Population**: Ingestion pipelines extract author identity from CMS revision histories or enforce mandatory metadata front-matter during repository synchronization. Content lacking an identifiable steward is routed to the VerifyAI quarantine queue.
3. **Confidentiality Classification Inference**: Files entering without an explicit classification are defaulted to `Internal` and scanned via Cloud SDP. If financial account numbers or SSNs are detected, the classifier automatically upgrades the status to `Restricted`.

---

---
## 4. Technical Options for Metadata Extraction

We evaluated five distinct architectural approaches for metadata extraction across throughput latency, computational cost, visual structural awareness, semantic precision, and schema governance:

### Comparative Evaluation Matrix:

| Approach | Primary Tech Stack | Latency / Unit | Cost / 10k Pages | Structural & Table Awareness | Semantic & Schema Precision | Hallucination Resistance | DSRF/DSF Taxonomic Compliance | Enterprise Suitability for ADP |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Option 1: Heuristic & RegEx Front-Matter Parsing** | Python RegEx, File Path Tokenizers, MIME Parsers | < 1 ms | $0.00 | **None (0%)**<br/>Blind to visual grids & multi-column text | **Very Poor (<30%)**<br/>Captures only surface folder names & file conventions | **100% Deterministic**<br/>(Hardcoded regex rules) | **Fails**<br/>Cannot deduce semantic roles, features, or statutory stances | **Unacceptable for Knowledge Bodies**<br/>Reserved strictly for file envelope ingestion (`source_ref`, `intake_time`). |
| **Option 2: Specialized Discriminative Classifiers** | Fine-Tuned DeBERTa-v3 / Vertex AI AutoML Text | 20–50 ms | $0.10 – $0.25 | **None (0%)**<br/>Operates strictly over unformatted text streams | **Moderate (70--78%)**<br/>Effective for coarse classification; fails on complex conditions | **100% Deterministic**<br/>(Softmax probability over fixed classes) | **Partial / Rigid**<br/>Classifies top-level domains, but blind to granular dates, citations, & roles | **Insufficient Alone**<br/>Useful as an auxiliary coarse classifier, but cannot extract 33 dimensional attributes. |
| **Option 3: Document AI Layout Parser v1.6** | Google Cloud Document AI (Specialized Vision OCR) | 150–300 ms | $1.50 – $2.00 | **Exceptional (>95%)**<br/>Reconstructs 2D table grids, cell merges, reading order, & footnotes | **High (Structural)**<br/>Classifies document blocks (tables, headers, lists, paragraphs) | **100% Deterministic**<br/>(Computer vision bounding-box parser) | **Incomplete (Structural Only)**<br/>Preserves layout relationships, but lacks business semantic understanding | **Mandatory Structural Foundation**<br/>Essential for parsing high-density payroll grids, statutory wage matrices, & footnotes. |
| **Option 4: Unconstrained Generative LLM Extraction** | Gemini 2.5 Flash / Pro (Free-form System Prompting) | 500–1500 ms | $4.00 – $8.00 | **Moderate (60--75%)**<br/>Dependent on markdown formatting quality | **Variable (80--92%)**<br/>High semantic depth, but prone to key drift & hallucinated values | **Poor (~70%)**<br/>Suffers from schema drift and unconstrained vocabulary output | **Unreliable**<br/>Invent non-standard roles (e.g. `Admin` vs `PRACTITIONER`), breaking index pre-filtering | **High Operational Risk**<br/>Unacceptable in regulated compliance without strict schema constraints. |
| **Option 5: Hybrid Two-Pass Engine (RECOMMENDED)** | **DocAI Layout Parser v1.6 + Gemini Constrained Decoding** | **450–800 ms** | **$2.20 – $3.50** | **Exceptional (>98%)**<br/>2D spatial layout tree + semantic boundary alignment | **Near-Perfect (>98.5%)**<br/>Exact Pydantic enum validation + context-aware attribute extraction | **100% FSM-Constrained**<br/>(Finite-state machine token-level logit masking) | **100% Deterministic**<br/>Guarantees valid DSRF/DSF tokens, ISO geos, and temporal epoch integrity | **Target Enterprise Standard**<br/>Delivers complete legal defensibility, sub-5ms retrieval compatibility, and zero hallucination. |

---

### Detailed Architectural Analysis of Extraction Options:

#### 1. Option 1: Heuristic & RegEx Front-Matter Parsing
* **Operational Mechanics**: Ingests files using regular expression patterns matched against directory hierarchies, file names (e.g., `WFN_Payroll_CA_2025_DirectDeposit.pdf`), or CMS metadata tags.
* **Failure Modes**: Modern regulatory documents, employee handbooks, and standard operating procedures (SOPs) are rarely homogeneous. A single 40-page compliance manual covers dozens of topics spanning multiple jurisdictions, roles, and effective dates. Option 1 cannot read inside the document body, cannot detect internal temporal phase-ins, and is blind to scanned PDFs.
* **Architectural Verdict**: Suitable strictly as an initial envelope extractor for static attributes (`source_ref`, `ingestion_batch_id`, `file_format`).

#### 2. Option 2: Specialized Discriminative Classifiers (BERT / RoBERTa / Vertex AutoML)
* **Operational Mechanics**: Operates a fine-tuned sequence classifier outputting a fixed softmax probability distribution over predefined classes.
* **Failure Modes**: While fast and cost-effective for static document-level routing (e.g., classifying an entire document as `PAYROLL`), discriminative models cannot handle generative structured extraction. They cannot extract arbitrary legal citations, cannot parse complex nested tables, cannot compute temporal validity epochs, and cannot synthesize multi-sentence business rules into canonical `FEATURE` tags.
* **Architectural Verdict**: Insufficient for granular Knowledge Unit generation; relegated to coarse document triage if needed.

#### 3. Option 3: Document AI Layout Parser v1.6 (Pure Vision / Structural OCR)
* **Operational Mechanics**: Employs multimodal vision transformers to detect physical bounding boxes, logical reading order, nested headers, table cells, merged columns, and footnote anchors across complex multi-page layouts.
* **Capabilities**: Excels at preserving visual context. In financial and statutory documents where meaning is encoded spatially (such as salary brackets, tax rates, and effective date columns), Layout Parser v1.6 prevents the layout corruption that plagues standard linear OCR.
* **Failure Modes**: Option 3 understands *structure*, but not *business semantics*. It can identify that a block is a table cell with a footnote, but cannot determine whether the policy applies to an enterprise `PRACTITIONER` or an end `EMPLOYEE`.
* **Architectural Verdict**: The mandatory first pass of the ingestion pipeline.

#### 4. Option 4: Unconstrained Generative LLM Extraction (Free-Form Prompting)
* **Operational Mechanics**: Submits raw extracted text chunks to a Large Language Model with an open-ended system prompt instructing it to return metadata in JSON format.
* **Failure Modes**: In enterprise architectures, unconstrained LLM output is a primary source of silent failures:
  1. *Schema Drift*: The model invents non-standard JSON keys (e.g., `"role_type"` instead of `"authorized_dsrf_roles"`).
  2. *Taxonomic Hallucination*: The model outputs unauthorized values (e.g., `"Payroll Specialist"` instead of the canonical canonical enum `PRACTITIONER`).
  3. *Syntax Malformation*: Unescaped quotes, trailing commas, or markdown wrapper blocks break automated ingestion parsers.
* **Architectural Verdict**: Unacceptable for enterprise production in regulated payroll and compliance domains.

#### 5. Option 5: The Recommended Hybrid Two-Pass Engine
* **Operational Mechanics**: Integrates **Google Document AI Layout Parser v1.6** in Pass 1 to generate a structured visual layout tree, followed by **Gemini 2.5 Flash / 3.5 Flash-Lite with Controlled Generation (`response_schema`)** in Pass 2.
* **Capabilities**: By coupling layout-aware chunk boundary formation with grammar-constrained decoding (FSM-enforced logit masking), the pipeline achieves both structural fidelity and mathematical schema precision.
* **Architectural Verdict**: The definitive architectural standard for ADP Questa / Sebastian.

---
## 5. What is Recommended and Why? (The Two-Pass Hybrid Pipeline)

### The Recommended Target: The Hybrid Two-Pass Ingestion Engine

We mandate an enterprise **Two-Pass Pipeline** combining **Google Document AI Layout Parser v1.6** (Pass 1: Visual Structural Grounding) with **Gemini 2.5 Flash / 3.5 Flash-Lite Constrained Decoding** (Pass 2: Semantic Schema Extraction).

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                 THE TWO-PASS INGESTION PIPELINE                                  │
├───────────────────────────────────────────────────┬──────────────────────────────────────────────┤
│ PASS 1: STRUCTURAL & VISUAL FOUNDATION            │ PASS 2: SEMANTIC & TAXONOMIC EXTRACTION      │
│ (Google Document AI Layout Parser v1.6)           │ (Gemini Constrained Decoding via FSM)        │
├───────────────────────────────────────────────────┼──────────────────────────────────────────────┤
│ • Preserves 2D table cell coordinates & grids     │ • Enforces 100% deterministic Pydantic enum  │
│ • Binds footnote annotations to parent table rows │ • Maps business logic to DSRF/DSF taxonomy   │
│ • Reconstructs true human visual reading order    │ • Extracts temporal epochs & ISO geos        │
│ • Generates structural bounding boxes & breadcrumbs│ • Computes cross-entropy confidence score    │
└───────────────────────────────────────────────────┴──────────────────────────────────────────────┘
```

### Architectural Rationale & Strategic Advantages:

#### 1. Resolving High-Density Tabular & Footnote Complexities in Financial Knowledge Assets
Historical document extraction pipelines and legacy OCR engines frequently corrupt multi-column financial matrices, color-coded rate schedules, and parenthesized footnote annotations by flattening visual layouts into linear text streams. When a statutory tax table is flattened:
* Column headers become decoupled from cell data values.
* Critical statutory conditions placed in table footnotes (e.g., *"Applies only to employers with 25+ employees"*) are detached from the wage rate row and appended to the end of the document as orphan text.
* Retrieval queries match the base rate while omitting the statutory prerequisite, causing downstream AI agents to output legally non-compliant answers.

Document AI Layout Parser v1.6 natively preserves physical bounding boxes, reading order, and table cell coordinate trees, programmatically binding footnote superscripts to their corresponding table rows and cells *before* chunk boundaries are established.

#### 2. 100% Deterministic Schema Adherence via Controlled Generation
By configuring Gemini with **`response_schema`**, the LLM's token generation process is mathematically constrained by a finite-state machine (FSM). During decoding, token logits that do not correspond to the valid Pydantic grammar are masked to negative infinity (-∞).
* The model **cannot physically emit** an invalid DSRF role, an unapproved DSF domain, or a malformed date string.
* Eliminates the need for fragile post-hoc JSON repair libraries or prompt retry loops caused by syntax errors.

#### 3. Optimized Throughput, Latency & Ingestion Unit Economics
* Ingestion pipelines process documents asynchronously at batch scale. Offloading heavy computer vision layout parsing to specialized Document AI processors allows the generative semantic extraction pass to operate over pre-chunked, high-density structured contexts.
* Utilizing Gemini 2.5 Flash for the second pass delivers state-of-the-art reasoning at sub-second execution times and optimal cost efficiency compared to running heavy frontier models over raw, unformatted documents.

---
## 6. How Will It Be Ensured That DSRF Metadata is Extracted Successfully?

Taxonomic integrity across millions of enterprise knowledge units cannot rely on probabilistic trust. We implement an end-to-end, **Five-Layer Quality Assurance & Validation Engine**:

```mermaid
flowchart TD
    subgraph Engine ["FIVE-LAYER QUALITY ASSURANCE & VALIDATION ENGINE"]
        L1["LAYER 1: GRAMMAR-CONSTRAINED DECODING<br/>• Token-level logit masking via Finite-State Machine (FSM)<br/>• Mathematically prevents syntax drift & illegal enum values"]
        
        L2["LAYER 2: CANONICAL FEW-SHOT CONTEXTUAL GROUNDING<br/>• System prompt containing golden definitions of all 6 DSF Domains & 5 DSRF Roles<br/>• Edge-case exemplars (e.g., Practitioner SOPs vs Employee FAQs)"]
        
        L3["LAYER 3: PROGRAMMATIC DETERMINISTIC VALIDATION GATE<br/>• Pydantic AST validation & business logic assertion<br/>• Temporal integrity: effective_start_epoch <= effective_end_epoch<br/>• Geographic ISO 3166 standardization & SHA-256 syntactic hashing"]
        
        L4["LAYER 4: AUTOMATED CONFIDENCE SCORING & DUAL-PATH THRESHOLDING<br/>• Multi-factor confidence metric: Token log-probs + Schema completeness + Grounding<br/>• Dual-path gating: >= 0.88 Auto-Promotion | < 0.88 Quarantine"]
        
        L5["LAYER 5: ENTERPRISE SERVICE CATALOG SYNCHRONIZATION<br/>• Active reconciliation against ADP Cloud Spanner Enterprise Service Catalog<br/>• Validates feature and service codes against live production system registries"]
        
        L1 --> L2
        L2 --> L3
        L3 --> L4
        L4 --> L5
    end
```

### Detailed Breakdown of the Five Validation Layers:

#### Layer 1: Grammar-Constrained Decoding (FSM / Pydantic Schema Enforcement)
* **Mathematical Mechanism**: When Gemini generates tokens, the decoding engine evaluates the grammar specified by the Pydantic schema as a Deterministic Finite Automaton (DFA). At each token prediction step t, the set of valid vocabulary tokens V_valid ⊂ V is calculated based on the current automaton state. Any token v ∉ V_valid is masked out prior to the softmax calculation:

```
P(v_t | v_<t) = exp(z_v_t / T) / sum_{j in V_valid} exp(z_j / T)   if v_t in V_valid
              = 0                                                 if v_t not in V_valid
```

* **Architectural Guarantee**: It is mathematically impossible for the pipeline to emit an unrecognized DSRF role, an invalid JSON key, or a corrupt primitive type.

#### Layer 2: Canonical Few-Shot Contextual Grounding & Prompt Engineering
* **Taxonomic Grounding**: The extraction system prompt embeds the authoritative definitions of all 6 DSF Domains and all 5 DSRF Roles:
  * `PAYROLL`: Wage computation, gross-to-net calculations, direct deposits, deductions, garnishments.
  * `TAX_COMPLIANCE`: Federal, state, and local withholding, FICA, FUTA, SUTA, reciprocal state tax treaties.
  * `BENEFITS`: Health, retirement, HSA/FSA, open enrollment, life event qualification.
  * `TIME_AND_ATTENDANCE`: Accruals, statutory sick leave, overtime calculations, break compliance.
  * `TALENT_AND_HR`: Onboarding, termination workflows, FLSA classifications, leave of absence.
  * `COMMERCIAL_PLATFORM`: Core product navigation, API integrations, user security provisioning.
* **Few-Shot Boundary Exemplars**: Ingestion prompts supply canonical few-shot pairs addressing difficult boundary conditions—such as distinguishing administrative override procedures (`PRACTITIONER`) from employee informational summaries (`EMPLOYEE`), or identifying state-specific statutory carve-outs (`US-CA`) against federal baselines (`US-FED`).

#### Layer 3: Programmatic Deterministic Post-Validation Gate
Once extracted, the structured payload passes through a rigorous programmatic validation barrier executed in a high-throughput Cloud Run microservice. This model embeds all canonical metadata attributes from the **August 6, 2026 KP Metadata Buckets (Unified Core Team Review)**:

```python
import re
from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field, field_validator, model_validator

# -----------------------------------------------------------------------------
# 1. CONTROLLED TAXONOMIC ENUMS (Aug 6, 2026 Review Grounding)
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
    source_reference: str = Field(..., description="Canonical URI synthesized via connector if missing: EKM::<system>::<guid>")
    content_owner_steward: str = Field(..., description="Steward identity or BU fallback group: BU_Knowledge_Ops_<BU>")
    primary_language: str = Field(default="en-US", description="ISO 639-1 language code")
    confidentiality_classification: ConfidentialityEnum = Field(default=ConfidentialityEnum.INTERNAL)
    business_unit: BusinessUnitEnum = Field(..., description="Level 1 Product leveling organizational alignment")
    adp_product_family: List[ProductFamilyEnum] = Field(..., description="Level 2 Product Family tags")
    product_module: Optional[str] = Field(None, description="Level 3 functional area (e.g. Time & Attendance)")
    delivery_platform: Optional[DeliveryPlatformEnum] = Field(default=DeliveryPlatformEnum.WEB)
    canonical_dsrf_domain: DSFDomainEnum = Field(..., description="Primary macro DSF domain")
    domain_path: str = Field(..., description="Minimum Level 1-3 path: DOMAIN.SERVICE.FEATURE")
    tenant_boundary: str = Field(default="GLOBAL", description="Client tenant ID or GLOBAL for shared corpus")
    data_plane: DataPlaneEnum = Field(default=DataPlaneEnum.ADP_PROPRIETARY)
    whole_document_summary: str = Field(..., description="Executive summary & Table of Contents for catalog vector")

# -----------------------------------------------------------------------------
# 3. CHUNK-LEVEL KNOWLEDGE UNIT PAYLOAD CONTRACT (Runtime Retrieval & ABAC Scope)
# -----------------------------------------------------------------------------
class GovernedKnowledgeUnitPayload(BaseModel):
    # Identifiers & Provenance
    chunk_id: str = Field(..., description="Deterministic UUID5 hash of parent_doc + chunk_index")
    parent_document_reference: str = Field(..., description="Binds child chunk to parent MacroDocumentMetadata")
    chunk_text: str = Field(..., description="Sanitized, layout-preserved passage text")
    sha256_hash: str = Field(..., description="64-character hex hash for O(1) syntactic deduplication")
    chunk_headings: List[str] = Field(..., description="Hierarchical breadcrumb path (e.g. ['Section 4', '4.2 Direct Deposit'])")
    
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

    # -------------------------------------------------------------------------
    # VALIDATION ASSERTIONS (Strict AST Quality Gates)
    # -------------------------------------------------------------------------
    @field_validator("sha256_hash")
    @classmethod
    def validate_sha256(cls, v: str) -> str:
        if not re.fullmatch(r"^[a-fA-F0-9]{64}$", v):
            raise ValueError(f"Invalid SHA-256 hash: {v}")
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
    def validate_temporal_order(self):
        if self.effective_start_epoch > self.effective_end_epoch:
            raise ValueError(
                f"Temporal invalidity: start epoch ({self.effective_start_epoch}) "
                f"exceeds end epoch ({self.effective_end_epoch})"
            )
        return self
```

#### Layer 4: Automated Confidence Scoring & Dual-Path Thresholding
* **Algorithmic Scoring**: Extraction confidence is computed deterministically using a multi-factor weighting formula:

```
Confidence Score = 0.40 * Prob_Token(DSRF) + 0.35 * Score_SchemaCompleteness + 0.25 * Score_GroundingEvidence
```

  Where:
  * `Prob_Token(DSRF)`: The geometric mean of token probabilities emitted during constrained decoding for the assigned domain and roles.
  * `Score_SchemaCompleteness`: Validates the presence of mandatory citations, non-null epochs, and valid ISO country codes.
  * `Score_GroundingEvidence`: Verifies that extracted attributes are explicitly anchored to source chunk text spans via Document AI bounding boxes.
* **Dual-Path Routing Gate**:
  * **Confidence ≥ 0.88 AND Validation Passed**: Auto-promoted directly into the Governed Knowledge Estate.
  * **Confidence < 0.88 OR Validation Exception**: Programmatically isolated to Cloud Spanner as `STAGED_UNPROMOTED` and routed to the VerifyAI human-in-the-loop review queue.

#### Layer 5: Enterprise Service Catalog & Master Ontology Synchronization
* The extraction engine cross-references extracted `SERVICE` and `FEATURE` values against ADP’s live Enterprise Service Catalog hosted in Cloud Spanner.
* If an extracted feature represents an obsolete screen or retired product code, the validator flags the discrepancy and triggers an ontology reconciliation event.

---
## 7. Failure Lifecycle: What Happens When Extraction Fails? (Retry, Flag, or Recall)

In a regulated enterprise environment handling payroll and tax, failures must be handled with mathematical predictability across three distinct lifecycles:

```mermaid
flowchart TD
    Ingest["Extraction Executed"] --> Eval{"Validation & Confidence Check"}
    
    Eval -->|Transient Error or Rate Limit| Tier1["Tier 1: RETRY<br/>• Exponential backoff jitter<br/>• Max 3 attempts<br/>• Temp perturbation: 0.0 to 0.1"]
    
    Eval -->|Confidence under 0.88 or Conflict| Tier2["Tier 2: FLAG & QUARANTINE<br/>• Spanner status: STAGED_UNPROMOTED<br/>• Routed to VerifyAI SME Queue<br/>• Zero impact on live vector index"]
    
    Eval -->|Statutory Invalidation or Defect| Tier3["Tier 3: RECALL & TOMBSTONE<br/>• Spanner status: RECALLED<br/>• Vertex removeDatapoints purge<br/>• Redis cache eviction<br/>• BigQuery audit log recorded"]
    
    Tier1 -->|Exhausted Retries| Tier2
    Tier2 -->|SME Approved in VerifyAI| Promoted["Promoted to Governed Estate"]
```

### 1. RETRY (Automated Transient Recovery)
* **Trigger**: Network timeouts, Vertex AI API rate throttling (HTTP 429), or transient network dropouts.
* **Mechanism**: Exponential backoff with full jitter `(t = 2^n × rand(0.5, 1.5))`. On retry attempt #2, prompt temperature is slightly perturbed `(0.0 → 0.1)` to escape token repetition traps. Max 3 attempts before escalating to Tier 2.

### 2. FLAG & QUARANTINE (Human-in-the-Loop Isolation)
* **Trigger**: 
  - Extraction confidence score falls below **0.88**.
  - Antagonistic policy conflict detected (e.g., a new policy directly contradicts an active policy without a clear temporal override or jurisdiction carve-out).
  - Cloud SDP flags unmasked PII or sensitive client identifiers.
* **Mechanism**:
  - The Knowledge Unit is persisted in Cloud Spanner Graph with status `STAGED_UNPROMOTED`.
  - It is **strictly excluded** from Vertex AI Vector Search indexing.
  - An event is dispatched to **VerifyAI**, opening a governance review card for ADP Subject Matter Experts (Knowledge Governance & Compliance Stewards). Designated reviewers can edit, approve, or reject the extracted metadata directly via the VerifyAI governance workbench.

### 3. RECALL & TOMBSTONING (Statutory Retraction & Deprecation)
* **Trigger**: A state legislation is struck down, an employer retracts an internal corporate policy, or a post-publishing error is identified.
* **Mechanism**:
  - **Spanner Graph**: Node lifecycle status updated to `RECALLED` / `RETIRED`.
  - **Vertex AI Vector Search**: The vector engine immediately executes `IndexServiceClient.removeDatapoints([chunk_id])`, mathematically purging the embedding from memory within seconds.
  - **Cloud Memorystore (Redis)**: Query cache keys associated with the document are evicted.
  - **Audit Log**: A cryptographic tombstone record is written to BigQuery to prove the exact millisecond the knowledge was removed for compliance audits.

---
## 8. Document-Level vs. Chunk-Level Metadata: Division of Labor

To reconcile the client's BU Admin requirements with runtime worker access control, metadata is strictly bifurcated across architectural levels in alignment with the **August 6, 2026 KP Metadata Buckets** review:

```
                                THE METADATA DIVISION OF LABOR
 ┌───────────────────────────────────────────────────────────────────────────────────────────────────────┐
 │ LEVEL 1: DOCUMENT PARSING LEVEL (BU Admin & Catalog Governance)                                       │
 ├───────────────────────────────────────────────────────────────────────────────────────────────────────┤
 │ • Primary Consumer: Business Unit Admins, Knowledge Managers, Compliance Stewards                     │
 │ • Captured Fields (Mapped from Core Team Review):                                                     │
 │   1. source_reference (Canonical source URI, synthesized connector-side if null: EKM::<sys>::<guid>)  │
 │   2. content_owner_steward (Accountable steward; fallback: BU_Knowledge_Ops_<BU>)                     │
 │   3. primary_language (ISO 639-1 code; default: en-US)                                                │
 │   4. confidentiality_classification (Public, Internal, Confidential, Restricted)                      │
 │   5. business_unit (Organizational BU: majorAccounts, nationalAccounts, humanResourceOutsourcing,    │
 │      canadaMas, canadaNas, canadaHro)                                                                 │
 │   6. adp_product_family (Level 2: adpWorkforceNow, runPoweredByAdp, adpLyric, adpTotalSource, etc.)    │
 │   7. product_module (Level 3 functional area) & delivery_platform (Level 4: web, mobile, API, file)   │
 │   8. canonical_dsrf_domain & domain_path (e.g. PAYROLL.DIRECT_DEPOSIT.SETUP_GUIDE)                    │
 │   9. tenant_boundary (AcmeCorp or GLOBAL) & data_plane (Public, ADP Proprietary, Client-Specific)     │
 │  10. whole_document_summary (Executive summary & Table of Contents for whole-doc vector embedding)   │
 │ • Operational Purpose: Powers document catalog search, BU inventory, and Knowledge Package Assembly. │
 └───────────────────────────────────────────────────┬───────────────────────────────────────────────────┘
                                                     │ Inheritance Envelope
                                                     ▼
 ┌───────────────────────────────────────────────────────────────────────────────────────────────────────┐
 │ LEVEL 2: CHUNK / KNOWLEDGE UNIT LEVEL (Runtime Access, ABAC Pre-Filter & Mathematical Retrieval Atom) │
 ├───────────────────────────────────────────────────────────────────────────────────────────────────────┤
 │ • Primary Consumer: Cloud Run Entitlement Gateway, Vertex AI Vector Search, Gemini Conversational AI   │
 │ • Captured Fields (Mapped from Core Team Review):                                                     │
 │   1. audience_roles Whitelist (Employee, Manager, HR Practitioner, Payroll Practitioner, Benefits      │
 │      Admin, Client Admin, Executive, ADP Associate, All)                                              │
 │   2. geographic_scope (US-FED, US-CA, US-NJ, CA-ON — ISO 3166 hierarchy)                             │
 │   3. effective_date, effective_start_epoch & effective_end_epoch (Time-bound statutory filtering)     │
 │   4. review_expiry_date (Staleness prevention) & retrieval_eligible (Boolean gating)                  │
 │   5. citation_required & citation (Statutory legal backing displayed in 10-field Answer Context)      │
 │   6. generative_use_allowed, training_use_allowed & restricted_prompt_context (Phase 2 AI controls)   │
 │   7. contains_pii (Derived by Cloud SDP) & client_facing_allowed (Client-facing/Associate/Restricted) │
 │ • Operational Purpose: Enforces sub-5ms ABAC, prevents data leakage, and stops outdated tax retrieval.│
 └───────────────────────────────────────────────────┬───────────────────────────────────────────────────┘
                                                     │ Passage & Trust Enrichment
                                                     ▼
 ┌───────────────────────────────────────────────────────────────────────────────────────────────────────┐
 │ LEVEL 3: AI-ENRICHED INGESTION LANE (Passage Precision & Lineage Graph Infrastructure)                │
 ├───────────────────────────────────────────────────────────────────────────────────────────────────────┤
 │ • Primary Consumer: Vertex AI Hybrid Search (BM25 + Dense), Cloud Spanner Graph Deduplication Engine  │
 │ • Captured Fields (Mapped from Core Team Review):                                                     │
 │   1. domain_path (Platform-derived levels 1–3 minimum: DOMAIN.SERVICE.FEATURE; 4–5 optional)           │
 │   2. topic_tags + entity_extraction (Products, clients, policies, regulations, named backend systems) │
 │   3. duplicate_near_duplicate_flag (Surfaced to content owners; draws Spanner [:SUPERSEDES] edges)    │
 │   4. content_quality_score (Algorithmic quality rating across completeness and clarity)               │
 │   5. chunk_headings (Hierarchical breadcrumb strings to maximize passage-level retrieval precision)   │
 │   6. sha256_hash (Exact byte hash for O(1) syntactic deduplication in Cloud Spanner)                  │
 │ • Operational Purpose: Eliminates redundant storage, resolves conflicting policies, & maximizes RAG. │
 └───────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### Architectural Rationale for the Division of Labor:
1. **Reconciling BU Admin vs. Worker Access**:
   * BU Administrators require high-level inventory tracking, ownership attribution, and catalog navigation (Level 1). They manage knowledge assets by Product Family, Business Unit, and Ingestion Source.
   * Frontline associates and client workers require sub-5ms execution of strict persona entitlements, temporal relevance, and jurisdictional boundaries (Level 2).
2. **Immutable Envelope Inheritance**:
   * When a document is parsed, its Level 1 metadata establishes an immutable security and catalog envelope. Every chunk extracted from that document automatically inherits the document's `tenant_boundary`, `business_unit`, `adp_product_family`, and `data_plane`.
   * Chunks cannot elevate permissions beyond their parent envelope (e.g., if a document is tagged `Internal`, no child chunk can be marked `Public`).
3. **Optimized Vector Search vs. Graph Storage**:
   * Only the 7 critical ABAC fast-path fields are indexed in Vertex AI Vector Search memory (Tenant, Product, Domain, Audience Roles, Geography, Start Epoch, End Epoch).
   * The rich AI-enriched lineage metadata (Level 3) is stored exclusively in Cloud Spanner Graph, keeping vector search latency under 2.5 ms while providing complete auditability.

---
## 9. Runtime Entitlements & Sub-5ms Context Filtering Architecture

### 9.1 The Real-World ADP Context: Why This is Mission-Critical

At ADP, runtime entitlements are not standard web application permissions; they represent the **deterministic legal, regulatory, and tenant firewall governing the intelligence layer**. Serving human resources, payroll, tax filing, and benefits administration across **1 million+ enterprise clients and 76 million+ workers**, an un-entitled or mis-entitled AI retrieval carries severe statutory liabilities.

If runtime entitlements fail or are evaluated incorrectly, the platform encounters four catastrophic enterprise failure modes:

1. **Cross-Product Contamination**:
   * *The Risk*: An SMB client subscribed strictly to **ADP RUN** queries: *"How do I set up split direct deposit?"* The conversational AI retrieves an excerpt from an **ADP Workforce Now (WFN)** or **Vantage** enterprise manual.
   * *The Impact*: The client attempts to locate menu options, security settings, or administrative screens that do not exist in their software edition, causing severe user frustration, customer support escalations, and degraded product trust.
2. **Persona Privilege Escalation & Data Leakage**:
   * *The Risk*: An end **Employee** asks: *"How are overtime hours calculated for holiday weeks?"* The retrieval engine pulls an internal **HR Practitioner** back-office configuration manual explaining how administrators can apply manual override codes or retroactively modify timecard audit records.
   * *The Impact*: Exposing administrative configuration workflows, back-office override procedures, or executive salary adjustment formulas to frontline workers violates basic enterprise data segregation principles.
3. **Multi-Tenant Boundary Cross-Contamination**:
   * *The Risk*: An HR administrator at *Client Corporation A* asks about paid parental leave policies, and the vector search engine retrieves a policy document uploaded by *Client Corporation B* because both belong to the same industry and share high semantic similarity.
   * *The Impact*: Irreversible breach of corporate confidentiality, non-disclosure agreements, and multi-tenant security guarantees.
4. **Temporal & Statutory Rule Violations**:
   * *The Risk*: A payroll administrator queries minimum wage thresholds for California in March 2026. A vector search engine without temporal restricts retrieves an older 2024 compliance bulletin because the semantic similarity score for the 2024 bulletin was marginally higher than the 2026 update.
   * *The Impact*: The client executes payroll calculations against obsolete statutory rates, triggering automatic Department of Labor audit penalties, retroactive wage claims, and substantial financial damages.

---

### 9.2 The Two Fatal Technical Traps Runtime Entitlements Must Solve

Enterprise knowledge architectures frequently fail when adapting naive Retrieval-Augmented Generation (RAG) paradigms to complex access-control topologies. The platform must resolve two fundamental engineering bottlenecks:

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                 THE TWO FATAL ENTITLEMENT BOTTLENECKS                                  │
├────────────────────────────────────────────────────┬───────────────────────────────────────────────────┤
│ TRAP A: THE TOP-K TRUNCATION DISASTER              │ TRAP B: THE IDENTITY FRAGMENTATION BOTTLENECK     │
│ (The Post-Filtering Vulnerability)                 │ (The Latency Disaster)                            │
├────────────────────────────────────────────────────┼───────────────────────────────────────────────────┤
│ • Vector database retrieves global Top-5 hits      │ • User permissions are fragmented across dozens   │
│ • Downstream security checks drop unauthorized     │   of legacy Systems of Record (SORs) & IDPs       │
│ • Result: All 5 hits dropped; valid hit at Pos #6  │ • Calling SORs live on user query takes 300-800ms │
│   is never seen. AI falsely claims "No data"       │ • Shatters ADP's mandatory sub-5ms SLA budget     │
├────────────────────────────────────────────────────┼───────────────────────────────────────────────────┤
│ SOLUTION: Mathematical Pre-Filtering in Vector DB  │ SOLUTION: Event-Driven Redis Session Warming      │
└────────────────────────────────────────────────────┴───────────────────────────────────────────────────┘
```

#### Trap A: The "Top-K Truncation" Disaster (Why Post-Filtering Fails)
In traditional application security, authorization is applied *after* data retrieval (Post-Filtering). In vector retrieval systems, this approach fails mathematically:
1. A user queries: *"What is the policy on bereavement leave?"*
2. The vector index executes an approximate nearest neighbor (ANN) search across the entire global corpus and returns the top 5 closest semantic matches (K = 5).
3. The post-retrieval authorization filter evaluates each returned chunk against the asking user's entitlements:
   - Chunk 1: Belongs to Workforce Now (User is on RUN) → **DROPPED**
   - Chunk 2: Restricted to HR Practitioners (User is an Employee) → **DROPPED**
   - Chunk 3: Expired 2023 policy edition → **DROPPED**
   - Chunk 4: Uploaded by a different client tenant → **DROPPED**
   - Chunk 5: Belongs to TotalSource PEO → **DROPPED**
4. **The Failure**: All 5 retrieved candidates are discarded. The LLM receives an empty context window and hallucinatingly reports: *"ADP has no policy on bereavement leave."* Meanwhile, the perfectly valid, fully authorized RUN employee chunk was sitting at **Position #6** in the global index, completely ignored because it fell outside the top-K retrieval window.

**The Engineering Solution: Mathematical Pre-Filtering**  
We push Attribute-Based Access Control (ABAC) restricts directly into **Vertex AI Vector Search's ScaNN algorithm**. The mathematical search space is partitioned *prior* to vector distance evaluation. Chunks that do not match the user's tenant, product subscription, role whitelist, and current timestamp are mathematically excluded from candidate evaluation. Only fully authorized knowledge units can ever occupy a top-K slot.

#### Trap B: The Identity Fragmentation Bottleneck (The Latency Disaster)
* In large-scale enterprise environments like ADP, user entitlements, product subscriptions, and organizational affiliations are distributed across hundreds of disparate legacy Systems of Record (SORs), identity providers (IDPs), and transactional databases.
* Executing live, synchronous RPC calls to query these fragmented backends during an active chat turn consumes **300 to 800 ms of latency**, completely blowing past ADP's sub-5ms retrieval budget.

**The Engineering Solution: Event-Driven Asynchronous Session Warming**  
Authentication is completely decoupled from runtime retrieval. When a user logs in via ADP's central authentication portal, an asynchronous event is emitted to **Google Cloud Pub/Sub**. A dedicated background worker computes the user's unified entitlement tuple and pre-warms a high-speed in-memory cache in **Cloud Memorystore (Redis)**. When the user submits a prompt, the entitlement gateway resolves their complete authorization profile in **< 1 ms**.

---

### 9.3 How Runtime Entitlements Work in Practice (The Sub-5ms Flow)

Runtime entitlement enforcement operates as a high-performance **Two-Tier Pre-Filter**:

```
Search Scope = [Macro Document Subscription (from IDP / SOR)] ∩ [Micro Persona Context (from Redis Session)]
               (Matches Document DSRF & Product)                (Matches Chunk Role, Jurisdiction & Dates)
```

```mermaid
sequenceDiagram
    autonumber
    actor User as Enterprise Practitioner (HR Admin, Acme Corp)
    participant GW as Cloud Run Entitlement Gateway
    participant Redis as Cloud Memorystore (Redis)
    participant Vertex as Vertex AI Vector Search
    participant Spanner as Cloud Spanner Graph
    participant Gemini as Gemini 2.5 Flash

    User->>GW: "What is our direct deposit Net Split limit?"
    
    rect rgb(230, 230, 250)
    Note over GW,Redis: Latency: ~1.0 ms (Session & Persona Resolution)
    GW->>Redis: GET "entitlement:AdminUser:AcmeCorp"
    Redis-->>GW: { macro_prods: ['RUN'], macro_dsf: ['PAYROLL'], role: 'PRACTITIONER', geo: 'US-NJ', time: 1741785600 }
    end

    rect rgb(230, 230, 250)
    Note over GW,Vertex: Latency: ~2.5 ms (Pre-Filtered Math Search)
    GW->>Vertex: VectorSearch(query_vec, <br/>  restricts=[<br/>    {namespace: "product", allow: ["RUN"]},<br/>    {namespace: "domain", allow: ["PAYROLL"]},<br/>    {namespace: "audience", allow: ["PRACTITIONER"]},<br/>    {namespace: "geography", allow: ["US-FED", "US-NJ"]}<br/>  ],<br/>  numeric_restricts=[<br/>    {namespace: "effective_start", value_int: <= 1741785600},<br/>    {namespace: "effective_end", value_int: >= 1741785600}<br/>  ]<br/>)
    Vertex-->>GW: Returns Top-5 Authorized Chunk IDs (Zero Top-K Truncation!)
    end

    rect rgb(255, 245, 230)
    Note over GW,Spanner: Latency: ~1.2 ms (Lineage & Exception Traversal)
    GW->>Spanner: Fetch KU nodes & traverse [:HAS_EXCEPTION] edges for NJ overrides
    Spanner-->>GW: Returns verified text + 10-field Sebastian Answer Context
    end

    GW->>Gemini: Assemble context envelope
    Gemini-->>User: Delivers role-tailored, verified answer (< 4.7ms total retrieval overhead)
```

#### Step-by-Step Latency Breakdown:
1. **Step 1: Session & Entitlement Lookup (~1.0 ms)**:
   * The Cloud Run Entitlement Gateway receives the user's bearer token.
   * A single `MGET` call against Cloud Memorystore (Redis) retrieves the user's pre-warmed authorization tuple: active product subscriptions (`RUN`), assigned DSRF persona (`PRACTITIONER`), geographic jurisdiction (`US-NJ`), and current UTC timestamp (`1741785600`).
2. **Step 2: Pre-Filtered Mathematical Vector Search (~2.5 ms)**:
   * The query embedding is dispatched to Vertex AI Vector Search with categorical and numeric restricts.
   * ScaNN prunes the search graph to include only vectors tagged with `product IN ('RUN', 'GLOBAL')`, `audience == 'PRACTITIONER'`, `geography IN ('US-FED', 'US-NJ')`, and `effective_start_epoch <= 1741785600 <= effective_end_epoch`.
   * Vertex AI returns the top candidate Knowledge Unit IDs with zero Top-K truncation.
3. **Step 3: Graph Traversal & Governance Context Fetch (~1.2 ms)**:
   * The Gateway queries Cloud Spanner Graph using the returned KU IDs.
   * Spanner executes an O(1) key lookup to fetch the full verified text, legal citations, and traverses any local exception edges (`[:HAS_EXCEPTION]`) to check for state-level overrides.
4. **Total Retrieval Overhead**: 4.7 ms—comfortably within ADP's sub-5ms architectural SLA.

---

### 9.4 How Runtime Entitlements Map to Our Metadata Architecture

Runtime entitlements achieve zero-latency enforcement because metadata is intentionally bifurcated across two distinct structural levels during ingestion:

| Architectural Tier | Metadata Attributes Evaluated | Storage Location | Runtime Entitlement Function |
| :--- | :--- | :--- | :--- |
| **Level 1: Document Parsing Level**<br/>*(Macro Scope)* | • `tenant_boundary` (`AcmeCorp`, `GLOBAL`)<br/>• `data_plane` (`Public`, `Proprietary`, `Client`)<br/>• `product` (`RUN`, `WFN`, `TotalSource`)<br/>• `primary_dsf_domain` (`PAYROLL`, `TAX`) | Cloud Spanner (Doc Entity) & Vertex Fast-Path Restrict | **Macro Partitioning**: Restricts the global search space to the client organization's contracted product catalog and tenant data silo. |
| **Level 2: Chunk / KU Level**<br/>*(Micro Scope)* | • `authorized_dsrf_roles` (`['PRACTITIONER']`)<br/>• `geography` (`['US-FED', 'US-NJ']`)<br/>• `effective_start_epoch` (1704067200)<br/>• `effective_end_epoch` (2147483647) | Vertex AI Vector Search In-Memory Restrict Index | **Micro Gating**: Filters knowledge atoms by individual persona privileges, state/local jurisdictions, and real-time temporal validity. |
| **Level 3: Graph Lineage Level**<br/>*(Relational Scope)* | • `[:SUPERSEDES]` (Temporal successor)<br/>• `[:HAS_EXCEPTION]` (State/local carve-out)<br/>• `citation` (Statutory legal backing) | Cloud Spanner Graph (Edges & 33 Dimensions) | **Relational Late-Binding**: Resolves conflicting policies, applies localized overrides, and attaches legally defensible source provenance. |

---

### 9.5 Actions Taken During Metadata Extraction to Enable Seamless Runtime Entitlements (Phase-by-Phase)

To guarantee that runtime entitlement checks execute deterministically in < 5 ms without runtime recalculation, the ingestion engine systematically generates, validates, and indexes all necessary access controls across **Six Ingestion Phases**:

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                        METADATA EXTRACTION PIPELINE: ENTITLEMENT PREPARATION                           │
├──────────────────────────────────────┬─────────────────────────────────────────────────────────────────┤
│ Ingestion Phase                      │ Actions Executed to Enable Seamless Runtime Entitlements         │
├──────────────────────────────────────┼─────────────────────────────────────────────────────────────────┤
│ Phase 1: Intake & Envelope Ingestion │ • Extracts static file envelope: source_ref, tenant_boundary,   │
│                                      │   and data_plane classification. Binds tenant access boundaries.│
├──────────────────────────────────────┼─────────────────────────────────────────────────────────────────┤
│ Phase 2: Visual Structural Layout    │ • Document AI v1.6 parses 2D table grids & binds footnote       │
│         (Pass 1)                     │   conditions directly to parent rows. Generates SHA-256 hash.   │
├──────────────────────────────────────┼─────────────────────────────────────────────────────────────────┤
│ Phase 3: Macro Document Taxonomy     │ • Gemini classifies macro DSF Domain (PAYROLL, TAX) and builds  │
│                                      │   whole-document embedding for BU Admin catalog search.         │
├──────────────────────────────────────┼─────────────────────────────────────────────────────────────────┤
│ Phase 4: Granular Semantic Schema    │ • Gemini with response_schema extracts authorized_dsrf_roles,   │
│         (Pass 2)                     │   converts dates to Unix epochs, and extracts ISO jurisdictions.│
├──────────────────────────────────────┼─────────────────────────────────────────────────────────────────┤
│ Phase 5: Deterministic Validation    │ • Programmatic Pydantic barrier verifies epoch integrity and    │
│         & Quality Scoring            │   reconciles feature codes against the Spanner Service Catalog. │
├──────────────────────────────────────┼─────────────────────────────────────────────────────────────────┤
│ Phase 6: Dual Storage Routing        │ • Pushes 7 Fast-Path Restricts to Vertex AI in-memory index;    │
│                                      │   persists full 33 dimensions and lineage edges in Spanner.     │
└──────────────────────────────────────┴─────────────────────────────────────────────────────────────────┘
```

#### Detailed Phase-by-Phase Roadmap:

1. **Phase 1: Ingestion & Document Envelope Extraction (Pass 0)**:
   * *Actions*: Captures the origin URI (`source_ref`), tenant classification (`tenant_boundary`), and confidentiality tier (`data_plane`).
   * *Runtime Enabler*: Guarantees that client-specific private handbooks receive private tenant tags at ingress, establishing absolute isolation before any chunking or embedding occurs.
2. **Phase 2: Visual Layout & Structural Analysis (Pass 1 - Document AI Layout Parser v1.6)**:
   * *Actions*: Identifies table cell coordinates, bounding boxes, and reading hierarchies. Explicitly binds footnote annotations (e.g., *"Eligible only after 90 days of employment"*) directly to parent table rows.
   * *Runtime Enabler*: Eliminates orphan citations and incomplete policy conditions, ensuring that retrieved chunks contain all prerequisite eligibility criteria required for entitlement decisions.
3. **Phase 3: Macro Document Taxonomy Classification (Gemini Flash)**:
   * *Actions*: Generates the top-level DSF Domain string (`PAYROLL.DIRECT_DEPOSIT`) and creates a whole-document summary embedding.
   * *Runtime Enabler*: Populates the Cloud Spanner document catalog for BU Admins, enabling rapid macro-filtering by product line and domain.
4. **Phase 4: Granular Semantic Schema Extraction (Pass 2 - Gemini with `response_schema`)**:
   * *Actions*: Evaluates layout-aware chunks to extract:
     - Persona role whitelists (`authorized_dsrf_roles: [PRACTITIONER, CLIENT_ADMIN]`).
     - Converts human-readable calendar dates into exact Unix epoch integers (`effective_start_epoch`, `effective_end_epoch`).
     - Normalizes regional applicability into standardized ISO 3166-1/2 codes (`geography: ['US-FED', 'US-CA']`).
   * *Runtime Enabler*: Converts complex natural language compliance policies into raw integer and string tokens that Vertex AI Vector Search can filter mathematically at the hardware layer.
5. **Phase 5: Programmatic Deterministic Post-Validation Gate**:
   * *Actions*: Runs the Pydantic validation suite. Verifies that `effective_start_epoch <= effective_end_epoch`, confirms role-exclusivity rules, and cross-references extracted feature codes against the active Cloud Spanner Enterprise Service Catalog. Computes multi-factor extraction confidence (≥ 0.88).
   * *Runtime Enabler*: Prevents malformed or logically contradictory entitlement tags from entering the vector index, guaranteeing zero runtime validation exceptions.
6. **Phase 6: Dual Storage & Index Persistence Routing**:
   * *Actions*:
     - **Vertex AI Vector Search**: Indexes *only* the **7 Tier-1 Fast-Path Restricts** (`tenant_boundary`, `data_plane`, `product`, `audience`, `geography`, `effective_start`, `effective_end`).
     - **Cloud Spanner Graph**: Persists all 33 metadata attributes, the full chunk text, and establishes relational graph edges (`[:SUPERSEDES]`, `[:HAS_EXCEPTION]`).
     - **BigQuery**: Logs ingestion audit events and telemetry streams.
   * *Runtime Enabler*: Keeps the vector index lean (< 2.5 ms search time) while maintaining rich, audited graph governance in Spanner.

---
## 10. Future Strategic Benefits of This Metadata Architecture

1. **Sub-5ms Scalability Without RAM Explosion**:
   * Storing all 33 fields in Vertex AI Vector Search across 10M chunks would consume **40+ GB of index RAM**, slow index builds by 400%, and push query latency from 2.5 ms to > 20 ms.
   * Limiting Vector Search to the **7 Tier-1 Fast-Path Restricts** guarantees sub-5ms mathematical filtering, while Cloud Spanner Graph fetches the remaining attributes in 1.2 ms *only for the top-K returned IDs*.
2. **Bi-Temporal Audit Defensibility in Payroll Litigation**:
   * In statutory wage litigation (e.g. Department of Labor audits), employers must prove what policy was active and served to an employee on a specific date in the past.
   * Storing immutable `effective_start_epoch` and `effective_end_epoch` alongside Spanner Graph `[:SUPERSEDES]` lineage allows ADP to execute **bi-temporal queries** to reconstruct the exact legal state on any historical date.
3. **Knowledge Monetization & Commercial API Metering**:
   * Sebastian introduces **Knowledge Monetization** (unit-granular rated revenue). Embedding `metering_event_class` directly into the KU atom allows ADP to bill external API consumers per knowledge unit touched.

---
## 11. Architecture Diagram: Achieving the Extraction Pipeline

### Visual Extraction Pipeline Flowchart:

```
  ┌─────────────────────────────────────────────────────────────────────────────────────────────┐
  │                         WRITE-TIME METADATA EXTRACTION PIPELINE                             │
  └──────────────────────────────────────┬──────────────────────────────────────────────────────┘
                                         │ Raw File (PDF / Word / HTML / Web)
                                         ▼
  ┌─────────────────────────────────────────────────────────────────────────────────────────────┐
  │ 0. DOCUMENT INTAKE ENVELOPE (Heuristic / File Metadata)                                     │
  │    • source_ref, file_name, intake_timestamp, data_plane, tenant_boundary                   │
  └──────────────────────────────────────┬──────────────────────────────────────────────────────┘
                                         │
                                         ▼
  ┌─────────────────────────────────────────────────────────────────────────────────────────────┐
  │ 1. PASS 1: GOOGLE DOCUMENT AI LAYOUT PARSER v1.6 (Visual Structural Grounding)              │
  │    • Multimodal Vision Transformer parses reading order, table cells & bounding boxes       │
  │    • Binds footnote superscripts directly to parent table rows (No orphan citations)        │
  └───────────────────┬─────────────────────────────────────────────────┬───────────────────────┘
                      │ Full Layout Tree                                │ Visual Layout Tree
                      ▼                                                 ▼
  ┌───────────────────────────────────────────────┐ ┌───────────────────────────────────────────┐
  │ 2A. MACRO DOCUMENT CLASSIFIER (Gemini Flash)  │ │ 2B. LAYOUT-AWARE CHUNKING ENGINE          │
  │     • Primary DSF Domain (e.g. PAYROLL)       │ │     • Forms semantic chunk boundaries     │
  │     • Whole-Document Vector Embedding         │ │     • Computes SHA-256 Syntactic Hash     │
  └───────────────────┬───────────────────────────┘ └───────────────────┬───────────────────────┘
                      │                                                 │
                      ▼                                                 ▼
  ┌───────────────────────────────────────────────┐               [Syntactic Hash Exists?]
  │ Spanner Document Entity & BU Catalog Inventory│              /                        \
  └───────────────────────────────────────────────┘       YES  /                            \  NO (New Chunk)
                                                             ▼                              ▼
                                                ┌──────────────────────┐ ┌──────────────────────────────────────┐
                                                │ Draw Spanner Edge:   │ │ 3. PASS 2: GEMINI CONSTRAINED        │
                                                │ [:CONTAINS] Existing │ │    EXTRACTION (response_schema)      │
                                                │ KU Atom (Zero Dupe!) │ │    • Enforces Pydantic Schema / FSM  │
                                                └──────────────────────┘ │    • DSRF Whitelist, Epochs, Geos    │
                                                                         └──────────────────┬───────────────────┘
                                                                                            │
                                                                                            ▼
                                                                                 [Confidence >= 0.88?]
                                                                                 /                   \
                                                                        PASS   /                       \  FAIL / Exception
                                                                             ▼                          ▼
                                                              ┌──────────────────────┐ ┌────────────────────────────────┐
                                                              │ 4. VECTOR DEDUPE     │ │ QUARANTINE: Spanner Node       │
                                                              │    Vertex ANN Check  │ │ STAGED_UNPROMOTED              │
                                                              │    (Cosine > 0.85?)  │ │ Routed to VerifyAI SME Queue   │
                                                              └──────────┬───────────┘ └────────────────────────────────┘
                                                                         │
                                                ┌────────────────────────┴────────────────────────┐
                                                │ Novel Fact                    Semantic Near-Dupe│
                                                ▼                                                 ▼
                                  ┌───────────────────────────┐                     ┌───────────────────────────┐
                                  │ PROMOTE TO GOVERNED ESTATE│                     │ Gemini Arbiter Diffing:   │
                                  └─────────────┬─────────────┘                     │ Lineage: [:SUPERSEDES] or │
                                                │                                   │ [:HAS_EXCEPTION] Edge     │
                                                │                                   └─────────────┬─────────────┘
                                                ├─────────────────────────────────────────────────┘
                                                ▼
                        ┌───────────────────────────────────────────────┐
                        │ DUAL PERSISTENCE WRITE:                       │
                        │ 1. Vertex AI Vector Search (7 Lean Restricts) │
                        │ 2. Cloud Spanner Graph (33 Dimensions + Edges)│
                        │ 3. BigQuery Zero-ETL Audit & Telemetry Stream │
                        └───────────────────────────────────────────────┘
```

### Mermaid Flowchart (Rendered in Markdown & IDE Previews):

```mermaid
flowchart TD
    subgraph IngestPlane ["WRITE-TIME EXTRACTION ENGINE"]
        RawDoc["Raw File: PDF / Word / HTML / Web"] --> DocEnvelope["Extract File Envelope:<br/>source_ref, owner, data_plane, tenant_id"]
        
        DocEnvelope --> Pass1["Pass 1: Document AI Layout Parser v1.6"]
        
        Pass1 --> LayoutTree["Document Visual Layout Tree"]
        LayoutTree --> DocDSRF["Gemini Document Classifier:<br/>Extract Macro DSRF String & Doc Embedding"]
        DocDSRF --> SpannerDoc[("Spanner Document Entity & BU Catalog")]
        
        LayoutTree --> Chunker["Layout-Aware Chunk Boundary Formation:<br/>Binds Tables, Footnotes & Headings"]
        
        Chunker --> Hash["Compute SHA-256 Syntactic Hash"]
        Hash --> SyntacticCheck{"SHA-256 Hash Exists in Spanner?"}
        
        SyntacticCheck -->|Yes: Exact Duplicate| Symlink["Draw Spanner :CONTAINS Edge to Existing KU"]
        SyntacticCheck -->|No: New Content| Pass2["Pass 2: Gemini 2.5 Flash Constrained Extraction<br/>GovernedKnowledgeUnitSchema via response_schema"]
        
        Pass2 --> Validate{"Pydantic Validation & Confidence >= 0.88"}
        Validate -->|Fail or Low Conf| Quarantine["Flag & Route to VerifyAI SME Review Queue"]
        Validate -->|Pass| DedupeCheck{"Vertex ANN Similarity > 0.85?"}
        
        DedupeCheck -->|Novel Fact| Promote["Promote to Governed Estate"]
        DedupeCheck -->|Semantic Near-Duplicate| Arbiter["Gemini Arbiter Diffing:<br/>Draw :SUPERSEDES or :HAS_EXCEPTION Edge"]
        Arbiter --> Promote
        
        Promote --> VertexIndex[("Vertex AI Vector Search:<br/>7 Fast-Path Restricts")]
        Promote --> SpannerGraph[("Cloud Spanner Graph:<br/>All 33 Dimensions + Lineage Edges")]
    end
```

---
## 12. Entire Target Architecture Diagram: Where It Fits and Why

### Visual Full-System Architecture:

```
  ══════════════════════════════════════════════════════════════════════════════════════════════════════════════
                            ENTIRE QUESTA TARGET ARCHITECTURE: END-TO-END FLOW
  ══════════════════════════════════════════════════════════════════════════════════════════════════════════════

  ┌────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
  │ 1. INGESTION, GOVERNANCE & PII QUARANTINE PLANE (WRITE-TIME)                                              │
  │    Enterprise Sources (S3, EKM, Web, Salesforce) ──> Managed Connectors & Dataflow CDC                     │
  │    ──> Document AI v1.6 Layout Parser ──> Cloud SDP (Quarantines PII; Zero Vector Leakage)                 │
  │    ──> Two-Pass Extraction Engine (Doc-Level DSRF + Chunk-Level Schema) ──> VerifyAI Quality Gate          │
  └─────────────────────────────────────────────────────┬──────────────────────────────────────────────────────┘
                                                        │ Governed Knowledge Atoms
                                                        ▼
  ┌────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
  │ 2. DUAL STORAGE & SEARCH CORE (Strict Separation of Knowledge vs Worker Data)                              │
  │  ┌──────────────────────────────────────────────────┐    ┌───────────────────────────────────────────────┐ │
  │  │ PLANE A: ENTERPRISE KNOWLEDGE CORE               │    │ PLANE B: SENSITIVE WORKER & TRANSACTIONAL CORE│ │
  │  │ • Vertex AI Vector Search (7 Lean Restricts)     │    │ • Cloud Spanner Graph (76M+ Workers)          │ │
  │  │ • BM25 Lexical Search + Reciprocal Rank Fusion   │    │ • Graph Lineage: [:SUPERSEDES], [:HAS_EXCEPT] │ │
  │  │ • Zero Worker PII                                │    │ • Sub-5ms ACID Relational Security            │ │
  │  └──────────────────────────────────────────────────┘    └───────────────────────────────────────────────┘ │
  │  BigQuery Analytics & Audit Logging (Zero-ETL Deflection, Compliance Audits & Monetization Telemetry)      │
  └─────────────────────────────────────────────────────┬──────────────────────────────────────────────────────┘
                                                        ▲
                                 Authorized Search DSL  │  Scoped Parameterized API
                                                        │
  ┌─────────────────────────────────────────────────────┴──────────────────────────────────────────────────────┐
  │ 3. RUNTIME INFERENCE & ENTITLEMENT GATEWAY (<5ms ABAC SLA)                                                 │
  │    Apigee X & Cloud Armor (DDoS, WAF, JWT) ──> Cloud Run Entitlement Gateway                              │
  │    ──> Cloud Memorystore Redis (Sub-1ms Session & Persona Cache) ──> Model Armor (Prompt Injection Defense)│
  └─────────────────────────────────────────────────────┬──────────────────────────────────────────────────────┘
                                                        │ Context Envelope & Knowledge Unit
                                                        ▼
  ┌────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
  │ 4. AGENTIC RESOLUTION & FRONTLINE ASSOCIATE ENABLEMENT (10,000 SEATS)                                     │
  │  ┌──────────────────────────────────────────────────┐    ┌───────────────────────────────────────────────┐ │
  │  │ CHANNEL A: CLIENT SELF-SERVICE (ADP Assist)      │    │ CHANNEL B: 10,000 FRONTLINE ASSOCIATES        │ │
  │  │ • SLA: <300ms Retrieval / <1.5s Streaming        │    │ • Gemini Enterprise UI Desktop                │ │
  │  │ • Circuit Breaker: Max 2 turns before handoff    │    │ • Pre-loads Customer Lineage & Citations      │ │
  │  └──────────────────────────┬───────────────────────┘    └───────────────────────▲───────────────────────┘ │
  │                             │ (Confidence < 0.85 / Turn 2 Limit)                 │                         │
  │                             └───────────> MCP Agent Gateway ─────────────────────┘                         │
  │                                           (Serializes Session Context to Human Support Agent)              │
  └────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### Mermaid Architecture Diagram (Rendered in Markdown & IDE Previews):

```mermaid
flowchart TD
    subgraph Plane1 ["1. INGESTION, GOVERNANCE & PII QUARANTINE PLANE (WRITE-TIME)"]
        direction TB
        Sources["Enterprise Sources<br/>(S3, EKM, Web Scraping, Salesforce)"] --> Connectors["Managed Agent Connectors & Dataflow CDC"]
        Connectors --> DocAI["Document AI v1.6 Layout Parser<br/>(2D Visual Grids & Footnote Binding)"]
        DocAI --> SDP["Cloud SDP Financial PII Quarantine<br/>(Quarantines PII; Zero Vector Leakage)"]
        SDP --> TwoPass["Two-Pass Extraction Engine<br/>(Macro Doc DSRF + Micro Chunk Schema)"]
        TwoPass --> VerifyAI["VerifyAI Quality Gate & SME Review Queue"]
    end

    subgraph Plane2 ["2. DUAL STORAGE & SEARCH CORE (SEPARATION OF KNOWLEDGE VS WORKER DATA)"]
        direction TB
        subgraph StorageLayer ["Enterprise Governed Storage"]
            direction LR
            PlaneA["PLANE A: ENTERPRISE KNOWLEDGE CORE<br/>• Vertex AI Vector Search (7 Lean Restricts)<br/>• BM25 Lexical Search + Reciprocal Rank Fusion"]
            PlaneB["PLANE B: SENSITIVE WORKER CORE<br/>• Cloud Spanner Graph (76M+ Workers)<br/>• Lineage Edges: SUPERSEDES, HAS_EXCEPTION"]
            Audit[("BigQuery Vector & Audit Logging<br/>• Zero-ETL Deflection Stream<br/>• Monetization Telemetry")]
        end
    end

    subgraph Plane3 ["3. RUNTIME INFERENCE & ENTITLEMENT GATEWAY (<5ms ABAC SLA)"]
        direction TB
        Perimeter["Apigee X & Cloud Armor<br/>(WAF, DDoS, OAuth/JWT Auth)"] --> IngressAuth["Cloud Run Entitlement Gateway<br/>(Sub-5ms ABAC Evaluation Engine)"]
        IngressAuth <--> Redis[("Cloud Memorystore Redis<br/>Sub-1ms Session Cache")]
        IngressAuth --> ModelArmor["Model Armor<br/>Prompt Injection Defense"]
    end

    subgraph Plane4 ["4. AGENTIC RESOLUTION & FRONTLINE ASSOCIATE ENABLEMENT (10,000 SEATS)"]
        direction TB
        ChannelA["CHANNEL A: CLIENT SELF-SERVICE (ADP Assist)<br/>• SLA: <300ms Retrieval / <1.5s Streaming<br/>• Circuit Breaker: Max 2 turns before handoff"]
        AgentGW["MCP Agent Gateway<br/>(Context Serialization)"]
        ChannelB["CHANNEL B: 10,000 FRONTLINE ASSOCIATES (Gemini Enterprise UI)<br/>• Pre-loads Customer Lineage & Citations<br/>• 1-Click Draft Resolution (AHT Reduction)"]
        
        ChannelA -->|Confidence < 0.85 Escalation| AgentGW
        AgentGW --> ChannelB
    end

    %% Clean Top-to-Bottom Cross-Plane Connectors (Zero Subgraph-to-Subgraph Links)
    VerifyAI -->|Promote Validated Knowledge Atoms| PlaneA
    VerifyAI -->|Persist Relational Lineage & 33 Dims| PlaneB
    PlaneB -.->|Zero-ETL CDC Stream| Audit

    PlaneA -->|Pre-Filtered Search Results| IngressAuth
    PlaneB -->|Scoped Relational Lineage & Exceptions| IngressAuth

    IngressAuth -->|10-Field Sebastian Context Envelope| ChannelA
```

### Why Each Component Fits Where It Does:
1. **Document AI + SDP at the Front Door**: PII must be quarantined and tables parsed *before* any text hits embedding models or vector databases.
2. **Dual Storage Split**: Vector databases excel at mathematical similarity over small payloads; relational/graph engines (Cloud Spanner) excel at strongly consistent multi-tenant ACID relationships and historical ontologies. Keeping them separate guarantees sub-5ms search with zero PII exposure.
3. **Cloud Run + Redis Entitlement Gateway**: Moving authorization lookups out of the runtime path into an event-driven Redis cache ensures that complex, 3-tier ADP authorizations (functional, data, screen-level) never bottleneck user query times.
4. **Circuit Breaker & MCP Gateway**: Prevents user frustration in self-service by escalating ambiguous queries to human associates with the complete 10-field Sebastian Answer Context pre-loaded.
