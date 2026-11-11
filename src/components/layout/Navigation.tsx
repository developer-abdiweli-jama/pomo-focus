import { NavLink } from 'react-router-dom'

const navItems: readonly {
  readonly to: string
  readonly label: string
  readonly end?: boolean
}[] = [
  { to: '/', label: 'Today', end: true },
  { to: '/goals', label: 'Goals' },
  { to: '/focus', label: 'Focus' },
  { to: '/review', label: 'Review' },
  { to: '/settings', label: 'Settings' },
]

function Navigation() {
  return (
    <nav aria-label="Main navigation">
      <div className="mx-auto max-w-6xl px-5">
        <ul className="flex flex-wrap gap-1 text-sm">
          {navItems.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.end === true}
                className={({ isActive }) =>
                  `px-3 py-2.5 rounded-md font-medium transition-colors ${
                    isActive
                      ? 'text-emerald-400 bg-emerald-500/10'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`
                }
              >
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  )
}

export default Navigation
