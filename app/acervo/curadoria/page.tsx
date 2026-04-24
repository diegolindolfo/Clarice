'use client'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { detectarDuplicatas, type GrupoDuplicata, type ItemTitulo } from '@/lib/similaridade'
import { buscarSugestoes, type SugestaoLivro } from '@/lib/buscaLivros'
import { toast_success, toast_error } from '@/components/Toast'

export const dynamic = 'force-dynamic'

type AcervoRow = {
  id: string
  titulo: string
  autor: string | null
  editora: string | null
  tipo: string | null
  genero: string | null
  imagem_url: string | null
  cdd: string | null
}

type ContagemExemplares = Record<string, number>

type Aba = 'duplicatas' | 'incompletos'

export default function CuradoriaAcervoPage() {
  const router = useRouter()
  const [aba, setAba] = useState<Aba>('duplicatas')
  const [itens, setItens] = useState<AcervoRow[]>([])
  const [contagens, setContagens] = useState<ContagemExemplares>({})
  const [carregando, setCarregando] = useState(true)
  const [threshold, setThreshold] = useState(0.85)

  // Por id-alvo → sugestões carregadas
  const [sugestoesPor, setSugestoesPor] = useState<Record<string, SugestaoLivro[]>>({})
  const [buscandoPor, setBuscandoPor] = useState<Record<string, boolean>>({})

  useEffect(() => {
    async function carregar() {
      setCarregando(true)
      const supabase = createClient()
      const [{ data: acervo }, { data: exs }] = await Promise.all([
        supabase
          .from('acervo')
          .select('id, titulo, autor, editora, tipo, genero, imagem_url, cdd')
          .order('titulo'),
        supabase.from('livros_exemplares').select('acervo_id'),
      ])

      setItens((acervo ?? []) as AcervoRow[])

      const map: ContagemExemplares = {}
      for (const e of (exs ?? []) as { acervo_id: string }[]) {
        map[e.acervo_id] = (map[e.acervo_id] ?? 0) + 1
      }
      setContagens(map)
      setCarregando(false)
    }
    carregar()
  }, [])

  const grupos: GrupoDuplicata[] = useMemo(() => {
    const input: ItemTitulo[] = itens.map(i => ({ id: i.id, titulo: i.titulo, autor: i.autor }))
    return detectarDuplicatas(input, threshold)
  }, [itens, threshold])

  const incompletos = useMemo(() => {
    return itens.filter(i => !i.autor || !i.genero || !i.imagem_url)
  }, [itens])

  function infoDe(id: string): AcervoRow | null {
    return itens.find(i => i.id === id) ?? null
  }

  async function mesclar(manter: AcervoRow, remover: AcervoRow) {
    if (!confirm(
      `Mesclar?\n\n` +
      `MANTER: ${manter.titulo} (${contagens[manter.id] ?? 0} exemplares)\n` +
      `REMOVER: ${remover.titulo} (${contagens[remover.id] ?? 0} exemplares)\n\n` +
      `Todos os exemplares do título removido serão movidos para o mantido. O título "${remover.titulo}" será excluído.`
    )) return

    const supabase = createClient()

    // 1) Mover exemplares
    const { error: eEx } = await supabase
      .from('livros_exemplares')
      .update({ acervo_id: manter.id })
      .eq('acervo_id', remover.id)
    if (eEx) {
      toast_error(`Erro ao mover exemplares: ${eEx.message}`)
      return
    }

    // 2) Excluir o acervo duplicado
    const { error: eA } = await supabase.from('acervo').delete().eq('id', remover.id)
    if (eA) {
      toast_error(`Exemplares movidos, mas erro ao excluir: ${eA.message}`)
      return
    }

    toast_success('Duplicata mesclada!')
    setItens(prev => prev.filter(i => i.id !== remover.id))
    setContagens(prev => {
      const novo = { ...prev }
      novo[manter.id] = (novo[manter.id] ?? 0) + (novo[remover.id] ?? 0)
      delete novo[remover.id]
      return novo
    })
  }

  async function buscarSugestoesPara(alvo: AcervoRow) {
    setBuscandoPor(p => ({ ...p, [alvo.id]: true }))
    try {
      const res = await buscarSugestoes(alvo.titulo)
      setSugestoesPor(p => ({ ...p, [alvo.id]: res }))
      if (res.length === 0) toast_error('Nenhuma sugestão encontrada')
    } catch {
      toast_error('Erro ao buscar sugestões')
    } finally {
      setBuscandoPor(p => ({ ...p, [alvo.id]: false }))
    }
  }

  async function aplicarSugestao(
    alvo: AcervoRow,
    sugestao: SugestaoLivro,
    campos: Set<string>,
    opcoes: { salvarNoServidor?: boolean } = {},
  ) {
    if (campos.size === 0) return

    const updates: Record<string, string | null> = {}
    if (campos.has('autor') && sugestao.autor) updates.autor = sugestao.autor
    if (campos.has('editora') && sugestao.editora) updates.editora = sugestao.editora
    if (campos.has('genero') && sugestao.genero) updates.genero = sugestao.genero

    // Capa: se o usuario pediu pra salvar no servidor, tenta upload pro
    // Supabase Storage e usa a URL interna. Se falhar, avisa e cai pra URL
    // externa — melhor ter a capa externa do que nenhuma.
    if (campos.has('imagem_url') && sugestao.imagem_url) {
      let urlFinal = sugestao.imagem_url
      if (opcoes.salvarNoServidor) {
        try {
          const resp = await fetch('/api/capas/salvar', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ url: sugestao.imagem_url, acervoId: alvo.id }),
          })
          const payload = (await resp.json()) as { url?: string; erro?: string }
          if (!resp.ok || !payload.url) {
            toast_error(
              `Capa mantida externa (${payload.erro ?? 'upload falhou'})`,
            )
          } else {
            urlFinal = payload.url
          }
        } catch (err) {
          console.error('Erro ao salvar capa no servidor:', err)
          toast_error('Capa mantida externa (falha no servidor)')
        }
      }
      updates.imagem_url = urlFinal
    }

    if (Object.keys(updates).length === 0) return

    const supabase = createClient()
    const { error } = await supabase.from('acervo').update(updates).eq('id', alvo.id)
    if (error) {
      toast_error(`Erro ao atualizar: ${error.message}`)
      return
    }
    toast_success(`${alvo.titulo} atualizado`)
    setItens(prev => prev.map(i => i.id === alvo.id ? { ...i, ...updates } as AcervoRow : i))
    // Fecha sugestões após aplicar
    setSugestoesPor(p => {
      const novo = { ...p }
      delete novo[alvo.id]
      return novo
    })
  }

  if (carregando) {
    return (
      <div className="max-w-5xl mx-auto p-6 text-sm" style={{ color: 'var(--text-muted)' }}>
        Analisando acervo...
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="flex items-center gap-3 mb-2">
        <button
          onClick={() => router.back()}
          className="text-sm hover:opacity-70 transition-opacity"
          style={{ color: 'var(--text-muted)' }}
        >
          ← Voltar
        </button>
        <h1 className="text-xl font-medium">Curadoria do Acervo</h1>
      </div>
      <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
        Encontre duplicatas suspeitas e complete automaticamente dados faltantes usando Open Library + Google Books.
      </p>

      {/* Abas */}
      <div className="flex gap-0 border-b mb-6" style={{ borderColor: 'var(--border)' }}>
        {([['duplicatas', `Duplicatas (${grupos.length})`], ['incompletos', `Incompletos (${incompletos.length})`]] as const).map(([val, label]) => {
          const ativo = aba === val
          return (
            <button
              key={val}
              onClick={() => setAba(val)}
              className={`relative px-4 py-2 text-sm transition-colors ${ativo ? 'font-medium' : ''}`}
              style={{ color: ativo ? 'var(--text-primary)' : 'var(--text-muted)' }}
            >
              {label}
              {ativo && (
                <span
                  className="absolute bottom-[-1px] left-3 right-3 h-[2px] rounded-t-full"
                  style={{ backgroundColor: 'var(--text-primary)' }}
                />
              )}
            </button>
          )
        })}
      </div>

      {aba === 'duplicatas' && (
        <div>
          <div className="mb-5 flex items-center gap-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
            <label className="flex items-center gap-2">
              <span>Sensibilidade</span>
              <input
                type="range"
                min="0.7"
                max="0.98"
                step="0.01"
                value={threshold}
                onChange={e => setThreshold(Number(e.target.value))}
              />
              <span className="font-mono text-[11px] w-10 text-right">{threshold.toFixed(2)}</span>
            </label>
            <span style={{ color: 'var(--text-muted)' }}>
              Mais baixo = detecta mais parecidos (inclusive falsos positivos).
            </span>
          </div>

          {grupos.length === 0 ? (
            <div
              className="rounded-xl border p-8 text-center text-sm"
              style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text-muted)' }}
            >
              Nenhuma duplicata encontrada com a sensibilidade atual.
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {grupos.map((g, idx) => (
                <GrupoCard
                  key={`${g.chave}-${idx}`}
                  grupo={g}
                  infoDe={infoDe}
                  contagens={contagens}
                  onMesclar={mesclar}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {aba === 'incompletos' && (
        <div>
          {incompletos.length === 0 ? (
            <div
              className="rounded-xl border p-8 text-center text-sm"
              style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text-muted)' }}
            >
              Todos os títulos estão com autor, gênero e capa preenchidos.
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {incompletos.map(item => (
                <IncompletoCard
                  key={item.id}
                  item={item}
                  buscando={!!buscandoPor[item.id]}
                  sugestoes={sugestoesPor[item.id] ?? null}
                  onBuscar={() => buscarSugestoesPara(item)}
                  onAplicar={(s, c, opcoes) => { void aplicarSugestao(item, s, c, opcoes) }}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Card de grupo de duplicatas ─────────────────────────────────────────────

function GrupoCard({
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
                  // eslint-disable-next-line @next/next/no-img-element
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
            Ao mesclar, os exemplares dos outros títulos vão para "{canonico.titulo}" e os duplicados são excluídos.
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

// ── Card de título incompleto ───────────────────────────────────────────────

function IncompletoCard({
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
            // eslint-disable-next-line @next/next/no-img-element
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
          // eslint-disable-next-line @next/next/no-img-element
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
