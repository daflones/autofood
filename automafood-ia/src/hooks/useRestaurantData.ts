import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  listReservas,
  getReservaById,
  createReserva,
  updateReserva,
  deleteReserva,
  listClientes,
  getClienteById,
  createCliente,
  updateCliente,
  deleteCliente,
  listQrcodes,
  getQrcodeById,
  createQrcode,
  updateQrcode,
  deleteQrcode,
  type Reserva,
  type Cliente,
  type Qrcode,
  getMyRestaurante,
  updateMyRestaurante,
  type Restaurante,
  updateQrcodeExact,
} from '../services/db'

// Keys
const keys = {
  reservas: ['reservas'] as const,
  clientes: ['clientes'] as const,
  qrcodes: ['qrcodes'] as const,
  reserva: (id: string) => ['reservas', id] as const,
  cliente: (id: string) => ['clientes', id] as const,
  qrcode: (id: string) => ['qrcodes', id] as const,
  restaurante: ['restaurante'] as const,
}

// Reservas
export function useReservas() {
  return useQuery({ queryKey: keys.reservas, queryFn: listReservas })
}
export function useReserva(id: string) {
  return useQuery({ queryKey: keys.reserva(id), queryFn: () => getReservaById(id), enabled: !!id })
}
export function useCreateReserva() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: Omit<Reserva, 'id' | 'restaurante_id'>) => createReserva(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.reservas }),
  })
}
export function useUpdateReserva() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<Omit<Reserva, 'id' | 'restaurante_id'>> }) =>
      updateReserva(id, payload),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: keys.reservas })
      qc.invalidateQueries({ queryKey: keys.reserva(vars.id) })
    },
  })
}
export function useDeleteReserva() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteReserva(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.reservas }),
  })
}

// Clientes
export function useClientes() {
  return useQuery({ queryKey: keys.clientes, queryFn: listClientes })
}
export function useCliente(id: string) {
  return useQuery({ queryKey: keys.cliente(id), queryFn: () => getClienteById(id), enabled: !!id })
}
export function useCreateCliente() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: Omit<Cliente, 'id' | 'restaurante_id'>) => createCliente(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.clientes }),
  })
}
export function useUpdateCliente() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<Omit<Cliente, 'id' | 'restaurante_id'>> }) =>
      updateCliente(id, payload),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: keys.clientes })
      qc.invalidateQueries({ queryKey: keys.cliente(vars.id) })
    },
  })
}
export function useDeleteCliente() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteCliente(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.clientes }),
  })
}

// QRCodes (brindes)
export function useQrcodes() {
  return useQuery({ queryKey: keys.qrcodes, queryFn: listQrcodes })
}
export function useQrcode(id: string) {
  return useQuery({ queryKey: keys.qrcode(id), queryFn: () => getQrcodeById(id), enabled: !!id })
}
export function useCreateQrcode() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: Omit<Qrcode, 'id' | 'restaurante_id'>) => createQrcode(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.qrcodes }),
  })
}
export function useUpdateQrcode() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<Omit<Qrcode, 'id' | 'restaurante_id'>> }) =>
      updateQrcode(id, payload),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: keys.qrcodes })
      qc.invalidateQueries({ queryKey: keys.qrcode(vars.id) })
    },
  })
}

// Update a single brinde row by (id + created_at) to avoid touching multiple rows with the same id
export function useUpdateQrcodeExact() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, created_at, payload }: { id: string; created_at: string; payload: Partial<Omit<Qrcode, 'id' | 'restaurante_id' | 'created_at'>> }) =>
      updateQrcodeExact(id, created_at, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.qrcodes })
    },
  })
}
export function useDeleteQrcode() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteQrcode(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.qrcodes }),
  })
}

// Restaurante (perfil)
export function useMyRestaurante() {
  return useQuery({ queryKey: keys.restaurante, queryFn: getMyRestaurante })
}

export function useUpdateMyRestaurante() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: Partial<Omit<Restaurante, 'id' | 'restaurante_id'>>) => updateMyRestaurante(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.restaurante }),
  })
}
