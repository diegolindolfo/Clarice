// ── Busca de metadados de livros (Open Library + Google Books) ────────────
// Usado para auto-preencher autor/capa/gênero de títulos incompletos.
// Nenhuma das APIs usadas requer chave.

export type SugestaoLivro = {
  titulo: string
  autor: string | null
  editora: string | null
  genero: string | null
  imagem_url: string | null
  ano: number | null
  isbn: string | null
  fonte: 'openlibrary' | 'googlebooks'
  score: number
}

// ── Open Library ───────────────────────────────────────────────────────────

type OLBook = {
  title: string
  author_name?: string[]
  publisher?: string[]
  subject?: string[]
  first_publish_year?: number
  cover_i?: number
  isbn?: string[]
}

async function buscarOpenLibrary(termo: string): Promise<SugestaoLivro[]> {
  try {
    const url = `https://openlibrary.org/search.json?title=${encodeURIComponent(termo)}&limit=5&language=por`
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
    if (!res.ok) return []
    const json = await res.json()
    const docs: OLBook[] = json.docs ?? []
    return docs.map((d, i) => ({
      titulo: d.title,
      autor: d.author_name?.[0] ?? null,
      editora: d.publisher?.[0] ?? null,
      genero: d.subject?.[0] ?? null,
      imagem_url: d.cover_i ? `https://covers.openlibrary.org/b/id/${d.cover_i}-L.jpg` : null,
      ano: d.first_publish_year ?? null,
      isbn: d.isbn?.[0] ?? null,
      fonte: 'openlibrary' as const,
      // Decai com o ranking do resultado, mas nunca abaixo de 0.
      score: Math.max(0, 1 - i * 0.1),
    }))
  } catch {
    return []
  }
}

// ── Google Books ───────────────────────────────────────────────────────────

type GBVolume = {
  volumeInfo?: {
    title?: string
    authors?: string[]
    publisher?: string
    categories?: string[]
    publishedDate?: string
    imageLinks?: { thumbnail?: string; smallThumbnail?: string }
    industryIdentifiers?: { type: string; identifier: string }[]
  }
}

async function buscarGoogleBooks(termo: string): Promise<SugestaoLivro[]> {
  try {
    const url = `https://www.googleapis.com/books/v1/volumes?q=intitle:${encodeURIComponent(termo)}&maxResults=5&langRestrict=pt`
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
    if (!res.ok) return []
    const json = await res.json()
    const items: GBVolume[] = json.items ?? []
    return items
      .filter(v => v.volumeInfo?.title)
      .map((v, i) => {
        const info = v.volumeInfo!
        const thumb = info.imageLinks?.thumbnail ?? info.imageLinks?.smallThumbnail ?? null
        // Google Books retorna http:// por padrão — força https
        const imagem = thumb ? thumb.replace(/^http:\/\//, 'https://') : null
        const ano = info.publishedDate ? Number(info.publishedDate.slice(0, 4)) : null
        const isbn =
          info.industryIdentifiers?.find(x => x.type === 'ISBN_13')?.identifier ??
          info.industryIdentifiers?.find(x => x.type === 'ISBN_10')?.identifier ??
          null
        return {
          titulo: info.title!,
          autor: info.authors?.[0] ?? null,
          editora: info.publisher ?? null,
          genero: info.categories?.[0] ?? null,
          imagem_url: imagem,
          ano: Number.isFinite(ano) ? ano : null,
          isbn,
          fonte: 'googlebooks' as const,
          score: Math.max(0, 1 - i * 0.1),
        }
      })
  } catch {
    return []
  }
}

// ── API pública ────────────────────────────────────────────────────────────

export async function buscarSugestoes(termo: string): Promise<SugestaoLivro[]> {
  if (!termo || termo.trim().length < 2) return []
  const [a, b] = await Promise.all([
    buscarOpenLibrary(termo),
    buscarGoogleBooks(termo),
  ])
  // Intercala as duas fontes, mantendo score
  return [...a, ...b].sort((x, y) => y.score - x.score).slice(0, 10)
}
