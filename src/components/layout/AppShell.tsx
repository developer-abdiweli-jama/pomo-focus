import type { ReactNode } from 'react'
import { BarChart3, LayoutDashboard, Settings } from 'lucide-react'

export type AppPage = 'today' | 'review' | 'settings'

type AppShellProps = {
  readonly children: ReactNode
  readonly activePage: AppPage
  readonly onNavigate: (page: AppPage) => void
}

function AppShell({ children, activePage, onNavigate }: AppShellProps) {
  return (
    <div className="app-shell min-h-screen text-slate-100">
      <header className="app-header">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4 lg:px-8">
          <div>
            <div className="flex items-center gap-3">
              <span className="brand-mark" aria-hidden="true" />
              <p className="text-lg font-semibold tracking-tight text-white">
                Pomo Focus
              </p>
            </div>
            <p className="mt-1 pl-9 text-xs tracking-wide text-slate-500">Focus with intention</p>
          </div>

          <div className="flex items-center text-sm text-slate-400">
            <nav className="flex items-center gap-1" aria-label="Main navigation">
              <NavButton label="Today" active={activePage === 'today'} icon={<LayoutDashboard size={15} />} onClick={() => onNavigate('today')}>
                Today
              </NavButton>
              <NavButton label="Review" active={activePage === 'review'} icon={<BarChart3 size={15} />} onClick={() => onNavigate('review')}>
                Review
              </NavButton>
              <NavButton label="Settings" active={activePage === 'settings'} icon={<Settings size={15} />} onClick={() => onNavigate('settings')}>
                Settings
              </NavButton>
            </nav>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 py-8 lg:px-8 lg:py-10">
        {children}
      </main>
    </div>
  )
}

type NavButtonProps = {
  readonly label: string
  readonly active: boolean
  readonly icon: ReactNode
  readonly children: ReactNode
  readonly onClick: () => void
}

function NavButton({ label, active, icon, children, onClick }: NavButtonProps) {
  return (
    <button
      type="button"
      className={`flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs transition-colors ${active ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-800/60 hover:text-slate-300'}`}
      aria-label={label}
      aria-current={active ? 'page' : undefined}
      onClick={onClick}
    >
      {icon}
      <span className="hidden sm:inline">{children}</span>
    </button>
  )
}

export default AppShell
