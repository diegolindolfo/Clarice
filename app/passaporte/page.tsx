'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export default function PassaporteLandingPage() {
  const router = useRouter()
  const [matricula, setMatricula] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')

  async function acessar(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    const limpa = matricula.replace(/\D+/g, '')
    if (!limpa) {
      setErro('Digite sua matrícula.')
      return
    }

    setCarregando(true)
    try {
      const supabase = createClient()
      const { data } = await supabase
        .from('alunos')
        .select('matricula, ativo')
        .eq('matricula', Number(limpa))
        .maybeSingle()

      if (!data) {
        setErro('Matrícula não encontrada.')
        setCarregando(false)
        return
      }
      if (data.ativo === false) {
        setErro('Matrícula inativa. Procure a biblioteca.')
        setCarregando(false)
        return
      }
      router.push(`/passaporte/${limpa}`)
    } catch {
      setErro('Erro ao acessar. Tente novamente.')
      setCarregando(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6" style={{ backgroundColor: 'var(--bg-page)' }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <p className="text-[11px] uppercase tracking-[0.3em] mb-3" style={{ color: 'var(--text-muted)' }}>
            Biblioteca Clarice Lispector
          </p>
          <h1
            className="text-4xl mb-2"
            style={{ fontFamily: "var(--font-dm-serif, 'DM Serif Display'), serif", color: 'var(--text-primary)' }}
          >
            Passaporte de Leitura
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Acompanhe sua jornada como leitor e conquiste selos.
          </p>
        </div>

        <form
          onSubmit={acessar}
          className="rounded-2xl border p-6 shadow-sm"
          style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}
        >
          <label
            htmlFor="matricula"
            className="block text-[11px] font-semibold uppercase tracking-[0.08em] mb-2"
            style={{ color: 'var(--text-muted)' }}
          >
            Matrícula do aluno
          </label>
          <input
            id="matricula"
            type="text"
            inputMode="numeric"
            pattern="\d*"
            autoFocus
            autoComplete="off"
            value={matricula}
            onChange={e => setMatricula(e.target.value)}
            placeholder="Ex.: 123456"
            className="text-base font-mono"
          />
          {erro && (
            <p className="text-xs text-red-600 mt-3">{erro}</p>
          )}
          <button
            type="submit"
            disabled={carregando}
            className="nav-btn-primary w-full mt-5 py-2.5 rounded-lg text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {carregando ? 'Abrindo...' : 'Abrir passaporte'}
          </button>
        </form>

        <p className="text-center text-[11px] mt-6" style={{ color: 'var(--text-muted)' }}>
          EEEP Professor José Augusto Torres
        </p>
      </div>
    </div>
  )
}
