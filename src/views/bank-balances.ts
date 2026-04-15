import { el } from '../dom.ts';
import { pageHeader } from '../layout.ts';
import { icons } from '../icons.ts';
import { applyErrors, createField, type FieldHandle } from '../ui/field.ts';
import { confirmDialog } from '../ui/confirm.ts';
import type { BankBalance } from '../types.ts';
import type { BankBalanceRow, BankBalancesData } from '../bank-balances.ts';

export interface BankBalancesViewDeps {
  data: BankBalancesData;
  onAdd: (entity: BankBalance) => Promise<void>;
  onUpdateEntity: (rowIndex: number, entity: BankBalance) => Promise<void>;
  onUpdateBalance: (rowIndex: number, monthKey: string, value: number) => Promise<void>;
}

const TYPE_LABEL: Record<BankBalance['type'], string> = {
  bank: 'Cuenta bancaria',
  credit_line: 'Linea de credito',
};

const TYPE_BADGE: Record<BankBalance['type'], string> = {
  bank: 'badge--accent',
  credit_line: 'badge',
};

export function renderBankBalances(deps: BankBalancesViewDeps): HTMLElement {
  const container = el('div');
  let formOpen = !deps.data.entities.length;

  const refresh = (): void => {
    const total = currentTotal(deps.data);
    container.replaceChildren(
      pageHeader(
        'Bancos',
        `${deps.data.entities.length} entidades · Total actual: ${formatEur(total)}`,
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

function currentTotal(data: BankBalancesData): number {
  const now = new Date();
  const key = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  return data.entities.reduce((s, e) => s + (e.balances[key] ?? 0), 0);
}

function renderFormCard(
  deps: BankBalancesViewDeps,
  open: boolean,
  onToggle: () => void,
  onDone: () => void,
): HTMLElement {
  const header = el('div', { className: 'card__header', onclick: onToggle }, [
    el('div', { style: 'display:flex;align-items:center;gap:.5rem;' }, [
      icons.plus(),
      el('h2', { textContent: 'Nueva entidad' }),
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

function renderAddForm(deps: BankBalancesViewDeps, onDone: () => void): HTMLElement {
  const entityInp = inp('text', '', 'BBVA, Santander, Credito operativo...');
  const typeSel = document.createElement('select');
  typeSel.className = 'select';
  for (const t of ['bank', 'credit_line'] as BankBalance['type'][]) {
    const o = document.createElement('option');
    o.value = t;
    o.textContent = TYPE_LABEL[t];
    typeSel.append(o);
  }
  const limitInp = inp('number', '', '10000');
  limitInp.step = '0.01';

  const entityField = createField('Entidad', entityInp);
  const typeField = createField('Tipo', typeSel);
  const limitField = createField('Limite', limitInp, 'Solo para linea de credito');
  limitField.element.style.display = 'none';
  typeSel.onchange = () => {
    limitField.element.style.display = typeSel.value === 'credit_line' ? 'block' : 'none';
  };

  const fields: Record<string, FieldHandle> = {
    entity: entityField,
    type: typeField,
    limit: limitField,
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
      const name = entityInp.value.trim();
      const limitNum = limitInp.value === '' ? null : Number(limitInp.value);
      const exists = deps.data.entities.some(e => e.entity.toLowerCase() === name.toLowerCase());
      const errors = {
        entity: name.length < 2 ? 'Minimo 2 caracteres'
          : exists ? 'Ya existe una entidad con ese nombre'
          : null,
        type: null,
        limit: typeSel.value === 'credit_line' && (limitNum === null || Number.isNaN(limitNum) || limitNum < 0)
          ? 'Introduce un limite valido'
          : null,
      };
      if (applyErrors(fields, errors)) return;

      const newEntity: BankBalance = {
        entity: name,
        type: typeSel.value as BankBalance['type'],
        limit: typeSel.value === 'credit_line' ? limitNum : null,
        balances: {},
      };
      submitBtn.disabled = true;
      status.textContent = 'Guardando...';
      try {
        await deps.onAdd(newEntity);
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

function renderTable(deps: BankBalancesViewDeps): HTMLElement {
  if (!deps.data.entities.length) {
    return el('div', { className: 'card' }, [
      el('div', { className: 'state', textContent: 'Sin entidades. Anade la primera arriba.' }),
    ]);
  }

  const months = deps.data.months;
  const now = new Date();
  const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const header = el('tr', {}, [
    el('th', { style: 'position:sticky;left:0;background:#d9d6cd;z-index:2;min-width:180px;', textContent: 'Entidad' }),
    el('th', { style: 'min-width:80px;', textContent: 'Limite' }),
    ...months.map(m => el('th', {
      style: `min-width:110px;text-align:right;${m === currentKey ? 'background:#cfccc1;color:var(--accent);' : ''}`,
      textContent: formatMonth(m),
    })),
  ]);

  const rows = deps.data.entities.map(e => renderRow(e, months, currentKey, deps));

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
  entity: BankBalanceRow,
  months: string[],
  currentKey: string,
  deps: BankBalancesViewDeps,
): HTMLElement {
  const nameCell = el('td', {
    style: 'position:sticky;left:0;background:var(--surface);z-index:1;border-right:1px solid var(--border);',
  }, [
    el('div', { style: 'font-weight:500;color:var(--fg);', textContent: entity.entity }),
    el('div', { style: 'display:flex;align-items:center;gap:.375rem;margin-top:.25rem;' }, [
      el('span', {
        className: `badge ${TYPE_BADGE[entity.type]}`,
        textContent: TYPE_LABEL[entity.type],
      }),
    ]),
  ]);

  const limitCell = el('td', {
    style: 'color:var(--muted);font-variant-numeric:tabular-nums;text-align:right;',
    textContent: entity.limit === null ? '—' : formatEur(entity.limit),
  });

  const monthCells = months.map(m => {
    const value = entity.balances[m] ?? 0;
    const isCurrent = m === currentKey;
    const input = document.createElement('input');
    input.type = 'number';
    input.step = '0.01';
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
      if (newVal === value || Number.isNaN(newVal)) return;
      input.disabled = true;
      try {
        await deps.onUpdateBalance(entity.rowIndex, m, newVal);
        entity.balances[m] = newVal;
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

  return el('tr', {}, [nameCell, limitCell, ...monthCells]);
}

function inp(type: string, value: string, placeholder = ''): HTMLInputElement {
  const i = document.createElement('input');
  i.type = type;
  i.value = value;
  i.placeholder = placeholder;
  i.className = 'input';
  return i;
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
