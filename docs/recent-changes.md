# Recent Changes and How They Were Implemented

This document summarizes the recent updates and how they were implemented across web and functions.

## Conversations and Messages

- Added auth to tRPC client so the web app sends Firebase ID tokens.
  - Changed headers in [trpc.ts](file:///c:/Projects/health-rag-application-1/apps/web/src/lib/trpc.ts#L1-L20).
- Verified ID tokens in Functions and injected `ctx.uid`.
  - Context handler in [index.ts](file:///c:/Projects/health-rag-application-1/apps/functions/src/index.ts#L6-L20) and typed context in [trpc.ts](file:///c:/Projects/health-rag-application-1/apps/functions/src/trpc/trpc.ts#L1-L16).
- Persisted chats to Firestore in chat mutation:
  - Create conversation on demand, store user and assistant messages with citations, return `conversationId`.
  - Implementation in [chat.ts](file:///c:/Projects/health-rag-application-1/apps/functions/src/trpc/routers/chat.ts#L56-L121).

## New Chat and Listing

- New conversation creation from the web:
  - Helper in [conversations.ts](file:///c:/Projects/health-rag-application-1/apps/web/src/lib/conversations.ts) creates `conversations/{id}` with timestamps and soft-delete flag.
  - Hooked up the “New Chat” button in [ChatPage.tsx](file:///c:/Projects/health-rag-application-1/apps/web/src/pages/ChatPage.tsx#L291-L303) to create and navigate to `/chat/<id>`.
- Live conversations list in the sidebar:
  - Added [useConversations.ts](file:///c:/Projects/health-rag-application-1/apps/web/src/hooks/useConversations.ts) to stream the user’s own, non-deleted conversations ordered by `updatedAt`.
  - Wired into [ChatPage.tsx](file:///c:/Projects/health-rag-application-1/apps/web/src/pages/ChatPage.tsx#L242) so the sidebar shows chats immediately.

## Sidebar Rename and Delete

- Inline rename and delete actions (no browser dialogs):
  - UI and logic in [Sidebar.tsx](file:///c:/Projects/health-rag-application-1/apps/web/src/components/Sidebar.tsx#L86-L190).
  - Uses `renameConversation` and `softDeleteConversation` from [conversations.ts](file:///c:/Projects/health-rag-application-1/apps/web/src/lib/conversations.ts).

## Title from First Message

- After the first user message, if the conversation is still “New Conversation”, auto-rename to the first question.
  - Implemented in [ChatPage.tsx](file:///c:/Projects/health-rag-application-1/apps/web/src/pages/ChatPage.tsx#L269-L289).

## Inline Edit of Last Turn

- Edit the most recent user message inline (like ChatGPT) without removing history:
  - Turns the last user bubble into a textarea with Save/Cancel.
  - On Save, appends a new user+assistant pair below the existing pair.
  - Implementation in [ChatPage.tsx](file:///c:/Projects/health-rag-application-1/apps/web/src/pages/ChatPage.tsx#L351-L432).

## Firestore Rules Alignment

- Adjusted rules to accept `serverTimestamp()` transforms and soft-deletes:
  - See [firestore.rules](file:///c:/Projects/health-rag-application-1/firestore.rules).
  - Allows client create/rename/soft-delete for conversations; messages remain server-written.

## Shared Schema

- Added `CreateConversationSchema` for validating new chat titles.
  - Defined in [conversation.ts](file:///c:/Projects/health-rag-application-1/packages/shared/src/schemas/conversation.ts) and exported via [index.ts](file:///c:/Projects/health-rag-application-1/packages/shared/src/schemas/index.ts).

## Verification

- Web app:
  - Lint and typecheck pass for web.
- Functions:
  - Lint and typecheck pass for functions after context/test updates.
