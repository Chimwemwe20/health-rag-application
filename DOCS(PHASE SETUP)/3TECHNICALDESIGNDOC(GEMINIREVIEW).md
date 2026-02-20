Zambia Health RAG Platform
Ministry of Health / WHO Grounded AI System

Status: Final Architecture
Environment: Google Cloud + Firebase + Vertex AI
Repository Pattern: Turbo Monorepo

1. Mission

Deliver a secure, citation-backed AI health assistant for Zambia that:

Answers only using official Zambia-specific health guidance

Deterministically abstains when insufficient evidence exists

Prevents unauthorized API usage

Maintains predictable cost and auditability

Enforces strict jurisdictional grounding

This system is a controlled medical retrieval engine — not an open-domain chatbot.

2. Architectural Principles

The LLM is the final step — not the decision-maker.

Retrieval quality determines answer eligibility.

Safety gates precede generation.

All user data is scoped to request.auth.uid.

Least privilege IAM is strictly enforced.

Abstention behavior is deterministic and model-independent.

Jurisdictional filtering is enforced at retrieval layer — not prompt layer.

3. System Architecture

The platform follows a Modular Retrieval-Augmented Generation (RAG) architecture inside a Turbo Monorepo.

3.1 High-Level Flow

Client
→ Query submission
→ App Check attestation
→ Backend verification
→ Safety filter
→ Embedding generation
→ Firestore vector retrieval
→ Deterministic abstention gate
→ Controlled LLM generation

3.2 Detailed Request Pipeline
Step 1 — Client Layer

Frontend:

React (Vite)

Firebase Auth (Email/Password)

Firebase App Check (reCAPTCHA Enterprise)

Client sends:

query

Firebase Auth token

App Check token

Step 2 — Transport Layer

tRPC ensures end-to-end type safety

Firebase Functions Gen 2 executes backend logic

No public Vertex AI access from client

Step 3 — Middleware Enforcement

Backend validates:

App Check token

Firebase Auth token

request.auth.uid

Emergency keyword detection

If emergency keywords detected:

RAG pipeline aborted

Zambia emergency number (992) returned

No embedding call

No LLM invocation

This is a hard gate, not advisory.

Step 4 — Embedding

Model: text-embedding-004 (Vertex AI)

Query converted to 768-dimensional vector

Embedding request logged

No document task type used (RETRIEVAL_QUERY enforced)

Step 5 — Retrieval

Database: Firestore Native Vector Search

Constraints:

Filter: jurisdiction == "Zambia"

Top-K: 3

Distance metric: COSINE

Similarity score recorded

Jurisdiction filtering occurs at query time.

LLM never sees out-of-scope documents.

Step 6 — Deterministic Abstention Gate

The system abstains if:

No Zambia-jurisdiction documents found

max(similarity_score) < ABSTENTION_THRESHOLD

Emergency medical terms detected

Threshold (Secret Manager controlled):

ABSTENTION_THRESHOLD = 0.75

If abstaining:

I cannot find official Zambian health guidance for this. Please consult a qualified professional at your nearest health facility.

The LLM is never invoked in this branch.

Abstention is deterministic and independent of model behavior.

Step 7 — Controlled Generation

Model: Gemini 1.5 Flash

Constraints:

Context strictly limited to retrieved documents

No external knowledge permitted

Mandatory source citations

Low temperature for factual determinism

Token-limited prompt window

The model does not determine truth.
Retrieval + policy determine eligibility.

4. Chunking Strategy (Corpus Ingestion)
   4.1 Strategy Overview

Chunking is semantic-first, size-bounded.

Documents split by:

Headings

Paragraph boundaries

Medical section divisions

Constraints:

512 tokens per chunk

50 token overlap

Token-based chunking (not character-based)

4.2 Rationale

Preserves medical section integrity (Prevention, Dosage, Treatment)

Prevents semantic fragmentation

Maintains stable similarity distribution

Optimizes precision at 0.75 threshold

Chunk size and abstention threshold are treated as coupled parameters.

5. Monorepo Structure
   .
   ├── apps/
   │ ├── web/ # React + Vite + App Check
   │ └── functions/ # Firebase Gen 2 backend
   ├── packages/
   │ ├── shared/ # Zod schemas
   │ ├── prompts/ # Strict grounding instructions
   │ ├── config/ # Environment validation
   │ └── utils/ # Chunking + vector math
   ├── firebase.json
   └── turbo.json

6. Tech Stack
   Layer Technology
   Frontend React + Vite
   Backend Firebase Functions Gen 2
   API tRPC
   Authentication Firebase Auth
   Security Firebase App Check
   Embeddings Vertex AI text-embedding-004
   LLM Gemini 1.5 Flash
   Vector Store Firestore Native Vector Search
   Secrets GCP Secret Manager
   CI/CD GitHub Actions
7. IAM & Access Control
   7.1 GitHub Actions Service Account

Roles:

roles/firebase.developAdmin

roles/run.admin

roles/storage.admin

Purpose:

Deployment

Corpus ingestion

Infrastructure management

7.2 Runtime Service Account

Roles:

roles/aiplatform.user

roles/datastore.user

roles/logging.logWriter

Purpose:

Generate embeddings

Call Gemini

Read/write Firestore

Log metadata

Deployment and runtime identities are strictly separated.

8. Data Model & Governance

All user-scoped data filtered by:

request.auth.uid

Includes:

Cursor-based pagination

Message versioning (v1, v2)

Linked parent structure

Soft deletes (deletedAt)

Immutable audit trail

Every query enforces:

where("deletedAt", "==", null)

9. Corpus & Storage

Bucket:

gs://zambia-health-corpus/

Access:

Ingestion pipeline (write)

Runtime service account (read-only)

Public access disabled

10. Why We Chose Firestore Native Vector Search
    Architectural Decision Record (ADR-001)
    Decision

Use Firestore Native Vector Search for Phase 1 instead of Vertex AI Vector Search.

Context

Two options were evaluated:

Vertex AI Vector Search (dedicated index endpoints)

Firestore Native Vector Search (serverless)

Evaluation Criteria

Idle cost

Operational complexity

Security surface

Scalability requirements

Jurisdictional filtering

Predictable budgeting

Vertex AI Vector Search

Pros:

Massive scale

Ultra-low latency

Advanced filtering

Enterprise-grade throughput

Cons:

Always-on index endpoint

Node-hour billing

~$100+/month baseline cost

Increased operational surface

Firestore Native Vector Search

Pros:

Fully serverless

$0 idle cost

Integrated with Firestore security rules

Simple IAM model

No deployed infrastructure

Suitable for controlled corpus (<1M chunks)

Cons:

Slightly higher latency than dedicated vector DB

Not optimized for billion-scale search

Decision Rationale

The Zambia Health RAG platform:

Uses a controlled, jurisdiction-restricted corpus

Does not require million-scale retrieval

Prioritizes cost predictability

Must scale to zero when idle

Must remain operationally simple for government context

Firestore Native Vector Search satisfies all requirements without introducing persistent infrastructure cost.

Future Migration Path

If corpus scale or throughput requirements exceed Firestore capabilities:

Phase 2 includes optional migration to:

Vertex AI Vector Search

With threshold calibration dashboard

And monitored similarity analytics

The architecture is designed to make this upgrade non-breaking.

11. Safety Guarantees

The system guarantees:

Jurisdiction-restricted retrieval

Deterministic abstention

Emergency bypass

Strict IAM separation

Scoped user data access

Model grounding enforcement

No open-domain knowledge injection

The LLM does not determine truth.

Retrieval + policy do.

12. Roadmap
    Phase 1 — MVP

Firestore Vector Search

Gemini Flash

Deterministic abstention

App Check enforcement

Phase 2 — Scalability

Optional Vertex AI Vector Search

Similarity score monitoring

Threshold calibration analytics

Phase 3 — Localization

Bemba and Nyanja grounding

Multilingual embedding evaluation

Sentence-level citation anchoring

Final Statement

This platform is engineered to:

Prevent hallucination

Prevent jurisdiction drift

Prevent unauthorized access

Prevent uncontrolled cost growth

It is a health guidance retrieval engine — not a chatbot.
