'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'



type Acervo = {
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

type Exemplar = {
  id: string
  tombo: number | null
  volume: string | null
  edicao: string | null
  aquisicao: string | null
  data_cadastro: string | null
  disponivel: boolean
}

export default function DetalheAcervoPage() {
  const supabase = createClient()
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [livro, setLivro] = useState<Acervo | null>(null)
  const [exemplares, setExemplares] = useState<Exemplar[]>([])
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    async function carregar() {
      const [{ data: livroData }, { data: exemplaresData }] = await Promise.all([
        supabase.from('acervo').select('*').eq('id', id).single(),
        supabase.from('livros_exemplares').select('*').eq('acervo_id', id).order('tombo'),
      ])
      setLivro(livroData)
      setExemplares(exemplaresData ?? [])
      setCarregando(false)
    }
    carregar()
  }, [id])

  if (carregando)
    return (
      <div className="max-w-3xl mx-auto p-6">
        <div className="skeleton h-4 w-16 mb-8 rounded" />
        <div className="flex gap-5 mb-6">
          <div className="skeleton w-20 h-28 rounded-xl flex-shrink-0" />
          <div className="flex-1">
            <div className="skeleton h-6 w-64 mb-2" />
            <div className="skeleton h-4 w-40 mb-4" />
            <div className="flex gap-2">
              <div className="skeleton h-6 w-20 rounded-full" />
              <div className="skeleton h-6 w-24 rounded-full" />
            </div>
          </div>
        </div>
      </div>
    )

  if (!livro)
    return (
      <div className="max-w-3xl mx-auto p-6 text-center py-20" style={{ color: 'var(--text-muted)' }}>
        <p className="text-3xl mb-3">📚</p>
        <p className="text-sm">Livro não encontrado.</p>
      </div>
    )

  const disponiveis = exemplares.filter((e) => e.disponivel).length

  return (
    <div className="max-w-3xl mx-auto p-6 animate-fade-in">
      <button
        onClick={() => router.back()}
        className="text-sm flex items-center gap-1 mb-6 transition-colors"
        style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
        onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
        onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
      >
        ← Acervo
      </button>

      {/* Book Header */}
      <div className="flex gap-5 mb-6 animate-slide-up delay-1">
        <div
          className="w-20 h-28 rounded-xl flex items-center justify-center text-3xl flex-shrink-0"
          style={{
            background: livro.tipo === 'literatura' ? 'var(--accent-purple-soft)' : 'rgba(100, 116, 139, 0.12)',
            color: 'var(--text-primary)',
          }}
        >
          {livro.imagem_url ? (
            <img src={livro.imagem_url} alt="" className="w-full h-full object-cover rounded-xl" />
          ) : (
            livro.titulo[0]?.toUpperCase()
          )}
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-semibold leading-tight mb-1" style={{ color: 'var(--text-primary)' }}>
            {livro.titulo}
          </h1>
          <p className="text-sm mb-3" style={{ color: 'var(--text-muted)' }}>
            {livro.autor ?? 'Autor desconhecido'}
          </p>
          <div className="flex gap-2 flex-wrap">
            {disponiveis > 0 ? (
              <span className="badge badge-green">
                {disponiveis} disponíve{disponiveis === 1 ? 'l' : 'is'}
              </span>
            ) : (
              <span className="badge badge-red">Todos emprestados</span>
            )}
            {livro.tipo && <span className="badge badge-purple capitalize">{livro.tipo}</span>}
            {livro.cdd && (
              <span
                className="text-xs font-mono px-3 py-1 rounded-md"
                style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}
              >
                CDD {livro.cdd}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Info Panel */}
      <div className="glass-card p-5 mb-5 text-sm animate-slide-up delay-2">
        {[
          ['Editora', livro.editora],
          ['Gênero', livro.genero],
          ['Categoria', livro.categoria],
          ['Série/PNLD', livro.serie],
        ]
          .filter(([, v]) => v)
          .map(([label, valor], i, arr) => (
            <div
              key={label}
              className="flex justify-between py-2.5"
              style={{ borderBottom: i < arr.length - 1 ? '1px solid var(--border-default)' : 'none' }}
            >
              <span style={{ color: 'var(--text-muted)' }}>{label}</span>
              <span style={{ color: 'var(--text-primary)' }}>{valor}</span>
            </div>
          ))}
      </div>

      {livro.descricao && (
        <p className="text-sm leading-relaxed mb-5 animate-slide-up delay-3" style={{ color: 'var(--text-secondary)' }}>
          {livro.descricao}
        </p>
      )}

      {/* Exemplares */}
      <div className="flex items-center justify-between mb-3 animate-slide-up delay-3">
        <h2 className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
          Exemplares físicos
          <span className="ml-1" style={{ color: 'var(--text-muted)', fontWeight: 400 }}>
            ({exemplares.length})
          </span>
        </h2>
      </div>

      <div className="glass-card overflow-hidden mb-6 animate-slide-up delay-4">
        <table className="dark-table">
          <thead>
            <tr>
              {['Tombo', 'Volume', 'Edição', 'Aquisição', 'Cadastro', 'Status'].map((h) => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {exemplares.map((ex) => (
              <tr key={ex.id}>
                <td className="font-mono text-xs">{ex.tombo ? `#${ex.tombo}` : '—'}</td>
                <td style={{ color: 'var(--text-secondary)' }}>{ex.volume ?? '—'}</td>
                <td style={{ color: 'var(--text-secondary)' }}>{ex.edicao ?? '—'}</td>
                <td className="capitalize" style={{ color: 'var(--text-secondary)' }}>{ex.aquisicao ?? '—'}</td>
                <td style={{ color: 'var(--text-secondary)' }}>
                  {ex.data_cadastro ? new Date(ex.data_cadastro).toLocaleDateString('pt-BR') : '—'}
                </td>
                <td>
                  {ex.disponivel ? (
                    <span className="badge badge-green">Disponível</span>
                  ) : (
                    <span className="badge badge-red">Emprestado</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {disponiveis > 0 && (
        <button
          onClick={() => router.push(`/emprestimos/novo?acervo_id=${livro.id}`)}
          className="btn-primary w-full py-3.5 animate-slide-up delay-5"
        >
          Emprestar um exemplar deste livro
        </button>
      )}
    </div>
  )
}
