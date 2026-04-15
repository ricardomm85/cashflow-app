import { el } from '../dom.ts';
import { pageHeader } from '../layout.ts';
import type { Config } from '../types.ts';

export function renderConfigView(
  current: Partial<Config>,
  onSubmit: (c: Config) => Promise<void>,
  opts: { firstTime: boolean } = { firstTime: false },
): HTMLElement {
  const company = input('text', current.companyName ?? '', 'Mi Empresa SL');
  const startDate = input('date', current.startDate ?? new Date().toISOString().slice(0, 10));
  const vatSales = numInput(current.vatSales ?? 0.21);
  const vatExpenses = numInput(current.vatExpenses ?? 0.21);
  const forecast = select(['manual', 'historical', 'average'], current.forecastMode ?? 'manual');
  const status = el('span', { className: 'page-header__sub' });
  const submitBtn = el('button', { type: 'submit', className: 'btn btn--primary', textContent: 'Guardar' });

  const form = el('form', {
    onsubmit: async (ev: Event) => {
      ev.preventDefault();
      submitBtn.disabled = true;
      status.textContent = 'Guardando...';
      try {
        await onSubmit({
          companyName: company.value.trim(),
          startDate: startDate.value,
          vatSales: Number(vatSales.value),
          vatExpenses: Number(vatExpenses.value),
          forecastMode: forecast.value,
        });
        status.textContent = 'Guardado.';
      } catch (e) {
        status.textContent = e instanceof Error ? e.message : String(e);
      } finally {
        submitBtn.disabled = false;
      }
    },
  }, [
    field('Nombre de la empresa', company),
    field('Fecha inicio', startDate),
    field('IVA ventas (0.21 = 21%)', vatSales),
    field('IVA gastos', vatExpenses),
    field('Modo de prevision', forecast),
    el('div', { className: 'btn-row', style: 'margin-top:1rem;align-items:center;' }, [submitBtn, status]),
  ]);

  return el('div', {}, [
    pageHeader(
      'Configuracion',
      opts.firstTime ? 'Rellena los datos iniciales para empezar.' : 'Datos de tu empresa.',
    ),
    el('div', { className: 'card', style: 'max-width:520px;' }, [form]),
  ]);
}

function field(label: string, control: HTMLElement): HTMLElement {
  return el('label', { className: 'field' }, [
    el('span', { className: 'field__label', textContent: label }),
    control,
  ]);
}

function input(type: string, value: string, placeholder = ''): HTMLInputElement {
  const i = document.createElement('input');
  i.type = type;
  i.value = value;
  i.placeholder = placeholder;
  i.className = 'input';
  return i;
}

function numInput(value: number): HTMLInputElement {
  const i = input('number', String(value));
  i.step = '0.01';
  i.min = '0';
  return i;
}

function select(options: string[], value: string): HTMLSelectElement {
  const s = document.createElement('select');
  s.className = 'select';
  for (const opt of options) {
    const o = document.createElement('option');
    o.value = opt;
    o.textContent = opt;
    if (opt === value) o.selected = true;
    s.append(o);
  }
  return s;
}
