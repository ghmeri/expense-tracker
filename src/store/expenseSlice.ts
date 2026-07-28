import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Expense, ExpenseState, User } from '../types';
import {
  addExpense as dbAdd,
  deleteExpense as dbDelete,
  updateExpense as dbUpdate,
  getExpenses,
  getUsers,
  updateUserName as dbUpdateUserName,
  setExpensesCache,
} from '../services/storage';
import { HOUSEHOLD_CODE } from '../services/household';
import {
  getSharedExpenses, saveSharedExpenses, getSharedUsers, saveSharedUsers,
} from '../services/sharedService';
import type { AppDispatch, RootState } from './index';

const initialState: ExpenseState = {
  expenses: [],
  users: [],
  loading: false,
  error: null,
};

const stripImage = (e: Expense): Expense => {
  const { imageUri, ...rest } = e;
  return rest as Expense;
};

/** Combina lo local (con fotos propias) con lo compartido (sin fotos, incluye lo del otro dispositivo). */
const mergeExpenses = (local: Expense[], shared: Expense[]): Expense[] => {
  const localById = new Map(local.map(e => [e.id, e]));
  const merged = shared.map(remote => {
    const own = localById.get(remote.id);
    return own ? { ...remote, imageUri: own.imageUri } : remote;
  });
  const sharedIds = new Set(shared.map(e => e.id));
  const localOnly = local.filter(e => !sharedIds.has(e.id));
  return [...merged, ...localOnly].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

const expenseSlice = createSlice({
  name: 'expenses',
  initialState,
  reducers: {
    setExpenses(state, action: PayloadAction<Expense[]>) {
      state.expenses = action.payload;
    },
    setUsers(state, action: PayloadAction<User[]>) {
      state.users = action.payload;
    },
    addExpenseLocal(state, action: PayloadAction<Expense>) {
      state.expenses.unshift(action.payload);
    },
    removeExpenseLocal(state, action: PayloadAction<string>) {
      state.expenses = state.expenses.filter(e => e.id !== action.payload);
    },
    updateExpenseLocal(state, action: PayloadAction<Expense>) {
      state.expenses = state.expenses.map(e => e.id === action.payload.id ? action.payload : e);
    },
  },
});

export const { setExpenses, setUsers, addExpenseLocal, removeExpenseLocal, updateExpenseLocal } = expenseSlice.actions;
export default expenseSlice.reducer;

/** Carga: muestra al instante la caché local y, en cuanto llega, fusiona con lo compartido. */
export const loadData = () => async (dispatch: AppDispatch) => {
  const localExpenses = getExpenses();
  const localUsers = getUsers();
  dispatch(setExpenses(localExpenses));
  dispatch(setUsers(localUsers));

  let sharedExpenses: Expense[];
  try {
    sharedExpenses = await getSharedExpenses(HOUSEHOLD_CODE);
  } catch {
    return; // sin red: nos quedamos con la caché local
  }

  const merged = mergeExpenses(localExpenses, sharedExpenses);
  dispatch(setExpenses(merged));
  setExpensesCache(merged);
  if (merged.length !== sharedExpenses.length) {
    saveSharedExpenses(HOUSEHOLD_CODE, merged.map(stripImage)).catch(() => {});
  }

  try {
    const sharedUsers = await getSharedUsers(HOUSEHOLD_CODE);
    if (sharedUsers.length > 0) {
      dispatch(setUsers(sharedUsers));
    } else if (localUsers.length > 0) {
      saveSharedUsers(HOUSEHOLD_CODE, localUsers).catch(() => {});
    }
  } catch { /* sin red: nos quedamos con los usuarios locales */ }
};

export const addExpense = (expense: Expense) => (dispatch: AppDispatch, getState: () => RootState) => {
  dbAdd(expense);
  dispatch(addExpenseLocal(expense));
  const updated = getState().expenses.expenses;
  saveSharedExpenses(HOUSEHOLD_CODE, updated.map(stripImage)).catch(() => {});
};

export const removeExpense = (id: string) => (dispatch: AppDispatch, getState: () => RootState) => {
  dbDelete(id);
  dispatch(removeExpenseLocal(id));
  const updated = getState().expenses.expenses;
  saveSharedExpenses(HOUSEHOLD_CODE, updated.map(stripImage)).catch(() => {});
};

export const updateExpense = (expense: Expense) => (dispatch: AppDispatch, getState: () => RootState) => {
  dbUpdate(expense);
  dispatch(updateExpenseLocal(expense));
  const updated = getState().expenses.expenses;
  saveSharedExpenses(HOUSEHOLD_CODE, updated.map(stripImage)).catch(() => {});
};

export const saveUsers = (users: User[]) => (dispatch: AppDispatch) => {
  users.forEach(u => dbUpdateUserName(u.id, u.name));
  dispatch(setUsers(users));
  saveSharedUsers(HOUSEHOLD_CODE, users).catch(() => {});
};
