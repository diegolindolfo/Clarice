import type { Selo } from '@/lib/selos'

export function SeloCard({ selo }: { selo: Selo }) {
  const conquistado = selo.conquistado
  return (
    <div
      className="rounded-xl border p-4 flex flex-col items-center text-center transition-opacity"
      style={{
        backgroundColor: conquistado ? 'var(--bg-card)' : 'var(--bg-muted)',
        borderColor: 'var(--border)',
        opacity: conquistado ? 1 : 0.55,
      }}
      title={selo.descricao}
    >
      <div
        className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl mb-2 ${
          conquistado ? '' : 'grayscale'
        }`}
        style={{
          backgroundColor: conquistado ? 'var(--bg-muted)' : 'transparent',
          border: `2px dashed ${conquistado ? 'transparent' : 'var(--border)'}`,
        }}
      >
        {conquistado ? selo.icone : '\ud83d\udd12'}
      </div>
      <p className="text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>{selo.nome}</p>
      <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{selo.descricao}</p>
      {!conquistado && selo.meta > 1 && (
        <div className="w-full mt-3">
          <div className="h-[3px] rounded-full overflow-hidden" style={{ backgroundColor: 'var(--border)' }}>
            <div
              className="h-full transition-all"
              style={{ width: `${Math.round(selo.progresso * 100)}%`, backgroundColor: 'var(--text-secondary)' }}
            />
          </div>
          <p className="text-[10px] font-mono mt-1" style={{ color: 'var(--text-muted)' }}>
            {selo.atual} / {selo.meta}
          </p>
        </div>
      )}
    </div>
  )
}
