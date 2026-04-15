import { createClient, type Session } from '@supabase/supabase-js';
import { env } from './env.ts';

export const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_PUBLISHABLE_KEY);

const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.file',
].join(' ');

const TOKEN_KEY = 'cashflow.google_token';

interface StoredToken {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: number;
}

export async function signInWithGoogle(): Promise<void> {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      scopes: GOOGLE_SCOPES,
      redirectTo: window.location.origin + window.location.pathname,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  });
  if (error) throw error;
}

export async function signOut(): Promise<void> {
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const key = localStorage.key(i);
    if (key?.startsWith('cashflow.')) localStorage.removeItem(key);
  }
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getSession(): Promise<Session | null> {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export function onAuthChange(cb: (session: Session | null) => void): () => void {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    if (session?.provider_token) {
      storeToken({
        accessToken: session.provider_token,
        refreshToken: session.provider_refresh_token ?? readToken()?.refreshToken ?? null,
        expiresAt: Date.now() + 55 * 60 * 1000,
      });
    }
    cb(session);
  });
  return () => data.subscription.unsubscribe();
}

function storeToken(t: StoredToken): void {
  localStorage.setItem(TOKEN_KEY, JSON.stringify(t));
}

function readToken(): StoredToken | null {
  const raw = localStorage.getItem(TOKEN_KEY);
  return raw ? (JSON.parse(raw) as StoredToken) : null;
}

export async function getGoogleAccessToken(): Promise<string> {
  const stored = readToken();
  if (!stored) throw new Error('Sin token Google. Reloguear.');
  if (Date.now() < stored.expiresAt - 60_000) return stored.accessToken;
  if (!stored.refreshToken) throw new Error('Token caducado sin refresh. Reloguear.');

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      refresh_token: stored.refreshToken,
      grant_type: 'refresh_token',
    }),
  });
  if (!res.ok) { console.error('Token refresh failed:', res.status); throw new Error('Error al renovar sesión. Vuelve a iniciar sesión.'); }
  const data = (await res.json()) as { access_token: string; expires_in: number };
  const refreshed: StoredToken = {
    accessToken: data.access_token,
    refreshToken: stored.refreshToken,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  };
  storeToken(refreshed);
  return refreshed.accessToken;
}

export async function getSpreadsheetId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return (data.user?.user_metadata?.spreadsheet_id as string | undefined) ?? null;
}

export async function setSpreadsheetId(id: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ data: { spreadsheet_id: id } });
  if (error) throw error;
}
