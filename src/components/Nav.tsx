'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const links = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
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
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
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
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
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
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 00-3-3.87" />
        <path d="M16 3.13a4 4 0 010 7.75" />
      </svg>
    ),
  },
  {
    href: '/emprestimos/novo',
    label: '+ Novo',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="16" />
        <line x1="8" y1="12" x2="16" y2="12" />
      </svg>
    ),
    accent: true,
  },
]

export default function Nav() {
  const path = usePathname()
  return (
    <nav className="glass-nav sticky top-0 z-40 px-6 py-3 flex items-center gap-1">
      {/* Brand */}
      <Link href="/dashboard" className="flex items-center gap-2 mr-5 group">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
          style={{ background: 'var(--gradient-indigo)' }}>
          C
        </div>
        <span className="text-sm font-semibold tracking-tight" style={{ color: 'var(--text-primary)' }}>
          Clarice
        </span>
      </Link>

      {/* Links */}
      <div className="flex items-center gap-1">
        {links.map(({ href, label, icon, accent }) => {
          const isActive = path === href || (href !== '/dashboard' && href !== '/emprestimos/novo' && path.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className="relative flex items-center gap-2 text-sm px-3.5 py-2 rounded-xl transition-all duration-200"
              style={{
                color: accent
                  ? 'var(--accent-indigo-light)'
                  : isActive
                    ? 'var(--text-primary)'
                    : 'var(--text-muted)',
                background: isActive
                  ? 'var(--bg-card)'
                  : accent
                    ? 'rgba(99, 102, 241, 0.08)'
                    : 'transparent',
                border: isActive
                  ? '1px solid var(--border-hover)'
                  : '1px solid transparent',
                fontWeight: isActive ? 500 : 400,
              }}
            >
              <span style={{
                opacity: isActive ? 1 : 0.6,
                transition: 'opacity 0.2s',
              }}>
                {icon}
              </span>
              <span className="hidden sm:inline">{label}</span>
              {isActive && (
                <span
                  className="absolute -bottom-[13px] left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full"
                  style={{ background: 'var(--accent-indigo)' }}
                />
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
