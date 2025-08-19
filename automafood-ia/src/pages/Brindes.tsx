import { useMemo, useRef, useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { format } from 'date-fns'
import { useQrcodes, useClientes } from '../hooks/useRestaurantData'
import { useCreateQrcode, useUpdateQrcode, useUpdateQrcodeExact, useDeleteQrcodeExact } from '../hooks/useRestaurantData'

export default function Brindes() {
  const { data: qrcodes, isLoading, error } = useQrcodes()
  const { data: clientes } = useClientes()
  const createQrcode = useCreateQrcode()
  const updateQrcode = useUpdateQrcode()
  const updateQrcodeExact = useUpdateQrcodeExact()
  const deleteQrcodeExact = useDeleteQrcodeExact()

  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingCreatedAt, setEditingCreatedAt] = useState<string | null>(null)
  const [form, setForm] = useState<{
    status: 'Resgatado' | 'Pendente' | 'Vencido' | 'Expirado'
    tipo_brinde: string
    cliente_id: string
  }>({ status: 'Pendente', tipo_brinde: '', cliente_id: '' })
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'todos' | 'Resgatado' | 'Pendente' | 'Vencido'>('todos')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [selectionMode, setSelectionMode] = useState(false)
  const longPressTimer = useRef<number | null>(null)
  const suppressNextTapIdRef = useRef<string | null>(null)
  const [statusMenuId, setStatusMenuId] = useState<string | null>(null)
  const statusAnchorRef = useRef<HTMLButtonElement | null>(null)
  const [statusMenuPos, setStatusMenuPos] = useState<{ top: number, left: number } | null>(null)
  const [flashId, setFlashId] = useState<string | null>(null)

  const formatLocalYMD = (ymd: string) => {
    if (!ymd) return ''
    const [y, m, d] = ymd.split('-').map(Number)
    const dt = new Date(y, (m || 1) - 1, d || 1)
    return format(dt, 'dd/MM/yyyy')
  }
  const getLocalTodayYMD = () => {
    const d = new Date()
    const tz = d.getTimezoneOffset() * 60000
    return new Date(Date.now() - tz).toISOString().slice(0, 10)
  }

  // Fechar o menu ao clicar fora ou apertar Esc
  useEffect(() => {
    if (!statusMenuId) return
    const onDown = (e: MouseEvent | TouchEvent) => {
      // Se clicou no botão âncora, ignore (o próprio handler alterna)
      const target = e.target as Node | null
      if (statusAnchorRef.current && target && statusAnchorRef.current.contains(target)) return
      setStatusMenuId(null)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setStatusMenuId(null)
    }
    // Use bubble phase so inner menu can stopPropagation
    window.addEventListener('mousedown', onDown)
    window.addEventListener('touchstart', onDown)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('mousedown', onDown)
      window.removeEventListener('touchstart', onDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [statusMenuId])

  const toggleSelect = (rowKey: string, checked: boolean) => {
    const key = rowKey
    setSelected((prev) => {
      const next = new Set(prev)
      if (checked) next.add(key)
      else next.delete(key)
      return next
    })
  }

  const clearSelection = () => setSelected(new Set())

  const bulkDelete = async () => {
    if (selected.size === 0) return
    if (!confirm(`Excluir ${selected.size} brinde(s)?`)) return
    const keys = Array.from(selected)
    await Promise.all(
      keys.map((key) => {
        const [id, created_at, cliente_id] = String(key).split('|||')
        if (id && created_at) return deleteQrcodeExact.mutateAsync({ id, created_at, cliente_id })
        return Promise.resolve()
      }),
    )
    clearSelection()
    setSelectionMode(false)
  }

  const enableSelection = () => setSelectionMode(true)
  const disableSelection = () => { setSelectionMode(false); clearSelection() }

  const onCardTouchStart = (rowKey: string) => {
    if (longPressTimer.current) window.clearTimeout(longPressTimer.current)
    longPressTimer.current = window.setTimeout(() => {
      setSelectionMode(true)
      toggleSelect(rowKey, true)
      // Prevent the immediate synthetic click after long-press from toggling back
      suppressNextTapIdRef.current = rowKey
    }, 2000)
  }
  const onCardTouchEnd = () => {
    if (longPressTimer.current) {
      window.clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }

  const openCreate = () => {
    setEditingId(null)
    setForm({ status: 'Pendente', tipo_brinde: '', cliente_id: '' })
    setOpen(true)
  }
  const openEdit = (q: any) => {
    setEditingId(String(q.id))
    setEditingCreatedAt(q.created_at || null)
    setForm({ status: (q.status as any) || 'Pendente', tipo_brinde: q.tipo_brinde || '', cliente_id: q.cliente_id || '' })
    setOpen(true)
  }
  // Edit flow removido a pedido: sem botão/ação de editar.
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (editingId) {
      // Em edição: permitir atualizar status, cliente_id e tipo_brinde
      const payload: any = { status: form.status, cliente_id: form.cliente_id, tipo_brinde: form.tipo_brinde }
      if (form.status === 'Resgatado') payload.data_resgate = getLocalTodayYMD()
      else payload.data_resgate = null
      if (editingCreatedAt) await updateQrcodeExact.mutateAsync({ id: editingId, created_at: editingCreatedAt, payload })
      else await updateQrcode.mutateAsync({ id: editingId, payload })
    } else {
      // Criação: validar e enviar todos os campos necessários
      if (!form.cliente_id || !form.tipo_brinde) return
      const localToday = (() => {
        const d = new Date()
        const tz = d.getTimezoneOffset() * 60000
        return new Date(Date.now() - tz).toISOString().slice(0, 10)
      })()
      const localValidUntil = (() => {
        const d = new Date()
        d.setDate(d.getDate() + 30)
        const tz = d.getTimezoneOffset() * 60000
        return new Date(d.getTime() - tz).toISOString().slice(0, 10)
      })()
      const payload = {
        cliente_id: form.cliente_id,
        tipo_brinde: form.tipo_brinde,
        status: form.status,
        data_resgate: form.status === 'Resgatado' ? localToday : null,
        data_validade: localValidUntil,
      }
      await createQrcode.mutateAsync(payload as any)
    }
    setOpen(false)
  }
  const countResgatado = useMemo(() => (qrcodes ?? []).filter((q: any) => q.status === 'Resgatado').length, [qrcodes])
  const countPendente = useMemo(() => (qrcodes ?? []).filter((q: any) => q.status === 'Pendente').length, [qrcodes])
  const countVencido = useMemo(() => (qrcodes ?? []).filter((q: any) => q.status === 'Vencido').length, [qrcodes])
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return (qrcodes ?? []).filter((q: any) => {
      const cliente = (clientes ?? []).find((c: any) => c.id === q.cliente_id)
      const nome = (cliente?.nome ?? '').toLowerCase()
      const telefone = (cliente?.telefone ?? '').toLowerCase()
      const matchesText = !term || nome.includes(term) || telefone.includes(term)
      const matchesStatus = statusFilter === 'todos' || q.status === statusFilter
      return matchesText && matchesStatus
    })
  }, [qrcodes, clientes, search, statusFilter])

  return (
    <div className="space-y-8 lg:space-y-10 min-w-0 overflow-x-hidden">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="af-section-title">Brindes</h1>
        <div className="flex items-center gap-2 flex-wrap min-w-0 self-start sm:self-auto">
          {/* Desktop actions */}
          <button
            onClick={() => (selectionMode ? disableSelection() : enableSelection())}
            title="Mais opções"
            className="hidden sm:inline-flex af-btn-ghost px-3 py-2 text-sm"
          >
            ⋯
          </button>
          {selectionMode && (
            <button onClick={bulkDelete} disabled={selected.size === 0} className="hidden sm:inline-flex af-btn-ghost px-4 py-2 text-sm disabled:opacity-40">
              Excluir Selecionados ({selected.size})
            </button>
          )}
          <button onClick={openCreate} className="af-btn-primary w-auto px-3 py-2 text-xs sm:text-sm">
            Novo Brinde
          </button>
          {/* Mobile action sheet */}
          {selectionMode && selected.size > 0 && (
            <div className="inline-flex sm:hidden">
              <button
                onClick={() => {
                  if (confirm(`Excluir ${selected.size} brinde(s)?`)) {
                    bulkDelete()
                  }
                }}
                className="af-btn-ghost px-3 py-2 text-sm"
              >
                Excluir Selecionados
              </button>
            </div>
          )}
        </div>
      </div>
      <div className="af-section af-card-elev overflow-hidden min-w-0">
        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="text-2xl md:text-3xl font-semibold">Lista de brindes</span>
            <div className="inline-flex items-center gap-2 flex-wrap">
              <span className="af-chip text-xs md:text-sm">Resgatados: <b className="ml-1">{countResgatado}</b></span>
              <span className="af-chip text-xs md:text-sm">Pendentes: <b className="ml-1">{countPendente}</b></span>
              <span className="af-chip text-xs md:text-sm">Vencidos: <b className="ml-1">{countVencido}</b></span>
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <input
              placeholder="Buscar por nome/telefone do cliente"
              className="af-field placeholder:text-slate-400 w-full text-sm md:text-base"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              className="af-field w-full sm:w-auto text-sm md:text-base"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
            >
              <option className="af-card" value="todos">Todos</option>
              <option className="af-card" value="Resgatado">Resgatado</option>
              <option className="af-card" value="Pendente">Pendente</option>
              <option className="af-card" value="Vencido">Vencido</option>
            </select>
          </div>
        </div>
        {isLoading && <div className="af-text-dim">Carregando…</div>}
        {error && <div className="af-alert">Erro ao carregar brindes</div>}
        {!isLoading && !error && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((q, idx) => {
              const rowKey = `${q.id}|||${q.created_at ?? idx}|||${(q as any).cliente_id ?? ''}`
              const status: 'Resgatado' | 'Pendente' | 'Vencido' = (q as any).status || 'Pendente'
              const cliente = (clientes ?? []).find((c: any) => c.id === (q as any).cliente_id)
              return (
                <div
                  key={rowKey}
                  className={`af-list-card af-list-card-info p-6 overflow-hidden rounded-xl ${
                    status === 'Resgatado'
                      ? 'border-t-2 border-blue-400/60'
                      : status === 'Vencido'
                        ? 'border-t-2 border-red-400/60'
                        : 'border-t-2 border-white/20'
                  } ${selectionMode && selected.has(rowKey) ? 'af-selected af-glow ring-2 ring-blue-400/50' : ''} ${flashId === rowKey ? 'af-glow ring-2 ring-blue-400/50' : ''}`}
                  onTouchStart={() => onCardTouchStart(rowKey)}
                  onTouchEnd={onCardTouchEnd}
                  onTouchCancel={onCardTouchEnd}
                  onClick={() => {
                    // Ignore only the synthetic tap for the same card that was long-pressed
                    if (suppressNextTapIdRef.current === rowKey) {
                      suppressNextTapIdRef.current = null
                      return
                    }
                    if (selectionMode) {
                      toggleSelect(rowKey, !selected.has(rowKey))
                    }
                  }}
                >
                  {/* Header */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex items-start gap-3">
                      {selectionMode && (
                        <input
                          type="checkbox"
                          className="mt-1 hidden sm:block h-4 w-4 rounded border-slate-300 bg-white"
                          checked={selected.has(rowKey)}
                          onChange={(e) => toggleSelect(rowKey, e.target.checked)}
                        />
                      )}
                      <div className="title truncate text-base md:text-lg font-semibold">{q.tipo_brinde || 'Brinde'}</div>
                    </div>
                    <span className="af-badge text-xs md:text-sm shrink-0"><span className="af-badge-dot"/> {status}</span>
                  </div>

                  {/* Details */}
                  <div className="mt-3 space-y-1.5 min-w-0">
                    {cliente && (
                      <>
                        <div className="text-sm md:text-[13px] min-w-0 flex items-center gap-2">
                          <span className="font-medium shrink-0">Cliente:</span>
                          <span className="truncate" title={cliente.nome || ''}>{cliente.nome || '—'}</span>
                        </div>
                        <div className="text-sm md:text-[13px] af-text-dim min-w-0 flex items-center gap-2">
                          <span className="font-medium shrink-0">Telefone:</span>
                          <span className="truncate" title={cliente.telefone || ''}>{cliente.telefone || '—'}</span>
                        </div>
                      </>
                    )}
                    {status === 'Resgatado' && q.data_resgate && (
                      <div className="text-sm md:text-base af-text-dim">Resgatado em: {formatLocalYMD(q.data_resgate as any)}</div>
                    )}
                    {q.expires_at && (
                      <div className="text-sm md:text-base af-text-dim">Expira em: {format(new Date(q.expires_at), 'dd/MM/yyyy')}</div>
                    )}
                    {q.campaign && (
                      <div className="text-sm md:text-base af-text-dim truncate">Campanha: {q.campaign}</div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2 relative">
                    <div className="flex items-center gap-2">
                      {/* Único botão: mostra o status atual e abre menu */}
                      <button
                        ref={(el) => { if (el) statusAnchorRef.current = el }}
                        onClick={(e) => {
                          const id = rowKey
                          setStatusMenuId((prev) => (prev === id ? null : id))
                          const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect()
                          // Menu size approximations (w-56 => 224px wide, ~132px tall for 3 items + padding)
                          const approxMenuWidth = 224
                          const approxMenuHeight = 132
                          const gap = 8
                          const viewH = window.innerHeight
                          const viewW = window.innerWidth
                          // Prefer below; flip up if it would overflow
                          const desiredTop = rect.bottom + gap
                          const flipTop = rect.top - approxMenuHeight - gap
                          const top = desiredTop + approxMenuHeight > viewH ? Math.max(8, flipTop) : desiredTop
                          // Keep menu inside viewport horizontally
                          const left = Math.min(Math.max(8, rect.left), Math.max(8, viewW - approxMenuWidth - 8))
                          setStatusMenuPos({ top, left })
                        }}
                        className="af-btn-ghost px-4 py-2 text-sm md:text-base"
                        title="Alterar status"
                      >
                        {q.status || 'Pendente'}
                      </button>
                      {statusMenuId === rowKey && statusMenuPos && createPortal(
                        <div
                          className="fixed z-[9999] af-card p-2 rounded-md shadow-lg ring-1 ring-white/10 w-56"
                          style={{ top: statusMenuPos.top, left: statusMenuPos.left }}
                          onMouseDownCapture={(e) => e.stopPropagation()}
                          onTouchStartCapture={(e) => e.stopPropagation()}
                          onMouseDown={(e) => e.stopPropagation()}
                          onTouchStart={(e) => e.stopPropagation()}
                          onClick={(e) => e.stopPropagation()}
                          role="menu"
                          aria-label="Alterar status do brinde"
                        >
                          <button
                            className="w-full text-left af-btn-ghost px-3 py-2 text-sm md:text-base"
                            onClick={() => {
                              updateQrcodeExact.mutate({ id: q.id, created_at: q.created_at!, payload: { status: 'Resgatado', data_resgate: getLocalTodayYMD() } })
                              setStatusMenuId(null)
                              setFlashId(rowKey)
                              window.setTimeout(() => setFlashId(null), 800)
                            }}
                          >Resgatado</button>
                          <button
                            className="w-full text-left af-btn-ghost px-3 py-2 text-sm md:text-base"
                            onClick={() => { updateQrcodeExact.mutate({ id: q.id, created_at: q.created_at!, payload: { status: 'Pendente', data_resgate: null } }); setStatusMenuId(null); setFlashId(rowKey); window.setTimeout(() => setFlashId(null), 800) }}
                          >Pendente</button>
                          <button
                            className="w-full text-left af-btn-ghost px-3 py-2 text-sm md:text-base"
                            onClick={() => { updateQrcodeExact.mutate({ id: q.id, created_at: q.created_at!, payload: { status: 'Vencido', data_resgate: null } }); setStatusMenuId(null); setFlashId(rowKey); window.setTimeout(() => setFlashId(null), 800) }}
                          >Vencido</button>
                          <button
                            className="w-full text-left af-btn-ghost px-3 py-2 text-sm md:text-base"
                            onClick={() => { updateQrcodeExact.mutate({ id: q.id, created_at: q.created_at!, payload: { status: 'Expirado', data_resgate: null } }); setStatusMenuId(null); setFlashId(rowKey); window.setTimeout(() => setFlashId(null), 800) }}
                          >Expirado</button>
                        </div>, document.body
                      )}
                    </div>
                    <div className="flex items-center gap-2 ml-auto">
                      <button onClick={() => openEdit(q)} className="af-btn-ghost px-4 py-2 text-sm md:text-base">Editar</button>
                      <button onClick={() => { if (confirm('Excluir este brinde?')) deleteQrcodeExact.mutate({ id: q.id, created_at: q.created_at!, cliente_id: (q as any).cliente_id }) }} className="af-btn-ghost px-4 py-2 text-sm md:text-base">Excluir</button>
                    </div>
                  </div>
                </div>
              )
            })}
            {filtered.length === 0 && <div className="py-6 text-sm af-text-dim">Nenhum brinde encontrado.</div>}
          </div>
        )}
      </div>

        {open && (
          <div className="fixed inset-0 z-50 grid place-items-center bg-white/90 p-4">
            <div className="w-full max-w-md p-5 overflow-hidden min-w-0 rounded-md shadow-md ring-1 ring-slate-200">
              <div className="mb-3 text-lg font-semibold">{editingId ? 'Editar brinde' : 'Novo brinde'}</div>
              <form onSubmit={onSubmit} className="space-y-3">
                <div>
                  <label className="mb-1 block af-label">Tipo do brinde</label>
                  <input className="af-field" value={form.tipo_brinde} onChange={(e) => setForm((f) => ({ ...f, tipo_brinde: e.target.value }))} placeholder="Ex.: Desconto, Bebida, Sobremesa" required />
                </div>
                <div>
                  <label className="mb-1 block af-label">Cliente</label>
                  <select className="af-field" value={form.cliente_id} onChange={(e) => setForm((f) => ({ ...f, cliente_id: e.target.value }))} required>
                    <option className="af-card" value="">Sem cliente</option>
                    {(clientes ?? []).map((c: any) => (
                      <option className="af-card" key={c.id} value={c.id}>{c.nome || 'Sem nome'} {c.telefone ? `• ${c.telefone}` : ''}</option>
                    ))}
                  </select>
                </div>
              <div>
                <label className="mb-1 block af-label">Status</label>
                <select className="af-field" value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as any }))}>
                  <option className="af-card" value="Pendente">Pendente</option>
                  <option className="af-card" value="Resgatado">Resgatado</option>
                  <option className="af-card" value="Vencido">Vencido</option>
                  <option className="af-card" value="Expirado">Expirado</option>
                </select>
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button type="button" onClick={() => setOpen(false)} className="rounded-md af-card px-4 py-2 text-sm text-[var(--af-text)] hover:af-glow">Cancelar</button>
                <button type="submit" className="af-btn-primary w-auto">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
