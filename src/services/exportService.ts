import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Expense, User } from '../types';

const CATEGORY_ICONS: Record<string, string> = {
  alimentacion: '🛒', transporte: '🚗', ocio: '🎮',
  salud: '💊', hogar: '🏠', ropa: '👕', tecnologia: '💻', otros: '📦',
};

export const exportToPDF = (expenses: Expense[], users: User[]): void => {
  const getUserName = (userId: string) =>
    users.find(u => u.id === userId)?.name ?? 'Desconocido';
  const total = expenses.reduce((sum, e) => sum + e.amount, 0);

  const doc = new jsPDF();

  doc.setFontSize(20);
  doc.setTextColor(37, 99, 235);
  doc.text('Resumen de Gastos', 105, 20, { align: 'center' });

  doc.setFontSize(11);
  doc.setTextColor(150, 150, 150);
  doc.text(
    `Generado el ${new Date().toLocaleDateString('es-ES')}`,
    105, 28, { align: 'center' }
  );

  autoTable(doc, {
    startY: 35,
    head: [['Fecha', 'Categoría', 'Descripción', 'Persona', 'Importe']],
    body: expenses.map(e => [
      new Date(e.date).toLocaleDateString('es-ES'),
      `${CATEGORY_ICONS[e.category]} ${e.category}`,
      e.description || '-',
      getUserName(e.userId),
      `${e.amount.toFixed(2)} €`,
    ]),
    styles: { fontSize: 9 },
    headStyles: { fillColor: [37, 99, 235] },
    columnStyles: { 4: { halign: 'right', fontStyle: 'bold' } },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const finalY = (doc as any).lastAutoTable.finalY + 10;
  doc.setFontSize(13);
  doc.setTextColor(37, 99, 235);
  doc.text(`Total: ${total.toFixed(2)} €`, 195, finalY, { align: 'right' });

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
