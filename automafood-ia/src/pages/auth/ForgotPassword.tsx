import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { supabase } from '../../lib/supabaseClient'
import { useState } from 'react'
import { Link } from 'react-router-dom'

const schema = z.object({
  email: z.string().email('Email inválido'),
})

type FormData = z.infer<typeof schema>

export default function ForgotPassword() {
  const [sent, setSent] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  const onSubmit = async ({ email }: FormData) => {
    const baseUrl = (import.meta.env.VITE_PUBLIC_SITE_URL as string) || 'https://www.autofood.com.br'
    const redirectTo = `${baseUrl.replace(/\/$/, '')}/reset-password`
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
    if (error) {
      alert(error.message)
      return
    }
    setSent(true)
  }

  return (
    <div className="min-h-screen bg-[#F8F9FE] flex items-center justify-center p-3 sm:p-4 md:p-6">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-100 p-6 sm:p-8">
        <div className="text-center mb-8">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-50 to-indigo-50 mx-auto mb-4">
            <svg className="h-8 w-8 text-purple-600" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
            </svg>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Recuperar senha</h1>
          <p className="text-sm text-gray-500">Enviaremos um link para redefinir sua senha.</p>
        </div>
        {sent ? (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-800">
            <div className="flex items-center gap-3">
              <svg className="h-5 w-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>Se o email existir, o link de recuperação foi enviado. Verifique sua caixa de entrada.</span>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <input
                type="email"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                placeholder="seu@email.com"
                {...register('email')}
              />
              {errors.email && <p className="mt-2 text-sm text-red-600">{errors.email.message}</p>}
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-medium py-3 px-4 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Enviando...' : 'Enviar link'}
            </button>
          </form>
        )}
        <div className="mt-6 pt-6 border-t border-gray-100 text-center">
          <Link to="/login" className="text-purple-600 hover:text-purple-700 font-medium">
            Voltar para login
          </Link>
        </div>
      </div>
    </div>
  )
}
