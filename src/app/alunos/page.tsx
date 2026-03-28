'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import SlidePanel from '@/components/SlidePanel'
import { iniciais, avatarGradient } from '@/lib/format'

type Aluno = {
  matricula: number
  nome: string
  email: string | null
  turma_id: number
  turma_nome: string
  foto_url: string | null
  ativo: boolean
  emprestimos_ativos: number
  em_atraso: boolean
}

type Turma = {
  id: number
  nome: string
}

type AlunoDetalhe = {
  matricula: number
  nome: string
  email: string | null
  turma_nome: string
  foto_url: string | null
  ativo: boolean
  criado_em: string
}

type EmprestimoHistorico = {
  id: string
  titulo: string
  autor: string
  data_saida: string
  prazo_final: string
  data_devolucao_real: string | null
  status: string
  em_atraso: boolean
}

const statusBadge: Record<string, string> = {
  EMPRESTADO: 'badge-blue',
  RENOVADO: 'badge-purple',
  DEVOLVIDO: 'badge-green',
  ATRASADO: 'badge-red',
}

function fmt(d: string) {
  const data = new Date(d)
  return new Date(data.getTime() + data.getTimezoneOffset() * 60000).toLocaleDateString('pt-BR')
}

function SkeletonCards() {
  return (
    <div className="flex flex-col gap-2">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="glass-card p-4 flex items-center gap-4">
          <div className="skeleton w-10 h-10 rounded-full flex-shrink-0" />
          <div className="flex-1">
            <div className="skeleton h-4 w-36 mb-2" />
            <div className="skeleton h-3 w-48" />
          </div>
          <div className="skeleton h-6 w-16 rounded-full flex-shrink-0" />
        </div>
      ))}
    </div>
  )
}

export default function AlunosPage() {
  const supabase = createClient()
  const router = useRouter()
  const [alunos, setAlunos] = useState<Aluno[]>([])
  const [turmas, setTurmas] = useState<Turma[]>([])
  const [busca, setBusca] = useState('')
  const [buscaDebounced, setBuscaDebounced] = useState('')
  const [filtroTurma, setFiltroTurma] = useState('')
  const [filtroStatus, setFiltroStatus] = useState<'todos' | 'ativos' | 'inativos'>('ativos')
  const [carregando, setCarregando] = useState(true)

  // Sidebar state
  const [panelAberto, setPanelAberto] = useState(false)
  const [detalhe, setDetalhe] = useState<AlunoDetalhe | null>(null)
  const [emprestimos, setEmprestimos] = useState<EmprestimoHistorico[]>([])
  const [carregandoDetalhe, setCarregandoDetalhe] = useState(false)
  const [filtroHist, setFiltroHist] = useState<'todos' | 'ativos' | 'devolvidos'>('todos')

  useEffect(() => {
    const t = setTimeout(() => setBuscaDebounced(busca), 350)
    return () => clearTimeout(t)
  }, [busca])

  useEffect(() => {
    supabase
      .from('turmas')
      .select('id, nome')
      .order('nome')
      .then(({ data }) => setTurmas(data ?? []))
  }, [])

  const carregar = useCallback(async () => {
    setCarregando(true)

    let query = supabase
      .from('alunos')
      .select('matricula, nome, email, turma_id, foto_url, ativo, turmas(nome)')
      .order('nome')

    if (filtroStatus === 'ativos') query = query.eq('ativo', true)
    else if (filtroStatus === 'inativos') query = query.eq('ativo', false)

    if (filtroTurma) query = query.eq('turma_id', parseInt(filtroTurma))

    if (buscaDebounced.length >= 2) {
      const isMatricula = /^\d+$/.test(buscaDebounced)
      if (isMatricula) {
        query = query.eq('matricula', parseInt(buscaDebounced))
      } else {
        query = query.ilike('nome', `%${buscaDebounced}%`)
      }
    }

    const { data } = await query.limit(50)

    if (!data) {
      setAlunos([])
      setCarregando(false)
      return
    }

    const matriculas = data.map((a) => a.matricula)

    const [{ data: empAtivos }, { data: empAtrasados }] = await Promise.all([
      supabase
        .from('emprestimos')
        .select('aluno_matricula')
        .in('aluno_matricula', matriculas)
        .in('status', ['EMPRESTADO', 'RENOVADO']),
      supabase
        .from('vw_emprestimos_atrasados')
        .select('matricula')
        .in('matricula', matriculas),
    ])

    const contagemAtivos: Record<number, number> = {}
    empAtivos?.forEach(({ aluno_matricula }) => {
      contagemAtivos[aluno_matricula] = (contagemAtivos[aluno_matricula] ?? 0) + 1
    })

    const matriculasAtrasadas = new Set(empAtrasados?.map((a) => a.matricula) ?? [])

    setAlunos(
      data.map((a) => ({
        matricula: a.matricula,
        nome: a.nome,
        email: a.email,
        turma_id: a.turma_id,
        turma_nome: (a.turmas as any)?.nome ?? '',
        foto_url: a.foto_url,
        ativo: a.ativo,
        emprestimos_ativos: contagemAtivos[a.matricula] ?? 0,
        em_atraso: matriculasAtrasadas.has(a.matricula),
      }))
    )
    setCarregando(false)
  }, [buscaDebounced, filtroTurma, filtroStatus])

  useEffect(() => {
    carregar()
  }, [carregar])

  // Abrir sidebar com detalhes do aluno
  async function abrirDetalhe(mat: number) {
    setPanelAberto(true)
    setCarregandoDetalhe(true)
    setDetalhe(null)
    setEmprestimos([])
    setFiltroHist('todos')

    const [{ data: alunoData }, { data: empData }] = await Promise.all([
      supabase
        .from('alunos')
        .select('matricula, nome, email, foto_url, ativo, criado_em, turmas(nome)')
        .eq('matricula', mat)
        .single(),
      supabase
        .from('vw_painel_aluno')
        .select('emprestimo_id, titulo, autor, data_saida, prazo_final, data_devolucao_real, status, em_atraso')
        .eq('matricula', mat)
        .order('data_saida', { ascending: false }),
    ])

    if (alunoData) {
      setDetalhe({
        matricula: alunoData.matricula,
        nome: alunoData.nome,
        email: alunoData.email,
        turma_nome: (alunoData.turmas as any)?.nome ?? '',
        foto_url: alunoData.foto_url,
        ativo: alunoData.ativo,
        criado_em: alunoData.criado_em,
      })
    }

    setEmprestimos(
      (empData ?? []).map((e) => ({
        id: e.emprestimo_id,
        titulo: e.titulo,
        autor: e.autor,
        data_saida: e.data_saida,
        prazo_final: e.prazo_final,
        data_devolucao_real: e.data_devolucao_real,
        status: e.status,
        em_atraso: e.em_atraso,
      }))
    )
    setCarregandoDetalhe(false)
  }

  const ativos = emprestimos.filter((e) => e.status === 'EMPRESTADO' || e.status === 'RENOVADO')
  const atrasados = emprestimos.filter((e) => e.em_atraso)
  const totalDevolvidos = emprestimos.filter((e) => e.status === 'DEVOLVIDO').length

  const empFiltrados =
    filtroHist === 'ativos'
      ? emprestimos.filter((e) => e.status !== 'DEVOLVIDO')
      : filtroHist === 'devolvidos'
      ? emprestimos.filter((e) => e.status === 'DEVOLVIDO')
      : emprestimos

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>Alunos</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            {carregando ? '...' : `${alunos.length} aluno${alunos.length !== 1 ? 's' : ''}`}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-5 flex-wrap animate-slide-up delay-1">
        <div className="flex-1 min-w-48 relative">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            placeholder="Buscar por nome ou matrícula..."
            className="dark-input w-full pl-10"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
        <select
          className="dark-select"
          value={filtroTurma}
          onChange={(e) => setFiltroTurma(e.target.value)}
        >
          <option value="">Todas as turmas</option>
          {turmas.map((t) => (
            <option key={t.id} value={t.id}>{t.nome}</option>
          ))}
        </select>
        <select
          className="dark-select"
          value={filtroStatus}
          onChange={(e) => setFiltroStatus(e.target.value as typeof filtroStatus)}
        >
          <option value="ativos">Ativos</option>
          <option value="inativos">Inativos</option>
          <option value="todos">Todos</option>
        </select>
      </div>

      {/* Student List */}
      {carregando ? (
        <SkeletonCards />
      ) : alunos.length === 0 ? (
        <div className="text-center py-20" style={{ color: 'var(--text-muted)' }}>
          <p className="text-3xl mb-3">👤</p>
          <p className="text-sm">Nenhum aluno encontrado</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2 animate-slide-up delay-2">
          {alunos.map((aluno) => (
            <button
              key={aluno.matricula}
              onClick={() => abrirDetalhe(aluno.matricula)}
              className="flex items-center gap-4 p-4 text-left transition-all duration-200 glass-card cv-auto"
              style={{ cursor: 'pointer' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-hover)'
                e.currentTarget.style.transform = 'translateY(-1px)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-default)'
                e.currentTarget.style.transform = 'translateY(0)'
              }}
            >
              {/* Avatar */}
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-semibold text-white flex-shrink-0"
                style={{ background: avatarGradient(aluno.nome) }}
              >
                {aluno.foto_url ? (
                  <img src={aluno.foto_url} alt="" className="w-full h-full rounded-full object-cover" />
                ) : (
                  iniciais(aluno.nome)
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                    {aluno.nome}
                  </p>
                  {!aluno.ativo && <span className="badge badge-gray">Inativo</span>}
                </div>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  mat. {aluno.matricula} · {aluno.turma_nome}
                  {aluno.email ? ` · ${aluno.email}` : ''}
                </p>
              </div>

              {/* Badges */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {aluno.em_atraso && <span className="badge badge-red">Atrasado</span>}
                {aluno.emprestimos_ativos > 0 && !aluno.em_atraso && (
                  <span className="badge badge-blue">
                    {aluno.emprestimos_ativos} livro{aluno.emprestimos_ativos > 1 ? 's' : ''}
                  </span>
                )}
                {aluno.emprestimos_ativos === 0 && !aluno.em_atraso && (
                  <span className="badge badge-green">OK</span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Slide Panel - Student Detail */}
      <SlidePanel
        aberto={panelAberto}
        onFechar={() => setPanelAberto(false)}
        titulo="Detalhes do aluno"
      >
        {carregandoDetalhe ? (
          <div>
            <div className="flex gap-4 mb-6">
              <div className="skeleton w-14 h-14 rounded-full flex-shrink-0" />
              <div className="flex-1">
                <div className="skeleton h-5 w-40 mb-2" />
                <div className="skeleton h-4 w-56 mb-3" />
                <div className="flex gap-2">
                  <div className="skeleton h-5 w-16 rounded-full" />
                  <div className="skeleton h-5 w-20 rounded-full" />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 mb-5">
              {[...Array(3)].map((_, i) => <div key={i} className="skeleton h-16 rounded-xl" />)}
            </div>
            <div className="skeleton h-40 rounded-xl" />
          </div>
        ) : detalhe ? (
          <div className="animate-fade-in">
            {/* Student Header */}
            <div className="flex gap-4 mb-5">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center text-lg font-semibold text-white flex-shrink-0"
                style={{ background: avatarGradient(detalhe.nome) }}
              >
                {detalhe.foto_url ? (
                  <img src={detalhe.foto_url} alt="" className="w-full h-full rounded-full object-cover" />
                ) : (
                  iniciais(detalhe.nome)
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {detalhe.nome}
                  </h3>
                  {!detalhe.ativo && <span className="badge badge-gray">Inativo</span>}
                </div>
                <p className="text-sm mb-2" style={{ color: 'var(--text-muted)' }}>
                  mat. {detalhe.matricula} · {detalhe.turma_nome}
                  {detalhe.email ? ` · ${detalhe.email}` : ''}
                </p>
                <div className="flex gap-2 flex-wrap">
                  {atrasados.length > 0 && (
                    <span className="badge badge-red">
                      {atrasados.length} atrasado{atrasados.length > 1 ? 's' : ''}
                    </span>
                  )}
                  <span className="badge badge-blue">
                    {ativos.length} ativo{ativos.length !== 1 ? 's' : ''}
                  </span>
                  <span className="badge badge-gray">
                    {totalDevolvidos} devolvido{totalDevolvidos !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            </div>

            {/* Metric Cards */}
            <div className="grid grid-cols-3 gap-2 mb-5">
              <div
                className="rounded-xl p-3 text-center"
                style={{ background: atrasados.length > 0 ? 'var(--gradient-rose)' : 'var(--bg-elevated)' }}
              >
                <p className="text-xl font-bold font-mono text-white">{atrasados.length}</p>
                <p className="text-[0.65rem] mt-0.5 text-white/70">Atrasados</p>
              </div>
              <div className="rounded-xl p-3 text-center" style={{ background: 'var(--gradient-blue)' }}>
                <p className="text-xl font-bold font-mono text-white">{ativos.length}</p>
                <p className="text-[0.65rem] mt-0.5 text-white/70">Em mãos</p>
              </div>
              <div className="rounded-xl p-3 text-center" style={{ background: 'var(--bg-elevated)' }}>
                <p className="text-xl font-bold font-mono" style={{ color: 'var(--text-primary)' }}>{emprestimos.length}</p>
                <p className="text-[0.65rem] mt-0.5" style={{ color: 'var(--text-muted)' }}>Total</p>
              </div>
            </div>

            {/* Filter */}
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                Histórico ({empFiltrados.length})
              </h4>
              <div className="flex gap-1">
                {(['todos', 'ativos', 'devolvidos'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFiltroHist(f)}
                    className="text-[0.65rem] px-2.5 py-1 rounded-full transition-all duration-200 capitalize"
                    style={{
                      background: filtroHist === f ? 'var(--accent-indigo-glow)' : 'transparent',
                      border: `1px solid ${filtroHist === f ? 'var(--accent-primary)' : 'var(--border-default)'}`,
                      color: filtroHist === f ? 'var(--accent-primary)' : 'var(--text-muted)',
                      fontWeight: filtroHist === f ? 500 : 400,
                    }}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {/* Emp List */}
            <div className="glass-card overflow-hidden mb-4">
              {empFiltrados.length === 0 ? (
                <div className="text-center py-8" style={{ color: 'var(--text-muted)' }}>
                  <p className="text-sm">Nenhum empréstimo</p>
                </div>
              ) : (
                <div className="divide-y" style={{ borderColor: 'var(--border-default)' }}>
                  {empFiltrados.map((e) => (
                    <div key={e.id} className="px-4 py-3 flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{e.titulo}</p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          {fmt(e.data_saida)} → {fmt(e.prazo_final)}
                          {e.data_devolucao_real ? ` · Dev. ${fmt(e.data_devolucao_real)}` : ''}
                        </p>
                      </div>
                      <span className={`badge ${e.em_atraso ? statusBadge['ATRASADO'] : statusBadge[e.status] ?? 'badge-gray'}`}>
                        {e.em_atraso ? 'Atrasado' : e.status.charAt(0) + e.status.slice(1).toLowerCase()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              {detalhe.ativo && (
                <button
                  onClick={() => router.push('/emprestimos/novo')}
                  className="btn-primary flex-1 py-2.5 text-sm"
                >
                  Novo empréstimo
                </button>
              )}
              <button
                onClick={() => router.push(`/alunos/${detalhe.matricula}`)}
                className="btn-ghost py-2.5 text-sm px-4"
              >
                Abrir página →
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-12" style={{ color: 'var(--text-muted)' }}>
            <p className="text-3xl mb-3">👤</p>
            <p className="text-sm">Aluno não encontrado.</p>
          </div>
        )}
      </SlidePanel>
    </div>
  )
}
