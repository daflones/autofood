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
    const redirectTo = `${window.location.origin}/reset-password`
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
    if (error) {
      alert(error.message)
      return
    }
    setSent(true)
  }

  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden p-4 text-white">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#0b1220] via-[#0b1220] to-black" />
      <div className="pointer-events-none absolute -top-32 -left-32 h-80 w-80 rounded-full bg-[#1f2a40]/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-20 h-80 w-80 rounded-full bg-[#0f1621]/40 blur-3xl" />
      <div className="relative w-full max-w-sm af-card-elev p-6 af-shadow-soft af-glow overflow-hidden min-w-0">
        <h1 className="mb-2 text-center text-2xl font-extrabold tracking-tight bg-clip-text text-transparent af-grad">Recuperar senha</h1>
        <p className="mb-6 text-center text-sm af-text-dim">Enviaremos um link para redefinir sua senha.</p>
        {sent ? (
          <div className="rounded-md af-card p-3 text-sm text-white">
            Se o email existir, o link de recuperação foi enviado. Verifique sua caixa de entrada.
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="mb-1 block af-label">Email</label>
              <input
                type="email"
                className="af-field placeholder:text-white/40"
                {...register('email')}
              />
              {errors.email && <p className="mt-1 af-help">{errors.email.message}</p>}
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="af-btn-primary"
            >
              {isSubmitting ? 'Enviando...' : 'Enviar link'}
            </button>
            <Link to="/login" className="block w-full af-btn text-center text-sm">
              Voltar para login
            </Link>
          </form>
        )}
      </div>
    </div>
  )
}
