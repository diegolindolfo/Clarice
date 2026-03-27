'use client'
import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/utils/supabase/client'



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

function SkeletonCard() {
  return <div className="skeleton h-24 rounded-2xl" />
}

function SkeletonBar() {
  return (
    <div className="flex items-center gap-3 mb-3">
      <div className="skeleton w-10 h-4" />
      <div className="skeleton flex-1 h-3 rounded-full" />
      <div className="skeleton w-6 h-4" />
    </div>
  )
}

function SkeletonRow() {
  return (
    <div className="flex items-center justify-between py-3">
      <div className="skeleton w-24 h-4" />
      <div className="skeleton w-12 h-4" />
    </div>
  )
}

export default function DashboardPage() {
  const supabase = createClient()
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

  const maxTurma = useMemo(() => Math.max(...porTurma.map((t) => t.total), 1), [porTurma])

  const periodoLabel = periodo === 'mes' ? 'Este mês' : periodo === 'mes_passado' ? 'Mês passado' : 'Este ano'

  return (
    <div className="max-w-5xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 animate-fade-in">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>
            Dashboard
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            {periodoLabel} · Biblioteca Escolar Clarice
          </p>
        </div>
        <select
          className="dark-select"
          value={periodo}
          onChange={(e) => setPeriodo(e.target.value as typeof periodo)}
        >
          <option value="mes">Este mês</option>
          <option value="mes_passado">Mês passado</option>
          <option value="ano">Este ano</option>
        </select>
      </div>

      {carregando ? (
        /* Skeleton loading state */
        <div>
          <div className="grid grid-cols-4 gap-4 mb-6">
            {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
          </div>
          <div className="grid grid-cols-5 gap-4 mb-6">
            <div className="col-span-3 glass-card p-5">
              {[...Array(5)].map((_, i) => <SkeletonBar key={i} />)}
            </div>
            <div className="col-span-2 glass-card p-5">
              {[...Array(4)].map((_, i) => <SkeletonRow key={i} />)}
            </div>
          </div>
        </div>
      ) : (
        resumo && (
          <>
            {/* Metric Cards */}
            <div className="grid grid-cols-4 gap-4 mb-6">
              {[
                { valor: resumo.total_mes, label: 'Empréstimos no período', gradient: 'var(--gradient-blue)', glow: 'var(--shadow-glow-indigo)' },
                { valor: resumo.emprestados + resumo.renovados, label: 'Pendentes de devolução', gradient: 'var(--gradient-amber)', glow: '' },
                { valor: resumo.atrasados, label: 'Atrasados agora', gradient: 'var(--gradient-rose)', glow: 'var(--shadow-glow-rose)' },
                { valor: resumo.alunos_ativos, label: 'Alunos ativos', gradient: 'var(--gradient-emerald)', glow: 'var(--shadow-glow-emerald)' },
              ].map(({ valor, label, gradient, glow }, i) => (
                <div
                  key={label}
                  className={`metric-card animate-slide-up delay-${i + 1}`}
                  style={{ background: gradient, boxShadow: glow || undefined }}
                >
                  <p className="text-3xl font-bold text-white font-mono">{valor}</p>
                  <p className="text-xs mt-2 text-white/70">{label}</p>
                </div>
              ))}
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-5 gap-4 mb-6 animate-slide-up delay-3">
              {/* Bar Chart: Emprestimos por Turma */}
              <div className="col-span-3 glass-card p-5">
                <p className="text-xs font-medium uppercase tracking-wider mb-5" style={{ color: 'var(--text-muted)' }}>
                  Empréstimos por turma
                </p>
                {porTurma.length === 0 ? (
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Sem dados no período</p>
                ) : (
                  porTurma.map(({ turma, total }, i) => (
                    <div key={turma} className="flex items-center gap-3 mb-3">
                      <span className="text-xs w-10 text-right font-mono" style={{ color: 'var(--text-muted)' }}>
                        {turma}
                      </span>
                      <div className="flex-1 h-3 rounded-full overflow-hidden" style={{ background: 'var(--bg-elevated)' }}>
                        <div
                          className="h-full rounded-full animate-bar-grow"
                          style={{
                            width: `${(total / maxTurma) * 100}%`,
                            background: 'var(--gradient-indigo)',
                            animationDelay: `${i * 0.1}s`,
                          }}
                        />
                      </div>
                      <span className="text-xs font-mono w-8 text-right" style={{ color: 'var(--text-secondary)' }}>
                        {total}
                      </span>
                    </div>
                  ))
                )}
              </div>

              {/* Status Panel */}
              <div className="col-span-2 glass-card p-5">
                <p className="text-xs font-medium uppercase tracking-wider mb-5" style={{ color: 'var(--text-muted)' }}>
                  Status atual
                </p>
                <div className="flex flex-col gap-2.5">
                  {[
                    { label: 'Emprestados', valor: resumo.emprestados, badgeClass: 'badge-blue' },
                    { label: 'Renovados', valor: resumo.renovados, badgeClass: 'badge-purple' },
                    { label: 'Atrasados', valor: resumo.atrasados, badgeClass: 'badge-red' },
                    { label: 'Devolvidos', valor: resumo.devolvidos_mes, badgeClass: 'badge-green' },
                  ].map(({ label, valor, badgeClass }) => (
                    <div
                      key={label}
                      className="flex items-center justify-between px-4 py-3 rounded-xl"
                      style={{ background: 'var(--bg-elevated)' }}
                    >
                      <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{label}</span>
                      <span className={`badge ${badgeClass}`}>{valor}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom Grid */}
            <div className="grid grid-cols-2 gap-4 animate-slide-up delay-5">
              {/* Top Books */}
              <div className="glass-card p-5">
                <p className="text-xs font-medium uppercase tracking-wider mb-4" style={{ color: 'var(--text-muted)' }}>
                  Livros mais emprestados
                </p>
                {livrosTop.map(({ titulo, autor, total }, i) => (
                  <div
                    key={titulo}
                    className="flex items-center gap-3 py-3"
                    style={{ borderBottom: i < livrosTop.length - 1 ? '1px solid var(--border-default)' : 'none' }}
                  >
                    <span className="text-xs font-mono w-5" style={{ color: 'var(--text-muted)' }}>
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{titulo}</p>
                      <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{autor}</p>
                    </div>
                    <span className="badge badge-purple">{total}×</span>
                  </div>
                ))}
              </div>

              {/* Late by Class */}
              <div className="glass-card p-5">
                <p className="text-xs font-medium uppercase tracking-wider mb-4" style={{ color: 'var(--text-muted)' }}>
                  Atrasados por turma
                </p>
                {atrasados.length === 0 ? (
                  <div className="flex items-center gap-2 py-6">
                    <span className="text-lg">✅</span>
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Nenhum atrasado!</p>
                  </div>
                ) : (
                  atrasados.map(({ turma, total }, i) => (
                    <div
                      key={turma}
                      className="flex items-center justify-between py-3"
                      style={{ borderBottom: i < atrasados.length - 1 ? '1px solid var(--border-default)' : 'none' }}
                    >
                      <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{turma}</span>
                      <span className={`badge ${total >= 3 ? 'badge-red' : 'badge-amber'}`}>
                        {total} {total === 1 ? 'aluno' : 'alunos'}
                      </span>
                    </div>
                  ))
                )}
                <button
                  onClick={() => (window.location.href = '/emprestimos?status=ATRASADO')}
                  className="mt-4 text-xs transition-colors"
                  style={{ color: 'var(--text-muted)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--accent-indigo-light)')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
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
