import { useEffect, useMemo, useRef, useState } from 'react'
import { useClientes, useCreateCliente, useDeleteCliente, useUpdateCliente, useQrcodes, useReservas } from '../hooks/useRestaurantData'

export default function Clientes() {
  const { data: clientes, isLoading, error } = useClientes()
  const { data: qrcodes } = useQrcodes()
  const { data: reservas } = useReservas()
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
  // Modal state for viewing Brindes/Reservas of a cliente
  const [modalCliente, setModalCliente] = useState<any | null>(null)
  const [modalType, setModalType] = useState<'brindes' | 'reservas' | null>(null)

  // Derivar quantidade de brindes por cliente a partir de qrcodes.cliente_id
  const brindesPorCliente = useMemo(() => {
    const map: Record<string, number> = {}
    for (const q of (qrcodes ?? [])) {
      const k = String((q as any)?.cliente_id ?? '')
      if (!k) continue
      map[k] = (map[k] ?? 0) + 1
    }
    return map
  }, [qrcodes])

  // Derivar quantidade de reservas por cliente a partir de reservas.cliente_id
  const reservasPorCliente = useMemo(() => {
    const map: Record<string, number> = {}
    for (const r of (reservas ?? [])) {
      const k = String((r as any)?.cliente_id ?? '')
      if (!k) continue
      map[k] = (map[k] ?? 0) + 1
    }
    return map
  }, [reservas])

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
    const payload: any = {
      nome: form.nome,
      telefone: form.telefone,
      lead_status: form.lead_status,
    }
    if (editingId) {
      await updateCliente.mutateAsync({ id: editingId, payload })
    }
    setOpen(false)
  }

  const [view, setView] = useState<'lista' | 'kanban'>('lista')
  // Bulk selection (lista view)
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const longPressTimerListRef = useRef<number | null>(null)
  const suppressNextTapListIdRef = useRef<string | null>(null)
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
    if (!confirm(`Excluir ${selectedIds.size} cliente(s)?`)) return
    const ids = Array.from(selectedIds)
    await Promise.all(ids.map((id) => deleteCliente.mutateAsync(id)))
    disableSelection()
  }
  const onCardTouchStartLista = (id: string | number) => {
    if (longPressTimerListRef.current) window.clearTimeout(longPressTimerListRef.current)
    longPressTimerListRef.current = window.setTimeout(() => {
      setSelectionMode(true)
      toggleSelectId(id, true)
      // Avoid synthetic click toggling off right after long-press (only for this card)
      suppressNextTapListIdRef.current = String(id)
    }, 2000)
  }
  const onCardTouchEndLista = () => {
    if (longPressTimerListRef.current) {
      window.clearTimeout(longPressTimerListRef.current)
      longPressTimerListRef.current = null
    }
  }
  // Touch DnD state (mobile)
  const [touchDraggingId, setTouchDraggingId] = useState<string | null>(null)
  const [touchOverStatus, setTouchOverStatus] = useState<LeadStatus | null>(null)
  const longPressTimerRef = useRef<number | null>(null)
  const kanbanSelectTimerRef = useRef<number | null>(null)
  const suppressNextTapKanbanIdRef = useRef<string | null>(null)
  const dndActivatedRef = useRef(false)
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
      const reservas = reservasPorCliente[String(c.id)] ?? 0
      const brindes = brindesPorCliente[String(c.id)] ?? 0
      const matchesNums = reservas >= minReservas && brindes >= minBrindes
      return matchesText && matchesStatus && matchesNums
    })
  }, [clientes, q, status, minReservas, minBrindes, brindesPorCliente, reservasPorCliente])

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
        ((brindesPorCliente[String(c.id)] ?? 0)).toString(),
        ((reservasPorCliente[String(c.id)] ?? 0)).toString(),
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
    if (kanbanSelectTimerRef.current) window.clearTimeout(kanbanSelectTimerRef.current)
    isLongPressActiveRef.current = false
    // DnD activation (short long-press)
    longPressTimerRef.current = window.setTimeout(() => {
      if (selectionMode) return // don't start DnD while selecting
      dndActivatedRef.current = true
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
    // Selection activation (2s long-press)
    kanbanSelectTimerRef.current = window.setTimeout(() => {
      if (isLongPressActiveRef.current || dndActivatedRef.current) return // already dragging, skip selection
      // Activate selection mode and select the card
      setSelectionMode(true)
      setSelectedIds((prev) => { const s = new Set(prev); s.add(String(id)); return s })
      // Avoid synthetic click immediately toggling off (only for this card)
      suppressNextTapKanbanIdRef.current = String(id)
      // Cancel any pending DnD
      if (longPressTimerRef.current) {
        window.clearTimeout(longPressTimerRef.current)
        longPressTimerRef.current = null
      }
    }, 2000)
  }

  const cancelLongPress = () => {
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
    if (kanbanSelectTimerRef.current) {
      window.clearTimeout(kanbanSelectTimerRef.current)
      kanbanSelectTimerRef.current = null
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
        <h1 className="af-section-title">Clientes</h1>
        <div className="flex items-center gap-2">
          <button
            aria-label="Lista"
            title="Lista"
            onClick={() => setView('lista')}
            className={`rounded-md ${view==='lista' ? 'af-card' : 'af-card'} p-2 hover:af-glow`}
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
            className={`rounded-md ${view==='kanban' ? 'af-card' : 'af-card'} p-2 hover:af-glow`}
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
          <div className="af-section af-card-elev shadow-sm overflow-hidden min-w-0">
            <form onSubmit={onCreate} className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <input
                placeholder="Nome"
                className="af-field placeholder:text-slate-400"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
              />
              <input
                placeholder="Telefone"
                className="af-field placeholder:text-slate-400"
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

          <div className="af-section af-card-elev shadow-sm overflow-hidden min-w-0">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="af-subtitle">Lista de Clientes</div>
              <div className="flex items-center gap-2">
                {/* Desktop: toggle selection mode */}
                <button
                  onClick={() => (selectionMode ? disableSelection() : enableSelection())}
                  className="hidden sm:inline-flex af-btn-ghost px-3 py-1.5 text-xs"
                  title="Mais opções"
                >
                  ⋯
                </button>
                {selectionMode && (
                  <button
                    onClick={bulkDeleteSelected}
                    disabled={selectedIds.size === 0}
                    className="hidden sm:inline-flex af-btn-ghost px-3 py-1.5 text-xs disabled:opacity-40"
                  >
                    Excluir Selecionados ({selectedIds.size})
                  </button>
                )}
                {/* Mobile contextual actions: only show when selection is active */}
                {selectionMode && selectedIds.size > 0 && (
                  <div className="inline-flex sm:hidden gap-2">
                    <button onClick={bulkDeleteSelected} className="af-btn-ghost px-3 py-1.5 text-xs">Excluir Selecionados</button>
                  </div>
                )}
              </div>
            </div>
            <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-4">
              <input
                placeholder="Buscar por nome ou telefone"
                className="af-field placeholder:text-slate-400"
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
              <div className="text-xs af-text-dim">{filteredClientes.length} cliente(s) encontrados</div>
              <button onClick={exportCSV} className="rounded-md af-card px-4 py-2 text-sm lg:text-[15px] hover:af-glow">Exportar CSV</button>
            </div>
            {isLoading && <div className="af-text-dim">Carregando…</div>}
            {error && <div className="af-alert">Erro ao carregar clientes</div>}
            {!isLoading && !error ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4">
                {filteredClientes.slice(0, visibleCount).map((c) => (
                  <div
                    key={c.id}
                    className={`af-list-card af-list-card-info relative overflow-hidden transition-shadow ${
                      ((c as any).lead_status ?? '').toString().toLowerCase() === 'ativo'
                        ? 'border-t-2 border-blue-400/60'
                        : ((c as any).lead_status ?? '').toString().toLowerCase() === 'inativo'
                          ? 'border-t-2 border-red-400/60'
                          : 'border-t-2 border-white/20'
                    } ${selectionMode && selectedIds.has(String(c.id)) ? 'af-selected af-glow ring-2 ring-blue-400/50' : ''}`}
                    onTouchStart={() => onCardTouchStartLista(c.id)}
                    onTouchEnd={onCardTouchEndLista}
                    onTouchCancel={onCardTouchEndLista}
                    onClick={() => {
                      if (suppressNextTapListIdRef.current === String(c.id)) {
                        suppressNextTapListIdRef.current = null
                        return
                      }
                      if (selectionMode) {
                        toggleSelectId(c.id, !selectedIds.has(String(c.id)))
                      }
                    }}
                  >
                    <div className="pointer-events-none absolute inset-0 opacity-[0.04]" style={{
                      background: 'radial-gradient(1200px 500px at -10% -10%, rgba(255,255,255,0.35), transparent 60%)'
                    }} />
                    <div className="af-card-head flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {selectionMode && (
                          <input
                            type="checkbox"
                            className="mt-1 hidden sm:block h-4 w-4 rounded border-white/30 bg-transparent"
                            checked={selectedIds.has(String(c.id))}
                            onChange={(e) => toggleSelectId(String(c.id), e.target.checked)}
                          />
                        )}
                        <div className="h-11 w-11 rounded-full bg-blue-50 grid place-items-center text-blue-700 text-[12px] font-semibold shrink-0 shadow-inner">
                          {(() => {
                            const name = (c.nome ?? 'Cliente').toString().trim()
                            const ini = name.split(/\s+/).map((p: string) => p[0]).slice(0,2).join('').toUpperCase()
                            return ini || 'CL'
                          })()}
                        </div>
                        <div className="min-w-0">
                          <div className="truncate title text-[16px] leading-5">{shortName(c.nome)}</div>
                          <div className="subtle text-xs af-text-dim break-words" style={{ marginTop: '0.35rem' }}>
                            <span className="inline-flex items-center gap-1.5 align-top">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="opacity-80">
                                <path d="M6.62 10.79a15.053 15.053 0 006.59 6.59l2.2-2.2a1 1 0 011.01-.24c1.12.37 2.33.57 3.58.57a1 1 0 011 1V21a1 1 0 01-1 1C10.85 22 2 13.15 2 2a1 1 0 011-1h3.5a1 1 0 011 1c0 1.25.2 2.46.57 3.58a1 1 0 01-.24 1.01l-2.2 2.2z" fill="currentColor"/>
                              </svg>
                              <span className="break-words">{c.telefone ?? '—'}</span>
                            </span>
                          </div>
                        </div>
                      </div>
                      <span className="af-badge text-[11px] shrink-0 shadow-sm">
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
                      <div
                        className="af-metric-soft ring-1 ring-white/10 cursor-pointer hover:af-glow"
                        onClick={() => { setModalCliente(c); setModalType('brindes') }}
                        title="Ver brindes do cliente"
                      >
                        <div className="label">Brindes</div>
                        <div className="value text-[15px]">{brindesPorCliente[String(c.id)] ?? 0}</div>
                      </div>
                      <div
                        className="af-metric-soft ring-1 ring-white/10 cursor-pointer hover:af-glow"
                        onClick={() => { setModalCliente(c); setModalType('reservas') }}
                        title="Ver reservas do cliente"
                      >
                        <div className="label">Reservas</div>
                        <div className="value text-[15px]">{reservasPorCliente[String(c.id)] ?? 0}</div>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-end gap-2">
                      <button onClick={() => openEdit(c)} className="w-full sm:w-auto af-btn-ghost px-3 py-1.5 text-xs">Editar</button>
                      {/* Oculta excluir por card no desktop quando em modo seleção */}
                      <button
                        onClick={() => { if (confirm('Excluir este cliente?')) deleteCliente.mutate(c.id) }}
                        className={`w-full sm:w-auto af-btn-ghost px-3 py-1.5 text-xs ${selectionMode ? 'hidden sm:inline-flex sm:hidden' : ''}`}
                      >
                        Excluir
                      </button>
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
                  className="rounded-md af-card px-4 py-2 text-sm lg:text-[15px] hover:af-glow"
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
        <div className="rounded-xl af-card-elev p-4 lg:p-5 xl:p-6 shadow-sm overflow-hidden min-w-0">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-sm font-medium">Kanban por lead status</div>
            <div className="flex items-center gap-2">
              {/* Desktop: toggle selection mode */}
              <button
                onClick={() => (selectionMode ? disableSelection() : enableSelection())}
                className="hidden sm:inline-flex af-btn-ghost px-3 py-1.5 text-xs"
                title="Mais opções"
              >
                ⋯
              </button>
              {selectionMode && (
                <button
                  onClick={bulkDeleteSelected}
                  disabled={selectedIds.size === 0}
                  className="hidden sm:inline-flex af-btn-ghost px-3 py-1.5 text-xs disabled:opacity-40"
                >
                  Excluir Selecionados ({selectedIds.size})
                </button>
              )}
              {/* Mobile contextual actions */}
              {selectionMode && selectedIds.size > 0 && (
                <div className="inline-flex sm:hidden gap-2">
                  <button onClick={bulkDeleteSelected} className="af-btn-ghost px-3 py-1.5 text-xs">Excluir Selecionados</button>
                </div>
              )}
              <div className="text-xs af-text-dim">
                Novo Lead: {grouped.novo_lead.length} • Interessado: {grouped.interessado.length} • Ativo: {grouped.ativo.length} • Inativo: {grouped.inativo.length}
              </div>
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
                  <div className="text-sm lg:text-[15px] font-semibold tracking-tight">
                    {statusLabel[statusCol]}
                  </div>
                  <span className="af-badge"><span className="af-badge-dot" />{grouped[statusCol].length}</span>
                </div>
                <div className="space-y-2 af-scroll-y">
                  {grouped[statusCol].slice(0, visibleKanban[statusCol]).map((c: any) => (
                    <div
                      key={c.id}
                      data-card-id={c.id}
                      draggable={!selectionMode}
                      onDragStart={(e) => { if (!selectionMode) onDragStart(e, c.id) }}
                      onTouchStart={handleCardTouchStart(c.id)}
                      onTouchMove={handleCardTouchMove}
                      onTouchEnd={handleCardTouchEnd}
                      onTouchCancel={handleCardTouchCancel}
                      onClick={() => {
                        if (suppressNextTapKanbanIdRef.current === String(c.id)) {
                          suppressNextTapKanbanIdRef.current = null
                          return
                        }
                        if (selectionMode) {
                          const key = String(c.id)
                          toggleSelectId(key, !selectedIds.has(key))
                        }
                      }}
                      className={`af-kanban-card overflow-hidden bg-white ring-1 ring-slate-200/70 shadow-sm ${
                        statusCol === 'ativo'
                          ? 'border-t-2 border-blue-300'
                          : statusCol === 'inativo'
                            ? 'border-t-2 border-rose-300'
                            : statusCol === 'interessado'
                              ? 'border-t-2 border-indigo-300'
                              : 'border-t-2 border-slate-200'
                      } ${
                        selectionMode && selectedIds.has(String(c.id))
                          ? 'ring-2 ring-blue-400/50 af-glow shadow-2xl translate-y-[-1px] relative z-[1]'
                          : (touchDraggingId === c.id ? 'opacity-70 ring-1 ring-blue-400/60 pointer-events-none' : 'cursor-grab active:cursor-grabbing')
                      }`}
                    >
                      <div className="af-card-head flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate title text-[15px] leading-5">{shortName(c.nome)}</div>
                          <div className="subtle text-xs af-text-dim break-words" style={{ marginTop: '0.4rem' }}>{c.telefone || '—'}</div>
                        </div>
                        <button onClick={() => openEdit(c)} className="shrink-0 af-btn-ghost px-2 py-1 lg:px-3 lg:py-1.5 text-[11px] lg:text-[12px]">Editar</button>
                      </div>
                      <div className="mt-2 flex items-center gap-2 text-[11px] lg:text-[12px] flex-wrap">
                        <span className="af-badge"><span className="af-badge-dot" />Brindes: {brindesPorCliente[String(c.id)] ?? 0}</span>
                        <span className="af-badge"><span className="af-badge-dot" />Reservas: {reservasPorCliente[String(c.id)] ?? 0}</span>
                      </div>
                    </div>
                  ))}
                  {grouped[statusCol].length === 0 && <div className="rounded-md af-card p-3 text-sm af-text-dim">Sem itens</div>}
                </div>
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
                          className="rounded-md af-card px-3 py-1.5 text-xs lg:text-[13px] hover:af-glow"
                        >
                          {`Ver mais ${step}`}
                        </button>
                      </div>
                    )
                  }
                  return null
                })()}
              </div>
            ))}
          </div>
        </div>
      )}

      {modalCliente && modalType && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-white/70 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-2xl rounded-xl af-card-elev p-5 lg:p-6 shadow-xl ring-1 ring-white/10 relative">
            <button
              className="absolute top-3 right-3 af-btn-ghost px-2 py-1 text-sm"
              aria-label="Fechar"
              onClick={() => { setModalCliente(null); setModalType(null) }}
            >
              ✕
            </button>
            <div className="mb-3 text-lg lg:text-xl font-semibold">
              {modalType === 'brindes' ? `Brindes de ${shortName(modalCliente?.nome)}` : `Reservas de ${shortName(modalCliente?.nome)}`}
            </div>
            <div className="af-list-sep mb-3" />
            {modalType === 'brindes' ? (
              <div className="space-y-2 max-h-[60vh] overflow-auto pr-1">
                {(() => {
                  const items = (qrcodes ?? []).filter((q: any) => String(q?.cliente_id ?? '') === String(modalCliente?.id))
                  if (items.length === 0) return <div className="af-text-dim">Nenhum brinde encontrado para este cliente.</div>
                  return (
                    <>
                      {items.map((b: any, idx: number) => (
                        <div key={`${b.id}-${idx}-${b.created_at ?? idx}`} className="rounded-md af-card p-3 ring-1 ring-slate-200/70">
                          <div className="flex items-center justify-between gap-2">
                            <div className="font-medium text-sm">{b.codigo || b.tipo_brinde || 'Brinde'}</div>
                            <span className="af-badge text-[11px]"><span className="af-badge-dot" />{b.status || '—'}</span>
                          </div>
                          <div className="mt-1 text-xs af-text-dim">
                            <div>Tipo: {b.tipo_brinde || '—'}</div>
                            <div>
                              Validade: {(() => {
                                const status = (b.status ?? '').toString()
                                if (status === 'Resgatado' && b.data_resgate) return b.data_resgate
                                return b.data_validade || b.expires_at || '—'
                              })()}
                            </div>
                          </div>
                        </div>
                      ))}
                    </>
                  )
                })()}
              </div>
            ) : (
              <div className="space-y-2 max-h-[60vh] overflow-auto pr-1">
                {(() => {
                  const items = (reservas ?? []).filter((r: any) => String(r?.cliente_id ?? '') === String(modalCliente?.id))
                  if (items.length === 0) return <div className="af-text-dim">Nenhuma reserva encontrada para este cliente.</div>
                  const sorted = items
                    .slice()
                    .sort((a: any, b: any) => String(a.data_reserva || '').localeCompare(String(b.data_reserva || '')) || String(a.hora_reserva || '').localeCompare(String(b.hora_reserva || '')))
                  return (
                    <>
                      {sorted.map((r: any, idx: number) => (
                        <div key={`${r.id}-${idx}-${r.created_at ?? idx}`} className="rounded-md af-card p-3 ring-1 ring-slate-200/70">
                          <div className="flex items-center justify-between gap-2">
                            <div className="font-medium text-sm">{r.data_reserva || '—'} {r.hora_reserva ? `• ${r.hora_reserva}` : ''}</div>
                            <span className="af-chip text-[11px]">{r.status || '—'}</span>
                          </div>
                          <div className="mt-1 text-xs af-text-dim grid grid-cols-2 gap-x-4 gap-y-1">
                            <div>Pessoas: {typeof r.n_pessoas === 'number' ? r.n_pessoas : '—'}</div>
                            <div>Pagamento: {r.status_pagamento ? 'Pago' : 'Pendente'}</div>
                            <div className="col-span-2">Obs.: {r.observacao || '—'}</div>
                          </div>
                        </div>
                      ))}
                    </>
                  )
                })()}
              </div>
            )}
          </div>
        </div>
      )}
 
      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-white/70 p-4">
          <div className="w-full max-w-md rounded-xl af-card-elev p-5 lg:p-6 shadow-xl">
            <div className="mb-3 text-lg lg:text-xl font-semibold">Editar cliente</div>
            <form onSubmit={onSubmit} className="space-y-3 lg:space-y-4">
              <div>
                <label className="mb-1 block af-label">Nome</label>
                <input className="af-field" value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} required />
              </div>
              
              <div>
                <label className="mb-1 block af-label">Telefone</label>
                <input className="af-field" value={form.telefone} onChange={(e) => setForm((f) => ({ ...f, telefone: e.target.value }))} />
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
              <div className="flex items-center justify-end gap-2 pt-2">
                <button type="button" onClick={() => setOpen(false)} className="rounded-md af-card px-4 py-2 lg:px-5 lg:py-3 text-sm lg:text-[15px] hover:af-glow">Cancelar</button>
                <button type="submit" className="af-btn-primary">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
