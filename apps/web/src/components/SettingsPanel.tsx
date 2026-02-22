import { useState, useEffect } from 'react'
import { X, User, EnvelopeSimple, FloppyDisk } from '@phosphor-icons/react'
import type { User as FirebaseUser } from 'firebase/auth'
import { updateUserProfile } from '../lib/auth'
import { toast } from '@repo/ui/Toast'

// ─────────────────────────────────────────────────────────────────
// SettingsPanel — slide-in panel for updating personal details
// ─────────────────────────────────────────────────────────────────

export interface SettingsPanelProps {
  open: boolean
  onClose: () => void
  user: FirebaseUser | null
}

export function SettingsPanel({ open, onClose, user }: SettingsPanelProps) {
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)

  // Sync form when user changes or panel opens
  useEffect(() => {
    if (open && user) {
      setName(user.displayName || '')
    }
  }, [open, user])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return

    const trimmed = name.trim()
    if (!trimmed) {
      toast.error('Display name cannot be empty.')
      return
    }
    if (trimmed === user.displayName) {
      onClose()
      return
    }

    setSaving(true)
    try {
      await updateUserProfile(user, trimmed)
      toast.success('Profile updated successfully.')
      onClose()
    } catch {
      toast.error('Failed to update profile. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          aria-hidden
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      {/* Panel */}
      <aside
        className={[
          'fixed inset-y-0 right-0 z-50 flex w-80 flex-col border-l border-border bg-card shadow-xl',
          'transition-transform duration-300 ease-in-out',
          open ? 'translate-x-0' : 'translate-x-full',
        ].join(' ')}
      >
        {/* Header */}
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4">
          <h2 className="text-sm font-semibold text-foreground">Settings</h2>
          <button
            onClick={onClose}
            aria-label="Close settings"
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Section label */}
          <p className="mb-4 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Personal Details
          </p>

          <form id="settings-form" onSubmit={handleSave} className="space-y-4">
            {/* Display name */}
            <div className="space-y-1.5">
              <label
                htmlFor="settings-name"
                className="flex items-center gap-1.5 text-xs font-medium text-foreground"
              >
                <User size={12} className="text-muted-foreground" />
                Display Name
              </label>
              <input
                id="settings-name"
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Enter your name"
                maxLength={128}
                disabled={saving}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm text-foreground shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            {/* Email — read only */}
            <div className="space-y-1.5">
              <label
                htmlFor="settings-email"
                className="flex items-center gap-1.5 text-xs font-medium text-foreground"
              >
                <EnvelopeSimple size={12} className="text-muted-foreground" />
                Email
              </label>
              <input
                id="settings-email"
                type="email"
                value={user?.email ?? ''}
                readOnly
                className="flex h-9 w-full rounded-md border border-input bg-muted px-3 py-1 text-sm text-muted-foreground shadow-sm focus-visible:outline-none cursor-default select-none"
              />
              <p className="text-[10px] text-muted-foreground/70">Email cannot be changed here.</p>
            </div>
          </form>
        </div>

        {/* Footer — actions */}
        <div className="shrink-0 border-t border-border p-4 flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="settings-form"
            disabled={saving}
            className="flex flex-1 items-center justify-center gap-2 rounded-md gradient-cta px-3 py-2 text-sm font-medium text-white shadow-sm transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FloppyDisk size={13} weight="bold" />
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </aside>
    </>
  )
}
