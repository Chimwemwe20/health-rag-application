import { useState, useRef } from 'react'
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
  PencilSimple,
  Trash,
  Check,
  SpinnerGap,
} from '@phosphor-icons/react'
import type { User } from 'firebase/auth'
import type { Conversation } from '../types/chat'

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
// Skeleton loading list
// ─────────────────────────────────────────────────────────────────

function SidebarSkeletonList() {
  const widths = [62, 80, 48, 72, 55, 68, 42, 76, 58, 65]
  return (
    <div className="flex flex-col gap-0.5 px-2 py-1" aria-hidden>
      <div className="px-2 pb-1 pt-1">
        <div className="h-2.5 w-10 animate-pulse rounded-full bg-muted" />
      </div>
      {widths.map((pct, i) => (
        <div
          key={i}
          className="flex flex-col gap-1.5 rounded-md px-2.5 py-2"
          style={{ animationDelay: `${i * 50}ms` }}
        >
          <div className="h-2.5 animate-pulse rounded-full bg-muted" style={{ width: `${pct}%` }} />
          <div className="h-2 w-12 animate-pulse rounded-full bg-muted/50" />
        </div>
      ))}
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
  onRename,
  onDelete,
}: {
  conv: Conversation
  active: boolean
  onSelect: () => void
  onRename: (id: string, title: string) => Promise<void>
  onDelete: (id: string) => Promise<void>
}) {
  const mins = Math.floor((Date.now() - conv.updatedAt.getTime()) / 60_000)
  let timeLabel: string
  if (mins < 1) timeLabel = 'just now'
  else if (mins < 60) timeLabel = `${mins}m ago`
  else if (mins < 1440) timeLabel = `${Math.floor(mins / 60)}h ago`
  else if (mins < 2880) timeLabel = 'yesterday'
  else timeLabel = `${Math.floor(mins / 1440)}d ago`

  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState(conv.title)
  const [confirming, setConfirming] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function startEdit(e: React.MouseEvent) {
    e.stopPropagation()
    setEditValue(conv.title)
    setEditing(true)
    setConfirming(false)
    setTimeout(() => inputRef.current?.select(), 0)
  }

  async function commitRename() {
    const trimmed = editValue.trim()
    if (trimmed && trimmed !== conv.title) await onRename(conv.id, trimmed)
    setEditing(false)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      void commitRename()
    } else if (e.key === 'Escape') {
      setEditing(false)
    }
  }

  function startDelete(e: React.MouseEvent) {
    e.stopPropagation()
    setConfirming(true)
  }

  // ── render ──────────────────────────────────────────────────────

  if (editing) {
    return (
      <div
        className={[
          'flex w-full items-center gap-1 rounded-md px-2.5 py-2',
          active ? 'bg-muted' : 'bg-muted/60',
        ].join(' ')}
      >
        <input
          ref={inputRef}
          value={editValue}
          onChange={e => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={commitRename}
          autoFocus
          className="flex-1 min-w-0 rounded border border-ring bg-background px-1.5 py-0.5 text-xs text-foreground outline-none focus:ring-1 focus:ring-ring"
        />
        <button
          onMouseDown={e => {
            e.preventDefault()
            void commitRename()
          }}
          aria-label="Confirm rename"
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-brand-teal hover:bg-muted"
        >
          <Check size={11} weight="bold" />
        </button>
        <button
          onMouseDown={e => {
            e.preventDefault()
            setEditing(false)
          }}
          aria-label="Cancel rename"
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-muted"
        >
          <X size={11} />
        </button>
      </div>
    )
  }

  if (confirming) {
    return (
      <div
        className={[
          'flex w-full items-center justify-between gap-1 rounded-md px-2.5 py-2',
          active ? 'bg-muted' : 'bg-muted/60',
        ].join(' ')}
      >
        <span className="truncate text-xs font-medium text-destructive">Delete chat?</span>
        <div className="flex shrink-0 items-center gap-1">
          <button
            onClick={e => {
              e.stopPropagation()
              void onDelete(conv.id).then(() => setConfirming(false))
            }}
            className="rounded px-1.5 py-0.5 text-[10px] font-semibold text-white bg-destructive hover:opacity-90 transition-opacity"
          >
            Delete
          </button>
          <button
            onClick={e => {
              e.stopPropagation()
              setConfirming(false)
            }}
            className="rounded px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-muted transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  return (
    <button
      onClick={onSelect}
      className={[
        'group flex w-full flex-col gap-0.5 rounded-md px-2.5 py-2 text-left transition-colors duration-150',
        active
          ? 'bg-muted text-foreground'
          : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
      ].join(' ')}
    >
      <div className="flex items-center gap-1">
        <span className="flex-1 truncate text-xs font-medium leading-snug">{conv.title}</span>
        {/* Action icons — visible on hover or when active */}
        <div className="hidden shrink-0 items-center gap-0.5 group-hover:flex">
          <span
            role="button"
            aria-label="Rename chat"
            onClick={startEdit}
            className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:bg-background hover:text-foreground transition-colors"
          >
            <PencilSimple size={11} />
          </span>
          <span
            role="button"
            aria-label="Delete chat"
            onClick={startDelete}
            className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:bg-destructive/15 hover:text-destructive transition-colors"
          >
            <Trash size={11} />
          </span>
        </div>
      </div>
      <span className="text-[10px] opacity-50">{timeLabel}</span>
    </button>
  )
}

// ─────────────────────────────────────────────────────────────────
// Empty conversations state
// ─────────────────────────────────────────────────────────────────

function NoConversations({ isSearch }: { isSearch: boolean }) {
  return (
    <div className="flex flex-col items-center gap-2 py-10 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
        <ChatCircle size={18} weight="duotone" className="text-muted-foreground" />
      </div>
      {isSearch ? (
        <p className="text-xs font-medium text-muted-foreground">No results found</p>
      ) : (
        <>
          <p className="text-xs font-medium text-muted-foreground">No conversations yet</p>
          <p className="text-[10px] text-muted-foreground/60">Start a new chat to get going</p>
        </>
      )}
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
  isLoading: boolean
  hasMore: boolean
  isLoadingMore: boolean
  onLoadMore: () => void
  search: string
  onSearchChange: (value: string) => void
  activeConvId: string | null
  onSelectConv: (id: string) => void
  onNewChat: () => void
  onSignOut: () => void
  onOpenSettings: () => void
  onRenameConv: (id: string, title: string) => Promise<void>
  onDeleteConv: (id: string) => Promise<void>
  user: User | null
}

export function Sidebar({
  open,
  onClose,
  theme,
  onToggleTheme,
  conversations,
  isLoading,
  hasMore,
  isLoadingMore,
  onLoadMore,
  search,
  onSearchChange,
  activeConvId,
  onSelectConv,
  onNewChat,
  onSignOut,
  onOpenSettings,
  onRenameConv,
  onDeleteConv,
  user,
}: SidebarProps) {
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
              onChange={e => onSearchChange(e.target.value)}
              placeholder="Search chats…"
              className="w-full rounded-md border border-input bg-background py-2 pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        {/* ── Conversation list ── */}
        <div className="flex-1 overflow-y-auto px-2 pb-2">
          {isLoading ? (
            <SidebarSkeletonList />
          ) : conversations.length > 0 ? (
            <>
              <p className="px-2 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Recent
              </p>
              {conversations.map(conv => (
                <ConversationItem
                  key={conv.id}
                  conv={conv}
                  active={activeConvId === conv.id}
                  onSelect={() => {
                    onSelectConv(conv.id)
                    onClose()
                  }}
                  onRename={onRenameConv}
                  onDelete={onDeleteConv}
                />
              ))}

              {/* Load more */}
              {hasMore && (
                <button
                  onClick={onLoadMore}
                  disabled={isLoadingMore}
                  className="mt-1 flex w-full items-center justify-center gap-1.5 rounded-md py-2 text-[11px] text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground disabled:opacity-50"
                >
                  {isLoadingMore ? (
                    <>
                      <SpinnerGap size={11} className="animate-spin" />
                      Loading…
                    </>
                  ) : (
                    'Load more'
                  )}
                </button>
              )}
            </>
          ) : (
            <NoConversations isSearch={search.length > 0} />
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
