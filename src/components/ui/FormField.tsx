import type { ReactNode } from 'react'

type FormFieldProps = {
  readonly label: string
  readonly error?: string
  readonly required?: boolean
  readonly children: ReactNode
}

export function FormField({
  label,
  error,
  required = false,
  children,
}: FormFieldProps) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-slate-300" aria-required={required}>
        {label}{required ? <span className="ml-1 text-emerald-400" aria-hidden="true">*</span> : null}
        <span className="relative mt-1.5 block">{children}</span>
      </label>
      {error && (
        <p className="text-xs text-rose-400" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
