import { createTRPCReact } from '@trpc/react-query'
import { httpBatchLink } from '@trpc/client'
import type { AppRouter } from '@repo/functions/router'

export const trpc = createTRPCReact<AppRouter>()

const env = import.meta.env as unknown as Record<string, string | undefined>
const project = env.VITE_FIREBASE_PROJECT_ID ?? 'health-lifeline-53fb3'
const region = env.VITE_FIREBASE_REGION ?? 'europe-west2'
const port = env.VITE_FUNCTIONS_PORT ?? '5001'
const defaultUrl = `http://127.0.0.1:${port}/${project}/${region}/api`

export const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: env.VITE_API_URL ?? defaultUrl,
    }),
  ],
})
