export interface Revenue {
  id: string;
  amount: number;
  timestamp: number;
  note?: string;
}

export interface Expense {
  id: string;
  amount: number;
  category: ExpenseCategory;
  timestamp: number;
  note?: string;
}

export enum ExpenseCategory {
  GAS = 'Gas',
  MAINTENANCE = 'Maintenance',
  CAR_WASH = 'Car Wash',
  SNACKS = 'Snacks',
  TOLLS = 'Tolls',
  OTHER = 'Other'
}

export interface DailySummary {
  date: string;
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  expensesByCategory: Record<ExpenseCategory, number>;
}
