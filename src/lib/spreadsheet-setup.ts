import { Category, UserSettings } from './types';
import {
  updateSheetData,
  appendRows,
} from './google/sheets';

function generateMonthColumns(startDate: string, months: number): string[] {
  const columns: string[] = [];
  const start = new Date(startDate);

  for (let i = 0; i < months; i++) {
    const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    columns.push(`${year}-${month}`);
  }

  return columns;
}

export async function initializeSpreadsheet(
  accessToken: string,
  spreadsheetId: string,
  settings: UserSettings,
  categories: Category[]
): Promise<void> {
  const monthColumns = generateMonthColumns(settings.start_date, 18);

  // Write config sheet
  const configData = [
    ['Property', 'Value'],
    ['Company Name', settings.company_name],
    ['Start Date', settings.start_date],
    ['VAT Sales', String(settings.vat_sales)],
    ['VAT Expenses', String(settings.vat_expenses)],
    ['Forecast Mode', settings.forecast_mode],
  ];

  await updateSheetData(accessToken, spreadsheetId, 'config!A1', configData);

  // Write categories sheet
  const categoriesData = [
    ['Type', 'Group', 'Subgroup', 'Active'],
    ...categories.map((cat) => [
      cat.type,
      cat.group,
      cat.subgroup,
      String(cat.active),
    ]),
  ];

  await updateSheetData(
    accessToken,
    spreadsheetId,
    'categories!A1',
    categoriesData
  );

  // Write currencies sheet with EUR rates as 1 for all months
  const currenciesData = [
    ['Currency', ...monthColumns],
    ['EUR', ...monthColumns.map(() => '1')],
  ];

  await updateSheetData(
    accessToken,
    spreadsheetId,
    'currencies!A1',
    currenciesData
  );

  // Write bank_balances headers
  const bankBalancesHeaders = [
    ['Entity', 'Type', 'Limit', ...monthColumns],
  ];

  await updateSheetData(
    accessToken,
    spreadsheetId,
    'bank_balances!A1',
    bankBalancesHeaders
  );

  // Write transactions headers
  const transactionsHeaders = [
    [
      'ID',
      'Bank',
      'Date',
      'Description',
      'Amount',
      'Currency',
      'Type',
      'Group',
      'Subgroup',
    ],
  ];

  await updateSheetData(
    accessToken,
    spreadsheetId,
    'transactions!A1',
    transactionsHeaders
  );

  // Write metrics headers
  const metricsHeaders = [
    ['Metric', 'B2B', 'B2C'],
  ];

  await updateSheetData(
    accessToken,
    spreadsheetId,
    'metrics!A1',
    metricsHeaders
  );
}
