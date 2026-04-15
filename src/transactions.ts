import { appendRows, readRange, writeRange } from './sheets.ts';
import type { Transaction } from './types.ts';

export interface TransactionRow extends Transaction {
  rowIndex: number;
}

function toRow(tx: Transaction): (string | number)[] {
  return [
    tx.date,
    tx.bank,
    tx.description,
    tx.amount,
    tx.currency,
    tx.type,
    tx.group,
    tx.subgroup,
    tx.exchangeRate,
  ];
}

function fromRow(row: string[], offset: number): TransactionRow {
  return {
    rowIndex: offset + 2,
    date: row[0] ?? '',
    bank: row[1] ?? '',
    description: row[2] ?? '',
    amount: Number(row[3] ?? 0),
    currency: row[4] ?? 'EUR',
    type: (row[5] as TransactionRow['type']) ?? 'pagos',
    group: row[6] ?? '',
    subgroup: row[7] ?? '',
    exchangeRate: Number(row[8] ?? 1),
  };
}

export const TRANSACTIONS_RANGE = 'transactions!A2:I';

export function parseTransactions(rows: string[][]): TransactionRow[] {
  return rows.map((r, i) => fromRow(r, i));
}

export async function listTransactions(token: string, spreadsheetId: string): Promise<TransactionRow[]> {
  const rows = await readRange({ token, spreadsheetId, range: TRANSACTIONS_RANGE });
  return parseTransactions(rows);
}

export async function addTransaction(token: string, spreadsheetId: string, tx: Transaction): Promise<void> {
  await appendRows({ token, spreadsheetId, range: 'transactions!A1', values: [toRow(tx)] });
}

export async function updateTransaction(
  token: string,
  spreadsheetId: string,
  rowIndex: number,
  tx: Transaction,
): Promise<void> {
  await writeRange({
    token,
    spreadsheetId,
    range: `transactions!A${rowIndex}:I${rowIndex}`,
    values: [toRow(tx)],
  });
}

export async function deleteTransaction(
  token: string,
  spreadsheetId: string,
  rowIndex: number,
): Promise<void> {
  const sheetId = await getSheetIdByTitle(token, spreadsheetId, 'transactions');
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [{
          deleteDimension: {
            range: {
              sheetId,
              dimension: 'ROWS',
              startIndex: rowIndex - 1,
              endIndex: rowIndex,
            },
          },
        }],
      }),
    },
  );
  if (!res.ok) throw new Error(`Delete failed: ${res.status} ${await res.text()}`);
}

async function getSheetIdByTitle(token: string, spreadsheetId: string, title: string): Promise<number> {
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!res.ok) throw new Error(`Meta failed: ${res.status}`);
  const data = await res.json();
  const sheet = data.sheets?.find((s: { properties: { title: string; sheetId: number } }) =>
    s.properties.title === title);
  if (!sheet) throw new Error(`Sheet "${title}" no encontrada`);
  return sheet.properties.sheetId;
}
