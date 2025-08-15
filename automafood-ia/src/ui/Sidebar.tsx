import { NavLink } from 'react-router-dom'
import { X, LayoutDashboard, CalendarDays, Users2, Gift, Settings } from 'lucide-react'

const links = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/reservas', label: 'Reservas', icon: CalendarDays },
  { to: '/clientes', label: 'Clientes', icon: Users2 },
  { to: '/brindes', label: 'Brindes', icon: Gift },
  { to: '/configuracoes', label: 'Configurações', icon: Settings },
]

export default function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <>
      {/* Mobile overlay */}
      <div
        className={`fixed inset-0 z-30 bg-black/60 backdrop-blur-sm transition-opacity lg:hidden ${open ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
        onClick={onClose}
      />

      <aside
        className={`fixed z-40 flex h-[100dvh] w-42 flex-col af-aside p-4 transition-transform lg:static ${open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        <div className="mb-4 relative">
          <div className="min-h-20 sm:min-h-24 md:min-h-24 pr-6 overflow-hidden relative">
            {/* Wordmark fills the container without cropping using object-contain */}
            <img
              src="/logo-wordmark.svg"
              alt="AutoFood"
              className="absolute inset-0 w-full h-full object-contain select-none pointer-events-none"
              draggable={false}
            />
            <span className="sr-only">AutoFood</span>
          </div>
          <button
            onClick={onClose}
            className="absolute top-0 right-0 rounded-md p-2 text-white hover:bg-[#0f1621] lg:hidden"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="mt-2 flex flex-1 flex-col gap-1">
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `group relative ${isActive ? 'af-menu-item af-menu-item-active' : 'af-menu-item'}`}
              onClick={onClose}
              end={to === '/'}
            >
              {({ isActive }) => (
                <>
                  <div className={`af-menu-indicator absolute left-0 ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`} />
                  <Icon className="h-5 w-5 text-white/80 group-hover:text-white" />
                  <span className="group-hover:text-white">{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto border-t af-divider pt-3 text-xs text-white/70">
          © {new Date().getFullYear()} AutoFood
        </div>
      </aside>
    </>
  )
}
