import React from 'react'

export default function Chip({ ativo, onClick, children }: { ativo: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`text-xs px-3 py-1.5 rounded-full border whitespace-nowrap transition-colors ${
        ativo
          ? 'border-gray-400 bg-gray-100 font-medium'
          : 'border-gray-200 text-gray-500 hover:border-gray-300'
      }`}
    >
      {children}
    </button>
  )
}
