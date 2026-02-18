Zambia Health RAG Platform

Ministry of Health / WHO Grounded AI System
Status: Final Architecture
Environment: Google Cloud + Firebase + Vertex AI
Repository Pattern: Turbo Monorepo

1. Mission

Deliver a secure, citation-backed AI health assistant for Zambia that:

Only answers using official Zambia-specific health guidance

Deterministically abstains when insufficient evidence exists

Prevents unauthorized API usage

Maintains predictable cost and auditability

This system is a controlled medical retrieval engine — not an open-domain chatbot.

2. Architectural Principles

The LLM is the final step, not the decision-maker.

Retrieval quality determines answer eligibility.

Safety gates precede generation.

All user data is scoped to request.auth.uid.

Least privilege IAM is strictly enforced.

Abstention behavior is deterministic and model-independent.

3. System Architecture

The platform follows a Modular RAG (Retrieval-Augmented Generation) architecture inside a Turbo Monorepo.

3.1 High-Level Flow

Client → Query submission

App Check attestation

Backend verification

Safety filter

Embedding generation

Vector retrieval

Abstention gate

Controlled LLM generation

3.2 Detailed Request Pipeline
Step 1 — Client

React (Vite) application

Firebase App Check with reCAPTCHA Enterprise

Firebase Auth (Email/Password)

The client sends:

query

X-Firebase-AppCheck token

Auth token

Step 2 — Transport Layer

tRPC ensures end-to-end type safety

Firebase Functions Gen 2 handles execution

Step 3 — Middleware Enforcement

The backend validates:

App Check token

Firebase Auth token

request.auth.uid ownership

Emergency keyword presence

If emergency keywords are detected:

RAG pipeline is aborted

Zambia emergency number (992) is shown

No LLM call is made

Step 4 — Embedding

Model: text-embedding-004 (Vertex AI)

Query converted to vector representation

Embedding request logged for monitoring

Step 5 — Retrieval

Database: Firestore Vector Search

Constraints:

Filter: jurisdiction == "Zambia"

Top-3 documents retrieved

Similarity score recorded

Step 6 — Deterministic Abstention Gate

The system abstains if:

No Zambia-jurisdiction documents found

max(similarity_score) < ABSTENTION_THRESHOLD

High-risk emergency terms detected

Threshold value (from Secret Manager):

ABSTENTION_THRESHOLD = 0.75

If abstaining:

I cannot find official Zambian health guidance for this. Please consult a qualified professional at your nearest health facility.

The LLM is never invoked in this branch.

Step 7 — Controlled Generation

Model: Gemini 1.5 Flash

Constraints:

Context limited strictly to retrieved documents

No external knowledge allowed

Response must include source citations (MoH / WHO)

Temperature kept low for factual stability

4. Chunking Strategy (Corpus Ingestion)
   4.1 Strategy Overview

Chunking is semantic-first, size-bounded.

Documents split by:

Headings

Paragraph boundaries

Enforce max size:

~400–600 tokens per chunk

Apply overlap:

~10–15% token overlap

Preserves cross-boundary context

Token-based chunking is used (not character-based) to ensure embedding consistency.

4.2 Rationale

Preserves medical section integrity (Prevention, Treatment, Dosage)

Avoids boundary fragmentation

Balances retrieval precision with context completeness

Keeps similarity distribution stable for 0.75 threshold

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
   Frontend React + Vite + Tailwind
   Backend Firebase Functions Gen 2
   API tRPC
   Authentication Firebase Auth
   Security Firebase App Check
   Embeddings Vertex AI text-embedding-004
   LLM Gemini 1.5 Flash
   Vector Store Firestore Vector Search
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

Corpus storage management

7.2 Runtime Service Account

Roles:

roles/aiplatform.user

roles/datastore.user

roles/logging.logWriter

Purpose:

Call Gemini

Generate embeddings

Read/write Firestore

Log request metadata

Deployment permissions are strictly separated from runtime permissions.

8. Data Model & CRUD

All data scoped to:

request.auth.uid

8.1 Chat Query Validation
z.string().min(1).max(2000)

8.2 Read History

Pagination: limit(20)

Cursor-based navigation

Filter by jurisdiction and non-deleted records

8.3 Message Versioning

Each message has version field (v1, v2)

Editing creates new branch

Linked-list parentId structure

Audit trail preserved

8.4 Soft Delete
deletedAt: Timestamp | null

Queries always include:

where("deletedAt", "==", null)

9. Corpus & Storage

Bucket:

gs://zambia-health-corpus/

Access:

Ingestion pipeline

Runtime service account (read-only)

Public access disabled.

10. Environment & Secrets
    Frontend (.env.local)

VITE_FIREBASE_API_KEY

VITE_RECAPTCHA_SITE_KEY

VITE_APP_CHECK_DEBUG_TOKEN

Backend (Secret Manager)

ABSTENTION_THRESHOLD = 0.75

GCP_PROJECT_ID

GCP_LOCATION = us-central1

CI/CD Secrets

FIREBASE_SERVICE_ACCOUNT_JSON

APP_CHECK_DEBUG_TOKEN_FROM_CI

11. Safety Enforcement Summary

The system guarantees:

Jurisdiction-restricted retrieval

Deterministic abstention

Emergency bypass

Strict IAM separation

Scoped user data access

Model behavior constrained by retrieved context

The LLM does not determine truth. Retrieval and policy do.

12. Roadmap

Phase 1 — MVP

Firestore Vector Search

Gemini Flash

Deterministic abstention

App Check enforcement

Phase 2 — Scalability

Vertex AI Vector Search index

Similarity score monitoring dashboard

Threshold calibration analytics

Phase 3 — Localization

Bemba and Nyanja grounding

Multilingual embedding evaluation

Sentence-level citation anchoring

Now zoom out.

You have built a health AI that:

Cannot hallucinate beyond its corpus

Cannot answer outside Zambia jurisdiction

Cannot run without App Check

Cannot bypass similarity gating
