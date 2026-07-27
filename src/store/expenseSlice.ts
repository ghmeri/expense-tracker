import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Expense, ExpenseState, User } from '../types';
import {
  addExpense as dbAdd,
  deleteExpense as dbDelete,
  updateExpense as dbUpdate,
  getExpenses,
  getUsers,
} from '../services/storage';

const initialState: ExpenseState = {
  expenses: [],
  users: [],
  loading: false,
  error: null,
};

const expenseSlice = createSlice({
  name: 'expenses',
  initialState,
  reducers: {
    loadData(state) {
      state.expenses = getExpenses();
      state.users = getUsers();
    },
    addExpense(state, action: PayloadAction<Expense>) {
      dbAdd(action.payload);
      state.expenses.unshift(action.payload);
    },
    removeExpense(state, action: PayloadAction<string>) {
      dbDelete(action.payload);
      state.expenses = state.expenses.filter(e => e.id !== action.payload);
    },
    updateExpense(state, action: PayloadAction<Expense>) {
      dbUpdate(action.payload);
      state.expenses = state.expenses.map(e => e.id === action.payload.id ? action.payload : e);
    },
    updateUsers(state, action: PayloadAction<User[]>) {
      state.users = action.payload;
    },
  },
});

export const { loadData, addExpense, removeExpense, updateExpense, updateUsers } = expenseSlice.actions;
export default expenseSlice.reducer;
