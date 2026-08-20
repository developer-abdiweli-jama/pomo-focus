import type { HTMLAttributes } from 'react'

function Card({ className = '', ...props }: Readonly<HTMLAttributes<HTMLDivElement>>) {
  return (
    <div
      className={`surface rounded-2xl border border-slate-800/80 bg-slate-900/80 p-5 shadow-xl shadow-black/10 ${className}`}
      {...props}
    />
  )
}

export default Card
