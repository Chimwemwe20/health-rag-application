# Application Deployment Guide

## Overview

- Web app is built with Vite and deployed to Firebase Hosting
- Backend API is a Firebase Function exposing a tRPC HTTP handler
- Deployments are configured in [firebase.json](file:///c:/Projects/health-rag-application/firebase.json)

## Prerequisites

- Firebase CLI authenticated to project [".firebaserc"](file:///c:/Projects/health-rag-application/.firebaserc)
- Node 18+ for local builds; Functions run on Node.js 22 (runtime configured)
- PNPM workspace installed

## Environment

- Create .env from [.env.example](file:///c:/Projects/health-rag-application/.env.example)
- Set VITE variables for the web app (API URL and Firebase client config)
- Production web points to your Functions URL via `VITE_API_URL`

## Build and Deploy

- Hosting predeploy builds the web app:
  - See hosting predeploy in [firebase.json](file:///c:/Projects/health-rag-application/firebase.json#L24-L31)
- Functions predeploy builds the function bundle:
  - See functions predeploy/postdeploy in [firebase.json](file:///c:/Projects/health-rag-application/firebase.json#L15-L21)
- Deploy using Firebase CLI:
  - Deploy hosting only
  - Or deploy hosting and functions together

## Hosting Behavior

- Public directory: [apps/web/dist](file:///c:/Projects/health-rag-application/apps/web/dist) after build
- Single-page rewrites configured in hosting section
- Allowed origins for API calls are enforced in [index.ts](file:///c:/Projects/health-rag-application/apps/functions/src/index.ts)

## Frontend → Backend Wiring

- tRPC client URL is determined in [trpc.ts](file:///c:/Projects/health-rag-application/apps/web/src/lib/trpc.ts)
- For production, set `VITE_API_URL` to your deployed Functions URL (region + project)
- The app uses Firebase Auth client config from your VITE\_\* env values
