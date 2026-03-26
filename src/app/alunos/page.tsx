'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'


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
              onClick={() => router.push(`/alunos/${aluno.matricula}`)}
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
    </div>
  )
}
