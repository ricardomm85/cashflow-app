import { appendRows, fetchWithRetry, writeRange } from './sheets.ts';
import { XLSX_MIME, GOOGLE_SHEET_MIME } from './picker.ts';

const SHEETS_API = 'https://sheets.googleapis.com/v4/spreadsheets';

interface ConfigData {
  companyName?: string;
  startDate?: string;
  vatSales?: number;
  vatExpenses?: number;
  forecastMode?: 'manual' | 'historical' | 'average';
}

interface CategoryData {
  type: 'cobros' | 'pagos' | 'otros';
  group: string;
  subgroup: string;
}

interface TransactionData {
  date: string;
  bank: string;
  description: string;
  amount: number;
  type: string;
  group: string;
  subgroup: string;
}

interface BankBalanceData {
  entity: string;
  type: 'bank' | 'credit_line';
  limit: number;
  balances: Record<string, number>;
}

export interface LanzaderaData {
  config: ConfigData;
  categories: CategoryData[];
  transactions: TransactionData[];
  banks: BankBalanceData[];
  months: string[];
}

type CellValue = string | number | Date | boolean | undefined;
type Grid = CellValue[][];

interface RawSource {
  instrucciones: Grid;
  categorias: Grid;
  saldoBancos: Grid;
  movimientos: Grid;
}

// ---- Source readers ----

async function readXlsxSource(token: string, sourceId: string): Promise<RawSource> {
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${sourceId}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) { console.error('Drive download failed:', res.status); throw new Error(`Error descargando archivo (${res.status}).`); }
  const buf = await res.arrayBuffer();
  const XLSX = await import('xlsx');
  const wb = XLSX.read(buf, { type: 'array', cellDates: true });

  const toGrid = (name: string): Grid => {
    const ws = wb.Sheets[name];
    if (!ws || !ws['!ref']) return [];
    const range = XLSX.utils.decode_range(ws['!ref']);
    const grid: Grid = [];
    for (let r = 0; r <= range.e.r; r++) {
      const row: CellValue[] = [];
      for (let c = 0; c <= range.e.c; c++) {
        const cell = ws[XLSX.utils.encode_cell({ r, c })];
        row.push(cell?.v as CellValue);
      }
      grid.push(row);
    }
    return grid;
  };

  return {
    instrucciones: toGrid('Instrucciones (IMPORTANTE LEER)'),
    categorias: toGrid('Categorías'),
    saldoBancos: toGrid('Saldo bancos'),
    movimientos: toGrid('Movimientos bancarios'),
  };
}

async function readSheetsSource(token: string, sourceId: string): Promise<RawSource> {
  const ranges = [
    `'Instrucciones (IMPORTANTE LEER)'!A1:I100`,
    `'Categorías'!A1:C1000`,
    `'Saldo bancos'!A1:T30`,
    `'Movimientos bancarios'!A1:M2000`,
  ];
  const qs = ranges.map(r => `ranges=${encodeURIComponent(r)}`).join('&');
  const url = `${SHEETS_API}/${sourceId}/values:batchGet?${qs}&valueRenderOption=UNFORMATTED_VALUE&dateTimeRenderOption=SERIAL_NUMBER`;
  const res = await fetchWithRetry(url, { headers: { Authorization: `Bearer ${token}` } }, 'Lanzadera read');
  if (!res.ok) { console.error('Lanzadera read failed:', res.status); throw new Error(`Error al leer Lanzadera (${res.status}).`); }
  const json = await res.json() as { valueRanges?: { values?: CellValue[][] }[] };
  const grids = (json.valueRanges ?? []).map(vr => (vr.values ?? []) as Grid);
  return {
    instrucciones: grids[0] ?? [],
    categorias: grids[1] ?? [],
    saldoBancos: grids[2] ?? [],
    movimientos: grids[3] ?? [],
  };
}

// ---- Cell helpers ----

function cellString(g: Grid, r: number, c: number): string {
  const v = g[r]?.[c];
  return v == null ? '' : String(v).trim();
}

function cellNum(g: Grid, r: number, c: number): number | undefined {
  const v = g[r]?.[c];
  if (typeof v === 'number') return v;
  if (typeof v === 'string' && v.trim() !== '') {
    // Handle percentage strings like "21%"
    const cleaned = v.replace(/%$/, '').replace(',', '.').trim();
    const n = Number(cleaned);
    if (Number.isNaN(n)) return undefined;
    return v.endsWith('%') ? n / 100 : n;
  }
  return undefined;
}

function excelSerialToDate(serial: number): string {
  // Excel epoch: 1899-12-30 (accounting for 1900 leap year bug)
  const ms = Math.round((serial - 25569) * 86400 * 1000);
  const d = new Date(ms);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function dateToIso(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseDateCell(v: CellValue): string {
  if (v == null || v === '') return '';
  if (v instanceof Date) return dateToIso(v);
  if (typeof v === 'number') return excelSerialToDate(v);
  const s = String(v).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) return `${m[3]}-${m[2]!.padStart(2, '0')}-${m[1]!.padStart(2, '0')}`;
  return '';
}

function monthFromCell(v: CellValue): string {
  const iso = parseDateCell(v);
  return iso ? iso.slice(0, 7) : '';
}

// ---- Extractors ----

const TYPE_MAP: Record<string, CategoryData['type']> = {
  'cobros': 'cobros',
  'pagos': 'pagos',
  'otros': 'otros',
  'otros cobros/pagos': 'otros',
};

const FORECAST_MAP: Record<string, NonNullable<ConfigData['forecastMode']>> = {
  SIMPLE: 'manual',
  AVANZADO: 'average',
};

function extractConfig(instr: Grid): ConfigData {
  const company = cellString(instr, 49, 2);
  const startDate = parseDateCell(instr[53]?.[4]);
  const vatSales = cellNum(instr, 62, 4);
  const vatExp = cellNum(instr, 64, 4);
  const forecastRaw = cellString(instr, 66, 4).toUpperCase();

  const out: ConfigData = {};
  if (company && company !== 'NOMBRE EMPRESA') out.companyName = company;
  if (startDate) out.startDate = startDate;
  if (vatSales !== undefined) out.vatSales = vatSales;
  if (vatExp !== undefined) out.vatExpenses = vatExp;
  if (forecastRaw) out.forecastMode = FORECAST_MAP[forecastRaw] ?? 'manual';
  return out;
}

function extractCategories(g: Grid): CategoryData[] {
  const out: CategoryData[] = [];
  let currentType: CategoryData['type'] | null = null;
  let currentGroup = '';
  for (let r = 2; r < g.length; r++) {
    const a = cellString(g, r, 0).toLowerCase();
    const b = cellString(g, r, 1);
    const c = cellString(g, r, 2);
    if (a && TYPE_MAP[a]) currentType = TYPE_MAP[a]!;
    if (b) currentGroup = b;
    if (c && currentType && currentGroup) {
      out.push({ type: currentType, group: currentGroup, subgroup: c });
    }
  }
  return out;
}

function extractTransactions(g: Grid): TransactionData[] {
  const out: TransactionData[] = [];
  for (let r = 2; r < g.length; r++) {
    const bank = cellString(g, r, 0);
    const dateRaw = g[r]?.[1];
    const desc = cellString(g, r, 2);
    const amountRaw = cellNum(g, r, 3);
    const typeRaw = cellString(g, r, 5).toLowerCase();
    const group = cellString(g, r, 6);
    const subgroup = cellString(g, r, 7);
    const amountEur = cellNum(g, r, 12);

    const date = parseDateCell(dateRaw);
    if (!date) continue;
    if (amountRaw === undefined && amountEur === undefined) continue;

    const baseAmt = amountEur ?? amountRaw ?? 0;
    let signed = baseAmt;
    if (typeRaw === 'pagos') signed = -Math.abs(baseAmt);
    else if (typeRaw === 'cobros') signed = Math.abs(baseAmt);

    out.push({
      date,
      bank,
      description: desc,
      amount: Number(signed.toFixed(2)),
      type: TYPE_MAP[typeRaw] ?? typeRaw,
      group,
      subgroup,
    });
  }
  return out;
}

function extractBanks(g: Grid): { banks: BankBalanceData[]; months: string[] } {
  const headerRow = g[0] ?? [];
  const monthCols: { col: number; month: string }[] = [];
  for (let c = 1; c < headerRow.length; c++) {
    const month = monthFromCell(headerRow[c]);
    if (month) monthCols.push({ col: c, month });
  }

  const banks: BankBalanceData[] = [];

  // Banks: rows 2-5 (indices 1..4)
  for (let r = 1; r <= 4; r++) {
    const name = cellString(g, r, 0);
    if (!name || name.toLowerCase().startsWith('total')) continue;
    const balances: Record<string, number> = {};
    for (const { col, month } of monthCols) {
      const v = cellNum(g, r, col);
      if (v !== undefined) balances[month] = v;
    }
    banks.push({ entity: name, type: 'bank', limit: 0, balances });
  }

  // Credit lines: pairs starting at indices 8, 10, 12, 14
  for (const nameRow of [8, 10, 12, 14]) {
    const name = cellString(g, nameRow, 0);
    if (!name) continue;
    // Skip untouched placeholders like "Línea crédito 1 - Entidad y Límite €€"
    if (/l[ií]mite €€|Entidad y/i.test(name)) continue;
    const balances: Record<string, number> = {};
    for (const { col, month } of monthCols) {
      const v = cellNum(g, nameRow + 1, col);
      if (v !== undefined) balances[month] = v;
    }
    if (Object.keys(balances).length === 0) continue;
    banks.push({ entity: name, type: 'credit_line', limit: 0, balances });
  }

  const months = [...new Set(monthCols.map(m => m.month))].sort();
  return { banks, months };
}

// ---- Public API ----

export async function readLanzadera(
  token: string,
  sourceId: string,
  mimeType: string,
): Promise<LanzaderaData> {
  let src: RawSource;
  if (mimeType === XLSX_MIME) src = await readXlsxSource(token, sourceId);
  else if (mimeType === GOOGLE_SHEET_MIME) src = await readSheetsSource(token, sourceId);
  else throw new Error(`Formato no soportado: ${mimeType}`);

  const config = extractConfig(src.instrucciones);
  const categories = extractCategories(src.categorias);
  const transactions = extractTransactions(src.movimientos);
  const { banks, months } = extractBanks(src.saldoBancos);
  return { config, categories, transactions, banks, months };
}

// ---- Writer (to our target Sheet) ----

const CONFIG_HEADERS = ['Property', 'Value'];
const CATEGORIES_HEADERS = ['Type', 'Group', 'Subgroup', 'Active'];
const TRANSACTIONS_HEADERS = ['Date', 'Bank', 'Description', 'Amount', 'Type', 'Group', 'Subgroup'];

export async function writeLanzaderaToTarget(
  token: string,
  targetId: string,
  data: LanzaderaData,
): Promise<void> {
  // ---- config ----
  const configRows: (string | number)[][] = [CONFIG_HEADERS];
  const cfg = data.config;
  if (cfg.companyName) configRows.push(['Company Name', cfg.companyName]);
  if (cfg.startDate) configRows.push(['Start Date', cfg.startDate]);
  if (cfg.vatSales !== undefined) configRows.push(['VAT Sales', cfg.vatSales]);
  if (cfg.vatExpenses !== undefined) configRows.push(['VAT Expenses', cfg.vatExpenses]);
  if (cfg.forecastMode) configRows.push(['Forecast Mode', cfg.forecastMode]);
  await writeRange({ token, spreadsheetId: targetId, range: 'config!A1', values: configRows });

  // ---- categories ----
  const catRows: (string | number)[][] = [CATEGORIES_HEADERS];
  for (const cat of data.categories) {
    catRows.push([cat.type, cat.group, cat.subgroup, 'TRUE']);
  }
  await writeRange({ token, spreadsheetId: targetId, range: 'categories!A1', values: catRows });

  // ---- transactions ----
  await writeRange({
    token,
    spreadsheetId: targetId,
    range: 'transactions!A1:G1',
    values: [TRANSACTIONS_HEADERS],
  });
  if (data.transactions.length) {
    const txRows = data.transactions.map(t => [
      t.date, t.bank, t.description, t.amount, t.type, t.group, t.subgroup,
    ]);
    await appendRows({ token, spreadsheetId: targetId, range: 'transactions!A1', values: txRows });
  }

  // ---- bank_balances ----
  const months = data.months.length ? data.months : defaultMonths();
  const bankHeader = ['Entity', 'Type', 'Limit', ...months];
  const bankRows = data.banks.map(b => [
    b.entity,
    b.type,
    b.limit,
    ...months.map(m => b.balances[m] ?? ''),
  ]);
  await writeRange({
    token,
    spreadsheetId: targetId,
    range: 'bank_balances!A1',
    values: [bankHeader, ...bankRows],
  });
}

function defaultMonths(count = 18): string[] {
  const cols: string[] = [];
  const now = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    cols.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return cols;
}
