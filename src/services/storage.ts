import { Expense, User } from '../types';

const EXPENSES_KEY = 'gx_expenses';
const USERS_KEY = 'gx_users';

const DEFAULT_USERS: User[] = [
  { id: 'user1', name: 'Yo', color: '#6200ee' },
  { id: 'user2', name: 'Mi pareja', color: '#03dac6' },
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

export const getUsers = (): User[] => {
  const stored = localStorage.getItem(USERS_KEY);
  if (!stored) {
    localStorage.setItem(USERS_KEY, JSON.stringify(DEFAULT_USERS));
    return DEFAULT_USERS;
  }
  try {
    return JSON.parse(stored);
  } catch {
    return DEFAULT_USERS;
  }
};

export const updateUserName = (id: string, name: string): void => {
  const users = getUsers().map(u => (u.id === id ? { ...u, name } : u));
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
};
