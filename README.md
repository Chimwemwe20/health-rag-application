# Health RAG Application

A conversational health information assistant for Zambia, powered by **Gemini 2.5 Flash** and **Vertex AI RAG**. Users can ask health questions (e.g. diabetes management, medication guidance) and receive grounded answers with source citations, backed by a curated medical document corpus.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        User Browser                          │
│              React + Vite SPA (Firebase Hosting)            │
└────────────────────────┬────────────────────────────────────┘
                         │ tRPC (HTTPS)
┌────────────────────────▼────────────────────────────────────┐
│                  Firebase Cloud Functions                     │
│              Node.js 22 · tRPC API · europe-west2            │
│                                                              │
│  ┌──────────────┐    ┌────────────────────────────────────┐ │
│  │  chat router │───▶│  Vertex AI (Gemini 2.5 Flash)      │ │
│  │  user router │    │  + RAG Corpus (top-5 retrieval)    │ │
│  └──────────────┘    └────────────────────────────────────┘ │
│          │                                                   │
│  ┌───────▼───────┐                                          │
│  │   Firestore   │  conversations / messages                │
│  └───────────────┘                                          │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                   Python Data Pipeline                       │
│  chunking.py · embeddings.py · gcs_utils.py · firestore_    │
│  utils.py  →  Vertex AI RAG Corpus (text-embedding-004)     │
└─────────────────────────────────────────────────────────────┘
```

---

## Monorepo Structure

```
health-rag-application/
├── apps/
│   ├── web/                  # React 18 frontend (Vite)
│   │   └── src/
│   │       ├── App.tsx       # Routes: /, /authentication, /new-chat, /chat/:id
│   │       ├── pages/        # ChatPage, AuthPage, LandingPage
│   │       ├── components/   # Sidebar, SettingsPanel, ChatPage
│   │       ├── hooks/        # useAuth, useChat, useConversations, useMessages…
│   │       ├── lib/          # Firebase, tRPC & query client setup
│   │       └── providers/    # AuthProvider, QueryProvider
│   │
│   └── functions/            # Firebase Cloud Functions (Node.js 22)
│       └── src/
│           ├── index.ts      # HTTP function entry, CORS, tRPC adapter
│           ├── trpc/
│           │   ├── router.ts # Root router
│           │   ├── chat.ts   # sendMessage → Vertex AI RAG → Firestore
│           │   └── user.ts   # User CRUD
│           └── lib/
│               └── firebase.ts # Admin SDK init
│
├── packages/
│   ├── ui/                   # Shared React components (Shadcn UI)
│   ├── shared/               # Zod schemas: user, auth, conversation, message
│   ├── eslint-config/        # Shared ESLint rules
│   └── typescript-config/    # Shared tsconfig base
│
├── chunking.py               # Document chunking (500-token, overlap)
├── embeddings.py             # Vertex AI embedding generation (768-dim)
├── firestore_utils.py        # Batch writes to Firestore
├── gcs_utils.py              # Google Cloud Storage helpers
│
├── firebase.json             # Firebase project config (Firestore, Functions, Hosting)
├── firestore.rules           # Firestore security rules
├── firestore.indexes.json    # Composite index definitions
├── .firebaserc               # Firebase project alias (health-lifeline-53fb3)
├── turbo.json                # Turborepo pipeline config
├── pnpm-workspace.yaml       # pnpm workspaces
└── package.json              # Root scripts
```

---

## Tech Stack

### Frontend

| Technology     | Version | Role                    |
| -------------- | ------- | ----------------------- |
| React          | 18.3    | UI framework            |
| Vite           | 5.1     | Build tool & dev server |
| React Router   | 7.13    | Client-side routing     |
| TypeScript     | 5.7     | Type safety             |
| Tailwind CSS   | 3.4     | Styling                 |
| Shadcn UI      | —       | Component library       |
| TanStack Query | 5.62    | Data fetching & caching |
| tRPC           | 11.0    | Type-safe API client    |
| Firebase SDK   | 12.9    | Auth + Firestore client |
| Phosphor Icons | 2.1     | Icons                   |

### Backend

| Technology         | Version  | Role                   |
| ------------------ | -------- | ---------------------- |
| Node.js            | 22       | Runtime                |
| Firebase Functions | 7.0 (v2) | Serverless API         |
| tRPC               | 11.0     | RPC framework          |
| Firebase Admin SDK | 13.6     | Firestore + Auth admin |
| Vertex AI SDK      | 1.10     | Gemini 2.5 Flash + RAG |
| Zod                | 3.23     | Input validation       |

### Cloud Services (GCP / Firebase)

| Service          | Purpose                   | Region       |
| ---------------- | ------------------------- | ------------ |
| Firebase Hosting | React SPA CDN             | Global       |
| Firebase Auth    | Email/password auth       | Global       |
| Cloud Functions  | Backend API               | europe-west2 |
| Firestore        | Chat persistence          | europe-west2 |
| Vertex AI        | Gemini 2.5 Flash LLM      | europe-west2 |
| Vertex AI RAG    | Document corpus retrieval | europe-west2 |
| Cloud Storage    | Source document storage   | —            |

### Build & DevOps

| Tool                         | Purpose                           |
| ---------------------------- | --------------------------------- |
| pnpm 8                       | Package manager                   |
| Turborepo 2                  | Monorepo build orchestration      |
| GitHub Actions               | CI/CD pipelines                   |
| Workload Identity Federation | Keyless GCP auth (no stored keys) |
| Husky + lint-staged          | Pre-commit lint & format          |
| Changesets                   | Semantic versioning               |

---

## Prerequisites

- Node.js 20+
- pnpm 8+
- Firebase CLI 13+
- A GCP project with Vertex AI API enabled
- A Vertex AI RAG corpus (see [RAG Pipeline](#rag-pipeline))

---

## Environment Variables

Copy `.env.example` and fill in your values:

```bash
cp .env.example apps/web/.env
cp .env.example apps/functions/.env
```

### Frontend (`VITE_` prefix required)

```env
VITE_API_URL=http://localhost:5002/<your-project-id>/europe-west2/api
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=<project>.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=<project>.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_REGION=europe-west2
VITE_FUNCTIONS_PORT=5002
```

### Backend

```env
GOOGLE_CLOUD_PROJECT=<your-project-id>
GOOGLE_CLOUD_LOCATION=europe-west2
RAG_CORPUS_ID=<your-corpus-id>
```

---

## Quick Start

```bash
# Install dependencies
NODE_ENV=development pnpm install

# Start frontend + Firebase emulators
pnpm dev
# Frontend: http://localhost:5173
# Functions emulator: http://localhost:5002
```

> **Note:** `NODE_ENV` must be set to `development` when installing — this environment defaults to `production`, which causes pnpm to skip devDependencies.

---

## Scripts Reference

| Command              | Description                                          |
| -------------------- | ---------------------------------------------------- |
| `pnpm dev`           | Start all dev servers                                |
| `pnpm build`         | Build all packages for production                    |
| `pnpm test`          | Run all tests                                        |
| `pnpm test:coverage` | Run tests with coverage                              |
| `pnpm lint`          | Lint all packages                                    |
| `pnpm lint:fix`      | Auto-fix lint issues                                 |
| `pnpm format`        | Format code with Prettier                            |
| `pnpm typecheck`     | TypeScript type checking                             |
| `pnpm precheck`      | Full quality suite (lint + typecheck + build + test) |

Run a command for a single package:

```bash
pnpm --filter web dev
pnpm --filter functions build
```

---

## RAG Pipeline

Documents are indexed offline using the Python scripts in the project root before users ever send a message.

```
Source Documents (PDF/text)
        │
        ▼
  gcs_utils.py        → Upload raw files to Cloud Storage
        │
        ▼
  chunking.py         → Split into 500-token chunks with overlap
        │
        ▼
  embeddings.py       → Generate 768-dim vectors via text-embedding-004
        │
        ▼
  firestore_utils.py  → Store chunks + metadata in Firestore
        │
        ▼
  Vertex AI RAG API   → Import corpus for retrieval-augmented generation
```

At query time:

1. User sends a message via the React chat UI.
2. The Firebase Function receives it via tRPC `chat.sendMessage`.
3. Vertex AI retrieves the **top-5 most relevant chunks** from the corpus.
4. Gemini 2.5 Flash generates an answer grounded in those chunks.
5. Source URIs from grounding metadata are returned alongside the answer.
6. Both the user message and assistant response are persisted to Firestore.

---

## Data Model

### `conversations/{convId}`

```
uid:       string       # Owner's Firebase UID
title:     string       # Auto-set from the first user message
createdAt: timestamp
updatedAt: timestamp
deletedAt: timestamp | null   # Soft delete
```

### `conversations/{convId}/messages/{msgId}`

```
uid:             string
conversationId:  string
role:            'user' | 'assistant'
content:         string        # ≤ 10,000 chars
citations:       string[]      # Source URIs (assistant messages only)
version:         string
createdAt:       timestamp
deletedAt:       timestamp | null
```

---

## Deployment

Deployments use GitHub Actions with **Workload Identity Federation** — no service account keys stored in GitHub.

### Branch Strategy

| Branch  | Environment | Trigger |
| ------- | ----------- | ------- |
| `dev`   | Development | Push    |
| `stage` | Staging     | Push    |
| `main`  | Production  | Manual  |

### Deploy Manually

```bash
# Build functions
NODE_ENV=development pnpm --filter functions build

# Deploy everything
firebase deploy

# Deploy only functions
firebase deploy --only functions

# Deploy only hosting
firebase deploy --only hosting
```

### GitHub Actions Workflows

| Workflow                | Trigger         | Purpose                           |
| ----------------------- | --------------- | --------------------------------- |
| `ci.yml`                | PR + push       | Lint, typecheck, build, test      |
| `deploy-dev.yml`        | Push to `dev`   | Deploy to development             |
| `deploy-stage.yml`      | Push to `stage` | Deploy to staging                 |
| `deploy-main.yml`       | Manual          | Deploy to production              |
| `release.yml`           | Push to `main`  | Automated versioning (Changesets) |
| `dependency-review.yml` | PR              | Scan for vulnerable dependencies  |

### Required GitHub Secrets

| Secret                           | Description                     |
| -------------------------------- | ------------------------------- |
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | WIF provider resource path      |
| `GCP_SA_EMAIL`                   | Deploying service account email |

Setup: run `scripts/setup-wif.sh` and add the outputs as GitHub secrets.

---

## Security

- **Firestore rules** enforce UID-based ownership — users can only read/write their own conversations and messages.
- **Soft deletes only** — no hard deletes from the client; data lifecycle is managed server-side.
- **Admin-only collections** (`health_chunks`, `query_logs`, `abstention_logs`, `rate_limits`) — no client access.
- **CORS** is handled inline in the Cloud Function (not via the `cors` npm package, which has reliability issues in the Firebase v2 / ESM context).
- **Password policy** — minimum 8 characters, one uppercase letter, one number (enforced via Zod on both client and server).

---

## Version Requirements

| Tool         | Minimum |
| ------------ | ------- |
| Node.js      | 20.x    |
| pnpm         | 8.x     |
| Turborepo    | 2.x     |
| TypeScript   | 5.x     |
| Firebase CLI | 13.x    |

---

## Useful Links

- [Vertex AI RAG documentation](https://cloud.google.com/vertex-ai/generative-ai/docs/rag-overview)
- [Firebase Cloud Functions v2](https://firebase.google.com/docs/functions)
- [tRPC documentation](https://trpc.io)
- [TanStack Query](https://tanstack.com/query)
- [Shadcn UI](https://ui.shadcn.com)
- [Turborepo](https://turbo.build/repo/docs)
- [Workload Identity Federation](https://cloud.google.com/iam/docs/workload-identity-federation)
- [CI/CD Pipeline Guide](docs/ci-cd/CI-CD-Pipeline-Guide.md)
