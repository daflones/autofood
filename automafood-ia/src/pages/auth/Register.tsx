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
    <div className="min-h-screen bg-[#F8F9FE] flex items-center justify-center p-3 sm:p-4 md:p-6">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-100 p-6 sm:p-8">
        <div className="text-center mb-8">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-50 to-indigo-50 mx-auto mb-4">
            <svg className="h-8 w-8 text-purple-600" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Fale com um vendedor</h1>
          <p className="text-sm text-gray-500">Entre em contato para conhecer o AutoFood</p>
        </div>
        <div className="space-y-6">
          <div className="text-center p-6 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Quer conhecer o AutoFood?</h3>
            <p className="text-sm text-gray-600 mb-4">Fale com nossa equipe de vendas e descubra como podemos ajudar seu restaurante a crescer.</p>
            <a
              href="https://wa.me/5511999999999?text=Olá,%20gostaria%20de%20conhecer%20o%20AutoFood%20para%20meu%20restaurante"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-medium py-3 px-4 rounded-xl transition-all"
            >
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/>
              </svg>
              Falar no WhatsApp
            </a>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-xl">
            <h4 className="font-medium text-gray-900 mb-2">Por que escolher o AutoFood?</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Gestão completa de reservas e clientes</li>
              <li>• Sistema de brindes e fidelização</li>
              <li>• Dashboard com métricas em tempo real</li>
              <li>• Suporte técnico especializado</li>
            </ul>
          </div>
        </div>
        <div className="mt-6 pt-6 border-t border-gray-100 text-center">
          <p className="text-sm text-gray-600">
            Já é cliente?{' '}
            <Link to="/login" className="text-purple-600 hover:text-purple-700 font-medium">
              Fazer login
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
