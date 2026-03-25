'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'

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

export default function ModalDevolucao({ emprestimo, onFechar, onConfirmar }: Props) {
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  const hoje = new Date()
  const prazo = new Date(emprestimo.prazo_final)
  const diasAtraso = emprestimo.em_atraso
    ? Math.floor((hoje.getTime() - prazo.getTime()) / (1000 * 60 * 60 * 24))
    : 0

  const fmt = (d: string) => {
    const data = new Date(d)
    return new Date(data.getTime() + data.getTimezoneOffset() * 60000).toLocaleDateString('pt-BR')
  }
  const hojeStr = hoje.toLocaleDateString('pt-BR')

  async function confirmar() {
    setSalvando(true)
    setErro('')

    const { error } = await supabase.rpc('devolver_livro', {
      p_emprestimo_id: emprestimo.id,
    })

    setSalvando(false)

    if (error) {
      setErro(error.message)
      return
    }

    onConfirmar()
  }

  return (
    <div className="modal-overlay" onClick={onFechar}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
            Confirmar devolução
          </h2>
          {emprestimo.em_atraso ? (
            <span className="badge badge-red">
              {diasAtraso} {diasAtraso === 1 ? 'dia' : 'dias'} de atraso
            </span>
          ) : (
            <span className="badge badge-green">No prazo</span>
          )}
        </div>

        {emprestimo.em_atraso && (
          <div
            className="flex gap-3 rounded-xl p-4 mb-5"
            style={{ background: 'var(--accent-rose-soft)', border: '1px solid rgba(244, 63, 94, 0.15)' }}
          >
            <svg className="flex-shrink-0 mt-0.5" width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="7.5" stroke="var(--accent-rose)" strokeWidth="1" />
              <rect x="7.25" y="4" width="1.5" height="5" rx="0.75" fill="var(--accent-rose)" />
              <rect x="7.25" y="10.5" width="1.5" height="1.5" rx="0.75" fill="var(--accent-rose)" />
            </svg>
            <p className="text-xs leading-relaxed" style={{ color: '#fb7185' }}>
              Este livro deveria ter sido devolvido em{' '}
              <strong>{fmt(emprestimo.prazo_final)}</strong>.
              Registre a ocorrência se necessário.
            </p>
          </div>
        )}

        <div
          className="rounded-xl p-4 mb-5 text-sm"
          style={{ background: 'var(--bg-elevated)' }}
        >
          {[
            ['Aluno', emprestimo.aluno_nome],
            ['Livro', `${emprestimo.titulo} — ${emprestimo.autor}`],
            ['Saída', fmt(emprestimo.data_saida)],
            ['Prazo', fmt(emprestimo.prazo_final)],
            [
              'Devolução',
              emprestimo.em_atraso
                ? `${hojeStr} (+${diasAtraso} ${diasAtraso === 1 ? 'dia' : 'dias'})`
                : hojeStr,
            ],
          ].map(([label, valor], i, arr) => (
            <div
              key={label}
              className="flex justify-between py-2.5"
              style={{ borderBottom: i < arr.length - 1 ? '1px solid var(--border-default)' : 'none' }}
            >
              <span style={{ color: 'var(--text-muted)' }}>{label}</span>
              <span
                style={{
                  color:
                    (label === 'Prazo' || label === 'Devolução') && emprestimo.em_atraso
                      ? 'var(--accent-rose)'
                      : label === 'Devolução'
                      ? 'var(--accent-emerald)'
                      : 'var(--text-primary)',
                  fontWeight: label === 'Prazo' || label === 'Devolução' ? 500 : 400,
                }}
              >
                {valor}
              </span>
            </div>
          ))}
        </div>

        {erro && (
          <div
            className="text-xs rounded-lg px-4 py-3 mb-4"
            style={{ background: 'var(--accent-rose-soft)', color: 'var(--accent-rose)' }}
          >
            {erro}
          </div>
        )}

        <div className="flex gap-3">
          <button onClick={onFechar} className="btn-ghost flex-1 py-2.5">
            Cancelar
          </button>
          <button
            onClick={confirmar}
            disabled={salvando}
            className={`flex-[2] rounded-2xl py-2.5 text-sm font-medium text-white transition-all ${
              salvando ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            style={{
              background: emprestimo.em_atraso ? 'var(--gradient-rose)' : 'var(--gradient-indigo)',
              border: 'none',
              cursor: salvando ? 'not-allowed' : 'pointer',
            }}
          >
            {salvando ? 'Salvando...' : emprestimo.em_atraso ? 'Confirmar mesmo assim' : 'Confirmar devolução'}
          </button>
        </div>
      </div>
    </div>
  )
}
