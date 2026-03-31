'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { fmt, corAvatar, iniciais } from '@/lib/utils'

type Aluno = { matricula: number; nome: string; turma: string; email: string | null; em_atraso: boolean; foto_url?: string | null }

type Emprestimo = {
  emprestimo_id: string; titulo: string; autor: string
  data_saida: string; prazo_final: string; data_devolucao_real: string | null
  status: string; em_atraso: boolean
}

type Stats = { total: number; abertos: number; atrasados: number; devolvidos: number }

const STATUS_STYLE: Record<string, string> = {
  EMPRESTADO: 'bg-blue-50 text-blue-800', RENOVADO: 'bg-purple-50 text-purple-800',
  DEVOLVIDO: 'bg-green-50 text-green-800', ATRASADO: 'bg-red-50 text-red-800',
}

export default function PainelAluno({ aluno, onNovoEmprestimo }: { aluno: Aluno; onNovoEmprestimo: () => void }) {
  const [emprestimos, setEmprestimos] = useState<Emprestimo[]>([])
  const [stats, setStats]             = useState<Stats>({ total: 0, abertos: 0, atrasados: 0, devolvidos: 0 })
  const [carregando, setCarregando]   = useState(true)
  const [filtro, setFiltro]           = useState<'todos' | 'abertos' | 'historico'>('todos')

  useEffect(() => { setCarregando(true); carregar() }, [aluno.matricula])

  async function carregar() {
    const supabase = createClient()
    const { data } = await supabase
      .from('vw_painel_aluno').select('*').eq('matricula', aluno.matricula).order('data_saida', { ascending: false })

    const lista: Emprestimo[] = (data ?? []).map(e => ({
      emprestimo_id: e.emprestimo_id, titulo: e.titulo, autor: e.autor,
      data_saida: e.data_saida, prazo_final: e.prazo_final,
      data_devolucao_real: e.data_devolucao_real, status: e.status, em_atraso: e.em_atraso,
    }))

    setEmprestimos(lista)
    setStats({
      total: lista.length,
      abertos: lista.filter(e => e.status !== 'DEVOLVIDO').length,
      atrasados: lista.filter(e => e.em_atraso).length,
      devolvidos: lista.filter(e => e.status === 'DEVOLVIDO').length,
    })
    setCarregando(false)
  }

  const listaFiltrada = emprestimos.filter(e =>
    filtro === 'abertos' ? e.status !== 'DEVOLVIDO' :
    filtro === 'historico' ? e.status === 'DEVOLVIDO' : true
  )

  const { bg, tc } = corAvatar(aluno.matricula)

  return (
    <div>
      <div className="flex items-center gap-4 mb-5">
        {aluno.foto_url ? (
          <img src={aluno.foto_url} alt={aluno.nome} className="w-12 h-12 rounded-full object-cover flex-shrink-0" />
        ) : (
          <div className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0" style={{ background: bg, color: tc }}>
            {iniciais(aluno.nome)}
          </div>
        )}
        <div className="flex-1">
          <h2 className="text-lg font-medium">{aluno.nome}</h2>
          <p className="text-xs text-gray-500">mat. {aluno.matricula} · {aluno.turma}</p>
          {aluno.email && <p className="text-xs text-gray-400 mt-0.5">{aluno.email}</p>}
        </div>
        {aluno.em_atraso && <span className="text-xs font-medium bg-red-50 text-red-800 px-3 py-1 rounded-full">Atrasado</span>}
      </div>

      {carregando ? (
        <div className="h-20 bg-gray-50 rounded-xl animate-pulse mb-5" />
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-5">
          {[
            { label: 'Total',      valor: stats.total,     cor: '' },
            { label: 'Em aberto',  valor: stats.abertos,   cor: '' },
            { label: 'Atrasados',  valor: stats.atrasados, cor: stats.atrasados > 0 ? 'v' : '' },
            { label: 'Devolvidos', valor: stats.devolvidos, cor: '' },
          ].map(({ label, valor, cor }) => (
            <div key={label} className={`rounded-xl p-3 text-center ${cor === 'v' ? 'bg-red-50' : 'bg-gray-50'}`}>
              <p className={`text-xl font-mono font-medium ${cor === 'v' ? 'text-red-700' : ''}`}>{valor}</p>
              <p className={`text-xs mt-1 ${cor === 'v' ? 'text-red-600' : 'text-gray-500'}`}>{label}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2 mb-3">
        {([['todos', 'Todos'], ['abertos', 'Em aberto'], ['historico', 'Devolvidos']] as const).map(([val, label]) => (
          <button key={val} onClick={() => setFiltro(val)} className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${filtro === val ? 'border-gray-400 bg-gray-100 font-medium' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
            {label}
          </button>
        ))}
      </div>

      <div className="border rounded-2xl overflow-hidden mb-4">
        {carregando ? (
          <p className="text-center py-8 text-sm text-gray-400">Carregando...</p>
        ) : listaFiltrada.length === 0 ? (
          <p className="text-center py-8 text-sm text-gray-400">Nenhum empréstimo nesta categoria</p>
        ) : listaFiltrada.map((e, i) => (
          <div key={e.emprestimo_id} className={`flex items-center gap-3 px-4 py-3 text-sm ${i < listaFiltrada.length - 1 ? 'border-b' : ''} ${e.em_atraso ? 'bg-red-50/40' : ''}`}>
            <div className="w-8 h-11 rounded bg-gray-100 flex items-center justify-center text-base flex-shrink-0" aria-hidden="true">📖</div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{e.titulo}</p>
              <p className="text-xs text-gray-400 truncate">{e.autor}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {fmt(e.data_saida)} {' → '}
                {e.data_devolucao_real
                  ? <span className="text-green-700">{fmt(e.data_devolucao_real)}</span>
                  : <span className={e.em_atraso ? 'text-red-600 font-medium' : ''}>prazo {fmt(e.prazo_final)}</span>
                }
              </p>
            </div>
            <div className="flex flex-col items-end gap-1 flex-shrink-0">
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_STYLE[e.status]}`}>
                {e.status.charAt(0) + e.status.slice(1).toLowerCase()}
              </span>
              {e.em_atraso && (
                <span className="text-xs text-red-600">
                  {Math.floor((Date.now() - new Date(e.prazo_final + 'T00:00:00').getTime()) / 86400000)}d atraso
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      <button onClick={onNovoEmprestimo} className="w-full border rounded-xl py-2.5 text-sm hover:bg-gray-50 transition-colors">
        Novo empréstimo para este aluno →
      </button>
    </div>
  )
}
