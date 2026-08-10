import { Expense, User } from '../types';

const EXPENSES_KEY = 'gx_expenses';
const USERS_KEY = 'gx_users';

const DEFAULT_USERS: User[] = [
  { id: 'user1',  name: 'Yo',               color: '#6200ee' },
  { id: 'user2',  name: 'Mi pareja',         color: '#03dac6' },
  { id: 'shared', name: 'Cuenta conjunta',   color: '#f59e0b' },
];

export const getExpenses = (): Expense[] => {
  try {
    return JSON.parse(localStorage.getItem(EXPENSES_KEY) ?? '[]');
  } catch {
    return [];
  }
};

export const addExpense = (expense: Expense): void => {
  const expenses = getExpenses();
  expenses.unshift(expense);
  localStorage.setItem(EXPENSES_KEY, JSON.stringify(expenses));
};

export const deleteExpense = (id: string): void => {
  const expenses = getExpenses().filter(e => e.id !== id);
  localStorage.setItem(EXPENSES_KEY, JSON.stringify(expenses));
};

export const updateExpense = (updated: Expense): void => {
  const expenses = getExpenses().map(e => e.id === updated.id ? updated : e);
  localStorage.setItem(EXPENSES_KEY, JSON.stringify(expenses));
};

/** Sobrescribe la caché local completa (usado tras fusionar con lo compartido en la nube). */
export const setExpensesCache = (expenses: Expense[]): void => {
  localStorage.setItem(EXPENSES_KEY, JSON.stringify(expenses));
};

export const getUsers = (): User[] => {
  const stored = localStorage.getItem(USERS_KEY);
  if (!stored) {
    localStorage.setItem(USERS_KEY, JSON.stringify(DEFAULT_USERS));
    return DEFAULT_USERS;
  }
  try {
    const users: User[] = JSON.parse(stored);
    // Ensure shared account always exists (migration for existing installs)
    if (!users.find(u => u.id === 'shared')) {
      const updated = [...users, { id: 'shared', name: 'Cuenta conjunta', color: '#f59e0b' }];
      localStorage.setItem(USERS_KEY, JSON.stringify(updated));
      return updated;
    }
    return users;
  } catch {
    return DEFAULT_USERS;
  }
};

export const updateUserName = (id: string, name: string): void => {
  const users = getUsers().map(u => (u.id === id ? { ...u, name } : u));
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
};
