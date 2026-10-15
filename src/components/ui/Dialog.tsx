import { Minimize2, X } from 'lucide-react'
import type { ReactNode } from 'react'
import Button from './Button'

type DialogProps = {
  title: string
  description?: string
  children: ReactNode
  onClose: () => void
  onMinimize?: () => void
  dismissOnBackdrop?: boolean
}

function Dialog({
  title,
  description,
  children,
  onClose,
  onMinimize,
  dismissOnBackdrop = true,
}: DialogProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm"
      role="presentation"
      onMouseDown={(event) => {
        if (dismissOnBackdrop && event.target === event.currentTarget) {
          onClose()
        }
      }}
    >
      <section
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl shadow-black/40"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 id="dialog-title" className="text-xl font-semibold text-white">
              {title}
            </h2>
            {description && <p className="mt-2 text-sm leading-6 text-slate-400">{description}</p>}
          </div>
          <div className="-mr-2 -mt-2 flex items-center gap-1">
            {onMinimize && (
              <Button
                variant="ghost"
                className="px-2"
                aria-label="Minimize dialog"
                onClick={onMinimize}
              >
                <Minimize2 size={17} />
              </Button>
            )}
            <Button
              variant="ghost"
              className="px-2"
              aria-label="Close dialog"
              onClick={onClose}
            >
              <X size={18} />
            </Button>
          </div>
        </div>

        {children}
      </section>
    </div>
  )
}

export default Dialog
