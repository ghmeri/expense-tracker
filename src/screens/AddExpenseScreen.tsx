import React, { useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { addExpense } from '../store/expenseSlice';
import { RootState } from '../store';
import { Category, Expense } from '../types';

const CATEGORIES: { label: string; value: Category; icon: string }[] = [
  { label: 'Alimentación', value: 'alimentacion', icon: '🛒' },
  { label: 'Transporte', value: 'transporte', icon: '🚗' },
  { label: 'Ocio', value: 'ocio', icon: '🎮' },
  { label: 'Salud', value: 'salud', icon: '💊' },
  { label: 'Hogar', value: 'hogar', icon: '🏠' },
  { label: 'Ropa', value: 'ropa', icon: '👕' },
  { label: 'Tecnología', value: 'tecnologia', icon: '💻' },
  { label: 'Otros', value: 'otros', icon: '📦' },
];

/** Redimensiona la imagen a max 800px y calidad 0.6 → base64 */
const resizeImage = (file: File): Promise<string> =>
  new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        const maxSize = 800;
        let { width, height } = img;
        if (width > maxSize || height > maxSize) {
          if (width > height) { height = Math.round((height / width) * maxSize); width = maxSize; }
          else { width = Math.round((width / height) * maxSize); height = maxSize; }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d')!.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.6));
      };
      img.src = e.target!.result as string;
    };
    reader.readAsDataURL(file);
  });

interface Props {
  onSave: () => void;
}

export default function AddExpenseScreen({ onSave }: Props) {
  const dispatch = useDispatch();
  const { users } = useSelector((state: RootState) => state.expenses);

  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<Category>('otros');
  const [userId, setUserId] = useState(users[0]?.id ?? 'user1');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    const resized = await resizeImage(file);
    setImageUri(resized);
  };

  const handleSave = () => {
    const parsed = parseFloat(amount.replace(',', '.'));
    if (!amount || isNaN(parsed) || parsed <= 0) {
      setError('Introduce un importe válido');
      return;
    }
    setError('');
    setSaving(true);

    const expense: Expense = {
      id: crypto.randomUUID(),
      amount: parsed,
      category,
      description: description.trim(),
      date: new Date().toISOString(),
      imageUri: imageUri ?? undefined,
      userId,
      createdAt: new Date().toISOString(),
    };

    dispatch(addExpense(expense));
    setAmount('');
    setDescription('');
    setImageUri(null);
    setCategory('otros');
    setSaving(false);
    onSave();
  };

  const label = (text: string) => (
    <div style={{ fontSize: 14, fontWeight: 'bold', color: '#333', marginTop: 18, marginBottom: 6 }}>
      {text}
    </div>
  );

  return (
    <div style={{ overflowY: 'auto', height: '100%', padding: '16px 16px 32px', backgroundColor: '#f5f5f5' }}>

      {label('Importe (€)')}
      <input
        type="number"
        inputMode="decimal"
        placeholder="0.00"
        value={amount}
        onChange={e => { setAmount(e.target.value); setError(''); }}
        style={{
          width: '100%', padding: 12, borderRadius: 8, fontSize: 22, fontWeight: 'bold',
          border: `1px solid ${error ? '#e53935' : '#ddd'}`,
          backgroundColor: '#fff', outline: 'none', textAlign: 'center',
        }}
      />
      {error && <div style={{ color: '#e53935', fontSize: 12, marginTop: 4 }}>{error}</div>}

      {label('Descripción')}
      <input
        type="text"
        placeholder="Ej: Compra supermercado"
        value={description}
        onChange={e => setDescription(e.target.value)}
        style={{
          width: '100%', padding: 12, borderRadius: 8, border: '1px solid #ddd',
          fontSize: 15, backgroundColor: '#fff', outline: 'none',
        }}
      />

      {label('Categoría')}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {CATEGORIES.map(cat => (
          <button
            key={cat.value}
            onClick={() => setCategory(cat.value)}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              padding: '8px 10px', borderRadius: 10, cursor: 'pointer', gap: 3,
              border: `2px solid ${category === cat.value ? '#6200ee' : '#e0e0e0'}`,
              backgroundColor: category === cat.value ? '#f0e6ff' : '#fff',
              minWidth: 68,
            }}
          >
            <span style={{ fontSize: 22 }}>{cat.icon}</span>
            <span style={{ fontSize: 11, color: category === cat.value ? '#6200ee' : '#666', fontWeight: category === cat.value ? 'bold' : 'normal' }}>
              {cat.label}
            </span>
          </button>
        ))}
      </div>

      {label('¿Quién paga?')}
      <div style={{ display: 'flex', gap: 8 }}>
        {users.map(user => (
          <button
            key={user.id}
            onClick={() => setUserId(user.id)}
            style={{
              flex: 1, padding: 14, borderRadius: 10, cursor: 'pointer', fontSize: 15,
              border: `2px solid ${userId === user.id ? user.color : '#e0e0e0'}`,
              backgroundColor: userId === user.id ? user.color : '#fff',
              color: userId === user.id ? '#fff' : '#333',
              fontWeight: 'bold', transition: 'all 0.15s',
            }}
          >
            {user.name}
          </button>
        ))}
      </div>

      {label('Ticket / Foto (opcional)')}
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={() => cameraRef.current?.click()}
          style={{
            flex: 1, padding: 12, borderRadius: 10, border: '1px solid #ddd',
            backgroundColor: '#fff', fontSize: 14, cursor: 'pointer',
          }}
        >
          📷 Cámara
        </button>
        <button
          onClick={() => galleryRef.current?.click()}
          style={{
            flex: 1, padding: 12, borderRadius: 10, border: '1px solid #ddd',
            backgroundColor: '#fff', fontSize: 14, cursor: 'pointer',
          }}
        >
          🖼️ Galería
        </button>
      </div>

      {/* Inputs ocultos para archivos */}
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={e => handleFile(e.target.files?.[0])}
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={e => handleFile(e.target.files?.[0])}
      />

      {imageUri && (
        <div style={{ marginTop: 12, position: 'relative' }}>
          <img
            src={imageUri}
            alt="ticket"
            style={{ width: '100%', borderRadius: 10, maxHeight: 220, objectFit: 'cover' }}
          />
          <button
            onClick={() => setImageUri(null)}
            style={{
              position: 'absolute', top: 6, right: 6,
              background: 'rgba(0,0,0,0.55)', border: 'none', borderRadius: '50%',
              width: 28, height: 28, color: '#fff', cursor: 'pointer', fontSize: 13,
            }}
          >
            ✕
          </button>
        </div>
      )}

      <button
        onClick={handleSave}
        disabled={saving}
        style={{
          width: '100%', marginTop: 28, padding: 16, borderRadius: 12,
          backgroundColor: saving ? '#9e7dd6' : '#6200ee',
          color: '#fff', fontWeight: 'bold', fontSize: 17,
          border: 'none', cursor: saving ? 'default' : 'pointer',
        }}
      >
        {saving ? 'Guardando...' : 'Guardar gasto'}
      </button>
    </div>
  );
}
