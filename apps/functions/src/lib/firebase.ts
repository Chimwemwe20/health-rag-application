import { getApps, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'

// Lazy initialization — deferred until the first function invocation so the
// Firebase CLI can inspect exported functions without hitting the GCE metadata
// server (which causes a 10-second timeout on developer machines).
// See: https://firebase.google.com/docs/functions/tips#avoid_deployment_timeouts_during_initialization
function getApp() {
  return getApps()[0] ?? initializeApp()
}

export const getDb = () => getFirestore(getApp())
export const getAuthService = () => getAuth(getApp())
