# Cashflow

Control de caja para pymes/freelancers. Datos en Google Sheets del usuario.

## Stack

- TypeScript vanilla + HTML + CSS (sin framework UI)
- Vite (bundler)
- Supabase Auth (Google OAuth)
- Google Sheets API (fetch directo con token del usuario)
- GitHub Pages (hosting estatico, sin backend)

## Quick Start

```bash
git clone git@github.com:ricardomm85/cashflow-app.git
cd cashflow-app
npm install
cp .env.example .env.local
# rellenar las 3 variables (ver guia)
npm run dev
```

**Primera vez?** → Lee la [guia completa de instalacion](docs/GETTING_STARTED.md) con paso a paso para configurar Google Cloud Console, Supabase y GitHub Pages.

## Scripts

| Comando | Que hace |
|---------|----------|
| `npm run dev` | Dev server en http://localhost:5173 |
| `npm run build` | Build produccion → `dist/` |
| `npm run preview` | Servir `dist/` en local |
| `npm run typecheck` | Verificar tipos sin compilar |

## Deploy

Push a `master` dispara el workflow de GitHub Actions. Requiere 3 secrets en el repo:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_GOOGLE_CLIENT_ID`

Ver [guia de deploy](docs/GETTING_STARTED.md#6-desplegar-en-github-pages).

## Estructura

```
src/
  main.ts           entry + routing + cache
  auth.ts           Supabase + Google OAuth + token refresh
  sheets.ts         Google Sheets API (read/write/batchGet + retry)
  cache.ts          localStorage cache con TTL
  cashflow.ts       motor de calculo (agregados, bancos, categorias top)
  config.ts         leer/escribir config del sheet
  transactions.ts   CRUD transacciones
  categories.ts     CRUD categorias
  bank-balances.ts  saldos mensuales por entidad
  seed.ts           datos iniciales al crear la hoja
  migrate.ts        migraciones de esquema
  router.ts         hash router
  layout.ts         sidebar + shell
  theme.ts          claro/oscuro
  dom.ts            helper createElement
  icons.ts          iconos SVG inline
  env.ts            env vars validadas
  types.ts          tipos dominio
  ui/
    field.ts        campos con validacion inline
    confirm.ts      modal de confirmacion
  views/
    dashboard.ts    resumen + cashflow mensual
    transactions.ts listado + form + filtros
    categories.ts   gestion categorias
    bank-balances.ts saldos bancarios
    config.ts       configuracion empresa
```

## Datos

Todo vive en un Google Sheet del usuario con 4 hojas. Ver [PROJECT.md](PROJECT.md) para la estructura.
