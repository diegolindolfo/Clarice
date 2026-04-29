import { describe, expect, it } from 'vitest'
import {
  parseCSV,
  csvParaObjetos,
  gerarCSV,
  normalizarCabecalho,
  acharColuna,
} from '@/lib/csv'

describe('lib/csv', () => {
  describe('parseCSV', () => {
    it('parseia CSV com virgula como delimitador', () => {
      const csv = 'a,b,c\n1,2,3\n4,5,6'
      expect(parseCSV(csv)).toEqual([
        ['a', 'b', 'c'],
        ['1', '2', '3'],
        ['4', '5', '6'],
      ])
    })

    it('autodetecta ponto-e-virgula', () => {
      const csv = 'a;b;c\n1;2;3'
      expect(parseCSV(csv)).toEqual([
        ['a', 'b', 'c'],
        ['1', '2', '3'],
      ])
    })

    it('respeita aspas com virgulas internas', () => {
      const csv = 'titulo,autor\n"Cidade, A","Dickens"'
      expect(parseCSV(csv)).toEqual([
        ['titulo', 'autor'],
        ['Cidade, A', 'Dickens'],
      ])
    })

    it('trata aspas duplas escapadas como ""', () => {
      const csv = 'a\n"diz ""ola"""'
      expect(parseCSV(csv)).toEqual([
        ['a'],
        ['diz "ola"'],
      ])
    })

    it('remove BOM inicial', () => {
      const csv = '\ufeffa,b\n1,2'
      expect(parseCSV(csv)).toEqual([
        ['a', 'b'],
        ['1', '2'],
      ])
    })

    it('aceita CRLF e LF', () => {
      expect(parseCSV('a,b\r\n1,2')).toEqual([['a', 'b'], ['1', '2']])
      expect(parseCSV('a,b\n1,2')).toEqual([['a', 'b'], ['1', '2']])
    })
  })

  describe('normalizarCabecalho', () => {
    it('remove acentos, baixa caixa e troca espaco por _', () => {
      expect(normalizarCabecalho('Matrícula')).toBe('matricula')
      expect(normalizarCabecalho('Nome do Aluno')).toBe('nome_do_aluno')
    })
  })

  describe('acharColuna', () => {
    it('encontra a primeira coluna que casa com qualquer alias', () => {
      const headers = ['Nome', 'Matrícula', 'Turma']
      expect(acharColuna(headers, ['matricula', 'mat'])).toBe(1)
      expect(acharColuna(headers, ['classe', 'turma'])).toBe(2)
      expect(acharColuna(headers, ['inexistente'])).toBe(-1)
    })
  })

  describe('csvParaObjetos', () => {
    it('converte linhas em objetos por nome de coluna normalizado', () => {
      const linhas = parseCSV('Matrícula,Nome\n100,Ana\n200,Bruno')
      expect(csvParaObjetos(linhas)).toEqual([
        { matricula: '100', nome: 'Ana' },
        { matricula: '200', nome: 'Bruno' },
      ])
    })

    it('retorna [] para entrada vazia', () => {
      expect(csvParaObjetos([])).toEqual([])
    })
  })

  describe('gerarCSV', () => {
    it('gera CSV simples', () => {
      const out = gerarCSV(['a', 'b'], [[1, 'x'], [2, 'y']])
      expect(out).toBe('a,b\n1,x\n2,y')
    })

    it('escapa aspas e separadores', () => {
      const out = gerarCSV(['a'], [['v,c'], ['"ola"'], [null], [undefined]])
      expect(out).toBe('a\n"v,c"\n"""ola"""\n\n')
    })
  })
})
