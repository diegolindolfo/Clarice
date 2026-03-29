'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const links = [
  { href: '/dashboard',   label: 'Dashboard' },
  { href: '/emprestimos', label: 'Empréstimos' },
  { href: '/acervo',      label: 'Acervo' },
  { href: '/alunos',      label: 'Alunos' },
]

export default function Nav() {
  const path = usePathname()
  const router = useRouter()
  const [email, setEmail] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null)
    })
  }, [])

  async function sair() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  if (path === '/login') return null

  return (
    <nav className="border-b border-[#e8e5e0] px-6 py-0 flex items-stretch gap-0 bg-white h-12">

      {/* Logo */}
      <Link
        href="/dashboard"
        className="flex items-center mr-6 pr-6 border-r border-[#e8e5e0] shrink-0"
        style={{ fontFamily: "'DM Serif Display', serif" }}
      >
        <span className="text-[15px] text-gray-900 tracking-tight">Clarice</span>
      </Link>

      {/* Links principais */}
      <div className="flex items-stretch gap-0">
        {links.map(({ href, label }) => {
          const ativo = path === href || (href !== '/dashboard' && path.startsWith(href + '/') && href !== '/emprestimos')
          return (
            <Link
              key={href}
              href={href}
              className={`relative flex items-center px-3.5 text-[13px] transition-colors ${
                ativo
                  ? 'text-gray-900 font-medium'
                  : 'text-gray-400 hover:text-gray-700'
              }`}
            >
              {label}
              {/* Indicador de ativo — linha na base */}
              {ativo && (
                <span className="absolute bottom-0 left-3 right-3 h-[2px] bg-gray-900 rounded-t-full" />
              )}
            </Link>
          )
        })}
      </div>

      {/* Ações à direita */}
      <div className="ml-auto flex items-center gap-3">
        <Link
          href="/emprestimos/novo"
          className={`text-[12px] font-medium px-3.5 py-1.5 rounded-lg transition-colors ${
            path === '/emprestimos/novo'
              ? 'bg-gray-900 text-white'
              : 'bg-gray-900 text-white hover:bg-gray-700'
          }`}
        >
          + Novo
        </Link>

        {email && (
          <span className="text-[11px] text-gray-300 hidden sm:block border-l border-[#e8e5e0] pl-3">
            {email}
          </span>
        )}

        <button
          onClick={sair}
          className="text-[12px] text-gray-400 hover:text-gray-700 transition-colors"
        >
          Sair
        </button>
      </div>
    </nav>
  )
}
