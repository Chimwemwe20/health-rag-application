# Cost Efficiency & IAM Permissions

## Table of Contents

1. [Cost Efficiency Strategies](#cost-efficiency-strategies)
   - [LLM Usage Optimisation](#1-llm-usage-optimisation)
   - [Offline RAG Pipeline](#2-offline-rag-pipeline)
   - [Embedding Caching & Batching](#3-embedding-caching--batching)
   - [Smart Document Chunking](#4-smart-document-chunking)
   - [Serverless Infrastructure](#5-serverless-infrastructure)
   - [Client-Side Caching](#6-client-side-caching)
   - [Firestore Optimisations](#7-firestore-optimisations)
   - [Lazy Initialisation](#8-lazy-initialisation)
   - [Managed Vertex AI RAG](#9-managed-vertex-ai-rag)
2. [IAM Permissions](#iam-permissions)
   - [Cloud Function Runtime (Compute SA)](#cloud-function-runtime-compute-service-account)
   - [GitHub Actions Deployment SA](#github-actions-deployment-service-account)
   - [GCP APIs to Enable](#gcp-apis-to-enable)
   - [Workload Identity Federation](#workload-identity-federation)
   - [How Permissions Map to Code](#how-permissions-map-to-code)

---

## Cost Efficiency Strategies

The core philosophy is: **do all expensive work once offline, keep runtime queries lean, and cache aggressively at every layer.**

---

### 1. LLM Usage Optimisation

**Model choice — Gemini 2.5 Flash**

The backend uses `gemini-2.5-flash` rather than more expensive models such as Gemini Pro or Claude. Flash is optimised for streaming RAG workloads and is significantly cheaper per token.

```typescript
// apps/functions/src/trpc/routers/chat.ts
_model = vertexAI.getGenerativeModel({ model: 'gemini-2.5-flash', ... })
```

**Top-5 chunk retrieval**

The RAG tool is hard-capped at returning the five most relevant chunks per query. This directly bounds the number of tokens sent to the model on every request.

```typescript
// apps/functions/src/trpc/routers/chat.ts
const ragTool: Tool = {
  retrieval: {
    vertexRagStore: {
      ragResources: [{ ragCorpus: RAG_CORPUS_RESOURCE }],
      similarityTopK: 5, // hard limit on context size
    },
  },
}
```

**Cost impact:** High — model cost and token usage are the dominant variable cost in any LLM application.

---

### 2. Offline RAG Pipeline

All expensive preprocessing runs **once, offline**, before any user ever sends a message:

| Step                    | Script            | Runs                   |
| ----------------------- | ----------------- | ---------------------- |
| Chunking documents      | `chunking.py`     | Once per document      |
| Generating embeddings   | `embeddings.py`   | Once per chunk         |
| Indexing into Vertex AI | ingestion scripts | Once per corpus update |

At query time the function only performs cheap vector retrieval + LLM generation. There is no runtime embedding generation.

**Cost impact:** Very high — eliminates per-query embedding API calls entirely.

---

### 3. Embedding Caching & Batching

**Firestore embedding cache**

Before calling the Vertex AI embedding API, `embeddings.py` checks a Firestore cache keyed by `SHA256(model_name + text)`. A cache hit skips the API call completely.

```python
# embeddings.py
def get_cached_embedding(text, model_name):
    key = sha256(f"{model_name}:{text}".encode()).hexdigest()
    doc = db.collection("embedding_cache").document(key).get()
    return doc.to_dict().get("embedding") if doc.exists else None
```

**Batch processing**

Uncached texts are sent to the API in batches of 20, reducing per-request overhead.

```python
# embeddings.py
BATCH_SIZE = 20
for i in range(0, len(uncached_texts), BATCH_SIZE):
    batch = uncached_texts[i:i + BATCH_SIZE]
    embeddings = model.get_embeddings(batch, ...)
```

**Retry with exponential backoff**

Up to 3 retries with a 2-second base delay prevent transient failures from wasting quota.

**Cost impact:** High — avoids redundant embedding API calls across re-ingestion runs.

---

### 4. Smart Document Chunking

**Token-based sizing**

Chunks are capped at 500 tokens with a 50-token overlap. Small, focused chunks mean the top-5 retrieval returns only the most relevant content rather than large blocks containing noise.

```python
# chunking.py
DEFAULT_MAX_TOKENS = 500
DEFAULT_OVERLAP_TOKENS = 50
DEFAULT_MIN_CHUNK_TOKENS = 50
```

**Deduplication**

After chunking, near-duplicate chunks (Jaccard similarity ≥ 0.95) are removed. This reduces the corpus size and the number of embeddings that need to be generated and stored.

```python
# chunking.py
def deduplicate_chunks(chunks, similarity_threshold=0.95):
    # Jaccard similarity filtering
```

**Short-chunk filtering**

Chunks below the minimum token threshold are discarded — they carry too little information to be useful and waste index space.

**Cost impact:** Medium — smaller corpus lowers both storage costs and retrieval noise.

---

### 5. Serverless Infrastructure

**Cloud Functions v2 (pay-per-invocation)**

There are no always-on VMs. The function scales to zero between requests, so there is no idle compute cost.

**Single HTTP function**

All tRPC routes are served from one function (`api`). A single cold start covers every route rather than one cold start per function.

**ESM bundle with externals**

Heavy runtime dependencies (`firebase-admin`, `@google-cloud/vertexai`) are excluded from the bundle — they are provided by the Cloud Functions environment. This keeps the deployment artifact small, reducing deployment time and cold-start duration.

```json
// apps/functions/package.json (build script)
"esbuild ... --external:firebase-admin --external:@google-cloud/vertexai"
```

**Regional consistency**

All services (Firestore, Cloud Functions, Vertex AI) run in `europe-west2`. Keeping everything in one region eliminates inter-region data transfer charges.

**Cost impact:** High — serverless billing is far cheaper than reserved compute for unpredictable, low-to-medium traffic.

---

### 6. Client-Side Caching

**TanStack Query stale time**

Query results are considered fresh for 5 minutes. Repeated navigations within that window hit the in-memory cache rather than the backend.

```typescript
// apps/web/src/lib/queryClient.ts
defaultOptions: {
  queries: {
    staleTime: 1000 * 60 * 5,  // 5 minutes
    retry: 1,
  },
}
```

**Firestore real-time subscriptions**

Conversation lists use `onSnapshot` — a single persistent connection that pushes updates rather than the client polling with repeated reads.

```typescript
// apps/web/src/hooks/useConversations.ts
const unsubscribe = onSnapshot(q, snapshot => { ... })
```

**tRPC HTTP batch link**

Multiple tRPC procedure calls initiated in the same render cycle are batched into a single HTTP request, halving the number of round-trips.

**Cost impact:** Medium — reduces both function invocations and Firestore read operations.

---

### 7. Firestore Optimisations

**Batch writes**

The ingestion pipeline groups up to 500 document writes into a single Firestore batch. This amortises transaction overhead across all writes.

```python
# firestore_utils.py
MAX_BATCH_SIZE = 500
batch.set(chunk_ref, chunk_data)
if batch_count >= MAX_BATCH_SIZE:
    batch.commit()
```

**Pre-defined composite indexes**

Eight composite indexes cover all query patterns used by the application. Queries never do full-collection scans (which are both slow and expensive).

**Admin-only sensitive collections**

Collections such as `health_chunks`, `embedding_cache`, `query_logs`, and `rate_limits` are inaccessible from the client — all writes and reads go through the Admin SDK in Cloud Functions. This prevents any accidental or malicious high-volume reads from the frontend.

**Soft deletes**

Records are never hard-deleted — a `deletedAt` timestamp is set instead. Queries filter on `deletedAt == null`. This avoids the cost of delete operations and enables audit recovery.

**Cost impact:** Medium — batching and indexed queries prevent billing surprises at scale.

---

### 8. Lazy Initialisation

Both the Vertex AI client and the Firebase Admin SDK are initialised on the first request rather than at module load time. This avoids GCE metadata server calls during function deployment and keeps cold-start latency low.

```typescript
// apps/functions/src/trpc/routers/chat.ts
let _model: ... | null = null
function getModel() {
  if (!_model) { _model = new VertexAI(...).getGenerativeModel(...) }
  return _model
}

// apps/functions/src/lib/firebase.ts
function getApp() {
  return getApps()[0] ?? initializeApp()
}
```

**Cost impact:** Low — prevents edge-case billing for unnecessary API calls on deployment.

---

### 9. Managed Vertex AI RAG

The project uses Vertex AI's managed RAG corpus rather than self-hosting a vector database (Pinecone, Weaviate, Qdrant, etc.). This eliminates:

- VM or container costs for running the vector DB
- Operational overhead (upgrades, backups, monitoring)
- Separate embedding-search infrastructure

**Cost impact:** High — no infrastructure cost for vector search beyond per-query Vertex AI usage.

---

## IAM Permissions

The application uses two separate service accounts with different scopes.

---

### Cloud Function Runtime (Compute Service Account)

This is the **Compute Engine default service account** (`<project-number>-compute@developer.gserviceaccount.com`). It is the identity assumed by the Cloud Function at runtime.

| Role                            | Why it is needed                                                             |
| ------------------------------- | ---------------------------------------------------------------------------- |
| `roles/aiplatform.admin`        | Call Vertex AI generative models (Gemini 2.5 Flash) and query the RAG corpus |
| `roles/datastore.user`          | Read and write Firestore via the Admin SDK (conversations, messages)         |
| `roles/logging.logWriter`       | Write structured logs to Cloud Logging                                       |
| `roles/storage.objectViewer`    | Read source documents from Cloud Storage during RAG ingestion                |
| `roles/artifactregistry.reader` | Pull the Node.js container image at cold-start                               |

Grant these roles with:

```bash
PROJECT_ID=health-lifeline-53fb3
PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')
SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SA}" \
  --role="roles/aiplatform.admin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SA}" \
  --role="roles/datastore.user"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SA}" \
  --role="roles/logging.logWriter"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SA}" \
  --role="roles/storage.objectViewer"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SA}" \
  --role="roles/artifactregistry.reader"
```

> **Note:** `roles/aiplatform.admin` is broader than strictly needed. A future tightening would grant `roles/aiplatform.user` (models) + a corpus-scoped binding on the RAG resource instead.

---

### GitHub Actions Deployment Service Account

This is `github-actions-sa@<project-id>.iam.gserviceaccount.com`. It is used by CI/CD workflows to deploy the application. It does **not** need runtime permissions — only deployment permissions.

| Role                             | Why it is needed                                                   |
| -------------------------------- | ------------------------------------------------------------------ |
| `roles/firebase.admin`           | Deploy Firestore rules, indexes, and Firebase Auth configuration   |
| `roles/cloudfunctions.developer` | Deploy and update Cloud Functions                                  |
| `roles/run.admin`                | Manage the underlying Cloud Run service backing Functions v2       |
| `roles/artifactregistry.writer`  | Push the built container image during deployment                   |
| `roles/iam.serviceAccountUser`   | Impersonate the Compute SA when deploying functions that run as it |

Grant these roles with:

```bash
PROJECT_ID=health-lifeline-53fb3
DEPLOY_SA="github-actions-sa@${PROJECT_ID}.iam.gserviceaccount.com"

for ROLE in \
  roles/firebase.admin \
  roles/cloudfunctions.developer \
  roles/run.admin \
  roles/artifactregistry.writer \
  roles/iam.serviceAccountUser; do
  gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:${DEPLOY_SA}" \
    --role="$ROLE"
done
```

---

### GCP APIs to Enable

The following APIs must be enabled on the project before deployment or runtime will work:

```bash
gcloud services enable \
  iamcredentials.googleapis.com \
  cloudresourcemanager.googleapis.com \
  firebase.googleapis.com \
  cloudfunctions.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  aiplatform.googleapis.com \
  firestore.googleapis.com \
  storage.googleapis.com \
  run.googleapis.com
```

---

### Workload Identity Federation

GitHub Actions authenticates to GCP using **Workload Identity Federation (WIF)** — no static service account keys are stored anywhere. The flow is:

```
GitHub Actions job starts
       │
       ▼
GitHub OIDC token issued (short-lived JWT)
       │
       ▼
google-github-actions/auth@v2 exchanges token
with GCP STS using the WIF pool + provider
       │
       ▼
GCP issues a short-lived access token
scoped to github-actions-sa permissions
       │
       ▼
Firebase CLI / gcloud commands run as that SA
```

**Required GitHub Secrets:**

| Secret                           | Value                                                    |
| -------------------------------- | -------------------------------------------------------- |
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | Full WIF provider resource name                          |
| `GCP_SA_EMAIL`                   | `github-actions-sa@<project-id>.iam.gserviceaccount.com` |

WIF is configured in [`scripts/setup-wif.sh`](../scripts/setup-wif.sh).

---

### How Permissions Map to Code

| Code location                      | GCP call made                     | Permission required                                              |
| ---------------------------------- | --------------------------------- | ---------------------------------------------------------------- |
| `chat.ts` — `getModel()`           | Vertex AI `generateContentStream` | `roles/aiplatform.admin` (Compute SA)                            |
| `chat.ts` — RAG tool               | Vertex AI RAG corpus retrieval    | `roles/aiplatform.admin` (Compute SA)                            |
| `chat.ts` — Firestore reads/writes | Admin SDK `getFirestore()`        | `roles/datastore.user` (Compute SA)                              |
| `firebase.ts` — `initializeApp()`  | GCE metadata + Firebase Admin     | Compute SA identity (automatic)                                  |
| CI/CD deploy step                  | `firebase deploy`                 | `roles/firebase.admin` (Deploy SA)                               |
| CI/CD deploy step                  | Functions v2 upload               | `roles/cloudfunctions.developer` + `roles/run.admin` (Deploy SA) |

---

> See also: [`docs/IAM-TROUBLESHOOTING.md`](./IAM-TROUBLESHOOTING.md) for debugging common permission-denied errors.
