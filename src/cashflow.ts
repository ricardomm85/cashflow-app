import type { Transaction } from './types.ts';
import type { CurrencyRow } from './currencies.ts';
import type { BankBalanceRow } from './bank-balances.ts';

export function monthKeyOf(date: string): string {
  return date.slice(0, 7);
}

export function currentMonthKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function toEur(
  tx: Transaction,
  currencies: CurrencyRow[],
  fallbackToTxRate = true,
): number {
  if (tx.currency === 'EUR') return tx.amount;
  const month = monthKeyOf(tx.date);
  const row = currencies.find(c => c.currency === tx.currency.toUpperCase());
  const rate = row?.rates[month];
  if (rate && rate > 0) return tx.amount * rate;
  if (fallbackToTxRate && tx.exchangeRate > 0) return tx.amount * tx.exchangeRate;
  return tx.amount;
}

export interface MonthlyAggregate {
  month: string;
  inflow: number;
  outflow: number;
  net: number;
  count: number;
}

export function aggregateByMonth(
  txs: Transaction[],
  currencies: CurrencyRow[],
  months: string[],
): MonthlyAggregate[] {
  const map = new Map<string, MonthlyAggregate>();
  for (const m of months) {
    map.set(m, { month: m, inflow: 0, outflow: 0, net: 0, count: 0 });
  }
  for (const tx of txs) {
    const m = monthKeyOf(tx.date);
    const agg = map.get(m);
    if (!agg) continue;
    const eur = toEur(tx, currencies);
    agg.net += eur;
    if (eur >= 0) agg.inflow += eur;
    else agg.outflow += eur;
    agg.count++;
  }
  return months.map(m => map.get(m)!);
}

export function bankSummary(entities: BankBalanceRow[], monthKey: string): {
  total: number;
  bankTotal: number;
  creditUsed: number;
  creditLimit: number;
} {
  let bankTotal = 0;
  let creditUsed = 0;
  let creditLimit = 0;
  for (const e of entities) {
    const bal = e.balances[monthKey] ?? 0;
    if (e.type === 'bank') {
      bankTotal += bal;
    } else {
      creditUsed += Math.abs(Math.min(bal, 0));
      if (e.limit) creditLimit += e.limit;
    }
  }
  return { total: bankTotal - creditUsed, bankTotal, creditUsed, creditLimit };
}

export interface CategoryTotal {
  group: string;
  subgroup: string;
  type: Transaction['type'];
  total: number;
  count: number;
}

export function topCategoriesForMonth(
  txs: Transaction[],
  currencies: CurrencyRow[],
  monthKey: string,
  limit = 5,
): { inflows: CategoryTotal[]; outflows: CategoryTotal[] } {
  const map = new Map<string, CategoryTotal>();
  for (const tx of txs) {
    if (monthKeyOf(tx.date) !== monthKey) continue;
    const key = `${tx.type}|${tx.group}|${tx.subgroup}`;
    const eur = toEur(tx, currencies);
    const entry = map.get(key) ?? {
      group: tx.group,
      subgroup: tx.subgroup,
      type: tx.type,
      total: 0,
      count: 0,
    };
    entry.total += eur;
    entry.count++;
    map.set(key, entry);
  }
  const all = [...map.values()];
  return {
    inflows: all.filter(c => c.total > 0).sort((a, b) => b.total - a.total).slice(0, limit),
    outflows: all.filter(c => c.total < 0).sort((a, b) => a.total - b.total).slice(0, limit),
  };
}
