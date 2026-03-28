import type { Metadata, Viewport } from 'next'
import './globals.css'
import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import RegisterSW from '@/components/RegisterSW'

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
  themeColor: '#0b0f14',
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
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var saved = localStorage.getItem('clarice-theme');
                  if (saved === 'celadon') {
                    document.documentElement.classList.add('theme-celadon');
                  } else if (saved === 'shadow') {
                    document.documentElement.classList.add('theme-shadow');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-screen flex flex-col">
        <Nav />
        <main className="animate-fade-in flex-1">
          {children}
        </main>
        <Footer />
        <RegisterSW />
      </body>
    </html>
  )
}
