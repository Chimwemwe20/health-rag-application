# IAM Troubleshooting — Vertex AI & Firestore in Production

A record of the permission issues encountered when deploying to Firebase Cloud Functions
(gen 2) and how they were resolved.

---

## The Problem

The application worked perfectly on localhost but returned `500 Internal Server Error`
on the live deployment (`https://<project-id>.web.app`) whenever a user sent a message.

The browser console showed:

```
POST http://127.0.0.1:5002/.../api/chat.sendMessage?batch=1 500 (Internal Server Error)
```

And the Cloud Function logs showed:

```
[chat] Unexpected error calling Vertex AI: Error: 7 PERMISSION_DENIED: Missing or insufficient permissions.
```

---

## Why It Worked Locally But Not in Production

This is the most important concept to understand:

| Environment                                    | Runs as                                | Permissions                                         |
| ---------------------------------------------- | -------------------------------------- | --------------------------------------------------- |
| Local emulator (`firebase emulators:start`)    | Your personal Google account           | **Owner** — unrestricted access to all GCP services |
| Production (Firebase Functions v2 / Cloud Run) | Compute Engine default service account | Only explicitly granted IAM roles                   |

When you run the functions emulator locally, it uses **Application Default Credentials**
set up by running:

```bash
gcloud auth application-default login
```

Your personal account has the **Owner** role on the project, so every call — Vertex AI,
Firestore, RAG corpus queries — succeeds automatically.

In production, the function runs as a **robot service account**:

```
<project-number>-compute@developer.gserviceaccount.com
```

This account starts with minimal permissions. Every GCP service the function calls must
have its IAM role explicitly granted to this account, or the call returns `PERMISSION_DENIED`.

---

## Roles That Were Missing

### 1. `roles/aiplatform.admin` — Vertex AI

**Symptom:** `Error: 7 PERMISSION_DENIED: Missing or insufficient permissions` from Vertex AI.

The function calls:

- `generateContent` on a Gemini model
- A Vertex AI RAG corpus for document retrieval (`vertexRagStore`)

The `roles/aiplatform.user` role (Vertex AI User) covers standard model predictions but
**does not include the permissions required to query a RAG corpus** during `generateContent`.
`roles/aiplatform.admin` is required for RAG retrieval to work.

**Fix:**

```bash
gcloud projects add-iam-policy-binding <your-project-id> \
  --member="serviceAccount:<project-number>-compute@developer.gserviceaccount.com" \
  --role="roles/aiplatform.admin"
```

---

### 2. `roles/datastore.user` — Firestore

**Symptom:** Still receiving `Error: 7 PERMISSION_DENIED` even after fixing Vertex AI IAM.

The catch block in the Cloud Function was misleadingly labelled:

```ts
} catch (error) {
  console.error('[chat] Unexpected error calling Vertex AI:', error)
}
```

This catch block wraps **all** operations in the try block — including Firestore writes
that happen **before** the Vertex AI call:

```ts
try {
  await convRef.set({...})                          // ← Firestore write (FAILS here)
  await messagesRef.set({...})                      // ← Firestore write
  await getModel().generateContent({...})           // ← Vertex AI call
  await messagesRef.set({...})                      // ← Firestore write
} catch (error) {
  console.error('[chat] Unexpected error calling Vertex AI:', error) // ← misleading label
}
```

The Firebase Admin SDK **bypasses Firestore Security Rules** (the `.rules` file), but it
**does not bypass IAM**. The compute service account still needs `roles/datastore.user`
to read and write Firestore documents.

**Fix:**

```bash
gcloud projects add-iam-policy-binding <your-project-id> \
  --member="serviceAccount:<project-number>-compute@developer.gserviceaccount.com" \
  --role="roles/datastore.user"
```

---

## How to Find Your Project Number

```bash
gcloud projects describe <your-project-id> --format="value(projectNumber)"
```

---

## How to Verify Which Service Account the Function Uses

```bash
gcloud functions describe api \
  --region=europe-west2 \
  --project=<your-project-id> \
  --format="value(serviceConfig.serviceAccountEmail)"
```

This should return:

```
<project-number>-compute@developer.gserviceaccount.com
```

---

## How to Check Current IAM Roles for the Service Account

In the GCP Console:

1. Go to **IAM & Admin → IAM**
2. Find the `<project-number>-compute@developer.gserviceaccount.com` principal
3. Expand its roles

> Note: The **Firebase Console** IAM view only shows Firebase-specific roles and will
> not display `roles/aiplatform.admin` or `roles/datastore.user`. Always use the
> **GCP Console** to see the full picture.

---

## After Granting Roles

No redeployment is needed. IAM changes take effect on the **next incoming request**
because the function fetches its credentials from the GCP metadata server per invocation.

Allow **1–2 minutes** for IAM propagation before testing.

---

## Full List of Required Roles for the Compute Service Account

| Role                             | Purpose                                                   |
| -------------------------------- | --------------------------------------------------------- |
| `roles/aiplatform.admin`         | Call Gemini models and query Vertex AI RAG corpora        |
| `roles/datastore.user`           | Read and write Firestore documents via Firebase Admin SDK |
| `roles/artifactregistry.reader`  | Pull container images during function deployment          |
| `roles/artifactregistry.writer`  | Push build artifacts during deployment                    |
| `roles/cloudfunctions.developer` | Deploy and manage Cloud Functions                         |
| `roles/run.admin`                | Manage the underlying Cloud Run service (Functions v2)    |
| `roles/logging.logWriter`        | Write logs to Cloud Logging                               |
| `roles/storage.objectViewer`     | Read from Cloud Storage (RAG corpus source files)         |
| `roles/iam.serviceAccountUser`   | Allow the function to act as a service account            |

---

## Key Takeaway

> Every GCP service your Cloud Function calls in production needs its IAM role explicitly
> granted to the Compute Engine default service account. Your personal developer account
> being an Owner masks these gaps entirely when running locally.

When adding a new GCP service to the function (e.g. Secret Manager, Cloud Translation,
Pub/Sub), always check what IAM role is needed and grant it before deploying.
