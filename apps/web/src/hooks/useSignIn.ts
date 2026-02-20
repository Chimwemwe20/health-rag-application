import { useState } from 'react'
import { toast } from '@repo/ui/Toast'
import { signInWithEmail, signInWithGoogle, getAuthErrorMessage } from '../lib/auth'

type Fields = { email: string; password: string }
type Errors = Partial<Record<keyof Fields, string>>

function validate(f: Fields): Errors {
  const e: Errors = {}
  if (!f.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email))
    e.email = 'Please enter a valid email address'
  if (!f.password) e.password = 'Password is required'
  return e
}

export function useSignIn(onSuccess?: () => void) {
  const [fields, setFields] = useState<Fields>({ email: '', password: '' })
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
      await signInWithEmail(fields.email, fields.password)
      toast.success('Welcome back!')
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
      toast.success('Welcome back!')
      onSuccess?.()
    } catch (err) {
      setServerError(getAuthErrorMessage((err as { code?: string }).code))
    } finally {
      setGoogleLoading(false)
    }
  }

  return { fields, errors, serverError, loading, googleLoading, update, submit, googleSignIn }
}
