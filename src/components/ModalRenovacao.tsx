'use client'
import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'

const supabase = createClient()
import { formatDateBR } from '@/lib/format'

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

  const jaRenovado = emprestimo.renovado_em !== null

  const d = new Date(emprestimo.prazo_final)
  d.setDate(d.getDate() + 15)
  const novoPrazo = new Date(d.getTime() + d.getTimezoneOffset() * 60000).toLocaleDateString('pt-BR')

  async function confirmar() {
    setSalvando(true)
    setErro('')

    const supabase = createClient()
    const { error } = await supabase.rpc('renovar_emprestimo', {
      p_id: emprestimo.id,
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
            Renovar empréstimo
          </h2>
          {jaRenovado ? (
            <span className="badge badge-gray">Bloqueado</span>
          ) : (
            <span className="badge badge-purple">+15 dias</span>
          )}
        </div>

        {jaRenovado ? (
          <>
            <div
              className="flex gap-3 rounded-xl p-4 mb-5"
              style={{ background: 'var(--bg-elevated)' }}
            >
              <svg className="flex-shrink-0 mt-0.5" width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="7.5" stroke="var(--text-muted)" strokeWidth="1" />
                <rect x="7.25" y="4" width="1.5" height="5" rx="0.75" fill="var(--text-muted)" />
                <rect x="7.25" y="10.5" width="1.5" height="1.5" rx="0.75" fill="var(--text-muted)" />
              </svg>
              <div>
                <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
                  Renovação não permitida
                </p>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  Este empréstimo já foi renovado em{' '}
                  <strong>{formatDateBR(emprestimo.renovado_em!)}</strong>. Cada empréstimo permite apenas uma
                  renovação.
                </p>
              </div>
            </div>
            <button onClick={onFechar} className="btn-ghost w-full py-2.5">
              Fechar
            </button>
          </>
        ) : (
          <>
            <div
              className="rounded-xl p-4 mb-4 text-sm"
              style={{ background: 'var(--bg-elevated)' }}
            >
              {[
                ['Aluno', emprestimo.aluno_nome],
                ['Livro', `${emprestimo.titulo} — ${emprestimo.autor}`],
                ['Prazo atual', formatDateBR(emprestimo.prazo_final)],
                ['Novo prazo', novoPrazo],
              ].map(([label, valor], i, arr) => (
                <div
                  key={label}
                  className="flex justify-between py-2.5"
                  style={{ borderBottom: i < arr.length - 1 ? '1px solid var(--border-default)' : 'none' }}
                >
                  <span style={{ color: 'var(--text-muted)' }}>{label}</span>
                  <span
                    style={{
                      color: label === 'Novo prazo' ? '#c084fc' : 'var(--text-primary)',
                      fontWeight: label === 'Novo prazo' ? 500 : 400,
                    }}
                  >
                    {valor}
                  </span>
                </div>
              ))}
            </div>

            <div
              className="rounded-xl px-4 py-3 mb-5 text-xs leading-relaxed"
              style={{
                background: 'var(--accent-purple-soft)',
                color: '#c084fc',
                border: '1px solid rgba(168, 85, 247, 0.15)',
              }}
            >
              Após a renovação, este empréstimo não poderá ser renovado novamente.
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
                  background: 'var(--gradient-purple)',
                  border: 'none',
                  cursor: salvando ? 'not-allowed' : 'pointer',
                }}
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
