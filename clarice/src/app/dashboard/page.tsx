'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type ResumoStatus = {
  emprestados: number
  renovados: number
  atrasados: number
  devolvidos_mes: number
  total_mes: number
  alunos_ativos: number
}

type PorTurma = { turma: string; total: number }
type LivroTop = { titulo: string; autor: string; total: number }
type AtrasadoPorTurma = { turma: string; total: number }

export default function DashboardPage() {
  const [resumo, setResumo] = useState<ResumoStatus | null>(null)
  const [porTurma, setPorTurma] = useState<PorTurma[]>([])
  const [livrosTop, setLivrosTop] = useState<LivroTop[]>([])
  const [atrasados, setAtrasados] = useState<AtrasadoPorTurma[]>([])
  const [periodo, setPeriodo] = useState<'mes' | 'mes_passado' | 'ano'>('mes')
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    carregar()
  }, [periodo])

  async function carregar() {
    setCarregando(true)

    const agora = new Date()
    const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1).toISOString().split('T')[0]
    const inicioMesPassado = new Date(agora.getFullYear(), agora.getMonth() - 1, 1)
      .toISOString()
      .split('T')[0]
    const fimMesPassado = new Date(agora.getFullYear(), agora.getMonth(), 0).toISOString().split('T')[0]
    const inicioAno = `${agora.getFullYear()}-01-01`

    const dataInicio =
      periodo === 'mes' ? inicioMes : periodo === 'mes_passado' ? inicioMesPassado : inicioAno

    const dataFim = periodo === 'mes_passado' ? fimMesPassado : undefined

    const [
      { count: emprestadosCount },
      { count: renovadosCount },
      { count: atrasadosCount },
      { count: devolvidosMesCount },
      { count: totalMesCount },
      { count: alunosAtivosCount },
    ] = await Promise.all([
      supabase.from('emprestimos').select('*', { count: 'exact', head: true }).eq('status', 'EMPRESTADO'),
      supabase.from('emprestimos').select('*', { count: 'exact', head: true }).eq('status', 'RENOVADO'),
      supabase.from('vw_emprestimos_atrasados').select('*', { count: 'exact', head: true }),
      supabase
        .from('emprestimos')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'DEVOLVIDO')
        .gte('data_saida', dataInicio),
      supabase
        .from('emprestimos')
        .select('*', { count: 'exact', head: true })
        .gte('data_saida', dataInicio)
        .lte('data_saida', dataFim ?? new Date().toISOString().split('T')[0]),
      supabase.from('alunos').select('*', { count: 'exact', head: true }).eq('ativo', true),
    ])

    setResumo({
      emprestados: emprestadosCount ?? 0,
      renovados: renovadosCount ?? 0,
      atrasados: atrasadosCount ?? 0,
      devolvidos_mes: devolvidosMesCount ?? 0,
      total_mes: totalMesCount ?? 0,
      alunos_ativos: alunosAtivosCount ?? 0,
    })

    const { data: empTurma } = await supabase
      .from('vw_painel_aluno')
      .select('turma')
      .gte('data_saida', dataInicio)

    if (empTurma) {
      const contagem: Record<string, number> = {}
      empTurma.forEach(({ turma }) => {
        contagem[turma] = (contagem[turma] ?? 0) + 1
      })
      const ordenado = Object.entries(contagem)
        .map(([turma, total]) => ({ turma, total }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 8)
      setPorTurma(ordenado)
    }

    const { data: empLivros } = await supabase
      .from('vw_painel_aluno')
      .select('titulo, autor')
      .gte('data_saida', dataInicio)

    if (empLivros) {
      const contagem: Record<string, { autor: string; total: number }> = {}
      empLivros.forEach(({ titulo, autor }) => {
        if (!contagem[titulo]) contagem[titulo] = { autor, total: 0 }
        contagem[titulo].total += 1
      })
      const top = Object.entries(contagem)
        .map(([titulo, v]) => ({ titulo, autor: v.autor, total: v.total }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 5)
      setLivrosTop(top)
    }

    const { data: atrasTurma } = await supabase.from('vw_emprestimos_atrasados').select('turma')

    if (atrasTurma) {
      const contagem: Record<string, number> = {}
      atrasTurma.forEach(({ turma }) => {
        contagem[turma] = (contagem[turma] ?? 0) + 1
      })
      const ordenado = Object.entries(contagem)
        .map(([turma, total]) => ({ turma, total }))
        .sort((a, b) => b.total - a.total)
      setAtrasados(ordenado)
    }

    setCarregando(false)
  }

  const maxTurma = Math.max(...porTurma.map((t) => t.total), 1)

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-medium">Dashboard</h1>
          <p className="text-xs text-gray-500 mt-1">
            {periodo === 'mes' ? 'Este mês' : periodo === 'mes_passado' ? 'Mês passado' : 'Este ano'}
          </p>
        </div>
        <select
          className="border rounded-lg px-3 py-2 text-sm"
          value={periodo}
          onChange={(e) => setPeriodo(e.target.value as typeof periodo)}
        >
          <option value="mes">Este mês</option>
          <option value="mes_passado">Mês passado</option>
          <option value="ano">Este ano</option>
        </select>
      </div>

      {carregando ? (
        <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
          Carregando dados...
        </div>
      ) : (
        resumo && (
          <>
            <div className="grid grid-cols-4 gap-3 mb-5">
              <MetricCard valor={resumo.total_mes} label="Empréstimos no período" cor="" />
              <MetricCard
                valor={resumo.emprestados + resumo.renovados}
                label="Pendentes de devolução"
                cor=""
              />
              <MetricCard valor={resumo.atrasados} label="Atrasados agora" cor="vermelho" />
              <MetricCard valor={resumo.alunos_ativos} label="Alunos ativos" cor="" />
            </div>

            <div className="grid grid-cols-5 gap-4 mb-4">
              <div className="col-span-3 border rounded-xl p-4">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-4">
                  Empréstimos por turma
                </p>
                {porTurma.length === 0 ? (
                  <p className="text-sm text-gray-400">Sem dados no período</p>
                ) : (
                  porTurma.map(({ turma, total }) => (
                    <div key={turma} className="flex items-center gap-3 mb-2.5">
                      <span className="text-xs text-gray-500 w-8">{turma}</span>
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-purple-600 rounded-full transition-all duration-700"
                          style={{ width: `${(total / maxTurma) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs font-mono text-gray-600 w-6 text-right">{total}</span>
                    </div>
                  ))
                )}
              </div>

              <div className="col-span-2 border rounded-xl p-4">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-4">
                  Status atual
                </p>
                <div className="flex flex-col gap-2">
                  {[
                    {
                      label: 'Emprestados',
                      valor: resumo.emprestados,
                      bg: 'bg-blue-50',
                      txt: 'text-blue-800',
                    },
                    {
                      label: 'Renovados',
                      valor: resumo.renovados,
                      bg: 'bg-purple-50',
                      txt: 'text-purple-800',
                    },
                    {
                      label: 'Atrasados',
                      valor: resumo.atrasados,
                      bg: 'bg-red-50',
                      txt: 'text-red-800',
                    },
                    {
                      label: 'Devolvidos',
                      valor: resumo.devolvidos_mes,
                      bg: 'bg-green-50',
                      txt: 'text-green-800',
                    },
                  ].map(({ label, valor, bg, txt }) => (
                    <div
                      key={label}
                      className={`flex items-center justify-between px-3 py-2 rounded-lg ${bg}`}
                    >
                      <span className={`text-xs font-medium ${txt}`}>{label}</span>
                      <span className={`font-mono text-sm font-medium ${txt}`}>{valor}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="border rounded-xl p-4">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">
                  Livros mais emprestados
                </p>
                {livrosTop.map(({ titulo, autor, total }, i) => (
                  <div
                    key={titulo}
                    className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-none"
                  >
                    <span className="text-xs text-gray-400 font-mono w-4">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{titulo}</p>
                      <p className="text-xs text-gray-400 truncate">{autor}</p>
                    </div>
                    <span className="text-xs font-medium bg-purple-50 text-purple-800 px-2 py-0.5 rounded-full">
                      {total}x
                    </span>
                  </div>
                ))}
              </div>

              <div className="border rounded-xl p-4">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">
                  Atrasados por turma
                </p>
                {atrasados.length === 0 ? (
                  <div className="flex items-center gap-2 py-4">
                    <span className="text-green-600 text-sm">✓</span>
                    <p className="text-sm text-gray-500">Nenhum atrasado!</p>
                  </div>
                ) : (
                  atrasados.map(({ turma, total }) => (
                    <div
                      key={turma}
                      className="flex items-center justify-between py-2 border-b border-gray-100 last:border-none"
                    >
                      <span className="text-sm font-medium">{turma}</span>
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full
                    ${total >= 3 ? 'bg-red-50 text-red-800' : 'bg-amber-50 text-amber-800'}`}
                      >
                        {total} {total === 1 ? 'aluno' : 'alunos'}
                      </span>
                    </div>
                  ))
                )}
                <button
                  onClick={() => (window.location.href = '/emprestimos?status=ATRASADO')}
                  className="mt-3 text-xs text-gray-400 hover:text-gray-600"
                >
                  Ver lista completa →
                </button>
              </div>
            </div>
          </>
        )
      )}
    </div>
  )
}

function MetricCard({ valor, label, cor }: { valor: number; label: string; cor: string }) {
  const isVermelho = cor === 'vermelho'
  return (
    <div className={`rounded-xl p-4 ${isVermelho ? 'bg-red-50' : 'bg-gray-50'}`}>
      <p className={`text-2xl font-mono font-medium ${isVermelho ? 'text-red-700' : ''}`}>{valor}</p>
      <p className={`text-xs mt-1 ${isVermelho ? 'text-red-600' : 'text-gray-500'}`}>{label}</p>
    </div>
  )
}
