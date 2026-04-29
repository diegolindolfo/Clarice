'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { fmt } from '@/lib/utils'

type Props = {
  emprestimo: {
    id: string
    aluno_nome: string
    titulo: string
    autor: string
    prazo_final: string
    renovado_em: string | null
  }
  onFechar: () => void
  onConfirmar: () => void
}

export default function ModalRenovacao({ emprestimo, onFechar, onConfirmar }: Props) {
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const dialogRef = useRef<HTMLDivElement>(null)

  const jaRenovado = emprestimo.renovado_em !== null

  const novoPrazo = (() => {
    const [y, m, d] = emprestimo.prazo_final.split('T')[0].split('-').map(Number)
    const data = new Date(y, m - 1, d)
    data.setDate(data.getDate() + 15)
    return data.toLocaleDateString('pt-BR')
  })()

  // Scroll lock — impede scroll do body enquanto modal aberto
  useEffect(() => {
    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = original }
  }, [])

  // Acessibilidade: Escape para fechar + trap de foco
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') { onFechar(); return }
      if (e.key === 'Tab' && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
        if (focusable.length === 0) return
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    dialogRef.current?.querySelector<HTMLElement>('button')?.focus()
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onFechar])

  async function confirmar() {
    setSalvando(true)
    setErro('')
    const supabase = createClient()
    const { error } = await supabase.rpc('renovar_emprestimo', { p_id: emprestimo.id })
    setSalvando(false)
    if (error) { setErro(error.message); return }
    onConfirmar()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.4)' }}
      onClick={onFechar}
      role="dialog"
      aria-modal="true"
      aria-label="Renovar empréstimo"
    >
      <div
        ref={dialogRef}
        className="bg-white rounded-2xl border border-gray-200 p-6 w-full max-w-md"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-medium">Renovar empréstimo</h2>
          {jaRenovado ? (
            <span className="text-xs font-medium bg-gray-100 text-gray-600 px-3 py-1 rounded-full">Bloqueado</span>
          ) : (
            <span className="text-xs font-medium bg-purple-50 text-purple-800 px-3 py-1 rounded-full">+15 dias</span>
          )}
        </div>

        {jaRenovado ? (
          <>
            <div className="flex gap-3 bg-gray-50 rounded-xl p-4 mb-5">
              <svg className="flex-shrink-0 mt-0.5" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <circle cx="8" cy="8" r="7.5" stroke="#5F5E5A" strokeWidth="1"/>
                <rect x="7.25" y="4" width="1.5" height="5" rx="0.75" fill="#5F5E5A"/>
                <rect x="7.25" y="10.5" width="1.5" height="1.5" rx="0.75" fill="#5F5E5A"/>
              </svg>
              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">Renovação não permitida</p>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Este empréstimo já foi renovado em{' '}
                  <strong>{fmt(emprestimo.renovado_em!)}</strong>.
                  Cada empréstimo permite apenas uma renovação.
                </p>
              </div>
            </div>
            <button onClick={onFechar} className="w-full border rounded-xl py-2.5 text-sm hover:bg-gray-50">
              Fechar
            </button>
          </>
        ) : (
          <>
            <div className="bg-gray-50 rounded-xl p-4 mb-4 text-sm divide-y divide-gray-100">
              {[
                ['Aluno',       emprestimo.aluno_nome],
                ['Livro',       `${emprestimo.titulo} — ${emprestimo.autor}`],
                ['Prazo atual', fmt(emprestimo.prazo_final)],
                ['Novo prazo',  novoPrazo],
              ].map(([label, valor]) => (
                <div key={label} className="flex justify-between py-2 first:pt-0 last:pb-0">
                  <span className="text-gray-500">{label}</span>
                  <span className={label === 'Novo prazo' ? 'font-medium text-purple-800' : ''}>{valor}</span>
                </div>
              ))}
            </div>

            <div className="bg-purple-50 rounded-xl px-4 py-3 mb-5 text-xs text-purple-800 leading-relaxed">
              Após a renovação, este empréstimo não poderá ser renovado novamente.
            </div>

            {erro && (
              <div className="bg-red-50 text-red-700 text-xs rounded-lg px-3 py-2 mb-4">{erro}</div>
            )}

            <div className="flex gap-3">
              <button onClick={onFechar} className="flex-1 border rounded-xl py-2.5 text-sm hover:bg-gray-50">
                Cancelar
              </button>
              <button
                onClick={confirmar}
                disabled={salvando}
                className="flex-[2] bg-purple-700 hover:bg-purple-800 text-white rounded-xl py-2.5 text-sm font-medium disabled:opacity-50 transition-colors"
              >
                {salvando ? 'Salvando...' : 'Confirmar renovação'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
