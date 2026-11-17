'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { toast_success, toast_error } from '@/components/Toast'

export type AlunoCriado = {
  matricula: number
  nome: string
  turma: string
  turma_id: number
  email: string | null
}

type Turma = {
  id: number
  nome: string
}

type Props = {
  onFechar: () => void
  onSalvo: (aluno: AlunoCriado) => void
}

const OPCAO_NOVA_TURMA = '__nova__'

export default function ModalNovoAluno({ onFechar, onSalvo }: Props) {
  const [matricula, setMatricula] = useState('')
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [turmaSel, setTurmaSel] = useState<string>('')
  const [novaTurma, setNovaTurma] = useState('')
  const [turmas, setTurmas] = useState<Turma[]>([])
  const [carregandoTurmas, setCarregandoTurmas] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function carregar() {
      const supabase = createClient()
      const { data } = await supabase.from('turmas').select('id, nome').order('nome')
      setTurmas((data ?? []) as Turma[])
      setCarregandoTurmas(false)
    }
    carregar()
  }, [])

  // Scroll lock — impede scroll do body enquanto modal aberto
  useEffect(() => {
    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = original }
  }, [])

  // Acessibilidade: Escape para fechar + focus trap
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

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    setErro('')

    const matLimpa = matricula.replace(/\D+/g, '')
    const matNum = Number(matLimpa)
    if (!matLimpa || !Number.isSafeInteger(matNum) || matNum <= 0) {
      setErro('Informe uma matrícula numérica válida.')
      return
    }
    if (!nome.trim()) {
      setErro('Nome é obrigatório.')
      return
    }
    const criandoTurma = turmaSel === OPCAO_NOVA_TURMA
    if (!turmaSel) {
      setErro('Selecione uma turma.')
      return
    }
    if (criandoTurma && !novaTurma.trim()) {
      setErro('Digite o nome da nova turma.')
      return
    }

    setSalvando(true)
    try {
      const supabase = createClient()

      // 1) Verifica se a matrícula já existe
      const { data: existente, error: checkErr } = await supabase
        .from('alunos')
        .select('matricula, nome')
        .eq('matricula', matNum)
        .maybeSingle()

      if (checkErr) throw checkErr
      if (existente) {
        setErro(`Matrícula ${matNum} já está cadastrada (${existente.nome}).`)
        setSalvando(false)
        return
      }

      // 2) Resolve turma_id (existente ou recém-criada)
      let turmaIdFinal: number
      let turmaNomeFinal: string

      if (criandoTurma) {
        const nomeLimpo = novaTurma.trim()
        const existenteTurma = turmas.find(
          t => t.nome.trim().toLowerCase() === nomeLimpo.toLowerCase(),
        )
        if (existenteTurma) {
          turmaIdFinal = existenteTurma.id
          turmaNomeFinal = existenteTurma.nome
        } else {
          const { data: turmaCriada, error: turmaErr } = await supabase
            .from('turmas')
            .insert({ nome: nomeLimpo })
            .select('id, nome')
            .single()

          if (turmaErr || !turmaCriada) {
            throw turmaErr ?? new Error('Não foi possível criar a turma.')
          }
          turmaIdFinal = (turmaCriada as Turma).id
          turmaNomeFinal = (turmaCriada as Turma).nome
        }
      } else {
        const encontrada = turmas.find(t => t.id === Number(turmaSel))
        if (!encontrada) {
          setErro('Turma selecionada inválida.')
          setSalvando(false)
          return
        }
        turmaIdFinal = encontrada.id
        turmaNomeFinal = encontrada.nome
      }

      // 3) Insere o aluno
      const emailLimpo = email.trim() || null
      const nomeLimpo = nome.trim()

      const { error: insertErr } = await supabase.from('alunos').insert({
        matricula: matNum,
        nome: nomeLimpo,
        turma_id: turmaIdFinal,
        email: emailLimpo,
        ativo: true,
      })

      if (insertErr) {
        if (insertErr.code === '23505') {
          setErro(`Matrícula ${matNum} já está cadastrada.`)
          setSalvando(false)
          return
        }
        throw insertErr
      }

      toast_success('Aluno cadastrado com sucesso!')
      onSalvo({
        matricula: matNum,
        nome: nomeLimpo,
        turma: turmaNomeFinal,
        turma_id: turmaIdFinal,
        email: emailLimpo,
      })
    } catch (err: any) {
      const msg = err?.message ?? 'Erro inesperado ao cadastrar aluno.'
      toast_error(`Erro ao cadastrar: ${msg}`)
      setErro(msg)
      setSalvando(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.4)' }}
      onClick={onFechar}
      role="dialog"
      aria-modal="true"
      aria-label="Cadastrar novo aluno"
    >
      <div
        ref={dialogRef}
        className="bg-white rounded-2xl border border-gray-200 p-6 w-full max-w-md"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-medium">Novo aluno</h2>
          <button
            type="button"
            onClick={onFechar}
            aria-label="Fechar"
            className="text-gray-400 hover:text-gray-600 text-sm px-1"
          >
            ✕
          </button>
        </div>

        <form onSubmit={salvar}>
          <div className="flex flex-col gap-4 mb-5">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Matrícula *</label>
              <input
                type="text"
                inputMode="numeric"
                className="w-full font-mono"
                value={matricula}
                onChange={e => { setMatricula(e.target.value.replace(/\D+/g, '')); setErro('') }}
                placeholder="Ex.: 2805315"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Nome completo *</label>
              <input
                className="w-full"
                value={nome}
                onChange={e => { setNome(e.target.value); setErro('') }}
                placeholder="Ex.: Maria da Silva"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Turma *</label>
              <select
                className="w-full"
                value={turmaSel}
                disabled={carregandoTurmas}
                onChange={e => { setTurmaSel(e.target.value); setErro('') }}
              >
                <option value="">{carregandoTurmas ? 'Carregando turmas...' : 'Selecione...'}</option>
                {turmas.map(t => (
                  <option key={t.id} value={String(t.id)}>{t.nome}</option>
                ))}
                <option value={OPCAO_NOVA_TURMA}>+ Criar nova turma...</option>
              </select>
            </div>

            {turmaSel === OPCAO_NOVA_TURMA && (
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Nome da nova turma *</label>
                <input
                  className="w-full"
                  value={novaTurma}
                  onChange={e => { setNovaTurma(e.target.value); setErro('') }}
                  placeholder="Ex.: 1º A"
                />
              </div>
            )}

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
          </div>

          {erro && (
            <div className="bg-red-50 text-red-700 text-xs rounded-lg px-3 py-2 mb-4">{erro}</div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onFechar}
              className="flex-1 border rounded-xl py-2.5 text-sm hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={salvando}
              className="flex-[2] bg-blue-800 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-blue-900 disabled:opacity-50 transition-colors"
            >
              {salvando ? 'Cadastrando...' : 'Cadastrar aluno'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
