import { configureStore } from '@reduxjs/toolkit';
import expenseReducer from './expenseSlice';
import menuReducer from './menuSlice';

export const store = configureStore({
  reducer: { expenses: expenseReducer, menu: menuReducer },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
