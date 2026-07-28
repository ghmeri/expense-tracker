import React, { useRef, useEffect, useState } from 'react';
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

/** Redimensiona la foto a un tamaño pequeño antes de guardarla (son solo de referencia). */
const resizePhoto = (file: File): Promise<string> =>
  new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        const maxSize = 600;
        let { width, height } = img;
        if (width > maxSize || height > maxSize) {
          if (width > height) { height = Math.round((height / width) * maxSize); width = maxSize; }
          else { width = Math.round((width / height) * maxSize); height = maxSize; }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        canvas.getContext('2d')!.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.5));
      };
      img.src = e.target!.result as string;
    };
    reader.readAsDataURL(file);
  });

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
  const [timeDraft, setTimeDraft] = useState<Record<string, string>>({});
  const [ingredientDraft, setIngredientDraft] = useState<Record<string, string>>({});
  const [lightbox, setLightbox] = useState<string | null>(null);
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => { dispatch(fetchRecipes()); }, []);

  const save = (updated: Recipe[]) => dispatch(persistRecipes(updated));

  const addRecipe = () => {
    const name = capitalizeFirst(newName.trim());
    if (!name) return;
    const recipe: Recipe = {
      id: crypto.randomUUID(), name, dietTag: newDiet, rating: 0,
      notes: '', ingredients: [], time: '',
    };
    save([recipe, ...recipes]);
    setNewName('');
  };

  const updateRecipe = (id: string, patch: Partial<Recipe>) => {
    save(recipes.map(r => r.id === id ? { ...r, ...patch } : r));
  };

  const removeRecipe = (id: string) => {
    save(recipes.filter(r => r.id !== id));
    setNotesDraft(prev => { const next = { ...prev }; delete next[id]; return next; });
    setTimeDraft(prev => { const next = { ...prev }; delete next[id]; return next; });
    setIngredientDraft(prev => { const next = { ...prev }; delete next[id]; return next; });
  };

  const commitNotes = (id: string) => {
    if (!(id in notesDraft)) return;
    updateRecipe(id, { notes: notesDraft[id] });
    setNotesDraft(prev => { const next = { ...prev }; delete next[id]; return next; });
  };

  const commitTime = (id: string) => {
    if (!(id in timeDraft)) return;
    updateRecipe(id, { time: timeDraft[id] });
    setTimeDraft(prev => { const next = { ...prev }; delete next[id]; return next; });
  };

  const addIngredient = (recipe: Recipe) => {
    const text = (ingredientDraft[recipe.id] ?? '').trim();
    if (!text) return;
    updateRecipe(recipe.id, { ingredients: [...recipe.ingredients, capitalizeFirst(text)] });
    setIngredientDraft(prev => ({ ...prev, [recipe.id]: '' }));
  };

  const removeIngredient = (recipe: Recipe, index: number) => {
    updateRecipe(recipe.id, { ingredients: recipe.ingredients.filter((_, i) => i !== index) });
  };

  const handlePhotoFile = async (recipe: Recipe, file?: File) => {
    if (!file) return;
    const photoUri = await resizePhoto(file);
    updateRecipe(recipe.id, { photoUri });
  };

  const filtered = dietFilter ? recipes.filter(r => r.dietTag === dietFilter) : recipes;

  return (
    <div style={{ overflowY: 'auto', height: '100%', padding: '20px 20px 40px', backgroundColor: '#f0f4f8' }}>
      <div style={{ fontSize: 20, fontWeight: 800, color: '#1e293b', marginBottom: 4 }}>📖 Recetario</div>
      <div style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>
        Guardad las recetas que os han gustado, con ingredientes, tiempo, foto y puntuación.
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

      <div className="responsive-card-grid">
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', marginTop: 40, color: '#94a3b8', fontSize: 14 }}>
          Aún no hay recetas guardadas.
        </div>
      ) : (
        filtered.map(recipe => (
          <div key={recipe.id} style={{
            backgroundColor: '#fff', borderRadius: 14, padding: '14px 16px',
            boxShadow: '0 1px 8px rgba(0,0,0,0.06)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, gap: 8 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#1e293b' }}>{recipe.name}</div>
              <button onClick={() => removeRecipe(recipe.id)} style={{
                width: 24, height: 24, borderRadius: '50%', border: 'none', backgroundColor: '#f1f5f9',
                color: '#94a3b8', fontSize: 13, cursor: 'pointer', flexShrink: 0,
              }}>
                ×
              </button>
            </div>

            {/* Foto */}
            <div style={{ marginBottom: 10 }}>
              {recipe.photoUri ? (
                <div style={{ position: 'relative' }}>
                  <img
                    src={recipe.photoUri}
                    alt={recipe.name}
                    onClick={() => setLightbox(recipe.photoUri!)}
                    style={{ width: '100%', maxHeight: 160, objectFit: 'cover', borderRadius: 10, cursor: 'pointer' }}
                  />
                  <button
                    onClick={() => updateRecipe(recipe.id, { photoUri: undefined })}
                    style={{
                      position: 'absolute', top: 6, right: 6, width: 24, height: 24, borderRadius: '50%',
                      border: 'none', backgroundColor: 'rgba(0,0,0,0.55)', color: '#fff', fontSize: 13, cursor: 'pointer',
                    }}
                  >
                    ×
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => fileInputs.current[recipe.id]?.click()}
                  style={{
                    width: '100%', padding: '10px', borderRadius: 10, border: '1.5px dashed #cbd5e1',
                    backgroundColor: '#f8fafc', color: '#64748b', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  📷 Añadir foto
                </button>
              )}
              <input
                ref={el => { fileInputs.current[recipe.id] = el; }}
                type="file"
                accept="image/*"
                capture="environment"
                style={{ display: 'none' }}
                onChange={e => { handlePhotoFile(recipe, e.target.files?.[0]); e.target.value = ''; }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10, flexWrap: 'wrap' }}>
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
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 'auto' }}>
                <span style={{ fontSize: 13 }}>⏱️</span>
                <input
                  value={recipe.id in timeDraft ? timeDraft[recipe.id] : recipe.time}
                  placeholder="ej. 30 min"
                  onChange={e => setTimeDraft(prev => ({ ...prev, [recipe.id]: e.target.value }))}
                  onBlur={() => commitTime(recipe.id)}
                  style={{
                    width: 80, border: 'none', borderBottom: '1px solid #e2e8f0', outline: 'none',
                    fontSize: 12, color: '#64748b', padding: '2px 0',
                  }}
                />
              </div>
            </div>

            {/* Ingredientes */}
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 6 }}>
                🥕 Ingredientes
              </div>
              {recipe.ingredients.length > 0 && (
                <ul style={{ margin: '0 0 8px', paddingLeft: 18 }}>
                  {recipe.ingredients.map((ing, i) => (
                    <li key={i} style={{ fontSize: 13, color: '#334155', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ flex: 1 }}>{ing}</span>
                      <button
                        onClick={() => removeIngredient(recipe, i)}
                        style={{ background: 'none', border: 'none', color: '#cbd5e1', fontSize: 13, cursor: 'pointer' }}
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  value={ingredientDraft[recipe.id] ?? ''}
                  onChange={e => setIngredientDraft(prev => ({ ...prev, [recipe.id]: e.target.value }))}
                  onKeyDown={e => { if (e.key === 'Enter') addIngredient(recipe); }}
                  placeholder="Añadir ingrediente…"
                  style={{
                    flex: 1, border: '1px solid #e2e8f0', borderRadius: 8, padding: '6px 10px',
                    fontSize: 12, outline: 'none',
                  }}
                />
                <button onClick={() => addIngredient(recipe)} style={{
                  padding: '6px 10px', borderRadius: 8, border: 'none', backgroundColor: '#eff6ff',
                  color: BLUE, fontWeight: 700, fontSize: 14, cursor: 'pointer',
                }}>
                  ＋
                </button>
              </div>
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

      {lightbox && (
        <div onClick={() => setLightbox(null)} style={{
          position: 'fixed', inset: 0, zIndex: 1000, backgroundColor: 'rgba(0,0,0,0.88)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <img src={lightbox} alt="receta" style={{ maxWidth: '92%', maxHeight: '88vh', objectFit: 'contain', borderRadius: 10 }} />
          <button onClick={() => setLightbox(null)} style={{
            position: 'fixed', top: 16, right: 16, background: 'rgba(255,255,255,0.15)', border: 'none',
            color: '#fff', fontSize: 22, borderRadius: '50%', width: 42, height: 42, cursor: 'pointer',
          }}>✕</button>
        </div>
      )}
    </div>
  );
}
