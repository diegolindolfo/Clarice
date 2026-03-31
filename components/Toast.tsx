'use client'
import { useState, useEffect } from 'react'

type ToastType = 'success' | 'error' | 'info'

type Toast = {
  id: string
  message: string
  type: ToastType
}

const ICON: Record<ToastType, string> = {
  success: '✓',
  error: '✕',
  info: 'ℹ',
}

const STYLE: Record<ToastType, string> = {
  success: 'bg-green-50 text-green-800 border-green-200',
  error: 'bg-red-50 text-red-800 border-red-200',
  info: 'bg-blue-50 text-blue-800 border-blue-200',
}

const ICON_STYLE: Record<ToastType, string> = {
  success: 'bg-green-200 text-green-800',
  error: 'bg-red-200 text-red-800',
  info: 'bg-blue-200 text-blue-800',
}

// ── Gerenciador global de toasts ──
let listeners: Array<(toasts: Toast[]) => void> = []
let toasts: Toast[] = []

function notify() {
  listeners.forEach(fn => fn([...toasts]))
}

export function toast(message: string, type: ToastType = 'success') {
  const id = crypto.randomUUID()
  toasts = [...toasts, { id, message, type }]
  notify()

  setTimeout(() => {
    toasts = toasts.filter(t => t.id !== id)
    notify()
  }, 4000)
}

export function toast_success(message: string) { toast(message, 'success') }
export function toast_error(message: string) { toast(message, 'error') }

// ── Componente visual ──
export default function ToastContainer() {
  const [items, setItems] = useState<Toast[]>([])

  useEffect(() => {
    listeners.push(setItems)
    return () => { listeners = listeners.filter(fn => fn !== setItems) }
  }, [])

  if (items.length === 0) return null

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 max-w-sm" role="status" aria-live="polite">
      {items.map(t => (
        <div
          key={t.id}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg text-sm animate-fade-up ${STYLE[t.type]}`}
        >
          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${ICON_STYLE[t.type]}`}>
            {ICON[t.type]}
          </span>
          <span className="flex-1">{t.message}</span>
          <button
            onClick={() => { toasts = toasts.filter(x => x.id !== t.id); notify() }}
            className="text-xs opacity-50 hover:opacity-100 flex-shrink-0"
            aria-label="Fechar notificação"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  )
}
