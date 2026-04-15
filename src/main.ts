import type { Session } from '@supabase/supabase-js';
import {
  getSession,
  onAuthChange,
  signInWithGoogle,
  signOut,
  getGoogleAccessToken,
  getSpreadsheetId,
  setSpreadsheetId,
} from './auth.ts';
import { createSpreadsheet, findSpreadsheet } from './sheets.ts';
import { seedSpreadsheet } from './seed.ts';
import { isConfigComplete, readConfig, writeConfig } from './config.ts';
import type { Config } from './types.ts';
import { currentRoute, navigate, onRouteChange } from './router.ts';
import { renderShell } from './layout.ts';
import { el } from './dom.ts';
import { renderConfigView } from './views/config.ts';
import { renderDashboard } from './views/dashboard.ts';
import { renderTransactions } from './views/transactions.ts';
import { addTransaction, deleteTransaction, listTransactions, updateTransaction, type TransactionRow } from './transactions.ts';
import { addCategory, listCategories, setCategoryActive, updateCategory, type CategoryRow } from './categories.ts';
import { renderCategories } from './views/categories.ts';
import { addEntity, readBankBalances, updateBalance, type BankBalancesData } from './bank-balances.ts';
import { renderBankBalances } from './views/bank-balances.ts';
import { addCurrency, readCurrencies, updateRate, type CurrenciesData } from './currencies.ts';
import { renderCurrencies } from './views/currencies.ts';
import type { BankBalance, Category, Transaction } from './types.ts';

import { initTheme } from './theme.ts';

initTheme();

const SHEET_TITLE = 'Cashflow';
const app = document.getElementById('app')!;

interface Cache {
  transactions: TransactionRow[] | null;
  categories: CategoryRow[] | null;
  banks: BankBalancesData | null;
  currencies: CurrenciesData | null;
}

interface AppState {
  session: Session;
  spreadsheetId: string;
  config: Config;
  cache: Cache;
}

function emptyCache(): Cache {
  return { transactions: null, categories: null, banks: null, currencies: null };
}

function invalidate(state: AppState, ...keys: (keyof Cache)[]): void {
  for (const k of keys) state.cache[k] = null as never;
}

async function loadTransactions(state: AppState, force = false): Promise<TransactionRow[]> {
  if (!force && state.cache.transactions) return state.cache.transactions;
  const token = await getGoogleAccessToken();
  const data = await listTransactions(token, state.spreadsheetId);
  state.cache.transactions = data;
  return data;
}

async function loadCategories(state: AppState, force = false): Promise<CategoryRow[]> {
  if (!force && state.cache.categories) return state.cache.categories;
  const token = await getGoogleAccessToken();
  const data = await listCategories(token, state.spreadsheetId);
  state.cache.categories = data;
  return data;
}

async function loadBanks(state: AppState, force = false): Promise<BankBalancesData> {
  if (!force && state.cache.banks) return state.cache.banks;
  const token = await getGoogleAccessToken();
  const data = await readBankBalances(token, state.spreadsheetId);
  state.cache.banks = data;
  return data;
}

async function loadCurrencies(state: AppState, force = false): Promise<CurrenciesData> {
  if (!force && state.cache.currencies) return state.cache.currencies;
  const token = await getGoogleAccessToken();
  const data = await readCurrencies(token, state.spreadsheetId);
  state.cache.currencies = data;
  return data;
}

function renderAuth(): void {
  app.replaceChildren(
    el('div', { className: 'auth' }, [
      el('div', { className: 'auth__card' }, [
        el('div', { className: 'auth__mark', textContent: 'C' }),
        el('h1', { textContent: 'Cashflow' }),
        el('p', { textContent: 'Control de caja para pymes. Tus datos viven en tu Google Sheets.' }),
        el('button', {
          className: 'btn btn--accent',
          textContent: 'Iniciar sesion con Google',
          onclick: () => signInWithGoogle().catch(console.error),
        }),
      ]),
    ]),
  );
}

function renderFullScreenState(msg: string, isError = false): void {
  app.replaceChildren(
    el('div', { className: 'auth' }, [
      el('div', { className: 'auth__card' }, [
        ...(isError
          ? [el('p', { className: 'state state--error', textContent: msg }),
             el('button', { className: 'btn', textContent: 'Cerrar sesion', onclick: () => signOut() })]
          : [el('div', { className: 'loading' }, [
              el('span', { className: 'spinner' }),
              el('span', { textContent: msg }),
            ])]),
      ]),
    ]),
  );
}

function renderView(state: AppState, saveConfig: (c: Config) => Promise<void>): void {
  const route = currentRoute();
  const email = state.session.user.email ?? '';

  let content: HTMLElement;
  switch (route) {
    case 'dashboard':
      content = renderDashboardPage(state);
      break;
    case 'config':
      content = renderConfigView(state.config, saveConfig);
      break;
    case 'transactions':
      content = renderTransactionsPage(state);
      break;
    case 'categories':
      content = renderCategoriesPage(state);
      break;
    case 'bank-balances':
      content = renderBankBalancesPage(state);
      break;
    case 'currencies':
      content = renderCurrenciesPage(state);
      break;
  }

  app.replaceChildren(
    renderShell({ userEmail: email, companyName: state.config.companyName, content }),
  );
}

async function ensureSpreadsheet(token: string): Promise<string> {
  const existing = await getSpreadsheetId();
  if (existing) return existing;

  const found = await findSpreadsheet(token, SHEET_TITLE);
  if (found) {
    await setSpreadsheetId(found);
    return found;
  }

  renderFullScreenState('Creando hoja de Cashflow...');
  const created = await createSpreadsheet(token, SHEET_TITLE);
  await seedSpreadsheet(token, created);
  await setSpreadsheetId(created);
  return created;
}

async function handleSession(session: Session | null): Promise<void> {
  if (!session) {
    renderAuth();
    return;
  }
  try {
    renderFullScreenState('Cargando...');
    const token = await getGoogleAccessToken();
    const spreadsheetId = await ensureSpreadsheet(token);
    const partial = await readConfig(token, spreadsheetId);

    if (!isConfigComplete(partial)) {
      const onboard = async (c: Config): Promise<void> => {
        const t = await getGoogleAccessToken();
        await writeConfig(t, spreadsheetId, c);
        const state: AppState = { session, spreadsheetId, config: c, cache: emptyCache() };
        navigate('dashboard');
        renderView(state, makeSaveConfig(state));
        void prefetch(state);
      };
      app.replaceChildren(
        renderShell({
          userEmail: session.user.email ?? '',
          content: renderConfigView(partial, onboard, { firstTime: true }),
        }),
      );
      return;
    }

    const state: AppState = { session, spreadsheetId, config: partial, cache: emptyCache() };
    const saveConfig = makeSaveConfig(state);

    onRouteChange(() => renderView(state, saveConfig));
    renderView(state, saveConfig);
    void prefetch(state);
  } catch (e) {
    renderFullScreenState(e instanceof Error ? e.message : String(e), true);
  }
}

async function prefetch(state: AppState): Promise<void> {
  await Promise.allSettled([
    loadTransactions(state),
    loadCategories(state),
    loadBanks(state),
    loadCurrencies(state),
  ]);
}

function renderRefreshButton(onClick: () => void): HTMLButtonElement {
  return el('button', {
    className: 'btn btn--ghost btn--sm',
    title: 'Refrescar datos',
    textContent: 'Refrescar',
    onclick: onClick,
  });
}

function asyncPage<T>(
  loader: () => Promise<T>,
  loadingMsg: string,
  render: (data: T, refresh: () => Promise<void>) => HTMLElement,
): HTMLElement {
  const wrapper = el('div', {}, [
    el('div', { className: 'loading' }, [
      el('span', { className: 'spinner' }),
      el('span', { textContent: loadingMsg }),
    ]),
  ]);

  const run = async (): Promise<void> => {
    try {
      const data = await loader();
      wrapper.replaceChildren(render(data, run));
    } catch (e) {
      wrapper.replaceChildren(
        el('div', { className: 'state state--error', textContent: e instanceof Error ? e.message : String(e) }),
      );
    }
  };

  void run();
  return wrapper;
}

function renderDashboardPage(state: AppState): HTMLElement {
  return asyncPage(
    () => Promise.all([loadTransactions(state), loadBanks(state), loadCurrencies(state)]),
    'Calculando flujo de caja...',
    ([transactions, banksData, currenciesData]) => {
      const months = banksData.months.length ? banksData.months : currenciesData.months;
      return renderDashboard({
        config: state.config,
        spreadsheetId: state.spreadsheetId,
        transactions,
        banks: banksData.entities,
        currencies: currenciesData.currencies,
        months,
      });
    },
  );
}

function renderCurrenciesPage(state: AppState): HTMLElement {
  const pageWrap = el('div');

  const run = async (force = false): Promise<void> => {
    if (!state.cache.currencies || force) {
      pageWrap.replaceChildren(
        el('div', { className: 'loading' }, [
          el('span', { className: 'spinner' }),
          el('span', { textContent: 'Cargando divisas...' }),
        ]),
      );
    }
    try {
      const data = await loadCurrencies(state, force);
      const view = renderCurrencies({
        data,
        onAdd: async (code: string, rate: number) => {
          const t = await getGoogleAccessToken();
          await addCurrency(t, state.spreadsheetId, data.months, code, rate);
          invalidate(state, 'currencies');
          await run();
        },
        onUpdateRate: async (rowIndex: number, monthKey: string, value: number) => {
          const t = await getGoogleAccessToken();
          await updateRate(t, state.spreadsheetId, rowIndex, data.months, monthKey, value);
          invalidate(state, 'currencies');
        },
      });
      pageWrap.replaceChildren(view);
    } catch (e) {
      pageWrap.replaceChildren(
        el('div', { className: 'state state--error', textContent: e instanceof Error ? e.message : String(e) }),
      );
    }
  };

  void run();
  return pageWrap;
}

function renderBankBalancesPage(state: AppState): HTMLElement {
  const pageWrap = el('div');

  const run = async (force = false): Promise<void> => {
    if (!state.cache.banks || force) {
      pageWrap.replaceChildren(
        el('div', { className: 'loading' }, [
          el('span', { className: 'spinner' }),
          el('span', { textContent: 'Cargando bancos...' }),
        ]),
      );
    }
    try {
      const data = await loadBanks(state, force);
      const view = renderBankBalances({
        data,
        onAdd: async (entity: BankBalance) => {
          const t = await getGoogleAccessToken();
          await addEntity(t, state.spreadsheetId, data.months, entity);
          invalidate(state, 'banks');
          await run();
        },
        onUpdateEntity: async () => {},
        onUpdateBalance: async (rowIndex: number, monthKey: string, value: number) => {
          const t = await getGoogleAccessToken();
          await updateBalance(t, state.spreadsheetId, rowIndex, data.months, monthKey, value);
          invalidate(state, 'banks');
        },
      });
      pageWrap.replaceChildren(view);
    } catch (e) {
      pageWrap.replaceChildren(
        el('div', { className: 'state state--error', textContent: e instanceof Error ? e.message : String(e) }),
      );
    }
  };

  void run();
  return pageWrap;
}

function renderCategoriesPage(state: AppState): HTMLElement {
  const pageWrap = el('div');

  const run = async (force = false): Promise<void> => {
    if (!state.cache.categories || force) {
      pageWrap.replaceChildren(
        el('div', { className: 'loading' }, [
          el('span', { className: 'spinner' }),
          el('span', { textContent: 'Cargando categorias...' }),
        ]),
      );
    }
    try {
      const categories = await loadCategories(state, force);
      const view = renderCategories({
        categories,
        onAdd: async (cat: Category) => {
          const t = await getGoogleAccessToken();
          await addCategory(t, state.spreadsheetId, cat);
          invalidate(state, 'categories');
          await run();
        },
        onToggle: async (rowIndex: number, active: boolean) => {
          const t = await getGoogleAccessToken();
          await setCategoryActive(t, state.spreadsheetId, rowIndex, active);
          invalidate(state, 'categories');
        },
        onUpdate: async (rowIndex: number, cat: Category) => {
          const t = await getGoogleAccessToken();
          await updateCategory(t, state.spreadsheetId, rowIndex, cat);
          invalidate(state, 'categories');
          await run();
        },
      });
      pageWrap.replaceChildren(view);
    } catch (e) {
      pageWrap.replaceChildren(
        el('div', { className: 'state state--error', textContent: e instanceof Error ? e.message : String(e) }),
      );
    }
  };

  void run();
  return pageWrap;
}

function renderTransactionsPage(state: AppState): HTMLElement {
  const pageWrap = el('div');

  const run = async (force = false): Promise<void> => {
    const noCache = !state.cache.transactions || !state.cache.categories || !state.cache.banks || !state.cache.currencies;
    if (noCache || force) {
      pageWrap.replaceChildren(
        el('div', { className: 'loading' }, [
          el('span', { className: 'spinner' }),
          el('span', { textContent: 'Cargando transacciones...' }),
        ]),
      );
    }
    try {
      const [transactions, categories, banksData, currenciesData] = await Promise.all([
        loadTransactions(state, force),
        loadCategories(state, force),
        loadBanks(state, force),
        loadCurrencies(state, force),
      ]);
      const banks = banksData.entities.map(e => e.entity).filter(Boolean);

      const view = renderTransactions({
        transactions,
        categories,
        banks,
        currencies: currenciesData.currencies,
        onAdd: async (tx: Transaction) => {
          const t = await getGoogleAccessToken();
          await addTransaction(t, state.spreadsheetId, tx);
          invalidate(state, 'transactions');
          await run();
        },
        onUpdate: async (rowIndex: number, tx: Transaction) => {
          const t = await getGoogleAccessToken();
          await updateTransaction(t, state.spreadsheetId, rowIndex, tx);
          invalidate(state, 'transactions');
          await run();
        },
        onDelete: async (rowIndex: number) => {
          const t = await getGoogleAccessToken();
          await deleteTransaction(t, state.spreadsheetId, rowIndex);
          invalidate(state, 'transactions');
          await run();
        },
      });

      pageWrap.replaceChildren(view);
    } catch (e) {
      pageWrap.replaceChildren(
        el('div', { className: 'state state--error', textContent: e instanceof Error ? e.message : String(e) }),
      );
    }
  };

  void run();
  return pageWrap;
}

function makeSaveConfig(state: AppState): (c: Config) => Promise<void> {
  return async (c: Config) => {
    const token = await getGoogleAccessToken();
    await writeConfig(token, state.spreadsheetId, c);
    state.config = c;
    renderView(state, makeSaveConfig(state));
  };
}

async function init(): Promise<void> {
  onAuthChange(session => void handleSession(session));
  const session = await getSession();
  await handleSession(session);
}

void init().catch(e => renderFullScreenState(e instanceof Error ? e.message : String(e), true));

// Mark intentionally-unused helper exported for future refresh-button integration
void renderRefreshButton;
