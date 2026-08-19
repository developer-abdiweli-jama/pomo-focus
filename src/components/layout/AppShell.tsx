import type { ReactNode } from 'react'

type AppShellProps = {
  children: ReactNode
}

function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-950/90">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 lg:px-8">
          <div>
            <p className="text-lg font-bold tracking-tight text-emerald-400">
              Pomo Focus
            </p>
            <p className="text-xs text-slate-500">Focus with intention</p>
          </div>

          <div className="flex items-center gap-3 text-sm text-slate-400">
            <span className="hidden sm:inline">Private workspace</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/10 font-semibold text-emerald-300">
              A
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-8 lg:px-8 lg:py-10">
        {children}
      </main>
    </div>
  )
}

export default AppShell
