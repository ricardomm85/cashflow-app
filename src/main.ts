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
import { batchRead, createSpreadsheet, findSpreadsheet } from './sheets.ts';
import { seedSpreadsheet } from './seed.ts';
import { runMigrations } from './migrate.ts';
import { isConfigComplete, readConfig, writeConfig } from './config.ts';
import type { Config } from './types.ts';
import { currentRoute, navigate, onRouteChange } from './router.ts';
import { renderShell } from './layout.ts';
import { el } from './dom.ts';
import { renderConfigView } from './views/config.ts';
import { renderDashboard } from './views/dashboard.ts';
import { renderTransactions } from './views/transactions.ts';
import {
  addTransaction,
  deleteTransaction,
  listTransactions,
  parseTransactions,
  TRANSACTIONS_RANGE,
  updateTransaction,
  type TransactionRow,
} from './transactions.ts';
import {
  addCategory,
  CATEGORIES_RANGE,
  listCategories,
  parseCategories,
  setCategoryActive,
  updateCategory,
  type CategoryRow,
} from './categories.ts';
import { renderCategories } from './views/categories.ts';
import {
  addEntity,
  BANK_BALANCES_RANGE,
  parseBankBalances,
  readBankBalances,
  updateBalance,
  type BankBalancesData,
} from './bank-balances.ts';
import { renderBankBalances } from './views/bank-balances.ts';
import { invalidateCache, readCache, writeCache } from './cache.ts';
import type { BankBalance, Category, Transaction } from './types.ts';

import { initTheme } from './theme.ts';

initTheme();

const SHEET_TITLE = 'Cashflow';
const app = document.getElementById('app')!;

interface Cache {
  transactions: TransactionRow[] | null;
  categories: CategoryRow[] | null;
  banks: BankBalancesData | null;
}

interface AppState {
  session: Session;
  spreadsheetId: string;
  config: Config;
  cache: Cache;
}

function emptyCache(): Cache {
  return { transactions: null, categories: null, banks: null };
}

async function loadTransactions(state: AppState, force = false): Promise<TransactionRow[]> {
  if (!force && state.cache.transactions) return state.cache.transactions;
  if (!force) {
    const cached = readCache<TransactionRow[]>(state.spreadsheetId, 'transactions');
    if (cached) { state.cache.transactions = cached; return cached; }
  }
  const token = await getGoogleAccessToken();
  const data = await listTransactions(token, state.spreadsheetId);
  state.cache.transactions = data;
  writeCache(state.spreadsheetId, 'transactions', data);
  return data;
}

async function loadCategories(state: AppState, force = false): Promise<CategoryRow[]> {
  if (!force && state.cache.categories) return state.cache.categories;
  if (!force) {
    const cached = readCache<CategoryRow[]>(state.spreadsheetId, 'categories');
    if (cached) { state.cache.categories = cached; return cached; }
  }
  const token = await getGoogleAccessToken();
  const data = await listCategories(token, state.spreadsheetId);
  state.cache.categories = data;
  writeCache(state.spreadsheetId, 'categories', data);
  return data;
}

async function loadBanks(state: AppState, force = false): Promise<BankBalancesData> {
  if (!force && state.cache.banks) return state.cache.banks;
  if (!force) {
    const cached = readCache<BankBalancesData>(state.spreadsheetId, 'banks');
    if (cached) { state.cache.banks = cached; return cached; }
  }
  const token = await getGoogleAccessToken();
  const data = await readBankBalances(token, state.spreadsheetId);
  state.cache.banks = data;
  writeCache(state.spreadsheetId, 'banks', data);
  return data;
}

function invalidate(state: AppState, ...keys: (keyof Cache)[]): void {
  for (const k of keys) state.cache[k] = null as never;
  invalidateCache(state.spreadsheetId, ...keys);
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

function renderFullScreenState(msg: string, opts?: { isError?: boolean; onRetry?: () => void }): void {
  const isError = opts?.isError ?? false;
  const errorChildren: (HTMLElement | string)[] = [
    el('p', { className: 'state state--error', textContent: msg }),
  ];
  if (opts?.onRetry) {
    errorChildren.push(el('button', { className: 'btn btn--primary', textContent: 'Reintentar', onclick: opts.onRetry }));
  }
  errorChildren.push(el('button', { className: 'btn', textContent: 'Cerrar sesion', onclick: () => signOut() }));

  app.replaceChildren(
    el('div', { className: 'auth' }, [
      el('div', { className: 'auth__card' }, [
        ...(isError
          ? errorChildren
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
  }

  app.replaceChildren(
    renderShell({
      userEmail: email,
      userName: state.session.user.user_metadata?.full_name as string | undefined,
      userPhoto: state.session.user.user_metadata?.avatar_url as string | undefined,
      companyName: state.config.companyName,
      content,
    }),
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

let activeSessionId: string | null = null;

async function handleSession(session: Session | null): Promise<void> {
  if (!session) {
    activeSessionId = null;
    renderAuth();
    return;
  }
  const sid = session.user.id;
  if (activeSessionId === sid) return;
  activeSessionId = sid;
  try {
    renderFullScreenState('Cargando...');
    const token = await getGoogleAccessToken();
    const spreadsheetId = await ensureSpreadsheet(token);
    await runMigrations(token, spreadsheetId);
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
          userName: session.user.user_metadata?.full_name as string | undefined,
          userPhoto: session.user.user_metadata?.avatar_url as string | undefined,
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
    activeSessionId = null;
    renderFullScreenState(e instanceof Error ? e.message : String(e), {
      isError: true,
      onRetry: () => void handleSession(session),
    });
  }
}

async function prefetch(state: AppState): Promise<void> {
  const needsFetch: (keyof Cache)[] = [];
  if (!readCache<TransactionRow[]>(state.spreadsheetId, 'transactions')) needsFetch.push('transactions');
  if (!readCache<CategoryRow[]>(state.spreadsheetId, 'categories')) needsFetch.push('categories');
  if (!readCache<BankBalancesData>(state.spreadsheetId, 'banks')) needsFetch.push('banks');

  state.cache.transactions ??= readCache<TransactionRow[]>(state.spreadsheetId, 'transactions');
  state.cache.categories ??= readCache<CategoryRow[]>(state.spreadsheetId, 'categories');
  state.cache.banks ??= readCache<BankBalancesData>(state.spreadsheetId, 'banks');

  if (!needsFetch.length) return;

  try {
    const rangeMap: Record<keyof Cache, string> = {
      transactions: TRANSACTIONS_RANGE,
      categories: CATEGORIES_RANGE,
      banks: BANK_BALANCES_RANGE,
    };
    const ranges = needsFetch.map(k => rangeMap[k]);
    const token = await getGoogleAccessToken();
    const results = await batchRead({ token, spreadsheetId: state.spreadsheetId, ranges });
    needsFetch.forEach((key, idx) => {
      const rows = results[idx] ?? [];
      if (key === 'transactions') {
        const data = parseTransactions(rows);
        state.cache.transactions = data;
        writeCache(state.spreadsheetId, 'transactions', data);
      } else if (key === 'categories') {
        const data = parseCategories(rows);
        state.cache.categories = data;
        writeCache(state.spreadsheetId, 'categories', data);
      } else {
        const data = parseBankBalances(rows);
        state.cache.banks = data;
        writeCache(state.spreadsheetId, 'banks', data);
      }
    });
  } catch {
    // best-effort; individual loaders will retry per section
  }
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
    () => Promise.all([loadTransactions(state), loadBanks(state)]),
    'Calculando flujo de caja...',
    ([transactions, banksData]) => {
      return renderDashboard({
        config: state.config,
        spreadsheetId: state.spreadsheetId,
        transactions,
        banks: banksData.entities,
        months: banksData.months,
      });
    },
  );
}

function renderBankBalancesPage(state: AppState): HTMLElement {
  const pageWrap = el('div');

  const buildView = (data: BankBalancesData): HTMLElement => renderBankBalances({
    data,
    onAdd: async (entity: BankBalance) => {
      const t = await getGoogleAccessToken();
      await addEntity(t, state.spreadsheetId, data.months, entity);
      invalidate(state, 'banks');
      await run(true);
    },
    onUpdateEntity: async () => {},
    onUpdateBalance: async (rowIndex: number, monthKey: string, value: number) => {
      const t = await getGoogleAccessToken();
      await updateBalance(t, state.spreadsheetId, rowIndex, data.months, monthKey, value);
      invalidate(state, 'banks');
    },
  });

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
      pageWrap.replaceChildren(buildView(data));
    } catch (e) {
      pageWrap.replaceChildren(
        el('div', { className: 'state state--error', textContent: e instanceof Error ? e.message : String(e) }),
      );
    }
  };

  if (state.cache.banks) {
    pageWrap.append(buildView(state.cache.banks));
  } else {
    void run();
  }
  return pageWrap;
}

function renderCategoriesPage(state: AppState): HTMLElement {
  const pageWrap = el('div');

  const buildView = (categories: CategoryRow[]): HTMLElement => renderCategories({
    categories,
    onAdd: async (cat: Category) => {
      const t = await getGoogleAccessToken();
      await addCategory(t, state.spreadsheetId, cat);
      invalidate(state, 'categories');
      await run(true);
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
      await run(true);
    },
  });

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
      pageWrap.replaceChildren(buildView(categories));
    } catch (e) {
      pageWrap.replaceChildren(
        el('div', { className: 'state state--error', textContent: e instanceof Error ? e.message : String(e) }),
      );
    }
  };

  if (state.cache.categories) {
    pageWrap.append(buildView(state.cache.categories));
  } else {
    void run();
  }
  return pageWrap;
}

function renderTransactionsPage(state: AppState): HTMLElement {
  const pageWrap = el('div');

  const buildView = (
    transactions: TransactionRow[],
    categories: CategoryRow[],
    banksData: BankBalancesData,
  ): HTMLElement => {
    const banks = banksData.entities.map(e => e.entity).filter(Boolean);
    return renderTransactions({
      transactions,
      categories,
      banks,
      onAdd: async (tx: Transaction) => {
        const t = await getGoogleAccessToken();
        await addTransaction(t, state.spreadsheetId, tx);
        invalidate(state, 'transactions');
        await run(true);
      },
      onUpdate: async (rowIndex: number, tx: Transaction) => {
        const t = await getGoogleAccessToken();
        await updateTransaction(t, state.spreadsheetId, rowIndex, tx);
        invalidate(state, 'transactions');
        await run(true);
      },
      onDelete: async (rowIndex: number, tx: Transaction) => {
        const t = await getGoogleAccessToken();
        await deleteTransaction(t, state.spreadsheetId, rowIndex, tx);
        invalidate(state, 'transactions');
        await run(true);
      },
    });
  };

  const hasAll = (): boolean =>
    !!(state.cache.transactions && state.cache.categories && state.cache.banks);

  const run = async (force = false): Promise<void> => {
    if (!hasAll() || force) {
      pageWrap.replaceChildren(
        el('div', { className: 'loading' }, [
          el('span', { className: 'spinner' }),
          el('span', { textContent: 'Cargando transacciones...' }),
        ]),
      );
    }
    try {
      const [transactions, categories, banksData] = await Promise.all([
        loadTransactions(state, force),
        loadCategories(state, force),
        loadBanks(state, force),
      ]);
      pageWrap.replaceChildren(buildView(transactions, categories, banksData));
    } catch (e) {
      pageWrap.replaceChildren(
        el('div', { className: 'state state--error', textContent: e instanceof Error ? e.message : String(e) }),
      );
    }
  };

  if (hasAll()) {
    pageWrap.append(buildView(
      state.cache.transactions!,
      state.cache.categories!,
      state.cache.banks!,
    ));
  } else {
    void run();
  }
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

let currentUserId: string | null = null;

async function init(): Promise<void> {
  onAuthChange(session => {
    const nextId = session?.user.id ?? null;
    if (nextId === currentUserId) return;
    currentUserId = nextId;
    void handleSession(session);
  });
  const session = await getSession();
  currentUserId = session?.user.id ?? null;
  await handleSession(session);
}

void init().catch(e => renderFullScreenState(e instanceof Error ? e.message : String(e), { isError: true }));

// Mark intentionally-unused helper exported for future refresh-button integration
void renderRefreshButton;
