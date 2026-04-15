const SHEETS_API = 'https://sheets.googleapis.com/v4/spreadsheets';
const DRIVE_API = 'https://www.googleapis.com/drive/v3/files';

interface SheetsRequest {
  token: string;
  spreadsheetId: string;
  range: string;
}

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

export async function fetchWithRetry(
  url: string,
  init: RequestInit,
  label: string,
  maxRetries = 4,
): Promise<Response> {
  let delay = 800;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const res = await fetch(url, init);
    if (res.status !== 429 && res.status < 500) return res;
    if (attempt === maxRetries) {
      console.error(`${label} failed: ${res.status}`);
      throw new Error(`${label} failed (${res.status}). Intenta de nuevo.`);
    }
    const retryAfter = Number(res.headers.get('Retry-After')) * 1000;
    const wait = retryAfter > 0 ? retryAfter : delay + Math.random() * 300;
    await sleep(wait);
    delay *= 2;
  }
  throw new Error(`${label} failed: exhausted retries`);
}

export async function readRange({ token, spreadsheetId, range }: SheetsRequest): Promise<string[][]> {
  const url = `${SHEETS_API}/${spreadsheetId}/values/${encodeURIComponent(range)}`;
  const res = await fetchWithRetry(url, { headers: { Authorization: `Bearer ${token}` } }, 'Sheets read');
  if (!res.ok) { console.error('Sheets read failed:', res.status); throw new Error(`Error al leer datos (${res.status}).`); }
  const data = await res.json();
  return (data.values ?? []) as string[][];
}

export async function batchRead({
  token,
  spreadsheetId,
  ranges,
}: {
  token: string;
  spreadsheetId: string;
  ranges: string[];
}): Promise<string[][][]> {
  const qs = ranges.map(r => `ranges=${encodeURIComponent(r)}`).join('&');
  const url = `${SHEETS_API}/${spreadsheetId}/values:batchGet?${qs}`;
  const res = await fetchWithRetry(url, { headers: { Authorization: `Bearer ${token}` } }, 'Sheets batchGet');
  if (!res.ok) { console.error('Sheets batchGet failed:', res.status); throw new Error(`Error al leer datos (${res.status}).`); }
  const data = await res.json() as { valueRanges?: { values?: string[][] }[] };
  return (data.valueRanges ?? []).map(vr => (vr.values ?? []) as string[][]);
}

export async function writeRange({
  token,
  spreadsheetId,
  range,
  values,
}: SheetsRequest & { values: (string | number)[][] }): Promise<void> {
  const url = `${SHEETS_API}/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`;
  const res = await fetchWithRetry(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ values }),
  }, 'Sheets write');
  if (!res.ok) { console.error('Sheets write failed:', res.status); throw new Error(`Error al guardar datos (${res.status}).`); }
}

export async function appendRows({
  token,
  spreadsheetId,
  range,
  values,
}: SheetsRequest & { values: (string | number)[][] }): Promise<void> {
  const url = `${SHEETS_API}/${spreadsheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED`;
  const res = await fetchWithRetry(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ values }),
  }, 'Sheets append');
  if (!res.ok) { console.error('Sheets append failed:', res.status); throw new Error(`Error al agregar datos (${res.status}).`); }
}

export async function createSpreadsheet(token: string, title: string): Promise<string> {
  const res = await fetchWithRetry(SHEETS_API, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: { title },
      sheets: [
        { properties: { title: 'config' } },
        { properties: { title: 'categories' } },
        { properties: { title: 'transactions' } },
        { properties: { title: 'bank_balances' } },
        { properties: { title: 'currencies' } },
      ],
    }),
  }, 'Create spreadsheet');
  if (!res.ok) { console.error('Create spreadsheet failed:', res.status); throw new Error(`Error al crear hoja (${res.status}).`); }
  const data = await res.json();
  return data.spreadsheetId as string;
}

export async function findSpreadsheet(token: string, title: string): Promise<string | null> {
  const q = encodeURIComponent(`name='${title}' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false`);
  const res = await fetchWithRetry(`${DRIVE_API}?q=${q}&fields=files(id,name)`, {
    headers: { Authorization: `Bearer ${token}` },
  }, 'Drive search');
  if (!res.ok) throw new Error(`Drive search failed: ${res.status}`);
  const data = await res.json();
  return data.files?.[0]?.id ?? null;
}
