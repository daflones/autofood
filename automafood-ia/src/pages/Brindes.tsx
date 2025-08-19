import { useState, useRef, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { Card } from '../components/Card'
import { useQrcodes, useClientes, useCreateQrcode, useUpdateQrcode, useUpdateQrcodeExact, useDeleteQrcodeExact } from '../hooks/useRestaurantData'
import { format } from 'date-fns'
import { CheckCircle, Clock, XCircle, AlertTriangle, Search, Plus, Trash2, Gift, Filter } from 'lucide-react'

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
  const [statusFilter, setStatusFilter] = useState<'todos' | 'Resgatado' | 'Pendente' | 'Vencido' | 'Expirado'>('todos')
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
    <div className="min-h-screen bg-[#F8F9FE] p-6 lg:p-8">
      <div className="space-y-6 lg:space-y-8">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-50">
              <Gift className="h-6 w-6 text-[#FFB648]" />
            </div>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Brindes</h1>
          </div>
          <div className="flex items-center gap-3">
            {selectionMode && selected.size > 0 && (
              <button
                onClick={() => {
                  if (confirm(`Excluir ${selected.size} brinde(s)?`)) {
                    bulkDelete()
                  }
                }}
                className="af-btn-secondary flex items-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Excluir ({selected.size})
              </button>
            )}
            <button
              onClick={() => {
                setEditingId('new')
                setEditingCreatedAt(null)
                setForm({ status: 'Pendente', tipo_brinde: '', cliente_id: '' })
                setOpen(true)
              }}
              className="af-btn-primary flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Novo Brinde
            </button>
          </div>
        </div>

        {/* Filters */}
        <Card
          title={(
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-[#8C54FF]" />
              <span>Filtros e Busca</span>
            </div>
          )}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  placeholder="Buscar por nome/telefone do cliente..."
                  className="af-input pl-10 w-full"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            <div>
              <select
                className="af-input w-full"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
              >
                <option value="todos">Todos os Status</option>
                <option value="Resgatado">Resgatado</option>
                <option value="Pendente">Pendente</option>
                <option value="Vencido">Vencido</option>
                <option value="Expirado">Expirado</option>
              </select>
            </div>
          </div>
        </Card>
        {/* Lista de Brindes */}
        <Card
          title={(
            <div className="flex items-center gap-2">
              <Gift className="h-5 w-5 text-[#FFB648]" />
              <span>Lista de Brindes</span>
              <span className="text-sm text-gray-500 ml-2">({filtered.length} brindes)</span>
            </div>
          )}
          actions={(
            <div className="flex items-center gap-3 text-sm">
              <div className="flex items-center gap-1">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="font-medium">{countResgatado}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4 text-yellow-500" />
                <span className="font-medium">{countPendente}</span>
              </div>
              <div className="flex items-center gap-1">
                <XCircle className="h-4 w-4 text-red-500" />
                <span className="font-medium">{countVencido}</span>
              </div>
            </div>
          )}
        >
          {isLoading && (
            <div className="text-center py-8 text-gray-500">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FFB648] mx-auto"></div>
              <p className="mt-2">Carregando brindes...</p>
            </div>
          )}
          {error && (
            <div className="text-center py-8 text-red-500">
              <AlertTriangle className="h-12 w-12 mx-auto mb-3" />
              <p>Erro ao carregar brindes.</p>
            </div>
          )}
          {!isLoading && !error && filtered.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Gift className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>Nenhum brinde encontrado.</p>
            </div>
          )}
          {!isLoading && !error && filtered.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((q, idx) => {
                const rowKey = `${q.id}|||${q.created_at ?? idx}|||${(q as any).cliente_id ?? ''}`
                const status: 'Resgatado' | 'Pendente' | 'Vencido' | 'Expirado' = (q as any).status || 'Pendente'
                const cliente = (clientes ?? []).find((c: any) => c.id === (q as any).cliente_id)
                const statusColors = {
                  Resgatado: { bg: '#f0fff4', border: 'border-l-green-400', dot: 'bg-green-500', icon: CheckCircle },
                  Pendente: { bg: '#fffbf0', border: 'border-l-yellow-400', dot: 'bg-yellow-500', icon: Clock },
                  Vencido: { bg: '#fff5f5', border: 'border-l-red-400', dot: 'bg-red-500', icon: XCircle },
                  Expirado: { bg: '#f8f9fa', border: 'border-l-gray-400', dot: 'bg-gray-500', icon: AlertTriangle },
                };
                const s = statusColors[status] || statusColors.Pendente;
                const StatusIcon = s?.icon || Clock;
                
                return (
                  <div
                    key={rowKey}
                    className={`rounded-xl p-4 border-l-4 ${s.border} hover:shadow-md transition-all duration-200 cursor-pointer group ${
                      selectionMode && selected.has(rowKey) ? 'ring-2 ring-purple-400/50 bg-purple-50/30' : ''
                    } ${flashId === rowKey ? 'ring-2 ring-purple-400/50' : ''}`}
                    style={{ backgroundColor: s.bg }}
                    onTouchStart={() => onCardTouchStart(rowKey)}
                    onTouchEnd={onCardTouchEnd}
                    onTouchCancel={onCardTouchEnd}
                    onClick={() => {
                      if (suppressNextTapIdRef.current === rowKey) {
                        suppressNextTapIdRef.current = null
                        return
                      }
                      if (selectionMode) {
                        toggleSelect(rowKey, !selected.has(rowKey))
                      }
                    }}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${s.dot}`}></div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 truncate">{q.tipo_brinde || 'Brinde'}</h3>
                        </div>
                      </div>
                      {selectionMode && (
                        <input
                          type="checkbox"
                          className="af-checkbox"
                          checked={selected.has(rowKey)}
                          onChange={(e) => toggleSelect(rowKey, e.target.checked)}
                        />
                      )}
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
                  <div className="mt-4 flex items-center justify-between gap-2 relative">
                    <div className="flex items-center gap-2">
                      {/* Status button */}
                      <button
                        ref={(el) => { if (el) statusAnchorRef.current = el }}
                        onClick={(e) => {
                          const id = rowKey
                          setStatusMenuId((prev) => (prev === id ? null : id))
                          const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect()
                          const approxMenuWidth = 224
                          const approxMenuHeight = 132
                          const gap = 8
                          const viewH = window.innerHeight
                          const viewW = window.innerWidth
                          const desiredTop = rect.bottom + gap
                          const flipTop = rect.top - approxMenuHeight - gap
                          const top = desiredTop + approxMenuHeight > viewH ? Math.max(8, flipTop) : desiredTop
                          const left = Math.min(Math.max(8, rect.left), Math.max(8, viewW - approxMenuWidth - 8))
                          setStatusMenuPos({ top, left })
                        }}
                        className="px-3 py-1.5 text-xs font-medium rounded-full transition-colors"
                        style={{
                          backgroundColor: status === 'Resgatado' ? '#dcfce7' : status === 'Vencido' ? '#fef2f2' : status === 'Expirado' ? '#f9fafb' : '#fefce8',
                          color: status === 'Resgatado' ? '#166534' : status === 'Vencido' ? '#991b1b' : status === 'Expirado' ? '#374151' : '#a16207'
                        }}
                        title="Alterar status"
                      >
                        {q.status || 'Pendente'}
                      </button>
                      {statusMenuId === rowKey && statusMenuPos && createPortal(
                        <div
                          className="fixed z-[9999] af-card-elev p-2 rounded-md shadow-2xl ring-1 ring-[var(--af-border)] w-56"
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
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => openEdit(q)} 
                        className="px-3 py-1.5 text-sm text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded-lg transition-colors"
                      >
                        Editar
                      </button>
                      {!selectionMode && (
                        <button 
                          onClick={() => { if (confirm('Excluir este brinde?')) deleteQrcodeExact.mutate({ id: q.id, created_at: q.created_at!, cliente_id: (q as any).cliente_id }) }} 
                          className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                          title="Excluir brinde"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
            {filtered.length === 0 && <div className="py-6 text-sm af-text-dim">Nenhum brinde encontrado.</div>}
          </div>
        )}
      </Card>
        {open && (
          <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4">
            <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-gray-100 p-6 sm:p-8">
              <h2 className="text-xl font-bold text-gray-900 mb-6">{editingId ? 'Editar brinde' : 'Novo brinde'}</h2>
              <form onSubmit={onSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tipo do brinde</label>
                  <input 
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" 
                    value={form.tipo_brinde} 
                    onChange={(e) => setForm((f) => ({ ...f, tipo_brinde: e.target.value }))} 
                    placeholder="Ex.: Desconto, Bebida, Sobremesa" 
                    required 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Cliente</label>
                  <select 
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" 
                    value={form.cliente_id} 
                    onChange={(e) => setForm((f) => ({ ...f, cliente_id: e.target.value }))} 
                    required
                  >
                    <option value="">Selecione um cliente</option>
                    {(clientes ?? []).map((c: any) => (
                      <option key={c.id} value={c.id}>{c.nome || 'Sem nome'} {c.telefone ? `• ${c.telefone}` : ''}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <select 
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" 
                    value={form.status} 
                    onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as any }))}
                  >
                    <option value="Pendente">Pendente</option>
                    <option value="Resgatado">Resgatado</option>
                    <option value="Vencido">Vencido</option>
                    <option value="Expirado">Expirado</option>
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
                    className="px-6 py-2 text-sm font-medium text-white bg-[#6366F1] hover:bg-[#5856eb] rounded-xl transition-colors"
                  >
                    Salvar
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
