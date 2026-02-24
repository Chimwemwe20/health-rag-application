import { onRequest } from 'firebase-functions/v2/https'
import { createHTTPHandler } from '@trpc/server/adapters/standalone'
import { appRouter } from './trpc/router.js'

export type { AppRouter } from './trpc/router.js'

const ALLOWED_ORIGINS = [
  'https://health-lifeline-53fb3.web.app',
  'https://health-lifeline-53fb3.firebaseapp.com',
  'http://localhost:5173',
]

const handler = createHTTPHandler({
  router: appRouter,
  createContext: () => ({}),
})

export const api = onRequest(
  {
    region: 'europe-west2',
    invoker: 'public',
  },
  (req, res) => {
    const origin = req.headers.origin
    if (origin && ALLOWED_ORIGINS.includes(origin)) {
      res.set('Access-Control-Allow-Origin', origin)
    }
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-trpc-source')
    res.set('Access-Control-Max-Age', '3600')

    if (req.method === 'OPTIONS') {
      res.status(204).send('')
      return
    }

    handler(req, res)
  }
)
