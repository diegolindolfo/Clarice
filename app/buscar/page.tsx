'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

type LivroResumo = {
  id: string
  titulo: string
  autor: string | null
  genero: string | null
  tipo: string | null
  categoria: string | null
  descricao: string | null
  imagem_url: string | null
  total_exemplares: number
  disponiveis: number
}

function normalizar(s: string) {
  return s.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

export default function BuscarAcervoPage() {
  const [q, setQ] = useState('')
  const [resultados, setResultados] = useState<LivroResumo[]>([])
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')
  const [total, setTotal] = useState<number | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const termo = useMemo(() => q.trim(), [q])

  useEffect(() => {
    if (termo.length < 2) {
      setResultados([])
      setTotal(null)
      setErro('')
      setCarregando(false)
      return
    }

    const timer = setTimeout(() => {
      buscar(termo)
    }, 280)

    return () => clearTimeout(timer)
  }, [termo])

  async function buscar(termoBusca: string) {
    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl

    setCarregando(true)
    setErro('')
    try {
      const supabase = createClient()

      // 1. Preferimos a RPC publica buscar_acervo (security definer, bypassa
      //    RLS em acervo/livros_exemplares). Se nao existir (schema antigo),
      //    caimos pra SELECT direto.
      let enriquecidos: LivroResumo[] = []

      const { data: rpcData, error: rpcErr } = await supabase.rpc('buscar_acervo', {
        p_termo: termoBusca,
        p_limite: 40,
      })

      if (ctrl.signal.aborted) return

      const rpcIndisponivel =
        !!rpcErr && ((rpcErr as { code?: string }).code === 'PGRST202'
          || /function.+does not exist/i.test(rpcErr.message ?? ''))

      if (!rpcErr && Array.isArray(rpcData)) {
        enriquecidos = (rpcData as LivroResumo[]).map(r => ({
          ...r,
          total_exemplares: Number(r.total_exemplares ?? 0),
          disponiveis: Number(r.disponiveis ?? 0),
        }))
      } else {
        if (rpcErr && !rpcIndisponivel) throw rpcErr

        type LivroRow = Omit<LivroResumo, 'total_exemplares' | 'disponiveis'>
        const filtro = `titulo.ilike.%${termoBusca}%,autor.ilike.%${termoBusca}%`
        const { data: livrosRaw, error: livrosErr } = await supabase
          .from('acervo')
          .select('id, titulo, autor, genero, tipo, categoria, descricao, imagem_url')
          .or(filtro)
          .order('titulo')
          .limit(40)
        const livros = (livrosRaw ?? []) as LivroRow[]

        if (ctrl.signal.aborted) return
        if (livrosErr) throw livrosErr
        if (!livros || livros.length === 0) {
          setResultados([])
          setTotal(0)
          setCarregando(false)
          return
        }

        const ids = livros.map(l => l.id)
        type ExemplarRow = { acervo_id: string; disponivel: boolean }
        const { data: exemplaresRaw, error: exErr } = await supabase
          .from('livros_exemplares')
          .select('acervo_id, disponivel')
          .in('acervo_id', ids)
        const exemplares = (exemplaresRaw ?? []) as ExemplarRow[]

        if (ctrl.signal.aborted) return
        if (exErr) throw exErr

        const contagem = new Map<string, { total: number; disponiveis: number }>()
        for (const ex of exemplares) {
          const entry = contagem.get(ex.acervo_id) ?? { total: 0, disponiveis: 0 }
          entry.total += 1
          if (ex.disponivel) entry.disponiveis += 1
          contagem.set(ex.acervo_id, entry)
        }

        enriquecidos = livros.map(l => {
          const c = contagem.get(l.id) ?? { total: 0, disponiveis: 0 }
          return {
            id: l.id,
            titulo: l.titulo ?? '',
            autor: l.autor,
            genero: l.genero,
            tipo: l.tipo,
            categoria: l.categoria,
            descricao: l.descricao,
            imagem_url: l.imagem_url,
            total_exemplares: c.total,
            disponiveis: c.disponiveis,
          }
        })
      }

      // Ordena: com copia disponivel vem antes, depois match exato de titulo,
      // depois alfabetico.
      const termoNorm = normalizar(termoBusca)
      enriquecidos.sort((a, b) => {
        const dispDiff = Number(b.disponiveis > 0) - Number(a.disponiveis > 0)
        if (dispDiff !== 0) return dispDiff
        const aStart = normalizar(a.titulo).startsWith(termoNorm) ? 0 : 1
        const bStart = normalizar(b.titulo).startsWith(termoNorm) ? 0 : 1
        if (aStart !== bStart) return aStart - bStart
        return a.titulo.localeCompare(b.titulo, 'pt-BR')
      })

      setResultados(enriquecidos)
      setTotal(enriquecidos.length)
    } catch (err) {
      if ((err as { name?: string }).name === 'AbortError') return
      console.error(err)
      setErro('Não foi possível buscar agora. Tente novamente.')
      setResultados([])
    } finally {
      if (!ctrl.signal.aborted) setCarregando(false)
    }
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-page)' }}>
      <header className="border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="max-w-3xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between gap-4 mb-6">
            <p className="text-[11px] uppercase tracking-[0.3em]" style={{ color: 'var(--text-muted)' }}>
              Biblioteca Clarice Lispector
            </p>
            <Link
              href="/passaporte"
              className="text-[11px] uppercase tracking-[0.2em] hover:opacity-70 transition-opacity"
              style={{ color: 'var(--text-muted)' }}
            >
              Passaporte →
            </Link>
          </div>

          <h1
            className="text-3xl sm:text-4xl leading-tight mb-1"
            style={{ fontFamily: "var(--font-dm-serif), serif", color: 'var(--text-primary)' }}
          >
            Consultar acervo
          </h1>
          <p className="text-sm mb-5" style={{ color: 'var(--text-secondary)' }}>
            Descubra se um livro está disponível para empréstimo.
          </p>

          <div className="relative">
            <input
              type="search"
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Buscar por título ou autor…"
              autoFocus
              autoComplete="off"
              className="w-full pr-10 text-base"
            />
            {carregando && (
              <span
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] uppercase tracking-[0.15em]"
                style={{ color: 'var(--text-muted)' }}
              >
                …
              </span>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 pt-6 pb-20">
        {erro && (
          <p className="text-sm text-red-600 mb-4">{erro}</p>
        )}

        {termo.length > 0 && termo.length < 2 && (
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Digite ao menos 2 caracteres.
          </p>
        )}

        {termo.length >= 2 && !carregando && resultados.length === 0 && !erro && (
          <div
            className="rounded-xl border p-8 text-center text-sm"
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text-muted)' }}
          >
            Nenhum livro encontrado para <span className="font-mono">“{termo}”</span>.
          </div>
        )}

        {resultados.length > 0 && (
          <>
            <p className="text-[11px] uppercase tracking-[0.08em] mb-3" style={{ color: 'var(--text-muted)' }}>
              {resultados.length} resultado{resultados.length > 1 ? 's' : ''}
              {typeof total === 'number' && total > resultados.length && <> · ~{total} no total</>}
            </p>
            <ul className="space-y-3">
              {resultados.map(livro => (
                <li key={livro.id}>
                  <Link
                    href={`/buscar/${livro.id}`}
                    className="block rounded-xl border p-4 hover:shadow-sm transition-shadow"
                    style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}
                  >
                    <div className="flex gap-4">
                      <div
                        className="shrink-0 w-14 h-20 rounded-md overflow-hidden flex items-center justify-center"
                        style={{ backgroundColor: 'var(--bg-muted)' }}
                      >
                        {livro.imagem_url ? (
                           
                          <img src={livro.imagem_url} alt={livro.titulo} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-lg font-semibold" style={{ color: 'var(--text-muted)' }}>
                            {livro.titulo[0]?.toUpperCase() ?? '—'}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-medium leading-snug" style={{ color: 'var(--text-primary)' }}>
                          {livro.titulo}
                        </p>
                        {livro.autor && (
                          <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-secondary)' }}>
                            {livro.autor}
                          </p>
                        )}
                        {livro.descricao && (
                          <p
                            className="text-[12px] mt-1.5 line-clamp-2"
                            style={{ color: 'var(--text-secondary)' }}
                          >
                            {livro.descricao}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          <StatusBadge disponiveis={livro.disponiveis} total={livro.total_exemplares} />
                          {livro.tipo && <Tag>{livro.tipo}</Tag>}
                          {livro.genero && <Tag>{livro.genero}</Tag>}
                        </div>
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}

        {termo.length === 0 && (
          <div
            className="rounded-xl border p-8 text-center"
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}
          >
            <p className="text-[11px] uppercase tracking-[0.15em] mb-2" style={{ color: 'var(--text-muted)' }}>
              Como usar
            </p>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Digite o título, o autor ou parte deles para consultar o acervo.
            </p>
          </div>
        )}
      </main>
    </div>
  )
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="text-[10px] uppercase tracking-[0.08em] px-2 py-0.5 rounded-full capitalize"
      style={{ backgroundColor: 'var(--bg-muted)', color: 'var(--text-secondary)' }}
    >
      {children}
    </span>
  )
}

function StatusBadge({ disponiveis, total }: { disponiveis: number; total: number }) {
  if (total === 0) {
    return (
      <span
        className="text-[10px] uppercase tracking-[0.08em] px-2 py-0.5 rounded-full"
        style={{ backgroundColor: 'var(--bg-muted)', color: 'var(--text-muted)' }}
      >
        sem exemplares
      </span>
    )
  }
  if (disponiveis === 0) {
    return (
      <span className="text-[10px] uppercase tracking-[0.08em] px-2 py-0.5 rounded-full bg-red-50 text-red-700">
        todos emprestados
      </span>
    )
  }
  return (
    <span className="text-[10px] uppercase tracking-[0.08em] px-2 py-0.5 rounded-full bg-green-50 text-green-800">
      {disponiveis} de {total} disponíve{disponiveis === 1 ? 'l' : 'is'}
    </span>
  )
}
