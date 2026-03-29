'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Exemplar = { key: string; tombo: string; volume: string; edicao: string; aquisicao: string; data_cadastro: string }
type Forma    = { titulo: string; autor: string; editora: string; cdd: string; descricao: string; tipo: string; genero: string; categoria: string; serie: string; imagem_url: string }

const TIPOS      = ['literatura', 'paradidático', 'técnico', 'didático', 'filosofia', 'outro']
const AQUISICOES = ['pnld', 'doação', 'compra', 'gestão', 'permuta', 'outro']

function novoExemplar(): Exemplar {
  return { key: crypto.randomUUID(), tombo: '', volume: '', edicao: '', aquisicao: 'compra', data_cadastro: new Date().toISOString().split('T')[0] }
}

function Campo({ label, erro, children }: { label: string; erro?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      {children}
      {erro && <p className="text-xs text-red-600 mt-1">{erro}</p>}
    </div>
  )
}

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">{titulo}</p>
      {children}
      <div className="mt-6 border-b border-gray-100" />
    </div>
  )
}

export default function NovoTituloPage() {
  const router = useRouter()
  const [salvando, setSalvando] = useState(false)
  const [erros, setErros]       = useState<Record<string, string>>({})

  const [forma, setForma] = useState<Forma>({
    titulo: '', autor: '', editora: '', cdd: '', descricao: '',
    tipo: 'literatura', genero: '', categoria: '', serie: '', imagem_url: '',
  })

  const [exemplares, setExemplares] = useState<Exemplar[]>([novoExemplar()])

  function setField(campo: keyof Forma, valor: string) {
    setForma(f => ({ ...f, [campo]: valor }))
    if (erros[campo]) setErros(e => { const n = { ...e }; delete n[campo]; return n })
  }

  function setExemplarField(key: string, campo: keyof Exemplar, valor: string) {
    setExemplares(list => list.map(ex => ex.key === key ? { ...ex, [campo]: valor } : ex))
  }

  function validar(): boolean {
    const novosErros: Record<string, string> = {}
    if (!forma.titulo.trim()) novosErros.titulo = 'Título é obrigatório'
    const tombos = exemplares.map(e => e.tombo).filter(Boolean)
    if (tombos.length !== new Set(tombos).size) novosErros.tombos = 'Há tombos duplicados entre os exemplares'
    setErros(novosErros)
    return Object.keys(novosErros).length === 0
  }

  async function salvar() {
    if (!validar()) return
    setSalvando(true)

    const { data: acervoData, error: acervoError } = await supabase
      .from('acervo')
      .insert({
        titulo:     forma.titulo.trim(),
        autor:      forma.autor.trim()     || null,
        editora:    forma.editora.trim()   || null,
        cdd:        forma.cdd.trim()       || null,
        descricao:  forma.descricao.trim() || null,
        tipo:       forma.tipo             || null,
        genero:     forma.genero.trim()    || null,
        categoria:  forma.categoria.trim() || null,
        serie:      forma.serie.trim()     || null,
        imagem_url: forma.imagem_url.trim()|| null,
      })
      .select('id')
      .single()

    if (acervoError || !acervoData) {
      setErros({ geral: acervoError?.message ?? 'Erro ao salvar título' })
      setSalvando(false)
      return
    }

    const { error: exemplarError } = await supabase.from('livros_exemplares').insert(
      exemplares.map(ex => ({
        acervo_id:     acervoData.id,
        tombo:         ex.tombo ? Number(ex.tombo) : null,
        volume:        ex.volume.trim()  || null,
        edicao:        ex.edicao.trim()  || null,
        aquisicao:     ex.aquisicao      || null,
        data_cadastro: ex.data_cadastro  || null,
        disponivel:    true,
      }))
    )

    setSalvando(false)
    if (exemplarError) {
      setErros({ geral: `Título salvo, mas erro nos exemplares: ${exemplarError.message}` })
      return
    }

    router.push(`/acervo/${acervoData.id}`)
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="text-sm text-gray-500 hover:text-gray-800">← Voltar</button>
        <h1 className="text-xl font-medium">Novo título</h1>
      </div>

      {erros.geral && <div className="bg-red-50 text-red-700 text-sm rounded-xl px-4 py-3 mb-5">{erros.geral}</div>}

      <Secao titulo="Identificação">
        <div className="flex gap-4 mb-4">
          {/* Capa */}
          <div className="flex-shrink-0">
            <label className="block text-xs font-medium text-gray-500 mb-1">Capa</label>
            {forma.imagem_url ? (
              <div className="relative w-20 h-28">
                <img src={forma.imagem_url} alt="Capa" className="w-20 h-28 object-cover rounded-xl border" />
                <button onClick={() => setField('imagem_url', '')} className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-100 text-red-600 rounded-full text-xs">✕</button>
              </div>
            ) : (
              <div className="w-20 h-28 border border-dashed rounded-xl flex flex-col items-center justify-center gap-1 text-gray-400">
                <input placeholder="URL" className="w-16 text-center text-xs border-none p-0 focus:outline-none bg-transparent" value={forma.imagem_url} onChange={e => setField('imagem_url', e.target.value)} />
              </div>
            )}
          </div>
          <div className="flex-1 flex flex-col gap-3">
            <Campo label="Título *" erro={erros.titulo}>
              <input placeholder="Ex: Dom Casmurro" className={`w-full ${erros.titulo ? 'border-red-400' : ''}`} value={forma.titulo} onChange={e => setField('titulo', e.target.value)} />
            </Campo>
            <Campo label="Autor">
              <input placeholder="Ex: Machado de Assis" className="w-full" value={forma.autor} onChange={e => setField('autor', e.target.value)} />
            </Campo>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <Campo label="Editora"><input placeholder="Ex: Ática" className="w-full" value={forma.editora} onChange={e => setField('editora', e.target.value)} /></Campo>
          <Campo label="CDD"><input placeholder="Ex: 869.3" className="w-full font-mono" value={forma.cdd} onChange={e => setField('cdd', e.target.value)} /></Campo>
        </div>
        <Campo label="Descrição / sinopse">
          <textarea placeholder="Resumo opcional..." rows={3} className="w-full resize-none" value={forma.descricao} onChange={e => setField('descricao', e.target.value)} />
        </Campo>
      </Secao>

      <Secao titulo="Classificação">
        <div className="grid grid-cols-3 gap-3 mb-3">
          <Campo label="Tipo">
            <select className="w-full capitalize" value={forma.tipo} onChange={e => setField('tipo', e.target.value)}>
              {TIPOS.map(t => <option key={t} value={t} className="capitalize">{t}</option>)}
            </select>
          </Campo>
          <Campo label="Gênero"><input placeholder="Ex: Romance" className="w-full" value={forma.genero} onChange={e => setField('genero', e.target.value)} /></Campo>
          <Campo label="Série / PNLD"><input placeholder="Ex: PNLD 2021" className="w-full" value={forma.serie} onChange={e => setField('serie', e.target.value)} /></Campo>
        </div>
        <Campo label="Categoria"><input placeholder="Ex: Ficção brasileira" className="w-full" value={forma.categoria} onChange={e => setField('categoria', e.target.value)} /></Campo>
      </Secao>

      <Secao titulo={`Exemplares físicos (${exemplares.length})`}>
        {erros.tombos && <p className="text-xs text-red-600 mb-3">{erros.tombos}</p>}
        <div className="flex flex-col gap-3 mb-3">
          {exemplares.map((ex, i) => (
            <div key={ex.key} className="bg-gray-50 rounded-xl p-3">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-gray-500">Exemplar {i + 1}</span>
                {exemplares.length > 1 && (
                  <button onClick={() => setExemplares(l => l.filter(e => e.key !== ex.key))} className="text-xs text-gray-400 hover:text-red-600">Remover</button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <Campo label="Tombo (nº físico)"><input placeholder="Ex: 41" className="w-full font-mono bg-white" value={ex.tombo} onChange={e => setExemplarField(ex.key, 'tombo', e.target.value)} /></Campo>
                <Campo label="Aquisição">
                  <select className="w-full bg-white capitalize" value={ex.aquisicao} onChange={e => setExemplarField(ex.key, 'aquisicao', e.target.value)}>
                    {AQUISICOES.map(a => <option key={a} value={a} className="capitalize">{a}</option>)}
                  </select>
                </Campo>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Campo label="Volume"><input placeholder="Ex: vol. 1" className="w-full bg-white" value={ex.volume} onChange={e => setExemplarField(ex.key, 'volume', e.target.value)} /></Campo>
                <Campo label="Edição"><input placeholder="Ex: 3ª ed." className="w-full bg-white" value={ex.edicao} onChange={e => setExemplarField(ex.key, 'edicao', e.target.value)} /></Campo>
                <Campo label="Data de cadastro"><input type="date" className="w-full bg-white" value={ex.data_cadastro} onChange={e => setExemplarField(ex.key, 'data_cadastro', e.target.value)} /></Campo>
              </div>
            </div>
          ))}
        </div>
        <button onClick={() => setExemplares(l => [...l, novoExemplar()])} className="w-full border border-dashed rounded-xl py-2.5 text-sm text-gray-500 hover:bg-gray-50">
          + Adicionar exemplar
        </button>
      </Secao>

      <div className="flex gap-3 mt-6">
        <button onClick={() => router.back()} className="flex-1 border rounded-xl py-3 text-sm hover:bg-gray-50">Cancelar</button>
        <button onClick={salvar} disabled={salvando} className="flex-[2] bg-blue-800 text-white rounded-xl py-3 text-sm font-medium hover:bg-blue-900 disabled:opacity-50">
          {salvando ? 'Salvando...' : `Salvar título com ${exemplares.length} exemplar${exemplares.length !== 1 ? 'es' : ''}`}
        </button>
      </div>
    </div>
  )
}
