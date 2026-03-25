'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
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

function corTipo(tipo: string | null) {
  const mapa: Record<string, string> = {
    literatura: '#EEEDFE',
    paradidático: '#E1F5EE',
    técnico: '#FAECE7',
    didático: '#FAEEDA',
    filosofia: '#E6F1FB',
    outro: '#F1EFE8',
  }
  return mapa[tipo?.toLowerCase() ?? ''] ?? '#F1EFE8'
}

function inicialTitulo(titulo: string) {
  return titulo.trim()[0]?.toUpperCase() ?? '?'
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

  useEffect(() => {
    carregar()
  }, [buscaDebounced, tipo, disponibilidade, pagina])

  async function carregar() {
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
  }

  const totalPaginas = Math.ceil(total / POR_PAGINA)

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-medium">Acervo</h1>
          <p className="text-xs text-gray-500 mt-1">
            {carregando ? '...' : `${total} título${total !== 1 ? 's' : ''} encontrado${total !== 1 ? 's' : ''}`}
          </p>
        </div>
      </div>

      <div className="flex gap-2 mb-3 flex-wrap">
        <input
          placeholder="Buscar por título, autor, CDD..."
          className="flex-1 min-w-48 border rounded-xl px-3 py-2 text-sm"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
        <select
          className="border rounded-xl px-3 py-2 text-sm"
          value={disponibilidade}
          onChange={(e) => setDisponibilidade(e.target.value)}
        >
          <option value="">Disponibilidade</option>
          <option value="disponivel">Disponíveis</option>
          <option value="indisponivel">Indisponíveis</option>
        </select>
      </div>

      <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
        <Chip ativo={tipo === ''} onClick={() => setTipo('')}>
          Todos
        </Chip>
        {TIPOS.map((t) => (
          <Chip key={t} ativo={tipo === t} onClick={() => setTipo(tipo === t ? '' : t)}>
            {t}
          </Chip>
        ))}
      </div>

      {carregando ? (
        <div className="text-center py-16 text-sm text-gray-400">Carregando...</div>
      ) : livros.length === 0 ? (
        <div className="text-center py-16 text-sm text-gray-400">Nenhum título encontrado</div>
      ) : (
        <div className="flex flex-col gap-3 mb-6">
          {livros.map((livro) => (
            <button
              key={livro.id}
              onClick={() => router.push(`/acervo/${livro.id}`)}
              className="flex items-center gap-4 p-4 border rounded-2xl text-left hover:border-gray-300 transition-colors group"
            >
              <div
                className="w-12 h-16 rounded-lg flex items-center justify-center text-xl font-medium flex-shrink-0"
                style={{ background: corTipo(livro.tipo) }}
              >
                {livro.imagem_url ? (
                  <img
                    src={livro.imagem_url}
                    alt=""
                    className="w-full h-full object-cover rounded-lg"
                  />
                ) : (
                  inicialTitulo(livro.titulo)
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-medium leading-snug">{livro.titulo}</p>
                  {livro.exemplares_disponiveis > 0 ? (
                    <span className="text-xs font-medium bg-green-50 text-green-800 px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0">
                      {livro.exemplares_disponiveis} disponíve{livro.exemplares_disponiveis === 1 ? 'l' : 'is'}
                    </span>
                  ) : (
                    <span className="text-xs font-medium bg-red-50 text-red-800 px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0">
                      Indisponível
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1 mb-2">{livro.autor ?? 'Autor desconhecido'}</p>
                <div className="flex gap-2 flex-wrap">
                  {livro.tipo && (
                    <span className="text-xs bg-purple-50 text-purple-800 px-2 py-0.5 rounded-full font-medium capitalize">
                      {livro.tipo}
                    </span>
                  )}
                  {livro.cdd && (
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md font-mono">
                      CDD {livro.cdd}
                    </span>
                  )}
                  <span className="text-xs text-gray-400">
                    {livro.total_exemplares} exemplar{livro.total_exemplares !== 1 ? 'es' : ''}
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {totalPaginas > 1 && (
        <div className="flex items-center justify-center gap-3 text-sm text-gray-500">
          <button
            onClick={() => setPagina((p) => Math.max(1, p - 1))}
            disabled={pagina === 1}
            className="border rounded-lg px-3 py-1.5 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            ← Anterior
          </button>
          <span>
            Página {pagina} de {totalPaginas}
          </span>
          <button
            onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
            disabled={pagina === totalPaginas}
            className="border rounded-lg px-3 py-1.5 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
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
      className={`text-xs px-4 py-1.5 rounded-full border whitespace-nowrap transition-colors
        ${
          ativo
            ? 'border-gray-400 bg-gray-100 text-gray-800 font-medium'
            : 'border-gray-200 text-gray-500 hover:border-gray-300'
        }`}
    >
      {children}
    </button>
  )
}
