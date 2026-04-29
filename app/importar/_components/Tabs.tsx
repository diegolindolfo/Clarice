export type Aba = 'alunos' | 'acervo'

export function Tabs({ aba, onChange }: { aba: Aba; onChange: (a: Aba) => void }) {
  return (
    <div className="flex gap-0 border-b mb-6" style={{ borderColor: 'var(--border)' }}>
      {([['alunos', 'Alunos'], ['acervo', 'Acervo']] as const).map(([val, label]) => {
        const ativo = aba === val
        return (
          <button
            key={val}
            onClick={() => onChange(val)}
            className={`relative px-4 py-2 text-sm transition-colors ${ativo ? 'font-medium' : ''}`}
            style={{ color: ativo ? 'var(--text-primary)' : 'var(--text-muted)' }}
          >
            {label}
            {ativo && (
              <span
                className="absolute bottom-[-1px] left-3 right-3 h-[2px] rounded-t-full"
                style={{ backgroundColor: 'var(--text-primary)' }}
              />
            )}
          </button>
        )
      })}
    </div>
  )
}
