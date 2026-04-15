export type TxType = 'cobros' | 'pagos' | 'otros';

export interface Config {
  companyName: string;
  startDate: string;
  vatSales: number;
  vatExpenses: number;
  forecastMode: string;
}

export interface Category {
  type: TxType;
  group: string;
  subgroup: string;
  active: boolean;
}

export interface Transaction {
  date: string;
  bank: string;
  description: string;
  amount: number;
  type: TxType;
  group: string;
  subgroup: string;
}

export interface BankBalance {
  entity: string;
  type: 'bank' | 'credit_line';
  limit: number | null;
  balances: Record<string, number>;
}
