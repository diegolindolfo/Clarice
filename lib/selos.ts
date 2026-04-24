// ── Cálculo de selos do Passaporte de Leitura ──────────────────────────────

export type Carimbo = {
  emprestimo_id: string
  titulo: string
  autor: string | null
  tipo: string | null
  genero: string | null
  imagem_url: string | null
  data_saida: string
  data_devolucao_real: string | null
  status: 'EMPRESTADO' | 'RENOVADO' | 'DEVOLVIDO' | 'ATRASADO'
  em_atraso: boolean
}

export type Selo = {
  id: string
  nome: string
  descricao: string
  icone: string
  categoria: 'volume' | 'diversidade' | 'constancia' | 'especial'
  conquistado: boolean
  progresso: number // 0..1
  atual: number
  meta: number
  dataConquista: string | null // ISO date when unlocked (best effort)
}

export type ResumoPassaporte = {
  lidos: number
  emLeitura: number
  tiposDistintos: number
  generosDistintos: number
  mesesConsecutivos: number
  melhorMes: { mes: string; total: number } | null
  primeiroCarimbo: string | null // ISO date
  ultimoCarimbo: string | null // ISO date
}

// ── Definição estática dos selos ────────────────────────────────────────────

const METAS_VOLUME: { meta: number; nome: string; descricao: string; icone: string }[] = [
  { meta: 1,   nome: 'Primeiro Livro',  descricao: 'Devolveu o primeiro livro.',     icone: '🌱' },
  { meta: 5,   nome: 'Leitor',          descricao: 'Leu 5 livros.',                   icone: '📖' },
  { meta: 10,  nome: 'Devorador',       descricao: 'Leu 10 livros.',                  icone: '📚' },
  { meta: 25,  nome: 'Erudito',         descricao: 'Leu 25 livros.',                  icone: '🎓' },
  { meta: 50,  nome: 'Mestre',          descricao: 'Leu 50 livros.',                  icone: '🏆' },
  { meta: 100, nome: 'Lenda',           descricao: 'Leu 100 livros.',                 icone: '🌟' },
]

const METAS_TIPOS: { meta: number; nome: string; descricao: string; icone: string }[] = [
  { meta: 3, nome: 'Eclético',  descricao: 'Leu 3 tipos diferentes de obras.', icone: '🎭' },
  { meta: 5, nome: 'Onívoro',   descricao: 'Leu 5 tipos diferentes de obras.', icone: '🎨' },
]

const METAS_GENEROS: { meta: number; nome: string; descricao: string; icone: string }[] = [
  { meta: 3,  nome: 'Curioso',    descricao: 'Explorou 3 gêneros.',  icone: '🧭' },
  { meta: 5,  nome: 'Explorador', descricao: 'Explorou 5 gêneros.',  icone: '🗺️' },
  { meta: 10, nome: 'Polímata',   descricao: 'Explorou 10 gêneros.', icone: '🌍' },
]

const METAS_CONSTANCIA: { meta: number; nome: string; descricao: string; icone: string }[] = [
  { meta: 3,  nome: 'Constante',    descricao: '3 meses seguidos lendo.',  icone: '🔥' },
  { meta: 6,  nome: 'Persistente',  descricao: '6 meses seguidos lendo.',  icone: '🔥' },
  { meta: 12, nome: 'Ano Completo', descricao: '12 meses seguidos lendo.', icone: '👑' },
]

// ── Helpers ─────────────────────────────────────────────────────────────────

function chaveMes(dataISO: string): string {
  return dataISO.slice(0, 7) // YYYY-MM
}

function contarMesesConsecutivos(mesesComLeitura: Set<string>): number {
  if (mesesComLeitura.size === 0) return 0
  const ordenados = Array.from(mesesComLeitura).sort() // asc
  let melhor = 1
  let atual = 1
  for (let i = 1; i < ordenados.length; i++) {
    const [pa, pma] = ordenados[i - 1].split('-').map(Number)
    const [pb, pmb] = ordenados[i].split('-').map(Number)
    const difMeses = (pb - pa) * 12 + (pmb - pma)
    if (difMeses === 1) {
      atual++
      if (atual > melhor) melhor = atual
    } else {
      atual = 1
    }
  }
  return melhor
}

// Devolve a data (ISO) do N-ésimo carimbo — usado como proxy de "quando conquistou"
function dataDoNesimo(carimbos: Carimbo[], n: number): string | null {
  if (n <= 0 || n > carimbos.length) return null
  const devolvidos = carimbos
    .filter(c => c.status === 'DEVOLVIDO' && c.data_devolucao_real)
    .sort((a, b) => (a.data_devolucao_real! < b.data_devolucao_real! ? -1 : 1))
  return devolvidos[n - 1]?.data_devolucao_real ?? null
}

// ── Cálculo principal ───────────────────────────────────────────────────────

export function calcularPassaporte(carimbos: Carimbo[]): {
  selos: Selo[]
  resumo: ResumoPassaporte
} {
  const devolvidos = carimbos.filter(c => c.status === 'DEVOLVIDO')
  const emLeitura = carimbos.filter(c => c.status === 'EMPRESTADO' || c.status === 'RENOVADO').length
  const lidos = devolvidos.length

  const tipos = new Set<string>()
  const generos = new Set<string>()
  const porMes: Record<string, number> = {}

  for (const c of devolvidos) {
    if (c.tipo) tipos.add(c.tipo.trim().toLowerCase())
    if (c.genero) generos.add(c.genero.trim().toLowerCase())
    const data = c.data_devolucao_real ?? c.data_saida
    const mes = chaveMes(data)
    porMes[mes] = (porMes[mes] ?? 0) + 1
  }

  const mesesConsecutivos = contarMesesConsecutivos(new Set(Object.keys(porMes)))
  const melhorMesEntry = Object.entries(porMes).sort((a, b) => b[1] - a[1])[0]
  const melhorMes = melhorMesEntry ? { mes: melhorMesEntry[0], total: melhorMesEntry[1] } : null

  const datasOrdenadas = devolvidos
    .map(c => c.data_devolucao_real)
    .filter((d): d is string => !!d)
    .sort()

  const primeiroCarimbo = datasOrdenadas[0] ?? null
  const ultimoCarimbo = datasOrdenadas[datasOrdenadas.length - 1] ?? null

  // ── Construir lista de selos ────────────────────────────────────────────
  const selos: Selo[] = []

  for (const m of METAS_VOLUME) {
    const conquistado = lidos >= m.meta
    selos.push({
      id: `volume-${m.meta}`,
      nome: m.nome,
      descricao: m.descricao,
      icone: m.icone,
      categoria: 'volume',
      conquistado,
      atual: Math.min(lidos, m.meta),
      meta: m.meta,
      progresso: Math.min(lidos / m.meta, 1),
      dataConquista: conquistado ? dataDoNesimo(carimbos, m.meta) : null,
    })
  }

  for (const m of METAS_TIPOS) {
    const atual = tipos.size
    const conquistado = atual >= m.meta
    selos.push({
      id: `tipos-${m.meta}`,
      nome: m.nome,
      descricao: m.descricao,
      icone: m.icone,
      categoria: 'diversidade',
      conquistado,
      atual: Math.min(atual, m.meta),
      meta: m.meta,
      progresso: Math.min(atual / m.meta, 1),
      dataConquista: null,
    })
  }

  for (const m of METAS_GENEROS) {
    const atual = generos.size
    const conquistado = atual >= m.meta
    selos.push({
      id: `generos-${m.meta}`,
      nome: m.nome,
      descricao: m.descricao,
      icone: m.icone,
      categoria: 'diversidade',
      conquistado,
      atual: Math.min(atual, m.meta),
      meta: m.meta,
      progresso: Math.min(atual / m.meta, 1),
      dataConquista: null,
    })
  }

  for (const m of METAS_CONSTANCIA) {
    const conquistado = mesesConsecutivos >= m.meta
    selos.push({
      id: `constancia-${m.meta}`,
      nome: m.nome,
      descricao: m.descricao,
      icone: m.icone,
      categoria: 'constancia',
      conquistado,
      atual: Math.min(mesesConsecutivos, m.meta),
      meta: m.meta,
      progresso: Math.min(mesesConsecutivos / m.meta, 1),
      dataConquista: null,
    })
  }

  // ── Selos especiais ─────────────────────────────────────────────────────
  const maratonista = (melhorMes?.total ?? 0) >= 3
  selos.push({
    id: 'especial-maratonista',
    nome: 'Maratonista',
    descricao: 'Leu 3 ou mais livros em um único mês.',
    icone: '⚡',
    categoria: 'especial',
    conquistado: maratonista,
    atual: Math.min(melhorMes?.total ?? 0, 3),
    meta: 3,
    progresso: Math.min((melhorMes?.total ?? 0) / 3, 1),
    dataConquista: null,
  })

  const anoAtual = new Date().getFullYear()
  const lidosNoAno = devolvidos.filter(c => {
    const data = c.data_devolucao_real ?? c.data_saida
    return data.startsWith(String(anoAtual))
  }).length
  const leitorDoAno = lidosNoAno >= 12
  selos.push({
    id: 'especial-leitor-do-ano',
    nome: `Leitor de ${anoAtual}`,
    descricao: `Leu 12 livros em ${anoAtual}.`,
    icone: '🎖️',
    categoria: 'especial',
    conquistado: leitorDoAno,
    atual: Math.min(lidosNoAno, 12),
    meta: 12,
    progresso: Math.min(lidosNoAno / 12, 1),
    dataConquista: null,
  })

  return {
    selos,
    resumo: {
      lidos,
      emLeitura,
      tiposDistintos: tipos.size,
      generosDistintos: generos.size,
      mesesConsecutivos,
      melhorMes,
      primeiroCarimbo,
      ultimoCarimbo,
    },
  }
}

// ── Utilitário: próximo selo a conquistar ──────────────────────────────────

export function proximoSelo(selos: Selo[]): Selo | null {
  const pendentes = selos.filter(s => !s.conquistado)
  if (pendentes.length === 0) return null
  return pendentes.sort((a, b) => b.progresso - a.progresso)[0]
}
