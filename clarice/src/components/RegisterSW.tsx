'use client'
import { useEffect } from 'react'

export default function RegisterSW() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          // Verificar atualizações a cada 60 minutos
          setInterval(() => reg.update(), 60 * 60 * 1000)
        })
        .catch((err) => console.warn('SW registration failed:', err))
    }
  }, [])

  return null
}
