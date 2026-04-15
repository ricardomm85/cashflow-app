import { el } from '../dom.ts';

export interface FieldHandle {
  element: HTMLElement;
  input: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
  setError(msg: string | null): void;
}

type AnyInput = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

export function createField(label: string, input: AnyInput, hint?: string): FieldHandle {
  const errorEl = el('span', { className: 'field__error' });
  const hintEl = hint ? el('span', { className: 'field__hint', textContent: hint }) : null;

  const children: (Node | string)[] = [
    el('span', { className: 'field__label', textContent: label }),
    input,
  ];
  if (hintEl) children.push(hintEl);
  children.push(errorEl);

  const container = el('label', { className: 'field' }, children);

  const handle: FieldHandle = {
    element: container,
    input,
    setError(msg: string | null) {
      if (msg) {
        input.classList.add('invalid');
        errorEl.textContent = msg;
        errorEl.classList.add('visible');
      } else {
        input.classList.remove('invalid');
        errorEl.textContent = '';
        errorEl.classList.remove('visible');
      }
    },
  };

  const clear = (): void => handle.setError(null);
  input.addEventListener('input', clear);
  input.addEventListener('change', clear);

  return handle;
}

export function applyErrors(
  handles: Record<string, FieldHandle>,
  errors: Record<string, string | null>,
): boolean {
  let hasErrors = false;
  for (const [key, handle] of Object.entries(handles)) {
    const msg = errors[key] ?? null;
    handle.setError(msg);
    if (msg) hasErrors = true;
  }
  const firstInvalid = Object.values(handles).find(h => h.input.classList.contains('invalid'));
  if (firstInvalid) firstInvalid.input.focus();
  return hasErrors;
}
