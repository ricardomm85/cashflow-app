import { parseCellNumber, readRange, writeRange } from './sheets.ts';
import type { Config } from './types.ts';

const PROPS: Array<[keyof Config, string]> = [
  ['companyName', 'Company Name'],
  ['startDate', 'Start Date'],
  ['vatSales', 'VAT Sales'],
  ['vatExpenses', 'VAT Expenses'],
  ['forecastMode', 'Forecast Mode'],
];

const REQUIRED: Array<keyof Config> = ['companyName', 'startDate', 'vatSales', 'vatExpenses', 'forecastMode'];

export async function readConfig(token: string, spreadsheetId: string): Promise<Partial<Config>> {
  const rows = await readRange({ token, spreadsheetId, range: 'config!A2:B' });
  const byLabel = new Map(rows.map(r => [r[0], r[1]] as const));
  const out: Partial<Config> = {};
  for (const [key, label] of PROPS) {
    const raw = byLabel.get(label);
    if (raw === undefined || raw === '') continue;
    if (key === 'vatSales' || key === 'vatExpenses') {
      out[key] = parseCellNumber(raw);
    } else {
      (out as Record<string, string>)[key] = raw;
    }
  }
  return out;
}

export async function writeConfig(token: string, spreadsheetId: string, config: Config): Promise<void> {
  const values: (string | number)[][] = PROPS.map(([key, label]) => [label, config[key]]);
  await writeRange({ token, spreadsheetId, range: 'config!A2:B6', values });
}

export function isConfigComplete(config: Partial<Config>): config is Config {
  return REQUIRED.every(k => {
    const v = config[k];
    return v !== undefined && v !== '' && !(typeof v === 'number' && Number.isNaN(v));
  });
}
