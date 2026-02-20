import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AuthProvider } from './providers/AuthProvider'
import { QueryProvider } from './providers/QueryProvider'
import { App } from './App'
import './style.css'

createRoot(document.getElementById('app')!).render(
  <StrictMode>
    <AuthProvider>
      <QueryProvider>
        <App />
      </QueryProvider>
    </AuthProvider>
  </StrictMode>
)
