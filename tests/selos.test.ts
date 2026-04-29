import { describe, expect, it } from 'vitest'
import { calcularPassaporte, proximoSelo, type Carimbo } from '@/lib/selos'

function carimbo(over: Partial<Carimbo>): Carimbo {
  return {
    emprestimo_id: 'e-' + Math.random().toString(36).slice(2, 8),
    titulo: 'Livro X',
    autor: null,
    tipo: 'literatura',
    genero: 'romance',
    imagem_url: null,
    data_saida: '2026-01-01',
    data_devolucao_real: '2026-01-10',
    status: 'DEVOLVIDO',
    em_atraso: false,
    ...over,
  }
}

describe('lib/selos.calcularPassaporte', () => {
  it('zera os contadores quando nao ha carimbos', () => {
    const r = calcularPassaporte([])
    expect(r.resumo.lidos).toBe(0)
    expect(r.resumo.emLeitura).toBe(0)
    expect(r.resumo.tiposDistintos).toBe(0)
    expect(r.resumo.generosDistintos).toBe(0)
    expect(r.selos.every(s => !s.conquistado)).toBe(true)
  })

  it('conta lidos somente para status DEVOLVIDO', () => {
    const r = calcularPassaporte([
      carimbo({ status: 'DEVOLVIDO' }),
      carimbo({ status: 'EMPRESTADO', data_devolucao_real: null }),
      carimbo({ status: 'RENOVADO',   data_devolucao_real: null }),
      carimbo({ status: 'ATRASADO',   data_devolucao_real: null }),
    ])
    expect(r.resumo.lidos).toBe(1)
    expect(r.resumo.emLeitura).toBe(2) // EMPRESTADO + RENOVADO
  })

  it('libera selo de "Primeiro Livro" com 1 carimbo devolvido', () => {
    const r = calcularPassaporte([carimbo({})])
    const s = r.selos.find(x => x.id === 'volume-1')!
    expect(s.conquistado).toBe(true)
    expect(s.dataConquista).toBe('2026-01-10')
  })

  it('progresso parcial fica entre 0 e 1', () => {
    const r = calcularPassaporte([carimbo({}), carimbo({})])
    const cinco = r.selos.find(x => x.id === 'volume-5')!
    expect(cinco.conquistado).toBe(false)
    expect(cinco.progresso).toBeCloseTo(2 / 5, 5)
  })

  it('conta tipos e generos distintos (case-insensitive, trim)', () => {
    const r = calcularPassaporte([
      carimbo({ tipo: 'Literatura',   genero: 'Romance' }),
      carimbo({ tipo: ' literatura ', genero: 'romance' }),
      carimbo({ tipo: 'tecnico',      genero: 'historia' }),
    ])
    expect(r.resumo.tiposDistintos).toBe(2)
    expect(r.resumo.generosDistintos).toBe(2)
  })

  it('libera selo Maratonista quando ha 3+ leituras no melhor mes', () => {
    const tres = [
      carimbo({ data_devolucao_real: '2026-03-01' }),
      carimbo({ data_devolucao_real: '2026-03-15' }),
      carimbo({ data_devolucao_real: '2026-03-28' }),
    ]
    const r = calcularPassaporte(tres)
    const m = r.selos.find(s => s.id === 'especial-maratonista')!
    expect(m.conquistado).toBe(true)
    expect(r.resumo.melhorMes).toEqual({ mes: '2026-03', total: 3 })
  })

  it('mesesConsecutivos detecta sequencia de meses contiguos', () => {
    const r = calcularPassaporte([
      carimbo({ data_devolucao_real: '2026-01-15' }),
      carimbo({ data_devolucao_real: '2026-02-10' }),
      carimbo({ data_devolucao_real: '2026-03-05' }),
      // gap em abril
      carimbo({ data_devolucao_real: '2026-05-05' }),
    ])
    expect(r.resumo.mesesConsecutivos).toBe(3)
  })
})

describe('lib/selos.proximoSelo', () => {
  function selo(over: Partial<import('@/lib/selos').Selo>): import('@/lib/selos').Selo {
    return {
      id: over.id ?? 's',
      nome: '',
      descricao: '',
      icone: '',
      categoria: 'volume',
      conquistado: false,
      progresso: 0,
      atual: 0,
      meta: 1,
      dataConquista: null,
      ...over,
    }
  }

  it('retorna null quando todos foram conquistados', () => {
    expect(
      proximoSelo([
        selo({ id: 'a', conquistado: true, progresso: 1 }),
        selo({ id: 'b', conquistado: true, progresso: 1 }),
      ]),
    ).toBeNull()
  })

  it('retorna o pendente com maior progresso', () => {
    const r = proximoSelo([
      selo({ id: 'a', conquistado: false, progresso: 0.1 }),
      selo({ id: 'b', conquistado: false, progresso: 0.9 }),
      selo({ id: 'c', conquistado: true,  progresso: 1.0 }),
    ])
    expect(r?.id).toBe('b')
  })
})
