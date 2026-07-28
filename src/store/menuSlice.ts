import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { MealEntry, MenuState, WeekDay, WeeklyMenu } from '../types';
import { getHouseholdCode } from '../services/household';
import {
  getWeekMenu,
  saveWeekMenu,
  getRecentPurchases as apiGetRecentPurchases,
  pushRecentPurchases as apiPushRecentPurchases,
} from '../services/sharedService';
import { getMondayISO } from '../utils/date';

const initialState: MenuState = {
  householdCode: getHouseholdCode(),
  currentWeekStart: getMondayISO(new Date()),
  weekMenu: {},
  recentPurchases: [],
  loading: false,
  error: null,
};

export const fetchWeekMenu = createAsyncThunk(
  'menu/fetchWeekMenu',
  async ({ code, weekStart }: { code: string; weekStart: string }) => {
    const doc = await getWeekMenu(code, weekStart);
    return doc.menu;
  }
);

export const saveMealSlot = createAsyncThunk(
  'menu/saveMealSlot',
  async (
    { code, weekStart, day, slot, entry }:
    { code: string; weekStart: string; day: WeekDay; slot: 'comida' | 'cena'; entry: MealEntry },
    { getState }
  ) => {
    const state = getState() as { menu: MenuState };
    const updatedMenu: WeeklyMenu = {
      ...state.menu.weekMenu,
      [day]: { ...state.menu.weekMenu[day], [slot]: entry },
    };
    const doc = await saveWeekMenu(code, weekStart, updatedMenu);
    return doc.menu;
  }
);

export const fetchRecentPurchases = createAsyncThunk(
  'menu/fetchRecentPurchases',
  async (code: string) => apiGetRecentPurchases(code)
);

export const pushRecentPurchases = createAsyncThunk(
  'menu/pushRecentPurchases',
  async ({ code, names }: { code: string; names: string[] }) => apiPushRecentPurchases(code, names)
);

const menuSlice = createSlice({
  name: 'menu',
  initialState,
  reducers: {
    setHouseholdCode(state, action: PayloadAction<string>) {
      state.householdCode = action.payload;
    },
    clearHousehold(state) {
      state.householdCode = null;
      state.weekMenu = {};
      state.recentPurchases = [];
    },
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

export const { setHouseholdCode, clearHousehold, setCurrentWeekStart } = menuSlice.actions;
export default menuSlice.reducer;
