'use client'

export default function OfflinePage() {
  return (
    <div className="max-w-md mx-auto p-6 text-center py-24">
      <div className="text-5xl mb-6">📚</div>
      <h1 className="text-xl font-medium mb-2">Sem conexão</h1>
      <p className="text-sm text-gray-500 mb-6 leading-relaxed">
        Você está offline. Verifique sua conexão com a internet e tente novamente.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="bg-blue-800 text-white rounded-xl px-6 py-3 text-sm font-medium hover:bg-blue-900 transition-colors"
      >
        Tentar novamente
      </button>
    </div>
  )
}
