import { fmt } from '@/lib/utils'
import type { Carimbo } from '@/lib/selos'

export function CarimboVisual({ carimbo }: { carimbo: Carimbo }) {
  const data = carimbo.data_devolucao_real ?? carimbo.data_saida
  const ativo = carimbo.status !== 'DEVOLVIDO'
  const dataLabel = carimbo.status === 'DEVOLVIDO' && carimbo.data_devolucao_real
    ? fmt(carimbo.data_devolucao_real)
    : fmt(data)

  return (
    <div
      className="relative rounded-xl border p-4 flex gap-3 items-start transition-colors"
      style={{
        backgroundColor: 'var(--bg-card)',
        borderColor: 'var(--border)',
      }}
    >
      <div
        className="shrink-0 w-14 h-20 rounded-md overflow-hidden flex items-center justify-center text-[10px] text-center"
        style={{
          backgroundColor: 'var(--bg-muted)',
          color: 'var(--text-muted)',
        }}
      >
        {carimbo.imagem_url ? (
          <img
            src={carimbo.imagem_url}
            alt={carimbo.titulo}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="px-1">{carimbo.tipo ?? 'Livro'}</span>
        )}
      </div>
      <div className="flex-1 min-w-0 pr-14">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-[13px] font-medium truncate" style={{ color: 'var(--text-primary)' }}>
            {carimbo.titulo}
          </p>
          {ativo && (
            <span
              className="text-[10px] px-1.5 py-0.5 rounded-full"
              style={{ backgroundColor: 'var(--bg-muted)', color: 'var(--text-muted)' }}
            >
              em leitura
            </span>
          )}
          {carimbo.em_atraso && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-50 text-red-700">
              atrasado
            </span>
          )}
        </div>
        {carimbo.autor && (
          <p className="text-[11px] mt-0.5 truncate" style={{ color: 'var(--text-secondary)' }}>
            {carimbo.autor}
          </p>
        )}
        <p className="text-[10px] font-mono mt-1" style={{ color: 'var(--text-muted)' }}>
          {carimbo.status === 'DEVOLVIDO' && carimbo.data_devolucao_real
            ? `Carimbado em ${fmt(carimbo.data_devolucao_real)}`
            : `Retirado em ${fmt(data)}`}
          {carimbo.genero && <span> \u00b7 {carimbo.genero}</span>}
        </p>
      </div>
      {/* Selo redondo estilo carimbo de passaporte */}
      <div
        aria-hidden
        className="absolute top-3 right-3 w-12 h-12 rounded-full flex flex-col items-center justify-center text-center pointer-events-none select-none"
        style={{
          border: `1.5px double ${ativo ? 'var(--text-muted)' : 'var(--text-secondary)'}`,
          color: ativo ? 'var(--text-muted)' : 'var(--text-secondary)',
          transform: 'rotate(-8deg)',
          opacity: 0.82,
        }}
      >
        <span className="text-[8px] uppercase tracking-[0.15em] leading-none">lido</span>
        <span className="text-[9px] font-mono leading-tight mt-0.5">{dataLabel}</span>
      </div>
    </div>
  )
}
