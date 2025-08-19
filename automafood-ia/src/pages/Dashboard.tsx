import { useReservas, useClientes, useQrcodes } from '../hooks/useRestaurantData'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, Legend } from 'recharts'
import { ClipboardList, CalendarCheck, Users2, Gift, TrendingUp, BarChart3 } from 'lucide-react'
import { Card } from '../components/Card'

export default function Dashboard() {
  const { data: reservas } = useReservas()
  const { data: clientes } = useClientes()
  const { data: qrcodes } = useQrcodes()

  const today = new Date()
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59)
  const in7Days = new Date(startOfToday)
  in7Days.setDate(in7Days.getDate() + 7)

  const reservasSafe = reservas ?? []
  const clientesSafe = clientes ?? []
  const qrcodesSafe = qrcodes ?? []
  const brindesResgatados = qrcodesSafe.filter((q: any) => q.status === 'Resgatado').length
  const brindesPendentes = qrcodesSafe.filter((q: any) => q.status === 'Pendente').length
  const brindesVencidos = qrcodesSafe.filter((q: any) => q.status === 'Vencido').length

  const parseDateTime = (r: any) => new Date(`${r.data_reserva}T${(r.hora_reserva || '00:00').slice(0,5)}:00`)
  const norm = (v: any) => (v ?? '').toString().trim().toLowerCase()
  // Window used by chart/pie/tiles: últimos 7 dias (inclui hoje)
  const windowStart = new Date(startOfToday)
  windowStart.setDate(windowStart.getDate() - 6)
  const inLast7Days = (r: any) => {
    const dt = parseDateTime(r)
    return dt >= windowStart && dt <= endOfToday
  }
  const reservasHoje = reservasSafe.filter((r) => {
    const dt = parseDateTime(r)
    const s = norm(r.status)
    const isTodayConfirmed = s === 'confirmada'
    return isTodayConfirmed && dt >= startOfToday && dt <= endOfToday
  })
  // Status counts restritos aos últimos 7 dias (para coerência com o gráfico)
  const reservasConfirmadas = reservasSafe.filter((r) => inLast7Days(r) && norm(r.status) === 'confirmada')
  const reservasPendentes   = reservasSafe.filter((r) => inLast7Days(r) && norm(r.status) === 'pendente')
  const reservasCanceladas  = reservasSafe.filter((r) => inLast7Days(r) && (norm(r.status) === 'cancelada' || norm(r.status) === 'cancelado' || norm(r.status) === 'canceladas'))
  const reservasExpiradas   = reservasSafe.filter((r) => inLast7Days(r) && (norm(r.status) === 'expirada' || norm(r.status) === 'expirado' || norm(r.status) === 'expiradas'))
  const reservasFinalizadas = reservasSafe.filter((r) => inLast7Days(r) && (norm(r.status) === 'finalizada' || norm(r.status) === 'finalizado' || norm(r.status) === 'finalizadas'))
  const proximas7dias = reservasSafe
    .filter((r) => {
      const dt = parseDateTime(r)
      const s = norm(r.status)
      const isActive = s === 'pendente' || s === 'confirmada'
      return isActive && dt >= startOfToday && dt <= in7Days
    })
    .sort((a, b) => +parseDateTime(a) - +parseDateTime(b))
    .slice(0, 6)

  // Chart data: last 7 days including today
  const past7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startOfToday)
    d.setDate(d.getDate() - (6 - i))
    return d
  })
  const chartData = past7.map((d) => {
    const label = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
    const sameDay = (r: any) => {
      const dt = parseDateTime(r)
      return dt.getFullYear() === d.getFullYear() && dt.getMonth() === d.getMonth() && dt.getDate() === d.getDate()
    }
    const cfm = reservasSafe.filter((r) => sameDay(r) && norm(r.status) === 'confirmada').length
    const pnd = reservasSafe.filter((r) => sameDay(r) && norm(r.status) === 'pendente').length
    const cnc = reservasSafe.filter((r) => sameDay(r) && (norm(r.status) === 'cancelada' || norm(r.status) === 'cancelado' || norm(r.status) === 'canceladas')).length
    const exp = reservasSafe.filter((r) => sameDay(r) && (norm(r.status) === 'expirada' || norm(r.status) === 'expirado' || norm(r.status) === 'expiradas')).length
    const fin = reservasSafe.filter((r) => sameDay(r) && (norm(r.status) === 'finalizada' || norm(r.status) === 'finalizado' || norm(r.status) === 'finalizadas')).length
    const total = cfm + pnd + cnc + exp + fin
    return { dia: label, total, confirmadas: cfm, pendentes: pnd, canceladas: cnc, expiradas: exp, finalizadas: fin }
  })

  const clientesById: Record<string, string> = Object.fromEntries(
    clientesSafe.map((c: any) => [c.id, c.nome ?? 'Cliente'])
  )

  return (
    <div className="min-h-screen bg-[#F8F9FE] p-3 sm:p-4 md:p-6 lg:p-8">
      <div className="space-y-4 sm:space-y-6 lg:space-y-8">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Dashboard</h1>

        {/* Top row: KPI tiles */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
          <Card className="p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl bg-blue-50">
                <ClipboardList className="h-5 w-5 sm:h-6 sm:w-6 text-[#5D5FEF]" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xl sm:text-2xl font-bold text-gray-900">{reservasSafe.length}</div>
                <div className="text-xs sm:text-sm text-gray-500">Total de Reservas</div>
              </div>
            </div>
          </Card>

          <Card className="p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl bg-green-50">
                <CalendarCheck className="h-5 w-5 sm:h-6 sm:w-6 text-[#2ED47A]" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xl sm:text-2xl font-bold text-gray-900">{reservasHoje.length}</div>
                <div className="text-xs sm:text-sm text-gray-500">Reservas hoje</div>
              </div>
            </div>
          </Card>

          <Card className="p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl bg-purple-50">
                <Users2 className="h-5 w-5 sm:h-6 sm:w-6 text-[#8C54FF]" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xl sm:text-2xl font-bold text-gray-900">{clientesSafe.length}</div>
                <div className="text-xs sm:text-sm text-gray-500">Clientes</div>
              </div>
            </div>
          </Card>

          <Card className="p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl bg-orange-50">
                <Gift className="h-5 w-5 sm:h-6 sm:w-6 text-[#FFB648]" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xl sm:text-2xl font-bold text-gray-900">{brindesPendentes}</div>
                <div className="text-xs sm:text-sm text-gray-500">Brindes pendentes</div>
              </div>
            </div>
          </Card>
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 sm:gap-6">
          <div className="xl:col-span-8">
            <Card
              title={(
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-[#5D5FEF]" />
                  <span>Reservas por status (últimos 7 dias)</span>
                </div>
              )}
            >
              <div className="h-64 sm:h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#EFEFEF" />
                    <XAxis dataKey="dia" stroke="#8A8A8A" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                    <YAxis stroke="#8A8A8A" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={25} />
                    <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#EFEFEF', borderRadius: '12px', color: '#1A1A1A' }} labelStyle={{ color: '#1A1A1A' }} itemStyle={{ color: '#1A1A1A' }} />
                    <Legend wrapperStyle={{ color: '#8A8A8A', fontSize: 12 }} />
                    <Line type="monotone" dataKey="total" name="Total" stroke="#9CA3AF" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="confirmadas" name="Confirmadas" stroke="#2ED47A" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="pendentes" name="Pendentes" stroke="#FFB648" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="canceladas" name="Canceladas" stroke="#FF4848" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="expiradas" name="Expiradas" stroke="#FFA500" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="finalizadas" name="Finalizadas" stroke="#5D5FEF" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          <div className="xl:col-span-4">
            <Card
              title={(
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-[#8C54FF]" />
                  <span>Status (últimos 7 dias)</span>
                </div>
              )}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-[#2ED47A] rounded-full"></div>
                    <span className="text-sm font-medium text-gray-700">Confirmadas</span>
                  </div>
                  <span className="text-lg font-bold text-gray-900">{reservasConfirmadas.length}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-[#FFB648] rounded-full"></div>
                    <span className="text-sm font-medium text-gray-700">Pendentes</span>
                  </div>
                  <span className="text-lg font-bold text-gray-900">{reservasPendentes.length}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-[#FF4848] rounded-full"></div>
                    <span className="text-sm font-medium text-gray-700">Canceladas</span>
                  </div>
                  <span className="text-lg font-bold text-gray-900">{reservasCanceladas.length}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-[#FFA500] rounded-full"></div>
                    <span className="text-sm font-medium text-gray-700">Expiradas</span>
                  </div>
                  <span className="text-lg font-bold text-gray-900">{reservasExpiradas.length}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-[#5D5FEF] rounded-full"></div>
                    <span className="text-sm font-medium text-gray-700">Finalizadas</span>
                  </div>
                  <span className="text-lg font-bold text-gray-900">{reservasFinalizadas.length}</span>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Bottom row: Lists */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
          <Card
            title={(
              <div className="flex items-center gap-2">
                <CalendarCheck className="h-5 w-5 text-[#2ED47A]" />
                <span>Próximas reservas (7 dias)</span>
              </div>
            )}
          >
            <div className="space-y-2 sm:space-y-3">
              {proximas7dias.length === 0 && (
                <div className="text-gray-500 text-sm">Sem reservas nos próximos dias.</div>
              )}
              {proximas7dias.map((r, idx) => {
                const dt = parseDateTime(r)
                const dia = dt.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
                const hora = dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                return (
                  <div key={r.id} className="flex items-center justify-between p-2 sm:p-3 bg-gray-50 rounded-lg">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-gray-900 truncate text-sm sm:text-base">
                        {idx + 1}. {clientesById[(r as any).cliente_id] ?? 'Cliente'}
                      </div>
                    </div>
                    <div className="text-xs sm:text-sm text-gray-500 whitespace-nowrap ml-2">{dia} • {hora}</div>
                  </div>
                )
              })}
            </div>
          </Card>

          <Card
            title={(
              <div className="flex items-center gap-2">
                <Gift className="h-5 w-5 text-[#FFB648]" />
                <span>Brindes</span>
              </div>
            )}
          >
            <div className="mb-3 sm:mb-4">
              <div className="text-xs sm:text-sm text-gray-500">
                Resgatados: {brindesResgatados} • Pendentes: {brindesPendentes} • Vencidos: {brindesVencidos}
              </div>
            </div>
            <div className="space-y-2 sm:space-y-3">
              {qrcodesSafe.slice(0, 6).map((q: any) => {
                const owner = clientesById[q.cliente_id as string] ?? 'Cliente'
                const title = q.tipo_brinde?.trim?.() ? q.tipo_brinde : (q.descricao?.trim?.() ? q.descricao : 'Brinde')
                const subtitleParts = [owner]
                if (q.codigo) subtitleParts.push(`#${q.codigo}`)
                if (q.expires_at) subtitleParts.push(`vence ${new Date(q.expires_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}`)
                const subtitle = subtitleParts.join(' • ')
                const status = (q.status as 'Resgatado' | 'Pendente' | 'Vencido') || 'Pendente'
                const statusColor = status === 'Resgatado' ? 'bg-green-100 text-green-800' : 
                                   status === 'Vencido' ? 'bg-red-100 text-red-800' : 
                                   'bg-orange-100 text-orange-800'
                return (
                  <div key={q.id} className="flex items-center justify-between p-2 sm:p-3 bg-gray-50 rounded-lg">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-gray-900 truncate text-sm sm:text-base">{title}</div>
                      <div className="text-xs text-gray-500 truncate">{subtitle}</div>
                    </div>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full whitespace-nowrap ml-2 ${statusColor}`}>
                      {status}
                    </span>
                  </div>
                )
              })}
              {qrcodesSafe.length === 0 && (
                <div className="text-gray-500 text-sm">Nenhum brinde cadastrado.</div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
