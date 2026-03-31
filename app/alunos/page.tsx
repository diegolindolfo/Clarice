'use client'
import { useEffect, useState, useCallback, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { corAvatar, iniciais, sanitizeBusca } from '@/lib/utils'
import Chip from '@/components/Chip'
import PainelAluno from './PainelAluno'

type Aluno = {
  matricula: number; nome: string; turma: string; turma_id: number
  email: string | null; ativo: boolean; em_atraso: boolean; foto_url?: string | null
}

export default function AlunosPage() {
  return (
    <Suspense fallback={<div className="max-w-6xl mx-auto p-6 text-sm text-gray-400">Carregando...</div>}>
      <AlunosContent />
    </Suspense>
  )
}

function AlunosContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [alunos, setAlunos]                 = useState<Aluno[]>([])
  const [busca, setBusca]                   = useState('')
  const [buscaDebounced, setBuscaDebounced] = useState('')
  const [serie, setSerie]                   = useState('')
  const [carregando, setCarregando]         = useState(true)
  const [selecionado, setSelecionado]       = useState<Aluno | null>(null)

  const selecionadoRef = useRef(selecionado)
  useEffect(() => { selecionadoRef.current = selecionado }, [selecionado])

  useEffect(() => {
    const t = setTimeout(() => setBuscaDebounced(busca), 300)
    return () => clearTimeout(t)
  }, [busca])

  const carregar = useCallback(async () => {
    setCarregando(true)
    const supabase = createClient()

    let query = supabase
      .from('alunos')
      .select('matricula, nome, email, ativo, turma_id, foto_url, turmas(nome)')
      .eq('ativo', true)
      .order('nome')
      .limit(100)

    if (buscaDebounced.length >= 2) {
      const isMatricula = /^\d+$/.test(buscaDebounced)
      if (isMatricula) {
        query = query.eq('matricula', Number(buscaDebounced))
      } else {
        const termo = sanitizeBusca(buscaDebounced)
        query = query.ilike('nome', `%${termo}%`)
      }
    }

    if (serie) {
      const { data: turmaIds } = await supabase
        .from('turmas')
        .select('id')
        .ilike('nome', `${serie[0]}º%`)
      if (turmaIds && turmaIds.length > 0) {
        query = query.in('turma_id', turmaIds.map(t => t.id))
      }
    }

    const { data } = await query
    if (!data) { setCarregando(false); return }

    const matriculas = data.map(a => a.matricula)
    const { data: atrasados } = matriculas.length
      ? await supabase.from('vw_emprestimos_atrasados').select('matricula').in('matricula', matriculas)
      : { data: [] }

    const atrasadosSet = new Set(atrasados?.map(a => a.matricula) ?? [])

    const lista: Aluno[] = data.map(a => ({
      matricula: a.matricula, nome: a.nome, turma: (a.turmas as any)?.nome ?? '',
      turma_id: a.turma_id, email: a.email, ativo: a.ativo,
      em_atraso: atrasadosSet.has(a.matricula), foto_url: a.foto_url,
    }))

    setAlunos(lista)

    // Pré-seleciona aluno via query param (?matricula=...)
    const matriculaParam = searchParams.get('matricula')
    if (matriculaParam && !selecionadoRef.current) {
      const encontrado = lista.find(a => a.matricula === Number(matriculaParam))
      if (encontrado) setSelecionado(encontrado)
    }

    // Mantém o selecionado atualizado após recargas
    if (selecionadoRef.current) {
      const atualizado = lista.find(a => a.matricula === selecionadoRef.current!.matricula)
      if (atualizado) setSelecionado(atualizado)
    }

    setCarregando(false)
  }, [buscaDebounced, serie, searchParams])

  useEffect(() => { carregar() }, [carregar])

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

        {/* Lista */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-medium">Alunos</h1>
            <span className="text-xs text-gray-500">{alunos.length} exibidos</span>
          </div>

          <input
            placeholder="Buscar nome ou matrícula..."
            className="w-full mb-3"
            value={busca}
            onChange={e => setBusca(e.target.value)}
          />

          <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
            <Chip ativo={serie === ''} onClick={() => setSerie('')}>Todas</Chip>
            {['1º ano', '2º ano', '3º ano'].map(s => (
              <Chip key={s} ativo={serie === s} onClick={() => setSerie(serie === s ? '' : s)}>{s}</Chip>
            ))}
          </div>

          <div className="border rounded-2xl overflow-hidden">
            {carregando ? (
              <div className="divide-y">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-3 animate-pulse">
                    <div className="w-9 h-9 rounded-full bg-gray-100 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="h-4 bg-gray-100 rounded w-32 mb-1" />
                      <div className="h-3 bg-gray-100 rounded w-24" />
                    </div>
                  </div>
                ))}
              </div>
            ) : alunos.length === 0 ? (
              <p className="text-center py-10 text-sm text-gray-400">Nenhum aluno encontrado</p>
            ) : alunos.map(aluno => {
              const { bg, tc } = corAvatar(aluno.matricula)
              const ativo = selecionado?.matricula === aluno.matricula
              return (
                <button
                  key={aluno.matricula}
                  onClick={() => setSelecionado(aluno)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left border-b last:border-none transition-colors ${ativo ? 'bg-gray-50' : 'hover:bg-gray-50'}`}
                >
                  {aluno.foto_url ? (
                    <img src={aluno.foto_url} alt={aluno.nome} className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0" style={{ background: bg, color: tc }}>
                      {iniciais(aluno.nome)}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm truncate ${ativo ? 'font-medium' : ''}`}>{aluno.nome}</p>
                    <p className="text-xs text-gray-400">{aluno.turma} · {aluno.matricula}</p>
                  </div>
                  {aluno.em_atraso && (
                    <span className="text-xs font-medium bg-red-50 text-red-800 px-2 py-0.5 rounded-full flex-shrink-0">Atrasado</span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Painel */}
        <div className="lg:col-span-3">
          {selecionado ? (
            <PainelAluno
              aluno={selecionado}
              onNovoEmprestimo={() => router.push(`/emprestimos/novo?matricula=${selecionado.matricula}`)}
              onEditar={carregar}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-2xl">
              <p className="mb-1">Selecione um aluno</p>
              <p className="text-xs">para ver o painel completo</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
