import { appendRows, readRange, writeRange } from './sheets.ts';
import type { CurrencyRate } from './types.ts';

export interface CurrencyRow extends CurrencyRate {
  rowIndex: number;
}

export interface CurrenciesData {
  months: string[];
  currencies: CurrencyRow[];
}

export async function readCurrencies(
  token: string,
  spreadsheetId: string,
): Promise<CurrenciesData> {
  const rows = await readRange({ token, spreadsheetId, range: 'currencies!A1:ZZ' });
  if (!rows.length) return { months: [], currencies: [] };

  const header = rows[0]!;
  const months = header.slice(1);

  const currencies: CurrencyRow[] = rows.slice(1).map((r, i) => {
    const rates: Record<string, number> = {};
    for (let m = 0; m < months.length; m++) {
      const key = months[m]!;
      const raw = r[1 + m];
      rates[key] = raw === undefined || raw === '' ? 0 : Number(raw);
    }
    return {
      rowIndex: i + 2,
      currency: (r[0] ?? '').toUpperCase(),
      rates,
    };
  });

  return { months, currencies };
}

export async function addCurrency(
  token: string,
  spreadsheetId: string,
  months: string[],
  code: string,
  initialRate: number,
): Promise<void> {
  const row: (string | number)[] = [code.toUpperCase(), ...months.map(() => initialRate)];
  await appendRows({ token, spreadsheetId, range: 'currencies!A1', values: [row] });
}

export async function updateRate(
  token: string,
  spreadsheetId: string,
  rowIndex: number,
  months: string[],
  monthKey: string,
  value: number,
): Promise<void> {
  const idx = months.indexOf(monthKey);
  if (idx < 0) throw new Error(`Mes ${monthKey} no existe`);
  const col = columnLetter(1 + idx);
  await writeRange({
    token,
    spreadsheetId,
    range: `currencies!${col}${rowIndex}`,
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
