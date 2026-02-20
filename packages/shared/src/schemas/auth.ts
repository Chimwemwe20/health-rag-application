import { z } from 'zod'

// Client-side sign-in validation (email + password presence check only —
// the backend/Firebase Auth enforces the actual credential rules).
export const SignInSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
})

// Client-side sign-up validation including confirm-password check.
// Mirrors CreateUserSchema password rules but adds confirmPassword.
export const SignUpSchema = z
  .object({
    name: z.string().min(2, 'Name must be at least 2 characters').max(128, 'Name is too long'),
    email: z.string().email('Please enter a valid email address'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
      .regex(/[0-9]/, 'Must contain at least one number'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine(data => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  })

export type SignIn = z.infer<typeof SignInSchema>
export type SignUp = z.infer<typeof SignUpSchema>
