import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import type { Carimbo } from '@/lib/selos'

export type Aluno = {
  matricula: number
  nome: string
  turma: string
  turma_id: number | null
  foto_url: string | null
  ativo: boolean
}

export type Posicao = {
  turma: number | null
  turmaTotal: number
  geral: number | null
  geralTotal: number
  totalAluno: number
}

type PayloadPassaporte = {
  aluno: {
    matricula: number
    nome: string
    turma: string | null
    turma_id: number | null
    foto_url: string | null
    ativo: boolean
  } | null
  carimbos: Array<{
    emprestimo_id: string
    titulo: string | null
    autor: string | null
    tipo: string | null
    genero: string | null
    imagem_url: string | null
    data_saida: string
    data_devolucao_real: string | null
    prazo_final: string | null
    status: string
  }>
  ranking: {
    geral: number | null
    geralTotal: number
    turma: number | null
    turmaTotal: number
    totalAluno: number
  } | null
}

type State = {
  aluno: Aluno | null
  carimbos: Carimbo[]
  posicao: Posicao | null
  carregando: boolean
  erro: string
}

export function usePassaporte(matriculaNum: number): State {
  const [aluno, setAluno] = useState<Aluno | null>(null)
  const [carimbos, setCarimbos] = useState<Carimbo[]>([])
  const [posicao, setPosicao] = useState<Posicao | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  useEffect(() => {
    if (!Number.isFinite(matriculaNum)) {
      setErro('Matr\u00edcula inv\u00e1lida.')
      setCarregando(false)
      return
    }

    let ativoFlag = true

    function aplicarPayload(p: PayloadPassaporte | null) {
      if (!ativoFlag) return
      if (!p || !p.aluno) {
        setErro('Passaporte n\u00e3o encontrado.')
        setCarregando(false)
        return
      }
      const hoje = new Date().toISOString().split('T')[0]
      const alunoDetalhe: Aluno = {
        matricula: p.aluno.matricula,
        nome: p.aluno.nome,
        turma: p.aluno.turma ?? '',
        turma_id: p.aluno.turma_id ?? null,
        foto_url: p.aluno.foto_url ?? null,
        ativo: p.aluno.ativo !== false,
      }
      setAluno(alunoDetalhe)

      const lista: Carimbo[] = (p.carimbos ?? []).map(c => ({
        emprestimo_id: c.emprestimo_id,
        titulo: c.titulo ?? '(sem t\u00edtulo)',
        autor: c.autor ?? null,
        tipo: c.tipo ?? null,
        genero: c.genero ?? null,
        imagem_url: c.imagem_url ?? null,
        data_saida: c.data_saida,
        data_devolucao_real: c.data_devolucao_real,
        status: c.status as Carimbo['status'],
        em_atraso:
          (c.status === 'EMPRESTADO' || c.status === 'RENOVADO') &&
          !!c.prazo_final &&
          c.prazo_final < hoje,
      }))
      setCarimbos(lista)

      if (p.ranking) {
        setPosicao({
          geral: p.ranking.geral ?? null,
          geralTotal: p.ranking.geralTotal ?? 0,
          turma: p.ranking.turma ?? null,
          turmaTotal: p.ranking.turmaTotal ?? 0,
          totalAluno: p.ranking.totalAluno ?? 0,
        })
      }
      setCarregando(false)
    }

    async function carregar() {
      setCarregando(true)
      setErro('')
      try {
        const supabase = createClient()

        // 1) Preferimos a RPC publica get_passaporte (security definer,
        //    um unico round-trip). Se nao existir (schema antigo), caimos
        //    pras queries diretas abaixo.
        const { data: rpcData, error: rpcErr } = await supabase.rpc(
          'get_passaporte',
          { p_matricula: matriculaNum },
        )

        const rpcIndisponivel =
          !!rpcErr &&
          (rpcErr.code === 'PGRST202' ||
            /function .* does not exist|could not find the function/i.test(
              rpcErr.message ?? '',
            ))

        // Se a RPC respondeu sem erro, confiamos no retorno (inclusive null =
        // aluno nao encontrado) e NAO caimos pro fallback - se a RPC existe
        // e que tem permissao anon, as queries diretas nao teriam.
        if (!rpcErr) {
          aplicarPayload(rpcData as PayloadPassaporte | null)
          return
        }

        if (!rpcIndisponivel) throw rpcErr

        // 2) Fallback: queries diretas (pre-migracao)
        const { data: alunoData, error: alunoErr } = await supabase
          .from('alunos')
          .select('matricula, nome, turma_id, foto_url, ativo, turmas(nome)')
          .eq('matricula', matriculaNum)
          .maybeSingle()

        if (alunoErr) throw alunoErr
        if (!ativoFlag) return
        if (!alunoData) {
          setErro('Passaporte n\u00e3o encontrado.')
          setCarregando(false)
          return
        }

        type AlunoFallbackRow = {
          matricula: number
          nome: string
          turma_id: number | null
          foto_url: string | null
          ativo: boolean | null
          turmas: { nome: string } | { nome: string }[] | null
        }
        const a = alunoData as AlunoFallbackRow
        const turmaNome = Array.isArray(a.turmas)
          ? a.turmas[0]?.nome ?? ''
          : a.turmas?.nome ?? ''
        const alunoDetalhe: Aluno = {
          matricula: a.matricula,
          nome: a.nome,
          turma: turmaNome,
          turma_id: a.turma_id ?? null,
          foto_url: a.foto_url ?? null,
          ativo: a.ativo !== false,
        }
        setAluno(alunoDetalhe)

        const { data: empData, error: empErr } = await supabase
          .from('emprestimos')
          .select(`
            id, status, data_saida, data_devolucao_prevista, data_devolucao_renovada, data_devolucao_real,
            exemplar:livros_exemplares(
              acervo:acervo_id(titulo, autor, tipo, genero, imagem_url)
            )
          `)
          .eq('aluno_matricula', matriculaNum)
          .order('data_saida', { ascending: false })

        if (empErr) throw empErr
        if (!ativoFlag) return

        type AcervoEmbed = {
          titulo: string | null
          autor: string | null
          tipo: string | null
          genero: string | null
          imagem_url: string | null
        }
        type EmprestimoFallbackRow = {
          id: string
          status: 'EMPRESTADO' | 'RENOVADO' | 'DEVOLVIDO'
          data_saida: string
          data_devolucao_prevista: string | null
          data_devolucao_renovada: string | null
          data_devolucao_real: string | null
          exemplar: {
            acervo: AcervoEmbed | AcervoEmbed[] | null
          } | { acervo: AcervoEmbed | AcervoEmbed[] | null }[] | null
        }

        const hoje = new Date().toISOString().split('T')[0]
        const lista: Carimbo[] = ((empData ?? []) as EmprestimoFallbackRow[]).map(e => {
          const exemplar = Array.isArray(e.exemplar) ? e.exemplar[0] : e.exemplar
          const acervoRaw = exemplar?.acervo ?? null
          const acervo: AcervoEmbed | null = Array.isArray(acervoRaw) ? acervoRaw[0] ?? null : acervoRaw
          const prazoEfetivo = e.data_devolucao_renovada ?? e.data_devolucao_prevista ?? null
          const em_atraso =
            (e.status === 'EMPRESTADO' || e.status === 'RENOVADO') &&
            prazoEfetivo != null &&
            prazoEfetivo < hoje
          return {
            emprestimo_id: e.id,
            titulo: acervo?.titulo ?? '(sem t\u00edtulo)',
            autor: acervo?.autor ?? null,
            tipo: acervo?.tipo ?? null,
            genero: acervo?.genero ?? null,
            imagem_url: acervo?.imagem_url ?? null,
            data_saida: e.data_saida,
            data_devolucao_real: e.data_devolucao_real,
            status: e.status,
            em_atraso: !!em_atraso,
          }
        })
        setCarimbos(lista)

        const anoAtual = new Date().getFullYear()
        const inicioAno = `${anoAtual}-01-01`

        const [{ data: rankingData }, { data: alunosTurma }] = await Promise.all([
          supabase
            .from('emprestimos')
            .select('aluno_matricula')
            .eq('status', 'DEVOLVIDO')
            .gte('data_devolucao_real', inicioAno),
          supabase
            .from('alunos')
            .select('matricula, turma_id'),
        ])

        if (!ativoFlag) return
        if (rankingData) {
          const turmaPorMatricula = new Map<number, number | null>(
            ((alunosTurma ?? []) as { matricula: number; turma_id: number | null }[])
              .map(al => [al.matricula, al.turma_id]),
          )
          const totaisGeral: Record<number, number> = {}
          const totaisTurma: Record<number, number> = {}
          for (const r of rankingData as { aluno_matricula: number }[]) {
            const m = r.aluno_matricula
            totaisGeral[m] = (totaisGeral[m] ?? 0) + 1
            const tAluno = turmaPorMatricula.get(m) ?? null
            if (alunoDetalhe.turma_id != null && tAluno === alunoDetalhe.turma_id) {
              totaisTurma[m] = (totaisTurma[m] ?? 0) + 1
            }
          }

          const totalAluno = totaisGeral[matriculaNum] ?? 0

          const geralOrdenado = Object.entries(totaisGeral)
            .map(([m, t]) => ({ matricula: Number(m), total: t }))
            .sort((al, bl) => bl.total - al.total)
          const turmaOrdenado = Object.entries(totaisTurma)
            .map(([m, t]) => ({ matricula: Number(m), total: t }))
            .sort((al, bl) => bl.total - al.total)

          const posGeral = geralOrdenado.findIndex(p => p.matricula === matriculaNum)
          const posTurma = turmaOrdenado.findIndex(p => p.matricula === matriculaNum)

          setPosicao({
            geral: posGeral >= 0 ? posGeral + 1 : null,
            geralTotal: geralOrdenado.length,
            turma: posTurma >= 0 ? posTurma + 1 : null,
            turmaTotal: turmaOrdenado.length,
            totalAluno,
          })
        }
      } catch (err) {
        console.error('Erro ao carregar passaporte:', err)
        if (ativoFlag) setErro('Erro ao carregar passaporte.')
      } finally {
        if (ativoFlag) setCarregando(false)
      }
    }

    carregar()

    return () => {
      ativoFlag = false
    }
  }, [matriculaNum])

  return { aluno, carimbos, posicao, carregando, erro }
}
