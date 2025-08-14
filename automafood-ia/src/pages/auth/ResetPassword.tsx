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
    <div className="relative grid min-h-screen place-items-center overflow-hidden p-4 text-white">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#0b1220] via-[#0b1220] to-black" />
      <div className="pointer-events-none absolute -top-32 -left-32 h-80 w-80 rounded-full bg-[#1f2a40]/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-20 h-80 w-80 rounded-full bg-[#0f1621]/40 blur-3xl" />
      <div className="relative w-full max-w-sm af-card-elev p-6 af-shadow-soft af-glow overflow-hidden min-w-0">
        <h1 className="mb-2 text-center text-2xl font-extrabold tracking-tight bg-clip-text text-transparent af-grad">Redefinir senha</h1>
        <p className="mb-6 text-center text-sm af-text-dim">Escolha uma nova senha para sua conta.</p>
        {!ready ? (
          <div className="rounded-md af-card p-3 text-sm text-white">
            Validando sessão de recuperação...
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="mb-1 block af-label">Nova senha</label>
              <input
                type="password"
                className="af-field placeholder:text-white/40"
                {...register('password')}
              />
              {errors.password && <p className="mt-1 af-help">{errors.password.message}</p>}
            </div>
            <div>
              <label className="mb-1 block af-label">Confirmar senha</label>
              <input
                type="password"
                className="af-field placeholder:text-white/40"
                {...register('confirm')}
              />
              {errors.confirm && <p className="mt-1 af-help">{errors.confirm.message}</p>}
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="af-btn-primary"
            >
              {isSubmitting ? 'Salvando...' : 'Salvar nova senha'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
