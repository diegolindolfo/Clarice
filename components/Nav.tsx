'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'

const links = [
  { href: '/dashboard',   label: 'Dashboard' },
  { href: '/emprestimos', label: 'Empréstimos' },
  { href: '/acervo',      label: 'Acervo' },
  { href: '/alunos',      label: 'Alunos' },
  { href: '/relatorios',  label: 'Relatórios' },
  { href: '/importar',    label: 'Importar' },
]

export default function Nav() {
  const path = usePathname()
  const router = useRouter()
  const [email, setEmail] = useState<string | null>(null)
  const [dark, setDark] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }: any) => {
      setEmail(data.user?.email ?? null)
    })
    setDark(document.documentElement.getAttribute('data-theme') === 'dark')
  }, [])

  // Fechar menu ao clicar fora
  useEffect(() => {
    if (!menuOpen) return
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [menuOpen])

  // Fechar menu ao navegar
  useEffect(() => { setMenuOpen(false) }, [path])

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
  if (path === '/passaporte' || path.startsWith('/passaporte/')) return null

  return (
    <nav
      className="border-b px-4 sm:px-6 py-0 flex items-stretch gap-0 h-12 sticky top-0 z-50 backdrop-blur-sm"
      style={{ backgroundColor: 'var(--bg-nav)' }}
    >

      {/* Logo */}
      <Link
        href="/dashboard"
        prefetch={true}
        className="flex items-center mr-4 sm:mr-6 pr-4 sm:pr-6 border-r shrink-0"
        style={{ fontFamily: "var(--font-dm-serif, 'DM Serif Display'), serif" }}
      >
        <span className="text-[15px] tracking-tight" style={{ color: 'var(--text-primary)' }}>Clarice</span>
      </Link>

      {/* Links principais — desktop */}
      <div className="hidden md:flex items-stretch gap-0">
        {links.map(({ href, label }) => {
          const ativo = path === href || (href !== '/dashboard' && path.startsWith(href + '/') && href !== '/emprestimos')
          return (
            <Link
              key={href}
              href={href}
              prefetch={true}
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

      {/* Ações à direita — desktop */}
      <div className="ml-auto hidden md:flex items-center gap-3">
        <Link
          href="/emprestimos/novo"
          prefetch={true}
          className="nav-btn-primary text-[12px] font-medium px-3.5 py-1.5 rounded-lg transition-colors"
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

      {/* Ações à direita — mobile */}
      <div className="ml-auto flex md:hidden items-center gap-2" ref={menuRef}>
        <Link
          href="/emprestimos/novo"
          prefetch={true}
          className="nav-btn-primary text-[12px] font-medium px-3 py-1.5 rounded-lg transition-colors"
        >
          + Novo
        </Link>

        {/* Hamburger */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="w-9 h-9 flex flex-col items-center justify-center gap-[5px] rounded-lg transition-colors"
          style={{ color: 'var(--text-muted)' }}
          aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}
          aria-expanded={menuOpen}
        >
          <span className={`block w-[18px] h-[1.5px] rounded-full transition-all duration-200 ${menuOpen ? 'rotate-45 translate-y-[3.25px]' : ''}`} style={{ backgroundColor: 'var(--text-primary)' }} />
          <span className={`block w-[18px] h-[1.5px] rounded-full transition-all duration-200 ${menuOpen ? '-rotate-45 -translate-y-[3.25px]' : ''}`} style={{ backgroundColor: 'var(--text-primary)' }} />
        </button>

        {/* Dropdown mobile */}
        {menuOpen && (
          <div
            className="absolute top-12 right-3 w-56 border rounded-xl shadow-lg py-2 animate-fade-up"
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}
          >
            {links.map(({ href, label }) => {
              const ativo = path === href
              return (
                <Link
                  key={href}
                  href={href}
                  className={`block px-4 py-2.5 text-sm transition-colors ${
                    ativo ? 'font-medium' : ''
                  }`}
                  style={{
                    color: ativo ? 'var(--text-primary)' : 'var(--text-secondary)',
                    backgroundColor: ativo ? 'var(--bg-muted)' : 'transparent',
                  }}
                >
                  {label}
                </Link>
              )
            })}

            <div className="border-t my-1" style={{ borderColor: 'var(--border)' }} />

            <button
              onClick={alternarTema}
              className="w-full text-left px-4 py-2.5 text-sm transition-colors"
              style={{ color: 'var(--text-secondary)' }}
            >
              {dark ? '☀ Modo claro' : '☾ Modo escuro'}
            </button>

            {email && (
              <p className="px-4 py-1.5 text-[11px] truncate" style={{ color: 'var(--text-muted)' }}>
                {email}
              </p>
            )}

            <button
              onClick={sair}
              className="w-full text-left px-4 py-2.5 text-sm transition-colors"
              style={{ color: 'var(--text-muted)' }}
            >
              Sair
            </button>
          </div>
        )}
      </div>
    </nav>
  )
}
