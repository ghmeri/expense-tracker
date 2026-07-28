import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { Recipe, RecipeState } from '../types';
import { HOUSEHOLD_CODE } from '../services/household';
import { getRecipes, saveRecipes } from '../services/sharedService';

const initialState: RecipeState = {
  recipes: [],
  loading: false,
  error: null,
};

export const fetchRecipes = createAsyncThunk(
  'recipes/fetchRecipes',
  async () => getRecipes(HOUSEHOLD_CODE)
);

export const persistRecipes = createAsyncThunk(
  'recipes/persistRecipes',
  async (recipes: Recipe[]) => saveRecipes(HOUSEHOLD_CODE, recipes)
);

const recipeSlice = createSlice({
  name: 'recipes',
  initialState,
  reducers: {},
  extraReducers: builder => {
    builder
      .addCase(fetchRecipes.pending, state => { state.loading = true; state.error = null; })
      .addCase(fetchRecipes.fulfilled, (state, action) => {
        state.loading = false;
        state.recipes = action.payload;
      })
      .addCase(fetchRecipes.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message ?? 'Error al cargar el recetario';
      })
      .addCase(persistRecipes.fulfilled, (state, action) => {
        state.recipes = action.payload;
      });
  },
});

export default recipeSlice.reducer;
