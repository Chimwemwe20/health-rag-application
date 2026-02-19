import { onRequest } from 'firebase-functions/v2/https'
import { createHTTPHandler } from '@trpc/server/adapters/standalone'
import { appRouter } from './trpc/router.js'

export type { AppRouter } from './trpc/router.js'

const handler = createHTTPHandler({
  router: appRouter,
  createContext: () => ({}),
})

export const api = onRequest({ region: 'europe-west2' }, (req, res) => {
  handler(req, res)
})
