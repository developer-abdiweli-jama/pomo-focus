import type { HTMLAttributes } from 'react'

function Card({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl shadow-black/10 ${className}`}
      {...props}
    />
  )
}

export default Card
