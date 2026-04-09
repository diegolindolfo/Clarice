'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { fmt, sanitizeBusca } from '@/lib/utils'
import Chip from '@/components/Chip'

type Livro = {
  id: string; titulo: string; autor: string | null; tipo: string | null
  cdd: string | null; imagem_url: string | null
  total_exemplares: number; exemplares_disponiveis: number
}

type Exemplar = {
  id: string; tombo: number | null; volume: string | null; edicao: string | null
  aquisicao: string | null; data_cadastro: string | null; disponivel: boolean
}

type AcervoDetalhe = {
  id: string; titulo: string; autor: string | null; editora: string | null
  genero: string | null; categoria: string | null; tipo: string | null
  cdd: string | null; serie: string | null; descricao: string | null; imagem_url: string | null
}

const TIPOS   = ['Literatura', 'Paradidático', 'Técnico', 'Didático', 'Filosofia', 'Outro']
const POR_PAG = 20

function corTipo(tipo: string | null) {
  const m: Record<string, string> = {
    literatura: '#EEEDFE', paradidático: '#E1F5EE', técnico: '#FAECE7',
    didático: '#FAEEDA', filosofia: '#E6F1FB', outro: '#F1EFE8',
  }
  return m[tipo?.toLowerCase() ?? ''] ?? '#F1EFE8'
}

export default function AcervoPage() {
  const router = useRouter()
  const [livros, setLivros]                   = useState<Livro[]>([])
  const [total, setTotal]                     = useState(0)
  const [pagina, setPagina]                   = useState(1)
  const [busca, setBusca]                     = useState('')
  const [buscaDebounced, setBuscaDebounced]   = useState('')
  const [tipo, setTipo]                       = useState('')
  const [disponibilidade, setDisponibilidade] = useState('')
  const [carregando, setCarregando]           = useState(true)

  // Painel de detalhe
  const [selecionado, setSelecionado]         = useState<Livro | null>(null)
  const [detalhe, setDetalhe]                 = useState<AcervoDetalhe | null>(null)
  const [exemplares, setExemplares]           = useState<Exemplar[]>([])
  const [carregandoDetalhe, setCarregandoDetalhe] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setBuscaDebounced(busca), 350)
    return () => clearTimeout(t)
  }, [busca])

  useEffect(() => { setPagina(1) }, [buscaDebounced, tipo, disponibilidade])

  const carregar = useCallback(async () => {
    setCarregando(true)
    const supabase = createClient()

    let query = supabase
      .from('vw_acervo_catalogo')
      .select('*', { count: 'exact' })
      .order('titulo')
      .range((pagina - 1) * POR_PAG, pagina * POR_PAG - 1)

    if (buscaDebounced.length >= 2) {
      const termo = sanitizeBusca(buscaDebounced)
      const { data: ids } = await supabase
        .from('acervo')
        .select('id')
        .or(`titulo.ilike.%${termo}%,autor.ilike.%${termo}%,cdd.ilike.%${termo}%`)
        .limit(100)

      const listaIds = ids?.map(r => r.id) ?? []
      if (listaIds.length === 0) { setLivros([]); setTotal(0); setCarregando(false); return }
      query = query.in('id', listaIds)
    }

    if (tipo)                        query = query.eq('tipo', tipo.toLowerCase())
    if (disponibilidade === 'sim')   query = query.gt('exemplares_disponiveis', 0)
    if (disponibilidade === 'nao')   query = query.eq('exemplares_disponiveis', 0)

    const { data, count } = await query
    setLivros(data ?? [])
    setTotal(count ?? 0)
    setCarregando(false)
  }, [buscaDebounced, tipo, disponibilidade, pagina])

  useEffect(() => { carregar() }, [carregar])

  // Carregar detalhe ao selecionar
  useEffect(() => {
    if (!selecionado) { setDetalhe(null); setExemplares([]); return }
    const livroId = selecionado.id
    async function carregarDetalhe() {
      setCarregandoDetalhe(true)
      const supabase = createClient()
      const [{ data: livroData }, { data: exemplaresData }] = await Promise.all([
        supabase.from('acervo').select('*').eq('id', livroId).single(),
        supabase.from('livros_exemplares').select('*').eq('acervo_id', livroId).order('tombo'),
      ])
      setDetalhe(livroData)
      setExemplares(exemplaresData ?? [])
      setCarregandoDetalhe(false)
    }
    carregarDetalhe()
  }, [selecionado])

  const totalPaginas = Math.ceil(total / POR_PAG)

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

        {/* Lista */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-medium">Acervo</h1>
              <p className="text-xs text-gray-500 mt-0.5">
                {carregando ? '...' : `${total} título${total !== 1 ? 's' : ''}`}
              </p>
            </div>
            <button onClick={() => router.push('/acervo/novo')} className="border text-xs px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors">
              + Novo
            </button>
          </div>

          <input
            placeholder="Buscar título, autor, CDD..."
            className="w-full mb-3 !h-[38px]"
            value={busca}
            onChange={e => setBusca(e.target.value)}
          />

          <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
            <Chip ativo={tipo === ''} onClick={() => setTipo('')}>Todos</Chip>
            {TIPOS.map(t => <Chip key={t} ativo={tipo === t} onClick={() => setTipo(tipo === t ? '' : t)}>{t}</Chip>)}
          </div>

          <div className="flex gap-2 mb-4">
            {[['', 'Todos'], ['sim', 'Disponíveis'], ['nao', 'Indisponíveis']].map(([val, label]) => (
              <button
                key={val}
                onClick={() => setDisponibilidade(val)}
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                  disponibilidade === val ? 'border-gray-400 bg-gray-100 font-medium' : 'border-gray-200 text-gray-500 hover:border-gray-300'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="border rounded-2xl overflow-hidden">
            {carregando ? (
              <div className="divide-y">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-3 animate-pulse">
                    <div className="w-10 h-14 rounded-lg bg-gray-100 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="h-4 bg-gray-100 rounded w-36 mb-1" />
                      <div className="h-3 bg-gray-100 rounded w-24" />
                    </div>
                  </div>
                ))}
              </div>
            ) : livros.length === 0 ? (
              <p className="text-center py-10 text-sm text-gray-400">Nenhum título encontrado</p>
            ) : livros.map(livro => {
              const ativo = selecionado?.id === livro.id
              return (
                <button
                  key={livro.id}
                  onClick={() => setSelecionado(livro)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left border-b last:border-none transition-colors ${ativo ? 'bg-gray-50' : 'hover:bg-gray-50'}`}
                >
                  <div
                    className="w-10 h-14 rounded-lg flex items-center justify-center text-base font-medium flex-shrink-0"
                    style={{ background: corTipo(livro.tipo) }}
                  >
                    {livro.imagem_url
                      ? <img src={livro.imagem_url} alt="" className="w-full h-full object-cover rounded-lg" />
                      : livro.titulo[0]?.toUpperCase()
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm truncate ${ativo ? 'font-medium' : ''}`}>{livro.titulo}</p>
                    <p className="text-xs text-gray-400 truncate">{livro.autor ?? 'Autor desconhecido'}</p>
                    <div className="flex gap-1.5 mt-1">
                      {livro.exemplares_disponiveis > 0 ? (
                        <span className="text-[10px] font-medium bg-green-50 text-green-800 px-1.5 py-0.5 rounded-full">
                          {livro.exemplares_disponiveis} disp.
                        </span>
                      ) : (
                        <span className="text-[10px] font-medium bg-red-50 text-red-800 px-1.5 py-0.5 rounded-full">
                          Indisp.
                        </span>
                      )}
                      {livro.tipo && (
                        <span className="text-[10px] bg-purple-50 text-purple-800 px-1.5 py-0.5 rounded-full capitalize">
                          {livro.tipo}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>

          {/* Paginação */}
          {totalPaginas > 1 && (
            <div className="flex items-center justify-center gap-3 text-xs text-gray-500 mt-3">
              <button onClick={() => setPagina(p => Math.max(1, p - 1))} disabled={pagina === 1} className="border rounded-lg px-2.5 py-1 hover:bg-gray-50 disabled:opacity-40 transition-colors">←</button>
              <span>{pagina}/{totalPaginas}</span>
              <button onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))} disabled={pagina === totalPaginas} className="border rounded-lg px-2.5 py-1 hover:bg-gray-50 disabled:opacity-40 transition-colors">→</button>
            </div>
          )}
        </div>

        {/* Painel de detalhe */}
        <div className="lg:col-span-3">
          {selecionado && detalhe ? (
            <PainelLivro
              livro={detalhe}
              exemplares={exemplares}
              carregando={carregandoDetalhe}
              onEditar={() => router.push(`/acervo/${detalhe.id}/editar`)}
              onEmprestar={() => router.push(`/emprestimos/novo?acervo_id=${detalhe.id}`)}
            />
          ) : selecionado && carregandoDetalhe ? (
            <div className="space-y-4">
              <div className="flex gap-4 animate-pulse">
                <div className="w-20 h-28 rounded-xl bg-gray-100" />
                <div className="flex-1">
                  <div className="h-5 bg-gray-100 rounded w-48 mb-2" />
                  <div className="h-4 bg-gray-100 rounded w-32 mb-3" />
                  <div className="h-4 bg-gray-100 rounded w-20" />
                </div>
              </div>
              <div className="h-24 bg-gray-50 rounded-xl animate-pulse" />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-2xl">
              <p className="mb-1">Selecione um título</p>
              <p className="text-xs">para ver os detalhes e exemplares</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── Painel de detalhe do livro (inline) ── */

function PainelLivro({
  livro, exemplares, carregando, onEditar, onEmprestar,
}: {
  livro: AcervoDetalhe
  exemplares: Exemplar[]
  carregando: boolean
  onEditar: () => void
  onEmprestar: () => void
}) {
  const disponiveis = exemplares.filter(e => e.disponivel).length

  if (carregando) {
    return <div className="h-40 bg-gray-50 rounded-xl animate-pulse" />
  }

  return (
    <div>
      {/* Cabeçalho */}
      <div className="flex gap-4 mb-5">
        <div className="w-20 h-28 rounded-xl flex items-center justify-center text-3xl flex-shrink-0" style={{ background: '#EEEDFE' }}>
          {livro.imagem_url
            ? <img src={livro.imagem_url} alt="" className="w-full h-full object-cover rounded-xl" />
            : livro.titulo[0]?.toUpperCase()
          }
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-medium leading-tight mb-1">{livro.titulo}</h2>
          <p className="text-sm text-gray-500 mb-3">{livro.autor ?? 'Autor desconhecido'}</p>
          <div className="flex gap-2 flex-wrap">
            {disponiveis > 0
              ? <span className="text-xs font-medium bg-green-50 text-green-800 px-3 py-1 rounded-full">{disponiveis} disponíve{disponiveis === 1 ? 'l' : 'is'}</span>
              : <span className="text-xs font-medium bg-red-50 text-red-800 px-3 py-1 rounded-full">Todos emprestados</span>
            }
            {livro.tipo && <span className="text-xs font-medium bg-purple-50 text-purple-800 px-3 py-1 rounded-full capitalize">{livro.tipo}</span>}
            {livro.cdd  && <span className="text-xs font-mono bg-gray-100 text-gray-600 px-3 py-1 rounded-md">CDD {livro.cdd}</span>}
          </div>
        </div>
      </div>

      {/* Metadados */}
      <div className="bg-gray-50 rounded-xl p-4 mb-5 text-sm divide-y divide-gray-100">
        {[['Editora', livro.editora], ['Gênero', livro.genero], ['Categoria', livro.categoria], ['Série/PNLD', livro.serie]]
          .filter(([, v]) => v)
          .map(([label, valor]) => (
            <div key={label} className="flex justify-between py-2 first:pt-0 last:pb-0">
              <span className="text-gray-500">{label}</span>
              <span>{valor}</span>
            </div>
          ))}
      </div>

      {livro.descricao && <DescricaoLivro texto={livro.descricao} />}

      {/* Exemplares */}
      <h3 className="text-sm font-medium mb-3">Exemplares <span className="text-gray-400 font-normal">({exemplares.length})</span></h3>

      <div className="border rounded-xl overflow-x-auto mb-5">
        <table className="w-full text-sm min-w-[500px]">
          <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
            <tr>
              {['Tombo', 'Volume', 'Edição', 'Aquisição', 'Cadastro', 'Status'].map(h => (
                <th key={h} className="text-left px-3 py-2 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {exemplares.map(ex => (
              <tr key={ex.id} className="border-t hover:bg-gray-50">
                <td className="px-3 py-2 font-mono text-xs">{ex.tombo ? `#${ex.tombo}` : '—'}</td>
                <td className="px-3 py-2 text-gray-500 text-xs">{ex.volume ?? '—'}</td>
                <td className="px-3 py-2 text-gray-500 text-xs">{ex.edicao ?? '—'}</td>
                <td className="px-3 py-2 capitalize text-gray-500 text-xs">{ex.aquisicao ?? '—'}</td>
                <td className="px-3 py-2 text-gray-500 text-xs">{ex.data_cadastro ? fmt(ex.data_cadastro) : '—'}</td>
                <td className="px-3 py-2">
                  {ex.disponivel
                    ? <span className="text-xs font-medium bg-green-50 text-green-800 px-2 py-0.5 rounded-full">Disponível</span>
                    : <span className="text-xs font-medium bg-red-50 text-red-700 px-2 py-0.5 rounded-full">Emprestado</span>
                  }
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Ações */}
      <div className="flex gap-3">
        <button onClick={onEditar} className="flex-1 border rounded-xl py-2.5 text-sm font-medium hover:bg-gray-50 transition-colors">
          ✎ Editar
        </button>
        {disponiveis > 0 && (
          <button onClick={onEmprestar} className="flex-[2] bg-blue-800 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-blue-900 transition-colors">
            Emprestar exemplar
          </button>
        )}
      </div>
    </div>
  )
}

/* ── Descrição com "Ler mais" ── */

function DescricaoLivro({ texto }: { texto: string }) {
  const [expandido, setExpandido] = useState(false)
  const curto = texto.length > 150

  return (
    <div className="mb-5">
      <p
        className={`text-sm text-gray-600 leading-relaxed ${!expandido && curto ? 'line-clamp-3' : ''}`}
      >
        {texto}
      </p>
      {curto && (
        <button
          onClick={() => setExpandido(!expandido)}
          className="text-xs text-blue-700 hover:text-blue-900 mt-1 transition-colors"
        >
          {expandido ? '← Ler menos' : 'Ler mais →'}
        </button>
      )}
    </div>
  )
}
