import type { ReactNode } from 'react'

type AppShellProps = {
  readonly children: ReactNode
}

function AppShell({ children }: AppShellProps) {
  return (
    <div className="app-shell min-h-screen text-slate-100">
      <header className="app-header">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 lg:px-8">
          <div>
            <div className="flex items-center gap-3">
              <span className="brand-mark" aria-hidden="true" />
              <p className="text-lg font-semibold tracking-tight text-white">
                Pomo Focus
              </p>
            </div>
            <p className="mt-1 pl-9 text-xs tracking-wide text-slate-500">Focus with intention</p>
          </div>

          <div className="flex items-center gap-3 text-sm text-slate-400">
            <span className="hidden sm:inline">Private workspace</span>
            <div className="avatar flex h-9 w-9 items-center justify-center rounded-full font-semibold text-emerald-200">
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
