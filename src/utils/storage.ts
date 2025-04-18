import { Revenue, Expense } from '../models/types';

const REVENUE_KEY = 'lyft_revenue';
const EXPENSES_KEY = 'lyft_expenses';

// Revenue Storage
export const saveRevenue = (revenue: Revenue): void => {
  const existingRevenue = getRevenue();
  localStorage.setItem(REVENUE_KEY, JSON.stringify([...existingRevenue, revenue]));
};

export const getRevenue = (): Revenue[] => {
  const revenueData = localStorage.getItem(REVENUE_KEY);
  return revenueData ? JSON.parse(revenueData) : [];
};

export const clearRevenue = (): void => {
  localStorage.removeItem(REVENUE_KEY);
};

// Expense Storage
export const saveExpense = (expense: Expense): void => {
  const existingExpenses = getExpenses();
  localStorage.setItem(EXPENSES_KEY, JSON.stringify([...existingExpenses, expense]));
};

export const getExpenses = (): Expense[] => {
  const expensesData = localStorage.getItem(EXPENSES_KEY);
  return expensesData ? JSON.parse(expensesData) : [];
};

export const clearExpenses = (): void => {
  localStorage.removeItem(EXPENSES_KEY);
};

// Get data for a specific date range
export const getDataForDateRange = (startDate: Date, endDate: Date): { revenue: Revenue[], expenses: Expense[] } => {
  const startTimestamp = startDate.getTime();
  const endTimestamp = endDate.getTime();
  
  const allRevenue = getRevenue();
  const allExpenses = getExpenses();
  
  const filteredRevenue = allRevenue.filter(
    (rev) => rev.timestamp >= startTimestamp && rev.timestamp <= endTimestamp
  );
  
  const filteredExpenses = allExpenses.filter(
    (exp) => exp.timestamp >= startTimestamp && exp.timestamp <= endTimestamp
  );
  
  return {
    revenue: filteredRevenue,
    expenses: filteredExpenses
  };
};

// Get data for today
export const getTodayData = (): { revenue: Revenue[], expenses: Expense[] } => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  return getDataForDateRange(today, tomorrow);
};
