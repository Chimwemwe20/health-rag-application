import { TRPCError, initTRPC } from '@trpc/server'

type Context = { uid: string | null }

const t = initTRPC.context<Context>().create()

export const router = t.router
export const publicProcedure = t.procedure
export const createCallerFactory = t.createCallerFactory
export const authedProcedure = t.procedure.use(
  t.middleware(({ ctx, next }) => {
    if (!ctx.uid) {
      throw new TRPCError({ code: 'UNAUTHORIZED' })
    }
    return next({ ctx })
  })
)
