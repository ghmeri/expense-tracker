import { Expense, Recipe, RecentPurchaseItem, User, WeekMenuDocument, WeeklyMenu } from '../types';

export const registerHousehold = async (code: string): Promise<void> => {
  await fetch('/api/household', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  });
};

export const getWeekMenu = async (code: string, weekStart: string): Promise<WeekMenuDocument> => {
  const res = await fetch(`/api/household-menu?code=${code}&weekStart=${weekStart}`);
  if (!res.ok) throw new Error('No se pudo cargar el menú');
  return res.json();
};

export const saveWeekMenu = async (code: string, weekStart: string, menu: WeeklyMenu): Promise<WeekMenuDocument> => {
  const res = await fetch('/api/household-menu', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, weekStart, menu }),
  });
  if (!res.ok) throw new Error('No se pudo guardar el menú');
  return res.json();
};

export const getRecentPurchases = async (code: string): Promise<RecentPurchaseItem[]> => {
  const res = await fetch(`/api/household-purchases?code=${code}`);
  if (!res.ok) throw new Error('No se pudieron cargar las compras recientes');
  return res.json();
};

export const pushRecentPurchases = async (code: string, names: string[]): Promise<RecentPurchaseItem[]> => {
  const res = await fetch('/api/household-purchases', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, names }),
  });
  if (!res.ok) throw new Error('No se pudieron guardar las compras recientes');
  return res.json();
};

export const removeRecentPurchase = async (code: string, name: string): Promise<RecentPurchaseItem[]> => {
  const res = await fetch('/api/household-purchases', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, name }),
  });
  if (!res.ok) throw new Error('No se pudo quitar la compra');
  return res.json();
};

export const getCustomIdeas = async (code: string): Promise<RecentPurchaseItem[]> => {
  const res = await fetch(`/api/household-ideas?code=${code}`);
  if (!res.ok) throw new Error('No se pudieron cargar las ideas guardadas');
  return res.json();
};

export const pushCustomIdea = async (code: string, name: string): Promise<RecentPurchaseItem[]> => {
  const res = await fetch('/api/household-ideas', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, names: [name] }),
  });
  if (!res.ok) throw new Error('No se pudo guardar la idea');
  return res.json();
};

export const removeCustomIdea = async (code: string, name: string): Promise<RecentPurchaseItem[]> => {
  const res = await fetch('/api/household-ideas', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, name }),
  });
  if (!res.ok) throw new Error('No se pudo quitar la idea');
  return res.json();
};

export const getRecipes = async (code: string): Promise<Recipe[]> => {
  const res = await fetch(`/api/household-recipes?code=${code}`);
  if (!res.ok) throw new Error('No se pudo cargar el recetario');
  return res.json();
};

export const saveRecipes = async (code: string, recipes: Recipe[]): Promise<Recipe[]> => {
  const res = await fetch('/api/household-recipes', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, recipes }),
  });
  if (!res.ok) throw new Error('No se pudo guardar el recetario');
  return res.json();
};

export const getSharedExpenses = async (code: string): Promise<Expense[]> => {
  const res = await fetch(`/api/household-expenses?code=${code}`);
  if (!res.ok) throw new Error('No se pudieron cargar los gastos compartidos');
  return res.json();
};

export const saveSharedExpenses = async (code: string, expenses: Expense[]): Promise<Expense[]> => {
  const res = await fetch('/api/household-expenses', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, expenses }),
  });
  if (!res.ok) throw new Error('No se pudieron guardar los gastos compartidos');
  return res.json();
};

export const getSharedUsers = async (code: string): Promise<User[]> => {
  const res = await fetch(`/api/household-users?code=${code}`);
  if (!res.ok) throw new Error('No se pudieron cargar los usuarios compartidos');
  return res.json();
};

export const saveSharedUsers = async (code: string, users: User[]): Promise<User[]> => {
  const res = await fetch('/api/household-users', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, users }),
  });
  if (!res.ok) throw new Error('No se pudieron guardar los usuarios compartidos');
  return res.json();
};
