// ── CSV parser minimalista ─────────────────────────────────────────────────
// Suporta delimitadores , ou ; (autodetecta), aspas duplas escapadas como "",
// e quebras de linha dentro de aspas.

function detectarDelimitador(texto: string): ',' | ';' {
  const primeiraLinha = texto.split(/\r?\n/).find(l => l.trim().length > 0) ?? ''
  const virgulas = (primeiraLinha.match(/,/g) ?? []).length
  const pontoEVirgulas = (primeiraLinha.match(/;/g) ?? []).length
  return pontoEVirgulas > virgulas ? ';' : ','
}

export function parseCSV(texto: string): string[][] {
  // Remove BOM
  if (texto.charCodeAt(0) === 0xfeff) texto = texto.slice(1)

  const delim = detectarDelimitador(texto)
  const linhas: string[][] = []
  let atual: string[] = []
  let campo = ''
  let emAspas = false

  for (let i = 0; i < texto.length; i++) {
    const c = texto[i]
    const prox = texto[i + 1]

    if (emAspas) {
      if (c === '"' && prox === '"') {
        campo += '"'
        i++
      } else if (c === '"') {
        emAspas = false
      } else {
        campo += c
      }
    } else {
      if (c === '"') {
        emAspas = true
      } else if (c === delim) {
        atual.push(campo)
        campo = ''
      } else if (c === '\n' || c === '\r') {
        if (c === '\r' && prox === '\n') i++
        atual.push(campo)
        if (atual.length > 1 || atual[0].length > 0) linhas.push(atual)
        atual = []
        campo = ''
      } else {
        campo += c
      }
    }
  }
  if (campo.length > 0 || atual.length > 0) {
    atual.push(campo)
    if (atual.length > 1 || atual[0].length > 0) linhas.push(atual)
  }
  return linhas
}

// Normaliza nome de coluna: minúsculo, sem acento, sem espaços extras
export function normalizarCabecalho(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
}

// Retorna índice da 1ª coluna cujo cabeçalho normalizado bate com qualquer
// alias fornecido (também normalizado).
export function acharColuna(cabecalhos: string[], aliases: string[]): number {
  const normHeaders = cabecalhos.map(normalizarCabecalho)
  const normAliases = aliases.map(normalizarCabecalho)
  for (const a of normAliases) {
    const i = normHeaders.indexOf(a)
    if (i >= 0) return i
  }
  return -1
}

// Converte linhas CSV (com cabeçalho) em array de objetos por nome de coluna
export function csvParaObjetos(linhas: string[][]): Record<string, string>[] {
  if (linhas.length === 0) return []
  const cabecalhos = linhas[0].map(normalizarCabecalho)
  return linhas.slice(1).map(linha => {
    const obj: Record<string, string> = {}
    cabecalhos.forEach((h, i) => { obj[h] = (linha[i] ?? '').trim() })
    return obj
  })
}

// ── CSV para download ──────────────────────────────────────────────────────

function escaparCampo(valor: string): string {
  if (/[",\n;\r]/.test(valor)) {
    return `"${valor.replace(/"/g, '""')}"`
  }
  return valor
}

export function gerarCSV(cabecalhos: string[], linhas: (string | number | null | undefined)[][]): string {
  const partes = [cabecalhos.map(escaparCampo).join(',')]
  for (const linha of linhas) {
    partes.push(linha.map(c => escaparCampo(c == null ? '' : String(c))).join(','))
  }
  return partes.join('\n')
}

export function baixarCSV(nomeArquivo: string, conteudo: string) {
  const blob = new Blob(['\ufeff' + conteudo], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nomeArquivo
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
