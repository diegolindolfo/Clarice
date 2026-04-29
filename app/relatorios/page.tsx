'use client'
import { useEffect, useState, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase'
import { fmt } from '@/lib/utils'
import { toast_success, toast_error } from '@/components/Toast'

type ResumoMensal = {
  mes: string
  label: string
  emprestimos: number
  devolucoes: number
  renovacoes: number
  livrosMaisEmprestados: { titulo: string; autor: string; total: number }[]
  turmasMaisAtivas: { turma: string; total: number }[]
  alunosMaisLeitores: { nome: string; turma: string; total: number }[]
}

const MESES_PT = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

function mesLabel(m: string): string {
  const [y, mo] = m.split('-').map(Number)
  return `${MESES_PT[mo - 1]} ${y}`
}

function gerarMeses(qtd: number): string[] {
  const meses: string[] = []
  const hoje = new Date()
  for (let i = 0; i < qtd; i++) {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1)
    meses.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }
  return meses
}

export default function RelatoriosPage() {
  const [resumos, setResumos]         = useState<ResumoMensal[]>([])
  const [mesSelecionado, setMesSelecionado] = useState('')
  const [carregando, setCarregando]   = useState(true)
  const [exportando, setExportando]   = useState(false)

  // Memoizado para satisfazer exhaustive-deps no useCallback abaixo.
  const mesesDisponiveis = useMemo(() => gerarMeses(6), [])

  const carregar = useCallback(async () => {
    setCarregando(true)
    const supabase = createClient()

    async function carregarMes(mes: string): Promise<ResumoMensal> {
      const [y, m] = mes.split('-').map(Number)
      const inicio = `${mes}-01`
      const fim_date = new Date(y, m, 0)
      const fim = `${y}-${String(m).padStart(2, '0')}-${String(fim_date.getDate()).padStart(2, '0')}`

      const [empRes, devRes, renRes, livrosRes, turmasRes, alunosRes] = await Promise.all([
        supabase.from('emprestimos').select('*', { count: 'exact', head: true }).gte('data_saida', inicio).lte('data_saida', fim),
        supabase.from('emprestimos').select('*', { count: 'exact', head: true }).eq('status', 'DEVOLVIDO').gte('data_devolucao_real', inicio).lte('data_devolucao_real', fim),
        supabase.from('emprestimos').select('*', { count: 'exact', head: true }).not('renovado_em', 'is', null).gte('renovado_em', inicio).lte('renovado_em', fim),
        supabase.from('vw_painel_aluno').select('titulo, autor').gte('data_saida', inicio).lte('data_saida', fim),
        supabase.from('vw_painel_aluno').select('turma').gte('data_saida', inicio).lte('data_saida', fim),
        supabase.from('vw_painel_aluno').select('aluno_nome, turma, matricula').gte('data_saida', inicio).lte('data_saida', fim),
      ])

      type LivroRow = { titulo: string | null; autor: string | null }
      type TurmaRow = { turma: string | null }
      type AlunoRow = { aluno_nome: string | null; turma: string | null; matricula: number | null }

      // Contabilizar livros top
      const livrosMap: Record<string, { titulo: string; autor: string; total: number }> = {}
      ;((livrosRes.data ?? []) as LivroRow[]).forEach(e => {
        const key = e.titulo ?? ''
        if (!livrosMap[key]) livrosMap[key] = { titulo: key, autor: e.autor ?? '', total: 0 }
        livrosMap[key].total++
      })
      const livrosTop = Object.values(livrosMap).sort((a, b) => b.total - a.total).slice(0, 5)

      // Turmas
      const turmasMap: Record<string, number> = {}
      ;((turmasRes.data ?? []) as TurmaRow[]).forEach(e => { turmasMap[e.turma ?? ''] = (turmasMap[e.turma ?? ''] ?? 0) + 1 })
      const turmasTop = Object.entries(turmasMap).map(([t, n]) => ({ turma: t, total: n })).sort((a, b) => b.total - a.total).slice(0, 5)

      // Alunos
      const alunosMap: Record<number, { nome: string; turma: string; total: number }> = {}
      ;((alunosRes.data ?? []) as AlunoRow[]).forEach(e => {
        if (!e.matricula) return
        if (!alunosMap[e.matricula]) alunosMap[e.matricula] = { nome: e.aluno_nome ?? '', turma: e.turma ?? '', total: 0 }
        alunosMap[e.matricula].total++
      })
      const alunosTop = Object.values(alunosMap).sort((a, b) => b.total - a.total).slice(0, 5)

      return {
        mes,
        label: mesLabel(mes),
        emprestimos: empRes.count ?? 0,
        devolucoes: devRes.count ?? 0,
        renovacoes: renRes.count ?? 0,
        livrosMaisEmprestados: livrosTop,
        turmasMaisAtivas: turmasTop,
        alunosMaisLeitores: alunosTop,
      }
    }

    // Carregar todos os 6 meses em paralelo (antes era sequencial)
    const resultados = await Promise.all(mesesDisponiveis.map(carregarMes))

    setResumos(resultados)
    setCarregando(false)
  }, [mesesDisponiveis])

  useEffect(() => { carregar() }, [carregar])

  // Default para o primeiro mês; não precisa virar state, é derivado.
  const mesAtivo = mesSelecionado || mesesDisponiveis[0]
  const resumo = resumos.find(r => r.mes === mesAtivo)

  async function exportarPDF() {
    if (!resumo) return
    setExportando(true)

    try {
      const jsPDF     = (await import('jspdf')).default
      const autoTable = (await import('jspdf-autotable')).default

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const hoje = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })

      // Header
      doc.setFillColor(12, 68, 124)
      doc.rect(0, 0, 210, 28, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(16); doc.setFont('helvetica', 'bold')
      doc.text('Clarice — Relatório Mensal', 14, 12)
      doc.setFontSize(11); doc.setFont('helvetica', 'normal')
      doc.text(resumo.label, 14, 20)
      doc.setFontSize(9)
      doc.text(`Gerado em ${hoje}`, 196, 12, { align: 'right' })

      // Resumo geral
      let y = 36
      doc.setTextColor(40, 40, 40)
      doc.setFontSize(12); doc.setFont('helvetica', 'bold')
      doc.text('Resumo Geral', 14, y); y += 8

      doc.setFontSize(10); doc.setFont('helvetica', 'normal')
      doc.text(`Empréstimos realizados: ${resumo.emprestimos}`, 14, y); y += 6
      doc.text(`Devoluções: ${resumo.devolucoes}`, 14, y); y += 6
      doc.text(`Renovações: ${resumo.renovacoes}`, 14, y); y += 12

      // Livros mais emprestados
      if (resumo.livrosMaisEmprestados.length > 0) {
        doc.setFontSize(12); doc.setFont('helvetica', 'bold')
        doc.text('Livros Mais Emprestados', 14, y); y += 2

        autoTable(doc, {
          startY: y,
          head: [['#', 'Título', 'Autor', 'Empréstimos']],
          body: resumo.livrosMaisEmprestados.map((l, i) => [String(i + 1), l.titulo, l.autor, String(l.total)]),
          headStyles: { fillColor: [12, 68, 124], fontSize: 9 },
          bodyStyles: { fontSize: 9 },
          columnStyles: { 0: { cellWidth: 10, halign: 'center' }, 3: { cellWidth: 25, halign: 'center', fontStyle: 'bold' } },
          margin: { left: 14, right: 14 },
        })

        y = doc.lastAutoTable.finalY + 10
      }

      // Turmas mais ativas
      if (resumo.turmasMaisAtivas.length > 0) {
        doc.setFontSize(12); doc.setFont('helvetica', 'bold')
        doc.text('Turmas Mais Ativas', 14, y); y += 2

        autoTable(doc, {
          startY: y,
          head: [['Turma', 'Empréstimos']],
          body: resumo.turmasMaisAtivas.map(t => [t.turma, String(t.total)]),
          headStyles: { fillColor: [12, 68, 124], fontSize: 9 },
          bodyStyles: { fontSize: 9 },
          columnStyles: { 1: { cellWidth: 30, halign: 'center', fontStyle: 'bold' } },
          margin: { left: 14, right: 14 },
        })

        y = doc.lastAutoTable.finalY + 10
      }

      // Top leitores
      if (resumo.alunosMaisLeitores.length > 0) {
        doc.setFontSize(12); doc.setFont('helvetica', 'bold')
        doc.text('Top Leitores', 14, y); y += 2

        autoTable(doc, {
          startY: y,
          head: [['Aluno', 'Turma', 'Empréstimos']],
          body: resumo.alunosMaisLeitores.map(a => [a.nome, a.turma, String(a.total)]),
          headStyles: { fillColor: [12, 68, 124], fontSize: 9 },
          bodyStyles: { fontSize: 9 },
          columnStyles: { 2: { cellWidth: 30, halign: 'center', fontStyle: 'bold' } },
          margin: { left: 14, right: 14 },
        })
      }

      // Footer
      const totalPaginas = doc.getNumberOfPages()
      for (let i = 1; i <= totalPaginas; i++) {
        doc.setPage(i); doc.setFontSize(7); doc.setTextColor(150)
        doc.text(`Clarice — Biblioteca Escolar  ·  ${resumo.label}  ·  Página ${i} de ${totalPaginas}`, 105, 290, { align: 'center' })
      }

      doc.save(`relatorio_${resumo.mes}.pdf`)
      toast_success('Relatório PDF gerado com sucesso!')
    } catch (e: unknown) {
      toast_error(e instanceof Error ? e.message : 'Erro ao gerar PDF')
    } finally {
      setExportando(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-medium">Relatórios</h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Estatísticas mensais de uso da biblioteca</p>
        </div>
        <button
          onClick={exportarPDF}
          disabled={exportando || !resumo}
          className="border text-sm px-4 py-2 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          {exportando ? 'Gerando...' : '↓ Exportar PDF'}
        </button>
      </div>

      {/* Seletor de mês */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        {mesesDisponiveis.map(m => (
          <button
            key={m}
            onClick={() => setMesSelecionado(m)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors whitespace-nowrap ${
              mesAtivo === m
                ? 'border-gray-400 bg-gray-100 font-medium'
                : 'border-gray-200 hover:border-gray-300'
            }`}
            style={{ color: mesAtivo === m ? 'var(--text-primary)' : 'var(--text-secondary)' }}
          >
            {mesLabel(m)}
          </button>
        ))}
      </div>

      {carregando ? (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            {[1,2,3].map(i => <div key={i} className="rounded-xl p-6 bg-gray-50 animate-pulse h-20" />)}
          </div>
          <div className="h-48 bg-gray-50 rounded-xl animate-pulse" />
        </div>
      ) : !resumo ? (
        <p className="text-center py-10 text-sm" style={{ color: 'var(--text-muted)' }}>Nenhum dado para este mês</p>
      ) : (
        <>
          {/* Cards de resumo */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            {[
              { label: 'Empréstimos', valor: resumo.emprestimos, icone: '📖' },
              { label: 'Devoluções', valor: resumo.devolucoes, icone: '✓' },
              { label: 'Renovações', valor: resumo.renovacoes, icone: '↻' },
            ].map(({ label, valor, icone }) => (
              <div key={label} className="rounded-xl p-4 bg-gray-50 text-center">
                <span className="text-lg" aria-hidden="true">{icone}</span>
                <p className="text-2xl font-mono font-medium mt-1">{valor}</p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>{label}</p>
              </div>
            ))}
          </div>

          {/* Ranking grids */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Livros */}
            <div className="border rounded-xl overflow-hidden">
              <div className="bg-gray-50 px-4 py-2.5">
                <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>📚 Livros mais emprestados</p>
              </div>
              {resumo.livrosMaisEmprestados.length === 0 ? (
                <p className="text-center py-6 text-xs" style={{ color: 'var(--text-muted)' }}>Sem dados</p>
              ) : resumo.livrosMaisEmprestados.map((l, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-2.5 border-t text-sm">
                  <span className="text-xs font-mono w-5 text-center" style={{ color: 'var(--text-muted)' }}>{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{l.titulo}</p>
                    <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{l.autor}</p>
                  </div>
                  <span className="font-mono font-medium text-sm">{l.total}</span>
                </div>
              ))}
            </div>

            {/* Turmas */}
            <div className="border rounded-xl overflow-hidden">
              <div className="bg-gray-50 px-4 py-2.5">
                <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>🏫 Turmas mais ativas</p>
              </div>
              {resumo.turmasMaisAtivas.length === 0 ? (
                <p className="text-center py-6 text-xs" style={{ color: 'var(--text-muted)' }}>Sem dados</p>
              ) : resumo.turmasMaisAtivas.map((t, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-2.5 border-t text-sm">
                  <span className="text-xs font-mono w-5 text-center" style={{ color: 'var(--text-muted)' }}>{i + 1}</span>
                  <span className="flex-1">{t.turma}</span>
                  <span className="font-mono font-medium">{t.total}</span>
                </div>
              ))}
            </div>

            {/* Alunos */}
            <div className="border rounded-xl overflow-hidden">
              <div className="bg-gray-50 px-4 py-2.5">
                <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>🏆 Top leitores</p>
              </div>
              {resumo.alunosMaisLeitores.length === 0 ? (
                <p className="text-center py-6 text-xs" style={{ color: 'var(--text-muted)' }}>Sem dados</p>
              ) : resumo.alunosMaisLeitores.map((a, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-2.5 border-t text-sm">
                  <span className="text-xs font-mono w-5 text-center" style={{ color: 'var(--text-muted)' }}>{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{a.nome}</p>
                    <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{a.turma}</p>
                  </div>
                  <span className="font-mono font-medium">{a.total}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Comparativo mensal */}
          <div className="mt-6 border rounded-xl overflow-hidden">
            <div className="bg-gray-50 px-4 py-2.5">
              <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>📊 Comparativo dos últimos 6 meses</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[500px]">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-2 text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Mês</th>
                    <th className="text-center px-4 py-2 text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Empréstimos</th>
                    <th className="text-center px-4 py-2 text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Devoluções</th>
                    <th className="text-center px-4 py-2 text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Renovações</th>
                  </tr>
                </thead>
                <tbody>
                  {resumos.map(r => (
                    <tr key={r.mes} className={`border-t ${r.mes === mesAtivo ? 'bg-blue-50' : ''}`}>
                      <td className="px-4 py-2 font-medium">{r.label}</td>
                      <td className="px-4 py-2 text-center font-mono">{r.emprestimos}</td>
                      <td className="px-4 py-2 text-center font-mono">{r.devolucoes}</td>
                      <td className="px-4 py-2 text-center font-mono">{r.renovacoes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
