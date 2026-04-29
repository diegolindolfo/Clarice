'use client'
import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { corAvatar, iniciais, fmt } from '@/lib/utils'
import {
  calcularPassaporte,
  proximoSelo,
} from '@/lib/selos'
import { SeloCard } from './_components/SeloCard'
import { CarimboVisual } from './_components/CarimboVisual'
import { labelMesChave, mrzMatricula, mrzNome, mrzTurma } from './_lib/mrz'
import { usePassaporte } from './_hooks/usePassaporte'

export const dynamic = 'force-dynamic'

export default function PassaporteAlunoPage() {
  const params = useParams<{ matricula: string }>()
  const router = useRouter()
  const matriculaNum = Number(params.matricula)

  const { aluno, carimbos, posicao, carregando, erro } = usePassaporte(matriculaNum)
  const [baixandoPDF, setBaixandoPDF] = useState(false)


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
