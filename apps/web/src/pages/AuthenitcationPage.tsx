import { useState } from 'react'
import {
  Heartbeat,
  EnvelopeSimple,
  LockSimple,
  Eye,
  EyeSlash,
  User,
  ArrowLeft,
  ShieldCheck,
  CheckCircle,
  Drop,
  Brain,
  Warning,
  Sun,
  Moon,
} from '@phosphor-icons/react'
import { useNavigate } from 'react-router-dom'
import { useTheme } from '../hooks/useTheme'
import { Button } from '@repo/ui/Button'
import { Card, CardContent } from '@repo/ui/Card'
import { Input } from '@repo/ui/Input'
import { Label } from '@repo/ui/Label'
import { useSignIn } from '../hooks/useSignIn'
import { useSignUp } from '../hooks/useSignUp'

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────

type AuthMode = 'signin' | 'signup'

// ─────────────────────────────────────────────────────────────────
// Brand Panel (desktop left side)
// ─────────────────────────────────────────────────────────────────

function BrandPanel() {
  return (
    <div className="relative hidden lg:flex lg:w-[44%] flex-col justify-between gradient-hero p-12 text-white overflow-hidden">
      {/* Decorative blobs */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -right-24 h-80 w-80 rounded-full bg-white/5 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-16 -left-24 h-80 w-80 rounded-full bg-white/5 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute top-1/2 right-0 h-48 w-48 rounded-full bg-brand-teal/10 blur-2xl"
      />

      {/* Logo */}
      <div className="relative flex items-center gap-2.5 font-bold">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 shadow backdrop-blur-sm">
          <Heartbeat size={20} weight="bold" className="text-white" />
        </div>
        <span className="text-xl tracking-tight">GlucoAI</span>
      </div>

      {/* Tagline + features */}
      <div className="relative space-y-8">
        <div className="space-y-3">
          <h2 className="text-3xl font-extrabold leading-[1.15] tracking-tight">
            Your AI-powered
            <br />
            diabetes companion
          </h2>
          <p className="max-w-xs text-base leading-relaxed text-white/70">
            Evidence-based answers to all your diabetes questions—instantly, securely, and always
            available.
          </p>
        </div>

        <ul className="space-y-3">
          {[
            { icon: Brain, text: 'RAG-powered medical Q&A' },
            { icon: Drop, text: 'Personalised glucose insights' },
            { icon: ShieldCheck, text: 'Privacy-first & HIPAA-aware' },
          ].map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-center gap-3 text-sm text-white/85">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/20">
                <Icon size={13} weight="bold" />
              </div>
              {text}
            </li>
          ))}
        </ul>
      </div>

      {/* Trust badge */}
      <div className="relative">
        <div className="glass-card rounded-xl p-4 space-y-1">
          <div className="flex items-center gap-2">
            <CheckCircle size={15} weight="fill" className="text-brand-mint" />
            <span className="text-xs font-semibold text-white/90">HIPAA-aware practices</span>
          </div>
          <p className="pl-5 text-xs leading-relaxed text-white/55">
            Your health data is encrypted end-to-end and never sold to third parties.
          </p>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// Tab Switcher
// ─────────────────────────────────────────────────────────────────

function TabSwitcher({
  mode,
  onModeChange,
}: {
  mode: AuthMode
  onModeChange: (m: AuthMode) => void
}) {
  return (
    <div className="flex rounded-lg bg-muted p-1 gap-1">
      {(
        [
          { key: 'signin', label: 'Sign In' },
          { key: 'signup', label: 'Create Account' },
        ] as const
      ).map(({ key, label }) => (
        <button
          key={key}
          type="button"
          onClick={() => onModeChange(key)}
          className={[
            'flex-1 rounded-md px-4 py-2 text-sm font-medium transition-all duration-200',
            mode === key
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
          ].join(' ')}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// Shared sub-components
// ─────────────────────────────────────────────────────────────────

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/8 px-3.5 py-3">
      <Warning size={15} weight="bold" className="mt-0.5 shrink-0 text-destructive" />
      <p className="text-sm leading-snug text-destructive">{message}</p>
    </div>
  )
}

function FieldGroup({
  id,
  label,
  error,
  hint,
  children,
}: {
  id: string
  label: string
  error?: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
      </Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

function PasswordInput({
  id,
  value,
  onChange,
  placeholder,
  autoComplete = 'current-password',
}: {
  id: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  autoComplete?: string
}) {
  const [show, setShow] = useState(false)

  return (
    <div className="relative">
      <LockSimple
        size={15}
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
      />
      <Input
        id={id}
        type={show ? 'text' : 'password'}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder ?? 'Enter password'}
        className="pl-9 pr-10"
        autoComplete={autoComplete}
      />
      <button
        type="button"
        onClick={() => setShow(s => !s)}
        aria-label={show ? 'Hide password' : 'Show password'}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
      >
        {show ? <EyeSlash size={15} /> : <Eye size={15} />}
      </button>
    </div>
  )
}

function GoogleButton({ loading, onClick }: { loading: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      disabled={loading}
      onClick={onClick}
      className="flex w-full items-center justify-center gap-3 rounded-md border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
    >
      <svg width="17" height="17" viewBox="0 0 18 18" aria-hidden="true">
        <path
          fill="#4285F4"
          d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 002.38-5.88c0-.57-.05-.66-.15-1.18z"
        />
        <path
          fill="#34A853"
          d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2.04c-.72.48-1.64.76-2.7.76-2.08 0-3.84-1.4-4.47-3.29H1.84v2.08A8 8 0 008.98 17z"
        />
        <path
          fill="#FBBC05"
          d="M4.51 10.49A4.8 4.8 0 014.26 9c0-.52.09-1.02.25-1.49V5.43H1.84A8 8 0 001 9c0 1.3.31 2.52.84 3.57l2.67-2.08z"
        />
        <path
          fill="#EA4335"
          d="M8.98 3.72c1.17 0 2.23.4 3.06 1.2l2.3-2.3A7.99 7.99 0 008.98 1a8 8 0 00-7.14 4.43l2.67 2.08c.63-1.89 2.39-3.3 4.47-3.3z"
        />
      </svg>
      Continue with Google
    </button>
  )
}

function OrDivider() {
  return (
    <div className="relative flex items-center gap-3">
      <div className="flex-1 border-t border-border" />
      <span className="text-xs font-medium text-muted-foreground">OR</span>
      <div className="flex-1 border-t border-border" />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// Sign In Form
// ─────────────────────────────────────────────────────────────────

function SignInForm({ onSuccess }: { onSuccess?: () => void }) {
  const { fields, errors, serverError, loading, googleLoading, update, submit, googleSignIn } =
    useSignIn(onSuccess)

  return (
    <div className="space-y-4">
      <GoogleButton loading={googleLoading} onClick={googleSignIn} />
      <OrDivider />

      <form onSubmit={submit} noValidate className="space-y-4">
        {serverError && <ErrorBanner message={serverError} />}

        <FieldGroup id="signin-email" label="Email address" error={errors.email}>
          <div className="relative">
            <EnvelopeSimple
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              id="signin-email"
              type="email"
              value={fields.email}
              onChange={e => update('email', e.target.value)}
              placeholder="you@example.com"
              className="pl-9"
              autoComplete="email"
            />
          </div>
        </FieldGroup>

        <FieldGroup id="signin-password" label="Password" error={errors.password}>
          <PasswordInput
            id="signin-password"
            value={fields.password}
            onChange={v => update('password', v)}
            placeholder="Your password"
            autoComplete="current-password"
          />
          <div className="flex justify-end pt-0.5">
            <button
              type="button"
              className="text-xs font-medium text-brand-teal transition-colors hover:text-brand-teal/75"
            >
              Forgot password?
            </button>
          </div>
        </FieldGroup>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Signing in…' : 'Sign In'}
        </Button>
      </form>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// Sign Up Form
// ─────────────────────────────────────────────────────────────────

function SignUpForm({ onSuccess }: { onSuccess?: () => void }) {
  const { fields, errors, serverError, loading, googleLoading, update, submit, googleSignIn } =
    useSignUp(onSuccess)

  return (
    <div className="space-y-4">
      <GoogleButton loading={googleLoading} onClick={googleSignIn} />
      <OrDivider />

      <form onSubmit={submit} noValidate className="space-y-4">
        {serverError && <ErrorBanner message={serverError} />}

        <FieldGroup id="signup-name" label="Full name" error={errors.name}>
          <div className="relative">
            <User
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              id="signup-name"
              type="text"
              value={fields.name}
              onChange={e => update('name', e.target.value)}
              placeholder="Jane Smith"
              className="pl-9"
              autoComplete="name"
            />
          </div>
        </FieldGroup>

        <FieldGroup id="signup-email" label="Email address" error={errors.email}>
          <div className="relative">
            <EnvelopeSimple
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              id="signup-email"
              type="email"
              value={fields.email}
              onChange={e => update('email', e.target.value)}
              placeholder="you@example.com"
              className="pl-9"
              autoComplete="email"
            />
          </div>
        </FieldGroup>

        <FieldGroup
          id="signup-password"
          label="Password"
          error={errors.password}
          hint="At least 8 characters, one uppercase letter, and one number."
        >
          <PasswordInput
            id="signup-password"
            value={fields.password}
            onChange={v => update('password', v)}
            placeholder="Min. 8 characters"
            autoComplete="new-password"
          />
        </FieldGroup>

        <FieldGroup id="signup-confirm" label="Confirm password" error={errors.confirmPassword}>
          <PasswordInput
            id="signup-confirm"
            value={fields.confirmPassword}
            onChange={v => update('confirmPassword', v)}
            placeholder="Repeat your password"
            autoComplete="new-password"
          />
        </FieldGroup>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Creating account…' : 'Create Account'}
        </Button>

        <p className="text-center text-xs leading-relaxed text-muted-foreground">
          By creating an account you agree to our{' '}
          <button
            type="button"
            className="font-medium text-brand-teal transition-colors hover:text-brand-teal/75"
          >
            Terms of Service
          </button>{' '}
          and{' '}
          <button
            type="button"
            className="font-medium text-brand-teal transition-colors hover:text-brand-teal/75"
          >
            Privacy Policy
          </button>
          .
        </p>
      </form>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// Page Root
// ─────────────────────────────────────────────────────────────────

export function AuthenitcationPage() {
  const [mode, setMode] = useState<AuthMode>('signin')
  const { theme, toggle } = useTheme()
  const navigate = useNavigate()

  const handleAuthSuccess = () => navigate('/new-chat')
  const handleBackToLanding = () => navigate('/')

  return (
    <div className="min-h-screen flex bg-background">
      <BrandPanel />

      {/* Right: form panel */}
      <div className="flex flex-1 flex-col">
        {/* Top bar */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 lg:px-10 lg:pt-8">
          {/* Mobile-only logo */}
          <a
            href="#"
            onClick={e => {
              e.preventDefault()
              handleBackToLanding()
            }}
            className="flex items-center gap-2 font-bold text-foreground lg:invisible"
            aria-label="GlucoAI home"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-lg gradient-cta shadow-sm">
              <Heartbeat size={15} weight="bold" className="text-white" />
            </div>
            <span className="text-base">GlucoAI</span>
          </a>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggle}
              aria-label="Toggle theme"
              className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
            </button>

            <button
              type="button"
              onClick={handleBackToLanding}
              className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft size={14} weight="bold" />
              Back to home
            </button>
          </div>
        </div>

        {/* Centered form */}
        <div className="flex flex-1 items-center justify-center px-6 pb-12 lg:px-10">
          <div className="w-full max-w-sm space-y-5 animate-fade-up">
            {/* Heading */}
            <div className="space-y-1">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                {mode === 'signin' ? 'Welcome back' : 'Create your account'}
              </h1>
              <p className="text-sm text-muted-foreground">
                {mode === 'signin'
                  ? 'Sign in to access your GlucoAI dashboard.'
                  : 'Join GlucoAI for evidence-based diabetes support.'}
              </p>
            </div>

            {/* Card */}
            <Card className="border-border shadow-sm">
              <CardContent className="space-y-5 p-6">
                <TabSwitcher mode={mode} onModeChange={setMode} />

                {mode === 'signin' ? (
                  <SignInForm onSuccess={handleAuthSuccess} />
                ) : (
                  <SignUpForm onSuccess={handleAuthSuccess} />
                )}
              </CardContent>
            </Card>

            {/* Mode switch link */}
            <p className="text-center text-sm text-muted-foreground">
              {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
              <button
                type="button"
                onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
                className="font-semibold text-brand-teal transition-colors hover:text-brand-teal/75"
              >
                {mode === 'signin' ? 'Create one' : 'Sign in'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
