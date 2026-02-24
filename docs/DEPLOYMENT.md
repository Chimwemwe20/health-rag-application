# Deployment Guide

How to run the application locally and deploy it to production.

---

## Prerequisites

Install these tools before anything else:

| Tool             | Version | Install                                                           |
| ---------------- | ------- | ----------------------------------------------------------------- |
| Node.js          | 20+     | [nodejs.org](https://nodejs.org)                                  |
| pnpm             | 8+      | `npm install -g pnpm`                                             |
| Firebase CLI     | 13+     | `npm install -g firebase-tools`                                   |
| Google Cloud CLI | latest  | [cloud.google.com/sdk](https://cloud.google.com/sdk/docs/install) |

---

## Environment Variables

**Never commit real credentials.** Create local env files from the examples below — they are already listed in `.gitignore`.

### Frontend — `apps/web/.env`

```env
NODE_ENV=development

# Points to the local functions emulator
VITE_API_URL=http://127.0.0.1:5002/<your-project-id>/europe-west2/api

# Firebase client SDK — get these from Firebase Console > Project Settings
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=<your-project-id>.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=<your-project-id>
VITE_FIREBASE_STORAGE_BUCKET=<your-project-id>.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

### Frontend production — `apps/web/.env.production`

```env
# Points to the live Cloud Function
VITE_API_URL=https://europe-west2-<your-project-id>.cloudfunctions.net/api

VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=<your-project-id>.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=<your-project-id>
VITE_FIREBASE_STORAGE_BUCKET=<your-project-id>.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

### Backend — `apps/functions/.env`

```env
GOOGLE_CLOUD_PROJECT=<your-project-id>
GOOGLE_CLOUD_LOCATION=europe-west2
RAG_CORPUS_ID=<your-rag-corpus-numeric-id>
```

---

## Running Locally

### 1. Authenticate with Google Cloud

The functions emulator runs as **your personal Google account**, so it needs Application Default Credentials to call Vertex AI and Firestore.

```bash
gcloud auth login
gcloud auth application-default login
gcloud config set project <your-project-id>
```

You only need to do this once per machine (or when credentials expire).

### 2. Authenticate with Firebase

```bash
firebase login
```

### 3. Install dependencies

> `NODE_ENV` must be forced to `development` — this environment defaults to `production`,
> which causes pnpm to skip devDependencies and break builds.

```bash
NODE_ENV=development pnpm install
```

### 4. Start the dev servers

```bash
NODE_ENV=development pnpm dev
```

| Service            | URL                   |
| ------------------ | --------------------- |
| Frontend (Vite)    | http://localhost:5173 |
| Functions emulator | http://127.0.0.1:5002 |

### 5. Run functions emulator only (optional)

```bash
firebase emulators:start --only functions
```

---

## Deploying to Production

### 1. Build functions

```bash
NODE_ENV=development pnpm --filter functions build
```

### 2. Deploy

```bash
# Deploy everything (functions + hosting)
firebase deploy

# Deploy only Cloud Functions
firebase deploy --only functions

# Deploy only the frontend (Firebase Hosting)
firebase deploy --only hosting
```

The live URLs after deployment:

| Surface  | URL                                                             |
| -------- | --------------------------------------------------------------- |
| Frontend | `https://<your-project-id>.web.app`                             |
| API      | `https://europe-west2-<your-project-id>.cloudfunctions.net/api` |

---

## IAM Setup (one-time, production only)

The Cloud Function runs in production as the **Compute Engine default service account**:

```
<project-number>-compute@developer.gserviceaccount.com
```

This account needs explicit IAM grants. Run these once — no redeployment required afterwards.

### Required roles

```bash
# Vertex AI — generate content and query RAG corpus
gcloud projects add-iam-policy-binding <your-project-id> \
  --member="serviceAccount:<project-number>-compute@developer.gserviceaccount.com" \
  --role="roles/aiplatform.admin"

# Firestore — read and write conversations and messages
gcloud projects add-iam-policy-binding <your-project-id> \
  --member="serviceAccount:<project-number>-compute@developer.gserviceaccount.com" \
  --role="roles/datastore.user"
```

To find your project number:

```bash
gcloud projects describe <your-project-id> --format="value(projectNumber)"
```

### Why these roles are needed

| Role                     | Why                                                                                                                                        |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `roles/aiplatform.admin` | Calls Gemini and queries the Vertex AI RAG corpus. `roles/aiplatform.user` alone is not sufficient for RAG corpus retrieval.               |
| `roles/datastore.user`   | Firebase Admin SDK writes conversations and messages to Firestore. The Admin SDK bypasses Firestore security rules but still requires IAM. |

> IAM changes take effect on the **next request** — no redeployment needed. Allow 1–2 minutes for propagation.

---

## Why Local Works but Production Does Not

This is a common source of confusion:

| Environment            | Runs as                        | Permissions                       |
| ---------------------- | ------------------------------ | --------------------------------- |
| Local emulator         | Your personal Google account   | Owner — full access to everything |
| Production (Cloud Run) | Compute Engine service account | Only explicitly granted roles     |

Any GCP service the function calls (Vertex AI, Firestore, Secret Manager, etc.) must have its IAM role explicitly granted to the service account, or it will return `PERMISSION_DENIED`.

---

## CI/CD (GitHub Actions)

Deployments via GitHub Actions use **Workload Identity Federation** — no service account keys are stored in GitHub.

### Required GitHub Secrets

| Secret                           | Description                     |
| -------------------------------- | ------------------------------- |
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | WIF provider resource path      |
| `GCP_SA_EMAIL`                   | Deploying service account email |

Setup: run `scripts/setup-wif.sh` and add the outputs as GitHub secrets.

### Branch → Environment mapping

| Branch  | Environment | Trigger |
| ------- | ----------- | ------- |
| `dev`   | Development | Push    |
| `stage` | Staging     | Push    |
| `main`  | Production  | Manual  |

See [docs/ci-cd/CI-CD-Pipeline-Guide.md](ci-cd/CI-CD-Pipeline-Guide.md) for full CI/CD documentation.

---

## Troubleshooting

### `pnpm install` skips devDependencies

`NODE_ENV` is set to `production` in this environment. Always prefix installs and builds:

```bash
NODE_ENV=development pnpm install --force
NODE_ENV=development pnpm --filter functions build
```

### Local functions emulator returns 500

Application Default Credentials are missing. Run:

```bash
gcloud auth application-default login
```

### Production functions return `PERMISSION_DENIED`

Check which step failed by reading the Cloud Function logs:

```bash
gcloud functions logs read api --region=europe-west2 --project=<your-project-id> --limit=50
```

Common causes:

- **Vertex AI** — ensure `roles/aiplatform.admin` is granted (not just `roles/aiplatform.user`)
- **Firestore** — ensure `roles/datastore.user` is granted
- **IAM propagation** — wait 1–2 minutes after granting a role before retesting

### CORS errors on the functions emulator

The `cors` npm package does not reliably handle OPTIONS preflight in the Firebase v2 / ESM context. CORS headers are handled inline in `apps/functions/src/index.ts` — do not replace this with the `cors` package.
