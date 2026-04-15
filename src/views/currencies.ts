import { el } from '../dom.ts';
import { pageHeader } from '../layout.ts';
import { icons } from '../icons.ts';
import { applyErrors, createField, type FieldHandle } from '../ui/field.ts';
import { confirmDialog } from '../ui/confirm.ts';
import type { CurrenciesData, CurrencyRow } from '../currencies.ts';

export interface CurrenciesViewDeps {
  data: CurrenciesData;
  onAdd: (code: string, initialRate: number) => Promise<void>;
  onUpdateRate: (rowIndex: number, monthKey: string, value: number) => Promise<void>;
}

export function renderCurrencies(deps: CurrenciesViewDeps): HTMLElement {
  const container = el('div');
  let formOpen = deps.data.currencies.length <= 1;

  const refresh = (): void => {
    container.replaceChildren(
      pageHeader(
        'Divisas',
        `${deps.data.currencies.length} divisas · Tasas a EUR por mes.`,
      ),
      renderFormCard(deps, formOpen, () => {
        formOpen = !formOpen;
        refresh();
      }, () => {
        formOpen = false;
        refresh();
      }),
      renderTable(deps),
    );
  };

  refresh();
  return container;
}

function renderFormCard(
  deps: CurrenciesViewDeps,
  open: boolean,
  onToggle: () => void,
  onDone: () => void,
): HTMLElement {
  const header = el('div', { className: 'card__header', onclick: onToggle }, [
    el('div', { style: 'display:flex;align-items:center;gap:.5rem;' }, [
      icons.plus(),
      el('h2', { textContent: 'Nueva divisa' }),
    ]),
    icons.chevron(),
  ]);
  (header.lastChild as HTMLElement).classList.add('card__chevron');

  const body = el('div', { className: 'card__body' }, [renderAddForm(deps, onDone)]);

  return el('div', {
    className: `card card--collapsible${open ? ' card--open' : ''}`,
    style: 'margin-bottom:1.5rem;',
  }, [header, body]);
}

function renderAddForm(deps: CurrenciesViewDeps, onDone: () => void): HTMLElement {
  const codeInp = inp('text', '', 'USD');
  codeInp.maxLength = 3;
  codeInp.style.textTransform = 'uppercase';

  const rateInp = inp('number', '', '1.0850');
  rateInp.step = '0.0001';

  const fields: Record<string, FieldHandle> = {
    code: createField('Codigo', codeInp, 'ISO 4217 de 3 letras'),
    rate: createField('Tasa inicial', rateInp, `Valor de 1 ${'{unidad}'} en EUR para todos los meses`),
  };

  const status = el('span', { className: 'page-header__sub' });
  const submitBtn = el('button', {
    type: 'submit',
    className: 'btn btn--primary',
    textContent: 'Anadir',
  });

  const form = el('form', {
    noValidate: true,
    onsubmit: async (ev: Event) => {
      ev.preventDefault();
      const code = codeInp.value.trim().toUpperCase();
      const rate = Number(rateInp.value);
      const existing = deps.data.currencies.some(c => c.currency === code);
      const errors = {
        code: !/^[A-Z]{3}$/.test(code) ? 'Codigo de 3 letras'
          : existing ? 'Ya existe esta divisa'
          : code === 'EUR' ? 'EUR ya existe por defecto'
          : null,
        rate: !rateInp.value || Number.isNaN(rate) || rate <= 0 ? 'Debe ser mayor que 0' : null,
      };
      if (applyErrors(fields, errors)) return;

      submitBtn.disabled = true;
      status.textContent = 'Guardando...';
      try {
        await deps.onAdd(code, rate);
        onDone();
      } catch (e) {
        status.textContent = e instanceof Error ? e.message : String(e);
      } finally {
        submitBtn.disabled = false;
      }
    },
  }, [
    el('div', { className: 'form-grid' }, Object.values(fields).map(h => h.element)),
    el('div', { className: 'btn-row', style: 'margin-top:1rem;align-items:center;' }, [submitBtn, status]),
  ]);

  return form;
}

function renderTable(deps: CurrenciesViewDeps): HTMLElement {
  if (!deps.data.currencies.length) {
    return el('div', { className: 'card' }, [
      el('div', { className: 'state', textContent: 'Sin divisas configuradas.' }),
    ]);
  }

  const months = deps.data.months;
  const now = new Date();
  const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const header = el('tr', {}, [
    el('th', {
      style: 'position:sticky;left:0;background:#d9d6cd;z-index:2;min-width:120px;',
      textContent: 'Divisa',
    }),
    ...months.map(m => el('th', {
      style: `min-width:100px;text-align:right;${m === currentKey ? 'background:#cfccc1;color:var(--accent);' : ''}`,
      textContent: formatMonth(m),
    })),
  ]);

  const rows = deps.data.currencies.map(cur => renderRow(cur, months, currentKey, deps));

  return el('div', {
    className: 'card',
    style: 'padding:0;overflow:auto;max-width:100%;',
  }, [
    el('table', { className: 'tx-table', style: 'min-width:100%;' }, [
      el('thead', {}, [header]),
      el('tbody', {}, rows),
    ]),
  ]);
}

function renderRow(
  cur: CurrencyRow,
  months: string[],
  currentKey: string,
  deps: CurrenciesViewDeps,
): HTMLElement {
  const isEur = cur.currency === 'EUR';

  const nameCell = el('td', {
    style: 'position:sticky;left:0;background:var(--surface);z-index:1;border-right:1px solid var(--border);',
  }, [
    el('div', { style: 'display:flex;align-items:center;gap:.5rem;' }, [
      el('span', { style: 'font-weight:600;color:var(--fg);letter-spacing:.02em;', textContent: cur.currency }),
      ...(isEur ? [el('span', { className: 'badge badge--accent', textContent: 'base' })] : []),
    ]),
  ]);

  const monthCells = months.map(m => {
    const value = cur.rates[m] ?? 0;
    const isCurrent = m === currentKey;

    if (isEur) {
      return el('td', {
        style: `text-align:right;color:var(--muted);font-variant-numeric:tabular-nums;${isCurrent ? 'background:var(--accent-soft);' : ''}`,
        textContent: '1.0000',
      });
    }

    const input = document.createElement('input');
    input.type = 'number';
    input.step = '0.0001';
    input.min = '0';
    input.value = String(value);
    input.style.cssText = `
      width:100%;padding:.25rem .5rem;border:1px solid transparent;
      border-radius:4px;font:inherit;font-size:.8125rem;
      font-variant-numeric:tabular-nums;text-align:right;background:transparent;color:var(--fg);
      ${isCurrent ? 'font-weight:600;' : ''}
    `;
    input.onfocus = () => { input.style.borderColor = 'var(--border-strong)'; input.style.background = 'white'; };
    input.onblur = async () => {
      input.style.borderColor = 'transparent';
      input.style.background = 'transparent';
      const newVal = Number(input.value);
      if (newVal === value || Number.isNaN(newVal) || newVal <= 0) {
        input.value = String(value);
        return;
      }
      input.disabled = true;
      try {
        await deps.onUpdateRate(cur.rowIndex, m, newVal);
        cur.rates[m] = newVal;
      } catch (e) {
        input.value = String(value);
        await confirmDialog({
          title: 'Error al guardar',
          message: e instanceof Error ? e.message : String(e),
          confirmText: 'Ok',
          cancelText: '',
        });
      } finally {
        input.disabled = false;
      }
    };

    return el('td', {
      style: `padding:0;${isCurrent ? 'background:var(--accent-soft);' : ''}`,
    }, [input]);
  });

  return el('tr', {}, [nameCell, ...monthCells]);
}

function inp(type: string, value: string, placeholder = ''): HTMLInputElement {
  const i = document.createElement('input');
  i.type = type;
  i.value = value;
  i.placeholder = placeholder;
  i.className = 'input';
  return i;
}

function formatMonth(key: string): string {
  const [y, m] = key.split('-');
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' }).replace('.', '');
}
