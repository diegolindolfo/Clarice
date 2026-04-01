import React from 'react'

export function Campo({ label, erro, children }: { label: string; erro?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      {children}
      {erro && <p className="text-xs text-red-600 mt-1">{erro}</p>}
    </div>
  )
}

export function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">{titulo}</p>
      {children}
      <div className="mt-6 border-b border-gray-100" />
    </div>
  )
}
