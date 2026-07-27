import React, { useState } from 'react';
import { Expense } from '../../types';

// Componente para mostrar tarjetas individuales de gastos
interface Props {
  expense: Expense;
  userName: string;
  userColor: string;
  onDelete: () => void;
}

const BLUE = '#2563eb';

const CATEGORY_ICONS: Record<string, string> = {
  alimentacion: '🛒', transporte: '🚗', ocio: '🎮',
  salud: '💊', hogar: '🏠', ropa: '👕', tecnologia: '💻', otros: '📦',
};

export default function ExpenseCard({ expense, userName, userColor, onDelete }: Props) {
  const [showImage,   setShowImage]   = useState(false);
  const [showItems,   setShowItems]   = useState(false);

  const date = new Date(expense.date).toLocaleDateString('es-ES', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });

  const confirmDelete = () => {
    if (window.confirm('¿Eliminar este gasto?')) onDelete();
  };

  const hasItems = expense.lineItems && expense.lineItems.length > 0;

  return (
    <>
      <div style={{
        backgroundColor: '#fff', borderRadius: 14,
        margin: '8px 16px', overflow: 'hidden',
        boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
        border: '1px solid #f1f5f9',
        transition: 'box-shadow 0.2s',
      }}>
        {/* Fila principal */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px' }}>
          {/* Icono */}
          <div style={{
            width: 48, height: 48, borderRadius: 12, flexShrink: 0,
            backgroundColor: '#f0f9ff', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 24,
          }}>
            {CATEGORY_ICONS[expense.category]}
          </div>

          {/* Info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {expense.description || expense.category}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, color: '#94a3b8' }}>{date}</span>
              <span style={{ backgroundColor: userColor, color: '#fff', fontSize: 11, fontWeight: 700, borderRadius: 6, padding: '2px 7px' }}>
                {userName}
              </span>
              {hasItems && (
                <span style={{ backgroundColor: '#f0f9ff', color: BLUE, fontSize: 11, fontWeight: 600, borderRadius: 6, padding: '2px 7px', cursor: 'pointer' }}
                  onClick={() => setShowItems(s => !s)}>
                  {expense.lineItems!.length} productos {showItems ? '▲' : '▼'}
                </span>
              )}
            </div>
          </div>

          {/* Importe + acciones */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: BLUE }}>
              {expense.amount.toFixed(2)} €
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              {expense.imageUri && (
                <button onClick={() => setShowImage(true)} title="Ver ticket"
                  style={{ background: 'none', border: 'none', fontSize: 18, padding: '2px 4px', cursor: 'pointer', borderRadius: 6, color: '#64748b' }}>
                  🧾
                </button>
              )}
              <button onClick={confirmDelete} title="Eliminar"
                style={{ background: 'none', border: 'none', fontSize: 18, padding: '2px 4px', cursor: 'pointer', borderRadius: 6, color: '#94a3b8' }}>
                🗑️
              </button>
            </div>
          </div>
        </div>

        {/* Lista de productos (expandible) */}
        {hasItems && showItems && (
          <div style={{ borderTop: '1px solid #f1f5f9', padding: '12px 16px 14px', backgroundColor: '#fafcff' }} className="fade-in">
            {expense.lineItems!.map((item, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: i < expense.lineItems!.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                <span style={{ fontSize: 13, color: '#475569', flex: 1 }}>{item.name}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: BLUE, marginLeft: 16 }}>{item.totalPrice.toFixed(2)} €</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8, paddingTop: 8, borderTop: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: '#1e293b' }}>
                Total: {expense.lineItems!.reduce((s, i) => s + i.totalPrice, 0).toFixed(2)} €
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Lightbox imagen */}
      {showImage && expense.imageUri && (
        <div onClick={() => setShowImage(false)} style={{ position: 'fixed', inset: 0, zIndex: 1000, backgroundColor: 'rgba(0,0,0,0.88)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <img src={expense.imageUri} alt="ticket" style={{ maxWidth: '92%', maxHeight: '88vh', objectFit: 'contain', borderRadius: 10 }} />
          <button onClick={() => setShowImage(false)} style={{ position: 'fixed', top: 16, right: 16, background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', fontSize: 22, borderRadius: '50%', width: 42, height: 42, cursor: 'pointer' }}>✕</button>
        </div>
      )}
    </>
  );
}
