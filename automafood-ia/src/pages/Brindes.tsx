import { useMemo, useRef, useState } from 'react'
import { format } from 'date-fns'
import { useQrcodes, useClientes } from '../hooks/useRestaurantData'
import { useCreateQrcode, useUpdateQrcode, useDeleteQrcode } from '../hooks/useRestaurantData'

export default function Brindes() {
  const { data: qrcodes, isLoading, error } = useQrcodes()
  const { data: clientes } = useClientes()
  const createQrcode = useCreateQrcode()
  const updateQrcode = useUpdateQrcode()
  const deleteQrcode = useDeleteQrcode()

  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<{
    status: 'Resgatado' | 'Pendente' | 'Vencido'
    tipo_brinde: string
    cliente_id: string
  }>({ status: 'Pendente', tipo_brinde: '', cliente_id: '' })
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'todos' | 'Resgatado' | 'Pendente' | 'Vencido'>('todos')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [selectionMode, setSelectionMode] = useState(false)
  const longPressTimer = useRef<number | null>(null)
  const suppressNextTapIdRef = useRef<string | null>(null)

  const toggleSelect = (id: string | number, checked: boolean) => {
    const key = String(id)
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
    const ids = Array.from(selected)
    await Promise.all(ids.map((id) => deleteQrcode.mutateAsync(id)))
    clearSelection()
    setSelectionMode(false)
  }

  const enableSelection = () => setSelectionMode(true)
  const disableSelection = () => { setSelectionMode(false); clearSelection() }

  const onCardTouchStart = (id: string | number) => {
    if (longPressTimer.current) window.clearTimeout(longPressTimer.current)
    longPressTimer.current = window.setTimeout(() => {
      setSelectionMode(true)
      toggleSelect(id, true)
      // Prevent the immediate synthetic click after long-press from toggling back
      suppressNextTapIdRef.current = String(id)
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
  // Edit flow removido a pedido: sem botão/ação de editar.
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    // Ensure data_resgate coherence when saving via form
    const localToday = (() => {
      const d = new Date()
      const tz = d.getTimezoneOffset() * 60000
      return new Date(Date.now() - tz).toISOString().slice(0, 10)
    })()
    if (!form.cliente_id || !form.tipo_brinde) return
    const payload = {
      cliente_id: form.cliente_id,
      tipo_brinde: form.tipo_brinde,
      status: form.status,
      data_resgate: form.status === 'Resgatado' ? localToday : null,
    }
    if (editingId) await updateQrcode.mutateAsync({ id: editingId, payload })
    else await createQrcode.mutateAsync(payload as any)
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
        <h1 className="text-2xl md:text-3xl xl:text-4xl font-semibold bg-clip-text text-transparent af-grad">Brindes</h1>
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
      <div className="af-section af-card-elev overflow-hidden min-w-0 ring-1 ring-white/10 bg-[rgba(7,12,20,0.55)]">
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="af-subtitle">Lista de brindes
            <span className="ml-2 af-badge text-[11px] text-white/90"><span className="af-badge-dot"/> Resgatados: {countResgatado} • Pendentes: {countPendente} • Vencidos: {countVencido}</span>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              placeholder="Buscar por nome/telefone do cliente"
              className="af-field placeholder:text-white/40 w-full"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              className="af-field w-full sm:w-auto"
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
            {filtered.map((q) => {
              const status: 'Resgatado' | 'Pendente' | 'Vencido' = (q as any).status || 'Pendente'
              const cliente = (clientes ?? []).find((c: any) => c.id === (q as any).cliente_id)
              return (
                <div
                  key={q.id}
                  className={`af-list-card af-list-card-info p-4 ${
                    status === 'Resgatado'
                      ? 'border-t-2 border-blue-400/60'
                      : status === 'Vencido'
                        ? 'border-t-2 border-red-400/60'
                        : 'border-t-2 border-white/20'
                  } ${selectionMode && selected.has(String(q.id)) ? 'af-selected af-glow ring-2 ring-blue-400/50' : ''}`}
                  onTouchStart={() => onCardTouchStart(q.id)}
                  onTouchEnd={onCardTouchEnd}
                  onTouchCancel={onCardTouchEnd}
                  onClick={() => {
                    // Ignore only the synthetic tap for the same card that was long-pressed
                    if (suppressNextTapIdRef.current === String(q.id)) {
                      suppressNextTapIdRef.current = null
                      return
                    }
                    if (selectionMode) {
                      const key = String(q.id)
                      toggleSelect(key, !selected.has(key))
                    }
                  }}
                >
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex items-start gap-3">
                      {selectionMode && (
                        <input
                          type="checkbox"
                          className="mt-1 hidden sm:block h-4 w-4 rounded border-white/30 bg-transparent"
                          checked={selected.has(String(q.id))}
                          onChange={(e) => toggleSelect(q.id, e.target.checked)}
                        />
                      )}
                      <div className="title truncate">{q.tipo_brinde || 'Brinde'}</div>
                    </div>
                    <span className="af-badge text-[11px] shrink-0"><span className="af-badge-dot"/> {status}</span>
                  </div>

                  {/* Details */}
                  <div className="mt-3 space-y-1">
                    {cliente && (
                      <div className="text-xs text-white/85 truncate"><span className="font-medium">Cliente:</span> {cliente.nome || '—'}{cliente.telefone && <span className="ml-2">• {cliente.telefone}</span>}</div>
                    )}
                    {status === 'Resgatado' && q.data_resgate && (
                      <div className="text-xs text-white/80">Resgatado em: {format(new Date(q.data_resgate), 'dd/MM/yyyy')}</div>
                    )}
                    {q.expires_at && (
                      <div className="text-xs text-white/70">Expira em: {format(new Date(q.expires_at), 'dd/MM/yyyy')}</div>
                    )}
                    {q.campaign && (
                      <div className="text-xs text-white/70 truncate">Campanha: {q.campaign}</div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          const d = new Date()
                          const tz = d.getTimezoneOffset() * 60000
                          const today = new Date(Date.now() - tz).toISOString().slice(0, 10)
                          updateQrcode.mutate({ id: q.id, payload: { status: 'Resgatado', data_resgate: today } })
                        }}
                        className="af-btn-ghost px-3 py-1.5 text-xs"
                      >
                        Resgatado
                      </button>
                      <button
                        onClick={() => updateQrcode.mutate({ id: q.id, payload: { status: 'Pendente', data_resgate: null } })}
                        className="af-btn-ghost px-3 py-1.5 text-xs"
                      >
                        Pendente
                      </button>
                      <button
                        onClick={() => updateQrcode.mutate({ id: q.id, payload: { status: 'Vencido', data_resgate: null } })}
                        className="af-btn-ghost px-3 py-1.5 text-xs"
                      >
                        Vencido
                      </button>
                    </div>
                    <div className="flex items-center gap-2 ml-auto">
                      <button onClick={() => { if (confirm('Excluir este brinde?')) deleteQrcode.mutate(q.id) }} className="af-btn-ghost px-3 py-1.5 text-xs">Excluir</button>
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
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4">
          <div className="w-full max-w-md af-card-elev p-5 overflow-hidden min-w-0">
            <div className="mb-3 text-lg font-semibold text-white">{editingId ? 'Editar brinde' : 'Novo brinde'}</div>
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
                </select>
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button type="button" onClick={() => setOpen(false)} className="rounded-md af-card px-4 py-2 text-sm text-white hover:af-glow">Cancelar</button>
                <button type="submit" className="af-btn-primary w-auto">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
