import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

export function getGoogleAuth(accessToken: string): OAuth2Client {
  const oauth2Client = new OAuth2Client(
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI
  );

  oauth2Client.setCredentials({
    access_token: accessToken,
  });

  return oauth2Client;
}

export async function createSpreadsheet(
  accessToken: string,
  name: string
): Promise<string> {
  const auth = getGoogleAuth(accessToken);
  const sheets = google.sheets({ version: 'v4', auth });

  const response = await sheets.spreadsheets.create({
    requestBody: {
      properties: {
        title: name,
      },
      sheets: [
        { properties: { title: 'config' } },
        { properties: { title: 'categories' } },
        { properties: { title: 'currencies' } },
        { properties: { title: 'bank_balances' } },
        { properties: { title: 'transactions' } },
        { properties: { title: 'metrics' } },
      ],
    },
  });

  if (!response.data.spreadsheetId) {
    throw new Error('Failed to create spreadsheet');
  }

  return response.data.spreadsheetId;
}

export async function getSheetData(
  accessToken: string,
  spreadsheetId: string,
  range: string
): Promise<string[][]> {
  const auth = getGoogleAuth(accessToken);
  const sheets = google.sheets({ version: 'v4', auth });

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
  });

  return (response.data.values as string[][]) || [];
}

export async function updateSheetData(
  accessToken: string,
  spreadsheetId: string,
  range: string,
  values: string[][]
): Promise<void> {
  const auth = getGoogleAuth(accessToken);
  const sheets = google.sheets({ version: 'v4', auth });

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range,
    valueInputOption: 'RAW',
    requestBody: {
      values,
    },
  });
}

export async function appendRows(
  accessToken: string,
  spreadsheetId: string,
  sheetName: string,
  rows: string[][]
): Promise<void> {
  const auth = getGoogleAuth(accessToken);
  const sheets = google.sheets({ version: 'v4', auth });

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: sheetName,
    valueInputOption: 'RAW',
    requestBody: {
      values: rows,
    },
  });
}

export async function deleteRows(
  accessToken: string,
  spreadsheetId: string,
  sheetId: number,
  startIndex: number,
  endIndex: number
): Promise<void> {
  const auth = getGoogleAuth(accessToken);
  const sheets = google.sheets({ version: 'v4', auth });

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId,
              dimension: 'ROWS',
              startIndex,
              endIndex,
            },
          },
        },
      ],
    },
  });
}

export async function batchUpdate(
  accessToken: string,
  spreadsheetId: string,
  requests: any[]
): Promise<void> {
  const auth = getGoogleAuth(accessToken);
  const sheets = google.sheets({ version: 'v4', auth });

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests,
    },
  });
}
