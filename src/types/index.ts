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
