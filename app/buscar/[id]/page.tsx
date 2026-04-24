'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

type LivroDetalhe = {
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

type ExemplarResumo = {
  id: string
  tombo: number | null
  volume: string | null
  edicao: string | null
  disponivel: boolean
}

export default function DetalheBuscaPage() {
  const params = useParams<{ id: string }>()
  const [livro, setLivro] = useState<LivroDetalhe | null>(null)
  const [exemplares, setExemplares] = useState<ExemplarResumo[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  useEffect(() => {
    async function carregar() {
      setCarregando(true)
      try {
        const supabase = createClient()

        // Tenta RPC publica primeiro (bypassa RLS). Se nao existir, faz as
        // queries diretas tradicionais.
        const { data: rpcData, error: rpcErr } = await supabase.rpc('detalhe_acervo', {
          p_id: params.id,
        })
        const rpcIndisponivel =
          !!rpcErr && ((rpcErr as { code?: string }).code === 'PGRST202'
            || /function.+does not exist/i.test(rpcErr.message ?? ''))

        if (!rpcErr && rpcData) {
          const payload = rpcData as {
            livro: LivroDetalhe | null
            exemplares: ExemplarResumo[] | null
          }
          if (!payload.livro) {
            setErro('Livro não encontrado.')
            setLivro(null)
          } else {
            setLivro(payload.livro)
            setExemplares(payload.exemplares ?? [])
          }
          return
        }

        if (!rpcErr && !rpcData) {
          setErro('Livro não encontrado.')
          setLivro(null)
          return
        }

        if (rpcErr && !rpcIndisponivel) throw rpcErr

        const [{ data: livroData, error: livroErr }, { data: exData, error: exErr }] = await Promise.all([
          supabase
            .from('acervo')
            .select('id, titulo, autor, editora, genero, categoria, tipo, cdd, serie, descricao, imagem_url')
            .eq('id', params.id)
            .maybeSingle(),
          supabase
            .from('livros_exemplares')
            .select('id, tombo, volume, edicao, disponivel')
            .eq('acervo_id', params.id)
            .order('tombo'),
        ])

        if (livroErr) throw livroErr
        if (exErr) throw exErr
        if (!livroData) {
          setErro('Livro não encontrado.')
          setLivro(null)
        } else {
          setLivro(livroData as LivroDetalhe)
          setExemplares((exData ?? []) as ExemplarResumo[])
        }
      } catch (err) {
        console.error(err)
        setErro('Erro ao carregar o livro.')
      } finally {
        setCarregando(false)
      }
    }
    carregar()
  }, [params.id])

  if (carregando) {
    return (
      <div className="max-w-2xl mx-auto p-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
        Carregando…
      </div>
    )
  }

  if (erro || !livro) {
    return (
      <div className="max-w-2xl mx-auto p-8 text-center">
        <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>{erro || 'Livro não encontrado.'}</p>
        <Link href="/buscar" className="nav-btn-primary inline-block text-sm px-4 py-2 rounded-lg">
          Voltar à busca
        </Link>
      </div>
    )
  }

  const disponiveis = exemplares.filter(e => e.disponivel).length
  const total = exemplares.length

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-page)' }}>
      <header className="border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="max-w-2xl mx-auto px-6 py-5 flex items-center justify-between gap-4">
          <Link
            href="/buscar"
            className="text-[11px] uppercase tracking-[0.2em] hover:opacity-70 transition-opacity"
            style={{ color: 'var(--text-muted)' }}
          >
            ← Voltar à busca
          </Link>
          <p className="text-[11px] uppercase tracking-[0.25em]" style={{ color: 'var(--text-muted)' }}>
            Biblioteca Clarice Lispector
          </p>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-8">
        <div className="flex gap-5 mb-6">
          <div
            className="shrink-0 w-28 h-40 rounded-md overflow-hidden flex items-center justify-center"
            style={{ backgroundColor: 'var(--bg-muted)' }}
          >
            {livro.imagem_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={livro.imagem_url} alt={livro.titulo} className="w-full h-full object-cover" />
            ) : (
              <span className="text-3xl font-semibold" style={{ color: 'var(--text-muted)' }}>
                {livro.titulo[0]?.toUpperCase() ?? '—'}
              </span>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h1
              className="text-2xl leading-tight mb-1"
              style={{ fontFamily: "var(--font-dm-serif), serif", color: 'var(--text-primary)' }}
            >
              {livro.titulo}
            </h1>
            {livro.autor && (
              <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
                {livro.autor}
              </p>
            )}
            <div className="flex flex-wrap gap-1.5">
              <StatusBadge disponiveis={disponiveis} total={total} />
              {livro.tipo && <Tag>{livro.tipo}</Tag>}
              {livro.genero && <Tag>{livro.genero}</Tag>}
              {livro.cdd && (
                <span
                  className="text-[10px] font-mono px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: 'var(--bg-muted)', color: 'var(--text-secondary)' }}
                >
                  CDD {livro.cdd}
                </span>
              )}
            </div>
          </div>
        </div>

        {livro.descricao && (
          <section className="mb-6">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] mb-2" style={{ color: 'var(--text-muted)' }}>
              Descrição
            </p>
            <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: 'var(--text-secondary)' }}>
              {livro.descricao}
            </p>
          </section>
        )}

        <section className="mb-6">
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] mb-2" style={{ color: 'var(--text-muted)' }}>
            Ficha
          </p>
          <dl
            className="rounded-xl border divide-y"
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}
          >
            {([
              ['Editora', livro.editora],
              ['Gênero', livro.genero],
              ['Categoria', livro.categoria],
              ['Série / PNLD', livro.serie],
            ] as Array<[string, string | null]>)
              .filter(([, v]) => v)
              .map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 px-4 py-2.5 text-sm">
                  <dt style={{ color: 'var(--text-muted)' }}>{k}</dt>
                  <dd className="text-right" style={{ color: 'var(--text-primary)' }}>{v}</dd>
                </div>
              ))}
          </dl>
        </section>

        <section className="mb-6">
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] mb-2" style={{ color: 'var(--text-muted)' }}>
            Exemplares ({total})
          </p>
          {total === 0 ? (
            <div
              className="rounded-xl border p-5 text-center text-sm"
              style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text-muted)' }}
            >
              Este título ainda não tem exemplares físicos cadastrados.
            </div>
          ) : (
            <ul
              className="rounded-xl border divide-y"
              style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}
            >
              {exemplares.map(ex => (
                <li key={ex.id} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-[13px]" style={{ color: 'var(--text-primary)' }}>
                      {ex.tombo ? `#${ex.tombo}` : 'sem tombo'}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      {[ex.volume && `vol. ${ex.volume}`, ex.edicao && `ed. ${ex.edicao}`].filter(Boolean).join(' · ') || '—'}
                    </p>
                  </div>
                  {ex.disponivel ? (
                    <span className="text-[10px] uppercase tracking-[0.08em] px-2 py-0.5 rounded-full bg-green-50 text-green-800">
                      Disponível
                    </span>
                  ) : (
                    <span className="text-[10px] uppercase tracking-[0.08em] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                      Emprestado
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <p className="text-[11px] text-center" style={{ color: 'var(--text-muted)' }}>
          Para reservar ou retirar um exemplar, procure a biblioteca.
        </p>
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
