/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_APP_TITLE: string;
  readonly VITE_CONVEX_URL: string;
  readonly VITE_API_URL?: string; // Optional, defaults to localhost
  readonly VITE_CDN_URL?: string; // Optional
  readonly VITE_I18N_VERSION?: string;
  readonly VITE_SENTRY_DSN?: string; // Optional
  readonly VITE_ANALYTICS_DEBUG?: string; // Optional
  readonly VITE_POSTHOG_KEY?: string; // Optional
  readonly VITE_POSTHOG_HOST?: string; // Optional
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
