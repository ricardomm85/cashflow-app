import { el } from '../dom.ts';

interface Options {
  onStartEmpty: () => Promise<void>;
  onImport: () => Promise<void>;
  onSignOut: () => void;
}

export function renderOnboardingView(opts: Options): HTMLElement {
  const status = el('p', { className: 'state state--muted', style: 'min-height:1.5em;' });

  const setStatus = (msg: string, isError = false): void => {
    status.textContent = msg;
    status.className = isError ? 'state state--error' : 'state state--muted';
  };

  const startBtn = el('button', {
    className: 'btn btn--accent',
    textContent: 'Empezar de cero',
  });

  const importBtn = el('button', {
    className: 'btn btn--primary',
    textContent: 'Importar desde Excel Lanzadera',
  });

  const disable = (v: boolean): void => {
    startBtn.disabled = v;
    importBtn.disabled = v;
  };

  startBtn.onclick = async () => {
    disable(true);
    setStatus('Creando tu hoja nueva...');
    try {
      await opts.onStartEmpty();
    } catch (e) {
      setStatus(e instanceof Error ? e.message : String(e), true);
      disable(false);
    }
  };

  importBtn.onclick = async () => {
    disable(true);
    setStatus('Abriendo selector...');
    try {
      await opts.onImport();
    } catch (e) {
      setStatus(e instanceof Error ? e.message : String(e), true);
      disable(false);
    }
  };

  const signOutBtn = el('button', {
    className: 'btn btn--ghost',
    textContent: 'Cerrar sesion',
    onclick: opts.onSignOut,
  });

  return el('div', { className: 'auth' }, [
    el('div', { className: 'auth__card' }, [
      el('div', { className: 'auth__mark', textContent: 'C' }),
      el('h1', { textContent: 'Configura tu Cashflow' }),
      el('p', {
        textContent: 'Puedes empezar con una hoja vacia o importar tus datos desde una plantilla Lanzadera.',
      }),
      startBtn,
      importBtn,
      status,
      signOutBtn,
    ]),
  ]);
}
