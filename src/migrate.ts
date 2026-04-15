import { appendRows, readRange, writeRange } from './sheets.ts';

const SHEETS_API = 'https://sheets.googleapis.com/v4/spreadsheets';

const VERSION_KEY = 'Schema Version';
const LOCK_KEY = 'Schema Migrating';
const LOCK_STALE_MS = 2 * 60 * 1000; // 2 minutes

interface Migration {
  version: number;
  description: string;
  run: (token: string, spreadsheetId: string, sheets: SheetInfo[]) => Promise<void>;
}

interface SheetInfo {
  title: string;
  sheetId: number;
}

type ConfigMap = Map<string, { value: string; row: number }>;

const migrations: Migration[] = [
  {
    version: 1,
    description: 'Remove currencies sheet and transaction currency columns',
    run: async (token, spreadsheetId, sheets) => {
      await deleteSheetIfExists(token, spreadsheetId, 'currencies', sheets);
      await migrateTxColumns(token, spreadsheetId, sheets);
    },
  },
];

// --- config helpers ---

async function readConfigMap(token: string, spreadsheetId: string): Promise<ConfigMap> {
  const rows = await readRange({ token, spreadsheetId, range: 'config!A:B' });
  const map: ConfigMap = new Map();
  for (let i = 0; i < rows.length; i++) {
    const key = rows[i]?.[0];
    if (key) map.set(key, { value: rows[i]![1] ?? '', row: i + 1 });
  }
  return map;
}

function versionFrom(config: ConfigMap): number {
  const entry = config.get(VERSION_KEY);
  return entry ? Number(entry.value) || 0 : 0;
}

async function setConfigKey(
  token: string,
  spreadsheetId: string,
  config: ConfigMap,
  key: string,
  value: string | number,
): Promise<void> {
  const entry = config.get(key);
  if (entry) {
    await writeRange({ token, spreadsheetId, range: `config!B${entry.row}`, values: [[value]] });
    entry.value = String(value);
  } else {
    await appendRows({ token, spreadsheetId, range: 'config!A1', values: [[key, value]] });
    const row = config.size + 1;
    config.set(key, { value: String(value), row });
  }
}

// --- lock with nonce + staleness ---

function parseLock(value: string): { nonce: string; ts: number } | null {
  if (!value || value === 'false') return null;
  const sep = value.indexOf('|');
  if (sep < 0) return null;
  return { nonce: value.slice(0, sep), ts: Number(value.slice(sep + 1)) };
}

async function acquireLock(
  token: string,
  spreadsheetId: string,
  config: ConfigMap,
): Promise<boolean> {
  const entry = config.get(LOCK_KEY);
  const existing = entry ? parseLock(entry.value) : null;

  if (existing && (Date.now() - existing.ts) < LOCK_STALE_MS) return false;

  const nonce = crypto.randomUUID();
  const lockVal = `${nonce}|${Date.now()}`;
  await setConfigKey(token, spreadsheetId, config, LOCK_KEY, lockVal);

  // Re-read to confirm we won the race
  const fresh = await readConfigMap(token, spreadsheetId);
  const check = fresh.get(LOCK_KEY);
  return check?.value === lockVal;
}

async function releaseLock(
  token: string,
  spreadsheetId: string,
  config: ConfigMap,
): Promise<void> {
  await setConfigKey(token, spreadsheetId, config, LOCK_KEY, 'false');
}

// --- sheet metadata ---

async function getSheetMeta(token: string, spreadsheetId: string): Promise<SheetInfo[]> {
  const res = await fetch(
    `${SHEETS_API}/${spreadsheetId}?fields=sheets.properties`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!res.ok) throw new Error(`Meta failed: ${res.status}`);
  const data = await res.json();
  if (!Array.isArray(data.sheets)) {
    throw new Error('Unexpected sheet metadata response');
  }
  return data.sheets.map((s: { properties?: { title?: string; sheetId?: number } }) => {
    const p = s.properties;
    if (!p?.title || typeof p.sheetId !== 'number') {
      throw new Error('Malformed sheet metadata entry');
    }
    return { title: p.title, sheetId: p.sheetId };
  });
}

// --- public entry point ---

export async function runMigrations(token: string, spreadsheetId: string): Promise<void> {
  const config = await readConfigMap(token, spreadsheetId);
  const current = versionFrom(config);

  const pending = migrations.filter(m => m.version > current).sort((a, b) => a.version - b.version);
  if (!pending.length) return;

  const locked = await acquireLock(token, spreadsheetId, config);
  if (!locked) {
    throw new Error('Migracion en curso desde otra pestana. Reintenta en unos segundos.');
  }

  // Re-read after lock — another session may have finished already
  let freshConfig = config;
  try {
    freshConfig = await readConfigMap(token, spreadsheetId);
    const freshVersion = versionFrom(freshConfig);
    const stillPending = pending.filter(m => m.version > freshVersion);
    if (!stillPending.length) return;

    const sheets = await getSheetMeta(token, spreadsheetId);
    for (const m of stillPending) {
      await m.run(token, spreadsheetId, sheets);
      await setConfigKey(token, spreadsheetId, freshConfig, VERSION_KEY, m.version);
    }
  } finally {
    try {
      await releaseLock(token, spreadsheetId, freshConfig);
    } catch (e) {
      console.error('Failed to release migration lock:', e);
    }
  }
}

// --- migration helpers ---

async function deleteSheetIfExists(
  token: string,
  spreadsheetId: string,
  title: string,
  sheets: SheetInfo[],
): Promise<void> {
  const sheet = sheets.find(s => s.title === title);
  if (!sheet) return;

  const res = await fetch(`${SHEETS_API}/${spreadsheetId}:batchUpdate`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      requests: [{ deleteSheet: { sheetId: sheet.sheetId } }],
    }),
  });
  if (!res.ok) throw new Error(`Delete sheet "${title}" failed: ${res.status} ${await res.text()}`);
}

async function migrateTxColumns(
  token: string,
  spreadsheetId: string,
  sheets: SheetInfo[],
): Promise<void> {
  // Old: Date(0), Bank(1), Description(2), Amount(3), Currency(4), Type(5), Group(6), Subgroup(7), ExchangeRate(8)
  // New: Date(0), Bank(1), Description(2), Amount(3), Type(4), Group(5), Subgroup(6)
  const rows = await readRange({ token, spreadsheetId, range: 'transactions!A1:I' });
  if (!rows.length) return;

  const header = rows[0]!;
  if (header[4]?.toLowerCase() !== 'currency') return; // already migrated

  const txSheet = sheets.find(s => s.title === 'transactions');
  if (!txSheet) return;

  const newRows = rows.map(row => [
    row[0] ?? '',
    row[1] ?? '',
    row[2] ?? '',
    row[3] ?? '',
    row[5] ?? '', // Type
    row[6] ?? '', // Group
    row[7] ?? '', // Subgroup
  ]);

  const rowData = newRows.map(row => ({
    values: row.map(cell => ({
      userEnteredValue: { stringValue: String(cell) },
    })),
  }));

  // Atomic batchUpdate: overwrite A:G + delete columns H-I in one request
  const res = await fetch(`${SHEETS_API}/${spreadsheetId}:batchUpdate`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      requests: [
        {
          updateCells: {
            rows: rowData,
            fields: 'userEnteredValue',
            start: { sheetId: txSheet.sheetId, rowIndex: 0, columnIndex: 0 },
          },
        },
        {
          deleteDimension: {
            range: {
              sheetId: txSheet.sheetId,
              dimension: 'COLUMNS',
              startIndex: 7,
              endIndex: 9,
            },
          },
        },
      ],
    }),
  });
  if (!res.ok) throw new Error(`Migrate tx columns failed: ${res.status} ${await res.text()}`);
}
