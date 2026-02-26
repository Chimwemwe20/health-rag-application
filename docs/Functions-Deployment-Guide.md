# Functions Deployment Guide

## Structure

- Functions root: [apps/functions](file:///c:/Projects/health-rag-application/apps/functions)
- Entry point: [index.ts](file:///c:/Projects/health-rag-application/apps/functions/src/index.ts)
- tRPC router: [router.ts](file:///c:/Projects/health-rag-application/apps/functions/src/trpc/router.ts)
- Chat API: [chat.ts](file:///c:/Projects/health-rag-application/apps/functions/src/trpc/routers/chat.ts)

## Build Pipeline

- Typescript compile and bundle is triggered via Firebase `predeploy` steps:
  - [firebase.json](file:///c:/Projects/health-rag-application/firebase.json#L15-L21)
  - Shared package build, Functions build, then `predeploy.mjs` strips workspace devDependencies
- After deploy, [postdeploy.mjs](file:///c:/Projects/health-rag-application/apps/functions/scripts/postdeploy.mjs) restores the original package.json
- Bundling uses esbuild controlled by [package.json](file:///c:/Projects/health-rag-application/apps/functions/package.json) scripts

## Runtime

- Region: europe-west2
- Runtime: nodejs22
- CORS allowlist for Hosting domains is set in [index.ts](file:///c:/Projects/health-rag-application/apps/functions/src/index.ts#L14-L22)

## Environment

- Vertex AI config is read from env:
  - Project and location: [chat.ts](file:///c:/Projects/health-rag-application/apps/functions/src/trpc/routers/chat.ts#L12-L14)
  - RAG corpus ID: [chat.ts](file:///c:/Projects/health-rag-application/apps/functions/src/trpc/routers/chat.ts#L14-L16)
- Optional domain whitelist for diabetes web links:
  - `DIABETES_DOMAINS` (comma-separated) read in [chat.ts](file:///c:/Projects/health-rag-application/apps/functions/src/trpc/routers/chat.ts#L15-L17)
- See template in [.env.example](file:///c:/Projects/health-rag-application/.env.example#L47-L54)

## API Behavior

- Chat flow persists user message to Firestore, builds minimal conversation history, and calls Vertex AI with RAG:
  - [chat.ts](file:///c:/Projects/health-rag-application/apps/functions/src/trpc/routers/chat.ts#L108-L146)
  - Model call: [chat.ts](file:///c:/Projects/health-rag-application/apps/functions/src/trpc/routers/chat.ts#L149-L152)
- Sources (corpus citations) are extracted from grounding metadata and stored with the assistant message:
  - [chat.ts](file:///c:/Projects/health-rag-application/apps/functions/src/trpc/routers/chat.ts#L162-L192)
- Diabetes-only web links are derived from the user’s query:
  - [chat.ts](file:///c:/Projects/health-rag-application/apps/functions/src/trpc/routers/chat.ts#L219-L225)

## IAM Notes

- Functions service account needs Vertex AI User permission for inference
- Firestore and Auth are initialized lazily in [firebase.ts](file:///c:/Projects/health-rag-application/apps/functions/src/lib/firebase.ts)
- Troubleshooting IAM issues: [IAM-TROUBLESHOOTING.md](file:///c:/Projects/health-rag-application/docs/IAM-TROUBLESHOOTING.md)
