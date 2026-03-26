'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'



const TIPOS = ['literatura', 'paradidático', 'técnico', 'didático', 'filosofia', 'outro']

type NovoLivroForm = {
  titulo: string
  autor: string
  editora: string
  genero: string
  categoria: string
  tipo: string
  cdd: string
  serie: string
  descricao: string
  // Primeiro exemplar
  tombo: string
  volume: string
  edicao: string
  aquisicao: string
}

const INITIAL: NovoLivroForm = {
  titulo: '',
  autor: '',
  editora: '',
  genero: '',
  categoria: '',
  tipo: '',
  cdd: '',
  serie: '',
  descricao: '',
  tombo: '',
  volume: '',
  edicao: '',
  aquisicao: '',
}

export default function NovoCadastroPage() {
  const supabase = createClient()
  const router = useRouter()
  const [form, setForm] = useState<NovoLivroForm>(INITIAL)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState(false)

  const set = (field: keyof NovoLivroForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm((f) => ({ ...f, [field]: e.target.value }))
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    if (!form.titulo.trim()) {
      setErro('O título é obrigatório.')
      return
    }
    setSalvando(true)
    setErro('')

    // 1. Inserir no acervo
    const { data: acervoData, error: acervoError } = await supabase
      .from('acervo')
      .insert({
        titulo: form.titulo.trim(),
        autor: form.autor.trim() || null,
        editora: form.editora.trim() || null,
        genero: form.genero.trim() || null,
        categoria: form.categoria.trim() || null,
        tipo: form.tipo || null,
        cdd: form.cdd.trim() || null,
        serie: form.serie.trim() || null,
        descricao: form.descricao.trim() || null,
      })
      .select('id')
      .single()

    if (acervoError) {
      setSalvando(false)
      setErro(acervoError.message)
      return
    }

    // 2. Inserir o primeiro exemplar (se tombo preenchido ou não)
    const { error: exemplarError } = await supabase
      .from('livros_exemplares')
      .insert({
        acervo_id: acervoData.id,
        tombo: form.tombo.trim() ? parseInt(form.tombo) : null,
        volume: form.volume.trim() || null,
        edicao: form.edicao.trim() || null,
        aquisicao: form.aquisicao.trim() || null,
        disponivel: true,
      })

    setSalvando(false)

    if (exemplarError) {
      setErro(`Título cadastrado, mas erro no exemplar: ${exemplarError.message}`)
      return
    }

    setSucesso(true)
    // Redirect after brief delay to show success
    setTimeout(() => router.push(`/acervo/${acervoData.id}`), 1200)
  }

  function resetForm() {
    setForm(INITIAL)
    setErro('')
    setSucesso(false)
  }

  return (
    <div className="max-w-2xl mx-auto p-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.back()}
          className="text-sm transition-colors"
          style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
        >
          ← Voltar
        </button>
        <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
          Novo título no acervo
        </h1>
      </div>

      {sucesso ? (
        <div className="glass-card p-8 text-center animate-scale-in">
          <div className="text-4xl mb-4">✅</div>
          <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
            Título cadastrado com sucesso!
          </h2>
          <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
            Redirecionando para a página do livro...
          </p>
          <div className="flex gap-3 justify-center">
            <button onClick={resetForm} className="btn-ghost px-6 py-2.5">
              Cadastrar outro
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={salvar}>
          {/* Dados do título */}
          <div className="glass-card p-5 mb-5 animate-slide-up delay-1">
            <p className="text-xs font-medium uppercase tracking-wider mb-4" style={{ color: 'var(--text-muted)' }}>
              Informações do título
            </p>

            <div className="grid grid-cols-1 gap-4">
              {/* Título - obrigatório */}
              <div>
                <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>
                  Título <span style={{ color: 'var(--accent-rose)' }}>*</span>
                </label>
                <input
                  autoFocus
                  required
                  className="dark-input w-full"
                  placeholder="Ex: Dom Casmurro"
                  value={form.titulo}
                  onChange={set('titulo')}
                />
              </div>

              {/* Autor */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>
                    Autor
                  </label>
                  <input
                    className="dark-input w-full"
                    placeholder="Ex: Machado de Assis"
                    value={form.autor}
                    onChange={set('autor')}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>
                    Editora
                  </label>
                  <input
                    className="dark-input w-full"
                    placeholder="Ex: Companhia das Letras"
                    value={form.editora}
                    onChange={set('editora')}
                  />
                </div>
              </div>

              {/* Tipo e CDD */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>
                    Tipo
                  </label>
                  <select className="dark-select w-full" value={form.tipo} onChange={set('tipo')}>
                    <option value="">Selecionar tipo</option>
                    {TIPOS.map((t) => (
                      <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>
                    CDD
                  </label>
                  <input
                    className="dark-input w-full"
                    placeholder="Ex: 823.88"
                    value={form.cdd}
                    onChange={set('cdd')}
                  />
                </div>
              </div>

              {/* Gênero e Categoria */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>
                    Gênero
                  </label>
                  <input
                    className="dark-input w-full"
                    placeholder="Ex: Romance"
                    value={form.genero}
                    onChange={set('genero')}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>
                    Categoria
                  </label>
                  <input
                    className="dark-input w-full"
                    placeholder="Ex: Ficção"
                    value={form.categoria}
                    onChange={set('categoria')}
                  />
                </div>
              </div>

              {/* Série */}
              <div>
                <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>
                  Série / PNLD
                </label>
                <input
                  className="dark-input w-full"
                  placeholder="Ex: PNLD 2024"
                  value={form.serie}
                  onChange={set('serie')}
                />
              </div>

              {/* Descrição */}
              <div>
                <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>
                  Descrição
                </label>
                <textarea
                  className="dark-input w-full resize-none"
                  rows={3}
                  placeholder="Sinopse ou descrição do livro (opcional)"
                  value={form.descricao}
                  onChange={set('descricao')}
                  style={{ minHeight: '80px' }}
                />
              </div>
            </div>
          </div>

          {/* Primeiro exemplar */}
          <div className="glass-card p-5 mb-5 animate-slide-up delay-2">
            <p className="text-xs font-medium uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>
              Primeiro exemplar físico
            </p>
            <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
              Será criado automaticamente como disponível
            </p>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>
                  Nº de Tombo
                </label>
                <input
                  className="dark-input w-full"
                  placeholder="Ex: 1234"
                  type="number"
                  value={form.tombo}
                  onChange={set('tombo')}
                />
              </div>
              <div>
                <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>
                  Volume
                </label>
                <input
                  className="dark-input w-full"
                  placeholder="Ex: Vol. 1"
                  value={form.volume}
                  onChange={set('volume')}
                />
              </div>
              <div>
                <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>
                  Edição
                </label>
                <input
                  className="dark-input w-full"
                  placeholder="Ex: 3ª edição"
                  value={form.edicao}
                  onChange={set('edicao')}
                />
              </div>
              <div>
                <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>
                  Aquisição
                </label>
                <input
                  className="dark-input w-full"
                  placeholder="Ex: doação, compra"
                  value={form.aquisicao}
                  onChange={set('aquisicao')}
                />
              </div>
            </div>
          </div>

          {/* Error */}
          {erro && (
            <div
              className="rounded-xl px-4 py-3 mb-5 text-sm animate-fade-in"
              style={{ background: 'var(--accent-rose-soft)', color: 'var(--accent-rose)' }}
            >
              {erro}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 animate-slide-up delay-3">
            <button type="button" onClick={() => router.back()} className="btn-ghost flex-1 py-3">
              Cancelar
            </button>
            <button type="submit" disabled={salvando} className="btn-primary flex-[2] py-3">
              {salvando ? 'Salvando...' : 'Cadastrar título'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
