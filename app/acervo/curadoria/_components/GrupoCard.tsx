import Link from 'next/link'
import { useState } from 'react'
import type { GrupoDuplicata } from '@/lib/similaridade'
import type { AcervoRow, ContagemExemplares } from '../_lib/types'

// ── Card de grupo de duplicatas ─────────────────────────────────────────────

export function GrupoCard({
  grupo,
  infoDe,
  contagens,
  onMesclar,
}: {
  grupo: GrupoDuplicata
  infoDe: (id: string) => AcervoRow | null
  contagens: ContagemExemplares
  onMesclar: (manter: AcervoRow, remover: AcervoRow) => void
}) {
  const livros = grupo.itens.map(i => infoDe(i.id)).filter((x): x is AcervoRow => !!x)
  // Canônico inicial = o com mais exemplares (ou, empate, o com autor preenchido)
  const [canonicoId, setCanonicoId] = useState<string>(() => {
    return livros
      .slice()
      .sort((a, b) => {
        const da = (contagens[a.id] ?? 0) - (contagens[b.id] ?? 0)
        if (da !== 0) return -da
        const sa = (a.autor ? 1 : 0) + (a.imagem_url ? 1 : 0) + (a.genero ? 1 : 0)
        const sb = (b.autor ? 1 : 0) + (b.imagem_url ? 1 : 0) + (b.genero ? 1 : 0)
        return sb - sa
      })[0]?.id ?? ''
  })

  const canonico = livros.find(l => l.id === canonicoId)
  const outros = livros.filter(l => l.id !== canonicoId)

  return (
    <div
      className="rounded-xl border p-4"
      style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}
    >
      <div className="flex items-center gap-2 mb-3">
        <span
          className="text-[10px] px-2 py-0.5 rounded-full font-medium"
          style={{
            backgroundColor: grupo.exato ? 'rgba(254, 202, 202, 0.4)' : 'rgba(254, 243, 199, 0.4)',
            color: grupo.exato ? '#991b1b' : '#92400e',
          }}
        >
          {grupo.exato ? 'Duplicata exata' : `Similaridade ${Math.round(grupo.similaridadeMinima * 100)}%`}
        </span>
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {grupo.itens.length} registros
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {livros.map(l => {
          const isCan = l.id === canonicoId
          return (
            <div
              key={l.id}
              className="rounded-lg border p-3 flex gap-3 transition-colors"
              style={{
                borderColor: isCan ? 'var(--text-primary)' : 'var(--border)',
                backgroundColor: isCan ? 'var(--bg-muted)' : 'transparent',
              }}
            >
              <div
                className="shrink-0 w-12 h-16 rounded-md overflow-hidden flex items-center justify-center text-[9px]"
                style={{ backgroundColor: 'var(--bg-muted)', color: 'var(--text-muted)' }}
              >
                {l.imagem_url ? (
                   
                  <img src={l.imagem_url} alt={l.titulo} className="w-full h-full object-cover" />
                ) : (
                  <span>sem capa</span>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                  {l.titulo}
                </p>
                <p className="text-[11px] mt-0.5 truncate" style={{ color: 'var(--text-secondary)' }}>
                  {l.autor || <span style={{ color: 'var(--text-muted)' }}>sem autor</span>}
                </p>
                <p className="text-[10px] font-mono mt-1" style={{ color: 'var(--text-muted)' }}>
                  {contagens[l.id] ?? 0} exemplar{(contagens[l.id] ?? 0) !== 1 ? 'es' : ''}
                  {l.genero && <> · {l.genero}</>}
                  {l.cdd && <> · {l.cdd}</>}
                </p>

                <div className="flex items-center gap-3 mt-2 text-[11px]">
                  <label className="flex items-center gap-1">
                    <input
                      type="radio"
                      checked={isCan}
                      onChange={() => setCanonicoId(l.id)}
                    />
                    <span style={{ color: 'var(--text-secondary)' }}>Manter</span>
                  </label>
                  <Link
                    href={`/acervo/${l.id}`}
                    target="_blank"
                    className="hover:underline"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    ver ↗
                  </Link>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {canonico && outros.length > 0 && (
        <div className="flex items-center gap-2 mt-3 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
          <p className="text-xs flex-1" style={{ color: 'var(--text-muted)' }}>
            Ao mesclar, os exemplares dos outros títulos vão para &ldquo;{canonico.titulo}&rdquo; e os duplicados são excluídos.
          </p>
          {outros.map(o => (
            <button
              key={o.id}
              onClick={() => onMesclar(canonico, o)}
              className="text-[11px] px-3 py-1.5 rounded-lg border transition-colors hover:bg-red-50"
              style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
              title={`Remover "${o.titulo}" e mover seus exemplares para "${canonico.titulo}"`}
            >
              Mesclar {outros.length > 1 ? `#${outros.indexOf(o) + 1}` : ''}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
