import { useEffect, useMemo, useRef, useState } from 'react'
import { useClientes, useCreateCliente, useDeleteCliente, useUpdateCliente } from '../hooks/useRestaurantData'

export default function Clientes() {
  const { data: clientes, isLoading, error } = useClientes()
  const createCliente = useCreateCliente()
  const deleteCliente = useDeleteCliente()
  const updateCliente = useUpdateCliente()

  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
  // removed expanded card state (not used in the new card grid)
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  type LeadStatus = 'novo_lead' | 'interessado' | 'ativo' | 'inativo'
  const statusLabel: Record<LeadStatus, string> = {
    novo_lead: 'Novo Lead',
    interessado: 'Interessado',
    ativo: 'Ativo',
    inativo: 'Inativo',
  }
  const [form, setForm] = useState<{ nome: string; telefone: string; total_brindes?: number; total_reservas?: number; lead_status?: LeadStatus }>({ nome: '', telefone: '', total_brindes: 0, total_reservas: 0, lead_status: 'novo_lead' })

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nome && !telefone) return
    await createCliente.mutateAsync({ nome, telefone } as any)
    setNome('')
    setTelefone('')
  }

  // removed toggleExpand (no longer used)
  const openEdit = (c: any) => {
    setEditingId(c.id)
    setForm({
      nome: c.nome ?? '',
      telefone: c.telefone ?? '',
      total_brindes: typeof c.total_brindes === 'number' ? c.total_brindes : 0,
      total_reservas: typeof c.total_reservas === 'number' ? c.total_reservas : 0,
      lead_status: (() => {
        const s = (c.lead_status ?? '').toString().toLowerCase()
        if (s === 'novo_lead') return 'novo_lead'
        if (s === 'interessado') return 'interessado'
        if (s === 'ativo' || s === 'cliente') return 'ativo'
        if (s === 'inativo') return 'inativo'
        if (s === 'novo') return 'novo_lead'
        if (s === 'prospect') return 'interessado'
        return 'novo_lead'
      })(),
    })
    setOpen(true)
  }
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const payload = { ...form }
    if (editingId) {
      await updateCliente.mutateAsync({ id: editingId, payload })
    }
    setOpen(false)
  }

  const [view, setView] = useState<'lista' | 'kanban'>('lista')
  // Touch DnD state (mobile)
  const [touchDraggingId, setTouchDraggingId] = useState<string | null>(null)
  const [touchOverStatus, setTouchOverStatus] = useState<LeadStatus | null>(null)
  const longPressTimerRef = useRef<number | null>(null)
  const isLongPressActiveRef = useRef(false)
  const kanbanRef = useRef<HTMLDivElement | null>(null)
  const sourceColRef = useRef<HTMLElement | null>(null)
  const sourceColScrollRef = useRef<HTMLElement | null>(null)
  // Visibilidade por coluna no Kanban (5 por visualização)
  const [visibleKanban, setVisibleKanban] = useState<Record<LeadStatus, number>>({
    novo_lead: 5,
    interessado: 5,
    ativo: 5,
    inativo: 5,
  })

  // Resetar visibilidade do Kanban ao abrir Kanban ou ao recarregar clientes
  useEffect(() => {
    if (view === 'kanban') {
      setVisibleKanban({ novo_lead: 5, interessado: 5, ativo: 5, inativo: 5 })
    }
  }, [view, clientes])

  // Remove global preventDefault on touchmove to reduce jank; rely on touchAction control
  useEffect(() => {
    const onDocTouchMove = (_ev: TouchEvent) => {
      // intentionally no preventDefault
    }
    document.addEventListener('touchmove', onDocTouchMove, { passive: true })
    return () => {
      document.removeEventListener('touchmove', onDocTouchMove as any)
    }
  }, [])

  useEffect(() => {
    const el = kanbanRef.current
    if (!el) return
    const onElTouchMove = (_ev: TouchEvent) => {
      // no preventDefault; touchAction controls native behavior
    }
    el.addEventListener('touchmove', onElTouchMove, { passive: true })
    return () => {
      el.removeEventListener('touchmove', onElTouchMove as any)
    }
  }, [kanbanRef.current])
  // Filtros (lista)
  const [q, setQ] = useState('')
  const [status, setStatus] = useState<'todos' | LeadStatus>('todos')
  const [minReservas, setMinReservas] = useState<number>(0)
  const [minBrindes, setMinBrindes] = useState<number>(0)
  // Paginação simples (lista)
  const [visibleCount, setVisibleCount] = useState<number>(10)

  // Resetar paginação ao mudar filtros ou ao carregar novamente
  useEffect(() => {
    setVisibleCount(10)
  }, [q, status, minReservas, minBrindes, isLoading])

  const filteredClientes = useMemo(() => {
    const items = clientes ?? []
    return items.filter((c: any) => {
      const matchesText = q.trim().length === 0 ||
        (c.nome ?? '').toLowerCase().includes(q.toLowerCase()) ||
        (c.telefone ?? '').toLowerCase().includes(q.toLowerCase())
      const normOldToNew = (v: any): LeadStatus => {
        const s = (v ?? '').toString().toLowerCase()
        if (s === 'novo_lead') return 'novo_lead'
        if (s === 'interessado') return 'interessado'
        if (s === 'ativo' || s === 'cliente') return 'ativo'
        if (s === 'inativo') return 'inativo'
        if (s === 'novo') return 'novo_lead'
        if (s === 'prospect') return 'interessado'
        return 'novo_lead'
      }
      const matchesStatus = status === 'todos' || normOldToNew(c.lead_status) === status
      const reservas = typeof c.total_reservas === 'number' ? c.total_reservas : 0
      const brindes = typeof c.total_brindes === 'number' ? c.total_brindes : 0
      const matchesNums = reservas >= minReservas && brindes >= minBrindes
      return matchesText && matchesStatus && matchesNums
    })
  }, [clientes, q, status, minReservas, minBrindes])

  const shortName = (full: string | null | undefined) => {
    const name = (full ?? '').toString().trim()
    if (!name) return 'Sem nome'
    const parts = name.split(/\s+/).filter(Boolean)
    return parts.slice(0, 2).join(' ')
  }

  const exportCSV = () => {
    const rows = filteredClientes
    const headers = ['nome', 'telefone', 'total_brindes', 'total_reservas', 'lead_status']
    const csv = [headers.join(',')]
    for (const c of rows) {
      const vals = [
        (c.nome ?? '').toString().replaceAll('"', '""'),
        (c.telefone ?? '').toString().replaceAll('"', '""'),
        (typeof c.total_brindes === 'number' ? c.total_brindes : 0).toString(),
        (typeof c.total_reservas === 'number' ? c.total_reservas : 0).toString(),
        (c.lead_status ?? 'novo').toString().replaceAll('"', '""'),
      ].map((v) => '"' + v + '"')
      csv.push(vals.join(','))
    }
    const blob = new Blob([csv.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'clientes.csv'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const grouped = useMemo(() => {
    const base: Record<LeadStatus, any[]> = { novo_lead: [], interessado: [], ativo: [], inativo: [] }
    const norm = (v: any): LeadStatus => {
      const s = (v ?? '').toString().toLowerCase()
      if (s === 'novo_lead') return 'novo_lead'
      if (s === 'interessado') return 'interessado'
      if (s === 'ativo' || s === 'cliente') return 'ativo'
      if (s === 'inativo') return 'inativo'
      if (s === 'novo') return 'novo_lead'
      if (s === 'prospect') return 'interessado'
      return 'novo_lead'
    }
    for (const c of clientes ?? []) {
      const key = norm((c as any).lead_status)
      base[key].push(c)
    }
    return base
  }, [clientes])

  // Desktop drag start (kept)
  const onDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id)
    e.dataTransfer.effectAllowed = 'move'
  }
  const onDropTo = async (e: React.DragEvent, status: LeadStatus) => {
    e.preventDefault()
    const id = e.dataTransfer.getData('text/plain')
    if (!id) return
    await updateCliente.mutateAsync({ id, payload: { lead_status: status } as any })
  }
  const allowDrop = (e: React.DragEvent) => e.preventDefault()

  // Mobile touch drag & drop (long-press)
  // Edge auto-scroll loop (rAF-based) to avoid jank while dragging
  const edgeScrollReqRef = useRef<number | null>(null)
  const edgeScrollDirRef = useRef<number>(0) // -1 up, 1 down, 0 none
  const edgeScrollSpeedRef = useRef<number>(0) // pixels per frame step

  const stopEdgeScroll = () => {
    if (edgeScrollReqRef.current != null) {
      cancelAnimationFrame(edgeScrollReqRef.current)
      edgeScrollReqRef.current = null
    }
    edgeScrollDirRef.current = 0
    edgeScrollSpeedRef.current = 0
  }

  const ensureEdgeScrollLoop = () => {
    if (edgeScrollReqRef.current != null) return
    const tick = () => {
      if (isLongPressActiveRef.current && edgeScrollDirRef.current !== 0) {
        const step = Math.max(0, Math.min(32, edgeScrollSpeedRef.current))
        if (step > 0) {
          window.scrollBy(0, edgeScrollDirRef.current * step)
        }
        edgeScrollReqRef.current = requestAnimationFrame(tick)
      } else {
        stopEdgeScroll()
      }
    }
    edgeScrollReqRef.current = requestAnimationFrame(tick)
  }
  const startLongPress = (id: string) => {
    if (longPressTimerRef.current) window.clearTimeout(longPressTimerRef.current)
    isLongPressActiveRef.current = false
    longPressTimerRef.current = window.setTimeout(() => {
      isLongPressActiveRef.current = true
      setTouchDraggingId(id)
      // Improve UX: disable text selection while dragging
      document.body.classList.add('select-none')
      // Disable browser touch gestures during drag (avoids passive preventDefault issue),
      // but DO NOT lock page scroll so we can auto-scroll programmatically
      ;(document.body as any).style.touchAction = 'none'
      // Also disable touch actions on Kanban grid to stop inner scroll
      if (kanbanRef.current) {
        kanbanRef.current.style.touchAction = 'none'
        kanbanRef.current.style.overflow = 'hidden'
      }
      // Lock the scroll of the SOURCE column only
      try {
        const cardEl = document.querySelector(`[data-card-id="${id}"]`) as HTMLElement | null
        const colEl = cardEl?.closest('[data-status-col]') as HTMLElement | null
        sourceColRef.current = colEl
        const innerScroll = colEl?.querySelector('.af-scroll-y') as HTMLElement | null
        sourceColScrollRef.current = innerScroll
        if (innerScroll) {
          innerScroll.style.overflow = 'hidden'
          innerScroll.style.touchAction = 'none'
        } else if (colEl) {
          colEl.style.overflow = 'hidden'
          colEl.style.touchAction = 'none'
        }
      } catch {}
    }, 220) // ~220ms feels responsive without accidental drags
  }

  const cancelLongPress = () => {
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
  }

  const handleCardTouchStart = (id: string) => () => {
    // allow scrolling until long-press fires
    startLongPress(id)
  }

  const handleCardTouchMove = (e: React.TouchEvent) => {
    if (!isLongPressActiveRef.current || !touchDraggingId) return
    const t = e.touches[0]
    if (!t) return
    // Do not call preventDefault on passive listeners; we disabled touch-action instead
    const el = document.elementFromPoint(t.clientX, t.clientY) as HTMLElement | null
    const colEl = el?.closest('[data-status-col]') as HTMLElement | null
    const attr = colEl?.getAttribute('data-status-col') as LeadStatus | undefined
    if (attr === 'novo_lead' || attr === 'interessado' || attr === 'ativo' || attr === 'inativo') {
      setTouchOverStatus(attr)
    } else {
      setTouchOverStatus(null)
    }

    // Edge auto-scroll (dynamic): closer à borda => mais velocidade
    const vh = window.innerHeight
    const bottomZone = vh * 0.75
    const topZone = vh * 0.25
    const minStep = 4
    const maxStep = 24
    if (t.clientY > bottomZone) {
      const ratio = Math.min(1, Math.max(0, (t.clientY - bottomZone) / (vh - bottomZone)))
      edgeScrollDirRef.current = 1
      edgeScrollSpeedRef.current = Math.round(minStep + ratio * (maxStep - minStep))
      ensureEdgeScrollLoop()
    } else if (t.clientY < topZone) {
      const ratio = Math.min(1, Math.max(0, (topZone - t.clientY) / topZone))
      edgeScrollDirRef.current = -1
      edgeScrollSpeedRef.current = Math.round(minStep + ratio * (maxStep - minStep))
      ensureEdgeScrollLoop()
    } else {
      edgeScrollDirRef.current = 0
      edgeScrollSpeedRef.current = 0
    }
  }

  const handleCardTouchEnd = async () => {
    cancelLongPress()
    stopEdgeScroll()
    if (isLongPressActiveRef.current && touchDraggingId && touchOverStatus) {
      try {
        await updateCliente.mutateAsync({ id: touchDraggingId, payload: { lead_status: touchOverStatus } as any })
      } finally {
        // reset below
      }
    }
    isLongPressActiveRef.current = false
    setTouchDraggingId(null)
    setTouchOverStatus(null)
    document.body.classList.remove('select-none')
    ;(document.body as any).style.touchAction = ''
    ;(document.body as any).style.overflow = ''
    ;(document.documentElement as any).style.overflow = ''
    if (kanbanRef.current) {
      kanbanRef.current.style.touchAction = ''
      kanbanRef.current.style.overflow = ''
    }
    // Restore source column scroll
    if (sourceColScrollRef.current) {
      sourceColScrollRef.current.style.overflow = ''
      sourceColScrollRef.current.style.touchAction = ''
    }
    if (sourceColRef.current) {
      sourceColRef.current.style.overflow = ''
      sourceColRef.current.style.touchAction = ''
    }
    sourceColScrollRef.current = null
    sourceColRef.current = null
  }

  const handleCardTouchCancel = () => {
    cancelLongPress()
    stopEdgeScroll()
    isLongPressActiveRef.current = false
    setTouchDraggingId(null)
    setTouchOverStatus(null)
    document.body.classList.remove('select-none')
    ;(document.body as any).style.touchAction = ''
    // Restore source column scroll on cancel
    if (sourceColScrollRef.current) {
      sourceColScrollRef.current.style.overflow = ''
      sourceColScrollRef.current.style.touchAction = ''
    }
    if (sourceColRef.current) {
      sourceColRef.current.style.overflow = ''
      sourceColRef.current.style.touchAction = ''
    }
    sourceColScrollRef.current = null
    sourceColRef.current = null
  }

  return (
    <div className="space-y-6 lg:space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl md:text-3xl xl:text-4xl font-semibold bg-clip-text text-transparent af-grad">Clientes</h1>
        <div className="flex items-center gap-2">
          <button
            aria-label="Lista"
            title="Lista"
            onClick={() => setView('lista')}
            className={`rounded-md ${view==='lista' ? 'af-card' : 'af-card'} p-2 text-white hover:af-glow`}
          >
            {/* List icon */}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="4" y="5" width="16" height="2" fill="currentColor"/>
              <rect x="4" y="11" width="16" height="2" fill="currentColor"/>
              <rect x="4" y="17" width="16" height="2" fill="currentColor"/>
            </svg>
          </button>
          <button
            aria-label="Kanban"
            title="Kanban"
            onClick={() => setView('kanban')}
            className={`rounded-md ${view==='kanban' ? 'af-card' : 'af-card'} p-2 text-white hover:af-glow`}
          >
            {/* Kanban icon */}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="4" y="5" width="4" height="14" fill="currentColor"/>
              <rect x="10" y="5" width="4" height="9" fill="currentColor"/>
              <rect x="16" y="5" width="4" height="12" fill="currentColor"/>
            </svg>
          </button>
        </div>
      </div>
      {view === 'lista' ? (
        <div>
          <div className="af-section af-card-elev shadow-sm backdrop-blur overflow-hidden min-w-0">
            <form onSubmit={onCreate} className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <input
                placeholder="Nome"
                className="af-field placeholder:text-white/40"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
              />
              <input
                placeholder="Telefone"
                className="af-field placeholder:text-white/40"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
              />
              <button
                type="submit"
                disabled={createCliente.isPending}
                className="af-btn-primary disabled:opacity-60"
              >
                {createCliente.isPending ? 'Adicionando…' : 'Adicionar'}
              </button>
            </form>
          </div>

          <div className="af-section af-card-elev shadow-sm backdrop-blur overflow-hidden min-w-0">
            <div className="mb-3 text-sm font-medium text-white">Lista de Clientes</div>
            <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-4">
              <input
                placeholder="Buscar por nome ou telefone"
                className="af-field placeholder:text-white/40"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
              <select
                className="af-field"
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
              >
                <option className="af-card" value="todos">Todos status</option>
                <option className="af-card" value="novo_lead">Novo Lead</option>
                <option className="af-card" value="interessado">Interessado</option>
                <option className="af-card" value="ativo">Ativo</option>
                <option className="af-card" value="inativo">Inativo</option>
              </select>
              <select
                className="af-field"
                value={minReservas}
                onChange={(e) => setMinReservas(Number(e.target.value))}
              >
                <option className="af-card" value={0}>Mín. reservas: 0</option>
                <option className="af-card" value={1}>Mín. reservas: 1+</option>
                <option className="af-card" value={2}>Mín. reservas: 2+</option>
                <option className="af-card" value={3}>Mín. reservas: 3+</option>
                <option className="af-card" value={5}>Mín. reservas: 5+</option>
                <option className="af-card" value={10}>Mín. reservas: 10+</option>
              </select>
              <select
                className="af-field"
                value={minBrindes}
                onChange={(e) => setMinBrindes(Number(e.target.value))}
              >
                <option className="af-card" value={0}>Mín. brindes: 0</option>
                <option className="af-card" value={1}>Mín. brindes: 1+</option>
                <option className="af-card" value={2}>Mín. brindes: 2+</option>
                <option className="af-card" value={3}>Mín. brindes: 3+</option>
                <option className="af-card" value={5}>Mín. brindes: 5+</option>
                <option className="af-card" value={10}>Mín. brindes: 10+</option>
              </select>
            </div>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs text-white/80">{filteredClientes.length} cliente(s) encontrados</div>
              <button onClick={exportCSV} className="rounded-md af-card px-4 py-2 text-sm lg:text-[15px] text-white hover:af-glow">Exportar CSV</button>
            </div>
            {isLoading && <div className="af-text-dim">Carregando…</div>}
            {error && <div className="af-alert">Erro ao carregar clientes</div>}
            {!isLoading && !error ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4">
                {filteredClientes.slice(0, visibleCount).map((c) => (
                  <div key={c.id} className="af-list-card">
                    <div className="af-card-head flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="h-10 w-10 rounded-full bg-[#0b1422] grid place-items-center text-white text-[12px] font-semibold shrink-0">
                          {(() => {
                            const name = (c.nome ?? 'Cliente').toString().trim()
                            const ini = name.split(/\s+/).map((p: string) => p[0]).slice(0,2).join('').toUpperCase()
                            return ini || 'CL'
                          })()}
                        </div>
                        <div className="min-w-0">
                          <div className="truncate title text-[15px] leading-5">{shortName(c.nome)}</div>
                          <div className="subtle text-xs text-white/80 break-words" style={{ marginTop: '0.4rem' }}>
                            <span className="inline-flex items-center gap-1.5 align-top">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="opacity-80">
                                <path d="M6.62 10.79a15.053 15.053 0 006.59 6.59l2.2-2.2a1 1 0 011.01-.24c1.12.37 2.33.57 3.58.57a1 1 0 011 1V21a1 1 0 01-1 1C10.85 22 2 13.15 2 2a1 1 0 011-1h3.5a1 1 0 011 1c0 1.25.2 2.46.57 3.58a1 1 0 01-.24 1.01l-2.2 2.2z" fill="currentColor"/>
                              </svg>
                              <span className="break-words">{c.telefone ?? '—'}</span>
                            </span>
                          </div>
                        </div>
                      </div>
                      <span className="af-badge text-[11px] shrink-0">
                        <span className="af-badge-dot" />
                        {(() => {
                          const s = (c as any).lead_status
                          const map = (v: any): LeadStatus => {
                            const t = (v ?? '').toString().toLowerCase()
                            if (t === 'novo_lead') return 'novo_lead'
                            if (t === 'interessado') return 'interessado'
                            if (t === 'ativo' || t === 'cliente') return 'ativo'
                            if (t === 'inativo') return 'inativo'
                            if (t === 'novo') return 'novo_lead'
                            if (t === 'prospect') return 'interessado'
                            return 'novo_lead'
                          }
                          return statusLabel[map(s)]
                        })()}
                      </span>
                    </div>
                    <div className="af-list-sep" />
                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="af-metric-soft">
                        <div className="label">Brindes</div>
                        <div className="value text-[15px]">{c.total_brindes ?? 0}</div>
                      </div>
                      <div className="af-metric-soft">
                        <div className="label">Reservas</div>
                        <div className="value text-[15px]">{c.total_reservas ?? 0}</div>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-end gap-2">
                      <button onClick={() => openEdit(c)} className="w-full sm:w-auto af-btn-ghost px-3 py-1.5 text-xs">Editar</button>
                      <button onClick={() => { if (confirm('Excluir este cliente?')) deleteCliente.mutate(c.id) }} className="w-full sm:w-auto af-btn-ghost px-3 py-1.5 text-xs">Excluir</button>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
            {!isLoading && !error && filteredClientes.length > visibleCount ? (
              <div className="mt-4 flex justify-center">
                <button
                  type="button"
                  onClick={() => setVisibleCount((n) => n + Math.min(10, Math.max(0, filteredClientes.length - n)))}
                  className="rounded-md af-card px-4 py-2 text-sm lg:text-[15px] text-white hover:af-glow"
                >
                  {(() => {
                    const remaining = Math.max(0, filteredClientes.length - visibleCount)
                    const step = Math.min(10, remaining)
                    return `Ver mais ${step}`
                  })()}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="rounded-xl af-card-elev p-4 lg:p-5 xl:p-6 shadow-sm backdrop-blur overflow-hidden min-w-0">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-sm font-medium text-white">Kanban por lead status</div>
            <div className="text-xs text-white/80">
              Novo Lead: {grouped.novo_lead.length} • Interessado: {grouped.interessado.length} • Ativo: {grouped.ativo.length} • Inativo: {grouped.inativo.length}
            </div>
          </div>
          <div ref={kanbanRef} className="grid grid-cols-1 gap-4 md:grid-cols-4 md:gap-5 overflow-x-auto af-snap-x py-1 pr-1">
            {(['novo_lead','interessado','ativo','inativo'] as LeadStatus[]).map((statusCol) => (
              <div
                key={statusCol}
                data-status-col={statusCol}
                onDragOver={allowDrop}
                onDrop={(e) => onDropTo(e, statusCol)}
                className={`min-h-[240px] af-kanban-col overflow-hidden min-w-[260px] md:min-w-0 af-snap-start ${touchOverStatus === statusCol ? 'ring-1 ring-blue-400/60' : ''}`}
              >
                <div className="af-kanban-col-header flex items-center justify-between">
                  <div className="text-sm lg:text-[15px] font-semibold text-white tracking-tight">
                    {statusLabel[statusCol]}
                  </div>
                  <span className="af-badge"><span className="af-badge-dot" />{grouped[statusCol].length}</span>
                </div>
                <div className="space-y-2 af-scroll-y">
                  {grouped[statusCol].slice(0, visibleKanban[statusCol]).map((c: any) => (
                    <div
                      key={c.id}
                      data-card-id={c.id}
                      draggable
                      onDragStart={(e) => onDragStart(e, c.id)}
                      onTouchStart={handleCardTouchStart(c.id)}
                      onTouchMove={handleCardTouchMove}
                      onTouchEnd={handleCardTouchEnd}
                      onTouchCancel={handleCardTouchCancel}
                      className={`af-kanban-card overflow-hidden ${touchDraggingId === c.id ? 'opacity-70 ring-1 ring-blue-400/60 pointer-events-none' : 'cursor-grab active:cursor-grabbing'}`}
                    >
                      <div className="af-card-head flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate title text-[15px] leading-5">{shortName(c.nome)}</div>
                          <div className="subtle text-xs text-white/80 break-words" style={{ marginTop: '0.4rem' }}>{c.telefone || '—'}</div>
                        </div>
                        <button onClick={() => openEdit(c)} className="shrink-0 af-btn-ghost px-2 py-1 lg:px-3 lg:py-1.5 text-[11px] lg:text-[12px]">Editar</button>
                      </div>
                      <div className="mt-2 flex items-center gap-2 text-[11px] lg:text-[12px] flex-wrap">
                        <span className="af-badge"><span className="af-badge-dot" />Brindes: {c.total_brindes ?? 0}</span>
                        <span className="af-badge"><span className="af-badge-dot" />Reservas: {c.total_reservas ?? 0}</span>
                      </div>
                    </div>
                  ))}
                  {(() => {
                    const shown = visibleKanban[statusCol] ?? 0
                    const total = grouped[statusCol].length
                    const remaining = Math.max(0, total - shown)
                    if (remaining > 0) {
                      const step = Math.min(5, remaining)
                      return (
                        <div className="pt-1 flex justify-center">
                          <button
                            type="button"
                            onClick={() => setVisibleKanban((s) => ({ ...s, [statusCol]: (s[statusCol] ?? 0) + step }))}
                            className="rounded-md af-card px-3 py-1.5 text-xs lg:text-[13px] text-white hover:af-glow"
                          >
                            {`Ver mais ${step}`}
                          </button>
                        </div>
                      )
                    }
                    return null
                  })()}
                  {grouped[statusCol].length === 0 && <div className="rounded-md af-card p-3 text-sm af-text-dim">Sem itens</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-xl af-card-elev p-5 lg:p-6 shadow-xl">
            <div className="mb-3 text-lg lg:text-xl font-semibold text-white">Editar cliente</div>
            <form onSubmit={onSubmit} className="space-y-3 lg:space-y-4">
              <div>
                <label className="mb-1 block af-label">Nome</label>
                <input className="af-field" value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} required />
              </div>
              
              <div>
                <label className="mb-1 block af-label">Telefone</label>
                <input className="af-field" value={form.telefone} onChange={(e) => setForm((f) => ({ ...f, telefone: e.target.value }))} />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block af-label">Brindes</label>
                  <input type="number" min={0} className="af-field" value={form.total_brindes} onChange={(e) => setForm((f) => ({ ...f, total_brindes: Number(e.target.value || 0) }))} />
                </div>
                <div>
                  <label className="mb-1 block af-label">Reservas</label>
                  <input type="number" min={0} className="af-field" value={form.total_reservas} onChange={(e) => setForm((f) => ({ ...f, total_reservas: Number(e.target.value || 0) }))} />
                </div>
                <div>
                  <label className="mb-1 block af-label">Lead status</label>
                  <select className="af-field" value={form.lead_status} onChange={(e) => setForm((f) => ({ ...f, lead_status: e.target.value as LeadStatus }))}>
                    <option className="af-card" value="novo_lead">Novo Lead</option>
                    <option className="af-card" value="interessado">Interessado</option>
                    <option className="af-card" value="ativo">Ativo</option>
                    <option className="af-card" value="inativo">Inativo</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button type="button" onClick={() => setOpen(false)} className="rounded-md af-card px-4 py-2 lg:px-5 lg:py-3 text-sm lg:text-[15px] text-white hover:af-glow">Cancelar</button>
                <button type="submit" className="af-btn-primary">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
