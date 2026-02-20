import { z } from 'zod'

// Full Firestore users/{uid} document schema.
// Mirrors the security rules:
//   uid        — Firebase Auth UID, immutable
//   email      — immutable after creation
//   name       — optional, mutable (max 128 chars)
//   createdAt  — server timestamp, immutable
//   updatedAt  — server timestamp, updated on every write
export const UserSchema = z.object({
  uid: z.string().min(1),
  email: z.string().email(),
  name: z.string().min(1).max(128).optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

// Payload for creating a new user.
// uid & timestamps are set server-side; password is passed to Firebase Auth.
export const CreateUserSchema = z.object({
  email: z.string().email(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Must contain at least one number'),
  name: z.string().min(1).max(128).optional(),
})

export type User = z.infer<typeof UserSchema>
export type CreateUser = z.infer<typeof CreateUserSchema>
