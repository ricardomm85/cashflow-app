import { el } from '../dom.ts';
import { pageHeader } from '../layout.ts';
import { icons } from '../icons.ts';
import { applyErrors, createField, type FieldHandle } from '../ui/field.ts';
import { confirmDialog } from '../ui/confirm.ts';
import type { Category, TxType } from '../types.ts';
import type { CategoryRow } from '../categories.ts';

export interface CategoriesViewDeps {
  categories: CategoryRow[];
  onAdd: (cat: Category) => Promise<void>;
  onToggle: (rowIndex: number, active: boolean) => Promise<void>;
  onUpdate: (rowIndex: number, cat: Category) => Promise<void>;
}

const TYPE_LABEL: Record<TxType, string> = {
  cobros: 'Cobros',
  pagos: 'Pagos',
  otros: 'Otros',
};

const TYPE_BADGE: Record<TxType, string> = {
  cobros: 'badge--ok',
  pagos: 'badge--danger',
  otros: 'badge--accent',
};

export function renderCategories(deps: CategoriesViewDeps): HTMLElement {
  const container = el('div');
  let formOpen = false;
  let editing: CategoryRow | null = null;

  const refresh = (): void => {
    const active = deps.categories.filter(c => c.active).length;
    const total = deps.categories.length;

    container.replaceChildren(
      pageHeader('Categorias', `${active} activas de ${total} totales.`),
      renderFormCard(deps, editing, formOpen, () => {
        formOpen = !formOpen;
        if (!formOpen) editing = null;
        refresh();
      }, () => {
        editing = null;
        formOpen = false;
        refresh();
      }),
      ...renderByType(deps, tx => {
        editing = tx;
        formOpen = true;
        refresh();
        container.scrollIntoView({ behavior: 'smooth' });
      }),
    );
  };

  refresh();
  return container;
}

function renderFormCard(
  deps: CategoriesViewDeps,
  editing: CategoryRow | null,
  open: boolean,
  onToggle: () => void,
  onDone: () => void,
): HTMLElement {
  const title = editing ? 'Editar categoria' : 'Nueva categoria';

  const header = el('div', { className: 'card__header', onclick: onToggle }, [
    el('div', { style: 'display:flex;align-items:center;gap:.5rem;' }, [
      icons.plus(),
      el('h2', { textContent: title }),
    ]),
    icons.chevron(),
  ]);
  (header.lastChild as HTMLElement).classList.add('card__chevron');

  const body = el('div', { className: 'card__body' }, [renderForm(deps, editing, onDone)]);

  return el('div', {
    className: `card card--collapsible${open ? ' card--open' : ''}`,
    style: 'margin-bottom:1.5rem;',
  }, [header, body]);
}

function renderForm(
  deps: CategoriesViewDeps,
  editing: CategoryRow | null,
  onDone: () => void,
): HTMLElement {
  const typeSel = document.createElement('select');
  typeSel.className = 'select';
  for (const t of ['cobros', 'pagos', 'otros'] as TxType[]) {
    const o = document.createElement('option');
    o.value = t;
    o.textContent = TYPE_LABEL[t];
    if (editing?.type === t) o.selected = true;
    typeSel.append(o);
  }

  const groupInp = inp('text', editing?.group ?? '', 'Ej. Personal');
  const subgroupInp = inp('text', editing?.subgroup ?? '', 'Ej. Nominas');

  const fields: Record<string, FieldHandle> = {
    type: createField('Tipo', typeSel),
    group: createField('Grupo', groupInp),
    subgroup: createField('Subgrupo', subgroupInp),
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
      const group = groupInp.value.trim();
      const subgroup = subgroupInp.value.trim();
      const type = typeSel.value as TxType;
      const duplicate = deps.categories.some(c =>
        (!editing || c.rowIndex !== editing.rowIndex) &&
        c.type === type &&
        c.group.toLowerCase() === group.toLowerCase() &&
        c.subgroup.toLowerCase() === subgroup.toLowerCase(),
      );
      const errors = {
        type: null,
        group: group.length < 2 ? 'Minimo 2 caracteres' : null,
        subgroup: subgroup.length < 2 ? 'Minimo 2 caracteres'
          : duplicate ? 'Ya existe esta combinacion tipo/grupo/subgrupo'
          : null,
      };
      if (applyErrors(fields, errors)) return;

      const cat: Category = {
        type,
        group,
        subgroup,
        active: editing?.active ?? true,
      };

      submitBtn.disabled = true;
      status.textContent = 'Guardando...';
      try {
        if (editing) {
          await deps.onUpdate(editing.rowIndex, cat);
        } else {
          await deps.onAdd(cat);
        }
        onDone();
      } catch (e) {
        status.textContent = e instanceof Error ? e.message : String(e);
      } finally {
        submitBtn.disabled = false;
      }
    },
  }, [
    el('div', { className: 'form-grid' }, Object.values(fields).map(h => h.element)),
    el('div', { className: 'btn-row', style: 'margin-top:1rem;align-items:center;' }, [
      submitBtn,
      ...(editing
        ? [el('button', { type: 'button', className: 'btn', textContent: 'Cancelar', onclick: onDone })]
        : []),
      status,
    ]),
  ]);

  return form;
}

function renderByType(
  deps: CategoriesViewDeps,
  onEdit: (cat: CategoryRow) => void,
): HTMLElement[] {
  const byType: Record<TxType, CategoryRow[]> = { cobros: [], pagos: [], otros: [] };
  for (const c of deps.categories) byType[c.type].push(c);

  const sections: HTMLElement[] = [];
  for (const type of ['cobros', 'pagos', 'otros'] as TxType[]) {
    const cats = byType[type];
    if (!cats.length) continue;
    sections.push(renderTypeCard(type, cats, deps, onEdit));
  }
  return sections;
}

function renderTypeCard(
  type: TxType,
  cats: CategoryRow[],
  deps: CategoriesViewDeps,
  onEdit: (cat: CategoryRow) => void,
): HTMLElement {
  const active = cats.filter(c => c.active).length;

  const byGroup: Record<string, CategoryRow[]> = {};
  for (const c of cats) {
    (byGroup[c.group] ??= []).push(c);
  }

  const groupBlocks: HTMLElement[] = [];
  for (const [groupName, items] of Object.entries(byGroup)) {
    groupBlocks.push(
      el('div', { style: 'margin-bottom:1rem;' }, [
        el('div', {
          style: 'font-size:.8125rem;font-weight:600;color:var(--fg-soft);margin-bottom:.375rem;padding-left:.25rem;',
          textContent: groupName,
        }),
        el('div', { style: 'display:flex;flex-direction:column;border:1px solid var(--border);border-radius:8px;overflow:hidden;' },
          items.map((cat, idx) => renderRow(cat, deps, onEdit, idx === items.length - 1)),
        ),
      ]),
    );
  }

  return el('div', { className: 'card', style: 'margin-bottom:1rem;' }, [
    el('div', { style: 'display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem;' }, [
      el('div', { style: 'display:flex;align-items:center;gap:.625rem;' }, [
        el('span', { className: `badge ${TYPE_BADGE[type]}`, textContent: TYPE_LABEL[type] }),
        el('span', { style: 'font-size:.8125rem;color:var(--muted);', textContent: `${active} activas / ${cats.length}` }),
      ]),
    ]),
    ...groupBlocks,
  ]);
}

function renderRow(
  cat: CategoryRow,
  deps: CategoriesViewDeps,
  onEdit: (cat: CategoryRow) => void,
  isLast: boolean,
): HTMLElement {
  const toggle = document.createElement('input');
  toggle.type = 'checkbox';
  toggle.checked = cat.active;
  toggle.className = 'toggle';
  toggle.onchange = async () => {
    toggle.disabled = true;
    try {
      await deps.onToggle(cat.rowIndex, toggle.checked);
    } catch (e) {
      toggle.checked = !toggle.checked;
      await confirmDialog({
        title: 'Error',
        message: e instanceof Error ? e.message : String(e),
        confirmText: 'Ok',
        cancelText: '',
      });
    } finally {
      toggle.disabled = false;
    }
  };

  return el('div', {
    style: `display:flex;align-items:center;gap:.75rem;padding:.625rem .875rem;${isLast ? '' : 'border-bottom:1px solid var(--border);'}background:${cat.active ? 'var(--surface)' : 'var(--surface-muted)'};`,
  }, [
    toggle,
    el('span', {
      style: `flex:1;font-size:.875rem;${cat.active ? 'color:var(--fg);' : 'color:var(--muted);text-decoration:line-through;'}`,
      textContent: cat.subgroup,
    }),
    el('button', {
      className: 'btn btn--ghost btn--sm',
      title: 'Editar',
      onclick: () => onEdit(cat),
    }, [icons.edit()]),
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
