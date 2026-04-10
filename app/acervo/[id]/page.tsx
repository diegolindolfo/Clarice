'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { fmt } from '@/lib/utils'

type Acervo = {
  id: string; titulo: string; autor: string | null; editora: string | null
  genero: string | null; categoria: string | null; tipo: string | null
  cdd: string | null; serie: string | null; descricao: string | null; imagem_url: string | null
}

type Exemplar = {
  id: string; tombo: number | null; volume: string | null; edicao: string | null
  aquisicao: string | null; data_cadastro: string | null; disponivel: boolean
}

export default function DetalheAcervoPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [livro, setLivro]           = useState<Acervo | null>(null)
  const [exemplares, setExemplares] = useState<Exemplar[]>([])
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    async function carregar() {
      const supabase = createClient()
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

  if (carregando) return <div className="max-w-3xl mx-auto p-6 text-sm text-gray-400 text-center py-16">Carregando...</div>
  if (!livro)    return <div className="max-w-3xl mx-auto p-6 text-sm text-gray-500 text-center py-16">Livro não encontrado.</div>

  const disponiveis = exemplares.filter(e => e.disponivel).length

  return (
    <div className="max-w-3xl mx-auto p-6">
      <button onClick={() => router.back()} className="text-sm text-gray-500 hover:text-gray-800 mb-6 flex items-center gap-1">← Acervo</button>

      <div className="flex gap-5 mb-6">
        <div className="w-20 h-28 rounded-xl flex items-center justify-center text-3xl flex-shrink-0" style={{ background: '#EEEDFE' }}>
          {livro.imagem_url
            ? <img src={livro.imagem_url} alt="" className="w-full h-full object-cover rounded-xl" />
            : livro.titulo[0]?.toUpperCase()
          }
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-medium leading-tight mb-1">{livro.titulo}</h1>
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

      {livro.descricao && <p className="text-sm text-gray-600 leading-relaxed mb-5">{livro.descricao}</p>}

      <h2 className="text-sm font-medium mb-3">Exemplares físicos <span className="text-gray-400 font-normal">({exemplares.length})</span></h2>

      <div className="border rounded-xl overflow-x-auto mb-6">
        <table className="w-full text-sm min-w-[550px]">
          <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
            <tr>
              {['Tombo', 'Volume', 'Edição', 'Aquisição', 'Cadastro', 'Status'].map(h => (
                <th key={h} className="text-left px-4 py-2.5 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {exemplares.map(ex => (
              <tr key={ex.id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-2.5 font-mono text-xs">{ex.tombo ? `#${ex.tombo}` : '—'}</td>
                <td className="px-4 py-2.5 text-gray-500">{ex.volume ?? '—'}</td>
                <td className="px-4 py-2.5 text-gray-500">{ex.edicao ?? '—'}</td>
                <td className="px-4 py-2.5 capitalize text-gray-500">{ex.aquisicao ?? '—'}</td>
                <td className="px-4 py-2.5 text-gray-500">{ex.data_cadastro ? fmt(ex.data_cadastro) : '—'}</td>
                <td className="px-4 py-2.5">
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

      <div className="flex gap-3">
        <button
          onClick={() => router.push(`/acervo/${livro.id}/editar`)}
          className="flex-1 border rounded-xl py-3 text-sm font-medium hover:bg-gray-50 transition-colors"
        >
          ✎ Editar título
        </button>
        {disponiveis > 0 && (
          <button
            onClick={() => router.push(`/emprestimos/novo?acervo_id=${livro.id}`)}
            className="flex-[2] bg-blue-800 text-white rounded-xl py-3 text-sm font-medium hover:bg-blue-900 transition-colors"
          >
            Emprestar um exemplar deste livro
          </button>
        )}
      </div>
    </div>
  )
}
