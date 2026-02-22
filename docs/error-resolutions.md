# Error Resolutions

This document lists the issues encountered and how they were resolved.

## net::ERR_CONNECTION_REFUSED

- Cause: Functions emulator wasn’t running; web app tried to call the local API and failed.
- Fix:
  - Started Functions emulator; confirmed endpoint `http://127.0.0.1:5002/health-lifeline-53fb3/europe-west2/api`.
  - Ensured `VITE_API_URL` points to the same base URL in `.env`.

## Admin SDK/Auth Emulator Warnings

- Symptom: Emulator logs showed “Application Default Credentials detected” and reauth messages.
- Impact: No functional block for local development; Functions emulator still served and processed tRPC calls.
- Action: Proceeded with local dev; warnings acknowledged.

## Firestore Rules Rejecting Creates (timestamps)

- Symptom: Users/conversations not visible after creates.
- Cause: Rules required concrete `timestamp` types while app used `serverTimestamp()` transforms.
- Fix: Updated [firestore.rules](file:///c:/Projects/health-rag-application-1/firestore.rules) to accept presence/equality of timestamps and soft-delete transforms.

## PowerShell `&&` Separator Error

- Symptom: Running `pnpm a && pnpm b` failed in Windows PowerShell.
- Fix: Executed commands separately (`pnpm ...` then `pnpm ...`) to lint and typecheck.

## Functions Type Errors after Adding Authed Context

- Symptom: Tests calling `createCaller({})` failed due to new `Context` type.
- Fix: Updated tests to pass `{ uid: 'test-user' }` as context.

## Web Lint/Typecheck Issues

- Unused imports/vars:
  - Removed unused `Unsubscribe` and extra `useState` import.
- Conversations hook lint:
  - Ensured stable cleanup and removed unused types.

## Sidebar UX (No Browser Prompts)

- Requirement: Avoid browser `prompt/confirm` for rename/delete.
- Fix: Implemented inline input and inline delete confirmation with buttons in [Sidebar.tsx](file:///c:/Projects/health-rag-application-1/apps/web/src/components/Sidebar.tsx#L86-L190).

## Inline Edit of Last Message

- Requirement: Edit should not remove prior turns.
- Fix: Kept the previous pair and appended a new user+assistant pair after saving the edit in [ChatPage.tsx](file:///c:/Projects/health-rag-application-1/apps/web/src/pages/ChatPage.tsx#L390-L432).

## Conversation Title Sourcing

- Requirement: Use the first prompt as the conversation title.
- Fix: After the first message, if the title was default, update it to the first question text (truncated). See [ChatPage.tsx](file:///c:/Projects/health-rag-application-1/apps/web/src/pages/ChatPage.tsx#L269-L289).
