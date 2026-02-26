import { useSearchParams, useNavigate } from 'react-router-dom'
import { X } from '@phosphor-icons/react'

export function SourceViewPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const src = params.get('src') ?? ''
  const q = params.get('q') ?? ''

  const iframeSrc = src.endsWith('.pdf') ? `${src}#search=${encodeURIComponent(q)}` : src

  return (
    <div className="flex h-screen flex-col bg-background">
      <header className="flex h-12 items-center justify-between border-b border-border bg-card px-3">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-semibold text-foreground">Source Viewer</span>
          {q && (
            <span className="hidden shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline">
              Highlight: {q.slice(0, 60)}
            </span>
          )}
        </div>
        <button
          onClick={() => navigate(-1)}
          aria-label="Close"
          className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X size={14} />
        </button>
      </header>
      <div className="flex-1 min-h-0">
        <iframe
          src={iframeSrc}
          title="Source Document"
          className="h-full w-full"
          sandbox="allow-same-origin allow-scripts allow-popups allow-downloads"
        />
      </div>
    </div>
  )
}
