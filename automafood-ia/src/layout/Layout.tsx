import { Outlet, NavLink } from 'react-router-dom'
import { useState } from 'react'
import { Menu } from 'lucide-react'
import Sidebar from '../ui/Sidebar'
import HeaderBar from '../ui/HeaderBar'

export default function Layout() {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative min-h-screen bg-white">
      {/* Removed radial accent layers for neutral white/gray background */}
      {/* Mobile top bar */}
      <header className="af-topbar lg:hidden">
        <div className="flex items-center justify-between gap-2 px-4 py-3 h-16">
          <button
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-2 rounded-md border af-divider bg-white/70 hover:bg-white px-3 py-2 text-sm text-[color:var(--af-text)]"
          >
            <Menu className="h-5 w-5" />
            Menu
          </button>
          <NavLink to="/" className="block">
            <img
              src="/logo-wordmark.svg"
              alt="AutoFood"
              className="h-9 sm:h-10 w-auto object-contain"
              draggable={false}
            />
          </NavLink>
          <div />
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-[1440px] grid-cols-1 lg:grid-cols-[280px_1fr]">
        {/* Sidebar */}
        <Sidebar open={open} onClose={() => setOpen(false)} />

        {/* Content */}
        <div className="flex min-h-[calc(100vh-0px)] flex-col">
          <HeaderBar />
          {/* Solid white content with global container for consistent spacing */}
          <main className="flex-1 py-5 lg:py-7 bg-white">
            <div className="af-container">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}
