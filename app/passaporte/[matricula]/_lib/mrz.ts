// Utilit\u00e1rios para o "rod\u00e9 MRZ" (Machine Readable Zone) do passaporte.
// Estilo MRZ real: apenas [A-Z0-9<]; espa\u00e7os e caracteres n\u00e3o permitidos
// viram '<'. Apenas visual \u2014 n\u00e3o precisa bater com o padr\u00e3o ICAO 100%.

export const MESES_PT_CURTO = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
]

export function labelMesChave(mes: string): string {
  const [y, m] = mes.split('-').map(Number)
  return `${MESES_PT_CURTO[(m - 1) % 12]}/${String(y).slice(-2)}`
}

export function mrzClean(raw: string, tamanho: number): string {
  const base = raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '<')
  return base.slice(0, tamanho).padEnd(tamanho, '<')
}

export function mrzNome(nome: string): string {
  return mrzClean(nome, 30)
}

export function mrzMatricula(matricula: number): string {
  return mrzClean(String(matricula), 10)
}

export function mrzTurma(turma: string | null | undefined): string {
  return mrzClean(turma ?? '', 8)
}
