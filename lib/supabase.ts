import { createBrowserClient } from '@supabase/ssr'

let client: ReturnType<typeof createBrowserClient> | null = null

export function createClient() {
  if (!client) {
    client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }
  return client
}

/**
 * Percorre todas as páginas de uma query Supabase via `.range(from, to)`,
 * evitando o truncamento silencioso no limite padrão de 1000 linhas do PostgREST.
 */
export async function buscarTodasPaginas<T>(
  fetchPage: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
  pageSize = 1000,
): Promise<{ data: T[]; error: unknown }> {
  const acumulado: T[] = []
  let from = 0

  while (true) {
    const to = from + pageSize - 1
    const { data, error } = await fetchPage(from, to)
    if (error) return { data: acumulado, error }
    if (!data || data.length === 0) break
    acumulado.push(...data)
    if (data.length < pageSize) break
    from += pageSize
  }

  return { data: acumulado, error: null }
}
