'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { logout } from '@/app/login/actions'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/utils/supabase/client'

type Theme = 'icy' | 'celadon' | 'shadow'

const THEME_CONFIG: { id: Theme; label: string; swatch: string; icon: React.ReactNode }[] = [
  {
    id: 'icy',
    label: 'Icy Blue',
    swatch: 'linear-gradient(135deg, #0b0f14 50%, #38bdf8 50%)',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
      </svg>
    ),
  },
  {
    id: 'celadon',
    label: 'Celadon',
    swatch: 'linear-gradient(135deg, #f5f3ee 50%, #5b8a72 50%)',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="5" />
        <line x1="12" y1="1" x2="12" y2="3" />
        <line x1="12" y1="21" x2="12" y2="23" />
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
        <line x1="1" y1="12" x2="3" y2="12" />
        <line x1="21" y1="12" x2="23" y2="12" />
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
      </svg>
    ),
  },
  {
    id: 'shadow',
    label: 'Shadow',
    swatch: 'linear-gradient(135deg, #1a1a1e 50%, #d4a574 50%)',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 2a10 10 0 0 0 0 20z" fill="currentColor" opacity="0.3" />
      </svg>
    ),
  },
]

function applyThemeClass(theme: Theme) {
  const root = document.documentElement
  root.classList.remove('theme-celadon', 'theme-shadow')
  if (theme === 'celadon') root.classList.add('theme-celadon')
  else if (theme === 'shadow') root.classList.add('theme-shadow')
}

const links = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="9" rx="1.5" />
        <rect x="14" y="3" width="7" height="5" rx="1.5" />
        <rect x="14" y="12" width="7" height="9" rx="1.5" />
        <rect x="3" y="16" width="7" height="5" rx="1.5" />
      </svg>
    ),
  },
  {
    href: '/emprestimos',
    label: 'Empréstimos',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 7h12l-2 13H6L4 3H2" />
        <circle cx="10" cy="21" r="1" />
        <circle cx="18" cy="21" r="1" />
      </svg>
    ),
  },
  {
    href: '/acervo',
    label: 'Acervo',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
        <line x1="9" y1="7" x2="16" y2="7" />
        <line x1="9" y1="11" x2="14" y2="11" />
      </svg>
    ),
  },
  {
    href: '/alunos',
    label: 'Alunos',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 00-3-3.87" />
        <path d="M16 3.13a4 4 0 010 7.75" />
      </svg>
    ),
  },
  {
    href: '/emprestimos/novo',
    label: 'Novo',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
    ),
    accent: true,
  },
]

export default function Nav() {
  const path = usePathname()
  const [theme, setTheme] = useState<Theme>('icy')
  const [userName, setUserName] = useState<string | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const pickerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const saved = localStorage.getItem('clarice-theme') as Theme | null
    if (saved && ['icy', 'celadon', 'shadow'].includes(saved)) {
      setTheme(saved)
      applyThemeClass(saved)
    } else {
      applyThemeClass('icy')
    }

    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        const meta = data.user.user_metadata
        const nome = meta?.full_name || meta?.name || null
        setUserName(nome || data.user.email?.split('@')[0] || null)
      }
    })
  }, [])

  // Close picker on outside click
  useEffect(() => {
    if (!pickerOpen) return
    function handleClick(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPickerOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [pickerOpen])

  function selectTheme(t: Theme) {
    setTheme(t)
    applyThemeClass(t)
    localStorage.setItem('clarice-theme', t)
    setPickerOpen(false)
  }

  if (path === '/login') return null

  const currentConfig = THEME_CONFIG.find((t) => t.id === theme)!

  return (
    <nav className="glass-nav sticky top-0 z-40 px-6 py-2.5 flex items-center gap-1">
      {/* Brand — text only */}
      <Link
        href="/dashboard"
        className="mr-5"
        style={{ textDecoration: 'none', color: 'var(--text-primary)' }}
      >
        <span className="text-sm font-semibold tracking-tight">Clarice</span>
      </Link>

      {/* Links */}
      <div className="flex items-center gap-0.5">
        {links.map(({ href, label, icon, accent }) => {
          const isActive =
            path === href ||
            (href !== '/dashboard' && href !== '/emprestimos/novo' && path.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className="relative flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg transition-all duration-200"
              style={{
                textDecoration: 'none',
                color: accent
                  ? 'var(--nav-accent-text)'
                  : isActive
                    ? 'var(--text-primary)'
                    : 'var(--text-muted)',
                background: isActive
                  ? 'var(--bg-elevated)'
                  : 'transparent',
                fontWeight: isActive ? 500 : 400,
              }}
            >
              <span style={{ opacity: isActive ? 1 : 0.6 }}>{icon}</span>
              <span className="hidden sm:inline">{label}</span>
            </Link>
          )
        })}
      </div>

      <div className="flex-1" />

      {/* Right side: theme picker, user name, logout */}
      <div className="flex items-center gap-3">
        {/* Theme Picker */}
        <div className="theme-picker" ref={pickerRef}>
          <button
            onClick={() => setPickerOpen(!pickerOpen)}
            className="p-1.5 rounded-lg border-none bg-transparent cursor-pointer flex items-center justify-center transition-colors"
            title="Tema"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
          >
            {currentConfig.icon}
          </button>

          {pickerOpen && (
            <div className="theme-picker-menu">
              {THEME_CONFIG.map((t) => (
                <button
                  key={t.id}
                  className={`theme-picker-item ${theme === t.id ? 'active' : ''}`}
                  onClick={() => selectTheme(t.id)}
                >
                  <div className="theme-swatch" style={{ background: t.swatch }} />
                  <span>{t.label}</span>
                  {theme === t.id && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 'auto' }}>
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Separator */}
        <span style={{ width: 1, height: 16, background: 'var(--border-default)' }} />

        {/* User name + Sair grouped */}
        <div className="flex items-center gap-2">
          {userName && (
            <span
              className="text-xs truncate max-w-[140px]"
              style={{ color: 'var(--text-secondary)' }}
            >
              {userName}
            </span>
          )}
          <form action={logout}>
            <button
              type="submit"
              className="text-xs transition-colors bg-transparent border-none cursor-pointer"
              style={{ color: 'var(--text-muted)' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--accent-rose)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
            >
              Sair
            </button>
          </form>
        </div>
      </div>
    </nav>
  )
}
