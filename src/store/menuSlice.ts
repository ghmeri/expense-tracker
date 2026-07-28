import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { DietTag, Dish, MealSlot, MenuState, WeekDay, WeeklyMenu } from '../types';
import { HOUSEHOLD_CODE } from '../services/household';
import {
  getWeekMenu,
  saveWeekMenu,
  getRecentPurchases as apiGetRecentPurchases,
  pushRecentPurchases as apiPushRecentPurchases,
} from '../services/sharedService';
import { getMondayISO } from '../utils/date';

const initialState: MenuState = {
  currentWeekStart: getMondayISO(new Date()),
  weekMenu: {},
  recentPurchases: [],
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

export const saveMealSlot = createAsyncThunk(
  'menu/saveMealSlot',
  async (
    { weekStart, day, slot, category, dish }:
    { weekStart: string; day: WeekDay; slot: MealSlot; category: DietTag; dish: Dish },
    { getState }
  ) => {
    const state = getState() as { menu: MenuState };
    const updatedMenu: WeeklyMenu = {
      ...state.menu.weekMenu,
      [day]: {
        ...state.menu.weekMenu[day],
        [slot]: { ...state.menu.weekMenu[day]?.[slot], [category]: dish },
      },
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
      .addCase(saveMealSlot.fulfilled, (state, action) => {
        state.weekMenu = action.payload;
      })
      .addCase(fetchRecentPurchases.fulfilled, (state, action) => {
        state.recentPurchases = action.payload;
      })
      .addCase(pushRecentPurchases.fulfilled, (state, action) => {
        state.recentPurchases = action.payload;
      });
  },
});

export const { setCurrentWeekStart } = menuSlice.actions;
export default menuSlice.reducer;
