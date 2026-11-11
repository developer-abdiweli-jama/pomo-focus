import type { ReactNode } from 'react'
import { useCallback, useEffect } from 'react'
import { X } from 'lucide-react'

type DialogProps = {
  readonly open: boolean
  readonly onClose: () => void
  readonly title?: string
  readonly children: ReactNode
}

export function Dialog({ open, onClose, title, children }: DialogProps) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    },
    [onClose],
  )

  useEffect(() => {
    if (!open) {
      return
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open, handleKeyDown])

  if (!open) {
    return null
  }

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className="fixed z-50 top-1/2 left-1/2 z-[60] max-w-md w-full translate-x-[-50%] translate-y-[-50%] rounded-2xl border border-slate-700 bg-slate-900/95 p-6 shadow-2xl shadow-black/20 ring-1 ring-white/10"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
      >
        {title && (
          <div className="mb-4 flex items-center gap-2">
            <h2 id="dialog-title" className="text-lg font-semibold text-white">
              {title}
            </h2>
          </div>
        )}
        <div className="space-y-4">{children}</div>
        <button
          type="button"
          className="absolute right-3 top-3 rounded-md p-2 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          onClick={onClose}
          aria-label="Close dialog"
        >
          <X size={18} />
        </button>
      </div>
    </>
  )
}
