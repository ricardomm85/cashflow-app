import { el } from '../dom.ts';

interface ConfirmOpts {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
}

export function confirmDialog(opts: ConfirmOpts): Promise<boolean> {
  return new Promise(resolve => {
    const close = (ok: boolean): void => {
      document.removeEventListener('keydown', onKey);
      overlay.remove();
      resolve(ok);
    };

    const onKey = (ev: KeyboardEvent): void => {
      if (ev.key === 'Escape') close(false);
      else if (ev.key === 'Enter') close(true);
    };

    const showCancel = opts.cancelText !== '';
    const cancelBtn = showCancel ? el('button', {
      className: 'btn',
      textContent: opts.cancelText ?? 'Cancelar',
      onclick: () => close(false),
    }) : null;

    const confirmBtn = el('button', {
      className: opts.danger ? 'btn btn--danger-solid' : 'btn btn--primary',
      textContent: opts.confirmText ?? 'Confirmar',
      onclick: () => close(true),
    });

    const actions: (Node | string)[] = cancelBtn ? [cancelBtn, confirmBtn] : [confirmBtn];

    const dialog = el('div', { className: 'modal', onclick: (e: Event) => e.stopPropagation() }, [
      el('h3', { className: 'modal__title', textContent: opts.title }),
      el('p', { className: 'modal__message', textContent: opts.message }),
      el('div', { className: 'modal__actions' }, actions),
    ]);

    const overlay = el('div', {
      className: 'modal-overlay',
      onclick: () => close(false),
    }, [dialog]);

    document.body.append(overlay);
    document.addEventListener('keydown', onKey);
    requestAnimationFrame(() => confirmBtn.focus());
  });
}
