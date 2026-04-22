import { appendRows, parseCellNumber, readRange, writeRange } from './sheets.ts';
import type { BankBalance } from './types.ts';

export interface BankBalanceRow extends BankBalance {
  rowIndex: number;
}

export interface BankBalancesData {
  months: string[];
  entities: BankBalanceRow[];
}

export const BANK_BALANCES_RANGE = 'bank_balances!A1:ZZ';

export function parseBankBalances(rows: string[][]): BankBalancesData {
  if (!rows.length) return { months: [], entities: [] };

  const header = rows[0]!;
  const months = header.slice(3);

  const entities: BankBalanceRow[] = rows.slice(1).map((r, i) => {
    const balances: Record<string, number> = {};
    for (let m = 0; m < months.length; m++) {
      const key = months[m]!;
      const raw = r[3 + m];
      const parsed = parseCellNumber(raw);
      balances[key] = Number.isNaN(parsed) ? 0 : parsed;
    }
    return {
      rowIndex: i + 2,
      entity: r[0] ?? '',
      type: (r[1] as BankBalance['type']) ?? 'bank',
      limit: r[2] === undefined || r[2] === '' ? null : parseCellNumber(r[2]),
      balances,
    };
  });

  return { months, entities };
}

export async function readBankBalances(
  token: string,
  spreadsheetId: string,
): Promise<BankBalancesData> {
  const rows = await readRange({ token, spreadsheetId, range: BANK_BALANCES_RANGE });
  return parseBankBalances(rows);
}

function toRow(entity: BankBalance, months: string[]): (string | number)[] {
  const limitCell = entity.limit === null ? '' : entity.limit;
  return [
    entity.entity,
    entity.type,
    limitCell,
    ...months.map(m => entity.balances[m] ?? 0),
  ];
}

export async function addEntity(
  token: string,
  spreadsheetId: string,
  months: string[],
  entity: BankBalance,
): Promise<void> {
  await appendRows({
    token,
    spreadsheetId,
    range: 'bank_balances!A1',
    values: [toRow(entity, months)],
  });
}

export async function updateEntity(
  token: string,
  spreadsheetId: string,
  rowIndex: number,
  months: string[],
  entity: BankBalance,
): Promise<void> {
  const endCol = columnLetter(3 + months.length);
  await writeRange({
    token,
    spreadsheetId,
    range: `bank_balances!A${rowIndex}:${endCol}${rowIndex}`,
    values: [toRow(entity, months)],
  });
}

export async function updateBalance(
  token: string,
  spreadsheetId: string,
  rowIndex: number,
  months: string[],
  monthKey: string,
  value: number,
): Promise<void> {
  const idx = months.indexOf(monthKey);
  if (idx < 0) throw new Error(`Mes ${monthKey} no existe en la hoja`);
  const col = columnLetter(3 + idx);
  await writeRange({
    token,
    spreadsheetId,
    range: `bank_balances!${col}${rowIndex}`,
    values: [[value]],
  });
}

function columnLetter(index0: number): string {
  let n = index0;
  let result = '';
  while (n >= 0) {
    result = String.fromCharCode(65 + (n % 26)) + result;
    n = Math.floor(n / 26) - 1;
  }
  return result;
}
