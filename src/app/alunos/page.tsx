'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

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

export default function AlunosPage() {
  const router = useRouter()
  const [alunos, setAlunos] = useState<Aluno[]>([])
  const [turmas, setTurmas] = useState<Turma[]>([])
  const [busca, setBusca] = useState('')
  const [buscaDebounced, setBuscaDebounced] = useState('')
  const [filtroTurma, setFiltroTurma] = useState('')
  const [filtroStatus, setFiltroStatus] = useState<'todos' | 'ativos' | 'inativos'>('ativos')
  const [carregando, setCarregando] = useState(true)

  // Debounce
  useEffect(() => {
    const t = setTimeout(() => setBuscaDebounced(busca), 350)
    return () => clearTimeout(t)
  }, [busca])

  // Carregar turmas uma vez
  useEffect(() => {
    supabase
      .from('turmas')
      .select('id, nome')
      .order('nome')
      .then(({ data }) => setTurmas(data ?? []))
  }, [])

  // Carregar alunos
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    carregar()
  }, [buscaDebounced, filtroTurma, filtroStatus])

  async function carregar() {
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

    // Buscar empréstimos ativos e atrasados para cada aluno
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
  }

  function iniciais(nome: string) {
    return nome
      .split(' ')
      .slice(0, 2)
      .map((p) => p[0])
      .join('')
      .toUpperCase()
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-medium">Alunos</h1>
          <p className="text-xs text-gray-500 mt-1">
            {carregando ? '...' : `${alunos.length} aluno${alunos.length !== 1 ? 's' : ''}`}
          </p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 mb-3 flex-wrap">
        <input
          placeholder="Buscar por nome ou matrícula..."
          className="flex-1 min-w-48 border rounded-xl px-3 py-2 text-sm"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
        <select
          className="border rounded-xl px-3 py-2 text-sm"
          value={filtroTurma}
          onChange={(e) => setFiltroTurma(e.target.value)}
        >
          <option value="">Todas as turmas</option>
          {turmas.map((t) => (
            <option key={t.id} value={t.id}>
              {t.nome}
            </option>
          ))}
        </select>
        <select
          className="border rounded-xl px-3 py-2 text-sm"
          value={filtroStatus}
          onChange={(e) => setFiltroStatus(e.target.value as typeof filtroStatus)}
        >
          <option value="ativos">Ativos</option>
          <option value="inativos">Inativos</option>
          <option value="todos">Todos</option>
        </select>
      </div>

      {/* Lista */}
      {carregando ? (
        <div className="text-center py-16 text-sm text-gray-400">Carregando...</div>
      ) : alunos.length === 0 ? (
        <div className="text-center py-16 text-sm text-gray-400">Nenhum aluno encontrado</div>
      ) : (
        <div className="flex flex-col gap-2">
          {alunos.map((aluno) => (
            <button
              key={aluno.matricula}
              onClick={() => router.push(`/alunos/${aluno.matricula}`)}
              className="flex items-center gap-4 p-4 border rounded-2xl text-left hover:border-gray-300 transition-colors"
            >
              {/* Avatar */}
              <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-xs font-medium text-blue-800 flex-shrink-0">
                {aluno.foto_url ? (
                  <img
                    src={aluno.foto_url}
                    alt=""
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  iniciais(aluno.nome)
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium truncate">{aluno.nome}</p>
                  {!aluno.ativo && (
                    <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                      Inativo
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-0.5">
                  mat. {aluno.matricula} · {aluno.turma_nome}
                  {aluno.email ? ` · ${aluno.email}` : ''}
                </p>
              </div>

              {/* Badges */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {aluno.em_atraso && (
                  <span className="text-xs font-medium bg-red-50 text-red-700 px-2 py-1 rounded-full">
                    Atrasado
                  </span>
                )}
                {aluno.emprestimos_ativos > 0 && !aluno.em_atraso && (
                  <span className="text-xs font-medium bg-blue-50 text-blue-700 px-2 py-1 rounded-full">
                    {aluno.emprestimos_ativos} livro{aluno.emprestimos_ativos > 1 ? 's' : ''}
                  </span>
                )}
                {aluno.emprestimos_ativos === 0 && !aluno.em_atraso && (
                  <span className="text-xs font-medium bg-green-50 text-green-700 px-2 py-1 rounded-full">
                    OK
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
