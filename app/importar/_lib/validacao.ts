import { normalizarCabecalho } from '@/lib/csv'

export type LinhaProcessada = {
  numero: number
  dados: Record<string, string>
  erros: string[]
  avisos: string[]
  valido: boolean
}

export type Turma = { id: number; nome: string; norm: string }

const TIPOS_VALIDOS = new Set([
  'literatura', 'paradid\u00e1tico', 'paradidatico',
  't\u00e9cnico', 'tecnico', 'did\u00e1tico', 'didatico',
  'filosofia', 'outro',
])
const AQUISICAO_VALIDOS = new Set([
  'pnld', 'doa\u00e7\u00e3o', 'doacao', 'compra',
  'gest\u00e3o', 'gestao', 'permuta', 'outro',
])

// Aliases aceitos em cabe\u00e7alhos (tudo \u00e9 normalizado antes)
export const ALIASES_ALUNO: Record<string, string[]> = {
  matricula: ['matricula', 'matr\u00edcula', 'mat'],
  nome: ['nome', 'aluno', 'aluno_nome', 'nome_aluno', 'nome_completo'],
  turma: ['turma', 'classe', 'serie', 's\u00e9rie', 'turma_nome'],
  email: ['email', 'e-mail', 'email_aluno'],
}

export const ALIASES_ACERVO: Record<string, string[]> = {
  titulo: ['titulo', 't\u00edtulo', 'title', 'obra', 'livro'],
  autor: ['autor', 'autores', 'author'],
  editora: ['editora', 'publisher'],
  cdd: ['cdd', 'codigo_cdd', 'c\u00f3digo_cdd'],
  tipo: ['tipo', 'categoria_obra'],
  genero: ['genero', 'g\u00eanero', 'genre'],
  categoria: ['categoria', 'subcategoria'],
  serie: ['serie_colecao', 'serie', 'cole\u00e7\u00e3o', 'colecao', 's\u00e9rie_cole\u00e7\u00e3o'],
  descricao: ['descricao', 'descri\u00e7\u00e3o', 'resumo', 'sinopse'],
  imagem_url: ['imagem_url', 'capa', 'imagem', 'url_capa', 'capa_url'],
  tombo: ['tombo', 'exemplar_tombo', 'numero_tombo'],
  aquisicao: ['aquisicao', 'aquisi\u00e7\u00e3o', 'origem'],
  volume: ['volume', 'vol'],
  edicao: ['edicao', 'edi\u00e7\u00e3o'],
  isbn: ['isbn'],
}

export function resolverAlias(
  obj: Record<string, string>,
  aliases: Record<string, string[]>,
): Record<string, string> {
  const res: Record<string, string> = {}
  for (const [k, lista] of Object.entries(aliases)) {
    for (const nome of lista) {
      const norm = normalizarCabecalho(nome)
      if (norm in obj && obj[norm] !== undefined && obj[norm] !== '') {
        res[k] = obj[norm]
        break
      }
    }
    if (!(k in res)) res[k] = ''
  }
  return res
}

export function validarAlunos(
  objs: Record<string, string>[],
  ctx: { turmas: Turma[]; matriculasExistentes: Set<number> },
): LinhaProcessada[] {
  const vistos = new Set<number>()
  return objs.map((obj, i) => {
    const dados = resolverAlias(obj, ALIASES_ALUNO)
    const erros: string[] = []
    const avisos: string[] = []

    const mat = dados.matricula.replace(/\D+/g, '')
    if (!mat) {
      erros.push('matr\u00edcula faltando ou inv\u00e1lida')
    } else {
      const num = Number(mat)
      if (vistos.has(num)) erros.push('matr\u00edcula duplicada no CSV')
      vistos.add(num)
      if (ctx.matriculasExistentes.has(num)) avisos.push('matr\u00edcula j\u00e1 existe (ser\u00e1 atualizada)')
    }

    if (!dados.nome || dados.nome.length < 2) erros.push('nome obrigat\u00f3rio')

    if (!dados.turma) {
      erros.push('turma obrigat\u00f3ria')
    } else {
      const normTurma = normalizarCabecalho(dados.turma)
      const achou = ctx.turmas.find(t => t.norm === normTurma)
      if (!achou) avisos.push(`turma "${dados.turma}" ser\u00e1 criada`)
    }

    if (dados.email && !/^\S+@\S+\.\S+$/.test(dados.email)) {
      avisos.push('e-mail com formato suspeito')
    }

    return {
      numero: i + 2, // +2 porque linha 1 = header
      dados,
      erros,
      avisos,
      valido: erros.length === 0,
    }
  })
}

export function validarAcervo(objs: Record<string, string>[]): LinhaProcessada[] {
  const tombosVistos = new Set<number>()
  return objs.map((obj, i) => {
    const dados = resolverAlias(obj, ALIASES_ACERVO)
    const erros: string[] = []
    const avisos: string[] = []

    if (!dados.titulo || dados.titulo.length < 2) erros.push('t\u00edtulo obrigat\u00f3rio')

    if (dados.tipo) {
      const norm = normalizarCabecalho(dados.tipo)
      if (!TIPOS_VALIDOS.has(norm)) avisos.push(`tipo "${dados.tipo}" n\u00e3o \u00e9 padr\u00e3o`)
    }

    if (dados.tombo) {
      const t = dados.tombo.replace(/\D+/g, '')
      if (!t) {
        avisos.push('tombo inv\u00e1lido (ignorado)')
      } else {
        const num = Number(t)
        if (tombosVistos.has(num)) erros.push('tombo duplicado no CSV')
        tombosVistos.add(num)
      }
    }

    if (dados.aquisicao) {
      const norm = normalizarCabecalho(dados.aquisicao)
      if (!AQUISICAO_VALIDOS.has(norm)) avisos.push(`aquisi\u00e7\u00e3o "${dados.aquisicao}" n\u00e3o \u00e9 padr\u00e3o`)
    }

    return {
      numero: i + 2,
      dados,
      erros,
      avisos,
      valido: erros.length === 0,
    }
  })
}
