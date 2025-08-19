import { supabase } from '../lib/supabaseClient'
import { useMyRestaurante } from '../hooks/useRestaurantData'

export default function HeaderBar() {
  const { data: restaurante } = useMyRestaurante()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return (
    <header className="sticky top-0 z-10 w-full af-topbar">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4 px-4 py-3 lg:px-6">
        <div className="text-sm text-[color:var(--af-text-dim)] truncate">
          {`Seja Bem-Vindo ao Painel Inteligente do ${restaurante?.nome ?? 'Seu Restaurante'}`}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleLogout}
            className="af-btn af-btn-ghost px-3 py-1.5"
          >
            Sair
          </button>
        </div>
      </div>
    </header>
  )
}
