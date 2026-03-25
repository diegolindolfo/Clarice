'use client'

export default function OfflinePage() {
  return (
    <div className="max-w-md mx-auto p-6 text-center py-24 animate-fade-in">
      <div className="text-5xl mb-6" style={{ animation: 'pulse-glow 2s ease-in-out infinite' }}>📚</div>
      <h1 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
        Sem conexão
      </h1>
      <p className="text-sm leading-relaxed mb-8" style={{ color: 'var(--text-muted)' }}>
        Você está offline. Verifique sua conexão com a internet e tente novamente.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="btn-primary px-8 py-3"
      >
        Tentar novamente
      </button>
    </div>
  )
}
