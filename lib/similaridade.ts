// ── Similaridade de títulos ────────────────────────────────────────────────
// Usado para detectar possíveis duplicatas no acervo.

const STOPWORDS_INICIAIS = new Set([
  'a', 'o', 'os', 'as', 'um', 'uma', 'uns', 'umas', 'the', 'el', 'la',
])

// Normaliza: minúsculo, sem acento, sem pontuação, sem artigo inicial,
// colapsa espaços.
export function normalizarTitulo(s: string): string {
  const base = s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  const tokens = base.split(' ')
  if (tokens.length > 1 && STOPWORDS_INICIAIS.has(tokens[0])) tokens.shift()
  return tokens.join(' ')
}

// Trigrams (3-char shingles) usados para Jaccard
export function trigrams(s: string): Set<string> {
  const n = normalizarTitulo(s).replace(/\s+/g, ' ')
  const padded = `  ${n}  `
  const set = new Set<string>()
  for (let i = 0; i < padded.length - 2; i++) {
    set.add(padded.slice(i, i + 3))
  }
  return set
}

export function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1
  let inter = 0
  for (const x of a) if (b.has(x)) inter++
  const uni = a.size + b.size - inter
  return uni === 0 ? 0 : inter / uni
}

// Agrupa títulos em grupos suspeitos de duplicata.
// Parâmetro threshold é o mínimo de similaridade Jaccard para juntar.
export type ItemTitulo = { id: string; titulo: string; autor?: string | null }

export type GrupoDuplicata = {
  chave: string // titulo normalizado do "representante" (pra ordenação)
  itens: ItemTitulo[]
  exato: boolean // true se todos têm o mesmo titulo normalizado
  similaridadeMinima: number
}

export function detectarDuplicatas(itens: ItemTitulo[], threshold = 0.85): GrupoDuplicata[] {
  const semTitulo = itens.filter(i => !i.titulo || normalizarTitulo(i.titulo).length < 2)
  const validos = itens.filter(i => i.titulo && normalizarTitulo(i.titulo).length >= 2)

  // 1) Duplicatas exatas por título normalizado
  const porNorm = new Map<string, ItemTitulo[]>()
  for (const it of validos) {
    const n = normalizarTitulo(it.titulo)
    if (!porNorm.has(n)) porNorm.set(n, [])
    porNorm.get(n)!.push(it)
  }

  const grupos: GrupoDuplicata[] = []
  const jaAgrupados = new Set<string>()

  for (const [chave, lista] of porNorm.entries()) {
    if (lista.length >= 2) {
      grupos.push({ chave, itens: lista, exato: true, similaridadeMinima: 1 })
      for (const i of lista) jaAgrupados.add(i.id)
    }
  }

  // 2) Duplicatas aproximadas via Jaccard de trigrams.
  // Pré-computa trigrams de todos os itens restantes.
  const restantes = validos.filter(i => !jaAgrupados.has(i.id))
  const trigs = new Map<string, Set<string>>()
  for (const it of restantes) trigs.set(it.id, trigrams(it.titulo))

  // Union-find simplificado
  const pai: Record<string, string> = {}
  function find(x: string): string {
    while (pai[x] && pai[x] !== x) {
      pai[x] = pai[pai[x]]
      x = pai[x]
    }
    return x
  }
  function unir(a: string, b: string) {
    const ra = find(a), rb = find(b)
    if (ra !== rb) pai[ra] = rb
  }
  for (const it of restantes) pai[it.id] = it.id

  // Bucket por primeira palavra normalizada (muito mais rápido que NxN total)
  const bucket: Record<string, ItemTitulo[]> = {}
  for (const it of restantes) {
    const primeira = normalizarTitulo(it.titulo).split(' ')[0] ?? ''
    const chaveBucket = primeira.slice(0, 3) || '___'
    if (!bucket[chaveBucket]) bucket[chaveBucket] = []
    bucket[chaveBucket].push(it)
  }

  const similaridadePorPar: Record<string, number> = {}
  for (const lista of Object.values(bucket)) {
    for (let i = 0; i < lista.length; i++) {
      const a = lista[i]
      const ta = trigs.get(a.id)!
      for (let j = i + 1; j < lista.length; j++) {
        const b = lista[j]
        const tb = trigs.get(b.id)!
        // Pré-filtro: tamanhos muito diferentes → pula
        if (Math.abs(ta.size - tb.size) / Math.max(ta.size, tb.size) > 1 - threshold) continue
        const s = jaccard(ta, tb)
        if (s >= threshold) {
          unir(a.id, b.id)
          similaridadePorPar[`${a.id}|${b.id}`] = s
        }
      }
    }
  }

  // Coletar grupos aproximados
  const gruposAprox: Record<string, ItemTitulo[]> = {}
  for (const it of restantes) {
    const r = find(it.id)
    if (!gruposAprox[r]) gruposAprox[r] = []
    gruposAprox[r].push(it)
  }

  for (const lista of Object.values(gruposAprox)) {
    if (lista.length >= 2) {
      let min = 1
      for (let i = 0; i < lista.length; i++) {
        for (let j = i + 1; j < lista.length; j++) {
          const chave = `${lista[i].id}|${lista[j].id}`
          const chave2 = `${lista[j].id}|${lista[i].id}`
          const s = similaridadePorPar[chave] ?? similaridadePorPar[chave2]
          if (s != null && s < min) min = s
        }
      }
      grupos.push({
        chave: normalizarTitulo(lista[0].titulo),
        itens: lista,
        exato: false,
        similaridadeMinima: min,
      })
    }
  }

  // Ordena: exatos primeiro, depois por tamanho do grupo desc
  grupos.sort((a, b) => {
    if (a.exato !== b.exato) return a.exato ? -1 : 1
    return b.itens.length - a.itens.length
  })

  return grupos
}

// Avisos: não usamos `semTitulo` diretamente aqui, mas a função consumidora
// pode apresentar esses itens separadamente se quiser.
export function tituloInvalidos(itens: ItemTitulo[]): ItemTitulo[] {
  return itens.filter(i => !i.titulo || normalizarTitulo(i.titulo).length < 2)
}
