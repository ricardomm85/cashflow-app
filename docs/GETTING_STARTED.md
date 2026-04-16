# Getting Started — Cashflow

Guia paso a paso para montar el proyecto desde cero. Necesitas: una cuenta de Google, una cuenta de GitHub y una cuenta de Supabase (plan gratuito).

---

## 1. Clonar el repositorio

```bash
git clone git@github.com:ricardomm85/cashflow-app.git
cd cashflow-app
npm install
```

---

## 2. Google Cloud Console

### 2.1 Crear proyecto

1. Ir a https://console.cloud.google.com
2. Selector de proyecto (arriba) → **Nuevo proyecto**
3. Nombre: `cashflow-app` → **Crear**

### 2.2 Activar APIs

Menu → **APIs y servicios** → **Biblioteca**. Buscar y activar:

- `Google Sheets API`
- `Google Drive API`

### 2.3 Pantalla de consentimiento OAuth

Menu → **APIs y servicios** → **Pantalla de consentimiento de OAuth**

1. Tipo: **Externo** → Crear
2. Rellenar:
   - Nombre de la app: `Cashflow`
   - Email de asistencia: tu email
   - Email de contacto del desarrollador: tu email
3. **Scopes** → Anadir:
   - `https://www.googleapis.com/auth/spreadsheets`
   - `https://www.googleapis.com/auth/drive.file`
4. **Usuarios de prueba** → anadir tu email (mientras este en modo testing)
5. Guardar

### 2.4 Crear credenciales OAuth

Menu → **APIs y servicios** → **Credenciales** → **Crear credenciales** → **ID de cliente de OAuth**

- Tipo de aplicacion: **Aplicacion web**
- Nombre: `Cashflow Web`
- **Origenes autorizados de JavaScript**:
  - `http://localhost:5173` (desarrollo)
  - Tu URL de produccion cuando la tengas (ej. `https://ricardomm85.github.io`)
- **URIs de redireccion autorizadas**: dejar vacio por ahora (se rellena en el paso 3.3)

Apuntar:
- **Client ID**: `xxxxx.apps.googleusercontent.com`
- **Client Secret**: `GOCSPX-...`

---

## 3. Supabase

### 3.1 Crear proyecto

1. Ir a https://supabase.com/dashboard → **New project**
2. Nombre: `cashflow`, region cercana, contrasena DB (no se usa pero guardarla)
3. Esperar ~1-2 min

### 3.2 Copiar claves

Menu izquierdo → **Project Settings** (engranaje) → **API** o **API Keys**

- **Project URL** → sera `VITE_SUPABASE_URL`
- **Publishable key** (`sb_publishable_...`) → sera `VITE_SUPABASE_PUBLISHABLE_KEY`

> Si ves la UI antigua con "anon key", usa la pestaña "Legacy" y copia la `anon public` (JWT largo `eyJhbG...`).

### 3.3 Activar Google provider

Menu → **Authentication** → **Providers** → **Google**

1. Toggle **Enabled**: ON
2. **Client ID**: pegar el de paso 2.4
3. **Client Secret**: pegar el de paso 2.4
4. Copiar el **Callback URL** que aparece arriba (tipo `https://xxxxx.supabase.co/auth/v1/callback`)
5. **Save**

### 3.4 Pegar callback en Google Cloud

Volver a Google Cloud → **Credenciales** → tu cliente OAuth → editar:

- **URIs de redireccion autorizadas** → anadir el callback de Supabase del paso anterior
- Guardar

### 3.5 Configurar URLs de redireccion

Menu → **Authentication** → **URL Configuration**

- **Site URL**: `http://localhost:5173` (para desarrollo; cambiar a produccion cuando despliegues)
- **Redirect URLs**: anadir `http://localhost:5173/**`
- Guardar

---

## 4. Variables de entorno (desarrollo local)

```bash
cp .env.example .env.local
```

Editar `.env.local`:

```
VITE_SUPABASE_URL=https://xxxxx.supabase.co        # paso 3.2
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...    # paso 3.2
VITE_GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com  # paso 2.4
```

---

## 5. Arrancar en local

```bash
npm run dev
```

Abrir http://localhost:5173

1. Click **Iniciar sesion con Google**
2. Elegir cuenta → aceptar permisos (Sheets + Drive)
3. Rellenas configuracion inicial (nombre empresa, IVA, etc.)
4. App crea automaticamente un fichero "Cashflow" en tu Google Drive con 4 hojas

### Verificar

- [ ] En Google Drive aparece fichero `Cashflow`
- [ ] 4 pestanas: `config`, `categories`, `transactions`, `bank_balances`
- [ ] `categories` tiene 51 filas de categorias por defecto
- [ ] Dashboard muestra datos (aunque sean ceros)

---

## 6. Desplegar en GitHub Pages

### 6.1 Activar Pages en el repositorio

1. GitHub → tu repo → **Settings** → **Pages**
2. **Source**: seleccionar **GitHub Actions**
3. Guardar

### 6.2 Configurar secrets

GitHub → tu repo → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

Crear 3 secrets:

| Nombre | Valor |
|--------|-------|
| `VITE_SUPABASE_URL` | `https://xxxxx.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_...` |
| `VITE_GOOGLE_CLIENT_ID` | `xxxxx.apps.googleusercontent.com` |

### 6.3 Desplegar

Hacer push a `master` → el workflow `.github/workflows/deploy.yml` se ejecuta automaticamente.

Verificar en **Actions** que el workflow completa sin errores.

La URL de produccion sera algo como: `https://<tu-usuario>.github.io/cashflow-app/`

### 6.4 Actualizar URLs para produccion

Con la URL de produccion ya conocida, actualizar:

**Google Cloud Console:**
- Credenciales → tu cliente OAuth → **Origenes autorizados de JavaScript** → anadir URL de produccion

**Supabase:**
- Authentication → URL Configuration → **Site URL**: cambiar a URL de produccion
- **Redirect URLs**: anadir `https://<tu-usuario>.github.io/**`

---

## 7. Publicar app OAuth (opcional)

Mientras la app este en modo "Testing" en Google Cloud, solo los usuarios de prueba pueden loguear (maximo 100).

Para abrir a cualquier usuario:

1. Google Cloud → **APIs y servicios** → **Pantalla de consentimiento de OAuth**
2. Boton **Publicar app**
3. Puede requerir verificacion de Google (dias/semanas) si usas scopes sensibles

Para uso interno / personal, dejar en Testing es suficiente.

---

## Resumen de cuentas y claves

| Que | Donde se configura | Donde se usa |
|-----|-------------------|-------------|
| Client ID de Google OAuth | Google Cloud Console | `.env.local`, Supabase provider, GitHub secrets |
| Client Secret de Google OAuth | Google Cloud Console | Solo Supabase provider |
| Supabase Project URL | Supabase Dashboard | `.env.local`, GitHub secrets |
| Supabase Publishable Key | Supabase Dashboard | `.env.local`, GitHub secrets |
| Callback URL de Supabase | Supabase Auth providers | Google Cloud redirect URIs |

---

## Troubleshooting

### Error: "OAuth state parameter missing"
- Causa: cookies de terceros bloqueadas (Brave, Firefox estricto, ventana privada)
- Solucion: probar en Chrome normal, o desactivar tracking protection para localhost

### Error: 401 "UNAUTHENTICATED" en Sheets API
- Causa: token Google caducado y refresh token perdido
- Solucion: cerrar sesion → limpiar storage (F12 → Application → Clear site data) → login de nuevo

### Error: 429 "RESOURCE_EXHAUSTED"
- Causa: superado el limite de 60 reads/min/user de Sheets API
- La app reintenta automaticamente con backoff. Si persiste, esperar 1 min o pedir aumento de cuota en Google Cloud

### Deploy falla con "Ensure GitHub Pages has been enabled"
- Causa: Pages no activado en el repo
- Solucion: Settings → Pages → Source → GitHub Actions

### `VITE_SUPABASE_URL` mal pegado
- Debe ser solo el dominio: `https://xxxxx.supabase.co` (sin `/auth/v1/callback` ni nada detras)
