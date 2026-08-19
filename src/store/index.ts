import { configureStore } from '@reduxjs/toolkit';
import expenseReducer from './expenseSlice';
import menuReducer from './menuSlice';
import recipeReducer from './recipeSlice';
import gamesReducer from './gamesSlice';

export const store = configureStore({
  reducer: { expenses: expenseReducer, menu: menuReducer, recipes: recipeReducer, games: gamesReducer },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
