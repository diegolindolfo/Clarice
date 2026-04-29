// ── Formatação de data (fuso local) ─────────────────────
// BUG CORRIGIDO: new Date("2026-01-15") interpreta como UTC → data aparece um dia antes no Brasil.
// Extraímos os componentes manualmente para construir a data no fuso local.
export function fmt(d: string | null | undefined): string {
  if (!d) return ''
  const partes = d.split('T')[0].split('-').map(Number)
  if (partes.length < 3 || partes.some(n => !Number.isFinite(n))) return ''
  const [y, m, day] = partes
  return new Date(y, m - 1, day).toLocaleDateString('pt-BR')
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
