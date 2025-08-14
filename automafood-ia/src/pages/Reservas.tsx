import { useMemo, useState } from 'react'
import { startOfWeek, addDays, addWeeks, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useReservas, useClientes, useDeleteReserva, useCreateReserva, useUpdateReserva } from '../hooks/useRestaurantData'

export default function Reservas() {
  const { data: reservas, isLoading, error, refetch } = useReservas() as any
  const { data: clientes } = useClientes()
  const deleteReserva = useDeleteReserva()
  const createReserva = useCreateReserva()
  const updateReserva = useUpdateReserva()

  const clienteNome = (clienteId?: string | null) => {
    const c = (clientes ?? []).find((x) => x.id === clienteId)
    return c?.nome ?? '—'
  }

  // (grade de horários removida na visão simplificada)

  const fmtDataHora = (data_reserva?: string | null, hora_reserva?: string | null) => {
    if (!data_reserva) return 'Sem data'
    // Formata a data_reserva (YYYY-MM-DD) manualmente para evitar mudanças por fuso
    const [y, m, d] = data_reserva.split('-')
    const dia = `${d}/${m}/${y}`
    const hora = (hora_reserva ?? '00:00').slice(0, 5)
    return `${dia} às ${hora}`
  }

  const sorted = useMemo(() => {
    return [...(reservas ?? [])].sort((a, b) => {
      const da = a.data_reserva ? new Date(`${a.data_reserva}T${(a as any).hora_reserva ?? '00:00'}`).getTime() : 0
      const db = b.data_reserva ? new Date(`${b.data_reserva}T${(b as any).hora_reserva ?? '00:00'}`).getTime() : 0
      return da - db
    })
  }, [reservas])

  // Selected day filter (YYYY-MM-DD)
  const todayStr = useMemo(() => {
    const d = new Date()
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${dd}`
  }, [])
  const [selectedDay, setSelectedDay] = useState<string>(todayStr)
  // List filters
  const [q, setQ] = useState('')
  const [statusSel, setStatusSel] = useState<'todos' | 'pendente' | 'confirmada' | 'cancelada'>('todos')
  const [pagamentoSel, setPagamentoSel] = useState<'todos' | 'pago' | 'pendente'>('todos')
  const filtered = useMemo(() => {
    return sorted.filter((r: any) => {
      if (r.data_reserva !== selectedDay) return false
      const nome = clienteNome(r.cliente_id).toLowerCase()
      const txt = q.toLowerCase().trim()
      const matchesText = txt.length === 0 || nome.includes(txt)
      const matchesStatus = statusSel === 'todos' || (r.status ?? 'pendente') === statusSel
      const matchesPagamento = pagamentoSel === 'todos' || (pagamentoSel === 'pago' ? !!r.status_pagamento : !r.status_pagamento)
      return matchesText && matchesStatus && matchesPagamento
    })
  }, [sorted, selectedDay, q, statusSel, pagamentoSel])

  // Agrupa reservas por data (YYYY-MM-DD)
  const reservasByDate = useMemo(() => {
    const map = new Map<string, any[]>()
    for (const r of reservas ?? []) {
      const key = (r as any).data_reserva
      if (!key) continue
      const arr = map.get(key) ?? []
      arr.push(r)
      map.set(key, arr)
    }
    return map
  }, [reservas])

  // Modal state (create/edit)
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<{ cliente_id: string; data_reserva: string; hora_reserva: string; status: string; status_pagamento: boolean; n_pessoas: number; observacao: string }>({
    cliente_id: '',
    data_reserva: '',
    hora_reserva: '',
    status: 'pendente',
    status_pagamento: false,
    n_pessoas: 2,
    observacao: '',
  })
  const [submitError, setSubmitError] = useState<string | null>(null)

  const openCreate = () => {
    setEditingId(null)
    setForm({ cliente_id: '', data_reserva: '', hora_reserva: '', status: 'pendente', status_pagamento: false, n_pessoas: 2, observacao: '' })
    setOpen(true)
  }

  const openEdit = (r: any) => {
    setEditingId(r.id)
    setForm({
      cliente_id: r.cliente_id ?? '',
      data_reserva: r.data_reserva ?? '',
      hora_reserva: (r.hora_reserva ?? '').slice(0, 5),
      status: r.status ?? 'pendente',
      status_pagamento: !!r.status_pagamento,
      n_pessoas: Number(r.n_pessoas ?? 2),
      observacao: r.observacao ?? '',
    })
    setOpen(true)
  }
  // Quick actions
  const setStatus = async (id: string, status: 'pendente' | 'confirmada' | 'cancelada') => {
    await updateReserva.mutateAsync({ id, payload: { status } as any })
    refetch?.()
  }
  const togglePago = async (id: string, current: boolean) => {
    await updateReserva.mutateAsync({ id, payload: { status_pagamento: !current } as any })
    refetch?.()
  }

  // Removido: manipuladores de arrastar/redimensionar do calendário anterior

  // Removido: manipuladores de arrastar/redimensionar do calendário anterior

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError(null)
    try {
      // Basic validation for required fields
      if (!form.data_reserva || !form.hora_reserva) {
        throw new Error('Informe data e hora da reserva.')
      }
      const payload = {
        // cliente_id may be nullable in schema; only send when provided
        ...(form.cliente_id ? { cliente_id: form.cliente_id } : {}),
        data_reserva: form.data_reserva,
        hora_reserva: form.hora_reserva,
        status: form.status,
        status_pagamento: !!form.status_pagamento,
        n_pessoas: Number(form.n_pessoas || 1),
        // observacao can be omitted if empty
        ...(form.observacao ? { observacao: form.observacao } : {}),
      } as any
      if (editingId) {
        await updateReserva.mutateAsync({ id: editingId, payload })
      } else {
        await createReserva.mutateAsync(payload)
        // Ensure the created item is visible in the list right away
        setSelectedDay(form.data_reserva)
      }
      // Force refresh to reflect server state
      await refetch()
      setOpen(false)
    } catch (err: any) {
      setSubmitError(err?.message || 'Falha ao salvar a reserva. Tente novamente.')
    }
  }

  // Expand on card click to reveal actions
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const toggleExpand = (id: string) => setExpandedId((cur) => (cur === id ? null : id))

  // Datas utilitárias
  const parseYYYYMMDD = (s: string) => {
    const [y, m, d] = s.split('-').map(Number)
    return new Date(y, (m || 1) - 1, d || 1)
  }
  // Visão simplificada: seletor semanal (Dom–Sáb)
  const initSelected = parseYYYYMMDD(selectedDay)
  const [viewMonthDate, setViewMonthDate] = useState<Date>(() => new Date(initSelected.getFullYear(), initSelected.getMonth(), 1))
  const [weekIndex, setWeekIndex] = useState<number>(0) // 0..4 (5 semanas)
  const monthStartWeek = startOfWeek(new Date(viewMonthDate.getFullYear(), viewMonthDate.getMonth(), 1), { weekStartsOn: 0 })
  const viewWeekStart = addWeeks(monthStartWeek, weekIndex)
  const weekDays: Date[] = Array.from({ length: 7 }, (_, i) => addDays(viewWeekStart, i))

  // Date Picker (modal)
  const [datePickerOpen, setDatePickerOpen] = useState(false)
  const [pickerAnchor, setPickerAnchor] = useState<{ top: number; left: number; height: number } | null>(null)
  const [pickerMonth, setPickerMonth] = useState<Date>(() => new Date(viewMonthDate.getFullYear(), viewMonthDate.getMonth(), 1))

  // Visual flash for selected day (used when clicking "Hoje")
  const [flashDay, setFlashDay] = useState<string | null>(null)
  const flashToday = (key: string) => {
    setFlashDay(key)
    window.setTimeout(() => setFlashDay((cur) => (cur === key ? null : cur)), 900)
  }

  const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  const weekIndexFor = (target: Date, monthRef: Date) => {
    const base = startOfWeek(new Date(monthRef.getFullYear(), monthRef.getMonth(), 1), { weekStartsOn: 0 })
    const diffMs = target.setHours(0,0,0,0) - base.setHours(0,0,0,0)
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    const idx = Math.floor(diffDays / 7)
    return Math.max(0, Math.min(4, idx))
  }
  const goToDay = (d: Date) => {
    const monthRef = new Date(d.getFullYear(), d.getMonth(), 1)
    setViewMonthDate(monthRef)
    setWeekIndex(weekIndexFor(d, monthRef))
    setSelectedDay(ymd(d))
    setDatePickerOpen(false)
  }

  // (drag-and-drop por horário removido na visão simplificada)

  // Removido: handler antigo de drop por dia (agora usamos grade de horas)

  return (
    <div className="space-y-8 lg:space-y-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl md:text-3xl xl:text-4xl font-semibold bg-clip-text text-transparent af-grad">Reservas</h1>
        <button onClick={openCreate} className="af-btn-primary">
          Nova Reserva
        </button>
      </div>

      {/* Modal: Seletor de dia/mês/ano */}
      {datePickerOpen && (
        <div className="fixed inset-0 z-50">
          {/* Fundo escurecido */}
          <div className="absolute inset-0 bg-black/60" onClick={() => setDatePickerOpen(false)} />
          {/* Popover ancorado ao botão */}
          <div
            className="absolute z-10 w-[280px] sm:w-[320px] rounded-xl af-card-elev shadow-xl"
            style={{
              top: Math.min((pickerAnchor?.top ?? 0) + (pickerAnchor?.height ?? 0) + 8, window.scrollY + window.innerHeight - 360),
              left: Math.min((pickerAnchor?.left ?? 0), window.scrollX + window.innerWidth - (window.innerWidth < 640 ? 296 : 336)),
            }}
          >
            <div className="p-3 sm:p-4">
              <div className="mb-3 flex items-center justify-between">
                <button
                  className="rounded-md border border-[#1b2535] px-2 py-1 text-xs text-white hover:bg-[#0b0f15]"
                  onClick={() => setPickerMonth(new Date(pickerMonth.getFullYear(), pickerMonth.getMonth() - 1, 1))}
                >←</button>
                <div className="text-sm text-white">{format(pickerMonth, 'MMMM yyyy', { locale: ptBR })}</div>
                <button
                  className="rounded-md border border-[#1b2535] px-2 py-1 text-xs text-white hover:bg-[#0b0f15]"
                  onClick={() => setPickerMonth(new Date(pickerMonth.getFullYear(), pickerMonth.getMonth() + 1, 1))}
                >→</button>
              </div>
              <div className="grid grid-cols-7 gap-1 text-center text-[10px] sm:text-[11px] text-white/60 mb-1">
                {['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'].map((d) => (<div key={d} className="py-1">{d}</div>))}
              </div>
              {(() => {
                const y = pickerMonth.getFullYear()
                const m = pickerMonth.getMonth()
                const first = new Date(y, m, 1)
                const firstWeekStart = startOfWeek(first, { weekStartsOn: 0 })
                const cells: Date[] = []
                // Build 6 weeks grid to cover month
                for (let w = 0; w < 6; w++) {
                  for (let i = 0; i < 7; i++) {
                    cells.push(addDays(firstWeekStart, w * 7 + i))
                  }
                }
                return (
                  <div className="grid grid-cols-7 gap-1">
                    {cells.map((d, idx) => {
                      const inMonth = d.getMonth() === m
                      const label = d.getDate()
                      return (
                        <button
                          key={idx}
                          disabled={!inMonth}
                          onClick={() => inMonth && goToDay(d)}
                          className={`p-1.5 sm:p-2 md:p-3 text-center border transition
                            ${inMonth ? 'bg-[#070a10] text-white border-[#141a22] hover:bg-[#0b0f15]' : 'bg-transparent text-white/40 border-transparent'}
                            ${inMonth && ymd(d) === selectedDay ? 'af-card' : ''}
                          `}
                        >
                          {label}
                        </button>
                      )
                  })}
                </div>
              )
            })()}
            </div>
          </div>
        </div>
      )}
      {/* Calendário: seletor semanal simples (Dom–Sáb) */}
      <div className="af-section af-card-elev shadow-sm overflow-hidden min-w-0">
        <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
          <div className="text-[15px] lg:text-base font-medium text-white order-1">Calendário — Semana {weekIndex + 1} de {format(viewMonthDate, 'MMMM yyyy', { locale: ptBR })}</div>
          <div className="flex items-center gap-3 justify-between md:justify-center order-2">
            <button
              className="af-btn-ghost text-sm"
              onClick={() => {
                if (weekIndex > 0) setWeekIndex(weekIndex - 1)
                else { // ir para a última semana do mês anterior (0..4)
                  const prev = new Date(viewMonthDate.getFullYear(), viewMonthDate.getMonth() - 1, 1)
                  setViewMonthDate(prev)
                  setWeekIndex(4)
                }
              }}
            >← Semana</button>
            <button
              className="af-btn-ghost text-sm"
              onClick={() => {
                const today = new Date()
                const monthRef = new Date(today.getFullYear(), today.getMonth(), 1)
                setViewMonthDate(monthRef)
                setWeekIndex(weekIndexFor(today, monthRef))
                const key = ymd(today)
                setSelectedDay(key)
                flashToday(key)
              }}
            >Hoje</button>
            <button
              className="af-btn-ghost text-sm"
              onClick={() => {
                if (weekIndex < 4) setWeekIndex(weekIndex + 1)
                else { // ir para a primeira semana do próximo mês
                  const next = new Date(viewMonthDate.getFullYear(), viewMonthDate.getMonth() + 1, 1)
                  setViewMonthDate(next)
                  setWeekIndex(0)
                }
              }}
            >Semana →</button>
          </div>
          <div className="flex items-center gap-2 justify-stretch md:justify-end order-3">
            <button
              className="af-btn w-full md:w-auto text-center"
              onClick={(e) => {
                const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect()
                setPickerAnchor({ top: rect.top + window.scrollY, left: rect.left + window.scrollX, height: rect.height })
                setPickerMonth(new Date(viewMonthDate.getFullYear(), viewMonthDate.getMonth(), 1))
                setDatePickerOpen(true)
              }}
            >Selecionar data</button>
          </div>
        </div>

        {/* Linha única da semana: Dom–Sáb (7 dias sempre visíveis) */}
        <div className="overflow-x-auto">
          <div className="min-w-[640px] rounded-2xl ring-1 ring-white/5 overflow-hidden">
            <div className="grid grid-flow-col auto-cols-fr">
              {weekDays.map((d, idx) => {
                const y = d.getFullYear(); const m = String(d.getMonth() + 1).padStart(2, '0'); const dd = String(d.getDate()).padStart(2, '0')
                const key = `${y}-${m}-${dd}`
                const totalDoDia = (reservasByDate.get(key) ?? []).filter((r: any) => (r?.status ?? 'pendente') !== 'cancelada').length
                const isSelected = key === selectedDay
                return (
                  <button
                    key={idx}
                    onClick={() => setSelectedDay(key)}
                    className={`relative p-3 sm:p-4 text-center transition
                      ${isSelected ? 'bg-[rgba(16,34,62,0.9)]' : 'bg-[rgba(9,16,28,0.85)] hover:bg-[rgba(13,22,38,0.9)]'}
                      ${idx !== 0 ? 'border-l border-white/5' : ''}
                      ${flashDay === key ? 'af-glow' : ''}
                    `}
                  >
                    <div className={`absolute inset-x-0 top-0 h-1 ${isSelected ? 'bg-gradient-to-r from-[#1f4fbf] to-[#3b82f6]' : 'bg-transparent'}`} />
                    <div className="text-[11px] sm:text-[12px] text-white/60">{format(d, 'EEE', { locale: ptBR })}</div>
                    <div className="mt-1 text-lg sm:text-xl md:text-2xl font-semibold text-white">{d.getDate()}</div>
                    <div className="mt-1 text-[11px] sm:text-[12px] md:text-[13px] text-white/70">{totalDoDia} reserva{totalDoDia === 1 ? '' : 's'}</div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>
      <div className="af-section af-card-elev shadow-sm backdrop-blur overflow-hidden min-w-0">
        <div className="mb-3 text-[15px] lg:text-base font-medium text-white">Reservas do dia
          <span className="ml-2 af-chip text-white/70">{selectedDay}</span>
        </div>
        {/* Filtros da lista */}
        <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          <input
            placeholder="Buscar por cliente"
            className="af-field placeholder:text-white/40"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <select
            className="af-field"
            value={statusSel}
            onChange={(e) => setStatusSel(e.target.value as any)}
          >
            <option className="af-card" value="todos">Todos status</option>
            <option className="af-card" value="pendente">pendente</option>
            <option className="af-card" value="confirmada">confirmada</option>
            <option className="af-card" value="cancelada">cancelada</option>
          </select>
          <select
            className="af-field"
            value={pagamentoSel}
            onChange={(e) => setPagamentoSel(e.target.value as any)}
          >
            <option className="af-card" value="todos">Todos pagamentos</option>
            <option className="af-card" value="pago">Pago</option>
            <option className="af-card" value="pendente">Pendente</option>
          </select>
        </div>
        {isLoading && <div className="af-text-dim">Carregando…</div>}
        {error && <div className="af-alert">Erro ao carregar reservas</div>}
        {!isLoading && !error && (
          <ul className="space-y-4">
            {filtered.map((r, idx) => (
              <li key={r.id}>
                <div className="af-list-card cursor-pointer" onClick={() => toggleExpand(r.id)}>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-5 sm:items-center">
                    <div className="col-span-3 space-y-1.5 min-w-0">
                      <div className="flex items-center gap-3">
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-blue-700/60 text-[12px] font-semibold text-white">{idx + 1}</span>
                        <span className="truncate title">{clienteNome(r.cliente_id)}</span>
                      </div>
                      <div className="subtle">{fmtDataHora((r as any).data_reserva, (r as any).hora_reserva)}</div>
                      <div className="text-[13px] text-white/75 flex flex-wrap gap-3">
                        <span>{(r as any).n_pessoas ? `${(r as any).n_pessoas} pessoa(s)` : '—'}</span>
                        {(r as any).observacao && <span className="truncate max-w-full">Obs: {(r as any).observacao}</span>}
                      </div>
                    </div>
                    <div className="col-span-2 flex flex-wrap items-center justify-start gap-3 sm:justify-end">
                      <span className="af-badge text-[12px]">
                        <span className="af-badge-dot" />
                        {(r.status ?? 'pendente')}
                      </span>
                      <span className="af-badge text-[12px]">
                        <span className="af-badge-dot" />
                        {r.status_pagamento ? 'Pago' : 'Pendente'}
                      </span>
                      <div className="flex items-center gap-2.5">
                        <button onClick={(e) => { e.stopPropagation(); setStatus(r.id, 'confirmada') }} className="af-btn-ghost text-sm">Confirmar</button>
                        <button onClick={(e) => { e.stopPropagation(); setStatus(r.id, 'cancelada') }} className="af-btn-ghost text-sm">Cancelar</button>
                        <button onClick={(e) => { e.stopPropagation(); togglePago(r.id, !!r.status_pagamento) }} className="af-btn-ghost text-sm">{r.status_pagamento ? 'Desmarcar pago' : 'Marcar pago'}</button>
                      </div>
                      {expandedId === r.id && (
                        <>
                          <button onClick={(e) => { e.stopPropagation(); openEdit(r) }} className="af-btn-ghost text-xs">Editar</button>
                          <button onClick={(e) => { e.stopPropagation(); if (confirm('Tem certeza que deseja excluir esta reserva?')) deleteReserva.mutate(r.id) }} className="af-btn-ghost text-xs">Excluir</button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            ))}
            {reservas?.length === 0 && <li className="py-6 text-sm text-white/70">Sem reservas ainda.</li>}
          </ul>
        )}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-xl af-card-elev p-5 shadow-xl overflow-hidden min-w-0">
            <div className="mb-3 text-lg font-semibold text-white">{editingId ? 'Editar reserva' : 'Nova reserva'}</div>
            <form onSubmit={onSubmit} className="space-y-3">
              <div>
                <label className="mb-1 block af-label">Cliente</label>
                <select
                  className="af-field"
                  value={form.cliente_id}
                  onChange={(e) => setForm((f) => ({ ...f, cliente_id: e.target.value }))}
                  required
                >
                  <option value="" className="af-card">Selecione…</option>
                  {(clientes ?? []).map((c) => (
                    <option key={c.id} value={c.id} className="af-card">{c.nome}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block af-label">Data</label>
                  <input
                    type="date"
                    className="af-field"
                    value={form.data_reserva}
                    onChange={(e) => setForm((f) => ({ ...f, data_reserva: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block af-label">Hora</label>
                  <input
                    type="time"
                    className="af-field"
                    value={form.hora_reserva}
                    onChange={(e) => setForm((f) => ({ ...f, hora_reserva: e.target.value }))}
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block af-label">Nº de pessoas</label>
                  <input
                    type="number"
                    min={1}
                    className="af-field"
                    value={form.n_pessoas}
                    onChange={(e) => setForm((f) => ({ ...f, n_pessoas: Number(e.target.value || 0) }))}
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block af-label">Observação</label>
                  <input
                    type="text"
                    placeholder="Ex: mesa perto da janela"
                    className="af-field"
                    value={form.observacao}
                    onChange={(e) => setForm((f) => ({ ...f, observacao: e.target.value }))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block af-label">Status</label>
                  <select
                    className="af-field"
                    value={form.status}
                    onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                  >
                    <option value="pendente" className="af-card">pendente</option>
                    <option value="confirmada" className="af-card">confirmada</option>
                    <option value="cancelada" className="af-card">cancelada</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block af-label">Pagamento</label>
                  <div className="flex items-center gap-2">
                    <input id="pago" type="checkbox" className="h-4 w-4" checked={form.status_pagamento} onChange={(e) => setForm((f) => ({ ...f, status_pagamento: e.target.checked }))} />
                    <label htmlFor="pago" className="af-label">Pago</label>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button type="button" onClick={() => setOpen(false)} className="af-btn text-sm">Cancelar</button>
                <div className="mr-auto min-h-[1rem] af-help">{submitError ? submitError : ''}</div>
                <button
                  type="submit"
                  disabled={createReserva.isPending || updateReserva.isPending}
                  className="af-btn-primary disabled:opacity-60"
                >
                  {createReserva.isPending || updateReserva.isPending
                    ? (editingId ? 'Salvando…' : 'Criando…')
                    : (editingId ? 'Salvar' : 'Criar')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
