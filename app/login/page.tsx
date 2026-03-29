'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)

  async function entrar(e: React.FormEvent) {
    e.preventDefault()
    setCarregando(true)
    setErro('')

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: senha,
    })

    setCarregando(false)

    if (error) {
      setErro('E-mail ou senha incorretos.')
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <p className="text-2xl font-medium text-gray-900">Clarice</p>
          <p className="text-sm text-gray-500 mt-1">Biblioteca Escolar</p>
        </div>

        <div className="bg-white border rounded-2xl p-6 shadow-sm">
          <h1 className="text-base font-medium mb-5">Entrar no sistema</h1>

          <form onSubmit={entrar} className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">E-mail</label>
              <input
                type="email"
                autoComplete="email"
                autoFocus
                required
                placeholder="seu@email.com"
                className="w-full"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Senha</label>
              <input
                type="password"
                autoComplete="current-password"
                required
                placeholder="••••••••"
                className="w-full"
                value={senha}
                onChange={e => setSenha(e.target.value)}
              />
            </div>

            {erro && (
              <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{erro}</p>
            )}

            <button
              type="submit"
              disabled={carregando}
              className="w-full bg-blue-800 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-blue-900 disabled:opacity-50 transition-colors mt-1"
            >
              {carregando ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          Acesso restrito à equipe da biblioteca
        </p>
      </div>
    </div>
  )
}
