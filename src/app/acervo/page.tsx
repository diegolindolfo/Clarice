'use client'
import { useEffect, useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

type Livro = {
  id: string
  titulo: string
  autor: string | null
  editora: string | null
  genero: string | null
  categoria: string | null
  tipo: string | null
  cdd: string | null
  descricao: string | null
  imagem_url: string | null
  total_exemplares: number
  exemplares_disponiveis: number
}

const TIPOS = ['Literatura', 'Paradidático', 'Técnico', 'Didático', 'Filosofia', 'Outro']
const POR_PAGINA = 20

const TIPO_COLORS: Record<string, string> = {
  literatura: 'var(--accent-purple-soft)',
  paradidático: 'var(--accent-emerald-soft)',
  técnico: 'var(--accent-amber-soft)',
  didático: 'var(--accent-rose-soft)',
  filosofia: 'rgba(59, 130, 246, 0.12)',
  outro: 'rgba(100, 116, 139, 0.12)',
}

function corTipo(tipo: string | null) {
  return TIPO_COLORS[tipo?.toLowerCase() ?? ''] ?? 'rgba(100, 116, 139, 0.12)'
}

function inicialTitulo(titulo: string) {
  return titulo.trim()[0]?.toUpperCase() ?? '?'
}

function SkeletonCards() {
  return (
    <div className="flex flex-col gap-3 mb-6">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="glass-card p-4 flex items-center gap-4">
          <div className="skeleton w-12 h-16 rounded-lg flex-shrink-0" />
          <div className="flex-1">
            <div className="skeleton h-4 w-48 mb-2" />
            <div className="skeleton h-3 w-32 mb-3" />
            <div className="flex gap-2">
              <div className="skeleton h-5 w-16 rounded-full" />
              <div className="skeleton h-5 w-12 rounded-md" />
            </div>
          </div>
          <div className="skeleton h-5 w-20 rounded-full flex-shrink-0" />
        </div>
      ))}
    </div>
  )
}

export default function AcervoPage() {
  const router = useRouter()
  const [livros, setLivros] = useState<Livro[]>([])
  const [total, setTotal] = useState(0)
  const [pagina, setPagina] = useState(1)
  const [busca, setBusca] = useState('')
  const [tipo, setTipo] = useState('')
  const [disponibilidade, setDisponibilidade] = useState('')
  const [carregando, setCarregando] = useState(true)

  const [buscaDebounced, setBuscaDebounced] = useState('')
  useEffect(() => {
    const t = setTimeout(() => setBuscaDebounced(busca), 350)
    return () => clearTimeout(t)
  }, [busca])

  useEffect(() => {
    setPagina(1)
  }, [buscaDebounced, tipo, disponibilidade])

  const carregar = useCallback(async () => {
    setCarregando(true)

    let query = supabase
      .from('vw_acervo_catalogo')
      .select('*', { count: 'exact' })
      .order('titulo')
      .range((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA - 1)

    if (buscaDebounced.length >= 2) {
      const { data: ids } = await supabase
        .from('acervo')
        .select('id')
        .or(`titulo.ilike.%${buscaDebounced}%,autor.ilike.%${buscaDebounced}%,cdd.ilike.%${buscaDebounced}%`)

      const listaIds = ids?.map((r) => r.id) ?? []
      if (listaIds.length === 0) {
        setLivros([])
        setTotal(0)
        setCarregando(false)
        return
      }
      query = query.in('id', listaIds)
    }

    if (tipo) query = query.eq('tipo', tipo.toLowerCase())

    if (disponibilidade === 'disponivel') {
      query = query.gt('exemplares_disponiveis', 0)
    } else if (disponibilidade === 'indisponivel') {
      query = query.eq('exemplares_disponiveis', 0)
    }

    const { data, count } = await query
    setLivros(data ?? [])
    setTotal(count ?? 0)
    setCarregando(false)
  }, [buscaDebounced, tipo, disponibilidade, pagina])

  useEffect(() => {
    carregar()
  }, [carregar])

  const totalPaginas = useMemo(() => Math.ceil(total / POR_PAGINA), [total])

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>Acervo</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            {carregando ? '...' : `${total} título${total !== 1 ? 's' : ''} encontrado${total !== 1 ? 's' : ''}`}
          </p>
        </div>
        <Link href="/acervo/novo" className="btn-primary" style={{ textDecoration: 'none' }}>
          + Novo título
        </Link>
      </div>

      {/* Search & Filters */}
      <div className="flex gap-3 mb-4 flex-wrap animate-slide-up delay-1">
        <div className="flex-1 min-w-48 relative">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            placeholder="Buscar por título, autor, CDD..."
            className="dark-input w-full pl-10"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
        <select
          className="dark-select"
          value={disponibilidade}
          onChange={(e) => setDisponibilidade(e.target.value)}
        >
          <option value="">Disponibilidade</option>
          <option value="disponivel">Disponíveis</option>
          <option value="indisponivel">Indisponíveis</option>
        </select>
      </div>

      {/* Type Chips */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1 animate-slide-up delay-2">
        <Chip ativo={tipo === ''} onClick={() => setTipo('')}>Todos</Chip>
        {TIPOS.map((t) => (
          <Chip key={t} ativo={tipo === t} onClick={() => setTipo(tipo === t ? '' : t)}>{t}</Chip>
        ))}
      </div>

      {/* Book List */}
      {carregando ? (
        <SkeletonCards />
      ) : livros.length === 0 ? (
        <div className="text-center py-20" style={{ color: 'var(--text-muted)' }}>
          <p className="text-3xl mb-3">📚</p>
          <p className="text-sm">Nenhum título encontrado</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3 mb-6 animate-slide-up delay-3">
          {livros.map((livro) => (
            <button
              key={livro.id}
              onClick={() => router.push(`/acervo/${livro.id}`)}
              className="flex items-center gap-4 p-4 text-left transition-all duration-200 cv-auto glass-card"
              style={{ cursor: 'pointer' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-hover)'
                e.currentTarget.style.transform = 'translateY(-1px)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-default)'
                e.currentTarget.style.transform = 'translateY(0)'
              }}
            >
              <div
                className="w-12 h-16 rounded-lg flex items-center justify-center text-xl font-medium flex-shrink-0"
                style={{ background: corTipo(livro.tipo), color: 'var(--text-primary)' }}
              >
                {livro.imagem_url ? (
                  <img src={livro.imagem_url} alt="" className="w-full h-full object-cover rounded-lg" />
                ) : (
                  inicialTitulo(livro.titulo)
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-medium leading-snug" style={{ color: 'var(--text-primary)' }}>
                    {livro.titulo}
                  </p>
                  {livro.exemplares_disponiveis > 0 ? (
                    <span className="badge badge-green flex-shrink-0">
                      {livro.exemplares_disponiveis} disponíve{livro.exemplares_disponiveis === 1 ? 'l' : 'is'}
                    </span>
                  ) : (
                    <span className="badge badge-red flex-shrink-0">Indisponível</span>
                  )}
                </div>
                <p className="text-xs mt-1 mb-2" style={{ color: 'var(--text-muted)' }}>
                  {livro.autor ?? 'Autor desconhecido'}
                </p>
                <div className="flex gap-2 flex-wrap">
                  {livro.tipo && <span className="badge badge-purple capitalize">{livro.tipo}</span>}
                  {livro.cdd && (
                    <span className="text-xs px-2 py-0.5 rounded-md font-mono" style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
                      CDD {livro.cdd}
                    </span>
                  )}
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {livro.total_exemplares} exemplar{livro.total_exemplares !== 1 ? 'es' : ''}
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPaginas > 1 && (
        <div className="flex items-center justify-center gap-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
          <button
            onClick={() => setPagina((p) => Math.max(1, p - 1))}
            disabled={pagina === 1}
            className="btn-ghost px-4 py-2 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            ← Anterior
          </button>
          <span className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>
            {pagina} / {totalPaginas}
          </span>
          <button
            onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
            disabled={pagina === totalPaginas}
            className="btn-ghost px-4 py-2 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Próxima →
          </button>
        </div>
      )}
    </div>
  )
}

function Chip({ ativo, onClick, children }: { ativo: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="text-xs px-4 py-1.5 rounded-full whitespace-nowrap transition-all duration-200"
      style={{
        background: ativo ? 'var(--accent-indigo-glow)' : 'transparent',
        border: `1px solid ${ativo ? 'var(--accent-indigo)' : 'var(--border-default)'}`,
        color: ativo ? 'var(--accent-indigo-light)' : 'var(--text-muted)',
        fontWeight: ativo ? 500 : 400,
      }}
    >
      {children}
    </button>
  )
}
