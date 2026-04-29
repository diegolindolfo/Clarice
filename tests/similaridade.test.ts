import { describe, expect, it } from 'vitest'
import {
  normalizarTitulo,
  trigrams,
  jaccard,
  detectarDuplicatas,
} from '@/lib/similaridade'

describe('lib/similaridade', () => {
  describe('normalizarTitulo', () => {
    it('remove acentos e baixa a caixa', () => {
      expect(normalizarTitulo('Memórias Póstumas')).toBe('memorias postumas')
    })

    it('remove artigo inicial', () => {
      expect(normalizarTitulo('O Pequeno Príncipe')).toBe('pequeno principe')
      expect(normalizarTitulo('A Hora da Estrela')).toBe('hora da estrela')
      expect(normalizarTitulo('The Great Gatsby')).toBe('great gatsby')
    })

    it('mantem o titulo se for um unico token (mesmo que seja stopword)', () => {
      expect(normalizarTitulo('A')).toBe('a')
    })

    it('colapsa espacos e remove pontuacao', () => {
      expect(normalizarTitulo('  Hello,  World!! ')).toBe('hello world')
    })
  })

  describe('jaccard', () => {
    it('e 1 para conjuntos iguais', () => {
      expect(jaccard(new Set(['a', 'b']), new Set(['a', 'b']))).toBe(1)
    })

    it('e 0 para conjuntos disjuntos', () => {
      expect(jaccard(new Set(['a']), new Set(['b']))).toBe(0)
    })

    it('e 1 para dois conjuntos vazios (definicao do projeto)', () => {
      expect(jaccard(new Set(), new Set())).toBe(1)
    })

    it('calcula intersecao/uniao corretamente', () => {
      const s = jaccard(new Set(['a', 'b', 'c']), new Set(['b', 'c', 'd']))
      expect(s).toBeCloseTo(2 / 4, 5)
    })
  })

  describe('trigrams', () => {
    it('gera shingles de 3 caracteres', () => {
      const t = trigrams('abc')
      // padded = "  abc  "  -> "  a", " ab", "abc", "bc ", "c  "
      expect(t.size).toBeGreaterThan(0)
      expect(t.has('abc')).toBe(true)
    })
  })

  describe('detectarDuplicatas', () => {
    it('agrupa duplicatas exatas (apos normalizacao)', () => {
      const grupos = detectarDuplicatas([
        { id: '1', titulo: 'O Pequeno Príncipe' },
        { id: '2', titulo: 'A Pequeno Principe' },
        { id: '3', titulo: 'Outro Livro' },
      ])
      // "pequeno principe" == "pequeno principe" (artigo removido)
      const grupoExato = grupos.find(g => g.exato)
      expect(grupoExato).toBeDefined()
      expect(grupoExato!.itens.map(i => i.id).sort()).toEqual(['1', '2'])
    })

    it('nao agrupa titulos completamente diferentes', () => {
      const grupos = detectarDuplicatas([
        { id: '1', titulo: 'Memórias Póstumas de Brás Cubas' },
        { id: '2', titulo: 'Dom Casmurro' },
      ])
      expect(grupos).toEqual([])
    })

    it('encontra duplicata aproximada acima do threshold', () => {
      const grupos = detectarDuplicatas(
        [
          { id: '1', titulo: 'Dom Casmurro' },
          { id: '2', titulo: 'Dom Casmuro' }, // typo
        ],
        0.6,
      )
      expect(grupos.length).toBe(1)
      expect(grupos[0].itens.map(i => i.id).sort()).toEqual(['1', '2'])
    })

    it('ignora itens sem titulo significativo', () => {
      const grupos = detectarDuplicatas([
        { id: '1', titulo: '' },
        { id: '2', titulo: 'a' },
        { id: '3', titulo: 'Dom Casmurro' },
      ])
      expect(grupos).toEqual([])
    })
  })
})
