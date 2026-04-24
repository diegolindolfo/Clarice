'use client'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import {
  parseCSV,
  csvParaObjetos,
  gerarCSV,
  baixarCSV,
  normalizarCabecalho,
} from '@/lib/csv'
import { toast_success, toast_error } from '@/components/Toast'

export const dynamic = 'force-dynamic'

type Aba = 'alunos' | 'acervo'

type LinhaProcessada = {
  numero: number
  dados: Record<string, string>
  erros: string[]
  avisos: string[]
  valido: boolean
}

type Turma = { id: number; nome: string; norm: string }

const TIPOS_VALIDOS = new Set(['literatura', 'paradidático', 'paradidatico', 'técnico', 'tecnico', 'didático', 'didatico', 'filosofia', 'outro'])
const AQUISICAO_VALIDOS = new Set(['pnld', 'doação', 'doacao', 'compra', 'gestão', 'gestao', 'permuta', 'outro'])

// Aliases aceitos em cabeçalhos (tudo é normalizado antes)
const ALIASES_ALUNO: Record<string, string[]> = {
  matricula: ['matricula', 'matrícula', 'mat'],
  nome: ['nome', 'aluno', 'aluno_nome', 'nome_aluno', 'nome_completo'],
  turma: ['turma', 'classe', 'serie', 'série', 'turma_nome'],
  email: ['email', 'e-mail', 'email_aluno'],
}

const ALIASES_ACERVO: Record<string, string[]> = {
  titulo: ['titulo', 'título', 'title', 'obra', 'livro'],
  autor: ['autor', 'autores', 'author'],
  editora: ['editora', 'publisher'],
  cdd: ['cdd', 'codigo_cdd', 'código_cdd'],
  tipo: ['tipo', 'categoria_obra'],
  genero: ['genero', 'gênero', 'genre'],
  categoria: ['categoria', 'subcategoria'],
  serie: ['serie_colecao', 'serie', 'coleção', 'colecao', 'série_coleção'],
  descricao: ['descricao', 'descrição', 'resumo', 'sinopse'],
  imagem_url: ['imagem_url', 'capa', 'imagem', 'url_capa', 'capa_url'],
  tombo: ['tombo', 'exemplar_tombo', 'numero_tombo'],
  aquisicao: ['aquisicao', 'aquisição', 'origem'],
  volume: ['volume', 'vol'],
  edicao: ['edicao', 'edição'],
  isbn: ['isbn'],
}

function resolverAlias(obj: Record<string, string>, aliases: Record<string, string[]>): Record<string, string> {
  const res: Record<string, string> = {}
  for (const [k, lista] of Object.entries(aliases)) {
    for (const nome of lista) {
      const norm = normalizarCabecalho(nome)
      if (norm in obj && obj[norm] !== undefined && obj[norm] !== '') {
        res[k] = obj[norm]
        break
      }
    }
    if (!(k in res)) res[k] = ''
  }
  return res
}

function Tabs({ aba, onChange }: { aba: Aba; onChange: (a: Aba) => void }) {
  return (
    <div className="flex gap-0 border-b mb-6" style={{ borderColor: 'var(--border)' }}>
      {([['alunos', 'Alunos'], ['acervo', 'Acervo']] as const).map(([val, label]) => {
        const ativo = aba === val
        return (
          <button
            key={val}
            onClick={() => onChange(val)}
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
  )
}

export default function ImportarPage() {
  const router = useRouter()
  const [aba, setAba] = useState<Aba>('alunos')
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [linhas, setLinhas] = useState<LinhaProcessada[]>([])
  const [turmas, setTurmas] = useState<Turma[]>([])
  const [matriculasExistentes, setMatriculasExistentes] = useState<Set<number>>(new Set())
  const [processando, setProcessando] = useState(false)
  const [importando, setImportando] = useState(false)
  const [progresso, setProgresso] = useState({ atual: 0, total: 0 })
  const [resultado, setResultado] = useState<{ sucesso: number; conflito: number; erro: number } | null>(null)

  // Carrega turmas e matrículas existentes (para detectar duplicatas e validar turmas)
  useEffect(() => {
    async function carregar() {
      const supabase = createClient()
      const [{ data: t }, { data: a }] = await Promise.all([
        supabase.from('turmas').select('id, nome'),
        supabase.from('alunos').select('matricula'),
      ])
      setTurmas((t ?? []).map((x: any) => ({ id: x.id, nome: x.nome, norm: normalizarCabecalho(x.nome) })))
      setMatriculasExistentes(new Set((a ?? []).map((x: any) => x.matricula)))
    }
    carregar()
  }, [])

  // Reseta ao trocar de aba
  useEffect(() => {
    setArquivo(null)
    setLinhas([])
    setResultado(null)
  }, [aba])

  function validarAlunos(objs: Record<string, string>[]): LinhaProcessada[] {
    const vistos = new Set<number>()
    return objs.map((obj, i) => {
      const dados = resolverAlias(obj, ALIASES_ALUNO)
      const erros: string[] = []
      const avisos: string[] = []

      const mat = dados.matricula.replace(/\D+/g, '')
      if (!mat) {
        erros.push('matrícula faltando ou inválida')
      } else {
        const num = Number(mat)
        if (vistos.has(num)) erros.push('matrícula duplicada no CSV')
        vistos.add(num)
        if (matriculasExistentes.has(num)) avisos.push('matrícula já existe (será atualizada)')
      }

      if (!dados.nome || dados.nome.length < 2) erros.push('nome obrigatório')

      if (!dados.turma) {
        erros.push('turma obrigatória')
      } else {
        const normTurma = normalizarCabecalho(dados.turma)
        const achou = turmas.find(t => t.norm === normTurma)
        if (!achou) avisos.push(`turma "${dados.turma}" será criada`)
      }

      if (dados.email && !/^\S+@\S+\.\S+$/.test(dados.email)) {
        avisos.push('e-mail com formato suspeito')
      }

      return {
        numero: i + 2, // +2 porque linha 1 = header
        dados,
        erros,
        avisos,
        valido: erros.length === 0,
      }
    })
  }

  function validarAcervo(objs: Record<string, string>[]): LinhaProcessada[] {
    const tombosVistos = new Set<number>()
    return objs.map((obj, i) => {
      const dados = resolverAlias(obj, ALIASES_ACERVO)
      const erros: string[] = []
      const avisos: string[] = []

      if (!dados.titulo || dados.titulo.length < 2) erros.push('título obrigatório')

      if (dados.tipo) {
        const norm = normalizarCabecalho(dados.tipo)
        if (!TIPOS_VALIDOS.has(norm)) avisos.push(`tipo "${dados.tipo}" não é padrão`)
      }

      if (dados.tombo) {
        const t = dados.tombo.replace(/\D+/g, '')
        if (!t) {
          avisos.push('tombo inválido (ignorado)')
        } else {
          const num = Number(t)
          if (tombosVistos.has(num)) erros.push('tombo duplicado no CSV')
          tombosVistos.add(num)
        }
      }

      if (dados.aquisicao) {
        const norm = normalizarCabecalho(dados.aquisicao)
        if (!AQUISICAO_VALIDOS.has(norm)) avisos.push(`aquisição "${dados.aquisicao}" não é padrão`)
      }

      return {
        numero: i + 2,
        dados,
        erros,
        avisos,
        valido: erros.length === 0,
      }
    })
  }

  async function processarArquivo(file: File) {
    setProcessando(true)
    setResultado(null)
    try {
      const texto = await file.text()
      const linhasCSV = parseCSV(texto)
      if (linhasCSV.length < 2) {
        toast_error('CSV vazio ou sem cabeçalho')
        setProcessando(false)
        return
      }
      const objs = csvParaObjetos(linhasCSV)
      const processadas = aba === 'alunos' ? validarAlunos(objs) : validarAcervo(objs)
      setLinhas(processadas)
    } catch (err: any) {
      toast_error(`Erro ao ler CSV: ${err?.message ?? err}`)
      setLinhas([])
    } finally {
      setProcessando(false)
    }
  }

  async function importar() {
    if (linhas.length === 0) return
    const validas = linhas.filter(l => l.valido)
    if (validas.length === 0) {
      toast_error('Nenhuma linha válida para importar')
      return
    }

    setImportando(true)
    setProgresso({ atual: 0, total: validas.length })
    let sucesso = 0
    let conflito = 0
    let erro = 0

    const supabase = createClient()

    if (aba === 'alunos') {
      let porTurma = new Map(turmas.map(t => [t.norm, t.id]))

      // 1) Cria turmas ausentes antes do upsert dos alunos (preservando o
      //    primeiro nome com o capitalization original — normTurma nao volta
      //    a ser humano).
      const faltantes = new Map<string, string>()
      for (const l of validas) {
        const norm = normalizarCabecalho(l.dados.turma)
        if (norm && !porTurma.has(norm) && !faltantes.has(norm)) {
          faltantes.set(norm, l.dados.turma.trim())
        }
      }

      if (faltantes.size > 0) {
        const novas = Array.from(faltantes.values()).map(nome => ({ nome }))
        const { data: criadas, error: errTurmas } = await supabase
          .from('turmas')
          .insert(novas)
          .select('id, nome')

        if (errTurmas || !criadas) {
          console.error('Erro ao criar turmas faltantes:', errTurmas)
          toast_error('Não foi possível criar turmas faltantes. Importação abortada.')
          setImportando(false)
          return
        }

        const novasTurmasState: Turma[] = criadas.map((x: { id: number; nome: string }) => ({
          id: x.id, nome: x.nome, norm: normalizarCabecalho(x.nome),
        }))
        setTurmas(prev => [...prev, ...novasTurmasState])
        porTurma = new Map([
          ...porTurma,
          ...novasTurmasState.map(t => [t.norm, t.id] as [string, number]),
        ])
      }

      const payload = validas.map(l => ({
        matricula: Number(l.dados.matricula.replace(/\D+/g, '')),
        nome: l.dados.nome.trim(),
        email: l.dados.email ? l.dados.email.trim() : null,
        turma_id: porTurma.get(normalizarCabecalho(l.dados.turma))!,
        ativo: true,
      }))

      // Divide em lotes de 200
      const lote = 200
      for (let i = 0; i < payload.length; i += lote) {
        const batch = payload.slice(i, i + lote)
        const { error } = await supabase
          .from('alunos')
          .upsert(batch, { onConflict: 'matricula' })
        if (error) {
          erro += batch.length
          console.error('Erro ao importar lote de alunos:', error)
        } else {
          sucesso += batch.length
        }
        setProgresso({ atual: Math.min(i + lote, payload.length), total: payload.length })
      }
    } else {
      // Acervo: 1 row = 1 título (sempre) + 1 exemplar (se tombo presente)
      // Importamos em série para ter controle por linha (conflitos etc)
      for (let i = 0; i < validas.length; i++) {
        const l = validas[i]
        try {
          const payloadAcervo = {
            titulo: l.dados.titulo.trim(),
            autor: l.dados.autor.trim() || null,
            editora: l.dados.editora.trim() || null,
            cdd: l.dados.cdd.trim() || null,
            descricao: l.dados.descricao.trim() || null,
            tipo: l.dados.tipo ? normalizarCabecalho(l.dados.tipo).replace('paradidatico', 'paradidático').replace('tecnico', 'técnico').replace('didatico', 'didático') : null,
            genero: l.dados.genero.trim() || null,
            categoria: l.dados.categoria.trim() || null,
            serie: l.dados.serie.trim() || null,
            imagem_url: l.dados.imagem_url.trim() || null,
          }

          const { data: acervoData, error: acervoError } = await supabase
            .from('acervo')
            .insert(payloadAcervo)
            .select('id')
            .single()

          if (acervoError || !acervoData) {
            erro++
            console.error('Erro ao importar acervo linha', l.numero, acervoError)
          } else if (l.dados.tombo) {
            const tomboNum = Number(l.dados.tombo.replace(/\D+/g, ''))
            const { error: exErr } = await supabase
              .from('livros_exemplares')
              .insert({
                acervo_id: acervoData.id,
                tombo: tomboNum || null,
                volume: l.dados.volume?.trim() || null,
                edicao: l.dados.edicao?.trim() || null,
                aquisicao: l.dados.aquisicao ? normalizarCabecalho(l.dados.aquisicao).replace('doacao', 'doação').replace('gestao', 'gestão') : null,
                data_cadastro: new Date().toISOString().split('T')[0],
                disponivel: true,
              })
            if (exErr) {
              // Título criado mas exemplar falhou (ex.: tombo já usado)
              conflito++
              console.error('Erro ao importar exemplar linha', l.numero, exErr)
            } else {
              sucesso++
            }
          } else {
            sucesso++
          }
        } catch (err) {
          erro++
          console.error('Exceção linha', l.numero, err)
        }
        setProgresso({ atual: i + 1, total: validas.length })
      }
    }

    setImportando(false)
    setResultado({ sucesso, conflito, erro })

    // Limpa o preview e o arquivo apos importar — evita segundo clique criar
    // duplicatas (acervo usa insert, nao upsert) e forca nova selecao de CSV
    // para importar de novo.
    if (sucesso > 0) {
      setLinhas([])
      setArquivo(null)
      // Tambem reatualiza o set de matriculas existentes para refletir as
      // recem-inseridas em validacoes futuras na mesma sessao.
      if (aba === 'alunos') {
        const supabase = createClient()
        supabase
          .from('alunos')
          .select('matricula')
          .then(({ data }: any) => {
            if (data) setMatriculasExistentes(new Set(data.map((x: any) => x.matricula)))
          })
      }
    }

    if (sucesso > 0) toast_success(`${sucesso} registros importados`)
    if (erro > 0) toast_error(`${erro} registros falharam`)
  }

  function baixarTemplate() {
    if (aba === 'alunos') {
      const turmaEx = turmas[0]?.nome ?? '1º A'
      const csv = gerarCSV(
        ['matricula', 'nome', 'turma', 'email'],
        [
          [123456, 'Maria da Silva', turmaEx, 'maria@exemplo.com'],
          [123457, 'João Souza', turmaEx, ''],
        ],
      )
      baixarCSV('modelo_alunos.csv', csv)
    } else {
      const csv = gerarCSV(
        ['titulo', 'autor', 'editora', 'tipo', 'genero', 'cdd', 'categoria', 'serie', 'imagem_url', 'descricao', 'tombo', 'volume', 'edicao', 'aquisicao'],
        [
          ['A Hora da Estrela', 'Clarice Lispector', 'Rocco', 'literatura', 'romance', 'B869.3', '', '', '', 'Romance clássico da literatura brasileira.', 1001, '', '1ª', 'compra'],
          ['Dom Casmurro', 'Machado de Assis', 'Penguin', 'literatura', 'romance', 'B869.3', '', '', '', '', 1002, '', '', 'pnld'],
        ],
      )
      baixarCSV('modelo_acervo.csv', csv)
    }
  }

  const totais = useMemo(() => ({
    total: linhas.length,
    validas: linhas.filter(l => l.valido).length,
    invalidas: linhas.filter(l => !l.valido).length,
    comAvisos: linhas.filter(l => l.avisos.length > 0).length,
  }), [linhas])

  // Turmas novas que seriam criadas ao importar (apenas aba de alunos,
  // considerando somente linhas validas).
  const turmasFaltantes = useMemo(() => {
    if (aba !== 'alunos') return [] as string[]
    const existentes = new Set(turmas.map(t => t.norm))
    const vistas = new Set<string>()
    const resultado: string[] = []
    for (const l of linhas) {
      if (!l.valido || !l.dados.turma) continue
      const norm = normalizarCabecalho(l.dados.turma)
      if (existentes.has(norm) || vistas.has(norm)) continue
      vistas.add(norm)
      resultado.push(l.dados.turma.trim())
    }
    return resultado
  }, [aba, linhas, turmas])

  const colunasPreview = aba === 'alunos'
    ? ['matricula', 'nome', 'turma', 'email']
    : ['titulo', 'autor', 'tipo', 'tombo']

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
        <h1 className="text-xl font-medium">Importar via CSV</h1>
      </div>
      <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
        Carregue um arquivo CSV para cadastrar alunos ou títulos do acervo em lote.
      </p>

      <Tabs aba={aba} onChange={setAba} />

      {/* Upload */}
      <section
        className="rounded-xl border p-5 mb-6"
        style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}
      >
        <div className="flex flex-wrap items-center gap-3">
          <label className="nav-btn-primary text-sm font-medium px-4 py-2 rounded-lg cursor-pointer">
            {arquivo ? 'Trocar arquivo' : 'Selecionar CSV'}
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={e => {
                const f = e.target.files?.[0] ?? null
                setArquivo(f)
                if (f) processarArquivo(f)
              }}
            />
          </label>
          <button
            onClick={baixarTemplate}
            className="text-sm px-4 py-2 rounded-lg border transition-colors"
            style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
          >
            Baixar modelo
          </button>
          {arquivo && (
            <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
              {arquivo.name} · {(arquivo.size / 1024).toFixed(1)} KB
            </span>
          )}
        </div>

        <p className="text-[11px] mt-3" style={{ color: 'var(--text-muted)' }}>
          {aba === 'alunos'
            ? 'Colunas esperadas: matricula, nome, turma, email (opcional). Matrículas já existentes serão atualizadas. Turmas ainda não cadastradas serão criadas automaticamente.'
            : 'Colunas esperadas: titulo (obrigatório), autor, editora, tipo, genero, cdd, tombo, etc. Se informar tombo, 1 exemplar é criado.'}
        </p>
      </section>

      {/* Preview / status */}
      {processando && (
        <div className="text-sm" style={{ color: 'var(--text-muted)' }}>Lendo arquivo...</div>
      )}

      {!processando && linhas.length > 0 && (
        <>
          {/* Resumo */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <div className="rounded-xl border p-4 text-center" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
              <p className="text-2xl font-mono">{totais.total}</p>
              <p className="text-[11px] mt-1 uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Linhas</p>
            </div>
            <div className="rounded-xl border p-4 text-center" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
              <p className="text-2xl font-mono text-green-700">{totais.validas}</p>
              <p className="text-[11px] mt-1 uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Válidas</p>
            </div>
            <div className="rounded-xl border p-4 text-center" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
              <p className="text-2xl font-mono text-red-700">{totais.invalidas}</p>
              <p className="text-[11px] mt-1 uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Com erros</p>
            </div>
            <div className="rounded-xl border p-4 text-center" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
              <p className="text-2xl font-mono text-amber-700">{totais.comAvisos}</p>
              <p className="text-[11px] mt-1 uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Com avisos</p>
            </div>
          </div>

          {/* Aviso de turmas que serão criadas */}
          {turmasFaltantes.length > 0 && (
            <div
              className="rounded-xl border px-4 py-3 mb-4 text-xs"
              style={{
                backgroundColor: 'var(--bg-muted)',
                borderColor: 'var(--border)',
                color: 'var(--text-secondary)',
              }}
            >
              <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                {turmasFaltantes.length} turma{turmasFaltantes.length > 1 ? 's' : ''} nova{turmasFaltantes.length > 1 ? 's' : ''} será{turmasFaltantes.length > 1 ? 'ão' : ''} criada{turmasFaltantes.length > 1 ? 's' : ''} automaticamente:
              </span>{' '}
              {turmasFaltantes.slice(0, 20).join(', ')}
              {turmasFaltantes.length > 20 && ` e mais ${turmasFaltantes.length - 20}...`}
            </div>
          )}

          {/* Botão importar */}
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={importar}
              disabled={importando || totais.validas === 0}
              className="nav-btn-primary text-sm font-medium px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {importando ? `Importando ${progresso.atual}/${progresso.total}...` : `Importar ${totais.validas} ${aba === 'alunos' ? 'alunos' : 'títulos'}`}
            </button>
            {resultado && (
              <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                {resultado.sucesso} criados · {resultado.conflito} conflitos · {resultado.erro} erros
              </span>
            )}
          </div>

          {/* Preview table */}
          <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
            <table className="w-full text-xs">
              <thead>
                <tr style={{ backgroundColor: 'var(--bg-muted)' }}>
                  <th className="px-3 py-2 text-left font-medium w-10" style={{ color: 'var(--text-muted)' }}>#</th>
                  <th className="px-3 py-2 text-left font-medium w-12" style={{ color: 'var(--text-muted)' }}>OK</th>
                  {colunasPreview.map(c => (
                    <th key={c} className="px-3 py-2 text-left font-medium" style={{ color: 'var(--text-muted)' }}>{c}</th>
                  ))}
                  <th className="px-3 py-2 text-left font-medium" style={{ color: 'var(--text-muted)' }}>Observações</th>
                </tr>
              </thead>
              <tbody>
                {linhas.slice(0, 500).map(l => (
                  <tr
                    key={l.numero}
                    className="border-t"
                    style={{
                      borderColor: 'var(--border)',
                      backgroundColor: l.valido ? 'var(--bg-card)' : 'rgba(254, 226, 226, 0.2)',
                    }}
                  >
                    <td className="px-3 py-2 font-mono" style={{ color: 'var(--text-muted)' }}>{l.numero}</td>
                    <td className="px-3 py-2">
                      {l.valido
                        ? <span className="inline-block w-5 h-5 rounded-full bg-green-100 text-green-700 text-center leading-5 text-[11px]">✓</span>
                        : <span className="inline-block w-5 h-5 rounded-full bg-red-100 text-red-700 text-center leading-5 text-[11px]">✕</span>}
                    </td>
                    {colunasPreview.map(c => (
                      <td key={c} className="px-3 py-2 truncate max-w-[200px]">{l.dados[c] || <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
                    ))}
                    <td className="px-3 py-2">
                      {l.erros.length > 0 && (
                        <span className="text-red-700">{l.erros.join(' · ')}</span>
                      )}
                      {l.avisos.length > 0 && (
                        <span className="text-amber-700">
                          {l.erros.length > 0 ? ' · ' : ''}
                          {l.avisos.join(' · ')}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {linhas.length > 500 && (
              <p className="text-[11px] p-3 text-center" style={{ color: 'var(--text-muted)' }}>
                Mostrando 500 de {linhas.length} linhas. Todas serão importadas.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  )
}
