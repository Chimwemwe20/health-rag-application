import { useState, useRef, useEffect } from 'react'
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
  Robot,
  User,
  Link,
  PencilSimple,
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
      {/* gradient-cta from style.css */}
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

      {/* Prompt cards — card-hover from style.css */}
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
  onEdit,
}: {
  message: ChatMessage
  onEdit?: (text: string) => void
}) {
  const isUser = message.role === 'user'

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
      <div className={`max-w-[75%] ${isUser ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
        <div
          className={`rounded-xl px-4 py-2.5 text-sm leading-relaxed ${
            isUser ? 'gradient-cta text-white' : 'border border-border bg-card text-foreground'
          }`}
        >
          {message.text}
        </div>

        {/* Edit button — user messages only */}
        {isUser && onEdit && (
          <button
            onClick={() => onEdit(message.text)}
            aria-label="Edit message"
            className="flex items-center gap-1 text-[10px] text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-foreground"
          >
            <PencilSimple size={10} />
            Edit
          </button>
        )}

        {/* Sources */}
        {!isUser && message.sources && message.sources.length > 0 && (
          <div className="mt-1 flex flex-col gap-1">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Sources
            </p>
            {message.sources.map(src => (
              <a
                key={src}
                href={src}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-[11px] text-brand-teal underline-offset-2 hover:underline"
              >
                <Link size={10} />
                <span className="truncate max-w-xs">{src.split('/').pop() ?? src}</span>
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
      <div className="flex items-center gap-1 rounded-xl border border-border bg-card px-4 py-3">
        <span className="animate-bounce delay-0 h-1.5 w-1.5 rounded-full bg-muted-foreground" />
        <span className="animate-bounce delay-150 h-1.5 w-1.5 rounded-full bg-muted-foreground" />
        <span className="animate-bounce delay-300 h-1.5 w-1.5 rounded-full bg-muted-foreground" />
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
  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onSend()
    }
  }

  return (
    <div className="shrink-0 border-t border-border bg-background px-4 py-3">
      <div className="mx-auto max-w-3xl">
        {/* focus-within ring uses --ring from style.css */}
        <div className="relative flex items-end gap-2 rounded-xl border border-border bg-card shadow-sm transition-shadow focus-within:border-ring/50 focus-within:ring-2 focus-within:ring-ring/30">
          <textarea
            value={value}
            onChange={e => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask GlucoAI about your diabetes questions…"
            rows={1}
            disabled={disabled}
            className="flex-1 resize-none rounded-xl bg-transparent px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none disabled:opacity-50"
            style={{ maxHeight: '160px' }}
          />
          <div className="shrink-0 pb-2.5 pr-2.5">
            {/* gradient-cta from style.css */}
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
  // Optimistic user bubble shown while waiting for the backend response
  const [pendingText, setPendingText] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  const sendMessage = useSendMessage()
  const conversations = useConversations(user?.uid ?? null)
  const { renameConversation, deleteConversation } = useConversationActions()

  // Firestore is the source of truth — messages reload automatically when
  // conversationId changes (e.g. user clicks a history item in the sidebar)
  const firestoreMessages = useMessages(conversationId ?? null, user?.uid ?? null)

  // While the backend is processing, show the optimistic user bubble on top
  const displayMessages: ChatMessage[] = pendingText
    ? [...firestoreMessages, { id: 'pending', role: 'user', text: pendingText }]
    : firestoreMessages

  // Scroll to bottom whenever messages or the typing indicator change
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

      // Firestore onSnapshot will deliver both messages automatically.
      // Clear the optimistic bubble now that the real messages are on their way.
      setPendingText(null)

      // If this was a new conversation, update the URL to the real conversation ID
      if (!conversationId) {
        navigate(`/chat/${result.conversationId}`, { replace: true })
      }
    } catch (err: unknown) {
      setPendingText(null)
      const message = err instanceof Error ? err.message : 'Something went wrong. Please try again.'
      toast.error(message)
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        theme={theme}
        onToggleTheme={toggle}
        conversations={conversations}
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
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-background px-4">
          <div className="flex min-w-0 items-center gap-3">
            {/* Hamburger — mobile only */}
            <button
              onClick={() => setSidebarOpen(v => !v)}
              aria-label="Open sidebar"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:hidden"
            >
              <List size={17} />
            </button>

            <span className="truncate text-sm font-medium text-foreground">
              {activeConv ? activeConv.title : 'New Conversation'}
            </span>
          </div>

          {/* Desktop theme toggle (sidebar has its own for mobile) */}
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
          {displayMessages.length === 0 ? (
            <EmptyState onPromptClick={text => setInputValue(text)} />
          ) : (
            <div className="flex-1 overflow-y-auto px-4 py-6">
              <div className="mx-auto flex max-w-3xl flex-col gap-6">
                {displayMessages.map(msg => (
                  <MessageBubble
                    key={msg.id}
                    message={msg}
                    onEdit={msg.role === 'user' ? text => setInputValue(text) : undefined}
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
            onSend={handleSend}
            disabled={sendMessage.isPending}
          />
        </div>
      </div>
    </div>
  )
}
