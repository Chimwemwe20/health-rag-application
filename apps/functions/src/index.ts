import { onRequest } from 'firebase-functions/v2/https'
import { createHTTPHandler } from '@trpc/server/adapters/standalone'
import { appRouter } from './trpc/router.js'
import { getAuth } from 'firebase-admin/auth'

export type { AppRouter } from './trpc/router.js'

const handler = createHTTPHandler({
  router: appRouter,
  async createContext({ req }) {
    const header = req.headers.authorization
    let uid: string | null = null
    if (header && header.startsWith('Bearer ')) {
      const token = header.slice(7)
      try {
        const decoded = await getAuth().verifyIdToken(token)
        uid = decoded.uid
      } catch {
        uid = null
      }
    }
    return { uid }
  },
})

export const api = onRequest({ region: 'europe-west2' }, (req, res) => {
  handler(req, res)
})
