import type { Metadata, Viewport } from 'next'
import './globals.css'
import Nav from '@/components/Nav'

export const metadata: Metadata = {
  title: { default: 'Clarice', template: '%s — Clarice' },
  description: 'Sistema de gerenciamento de biblioteca escolar',
  robots: 'noindex, nofollow',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="flex flex-col min-h-screen">
        <Nav />
        <main className="flex-1">{children}</main>
        <footer className="border-t border-[#e8e5e0] py-4 px-6 mt-8">
          <p
            className="text-center text-[11px] text-gray-400 tracking-wide"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            Biblioteca Clarice Lispector
            <span className="mx-2 text-gray-300">·</span>
            2026
            <span className="mx-2 text-gray-300">·</span>
            EEEP Professor José Augusto Torres
          </p>
        </footer>
      </body>
    </html>
  )
}
