// Tipos de banco inferidos manualmente das migrations do Supabase + uso real
// no app. NÃO é gerado automaticamente — para regerar, rode:
//
//   supabase gen types typescript --project-id <REF> --schema public \
//     > types/database.generated.ts
//
// e atualize os tipos abaixo, ou substitua o conteúdo deste arquivo por:
//
//   export type { Database } from './database.generated'
//   export type Tables<T extends keyof Database['public']['Tables']> = ...
//
// Mantemos esta versão manual para evitar dependência online e para que o
// type-check rode localmente sem credenciais Supabase.

// ---------------------------------------------------------------------------
// Tabelas
// ---------------------------------------------------------------------------

export type Turma = {
  id: number
  nome: string
}

export type Aluno = {
  matricula: number
  nome: string
  turma_id: number | null
  foto_url: string | null
  ativo: boolean
}

/** Aluno + embed `turmas(...)` (Supabase pode devolver array ou objeto). */
export type AlunoComTurma = Aluno & {
  turmas: Turma | Turma[] | null
}

export type EmprestimoStatus = 'EMPRESTADO' | 'RENOVADO' | 'DEVOLVIDO'

export type Emprestimo = {
  id: string
  aluno_matricula: number
  aluno_nome: string | null
  sala_na_data: string | null
  exemplar_id: string
  status: EmprestimoStatus
  data_saida: string
  data_devolucao_prevista: string
  data_devolucao_renovada: string | null
  data_devolucao_real: string | null
  renovado_em: string | null
}

export type AcervoRow = {
  id: string
  titulo: string
  autor: string | null
  editora: string | null
  genero: string | null
  categoria: string | null
  tipo: string | null
  cdd: string | null
  serie: string | null
  descricao: string | null
  imagem_url: string | null
}

export type LivroExemplar = {
  id: string
  acervo_id: string
  tombo: number | null
  volume: number | null
  edicao: number | null
  disponivel: boolean
  emprestado: boolean
}

/** Exemplar + embed `acervo(...)`. */
export type LivroExemplarComAcervo = LivroExemplar & {
  acervo: AcervoRow | AcervoRow[] | null
}

// ---------------------------------------------------------------------------
// Views (somente leitura)
// ---------------------------------------------------------------------------

export type ViewPainelAluno = {
  emprestimo_id: string
  matricula: number
  aluno_nome: string
  turma: string | null
  titulo: string
  autor: string | null
  tipo: string | null
  genero: string | null
  imagem_url: string | null
  data_saida: string
  data_devolucao_real: string | null
  prazo_final: string | null
  status: EmprestimoStatus
}

export type ViewEmprestimoAtrasado = {
  matricula: number
  aluno_nome: string
  turma: string | null
  titulo: string
  data_saida: string
  prazo_final: string
  dias_atraso: number
}

export type ViewAcervoCatalogo = AcervoRow & {
  total_exemplares: number
  disponiveis: number
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Embeds Supabase (`relation(*)`) podem vir como objeto único ou como array
 *  dependendo da relação detectada. Este helper desambigua. */
export function pickRelation<T>(rel: T | T[] | null | undefined): T | null {
  if (!rel) return null
  return Array.isArray(rel) ? (rel[0] ?? null) : rel
}

// ---------------------------------------------------------------------------
// Resposta da RPC `get_passaporte`
// ---------------------------------------------------------------------------

export type PassaporteAluno = {
  matricula: number
  nome: string
  turma: string | null
  turma_id: number | null
  foto_url: string | null
  ativo: boolean
}

export type PassaporteCarimbo = {
  emprestimo_id: string
  titulo: string
  autor: string | null
  tipo: string | null
  genero: string | null
  imagem_url: string | null
  data_saida: string
  data_devolucao_real: string | null
  prazo_final: string | null
  status: EmprestimoStatus
}

export type PassaporteRanking = {
  geral: number | null
  geralTotal: number | null
  turma: number | null
  turmaTotal: number | null
  totalAluno: number
}

export type PassaporteResponse = {
  aluno: PassaporteAluno | null
  carimbos: PassaporteCarimbo[]
  ranking: PassaporteRanking
}
