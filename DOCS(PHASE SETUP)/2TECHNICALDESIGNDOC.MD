TECHNICAL DESIGN DOCUMENT
Zambia Health RAG Platform

Google Cloud + Firebase + Vertex AI
Turbo Monorepo + Secure CI/CD

MY BENEFIT

A secure, citation-backed AI health assistant for Zambia delivering trusted Ministry of Health and WHO guidance with predictable cost, strict safety controls, and deterministic abstention behavior.

1. OVERVIEW
Objective

Build a Zambia-specific Retrieval-Augmented Generation (RAG) platform that:

Provides grounded health information

Uses only verified medical sources

Prevents hallucinations

Enforces “I don’t know” when evidence is insufficient

Maintains strict cost controls

Uses secure CI/CD and IAM best practices

2. MONOREPO STRUCTURE (TURBO)

Both frontend and backend live under apps/.

.
├── apps/
│   ├── web/                 ← React + Vite frontend
│   └── functions/           ← Firebase Gen 2 Cloud Functions
│       ├── src/
│       │   ├── api/
│       │   ├── rag/
│       │   ├── ingestion/
│       │   ├── safety/
│       │   └── logging/
│       └── package.json
├── packages/
│   ├── shared/              ← Zod schemas, types
│   ├── prompts/             ← System prompts
│   ├── embeddings/          ← Embedding utilities
│   ├── config/              ← Env validation (T3 Env)
│   └── utils/
├── docs/
├── .github/
├── turbo.json
└── pnpm-workspace.yaml

Why This Layout?

Clear separation between deployable apps

Shared logic isolated in packages

Turbo caching optimized per app

CI can selectively build affected apps

3. TECH STACK

Runtime: Firebase Gen 2 Cloud Functions
Hosting: Firebase Hosting
Language: TypeScript (strict)
Frontend: React + Vite
API Layer: tRPC
LLM: Vertex AI Gemini Flash
Embeddings: Vertex AI text embedding model
Vector Storage: Firestore (MVP phase)
Auth: Firebase Auth
Secrets: GCP Secret Manager + GitHub Secrets
CI/CD: GitHub Actions (Turbo-aware)
Environment validation: T3 Env (Zod)

All AI calls are server-side only.

4. SYSTEM ARCHITECTURE
Request Flow

User
→ React Web App
→ tRPC endpoint (Cloud Function)
→ RAG Orchestrator

RAG Orchestrator Pipeline

Emergency Safety Filter

Intent classification

Embed query (Vertex AI)

Hybrid retrieval:

Firestore metadata filtering

Vector similarity scoring

Retrieval threshold enforcement

Abstention gate

Grounded prompt construction

Gemini Flash generation

Logging + cost tracking

Return structured response

5. DATA MODEL
HealthDocument
Field	Type
id	string
title	string
source	string
source_type	string
jurisdiction	string
effective_date	timestamp
text	string
embedding	number[]
language	string
QueryLog
Field	Type
userId	string
query	string
retrievedIds	string[]
similarityScores	number[]
tokenUsage	number
costEstimate	number
abstained	boolean
createdAt	timestamp
6. RAG RETRIEVAL RULES
Constraints

topK = 3

similarity threshold = 0.75

jurisdiction must equal “Zambia”

source_type must be approved

7. ABSTENTION POLICY (MANDATORY)

The system must abstain when:

No documents retrieved

Maximum similarity score < 0.75

Retrieved content does not directly answer query

Query outside approved health domain

Backend enforcement:

if no_results OR max_similarity < 0.75:
    return standardized_abstention_response


Standard response:

I’m not able to find reliable Zambia-specific guidance on that question in the approved health sources.
Please consult a qualified healthcare professional or visit your nearest health facility.

The LLM is not allowed to decide abstention independently.

8. INGESTION PIPELINE

Located in apps/functions/src/ingestion.

Process:

Upload verified PDF to Firebase Storage

Extract text

Chunk (400–600 tokens, 15% overlap)

Batch embed via Vertex AI

Store in Firestore

Embeddings are generated once per document version.

9. IAM STARTUP CHECKLIST
Cloud Build Service Account

[PROJECT_NUMBER]@cloudbuild.gserviceaccount.com

Project Roles:

roles/run.admin

roles/artifactregistry.repoAdmin

roles/logging.logWriter

On Runtime Service Account:

roles/iam.serviceAccountUser

Compute Engine Default Service Account

[PROJECT_NUMBER]-compute@developer.gserviceaccount.com

Project Roles:

roles/storage.objectViewer

roles/logging.logWriter

roles/run.admin

roles/artifactregistry.repoAdmin

Custom Runtime Service Account

zambia-health-rag-sa

Project Roles:

roles/datastore.user

roles/aiplatform.user

roles/logging.logWriter

roles/secretmanager.secretAccessor

Principle of least privilege enforced.

10. CI/CD PIPELINE (GITHUB ACTIONS)
Workflow Steps

Setup PNPM

Restore Turbo cache

turbo lint

turbo typecheck

turbo test

turbo build

Deploy preview (Firebase Hosting)

Deploy functions (on main)

Secrets stored in:

GitHub Secrets

GCP Secret Manager

No API keys committed.

11. COST CONTROL STRATEGY
Hard Controls

topK fixed at 3

Temperature = 0.2

Max output tokens = 500

Rate limiting per UID

Billing alerts at $100 / $250 / $500

Query Cache

Firestore cache:

hashed_query

embedding

response

TTL: 7 days

Reuse response if cosine similarity > 0.92.

12. SAFETY LAYER

Emergency keywords trigger immediate guidance:

severe bleeding

chest pain

unconscious

suicide

difficulty breathing

System bypasses LLM and returns Zambia emergency advice.

13. MONITORING
Concern	Tool
Runtime logs	Cloud Logging
Billing	GCP Billing Alerts
Errors	Cloud Error Reporting
Retrieval quality	Logged similarity scores
Abstention rate	QueryLog analysis
14. SECURITY MODEL

No client-side AI calls

Server-only Vertex access

Custom service account

IAM startup checklist applied

Audit logging enabled

Strict environment validation

Secrets stored in Secret Manager

15. SCALING PATH

Phase 1:
Firestore vector storage

Phase 2:
Vertex AI Vector Search

Phase 3:
Multilingual support (Bemba, Nyanja, Tonga)

FINAL SUMMARY

This architecture:

Keeps both web and functions under apps/

Uses Turbo efficiently

Protects API keys via GitHub + Secret Manager

Implements deterministic abstention

Prevents hallucination

Controls cost

Enforces Zambia-only grounding