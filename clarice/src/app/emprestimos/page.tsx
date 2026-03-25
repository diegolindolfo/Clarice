'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import ModalDevolucao from '@/components/ModalDevolucao'
import ModalRenovacao from '@/components/ModalRenovacao'

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

const statusStyle: Record<string, string> = {
  EMPRESTADO: 'bg-blue-50 text-blue-800',
  RENOVADO: 'bg-purple-50 text-purple-800',
  DEVOLVIDO: 'bg-green-50 text-green-800',
  ATRASADO: 'bg-red-50 text-red-800',
}

export default function EmprestimosPage() {
  const [emprestimos, setEmprestimos] = useState<Emprestimo[]>([])
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('')
  const [carregando, setCarregando] = useState(true)

  const [modalDevolucao, setModalDevolucao] = useState<Emprestimo | null>(null)
  const [modalRenovacao, setModalRenovacao] = useState<Emprestimo | null>(null)

  async function carregar() {
    setCarregando(true)
    let query = supabase
      .from('vw_painel_aluno')
      .select('*')
      .order('data_saida', { ascending: false })

    if (filtroStatus) query = query.eq('status', filtroStatus)
    if (busca) query = query.or(`aluno_nome.ilike.%${busca}%,titulo.ilike.%${busca}%`)

    const { data } = await query
    setEmprestimos(data ?? [])
    setCarregando(false)
  }

  useEffect(() => {
    carregar()
  }, [busca, filtroStatus])

  const atrasados = emprestimos.filter((e) => e.em_atraso).length
  const ativos = emprestimos.filter((e) => e.status === 'EMPRESTADO').length
  const renovados = emprestimos.filter((e) => e.status === 'RENOVADO').length

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-medium">Empréstimos</h1>
          <p className="text-sm text-gray-500">Biblioteca Escolar Clarice</p>
        </div>
        <Link
          href="/emprestimos/novo"
          className="border text-sm px-4 py-2 rounded-lg hover:bg-gray-50"
        >
          + Novo empréstimo
        </Link>
      </div>

      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Ativos', valor: ativos, cor: '' },
          { label: 'Renovados', valor: renovados, cor: '' },
          { label: 'Atrasados', valor: atrasados, cor: 'bg-red-50' },
        ].map((c) => (
          <div key={c.label} className={`rounded-lg p-4 ${c.cor || 'bg-gray-50'}`}>
            <p className="text-xs text-gray-500 mb-1">{c.label}</p>
            <p className={`text-2xl font-medium ${c.cor ? 'text-red-700' : ''}`}>{c.valor}</p>
          </div>
        ))}
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-xs text-gray-500 mb-1">Total carregado</p>
          <p className="text-2xl font-medium">{emprestimos.length}</p>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        <input
          placeholder="Buscar aluno ou livro..."
          className="flex-1 border rounded-lg px-3 py-2 text-sm"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
        <select
          className="border rounded-lg px-3 py-2 text-sm"
          value={filtroStatus}
          onChange={(e) => setFiltroStatus(e.target.value)}
        >
          <option value="">Todos os status</option>
          <option value="EMPRESTADO">Emprestado</option>
          <option value="RENOVADO">Renovado</option>
          <option value="ATRASADO">Atrasado</option>
          <option value="DEVOLVIDO">Devolvido</option>
        </select>
      </div>

      <div className="border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
            <tr>
              {['Aluno', 'Livro', 'Saída', 'Prazo', 'Status', 'Ação'].map((h) => (
                <th key={h} className="text-left px-4 py-3 font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {carregando ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-gray-400">
                  Carregando...
                </td>
              </tr>
            ) : emprestimos.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-gray-400">
                  Nenhum empréstimo encontrado
                </td>
              </tr>
            ) : (
              emprestimos.map((e) => {
                // Adjust timezone so displayed date matches the ISO date logically 
                const dataSaida = new Date(e.data_saida)
                const prazoFinal = new Date(e.prazo_final)
                return (
                  <tr key={e.emprestimo_id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium">{e.aluno_nome}</p>
                      <p className="text-xs text-gray-400">
                        {e.turma} · {e.matricula}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p>{e.titulo}</p>
                      <p className="text-xs text-gray-400">{e.autor}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {new Date(dataSaida.getTime() + dataSaida.getTimezoneOffset() * 60000).toLocaleDateString('pt-BR')}
                    </td>
                    <td className={`px-4 py-3 ${e.em_atraso ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                      {new Date(prazoFinal.getTime() + prazoFinal.getTimezoneOffset() * 60000).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusStyle[e.status]}`}>
                        {e.status.charAt(0) + e.status.slice(1).toLowerCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {e.status === 'EMPRESTADO' && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => setModalDevolucao(e)}
                            className="text-xs border rounded px-2 py-1 hover:bg-gray-50"
                          >
                            Devolver
                          </button>
                          <button
                            onClick={() => setModalRenovacao(e)}
                            className="text-xs border rounded px-2 py-1 hover:bg-gray-50"
                          >
                            Renovar
                          </button>
                        </div>
                      )}
                      {e.status === 'RENOVADO' && (
                        <button
                          onClick={() => setModalDevolucao(e)}
                          className="text-xs border rounded px-2 py-1 hover:bg-gray-50"
                        >
                          Devolver
                        </button>
                      )}
                      {e.status === 'ATRASADO' && (
                        <button
                          onClick={() => setModalDevolucao(e)}
                          className="text-xs border border-red-200 text-red-700 rounded px-2 py-1 hover:bg-red-50"
                        >
                          Devolver
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

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
          onConfirmar={() => {
            setModalDevolucao(null)
            carregar()
          }}
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
          onConfirmar={() => {
            setModalRenovacao(null)
            carregar()
          }}
        />
      )}
    </div>
  )
}
