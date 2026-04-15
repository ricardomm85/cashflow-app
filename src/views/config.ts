import { el } from '../dom.ts';
import { pageHeader } from '../layout.ts';
import { icons } from '../icons.ts';
import { applyErrors, createField, type FieldHandle } from '../ui/field.ts';
import type { Config } from '../types.ts';

const FORECAST_LABEL: Record<string, string> = {
  manual: 'Manual',
  historical: 'Historico',
  average: 'Promedio',
};

export function renderConfigView(
  current: Partial<Config>,
  onSubmit: (c: Config) => Promise<void>,
  opts: { firstTime: boolean } = { firstTime: false },
): HTMLElement {
  const companyInp = inp('text', current.companyName ?? '', 'Mi Empresa SL');
  const startDateInp = inp('date', current.startDate ?? new Date().toISOString().slice(0, 10));
  const vatSalesInp = numInp(current.vatSales ?? 0.21);
  const vatExpensesInp = numInp(current.vatExpenses ?? 0.21);
  const forecastSel = buildForecastSelect(current.forecastMode ?? 'manual');

  const fields: Record<string, FieldHandle> = {
    company: createField('Nombre de la empresa', companyInp),
    startDate: createField('Fecha inicio', startDateInp, 'Desde cuando registras movimientos'),
    vatSales: createField('IVA ventas', vatSalesInp, '0.21 = 21%'),
    vatExpenses: createField('IVA gastos', vatExpensesInp, '0.21 = 21%'),
    forecast: createField('Modo de prevision', forecastSel),
  };

  const status = el('span', { className: 'page-header__sub' });
  const submitBtn = el('button', {
    type: 'submit',
    className: 'btn btn--primary',
    textContent: opts.firstTime ? 'Empezar' : 'Guardar cambios',
  });

  const form = el('form', {
    noValidate: true,
    onsubmit: async (ev: Event) => {
      ev.preventDefault();
      const company = companyInp.value.trim();
      const vs = Number(vatSalesInp.value);
      const ve = Number(vatExpensesInp.value);
      const errors = {
        company: company.length < 2 ? 'Minimo 2 caracteres' : null,
        startDate: !startDateInp.value ? 'Selecciona una fecha' : null,
        vatSales: !vatSalesInp.value || Number.isNaN(vs) || vs < 0 || vs > 1
          ? 'Entre 0 y 1 (ej. 0.21)' : null,
        vatExpenses: !vatExpensesInp.value || Number.isNaN(ve) || ve < 0 || ve > 1
          ? 'Entre 0 y 1 (ej. 0.21)' : null,
        forecast: null,
      };
      if (applyErrors(fields, errors)) return;

      submitBtn.disabled = true;
      status.textContent = 'Guardando...';
      try {
        await onSubmit({
          companyName: company,
          startDate: startDateInp.value,
          vatSales: vs,
          vatExpenses: ve,
          forecastMode: forecastSel.value,
        });
        status.textContent = 'Guardado.';
      } catch (e) {
        status.textContent = e instanceof Error ? e.message : String(e);
      } finally {
        submitBtn.disabled = false;
      }
    },
  }, [
    el('div', { className: 'form-grid form-grid--config' }, Object.values(fields).map(h => h.element)),
    el('div', { className: 'btn-row', style: 'margin-top:1rem;align-items:center;' }, [submitBtn, status]),
  ]);

  const configIcon = icons.config();
  configIcon.setAttribute('width', '16');
  configIcon.setAttribute('height', '16');
  configIcon.setAttribute('style', 'color:var(--muted);flex-shrink:0;');

  return el('div', {}, [
    pageHeader(
      'Configuracion',
      opts.firstTime ? 'Rellena los datos iniciales para empezar.' : 'Datos de tu empresa.',
    ),
    el('div', { className: 'card' }, [
      el('div', { style: 'display:flex;align-items:center;gap:.5rem;margin-bottom:1rem;' }, [
        configIcon,
        el('h2', { className: 'card__title', style: 'margin:0;', textContent: 'Datos de empresa' }),
      ]),
      form,
    ]),
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

function numInp(value: number): HTMLInputElement {
  const i = inp('number', String(value));
  i.step = '0.01';
  i.min = '0';
  i.max = '1';
  return i;
}

function buildForecastSelect(value: string): HTMLSelectElement {
  const s = document.createElement('select');
  s.className = 'select';
  for (const opt of ['manual', 'historical', 'average']) {
    const o = document.createElement('option');
    o.value = opt;
    o.textContent = FORECAST_LABEL[opt] ?? opt;
    if (opt === value) o.selected = true;
    s.append(o);
  }
  return s;
}
