import { buscarTodasPaginas, type createClient } from '@/lib/supabase'
import { hojeLocal, partesDataLocal } from '@/lib/utils'

export type Resumo = {
  emprestados: number
  renovados: number
  atrasados: number
  devolvidos_mes: number
  total_mes: number
  alunos_ativos: number
}

export type PorTurma = { turma: string; total: number }
export type LivroTop = { titulo: string; autor: string; total: number }
export type AtrasadoPorTurma = { turma: string; total: number }
export type AlunoLeitor = { matricula: number; nome: string; turma: string; total: number }
export type Periodo = 'mes' | 'mes_passado' | 'ano'

export type DadosDashboard = {
  resumo: Resumo
  porTurma: PorTurma[]
  livrosTop: LivroTop[]
  atrasados: AtrasadoPorTurma[]
  leitores: AlunoLeitor[]
}

type SupabaseLike = ReturnType<typeof createClient>

type PainelRow = {
  turma: string | null
  titulo: string | null
  autor: string | null
  matricula: number | null
  aluno_nome: string | null
}

function formatYMD(ano: number, mesZeroBased: number, dia: number): string {
  return `${ano}-${String(mesZeroBased + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
}

export async function carregarDadosDashboard(
  supabase: SupabaseLike,
  periodo: Periodo,
): Promise<DadosDashboard> {
  const { ano, mes } = partesDataLocal()
  const hoje = hojeLocal()

  let dataInicio: string
  let dataFim: string

  if (periodo === 'mes') {
    dataInicio = formatYMD(ano, mes, 1)
    dataFim = hoje
  } else if (periodo === 'mes_passado') {
    const anoAnt = mes === 0 ? ano - 1 : ano
    const mesAnt = mes === 0 ? 11 : mes - 1
    const ultimoDiaMesAnt = new Date(Date.UTC(ano, mes, 0)).getUTCDate()
    dataInicio = formatYMD(anoAnt, mesAnt, 1)
    dataFim = formatYMD(anoAnt, mesAnt, ultimoDiaMesAnt)
  } else {
    dataInicio = formatYMD(ano, 0, 1)
    dataFim = hoje
  }

  const [r1, r2, r4, r6, painelRes, atrasTurma] = await Promise.all([
    supabase.from('emprestimos').select('*', { count: 'exact', head: true }).eq('status', 'EMPRESTADO'),
    supabase.from('emprestimos').select('*', { count: 'exact', head: true }).eq('status', 'RENOVADO'),
    supabase
      .from('emprestimos')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'DEVOLVIDO')
      .gte('data_devolucao_real', dataInicio)
      .lte('data_devolucao_real', dataFim),
    supabase.from('alunos').select('*', { count: 'exact', head: true }).eq('ativo', true),
    buscarTodasPaginas<PainelRow>((from, to) =>
      supabase
        .from('vw_painel_aluno')
        .select('turma, titulo, autor, matricula, aluno_nome')
        .gte('data_saida', dataInicio)
        .lte('data_saida', dataFim)
        .range(from, to),
    ),
    buscarTodasPaginas<{ turma: string | null }>((from, to) =>
      supabase.from('vw_emprestimos_atrasados').select('turma').range(from, to),
    ),
  ])

  const firstError = r1.error ?? r2.error ?? r4.error ?? r6.error ?? painelRes.error ?? atrasTurma.error
  if (firstError) throw firstError

  const painelRows = painelRes.data
  const atrasRows = atrasTurma.data

  const contTurma: Record<string, number> = {}
  const contLivros: Record<string, { autor: string; total: number }> = {}
  const contAlunos: Record<number, { nome: string; turma: string; total: number }> = {}

  for (const row of painelRows) {
    if (row.turma) contTurma[row.turma] = (contTurma[row.turma] ?? 0) + 1
    if (row.titulo) {
      if (!contLivros[row.titulo]) contLivros[row.titulo] = { autor: row.autor ?? '', total: 0 }
      contLivros[row.titulo].total++
    }
    if (row.matricula) {
      if (!contAlunos[row.matricula]) {
        contAlunos[row.matricula] = { nome: row.aluno_nome ?? '', turma: row.turma ?? '', total: 0 }
      }
      contAlunos[row.matricula].total++
    }
  }

  const contAtraso: Record<string, number> = {}
  for (const { turma } of atrasRows) {
    if (turma) contAtraso[turma] = (contAtraso[turma] ?? 0) + 1
  }

  return {
    resumo: {
      emprestados: r1.count ?? 0,
      renovados: r2.count ?? 0,
      atrasados: atrasRows.length,
      devolvidos_mes: r4.count ?? 0,
      total_mes: painelRows.length,
      alunos_ativos: r6.count ?? 0,
    },
    porTurma: Object.entries(contTurma)
      .map(([turma, total]) => ({ turma, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8),
    livrosTop: Object.entries(contLivros)
      .map(([titulo, v]) => ({ titulo, ...v }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5),
    atrasados: Object.entries(contAtraso)
      .map(([turma, total]) => ({ turma, total }))
      .sort((a, b) => b.total - a.total),
    leitores: Object.entries(contAlunos)
      .map(([mat, v]) => ({ matricula: Number(mat), nome: v.nome, turma: v.turma, total: v.total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5),
  }
}
