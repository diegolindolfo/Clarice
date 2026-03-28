'use client'
import { useEffect, useState, useCallback, useRef } from 'react'

type Props = {
  aberto: boolean
  onFechar: () => void
  children: React.ReactNode
  titulo?: string
}

export default function SlidePanel({ aberto, onFechar, children, titulo }: Props) {
  const [visivel, setVisivel] = useState(false)
  const [fechando, setFechando] = useState(false)
  const onFecharRef = useRef(onFechar)
  onFecharRef.current = onFechar

  const fecharComAnimacao = useCallback(() => {
    setFechando(true)
    setTimeout(() => {
      setVisivel(false)
      setFechando(false)
      document.body.style.overflow = ''
      onFecharRef.current()
    }, 250)
  }, [])

  useEffect(() => {
    if (aberto) {
      setVisivel(true)
      setFechando(false)
      document.body.style.overflow = 'hidden'
    } else if (visivel) {
      fecharComAnimacao()
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [aberto, fecharComAnimacao])

  useEffect(() => {
    if (!visivel) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') fecharComAnimacao()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [visivel, fecharComAnimacao])

  if (!visivel) return null

  return (
    <>
      <div className="slide-panel-overlay" onClick={fecharComAnimacao} />
      <aside className={`slide-panel ${fechando ? 'closing' : ''}`}>
        {/* Header */}
        <div
          className="sticky top-0 z-10 flex items-center justify-between px-6 py-4"
          style={{
            background: 'var(--bg-primary)',
            borderBottom: '1px solid var(--border-default)',
          }}
        >
          {titulo && (
            <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
              {titulo}
            </h2>
          )}
          <button
            onClick={fecharComAnimacao}
            className="ml-auto p-1.5 rounded-lg transition-colors"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--bg-elevated)'
              e.currentTarget.style.color = 'var(--text-primary)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color = 'var(--text-muted)'
            }}
            title="Fechar"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-5">
          {children}
        </div>
      </aside>
    </>
  )
}
