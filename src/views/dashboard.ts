import { el } from '../dom.ts';
import { pageHeader } from '../layout.ts';
import { icons } from '../icons.ts';
import {
  aggregateByMonth,
  bankSummary,
  currentMonthKey,
  topCategoriesForMonth,
  type CategoryTotal,
} from '../cashflow.ts';
import type { Config } from '../types.ts';
import type { TransactionRow } from '../transactions.ts';
import type { CurrencyRow } from '../currencies.ts';
import type { BankBalanceRow } from '../bank-balances.ts';

export interface DashboardDeps {
  config: Config;
  spreadsheetId: string;
  transactions: TransactionRow[];
  currencies: CurrencyRow[];
  banks: BankBalanceRow[];
  months: string[];
}

export function renderDashboard(deps: DashboardDeps): HTMLElement {
  const currentKey = currentMonthKey();
  const monthlies = aggregateByMonth(deps.transactions, deps.currencies, deps.months);
  const currentAgg = monthlies.find(m => m.month === currentKey)
    ?? { month: currentKey, inflow: 0, outflow: 0, net: 0, count: 0 };

  const banks = bankSummary(deps.banks, currentKey);
  const topCats = topCategoriesForMonth(deps.transactions, deps.currencies, currentKey);

  const openLink = el('a', {
    href: `https://docs.google.com/spreadsheets/d/${deps.spreadsheetId}`,
    target: '_blank',
    rel: 'noopener',
    style: 'display:inline-flex;align-items:center;gap:.375rem;',
  }, [icons.external(), el('span', { textContent: 'Abrir Google Sheets' })]);

  return el('div', {}, [
    pageHeader(
      `Hola, ${deps.config.companyName}`,
      `Resumen del mes ${formatMonth(currentKey)}.`,
      openLink,
    ),
    el('div', { className: 'stats' }, [
      stat('Cobros del mes', formatEur(currentAgg.inflow), `${countInflow(currentAgg)} movimientos`, 'ok'),
      stat('Pagos del mes', formatEur(Math.abs(currentAgg.outflow)), `${countOutflow(currentAgg)} movimientos`, 'danger'),
      stat('Neto mensual', formatEur(currentAgg.net), currentAgg.net >= 0 ? 'Saldo positivo' : 'Saldo negativo', currentAgg.net >= 0 ? 'ok' : 'danger'),
      stat('Saldo total bancos', formatEur(banks.total), bankLineDetail(banks)),
    ]),
    el('div', { style: 'display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1rem;' }, [
      renderTopCategories('Cobros principales', topCats.inflows, 'ok'),
      renderTopCategories('Pagos principales', topCats.outflows, 'danger'),
    ]),
    el('div', { className: 'card' }, [
      el('h2', { className: 'card__title', textContent: 'Flujo de caja mensual' }),
      renderMonthlyTable(monthlies, currentKey),
    ]),
  ]);
}

function stat(label: string, value: string, sub: string, tone?: 'ok' | 'danger'): HTMLElement {
  const valueCls = tone ? `stat__value stat__value--${tone}` : 'stat__value';
  return el('div', { className: 'stat' }, [
    el('div', { className: 'stat__label', textContent: label }),
    el('div', { className: valueCls, textContent: value }),
    el('div', { className: 'stat__sub', textContent: sub }),
  ]);
}

function bankLineDetail(b: ReturnType<typeof bankSummary>): string {
  if (b.creditLimit === 0) return `${formatEur(b.bankTotal)} en cuentas`;
  return `${formatEur(b.bankTotal)} cuentas − ${formatEur(b.creditUsed)} credito`;
}

function countInflow(agg: { count: number; inflow: number }): number {
  return agg.inflow > 0 ? Math.max(1, Math.round(agg.count / 2)) : 0;
}

function countOutflow(agg: { count: number; outflow: number }): number {
  return agg.outflow < 0 ? Math.max(1, Math.round(agg.count / 2)) : 0;
}

function renderTopCategories(title: string, items: CategoryTotal[], tone: 'ok' | 'danger'): HTMLElement {
  const body = items.length === 0
    ? [el('div', { className: 'state', style: 'padding:1rem 0;', textContent: 'Sin datos este mes.' })]
    : items.map(c => el('div', {
        style: 'display:flex;justify-content:space-between;padding:.5rem 0;border-bottom:1px solid var(--border);gap:1rem;',
      }, [
        el('div', { style: 'min-width:0;' }, [
          el('div', { style: 'font-weight:500;color:var(--fg);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;', textContent: c.subgroup }),
          el('div', { style: 'font-size:.75rem;color:var(--muted);', textContent: `${c.group} · ${c.count} mov` }),
        ]),
        el('div', {
          style: `font-variant-numeric:tabular-nums;font-weight:600;color:var(--${tone});white-space:nowrap;`,
          textContent: formatEur(Math.abs(c.total)),
        }),
      ]));

  const lastChild = body[body.length - 1] as HTMLElement | undefined;
  if (lastChild && 'style' in lastChild) lastChild.style.borderBottom = 'none';

  return el('div', { className: 'card' }, [
    el('h2', { className: 'card__title', textContent: title }),
    ...body,
  ]);
}

function renderMonthlyTable(
  monthlies: ReturnType<typeof aggregateByMonth>,
  currentKey: string,
): HTMLElement {
  let running = 0;

  const thead = el('thead', {}, [
    el('tr', {}, [
      el('th', { textContent: 'Mes' }),
      el('th', { style: 'text-align:right;', textContent: 'Cobros' }),
      el('th', { style: 'text-align:right;', textContent: 'Pagos' }),
      el('th', { style: 'text-align:right;', textContent: 'Neto' }),
      el('th', { style: 'text-align:right;', textContent: 'Acumulado' }),
    ]),
  ]);

  const tbody = el('tbody', {}, monthlies.map(m => {
    running += m.net;
    const isCurrent = m.month === currentKey;
    const netCls = m.net >= 0 ? 'tx-amount--ok' : 'tx-amount--danger';
    const runCls = running >= 0 ? 'tx-amount--ok' : 'tx-amount--danger';
    const rowStyle = isCurrent ? 'background:var(--accent-soft);' : '';

    return el('tr', { style: rowStyle }, [
      el('td', {
        style: `font-variant-numeric:tabular-nums;${isCurrent ? 'font-weight:600;color:var(--accent);' : ''}`,
        textContent: formatMonth(m.month),
      }),
      el('td', { className: 'tx-amount', style: `color:${m.inflow > 0 ? 'var(--ok)' : 'var(--muted)'};`, textContent: m.inflow ? formatEur(m.inflow) : '—' }),
      el('td', { className: 'tx-amount', style: `color:${m.outflow < 0 ? 'var(--danger)' : 'var(--muted)'};`, textContent: m.outflow ? formatEur(Math.abs(m.outflow)) : '—' }),
      el('td', { className: `tx-amount ${m.net !== 0 ? netCls : ''}`, textContent: m.net ? formatEur(m.net) : '—' }),
      el('td', { className: `tx-amount ${runCls}`, textContent: formatEur(running) }),
    ]);
  }));

  return el('div', { style: 'margin:-.25rem -1.5rem -1.25rem;padding:0;overflow-x:auto;' }, [
    el('table', { className: 'tx-table' }, [thead, tbody]),
  ]);
}

function formatEur(n: number): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(n);
}

function formatMonth(key: string): string {
  const [y, m] = key.split('-');
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' }).replace('.', '');
}
