import { el } from './dom.ts';
import { currentRoute, navigate, type Route } from './router.ts';
import { signOut } from './auth.ts';
import { icons } from './icons.ts';

interface NavLink {
  route: Route;
  label: string;
  icon: () => Element;
}

const PRIMARY: NavLink[] = [
  { route: 'dashboard', label: 'Dashboard', icon: icons.dashboard },
  { route: 'transactions', label: 'Transacciones', icon: icons.transactions },
  { route: 'categories', label: 'Categorias', icon: icons.categories },
];

const SECONDARY: NavLink[] = [
  { route: 'bank-balances', label: 'Bancos', icon: icons.bank },
  { route: 'currencies', label: 'Divisas', icon: icons.currency },
  { route: 'config', label: 'Configuracion', icon: icons.config },
];

function navItem(link: NavLink, active: boolean): HTMLButtonElement {
  return el('button', {
    className: active ? 'nav-item nav-item--active' : 'nav-item',
    onclick: () => navigate(link.route),
  }, [
    link.icon(),
    el('span', { textContent: link.label }),
  ]);
}

function userInitial(email: string): string {
  return (email[0] ?? 'U').toUpperCase();
}

export function renderShell(opts: {
  userEmail: string;
  companyName?: string;
  content: HTMLElement;
}): HTMLElement {
  const active = currentRoute();
  const company = opts.companyName?.trim();

  const brandBlock = el('div', { className: 'sidebar__brand' }, [
    el('div', { className: 'sidebar__brand-mark', textContent: 'C' }),
    el('div', { className: 'sidebar__brand-text' }, [
      el('div', { className: 'sidebar__brand-name', textContent: 'Cashflow' }),
      ...(company
        ? [el('div', { className: 'sidebar__brand-company', title: company, textContent: company })]
        : []),
    ]),
  ]);

  const sidebar = el('aside', { className: 'sidebar' }, [
    brandBlock,
    el('nav', { className: 'sidebar__nav' }, [
      el('div', { className: 'sidebar__section', textContent: 'General' }),
      ...PRIMARY.map(l => navItem(l, l.route === active)),
      el('div', { className: 'sidebar__section', textContent: 'Datos maestros' }),
      ...SECONDARY.map(l => navItem(l, l.route === active)),
    ]),
    el('div', { className: 'sidebar__footer' }, [
      el('div', { className: 'sidebar__user' }, [
        el('div', { className: 'sidebar__avatar', textContent: userInitial(opts.userEmail) }),
        el('div', { className: 'sidebar__email', title: opts.userEmail, textContent: opts.userEmail }),
      ]),
      el('button', {
        className: 'btn btn--ghost',
        onclick: () => signOut(),
      }, [icons.logout(), el('span', { textContent: 'Cerrar sesion' })]),
    ]),
  ]);

  const main = el('main', { className: 'main' }, [opts.content]);

  return el('div', { className: 'layout' }, [sidebar, main]);
}

export function pageHeader(title: string, sub?: string, actions?: HTMLElement): HTMLElement {
  const children: (Node | string)[] = [
    el('div', {}, [
      el('h1', { textContent: title }),
      ...(sub ? [el('div', { className: 'page-header__sub', textContent: sub })] : []),
    ]),
  ];
  if (actions) children.push(actions);
  return el('div', { className: 'page-header' }, children);
}
