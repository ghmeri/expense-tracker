import { configureStore } from '@reduxjs/toolkit';
import expenseReducer from './expenseSlice';
import menuReducer from './menuSlice';
import recipeReducer from './recipeSlice';

export const store = configureStore({
  reducer: { expenses: expenseReducer, menu: menuReducer, recipes: recipeReducer },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
