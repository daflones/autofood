import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { supabase } from '../../lib/supabaseClient'
import { Link, useNavigate } from 'react-router-dom'

const schema = z.object({
  nome: z.string().min(2, 'Informe o nome do restaurante'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Mínimo de 6 caracteres'),
  telefone: z.string().optional(),
  endereco: z.string().optional(),
})

type FormData = z.infer<typeof schema>

export default function Register() {
  const navigate = useNavigate()
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  const onSubmit = async (values: FormData) => {
    // 1) Create auth user
    const { error: signUpError } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
    })
    if (signUpError) {
      alert(signUpError.message)
      return
    }

    // 2) Insert restaurant (requires RLS policy to allow authenticated insert)
    const { data: rest, error: restErr } = await supabase
      .from('restaurantes')
      .insert({
        nome: values.nome,
        email: values.email,
        telefone: values.telefone,
        endereco: values.endereco,
      })
      .select('id')
      .single()

    if (restErr) {
      alert(restErr.message)
      return
    }

    // 3) Attach restaurante_id to user metadata
    const restauranteId = rest.id as string
    const { error: metaErr } = await supabase.auth.updateUser({
      data: { restaurante_id: restauranteId },
    })
    if (metaErr) {
      alert(metaErr.message)
      return
    }

    alert('Cadastro realizado com sucesso!')
    navigate('/', { replace: true })
  }

  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden p-4">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white via-gray-50 to-gray-100" />
      <div className="pointer-events-none absolute -top-32 -left-32 h-80 w-80 rounded-full bg-sky-100/60 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-20 h-80 w-80 rounded-full bg-indigo-100/60 blur-3xl" />
      <div className="relative w-full max-w-sm af-card-elev p-6 af-shadow-soft af-glow overflow-hidden min-w-0">
        <h1 className="mb-2 text-center text-3xl font-extrabold tracking-tight bg-clip-text text-transparent af-grad">Criar conta</h1>
        <p className="mb-6 text-center text-sm af-text-dim">Comece a usar o AutoFood</p>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="mb-1 block af-label">Nome do restaurante</label>
            <input
              className="af-field"
              {...register('nome')}
            />
            {errors.nome && <p className="mt-1 af-help">{errors.nome.message}</p>}
          </div>
          <div>
            <label className="mb-1 block af-label">Email</label>
            <input
              type="email"
              className="af-field placeholder:text-slate-400"
              {...register('email')}
            />
            {errors.email && <p className="mt-1 af-help">{errors.email.message}</p>}
          </div>
          <div>
            <label className="mb-1 block af-label">Senha</label>
            <input
              type="password"
              className="af-field placeholder:text-slate-400"
              {...register('password')}
            />
            {errors.password && <p className="mt-1 af-help">{errors.password.message}</p>}
          </div>
          <div>
            <label className="mb-1 block af-label">Telefone</label>
            <input
              className="af-field placeholder:text-slate-400"
              {...register('telefone')}
            />
          </div>
          <div>
            <label className="mb-1 block af-label">Endereço</label>
            <input
              className="af-field placeholder:text-slate-400"
              {...register('endereco')}
            />
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="af-btn-primary w-full"
          >
            {isSubmitting ? 'Cadastrando...' : 'Cadastrar'}
          </button>
        </form>
        <p className="mt-4 text-center text-sm af-text-dim">
          Já tem conta?{' '}
          <Link to="/login" className="hover:underline">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  )
}
