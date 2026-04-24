export default function BuscarLoading() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-page)' }}>
      <div className="max-w-3xl mx-auto px-6 py-8">
        <p className="text-[11px] uppercase tracking-[0.3em] mb-6" style={{ color: 'var(--text-muted)' }}>
          Biblioteca Clarice Lispector
        </p>
        <div className="h-9 w-56 rounded mb-2" style={{ backgroundColor: 'var(--bg-muted)' }} />
        <div className="h-4 w-72 rounded mb-5" style={{ backgroundColor: 'var(--bg-muted)' }} />
        <div className="h-11 rounded-lg" style={{ backgroundColor: 'var(--bg-muted)' }} />
      </div>
    </div>
  )
}
