import { useEffect, useState } from 'react'
import { useMyRestaurante, useUpdateMyRestaurante } from '../hooks/useRestaurantData'

export default function Configuracoes() {
  const { data: restaurante, isLoading, error } = useMyRestaurante()
  const updateRestaurante = useUpdateMyRestaurante()

  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [telefone, setTelefone] = useState('')
  const [endereco, setEndereco] = useState('')
  const [formError, setFormError] = useState<string>('')
  const [formSuccess, setFormSuccess] = useState<string>('')

  // Advanced preferences (stored in theme_prefs JSON)
  const [capacity, setCapacity] = useState<number | ''>('')
  const [reservationInterval, setReservationInterval] = useState<number | ''>('')
  const [autoConfirm, setAutoConfirm] = useState<boolean>(false)
  const [whatsappNumber, setWhatsappNumber] = useState('')

  useEffect(() => {
    if (restaurante) {
      setNome(restaurante.nome ?? '')
      setEmail(restaurante.email ?? '')
      setTelefone(restaurante.telefone ?? '')
      setEndereco(restaurante.endereco ?? '')
      const prefs = (restaurante as any).theme_prefs || {}
      setCapacity(typeof prefs.capacity === 'number' ? prefs.capacity : '')
      setReservationInterval(typeof prefs.reservation_interval === 'number' ? prefs.reservation_interval : '')
      setAutoConfirm(!!prefs.auto_confirm)
      setWhatsappNumber(prefs.whatsapp_number ?? '')
    }
  }, [restaurante])

  const onSalvar = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')
    setFormSuccess('')
    try {
      const theme_prefs = {
        ...((restaurante as any)?.theme_prefs || {}),
        capacity: capacity === '' ? undefined : Number(capacity),
        reservation_interval: reservationInterval === '' ? undefined : Number(reservationInterval),
        auto_confirm: autoConfirm,
        whatsapp_number: whatsappNumber || undefined,
      }
      await updateRestaurante.mutateAsync({ nome: nome?.trim(), email, telefone, endereco, theme_prefs } as any)
      setFormSuccess('Configurações salvas com sucesso!')
    } catch (err: any) {
      setFormError(err?.message || 'Erro ao salvar configurações')
    }
  }

  return (
    <div className="space-y-6 lg:space-y-8">
      <h1 className="af-section-title">Configurações</h1>
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 lg:gap-6">
        <div className="xl:col-span-7 af-section af-card-elev shadow-sm overflow-hidden min-w-0">
          <div className="mb-3 text-sm lg:text-[15px] font-medium text-[var(--af-text)]">Dados do restaurante</div>
          {isLoading && <div className="af-text-dim">Carregando…</div>}
          {error && <div className="af-alert">Erro ao carregar dados</div>}
          {!isLoading && !error && (
            <form onSubmit={onSalvar} className="space-y-3 lg:space-y-4">
              {formError && (
                <div className="af-alert">{formError}</div>
              )}
              {formSuccess && (
                <div className="af-alert-soft">{formSuccess}</div>
              )}
              <div>
                <label className="mb-1 block af-label">Nome</label>
                <input
                  className="af-field"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block af-label">Email</label>
                <input
                  type="email"
                  className="af-field"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block af-label">Telefone</label>
                  <input
                    className="af-field"
                    value={telefone}
                    onChange={(e) => setTelefone(e.target.value)}
                  />
                </div>
                <div>
                  <label className="mb-1 block af-label">Endereço</label>
                  <input
                    className="af-field"
                    value={endereco}
                    onChange={(e) => setEndereco(e.target.value)}
                  />
                </div>
              </div>
              <div className="pt-2 border-t border-white/10"></div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block af-label">Capacidade (lugares)</label>
                  <input
                    type="number"
                    min={0}
                    className="af-field"
                    value={capacity}
                    onChange={(e) => setCapacity(e.target.value === '' ? '' : Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="mb-1 block af-label">Intervalo entre reservas (min)</label>
                  <input
                    type="number"
                    min={0}
                    step={5}
                    className="af-field"
                    value={reservationInterval}
                    onChange={(e) => setReservationInterval(e.target.value === '' ? '' : Number(e.target.value))}
                  />
                </div>
                <div className="sm:col-span-2 flex items-center gap-3">
                  <input
                    id="autoConfirm"
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-600"
                    checked={autoConfirm}
                    onChange={(e) => setAutoConfirm(e.target.checked)}
                  />
                  <label htmlFor="autoConfirm" className="af-label">Confirmar reservas automaticamente</label>
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block af-label">WhatsApp (número para contato)</label>
                  <input
                    className="af-field"
                    placeholder="(xx) 9xxxx-xxxx"
                    value={whatsappNumber}
                    onChange={(e) => setWhatsappNumber(e.target.value)}
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={updateRestaurante.isPending}
                className="af-btn-primary disabled:opacity-60"
              >
                {updateRestaurante.isPending ? 'Salvando…' : 'Salvar alterações'}
              </button>
            </form>
          )}
        </div>
        <div className="xl:col-span-5 af-section af-card-elev shadow-sm overflow-hidden min-w-0">
          <div className="mb-2 text-sm lg:text-[15px] font-medium text-[var(--af-text)]">Preferências visuais</div>
          <div className="af-text-dim">Mais opções em breve (tema, chips, layouts). As opções principais foram movidas para o formulário à esquerda.</div>
        </div>
      </div>
    </div>
  )
}
