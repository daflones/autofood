import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { supabase } from '../../lib/supabaseClient'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

const schema = z
  .object({
    password: z.string().min(6, 'Mínimo de 6 caracteres'),
    confirm: z.string().min(6, 'Mínimo de 6 caracteres'),
  })
  .refine((data) => data.password === data.confirm, {
    message: 'Senhas não conferem',
    path: ['confirm'],
  })

type FormData = z.infer<typeof schema>

export default function ResetPassword() {
  const navigate = useNavigate()
  const [ready, setReady] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  // When this page opens from email link, Supabase sets a session allowing updateUser
  useEffect(() => {
    // we could verify there is a session
    supabase.auth.getSession().then(({ data }) => {
      setReady(!!data.session)
    })
  }, [])

  const onSubmit = async ({ password }: FormData) => {
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      alert(error.message)
      return
    }
    alert('Senha redefinida com sucesso! Faça login novamente.')
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-[#F8F9FE] flex items-center justify-center p-3 sm:p-4 md:p-6">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-100 p-6 sm:p-8">
        <div className="text-center mb-8">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-50 to-indigo-50 mx-auto mb-4">
            <svg className="h-8 w-8 text-purple-600" fill="currentColor" viewBox="0 0 24 24">
              <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM12 17c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zM15.1 8H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
            </svg>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Redefinir senha</h1>
          <p className="text-sm text-gray-500">Escolha uma nova senha para sua conta.</p>
        </div>
        {!ready ? (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
            <div className="flex items-center gap-3">
              <svg className="h-5 w-5 text-blue-600 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Validando sessão de recuperação...</span>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Nova senha</label>
              <input
                type="password"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                placeholder="••••••••"
                {...register('password')}
              />
              {errors.password && <p className="mt-2 text-sm text-red-600">{errors.password.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Confirmar senha</label>
              <input
                type="password"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                placeholder="••••••••"
                {...register('confirm')}
              />
              {errors.confirm && <p className="mt-2 text-sm text-red-600">{errors.confirm.message}</p>}
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-medium py-3 px-4 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Salvando...' : 'Salvar nova senha'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
