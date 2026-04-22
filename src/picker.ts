import { env } from './env.ts';
import { getGoogleAccessToken } from './auth.ts';

const GAPI_SCRIPT = 'https://apis.google.com/js/api.js';

export interface PickedSpreadsheet {
  id: string;
  name: string;
  mimeType: string;
}

export const GOOGLE_SHEET_MIME = 'application/vnd.google-apps.spreadsheet';
export const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

interface Gapi {
  load: (api: string, cfg: { callback: () => void; onerror?: () => void }) => void;
}

interface PickerBuilderInstance {
  setOAuthToken: (token: string) => PickerBuilderInstance;
  setDeveloperKey: (key: string) => PickerBuilderInstance;
  setAppId: (id: string) => PickerBuilderInstance;
  setOrigin: (origin: string) => PickerBuilderInstance;
  addView: (view: unknown) => PickerBuilderInstance;
  setCallback: (cb: (data: Record<string, unknown>) => void) => PickerBuilderInstance;
  build: () => { setVisible: (visible: boolean) => void };
}

interface DocsViewInstance {
  setIncludeFolders: (b: boolean) => DocsViewInstance;
  setSelectFolderEnabled: (b: boolean) => DocsViewInstance;
  setMode: (m: unknown) => DocsViewInstance;
  setMimeTypes: (mimeTypes: string) => DocsViewInstance;
}

interface GooglePickerLib {
  PickerBuilder: new () => PickerBuilderInstance;
  DocsView: new (viewId?: unknown) => DocsViewInstance;
  ViewId: { SPREADSHEETS: unknown; DOCS: unknown };
  DocsViewMode: { LIST: unknown };
  Action: { PICKED: unknown; CANCEL: unknown };
  Response: { ACTION: string; DOCUMENTS: string };
  Document: { ID: string; NAME: string; MIME_TYPE: string };
}

declare global {
  interface Window {
    gapi?: Gapi;
    google?: { picker?: GooglePickerLib };
  }
}

let loaderPromise: Promise<void> | null = null;

function loadPickerApi(): Promise<void> {
  if (loaderPromise) return loaderPromise;
  loaderPromise = new Promise<void>((resolve, reject) => {
    const loadPicker = (): void => {
      const gapi = window.gapi;
      if (!gapi) { reject(new Error('gapi no disponible')); return; }
      gapi.load('picker', {
        callback: () => resolve(),
        onerror: () => reject(new Error('No se pudo cargar Google Picker')),
      });
    };
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${GAPI_SCRIPT}"]`);
    if (existing) {
      if (window.gapi) loadPicker();
      else existing.addEventListener('load', loadPicker, { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = GAPI_SCRIPT;
    script.async = true;
    script.defer = true;
    script.onload = loadPicker;
    script.onerror = () => {
      loaderPromise = null;
      reject(new Error('No se pudo cargar el script de Google'));
    };
    document.head.appendChild(script);
  });
  return loaderPromise;
}

function parseAppId(clientId: string): string {
  const num = clientId.split('-')[0] ?? '';
  return /^\d+$/.test(num) ? num : '';
}

export async function pickSpreadsheet(): Promise<PickedSpreadsheet | null> {
  await loadPickerApi();
  const token = await getGoogleAccessToken();
  const picker = window.google?.picker;
  if (!picker) throw new Error('Google Picker no disponible');

  return new Promise<PickedSpreadsheet | null>((resolve, reject) => {
    try {
      const view = new picker.DocsView(picker.ViewId.DOCS)
        .setIncludeFolders(false)
        .setSelectFolderEnabled(false)
        .setMode(picker.DocsViewMode.LIST)
        .setMimeTypes(`${GOOGLE_SHEET_MIME},${XLSX_MIME}`);

      const builder = new picker.PickerBuilder()
        .setOAuthToken(token)
        .setDeveloperKey(env.GOOGLE_PICKER_API_KEY)
        .setOrigin(window.location.protocol + '//' + window.location.host)
        .addView(view)
        .setCallback((data) => {
          const action = data[picker.Response.ACTION];
          if (action === picker.Action.PICKED) {
            const docs = data[picker.Response.DOCUMENTS] as Record<string, string>[] | undefined;
            const doc = docs?.[0];
            if (doc && doc[picker.Document.ID]) {
              resolve({
                id: doc[picker.Document.ID] ?? '',
                name: doc[picker.Document.NAME] ?? '',
                mimeType: doc[picker.Document.MIME_TYPE] ?? '',
              });
            } else {
              resolve(null);
            }
          } else if (action === picker.Action.CANCEL) {
            resolve(null);
          }
        });

      const appId = parseAppId(env.GOOGLE_CLIENT_ID);
      if (appId) builder.setAppId(appId);

      builder.build().setVisible(true);
    } catch (e) {
      reject(e);
    }
  });
}
