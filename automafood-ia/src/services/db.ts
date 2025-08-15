import { supabase } from '../lib/supabaseClient'
import type { User } from '@supabase/supabase-js'

// Types (adjust/extend according to your DB schema)
export interface BaseRow {
  id: string
  created_at?: string
  restaurante_id: string
}

export interface Cliente extends BaseRow {
  nome?: string
  email?: string
  telefone?: string
  total_brindes?: number
  total_reservas?: number
  lead_status?: string
  // add other columns
  // CRM additions
  crm_stage?: string
  tags?: string[]
  last_contact_at?: string
  next_action_at?: string
  owner_user_id?: string
  priority?: number
  notes?: string
  whatsapp_opt_in?: boolean
}

export interface Reserva extends BaseRow {
  cliente_id?: string
  data_reserva?: string // ISO date (YYYY-MM-DD)
  hora_reserva?: string // HH:mm or ISO time
  status?: string
  status_pagamento?: boolean
  n_pessoas?: number
  observacao?: string
  // add other columns
  duration_minutes?: number
  table_number?: string
  source?: string
  color_hint?: string
  deposit_amount?: number
  deposit_status?: string
  reminder_sent_at?: string
}

export interface Qrcode extends BaseRow {
  codigo?: string
  descricao?: string
  status?: 'Resgatado' | 'Pendente' | 'Vencido'
  cliente_id?: string
  tipo_brinde?: string
  data_resgate?: string | null // YYYY-MM-DD or null when cleared
  // add other columns
  campaign?: string
  uses_limit?: number
  expires_at?: string
}

export interface Restaurante extends BaseRow {
  nome?: string
  email?: string
  telefone?: string
  endereco?: string
  // preferences
  theme_prefs?: any
}

// Utility: get restaurante_id from the current authenticated user metadata
export async function getCurrentUser(): Promise<User | null> {
  const { data, error } = await supabase.auth.getUser()
  if (error) throw error
  return data.user ?? null
}

export async function getRestauranteId(): Promise<string> {
  const user = await getCurrentUser()
  const restaurante_id = (user?.user_metadata as any)?.restaurante_id as string | undefined
  if (!restaurante_id) {
    throw new Error('restaurante_id não encontrado no perfil do usuário.')
  }
  return restaurante_id
}

// Generic helpers
function cleanPayload(obj: any) {
  if (!obj || typeof obj !== 'object') return obj
  const out: any = {}
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined) continue
    if (v instanceof Date) out[k] = v.toISOString()
    else out[k] = v
  }
  return out
}

async function guardedSelect<T>(table: string, rid: string) {
  const { data, error } = await supabase
    .from(table)
    .select('*')
    .eq('restaurante_id', rid)
  if (error) throw error
  return (data ?? []) as T[]
}

async function guardedSelectById<T>(table: string, id: string, rid: string) {
  const { data, error } = await supabase
    .from(table)
    .select('*')
    .eq('id', id)
    .eq('restaurante_id', rid)
    .maybeSingle()
  if (error) throw error
  return (data as T | null) ?? null
}

async function guardedInsert<T extends BaseRow>(table: string, payload: Omit<T, 'id' | 'restaurante_id'>, rid: string) {
  const { data, error } = await supabase
    .from(table)
    .insert([{ ...(cleanPayload(payload) as object), restaurante_id: rid }])
    .select('*')
    .single()
  if (error) throw error
  return data as T
}

async function guardedUpdate<T extends BaseRow>(
  table: string,
  id: string,
  payload: Partial<Omit<T, 'id' | 'restaurante_id'>>,
  rid: string,
) {
  const { data, error } = await supabase
    .from(table)
    .update(cleanPayload(payload) as object)
    .eq('id', id)
    .eq('restaurante_id', rid)
    .select('*')
    .maybeSingle()
  if (error) throw error
  return (data as T | null) ?? null
}

async function guardedDelete(table: string, id: string, rid: string) {
  const { error } = await supabase
    .from(table)
    .delete()
    .eq('id', id)
    .eq('restaurante_id', rid)
  if (error) throw error
  return true
}

// Restaurante (perfil atual)
export async function getMyRestaurante() {
  const rid = await getRestauranteId()
  const { data, error } = await supabase
    .from('restaurantes')
    .select('*')
    .eq('id', rid)
    .maybeSingle()
  if (error) throw error
  return (data as Restaurante | null) ?? null
}

export async function updateMyRestaurante(payload: Partial<Omit<Restaurante, 'id' | 'restaurante_id'>>) {
  const rid = await getRestauranteId()
  // Unique name guard (case-insensitive) when renaming
  if (payload.nome && payload.nome.trim().length > 0) {
    const nomeTrim = payload.nome.trim()
    const { data: clash, error: clashErr } = await supabase
      .from('restaurantes')
      .select('id, nome')
      .ilike('nome', nomeTrim)
      .neq('id', rid)
    if (clashErr) throw clashErr
    if ((clash ?? []).length > 0) {
      throw new Error('Já existe um restaurante com este nome. Escolha outro nome.')
    }
  }
  const { data, error } = await supabase
    .from('restaurantes')
    .update(payload as object)
    .eq('id', rid)
    .select('*')
    .maybeSingle()
  if (error) throw error
  return (data as Restaurante | null) ?? null
}

// Reservas
export async function listReservas() {
  const rid = await getRestauranteId()
  return guardedSelect<Reserva>('reservas', rid)
}

export async function getReservaById(id: string) {
  const rid = await getRestauranteId()
  return guardedSelectById<Reserva>('reservas', id, rid)
}

export async function createReserva(payload: Omit<Reserva, 'id' | 'restaurante_id'>) {
  const rid = await getRestauranteId()
  return guardedInsert<Reserva>('reservas', payload, rid)
}

export async function updateReserva(id: string, payload: Partial<Omit<Reserva, 'id' | 'restaurante_id'>>) {
  const rid = await getRestauranteId()
  return guardedUpdate<Reserva>('reservas', id, payload, rid)
}

export async function deleteReserva(id: string) {
  const rid = await getRestauranteId()
  return guardedDelete('reservas', id, rid)
}

// Clientes
export async function listClientes() {
  const rid = await getRestauranteId()
  return guardedSelect<Cliente>('clientes', rid)
}

export async function getClienteById(id: string) {
  const rid = await getRestauranteId()
  return guardedSelectById<Cliente>('clientes', id, rid)
}

export async function createCliente(payload: Omit<Cliente, 'id' | 'restaurante_id'>) {
  const rid = await getRestauranteId()
  return guardedInsert<Cliente>('clientes', payload, rid)
}

export async function updateCliente(id: string, payload: Partial<Omit<Cliente, 'id' | 'restaurante_id'>>) {
  const rid = await getRestauranteId()
  return guardedUpdate<Cliente>('clientes', id, payload, rid)
}

export async function deleteCliente(id: string) {
  const rid = await getRestauranteId()
  return guardedDelete('clientes', id, rid)
}

// QRCodes (brindes)
export async function listQrcodes() {
  const rid = await getRestauranteId()
  return guardedSelect<Qrcode>('qrcodes', rid)
}

export async function getQrcodeById(id: string) {
  const rid = await getRestauranteId()
  return guardedSelectById<Qrcode>('qrcodes', id, rid)
}

export async function createQrcode(payload: Omit<Qrcode, 'id' | 'restaurante_id'>) {
  const rid = await getRestauranteId()
  return guardedInsert<Qrcode>('qrcodes', payload, rid)
}

export async function updateQrcode(id: string, payload: Partial<Omit<Qrcode, 'id' | 'restaurante_id'>>) {
  const rid = await getRestauranteId()
  return guardedUpdate<Qrcode>('qrcodes', id, payload, rid)
}

export async function deleteQrcode(id: string) {
  const rid = await getRestauranteId()
  return guardedDelete('qrcodes', id, rid)
}
