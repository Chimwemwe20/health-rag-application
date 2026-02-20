import { useState } from 'react'
import { toast } from '@repo/ui/Toast'
import { signUpWithEmail, signInWithGoogle, getAuthErrorMessage } from '../lib/auth'

type Fields = {
  name: string
  email: string
  password: string
  confirmPassword: string
}
type Errors = Partial<Record<keyof Fields, string>>

function validate(f: Fields): Errors {
  const e: Errors = {}

  if (!f.name || f.name.trim().length < 2) e.name = 'Name must be at least 2 characters'
  else if (f.name.trim().length > 128) e.name = 'Name is too long'

  if (!f.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email))
    e.email = 'Please enter a valid email address'

  if (f.password.length < 8) e.password = 'Password must be at least 8 characters'
  else if (!/[A-Z]/.test(f.password)) e.password = 'Must contain at least one uppercase letter'
  else if (!/[0-9]/.test(f.password)) e.password = 'Must contain at least one number'

  if (!f.confirmPassword) e.confirmPassword = 'Please confirm your password'
  else if (f.password !== f.confirmPassword) e.confirmPassword = "Passwords don't match"

  return e
}

export function useSignUp(onSuccess?: () => void) {
  const [fields, setFields] = useState<Fields>({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [errors, setErrors] = useState<Errors>({})
  const [serverError, setServerError] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  function update(key: keyof Fields, value: string) {
    setFields(f => ({ ...f, [key]: value }))
    setErrors(e => ({ ...e, [key]: undefined }))
    if (serverError) setServerError('')
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const errs = validate(fields)
    if (Object.keys(errs).length) {
      setErrors(errs)
      return
    }
    setErrors({})
    setServerError('')
    setLoading(true)
    try {
      await signUpWithEmail(fields.email, fields.password, fields.name.trim())
      toast.success('Account created! Welcome to GlucoAI.')
      onSuccess?.()
    } catch (err) {
      setServerError(getAuthErrorMessage((err as { code?: string }).code))
    } finally {
      setLoading(false)
    }
  }

  async function googleSignIn() {
    setServerError('')
    setGoogleLoading(true)
    try {
      await signInWithGoogle()
      toast.success('Welcome to GlucoAI!')
      onSuccess?.()
    } catch (err) {
      setServerError(getAuthErrorMessage((err as { code?: string }).code))
    } finally {
      setGoogleLoading(false)
    }
  }

  return { fields, errors, serverError, loading, googleLoading, update, submit, googleSignIn }
}
