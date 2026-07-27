import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Expense, User } from '../types';

const CATEGORY_LABELS: Record<string, string> = {
  alimentacion: 'Alimentacion', transporte: 'Transporte', ocio: 'Ocio',
  salud: 'Salud', hogar: 'Hogar', ropa: 'Ropa', tecnologia: 'Tecnologia', otros: 'Otros',
};

const BLUE: [number, number, number]  = [37, 99, 235];
const DARK: [number, number, number]  = [30, 41, 59];
const LIGHT: [number, number, number] = [248, 250, 252];
const GRAY: [number, number, number]  = [100, 116, 139];
const RED: [number, number, number]   = [220, 38, 38];

export const exportToPDF = (expenses: Expense[], users: User[]): void => {
  const getUserName = (userId: string) =>
    users.find(u => u.id === userId)?.name ?? 'Desconocido';
  const total = expenses.reduce((sum, e) => sum + e.amount, 0);
  const sorted = [...expenses].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const dateFrom = sorted[0]  ? new Date(sorted[0].date).toLocaleDateString('es-ES')  : '-';
  const dateTo   = sorted.at(-1) ? new Date(sorted.at(-1)!.date).toLocaleDateString('es-ES') : '-';

  const doc = new jsPDF();
  const W = doc.internal.pageSize.getWidth();

  // ── Header band ──────────────────────────────────────────────
  doc.setFillColor(...BLUE);
  doc.rect(0, 0, W, 38, 'F');

  doc.setFontSize(22);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text('Resumen de Gastos', 14, 18);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(200, 215, 255);
  doc.text(`Periodo: ${dateFrom} — ${dateTo}   ·   ${expenses.length} gasto${expenses.length !== 1 ? 's' : ''}   ·   Generado ${new Date().toLocaleDateString('es-ES')}`, 14, 28);

  // ── Total box ────────────────────────────────────────────────
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(W - 70, 6, 58, 26, 4, 4, 'F');
  doc.setFontSize(9);
  doc.setTextColor(...GRAY);
  doc.text('TOTAL', W - 41, 16, { align: 'center' });
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BLUE);
  doc.text(`${total.toFixed(2)} €`, W - 41, 27, { align: 'center' });

  // ── Per-person summary ───────────────────────────────────────
  const perPerson: Record<string, number> = {};
  expenses.forEach(e => { perPerson[e.userId] = (perPerson[e.userId] ?? 0) + e.amount; });

  let boxX = 14;
  const boxY = 44;
  users.forEach(u => {
    const amt = perPerson[u.id] ?? 0;
    if (amt === 0) return;
    doc.setFillColor(...LIGHT);
    doc.roundedRect(boxX, boxY, 52, 20, 3, 3, 'F');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...GRAY);
    doc.text(u.name.toUpperCase(), boxX + 26, boxY + 7, { align: 'center' });
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...DARK);
    doc.text(`${amt.toFixed(2)} €`, boxX + 26, boxY + 16, { align: 'center' });
    boxX += 56;
  });

  // ── Expenses table ───────────────────────────────────────────
  autoTable(doc, {
    startY: 72,
    head: [['Fecha', 'Categoria', 'Descripcion', 'Persona', 'Importe']],
    body: expenses.map(e => [
      new Date(e.date).toLocaleDateString('es-ES'),
      CATEGORY_LABELS[e.category] ?? e.category,
      e.description || '-',
      getUserName(e.userId),
      `${e.amount.toFixed(2)} €`,
    ]),
    styles: { fontSize: 9, cellPadding: 4, textColor: DARK },
    headStyles: { fillColor: DARK, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
    alternateRowStyles: { fillColor: LIGHT },
    columnStyles: {
      0: { cellWidth: 22 },
      1: { cellWidth: 28 },
      2: { cellWidth: 'auto' },
      3: { cellWidth: 28 },
      4: { halign: 'right', fontStyle: 'bold', cellWidth: 24, textColor: BLUE },
    },
  });

  // ── Category breakdown ───────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const afterTable = (doc as any).lastAutoTable.finalY + 10;
  const catTotals: Record<string, number> = {};
  expenses.forEach(e => { catTotals[e.category] = (catTotals[e.category] ?? 0) + e.amount; });
  const catRows = Object.entries(catTotals)
    .sort((a, b) => b[1] - a[1])
    .map(([cat, amt]) => [CATEGORY_LABELS[cat] ?? cat, `${amt.toFixed(2)} €`, `${((amt / total) * 100).toFixed(0)}%`]);

  if (catRows.length > 0) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...DARK);
    doc.text('Desglose por categoria', 14, afterTable);

    autoTable(doc, {
      startY: afterTable + 4,
      head: [['Categoria', 'Total', '% del gasto']],
      body: catRows,
      styles: { fontSize: 8, cellPadding: 3, textColor: DARK },
      headStyles: { fillColor: BLUE, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
      alternateRowStyles: { fillColor: LIGHT },
      tableWidth: 100,
      columnStyles: {
        1: { halign: 'right', textColor: BLUE, fontStyle: 'bold' },
        2: { halign: 'right', textColor: GRAY },
      },
    });
  }

  // ── Footer ───────────────────────────────────────────────────
  const pageH = doc.internal.pageSize.getHeight();
  doc.setDrawColor(...BLUE);
  doc.setLineWidth(0.5);
  doc.line(14, pageH - 12, W - 14, pageH - 12);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...GRAY);
  doc.text('Generado con Expense Tracker', 14, pageH - 6);
  doc.text(`Total: ${total.toFixed(2)} €`, W - 14, pageH - 6, { align: 'right' });

  doc.save(`gastos_${new Date().toISOString().slice(0, 10)}.pdf`);
};

export const exportToCSV = (expenses: Expense[], users: User[]): void => {
  const getUserName = (userId: string) =>
    users.find(u => u.id === userId)?.name ?? 'Desconocido';

  const header = 'Fecha,Categoría,Descripción,Persona,Importe\n';
  const rows = expenses
    .map(e =>
      [
        new Date(e.date).toLocaleDateString('es-ES'),
        e.category,
        `"${(e.description || '').replace(/"/g, '""')}"`,
        getUserName(e.userId),
        e.amount.toFixed(2),
      ].join(',')
    )
    .join('\n');

  const blob = new Blob(['\uFEFF' + header + rows], {
    type: 'text/csv;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `gastos_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
};
