// Augmenta jsPDF com a propriedade `lastAutoTable` adicionada por
// jspdf-autotable em runtime, evitando o uso de `as any`.
//
// Mantemos a augmentation minima: nao redeclaramos `internal` (jsPDF ja
// tipa `getNumberOfPages` como parte de `internal` na sua propria definicao).

import 'jspdf'

declare module 'jspdf' {
  interface jsPDF {
    lastAutoTable: {
      finalY: number
      pageNumber: number
    }
  }
}
