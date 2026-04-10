# Cashflow — Control de caja para tu empresa

App web para controlar las finanzas de tu empresa o actividad como autónomo. Basada en la plantilla Excel "Control de Caja" de Lanzadera.

## Stack

- **Frontend:** Next.js 14+ (App Router), React, Tailwind CSS, Shadcn/ui
- **Auth:** Supabase (Google OAuth)
- **Datos:** Google Sheets API (los datos viven en el Google Drive del usuario)
- **Deploy:** Vercel

## Setup local

### 1. Clonar e instalar

```bash
git clone https://github.com/tu-usuario/cashflow-app.git
cd cashflow-app
npm install
```

### 2. Crear proyecto en Supabase

1. Ve a [supabase.com](https://supabase.com) → New Project (región EU West)
2. En **Settings → API**, copia `URL` y `anon key`
3. En **Auth → Providers → Google**:
   - Activa Google provider
   - Pega tu `Client ID` y `Client Secret` de Google (ver paso 3)
   - En "Additional Scopes" añade: `https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file`
4. En **SQL Editor**, ejecuta:

```sql
CREATE TABLE user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  spreadsheet_id TEXT,
  company_name TEXT DEFAULT '',
  start_date DATE DEFAULT CURRENT_DATE,
  vat_sales DECIMAL(4,2) DEFAULT 0.21,
  vat_expenses DECIMAL(4,2) DEFAULT 0.21,
  forecast_mode TEXT DEFAULT 'SIMPLE',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own settings"
  ON user_settings FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings"
  ON user_settings FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own settings"
  ON user_settings FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own settings"
  ON user_settings FOR DELETE USING (auth.uid() = user_id);
```

### 3. Crear proyecto en Google Cloud

1. Ve a [console.cloud.google.com](https://console.cloud.google.com) → New Project
2. Habilita: **Google Sheets API** + **Google Drive API**
3. En **Credentials → Create OAuth 2.0 Client ID** (Web application):
   - Authorized redirect URIs:
     - `http://localhost:3000/auth/callback`
     - `https://tu-proyecto.supabase.co/auth/v1/callback`
4. Configura **OAuth consent screen** (External):
   - Scopes: `spreadsheets`, `drive.file`

### 4. Configurar variables de entorno

```bash
cp .env.local.example .env.local
```

Rellena los valores en `.env.local`.

### 5. Arrancar

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000)

## Licencia

MIT
