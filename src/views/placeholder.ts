import { el } from '../dom.ts';
import { pageHeader } from '../layout.ts';

export function renderPlaceholder(title: string, sub: string): HTMLElement {
  return el('div', {}, [
    pageHeader(title, sub),
    el('div', { className: 'card' }, [
      el('div', { className: 'state', textContent: 'Proximamente.' }),
    ]),
  ]);
}
