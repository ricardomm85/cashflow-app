interface Env {
  SUPABASE_URL: string;
  SUPABASE_PUBLISHABLE_KEY: string;
  GOOGLE_CLIENT_ID: string;
}

function required(key: string, value: string | undefined): string {
  if (!value) throw new Error(`Missing env var: ${key}`);
  return value;
}

export const env: Env = {
  SUPABASE_URL: required('VITE_SUPABASE_URL', import.meta.env.VITE_SUPABASE_URL),
  SUPABASE_PUBLISHABLE_KEY: required('VITE_SUPABASE_PUBLISHABLE_KEY', import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY),
  GOOGLE_CLIENT_ID: required('VITE_GOOGLE_CLIENT_ID', import.meta.env.VITE_GOOGLE_CLIENT_ID),
};
