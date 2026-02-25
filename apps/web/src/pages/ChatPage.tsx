import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  Heartbeat,
  List,
  Sun,
  Moon,
  PaperPlaneRight,
  Drop,
  Pill,
  Warning,
  ChatCircle,
  Robot,
  User,
  Link,
  PencilSimple,
  Trash,
  Check,
  X,
  Copy,
} from '@phosphor-icons/react'
import { Sidebar } from '../components/Sidebar'
import { SettingsPanel } from '../components/SettingsPanel'
import { useTheme } from '../hooks/useTheme'
import { useAuth } from '../hooks/useAuth'
import { signOut } from '../lib/auth'
import { toast } from '@repo/ui/Toast'
import { useSendMessage } from '../hooks/useChat'
import { useConversations } from '../hooks/useConversations'
import { useConversationActions } from '../hooks/useConversationActions'
import { useMessageActions } from '../hooks/useMessageActions'
import { useMessages } from '../hooks/useMessages'
import type { ChatMessage } from '../types/chat'

// ─────────────────────────────────────────────────────────────────
// Suggested prompts shown in empty state
// ─────────────────────────────────────────────────────────────────

const SUGGESTED_PROMPTS = [
  { icon: Drop, text: 'What should my fasting blood glucose be?' },
  { icon: Pill, text: 'How does metformin work for Type 2 diabetes?' },
  { icon: Warning, text: 'What are the warning signs of hypoglycemia?' },
  { icon: ChatCircle, text: 'Which foods should I limit with diabetes?' },
]

// ─────────────────────────────────────────────────────────────────
// Empty / welcome state
// ─────────────────────────────────────────────────────────────────

function EmptyState({ onPromptClick }: { onPromptClick: (text: string) => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center overflow-y-auto px-6 py-12">
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl gradient-cta shadow-lg animate-float">
        <Heartbeat size={30} weight="bold" className="text-white" />
      </div>

      <h2 className="mb-1 text-xl font-bold tracking-tight text-foreground">
        How can GlucoAI help you today?
      </h2>
      <p className="mb-8 max-w-sm text-center text-sm leading-relaxed text-muted-foreground">
        Ask anything about diabetes management—glucose levels, medications, diet, or treatment
        options.
      </p>

      <div className="grid w-full max-w-xl grid-cols-1 gap-3 sm:grid-cols-2">
        {SUGGESTED_PROMPTS.map(({ icon: Icon, text }) => (
          <button
            key={text}
            onClick={() => onPromptClick(text)}
            className="card-hover flex items-start gap-3 rounded-xl border border-border bg-card p-4 text-left text-sm transition-colors hover:border-brand-teal/40 hover:bg-muted"
          >
            <Icon size={15} weight="duotone" className="mt-0.5 shrink-0 text-brand-teal" />
            <span className="leading-snug text-foreground/80">{text}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// Chat message bubble
// ─────────────────────────────────────────────────────────────────

function MessageBubble({
  message,
  conversationId,
  onEditSend,
}: {
  message: ChatMessage
  conversationId?: string
  /** Called with the new text; caller is responsible for soft-deleting the
   *  original and re-sending via the chat mutation. */
  onEditSend?: (originalMsgId: string, newText: string) => void
}) {
  const isUser = message.role === 'user'
  const isPending = message.id === 'pending'

  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(message.text)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [isSavingEdit, setIsSavingEdit] = useState(false)
  const editRef = useRef<HTMLTextAreaElement>(null)

  const { deleteMessage } = useMessageActions()

  function startEdit() {
    setEditValue(message.text)
    setIsEditing(true)
    setConfirmingDelete(false)
    setTimeout(() => editRef.current?.focus(), 0)
  }

  async function commitEdit() {
    const trimmed = editValue.trim()
    if (!trimmed || trimmed === message.text) {
      setIsEditing(false)
      return
    }
    setIsSavingEdit(true)
    try {
      // Cascade deletion is handled by the parent (ChatPage.handleEditMessage).
      // This bubble just signals what was edited and what the new text is.
      onEditSend?.(message.id, trimmed)
    } catch {
      toast.error('Could not save edit.')
    } finally {
      setIsSavingEdit(false)
      setIsEditing(false)
    }
  }

  function cancelEdit() {
    setIsEditing(false)
  }

  function handleEditKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void commitEdit()
    } else if (e.key === 'Escape') {
      cancelEdit()
    }
  }

  async function handleDelete() {
    if (!conversationId || isPending) return
    try {
      await deleteMessage(conversationId, message.id)
    } catch {
      toast.error('Could not delete message.')
    } finally {
      setConfirmingDelete(false)
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(message.text)
      toast.success('Copied to clipboard')
    } catch {
      toast.error('Could not copy text.')
    }
  }

  // ── Inline delete confirmation ──────────────────────────────────

  if (confirmingDelete) {
    return (
      <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        {/* Avatar placeholder to maintain alignment */}
        <div className="h-8 w-8 shrink-0" />
        <div
          className={`flex items-center gap-2 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-2.5 text-sm ${
            isUser ? 'ml-auto' : 'mr-auto'
          }`}
        >
          <span className="text-destructive font-medium">Delete this message?</span>
          <button
            onClick={() => void handleDelete()}
            className="flex items-center gap-1 rounded-md bg-destructive px-2 py-0.5 text-xs font-semibold text-white hover:opacity-90 transition-opacity"
          >
            <Trash size={10} />
            Delete
          </button>
          <button
            onClick={() => setConfirmingDelete(false)}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={`group flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar */}
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
          isUser ? 'gradient-cta' : 'border border-border bg-muted'
        }`}
      >
        {isUser ? (
          <User size={14} weight="bold" className="text-white" />
        ) : (
          <Robot size={14} weight="duotone" className="text-brand-teal" />
        )}
      </div>

      {/* Content */}
      <div className={`max-w-[75%] ${isUser ? 'items-end' : 'items-start'} flex flex-col gap-1.5`}>
        {/* Bubble */}
        {isEditing ? (
          <div
            className={`w-full rounded-xl border px-3 py-2 ${
              isUser ? 'border-ring/60 bg-card' : 'border-border bg-card'
            }`}
          >
            <textarea
              ref={editRef}
              value={editValue}
              onChange={e => setEditValue(e.target.value)}
              onKeyDown={handleEditKeyDown}
              rows={3}
              className="w-full resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
              style={{ minHeight: '60px' }}
            />
            <div className="mt-1 flex items-center justify-end gap-1">
              <span className="mr-2 text-[10px] text-muted-foreground">
                Enter to save · Esc to cancel
              </span>
              <button
                onClick={cancelEdit}
                aria-label="Cancel edit"
                className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <X size={12} />
              </button>
              <button
                onClick={() => void commitEdit()}
                disabled={isSavingEdit}
                aria-label="Save edit"
                className="flex h-6 w-6 items-center justify-center rounded-md text-brand-teal hover:bg-muted transition-colors disabled:opacity-50"
              >
                <Check size={12} weight="bold" />
              </button>
            </div>
          </div>
        ) : isUser ? (
          <div className="relative rounded-xl px-4 py-2.5 text-sm leading-relaxed gradient-cta text-white">
            {message.text}
          </div>
        ) : (
          <div className="relative rounded-xl border border-border bg-card px-4 py-3">
            <div className="prose-chat">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  // Open links in new tab safely
                  a: ({ href, children }) => (
                    <a href={href} target="_blank" rel="noopener noreferrer">
                      {children}
                    </a>
                  ),
                }}
              >
                {message.text}
              </ReactMarkdown>
            </div>
          </div>
        )}

        {/* Hover action toolbar */}
        {!isEditing && !isPending && (
          <div
            className={`flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 ${
              isUser ? 'self-end' : 'self-start'
            }`}
          >
            {/* Copy */}
            <button
              onClick={() => void handleCopy()}
              aria-label="Copy message"
              title="Copy"
              className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <Copy size={11} />
            </button>

            {/* Edit — user messages only */}
            {isUser && (
              <button
                onClick={startEdit}
                aria-label="Edit message"
                title="Edit"
                className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <PencilSimple size={11} />
              </button>
            )}

            {/* Delete */}
            <button
              onClick={() => setConfirmingDelete(true)}
              aria-label="Delete message"
              title="Delete"
              className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/15 hover:text-destructive transition-colors"
            >
              <Trash size={11} />
            </button>
          </div>
        )}

        {/* Sources */}
        {!isUser && message.sources && message.sources.length > 0 && (
          <div className="mt-0.5 flex flex-wrap gap-1.5">
            {message.sources.map(src => (
              <a
                key={src}
                href={src}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 rounded-full border border-border bg-muted px-2.5 py-0.5 text-[10px] font-medium text-brand-teal hover:bg-muted/80 transition-colors"
              >
                <Link size={9} />
                <span className="truncate max-w-[160px]">{src.split('/').pop() ?? src}</span>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// Typing indicator (shown while waiting for response)
// ─────────────────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <div className="flex gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-muted">
        <Robot size={14} weight="duotone" className="text-brand-teal" />
      </div>
      <div className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-4 py-3">
        {([0, 150, 300] as const).map(delay => (
          <span
            key={delay}
            className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce"
            style={{ animationDelay: `${delay}ms` }}
          />
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// Skeleton loader for messages (shown before first Firestore snapshot)
// ─────────────────────────────────────────────────────────────────

function MessagesSkeleton() {
  // Alternating user / assistant skeleton bubbles
  const rows: Array<{ isUser: boolean; widths: string[] }> = [
    { isUser: false, widths: ['80%', '60%', '40%'] },
    { isUser: true, widths: ['55%'] },
    { isUser: false, widths: ['70%', '50%'] },
    { isUser: true, widths: ['45%'] },
    { isUser: false, widths: ['65%', '40%', '30%'] },
  ]

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6">
      <div className="mx-auto flex max-w-3xl flex-col gap-5">
        {rows.map((row, ri) => (
          <div key={ri} className={`flex gap-3 ${row.isUser ? 'flex-row-reverse' : 'flex-row'}`}>
            {/* Avatar skeleton */}
            <div className="h-8 w-8 shrink-0 rounded-full animate-skeleton" />

            {/* Bubble skeleton */}
            <div
              className={`flex max-w-[75%] flex-col gap-2 ${row.isUser ? 'items-end' : 'items-start'}`}
            >
              <div className="flex flex-col gap-1.5 rounded-xl border border-border bg-card px-4 py-3 w-full">
                {row.widths.map((w, wi) => (
                  <div
                    key={wi}
                    className="h-3 rounded-full animate-skeleton"
                    style={{ width: w }}
                  />
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// Message input bar
// ─────────────────────────────────────────────────────────────────

function MessageInput({
  value,
  onChange,
  onSend,
  disabled,
}: {
  value: string
  onChange: (v: string) => void
  onSend: () => void
  disabled?: boolean
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-grow textarea
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`
  }, [value])

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onSend()
    }
  }

  return (
    <div className="shrink-0 border-t border-border bg-background px-4 py-3">
      <div className="mx-auto max-w-3xl">
        <div className="relative flex items-end gap-2 rounded-xl border border-border bg-card shadow-sm transition-shadow focus-within:border-ring/50 focus-within:ring-2 focus-within:ring-ring/30">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={e => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask GlucoAI about your diabetes questions… (Shift+Enter for new line)"
            rows={1}
            disabled={disabled}
            className="flex-1 resize-none rounded-xl bg-transparent px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none disabled:opacity-50"
            style={{ maxHeight: '160px', overflowY: 'auto' }}
          />
          <div className="shrink-0 pb-2.5 pr-2.5">
            <button
              onClick={onSend}
              disabled={!value.trim() || disabled}
              aria-label="Send message"
              className="flex h-8 w-8 items-center justify-center rounded-lg gradient-cta text-white shadow-sm transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <PaperPlaneRight size={14} weight="fill" />
            </button>
          </div>
        </div>
        <p className="mt-2 text-center text-[10px] text-muted-foreground">
          GlucoAI may produce inaccurate information. Always consult a qualified healthcare
          professional.
        </p>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// Page Root
// ─────────────────────────────────────────────────────────────────

export function ChatPage() {
  const navigate = useNavigate()
  const { conversationId } = useParams<{ conversationId?: string }>()
  const { theme, toggle } = useTheme()
  const { user } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [pendingText, setPendingText] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  const sendMessage = useSendMessage()
  const { conversations, isLoading: isLoadingConversations } = useConversations(user?.uid ?? null)
  const { renameConversation, deleteConversation } = useConversationActions()
  const { deleteMessage } = useMessageActions()

  const { messages: firestoreMessages, isLoading: isLoadingMessages } = useMessages(
    conversationId ?? null,
    user?.uid ?? null
  )

  const displayMessages: ChatMessage[] = pendingText
    ? [
        ...firestoreMessages.filter(m => !(m.role === 'user' && m.text === pendingText)),
        { id: 'pending', role: 'user', text: pendingText },
      ]
    : firestoreMessages

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [displayMessages, sendMessage.isPending])

  const activeConv = conversations.find(c => c.id === conversationId)

  async function handleSignOut() {
    try {
      await signOut()
      toast.success('Signed out successfully')
    } catch {
      // ignore
    }
    navigate('/')
  }

  async function handleRenameConv(id: string, title: string) {
    await renameConversation(id, title)
  }

  async function handleDeleteConv(id: string) {
    await deleteConversation(id)
    if (conversationId === id) navigate('/new-chat', { replace: true })
  }

  const handleSend = useCallback(
    async (textOverride?: string) => {
      const text = (textOverride ?? inputValue).trim()
      if (!text || sendMessage.isPending) return

      setInputValue('')
      setPendingText(text)

      try {
        const result = await sendMessage.mutateAsync({
          message: text,
          conversationId: conversationId ?? 'new',
          uid: user!.uid,
        })

        setPendingText(null)

        if (!conversationId) {
          navigate(`/chat/${result.conversationId}`, { replace: true })
        }
      } catch (err: unknown) {
        setPendingText(null)
        const message =
          err instanceof Error ? err.message : 'Something went wrong. Please try again.'
        toast.error(message)
        throw err // Re-throw so callers (like handleEditMessage) know it failed
      }
    },
    [inputValue, conversationId, sendMessage, user, navigate]
  )

  /**
   * Called when the user confirms an edit.
   * Soft-deletes the edited user message AND every message that came after it
   * (the assistant reply/replies for that turn), then re-sends the new text.
   */
  const handleEditMessage = useCallback(
    async (originalMsgId: string, newText: string) => {
      try {
        // 1. Send the new message first. If this fails, it throws and we don't delete.
        await handleSend(newText)

        // 2. Only if successful, delete the original message and everything that came after it
        const idx = firestoreMessages.findIndex(m => m.id === originalMsgId)
        if (idx !== -1 && conversationId) {
          const toDelete = firestoreMessages.slice(idx)
          // We don't await this to keep the UI snappy, or we can await it if preferred.
          // The user requested "only delete if edit is successful", which we've ensured by the order.
          void Promise.all(toDelete.map(m => deleteMessage(conversationId, m.id)))
        }
      } catch (err) {
        // Error is already toasted in handleSend
        console.error('Failed to edit message:', err)
      }
    },
    [firestoreMessages, conversationId, deleteMessage, handleSend]
  )

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        theme={theme}
        onToggleTheme={toggle}
        conversations={conversations}
        isLoadingConversations={isLoadingConversations}
        activeConvId={conversationId ?? null}
        onSelectConv={id => navigate(`/chat/${id}`)}
        onNewChat={() => navigate('/new-chat')}
        onSignOut={handleSignOut}
        onOpenSettings={() => setSettingsOpen(true)}
        onRenameConv={handleRenameConv}
        onDeleteConv={handleDeleteConv}
        user={user}
      />

      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} user={user} />

      {/* Main panel */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header */}
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-background px-4 shadow-[0_1px_0_0_hsl(var(--border))]">
          <div className="flex min-w-0 items-center gap-3">
            {/* Hamburger — mobile only */}
            <button
              onClick={() => setSidebarOpen(v => !v)}
              aria-label="Open sidebar"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:hidden"
            >
              <List size={17} />
            </button>

            <div className="flex min-w-0 items-center gap-2">
              <span className="truncate text-sm font-semibold text-foreground">
                {activeConv ? activeConv.title : 'New Conversation'}
              </span>
              {activeConv && (
                <span className="hidden shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline">
                  {firestoreMessages.length} message{firestoreMessages.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>

          {/* Desktop theme toggle */}
          <button
            onClick={toggle}
            aria-label="Toggle theme"
            className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:flex"
          >
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          </button>
        </header>

        {/* Body */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {isLoadingMessages ? (
            <MessagesSkeleton />
          ) : displayMessages.length === 0 ? (
            <EmptyState onPromptClick={text => setInputValue(text)} />
          ) : (
            <div className="flex-1 overflow-y-auto px-4 py-6">
              <div className="mx-auto flex max-w-3xl flex-col gap-5">
                {displayMessages.map(msg => (
                  <MessageBubble
                    key={msg.id}
                    message={msg}
                    conversationId={conversationId}
                    onEditSend={(originalId, newText) =>
                      void handleEditMessage(originalId, newText)
                    }
                  />
                ))}
                {sendMessage.isPending && <TypingIndicator />}
                <div ref={bottomRef} />
              </div>
            </div>
          )}
          <MessageInput
            value={inputValue}
            onChange={setInputValue}
            onSend={() => void handleSend()}
            disabled={sendMessage.isPending}
          />
        </div>
      </div>
    </div>
  )
}
