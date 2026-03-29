import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center p-6">
      <p className="text-5xl font-mono font-medium text-gray-200 mb-4">404</p>
      <h1 className="text-lg font-medium text-gray-800 mb-2">Página não encontrada</h1>
      <p className="text-sm text-gray-500 mb-6">A página que você procura não existe ou foi movida.</p>
      <Link href="/dashboard" className="bg-blue-800 text-white text-sm px-5 py-2.5 rounded-xl hover:bg-blue-900 transition-colors">
        Voltar ao início
      </Link>
    </div>
  )
}
