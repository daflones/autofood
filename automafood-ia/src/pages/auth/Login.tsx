import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { supabase } from '../../lib/supabaseClient'
import { useLocation, useNavigate, Link } from 'react-router-dom'

const schema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Mínimo de 6 caracteres'),
})

type FormData = z.infer<typeof schema>

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation() as { state?: { from?: Location } }
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  const onSubmit = async (values: FormData) => {
    const { error } = await supabase.auth.signInWithPassword(values)
    if (error) {
      alert(error.message)
      return
    }
    const redirectTo = (location.state?.from as any)?.pathname || '/'
    navigate(redirectTo, { replace: true })
  }

  return (
    <div className="min-h-screen bg-[#F8F9FE] flex items-center justify-center p-3 sm:p-4 md:p-6">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-100 p-6 sm:p-8">
        <div className="text-center mb-8">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-50 to-indigo-50 mx-auto mb-4">
            <svg className="h-8 w-8 text-purple-600" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">AutoFood</h1>
          <p className="text-sm text-gray-500">Gestão moderna para restaurantes</p>
        </div>
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
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Senha</label>
            <input
              type="password"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
              placeholder="••••••••"
              {...register('password')}
            />
            {errors.password && <p className="mt-2 text-sm text-red-600">{errors.password.message}</p>}
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-medium py-3 px-4 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
        <div className="mt-6 text-center">
          <Link to="/forgot-password" className="text-sm text-purple-600 hover:text-purple-700 font-medium">
            Esqueceu a senha?
          </Link>
        </div>
        <div className="mt-6 pt-6 border-t border-gray-100 text-center">
          <p className="text-sm text-gray-600">
            Precisa de uma conta?{' '}
            <a href="https://wa.me/5511999999999?text=Olá,%20gostaria%20de%20saber%20mais%20sobre%20o%20AutoFood" target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:text-purple-700 font-medium">
              Fale com um vendedor
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
