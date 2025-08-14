import { useReservas, useClientes, useQrcodes } from '../hooks/useRestaurantData'
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, Legend } from 'recharts'

export default function Dashboard() {
  const { data: reservas, isLoading: loadingReservas, error: errorReservas } = useReservas()
  const { data: clientes, isLoading: loadingClientes, error: errorClientes } = useClientes()
  const { data: qrcodes, isLoading: loadingQrcodes, error: errorQrcodes } = useQrcodes()

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
  const reservasHoje = reservasSafe.filter((r) => {
    const dt = parseDateTime(r)
    return dt >= startOfToday && dt <= endOfToday
  })
  const reservasConfirmadas = reservasSafe.filter((r) => r.status === 'confirmada')
  const reservasPendentes = reservasSafe.filter((r) => r.status === 'pendente')
  const reservasCanceladas = reservasSafe.filter((r) => r.status === 'cancelada')
  const pieData = [
    { name: 'Confirmadas', value: reservasConfirmadas.length, color: '#60a5fa' }, // soft blue
    { name: 'Pendentes', value: reservasPendentes.length, color: '#3b82f6' },    // primary blue
    { name: 'Canceladas', value: reservasCanceladas.length, color: '#1d4ed8' },   // deep blue
  ]
  const proximas7dias = reservasSafe
    .filter((r) => {
      const dt = parseDateTime(r)
      return dt >= startOfToday && dt <= in7Days
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
    const count = reservasSafe.filter((r) => {
      const dt = parseDateTime(r)
      return dt.getFullYear() === d.getFullYear() && dt.getMonth() === d.getMonth() && dt.getDate() === d.getDate()
    }).length
    return { dia: label, reservas: count }
  })

  // kept for backward comp if needed; now we use status breakdown
  const clientesById: Record<string, string> = Object.fromEntries(
    clientesSafe.map((c: any) => [c.id, c.nome ?? 'Cliente'])
  )

  return (
    <div className="space-y-6 lg:space-y-8">
      <h1 className="text-2xl md:text-3xl xl:text-4xl font-semibold bg-clip-text text-transparent af-grad">Dashboard</h1>

      {/* Top KPIs - 4 cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-12 gap-4 lg:gap-6">
        <div className="xl:col-span-3 af-section af-card-elev af-shadow-soft af-glow overflow-hidden min-w-0">
          <div className="text-sm lg:text-[15px] text-neutral-300">Total de Reservas</div>
          <div className="mt-2 text-2xl lg:text-3xl xl:text-4xl font-bold text-white">{loadingReservas ? '…' : errorReservas ? '!' : reservasSafe.length}</div>
        </div>

        <div className="xl:col-span-3 af-section af-card-elev shadow-sm backdrop-blur overflow-hidden min-w-0">
          <div className="mb-2 text-sm lg:text-[15px] font-medium text-white">Reservas hoje</div>
          <div className="mt-2 text-2xl lg:text-3xl xl:text-4xl font-bold text-white">{loadingReservas ? '…' : errorReservas ? '!' : reservasHoje.length}</div>
        </div>

        <div className="xl:col-span-3 af-section af-card-elev shadow-sm backdrop-blur overflow-hidden min-w-0">
          <div className="text-sm lg:text-[15px] text-neutral-300">Clientes</div>
          <div className="mt-2 text-2xl lg:text-3xl xl:text-4xl font-bold text-white">{loadingClientes ? '…' : errorClientes ? '!' : clientesSafe.length}</div>
        </div>

        <div className="xl:col-span-3 af-section af-card-elev shadow-sm backdrop-blur overflow-hidden min-w-0">
          <div className="text-sm lg:text-[15px] text-neutral-300">Brindes (pendentes)</div>
          <div className="mt-2 text-2xl lg:text-3xl xl:text-4xl font-bold text-white">{loadingQrcodes ? '…' : errorQrcodes ? '!' : brindesPendentes}</div>
        </div>
      </div>

      {/* Middle row: Area chart + Status/Pie */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 lg:gap-6">
        <div className="xl:col-span-7 af-section af-border af-card-elev shadow-sm backdrop-blur overflow-hidden min-w-0">
          <div className="mb-2 text-sm lg:text-[15px] font-medium text-white">Reservas (últimos 7 dias)</div>
          <div className="h-56 md:h-64 xl:h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 16, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="colorReservas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="dia" stroke="#9ca3af" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                <YAxis stroke="#9ca3af" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} width={30} />
                <Tooltip contentStyle={{ backgroundColor: 'rgba(23,23,23,0.9)', border: '1px solid #404040', borderRadius: 8 }} labelStyle={{ color: '#e5e5e5' }} itemStyle={{ color: '#e5e5e5' }}
                  cursor={{ stroke: 'rgba(59,130,246,0.35)', strokeWidth: 1 }}
                />
                <Area type="monotone" dataKey="reservas" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorReservas)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="xl:col-span-5 af-section af-border af-card-elev shadow-sm backdrop-blur overflow-hidden min-w-0">
          <div className="mb-2 text-sm lg:text-[15px] font-medium text-white">Status das reservas</div>
          <div className="space-y-4">
            <div className="flex items-stretch justify-between gap-3 text-sm min-w-0">
              <div className="flex-1 rounded-md px-3 py-3 lg:px-4 lg:py-4 h-24 lg:h-28 flex flex-col items-center justify-center text-center border border-blue-800/60 bg-blue-900/40 text-white">
                <div className="text-sm lg:text-[15px] font-medium text-white/90">Confirmadas</div>
                <div className="mt-0.5 text-2xl lg:text-3xl font-semibold text-white leading-tight">{reservasConfirmadas.length}</div>
              </div>
              <div className="flex-1 rounded-md px-3 py-3 lg:px-4 lg:py-4 h-24 lg:h-28 flex flex-col items-center justify-center text-center border border-blue-700/60 bg-blue-800/40 text-white">
                <div className="text-sm lg:text-[15px] font-medium text-white/90">Pendentes</div>
                <div className="mt-0.5 text-2xl lg:text-3xl font-semibold text-white leading-tight">{reservasPendentes.length}</div>
              </div>
              <div className="flex-1 rounded-md px-3 py-3 lg:px-4 lg:py-4 h-24 lg:h-28 flex flex-col items-center justify-center text-center border border-blue-900/60 bg-blue-950/40 text-white">
                <div className="text-sm lg:text-[15px] font-medium text-white">Canceladas</div>
                <div className="mt-0.5 text-2xl lg:text-3xl font-semibold text-white leading-tight">{reservasCanceladas.length}</div>
              </div>
            </div>
            <div className="mt-1 flex justify-center">
              <div className="h-56 md:h-64 xl:h-72 w-full max-w-[420px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={36} outerRadius={64} stroke="#171717">
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Legend verticalAlign="bottom" height={28} wrapperStyle={{ color: '#e5e7eb', fontSize: 12, paddingTop: 8 }} />
                    <Tooltip contentStyle={{ backgroundColor: 'rgba(23,23,23,0.9)', border: '1px solid #404040', borderRadius: 8 }} labelStyle={{ color: '#e5e5e5' }} itemStyle={{ color: '#e5e5e5' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom row: Próximas reservas + Brindes */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 lg:gap-6">
        <div className="xl:col-span-6 af-section af-border af-card-elev shadow-sm backdrop-blur overflow-hidden min-w-0">
          <div className="mb-2 text-sm lg:text-[15px] font-medium text-white">Próximas reservas (7 dias)</div>
          <ul className="space-y-2 text-sm">
            {proximas7dias.length === 0 && <li className="text-neutral-300">Sem reservas nos próximos dias.</li>}
            {proximas7dias.map((r, idx) => {
              const dt = parseDateTime(r)
              const dia = dt.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
              const hora = dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
              return (
                <li key={r.id} className="flex items-center justify-between gap-3 rounded-md af-border af-card px-3 py-2">
                  <div className="min-w-0 flex-1 truncate text-white">{idx + 1}. {clientesById[(r as any).cliente_id] ?? 'Cliente'}</div>
                  <div className="shrink-0 text-neutral-300">{dia} • {hora}</div>
                </li>
              )
            })}
          </ul>
        </div>

        <div className="xl:col-span-6 af-section af-border af-card-elev shadow-sm backdrop-blur overflow-hidden min-w-0">
          <div className="mb-2 text-sm lg:text-[15px] font-medium text-white">Brindes</div>
          <div className="text-sm text-neutral-300">Resgatados: {brindesResgatados} • Pendentes: {brindesPendentes} • Vencidos: {brindesVencidos}</div>
          <ul className="mt-2 space-y-2 text-sm">
            {qrcodesSafe.slice(0, 6).map((q: any) => (
              <li key={q.id} className="flex items-center justify-between gap-3 rounded-md af-border af-card px-3 py-2">
                <div className="min-w-0 flex-1 truncate text-white">{q.codigo}</div>
                {(() => {
                  const s = (q.status as 'Resgatado' | 'Pendente' | 'Vencido') || 'Pendente'
                  const cls = 'af-chip rounded-full'
                  return <span className={`${cls} px-2 py-0.5 text-[11px]`}>{s}</span>
                })()}
              </li>
            ))}
            {qrcodesSafe.length === 0 && <li className="text-neutral-300">Nenhum brinde cadastrado.</li>}
          </ul>
        </div>
      </div>
    </div>
  )
}
