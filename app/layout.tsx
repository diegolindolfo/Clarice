import type { Metadata, Viewport } from 'next'
import './globals.css'
import Nav from '@/components/Nav'
import ToastContainer from '@/components/Toast'

export const metadata: Metadata = {
  title: { default: 'Clarice', template: '%s — Clarice' },
  description: 'Sistema de gerenciamento de biblioteca escolar',
  robots: 'noindex, nofollow',
  manifest: '/manifest.json',
  icons: [
    { rel: 'icon', url: '/icon-192.png', sizes: '192x192' },
    { rel: 'apple-touch-icon', url: '/icon-192.png' },
  ],
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#1e293b',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        {/* Previne flash de tema errado (FOUC) */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('clarice-theme');if(t)document.documentElement.setAttribute('data-theme',t)}catch(e){}`,
          }}
        />
      </head>
      <body className="flex flex-col min-h-screen">
        <Nav />
        <main className="flex-1">{children}</main>
        <footer
          className="border-t py-4 px-6 mt-8"
          style={{ borderColor: 'var(--border)' }}
        >
          <p
            className="text-center text-[11px] tracking-wide"
            style={{ fontFamily: "'DM Sans', sans-serif", color: 'var(--text-muted)' }}
          >
            Biblioteca Clarice Lispector
            <span className="mx-2" style={{ color: 'var(--border)' }}>·</span>
            2026
            <span className="mx-2" style={{ color: 'var(--border)' }}>·</span>
            EEEP Professor José Augusto Torres
          </p>
        </footer>
        <ToastContainer />
      </body>
    </html>
  )
}
