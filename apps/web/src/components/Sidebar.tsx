import { useState } from 'react'
import {
  Heartbeat,
  Plus,
  MagnifyingGlass,
  ChatCircle,
  Gear,
  SignOut,
  X,
  Sun,
  Moon,
  Check,
} from '@phosphor-icons/react'
import type { User } from 'firebase/auth'
import type { Conversation } from '../types/chat'
import { PencilSimple, Trash } from '@phosphor-icons/react'
import { toast } from '@repo/ui/Toast'
import { renameConversation, softDeleteConversation } from '../lib/conversations'

// ─────────────────────────────────────────────────────────────────
// User avatar — initials circle using gradient-cta from style.css
// ─────────────────────────────────────────────────────────────────

function UserAvatar({ user }: { user: User }) {
  const letter = (user.displayName?.[0] || user.email?.[0] || '?').toUpperCase()
  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full gradient-cta text-xs font-bold text-white shadow-sm">
      {letter}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// Conversation item
// ─────────────────────────────────────────────────────────────────

function ConversationItem({
  conv,
  active,
  onSelect,
  beginRename,
  beginDelete,
}: {
  conv: Conversation
  active: boolean
  onSelect: () => void
  beginRename: () => void
  beginDelete: () => void
}) {
  const mins = Math.floor((Date.now() - conv.updatedAt.getTime()) / 60_000)
  let timeLabel: string
  if (mins < 1) timeLabel = 'just now'
  else if (mins < 60) timeLabel = `${mins}m ago`
  else if (mins < 1440) timeLabel = `${Math.floor(mins / 60)}h ago`
  else if (mins < 2880) timeLabel = 'yesterday'
  else timeLabel = `${Math.floor(mins / 1440)}d ago`

  return (
    <div
      className={[
        'group flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-2 transition-colors duration-150',
        active
          ? 'bg-muted text-foreground'
          : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
      ].join(' ')}
    >
      <button onClick={onSelect} className="flex min-w-0 flex-col text-left">
        <span className="truncate text-xs font-medium leading-snug">{conv.title}</span>
        <span className="text-[10px] opacity-50">{timeLabel}</span>
      </button>
      <div className="ml-2 hidden shrink-0 items-center gap-1.5 group-hover:flex">
        <button
          aria-label="Rename"
          onClick={beginRename}
          className="flex h-6 w-6 items-center justify-center rounded-md hover:bg-muted/80"
        >
          <PencilSimple size={12} />
        </button>
        <button
          aria-label="Delete"
          onClick={beginDelete}
          className="flex h-6 w-6 items-center justify-center rounded-md hover:bg-destructive/10 text-destructive"
        >
          <Trash size={12} />
        </button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// Empty conversations state
// ─────────────────────────────────────────────────────────────────

function NoConversations() {
  return (
    <div className="flex flex-col items-center gap-2 py-10 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
        <ChatCircle size={18} weight="duotone" className="text-muted-foreground" />
      </div>
      <p className="text-xs font-medium text-muted-foreground">No conversations yet</p>
      <p className="text-[10px] text-muted-foreground/60">Start a new chat to get going</p>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// Sidebar
// ─────────────────────────────────────────────────────────────────

export interface SidebarProps {
  open: boolean
  onClose: () => void
  theme: string
  onToggleTheme: () => void
  conversations: Conversation[]
  activeConvId: string | null
  onSelectConv: (id: string) => void
  onNewChat: () => void
  onSignOut: () => void
  onOpenSettings: () => void
  user: User | null
}

export function Sidebar({
  open,
  onClose,
  theme,
  onToggleTheme,
  conversations,
  activeConvId,
  onSelectConv,
  onNewChat,
  onSignOut,
  onOpenSettings,
  user,
}: SidebarProps) {
  const [search, setSearch] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const filtered = conversations.filter(c => c.title.toLowerCase().includes(search.toLowerCase()))

  return (
    <>
      {/* Mobile overlay — uses backdrop from style.css blur support */}
      {open && (
        <div
          aria-hidden
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={[
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-border bg-card',
          'transition-transform duration-300 ease-in-out',
          'lg:relative lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
      >
        {/* ── Header ── */}
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4">
          <a
            href="#"
            onClick={e => e.preventDefault()}
            className="flex items-center gap-2 font-bold text-foreground"
          >
            {/* gradient-cta from style.css */}
            <div className="flex h-7 w-7 items-center justify-center rounded-lg gradient-cta shadow-sm">
              <Heartbeat size={14} weight="bold" className="text-white" />
            </div>
            <span className="text-sm tracking-tight">GlucoAI</span>
          </a>

          <div className="flex items-center gap-1">
            <button
              onClick={onToggleTheme}
              aria-label="Toggle theme"
              className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {theme === 'dark' ? <Sun size={13} /> : <Moon size={13} />}
            </button>

            {/* Mobile close */}
            <button
              onClick={onClose}
              aria-label="Close sidebar"
              className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:hidden"
            >
              <X size={13} />
            </button>
          </div>
        </div>

        {/* ── New Chat ── */}
        <div className="shrink-0 p-3">
          <button
            onClick={() => {
              onNewChat()
              onClose()
            }}
            className="flex w-full items-center gap-2.5 rounded-md border border-border bg-background px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            <Plus size={14} weight="bold" className="shrink-0 text-brand-teal" />
            New Chat
          </button>
        </div>

        {/* ── Search ── */}
        <div className="shrink-0 px-3 pb-2">
          <div className="relative">
            <MagnifyingGlass
              size={12}
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              type="search"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search chats…"
              className="w-full rounded-md border border-input bg-background py-2 pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        {/* ── Conversation list ── */}
        <div className="flex-1 overflow-y-auto px-2 pb-2">
          {filtered.length > 0 ? (
            <>
              <p className="px-2 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Recent
              </p>
              {filtered.map(conv =>
                editingId === conv.id ? (
                  <div
                    key={conv.id}
                    className={[
                      'flex items-center gap-2 rounded-md px-2.5 py-2',
                      activeConvId === conv.id ? 'bg-muted' : 'hover:bg-muted/60',
                    ].join(' ')}
                  >
                    <input
                      value={editValue}
                      onChange={e => setEditValue(e.target.value)}
                      className="flex-1 rounded-md border border-input bg-background px-2 py-1 text-xs"
                      autoFocus
                      maxLength={256}
                      placeholder="Chat name"
                    />
                    <button
                      disabled={!editValue.trim() || busyId === conv.id}
                      onClick={async () => {
                        const title = editValue.trim()
                        if (!title) return
                        setBusyId(conv.id)
                        try {
                          await renameConversation(conv.id, title)
                          setEditingId(null)
                        } catch (e: unknown) {
                          const msg =
                            e instanceof Error ? e.message : 'Unable to rename conversation.'
                          toast.error(msg)
                        } finally {
                          setBusyId(null)
                        }
                      }}
                      className="flex h-6 w-6 items-center justify-center rounded-md hover:bg-muted/80 disabled:opacity-50"
                      aria-label="Save"
                    >
                      <Check size={12} />
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="flex h-6 w-6 items-center justify-center rounded-md hover:bg-muted/80"
                      aria-label="Cancel"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ) : deletingId === conv.id ? (
                  <div
                    key={conv.id}
                    className={[
                      'flex items-center justify-between gap-2 rounded-md px-2.5 py-2 text-sm',
                      activeConvId === conv.id ? 'bg-muted' : 'hover:bg-muted/60',
                    ].join(' ')}
                  >
                    <span className="text-[11px] text-muted-foreground">Delete this chat?</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        disabled={busyId === conv.id}
                        onClick={async () => {
                          setBusyId(conv.id)
                          try {
                            await softDeleteConversation(conv.id)
                          } catch (e: unknown) {
                            const msg =
                              e instanceof Error ? e.message : 'Unable to delete conversation.'
                            toast.error(msg)
                          } finally {
                            setBusyId(null)
                            setDeletingId(null)
                          }
                        }}
                        className="rounded-md bg-destructive/10 px-2 py-1 text-[11px] text-destructive hover:bg-destructive/20 disabled:opacity-50"
                      >
                        Delete
                      </button>
                      <button
                        onClick={() => setDeletingId(null)}
                        className="rounded-md px-2 py-1 text-[11px] hover:bg-muted/80"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <ConversationItem
                    key={conv.id}
                    conv={conv}
                    active={activeConvId === conv.id}
                    onSelect={() => {
                      onSelectConv(conv.id)
                      onClose()
                    }}
                    beginRename={() => {
                      setEditingId(conv.id)
                      setEditValue(conv.title)
                    }}
                    beginDelete={() => setDeletingId(conv.id)}
                  />
                )
              )}
            </>
          ) : conversations.length > 0 ? (
            // Conversations exist but search matched nothing
            <div className="flex flex-col items-center gap-1 py-8 text-center">
              <p className="text-xs text-muted-foreground">No results for "{search}"</p>
            </div>
          ) : (
            <NoConversations />
          )}
        </div>

        {/* ── Footer ── */}
        <div className="shrink-0 border-t border-border p-3 space-y-0.5">
          <button
            onClick={onOpenSettings}
            className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Gear size={14} />
            Settings
          </button>

          {user && (
            <div className="flex items-center gap-2.5 rounded-md px-2.5 py-1.5">
              <UserAvatar user={user} />
              <div className="flex-1 min-w-0">
                <p className="truncate text-xs font-medium text-foreground">
                  {user.displayName || user.email?.split('@')[0]}
                </p>
                <p className="truncate text-[10px] text-muted-foreground">{user.email}</p>
              </div>
              <button
                onClick={onSignOut}
                aria-label="Sign out"
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
              >
                <SignOut size={13} />
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  )
}
