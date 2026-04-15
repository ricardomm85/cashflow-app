export type Route =
  | 'dashboard'
  | 'transactions'
  | 'categories'
  | 'bank-balances'
  | 'currencies'
  | 'config';

const VALID: Route[] = ['dashboard', 'transactions', 'categories', 'bank-balances', 'currencies', 'config'];

export function currentRoute(): Route {
  const hash = window.location.hash.replace(/^#\/?/, '');
  return (VALID as string[]).includes(hash) ? (hash as Route) : 'dashboard';
}

export function navigate(route: Route): void {
  window.location.hash = `/${route}`;
}

export function onRouteChange(cb: (route: Route) => void): () => void {
  const handler = (): void => cb(currentRoute());
  window.addEventListener('hashchange', handler);
  return () => window.removeEventListener('hashchange', handler);
}
