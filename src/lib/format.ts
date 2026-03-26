/**
 * Funções utilitárias compartilhadas pelo projeto Clarice.
 */

/** Formata uma data ISO (yyyy-mm-dd) para o padrão brasileiro (dd/mm/aaaa). */
export function formatDateBR(dateStr: string): string {
  const d = new Date(dateStr)
  return new Date(d.getTime() + d.getTimezoneOffset() * 60000).toLocaleDateString('pt-BR')
}

/** Retorna as iniciais (até 2 letras) de um nome. */
export function iniciais(nome: string): string {
  return nome
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase()
}

/** Retorna uma variável CSS de gradiente baseada na primeira letra do nome. */
const AVATAR_GRADIENTS = [
  'var(--gradient-indigo)',
  'var(--gradient-purple)',
  'var(--gradient-emerald)',
  'var(--gradient-blue)',
  'var(--gradient-amber)',
]

export function avatarGradient(nome: string): string {
  return AVATAR_GRADIENTS[nome.charCodeAt(0) % AVATAR_GRADIENTS.length]
}
