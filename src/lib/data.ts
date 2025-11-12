import type { Project, CustomerPayment, Expense, DropdownData } from '@/lib/types';

// This file is now mostly deprecated as data is fetched dynamically.
// It can be removed or kept for reference/testing, but it is no longer used by the main dashboard.

export const projects: Project[] = [];
export const customerPayments: CustomerPayment[] = [];
export const expenses: Expense[] = [];


export const monthlyTurnover = [
  { month: "January", turnover: 0, expenses: 0 },
  { month: "February", turnover: 0, expenses: 0 },
  { month: "March", turnover: 0, expenses: 0 },
  { month: "April", turnover: 0, expenses: 0 },
  { month: "May", turnover: 0, expenses: 0 },
  { month: "June", turnover: 0, expenses: 0 },
];

export const categoryPopularity = [];

export const partners: DropdownData[] = [];
export const paymentTypes: DropdownData[] = [];
export const expenseTypes: DropdownData[] = [];
export const productMeasurements: DropdownData[] = [];
export const initialCustomers: string[] = [];
