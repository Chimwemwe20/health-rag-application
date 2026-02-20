import { useState } from 'react'
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
} from '@phosphor-icons/react'
import { Sidebar } from '../components/Sidebar'
import { useTheme } from '../hooks/useTheme'
import { useAuth } from '../hooks/useAuth'
import { signOut } from '../lib/auth'
import { toast } from '@repo/ui/Toast'
import type { Conversation } from '../types/chat'

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
// Message input bar
// ─────────────────────────────────────────────────────────────────

function MessageInput({
  value,
  onChange,
  onSend,
}: {
  value: string
  onChange: (v: string) => void
  onSend: () => void
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
            className="flex-1 resize-none rounded-xl bg-transparent px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            style={{ maxHeight: '160px' }}
          />
          <div className="shrink-0 pb-2.5 pr-2.5">
            {/* gradient-cta from style.css */}
            <button
              onClick={onSend}
              disabled={!value.trim()}
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
  const [inputValue, setInputValue] = useState('')

  // TODO: replace with a useConversations() hook once Firestore chat is wired up
  const conversations: Conversation[] = []

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

  function handleSend() {
    if (!inputValue.trim()) return
    // TODO: connect to tRPC / Firebase Functions
    setInputValue('')
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
        user={user}
      />

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
          <EmptyState onPromptClick={text => setInputValue(text)} />
          <MessageInput value={inputValue} onChange={setInputValue} onSend={handleSend} />
        </div>
      </div>
    </div>
  )
}
