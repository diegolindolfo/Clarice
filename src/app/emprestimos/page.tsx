'use client'
import { useEffect, useState, useMemo, useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'
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
  status: 'EMPRESTADO' | 'RENOVADO' | 'DEVOLVIDO'
  em_atraso: boolean
}

function fmt(d: string) {
  const data = new Date(d)
  return new Date(data.getTime() + data.getTimezoneOffset() * 60000).toLocaleDateString('pt-BR')
}

function SkeletonRows() {
  return (
    <>
      {[...Array(6)].map((_, i) => (
        <tr key={i}>
          <td className="px-4 py-4"><div className="skeleton h-4 w-32 mb-2" /><div className="skeleton h-3 w-20" /></td>
          <td className="px-4 py-4"><div className="skeleton h-4 w-36 mb-2" /><div className="skeleton h-3 w-24" /></td>
          <td className="px-4 py-4"><div className="skeleton h-4 w-20" /></td>
          <td className="px-4 py-4"><div className="skeleton h-4 w-20" /></td>
          <td className="px-4 py-4"><div className="skeleton h-5 w-20 rounded-full" /></td>
          <td className="px-4 py-4"><div className="skeleton h-7 w-16 rounded-lg" /></td>
        </tr>
      ))}
    </>
  )
}

export default function EmprestimosPage() {
  const [emprestimos, setEmprestimos] = useState<Emprestimo[]>([])
  const [busca, setBusca] = useState('')
  const [buscaDebounced, setBuscaDebounced] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('')
  const [carregando, setCarregando] = useState(true)

  const [modalDevolucao, setModalDevolucao] = useState<Emprestimo | null>(null)
  const [modalRenovacao, setModalRenovacao] = useState<Emprestimo | null>(null)
  const [confirmacao, setConfirmacao] = useState('')

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

    if (filtroStatus === 'ATRASADO') {
      query = query.in('status', ['EMPRESTADO', 'RENOVADO']).eq('em_atraso', true)
    } else if (filtroStatus) {
      query = query.eq('status', filtroStatus)
    }
    if (buscaDebounced) {
      query = query.or(`aluno_nome.ilike.%${buscaDebounced}%,titulo.ilike.%${buscaDebounced}%`)
    }

    const { data } = await query
    setEmprestimos(data ?? [])
    setCarregando(false)
  }, [buscaDebounced, filtroStatus])

  useEffect(() => {
    carregar()
  }, [carregar])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const sucesso = params.get('sucesso')
    if (!sucesso) return
    if (sucesso === 'emprestimo-criado') {
      setConfirmacao('Empréstimo registrado com sucesso.')
    }
    window.history.replaceState({}, '', '/emprestimos')
  }, [])

  const counts = useMemo(() => ({
    atrasados: emprestimos.filter((e) => e.em_atraso).length,
    ativos: emprestimos.filter((e) => e.status === 'EMPRESTADO').length,
    renovados: emprestimos.filter((e) => e.status === 'RENOVADO').length,
  }), [emprestimos])

  function getDisplayStatus(e: Emprestimo) {
    if (e.em_atraso && e.status !== 'DEVOLVIDO') return 'ATRASADO'
    return e.status
  }

  function canDevolver(e: Emprestimo) {
    return e.status === 'EMPRESTADO' || e.status === 'RENOVADO'
  }

  function canRenovar(e: Emprestimo) {
    return e.status === 'EMPRESTADO' && !e.em_atraso
  }

  function handleOpenDevolucao(e: React.MouseEvent, emp: Emprestimo) {
    e.stopPropagation()
    e.preventDefault()
    setModalDevolucao(emp)
  }

  function handleOpenRenovacao(e: React.MouseEvent, emp: Emprestimo) {
    e.stopPropagation()
    e.preventDefault()
    setModalRenovacao(emp)
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 animate-fade-in">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>Empréstimos</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Gestão de empréstimos</p>
        </div>
        <Link href="/emprestimos/novo" className="btn-primary" style={{ textDecoration: 'none' }}>
          + Novo empréstimo
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6 animate-slide-up delay-1">
        {[
          { label: 'Ativos', valor: counts.ativos, gradient: 'var(--gradient-blue)' },
          { label: 'Renovados', valor: counts.renovados, gradient: 'var(--gradient-purple)' },
          { label: 'Atrasados', valor: counts.atrasados, gradient: 'var(--gradient-rose)' },
          { label: 'Total carregado', valor: emprestimos.length, gradient: 'var(--bg-card)' },
        ].map((c) => (
          <div key={c.label} className="metric-card" style={{ background: c.gradient }}>
            <p className="text-xs text-white/70 mb-1">{c.label}</p>
            <p className="text-2xl font-bold text-white font-mono">{carregando ? '–' : c.valor}</p>
          </div>
        ))}
      </div>

      {/* Confirmation */}
      {confirmacao && (
        <div
          className="rounded-xl px-4 py-3 mb-5 text-sm flex items-center justify-between gap-3 animate-slide-up"
          style={{
            background: 'var(--accent-emerald-soft)',
            color: 'var(--accent-emerald)',
            border: '1px solid rgba(52, 211, 153, 0.2)',
          }}
        >
          <span>{confirmacao}</span>
          <button
            onClick={() => setConfirmacao('')}
            className="text-xs font-medium"
            style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}
          >
            Fechar
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 mb-5 animate-slide-up delay-2">
        <div className="flex-1 relative">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            placeholder="Buscar aluno ou livro..."
            className="dark-input w-full pl-10"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
        <select
          className="dark-select"
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

      {/* Table */}
      <div className="glass-card overflow-hidden animate-slide-up delay-3">
        <table className="dark-table">
          <thead>
            <tr>
              {['Aluno', 'Livro', 'Saída', 'Prazo', 'Status', 'Ação'].map((h) => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {carregando ? (
              <SkeletonRows />
            ) : emprestimos.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-12" style={{ color: 'var(--text-muted)' }}>
                  Nenhum empréstimo encontrado
                </td>
              </tr>
            ) : (
              emprestimos.map((e) => {
                const displayStatus = getDisplayStatus(e)
                return (
                  <tr key={e.emprestimo_id} className="cv-auto">
                    <td>
                      <p className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>{e.aluno_nome}</p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{e.turma} · {e.matricula}</p>
                    </td>
                    <td>
                      <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{e.titulo}</p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{e.autor}</p>
                    </td>
                    <td className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                      {fmt(e.data_saida)}
                    </td>
                    <td
                      className="text-sm"
                      style={{
                        color: e.em_atraso ? 'var(--accent-rose)' : 'var(--text-secondary)',
                        fontWeight: e.em_atraso ? 500 : 400,
                      }}
                    >
                      {fmt(e.prazo_final)}
                    </td>
                    <td>
                      <span className={`badge ${
                        displayStatus === 'ATRASADO' ? 'badge-red' :
                        displayStatus === 'EMPRESTADO' ? 'badge-blue' :
                        displayStatus === 'RENOVADO' ? 'badge-purple' :
                        'badge-green'
                      }`}>
                        {displayStatus === 'ATRASADO' ? 'Atrasado' :
                         displayStatus === 'EMPRESTADO' ? 'Emprestado' :
                         displayStatus === 'RENOVADO' ? 'Renovado' :
                         'Devolvido'}
                      </span>
                    </td>
                    <td>
                      {canDevolver(e) && (
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={(ev) => handleOpenDevolucao(ev, e)}
                            className="text-xs py-1.5 px-3 rounded-lg font-medium transition-all cursor-pointer"
                            style={
                              e.em_atraso
                                ? {
                                    background: 'var(--accent-rose-soft)',
                                    color: 'var(--accent-rose)',
                                    border: '1px solid rgba(251, 113, 133, 0.2)',
                                  }
                                : {
                                    background: 'transparent',
                                    color: 'var(--text-secondary)',
                                    border: '1px solid var(--border-default)',
                                  }
                            }
                          >
                            Devolver
                          </button>
                          {canRenovar(e) && (
                            <button
                              type="button"
                              onClick={(ev) => handleOpenRenovacao(ev, e)}
                              className="text-xs py-1.5 px-3 rounded-lg font-medium transition-all cursor-pointer"
                              style={{
                                background: 'transparent',
                                color: 'var(--text-secondary)',
                                border: '1px solid var(--border-default)',
                              }}
                            >
                              Renovar
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal: Devolução */}
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
          onConfirmar={(mensagem) => {
            setConfirmacao(mensagem)
            setModalDevolucao(null)
            carregar()
          }}
        />
      )}

      {/* Modal: Renovação */}
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
          onConfirmar={(mensagem) => {
            setConfirmacao(mensagem)
            setModalRenovacao(null)
            carregar()
          }}
        />
      )}
    </div>
  )
}
