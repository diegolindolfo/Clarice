// ── Formatação de data (fuso local) ─────────────────────
// BUG CORRIGIDO: new Date("2026-01-15") interpreta como UTC → data aparece um dia antes no Brasil.
// Extraímos os componentes manualmente para construir a data no fuso local.
export function fmt(d: string) {
  const [y, m, day] = d.split('T')[0].split('-').map(Number)
  return new Date(y, m - 1, day).toLocaleDateString('pt-BR')
}

/** Retorna YYYY-MM-DD no fuso local (evita virada antecipada às 21h BRT via toISOString). */
export function hojeLocal(d: Date = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
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
