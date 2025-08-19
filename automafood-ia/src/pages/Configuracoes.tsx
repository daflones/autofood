import { useEffect, useState } from 'react'
import { useMyRestaurante, useUpdateMyRestaurante } from '../hooks/useRestaurantData'
import { Card } from '../components/Card'
import { Settings, Palette } from 'lucide-react'

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
    <div className="min-h-screen bg-[#F8F9FE] p-6 lg:p-8">
      <div className="space-y-6 lg:space-y-8">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50">
            <Settings className="h-6 w-6 text-[#6366F1]" />
          </div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Configurações</h1>
        </div>
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 lg:gap-6">
        <div className="xl:col-span-7 min-w-0">
          <Card
            title={(
              <div className="flex items-center gap-2">
                <Settings className="h-4 w-4 text-[var(--af-blue)]" />
                <span>Dados do restaurante</span>
              </div>
            )}
          >
            {isLoading && <div className="af-text-dim">Carregando…</div>}
            {error && <div className="af-alert">Erro ao carregar dados</div>}
            {!isLoading && !error && (
              <form onSubmit={onSalvar} className="space-y-5">
                {formError && (
                  <div className="af-alert">{formError}</div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Nome do restaurante</label>
                    <input
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      placeholder="Nome do seu restaurante"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                    <input
                      type="email"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="seu@email.com"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Telefone</label>
                    <input
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                      placeholder="(11) 99999-9999"
                      value={telefone}
                      onChange={(e) => setTelefone(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Endereço</label>
                    <input
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                      value={endereco}
                      onChange={(e) => setEndereco(e.target.value)}
                      placeholder="Endereço completo"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Capacidade (lugares)</label>
                    <input
                      type="number"
                      min="1"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                      value={capacity || ''}
                      onChange={(e) => setCapacity(Number(e.target.value) || 0)}
                      placeholder="Ex: 50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Intervalo entre reservas (min)</label>
                    <input
                      type="number"
                      min="5"
                      step="5"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                      value={reservationInterval || ''}
                      onChange={(e) => setReservationInterval(Number(e.target.value) || 15)}
                      placeholder="Ex: 15"
                    />
                  </div>
                  <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                    <input
                      type="checkbox"
                      id="autoConfirm"
                      className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500 focus:ring-2"
                      checked={autoConfirm}
                      onChange={(e) => setAutoConfirm(e.target.checked)}
                    />
                    <label htmlFor="autoConfirm" className="text-sm font-medium text-gray-700">Confirmar reservas automaticamente</label>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">WhatsApp (número para contato)</label>
                    <input
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                      placeholder="(11) 99999-9999"
                      value={whatsappNumber}
                      onChange={(e) => setWhatsappNumber(e.target.value)}
                    />
                  </div>
                </div>
                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={updateRestaurante.isPending}
                    className="w-full sm:w-auto bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-medium py-3 px-6 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {updateRestaurante.isPending ? 'Salvando…' : 'Salvar alterações'}
                  </button>
                </div>
              </form>
            )}
          </Card>
        </div>
        <div className="xl:col-span-5 min-w-0">
          <Card
            title={(
              <div className="flex items-center gap-2">
                <Palette className="h-4 w-4 text-[var(--af-purple)]" />
                <span>Preferências visuais</span>
              </div>
            )}
          >
            <div className="af-text-dim">Mais opções em breve (tema, chips, layouts). As opções principais foram movidas para o formulário à esquerda.</div>
          </Card>
        </div>
      </div>
      </div>
    </div>
  )
}
