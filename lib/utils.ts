// ── Formatação de data (fuso local) ─────────────────────
// BUG CORRIGIDO: new Date("2026-01-15") interpreta como UTC → data aparece um dia antes no Brasil.
// Extraímos os componentes manualmente para construir a data no fuso local.
export function fmt(d: string) {
  const [y, m, day] = d.split('T')[0].split('-').map(Number)
  return new Date(y, m - 1, day).toLocaleDateString('pt-BR')
}

const TIMEZONE_PADRAO = 'America/Fortaleza'

/** Extrai ano, mês (0..11) e dia no fuso de Brasília/Fortaleza, seguro tanto no cliente quanto em SSR UTC. */
export function partesDataLocal(d: Date = new Date()): { ano: number; mes: number; dia: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TIMEZONE_PADRAO,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(d)

  const get = (type: string) => Number(parts.find(p => p.type === type)?.value ?? 0)
  return {
    ano: get('year'),
    mes: get('month') - 1,
    dia: get('day'),
  }
}

/** Retorna YYYY-MM-DD no fuso de Brasília/Fortaleza (seguro no cliente e em SSR UTC). */
export function hojeLocal(d: Date = new Date()): string {
  const { ano, mes, dia } = partesDataLocal(d)
  return `${ano}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
}

// ── Avatares ────────────────────────────────────────────
export const CORES_AVATAR = [
  { bg: '#E6F1FB', tc: '#0C447C' }, { bg: '#EEEDFE', tc: '#3C3489' },
  { bg: '#E1F5EE', tc: '#085041' }, { bg: '#FAEEDA', tc: '#633806' },
  { bg: '#FAECE7', tc: '#712B13' }, { bg: '#FBEAF0', tc: '#72243E' },
]

export function corAvatar(m: number) {
  return CORES_AVATAR[m % CORES_AVATAR.length]
}

export function iniciais(nome: string) {
  return nome.split(' ').slice(0, 2).map(p => p[0]).join('').toUpperCase()
}

// ── Sanitização de busca ────────────────────────────────
// Escapa caracteres especiais do LIKE/ILIKE no PostgREST (%  _  \)
// para evitar comportamento inesperado com entrada do usuário.
export function sanitizeBusca(termo: string): string {
  return termo
    .replace(/\\/g, '\\\\')
    .replace(/%/g, '\\%')
    .replace(/_/g, '\\_')
}

/** Sanitiza termo para uso seguro dentro de filtros `.or(...)` do PostgREST. */
export function sanitizeBuscaOr(termo: string): string {
  return sanitizeBusca(termo).replace(/[,()]/g, ' ').trim()
}
