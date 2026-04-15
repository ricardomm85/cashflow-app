# Cashflow

Control de caja para pymes/freelancers. Datos en Google Sheets del usuario.

## Stack

- TypeScript vanilla + HTML + CSS (sin framework UI)
- Vite (bundler)
- Supabase Auth (Google OAuth)
- Google Sheets API (fetch directo con token del usuario)
- GitHub Pages (hosting estatico)

## Setup

```bash
npm install
cp .env.example .env.local
# rellenar VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY, VITE_GOOGLE_CLIENT_ID
npm run dev
```

## Config Supabase

1. Habilitar Google provider.
2. En Google Cloud Console anadir scopes:
   - `https://www.googleapis.com/auth/spreadsheets`
   - `https://www.googleapis.com/auth/drive.file`
3. Redirect URI: `https://<tu-proyecto>.supabase.co/auth/v1/callback`.

## Build

```bash
npm run build      # → dist/
npm run preview    # servir dist local
```

## Deploy

Push a `master` dispara workflow. Configurar secrets en repo:
`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_GOOGLE_CLIENT_ID`.

## Estructura

```
src/
  main.ts       entry + render
  auth.ts       Supabase + Google OAuth
  sheets.ts     Google Sheets API (read/write/append/create)
  env.ts        env vars validadas
  types.ts      tipos dominio
  styles.css
```

Ver `PROJECT.md` para estructura de las 5 hojas.
