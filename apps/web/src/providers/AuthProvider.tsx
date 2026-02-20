import { createContext, useContext, useState, useEffect } from 'react'
import { onAuthStateChanged, type User } from 'firebase/auth'
import { auth } from '../lib/firebase'

interface AuthContextValue {
  user: User | null
  /** true until Firebase has resolved the initial session */
  loading: boolean
}

const AuthContext = createContext<AuthContextValue>({ user: null, loading: true })

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Single subscription for the entire app — components consume via useAuth()
    return onAuthStateChanged(auth, u => {
      setUser(u)
      setLoading(false)
    })
  }, [])

  return <AuthContext.Provider value={{ user, loading }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
