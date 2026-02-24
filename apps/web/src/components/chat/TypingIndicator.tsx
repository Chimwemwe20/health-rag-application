import { useState, useEffect } from 'react'
import { Stethoscope } from '@phosphor-icons/react'

const PHRASES = [
  'Reviewing medical knowledge…',
  'Analyzing your question…',
  'Consulting clinical guidelines…',
  'Preparing a helpful response…',
]

export function TypingIndicator() {
  const [idx, setIdx] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setIdx(i => (i + 1) % PHRASES.length), 3000)
    return () => clearInterval(t)
  }, [])

  return (
    <>
      <style>{`
        @keyframes pulseDot {
          0%,80%,100% { opacity:.3; transform:scale(.8); }
          40%          { opacity:1;  transform:scale(1.1); }
        }
        @keyframes phraseFade {
          0%  { opacity:0; transform:translateY(4px); }
          10% { opacity:1; transform:translateY(0); }
          90%,100% { opacity:1; }
        }
        @keyframes messageSlideIn {
          from { opacity:0; transform:translateY(8px); }
          to   { opacity:1; transform:translateY(0); }
        }
      `}</style>

      <div
        className="flex gap-3"
        style={{ animation: 'messageSlideIn 0.3s cubic-bezier(0.16,1,0.3,1) both' }}
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-muted shadow-sm">
          <Stethoscope size={14} weight="duotone" className="text-brand-teal" />
        </div>
        <div
          className="flex items-center gap-2.5 rounded-2xl border border-border bg-card px-4 py-3 shadow-sm"
          style={{ borderTopLeftRadius: '4px' }}
        >
          <div className="flex items-center gap-1">
            {[0, 200, 400].map(delay => (
              <span
                key={delay}
                className="h-1.5 w-1.5 rounded-full bg-brand-teal"
                style={{
                  animation: `pulseDot 1.4s ease-in-out infinite`,
                  animationDelay: `${delay}ms`,
                }}
              />
            ))}
          </div>
          <span
            key={idx}
            className="text-xs text-muted-foreground"
            style={{ animation: 'phraseFade 3s ease-in-out' }}
          >
            {PHRASES[idx]}
          </span>
        </div>
      </div>
    </>
  )
}
