'use client'
import { useState, useRef, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { corAvatar, iniciais, partesDataLocal } from '@/lib/utils'
import {
  carregarDadosDashboard,
  type DadosDashboard,
  type Periodo,
} from '@/lib/dashboard'

function periodoLabel(p: Periodo) {
  const { ano, mes } = partesDataLocal()
  if (p === 'mes') {
    const label = new Date(Date.UTC(ano, mes, 15)).toLocaleDateString('pt-BR', {
      month: 'long',
      year: 'numeric',
      timeZone: 'America/Fortaleza',
    })
    return label.charAt(0).toUpperCase() + label.slice(1)
  }
  if (p === 'mes_passado') {
    const anoAnt = mes === 0 ? ano - 1 : ano
    const mesAnt = mes === 0 ? 11 : mes - 1
    const label = new Date(Date.UTC(anoAnt, mesAnt, 15)).toLocaleDateString('pt-BR', {
      month: 'long',
      year: 'numeric',
      timeZone: 'America/Fortaleza',
    })
    return label.charAt(0).toUpperCase() + label.slice(1)
  }
  return `Ano ${ano}`
}

// Rótulo de seção — padrão visual consistente
function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-[0.08em] mb-4">
      {children}
    </p>
  )
}

type Props = {
  dadosIniciais: DadosDashboard | null
  periodoInicial?: Periodo
  erroInicial?: string
}

export default function DashboardClient({
  dadosIniciais,
  periodoInicial = 'mes',
  erroInicial = '',
}: Props) {
  const [periodo, setPeriodo] = useState<Periodo>(periodoInicial)
  const [dados, setDados] = useState<DadosDashboard | null>(dadosIniciais)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState(erroInicial)
  const cacheRef = useRef<Partial<Record<Periodo, DadosDashboard>>>(
    dadosIniciais ? { [periodoInicial]: dadosIniciais } : {},
  )

  const carregar = useCallback(async (alvo: Periodo, forcar = false) => {
    if (!forcar && cacheRef.current[alvo]) {
      setDados(cacheRef.current[alvo]!)
      setErro('')
      setCarregando(false)
      return
    }

    setCarregando(true)
    setErro('')
    try {
      const supabase = createClient()
      const res = await carregarDadosDashboard(supabase, alvo)
      cacheRef.current[alvo] = res
      setDados(res)
    } catch (err) {
      console.error('Erro ao carregar dashboard:', err)
      setErro('Erro ao carregar dados. Tente novamente.')
    } finally {
      setCarregando(false)
    }
  }, [])

  function trocarPeriodo(novo: Periodo) {
    setPeriodo(novo)
    carregar(novo, false)
  }

  const resumo = dados?.resumo ?? null
  const porTurma = dados?.porTurma ?? []
  const livrosTop = dados?.livrosTop ?? []
  const atrasados = dados?.atrasados ?? []
  const leitores = dados?.leitores ?? []
  const maxTurma = Math.max(...porTurma.map(t => t.total), 1)

  return (
    <div className="max-w-5xl mx-auto p-6 animate-fade-up">

      {/* Cabeçalho */}
      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="text-[17px] font-semibold tracking-tight text-gray-900">Dashboard</h1>
          <p className="text-[12px] text-gray-400 mt-0.5">{periodoLabel(periodo)}</p>
        </div>
        <div className="flex gap-2 items-center">
          {!carregando && (
            <button
              onClick={() => carregar(periodo, true)}
              aria-label="Recarregar dados"
              className="text-[12px] text-gray-300 hover:text-gray-500 px-2 py-1 rounded transition-colors"
            >
              ↻
            </button>
          )}
          <select
            className="border rounded-lg px-3 py-1.5 text-[13px]"
            value={periodo}
            onChange={e => trocarPeriodo(e.target.value as Periodo)}
          >
            <option value="mes">Este mês</option>
            <option value="mes_passado">Mês passado</option>
            <option value="ano">Este ano</option>
          </select>
        </div>
      </div>

      {erro && (
        <div className="bg-red-50 text-red-700 text-sm rounded-xl px-4 py-3 mb-5 flex items-center justify-between">
          <span>{erro}</span>
          <button onClick={() => carregar(periodo, true)} className="text-xs underline ml-4">Tentar novamente</button>
        </div>
      )}

      {carregando ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-gray-100 rounded-xl p-4 h-20 animate-pulse" />
          ))}
        </div>
      ) : resumo && (
        <>
          {/* ── Cards de métricas ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
            {[
              { label: 'Empréstimos no período', valor: resumo.total_mes,                     cor: '' },
              { label: 'Pendentes de devolução', valor: resumo.emprestados + resumo.renovados, cor: '' },
              { label: 'Atrasados agora',         valor: resumo.atrasados,                    cor: resumo.atrasados > 0 ? 'r' : '' },
              { label: 'Alunos ativos',           valor: resumo.alunos_ativos,                cor: '' },
            ].map(({ label, valor, cor }) => (
              <div key={label} className={`rounded-2xl p-4 border ${cor === 'r' ? 'bg-red-50 border-red-100' : 'bg-white border-[#e8e5e0]'}`}>
                <p className={`text-[26px] font-mono font-medium leading-none ${cor === 'r' ? 'text-red-700' : 'text-gray-900'}`}>{valor}</p>
                <p className={`text-[11px] mt-2 leading-snug ${cor === 'r' ? 'text-red-500' : 'text-gray-400'}`}>{label}</p>
              </div>
            ))}
          </div>

          {/* ── Linha 2: Por turma + Status ── */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-4">
            <div className="lg:col-span-3 border border-[#e8e5e0] rounded-2xl p-5 bg-white">
              <Label>Empréstimos por turma</Label>
              {porTurma.length === 0 ? (
                <p className="text-sm text-gray-300 py-4 text-center">Sem dados no período</p>
              ) : porTurma.map(({ turma, total }) => (
                <div key={turma} className="flex items-center gap-3 mb-2.5">
                  <span className="text-[11px] text-gray-400 w-8 flex-shrink-0 font-mono">{turma}</span>
                  <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gray-900 rounded-full transition-all duration-700"
                      style={{ width: `${Math.round((total / maxTurma) * 100)}%` }}
                    />
                  </div>
                  <span className="text-[11px] font-mono text-gray-500 w-5 text-right flex-shrink-0">{total}</span>
                </div>
              ))}
            </div>

            <div className="lg:col-span-2 border border-[#e8e5e0] rounded-2xl p-5 bg-white">
              <Label>Status atual</Label>
              <div className="flex flex-col gap-2">
                {[
                  { label: 'Emprestados', valor: resumo.emprestados,    bg: 'bg-blue-50',   txt: 'text-blue-800' },
                  { label: 'Renovados',   valor: resumo.renovados,      bg: 'bg-purple-50', txt: 'text-purple-800' },
                  { label: 'Atrasados',   valor: resumo.atrasados,      bg: 'bg-red-50',    txt: 'text-red-800' },
                  { label: 'Devolvidos',  valor: resumo.devolvidos_mes, bg: 'bg-green-50',  txt: 'text-green-800' },
                ].map(({ label, valor, bg, txt }) => (
                  <div key={label} className={`flex items-center justify-between px-3 py-2 rounded-xl ${bg}`}>
                    <span className={`text-[12px] font-medium ${txt}`}>{label}</span>
                    <span className={`font-mono text-sm font-medium ${txt}`}>{valor}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Linha 3: Livros top + Atrasados + Alunos leitores ── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

            {/* Livros mais emprestados */}
            <div className="border border-[#e8e5e0] rounded-2xl p-5 bg-white">
              <Label>Livros mais emprestados</Label>
              {livrosTop.length === 0 ? (
                <p className="text-sm text-gray-300 py-4 text-center">Sem dados no período</p>
              ) : livrosTop.map(({ titulo, autor, total }, i) => (
                <div key={titulo} className="flex items-center gap-3 py-2 border-b border-[#f0ede8] last:border-none">
                  <span className="text-[11px] text-gray-300 font-mono w-4 flex-shrink-0">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-medium truncate text-gray-800">{titulo}</p>
                    <p className="text-[11px] text-gray-400 truncate">{autor}</p>
                  </div>
                  <span className="text-[11px] font-medium bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full flex-shrink-0 font-mono">{total}×</span>
                </div>
              ))}
            </div>

            {/* Atrasados por turma */}
            <div className="border border-[#e8e5e0] rounded-2xl p-5 bg-white">
              <Label>Atrasados por turma</Label>
              {atrasados.length === 0 ? (
                <div className="flex items-center gap-2 py-4">
                  <span className="text-green-500 text-sm">✓</span>
                  <p className="text-[12px] text-gray-500">Nenhum empréstimo em atraso</p>
                </div>
              ) : atrasados.map(({ turma, total }) => (
                <div key={turma} className="flex items-center justify-between py-2 border-b border-[#f0ede8] last:border-none">
                  <span className="text-[13px] font-medium text-gray-700">{turma}</span>
                  <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${total >= 3 ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}>
                    {total} {total === 1 ? 'aluno' : 'alunos'}
                  </span>
                </div>
              ))}
              {atrasados.length > 0 && (
                <Link href="/emprestimos?status=ATRASADO" className="mt-3 block text-[11px] text-gray-300 hover:text-gray-500 transition-colors">
                  Ver lista completa →
                </Link>
              )}
            </div>

            {/* Alunos leitores */}
            <div className="border border-[#e8e5e0] rounded-2xl p-5 bg-white">
              <Label>Alunos leitores</Label>
              {leitores.length === 0 ? (
                <p className="text-sm text-gray-300 py-4 text-center">Sem dados no período</p>
              ) : leitores.map(({ matricula, nome, turma, total }, i) => {
                const { bg, tc } = corAvatar(matricula)
                return (
                  <div key={matricula} className="flex items-center gap-2.5 py-2 border-b border-[#f0ede8] last:border-none">
                    <span className="text-[11px] text-gray-300 font-mono w-4 flex-shrink-0">{i + 1}</span>
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-semibold flex-shrink-0"
                      style={{ background: bg, color: tc }}
                    >
                      {iniciais(nome)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-medium truncate text-gray-800">{nome}</p>
                      <p className="text-[11px] text-gray-400">{turma}</p>
                    </div>
                    <span className="text-[11px] font-medium bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full flex-shrink-0 font-mono">{total}×</span>
                  </div>
                )
              })}
            </div>

          </div>
        </>
      )}
    </div>
  )
}
