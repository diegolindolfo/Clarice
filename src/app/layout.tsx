import type { Metadata, Viewport } from 'next'
import './globals.css'
import Nav from '@/components/Nav'
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
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#0a0f1e' },
    { media: '(prefers-color-scheme: light)', color: '#f8fafc' },
  ],
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
                  var saved = localStorage.getItem('theme');
                  var prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
                  if (saved === 'light' || (!saved && prefersLight)) {
                    document.documentElement.classList.add('light');
                  } else {
                    document.documentElement.classList.remove('light');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-screen">
        <Nav />
        <main className="animate-fade-in">
          {children}
        </main>
        <RegisterSW />
      </body>
    </html>
  )
}
