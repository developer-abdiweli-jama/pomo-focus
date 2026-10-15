import type { HTMLAttributes } from 'react'

type CardVariant = 'default' | 'primary' | 'quiet'

type CardProps = HTMLAttributes<HTMLDivElement> & {
  readonly variant?: CardVariant
}

const variantClasses: Record<CardVariant, string> = {
  default: 'rounded-2xl border border-slate-800/80 bg-slate-900/75 shadow-lg shadow-black/10',
  primary: 'rounded-2xl border border-emerald-400/20 bg-linear-to-br from-emerald-500/12 via-slate-900/90 to-slate-900 shadow-xl shadow-black/15',
  quiet: 'rounded-2xl border border-slate-800/65 bg-slate-950/25',
}

function Card({ className = '', variant = 'default', ...props }: Readonly<CardProps>) {
  return (
    <div
      className={`${variantClasses[variant]} p-5 ${className}`}
      {...props}
    />
  )
}

export default Card
