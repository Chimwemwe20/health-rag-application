import { PencilSimple, Trash, Link, User, SpinnerGap, Stethoscope } from '@phosphor-icons/react'
import type { ChatMessage } from '../../types/chat'

export function MessageBubble({
  message,
  onEdit,
  onDelete,
  isBeingEdited,
  editValue,
  onEditChange,
  onEditSubmit,
  onEditCancel,
  isNew,
}: {
  message: ChatMessage
  onEdit?: (id: string, text: string) => void
  onDelete?: (id: string) => void
  isBeingEdited?: boolean
  editValue?: string
  onEditChange?: (v: string) => void
  onEditSubmit?: () => void
  onEditCancel?: () => void
  isNew?: boolean
}) {
  const isUser = message.role === 'user'
  const isPending = message.id === 'pending'

  return (
    <>
      <style>{`
        @keyframes messageSlideIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes editFadeIn {
          from { opacity: 0; transform: scale(0.98); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>

      <div
        className={`group flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
        style={{
          animation: isNew ? 'messageSlideIn 0.3s cubic-bezier(0.16,1,0.3,1) both' : undefined,
        }}
      >
        {/* Avatar */}
        <div
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full shadow-sm ${
            isUser ? 'gradient-cta' : 'border border-border bg-muted'
          }`}
        >
          {isUser ? (
            <User size={14} weight="bold" className="text-white" />
          ) : (
            <Stethoscope size={14} weight="duotone" className="text-brand-teal" />
          )}
        </div>

        {/* Content */}
        <div className={`max-w-[75%] flex flex-col gap-1 ${isUser ? 'items-end' : 'items-start'}`}>
          {isBeingEdited ? (
            <div
              className="flex w-full flex-col gap-2"
              style={{ animation: 'editFadeIn 0.2s ease-out' }}
            >
              <textarea
                value={editValue ?? ''}
                onChange={e => onEditChange?.(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    onEditSubmit?.()
                  }
                  if (e.key === 'Escape') onEditCancel?.()
                }}
                rows={2}
                autoFocus
                className="w-full resize-none rounded-xl border border-ring bg-card px-4 py-2.5 text-sm text-foreground ring-2 ring-ring/30 focus:outline-none"
                style={{ maxHeight: '160px', minWidth: '260px' }}
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={onEditCancel}
                  className="rounded-lg px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </button>
                <button
                  onClick={onEditSubmit}
                  disabled={!editValue?.trim()}
                  className="rounded-lg bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-40"
                >
                  Update
                </button>
              </div>
            </div>
          ) : (
            <>
              <div
                className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm ${
                  isUser
                    ? `gradient-cta text-white ${isPending ? 'opacity-70' : ''}`
                    : 'border border-border bg-card text-foreground'
                }`}
                style={{
                  borderTopRightRadius: isUser ? '4px' : undefined,
                  borderTopLeftRadius: !isUser ? '4px' : undefined,
                }}
              >
                {isPending ? (
                  <span className="flex items-center gap-2">
                    <SpinnerGap size={13} className="animate-spin opacity-70" />
                    <span className="opacity-90">{message.text}</span>
                  </span>
                ) : (
                  message.text
                )}
              </div>

              {isUser && !isPending && (onEdit || onDelete) && (
                <div className="flex items-center gap-2 pt-0.5 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                  {onEdit && (
                    <button
                      onClick={() => onEdit(message.id, message.text)}
                      aria-label="Edit message"
                      className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      <PencilSimple size={10} /> Edit
                    </button>
                  )}
                  {onDelete && (
                    <button
                      onClick={() => onDelete(message.id)}
                      aria-label="Delete message"
                      className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash size={10} /> Delete
                    </button>
                  )}
                </div>
              )}
            </>
          )}

          {!isUser && (message.sources?.length ?? 0) > 0 && (
            <div className="mt-1.5 flex flex-col gap-1 rounded-lg border border-border/50 bg-muted/30 px-3 py-2">
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                Sources
              </p>
              {message.sources!.map(src => (
                <a
                  key={src}
                  href={src}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 rounded-md px-1 py-0.5 text-[11px] text-brand-teal hover:bg-muted hover:underline"
                >
                  <Link size={10} className="shrink-0" />
                  <span className="max-w-xs truncate">{src.split('/').pop() ?? src}</span>
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
