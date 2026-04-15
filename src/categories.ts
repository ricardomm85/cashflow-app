import { appendRows, readRange, writeRange } from './sheets.ts';
import type { Category } from './types.ts';

export interface CategoryRow extends Category {
  rowIndex: number;
}

export const CATEGORIES_RANGE = 'categories!A2:D';

export function parseCategories(rows: string[][]): CategoryRow[] {
  return rows.map((r, i) => ({
    rowIndex: i + 2,
    type: (r[0] as Category['type']) ?? 'pagos',
    group: r[1] ?? '',
    subgroup: r[2] ?? '',
    active: String(r[3] ?? '').toUpperCase() === 'TRUE',
  }));
}

export async function listCategories(token: string, spreadsheetId: string): Promise<CategoryRow[]> {
  const rows = await readRange({ token, spreadsheetId, range: CATEGORIES_RANGE });
  return parseCategories(rows);
}

export function activeOnly(categories: CategoryRow[]): CategoryRow[] {
  return categories.filter(c => c.active);
}

export async function addCategory(
  token: string,
  spreadsheetId: string,
  cat: Category,
): Promise<void> {
  await appendRows({
    token,
    spreadsheetId,
    range: 'categories!A1',
    values: [[cat.type, cat.group, cat.subgroup, String(cat.active).toUpperCase()]],
  });
}

export async function updateCategory(
  token: string,
  spreadsheetId: string,
  rowIndex: number,
  cat: Category,
): Promise<void> {
  await writeRange({
    token,
    spreadsheetId,
    range: `categories!A${rowIndex}:D${rowIndex}`,
    values: [[cat.type, cat.group, cat.subgroup, String(cat.active).toUpperCase()]],
  });
}

export async function setCategoryActive(
  token: string,
  spreadsheetId: string,
  rowIndex: number,
  active: boolean,
): Promise<void> {
  await writeRange({
    token,
    spreadsheetId,
    range: `categories!D${rowIndex}`,
    values: [[String(active).toUpperCase()]],
  });
}
