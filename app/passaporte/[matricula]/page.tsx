'use client'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { corAvatar, iniciais, fmt } from '@/lib/utils'
import {
  calcularPassaporte,
  proximoSelo,
  type Carimbo,
  type Selo,
} from '@/lib/selos'

export const dynamic = 'force-dynamic'

type Aluno = {
  matricula: number
  nome: string
  turma: string
  turma_id: number | null
  foto_url: string | null
  ativo: boolean
}

type Posicao = {
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

const MESES_PT_CURTO = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

function labelMesChave(mes: string): string {
  const [y, m] = mes.split('-').map(Number)
  return `${MESES_PT_CURTO[(m - 1) % 12]}/${String(y).slice(-2)}`
}

// Normalizacao estilo MRZ (Machine Readable Zone) de passaporte real: so
// [A-Z0-9<]. Espacos e caracteres nao permitidos viram '<'. Apenas visual
// — nao precisa bater com o padrao ICAO 100%.
function mrzClean(raw: string, tamanho: number): string {
  const base = raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '<')
  return base.length >= tamanho ? base.slice(0, tamanho) : base + '<'.repeat(tamanho - base.length)
}

function mrzNome(nome: string): string {
  const partes = nome.trim().split(/\s+/)
  const sobrenome = partes.length > 1 ? partes.slice(1).join('<') : partes[0] ?? ''
  const primeiro = partes.length > 1 ? partes[0] : ''
  const cru = `${sobrenome}<<${primeiro}`
  return mrzClean(cru, 30)
}

function mrzMatricula(matricula: number): string {
  return mrzClean(String(matricula), 12)
}

function mrzTurma(turma: string | null | undefined): string {
  return mrzClean(turma ?? '', 8)
}

function SeloCard({ selo }: { selo: Selo }) {
  const conquistado = selo.conquistado
  return (
    <div
      className="rounded-xl border p-4 flex flex-col items-center text-center transition-opacity"
      style={{
        backgroundColor: conquistado ? 'var(--bg-card)' : 'var(--bg-muted)',
        borderColor: 'var(--border)',
        opacity: conquistado ? 1 : 0.55,
      }}
      title={selo.descricao}
    >
      <div
        className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl mb-2 ${
          conquistado ? '' : 'grayscale'
        }`}
        style={{
          backgroundColor: conquistado ? 'var(--bg-muted)' : 'transparent',
          border: `2px dashed ${conquistado ? 'transparent' : 'var(--border)'}`,
        }}
      >
        {conquistado ? selo.icone : '🔒'}
      </div>
      <p className="text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>{selo.nome}</p>
      <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{selo.descricao}</p>
      {!conquistado && selo.meta > 1 && (
        <div className="w-full mt-3">
          <div className="h-[3px] rounded-full overflow-hidden" style={{ backgroundColor: 'var(--border)' }}>
            <div
              className="h-full transition-all"
              style={{ width: `${Math.round(selo.progresso * 100)}%`, backgroundColor: 'var(--text-secondary)' }}
            />
          </div>
          <p className="text-[10px] font-mono mt-1" style={{ color: 'var(--text-muted)' }}>
            {selo.atual} / {selo.meta}
          </p>
        </div>
      )}
    </div>
  )
}

function CarimboVisual({ carimbo }: { carimbo: Carimbo }) {
  const data = carimbo.data_devolucao_real ?? carimbo.data_saida
  const ativo = carimbo.status !== 'DEVOLVIDO'
  const dataLabel = carimbo.status === 'DEVOLVIDO' && carimbo.data_devolucao_real
    ? fmt(carimbo.data_devolucao_real)
    : fmt(data)

  return (
    <div
      className="relative rounded-xl border p-4 flex gap-3 items-start transition-colors"
      style={{
        backgroundColor: 'var(--bg-card)',
        borderColor: 'var(--border)',
      }}
    >
      <div
        className="shrink-0 w-14 h-20 rounded-md overflow-hidden flex items-center justify-center text-[10px] text-center"
        style={{
          backgroundColor: 'var(--bg-muted)',
          color: 'var(--text-muted)',
        }}
      >
        {carimbo.imagem_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={carimbo.imagem_url}
            alt={carimbo.titulo}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="px-1">{carimbo.tipo ?? 'Livro'}</span>
        )}
      </div>
      <div className="flex-1 min-w-0 pr-14">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-[13px] font-medium truncate" style={{ color: 'var(--text-primary)' }}>
            {carimbo.titulo}
          </p>
          {ativo && (
            <span
              className="text-[10px] px-1.5 py-0.5 rounded-full"
              style={{ backgroundColor: 'var(--bg-muted)', color: 'var(--text-muted)' }}
            >
              em leitura
            </span>
          )}
          {carimbo.em_atraso && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-50 text-red-700">
              atrasado
            </span>
          )}
        </div>
        {carimbo.autor && (
          <p className="text-[11px] mt-0.5 truncate" style={{ color: 'var(--text-secondary)' }}>
            {carimbo.autor}
          </p>
        )}
        <p className="text-[10px] font-mono mt-1" style={{ color: 'var(--text-muted)' }}>
          {carimbo.status === 'DEVOLVIDO' && carimbo.data_devolucao_real
            ? `Carimbado em ${fmt(carimbo.data_devolucao_real)}`
            : `Retirado em ${fmt(data)}`}
          {carimbo.genero && <span> · {carimbo.genero}</span>}
        </p>
      </div>
      {/* Selo redondo estilo carimbo de passaporte */}
      <div
        aria-hidden
        className="absolute top-3 right-3 w-12 h-12 rounded-full flex flex-col items-center justify-center text-center pointer-events-none select-none"
        style={{
          border: `1.5px double ${ativo ? 'var(--text-muted)' : 'var(--text-secondary)'}`,
          color: ativo ? 'var(--text-muted)' : 'var(--text-secondary)',
          transform: 'rotate(-8deg)',
          opacity: 0.82,
        }}
      >
        <span className="text-[8px] uppercase tracking-[0.15em] leading-none">lido</span>
        <span className="text-[9px] font-mono leading-tight mt-0.5">{dataLabel}</span>
      </div>
    </div>
  )
}

export default function PassaporteAlunoPage() {
  const params = useParams<{ matricula: string }>()
  const router = useRouter()
  const matriculaNum = Number(params.matricula)

  const [aluno, setAluno] = useState<Aluno | null>(null)
  const [carimbos, setCarimbos] = useState<Carimbo[]>([])
  const [posicao, setPosicao] = useState<Posicao | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [baixandoPDF, setBaixandoPDF] = useState(false)

  useEffect(() => {
    if (!Number.isFinite(matriculaNum)) {
      setErro('Matrícula inválida.')
      setCarregando(false)
      return
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
        // aluno nao encontrado) e NAO caimos pro fallback — se a RPC existe
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
        if (!alunoData) {
          setErro('Passaporte não encontrado.')
          setCarregando(false)
          return
        }

        const alunoDetalhe: Aluno = {
          matricula: (alunoData as any).matricula,
          nome: (alunoData as any).nome,
          turma: ((alunoData as any).turmas as any)?.nome ?? '',
          turma_id: (alunoData as any).turma_id ?? null,
          foto_url: (alunoData as any).foto_url ?? null,
          ativo: (alunoData as any).ativo !== false,
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

        const hoje = new Date().toISOString().split('T')[0]
        const lista: Carimbo[] = (empData ?? []).map((e: any) => {
          const acervo = e.exemplar?.acervo ?? {}
          const prazoEfetivo = e.data_devolucao_renovada ?? e.data_devolucao_prevista ?? null
          const em_atraso =
            (e.status === 'EMPRESTADO' || e.status === 'RENOVADO') &&
            prazoEfetivo != null &&
            prazoEfetivo < hoje
          return {
            emprestimo_id: e.id,
            titulo: acervo.titulo ?? '(sem título)',
            autor: acervo.autor ?? null,
            tipo: acervo.tipo ?? null,
            genero: acervo.genero ?? null,
            imagem_url: acervo.imagem_url ?? null,
            data_saida: e.data_saida,
            data_devolucao_real: e.data_devolucao_real,
            status: e.status,
            em_atraso: !!em_atraso,
          }
        })
        setCarimbos(lista)

        const anoAtual = new Date().getFullYear()
        const inicioAno = `${anoAtual}-01-01`

        // Pega aluno_matricula + (turma_id atual via alunos) pra reconstruir
        // o ranking geral e por turma. emprestimos nao tem turma_id: a turma
        // historica e `sala_na_data` (texto), mas pra ranking comparamos com
        // a turma atual de cada aluno.
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

        if (rankingData) {
          const turmaPorMatricula = new Map<number, number | null>(
            ((alunosTurma ?? []) as { matricula: number; turma_id: number | null }[])
              .map(a => [a.matricula, a.turma_id]),
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
            .sort((a, b) => b.total - a.total)
          const turmaOrdenado = Object.entries(totaisTurma)
            .map(([m, t]) => ({ matricula: Number(m), total: t }))
            .sort((a, b) => b.total - a.total)

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
        setErro('Erro ao carregar passaporte.')
      } finally {
        setCarregando(false)
      }
    }

    function aplicarPayload(p: PayloadPassaporte | null) {
      if (!p || !p.aluno) {
        setErro('Passaporte não encontrado.')
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
        titulo: c.titulo ?? '(sem título)',
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

    carregar()
  }, [matriculaNum])

  const { selos, resumo } = useMemo(
    () => calcularPassaporte(carimbos),
    [carimbos]
  )
  const proximo = useMemo(() => proximoSelo(selos), [selos])

  async function baixarPDF() {
    if (!aluno) return
    setBaixandoPDF(true)
    try {
      const { exportarPassaportePDF } = await import('@/lib/exportarPassaportePDF')
      await exportarPassaportePDF({
        aluno: {
          nome: aluno.nome,
          matricula: aluno.matricula,
          turma: aluno.turma,
        },
        resumo,
        selos,
        carimbos,
        ranking: posicao,
      })
    } catch (err) {
      console.error('Erro ao gerar PDF:', err)
      alert('Não foi possível gerar o PDF. Tente novamente.')
    } finally {
      setBaixandoPDF(false)
    }
  }

  const distribuicaoTipo = useMemo(() => {
    const cont: Record<string, number> = {}
    for (const c of carimbos) {
      if (c.status !== 'DEVOLVIDO') continue
      const t = (c.tipo ?? 'outro').trim().toLowerCase()
      cont[t] = (cont[t] ?? 0) + 1
    }
    const total = Object.values(cont).reduce((a, b) => a + b, 0)
    return Object.entries(cont)
      .map(([nome, total]) => ({ nome, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5)
      .map(x => ({ ...x, pct: total ? Math.round((x.total / total) * 100) : 0 }))
  }, [carimbos])

  if (carregando) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ backgroundColor: 'var(--bg-page)' }}>
        <div className="text-sm" style={{ color: 'var(--text-muted)' }}>Abrindo passaporte...</div>
      </div>
    )
  }

  if (erro || !aluno) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center" style={{ backgroundColor: 'var(--bg-page)' }}>
        <p className="text-[11px] uppercase tracking-[0.3em] mb-3" style={{ color: 'var(--text-muted)' }}>
          Passaporte de Leitura
        </p>
        <h1 className="text-2xl mb-3" style={{ fontFamily: "var(--font-dm-serif), serif", color: 'var(--text-primary)' }}>
          {erro || 'Passaporte não encontrado.'}
        </h1>
        <button
          onClick={() => router.push('/passaporte')}
          className="nav-btn-primary text-sm px-4 py-2 rounded-lg mt-2"
        >
          Voltar
        </button>
      </div>
    )
  }

  const { bg, tc } = corAvatar(aluno.matricula)
  const seloConquistados = selos.filter(s => s.conquistado)
  const seloPendentes = selos.filter(s => !s.conquistado)

  return (
    <div className="min-h-screen pb-20" style={{ backgroundColor: 'var(--bg-page)' }}>
      {/* Capa do passaporte */}
      <header className="border-b" style={{ borderColor: 'var(--border)' }}>
        {/* Barra de ações */}
        <div className="max-w-4xl mx-auto px-6 pt-6 flex items-center justify-between gap-4">
          <Link
            href="/passaporte"
            className="text-[11px] uppercase tracking-[0.2em] hover:opacity-70 transition-opacity"
            style={{ color: 'var(--text-muted)' }}
          >
            ← Trocar passaporte
          </Link>
          <button
            type="button"
            onClick={baixarPDF}
            disabled={baixandoPDF}
            className="text-[11px] uppercase tracking-[0.2em] hover:opacity-70 transition-opacity disabled:opacity-50"
            style={{ color: 'var(--text-secondary)' }}
          >
            {baixandoPDF ? 'Gerando…' : '↓ Baixar PDF'}
          </button>
        </div>

        {/* Corpo da capa (documento) */}
        <div className="max-w-4xl mx-auto px-6 pt-6 pb-8">
          <div
            className="relative rounded-2xl border overflow-hidden"
            style={{
              borderColor: 'var(--border)',
              backgroundColor: 'var(--bg-card)',
              backgroundImage:
                'radial-gradient(circle at 12% 18%, color-mix(in srgb, var(--text-muted) 6%, transparent) 0, transparent 35%), radial-gradient(circle at 90% 85%, color-mix(in srgb, var(--text-muted) 5%, transparent) 0, transparent 40%)',
            }}
          >
            {/* Faixa superior tipo capa de passaporte */}
            <div
              className="flex items-center justify-between px-5 py-2.5 border-b"
              style={{
                backgroundColor: 'var(--bg-muted)',
                borderColor: 'var(--border)',
              }}
            >
              <p
                className="text-[10px] uppercase tracking-[0.3em]"
                style={{ color: 'var(--text-muted)' }}
              >
                República da Leitura
              </p>
              <p
                className="text-[10px] uppercase tracking-[0.3em]"
                style={{ color: 'var(--text-muted)' }}
              >
                Biblioteca Clarice Lispector
              </p>
            </div>

            {/* Dados do portador + foto 3x4 */}
            <div className="px-5 sm:px-8 py-6 flex gap-5 sm:gap-7 items-start">
              {/* Foto 3x4 com moldura estilo documento */}
              <div className="shrink-0">
                <div
                  className="w-[92px] h-[122px] sm:w-[108px] sm:h-[144px] rounded-sm overflow-hidden relative"
                  style={{
                    backgroundColor: 'var(--bg-muted)',
                    boxShadow:
                      '0 0 0 1px var(--border), 0 0 0 5px var(--bg-card), 0 0 0 6px var(--border)',
                  }}
                >
                  {aluno.foto_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={aluno.foto_url}
                      alt={aluno.nome}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div
                      className="w-full h-full flex items-center justify-center text-3xl sm:text-4xl font-medium"
                      style={{
                        background: bg,
                        color: tc,
                        fontFamily: "var(--font-dm-serif), serif",
                      }}
                    >
                      {iniciais(aluno.nome)}
                    </div>
                  )}
                </div>
                <p
                  className="text-[9px] font-mono text-center mt-2 uppercase tracking-[0.15em]"
                  style={{ color: 'var(--text-muted)' }}
                >
                  3 × 4
                </p>
              </div>

              <div className="flex-1 min-w-0">
                <p
                  className="text-[10px] uppercase tracking-[0.2em] mb-1"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Passaporte de Leitura
                </p>
                <h1
                  className="text-2xl sm:text-3xl leading-tight mb-3"
                  style={{
                    fontFamily: "var(--font-dm-serif), serif",
                    color: 'var(--text-primary)',
                  }}
                >
                  {aluno.nome}
                </h1>

                <dl className="grid grid-cols-2 gap-x-5 gap-y-2 text-[11px]">
                  <div>
                    <dt
                      className="uppercase tracking-[0.15em] text-[9px]"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      Matrícula
                    </dt>
                    <dd className="font-mono mt-0.5" style={{ color: 'var(--text-primary)' }}>
                      {aluno.matricula}
                    </dd>
                  </div>
                  {aluno.turma && (
                    <div>
                      <dt
                        className="uppercase tracking-[0.15em] text-[9px]"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        Turma
                      </dt>
                      <dd className="font-mono mt-0.5" style={{ color: 'var(--text-primary)' }}>
                        {aluno.turma}
                      </dd>
                    </div>
                  )}
                  <div>
                    <dt
                      className="uppercase tracking-[0.15em] text-[9px]"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      Emissão
                    </dt>
                    <dd className="font-mono mt-0.5" style={{ color: 'var(--text-primary)' }}>
                      {fmt(new Date().toISOString().slice(0, 10))}
                    </dd>
                  </div>
                  <div>
                    <dt
                      className="uppercase tracking-[0.15em] text-[9px]"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      Carimbos
                    </dt>
                    <dd className="font-mono mt-0.5" style={{ color: 'var(--text-primary)' }}>
                      {resumo.lidos}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>

            {/* Rodape tipo MRZ (Machine Readable Zone) */}
            <div
              className="px-5 sm:px-8 py-3 border-t font-mono text-[10px] sm:text-[11px] leading-snug tracking-[0.18em] break-all"
              style={{
                backgroundColor: 'var(--bg-muted)',
                borderColor: 'var(--border)',
                color: 'var(--text-secondary)',
              }}
            >
              <p>
                P&lt;BRA{mrzNome(aluno.nome)}&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;
              </p>
              <p>
                {mrzMatricula(aluno.matricula)}BRA{mrzTurma(aluno.turma)}&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 pt-8">
        {/* Stats */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {[
            { label: 'Carimbos', valor: resumo.lidos },
            { label: 'Em leitura', valor: resumo.emLeitura },
            { label: 'Gêneros', valor: resumo.generosDistintos },
            { label: 'Tipos', valor: resumo.tiposDistintos },
          ].map(s => (
            <div
              key={s.label}
              className="rounded-xl border p-4 text-center"
              style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}
            >
              <p className="text-2xl font-mono font-medium" style={{ color: 'var(--text-primary)' }}>
                {s.valor}
              </p>
              <p className="text-[11px] mt-1 uppercase tracking-[0.06em]" style={{ color: 'var(--text-muted)' }}>
                {s.label}
              </p>
            </div>
          ))}
        </section>

        {/* Próximo selo */}
        {proximo && (
          <section
            className="rounded-2xl border p-5 mb-8 flex items-center gap-4"
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}
          >
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center text-2xl"
              style={{ backgroundColor: 'var(--bg-muted)' }}
            >
              {proximo.icone}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] uppercase tracking-[0.08em]" style={{ color: 'var(--text-muted)' }}>
                Próximo selo
              </p>
              <p className="text-[15px] font-medium" style={{ color: 'var(--text-primary)' }}>
                {proximo.nome}
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                {proximo.descricao}
              </p>
              <div className="mt-2">
                <div className="h-[3px] rounded-full overflow-hidden" style={{ backgroundColor: 'var(--border)' }}>
                  <div
                    className="h-full transition-all"
                    style={{ width: `${Math.round(proximo.progresso * 100)}%`, backgroundColor: 'var(--text-primary)' }}
                  />
                </div>
                <p className="text-[10px] font-mono mt-1" style={{ color: 'var(--text-muted)' }}>
                  {proximo.atual} / {proximo.meta}
                </p>
              </div>
            </div>
          </section>
        )}

        {/* Ranking */}
        {posicao && (
          <section className="mb-10">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] mb-4" style={{ color: 'var(--text-muted)' }}>
              Ranking {new Date().getFullYear()}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div
                className="rounded-xl border p-4"
                style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}
              >
                <p className="text-[11px] uppercase tracking-[0.08em]" style={{ color: 'var(--text-muted)' }}>
                  Na turma
                </p>
                <p className="text-xl font-mono font-medium mt-1" style={{ color: 'var(--text-primary)' }}>
                  {posicao.turma ? `#${posicao.turma}` : '—'}
                  <span className="text-xs ml-1" style={{ color: 'var(--text-muted)' }}>
                    / {posicao.turmaTotal || 0}
                  </span>
                </p>
              </div>
              <div
                className="rounded-xl border p-4"
                style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}
              >
                <p className="text-[11px] uppercase tracking-[0.08em]" style={{ color: 'var(--text-muted)' }}>
                  Geral
                </p>
                <p className="text-xl font-mono font-medium mt-1" style={{ color: 'var(--text-primary)' }}>
                  {posicao.geral ? `#${posicao.geral}` : '—'}
                  <span className="text-xs ml-1" style={{ color: 'var(--text-muted)' }}>
                    / {posicao.geralTotal || 0}
                  </span>
                </p>
              </div>
              <div
                className="rounded-xl border p-4"
                style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}
              >
                <p className="text-[11px] uppercase tracking-[0.08em]" style={{ color: 'var(--text-muted)' }}>
                  Livros no ano
                </p>
                <p className="text-xl font-mono font-medium mt-1" style={{ color: 'var(--text-primary)' }}>
                  {posicao.totalAluno}
                </p>
              </div>
            </div>
          </section>
        )}

        {/* Selos conquistados */}
        <section className="mb-10">
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] mb-4" style={{ color: 'var(--text-muted)' }}>
            Selos conquistados ({seloConquistados.length})
          </p>
          {seloConquistados.length === 0 ? (
            <div
              className="rounded-xl border p-6 text-center text-sm"
              style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text-muted)' }}
            >
              Nenhum selo conquistado ainda. Devolva seu primeiro livro para começar!
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {seloConquistados.map(s => <SeloCard key={s.id} selo={s} />)}
            </div>
          )}
        </section>

        {/* Selos pendentes */}
        {seloPendentes.length > 0 && (
          <section className="mb-10">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] mb-4" style={{ color: 'var(--text-muted)' }}>
              A conquistar
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {seloPendentes.map(s => <SeloCard key={s.id} selo={s} />)}
            </div>
          </section>
        )}

        {/* Distribuição por tipo */}
        {distribuicaoTipo.length > 0 && (
          <section className="mb-10">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] mb-4" style={{ color: 'var(--text-muted)' }}>
              Leituras por tipo
            </p>
            <div
              className="rounded-xl border p-5 space-y-3"
              style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}
            >
              {distribuicaoTipo.map(d => (
                <div key={d.nome}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs capitalize" style={{ color: 'var(--text-primary)' }}>{d.nome}</span>
                    <span className="text-[11px] font-mono" style={{ color: 'var(--text-muted)' }}>
                      {d.total} · {d.pct}%
                    </span>
                  </div>
                  <div className="h-[6px] rounded-full overflow-hidden" style={{ backgroundColor: 'var(--border)' }}>
                    <div
                      className="h-full"
                      style={{ width: `${d.pct}%`, backgroundColor: 'var(--text-secondary)' }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Carimbos / linha do tempo */}
        <section className="mb-10">
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] mb-4" style={{ color: 'var(--text-muted)' }}>
            Carimbos do passaporte ({carimbos.length})
          </p>
          {carimbos.length === 0 ? (
            <div
              className="rounded-xl border p-6 text-center text-sm"
              style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text-muted)' }}
            >
              Nenhum empréstimo registrado ainda.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {carimbos.map(c => <CarimboVisual key={c.emprestimo_id} carimbo={c} />)}
            </div>
          )}
        </section>

        {resumo.primeiroCarimbo && (
          <p className="text-[11px] font-mono text-center" style={{ color: 'var(--text-muted)' }}>
            Primeiro carimbo em {fmt(resumo.primeiroCarimbo)}
            {resumo.melhorMes && (
              <> · Melhor mês: {labelMesChave(resumo.melhorMes.mes)} ({resumo.melhorMes.total})</>
            )}
          </p>
        )}
      </main>
    </div>
  )
}
