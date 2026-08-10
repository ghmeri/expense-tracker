import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { MealSlot, MenuRow, MenuState, WeekDay, WeeklyMenu } from '../types';
import { HOUSEHOLD_CODE } from '../services/household';
import {
  getWeekMenu,
  saveWeekMenu,
  getRecentPurchases as apiGetRecentPurchases,
  pushRecentPurchases as apiPushRecentPurchases,
  removeRecentPurchase as apiRemoveRecentPurchase,
  getCustomIdeas as apiGetCustomIdeas,
  pushCustomIdea as apiPushCustomIdea,
  removeCustomIdea as apiRemoveCustomIdea,
} from '../services/sharedService';
import { getMondayISO } from '../utils/date';

const initialState: MenuState = {
  currentWeekStart: getMondayISO(new Date()),
  weekMenu: {},
  recentPurchases: [],
  customIdeas: [],
  loading: false,
  error: null,
};

export const fetchWeekMenu = createAsyncThunk(
  'menu/fetchWeekMenu',
  async (weekStart: string) => {
    const doc = await getWeekMenu(HOUSEHOLD_CODE, weekStart);
    return doc.menu;
  }
);

export const saveMealSlotRows = createAsyncThunk(
  'menu/saveMealSlotRows',
  async (
    { weekStart, day, slot, rows }:
    { weekStart: string; day: WeekDay; slot: MealSlot; rows: MenuRow[] },
    { getState }
  ) => {
    const state = getState() as { menu: MenuState };
    const updatedMenu: WeeklyMenu = {
      ...state.menu.weekMenu,
      [day]: { ...state.menu.weekMenu[day], [slot]: rows },
    };
    const doc = await saveWeekMenu(HOUSEHOLD_CODE, weekStart, updatedMenu);
    return doc.menu;
  }
);

export const fetchRecentPurchases = createAsyncThunk(
  'menu/fetchRecentPurchases',
  async () => apiGetRecentPurchases(HOUSEHOLD_CODE)
);

export const pushRecentPurchases = createAsyncThunk(
  'menu/pushRecentPurchases',
  async (names: string[]) => apiPushRecentPurchases(HOUSEHOLD_CODE, names)
);

export const removeRecentPurchase = createAsyncThunk(
  'menu/removeRecentPurchase',
  async (name: string) => apiRemoveRecentPurchase(HOUSEHOLD_CODE, name)
);

export const fetchCustomIdeas = createAsyncThunk(
  'menu/fetchCustomIdeas',
  async () => apiGetCustomIdeas(HOUSEHOLD_CODE)
);

export const pushCustomIdea = createAsyncThunk(
  'menu/pushCustomIdea',
  async (name: string) => apiPushCustomIdea(HOUSEHOLD_CODE, name)
);

export const removeCustomIdea = createAsyncThunk(
  'menu/removeCustomIdea',
  async (name: string) => apiRemoveCustomIdea(HOUSEHOLD_CODE, name)
);

const menuSlice = createSlice({
  name: 'menu',
  initialState,
  reducers: {
    setCurrentWeekStart(state, action: PayloadAction<string>) {
      state.currentWeekStart = action.payload;
      state.weekMenu = {};
    },
  },
  extraReducers: builder => {
    builder
      .addCase(fetchWeekMenu.pending, state => { state.loading = true; state.error = null; })
      .addCase(fetchWeekMenu.fulfilled, (state, action) => {
        state.loading = false;
        state.weekMenu = action.payload;
      })
      .addCase(fetchWeekMenu.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message ?? 'Error al cargar el menú';
      })
      .addCase(saveMealSlotRows.fulfilled, (state, action) => {
        // Si mientras tanto cambiaste de semana, ignora esta respuesta desfasada.
        if (state.currentWeekStart !== action.meta.arg.weekStart) return;
        state.weekMenu = action.payload;
      })
      .addCase(fetchRecentPurchases.fulfilled, (state, action) => {
        state.recentPurchases = action.payload;
      })
      .addCase(pushRecentPurchases.fulfilled, (state, action) => {
        state.recentPurchases = action.payload;
      })
      .addCase(removeRecentPurchase.fulfilled, (state, action) => {
        state.recentPurchases = action.payload;
      })
      .addCase(fetchCustomIdeas.fulfilled, (state, action) => {
        state.customIdeas = action.payload;
      })
      .addCase(pushCustomIdea.fulfilled, (state, action) => {
        state.customIdeas = action.payload;
      })
      .addCase(removeCustomIdea.fulfilled, (state, action) => {
        state.customIdeas = action.payload;
      });
  },
});

export const { setCurrentWeekStart } = menuSlice.actions;
export default menuSlice.reducer;
