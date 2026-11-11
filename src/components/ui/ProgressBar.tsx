export function ProgressBar({
  value,
  className = '',
}: {
  readonly value: number // 0-100
  readonly className?: string
}) {
  const clamped = Math.min(100, Math.max(0, value))
  return (
    <div className={`w-full h-2.5 overflow-hidden rounded-full border border-slate-700 bg-slate-800 ${className}`}>
      <div
        className="h-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.6)] transition-all duration-500 ease-out"
        style={{ width: `${clamped}%` }}
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
      />
    </div>
  )
}
