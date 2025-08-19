import { useReservas, useClientes, useQrcodes } from '../hooks/useRestaurantData'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, Legend } from 'recharts'

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
  const pieData = [
    { name: 'Confirmadas', value: reservasConfirmadas.length, color: '#3b82f6' }, // primary blue
    { name: 'Pendentes',   value: reservasPendentes.length,   color: '#60a5fa' }, // soft blue
    { name: 'Canceladas',  value: reservasCanceladas.length,  color: '#93c5fd' }, // blue-300
    { name: 'Expiradas',   value: reservasExpiradas.length,   color: '#67e8f9' }, // cyan-300
    { name: 'Finalizadas', value: reservasFinalizadas.length, color: '#818cf8' }, // indigo-400
  ]
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

  // kept for backward comp if needed; now we use status breakdown
  const clientesById: Record<string, string> = Object.fromEntries(
    clientesSafe.map((c: any) => [c.id, c.nome ?? 'Cliente'])
  )

  return (
    <div className="space-y-6 lg:space-y-8">
      <h1 className="af-section-title">Dashboard</h1>

      {/* Top KPIs - 4 cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-12 gap-4 lg:gap-6">
        <div className="xl:col-span-3 af-section af-card-elev af-shadow-soft af-glow overflow-hidden min-w-0">
          <div className="text-sm lg:text-[15px] text-[var(--af-text-dim)]">Total de Reservas</div>
          <div className="mt-2 text-2xl lg:text-3xl xl:text-4xl font-bold text-[var(--af-text)]">{loadingReservas ? '…' : errorReservas ? '!' : reservasSafe.length}</div>
        </div>

        <div className="xl:col-span-3 af-section af-card-elev af-shadow-soft af-glow overflow-hidden min-w-0">
          <div className="mb-2 text-sm lg:text-[15px] font-medium text-[var(--af-text)]">Reservas hoje</div>
          <div className="mt-2 text-2xl lg:text-3xl xl:text-4xl font-bold text-[var(--af-text)]">{loadingReservas ? '…' : errorReservas ? '!' : reservasHoje.length}</div>
        </div>

        <div className="xl:col-span-3 af-section af-card-elev af-shadow-soft af-glow overflow-hidden min-w-0">
          <div className="text-sm lg:text-[15px] text-[var(--af-text-dim)]">Clientes</div>
          <div className="mt-2 text-2xl lg:text-3xl xl:text-4xl font-bold text-[var(--af-text)]">{loadingClientes ? '…' : errorClientes ? '!' : clientesSafe.length}</div>
        </div>

        <div className="xl:col-span-3 af-section af-card-elev af-shadow-soft af-glow overflow-hidden min-w-0">
          <div className="text-sm lg:text-[15px] text-[var(--af-text-dim)]">Brindes (pendentes)</div>
          <div className="mt-2 text-2xl lg:text-3xl xl:text-4xl font-bold text-[var(--af-text)]">{loadingQrcodes ? '…' : errorQrcodes ? '!' : brindesPendentes}</div>
        </div>
      </div>

      {/* Middle row: Area chart + Status/Pie */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 lg:gap-6">
        <div className="xl:col-span-7 af-section af-border af-card-elev shadow-sm overflow-visible min-w-0">
          <div className="mb-2 text-sm lg:text-[15px] font-medium text-[var(--af-text)]">Reservas por status (últimos 7 dias)</div>
          <div className="h-56 md:h-64 xl:h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 16, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="dia" stroke="#6b7280" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                <YAxis stroke="#6b7280" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} width={30} />
                <Tooltip contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 8 }} labelStyle={{ color: '#111827' }} itemStyle={{ color: '#111827' }} />
                <Legend wrapperStyle={{ color: '#374151', fontSize: 12 }} />
                {/* Total em neutro para não competir */}
                <Line type="monotone" dataKey="total"       name="Total"        stroke="#94a3b8" strokeWidth={2} dot={false} />
                {/* Status: verde, amarelo, vermelho, laranja, azul */}
                <Line type="monotone" dataKey="confirmadas" name="Confirmadas"  stroke="#10b981" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="pendentes"   name="Pendentes"    stroke="#f59e0b" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="canceladas"  name="Canceladas"   stroke="#ef4444" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="expiradas"   name="Expiradas"    stroke="#f97316" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="finalizadas" name="Finalizadas"  stroke="#3b82f6" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="xl:col-span-5 af-section af-border af-card-elev af-shadow-soft af-glow overflow-hidden min-w-0 pt-2 pb-2">
          <div className="mb-2 text-sm lg:text-[15px] font-medium text-[var(--af-text)]">Status (últimos 7 dias)</div>
          <div className="space-y-4">
            <div className="grid [grid-template-columns:repeat(auto-fit,minmax(140px,1fr))] gap-4 min-w-0 mb-2 items-stretch">
              <div className="rounded-md px-4 py-3 lg:px-4 lg:py-3 min-h-[5.8rem] lg:min-h-[6.2rem] w-full flex flex-col items-center justify-center text-center border border-blue-200 bg-blue-50 text-blue-700">
                <div className="px-2 text-[12px] sm:text-[12px] md:text-[12px] lg:text-[12px] xl:text-[12px] font-medium leading-tight text-center break-words">Confirmadas</div>
                <div className="mt-0.5 text-xl md:text-2xl lg:text-2xl font-semibold leading-normal">{reservasConfirmadas.length}</div>
              </div>
              <div className="rounded-md px-4 py-3 lg:px-4 lg:py-3 min-h-[5.8rem] lg:min-h-[6.2rem] w-full flex flex-col items-center justify-center text-center border border-blue-200 bg-blue-50 text-blue-700">
                <div className="px-2 text-[12px] sm:text-[12px] md:text-[12px] lg:text-[12px] xl:text-[12px] font-medium leading-tight text-center break-words">Pendentes</div>
                <div className="mt-0.5 text-xl md:text-2xl lg:text-2xl font-semibold leading-normal">{reservasPendentes.length}</div>
              </div>
              <div className="rounded-md px-4 py-3 lg:px-4 lg:py-3 min-h-[5.8rem] lg:min-h-[6.2rem] w-full flex flex-col items-center justify-center text-center border border-blue-200 bg-blue-50 text-blue-700">
                <div className="px-2 text-[12px] sm:text-[12px] md:text-[12px] lg:text-[12px] xl:text-[12px] font-medium leading-tight text-center break-words">Canceladas</div>
                <div className="mt-0.5 text-xl md:text-2xl lg:text-2xl font-semibold leading-normal">{reservasCanceladas.length}</div>
              </div>
              <div className="rounded-md px-4 py-3 lg:px-4 lg:py-3 min-h-[5.8rem] lg:min-h-[6.2rem] w-full flex flex-col items-center justify-center text-center border border-blue-200 bg-blue-50 text-blue-700">
                <div className="px-2 text-[12px] sm:text-[12px] md:text-[12px] lg:text-[12px] xl:text-[12px] font-medium leading-tight text-center break-words">Expiradas</div>
                <div className="mt-0.5 text-xl md:text-2xl lg:text-2xl font-semibold leading-normal">{reservasExpiradas.length}</div>
              </div>
              <div className="rounded-md px-4 py-3 lg:px-4 lg:py-3 min-h-[5.8rem] lg:min-h-[6.2rem] w-full flex flex-col items-center justify-center text-center border border-blue-200 bg-blue-50 text-blue-700">
                <div className="px-2 text-[12px] sm:text-[12px] md:text-[12px] lg:text-[12px] xl:text-[12px] font-medium leading-tight text-center break-words">Finalizadas</div>
                <div className="mt-0.5 text-xl md:text-2xl lg:text-2xl font-semibold leading-normal">{reservasFinalizadas.length}</div>
              </div>
            </div>
            <div className="mt-1 flex justify-center pb-3">
              <div className="h-64 md:h-80 xl:h-80 w-full max-w-[520px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart margin={{ top: 8, right: 16, bottom: 24, left: 16 }}>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={42}
                      outerRadius={70}
                      stroke="#e5e7eb"
                      labelLine={false}
                      label={false}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Legend verticalAlign="bottom" height={28} wrapperStyle={{ color: '#374151', fontSize: 12, paddingTop: 8 }} />
                    <Tooltip formatter={(v: number, n: string) => [v, n]} contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 8 }} labelStyle={{ color: '#111827' }} itemStyle={{ color: '#111827' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom row: Próximas reservas + Brindes */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 lg:gap-6">
        <div className="xl:col-span-6 af-section af-border af-card-elev shadow-sm overflow-hidden min-w-0">
          <div className="mb-2 text-sm lg:text-[15px] font-medium text-[var(--af-text)]">Próximas reservas (7 dias)</div>
          <ul className="space-y-2 text-sm">
            {proximas7dias.length === 0 && <li className="text-[var(--af-text-dim)]">Sem reservas nos próximos dias.</li>}
            {proximas7dias.map((r, idx) => {
              const dt = parseDateTime(r)
              const dia = dt.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
              const hora = dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
              return (
                <li key={r.id} className="flex items-center justify-between gap-3 rounded-md af-border af-card px-3 py-2">
                  <div className="min-w-0 flex-1 truncate text-[var(--af-text)]">{idx + 1}. {clientesById[(r as any).cliente_id] ?? 'Cliente'}</div>
                  <div className="shrink-0 text-[var(--af-text-dim)]">{dia} • {hora}</div>
                </li>
              )
            })}
          </ul>
        </div>

        <div className="xl:col-span-6 af-section af-border af-card-elev shadow-sm overflow-hidden min-w-0">
          <div className="mb-2 text-sm lg:text-[15px] font-medium text-[var(--af-text)]">Brindes</div>
          <div className="text-sm text-[var(--af-text-dim)]">Resgatados: {brindesResgatados} • Pendentes: {brindesPendentes} • Vencidos: {brindesVencidos}</div>
          <ul className="mt-2 space-y-2 text-sm">
            {qrcodesSafe.slice(0, 6).map((q: any) => {
              const owner = clientesById[q.cliente_id as string] ?? 'Cliente'
              const title = q.tipo_brinde?.trim?.() ? q.tipo_brinde : (q.descricao?.trim?.() ? q.descricao : 'Brinde')
              const subtitleParts = [owner]
              if (q.codigo) subtitleParts.push(`#${q.codigo}`)
              if (q.expires_at) subtitleParts.push(`vence ${new Date(q.expires_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}`)
              const subtitle = subtitleParts.join(' • ')
              return (
                <li key={q.id} className="flex items-center justify-between gap-3 rounded-md af-border af-card px-3 py-2">
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium text-[var(--af-text)]">{title}</div>
                    <div className="truncate text-xs text-[var(--af-text-dim)]">{subtitle}</div>
                  </div>
                  {(() => {
                    const s = (q.status as 'Resgatado' | 'Pendente' | 'Vencido') || 'Pendente'
                    const cls = 'af-chip rounded-full'
                    return <span className={`${cls} px-2 py-0.5 text-[11px]`}>{s}</span>
                  })()}
                </li>
              )
            })}
            {qrcodesSafe.length === 0 && <li className="text-[var(--af-text-dim)]">Nenhum brinde cadastrado.</li>}
          </ul>
        </div>
      </div>
    </div>
  )
}
