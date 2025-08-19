import { useMemo, useRef, useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
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

  // Fecha o menu de status ao clicar fora
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null
      if (!t) return
      if (!t.closest('[data-status-menu]')) setExpandedId(null)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  // Removido: auto-sync em massa para evitar alterar todas as reservas ao carregar

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
  const [statusSel, setStatusSel] = useState<'todos' | 'pendente' | 'confirmada' | 'cancelada' | 'finalizada' | 'expirada'>('todos')
  const [pagamentoSel, setPagamentoSel] = useState<'todos' | 'pago' | 'pendente'>('todos')
  // Bulk selection state (lista)
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const longPressTimerRef = useRef<number | null>(null)
  const suppressNextTapIdRef = useRef<string | null>(null)
  const enableSelection = () => setSelectionMode(true)
  const disableSelection = () => { setSelectionMode(false); setSelectedIds(new Set()) }
  const toggleSelectId = (id: string | number, checked: boolean) => {
    const key = String(id)
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (checked) next.add(key)
      else next.delete(key)
      return next
    })
  }
  const bulkDeleteSelected = async () => {
    if (selectedIds.size === 0) return
    if (!confirm(`Excluir ${selectedIds.size} reserva(s)?`)) return
    const ids = Array.from(selectedIds)
    await Promise.all(ids.map((id) => deleteReserva.mutateAsync(id)))
    disableSelection()
  }
  const onCardTouchStart = (id: string | number) => {
    if (longPressTimerRef.current) window.clearTimeout(longPressTimerRef.current)
    longPressTimerRef.current = window.setTimeout(() => {
      setSelectionMode(true)
      toggleSelectId(id, true)
      // Prevent the synthetic click after long-press from toggling back (only for this card)
      suppressNextTapIdRef.current = String(id)
    }, 2000)
  }
  const onCardTouchEnd = () => {
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
  }
  // Status derivado conforme regras novas
  const now = new Date()
  const effectiveStatus = (r: any) => {
    const dateStr = r.data_reserva as string | undefined
    const timeStr = (r.hora_reserva as string | undefined)?.slice(0,5) || '00:00'
    const base = dateStr ? new Date(`${dateStr}T${timeStr}:00`) : null
    const afterDate = !!(base && now > base)
    const status = (r.status ?? 'pendente') as string
    const pago = !!r.status_pagamento
    // Regras (ajustadas):
    // - NÃO auto-finaliza quando pagar; finalização é uma ação explícita do usuário
    // - Auto-expira se passou da data e (pendente ou confirmada não paga)
    if (afterDate && (status === 'pendente' || (status === 'confirmada' && !pago))) return 'expirada'
    return status
  }

  const filtered = useMemo(() => {
    return sorted.filter((r: any) => {
      if (r.data_reserva !== selectedDay) return false
      const nome = clienteNome(r.cliente_id).toLowerCase()
      const txt = q.toLowerCase().trim()
      const matchesText = txt.length === 0 || nome.includes(txt)
      const effStatus = effectiveStatus(r)
      const matchesStatus = statusSel === 'todos' || effStatus === statusSel
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
  // posição do menu de status (portal)
  const [statusMenuPos, setStatusMenuPos] = useState<{ id: string; top: number; left: number } | null>(null)
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
  // removed: togglePago (pedido do usuário para não alterar no card)

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

  // Datas utilitárias
  const parseYYYYMMDD = (s: string) => {
    const [y, m, d] = s.split('-').map(Number)
    return new Date(y, (m || 1) - 1, d || 1)
  }
  // Visão simplificada: seletor semanal (Dom–Sáb)
  const initSelected = parseYYYYMMDD(selectedDay)
  const [viewMonthDate, setViewMonthDate] = useState<Date>(() => new Date(initSelected.getFullYear(), initSelected.getMonth(), 1))
  // Semana inicial deve representar o dia de hoje/selecionado
  const [weekIndex, setWeekIndex] = useState<number>(() => {
    const monthRef = new Date(initSelected.getFullYear(), initSelected.getMonth(), 1)
    return weekIndexFor(initSelected, monthRef)
  }) // 0..4 (5 semanas)
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
  function weekIndexFor(target: Date, monthRef: Date) {
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
        <h1 className="af-section-title">Reservas</h1>
        <div className="flex items-center gap-2">
          {/* Desktop: toggle selection */}
          <button
            onClick={() => (selectionMode ? disableSelection() : enableSelection())}
            className="hidden sm:inline-flex af-btn-ghost px-3 py-2 text-sm"
            title="Mais opções"
          >
            ⋯
          </button>
          {selectionMode && (
            <button
              onClick={bulkDeleteSelected}
              disabled={selectedIds.size === 0}
              className="hidden sm:inline-flex af-btn-ghost px-4 py-2 text-sm disabled:opacity-40"
            >
              Excluir Selecionados ({selectedIds.size})
            </button>
          )}
          {/* Mobile contextual actions: only when selection active */}
          {selectionMode && selectedIds.size > 0 && (
            <div className="inline-flex sm:hidden gap-2">
              <button onClick={bulkDeleteSelected} className="af-btn-ghost px-3 py-2 text-sm">Excluir Selecionados</button>
            </div>
          )}
          <button onClick={openCreate} className="af-btn-primary">Nova Reserva</button>
        </div>
      </div>

      {/* Modal: Seletor de dia/mês/ano */}
      {datePickerOpen && (
        <div className="fixed inset-0 z-50">
          {/* Fundo escurecido */}
          <div className="absolute inset-0 bg-white/70" onClick={() => setDatePickerOpen(false)} />
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
                  className="rounded-md border border-[var(--af-border)] px-2 py-1 text-xs text-[var(--af-text)] hover:bg-gray-100"
                  onClick={() => setPickerMonth(new Date(pickerMonth.getFullYear(), pickerMonth.getMonth() - 1, 1))}
                >←</button>
                <div className="text-sm text-[var(--af-text)]">{format(pickerMonth, 'MMMM yyyy', { locale: ptBR })}</div>
                <button
                  className="rounded-md border border-[var(--af-border)] px-2 py-1 text-xs text-[var(--af-text)] hover:bg-gray-100"
                  onClick={() => setPickerMonth(new Date(pickerMonth.getFullYear(), pickerMonth.getMonth() + 1, 1))}
                >→</button>
              </div>
              <div className="grid grid-cols-7 gap-1 text-center text-[10px] sm:text-[11px] text-[var(--af-text-dim)] mb-1">
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
                            ${inMonth ? 'bg-white text-[var(--af-text)] border-[var(--af-border)] hover:bg-primary-50' : 'bg-transparent text-[var(--af-text-muted)] border-transparent'}
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
          <div className="af-subtitle order-1">
            {(() => {
              const ws = weekDays[0]
              const we = weekDays[6]
              return `Semana de ${format(ws, 'dd/MM')} até ${format(we, 'dd/MM')}`
            })()}
          </div>
          <div className="flex items-center gap-3 justify-between md:justify-center order-2">
            <button
              className="af-btn-ghost px-4 py-2 text-sm md:text-base"
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
              className="af-btn-ghost px-4 py-2 text-sm md:text-base"
              onClick={() => {
                const today = new Date()
                const monthRef = new Date(today.getFullYear(), today.getMonth(), 1)
                setViewMonthDate(monthRef)
                setWeekIndex(weekIndexFor(today, monthRef))
                setSelectedDay(ymd(today))
                flashToday(ymd(today))
              }}
            >Hoje</button>
            <button
              className="af-btn-ghost px-4 py-2 text-sm md:text-base"
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
              className="af-btn w-full md:w-auto text-center px-4 py-2 text-sm md:text-base"
              onClick={(e) => {
                const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect()
                setPickerAnchor({ top: rect.top + window.scrollY, left: rect.left + window.scrollX, height: rect.height })
                setPickerMonth(new Date(viewMonthDate.getFullYear(), viewMonthDate.getMonth(), 1))
                setDatePickerOpen(true)
              }}
            >Selecionar data</button>
          </div>
        </div>

        {/* Linha única da semana: Dom–Sáb (7 dias, sem scroll em mobile) */}
        <div className="">
          <div className="rounded-2xl ring-1 ring-[var(--af-border)] overflow-hidden bg-white">
            <div className="grid grid-cols-7">
              {weekDays.map((d, idx) => {
                const y = d.getFullYear(); const m = String(d.getMonth() + 1).padStart(2, '0'); const dd = String(d.getDate()).padStart(2, '0')
                const key = `${y}-${m}-${dd}`
                // Contabiliza todas as reservas do dia para refletir a lista
                const totalDoDia = (reservasByDate.get(key) ?? []).length
                const isSelected = key === selectedDay
                return (
                  <button
                    key={idx}
                    onClick={() => setSelectedDay(key)}
                    className={`relative p-2 sm:p-3 text-center transition
                      ${isSelected ? 'bg-white' : 'bg-white hover:bg-gray-50'}
                      ${idx !== 0 ? 'border-l border-[var(--af-border)]' : ''}
                      ${flashDay === key ? 'af-glow' : ''}
                    `}
                  >
                    <div className={`absolute inset-x-0 top-0 h-1 ${isSelected ? 'bg-gradient-to-r from-primary-500 to-primary-400' : 'bg-transparent'}`} />
                    <div className="text-[10px] sm:text-[12px] text-[var(--af-text-dim)]">{format(d, 'EEE', { locale: ptBR })}</div>
                    <div className="mt-1 text-base sm:text-lg md:text-xl font-semibold text-[var(--af-text)]">{d.getDate()}</div>
                    <div className="mt-1 text-[10px] sm:text-[12px] md:text-[13px] text-[var(--af-text-muted)]">{totalDoDia} reserva{totalDoDia === 1 ? '' : 's'}</div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>
      <div className="af-section af-card-elev shadow-sm overflow-hidden min-w-0">
        <div className="mb-3 af-subtitle">Reservas do dia
          <span className="ml-2 af-chip text-[var(--af-text-dim)]">{format(parseYYYYMMDD(selectedDay), 'dd/MM/yy', { locale: ptBR })}</span>
        </div>
        {/* Filtros da lista */}
        <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          <input
            placeholder="Buscar por cliente"
            className="af-field placeholder:text-[var(--af-text-muted)]"
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
            <option className="af-card" value="finalizada">finalizada</option>
            <option className="af-card" value="expirada">expirada</option>
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
                <div
                  className={`relative af-list-card af-list-card-info cursor-pointer overflow-hidden ${expandedId === r.id ? 'z-50' : ''} ${
                    (() => { const s = effectiveStatus(r); return s === 'finalizada' ? 'border-t-2 border-blue-300/70' : s === 'confirmada' ? 'border-t-2 border-blue-400/60' : s === 'expirada' ? 'border-t-2 border-white/30' : s === 'cancelada' ? 'border-t-2 border-red-400/60' : 'border-t-2 border-white/20' })()
                  } ${selectionMode && selectedIds.has(String(r.id)) ? 'af-selected af-glow ring-2 ring-blue-400/50' : ''}`}
                  onClick={() => {
                    if (suppressNextTapIdRef.current === String(r.id)) {
                      suppressNextTapIdRef.current = null
                      return
                    }
                    if (selectionMode) {
                      toggleSelectId(r.id, !selectedIds.has(String(r.id)))
                    } else {
                      // não abre menu ao clicar no card; menu só abre ao clicar no chip de status
                    }
                  }}
                  onTouchStart={() => onCardTouchStart(r.id)}
                  onTouchEnd={onCardTouchEnd}
                  onTouchCancel={onCardTouchEnd}
                >
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-5 sm:items-center">
                    <div className="col-span-3 space-y-1.5 min-w-0">
                      {selectionMode && (
                        <input
                          type="checkbox"
                          className="hidden sm:inline-block h-4 w-4 mr-2 rounded border-white/30 bg-transparent align-middle"
                          checked={selectedIds.has(String(r.id))}
                          onChange={(e) => toggleSelectId(r.id, e.target.checked)}
                        />
                      )}
                      <div className="flex items-center gap-3">
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 text-blue-700 ring-1 ring-blue-200 text-[12px] font-semibold">{idx + 1}</span>
                        <span className="truncate title">{clienteNome(r.cliente_id)}</span>
                      </div>
                      <div className="subtle">{fmtDataHora((r as any).data_reserva, (r as any).hora_reserva)}</div>
                      <div className="text-[13px] text-[var(--af-text-dim)] flex flex-wrap gap-3">
                        <span>{(r as any).n_pessoas ? `${(r as any).n_pessoas} pessoa(s)` : '—'}</span>
                        {(r as any).observacao && <span className="truncate max-w-full">Obs: {(r as any).observacao}</span>}
                      </div>
                    </div>
                    <div className="col-span-2 flex flex-wrap items-center justify-start gap-3 sm:justify-end">
                      {/* Status efetivo: vira um chip clicável para abrir o menu */}
                      <div className="relative" data-status-menu>
                        {(() => {
                          const s = effectiveStatus(r)
                          const chipCls = s === 'finalizada'
                            ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-200'
                            : s === 'confirmada'
                              ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-200'
                              : s === 'expirada'
                                ? 'bg-gray-50 text-gray-600 ring-1 ring-gray-200'
                                : s === 'cancelada'
                                  ? 'bg-red-50 text-red-700 ring-1 ring-red-200'
                                  : 'bg-gray-50 text-gray-700 ring-1 ring-gray-200'
                          return (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                const next = expandedId === r.id ? null : r.id
                                setExpandedId(next)
                                if (next) {
                                  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                                  // alinhado à direita do chip
                                  setStatusMenuPos({ id: r.id, top: rect.bottom + window.scrollY + 8, left: rect.right + window.scrollX - 176 })
                                } else {
                                  setStatusMenuPos(null)
                                }
                              }}
                              className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[12px] ${chipCls}`}
                            >
                              <span className="inline-block h-2 w-2 rounded-full bg-current/80" />
                              {s}
                            </button>
                          )
                        })()}
                        {expandedId === r.id && statusMenuPos?.id === r.id && createPortal(
                          <div className="fixed z-[9999] w-44 rounded-md af-card-elev p-1 shadow-2xl" data-status-menu
                               style={{ top: statusMenuPos?.top ?? 0, left: statusMenuPos?.left ?? 0 }}>
                            <button onClick={(e) => { e.stopPropagation(); setStatus(r.id, 'confirmada'); setExpandedId(null); setStatusMenuPos(null) }} className="w-full text-left af-btn-ghost px-2 py-1.5 text-sm">Confirmar</button>
                            <button onClick={(e) => { e.stopPropagation(); updateReserva.mutate({ id: r.id, payload: { status: 'finalizada' } as any }); setExpandedId(null); setStatusMenuPos(null) }} className="w-full text-left af-btn-ghost px-2 py-1.5 text-sm">Finalizar</button>
                            <button onClick={(e) => { e.stopPropagation(); updateReserva.mutate({ id: r.id, payload: { status: 'expirada' } as any }); setExpandedId(null); setStatusMenuPos(null) }} className="w-full text-left af-btn-ghost px-2 py-1.5 text-sm">Expirar</button>
                            <button onClick={(e) => { e.stopPropagation(); setStatus(r.id, 'cancelada'); setExpandedId(null); setStatusMenuPos(null) }} className="w-full text-left af-btn-ghost px-2 py-1.5 text-sm">Cancelar</button>
                          </div>, document.body)
                        }
                      </div>
                      {/* Indicador de pagamento (bolinha verde quando pago) */}
                      <span className="inline-flex items-center gap-1" title={r.status_pagamento ? 'Pago' : 'Pagamento pendente'}>
                        <span className={`inline-block h-2.5 w-2.5 rounded-full ${r.status_pagamento ? 'bg-green-400' : 'bg-white/30'}`} />
                      </span>
                      {/* Editar / Excluir sempre visíveis */}
                      <button onClick={(e) => { e.stopPropagation(); openEdit(r) }} className="af-btn-ghost rounded-full px-3 py-1.5 text-sm">Editar</button>
                      <button onClick={(e) => { e.stopPropagation(); if (confirm('Tem certeza que deseja excluir esta reserva?')) deleteReserva.mutate(r.id) }} className="af-btn-ghost rounded-full px-3 py-1.5 text-sm">Excluir</button>
                    </div>
                  </div>
                </div>
              </li>
            ))}
            {reservas?.length === 0 && <li className="py-6 text-sm text-[var(--af-text-dim)]">Sem reservas ainda.</li>}
          </ul>
        )}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-white/70 p-4">
          <div className="w-full max-w-md rounded-xl af-card-elev p-5 shadow-xl overflow-hidden min-w-0">
            <div className="mb-3 text-lg font-semibold text-[var(--af-text)]">{editingId ? 'Editar reserva' : 'Nova reserva'}</div>
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
                    <option value="finalizada" className="af-card">finalizada</option>
                    <option value="expirada" className="af-card">expirada</option>
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
