import type { Carimbo, Selo, ResumoPassaporte } from './selos'

export type PassaporteParaPDF = {
  aluno: {
    nome: string
    matricula: number
    turma: string
  }
  resumo: ResumoPassaporte
  selos: Selo[]
  carimbos: Carimbo[]
  ranking: {
    turma: number | null
    turmaTotal: number
    geral: number | null
    geralTotal: number
    totalAluno: number
  } | null
}

function fmt(d: string | null | undefined): string {
  if (!d) return ''
  const [data] = d.split('T')
  const [y, m, day] = data.split('-').map(Number)
  return new Date(y, m - 1, day).toLocaleDateString('pt-BR')
}

export async function exportarPassaportePDF(p: PassaporteParaPDF) {
  const jsPDF = (await import('jspdf')).default
  const autoTable = (await import('jspdf-autotable')).default

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const W = 210
  const H = 297

  const hoje = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
  const hojeCurto = new Date().toLocaleDateString('pt-BR')

  // Capa (estilo passaporte fisico)
  doc.setFillColor(12, 68, 124)
  doc.rect(0, 0, W, 55, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9)
  doc.text('REPÚBLICA DA LEITURA', 14, 10)
  doc.text('BIBLIOTECA CLARICE LISPECTOR', W - 14, 10, { align: 'right' })

  // Moldura da foto 3x4 (placeholder — jsPDF nao carrega foto url do aluno facil)
  const fotoX = 14, fotoY = 16, fotoW = 26, fotoH = 34
  doc.setDrawColor(255, 255, 255); doc.setLineWidth(0.6)
  doc.setFillColor(255, 255, 255)
  doc.rect(fotoX - 1, fotoY - 1, fotoW + 2, fotoH + 2, 'FD')
  doc.setFillColor(200, 215, 230)
  doc.rect(fotoX, fotoY, fotoW, fotoH, 'F')
  doc.setTextColor(80, 100, 130); doc.setFont('helvetica', 'bold'); doc.setFontSize(22)
  const iniciais = (p.aluno.nome.trim().split(/\s+/).slice(0, 2).map(s => s[0] ?? '').join('') || '—').toUpperCase()
  doc.text(iniciais, fotoX + fotoW / 2, fotoY + fotoH / 2 + 2, { align: 'center' })
  doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'normal'); doc.setFontSize(7)
  doc.text('3 × 4', fotoX + fotoW / 2, fotoY + fotoH + 4, { align: 'center' })

  // Dados do aluno ao lado da foto
  const dadosX = fotoX + fotoW + 8
  doc.setFont('helvetica', 'bold'); doc.setFontSize(18); doc.setTextColor(255, 255, 255)
  doc.text('Passaporte de Leitura', dadosX, 23)
  doc.setFont('helvetica', 'bold'); doc.setFontSize(13)
  doc.text(p.aluno.nome, dadosX, 32)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9)
  doc.text(`Matrícula  ${p.aluno.matricula}`, dadosX, 39)
  doc.text(`Turma  ${p.aluno.turma || '—'}`, dadosX, 44)
  doc.text(`Emissão  ${hojeCurto}`, dadosX, 49)
  // (linha com `hoje` completa pra rodape)
  doc.setFontSize(7); doc.setTextColor(220, 230, 245)
  doc.text(`Este documento foi emitido em ${hoje}.`, W - 14, 49, { align: 'right' })

  // Resumo
  doc.setTextColor(40, 40, 40)
  let y = 66
  doc.setFont('helvetica', 'bold'); doc.setFontSize(12)
  doc.text('Resumo', 14, y)
  y += 6

  const stats: Array<[string, string | number]> = [
    ['Carimbos (livros devolvidos)', p.resumo.lidos],
    ['Em leitura agora', p.resumo.emLeitura],
    ['Gêneros distintos', p.resumo.generosDistintos],
    ['Tipos distintos', p.resumo.tiposDistintos],
    ['Meses consecutivos lendo', p.resumo.mesesConsecutivos],
  ]

  doc.setFont('helvetica', 'normal'); doc.setFontSize(10)
  for (const [rotulo, valor] of stats) {
    doc.setTextColor(90, 90, 90); doc.text(rotulo, 14, y)
    doc.setTextColor(20, 20, 20); doc.setFont('helvetica', 'bold')
    doc.text(String(valor), W - 14, y, { align: 'right' })
    doc.setFont('helvetica', 'normal')
    y += 6
  }

  // Ranking
  if (p.ranking) {
    y += 4
    doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(40, 40, 40)
    doc.text('Ranking do ano', 14, y)
    y += 6
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10)
    const linhasRk: Array<[string, string]> = [
      ['Posição na turma', p.ranking.turma ? `${p.ranking.turma}º de ${p.ranking.turmaTotal}` : '—'],
      ['Posição geral', p.ranking.geral ? `${p.ranking.geral}º de ${p.ranking.geralTotal}` : '—'],
      ['Livros no ano', String(p.ranking.totalAluno)],
    ]
    for (const [rotulo, valor] of linhasRk) {
      doc.setTextColor(90, 90, 90); doc.text(rotulo, 14, y)
      doc.setTextColor(20, 20, 20); doc.setFont('helvetica', 'bold')
      doc.text(valor, W - 14, y, { align: 'right' })
      doc.setFont('helvetica', 'normal')
      y += 6
    }
  }

  // Selos conquistados
  const conquistados = p.selos.filter(s => s.conquistado)
  y += 4
  doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(40, 40, 40)
  doc.text(`Selos conquistados (${conquistados.length}/${p.selos.length})`, 14, y)
  y += 2

  if (conquistados.length > 0) {
    autoTable(doc, {
      startY: y + 2,
      head: [['Selo', 'Descrição', 'Data']],
      body: conquistados.map(s => [
        `${s.icone}  ${s.nome}`,
        s.descricao,
        fmt(s.dataConquista),
      ]),
      headStyles: { fillColor: [12, 68, 124], textColor: 255, fontStyle: 'bold', fontSize: 9 },
      bodyStyles: { fontSize: 9, textColor: [40, 40, 40] },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      columnStyles: { 0: { cellWidth: 55 }, 1: { cellWidth: 95 }, 2: { cellWidth: 32, halign: 'center' } },
      margin: { left: 14, right: 14 },
    })
  } else {
    y += 8
    doc.setFont('helvetica', 'italic'); doc.setFontSize(10); doc.setTextColor(120, 120, 120)
    doc.text('Nenhum selo conquistado ainda.', 14, y)
  }

  // Carimbos do passaporte
  const ultimaY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y
  let yCarimbos = ultimaY + 10

  if (yCarimbos > H - 40) {
    doc.addPage(); yCarimbos = 20
  }

  doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(40, 40, 40)
  doc.text(`Carimbos do passaporte (${p.carimbos.length})`, 14, yCarimbos)

  if (p.carimbos.length > 0) {
    autoTable(doc, {
      startY: yCarimbos + 3,
      head: [['Data', 'Título', 'Autor', 'Gênero', 'Status']],
      body: p.carimbos.map(c => [
        fmt(c.data_devolucao_real ?? c.data_saida),
        c.titulo ?? '(sem título)',
        c.autor ?? '—',
        c.genero ?? '—',
        c.em_atraso ? 'Em atraso' : c.status === 'DEVOLVIDO' ? 'Devolvido' : 'Em leitura',
      ]),
      headStyles: { fillColor: [12, 68, 124], textColor: 255, fontStyle: 'bold', fontSize: 9 },
      bodyStyles: { fontSize: 8, textColor: [40, 40, 40] },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      columnStyles: {
        0: { cellWidth: 24, halign: 'center' },
        1: { cellWidth: 72 },
        2: { cellWidth: 42 },
        3: { cellWidth: 28 },
        4: { cellWidth: 20, halign: 'center' },
      },
      margin: { left: 14, right: 14 },
    })
  } else {
    doc.setFont('helvetica', 'italic'); doc.setFontSize(10); doc.setTextColor(120, 120, 120)
    doc.text('Nenhum carimbo ainda.', 14, yCarimbos + 8)
  }

  // Rodape
  const totalPaginas = (doc as unknown as { internal: { getNumberOfPages: () => number } }).internal.getNumberOfPages()
  for (let i = 1; i <= totalPaginas; i++) {
    doc.setPage(i); doc.setFontSize(7); doc.setTextColor(150)
    doc.text(`Clarice · Passaporte de Leitura · Página ${i} de ${totalPaginas}`, W / 2, H - 8, { align: 'center' })
  }

  const slug = (p.aluno.nome || 'passaporte')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
  doc.save(`passaporte_${slug}_${p.aluno.matricula}.pdf`)
}
