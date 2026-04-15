import { el } from '../dom.ts';
import { pageHeader } from '../layout.ts';
import { icons } from '../icons.ts';
import { applyErrors, createField, type FieldHandle } from '../ui/field.ts';
import { confirmDialog } from '../ui/confirm.ts';
import type { Category, Transaction } from '../types.ts';
import type { TransactionRow } from '../transactions.ts';

export interface TransactionsViewDeps {
  transactions: TransactionRow[];
  categories: Category[];
  banks: string[];
  onAdd: (tx: Transaction) => Promise<void>;
  onUpdate: (rowIndex: number, tx: Transaction) => Promise<void>;
  onDelete: (rowIndex: number) => Promise<void>;
}

type AmountOp = 'any' | 'eq' | 'gt' | 'lt';
type TypeFilter = '' | 'cobros' | 'pagos' | 'otros';

interface Filters {
  dateFrom: string;
  dateTo: string;
  bank: string;
  categoryKeys: string[];
  type: TypeFilter;
  amountOp: AmountOp;
  amountValue: string;
}

const EMPTY_FILTERS: Filters = {
  dateFrom: '',
  dateTo: '',
  bank: '',
  categoryKeys: [],
  type: '',
  amountOp: 'any',
  amountValue: '',
};

const TYPE_LABEL: Record<Transaction['type'], string> = {
  cobros: 'Cobro',
  pagos: 'Pago',
  otros: 'Otro',
};

type SortDir = 'asc' | 'desc';

export function renderTransactions(deps: TransactionsViewDeps): HTMLElement {
  const container = el('div');
  let editing: TransactionRow | null = null;
  let filters: Filters = { ...EMPTY_FILTERS };
  let sortDir: SortDir = 'desc';

  const refresh = (): void => {
    const filtered = applyFilters(deps.transactions, filters);
    const sorted = [...filtered].sort((a, b) =>
      sortDir === 'desc' ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date),
    );
    const activeCount = countActiveFilters(filters);
    container.replaceChildren(
      pageHeader(
        'Transacciones',
        `${filtered.length} de ${deps.transactions.length} movimientos`,
      ),
      renderFormCard(deps, editing, () => {
        editing = null;
        refresh();
      }),
      renderToolbar(deps, filters, activeCount, next => {
        filters = next;
        refresh();
      }),
      renderTable({ ...deps, transactions: sorted }, sortDir, () => {
        sortDir = sortDir === 'desc' ? 'asc' : 'desc';
        refresh();
      }, tx => {
        editing = tx;
        refresh();
        container.scrollIntoView({ behavior: 'smooth' });
      }),
    );
  };

  refresh();
  return container;
}

function countActiveFilters(f: Filters): number {
  let n = 0;
  if (f.dateFrom) n++;
  if (f.dateTo) n++;
  if (f.bank) n++;
  if (f.categoryKeys.length) n++;
  if (f.type) n++;
  if (f.amountOp !== 'any' && f.amountValue) n++;
  return n;
}

function applyFilters(txs: TransactionRow[], f: Filters): TransactionRow[] {
  const amountTarget = f.amountValue === '' ? null : Number(f.amountValue);
  return txs.filter(tx => {
    if (f.dateFrom && tx.date < f.dateFrom) return false;
    if (f.dateTo && tx.date > f.dateTo) return false;
    if (f.bank && tx.bank !== f.bank) return false;
    if (f.type && tx.type !== f.type) return false;
    if (f.categoryKeys.length) {
      const key = `${tx.type}|${tx.group}|${tx.subgroup}`;
      if (!f.categoryKeys.includes(key)) return false;
    }
    if (amountTarget !== null && !Number.isNaN(amountTarget)) {
      const abs = Math.abs(tx.amount);
      const tgt = Math.abs(amountTarget);
      if (f.amountOp === 'eq' && abs !== tgt) return false;
      if (f.amountOp === 'gt' && abs <= tgt) return false;
      if (f.amountOp === 'lt' && abs >= tgt) return false;
    }
    return true;
  });
}

function renderToolbar(
  deps: TransactionsViewDeps,
  current: Filters,
  activeCount: number,
  onChange: (next: Filters) => void,
): HTMLElement {
  const dateFrom = toolbarInput('date', current.dateFrom);
  const dateTo = toolbarInput('date', current.dateTo);

  const banks = Array.from(new Set(deps.transactions.map(t => t.bank).filter(Boolean))).sort();
  const bankSel = toolbarSelectWithAll(banks, current.bank, 'Todos los bancos');

  const typeSel = document.createElement('select');
  typeSel.className = 'toolbar__select';
  for (const [val, label] of [
    ['', 'Todos los tipos'],
    ['cobros', 'Solo cobros'],
    ['pagos', 'Solo pagos'],
    ['otros', 'Solo otros'],
  ] as const) {
    const o = document.createElement('option');
    o.value = val;
    o.textContent = label;
    if (val === current.type) o.selected = true;
    typeSel.append(o);
  }

  const catMulti = buildCategoryMultiselect(
    deps.categories.filter(c => c.active),
    current.categoryKeys,
    next => {
      onChange({ ...current, categoryKeys: next });
    },
  );

  const amountOp = document.createElement('select');
  amountOp.className = 'toolbar__select';
  for (const [val, label] of [
    ['any', 'Importe —'],
    ['eq', '='],
    ['gt', '>'],
    ['lt', '<'],
  ] as const) {
    const o = document.createElement('option');
    o.value = val;
    o.textContent = label;
    if (val === current.amountOp) o.selected = true;
    amountOp.append(o);
  }
  const amountVal = toolbarInput('number', current.amountValue, '0.00');
  amountVal.step = '0.01';
  amountVal.disabled = current.amountOp === 'any';
  amountVal.style.width = '90px';

  const emit = (): void => {
    onChange({
      dateFrom: dateFrom.value,
      dateTo: dateTo.value,
      bank: bankSel.value,
      categoryKeys: current.categoryKeys,
      type: typeSel.value as TypeFilter,
      amountOp: amountOp.value as AmountOp,
      amountValue: amountOp.value === 'any' ? '' : amountVal.value,
    });
  };

  dateFrom.onchange = emit;
  dateTo.onchange = emit;
  bankSel.onchange = emit;
  typeSel.onchange = emit;
  amountOp.onchange = emit;
  amountVal.onchange = emit;

  const clearBtn = el('button', {
    type: 'button',
    className: 'btn btn--ghost btn--sm',
    textContent: 'Limpiar',
    onclick: () => onChange({ ...EMPTY_FILTERS }),
  });

  const countLabel = activeCount > 0
    ? el('span', { className: 'toolbar__count', textContent: `${activeCount} filtro${activeCount > 1 ? 's' : ''} activo${activeCount > 1 ? 's' : ''}` })
    : null;

  return el('div', { className: 'toolbar' }, [
    el('span', { className: 'toolbar__label', textContent: 'Fecha' }),
    dateFrom,
    el('span', { style: 'color:var(--muted-soft);font-size:.75rem;', textContent: '—' }),
    dateTo,
    el('div', { className: 'toolbar__divider' }),
    bankSel,
    typeSel,
    catMulti,
    el('div', { className: 'toolbar__divider' }),
    amountOp,
    amountVal,
    el('div', { className: 'toolbar__spacer' }),
    ...(countLabel ? [countLabel] : []),
    ...(activeCount > 0 ? [clearBtn] : []),
  ]);
}

function toolbarInput(type: string, value: string, placeholder = ''): HTMLInputElement {
  const i = document.createElement('input');
  i.type = type;
  i.value = value;
  i.placeholder = placeholder;
  i.className = 'toolbar__input';
  return i;
}

function toolbarSelectWithAll(options: string[], value: string, allLabel: string): HTMLSelectElement {
  const s = document.createElement('select');
  s.className = 'toolbar__select';
  const all = document.createElement('option');
  all.value = '';
  all.textContent = allLabel;
  if (!value) all.selected = true;
  s.append(all);
  for (const opt of options) {
    const o = document.createElement('option');
    o.value = opt;
    o.textContent = opt;
    if (opt === value) o.selected = true;
    s.append(o);
  }
  return s;
}

function buildCategoryMultiselect(
  active: Category[],
  selected: string[],
  onChange: (keys: string[]) => void,
): HTMLElement {
  const state = new Set(selected);

  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'toolbar__select multiselect__trigger';
  trigger.style.cssText = 'text-align:left;cursor:pointer;min-width:170px;';

  const panel = el('div', { className: 'multiselect__panel' });
  panel.style.display = 'none';

  const updateTriggerLabel = (): void => {
    const n = state.size;
    trigger.textContent = n === 0 ? 'Todas las categorias'
      : n === 1 ? labelFor([...state][0]!)
      : `${n} categorias`;
  };

  function labelFor(key: string): string {
    const [, group, subgroup] = key.split('|');
    return `${group} — ${subgroup}`;
  }

  const byType: Record<string, Category[]> = { cobros: [], pagos: [], otros: [] };
  for (const c of active) byType[c.type]?.push(c);

  const body = el('div', { className: 'multiselect__body' });

  for (const [type, cats] of Object.entries(byType)) {
    if (!cats.length) continue;
    body.append(el('div', { className: 'multiselect__group', textContent: TYPE_LABEL[type as Transaction['type']] }));
    for (const c of cats) {
      const key = `${c.type}|${c.group}|${c.subgroup}`;
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = state.has(key);
      cb.onchange = () => {
        if (cb.checked) state.add(key); else state.delete(key);
        updateTriggerLabel();
        onChange([...state]);
      };
      body.append(
        el('label', { className: 'multiselect__option' }, [
          cb,
          el('span', { textContent: `${c.group} · ${c.subgroup}` }),
        ]),
      );
    }
  }

  const clearBtn = el('button', {
    type: 'button',
    className: 'btn btn--ghost btn--sm',
    textContent: 'Limpiar',
    onclick: (ev: Event) => {
      ev.stopPropagation();
      state.clear();
      for (const cb of body.querySelectorAll<HTMLInputElement>('input[type=checkbox]')) {
        cb.checked = false;
      }
      updateTriggerLabel();
      onChange([]);
    },
  });

  panel.append(
    el('div', { className: 'multiselect__footer' }, [clearBtn]),
    body,
  );

  const container = el('div', { className: 'multiselect' }, [trigger, panel]);

  const onDocClick = (ev: MouseEvent): void => {
    if (!container.contains(ev.target as Node)) {
      panel.style.display = 'none';
    }
  };

  trigger.onclick = (ev: Event) => {
    ev.stopPropagation();
    const isOpen = panel.style.display === 'block';
    panel.style.display = isOpen ? 'none' : 'block';
    if (!isOpen) document.addEventListener('click', onDocClick, { once: true });
  };

  updateTriggerLabel();
  return container;
}

function renderFormCard(
  deps: TransactionsViewDeps,
  editing: TransactionRow | null,
  onDone: () => void,
): HTMLElement {
  const title = editing ? 'Editar transaccion' : 'Nueva transaccion';
  const plusIcon = icons.plus();
  plusIcon.setAttribute('width', '16');
  plusIcon.setAttribute('height', '16');
  plusIcon.setAttribute('style', 'color:var(--muted);flex-shrink:0;');
  return el('div', { className: 'card', style: 'margin-bottom:1rem;' }, [
    el('div', { style: 'display:flex;align-items:center;gap:.5rem;margin-bottom:1rem;' }, [
      plusIcon,
      el('h2', { className: 'card__title', style: 'margin:0;', textContent: title }),
    ]),
    renderForm(deps, editing, onDone),
  ]);
}

function renderForm(
  deps: TransactionsViewDeps,
  editing: TransactionRow | null,
  onDone: () => void,
): HTMLElement {
  const active = deps.categories.filter(c => c.active);

  const dateInp = inp('date', editing?.date ?? new Date().toISOString().slice(0, 10));

  const bankSel = buildBankSelect(deps.banks, editing);
  const categorySelect = buildCategorySelect(active, editing);

  const descInp = inp('text', editing?.description ?? '', 'Concepto');
  const amountInp = inp('number', String(editing?.amount !== undefined ? Math.abs(editing.amount) : ''), '0.00');
  amountInp.step = '0.01';
  amountInp.min = '0';

  const dateField = createField('Fecha', dateInp);
  const bankField = createField('Banco', bankSel);
  const categoryField = createField('Categoria', categorySelect);
  const descField = createField('Descripcion', descInp);
  const amountField = createField('Importe', amountInp);

  const fields: Record<string, FieldHandle> = {
    date: dateField,
    bank: bankField,
    category: categoryField,
    description: descField,
    amount: amountField,
  };

  const status = el('span', { className: 'page-header__sub' });
  const submitBtn = el('button', {
    type: 'submit',
    className: 'btn btn--primary',
    textContent: editing ? 'Guardar cambios' : 'Anadir',
  });

  const form = el('form', {
    noValidate: true,
    onsubmit: async (ev: Event) => {
      ev.preventDefault();
      const errors = validateTx({
        date: dateInp.value,
        bank: bankSel.value,
        category: categorySelect.value,
        description: descInp.value,
        amount: amountInp.value,
      });

      if (applyErrors(fields, errors)) return;

      const cat = active.find(c => `${c.type}|${c.group}|${c.subgroup}` === categorySelect.value)!;
      const rawAmount = Math.abs(Number(amountInp.value));
      const signedAmount = cat.type === 'pagos' ? -rawAmount : rawAmount;
      const tx: Transaction = {
        date: dateInp.value,
        bank: bankSel.value,
        description: descInp.value.trim(),
        amount: signedAmount,
        type: cat.type,
        group: cat.group,
        subgroup: cat.subgroup,
      };

      submitBtn.disabled = true;
      status.textContent = 'Guardando...';
      try {
        if (editing) {
          await deps.onUpdate(editing.rowIndex, tx);
        } else {
          await deps.onAdd(tx);
        }
        status.textContent = '';
        onDone();
      } catch (e) {
        status.textContent = e instanceof Error ? e.message : String(e);
      } finally {
        submitBtn.disabled = false;
      }
    },
  }, [
    el('div', { className: 'form-grid form-grid--tx' }, Object.values(fields).map(h => h.element)),
    el('div', { className: 'btn-row', style: 'margin-top:1rem;align-items:center;' }, [
      submitBtn,
      ...(editing
        ? [el('button', {
            type: 'button',
            className: 'btn',
            textContent: 'Cancelar',
            onclick: onDone,
          })]
        : []),
      status,
    ]),
  ]);

  return el('div', {}, [form]);
}

function validateTx(v: {
  date: string; bank: string; category: string; description: string;
  amount: string;
}): Record<string, string | null> {
  const amountNum = Number(v.amount);
  return {
    date: !v.date ? 'Selecciona una fecha' : null,
    bank: !v.bank ? 'Selecciona un banco' : null,
    category: !v.category ? 'Selecciona una categoria' : null,
    description: v.description.trim().length < 2 ? 'Minimo 2 caracteres' : null,
    amount: !v.amount || Number.isNaN(amountNum) ? 'Importe invalido'
      : Math.abs(amountNum) === 0 ? 'No puede ser 0' : null,
  };
}

function buildBankSelect(banks: string[], editing: TransactionRow | null): HTMLSelectElement {
  const s = document.createElement('select');
  s.className = 'select';
  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = banks.length ? 'Seleccionar' : 'Sin bancos registrados';
  placeholder.disabled = true;
  if (!editing?.bank) placeholder.selected = true;
  s.append(placeholder);
  for (const b of banks) {
    const o = document.createElement('option');
    o.value = b;
    o.textContent = b;
    if (editing?.bank === b) o.selected = true;
    s.append(o);
  }
  if (editing?.bank && !banks.includes(editing.bank)) {
    const o = document.createElement('option');
    o.value = editing.bank;
    o.textContent = `${editing.bank} (no registrado)`;
    o.selected = true;
    s.append(o);
  }
  return s;
}

function buildCategorySelect(active: Category[], editing: TransactionRow | null): HTMLSelectElement {
  const s = document.createElement('select');
  s.className = 'select';
  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = 'Seleccionar';
  placeholder.disabled = true;
  if (!editing) placeholder.selected = true;
  s.append(placeholder);

  const byType: Record<string, Category[]> = { cobros: [], pagos: [], otros: [] };
  for (const c of active) byType[c.type]?.push(c);

  for (const [type, cats] of Object.entries(byType)) {
    if (!cats.length) continue;
    const group = document.createElement('optgroup');
    group.label = TYPE_LABEL[type as Transaction['type']];
    for (const c of cats) {
      const o = document.createElement('option');
      o.value = `${c.type}|${c.group}|${c.subgroup}`;
      o.textContent = `${c.group} — ${c.subgroup}`;
      if (editing && editing.type === c.type && editing.group === c.group && editing.subgroup === c.subgroup) {
        o.selected = true;
      }
      group.append(o);
    }
    s.append(group);
  }
  return s;
}

function renderTable(
  deps: TransactionsViewDeps,
  sortDir: SortDir,
  onToggleSort: () => void,
  onEdit: (tx: TransactionRow) => void,
): HTMLElement {
  if (!deps.transactions.length) {
    return el('div', { className: 'card' }, [
      el('div', { className: 'state', textContent: 'Sin transacciones que coincidan con los filtros.' }),
    ]);
  }

  const arrow = sortDir === 'desc' ? '↓' : '↑';
  const dateHeader = el('th', {
    className: 'sortable',
    onclick: onToggleSort,
    title: 'Ordenar por fecha',
  }, [
    'Fecha',
    el('span', { className: 'sort-arrow', textContent: arrow }),
  ]);

  const thead = el('thead', {}, [
    el('tr', {}, [
      dateHeader,
      th('Descripcion'),
      th('Categoria'),
      th('Banco'),
      th('Importe', 'right'),
      th(''),
    ]),
  ]);

  const tbody = el('tbody', {}, deps.transactions.map(tx => {
    const amountCls = tx.amount >= 0 ? 'tx-amount tx-amount--ok' : 'tx-amount tx-amount--danger';
    const badgeCls = tx.type === 'cobros' ? 'badge badge--ok'
      : tx.type === 'pagos' ? 'badge badge--danger'
      : 'badge';
    const badgeLabel = tx.type === 'cobros' ? 'Cobro'
      : tx.type === 'pagos' ? 'Pago'
      : 'Otro';
    return el('tr', {}, [
      el('td', { className: 'tx-date', textContent: tx.date }),
      el('td', { className: 'tx-desc', textContent: tx.description || '—' }),
      el('td', { className: 'tx-category' }, [
        el('div', { style: 'display:flex;align-items:center;gap:.5rem;flex-wrap:wrap;' }, [
          el('span', { className: badgeCls, textContent: badgeLabel }),
          el('span', { textContent: `${tx.group} · ${tx.subgroup}` }),
        ]),
      ]),
      el('td', { textContent: tx.bank || '—' }),
      el('td', { className: amountCls, textContent: `${formatAmount(tx.amount)} EUR` }),
      el('td', { className: 'tx-actions' }, [
        el('button', {
          className: 'btn btn--ghost btn--sm',
          title: 'Editar',
          onclick: () => onEdit(tx),
        }, [icons.edit()]),
        el('button', {
          className: 'btn btn--ghost btn--sm btn--danger',
          title: 'Borrar',
          onclick: async () => {
            const ok = await confirmDialog({
              title: 'Borrar transaccion',
              message: `Esta accion no se puede deshacer. Se eliminara "${tx.description || 'esta transaccion'}" del ${tx.date}.`,
              confirmText: 'Borrar',
              danger: true,
            });
            if (!ok) return;
            await deps.onDelete(tx.rowIndex);
          },
        }, [icons.trash()]),
      ]),
    ]);
  }));

  return el('div', { className: 'card', style: 'padding:0;overflow:hidden;' }, [
    el('table', { className: 'tx-table' }, [thead, tbody]),
  ]);
}

function inp(type: string, value: string, placeholder = ''): HTMLInputElement {
  const i = document.createElement('input');
  i.type = type;
  i.value = value;
  i.placeholder = placeholder;
  i.className = 'input';
  return i;
}

function th(text: string, align: 'left' | 'right' = 'left'): HTMLElement {
  return el('th', { textContent: text, style: `text-align:${align};` });
}

function formatAmount(n: number): string {
  return new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}
