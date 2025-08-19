import React, { useState, useMemo, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { format, parseISO, addDays } from 'date-fns'
import { Calendar, Filter, Users, Clock, Edit, MoreVertical, Trash2, CheckSquare, Square } from 'lucide-react'
import { useReservas, useCreateReserva, useUpdateReserva, useDeleteReserva, useClientes } from '../hooks/useRestaurantData';
import type { Reserva } from '../services/db';
import WeeklyCalendar from '../components/WeeklyCalendar'
import { Card } from '../components/Card'

// Tipos
type TStatus = 'pendente' | 'confirmada' | 'cancelada' | 'finalizada' | 'expirada';

const statusColor = (status: TStatus) => {
  switch (status) {
    case 'confirmada':
      return { bg: 'bg-green-50', text: 'text-green-700', border: 'border-l-green-400', dot: 'bg-[#2ED47A]' }
    case 'pendente':
      return { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-l-orange-400', dot: 'bg-[#FFB648]' }
    case 'cancelada':
      return { bg: 'bg-red-50', text: 'text-red-700', border: 'border-l-red-400', dot: 'bg-[#FF4848]' }
    case 'finalizada':
      return { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-l-blue-400', dot: 'bg-[#5D5FEF]' }
    case 'expirada':
      return { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-l-gray-400', dot: 'bg-gray-400' }
    default:
      return { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-l-gray-400', dot: 'bg-gray-400' }
  }
}

export default function Reservas() {
  const { data: reservas, isLoading, error, refetch } = useReservas() as any;
  const { data: clientes } = useClientes();
  const createReserva = useCreateReserva();
  const updateReserva = useUpdateReserva();
  const deleteReserva = useDeleteReserva();

  const clienteNome = (clienteId?: string | null) => {
    const cliente = clientes?.find(c => c.id === clienteId)?.nome || 'Cliente não encontrado'
    return cliente;
  };

  const [statusMenuPos, setStatusMenuPos] = useState<{ reserva: Reserva; top: number; left: number; width: number } | null>(
    null
  );

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null;
      if (!t) return;
      if (!t.closest('[data-status-menu-container]')) setStatusMenuPos(null);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const sorted = useMemo(() => {
    return [...(reservas ?? [])].sort((a, b) => {
      const da = a.data_reserva ? new Date(`${a.data_reserva}T${a.hora_reserva ?? '00:00'}`).getTime() : 0;
      const db = b.data_reserva ? new Date(`${b.data_reserva}T${b.hora_reserva ?? '00:00'}`).getTime() : 0;
      return da - db;
    });
  }, [reservas]);

  // Weekly calendar state and navigation
  const [selectedDay, setSelectedDay] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [q, setQ] = useState('');
  const [statusSel, setStatusSel] = useState<'todos' | TStatus>('todos');
  const [pagamentoSel, setPagamentoSel] = useState<'todos' | 'pago' | 'pendente'>('todos');

  const now = new Date();
  const effectiveStatus = (r: Reserva): TStatus => {
    const dateStr = r.data_reserva;
    const timeStr = r.hora_reserva?.slice(0, 5) || '00:00';
    const base = dateStr ? new Date(`${dateStr}T${timeStr}:00`) : null;
    const afterDate = !!(base && now > base);
    const status = r.status ?? 'pendente';
    const pago = !!r.status_pagamento;
    if (afterDate && (status === 'pendente' || (status === 'confirmada' && !pago))) return 'expirada';
    return status as TStatus;
  };

  // Removed reservasPorDia (was used by old monthly calendar)
  // Confirmed reservations per day for the weekly calendar counters
  const confirmedCountByDay = useMemo(() => {
    const map: Record<string, number> = {};
    for (const r of reservas ?? []) {
      const day = r.data_reserva;
      if (!day) continue;
      if (effectiveStatus(r) !== 'confirmada') continue;
      map[day] = (map[day] ?? 0) + 1;
    }
    return map;
  }, [reservas]);

  const filtered = useMemo(() => {
    return sorted.filter((r: Reserva) => {
      if (r.data_reserva !== selectedDay) return false;
      const nome = clienteNome(r.cliente_id).toLowerCase();
      const txt = q.toLowerCase().trim();
      if (txt && !nome.includes(txt)) return false;
      if (statusSel !== 'todos' && effectiveStatus(r) !== statusSel) return false;
      if (pagamentoSel !== 'todos' && r.status_pagamento !== (pagamentoSel === 'pago')) return false;
      return true;
    });
  }, [sorted, selectedDay, q, statusSel, pagamentoSel, clienteNome]);

  // Week navigation handlers
  const goToday = () => setSelectedDay(format(new Date(), 'yyyy-MM-dd'));
  const goPrevWeek = () => setSelectedDay(format(addDays(parseISO(selectedDay), -7), 'yyyy-MM-dd'));
  const goNextWeek = () => setSelectedDay(format(addDays(parseISO(selectedDay), 7), 'yyyy-MM-dd'));

  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    cliente_id: '',
    n_pessoas: 2,
    data_reserva: selectedDay,
    hora_reserva: '19:00',
    observacao: '',
    status: 'pendente' as TStatus,
    status_pagamento: false,
  });
  const [submitError, setSubmitError] = useState('');
  const [selectedReservas, setSelectedReservas] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<'single' | 'bulk'>('single');
  const [singleDeleteId, setSingleDeleteId] = useState<string | null>(null);

  const openCreate = () => {
    setEditingId('new');
    setForm({
      cliente_id: '',
      n_pessoas: 2,
      data_reserva: selectedDay,
      hora_reserva: '19:00',
      observacao: '',
      status: 'pendente',
      status_pagamento: false,
    });
  };

  const openEdit = (r: Reserva) => {
    setEditingId(r.id);
    setForm({
      cliente_id: r.cliente_id || '',
      n_pessoas: r.n_pessoas || 0,
      data_reserva: r.data_reserva || '',
      hora_reserva: r.hora_reserva || '',
      observacao: r.observacao || '',
      status: (r.status as TStatus) || 'pendente',
      status_pagamento: r.status_pagamento ?? false,
    });
  };

  const close = () => {
    setEditingId(null);
  };

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).hasAttribute('data-overlay')) {
      close();
    }
  };

  const setStatus = async (id: string, status: 'pendente' | 'confirmada' | 'cancelada') => {
    await updateReserva.mutateAsync({ id, payload: { status } as any });
    refetch?.();
  };

  const toggleSelectReserva = (id: string) => {
    setSelectedReservas(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const selectAllReservas = () => {
    const allIds = filtered.map(r => r.id);
    setSelectedReservas(new Set(allIds));
  };

  const clearSelection = () => {
    setSelectedReservas(new Set());
    setSelectionMode(false);
  };

  const handleSingleDelete = (id: string) => {
    setSingleDeleteId(id);
    setDeleteTarget('single');
    setShowDeleteConfirm(true);
  };

  const handleBulkDelete = () => {
    if (selectedReservas.size === 0) return;
    setDeleteTarget('bulk');
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    try {
      if (deleteTarget === 'single' && singleDeleteId) {
        await deleteReserva.mutateAsync(singleDeleteId);
      } else if (deleteTarget === 'bulk') {
        await Promise.all(
          Array.from(selectedReservas).map(id => deleteReserva.mutateAsync(id))
        );
        clearSelection();
      }
      refetch?.();
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
    e.preventDefault();
    setSubmitError('');
    try {
      const payload = {
        ...form,
        n_pessoas: form.n_pessoas,
        status_pagamento: form.status_pagamento,
      };
      if (editingId && editingId !== 'new') {
        await updateReserva.mutateAsync({ id: editingId, payload });
      } else {
        await createReserva.mutateAsync(payload);
      }
      refetch?.();
      close();
    } catch (err: any) {
      setSubmitError(err.message || 'Ocorreu um erro');
    }
  };

  return (
    <>
    <div className="min-h-screen bg-[#F8F9FE] p-3 sm:p-4 md:p-6 lg:p-8">
      <div className="space-y-4 sm:space-y-6 lg:space-y-8">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl bg-blue-50">
              <Calendar className="h-5 w-5 sm:h-6 sm:w-6 text-[#6366F1]" />
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Reservas</h1>
          </div>
          <div className="flex items-center gap-2">
            {selectionMode && (
              <>
                <button onClick={selectAllReservas} className="af-btn-secondary flex items-center gap-2">
                  <CheckSquare className="h-4 w-4" />
                  Selecionar Todos
                </button>
                <button onClick={handleBulkDelete} disabled={selectedReservas.size === 0} className="af-btn-danger flex items-center gap-2">
                  <Trash2 className="h-4 w-4" />
                  Excluir ({selectedReservas.size})
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
                <button onClick={openCreate} className="af-btn-primary flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Nova Reserva
                </button>
              </>
            )}
          </div>
        </div>

        {/* Filters */}
        <Card
          title={(
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-[#8C54FF]" />
              <span>Filtros</span>
            </div>
          )}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <input
              type="text"
              placeholder="Pesquisar por nome..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="af-input"
            />
            <select value={statusSel} onChange={(e) => setStatusSel(e.target.value as any)} className="af-input">
              <option value="todos">Todos os status</option>
              <option value="pendente">Pendente</option>
              <option value="confirmada">Confirmada</option>
              <option value="cancelada">Cancelada</option>
              <option value="finalizada">Finalizada</option>
              <option value="expirada">Expirada</option>
            </select>
            <select value={pagamentoSel} onChange={(e) => setPagamentoSel(e.target.value as any)} className="af-input">
              <option value="todos">Pagamento</option>
              <option value="pago">Pago</option>
              <option value="pendente">Pendente</option>
            </select>
          </div>
        </Card>

        {/* Weekly Calendar */}
        <Card
          title={(
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-[#2ED47A]" />
              <span>Calendário Semanal</span>
            </div>
          )}
        >
          <WeeklyCalendar
            selectedDay={selectedDay}
            onSelectDay={(d) => setSelectedDay(d)}
            onPrevWeek={goPrevWeek}
            onNextWeek={goNextWeek}
            onToday={goToday}
            countsByDay={confirmedCountByDay}
          />
        </Card>

        {/* Reservation List */}
        <Card
          title={(
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-[#FFB648]" />
              <span>Lista de Reservas</span>
            </div>
          )}
        >
          <div className="space-y-3">
            {isLoading && (
              <div className="text-center py-8 text-gray-500">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#5D5FEF] mx-auto"></div>
                <p className="mt-2">Carregando reservas...</p>
              </div>
            )}
            {error && (
              <div className="text-center py-8 text-red-500">
                <p>Erro ao carregar reservas.</p>
              </div>
            )}
            {!isLoading && !error && filtered.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Calendar className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>Nenhuma reserva encontrada.</p>
              </div>
            )}
            {!isLoading &&
              !error &&
              filtered.map((r: Reserva) => {
                const s = statusColor(effectiveStatus(r));
                return (
                  <div
                    key={r.id}
                    className={`rounded-xl p-3 sm:p-4 border-l-4 ${s.border} hover:shadow-md transition-shadow ${
                      selectionMode ? 'cursor-pointer' : ''
                    } ${
                      selectedReservas.has(r.id) ? 'ring-2 ring-purple-500 bg-purple-50' : ''
                    }`}
                    style={!selectedReservas.has(r.id) ? { backgroundColor: {
                      confirmada: '#f0fff4',
                      pendente: '#fffbf0', 
                      cancelada: '#fff5f5',
                      finalizada: '#f0f7ff',
                      expirada: '#f8f9fa'
                    }[effectiveStatus(r)] } : {}}
                    onClick={() => selectionMode && toggleSelectReserva(r.id)}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                        {selectionMode ? (
                          <div className="flex items-center justify-center w-5 h-5 flex-shrink-0">
                            {selectedReservas.has(r.id) ? (
                              <CheckSquare className="h-5 w-5 text-purple-600" />
                            ) : (
                              <Square className="h-5 w-5 text-gray-400" />
                            )}
                          </div>
                        ) : (
                          <div className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full ${s.dot} flex-shrink-0`}></div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 mb-2">
                            <h3 className="font-semibold text-gray-900 text-sm sm:text-base truncate">{clienteNome(r.cliente_id)}</h3>
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${s.bg} ${s.text} self-start`}>
                              {effectiveStatus(r)}
                            </span>
                          </div>
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-600">
                            <div className="flex items-center gap-1">
                              <Users className="h-3 w-3 sm:h-4 sm:w-4" />
                              <span>{r.n_pessoas} pessoas</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
                              <span className="truncate">{r.data_reserva ? format(parseISO(r.data_reserva), 'dd/MM/yyyy') : ''} às {r.hora_reserva}</span>
                            </div>
                            {!r.status_pagamento && (
                              <div className="flex items-center gap-1 text-red-600">
                                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-red-500 rounded-full"></div>
                                <span className="text-xs">Pagamento Pendente</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      {!selectionMode && (
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button onClick={() => openEdit(r)} className="af-btn-secondary flex items-center gap-1 text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2">
                            <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
                            <span className="hidden sm:inline">Editar</span>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSingleDelete(r.id);
                            }}
                            className="af-btn-danger flex items-center gap-1 text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2"
                          >
                            <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                            <span className="hidden sm:inline">Excluir</span>
                          </button>
                          <button
                            onClick={(e) => {
                              const rect = (e.target as HTMLElement).getBoundingClientRect();
                              setStatusMenuPos({ reserva: r, top: rect.bottom, left: rect.left, width: rect.width });
                            }}
                            className="af-btn-secondary flex items-center gap-1 text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2"
                          >
                            <MoreVertical className="h-3 w-3 sm:h-4 sm:w-4" />
                            <span className="hidden sm:inline">Status</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        </Card>
      </div>
    </div>

    {statusMenuPos &&
      createPortal(
        <div
          data-status-menu-container
          className="absolute z-50 bg-white rounded-md shadow-lg border border-gray-200"
          style={{ top: statusMenuPos.top, left: statusMenuPos.left, minWidth: statusMenuPos.width }}
        >
          <button
            onClick={() => {
              setStatus(statusMenuPos.reserva.id, 'pendente');
              setStatusMenuPos(null);
            }}
            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
          >
            Pendente
          </button>
          <button
            onClick={() => {
              setStatus(statusMenuPos.reserva.id, 'confirmada');
              setStatusMenuPos(null);
            }}
            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
          >
            Confirmada
          </button>
          <button
            onClick={() => {
              setStatus(statusMenuPos.reserva.id, 'cancelada');
              setStatusMenuPos(null);
            }}
            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
          >
            Cancelada
          </button>
        </div>,
        document.body
      )}

    {/* Modal Portal */}
    {editingId !== null &&
      createPortal(
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40"
          data-overlay
          onClick={handleOverlayClick}
        >
          <div className="af-card w-full max-w-lg rounded-xl shadow-xl m-4">
            <form onSubmit={onSubmit} className="p-6 space-y-4">
              <h2 className="af-card-title text-lg">{editingId === 'new' ? 'Nova Reserva' : 'Editar Reserva'}</h2>

              {submitError && <div className="p-3 bg-red-100 text-red-700 rounded-md text-sm">{submitError}</div>}
              
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="af-label">Cliente</label>
                    <select
                      value={form.cliente_id}
                      onChange={(e) => setForm({ ...form, cliente_id: e.target.value })}
                      className="af-input"
                      required
                    >
                      <option value="">Selecione um cliente</option>
                      {(clientes ?? []).map((c: any) => (
                        <option key={c.id} value={c.id}>
                          {c.nome}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="af-label">Nº de Pessoas</label>
                    <input
                      type="number"
                      value={form.n_pessoas}
                      onChange={(e) => setForm({ ...form, n_pessoas: parseInt(e.target.value, 10) })}
                      className="af-input"
                      required
                    />
                  </div>
                  <div>
                    <label className="af-label">Data</label>
                    <input
                      type="date"
                      value={form.data_reserva}
                      onChange={(e) => setForm({ ...form, data_reserva: e.target.value })}
                      className="af-input"
                      required
                    />
                  </div>
                  <div>
                    <label className="af-label">Hora</label>
                    <input
                      type="time"
                      value={form.hora_reserva}
                      onChange={(e) => setForm({ ...form, hora_reserva: e.target.value })}
                      className="af-input"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="af-label">Observação</label>
                  <textarea
                    value={form.observacao}
                    onChange={(e) => setForm({ ...form, observacao: e.target.value })}
                    className="af-input"
                    rows={3}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <label className="af-label">Status</label>
                    <select
                      value={form.status}
                      onChange={(e) => setForm({ ...form, status: e.target.value as TStatus })}
                      className="af-input"
                    >
                      <option value="pendente">Pendente</option>
                      <option value="confirmada">Confirmada</option>
                      <option value="cancelada">Cancelada</option>
                      <option value="finalizada">Finalizada</option>
                    </select>
                  </div>
                  <div className="pt-6">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={form.status_pagamento}
                        onChange={(e) => setForm({ ...form, status_pagamento: e.target.checked })}
                        className="af-checkbox"
                      />
                      <span>Pago</span>
                    </label>
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <button type="button" onClick={close} className="af-btn-secondary">
                    Cancelar
                  </button>
                  <button type="submit" className="af-btn-primary">
                    Salvar
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}
    
    {/* Delete Confirmation Modal */}
    {showDeleteConfirm && createPortal(
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl shadow-xl p-6 max-w-md mx-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Confirmar Exclusão
          </h3>
          <p className="text-gray-600 mb-6">
            {deleteTarget === 'single'
              ? 'Tem certeza que deseja excluir esta reserva?'
              : `Tem certeza que deseja excluir ${selectedReservas.size} reserva(s) selecionada(s)?`
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
      </div>,
      document.body
    )}
    </>
  );
}
