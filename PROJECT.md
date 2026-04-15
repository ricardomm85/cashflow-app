# Cashflow — Control de caja

App web para gestionar flujo de caja de pymes/freelancers. Datos en Google Sheets del usuario.

## Stack

- **Frontend**: HTML + TypeScript + CSS (vanilla, sin frameworks)
- **Auth**: Supabase Auth (Google OAuth, client-side SDK)
- **Datos**: Google Sheets API (llamadas directas desde browser con token del usuario)
- **Hosting**: GitHub Pages (estatico, sin backend)
- **Idioma codigo**: TypeScript
- **Backend**: Ninguno

## Estructura Google Sheets (4 hojas por usuario)

### `config` — [Property, Value]
Company Name, Start Date, VAT Sales, VAT Expenses, Forecast Mode

### `categories` — [Type, Group, Subgroup, Active]
51 categorias default. Types: `cobros`, `pagos`, `otros`. Jerarquia de 3 niveles.

### `transactions` — [Date, Bank, Description, Amount, Type, Group, Subgroup]
- Date: YYYY-MM-DD
- Amount: positivo = cobro, negativo = pago
- Moneda unica: EUR

### `bank_balances` — [Entity, Type, Limit, YYYY-MM ×18]
- Type: `bank` | `credit_line`
- Limit: limite de credito (solo credit_line)
- Columnas mensuales: saldos

## Convenciones

- Positivo = cobro (ingreso), negativo = pago (gasto)
- VAT como decimal: 21% → 0.21
- Meses: YYYY-MM. Fechas: YYYY-MM-DD
- Ventana: 18 meses
- Todo el UI en espanol
