# currentDate

Today's date is {{current_date}}. Use `date` in bash if you need the exact time.

# Project: Cashflow — Control de caja

Spanish-language web app for SME/freelancer cash flow management. Users sign in with Google, and their financial data lives in a Google Sheet on their own Drive.

## Stack

- **Framework**: Next.js 16.2.3 (App Router, Turbopack)
- **UI**: React 19, Tailwind CSS 4, shadcn/ui, lucide-react icons, sonner toasts
- **Auth**: Supabase (Google OAuth with Sheets + Drive scopes)
- **Data storage**: Google Sheets API (user's own Drive)
- **User settings**: Supabase PostgreSQL (`user_settings` table with RLS)
- **Language**: TypeScript 5, all source in `src/`
- **Installed but unused**: zustand, @tanstack/react-query (available for future use)

## Commands

```bash
npm run dev        # Start dev server (Turbopack) → http://localhost:3000
npm run build      # Production build
npm run start      # Run production build
npm run lint       # ESLint
npm run typecheck  # tsc --noEmit
```

## Project structure

```
src/
├── app/
│   ├── page.tsx                          # Landing page (public)
│   ├── layout.tsx                        # Root layout (fonts, metadata)
│   ├── globals.css                       # Tailwind + shadcn theme variables
│   ├── auth/callback/route.ts            # OAuth callback → stores Google tokens in httpOnly cookies
│   ├── (auth)/
│   │   ├── layout.tsx                    # Auth pages layout
│   │   └── login/page.tsx                # Google sign-in page
│   ├── (app)/
│   │   ├── layout.tsx                    # Sidebar layout (nav, user dropdown)
│   │   ├── dashboard/page.tsx            # KPI cards, cashflow chart, P&L
│   │   ├── onboarding/page.tsx           # 3-step wizard: company → start date → VAT%
│   │   ├── transactions/page.tsx         # Transaction list with filters, add/edit dialog
│   │   ├── categories/page.tsx           # Category tree (type → group → subgroup)
│   │   ├── bank-balances/page.tsx        # Bank accounts + credit lines, 18-month grid
│   │   ├── cashflow/page.tsx             # 18-month cashflow projection table
│   │   ├── currencies/page.tsx           # Exchange rate management
│   │   └── settings/page.tsx             # Company settings, account info, delete account
│   └── api/
│       ├── auth/signout/route.ts         # GET: sign out + delete token cookies
│       ├── sheets/read/route.ts          # GET: read sheet range (?spreadsheetId&range)
│       ├── sheets/write/route.ts         # POST: update cells (spreadsheetId, range, values)
│       ├── sheets/append/route.ts        # POST: append rows (spreadsheetId, sheetName, rows)
│       ├── sheets/create/route.ts        # POST: create spreadsheet with 5 sheets + defaults
│       └── user/settings/route.ts        # GET/PUT/DELETE user_settings in Supabase
├── components/
│   ├── transactions/
│   │   ├── TransactionForm.tsx           # Add/edit transaction dialog
│   │   └── TransactionTable.tsx          # Sortable table with selection
│   └── ui/                               # shadcn/ui primitives (don't edit manually)
├── hooks/
│   ├── useTransactions.ts                # Fetch, add, delete transactions from sheets
│   ├── useCategories.ts                  # Fetch categories, get groups/subgroups
│   └── use-mobile.ts                     # Viewport <768px detection
└── lib/
    ├── types.ts                          # All TypeScript interfaces
    ├── utils.ts                          # cn() class merging utility
    ├── default-categories.ts             # 51 default categories (cobros/pagos/otros)
    ├── cashflow-engine.ts                # calculateCashflow() → 18-month projections
    ├── spreadsheet-setup.ts              # initializeSpreadsheet() → writes headers to 6 sheets
    ├── google/
    │   ├── auth.ts                       # getGoogleToken() from cookies
    │   └── sheets.ts                     # Google Sheets API wrapper functions
    └── supabase/
        ├── client.ts                     # Browser Supabase client
        ├── server.ts                     # Server Supabase client (cookie-based)
        └── middleware.ts                 # updateSession() for auth middleware
```

## Architecture: how data flows

### Auth flow
1. User clicks "Iniciar sesion con Google" → Supabase OAuth popup
2. Google redirects to `/auth/callback?code=...`
3. Callback exchanges code for session via Supabase
4. `provider_token` (access) and `provider_refresh_token` stored as httpOnly cookies (1hr / 1yr)
5. `src/middleware.ts` validates session on all `/(app)` routes; unauthenticated → `/login`

### Data flow (UI → API → Google Sheets)
1. Page fetches `/api/user/settings` → gets `spreadsheet_id` from Supabase
2. Page calls POST `/api/sheets/read` with body `{ spreadsheetId, sheetName }` (or GET with query params for some pages)
3. API route reads `google_access_token` cookie, calls Google Sheets API
4. Returns raw `values[][]` → page parses into typed objects (Transaction[], etc.)
5. User edits → POST to `/api/sheets/write` (update) or `/api/sheets/append` (new rows)

### What lives where
| Data | Storage | Access |
|------|---------|--------|
| User session, auth | Supabase Auth | Cookies |
| User settings (company, spreadsheet_id, VAT) | Supabase `user_settings` table | REST API |
| Transactions, categories, balances, currencies | Google Sheets (user's Drive) | Sheets API |
| Google tokens | httpOnly cookies | Server-side only |

## Google Sheets structure (5 sheets per user)

### `config` — [Property, Value]
Company Name, Start Date, VAT Sales, VAT Expenses, Forecast Mode

### `categories` — [Type, Group, Subgroup, Active]
51 default rows. Types: `cobros`, `pagos`, `otros`. Three-level hierarchy.

### `transactions` — [Date, Bank, Description, Amount, Currency, Type, Group, Subgroup, ExchangeRate]
- Date: YYYY-MM-DD
- Amount: positive = cobro, negative = pago
- Currency: EUR, USD, GBP, JPY...
- Type/Group/Subgroup: match categories hierarchy
- ExchangeRate: conversion rate to EUR (1.0 for EUR transactions)

### `bank_balances` — [Entity, Type, Limit, YYYY-MM ×18]
- Type: "bank" or "credit_line" (TypeScript: `'bank' | 'credit_line'`)
- Limit: credit limit (only for credito type)
- Monthly columns: balance amounts

### `currencies` — [Currency, YYYY-MM ×18]
- EUR always row 1 with all values = 1.0
- Other currencies: exchange rate relative to EUR per month

## Supabase database

### Table: `user_settings` (RLS enabled)
```sql
id              UUID PRIMARY KEY
user_id         UUID REFERENCES auth.users UNIQUE
spreadsheet_id  TEXT
company_name    TEXT
start_date      DATE
vat_sales       DECIMAL(4,2)    -- 0.21 = 21%
vat_expenses    DECIMAL(4,2)
forecast_mode   TEXT            -- 'SIMPLE' | 'ADVANCED'
created_at      TIMESTAMPTZ
updated_at      TIMESTAMPTZ
```
RLS policies: all operations scoped to `auth.uid() = user_id`.

## Key types (src/lib/types.ts)

- `Category` — { type, group, subgroup, active }
- `Transaction` — { id?, bank, date, description, amount, currency, type, group, subgroup, exchangeRate?, amountEur? }
- `BankBalance` — { entity, type, limit?, balances: Record<string, number> }
- `CurrencyRate` — { currency, rates: Record<string, number> }
- `UserSettings` — { spreadsheet_id, company_name, start_date, vat_sales, vat_expenses, forecast_mode }
- `CashflowRow` — { label, level: 0|1|2, isGroup, months: Record<string, number> }
- `CashflowData` — { collections[], payments[], otherItems[], cashflow[], openingBalance, closingBalance, realBankBalance, difference, creditAvailable, totalLiquidity, burnRate, burnRateAvg3m, runway } (each field except arrays is a CashflowRow)

## Cashflow engine (src/lib/cashflow-engine.ts)

`calculateCashflow(transactions, categories, bankBalances, currencies, startDate)` returns `CashflowData`:

1. Generates 18 month keys from `startDate` (YYYY-MM format)
2. Groups transactions by category hierarchy, sums amounts per month
3. Converts foreign currencies using monthly exchange rates
4. Calculates per-month: total cobros, total pagos, total otros, net cashflow
5. Cumulative opening/closing balance
6. Real bank balance from `bank_balances` sheet
7. Difference = closing balance - real bank balance
8. Credit available = sum of (limit - dispuesto) for credit lines
9. Total liquidity = real bank balance + credit available
10. Burn rate = negative cashflow months (kept as negative values; 0 for positive months)
11. Burn rate avg 3M = rolling 3-month average
12. Runway = total liquidity / burn_rate_avg_3m (months until cash runs out)

## Known issues and TODOs

- **Token refresh not implemented**: `src/lib/google/auth.ts` has a TODO — when the Google access token expires (~1hr), users get errors. Refresh logic using the stored refresh_token cookie is needed.
- **Transaction deletion is local-only**: `useTransactions.ts` `deleteTransactions()` removes from React state but does NOT delete from Google Sheets. Data reappears on refresh.
- **Forecast mode disabled**: Settings page shows toggle but it's locked to SIMPLE ("Proximamente").
- **Middleware deprecated**: Next.js 16 deprecates `middleware.ts` in favor of `proxy`. Shows warning on every build.
- **Account deletion may fail**: Uses `supabase.auth.admin.deleteUser()` which requires service role key — verify this works with current setup.
- **Exchange rate calculation**: `amountEur = amount / exchangeRate` — verify this matches the intended rate convention (EUR per unit of foreign currency vs foreign per EUR).
- **No tests**: Zero test files. Consider adding tests for `cashflow-engine.ts` first.
- **React Query and Zustand installed but unused**: Available for refactoring data fetching and state management.

## Environment variables (.env.local)

```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxx
```

## Development rules

- **Read Next.js 16 docs first**: This version has breaking changes. Check `node_modules/next/dist/docs/` before writing new pages, API routes, or middleware.
- **Don't edit `src/components/ui/`**: These are shadcn/ui generated components. Use `npx shadcn add <component>` to add new ones.
- **All text is in Spanish**: Keep UI labels, messages, and comments in Spanish.
- **Amounts convention**: Positive = cobro (income), negative = pago (expense).
- **VAT stored as decimal**: 21% → 0.21 in database, converted in `/api/sheets/create`.
- **Month format**: Always YYYY-MM for keys, YYYY-MM-DD for transaction dates.
- **18-month window**: Hardcoded in several places. If changing, search all files for `18` and `generateMonthKeys`.
