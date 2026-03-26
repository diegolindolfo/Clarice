'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'


import { formatDateBR, iniciais, avatarGradient } from '@/lib/format'

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
  const supabase = createClient()
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

  const iniciais = (nome: string) =>
    nome.split(' ').slice(0, 2).map((p) => p[0]).join('').toUpperCase()

  const avatarGradient = (nome: string) => {
    const code = nome.charCodeAt(0) % 5
    const gradients = [
      'var(--gradient-indigo)',
      'var(--gradient-purple)',
      'var(--gradient-emerald)',
      'var(--gradient-blue)',
      'var(--gradient-amber)',
    ]
    return gradients[code]
  }

  const statusBadge: Record<string, string> = {
    EMPRESTADO: 'badge-blue',
    RENOVADO: 'badge-purple',
    DEVOLVIDO: 'badge-green',
    ATRASADO: 'badge-red',
  }

  if (carregando)
    return (
      <div className="max-w-3xl mx-auto p-6">
        <div className="skeleton h-4 w-16 mb-8 rounded" />
        <div className="flex gap-5 mb-6">
          <div className="skeleton w-16 h-16 rounded-full flex-shrink-0" />
          <div className="flex-1">
            <div className="skeleton h-6 w-48 mb-2" />
            <div className="skeleton h-4 w-64 mb-3" />
            <div className="flex gap-2">
              <div className="skeleton h-6 w-16 rounded-full" />
              <div className="skeleton h-6 w-20 rounded-full" />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[...Array(3)].map((_, i) => <div key={i} className="skeleton h-20 rounded-2xl" />)}
        </div>
      </div>
    )

  if (!aluno)
    return (
      <div className="max-w-3xl mx-auto p-6 text-center py-20" style={{ color: 'var(--text-muted)' }}>
        <p className="text-3xl mb-3">👤</p>
        <p className="text-sm">Aluno não encontrado.</p>
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

  return (
    <div className="max-w-3xl mx-auto p-6 animate-fade-in">
      {/* Back */}
      <button
        onClick={() => router.back()}
        className="text-sm flex items-center gap-1 mb-6 transition-colors"
        style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
        onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
        onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
      >
        ← Alunos
      </button>

      {/* Student Header */}
      <div className="flex gap-5 mb-6 animate-slide-up delay-1">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-semibold text-white flex-shrink-0"
          style={{ background: avatarGradient(aluno.nome) }}
        >
          {aluno.foto_url ? (
            <img src={aluno.foto_url} alt="" className="w-full h-full rounded-full object-cover" />
          ) : (
            iniciais(aluno.nome)
          )}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
              {aluno.nome}
            </h1>
            {!aluno.ativo && <span className="badge badge-gray">Inativo</span>}
          </div>
          <p className="text-sm mb-2" style={{ color: 'var(--text-muted)' }}>
            mat. {aluno.matricula} · {aluno.turma_nome}
            {aluno.email ? ` · ${aluno.email}` : ''}
          </p>
          <div className="flex gap-2 flex-wrap">
            {atrasados.length > 0 && (
              <span className="badge badge-red">
                {atrasados.length} atrasado{atrasados.length > 1 ? 's' : ''}
              </span>
            )}
            <span className="badge badge-blue">
              {ativos.length} ativo{ativos.length !== 1 ? 's' : ''}
            </span>
            <span className="badge badge-gray">
              {totalDevolvidos} devolvido{totalDevolvidos !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-3 gap-3 mb-6 animate-slide-up delay-2">
        <div
          className="metric-card"
          style={{ background: atrasados.length > 0 ? 'var(--gradient-rose)' : 'var(--bg-card)' }}
        >
          <p className="text-2xl font-bold font-mono text-white">{atrasados.length}</p>
          <p className="text-xs mt-1 text-white/70">Atrasados</p>
        </div>
        <div className="metric-card" style={{ background: 'var(--gradient-blue)' }}>
          <p className="text-2xl font-bold font-mono text-white">{ativos.length}</p>
          <p className="text-xs mt-1 text-white/70">Em mãos</p>
        </div>
        <div className="metric-card" style={{ background: 'var(--bg-card)' }}>
          <p className="text-2xl font-bold font-mono" style={{ color: 'var(--text-primary)' }}>{emprestimos.length}</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Total histórico</p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center justify-between mb-3 animate-slide-up delay-3">
        <h2 className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
          Histórico de empréstimos
          <span className="ml-1" style={{ color: 'var(--text-muted)', fontWeight: 400 }}>
            ({empFiltrados.length})
          </span>
        </h2>
        <div className="flex gap-1">
          {(['todos', 'ativos', 'devolvidos'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFiltro(f)}
              className="text-xs px-3 py-1 rounded-full transition-all duration-200 capitalize"
              style={{
                background: filtro === f ? 'var(--accent-indigo-glow)' : 'transparent',
                border: `1px solid ${filtro === f ? 'var(--accent-indigo)' : 'var(--border-default)'}`,
                color: filtro === f ? 'var(--accent-indigo-light)' : 'var(--text-muted)',
                fontWeight: filtro === f ? 500 : 400,
              }}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden animate-slide-up delay-4">
        <table className="dark-table">
          <thead>
            <tr>
              {['Livro', 'Saída', 'Prazo', 'Devolução', 'Status'].map((h) => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {empFiltrados.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-12" style={{ color: 'var(--text-muted)' }}>
                  Nenhum empréstimo encontrado
                </td>
              </tr>
            ) : (
              empFiltrados.map((e) => (
                <tr key={e.id} className="cv-auto">
                  <td>
                    <p className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>{e.titulo}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{e.autor}</p>
                  </td>
                  <td style={{ color: 'var(--text-secondary)' }}>{fmt(e.data_saida)}</td>
                  <td style={{
                    color: e.em_atraso ? 'var(--accent-rose)' : 'var(--text-secondary)',
                    fontWeight: e.em_atraso ? 500 : 400,
                  }}>
                    {fmt(e.prazo_final)}
                  </td>
                  <td style={{ color: 'var(--text-secondary)' }}>
                    {e.data_devolucao_real ? fmt(e.data_devolucao_real) : '—'}
                  </td>
                  <td>
                    <span className={`badge ${
                      e.em_atraso ? statusBadge['ATRASADO'] : statusBadge[e.status] ?? 'badge-gray'
                    }`}>
                      {e.em_atraso ? 'Atrasado' : e.status.charAt(0) + e.status.slice(1).toLowerCase()}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Action */}
      {aluno.ativo && (
        <button
          onClick={() => router.push('/emprestimos/novo')}
          className="btn-primary w-full mt-6 py-3.5 animate-slide-up delay-5"
        >
          Novo empréstimo para {aluno.nome.split(' ')[0]}
        </button>
      )}
    </div>
  )
}
