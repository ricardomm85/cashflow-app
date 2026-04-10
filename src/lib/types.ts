export type CategoryType = 'cobros' | 'pagos' | 'otros';

export interface Category {
  type: CategoryType;
  group: string;
  subgroup: string;
  active: boolean;
}

export interface Transaction {
  id: string;
  bank: string;
  date: string; // ISO 8601 format
  description: string;
  amount: number;
  currency: string;
  type: CategoryType;
  group: string;
  subgroup: string;
  month?: string; // YYYY-MM
  year?: number;
  monthKey?: string; // YYYY-MM for grouping
  exchangeRate?: number;
  amountEur?: number;
}

export interface BankBalance {
  entity: string;
  type: 'bank' | 'credit_line';
  limit?: number; // for credit_line type
  balances: Record<string, number>; // key = month YYYY-MM
}

export interface CurrencyRate {
  currency: string;
  rates: Record<string, number>; // key = month YYYY-MM
}

export interface UserSettings {
  id: string;
  user_id: string;
  spreadsheet_id: string;
  company_name: string;
  start_date: string; // ISO 8601 format
  vat_sales: number; // decimal (e.g. 0.21)
  vat_expenses: number; // decimal (e.g. 0.21)
  forecast_mode: 'SIMPLE' | 'ADVANCED';
  created_at: string;
  updated_at: string;
  email?: string; // from auth, not DB
}

export interface CashflowRow {
  label: string;
  level: 0 | 1 | 2;
  isGroup: boolean;
  months: Record<string, number>; // key = month YYYY-MM
}

export interface CashflowData {
  collections: CashflowRow[];
  payments: CashflowRow[];
  otherItems: CashflowRow[];
  cashflow: CashflowRow[];
  openingBalance: CashflowRow;
  closingBalance: CashflowRow;
  realBankBalance: CashflowRow;
  difference: CashflowRow;
  creditAvailable: CashflowRow;
  totalLiquidity: CashflowRow;
  burnRate: CashflowRow;
  burnRateAvg3m: CashflowRow;
  runway: CashflowRow;
}

export interface MetricsData {
  b2bMetrics: Record<string, number>;
  b2cMetrics: Record<string, number>;
}

export interface DashboardSummary {
  currentMonth: string; // YYYY-MM
  totalLiquidity: number;
  burnRate: number;
  runway: string; // months or "break-even"
  closingBalance: number;
  realBankBalance: number;
}
