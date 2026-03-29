'use client'
import { useEffect, useState, useCallback, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import PainelAluno from './PainelAluno'

type Aluno = {
  matricula: number; nome: string; turma: string; turma_id: number
  email: string | null; ativo: boolean; em_atraso: boolean
}

const CORES = [
  { bg: '#E6F1FB', tc: '#0C447C' }, { bg: '#EEEDFE', tc: '#3C3489' },
  { bg: '#E1F5EE', tc: '#085041' }, { bg: '#FAEEDA', tc: '#633806' },
  { bg: '#FAECE7', tc: '#712B13' }, { bg: '#FBEAF0', tc: '#72243E' },
]
function corAvatar(m: number) { return CORES[m % CORES.length] }
function iniciais(nome: string) { return nome.split(' ').slice(0, 2).map(p => p[0]).join('').toUpperCase() }

function Chip({ ativo, onClick, children }: { ativo: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={`text-xs px-3 py-1 rounded-full border whitespace-nowrap transition-colors ${ativo ? 'border-gray-400 bg-gray-100 font-medium' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
      {children}
    </button>
  )
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

  // BUG CORRIGIDO: `selecionado` era usado dentro de `carregar` mas não estava nas deps do useCallback,
  // causando stale closure — o bloco "Mantém o selecionado atualizado" nunca funcionava.
  // Solução: usar uma ref para acessar o valor atual de selecionado dentro do callback sem re-criar carregar.
  const selecionadoRef = useRef(selecionado)
  useEffect(() => { selecionadoRef.current = selecionado }, [selecionado])

  useEffect(() => {
    const t = setTimeout(() => setBuscaDebounced(busca), 300)
    return () => clearTimeout(t)
  }, [busca])

  const carregar = useCallback(async () => {
    setCarregando(true)

    let query = supabase
      .from('alunos')
      .select('matricula, nome, email, ativo, turma_id, turmas(nome)')
      .eq('ativo', true)
      .order('nome')
      .limit(100)

    if (buscaDebounced.length >= 2) {
      const isMatricula = /^\d+$/.test(buscaDebounced)
      query = isMatricula
        ? query.eq('matricula', Number(buscaDebounced))
        : query.ilike('nome', `%${buscaDebounced}%`)
    }

    // BUG CORRIGIDO: filtro de série era aplicado no cliente após `limit(100)`, podendo
    // excluir alunos de certas séries. Agora filtra no banco pelo turma_id.
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
      em_atraso: atrasadosSet.has(a.matricula),
    }))

    setAlunos(lista)

    // Pré-seleciona aluno via query param (?matricula=...)
    const matriculaParam = searchParams.get('matricula')
    if (matriculaParam && !selecionadoRef.current) {
      const encontrado = lista.find(a => a.matricula === Number(matriculaParam))
      if (encontrado) setSelecionado(encontrado)
    }

    // Mantém o selecionado atualizado após recargas (usa ref para valor atual)
    if (selecionadoRef.current) {
      const atualizado = lista.find(a => a.matricula === selecionadoRef.current!.matricula)
      if (atualizado) setSelecionado(atualizado)
    }

    setCarregando(false)
  }, [buscaDebounced, serie, searchParams])

  useEffect(() => { carregar() }, [carregar])

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="grid grid-cols-5 gap-5">

        {/* Lista */}
        <div className="col-span-2">
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
              <p className="text-center py-10 text-sm text-gray-400">Carregando...</p>
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
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0" style={{ background: bg, color: tc }}>
                    {iniciais(aluno.nome)}
                  </div>
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
        <div className="col-span-3">
          {selecionado ? (
            <PainelAluno
              aluno={selecionado}
              onNovoEmprestimo={() => router.push(`/emprestimos/novo?matricula=${selecionado.matricula}`)}
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
