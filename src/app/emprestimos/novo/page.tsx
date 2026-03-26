'use client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'


import { iniciais, avatarGradient } from '@/lib/format'

// ── Tipos ──────────────────────────────────────────────
type Aluno = {
  matricula: number
  nome: string
  turma: string
  em_atraso?: boolean
}

type Livro = {
  exemplar_id: string
  tombo: number | null
  titulo: string
  autor: string
  disponivel: boolean
}

type Etapa = 'aluno' | 'livro' | 'confirmar'

function NovoEmprestimoContent() {
  const supabase = createClient()
  const router = useRouter()
  const searchParams = useSearchParams()

  const [etapa, setEtapa] = useState<Etapa>('aluno')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  const [buscaAluno, setBuscaAluno] = useState('')
  const [alunos, setAlunos] = useState<Aluno[]>([])
  const [alunoSelecionado, setAlunoSelecionado] = useState<Aluno | null>(null)

  const [buscaLivro, setBuscaLivro] = useState('')
  const [livros, setLivros] = useState<Livro[]>([])
  const [livroSelecionado, setLivroSelecionado] = useState<Livro | null>(null)

  useEffect(() => {
    const acervoId = searchParams.get('acervo_id')
    if (!acervoId) return

    supabase
      .from('livros_exemplares')
      .select('id, tombo, disponivel, acervo:acervo_id(titulo, autor)')
      .eq('acervo_id', acervoId)
      .eq('disponivel', true)
      .limit(1)
      .single()
      .then(({ data }) => {
        if (!data) return
        const acervo = data.acervo as any
        setLivroSelecionado({
          exemplar_id: data.id,
          tombo: data.tombo,
          titulo: acervo.titulo,
          autor: acervo.autor ?? '',
          disponivel: true,
        })
        setEtapa('aluno')
      })
  }, [searchParams])

  async function buscarAlunos(termo: string) {
    setBuscaAluno(termo)
    if (termo.length < 2) { setAlunos([]); return }

    const isMatricula = /^\d+$/.test(termo)

    const { data } = await supabase
      .from('alunos')
      .select('matricula, nome, turmas(nome)')
      .eq('ativo', true)
      .or(isMatricula ? `matricula.eq.${termo}` : `nome.ilike.%${termo}%`)
      .limit(6)

    if (!data) return

    const matriculas = data.map((a) => a.matricula)
    const { data: atrasados } = await supabase
      .from('vw_emprestimos_atrasados')
      .select('matricula')
      .in('matricula', matriculas)

    const matriculasAtrasadas = new Set(atrasados?.map((a) => a.matricula) ?? [])

    setAlunos(
      data.map((a) => ({
        matricula: a.matricula,
        nome: a.nome,
        turma: (a.turmas as any)?.nome ?? '',
        em_atraso: matriculasAtrasadas.has(a.matricula),
      }))
    )
  }

  async function buscarLivros(termo: string) {
    setBuscaLivro(termo)
    if (termo.length < 1) { setLivros([]); return }

    const isTombo = /^\d+$/.test(termo)

    if (isTombo) {
      // Busca direta pelo número de tombo no exemplar
      const { data } = await supabase
        .from('livros_exemplares')
        .select('id, tombo, disponivel, acervo:acervo_id(titulo, autor)')
        .eq('tombo', parseInt(termo))
        .limit(5)

      if (!data) return

      const exemplares: Livro[] = data.map((ex) => {
        const acervo = ex.acervo as any
        return {
          exemplar_id: ex.id,
          tombo: ex.tombo,
          titulo: acervo?.titulo ?? '',
          autor: acervo?.autor ?? '',
          disponivel: ex.disponivel,
        }
      })

      setLivros(exemplares)
    } else {
      if (termo.length < 2) { setLivros([]); return }

      // Busca por texto (título/autor) via full-text search
      const { data } = await supabase
        .from('acervo')
        .select(`
          id, titulo, autor,
          livros_exemplares!inner(id, tombo, disponivel)
        `)
        .textSearch('fts', termo, { config: 'portuguese' })
        .eq('livros_exemplares.disponivel', true)
        .limit(8)

      if (!data) return

      const exemplares: Livro[] = data.flatMap((obra) =>
        (obra.livros_exemplares as any[]).map((ex) => ({
          exemplar_id: ex.id,
          tombo: ex.tombo,
          titulo: obra.titulo,
          autor: obra.autor ?? '',
          disponivel: ex.disponivel,
        }))
      )

      setLivros(exemplares)
    }
  }

  async function confirmar() {
    if (!alunoSelecionado || !livroSelecionado) return
    setSalvando(true)
    setErro('')

    const { error } = await supabase.from('emprestimos').insert({
      exemplar_id: livroSelecionado.exemplar_id,
      aluno_matricula: alunoSelecionado.matricula,
      sala_na_data: alunoSelecionado.turma,
      data_saida: new Date().toISOString().split('T')[0],
      status: 'EMPRESTADO',
    })

    setSalvando(false)

    if (error) { setErro(error.message); return }

    router.push('/emprestimos')
  }

  const prazo = (() => {
    const d = new Date()
    d.setDate(d.getDate() + 15)
    return d.toLocaleDateString('pt-BR')
  })()

  function iniciais(nome: string) {
    return nome.split(' ').slice(0, 2).map((p) => p[0]).join('').toUpperCase()
  }

  const avatarGradient = (nome: string) => {
    const code = nome.charCodeAt(0) % 5
    const gradients = [
      'var(--gradient-indigo)', 'var(--gradient-purple)', 'var(--gradient-emerald)',
      'var(--gradient-blue)', 'var(--gradient-amber)',
    ]
    return gradients[code]
  }

  const etapas: Etapa[] = ['aluno', 'livro', 'confirmar']

  return (
    <div className="max-w-xl mx-auto p-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.back()}
          className="text-sm transition-colors"
          style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
        >
          ← Voltar
        </button>
        <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
          Novo empréstimo
        </h1>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center gap-2 mb-8 text-sm animate-slide-up delay-1">
        {etapas.map((e, i) => (
          <div key={e} className="flex items-center gap-2">
            {i > 0 && (
              <div
                className="w-8 h-px"
                style={{ background: etapa === e || etapas.indexOf(etapa) > i ? 'var(--accent-indigo)' : 'var(--border-default)' }}
              />
            )}
            <div className="flex items-center gap-2" style={{ color: etapa === e ? 'var(--accent-indigo-light)' : 'var(--text-muted)' }}>
              <span
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium transition-all"
                style={{
                  background: etapa === e ? 'var(--gradient-indigo)' : 'var(--bg-card)',
                  color: etapa === e ? 'white' : 'var(--text-muted)',
                  boxShadow: etapa === e ? 'var(--shadow-glow-indigo)' : 'none',
                }}
              >
                {i + 1}
              </span>
              <span className="capitalize">
                {e === 'confirmar' ? 'Confirmar' : e.charAt(0).toUpperCase() + e.slice(1)}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* ETAPA 1: Aluno */}
      {etapa === 'aluno' && (
        <div className="animate-slide-up delay-2">
          <p className="text-xs font-medium mb-3" style={{ color: 'var(--text-muted)' }}>
            Buscar por nome ou matrícula
          </p>
          <div className="relative mb-4">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              autoFocus
              placeholder="Ex: Maria Silva ou 20240021"
              className="dark-input w-full pl-10"
              value={buscaAluno}
              onChange={(e) => buscarAlunos(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            {alunos.map((aluno) => (
              <button
                key={aluno.matricula}
                onClick={() => {
                  setAlunoSelecionado(aluno)
                  setEtapa(livroSelecionado ? 'confirmar' : 'livro')
                  setAlunos([])
                  setBuscaAluno('')
                }}
                className="flex items-center gap-3 p-3.5 text-left transition-all duration-200 glass-card"
                style={{ cursor: 'pointer' }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--border-hover)')}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border-default)')}
              >
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold text-white flex-shrink-0"
                  style={{ background: avatarGradient(aluno.nome) }}
                >
                  {iniciais(aluno.nome)}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{aluno.nome}</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    mat. {aluno.matricula} · {aluno.turma}
                  </p>
                </div>
                {aluno.em_atraso ? (
                  <span className="badge badge-red">Atrasado</span>
                ) : (
                  <span className="badge badge-green">OK</span>
                )}
              </button>
            ))}

            {buscaAluno.length >= 2 && alunos.length === 0 && (
              <p className="text-sm text-center py-6" style={{ color: 'var(--text-muted)' }}>
                Nenhum aluno encontrado
              </p>
            )}
          </div>
        </div>
      )}

      {/* ETAPA 2: Livro */}
      {etapa === 'livro' && (
        <div className="animate-slide-up delay-2">
          {alunoSelecionado && (
            <div
              className="flex items-center gap-3 p-3.5 rounded-xl mb-5"
              style={{ background: 'var(--bg-card)' }}
            >
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold text-white"
                style={{ background: avatarGradient(alunoSelecionado.nome) }}
              >
                {iniciais(alunoSelecionado.nome)}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{alunoSelecionado.nome}</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{alunoSelecionado.turma}</p>
              </div>
              <button
                onClick={() => { setAlunoSelecionado(null); setEtapa('aluno') }}
                className="text-xs transition-colors"
                style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--accent-indigo-light)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
              >
                Trocar
              </button>
            </div>
          )}

          <p className="text-xs font-medium mb-3" style={{ color: 'var(--text-muted)' }}>
            Buscar por título, autor ou número de tombo
          </p>
          <div className="relative mb-4">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              autoFocus
              placeholder="Ex: Dom Casmurro, Machado ou 1234 (tombo)"
              className="dark-input w-full pl-10"
              value={buscaLivro}
              onChange={(e) => buscarLivros(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            {livros.map((livro) => {
              const disabled = !livro.disponivel
              return (
                <button
                  key={livro.exemplar_id}
                  disabled={disabled}
                  onClick={() => {
                    if (disabled) return
                    setLivroSelecionado(livro)
                    setEtapa('confirmar')
                    setLivros([])
                    setBuscaLivro('')
                  }}
                  className="flex items-center gap-3 p-3.5 text-left transition-all duration-200 glass-card"
                  style={{ cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1 }}
                  onMouseEnter={(e) => !disabled && (e.currentTarget.style.borderColor = 'var(--border-hover)')}
                  onMouseLeave={(e) => !disabled && (e.currentTarget.style.borderColor = 'var(--border-default)')}
                >
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center text-sm flex-shrink-0"
                    style={{ background: disabled ? 'var(--accent-rose-soft)' : 'var(--accent-purple-soft)' }}
                  >
                    {disabled ? '📕' : '📗'}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{livro.titulo}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {livro.autor}
                      {livro.tombo ? ` · tombo #${livro.tombo}` : ''}
                    </p>
                  </div>
                  {disabled ? (
                    <span className="badge badge-red">Indisponível</span>
                  ) : (
                    <span className="badge badge-green">Disponível</span>
                  )}
                </button>
              )
            })}

            {buscaLivro.length >= 2 && livros.length === 0 && (
              <p className="text-sm text-center py-6" style={{ color: 'var(--text-muted)' }}>
                Nenhum exemplar disponível encontrado
              </p>
            )}
          </div>
        </div>
      )}

      {/* ETAPA 3: Confirmar */}
      {etapa === 'confirmar' && alunoSelecionado && livroSelecionado && (
        <div className="animate-slide-up delay-2">
          <div className="glass-card p-5 mb-6">
            <p className="text-xs font-medium uppercase tracking-wide mb-4" style={{ color: 'var(--text-muted)' }}>
              Resumo do empréstimo
            </p>
            <div className="grid grid-cols-2 gap-4 text-sm">
              {[
                ['Aluno', alunoSelecionado.nome],
                ['Turma', alunoSelecionado.turma],
                ['Livro', livroSelecionado.titulo],
                ['Prazo', prazo],
              ].map(([label, valor]) => (
                <div key={label}>
                  <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{label}</p>
                  <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{valor}</p>
                  {label === 'Livro' && (
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{livroSelecionado.autor}</p>
                  )}
                  {label === 'Prazo' && (
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>15 dias</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {erro && (
            <div
              className="text-sm rounded-xl px-4 py-3 mb-4"
              style={{ background: 'var(--accent-rose-soft)', color: 'var(--accent-rose)' }}
            >
              {erro}
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={() => setEtapa('livro')} className="btn-ghost flex-1 py-3">
              Voltar
            </button>
            <button
              onClick={confirmar}
              disabled={salvando}
              className="btn-primary flex-[2] py-3"
            >
              {salvando ? 'Salvando...' : 'Confirmar empréstimo'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function NovoEmprestimoPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-xl mx-auto p-6 text-center py-20" style={{ color: 'var(--text-muted)' }}>
          <div className="skeleton h-6 w-48 mx-auto mb-4" />
          <div className="skeleton h-4 w-64 mx-auto" />
        </div>
      }
    >
      <NovoEmprestimoContent />
    </Suspense>
  )
}
