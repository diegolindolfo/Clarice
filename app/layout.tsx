import type { Metadata, Viewport } from 'next'
import { DM_Sans, DM_Mono, DM_Serif_Display } from 'next/font/google'
import './globals.css'
import Nav from '@/components/Nav'
import ToastContainer from '@/components/Toast'

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  style: ['normal', 'italic'],
  variable: '--font-dm-sans',
  display: 'swap',
})

const dmMono = DM_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-dm-mono',
  display: 'swap',
})

const dmSerifDisplay = DM_Serif_Display({
  subsets: ['latin'],
  weight: ['400'],
  style: ['normal', 'italic'],
  variable: '--font-dm-serif',
  display: 'swap',
})

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
    <html
      lang="pt-BR"
      suppressHydrationWarning
      className={`${dmSans.variable} ${dmMono.variable} ${dmSerifDisplay.variable}`}
    >
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
            style={{ fontFamily: "var(--font-dm-sans), sans-serif", color: 'var(--text-muted)' }}
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
