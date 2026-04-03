import i18n from './i18next-config';
import { logger } from './logger';

type LocaleNamespace = 'app';

const loaded = new Set<string>();
const inflight = new Map<string, Promise<boolean>>();

export interface LocaleNamespaceLoadResult {
  loaded: LocaleNamespace[];
  failed: LocaleNamespace[];
}

const nsKey = (language: string, namespace: LocaleNamespace) => `${language}:${namespace}`;

const getBaseUrl = () => {
  if (typeof window === 'undefined') return import.meta.env.BASE_URL;
  return `${window.location.origin}${import.meta.env.BASE_URL}`;
};

const getNamespaceUrl = (language: string, namespace: LocaleNamespace) => {
  const base = getBaseUrl();
  const normalizedBase = base.endsWith('/') ? base : `${base}/`;
  const version = String(import.meta.env.VITE_I18N_VERSION ?? '');
  return `${normalizedBase}locales/${language}/${namespace}.json?v=${encodeURIComponent(version)}`;
};

const loadNamespace = async (language: string, namespace: LocaleNamespace): Promise<boolean> => {
  const key = nsKey(language, namespace);
  if (loaded.has(key)) return true;

  const existing = inflight.get(key);
  if (existing) return existing;

  const promise = (async () => {
    const url = getNamespaceUrl(language, namespace);
    const fallbackUrl = language === 'en' ? null : getNamespaceUrl('en', namespace);

    try {
      let response = await fetch(url);
      if (!response.ok && fallbackUrl) {
        response = await fetch(fallbackUrl);
      }
      if (!response.ok) {
        throw new Error(`Failed to load i18n namespace: ${namespace} (${response.status})`);
      }

      const payload = (await response.json()) as Record<string, unknown>;
      if (!payload || typeof payload !== 'object') {
        throw new Error(`Invalid i18n payload for namespace: ${namespace}`);
      }

      i18n.addResourceBundle(language, 'translation', payload, true, true);
      loaded.add(key);
      return true;
    } catch (error) {
      logger.warn(`[i18n] Unable to load namespace "${namespace}" for "${language}"`, error);
      return false;
    } finally {
      inflight.delete(key);
    }
  })();

  inflight.set(key, promise);
  return await promise;
};

export const ensureLocaleNamespaces = async (
  language: string,
  namespaces: readonly LocaleNamespace[]
): Promise<LocaleNamespaceLoadResult> => {
  if (!language || namespaces.length === 0) {
    return { loaded: [], failed: [] };
  }

  const results = await Promise.all(
    namespaces.map(async namespace => ({
      namespace,
      ok: await loadNamespace(language, namespace),
    }))
  );

  return results.reduce<LocaleNamespaceLoadResult>(
    (acc, result) => {
      if (result.ok) {
        acc.loaded.push(result.namespace);
      } else {
        acc.failed.push(result.namespace);
      }
      return acc;
    },
    { loaded: [], failed: [] }
  );
};
