'use client'

import { useState, useEffect } from 'react'

export default function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false)

  useEffect(() => {
    // Seta de acordo com estado atual na montagem
    setIsOffline(!navigator.onLine)

    function handleOnline() { setIsOffline(false) }
    function handleOffline() { setIsOffline(true) }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (!isOffline) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] text-center p-2 text-xs font-semibold animate-fade-down backdrop-blur-sm"
         style={{ backgroundColor: 'rgb(254 242 242 / 0.95)', color: 'rgb(153 27 27)', borderBottom: '1px solid rgb(254 202 202)' }}>
      <span className="mr-2">⚠</span>
      Você está offline. Algumas operações e imagens locais podem estar limitadas à leitura de cache.
    </div>
  )
}
