import type { ReactNode } from 'react'
import { useCallback, useEffect, useId } from 'react'
import { X } from 'lucide-react'

type DialogProps = {
  readonly open: boolean
  readonly onClose: () => void
  readonly title?: string
  readonly description?: string
  readonly size?: 'sm' | 'md' | 'lg'
  readonly children: ReactNode
}

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
} as const

export function Dialog({ open, onClose, title, description, size = 'md', children }: DialogProps) {
  const titleId = useId()
  const descriptionId = useId()
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
        className={`fixed left-1/2 top-1/2 z-[60] w-[calc(100vw-2rem)] ${sizeClasses[size]} max-h-[calc(100vh-2rem)] max-h-[calc(100dvh-2rem)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900/95 p-5 shadow-2xl shadow-black/20 ring-1 ring-white/10 sm:p-6`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={description ? descriptionId : undefined}
      >
        {title && (
          <div className="mb-4 flex items-center gap-2">
            <h2 id={titleId} className="text-lg font-semibold text-white">
              {title}
            </h2>
          </div>
        )}
        {description && <p id={descriptionId} className="mb-4 text-sm leading-6 text-slate-400">{description}</p>}
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
