import { useMemo, useState } from 'react'
import { useQrcodes } from '../hooks/useRestaurantData'
import { useCreateQrcode, useUpdateQrcode, useDeleteQrcode } from '../hooks/useRestaurantData'

export default function Brindes() {
  const { data: qrcodes, isLoading, error } = useQrcodes()
  const createQrcode = useCreateQrcode()
  const updateQrcode = useUpdateQrcode()
  const deleteQrcode = useDeleteQrcode()

  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<{ codigo: string; descricao: string; status: 'Resgatado' | 'Pendente' | 'Vencido' }>({ codigo: '', descricao: '', status: 'Pendente' })
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'todos' | 'Resgatado' | 'Pendente' | 'Vencido'>('todos')

  const openCreate = () => {
    setEditingId(null)
    setForm({ codigo: '', descricao: '', status: 'Pendente' })
    setOpen(true)
  }
  const openEdit = (q: any) => {
    setEditingId(q.id)
    setForm({ codigo: q.codigo ?? '', descricao: q.descricao ?? '', status: (q.status as any) ?? 'Pendente' })
    setOpen(true)
  }
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const payload = { ...form }
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
      const matchesText = !term || (q.codigo?.toLowerCase().includes(term) || q.descricao?.toLowerCase().includes(term))
      const matchesStatus = statusFilter === 'todos' || q.status === statusFilter
      return matchesText && matchesStatus
    })
  }, [qrcodes, search, statusFilter])

  return (
    <div className="space-y-8 lg:space-y-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl md:text-3xl xl:text-4xl font-semibold bg-clip-text text-transparent af-grad">Brindes</h1>
        <button onClick={openCreate} className="af-btn-primary w-auto">
          Novo Brinde
        </button>
      </div>
      <div className="af-section af-card-elev overflow-hidden min-w-0">
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm font-medium text-white">Lista de brindes
            <span className="ml-2 af-badge text-[11px] text-white/90"><span className="af-badge-dot"/> Resgatados: {countResgatado} • Pendentes: {countPendente} • Vencidos: {countVencido}</span>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              placeholder="Buscar por código/descrição"
              className="af-field placeholder:text-white/40"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              className="af-field"
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
              return (
                <div key={q.id} className="af-list-card">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate title">{q.codigo}</div>
                      <div className="mt-1 truncate subtle">{q.descricao || '—'}</div>
                    </div>
                    <span className="af-badge text-[11px] shrink-0"><span className="af-badge-dot"/> {status}</span>
                  </div>
                  <div className="mt-4 flex items-center justify-end gap-2">
                    <button onClick={() => openEdit(q)} className="af-btn-ghost px-3 py-1.5 text-xs">Editar</button>
                    <button onClick={() => { if (confirm('Excluir este brinde?')) deleteQrcode.mutate(q.id) }} className="af-btn-ghost px-3 py-1.5 text-xs">Excluir</button>
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
                <label className="mb-1 block af-label">Código</label>
                <input className="af-field" value={form.codigo} onChange={(e) => setForm((f) => ({ ...f, codigo: e.target.value }))} required />
              </div>
              <div>
                <label className="mb-1 block af-label">Descrição</label>
                <input className="af-field" value={form.descricao} onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))} />
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
