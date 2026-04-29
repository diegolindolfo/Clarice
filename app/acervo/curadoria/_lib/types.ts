export type AcervoRow = {
  id: string
  titulo: string
  autor: string | null
  editora: string | null
  tipo: string | null
  genero: string | null
  imagem_url: string | null
  cdd: string | null
}

export type ContagemExemplares = Record<string, number>

export type Aba = 'duplicatas' | 'incompletos'
