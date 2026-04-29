'use client'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { detectarDuplicatas, type GrupoDuplicata, type ItemTitulo } from '@/lib/similaridade'
import { buscarSugestoes, type SugestaoLivro } from '@/lib/buscaLivros'
import { toast_success, toast_error } from '@/components/Toast'
import type { AcervoRow, ContagemExemplares, Aba } from './_lib/types'
import { GrupoCard } from './_components/GrupoCard'
import { IncompletoCard } from './_components/IncompletoCard'

export const dynamic = 'force-dynamic'

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

