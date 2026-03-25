import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Nav from '@/components/Nav'
import RegisterSW from '@/components/RegisterSW'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Clarice',
  description: 'Sistema de Gerenciamento de Biblioteca Escolar',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Clarice',
  },
  icons: {
    icon: '/icon-192.png',
    apple: '/apple-touch-icon.png',
  },
}

export const viewport: Viewport = {
  themeColor: '#0a0f1e',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body className={`${inter.className} min-h-screen`}>
        <Nav />
        <main className="animate-fade-in">
          {children}
        </main>
        <RegisterSW />
      </body>
    </html>
  )
}
