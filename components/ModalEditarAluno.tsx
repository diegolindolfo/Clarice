'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { toast_success, toast_error } from '@/components/Toast'

type Aluno = {
  matricula: number
  nome: string
  turma: string
  email: string | null
}

type Turma = {
  id: number
  nome: string
}

type Props = {
  aluno: Aluno
  onFechar: () => void
  onSalvar: () => void
}

export default function ModalEditarAluno({ aluno, onFechar, onSalvar }: Props) {
  const [nome, setNome]       = useState(aluno.nome)
  const [email, setEmail]     = useState(aluno.email ?? '')
  const [turmaId, setTurmaId] = useState<number | ''>('')
  const [turmas, setTurmas]   = useState<Turma[]>([])
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro]         = useState('')
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function carregar() {
      const supabase = createClient()
      const { data } = await supabase.from('turmas').select('id, nome').order('nome')
      setTurmas(data ?? [])

      // Pré-selecionar a turma atual
      const turmaAtual = (data ?? []).find(t => t.nome === aluno.turma)
      if (turmaAtual) setTurmaId(turmaAtual.id)
    }
    carregar()
  }, [aluno.turma])

  // Acessibilidade
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') { onFechar(); return }
      if (e.key === 'Tab' && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
        if (focusable.length === 0) return
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    dialogRef.current?.querySelector<HTMLElement>('input')?.focus()
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onFechar])

  async function salvar() {
    if (!nome.trim()) { setErro('Nome é obrigatório'); return }
    setSalvando(true)
    setErro('')

    const supabase = createClient()

    const updates: Record<string, any> = {
      nome: nome.trim(),
      email: email.trim() || null,
    }
    if (turmaId) updates.turma_id = turmaId

    const { error } = await supabase
      .from('alunos')
      .update(updates)
      .eq('matricula', aluno.matricula)

    setSalvando(false)
    if (error) {
      toast_error(`Erro ao salvar: ${error.message}`)
      setErro(error.message)
      return
    }
    toast_success('Dados do aluno atualizados!')
    onSalvar()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.4)' }}
      onClick={onFechar}
      role="dialog"
      aria-modal="true"
      aria-label="Editar dados do aluno"
    >
      <div
        ref={dialogRef}
        className="bg-white rounded-2xl border border-gray-200 p-6 w-full max-w-md"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-medium">Editar aluno</h2>
          <span className="text-xs text-gray-400 font-mono">mat. {aluno.matricula}</span>
        </div>

        <div className="flex flex-col gap-4 mb-5">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Nome *</label>
            <input
              className={`w-full ${erro && !nome.trim() ? 'border-red-400' : ''}`}
              value={nome}
              onChange={e => { setNome(e.target.value); setErro('') }}
              placeholder="Nome completo"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">E-mail</label>
            <input
              type="email"
              className="w-full"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="email@escola.com (opcional)"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Turma</label>
            <select className="w-full" value={turmaId} onChange={e => setTurmaId(Number(e.target.value))}>
              <option value="">Selecione...</option>
              {turmas.map(t => (
                <option key={t.id} value={t.id}>{t.nome}</option>
              ))}
            </select>
          </div>
        </div>

        {erro && (
          <div className="bg-red-50 text-red-700 text-xs rounded-lg px-3 py-2 mb-4">{erro}</div>
        )}

        <div className="flex gap-3">
          <button onClick={onFechar} className="flex-1 border rounded-xl py-2.5 text-sm hover:bg-gray-50 transition-colors">
            Cancelar
          </button>
          <button
            onClick={salvar}
            disabled={salvando}
            className="flex-[2] bg-blue-800 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-blue-900 disabled:opacity-50 transition-colors"
          >
            {salvando ? 'Salvando...' : 'Salvar alterações'}
          </button>
        </div>
      </div>
    </div>
  )
}
