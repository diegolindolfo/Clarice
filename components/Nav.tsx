'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

const links = [
  { href: '/dashboard',   label: 'Dashboard' },
  { href: '/emprestimos', label: 'Empréstimos' },
  { href: '/acervo',      label: 'Acervo' },
  { href: '/alunos',      label: 'Alunos' },
  { href: '/relatorios',  label: 'Relatórios' },
]

export default function Nav() {
  const path = usePathname()
  const router = useRouter()
  const [email, setEmail] = useState<string | null>(null)
  const [dark, setDark] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null)
    })
    setDark(document.documentElement.getAttribute('data-theme') === 'dark')
  }, [])

  function alternarTema() {
    const novo = !dark
    setDark(novo)
    document.documentElement.setAttribute('data-theme', novo ? 'dark' : 'light')
    localStorage.setItem('clarice-theme', novo ? 'dark' : 'light')
  }

  async function sair() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  if (path === '/login') return null

  return (
    <nav
      className="border-b px-6 py-0 flex items-stretch gap-0 h-12 sticky top-0 z-50 backdrop-blur-sm"
      style={{ backgroundColor: 'var(--bg-nav)' }}
    >

      {/* Logo */}
      <Link
        href="/dashboard"
        className="flex items-center mr-6 pr-6 border-r shrink-0"
        style={{ fontFamily: "var(--font-dm-serif, 'DM Serif Display'), serif" }}
      >
        <span className="text-[15px] tracking-tight" style={{ color: 'var(--text-primary)' }}>Clarice</span>
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
                  ? 'font-medium'
                  : 'hover:opacity-80'
              }`}
              style={{ color: ativo ? 'var(--text-primary)' : 'var(--text-muted)' }}
            >
              {label}
              {ativo && (
                <span
                  className="absolute bottom-0 left-3 right-3 h-[2px] rounded-t-full"
                  style={{ backgroundColor: 'var(--text-primary)' }}
                />
              )}
            </Link>
          )
        })}
      </div>

      {/* Ações à direita */}
      <div className="ml-auto flex items-center gap-3">
        <Link
          href="/emprestimos/novo"
          className="text-[12px] font-medium px-3.5 py-1.5 rounded-lg transition-colors bg-gray-900 text-white hover:bg-gray-700"
        >
          + Novo
        </Link>

        {/* Toggle dark mode */}
        <button
          onClick={alternarTema}
          className="text-[16px] w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
          style={{ color: 'var(--text-muted)' }}
          aria-label={dark ? 'Mudar para modo claro' : 'Mudar para modo escuro'}
          title={dark ? 'Modo claro' : 'Modo escuro'}
        >
          {dark ? '☀' : '☾'}
        </button>

        {email && (
          <span
            className="text-[11px] hidden sm:block border-l pl-3"
            style={{ color: 'var(--text-muted)', borderColor: 'var(--border)' }}
          >
            {email}
          </span>
        )}

        <button
          onClick={sair}
          className="text-[12px] transition-colors"
          style={{ color: 'var(--text-muted)' }}
        >
          Sair
        </button>
      </div>
    </nav>
  )
}
