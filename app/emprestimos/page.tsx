'use client'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { fmt, sanitizeBusca } from '@/lib/utils'
import ModalDevolucao from '@/components/ModalDevolucao'
import ModalRenovacao from '@/components/ModalRenovacao'
import { exportarAtrasadosPDF, type AtrasadoPDF } from '@/lib/exportarAtrasadosPDF'

type Emprestimo = {
  emprestimo_id: string
  aluno_nome: string
  matricula: number
  turma: string
  titulo: string
  autor: string
  data_saida: string
  prazo_final: string
  data_devolucao_real: string | null
  renovado_em: string | null
  status: 'EMPRESTADO' | 'RENOVADO' | 'DEVOLVIDO' | 'ATRASADO'
  em_atraso: boolean
}

type GlobalCounts = { ativos: number; renovados: number; atrasados: number }

const STATUS_STYLE: Record<string, string> = {
  EMPRESTADO: 'bg-blue-50 text-blue-800',
  RENOVADO:   'bg-purple-50 text-purple-800',
  DEVOLVIDO:  'bg-green-50 text-green-800',
  ATRASADO:   'bg-red-50 text-red-800',
}

export default function EmprestimosPage() {
  const [emprestimos, setEmprestimos]       = useState<Emprestimo[]>([])
  const [busca, setBusca]                   = useState('')
  const [buscaDebounced, setBuscaDebounced] = useState('')
  const [filtroStatus, setFiltroStatus]     = useState('')
  const [carregando, setCarregando]         = useState(true)
  const [exportando, setExportando]         = useState(false)
  const [modalDevolucao, setModalDevolucao] = useState<Emprestimo | null>(null)
  const [modalRenovacao, setModalRenovacao] = useState<Emprestimo | null>(null)
  const [erroExport, setErroExport]         = useState('')

  const [global, setGlobal] = useState<GlobalCounts>({ ativos: 0, renovados: 0, atrasados: 0 })

  useEffect(() => {
    const t = setTimeout(() => setBuscaDebounced(busca), 350)
    return () => clearTimeout(t)
  }, [busca])

  const carregar = useCallback(async () => {
    setCarregando(true)
    const supabase = createClient()
    let query = supabase
      .from('vw_painel_aluno')
      .select('*')
      .order('data_saida', { ascending: false })
      .limit(200)

    if (filtroStatus) {
      if (filtroStatus === 'ATRASADO') {
        query = query.eq('em_atraso', true)
      } else {
        query = query.eq('status', filtroStatus)
      }
    }
    if (buscaDebounced) {
      const termo = sanitizeBusca(buscaDebounced)
      query = query.or(
        `aluno_nome.ilike.%${termo}%,titulo.ilike.%${termo}%`
      )
    }

    const { data, error } = await query
    if (!error) setEmprestimos(data ?? [])
    setCarregando(false)
  }, [buscaDebounced, filtroStatus])

  const carregarGlobal = useCallback(async () => {
    const supabase = createClient()
    const [r1, r2, r3] = await Promise.all([
      supabase.from('emprestimos').select('*', { count: 'exact', head: true }).eq('status', 'EMPRESTADO'),
      supabase.from('emprestimos').select('*', { count: 'exact', head: true }).eq('status', 'RENOVADO'),
      supabase.from('vw_emprestimos_atrasados').select('*', { count: 'exact', head: true }),
    ])
    setGlobal({
      ativos:    r1.count ?? 0,
      renovados: r2.count ?? 0,
      atrasados: r3.count ?? 0,
    })
  }, [])

  useEffect(() => { carregar() }, [carregar])
  useEffect(() => { carregarGlobal() }, [carregarGlobal])

  async function exportarPDF() {
    setExportando(true)
    setErroExport('')
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('vw_emprestimos_atrasados')
        .select('*')
        .order('dias_atraso', { ascending: false })

      if (error) throw error
      if (!data || data.length === 0) {
        setErroExport('Nenhum empréstimo atrasado no momento.')
        return
      }
      await exportarAtrasadosPDF(data as AtrasadoPDF[])
    } catch (e: any) {
      setErroExport(e.message ?? 'Erro ao gerar PDF.')
    } finally {
      setExportando(false)
    }
  }

  function aposModal() {
    carregar()
    carregarGlobal()
  }

  return (
    <div className="max-w-6xl mx-auto p-6">

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-medium">Empréstimos</h1>
          <p className="text-sm text-gray-500">Biblioteca Escolar Clarice</p>
        </div>
        <div className="flex gap-2 items-center">
          <button
            onClick={exportarPDF}
            disabled={exportando}
            className="border text-sm px-4 py-2 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            {exportando ? 'Gerando...' : '↓ Exportar atrasados'}
          </button>
          <Link
            href="/emprestimos/novo"
            className="bg-blue-800 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-900 transition-colors"
          >
            + Novo empréstimo
          </Link>
        </div>
      </div>

      {erroExport && (
        <div className="bg-amber-50 text-amber-800 text-sm rounded-xl px-4 py-3 mb-4">
          {erroExport}
        </div>
      )}

      {/* Cards de resumo — responsivos */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <div className="bg-gray-50 rounded-xl p-4">
          <p className="text-xs text-gray-500 mb-1">Ativos</p>
          <p className="text-2xl font-mono font-medium">{carregando ? '—' : global.ativos}</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-4">
          <p className="text-xs text-gray-500 mb-1">Renovados</p>
          <p className="text-2xl font-mono font-medium">{carregando ? '—' : global.renovados}</p>
        </div>
        <div className="bg-red-50 rounded-xl p-4">
          <p className="text-xs text-red-600 mb-1">Atrasados</p>
          <p className="text-2xl font-mono font-medium text-red-700">{carregando ? '—' : global.atrasados}</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-4">
          <p className="text-xs text-gray-500 mb-1">Registros exibidos</p>
          <p className="text-2xl font-mono font-medium">{carregando ? '—' : emprestimos.length}</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-2 mb-4">
        <input
          placeholder="Buscar aluno ou livro..."
          className="flex-1 !h-[38px]"
          value={busca}
          onChange={e => setBusca(e.target.value)}
        />
        <select
          value={filtroStatus}
          onChange={e => setFiltroStatus(e.target.value)}
          className="min-w-40 !w-auto !h-[38px]"
        >
          <option value="">Todos os status</option>
          <option value="EMPRESTADO">Emprestado</option>
          <option value="RENOVADO">Renovado</option>
          <option value="ATRASADO">Atrasado</option>
          <option value="DEVOLVIDO">Devolvido</option>
        </select>
        {(busca || filtroStatus) && (
          <button
            onClick={() => { setBusca(''); setFiltroStatus('') }}
            className="text-sm text-gray-500 hover:text-gray-800 px-2 h-[38px]"
          >
            Limpar
          </button>
        )}
      </div>

      {/* Tabela — responsiva com scroll horizontal */}
      <div className="border rounded-xl overflow-x-auto">
        <table className="w-full text-sm min-w-[700px]">
          <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
            <tr>
              {['Aluno', 'Livro', 'Saída', 'Prazo', 'Status', 'Ação'].map(h => (
                <th key={h} className="text-left px-4 py-3 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {carregando ? (
              <tr><td colSpan={6} className="text-center py-12 text-gray-400">Carregando...</td></tr>
            ) : emprestimos.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-12 text-gray-400">Nenhum empréstimo encontrado</td></tr>
            ) : emprestimos.map(e => (
              <tr key={e.emprestimo_id} className={`border-t hover:bg-gray-50 ${e.em_atraso ? 'bg-red-50/30' : ''}`}>
                <td className="px-4 py-3">
                  <p className="font-medium">{e.aluno_nome}</p>
                  <p className="text-xs text-gray-400">{e.turma} · {e.matricula}</p>
                </td>
                <td className="px-4 py-3">
                  <p className="truncate max-w-[180px]">{e.titulo}</p>
                  <p className="text-xs text-gray-400 truncate max-w-[180px]">{e.autor}</p>
                </td>
                <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{fmt(e.data_saida)}</td>
                <td className={`px-4 py-3 whitespace-nowrap ${e.em_atraso ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                  {fmt(e.prazo_final)}
                  {e.em_atraso && (
                    <span className="ml-1 text-xs">
                      (+{Math.floor((Date.now() - new Date(e.prazo_final + 'T00:00:00').getTime()) / 86400000)}d)
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_STYLE[e.status] ?? 'bg-gray-100 text-gray-600'}`}>
                    {e.status.charAt(0) + e.status.slice(1).toLowerCase()}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    {(e.status === 'EMPRESTADO' || e.status === 'RENOVADO' || e.em_atraso) && (
                      <button
                        onClick={() => setModalDevolucao(e)}
                        className={`text-xs border rounded px-2 py-1 transition-colors ${e.em_atraso ? 'border-red-200 text-red-700 hover:bg-red-50' : 'hover:bg-gray-50'}`}
                      >
                        Devolver
                      </button>
                    )}
                    {e.status === 'EMPRESTADO' && (
                      <button
                        onClick={() => setModalRenovacao(e)}
                        className="text-xs border rounded px-2 py-1 hover:bg-gray-50 transition-colors"
                      >
                        Renovar
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modais */}
      {modalDevolucao && (
        <ModalDevolucao
          emprestimo={{
            id: modalDevolucao.emprestimo_id,
            aluno_nome: modalDevolucao.aluno_nome,
            titulo: modalDevolucao.titulo,
            autor: modalDevolucao.autor,
            data_saida: modalDevolucao.data_saida,
            prazo_final: modalDevolucao.prazo_final,
            em_atraso: modalDevolucao.em_atraso,
          }}
          onFechar={() => setModalDevolucao(null)}
          onConfirmar={() => { setModalDevolucao(null); aposModal() }}
        />
      )}

      {modalRenovacao && (
        <ModalRenovacao
          emprestimo={{
            id: modalRenovacao.emprestimo_id,
            aluno_nome: modalRenovacao.aluno_nome,
            titulo: modalRenovacao.titulo,
            autor: modalRenovacao.autor,
            prazo_final: modalRenovacao.prazo_final,
            renovado_em: modalRenovacao.renovado_em,
          }}
          onFechar={() => setModalRenovacao(null)}
          onConfirmar={() => { setModalRenovacao(null); aposModal() }}
        />
      )}
    </div>
  )
}
