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
    <div className="relative grid min-h-screen place-items-center overflow-hidden p-4 text-[var(--af-text-primary)] bg-white">
      <div className="relative w-full max-w-sm af-card-elev p-6 af-shadow-soft overflow-hidden min-w-0">
        <h1 className="mb-2 text-center text-3xl font-extrabold tracking-tight bg-clip-text text-transparent af-grad">AutoFood</h1>
        <p className="mb-6 text-center text-sm af-text-dim">Gestão moderna para restaurantes</p>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="mb-1 block af-label">Email</label>
            <input
              type="email"
              className="af-field placeholder:text-[var(--af-text-muted)]"
              {...register('email')}
            />
            {errors.email && <p className="mt-1 af-help">{errors.email.message}</p>}
          </div>
          <div>
            <label className="mb-1 block af-label">Senha</label>
            <input
              type="password"
              className="af-field placeholder:text-[var(--af-text-muted)]"
              {...register('password')}
            />
            {errors.password && <p className="mt-1 af-help">{errors.password.message}</p>}
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="af-btn-primary"
          >
            {isSubmitting ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
        <div className="mt-3 text-right text-sm">
          <Link to="/forgot-password" className="text-[var(--af-primary)] hover:underline">
            Esqueceu a senha?
          </Link>
        </div>
        <p className="mt-2 text-center text-sm af-text-dim">
          Não tem conta?{' '}
          <Link to="/register" className="text-[var(--af-primary)] hover:underline">
            Cadastre-se
          </Link>
        </p>
      </div>
    </div>
  )
}
