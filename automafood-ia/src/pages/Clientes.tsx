import { useEffect, useMemo, useRef, useState } from 'react'
import { useClientes, useCreateCliente, useDeleteCliente, useUpdateCliente, useQrcodes, useReservas } from '../hooks/useRestaurantData'
import type { Cliente, Reserva } from '../hooks/useRestaurantData'
import { Users, Plus, Download, Grid3X3, List, Phone, Calendar, Gift, User, MoreHorizontal, Eye, Trash2, CheckSquare, Square } from 'lucide-react'
import { Card } from '../components/Card'

export default function Clientes() {
  const { data: clientes, isLoading } = useClientes()
  const { data: qrcodes } = useQrcodes()
  const { data: reservas } = useReservas()
  const createCliente = useCreateCliente()
  const deleteCliente = useDeleteCliente()
  const updateCliente = useUpdateCliente()

  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  type LeadStatus = 'novo_lead' | 'interessado' | 'ativo' | 'inativo'
  const statusLabel: Record<LeadStatus, string> = {
    novo_lead: 'Novo Lead',
    interessado: 'Interessado',
    ativo: 'Ativo',
    inativo: 'Inativo',
  }
  // Normaliza valores antigos/variantes para o conjunto LeadStatus
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
  const [form, setForm] = useState<{ nome: string; telefone: string; total_brindes?: number; total_reservas?: number; lead_status?: LeadStatus }>({ nome: '', telefone: '', total_brindes: 0, total_reservas: 0, lead_status: 'novo_lead' })
  // Modal state for viewing Brindes/Reservas of a cliente
  const [modalCliente, setModalCliente] = useState<Cliente | null>(null)
  const [modalType, setModalType] = useState<'brindes' | 'reservas' | null>(null)
  const [selectedClientes, setSelectedClientes] = useState<Set<string>>(new Set())
  const [selectionMode, setSelectionMode] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<'single' | 'bulk'>('single')
  const [singleDeleteId, setSingleDeleteId] = useState<string | null>(null)

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
  const toggleSelectCliente = (id: string) => {
    setSelectedClientes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const selectAllClientes = () => {
    const allIds = (clientes ?? []).map(c => c.id);
    setSelectedClientes(new Set(allIds));
  };

  const clearSelection = () => {
    setSelectedClientes(new Set());
    setSelectionMode(false);
  };

  const handleSingleDelete = (id: string) => {
    setSingleDeleteId(id);
    setDeleteTarget('single');
    setShowDeleteConfirm(true);
  };

  const handleBulkDelete = () => {
    if (selectedClientes.size === 0) return;
    setDeleteTarget('bulk');
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    try {
      if (deleteTarget === 'single' && singleDeleteId) {
        await deleteCliente.mutateAsync(singleDeleteId);
      } else if (deleteTarget === 'bulk') {
        await Promise.all(
          Array.from(selectedClientes).map(id => deleteCliente.mutateAsync(id))
        );
        clearSelection();
      }
      setShowDeleteConfirm(false);
      setSingleDeleteId(null);
    } catch (error) {
      console.error('Erro ao excluir:', error);
    }
  };

  const cancelDelete = () => {
    setShowDeleteConfirm(false);
    setSingleDeleteId(null);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const payload: Partial<Cliente> = {
      nome: form.nome,
      telefone: form.telefone,
      lead_status: form.lead_status,
    }
    if (editingId && editingId !== 'new') {
      await updateCliente.mutateAsync({ id: editingId, payload })
    } else {
      await createCliente.mutateAsync(payload as Cliente)
    }
    setOpen(false)
    setForm({ nome: '', telefone: '' })
  }

  const [view, setView] = useState<'lista' | 'kanban'>('lista')
  // Bulk selection (lista view)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const longPressTimerListRef = useRef<number | null>(null)
  const suppressNextTapListIdRef = useRef<string | null>(null)
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

  const clientesFiltrados = useMemo(() => {
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
    const rows = clientesFiltrados
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

  useMemo(() => {
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

  }

  // No-op handler para onTouchMove no grid Kanban (com touchAction controlado)
  const onElTouchMove = (_e: React.TouchEvent) => {
    // intencionalmente vazio; comportamento nativo controlado via CSS touch-action
  }

  return (
    <div className="min-h-screen bg-[#F8F9FE] p-6 lg:p-8">
      <div className="space-y-6 lg:space-y-8">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50">
              <Users className="h-6 w-6 text-[#5D5FEF]" />
            </div>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Clientes</h1>
          </div>
          <div className="flex items-center gap-3">
            {selectionMode && (
              <>
                <button onClick={selectAllClientes} className="af-btn-secondary flex items-center gap-2">
                  <CheckSquare className="h-4 w-4" />
                  Selecionar Todos
                </button>
                <button onClick={handleBulkDelete} disabled={selectedClientes.size === 0} className="af-btn-danger flex items-center gap-2">
                  <Trash2 className="h-4 w-4" />
                  Excluir ({selectedClientes.size})
                </button>
                <button onClick={clearSelection} className="af-btn-secondary">
                  Cancelar
                </button>
              </>
            )}
            {!selectionMode && (
              <>
                <button onClick={() => setSelectionMode(true)} className="af-btn-secondary flex items-center gap-2">
                  <Square className="h-4 w-4" />
                  Selecionar
                </button>
                <div className="flex items-center gap-2 bg-white rounded-lg p-1 shadow-sm">
                  <button 
                    onClick={() => setView('lista')} 
                    className={`p-2 rounded-md transition-colors ${
                      view === 'lista' 
                        ? 'bg-[#5D5FEF] text-white shadow-sm' 
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <List className="h-4 w-4" />
                  </button>
                  <button 
                    onClick={() => setView('kanban')} 
                    className={`p-2 rounded-md transition-colors ${
                      view === 'kanban' 
                        ? 'bg-[#5D5FEF] text-white shadow-sm' 
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <Grid3X3 className="h-4 w-4" />
                  </button>
                </div>
                <button 
                  onClick={() => { setEditingId('new'); setForm({ nome: '', telefone: '', lead_status: 'novo_lead' }); setOpen(true); }} 
                  className="af-btn-primary flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Novo Cliente
                </button>
              </>
            )}
          </div>
        </div>

        {/* Filters */}
        <Card
          title={(
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-[#8C54FF]" />
              <span>Filtros e Busca</span>
            </div>
          )}
          actions={(
            <button onClick={exportCSV} className="af-btn-secondary flex items-center gap-2">
              <Download className="h-4 w-4" />
              Exportar CSV
            </button>
          )}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="lg:col-span-2">
              <input
                type="text"
                placeholder="Buscar por nome ou telefone..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="af-input w-full"
              />
            </div>
            <div>
              <select value={status} onChange={(e) => setStatus(e.target.value as any)} className="af-input w-full">
                <option value="todos">Todos os Status</option>
                <option value="novo_lead">Novo Lead</option>
                <option value="interessado">Interessado</option>
                <option value="ativo">Ativo</option>
                <option value="inativo">Inativo</option>
              </select>
            </div>
            <div>
              <input
                type="number"
                min="0"
                placeholder="Min. Reservas"
                value={minReservas || ''}
                onChange={(e) => setMinReservas(Number(e.target.value) || 0)}
                className="af-input w-full"
              />
            </div>
            <div>
              <input
                type="number"
                min="0"
                placeholder="Min. Brindes"
                value={minBrindes || ''}
                onChange={(e) => setMinBrindes(Number(e.target.value) || 0)}
                className="af-input w-full"
              />
            </div>
          </div>
        </Card>

        {view === 'lista' ? (
          <Card
            title={(
              <div className="flex items-center gap-2">
                <List className="h-5 w-5 text-[#2ED47A]" />
                <span>Lista de Clientes</span>
                <span className="text-sm text-gray-500 ml-2">({clientesFiltrados.length} clientes)</span>
              </div>
            )}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {clientesFiltrados.slice(0, visibleCount).map((c: Cliente) => {
                const brindesCount = brindesPorCliente[String(c.id)] ?? 0;
                const reservasCount = reservasPorCliente[String(c.id)] ?? 0;
                const statusColors = {
                  novo_lead: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-l-blue-400', dot: 'bg-blue-500', cardBg: 'bg-blue-25' },
                  interessado: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-l-yellow-400', dot: 'bg-yellow-500', cardBg: 'bg-yellow-25' },
                  ativo: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-l-green-400', dot: 'bg-green-500', cardBg: 'bg-green-25' },
                  inativo: { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-l-gray-400', dot: 'bg-gray-500', cardBg: 'bg-gray-25' },
                };
                const s = statusColors[norm(c.lead_status)];
                
                return (
                  <div
                    key={c.id}
                    className={`rounded-xl p-4 border-l-4 ${s.border} hover:shadow-md transition-all duration-200 cursor-pointer group ${
                      selectedClientes.has(String(c.id)) ? 'ring-2 ring-purple-500 bg-purple-50' : ''
                    }`}
                    style={!selectedClientes.has(String(c.id)) ? { backgroundColor: {
                      novo_lead: '#f0f7ff',
                      interessado: '#fffbf0', 
                      ativo: '#f0fff4',
                      inativo: '#f8f9fa'
                    }[norm(c.lead_status)] } : {}}
                    onClick={() => {
                      if (selectionMode) {
                        toggleSelectCliente(c.id)
                      } else {
                        openEdit(c)
                      }
                    }}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${s.dot}`}></div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 truncate">{c.nome}</h3>
                        </div>
                      </div>
                      {selectionMode ? (
                        <div className="flex items-center justify-center">
                          {selectedClientes.has(String(c.id)) ? (
                            <CheckSquare className="h-5 w-5 text-purple-600" />
                          ) : (
                            <Square className="h-5 w-5 text-gray-400" />
                          )}
                        </div>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSingleDelete(c.id);
                          }}
                          className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    
                    <div className="space-y-2 mb-3">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Phone className="h-4 w-4" />
                        <span>{c.telefone || 'Sem telefone'}</span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 text-sm">
                          <div className="flex items-center gap-1 text-gray-600">
                            <Calendar className="h-4 w-4" />
                            <span className="font-medium">{reservasCount}</span>
                          </div>
                          <div className="flex items-center gap-1 text-gray-600">
                            <Gift className="h-4 w-4" />
                            <span className="font-medium">{brindesCount}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${s.bg} ${s.text}`}>
                        {statusLabel[norm(c.lead_status)]}
                      </span>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={(e) => { e.stopPropagation(); openEdit(c); }} 
                          className="p-1 text-gray-400 hover:text-gray-600 rounded"
                          title="Editar cliente"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {clientesFiltrados.length > visibleCount && (
              <div className="mt-6 text-center">
                <button
                  onClick={() => setVisibleCount(prev => prev + 10)}
                  className="af-btn-secondary flex items-center gap-2 mx-auto"
                >
                  <Eye className="h-4 w-4" />
                  Mostrar mais 10 clientes
                </button>
              </div>
            )}
            
            {clientesFiltrados.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>Nenhum cliente encontrado.</p>
              </div>
            )}
          </Card>
        ) : (
          <Card
            title={(
              <div className="flex items-center gap-2">
                <Grid3X3 className="h-5 w-5 text-[#FFB648]" />
                <span>Kanban Board</span>
              </div>
            )}
          >
            <div ref={kanbanRef} onTouchMove={onElTouchMove} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {(['novo_lead', 'interessado', 'ativo', 'inativo'] as const).map((status) => {
                const statusColors = {
                  novo_lead: { bg: 'bg-blue-50', header: 'bg-blue-100', text: 'text-blue-800', count: 'bg-blue-500' },
                  interessado: { bg: 'bg-yellow-50', header: 'bg-yellow-100', text: 'text-yellow-800', count: 'bg-yellow-500' },
                  ativo: { bg: 'bg-green-50', header: 'bg-green-100', text: 'text-green-800', count: 'bg-green-500' },
                  inativo: { bg: 'bg-gray-50', header: 'bg-gray-100', text: 'text-gray-800', count: 'bg-gray-500' },
                };
                const s = statusColors[status];
                const clientesDoStatus = clientesFiltrados.filter((c: Cliente) => norm(c.lead_status) === status);
                
                return (
                  <div 
                    key={status} 
                    data-status-col={status}
                    onDrop={(e) => onDropTo(e, status)} 
                    onDragOver={allowDrop} 
                    className={`w-full ${s.bg} rounded-xl border border-gray-200 overflow-hidden`}
                  >
                    <div className={`${s.header} p-3 sm:p-4 border-b border-gray-200`}>
                      <div className="flex items-center justify-between">
                        <h2 className={`text-sm sm:text-base font-bold ${s.text}`}>{statusLabel[status]}</h2>
                        <span className={`${s.count} text-white text-xs font-bold px-2 py-1 rounded-full min-w-[20px] text-center`}>
                          {clientesDoStatus.length}
                        </span>
                      </div>
                    </div>
                    
                    <div className="p-2 sm:p-3 space-y-2 af-scroll-y max-h-[400px] sm:max-h-[500px] overflow-y-auto">
                      {clientesDoStatus.map((c: Cliente) => {
                        const brindesCount = brindesPorCliente[String(c.id)] ?? 0;
                        const reservasCount = reservasPorCliente[String(c.id)] ?? 0;
                        
                        return (
                          <div
                            key={c.id}
                            data-card-id={c.id}
                            draggable
                            onDragStart={(e) => onDragStart(e, c.id)}
                            onTouchStart={handleCardTouchStart(c.id)}
                            onTouchMove={handleCardTouchMove}
                            onTouchEnd={handleCardTouchEnd}
                            onTouchCancel={handleCardTouchCancel}
                            className={`bg-white p-2 sm:p-3 rounded-lg shadow-sm cursor-grab active:cursor-grabbing hover:shadow-md transition-all duration-200 border border-gray-100 ${
                              touchDraggingId === c.id ? 'opacity-50 scale-95' : ''
                            } ${
                              touchOverStatus === status ? 'ring-2 ring-blue-400' : ''
                            }`}
                          >
                            <div className="flex items-start justify-between mb-2 sm:mb-3">
                              <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-gray-900 truncate mb-1 text-sm sm:text-base">{c.nome}</h3>
                                <div className="flex items-center gap-1 text-xs sm:text-sm text-gray-500">
                                  <Phone className="h-3 w-3" />
                                  <span className="truncate">{c.telefone || 'Sem telefone'}</span>
                                </div>
                              </div>
                              <button 
                                onClick={(e) => { e.stopPropagation(); openEdit(c); }} 
                                className="p-1 text-gray-400 hover:text-gray-600 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Editar cliente"
                              >
                                <MoreHorizontal className="h-3 w-3 sm:h-4 sm:w-4" />
                              </button>
                            </div>
                            
                            <div className="flex items-center justify-between text-xs sm:text-sm">
                              <div className="flex items-center gap-2 sm:gap-3">
                                <div 
                                  onClick={(e) => { e.stopPropagation(); setModalCliente(c); setModalType('brindes'); }} 
                                  className="flex items-center gap-1 cursor-pointer hover:text-blue-600 transition-colors"
                                  title="Ver brindes"
                                >
                                  <Gift className="h-3 w-3 sm:h-4 sm:w-4" />
                                  <span className="font-semibold">{brindesCount}</span>
                                </div>
                                <div 
                                  onClick={(e) => { e.stopPropagation(); setModalCliente(c); setModalType('reservas'); }} 
                                  className="flex items-center gap-1 cursor-pointer hover:text-blue-600 transition-colors"
                                  title="Ver reservas"
                                >
                                  <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
                                  <span className="font-semibold">{reservasCount}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      
                      {clientesDoStatus.length === 0 && (
                        <div className="text-center py-6 sm:py-8 text-gray-400">
                          <User className="h-6 w-6 sm:h-8 sm:w-8 mx-auto mb-2" />
                          <p className="text-xs sm:text-sm">Nenhum cliente</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}
      </div>
      {modalCliente && modalType && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-2xl rounded-xl bg-white p-5 lg:p-6 shadow-xl relative">
            <button
              className="absolute top-3 right-3 af-btn-ghost px-2 py-1 text-sm"
              aria-label="Fechar"
              onClick={() => { setModalCliente(null); setModalType(null) }}
            >
              Fechar
            </button>
            <h2 className="text-lg font-semibold mb-4">{modalType === 'brindes' ? 'Brindes de' : 'Reservas de'} {shortName(modalCliente?.nome)}</h2>
            {modalType === 'brindes' ? (
              <div className="space-y-2 max-h-[60vh] overflow-auto pr-1">
                {(() => {
                  const items = (qrcodes ?? []).filter((q: any) => String(q?.cliente_id ?? '') === String(modalCliente?.id))
                  if (items.length === 0) return <div className="text-gray-500">Nenhum brinde encontrado para este cliente.</div>
                  const sorted = items.slice().sort((a: any, b: any) => String(b.created_at || '').localeCompare(String(a.created_at || '')))
                  return (
                    <>
                      {sorted.map((q: any, idx: number) => (
                        <div key={`${q.id}-${idx}-${q.created_at ?? idx}`} className="rounded-md bg-gray-50 p-3 ring-1 ring-gray-200/70">
                          <div className="flex items-center justify-between gap-2">
                            <div className="font-medium text-sm text-gray-800">{q.nome || 'Brinde'}</div>
                            <div className="text-xs text-gray-400">{new Date(q.created_at).toLocaleDateString()}</div>
                          </div>
                          <div className="mt-1 text-xs text-gray-500 grid grid-cols-2 gap-x-4 gap-y-1">
                            <div>Status: {q.resgatado ? 'Resgatado' : 'Disponível'}</div>
                            {q.resgatado && <div>Data resgate: {new Date(q.updated_at).toLocaleDateString()}</div>}
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
                  const items = (reservas ?? []).filter((r: Reserva) => String(r?.cliente_id ?? '') === String(modalCliente?.id))
                  if (items.length === 0) return <div className="text-gray-500">Nenhuma reserva encontrada para este cliente.</div>
                  const sorted = items
                    .slice()
                    .sort((a: Reserva, b: Reserva) => String(a.data_reserva || '').localeCompare(String(b.data_reserva || '')) || String(a.hora_reserva || '').localeCompare(String(b.hora_reserva || '')))
                  return (
                    <>
                      {sorted.map((r: Reserva, idx: number) => (
                        <div key={`${r.id}-${idx}-${r.created_at ?? idx}`} className="rounded-md bg-gray-50 p-3 ring-1 ring-gray-200/70">
                          <div className="flex items-center justify-between gap-2">
                            <div className="font-medium text-sm text-gray-800">{r.data_reserva || '—'} {r.hora_reserva ? `• ${r.hora_reserva}` : ''}</div>
                            <span className={`px-2 py-1 text-[11px] font-semibold rounded-full ${{
                              confirmada: 'bg-green-100 text-green-800',
                              pendente: 'bg-yellow-100 text-yellow-800',
                              cancelada: 'bg-red-100 text-red-800',
                              finalizada: 'bg-blue-100 text-blue-800',
                              expirada: 'bg-gray-100 text-gray-800',
                            }[(r.status as string)] || 'bg-gray-100 text-gray-800'}`}>{r.status || '—'}</span>
                          </div>
                          <div className="mt-1 text-xs text-gray-500 grid grid-cols-2 gap-x-4 gap-y-1">
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
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-gray-100 p-6 sm:p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-6">{editingId === 'new' ? 'Novo Cliente' : 'Editar Cliente'}</h2>
            <form onSubmit={onSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nome</label>
                <input 
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" 
                  value={form.nome} 
                  onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} 
                  placeholder="Nome completo do cliente"
                  required 
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Telefone</label>
                <input 
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" 
                  value={form.telefone} 
                  onChange={(e) => setForm((f) => ({ ...f, telefone: e.target.value }))} 
                  placeholder="(11) 99999-9999"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Lead Status</label>
                <select 
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" 
                  value={form.lead_status} 
                  onChange={(e) => setForm((f) => ({ ...f, lead_status: e.target.value as LeadStatus }))}
                >
                  <option value="novo_lead">Novo Lead</option>
                  <option value="interessado">Interessado</option>
                  <option value="ativo">Ativo</option>
                  <option value="inativo">Inativo</option>
                </select>
              </div>
              <div className="flex items-center justify-end gap-3 pt-4">
                <button 
                  type="button" 
                  onClick={() => setOpen(false)} 
                  className="px-6 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="px-6 py-2 text-sm font-medium text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 rounded-xl transition-all"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Confirmar Exclusão
            </h3>
            <p className="text-gray-600 mb-6">
              {deleteTarget === 'single'
                ? 'Tem certeza que deseja excluir este cliente?'
                : `Tem certeza que deseja excluir ${selectedClientes.size} cliente(s) selecionado(s)?`
              }
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={cancelDelete}
                className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
