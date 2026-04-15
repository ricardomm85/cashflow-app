import { appendRows, writeRange } from './sheets.ts';

const CONFIG_HEADERS = ['Property', 'Value'];
const CATEGORIES_HEADERS = ['Type', 'Group', 'Subgroup', 'Active'];
const TRANSACTIONS_HEADERS = [
  'Date', 'Bank', 'Description', 'Amount', 'Currency', 'Type', 'Group', 'Subgroup', 'ExchangeRate',
];

function monthColumns(count = 18): string[] {
  const cols: string[] = [];
  const now = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    cols.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return cols;
}

const DEFAULT_CATEGORIES: (string | boolean)[][] = [
  ['cobros', 'Ventas', 'Productos', true],
  ['cobros', 'Ventas', 'Servicios', true],
  ['cobros', 'Ventas', 'Suscripciones', true],
  ['cobros', 'Ventas', 'Licencias', true],
  ['cobros', 'Otros ingresos', 'Subvenciones', true],
  ['cobros', 'Otros ingresos', 'Intereses', true],
  ['cobros', 'Otros ingresos', 'Devoluciones Hacienda', true],
  ['cobros', 'Financieros', 'Prestamos recibidos', true],
  ['cobros', 'Financieros', 'Ampliacion capital', true],
  ['pagos', 'Personal', 'Nominas', true],
  ['pagos', 'Personal', 'Seguridad Social', true],
  ['pagos', 'Personal', 'Autonomos', true],
  ['pagos', 'Personal', 'Formacion', true],
  ['pagos', 'Personal', 'Dietas y viajes', true],
  ['pagos', 'Proveedores', 'Materias primas', true],
  ['pagos', 'Proveedores', 'Servicios externos', true],
  ['pagos', 'Proveedores', 'Subcontratas', true],
  ['pagos', 'Oficina', 'Alquiler', true],
  ['pagos', 'Oficina', 'Suministros', true],
  ['pagos', 'Oficina', 'Limpieza', true],
  ['pagos', 'Oficina', 'Material oficina', true],
  ['pagos', 'Tecnologia', 'Software SaaS', true],
  ['pagos', 'Tecnologia', 'Hosting y dominios', true],
  ['pagos', 'Tecnologia', 'Hardware', true],
  ['pagos', 'Tecnologia', 'Telecomunicaciones', true],
  ['pagos', 'Marketing', 'Publicidad online', true],
  ['pagos', 'Marketing', 'Eventos', true],
  ['pagos', 'Marketing', 'Contenidos', true],
  ['pagos', 'Marketing', 'Branding', true],
  ['pagos', 'Impuestos', 'IVA', true],
  ['pagos', 'Impuestos', 'IRPF', true],
  ['pagos', 'Impuestos', 'Sociedades', true],
  ['pagos', 'Impuestos', 'Otros tributos', true],
  ['pagos', 'Financieros', 'Intereses prestamos', true],
  ['pagos', 'Financieros', 'Comisiones bancarias', true],
  ['pagos', 'Financieros', 'Devolucion prestamos', true],
  ['pagos', 'Financieros', 'Leasing', true],
  ['pagos', 'Profesionales', 'Asesoria', true],
  ['pagos', 'Profesionales', 'Legal', true],
  ['pagos', 'Profesionales', 'Consultoria', true],
  ['pagos', 'Seguros', 'Responsabilidad civil', true],
  ['pagos', 'Seguros', 'Salud', true],
  ['pagos', 'Seguros', 'Otros seguros', true],
  ['otros', 'Movimientos internos', 'Traspasos entre cuentas', true],
  ['otros', 'Movimientos internos', 'Cambio divisa', true],
  ['otros', 'Ajustes', 'Ajuste saldo inicial', true],
  ['otros', 'Ajustes', 'Correccion', true],
  ['otros', 'Inversion', 'Inmovilizado', true],
  ['otros', 'Inversion', 'Inversiones financieras', true],
  ['otros', 'Dividendos', 'Reparto dividendos', true],
  ['otros', 'Socios', 'Aportaciones socios', true],
];

export async function seedSpreadsheet(token: string, spreadsheetId: string): Promise<void> {
  const months = monthColumns();

  await writeRange({ token, spreadsheetId, range: 'config!A1:B1', values: [CONFIG_HEADERS] });

  await writeRange({ token, spreadsheetId, range: 'categories!A1:D1', values: [CATEGORIES_HEADERS] });
  await appendRows({
    token,
    spreadsheetId,
    range: 'categories!A1',
    values: DEFAULT_CATEGORIES.map(row => row.map(v => (typeof v === 'boolean' ? String(v).toUpperCase() : v))),
  });

  await writeRange({
    token,
    spreadsheetId,
    range: 'transactions!A1:I1',
    values: [TRANSACTIONS_HEADERS],
  });

  await writeRange({
    token,
    spreadsheetId,
    range: 'bank_balances!A1',
    values: [['Entity', 'Type', 'Limit', ...months]],
  });

  await writeRange({
    token,
    spreadsheetId,
    range: 'currencies!A1',
    values: [
      ['Currency', ...months],
      ['EUR', ...months.map(() => 1)],
    ],
  });
}
