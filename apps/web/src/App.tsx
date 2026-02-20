import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Heartbeat } from '@phosphor-icons/react'
import { Toaster } from '@repo/ui/Toast'
import { useAuth } from './hooks/useAuth'
import { LandingPage } from './pages/LandingPage'
import { AuthenitcationPage } from './pages/AuthenitcationPage'
import { ChatPage } from './pages/ChatPage'
import './style.css'

// ─────────────────────────────────────────────────────────────────
// Loading screen — shown while Firebase resolves the initial session
// ─────────────────────────────────────────────────────────────────

function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        {/* gradient-cta from style.css */}
        <div className="flex h-12 w-12 items-center justify-center rounded-xl gradient-cta shadow-lg animate-float">
          <Heartbeat size={24} weight="bold" className="text-white" />
        </div>
        <p className="animate-pulse text-sm text-muted-foreground">Loading…</p>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// Route guards
// ─────────────────────────────────────────────────────────────────

/** Redirects to /new-chat if the user is already authenticated. */
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (user) return <Navigate to="/new-chat" replace />
  return <>{children}</>
}

/** Redirects to /authentication if the user is not authenticated. */
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (!user) return <Navigate to="/authentication" replace />
  return <>{children}</>
}

// ─────────────────────────────────────────────────────────────────
// Router
// ─────────────────────────────────────────────────────────────────

function Router() {
  return (
    <Routes>
      {/* Public routes — redirect to /new-chat if already signed in */}
      <Route
        path="/"
        element={
          <PublicRoute>
            <LandingPage />
          </PublicRoute>
        }
      />
      <Route
        path="/authentication"
        element={
          <PublicRoute>
            <AuthenitcationPage />
          </PublicRoute>
        }
      />

      {/* Protected routes — redirect to /authentication if not signed in */}
      <Route
        path="/new-chat"
        element={
          <ProtectedRoute>
            <ChatPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/chat/:conversationId"
        element={
          <ProtectedRoute>
            <ChatPage />
          </ProtectedRoute>
        }
      />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

// ─────────────────────────────────────────────────────────────────
// App root
// ─────────────────────────────────────────────────────────────────

export function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" richColors />
      <Router />
    </BrowserRouter>
  )
}
