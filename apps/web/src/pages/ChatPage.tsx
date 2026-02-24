import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
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
  SpinnerGap,
} from '@phosphor-icons/react'
import { Sidebar } from '../components/Sidebar'
import { SettingsPanel } from '../components/SettingsPanel'
import { MessageBubble } from '../components/chat/MessageBubble'
import { TypingIndicator } from '../components/chat/TypingIndicator'
import { ConfirmDeleteDialog } from '../components/chat/ConfirmDeleteDialog'
import { useTheme } from '../hooks/useTheme'
import { useAuth } from '../hooks/useAuth'
import { signOut } from '../lib/auth'
import { toast } from '@repo/ui/Toast'
import { useSendMessage, useEditMessage, useDeleteMessage } from '../hooks/useChat'
import { useConversationList } from '../hooks/useConversationList'
import { useConversationActions } from '../hooks/useConversationActions'
import { useMessages } from '../hooks/useMessages'
import type { ChatMessage } from '../types/chat'

// ─────────────────────────────────────────────────────────────────

const SUGGESTED_PROMPTS = [
  { icon: Drop, text: 'What should my fasting blood glucose be?' },
  { icon: Pill, text: 'How does metformin work for Type 2 diabetes?' },
  { icon: Warning, text: 'What are the warning signs of hypoglycemia?' },
  { icon: ChatCircle, text: 'Which foods should I limit with diabetes?' },
]

// ─────────────────────────────────────────────────────────────────
// Empty state
// ─────────────────────────────────────────────────────────────────

function EmptyState({ onPromptClick }: { onPromptClick: (t: string) => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
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
            className="card-hover flex items-start gap-3 rounded-xl border border-border bg-card p-4 text-left text-sm hover:border-brand-teal/40 hover:bg-muted hover:shadow-md transition-all duration-200"
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
// Loading skeleton
// ─────────────────────────────────────────────────────────────────

function ChatLoadingState() {
  const rows = [
    { user: true, w: 'w-44' },
    { user: false, w: 'w-64 h-16' },
    { user: true, w: 'w-56' },
    { user: false, w: 'w-72 h-20' },
  ]
  return (
    <div className="flex-1 overflow-y-auto px-4 py-6">
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        {rows.map(({ user, w }, i) => (
          <div key={i} className={`flex gap-3 ${user ? 'flex-row-reverse' : 'flex-row'}`}>
            <div className="h-8 w-8 shrink-0 animate-pulse rounded-full bg-muted" />
            <div className={`${w} h-10 animate-pulse rounded-2xl bg-muted`} />
          </div>
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// Message input
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
  const ref = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!ref.current) return
    ref.current.style.height = 'auto'
    ref.current.style.height = `${Math.min(ref.current.scrollHeight, 160)}px`
  }, [value])

  return (
    <div className="shrink-0 border-t border-border bg-background/80 backdrop-blur-sm px-4 py-3">
      <div className="mx-auto max-w-3xl">
        <div className="relative flex items-end gap-2 rounded-xl border border-border bg-card shadow-sm transition-all duration-200 focus-within:border-ring/50 focus-within:ring-2 focus-within:ring-ring/30 focus-within:shadow-md">
          <textarea
            ref={ref}
            value={value}
            onChange={e => onChange(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                onSend()
              }
            }}
            placeholder="Ask GlucoAI about your diabetes questions…"
            rows={1}
            disabled={disabled}
            className="flex-1 resize-none rounded-xl bg-transparent px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none disabled:opacity-50"
            style={{ maxHeight: '160px' }}
          />
          <div className="shrink-0 pb-2.5 pr-2.5">
            <button
              onClick={onSend}
              disabled={!value.trim() || disabled}
              aria-label="Send message"
              className="flex h-8 w-8 items-center justify-center rounded-lg gradient-cta text-white shadow-sm transition-all duration-200 hover:opacity-90 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {disabled ? (
                <SpinnerGap size={14} className="animate-spin" />
              ) : (
                <PaperPlaneRight size={14} weight="fill" />
              )}
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
// Page root
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
  const [editingMessage, setEditingMessage] = useState<{ id: string; value: string } | null>(null)
  const [deletingMessageId, setDeletingMessageId] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const prevCountRef = useRef(0)
  // Set to the conversationId once the Firestore subscription has completed its first
  // load (isLoading transitions true→false). This prevents a false-positive redirect on
  // navigation, while still catching both "zombie" convos (all messages were previously
  // deleted) and "live-cleared" convos (last message deleted during this session).
  const prevMessagesLoadingRef = useRef(false)
  const [messagesSubscribedFor, setMessagesSubscribedFor] = useState<string | null>(null)

  const sendMessage = useSendMessage()
  const editMessage = useEditMessage()
  const deleteMessage = useDeleteMessage()
  const {
    conversations,
    isLoading: convsLoading,
    hasMore: convsHasMore,
    loadMore: convsLoadMore,
    isLoadingMore: convsLoadingMore,
    search: convsSearch,
    setSearch: setConvsSearch,
    refetch: refetchConvs,
  } = useConversationList(user?.uid ?? null)
  const { renameConversation, deleteConversation } = useConversationActions()
  const { messages: firestoreMessages, isLoading: messagesLoading } = useMessages(
    conversationId ?? null,
    user?.uid ?? null
  )

  // Drop the optimistic bubble as soon as Firestore delivers the real message
  useEffect(() => {
    if (!pendingText) return
    if (firestoreMessages.some(m => m.role === 'user' && m.text === pendingText)) {
      setPendingText(null)
    }
  }, [firestoreMessages, pendingText])

  const displayMessages: ChatMessage[] = pendingText
    ? [...firestoreMessages, { id: 'pending', role: 'user', text: pendingText }]
    : firestoreMessages

  const newMessageStartIdx = prevCountRef.current
  useEffect(() => {
    prevCountRef.current = displayMessages.length
  }, [displayMessages.length])

  const isWaitingForAI = sendMessage.isPending || editMessage.isPending

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [displayMessages, isWaitingForAI])

  const activeConv = conversations.find(c => c.id === conversationId)

  // ── Handlers ──────────────────────────────────────────────────

  const handleSignOut = useCallback(async () => {
    try {
      await signOut()
      toast.success('Signed out successfully')
    } catch {
      /* ignore */
    }
    navigate('/')
  }, [navigate])

  async function handleDeleteConv(id: string) {
    try {
      await deleteConversation(id)
      refetchConvs()
      toast.success('Chat deleted')
      if (conversationId === id) navigate('/new-chat', { replace: true })
    } catch {
      toast.error('Failed to delete chat')
    }
  }

  async function handleRenameConv(id: string, title: string) {
    try {
      await renameConversation(id, title)
      refetchConvs()
      toast.success('Chat renamed')
    } catch {
      toast.error('Failed to rename chat')
    }
  }

  async function handleSend() {
    const text = inputValue.trim()
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
      refetchConvs()
      if (!conversationId) navigate(`/chat/${result.conversationId}`, { replace: true })
    } catch (err: unknown) {
      setPendingText(null)
      toast.error(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    }
  }

  async function handleEditSubmit() {
    if (!editingMessage || !conversationId || !user) return
    const text = editingMessage.value.trim()
    if (!text || editMessage.isPending) return
    const { id } = editingMessage
    setEditingMessage(null)
    setPendingText(text)
    try {
      await editMessage.mutateAsync({
        messageId: id,
        newMessage: text,
        conversationId,
        uid: user.uid,
      })
      setPendingText(null)
    } catch (err: unknown) {
      setPendingText(null)
      toast.error(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    }
  }

  async function handleConfirmDelete() {
    if (!deletingMessageId || !conversationId || !user) return
    const messageId = deletingMessageId
    try {
      await deleteMessage.mutateAsync({ messageId, conversationId, uid: user.uid })
      setDeletingMessageId(null)
      refetchConvs()
    } catch (err: unknown) {
      setDeletingMessageId(null)
      toast.error(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    }
  }

  // Track the true→false transition of messagesLoading per conversation.
  // This fires once the Firestore subscription has delivered its first snapshot,
  // covering both: (a) zombie convos where all messages were already gone, and
  // (b) convos where the last message is deleted live in this session.
  useEffect(() => {
    const wasLoading = prevMessagesLoadingRef.current
    prevMessagesLoadingRef.current = messagesLoading
    if (conversationId && wasLoading && !messagesLoading) {
      setMessagesSubscribedFor(conversationId)
    }
  }, [conversationId, messagesLoading])

  // Navigate away from conversations with no remaining messages.
  // The messagesSubscribedFor guard ensures we only act after the subscription
  // has actually completed — not during the brief loading gap on navigation.
  useEffect(() => {
    if (
      conversationId &&
      messagesSubscribedFor === conversationId &&
      !messagesLoading &&
      firestoreMessages.length === 0 &&
      !pendingText
    ) {
      navigate('/new-chat', { replace: true })
    }
  }, [
    firestoreMessages.length,
    conversationId,
    messagesLoading,
    pendingText,
    messagesSubscribedFor,
    navigate,
  ])

  // ── Render ────────────────────────────────────────────────────

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <ConfirmDeleteDialog
        open={!!deletingMessageId}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingMessageId(null)}
        isDeleting={deleteMessage.isPending}
      />

      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        theme={theme}
        onToggleTheme={toggle}
        conversations={conversations}
        isLoading={convsLoading}
        hasMore={convsHasMore}
        isLoadingMore={convsLoadingMore}
        onLoadMore={convsLoadMore}
        search={convsSearch}
        onSearchChange={setConvsSearch}
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

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header */}
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-background/80 backdrop-blur-sm px-4">
          <div className="flex min-w-0 items-center gap-3">
            <button
              onClick={() => setSidebarOpen(v => !v)}
              aria-label="Open sidebar"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground lg:hidden"
            >
              <List size={17} />
            </button>
            <div className="flex min-w-0 items-center gap-2">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md gradient-cta">
                <Heartbeat size={12} weight="bold" className="text-white" />
              </div>
              <span className="truncate text-sm font-medium text-foreground">
                {activeConv ? activeConv.title : 'New Conversation'}
              </span>
            </div>
          </div>
          <button
            onClick={toggle}
            aria-label="Toggle theme"
            className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-muted hover:text-foreground lg:flex"
          >
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          </button>
        </header>

        {/* Body */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {messagesLoading ? (
            <ChatLoadingState />
          ) : displayMessages.length === 0 ? (
            <EmptyState onPromptClick={text => setInputValue(text)} />
          ) : (
            <div className="flex-1 overflow-y-auto px-4 py-6">
              <div className="mx-auto flex max-w-3xl flex-col gap-6">
                {displayMessages.map((msg, idx) => (
                  <MessageBubble
                    key={msg.id}
                    message={msg}
                    isNew={idx >= newMessageStartIdx}
                    onEdit={
                      msg.role === 'user' && msg.id !== 'pending'
                        ? (id, text) => setEditingMessage({ id, value: text })
                        : undefined
                    }
                    onDelete={
                      msg.role === 'user' && msg.id !== 'pending'
                        ? id => setDeletingMessageId(id)
                        : undefined
                    }
                    isBeingEdited={editingMessage?.id === msg.id}
                    editValue={editingMessage?.id === msg.id ? editingMessage.value : undefined}
                    onEditChange={v =>
                      setEditingMessage(prev => (prev ? { ...prev, value: v } : null))
                    }
                    onEditSubmit={handleEditSubmit}
                    onEditCancel={() => setEditingMessage(null)}
                  />
                ))}
                {isWaitingForAI && <TypingIndicator />}
                <div ref={bottomRef} />
              </div>
            </div>
          )}

          <MessageInput
            value={inputValue}
            onChange={setInputValue}
            onSend={handleSend}
            disabled={isWaitingForAI || deleteMessage.isPending}
          />
        </div>
      </div>
    </div>
  )
}
