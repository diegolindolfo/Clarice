'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type AlunoInfo = {
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

export default function DetalheAlunoPage() {
  const { matricula } = useParams<{ matricula: string }>()
  const router = useRouter()
  const [aluno, setAluno] = useState<AlunoInfo | null>(null)
  const [emprestimos, setEmprestimos] = useState<EmprestimoHistorico[]>([])
  const [carregando, setCarregando] = useState(true)
  const [filtro, setFiltro] = useState<'todos' | 'ativos' | 'devolvidos'>('todos')

  useEffect(() => {
    async function carregar() {
      const mat = parseInt(matricula)

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
        setAluno({
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

      setCarregando(false)
    }
    carregar()
  }, [matricula])

  const fmt = (d: string) => {
    const data = new Date(d)
    return new Date(data.getTime() + data.getTimezoneOffset() * 60000).toLocaleDateString('pt-BR')
  }

  function iniciais(nome: string) {
    return nome
      .split(' ')
      .slice(0, 2)
      .map((p) => p[0])
      .join('')
      .toUpperCase()
  }

  if (carregando)
    return (
      <div className="max-w-3xl mx-auto p-6 text-sm text-gray-400 text-center py-16">
        Carregando...
      </div>
    )

  if (!aluno)
    return (
      <div className="max-w-3xl mx-auto p-6 text-sm text-gray-500 text-center py-16">
        Aluno não encontrado.
      </div>
    )

  const ativos = emprestimos.filter((e) => e.status === 'EMPRESTADO' || e.status === 'RENOVADO')
  const atrasados = emprestimos.filter((e) => e.em_atraso)
  const totalDevolvidos = emprestimos.filter((e) => e.status === 'DEVOLVIDO').length

  const empFiltrados =
    filtro === 'ativos'
      ? emprestimos.filter((e) => e.status !== 'DEVOLVIDO')
      : filtro === 'devolvidos'
      ? emprestimos.filter((e) => e.status === 'DEVOLVIDO')
      : emprestimos

  const statusStyle: Record<string, string> = {
    EMPRESTADO: 'bg-blue-50 text-blue-800',
    RENOVADO: 'bg-purple-50 text-purple-800',
    DEVOLVIDO: 'bg-green-50 text-green-800',
    ATRASADO: 'bg-red-50 text-red-800',
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      {/* Voltar */}
      <button
        onClick={() => router.back()}
        className="text-sm text-gray-500 hover:text-gray-800 mb-6 flex items-center gap-1"
      >
        ← Alunos
      </button>

      {/* Header do aluno */}
      <div className="flex gap-5 mb-6">
        <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center text-xl font-medium text-blue-800 flex-shrink-0">
          {aluno.foto_url ? (
            <img src={aluno.foto_url} alt="" className="w-full h-full rounded-full object-cover" />
          ) : (
            iniciais(aluno.nome)
          )}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl font-medium">{aluno.nome}</h1>
            {!aluno.ativo && (
              <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                Inativo
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 mb-2">
            mat. {aluno.matricula} · {aluno.turma_nome}
            {aluno.email ? ` · ${aluno.email}` : ''}
          </p>
          <div className="flex gap-2 flex-wrap">
            {atrasados.length > 0 && (
              <span className="text-xs font-medium bg-red-50 text-red-700 px-3 py-1 rounded-full">
                {atrasados.length} atrasado{atrasados.length > 1 ? 's' : ''}
              </span>
            )}
            <span className="text-xs font-medium bg-blue-50 text-blue-800 px-3 py-1 rounded-full">
              {ativos.length} ativo{ativos.length !== 1 ? 's' : ''}
            </span>
            <span className="text-xs bg-gray-100 text-gray-600 px-3 py-1 rounded-full">
              {totalDevolvidos} devolvido{totalDevolvidos !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </div>

      {/* Resumo em cards */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className={`rounded-xl p-4 ${atrasados.length > 0 ? 'bg-red-50' : 'bg-gray-50'}`}>
          <p className={`text-2xl font-mono font-medium ${atrasados.length > 0 ? 'text-red-700' : ''}`}>
            {atrasados.length}
          </p>
          <p className={`text-xs mt-1 ${atrasados.length > 0 ? 'text-red-600' : 'text-gray-500'}`}>
            Atrasados
          </p>
        </div>
        <div className="bg-gray-50 rounded-xl p-4">
          <p className="text-2xl font-mono font-medium">{ativos.length}</p>
          <p className="text-xs mt-1 text-gray-500">Em mãos</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-4">
          <p className="text-2xl font-mono font-medium">{emprestimos.length}</p>
          <p className="text-xs mt-1 text-gray-500">Total histórico</p>
        </div>
      </div>

      {/* Filtro de empréstimos */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-medium">
          Histórico de empréstimos
          <span className="text-gray-400 font-normal ml-1">({empFiltrados.length})</span>
        </h2>
        <div className="flex gap-1">
          {(['todos', 'ativos', 'devolvidos'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFiltro(f)}
              className={`text-xs px-3 py-1 rounded-full border transition-colors capitalize
                ${
                  filtro === f
                    ? 'border-gray-400 bg-gray-100 text-gray-800 font-medium'
                    : 'border-gray-200 text-gray-500 hover:border-gray-300'
                }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Tabela de empréstimos */}
      <div className="border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
            <tr>
              {['Livro', 'Saída', 'Prazo', 'Devolução', 'Status'].map((h) => (
                <th key={h} className="text-left px-4 py-2.5 font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {empFiltrados.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-8 text-gray-400">
                  Nenhum empréstimo encontrado
                </td>
              </tr>
            ) : (
              empFiltrados.map((e) => (
                <tr key={e.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-2.5">
                    <p className="font-medium text-sm">{e.titulo}</p>
                    <p className="text-xs text-gray-400">{e.autor}</p>
                  </td>
                  <td className="px-4 py-2.5 text-gray-500">{fmt(e.data_saida)}</td>
                  <td className={`px-4 py-2.5 ${e.em_atraso ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                    {fmt(e.prazo_final)}
                  </td>
                  <td className="px-4 py-2.5 text-gray-500">
                    {e.data_devolucao_real ? fmt(e.data_devolucao_real) : '—'}
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        e.em_atraso ? statusStyle['ATRASADO'] : statusStyle[e.status] ?? 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {e.em_atraso ? 'Atrasado' : e.status.charAt(0) + e.status.slice(1).toLowerCase()}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Ação rápida */}
      {aluno.ativo && (
        <button
          onClick={() => router.push('/emprestimos/novo')}
          className="w-full mt-6 bg-blue-800 text-white rounded-xl py-3 text-sm font-medium hover:bg-blue-900 transition-colors"
        >
          Novo empréstimo para {aluno.nome.split(' ')[0]}
        </button>
      )}
    </div>
  )
}
