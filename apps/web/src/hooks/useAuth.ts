// Re-export from AuthProvider so every call to useAuth() shares
// the single onAuthStateChanged subscription instead of creating its own.
export { useAuth } from '../providers/AuthProvider'
