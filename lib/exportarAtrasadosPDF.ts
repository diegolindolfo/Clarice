export type AtrasadoPDF = {
  aluno_nome: string
  matricula: number
  turma: string
  titulo: string
  autor: string
  data_saida: string
  prazo_final: string
  dias_atraso: number
  status: string
}

export async function exportarAtrasadosPDF(atrasados: AtrasadoPDF[]) {
  const jsPDF     = (await import('jspdf')).default
  const autoTable = (await import('jspdf-autotable')).default

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })

  const hoje = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
  const hora = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

  doc.setFillColor(12, 68, 124)
  doc.rect(0, 0, 297, 22, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(14); doc.setFont('helvetica', 'bold')
  doc.text('Clarice', 14, 9)
  doc.setFontSize(10); doc.setFont('helvetica', 'normal')
  doc.text('Biblioteca Escolar', 14, 15)
  doc.setFontSize(11); doc.setFont('helvetica', 'bold')
  doc.text('Lista de Empréstimos em Atraso', 297 / 2, 9, { align: 'center' })
  doc.setFontSize(9); doc.setFont('helvetica', 'normal')
  doc.text(`Gerado em ${hoje} às ${hora}`, 297 / 2, 15, { align: 'center' })
  doc.text(`${atrasados.length} registro${atrasados.length !== 1 ? 's' : ''}`, 283, 9, { align: 'right' })

  const porTurma: Record<string, number> = {}
  atrasados.forEach(a => { porTurma[a.turma] = (porTurma[a.turma] ?? 0) + 1 })
  const resumoTexto = Object.entries(porTurma).sort((a, b) => b[1] - a[1]).map(([t, n]) => `${t}: ${n}`).join('   ·   ')
  doc.setTextColor(60, 60, 60); doc.setFontSize(8); doc.setFont('helvetica', 'bold')
  doc.text('Resumo por turma:', 14, 30)
  doc.setFont('helvetica', 'normal'); doc.text(resumoTexto, 14, 36)

  const fmt = (d: string) => {
    const [y, m, day] = d.split('T')[0].split('-').map(Number)
    return new Date(y, m - 1, day).toLocaleDateString('pt-BR')
  }

  const ordenados = [...atrasados].sort((a, b) => b.dias_atraso - a.dias_atraso)

  autoTable(doc, {
    startY: 42,
    head: [['Aluno', 'Matrícula', 'Turma', 'Livro', 'Saída', 'Prazo', 'Dias em atraso']],
    body: ordenados.map(a => [a.aluno_nome, String(a.matricula), a.turma, `${a.titulo}\n${a.autor ?? ''}`, fmt(a.data_saida), fmt(a.prazo_final), `${a.dias_atraso} dia${a.dias_atraso !== 1 ? 's' : ''}`]),
    headStyles: { fillColor: [12, 68, 124], textColor: 255, fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { fontSize: 8, textColor: [40, 40, 40] },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    columnStyles: { 0: { cellWidth: 52 }, 1: { cellWidth: 24, halign: 'center' }, 2: { cellWidth: 18, halign: 'center' }, 3: { cellWidth: 72 }, 4: { cellWidth: 22, halign: 'center' }, 5: { cellWidth: 22, halign: 'center' }, 6: { cellWidth: 28, halign: 'center', fontStyle: 'bold' } },
    didParseCell(data) {
      if (data.column.index === 6 && data.section === 'body') {
        const dias = ordenados[data.row.index]?.dias_atraso ?? 0
        if (dias >= 15) { data.cell.styles.textColor = [163, 45, 45]; data.cell.styles.fillColor = [252, 235, 235] }
        else if (dias >= 7) { data.cell.styles.textColor = [133, 79, 11]; data.cell.styles.fillColor = [250, 238, 218] }
      }
    },
    margin: { left: 14, right: 14 },
  })

  const totalPaginas = (doc as any).internal.getNumberOfPages()
  for (let i = 1; i <= totalPaginas; i++) {
    doc.setPage(i); doc.setFontSize(7); doc.setTextColor(150)
    doc.text(`Clarice — Biblioteca Escolar  ·  Página ${i} de ${totalPaginas}`, 297 / 2, 205, { align: 'center' })
  }

  doc.save(`atrasados_${new Date().toISOString().split('T')[0]}.pdf`)
}
