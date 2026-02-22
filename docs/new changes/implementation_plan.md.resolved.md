# Connect Project to Vertex AI RAG Corpus

Wire the existing Vertex AI RAG corpus (`projects/health-lifeline-53fb3/locations/europe-west2/ragCorpora/7631349568579305472`) into the tRPC Cloud Functions backend, and surface answers in the [ChatPage](file:///c:/Projects/health-rag-application-1/apps/web/src/pages/ChatPage.tsx#129-215) React frontend.

## Proposed Changes

### Backend — `apps/functions`

---

#### [MODIFY] [package.json](file:///c:/Projects/health-rag-application-1/apps/functions/package.json)

Add `@google-cloud/vertexai` as a production dependency.

```diff
  "dependencies": {
    "@repo/shared": "workspace:*",
    "@trpc/server": "^11.0.0-rc.660",
+   "@google-cloud/vertexai": "^1.9.3",
    "firebase-admin": "^13.6.1",
    "firebase-functions": "^7.0.5",
    "zod": "^3.23.8"
  },
```

Install command (run from **repo root**):

```
pnpm --filter @repo/functions add @google-cloud/vertexai
```

---

#### [NEW] [chat.ts](file:///c:/Projects/health-rag-application-1/apps/functions/src/trpc/routers/chat.ts)

New tRPC router with a single `sendMessage` mutation.

- Accepts `{ message: string, conversationId: string }`
- Returns `{ answer: string, sources: string[] }`
- Uses `VertexAI` with `generativeai.Tool` configured as `VertexRagStore` pointing at the corpus
- System instruction: _"You are a Zambian Health Assistant. Answer only using the provided health documents."_
- Model: `gemini-2.5-flash`
- `try/catch` with specific `403` detection and console logging for IAM debugging

---

#### [MODIFY] [router.ts](file:///c:/Projects/health-rag-application-1/apps/functions/src/trpc/router.ts)

Register `chatRouter` alongside the existing `userRouter`.

```diff
  import { router } from './trpc.js'
  import { userRouter } from './routers/user.js'
+ import { chatRouter } from './routers/chat.js'

  export const appRouter = router({
    user: userRouter,
+   chat: chatRouter,
  })
```

---

### Environment Variables

#### [MODIFY] [.env.example](file:///c:/Projects/health-rag-application-1/.env.example)

Add three new variables under a new `VERTEX AI / RAG` section:

```
GOOGLE_CLOUD_PROJECT=health-lifeline-53fb3
GOOGLE_CLOUD_LOCATION=europe-west2
RAG_CORPUS_ID=7631349568579305472
```

---

### Frontend — `apps/web`

---

#### [NEW] [useChat.ts](file:///c:/Projects/health-rag-application-1/apps/web/src/hooks/useChat.ts)

New hook following the same pattern as `useUsers.ts`:

```ts
import { trpc } from '../lib/trpc'

export function useSendMessage() {
  return trpc.chat.sendMessage.useMutation()
}
```

---

#### [MODIFY] [ChatPage.tsx](file:///c:/Projects/health-rag-application-1/apps/web/src/pages/ChatPage.tsx)

Replace the TODO-stubbed `handleSend` with a real implementation that:

1. Appends the user's message to local `messages` state immediately (optimistic)
2. Calls `sendMessage.mutateAsync({ message, conversationId: conversationId ?? 'new' })`
3. Appends the AI answer + sources to `messages` state on success
4. Shows a `toast.error(...)` on failure
5. Renders `messages` list above `MessageInput` instead of `<EmptyState>` when messages exist (keeps `EmptyState` for when messages is empty)

No routing, auth, sidebar, settings, or theme logic is touched.

---

### Tests

#### [NEW] Tests in [chat.test.ts](file:///c:/Projects/health-rag-application-1/apps/functions/src/trpc/routers/chat.test.ts)

Following the exact pattern of `user.test.ts` (vitest, `createCallerFactory`). Will mock the `@google-cloud/vertexai` SDK using `vi.mock` so no real network call is needed:

```
pnpm --filter @repo/functions test
```

Test cases:

- `sendMessage` returns `{ answer: string, sources: string[] }` when SDK resolves
- `sendMessage` throws a tRPC error when SDK rejects with a 403

---

## Verification Plan

### Automated Tests

Run the full functions test suite from the **repo root**:

```powershell
pnpm --filter @repo/functions test
```

Expected: all existing `userRouter` tests still pass, plus the two new `chatRouter` tests pass.

### Manual Verification

> [!IMPORTANT] > **Prerequisite before testing:** Your Firebase service account must have the **Vertex AI User** IAM role on `health-lifeline-53fb3`. You mentioned this is in progress — wait for IAM propagation (~2 min) before testing.

1. Start the Firebase Emulator (or deploy Functions) so the backend is reachable.
2. Open the app in the browser (`http://localhost:5173` or your deployed URL).
3. Sign in on the `/authentication` page.
4. On `/new-chat`, type a health question (e.g. _"What are the warning signs of hypoglycemia?"_) and press **Enter**.
5. **Expected:** The question appears in the chat, a loading indicator shows, then the AI answer appears with a sources list below it.
6. **If you see a 403 error toast:** Check the Cloud Functions logs — the code will log `"[chat] 403 Permission Denied…"` to help you debug the IAM role.
