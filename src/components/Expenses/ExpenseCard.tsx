import React, { useState } from 'react';
import { Expense } from '../../types';

interface Props {
  expense: Expense;
  userName: string;
  userColor: string;
  onDelete: () => void;
}

const CATEGORY_ICONS: Record<string, string> = {
  alimentacion: '🛒', transporte: '🚗', ocio: '🎮',
  salud: '💊', hogar: '🏠', ropa: '👕', tecnologia: '💻', otros: '📦',
};

export default function ExpenseCard({ expense, userName, userColor, onDelete }: Props) {
  const [showImage, setShowImage] = useState(false);

  const date = new Date(expense.date).toLocaleDateString('es-ES', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });

  const confirmDelete = () => {
    if (window.confirm('¿Eliminar este gasto?')) onDelete();
  };

  return (
    <>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        backgroundColor: '#fff', borderRadius: 10,
        margin: '6px 16px', padding: 12,
        boxShadow: '0 2px 4px rgba(0,0,0,0.08)',
      }}>
        {/* Icono categoría */}
        <div style={{ fontSize: 28, flexShrink: 0 }}>
          {CATEGORY_ICONS[expense.category]}
        </div>

        {/* Info principal */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 14, fontWeight: 'bold', color: '#333',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {expense.description || expense.category}
          </div>
          <div style={{ fontSize: 12, color: '#999', marginTop: 2 }}>{date}</div>
          <span style={{
            display: 'inline-block', backgroundColor: userColor,
            color: '#fff', fontSize: 11, fontWeight: 'bold',
            borderRadius: 4, padding: '2px 6px', marginTop: 4,
          }}>
            {userName}
          </span>
        </div>

        {/* Importe + acciones */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 'bold', color: '#6200ee' }}>
            {expense.amount.toFixed(2)} €
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {expense.imageUri && (
              <button
                onClick={() => setShowImage(true)}
                style={{ background: 'none', border: 'none', fontSize: 18, padding: 2, cursor: 'pointer' }}
                title="Ver ticket"
              >
                🧾
              </button>
            )}
            <button
              onClick={confirmDelete}
              style={{ background: 'none', border: 'none', fontSize: 18, padding: 2, cursor: 'pointer' }}
              title="Eliminar"
            >
              🗑️
            </button>
          </div>
        </div>
      </div>

      {/* Lightbox imagen */}
      {showImage && expense.imageUri && (
        <div
          onClick={() => setShowImage(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            backgroundColor: 'rgba(0,0,0,0.88)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <img
            src={expense.imageUri}
            alt="ticket"
            style={{ maxWidth: '95%', maxHeight: '85vh', objectFit: 'contain', borderRadius: 8 }}
          />
          <button
            onClick={() => setShowImage(false)}
            style={{
              position: 'fixed', top: 16, right: 16,
              background: 'rgba(255,255,255,0.2)', border: 'none',
              color: '#fff', fontSize: 22, borderRadius: '50%',
              width: 40, height: 40, cursor: 'pointer',
            }}
          >
            ✕
          </button>
        </div>
      )}
    </>
  );
}
