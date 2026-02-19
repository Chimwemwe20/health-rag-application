import { initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'

// Zero-argument initialization works automatically in Cloud Functions
const app = initializeApp()

export const auth = getAuth(app)
export const db = getFirestore(app)
