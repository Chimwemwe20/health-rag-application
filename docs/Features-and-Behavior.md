# Features and Behavior

## Authentication and Routing

- Firebase Auth integration in web provider: [AuthProvider.tsx](file:///c:/Projects/health-rag-application/apps/web/src/providers/AuthProvider.tsx)
- Protected routes: [App.tsx](file:///c:/Projects/health-rag-application/apps/web/src/App.tsx#L40-L46)
- Pages: [LandingPage.tsx](file:///c:/Projects/health-rag-application/apps/web/src/pages/LandingPage.tsx), [AuthenitcationPage.tsx](file:///c:/Projects/health-rag-application/apps/web/src/pages/AuthenitcationPage.tsx), [ChatPage.tsx](file:///c:/Projects/health-rag-application/apps/web/src/pages/ChatPage.tsx)

## Chat Experience

- Conversation memory: loads recent messages for context before model call
  - [chat.ts](file:///c:/Projects/health-rag-application/apps/functions/src/trpc/routers/chat.ts#L120-L146)
- Messages stored and streamed from Firestore in the web app:
  - [useMessages.ts](file:///c:/Projects/health-rag-application/apps/web/src/hooks/useMessages.ts)
- Edit, copy, delete actions on messages:
  - [ChatPage.tsx](file:///c:/Projects/health-rag-application/apps/web/src/pages/ChatPage.tsx#L274-L310)

## RAG Grounding

- Vertex AI model: gemini-2.5-flash
- RAG corpus configured by env; retrieval tool based on [firebase.json](file:///c:/Projects/health-rag-application/firebase.json) and [chat.ts](file:///c:/Projects/health-rag-application/apps/functions/src/trpc/routers/chat.ts#L56-L63)
- Citations (Sources) extracted from grounding metadata and shown as chips:
  - Backend extraction: [chat.ts](file:///c:/Projects/health-rag-application/apps/functions/src/trpc/routers/chat.ts#L162-L192)
  - Frontend rendering: [ChatPage.tsx](file:///c:/Projects/health-rag-application/apps/web/src/pages/ChatPage.tsx#L313-L327)

## Diabetes-Focused Web Links

- Optional domain whitelist via `DIABETES_DOMAINS`
- Extra link chips presented under the assistant message:
  - Backend generation: [chat.ts](file:///c:/Projects/health-rag-application/apps/functions/src/trpc/routers/chat.ts#L219-L225)
  - Frontend display: [ChatPage.tsx](file:///c:/Projects/health-rag-application/apps/web/src/pages/ChatPage.tsx#L329-L343)

## PDF Viewing and Highlight (Optional)

- When a citation points to a PDF or gs:// object, the app can open a viewer and highlight cited text if provided
- Viewer page: [SourceViewPage.tsx](file:///c:/Projects/health-rag-application/apps/web/src/pages/SourceViewPage.tsx)
- If the route `/view-source` is registered, clicking a PDF citation navigates to this viewer with an optional search term

## Configuration Summary

- Environment template: [.env.example](file:///c:/Projects/health-rag-application/.env.example)
- Firestore security and indexes:
  - [firestore.rules](file:///c:/Projects/health-rag-application/firestore.rules)
  - [firestore.indexes.json](file:///c:/Projects/health-rag-application/firestore.indexes.json)
- Hosting and Functions deployment:
  - [firebase.json](file:///c:/Projects/health-rag-application/firebase.json)
