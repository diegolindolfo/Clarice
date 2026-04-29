import { describe, expect, it } from 'vitest'
import { fmt, iniciais, sanitizeBusca, corAvatar, CORES_AVATAR } from '@/lib/utils'

describe('lib/utils', () => {
  describe('fmt', () => {
    it('formata data ISO YYYY-MM-DD em pt-BR sem deslocar pelo fuso UTC', () => {
      expect(fmt('2026-01-15')).toBe('15/01/2026')
    })

    it('aceita data com horario e usa apenas a parte da data', () => {
      expect(fmt('2026-01-15T23:59:00Z')).toBe('15/01/2026')
    })

    it('retorna string vazia para entradas vazias/null/undefined', () => {
      expect(fmt('')).toBe('')
      expect(fmt(null)).toBe('')
      expect(fmt(undefined)).toBe('')
    })

    it('retorna string vazia para datas malformadas', () => {
      expect(fmt('nao-e-data')).toBe('')
      expect(fmt('2026-01')).toBe('')
    })
  })

  describe('iniciais', () => {
    it('retorna as duas primeiras iniciais maiusculas', () => {
      expect(iniciais('Ana Silva Souza')).toBe('AS')
      expect(iniciais('joao')).toBe('J')
    })
  })

  describe('sanitizeBusca', () => {
    it('escapa wildcards do LIKE/ILIKE', () => {
      expect(sanitizeBusca('100%')).toBe('100\\%')
      expect(sanitizeBusca('a_b')).toBe('a\\_b')
      expect(sanitizeBusca('a\\b')).toBe('a\\\\b')
    })

    it('mantem texto sem caracteres especiais', () => {
      expect(sanitizeBusca('clarice lispector')).toBe('clarice lispector')
    })
  })

  describe('corAvatar', () => {
    it('retorna sempre uma cor da paleta por modulo', () => {
      const len = CORES_AVATAR.length
      expect(corAvatar(0)).toBe(CORES_AVATAR[0])
      expect(corAvatar(len)).toBe(CORES_AVATAR[0])
      expect(corAvatar(len + 1)).toBe(CORES_AVATAR[1])
    })
  })
})
