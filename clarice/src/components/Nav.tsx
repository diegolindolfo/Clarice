'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const links = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/emprestimos', label: 'Empréstimos' },
  { href: '/acervo', label: 'Acervo' },
  { href: '/emprestimos/novo', label: '+ Novo' },
]

export default function Nav() {
  const path = usePathname()
  return (
    <nav className="border-b px-6 py-3 flex items-center gap-1 mb-2">
      <span className="text-sm font-medium text-gray-700 mr-4">Clarice</span>
      {links.map(({ href, label }) => (
        <Link
          key={href}
          href={href}
          className={`text-sm px-3 py-1.5 rounded-lg transition-colors
            ${
              path === href
                ? 'bg-gray-100 text-gray-900 font-medium'
                : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
            }`}
        >
          {label}
        </Link>
      ))}
    </nav>
  )
}
