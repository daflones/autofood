import { Outlet, NavLink } from 'react-router-dom'
import { useState } from 'react'
import { Menu } from 'lucide-react'
import Sidebar from '../ui/Sidebar'
import HeaderBar from '../ui/HeaderBar'

export default function Layout() {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative min-h-screen">
      {/* App background: clean light with subtle radial accents */}
      <div className="pointer-events-none absolute inset-0 -z-10" style={{ background: 'white' }} />
      <div className="pointer-events-none absolute inset-0 -z-10" style={{ backgroundImage: 'var(--af-bg-grad-1), var(--af-bg-grad-2)' }} />
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
          <main className="flex-1 p-4 lg:p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  )
}
