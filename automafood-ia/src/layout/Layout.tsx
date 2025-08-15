import { Outlet, NavLink } from 'react-router-dom'
import { useState } from 'react'
import { Menu } from 'lucide-react'
import Sidebar from '../ui/Sidebar'
import HeaderBar from '../ui/HeaderBar'

export default function Layout() {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative min-h-screen text-white">
      {/* App background: deep navy to black */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-[#0b1220] via-[#0b1220] to-black" />
      {/* Mobile top bar */}
      <div className="flex items-center justify-between gap-2 border-b border-[#1b2535] bg-[#0b0f15]/90 px-4 py-3 h-16 backdrop-blur lg:hidden text-white">
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 rounded-md border border-[#1b2535] px-3 py-2 text-sm text-white hover:bg-[#0f1621]"
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
