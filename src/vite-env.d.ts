/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_TITLE: string;
  readonly VITE_CONVEX_URL: string;
  readonly VITE_API_URL?: string; // Optional, defaults to localhost
  readonly VITE_CDN_URL?: string; // Optional
  readonly VITE_I18N_VERSION?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
