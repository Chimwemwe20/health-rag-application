import { describe, it, expect } from 'vitest'
import { UserSchema, CreateUserSchema } from './user'

describe('UserSchema', () => {
  it('validates correct user data', () => {
    const result = UserSchema.safeParse({
      uid: '123',
      email: 'test@example.com',
      name: 'Test User',
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    expect(result.success).toBe(true)
  })

  it('rejects missing uid', () => {
    const result = UserSchema.safeParse({
      email: 'test@example.com',
      name: 'Test User',
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid email', () => {
    const result = UserSchema.safeParse({
      uid: '123',
      email: 'invalid-email',
      name: 'Test User',
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    expect(result.success).toBe(false)
  })

  it('allows optional name', () => {
    const result = UserSchema.safeParse({
      uid: '123',
      email: 'test@example.com',
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    expect(result.success).toBe(true)
  })
})

describe('CreateUserSchema', () => {
  it('validates user creation input', () => {
    const result = CreateUserSchema.safeParse({
      email: 'new@example.com',
      password: 'Password1',
      name: 'New User',
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid email on creation', () => {
    const result = CreateUserSchema.safeParse({
      email: 'bad-email',
      password: 'Password1',
      name: 'New User',
    })
    expect(result.success).toBe(false)
  })

  it('requires email', () => {
    const result = CreateUserSchema.safeParse({
      password: 'Password1',
      name: 'New User',
    })
    expect(result.success).toBe(false)
  })
})
