import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  linkWithCredential,
  signOut as _signOut,
  updateProfile,
  type User,
  type OAuthCredential,
} from 'firebase/auth'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from './firebase'

const googleProvider = new GoogleAuthProvider()

/**
 * Holds a Google credential that couldn't be used directly because the email
 * already exists with the email/password provider. After the user signs in with
 * email/password we link this credential so both providers work going forward.
 */
let pendingGoogleCredential: OAuthCredential | null = null

/**
 * Write a users/{uid} document if one doesn't already exist.
 * Matches the Firestore rules schema:
 *   { uid, email, name?, createdAt, updatedAt }
 * name is omitted when falsy to satisfy hasOnlyFields validation.
 */
async function ensureUserProfile(user: User, name?: string): Promise<void> {
  const ref = doc(db, 'users', user.uid)
  const snap = await getDoc(ref)
  if (snap.exists()) return

  const data: Record<string, unknown> = {
    uid: user.uid,
    email: user.email!,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }
  if (name) data.name = name

  await setDoc(ref, data)
}

export async function signUpWithEmail(
  email: string,
  password: string,
  name: string
): Promise<User> {
  const { user } = await createUserWithEmailAndPassword(auth, email, password)
  await updateProfile(user, { displayName: name })
  await ensureUserProfile(user, name)
  return user
}

export async function signInWithEmail(email: string, password: string): Promise<User> {
  const { user } = await signInWithEmailAndPassword(auth, email, password)

  // If the user previously tried Google sign-in with this email, link the
  // Google provider now so both methods work going forward.
  if (pendingGoogleCredential) {
    try {
      await linkWithCredential(user, pendingGoogleCredential)
    } catch {
      // Linking errors are non-fatal — the user is already authenticated.
    }
    pendingGoogleCredential = null
  }

  await ensureUserProfile(user, user.displayName ?? undefined)
  return user
}

export async function signInWithGoogle(): Promise<User> {
  try {
    const { user } = await signInWithPopup(auth, googleProvider)
    await ensureUserProfile(user, user.displayName ?? undefined)
    return user
  } catch (error) {
    const authError = error as { code?: string }
    if (authError.code === 'auth/account-exists-with-different-credential') {
      // Store the credential so signInWithEmail can link it after the user
      // authenticates with their email/password.
      const credential = GoogleAuthProvider.credentialFromError(
        error as Parameters<typeof GoogleAuthProvider.credentialFromError>[0]
      )
      if (credential) pendingGoogleCredential = credential
    }
    throw error
  }
}

export async function signOut(): Promise<void> {
  pendingGoogleCredential = null
  await _signOut(auth)
}

export async function updateUserProfile(user: User, name: string): Promise<void> {
  await updateProfile(user, { displayName: name })
  // Reload forces Firebase to push the updated user through onAuthStateChanged
  // so the sidebar display name updates without requiring a page refresh.
  await user.reload()
  const ref = doc(db, 'users', user.uid)
  await setDoc(ref, { name, updatedAt: serverTimestamp() }, { merge: true })
}

export function getAuthErrorMessage(code: string | undefined): string {
  switch (code) {
    case 'auth/user-not-found':
    case 'auth/invalid-credential':
    case 'auth/invalid-login-credentials':
      return 'No account found with these credentials.'
    case 'auth/wrong-password':
      return 'Incorrect password. Please try again.'
    case 'auth/email-already-in-use':
      return 'An account with this email already exists. Please sign in.'
    case 'auth/account-exists-with-different-credential':
      return 'This email is registered with a different sign-in method. Please sign in with your email and password.'
    case 'auth/weak-password':
      return 'Password is too weak. Please choose a stronger password.'
    case 'auth/invalid-email':
      return 'Please enter a valid email address.'
    case 'auth/too-many-requests':
      return 'Too many attempts. Please try again later.'
    case 'auth/network-request-failed':
      return 'Network error. Please check your connection and try again.'
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return 'Sign-in was cancelled.'
    case 'auth/popup-blocked':
      return 'Pop-up was blocked by your browser. Please allow pop-ups and try again.'
    default:
      return 'Something went wrong. Please try again.'
  }
}
