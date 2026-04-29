'use client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { iniciais, sanitizeBusca } from '@/lib/utils'
import { toast_success } from '@/components/Toast'

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

// Wrapper com Suspense — obrigatório pelo Next.js para useSearchParams
export default function NovoEmprestimoPage() {
  return (
    <Suspense fallback={
      <div className="max-w-xl mx-auto p-6 text-sm text-gray-400 text-center py-16">
        Carregando...
      </div>
    }>
      <NovoEmprestimoForm />
    </Suspense>
  )
}

function NovoEmprestimoForm() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [etapa, setEtapa]       = useState<Etapa>('aluno')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro]         = useState('')

  const [buscaAluno, setBuscaAluno]             = useState('')
  const [buscaAlunoDebounced, setBuscaAlunoDebounced] = useState('')
  const [alunos, setAlunos]                     = useState<Aluno[]>([])
  const [alunoSelecionado, setAlunoSelecionado] = useState<Aluno | null>(null)

  const [buscaLivro, setBuscaLivro]             = useState('')
  const [buscaLivroDebounced, setBuscaLivroDebounced] = useState('')
  const [livros, setLivros]                     = useState<Livro[]>([])
  const [livroSelecionado, setLivroSelecionado] = useState<Livro | null>(null)

  // MELHORIA: debounce para buscas de aluno e livro (antes era a cada keystroke)
  useEffect(() => {
    const t = setTimeout(() => setBuscaAlunoDebounced(buscaAluno), 350)
    return () => clearTimeout(t)
  }, [buscaAluno])

  useEffect(() => {
    const t = setTimeout(() => setBuscaLivroDebounced(buscaLivro), 350)
    return () => clearTimeout(t)
  }, [buscaLivro])

  // Pre-popula o formulario quando a rota recebe ?matricula=… ou ?acervo_id=…
  // (ou ambos). Antes os dois fetchs disparavam em paralelo e cada `.then`
  // chamava setEtapa(), causando corrida na ordem final da etapa. Agora
  // resolvemos os dois com Promise.all e decidimos a etapa em um unico ponto.
  useEffect(() => {
    const supabase = createClient()
    const matriculaParam = searchParams.get('matricula')
    const acervoId       = searchParams.get('acervo_id')
    if (!matriculaParam && !acervoId) return

    let cancelado = false

    async function preencher() {
      const tarefas: Promise<unknown>[] = []

      type AlunoRow = {
        matricula: number
        nome: string
        turmas: { nome: string } | { nome: string }[] | null
      }
      type ExemplarRow = {
        id: string
        tombo: number | null
        acervo:
          | { titulo: string; autor: string | null }
          | { titulo: string; autor: string | null }[]
      }

      if (matriculaParam) {
        tarefas.push(
          supabase
            .from('alunos')
            .select('matricula, nome, turmas(nome)')
            .eq('matricula', Number(matriculaParam))
            .maybeSingle()
            .then(({ data }: { data: AlunoRow | null }) => {
              if (cancelado || !data) return
              const turma = Array.isArray(data.turmas)
                ? data.turmas[0]?.nome ?? ''
                : data.turmas?.nome ?? ''
              setAlunoSelecionado({
                matricula: data.matricula,
                nome: data.nome,
                turma,
                em_atraso: false,
              })
            }),
        )
      }

      if (acervoId) {
        tarefas.push(
          supabase
            .from('livros_exemplares')
            .select('id, tombo, disponivel, acervo:acervo_id(titulo, autor)')
            .eq('acervo_id', acervoId)
            .eq('disponivel', true)
            .limit(1)
            .maybeSingle()
            .then(({ data }: { data: ExemplarRow | null }) => {
              if (cancelado || !data) return
              const acervo = Array.isArray(data.acervo) ? data.acervo[0] : data.acervo
              setLivroSelecionado({
                exemplar_id: data.id,
                tombo: data.tombo,
                titulo: acervo.titulo,
                autor: acervo.autor ?? '',
                disponivel: true,
              })
            }),
        )
      }

      await Promise.all(tarefas)
      if (cancelado) return

      // Determina a etapa em um unico lugar (depois que os dois fetchs
      // terminaram). Prioridade: se ja temos os dois, vai pra confirmar;
      // se so aluno, vai pra livro; se so livro, vai pra aluno.
      const temAluno = !!matriculaParam
      const temLivro = !!acervoId
      if (temAluno && temLivro) setEtapa('confirmar')
      else if (temAluno) setEtapa('livro')
      else if (temLivro) setEtapa('aluno')
    }

    preencher()
    return () => { cancelado = true }
  }, [searchParams])

  // Busca de alunos com debounce
  useEffect(() => {
    if (buscaAlunoDebounced.length < 2) { setAlunos([]); return }

    async function buscar() {
      const supabase = createClient()
      const termo = sanitizeBusca(buscaAlunoDebounced)
      const isMatricula = /^\d+$/.test(buscaAlunoDebounced)
      const { data } = await supabase
        .from('alunos')
        .select('matricula, nome, turmas(nome)')
        .eq('ativo', true)
        .or(isMatricula ? `matricula.eq.${buscaAlunoDebounced}` : `nome.ilike.%${termo}%`)
        .limit(6)

      if (!data) return

      const matriculas = data.map((a: any) => a.matricula)
      const { data: atrasados } = await supabase
        .from('vw_emprestimos_atrasados')
        .select('matricula')
        .in('matricula', matriculas)

      const atrasadosSet = new Set(atrasados?.map((a: any) => a.matricula) ?? [])

      setAlunos(data.map((a: any) => ({
        matricula: a.matricula,
        nome: a.nome,
        turma: (a.turmas as any)?.nome ?? '',
        em_atraso: atrasadosSet.has(a.matricula),
      })))
    }
    buscar()
  }, [buscaAlunoDebounced])

  // Busca de livros com debounce
  useEffect(() => {
    if (buscaLivroDebounced.length < 2) { setLivros([]); return }

    async function buscar() {
      const supabase = createClient()
      const str = buscaLivroDebounced.trim()
      const termo = sanitizeBusca(str)
      const isNumero = /^\d+$/.test(str)
      let exemplares: Livro[] = []

      // Se informou um número, tenta buscar pelo tombo primeiro
      if (isNumero) {
        const { data: dataTombo } = await supabase
          .from('livros_exemplares')
          .select('id, tombo, disponivel, acervo:acervo_id(titulo, autor)')
          .eq('tombo', Number(str))
          .eq('disponivel', true)
          .limit(4)

        if (dataTombo) {
          exemplares.push(...dataTombo.map((ex: any) => ({
            exemplar_id: ex.id,
            tombo: ex.tombo,
            titulo: (ex.acervo as any)?.titulo ?? 'Desconhecido',
            autor: (ex.acervo as any)?.autor ?? '',
            disponivel: ex.disponivel
          })))
        }
      }

      // Preenche até 8 itens com a busca de títulos/autores
      if (exemplares.length < 8) {
        const { data: dataAcervo } = await supabase
          .from('acervo')
          .select('id, titulo, autor, livros_exemplares!inner(id, tombo, disponivel)')
          .or(`titulo.ilike.%${termo}%,autor.ilike.%${termo}%`)
          .eq('livros_exemplares.disponivel', true)
          .limit(8 - exemplares.length)

        if (dataAcervo) {
          const fetchedExemplares = dataAcervo.flatMap((obra: any) =>
            (obra.livros_exemplares as any[]).map(ex => ({
              exemplar_id: ex.id,
              tombo: ex.tombo,
              titulo: obra.titulo,
              autor: obra.autor ?? '',
              disponivel: ex.disponivel,
            }))
          )
          // Impede duplicados caso o termo também tenha resultado no tombo (improvável, mas seguro)
          const existentes = new Set(exemplares.map(e => e.exemplar_id))
          for (const ex of fetchedExemplares) {
            if (!existentes.has(ex.exemplar_id)) exemplares.push(ex)
          }
        }
      }

      setLivros(exemplares.slice(0, 8))
    }
    buscar()
  }, [buscaLivroDebounced])

  async function confirmar() {
    if (!alunoSelecionado || !livroSelecionado) return
    setSalvando(true)
    setErro('')

    const supabase = createClient()
    const { error } = await supabase.from('emprestimos').insert({
      exemplar_id:     livroSelecionado.exemplar_id,
      aluno_matricula: alunoSelecionado.matricula,
      sala_na_data:    alunoSelecionado.turma,
      data_saida:      new Date().toISOString().split('T')[0],
      status:          'EMPRESTADO',
    })

    setSalvando(false)
    if (error) { setErro(error.message); return }
    toast_success('Empréstimo registrado com sucesso!')
    router.push('/emprestimos')
  }

  const prazo = (() => {
    const d = new Date()
    d.setDate(d.getDate() + 15)
    return d.toLocaleDateString('pt-BR')
  })()

  return (
    <div className="max-w-xl mx-auto p-6">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="text-sm text-gray-500 hover:text-gray-800">← Voltar</button>
        <h1 className="text-xl font-medium">Novo empréstimo</h1>
      </div>

      {/* Indicador de etapas */}
      <div className="flex items-center gap-2 mb-8 text-sm">
        {(['aluno', 'livro', 'confirmar'] as Etapa[]).map((e, i) => (
          <div key={e} className="flex items-center gap-2">
            {i > 0 && <div className="h-px bg-gray-200 w-8" />}
            <div className={`flex items-center gap-2 ${etapa === e ? 'text-blue-800' : 'text-gray-400'}`}>
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${etapa === e ? 'bg-blue-800 text-white' : 'bg-gray-100'}`}>
                {i + 1}
              </span>
              <span className="capitalize">{e === 'confirmar' ? 'Confirmar' : e.charAt(0).toUpperCase() + e.slice(1)}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Etapa 1: Aluno */}
      {etapa === 'aluno' && (
        <div>
          <p className="text-xs font-medium text-gray-500 mb-2">Buscar por nome ou matrícula</p>
          <input
            autoFocus
            placeholder="Ex: Maria Silva ou 20240021"
            className="w-full mb-3"
            value={buscaAluno}
            onChange={e => setBuscaAluno(e.target.value)}
          />
          <div className="flex flex-col gap-2">
            {alunos.map(aluno => (
              <button
                key={aluno.matricula}
                onClick={() => { setAlunoSelecionado(aluno); setEtapa('livro'); setAlunos([]); setBuscaAluno('') }}
                className="flex items-center gap-3 p-3 border rounded-xl text-left hover:bg-gray-50 transition-colors"
              >
                <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center text-xs font-medium text-blue-800 flex-shrink-0">
                  {iniciais(aluno.nome)}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{aluno.nome}</p>
                  <p className="text-xs text-gray-400">mat. {aluno.matricula} · {aluno.turma}</p>
                </div>
                {aluno.em_atraso
                  ? <span className="text-xs bg-red-50 text-red-700 px-2 py-1 rounded-full">Atrasado</span>
                  : <span className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded-full">OK</span>
                }
              </button>
            ))}
            {buscaAluno.length >= 2 && buscaAlunoDebounced.length >= 2 && alunos.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-4">Nenhum aluno encontrado</p>
            )}
          </div>
        </div>
      )}

      {/* Etapa 2: Livro */}
      {etapa === 'livro' && (
        <div>
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl mb-5">
            <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center text-xs font-medium text-blue-800">
              {iniciais(alunoSelecionado!.nome)}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">{alunoSelecionado!.nome}</p>
              <p className="text-xs text-gray-400">{alunoSelecionado!.turma}</p>
            </div>
            <button
              onClick={() => { setAlunoSelecionado(null); setEtapa('aluno') }}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              Trocar
            </button>
          </div>

          <p className="text-xs font-medium text-gray-500 mb-2">Buscar livro disponível</p>
          <input
            autoFocus
            placeholder="Ex: Dom Casmurro ou Machado"
            className="w-full mb-3"
            value={buscaLivro}
            onChange={e => setBuscaLivro(e.target.value)}
          />
          <div className="flex flex-col gap-2">
            {livros.map(livro => (
              <button
                key={livro.exemplar_id}
                onClick={() => { setLivroSelecionado(livro); setEtapa('confirmar'); setLivros([]); setBuscaLivro('') }}
                className="flex items-center gap-3 p-3 border rounded-xl text-left hover:bg-gray-50 transition-colors"
              >
                <div className="w-9 h-9 rounded-lg bg-purple-50 flex items-center justify-center text-sm flex-shrink-0" aria-hidden="true">📗</div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{livro.titulo}</p>
                  <p className="text-xs text-gray-400">{livro.autor}{livro.tombo ? ` · tombo #${livro.tombo}` : ''}</p>
                </div>
                <span className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded-full">Disponível</span>
              </button>
            ))}
            {buscaLivro.length >= 2 && buscaLivroDebounced.length >= 2 && livros.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-4">Nenhum exemplar disponível</p>
            )}
          </div>
        </div>
      )}

      {/* Etapa 3: Confirmar */}
      {etapa === 'confirmar' && alunoSelecionado && livroSelecionado && (
        <div>
          <div className="bg-gray-50 rounded-xl p-4 mb-6">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Resumo do empréstimo</p>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><p className="text-xs text-gray-400 mb-1">Aluno</p><p className="font-medium">{alunoSelecionado.nome}</p></div>
              <div><p className="text-xs text-gray-400 mb-1">Turma</p><p>{alunoSelecionado.turma}</p></div>
              <div>
                <p className="text-xs text-gray-400 mb-1">Livro</p>
                <p className="font-medium">{livroSelecionado.titulo}</p>
                <p className="text-xs text-gray-400">{livroSelecionado.autor}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">Prazo de devolução</p>
                <p className="font-medium">{prazo}</p>
                <p className="text-xs text-gray-400">15 dias</p>
              </div>
            </div>
          </div>

          {erro && (
            <div className="bg-red-50 text-red-700 text-sm rounded-lg px-4 py-3 mb-4">{erro}</div>
          )}

          <div className="flex gap-3">
            <button onClick={() => setEtapa('livro')} className="flex-1 border rounded-xl py-3 text-sm hover:bg-gray-50">
              Voltar
            </button>
            <button
              onClick={confirmar}
              disabled={salvando}
              className="flex-[2] bg-blue-800 text-white rounded-xl py-3 text-sm font-medium hover:bg-blue-900 disabled:opacity-50"
            >
              {salvando ? 'Salvando...' : 'Confirmar empréstimo'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
