import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../store';
import { fetchRecipes, persistRecipes } from '../store/recipeSlice';
import { DietTag, Recipe } from '../types';

const BLUE = '#2563eb';
const STARS = [1, 2, 3, 4, 5];

const DIET_OPTIONS: { id: DietTag; label: string; icon: string }[] = [
  { id: 'vegetariano', label: 'Vegetariana', icon: '🥦' },
  { id: 'con_carne', label: 'Con carne', icon: '🍖' },
];

const capitalizeFirst = (s: string): string => s.length === 0 ? s : s.charAt(0).toUpperCase() + s.slice(1);

function Stars({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {STARS.map(n => (
        <button
          key={n}
          onClick={() => onChange(n === value ? 0 : n)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, padding: 0, color: n <= value ? '#f59e0b' : '#e2e8f0' }}
        >
          ★
        </button>
      ))}
    </div>
  );
}

export default function RecipesScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const { recipes, loading } = useSelector((state: RootState) => state.recipes);

  const [dietFilter, setDietFilter] = useState<DietTag | null>(null);
  const [newName, setNewName] = useState('');
  const [newDiet, setNewDiet] = useState<DietTag>('vegetariano');
  const [notesDraft, setNotesDraft] = useState<Record<string, string>>({});

  useEffect(() => { dispatch(fetchRecipes()); }, []);

  const save = (updated: Recipe[]) => dispatch(persistRecipes(updated));

  const addRecipe = () => {
    const name = capitalizeFirst(newName.trim());
    if (!name) return;
    const recipe: Recipe = { id: crypto.randomUUID(), name, dietTag: newDiet, rating: 0, notes: '' };
    save([recipe, ...recipes]);
    setNewName('');
  };

  const updateRecipe = (id: string, patch: Partial<Recipe>) => {
    save(recipes.map(r => r.id === id ? { ...r, ...patch } : r));
  };

  const removeRecipe = (id: string) => {
    save(recipes.filter(r => r.id !== id));
    setNotesDraft(prev => { const next = { ...prev }; delete next[id]; return next; });
  };

  const commitNotes = (id: string) => {
    if (!(id in notesDraft)) return;
    updateRecipe(id, { notes: notesDraft[id] });
    setNotesDraft(prev => { const next = { ...prev }; delete next[id]; return next; });
  };

  const filtered = dietFilter ? recipes.filter(r => r.dietTag === dietFilter) : recipes;

  return (
    <div style={{ overflowY: 'auto', height: '100%', padding: '20px 20px 40px', backgroundColor: '#f0f4f8' }}>
      <div style={{ fontSize: 20, fontWeight: 800, color: '#1e293b', marginBottom: 4 }}>📖 Recetario</div>
      <div style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>
        Guardad las recetas que os han gustado, con su tipo y puntuación.
      </div>

      {/* Añadir receta */}
      <div style={{
        backgroundColor: '#fff', borderRadius: 16, padding: '16px 18px',
        boxShadow: '0 1px 8px rgba(0,0,0,0.06)', marginBottom: 16,
      }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          <input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') addRecipe(); }}
            placeholder="Nombre de la receta…"
            style={{
              flex: 1, border: '2px solid #e2e8f0', borderRadius: 10, padding: '10px 12px',
              fontSize: 14, outline: 'none',
            }}
          />
          <button onClick={addRecipe} style={{
            padding: '10px 16px', borderRadius: 10, border: 'none', backgroundColor: BLUE,
            color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer',
          }}>
            + Añadir
          </button>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {DIET_OPTIONS.map(opt => (
            <button
              key={opt.id}
              onClick={() => setNewDiet(opt.id)}
              style={{
                flex: 1, padding: '8px 10px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                border: `1.5px solid ${newDiet === opt.id ? BLUE : '#e2e8f0'}`,
                backgroundColor: newDiet === opt.id ? '#eff6ff' : '#fff',
                color: newDiet === opt.id ? BLUE : '#64748b',
              }}
            >
              {opt.icon} {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Filtro */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {([null, ...DIET_OPTIONS.map(o => o.id)] as const).map(tag => (
          <button
            key={String(tag)}
            onClick={() => setDietFilter(tag)}
            style={{
              padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
              border: `1.5px solid ${dietFilter === tag ? BLUE : '#e2e8f0'}`,
              backgroundColor: dietFilter === tag ? '#eff6ff' : '#fff',
              color: dietFilter === tag ? BLUE : '#64748b',
            }}
          >
            {tag === null ? 'Todas' : tag === 'vegetariano' ? '🥦 Vegetarianas' : '🍖 Con carne'}
          </button>
        ))}
      </div>

      {loading && (
        <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: 13, marginBottom: 12 }}>Cargando…</div>
      )}

      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', marginTop: 40, color: '#94a3b8', fontSize: 14 }}>
          Aún no hay recetas guardadas.
        </div>
      ) : (
        filtered.map(recipe => (
          <div key={recipe.id} style={{
            backgroundColor: '#fff', borderRadius: 14, padding: '14px 16px', marginBottom: 10,
            boxShadow: '0 1px 8px rgba(0,0,0,0.06)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, gap: 8 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#1e293b' }}>{recipe.name}</div>
              <button onClick={() => removeRecipe(recipe.id)} style={{
                width: 24, height: 24, borderRadius: '50%', border: 'none', backgroundColor: '#f1f5f9',
                color: '#94a3b8', fontSize: 13, cursor: 'pointer', flexShrink: 0,
              }}>
                ×
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: 6 }}>
                {DIET_OPTIONS.map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => updateRecipe(recipe.id, { dietTag: opt.id })}
                    style={{
                      padding: '4px 9px', borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                      border: `1.5px solid ${recipe.dietTag === opt.id ? BLUE : '#e2e8f0'}`,
                      backgroundColor: recipe.dietTag === opt.id ? '#eff6ff' : '#fff',
                      color: recipe.dietTag === opt.id ? BLUE : '#94a3b8',
                    }}
                  >
                    {opt.icon}
                  </button>
                ))}
              </div>
              <Stars value={recipe.rating} onChange={v => updateRecipe(recipe.id, { rating: v })} />
            </div>

            <textarea
              value={recipe.id in notesDraft ? notesDraft[recipe.id] : recipe.notes}
              placeholder="Notas (opcional)…"
              onChange={e => setNotesDraft(prev => ({ ...prev, [recipe.id]: e.target.value }))}
              onBlur={() => commitNotes(recipe.id)}
              rows={1}
              style={{
                width: '100%', border: 'none', borderTop: '1px solid #f1f5f9', outline: 'none',
                fontSize: 13, color: '#64748b', paddingTop: 8, resize: 'vertical', fontFamily: 'inherit',
              }}
            />
          </div>
        ))
      )}
    </div>
  );
}
