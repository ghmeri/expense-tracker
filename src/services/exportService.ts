import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { Expense, User } from '../types';

const CATEGORY_ICONS: Record<string, string> = {
  alimentacion: '🛒', transporte: '🚗', ocio: '🎮',
  salud: '💊', hogar: '🏠', ropa: '👕', tecnologia: '💻', otros: '📦',
};

export const exportToPDF = async (expenses: Expense[], users: User[]): Promise<void> => {
  const getUserName = (userId: string) => users.find(u => u.id === userId)?.name ?? 'Desconocido';
  const total = expenses.reduce((sum, e) => sum + e.amount, 0);

  const rows = expenses.map(e => `
    <tr>
      <td>${new Date(e.date).toLocaleDateString('es-ES')}</td>
      <td>${CATEGORY_ICONS[e.category]} ${e.category}</td>
      <td>${e.description || '-'}</td>
      <td>${getUserName(e.userId)}</td>
      <td style="text-align:right;font-weight:bold;color:#6200ee">${e.amount.toFixed(2)} €</td>
    </tr>
  `).join('');

  const html = `
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
          h1 { color: #6200ee; text-align: center; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th { background: #6200ee; color: white; padding: 10px; text-align: left; }
          td { padding: 8px 10px; border-bottom: 1px solid #eee; }
          tr:nth-child(even) { background: #f9f9f9; }
          .total { text-align: right; font-size: 18px; font-weight: bold; color: #6200ee; margin-top: 20px; }
        </style>
      </head>
      <body>
        <h1>💰 Resumen de Gastos</h1>
        <p style="text-align:center;color:#999">Generado el ${new Date().toLocaleDateString('es-ES')}</p>
        <table>
          <thead>
            <tr><th>Fecha</th><th>Categoría</th><th>Descripción</th><th>Persona</th><th>Importe</th></tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <div class="total">Total: ${total.toFixed(2)} €</div>
      </body>
    </html>
  `;

  const { uri } = await Print.printToFileAsync({ html });
  await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Exportar PDF' });
};

export const exportToCSV = async (expenses: Expense[], users: User[]): Promise<void> => {
  const getUserName = (userId: string) => users.find(u => u.id === userId)?.name ?? 'Desconocido';
  const header = 'Fecha,Categoría,Descripción,Persona,Importe\n';
  const rows = expenses.map(e =>
    `${new Date(e.date).toLocaleDateString('es-ES')},${e.category},"${e.description || ''}",${getUserName(e.userId)},${e.amount.toFixed(2)}`
  ).join('\n');

  const fileUri = FileSystem.documentDirectory + 'gastos.csv';
  await FileSystem.writeAsStringAsync(fileUri, header + rows, {
    encoding: FileSystem.EncodingType.UTF8,
  });
  await Sharing.shareAsync(fileUri, { mimeType: 'text/csv', dialogTitle: 'Exportar CSV' });
};
