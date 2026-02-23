import { onRequest } from 'firebase-functions/v2/https'
import { createHTTPHandler } from '@trpc/server/adapters/standalone'
import { appRouter } from './trpc/router.js'

export type { AppRouter } from './trpc/router.js'

const handler = createHTTPHandler({
  router: appRouter,
  createContext: () => ({}),
})

const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'https://health-lifeline-53fb3.web.app',
  'https://health-lifeline-53fb3.firebaseapp.com',
]

export const api = onRequest({ region: 'europe-west2' }, (req, res) => {
  const origin = req.headers.origin ?? ''
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.set('Access-Control-Allow-Origin', origin)
  }
  res.set('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    res.status(204).send('')
    return
  }

  handler(req, res)
})
