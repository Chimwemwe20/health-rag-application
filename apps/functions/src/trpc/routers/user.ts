import { z } from 'zod'
import { router, publicProcedure } from '../trpc.js'
import { CreateUserSchema, UserSchema } from '@repo/shared'

export const userRouter = router({
  create: publicProcedure
    .input(CreateUserSchema)
    .output(UserSchema)
    .mutation(({ input }) => ({
      uid: 'dummy-id',
      email: input.email,
      name: input.name,
      createdAt: new Date(),
      updatedAt: new Date(),
    })),

  getById: publicProcedure
    .input(z.string())
    .output(UserSchema)
    .query(({ input }) => ({
      uid: input,
      email: 'test@example.com',
      name: 'Test User',
      createdAt: new Date(),
      updatedAt: new Date(),
    })),

  list: publicProcedure.output(z.array(UserSchema)).query(() => {
    const now = new Date()
    return [
      {
        uid: 'user-1',
        email: 'user1@example.com',
        name: 'User One',
        createdAt: now,
        updatedAt: now,
      },
      {
        uid: 'user-2',
        email: 'user2@example.com',
        name: 'User Two',
        createdAt: now,
        updatedAt: now,
      },
    ]
  }),
})
