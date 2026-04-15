const SHEETS_API = 'https://sheets.googleapis.com/v4/spreadsheets';
const DRIVE_API = 'https://www.googleapis.com/drive/v3/files';

interface SheetsRequest {
  token: string;
  spreadsheetId: string;
  range: string;
}

export async function readRange({ token, spreadsheetId, range }: SheetsRequest): Promise<string[][]> {
  const url = `${SHEETS_API}/${spreadsheetId}/values/${encodeURIComponent(range)}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Sheets read failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return (data.values ?? []) as string[][];
}

export async function writeRange({
  token,
  spreadsheetId,
  range,
  values,
}: SheetsRequest & { values: (string | number)[][] }): Promise<void> {
  const url = `${SHEETS_API}/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`;
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ values }),
  });
  if (!res.ok) throw new Error(`Sheets write failed: ${res.status} ${await res.text()}`);
}

export async function appendRows({
  token,
  spreadsheetId,
  range,
  values,
}: SheetsRequest & { values: (string | number)[][] }): Promise<void> {
  const url = `${SHEETS_API}/${spreadsheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ values }),
  });
  if (!res.ok) throw new Error(`Sheets append failed: ${res.status} ${await res.text()}`);
}

export async function createSpreadsheet(token: string, title: string): Promise<string> {
  const res = await fetch(SHEETS_API, {
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
  });
  if (!res.ok) throw new Error(`Create failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.spreadsheetId as string;
}

export async function findSpreadsheet(token: string, title: string): Promise<string | null> {
  const q = encodeURIComponent(`name='${title}' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false`);
  const res = await fetch(`${DRIVE_API}?q=${q}&fields=files(id,name)`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Drive search failed: ${res.status}`);
  const data = await res.json();
  return data.files?.[0]?.id ?? null;
}
