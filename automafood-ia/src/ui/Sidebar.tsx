import { NavLink } from 'react-router-dom'
import { X, Home, Calendar, Users, Gift, Settings, ChefHat, Menu, LogOut, MessageCircle } from 'lucide-react';
import { supabaseMain } from '../lib/supabase'

const links = [
  { to: '/', label: 'Dashboard', icon: Home },
  { to: '/reservas', label: 'Reservas', icon: Calendar },
  { to: '/clientes', label: 'Clientes', icon: Users },
  { to: '/brindes', label: 'Brindes', icon: Gift },
  { to: '/chat', label: 'Chat', icon: MessageCircle },
  { to: '/cardapio-digital', label: 'Cardápio Digital', icon: ChefHat },
  { to: '/gerenciar-cardapio', label: 'Gerenciar Cardápio', icon: Menu },
  { to: '/configuracao-restaurante', label: 'Config. Restaurante', icon: Settings },
  { to: '/configuracoes', label: 'Configurações', icon: Settings },
]

export default function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const handleLogout = async () => {
    await supabaseMain.auth.signOut()
    window.location.href = '/login'
  }
  return (
    <>
      {/* Mobile overlay */}
      <div
        className={`fixed inset-0 z-30 bg-white/70 backdrop-blur-sm transition-opacity lg:hidden ${open ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
        onClick={onClose}
      />

      <aside
        className={`fixed z-40 flex h-[100dvh] w-64 flex-col bg-white border-r border-gray-200/60 shadow-lg lg:shadow-none transition-transform lg:static ${open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        <div className="p-6 border-b border-gray-100 relative">
          <div className="min-h-16 pr-8 overflow-hidden relative">
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
            className="absolute top-4 right-4 rounded-lg p-2 lg:hidden hover:bg-gray-100 transition-colors"
            aria-label="Close menu"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <nav className="flex-1 px-4 py-6">
          <div className="space-y-2">
            {links.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) => 
                  `group flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 relative ${
                    isActive 
                      ? 'bg-gradient-to-r from-purple-50 to-indigo-50 text-purple-700 shadow-sm' 
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`
                }
                onClick={onClose}
                end={to === '/'}
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-gradient-to-b from-purple-600 to-indigo-600 rounded-r-full" />
                    )}
                    <Icon className={`h-5 w-5 transition-colors ${
                      isActive ? 'text-purple-600' : 'text-gray-400 group-hover:text-gray-600'
                    }`} />
                    <span className="truncate">{label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </nav>

        <div className="mt-auto px-4 py-4 border-t border-gray-100 space-y-3">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 text-red-600 hover:bg-red-50"
          >
            <LogOut className="h-5 w-5" />
            <span>Sair</span>
          </button>
          <div className="text-xs text-gray-400 font-medium text-center">
            © {new Date().getFullYear()} AutoFood
          </div>
        </div>
      </aside>
    </>
  )
}
