export type Category =
  | 'alimentacion'
  | 'transporte'
  | 'ocio'
  | 'salud'
  | 'hogar'
  | 'ropa'
  | 'tecnologia'
  | 'otros';

export interface LineItem {
  name: string;
  quantity?: number;
  unitPrice?: number;
  totalPrice: number;
}

export interface Expense {
  id: string;
  amount: number;
  category: Category;
  description: string;
  date: string;
  imageUri?: string;
  userId: string;
  createdAt: string;
  lineItems?: LineItem[];
}

export interface User {
  id: string;
  name: string;
  color: string;
}

export interface ExpenseState {
  expenses: Expense[];
  users: User[];
  loading: boolean;
  error: string | null;
}

export interface FilterState {
  search: string;
  dateFrom: string | null;
  dateTo: string | null;
  category: Category | 'todas';
  userId: string | 'todos';
}

export type DietTag = 'vegetariano' | 'con_carne';

export type MealSlot = 'comida' | 'cena';

export type RowType = 'compartido' | 'separado';

export interface MenuRow {
  id: string;
  type: RowType;
  shared: string;    // usado cuando type === 'compartido'
  personF: string;   // usado cuando type === 'separado' (Maria F)
  personN: string;   // usado cuando type === 'separado' (Maria N)
}

export type WeekDay = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

export type WeeklyMenu = {
  [day in WeekDay]?: {
    comida?: MenuRow[];
    cena?: MenuRow[];
  };
};

export interface WeekMenuDocument {
  weekStart: string;
  menu: WeeklyMenu;
  updatedAt: string;
}

export interface RecentPurchaseItem {
  name: string;
  lastSeenAt: string;
}

export interface MealIdea {
  id: string;
  name: string;
  dietTag: DietTag;
}

export interface MenuState {
  currentWeekStart: string;
  weekMenu: WeeklyMenu;
  recentPurchases: RecentPurchaseItem[];
  customIdeas: RecentPurchaseItem[];
  loading: boolean;
  error: string | null;
}
