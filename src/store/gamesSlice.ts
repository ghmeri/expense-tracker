import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { GameResult, GamesState } from '../types';
import { HOUSEHOLD_CODE } from '../services/household';
import { getGames, saveGames } from '../services/sharedService';

const initialState: GamesState = {
  results: [],
  loading: false,
  error: null,
};

export const fetchGames = createAsyncThunk(
  'games/fetchGames',
  async () => {
    const results = await getGames(HOUSEHOLD_CODE);
    return Array.isArray(results) ? results : [];
  }
);

export const persistGames = createAsyncThunk(
  'games/persistGames',
  async (results: GameResult[]) => saveGames(HOUSEHOLD_CODE, results)
);

const gamesSlice = createSlice({
  name: 'games',
  initialState,
  reducers: {
    addGameResult(state, action: PayloadAction<GameResult>) {
      state.results.unshift(action.payload);
    },
  },
  extraReducers: builder => {
    builder
      .addCase(fetchGames.pending, state => { state.loading = true; state.error = null; })
      .addCase(fetchGames.fulfilled, (state, action) => {
        state.loading = false;
        state.results = action.payload;
      })
      .addCase(fetchGames.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message ?? 'Error al cargar los juegos';
      })
      .addCase(persistGames.fulfilled, (state, action) => {
        state.results = action.payload;
      });
  },
});

export const { addGameResult } = gamesSlice.actions;
export default gamesSlice.reducer;
