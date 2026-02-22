# Implementation Steps: Vertex AI RAG Integration, Local Setup, and Conversation Schema

## Overview

- Wired the Functions backend to call Vertex AI Gemini with VertexRagStore against your RAG corpus.
- Exposed a tRPC mutation to send messages and return answers with sources.
- Hooked the web app to call the new endpoint and render assistant replies.
- Fixed local development connectivity to the Functions emulator.
- Added shared Conversation/Message schemas and Firestore converters.

## Backend (Functions)

- Added dependency: `@google-cloud/vertexai`
  - Location: apps/functions/package.json (dependencies)
- Implemented chat router
  - File: apps/functions/src/trpc/routers/chat.ts
  - Uses `VertexAI` (model `gemini-2.5-flash`) with a VertexRagStore tool pointing at your corpus.
  - Input: `{ message: string, conversationId: string }`
  - Output: `{ answer: string, sources: string[] }`
  - Handles 403 Permission Denied with clear console logs for IAM debugging.
- Registered the router
  - File: apps/functions/src/trpc/router.ts
  - Added `chat: chatRouter` to `appRouter`.
- Tests
  - File: apps/functions/src/trpc/routers/chat.test.ts
  - Mocked `@google-cloud/vertexai` to avoid network calls.
  - Fixed ESM/hoisting by using `vi.hoisted` for the mock function.
  - Verified all tests pass.

## Environment Variables

- Template for backend (development): .env.example
  - GOOGLE_CLOUD_PROJECT
  - GOOGLE_CLOUD_LOCATION
  - RAG_CORPUS_ID
- Web app (Vite) reads only from apps/web/.env
  - Required Firebase client values: `VITE_FIREBASE_*`
  - Backend URL: `VITE_API_URL` (points at Functions endpoint ending with `/trpc`)

## Frontend (Web)

- tRPC hook
  - File: apps/web/src/hooks/useChat.ts
  - `useSendMessage()` -> `trpc.chat.sendMessage.useMutation()`
- Chat page behavior
  - File: apps/web/src/pages/ChatPage.tsx
  - Optimistically appends user message; calls mutation; appends assistant message with sources; shows toast on error; renders messages list when present.
- tRPC client URL
  - File: apps/web/src/lib/trpc.ts
  - Defaults to emulator URL using `VITE_API_URL` if present, otherwise constructs from project/region and `VITE_FUNCTIONS_PORT` (fallback 5001).

## Local Emulator Setup

- Start Functions emulator:
  - `firebase emulators:start --only functions --project health-lifeline-53fb3`
- Port conflict handling:
  - Configured explicit port in firebase.json: `"emulators.functions.port": 5002`
  - When emulator runs on 5002, set in apps/web/.env:
    - `VITE_API_URL=http://127.0.0.1:5002/health-lifeline-53fb3/europe-west2/api/trpc`
  - Alternatively set:
    - `VITE_FUNCTIONS_PORT=5002`, `VITE_FIREBASE_PROJECT_ID=health-lifeline-53fb3`, `VITE_FIREBASE_REGION=europe-west2`
- After changing env, restart the web dev server: `pnpm --filter web dev`

## Conversation Schema (Shared)

- Added Zod schemas in shared package
  - File: packages/shared/src/schemas/conversation.ts
  - Conversation: `{ id, uid, title, createdAt, updatedAt, deletedAt }`
  - Message: `{ id, uid, conversationId, role, content, version, parentMessageId?, citations[], createdAt, deletedAt }`
  - Re-exports in packages/shared/src/schemas/index.ts
- Firestore converters (web)
  - File: apps/web/src/lib/converters.ts
  - Maps Firestore Timestamps ↔ Date for Conversations and Messages.

## Verification

- Functions tests: `pnpm --filter @repo/functions test` (all pass)
- Lint/typecheck:
  - Functions: `pnpm --filter @repo/functions lint && pnpm --filter @repo/functions typecheck`
  - Shared: `pnpm --filter @repo/shared lint && pnpm --filter @repo/shared typecheck && pnpm --filter @repo/shared build`
  - Web: `pnpm --filter web lint && pnpm --filter web typecheck`

## Manual Test

1. Ensure apps/web/.env has valid Firebase `VITE_FIREBASE_*` values and an API URL pointing at the emulator (or deployed function).
2. Start Functions emulator and web dev server.
3. Visit http://localhost:5173, sign in at `/authentication`.
4. Go to `/new-chat`, ask: “What are the warning signs of hypoglycemia?”
5. Expect: user message appears, typing indicator, then assistant answer with sources.

## Troubleshooting

- net::ERR_CONNECTION_REFUSED
  - Emulator not running or port mismatch. Use the exact URL printed by emulator logs. Update `VITE_API_URL` accordingly and restart the web dev server.
- 403 Permission Denied
  - Ensure the Functions service account has the “Vertex AI User” role on the project. Wait for IAM propagation and retry.
- Blank page / Firebase auth errors
  - Ensure apps/web/.env contains correct `VITE_FIREBASE_*` values from Firebase Console (Web App config). Restart Vite after edits.

## Notes

- Never commit real secrets. Keep `.env` out of version control.
- Authorized Domains (Firebase Auth): add `localhost` and `127.0.0.1` for local testing.
