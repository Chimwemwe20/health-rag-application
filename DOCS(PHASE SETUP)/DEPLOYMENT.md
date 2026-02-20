# Deployment Setup — GitHub Actions

Instead of running Firebase deploy commands in the terminal every time, pushing to the `dev` branch automatically triggers a GitHub Actions workflow that builds and deploys the app.

---

## How It Works

1. You push code to the `dev` branch
2. GitHub Actions starts the `Deploy to Dev` workflow
3. It installs dependencies and runs `pnpm build`, injecting all Firebase config from GitHub Secrets into the Vite bundle
4. It deploys Firebase Hosting (frontend) using the Firebase CI token
5. It deploys Firebase Functions (backend) using the same token
6. A deployment summary is posted to the workflow run page

---

## One-Time Setup

### 1. Generate a Firebase Token

Run this once on your local machine:

```bash
firebase login:ci
```

Copy the token it prints — you will use it in the next step.

### 2. Add GitHub Secrets

Go to your GitHub repository → **Settings → Secrets and variables → Actions → New repository secret** and add each of the following:

| Secret Name                         | Where to find the value                                      |
| ----------------------------------- | ------------------------------------------------------------ |
| `FIREBASE_TOKEN`                    | Output of `firebase login:ci`                                |
| `FIREBASE_PROJECT_ID`               | Firebase Console → Project Settings → Project ID             |
| `VITE_FIREBASE_API_KEY`             | Firebase Console → Project Settings → Your apps → SDK config |
| `VITE_FIREBASE_AUTH_DOMAIN`         | Same as above                                                |
| `VITE_FIREBASE_STORAGE_BUCKET`      | Same as above                                                |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Same as above                                                |
| `VITE_FIREBASE_APP_ID`              | Same as above                                                |

> `VITE_FIREBASE_PROJECT_ID` is not a separate secret — the workflow reuses `FIREBASE_PROJECT_ID` for it.

### 3. Push to `dev`

That's it. Every push to `dev` deploys automatically.

---

## Why Secrets and Not a .env File

The `.env` file only works locally. When GitHub Actions runs `pnpm build` in the cloud, there is no `.env` file present. Vite bakes `VITE_*` variables into the static bundle at build time, so the secrets must be available during the build step in the workflow — which is what the GitHub Secrets configuration achieves.
