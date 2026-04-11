import { Outlet, NavLink } from 'react-router-dom'

const links = [
  { to: '/nueva',         label: 'Medir' },
  { to: '/reporte',       label: 'Reporte' },
  { to: '/personas',      label: 'Personas' },
  { to: '/configuracion', label: 'Config' },
]

export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-surface-border bg-surface/80 backdrop-blur-md">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <span className="font-display font-extrabold text-lg tracking-tight text-white">
          
            SAMITEX <span className="text-brand-500">tallaje</span>
          </span>
          <nav className="flex gap-1">
            {links.map(l => (
              <NavLink
                key={l.to}
                to={l.to}
                className={({ isActive }) =>
                  `font-display text-sm px-3 py-1.5 rounded-lg transition-all ` +
                  (isActive
                    ? 'bg-brand-600 text-white'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-surface-card')
                }
              >
                {l.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
