import { useEffect, type ReactNode } from 'react'
import { Outlet } from 'react-router-dom'
import Navigation from './Navigation'
import { getSettings, DEFAULT_USER_SETTINGS } from '../../db/repositories/settingsRepository'

type AppShellProps = {
  readonly children?: ReactNode
}

function AppShell({ children }: AppShellProps) {
  useEffect(() => {
    let mounted = true
    const applySavedTheme = () => {
      void getSettings().then((settings) => {
        if (!mounted) return
        const theme = settings?.theme ?? DEFAULT_USER_SETTINGS.theme
        const resolved = theme === 'system'
          ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
          : theme
        document.documentElement.dataset.theme = resolved
      })
    }
    applySavedTheme()
    window.addEventListener('pomo-settings-updated', applySavedTheme)
    return () => {
      mounted = false
      window.removeEventListener('pomo-settings-updated', applySavedTheme)
    }
  }, [])

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
            <p className="mt-1 pl-9 text-xs tracking-wide text-slate-500">
              Focus with intention
            </p>
          </div>

          <div className="flex items-center gap-3 text-sm text-slate-400">
            <span className="hidden sm:inline">Private workspace</span>
            <div className="avatar flex h-9 w-9 items-center justify-center rounded-full font-semibold text-emerald-200">
              A
            </div>
          </div>
        </div>
      </header>

      <nav aria-label="Main navigation" className="border-t border-slate-800/50 bg-slate-950/40">
        <Navigation />
      </nav>

      <main className="mx-auto max-w-6xl px-5 py-8 lg:px-8 lg:py-10">
        {/* `children` is the outlet content slot; `Outlet` renders child routes
            when the shell is driven by the router. */}
        {children ?? <Outlet />}
      </main>
    </div>
  )
}

export default AppShell
