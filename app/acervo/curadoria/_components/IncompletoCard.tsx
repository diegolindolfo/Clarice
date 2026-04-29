import { useState } from 'react'
import type { SugestaoLivro } from '@/lib/buscaLivros'
import type { AcervoRow } from '../_lib/types'

// ── Card de título incompleto ───────────────────────────────────────────────

export function IncompletoCard({
  item,
  buscando,
  sugestoes,
  onBuscar,
  onAplicar,
}: {
  item: AcervoRow
  buscando: boolean
  sugestoes: SugestaoLivro[] | null
  onBuscar: () => void
  onAplicar: (s: SugestaoLivro, campos: Set<string>, opcoes: { salvarNoServidor: boolean }) => void
}) {
  const faltando: string[] = []
  if (!item.autor) faltando.push('autor')
  if (!item.genero) faltando.push('gênero')
  if (!item.imagem_url) faltando.push('capa')

  return (
    <div
      className="rounded-xl border p-4"
      style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}
    >
      <div className="flex gap-3 items-start">
        <div
          className="shrink-0 w-12 h-16 rounded-md overflow-hidden flex items-center justify-center text-[9px]"
          style={{ backgroundColor: 'var(--bg-muted)', color: 'var(--text-muted)' }}
        >
          {item.imagem_url ? (
             
            <img src={item.imagem_url} alt={item.titulo} className="w-full h-full object-cover" />
          ) : (
            <span>sem capa</span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{item.titulo}</p>
          <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            {item.autor || <span style={{ color: 'var(--text-muted)' }}>sem autor</span>}
            {item.genero && <> · {item.genero}</>}
          </p>
          <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>
            Faltando: {faltando.join(', ')}
          </p>
        </div>

        <button
          onClick={onBuscar}
          disabled={buscando}
          className="text-[11px] px-3 py-1.5 rounded-lg border transition-colors hover:opacity-80 shrink-0"
          style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
        >
          {buscando ? 'Buscando...' : sugestoes ? 'Buscar de novo' : 'Buscar sugestões'}
        </button>
      </div>

      {sugestoes && sugestoes.length > 0 && (
        <div className="mt-3 pt-3 border-t flex flex-col gap-2" style={{ borderColor: 'var(--border)' }}>
          {sugestoes.map((s, i) => (
            <SugestaoLinha key={i} alvo={item} sugestao={s} onAplicar={onAplicar} />
          ))}
        </div>
      )}
    </div>
  )
}

function SugestaoLinha({
  alvo,
  sugestao,
  onAplicar,
}: {
  alvo: AcervoRow
  sugestao: SugestaoLivro
  onAplicar: (s: SugestaoLivro, campos: Set<string>, opcoes: { salvarNoServidor: boolean }) => void
}) {
  const camposDisponiveis: string[] = []
  // Só oferece sobrescrever um campo se o alvo estiver vazio e a sugestão tiver valor
  if (!alvo.autor && sugestao.autor) camposDisponiveis.push('autor')
  if (!alvo.genero && sugestao.genero) camposDisponiveis.push('genero')
  if (!alvo.imagem_url && sugestao.imagem_url) camposDisponiveis.push('imagem_url')
  if (!alvo.editora && sugestao.editora) camposDisponiveis.push('editora')

  const [selecionados, setSelecionados] = useState<Set<string>>(() => new Set(camposDisponiveis))
  const [salvarNoServidor, setSalvarNoServidor] = useState(true)

  function toggle(campo: string) {
    setSelecionados(s => {
      const novo = new Set(s)
      if (novo.has(campo)) novo.delete(campo)
      else novo.add(campo)
      return novo
    })
  }

  return (
    <div className="flex gap-3 items-start">
      <div
        className="shrink-0 w-10 h-14 rounded-md overflow-hidden flex items-center justify-center text-[9px]"
        style={{ backgroundColor: 'var(--bg-muted)', color: 'var(--text-muted)' }}
      >
        {sugestao.imagem_url ? (
           
          <img src={sugestao.imagem_url} alt={sugestao.titulo} className="w-full h-full object-cover" />
        ) : (
          <span>—</span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-medium truncate" style={{ color: 'var(--text-primary)' }}>
          {sugestao.titulo}
          <span className="text-[10px] ml-2 font-mono uppercase" style={{ color: 'var(--text-muted)' }}>
            {sugestao.fonte === 'openlibrary' ? 'open library' : 'google books'}
          </span>
        </p>
        <p className="text-[11px] truncate" style={{ color: 'var(--text-secondary)' }}>
          {sugestao.autor ?? <span style={{ color: 'var(--text-muted)' }}>—</span>}
          {sugestao.editora && <> · {sugestao.editora}</>}
          {sugestao.ano && <> · {sugestao.ano}</>}
        </p>

        <div className="flex flex-wrap items-center gap-3 mt-1">
          {camposDisponiveis.length === 0 ? (
            <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
              nada novo a aplicar
            </span>
          ) : (
            camposDisponiveis.map(c => (
              <label key={c} className="flex items-center gap-1 text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                <input
                  type="checkbox"
                  checked={selecionados.has(c)}
                  onChange={() => toggle(c)}
                />
                {c === 'imagem_url' ? 'capa' : c}
              </label>
            ))
          )}
        </div>

        {selecionados.has('imagem_url') && (
          <label
            className="flex items-center gap-1 text-[10px] mt-1"
            style={{ color: 'var(--text-muted)' }}
            title="Baixa a imagem pro bucket 'capas' no Supabase Storage — não depende do CDN externo continuar no ar."
          >
            <input
              type="checkbox"
              checked={salvarNoServidor}
              onChange={e => setSalvarNoServidor(e.target.checked)}
            />
            salvar capa no servidor
          </label>
        )}
      </div>

      <button
        onClick={() => onAplicar(sugestao, selecionados, { salvarNoServidor })}
        disabled={selecionados.size === 0}
        className="text-[11px] px-3 py-1.5 rounded-lg nav-btn-primary disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
      >
        Aplicar
      </button>
    </div>
  )
}
