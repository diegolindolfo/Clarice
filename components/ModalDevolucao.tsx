'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { fmt } from '@/lib/utils'

type Props = {
  emprestimo: {
    id: string
    aluno_nome: string
    titulo: string
    autor: string
    data_saida: string
    prazo_final: string
    em_atraso: boolean
  }
  onFechar: () => void
  onConfirmar: () => void
}

// BUG CORRIGIDO: cálculo de diasAtraso comparava timestamp local com UTC midnight,
// podendo ser impreciso perto de meia-noite. Agora compara apenas as datas (sem horário).
function calcDiasAtraso(prazoFinal: string): number {
  const [y, m, d] = prazoFinal.split('T')[0].split('-').map(Number)
  const prazo = new Date(y, m - 1, d)
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  return Math.floor((hoje.getTime() - prazo.getTime()) / 86400000)
}

export default function ModalDevolucao({ emprestimo, onFechar, onConfirmar }: Props) {
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  const diasAtraso = emprestimo.em_atraso ? calcDiasAtraso(emprestimo.prazo_final) : 0
  const hojeStr = new Date().toLocaleDateString('pt-BR')

  async function confirmar() {
    setSalvando(true)
    setErro('')
    const supabase = createClient()
    const { error } = await supabase.rpc('devolver_livro', { p_emprestimo_id: emprestimo.id })
    setSalvando(false)
    if (error) { setErro(error.message); return }
    onConfirmar()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.4)' }}
      onClick={onFechar}
    >
      <div
        className="bg-white rounded-2xl border border-gray-200 p-6 w-full max-w-md"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-medium">Confirmar devolução</h2>
          {emprestimo.em_atraso ? (
            <span className="text-xs font-medium bg-red-50 text-red-800 px-3 py-1 rounded-full">
              {diasAtraso} {diasAtraso === 1 ? 'dia' : 'dias'} de atraso
            </span>
          ) : (
            <span className="text-xs font-medium bg-green-50 text-green-800 px-3 py-1 rounded-full">
              No prazo
            </span>
          )}
        </div>

        {emprestimo.em_atraso && (
          <div className="flex gap-3 bg-red-50 rounded-xl p-3 mb-4">
            <svg className="flex-shrink-0 mt-0.5" width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="7.5" stroke="#A32D2D" strokeWidth="1"/>
              <rect x="7.25" y="4" width="1.5" height="5" rx="0.75" fill="#A32D2D"/>
              <rect x="7.25" y="10.5" width="1.5" height="1.5" rx="0.75" fill="#A32D2D"/>
            </svg>
            <p className="text-xs text-red-700 leading-relaxed">
              Este livro deveria ter sido devolvido em{' '}
              <strong>{fmt(emprestimo.prazo_final)}</strong>.
            </p>
          </div>
        )}

        <div className="bg-gray-50 rounded-xl p-4 mb-5 text-sm divide-y divide-gray-100">
          {[
            ['Aluno',     emprestimo.aluno_nome],
            ['Livro',     `${emprestimo.titulo} — ${emprestimo.autor}`],
            ['Saída',     fmt(emprestimo.data_saida)],
            ['Prazo',     fmt(emprestimo.prazo_final)],
            ['Devolução', emprestimo.em_atraso ? `${hojeStr} (+${diasAtraso}d)` : hojeStr],
          ].map(([label, valor]) => (
            <div key={label} className="flex justify-between py-2 first:pt-0 last:pb-0">
              <span className="text-gray-500">{label}</span>
              <span className={
                label === 'Prazo' && emprestimo.em_atraso ? 'font-medium text-red-700' :
                label === 'Devolução' && emprestimo.em_atraso ? 'font-medium text-red-700' :
                label === 'Devolução' ? 'font-medium text-green-700' : ''
              }>{valor}</span>
            </div>
          ))}
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
            className={`flex-[2] rounded-xl py-2.5 text-sm font-medium text-white disabled:opacity-50 transition-colors ${
              emprestimo.em_atraso ? 'bg-red-700 hover:bg-red-800' : 'bg-blue-800 hover:bg-blue-900'
            }`}
          >
            {salvando ? 'Salvando...' : emprestimo.em_atraso ? 'Confirmar mesmo assim' : 'Confirmar devolução'}
          </button>
        </div>
      </div>
    </div>
  )
}
