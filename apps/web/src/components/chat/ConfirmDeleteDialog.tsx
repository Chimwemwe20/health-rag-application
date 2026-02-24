import { Trash, SpinnerGap } from '@phosphor-icons/react'

export function ConfirmDeleteDialog({
  open,
  onConfirm,
  onCancel,
  isDeleting,
}: {
  open: boolean
  onConfirm: () => void
  onCancel: () => void
  isDeleting: boolean
}) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <style>{`
        @keyframes fadeIn   { from{opacity:0} to{opacity:1} }
        @keyframes dialogIn { from{opacity:0;transform:scale(.95) translateY(8px)} to{opacity:1;transform:scale(1) translateY(0)} }
      `}</style>

      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onCancel}
        style={{ animation: 'fadeIn 0.15s ease-out' }}
      />
      <div
        className="relative z-10 w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-xl"
        style={{ animation: 'dialogIn 0.2s cubic-bezier(0.16,1,0.3,1)' }}
      >
        <div className="mb-1 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-destructive/10">
            <Trash size={14} className="text-destructive" />
          </div>
          <h3 className="text-sm font-semibold text-foreground">Delete message?</h3>
        </div>
        <p className="mb-5 ml-10 text-sm text-muted-foreground">
          This will remove your message and its response. This action cannot be undone.
        </p>
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            disabled={isDeleting}
            className="rounded-lg px-4 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex items-center gap-1.5 rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:opacity-90 disabled:opacity-50"
          >
            {isDeleting ? (
              <>
                <SpinnerGap size={13} className="animate-spin" /> Deleting…
              </>
            ) : (
              'Delete'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
