type StorageKind = 'local' | 'session';

function getStorage(kind: StorageKind): Storage | null {
  if (typeof globalThis.window === 'undefined') return null;
  return kind === 'local' ? globalThis.window.localStorage : globalThis.window.sessionStorage;
}

export function safeGetStorageItem(kind: StorageKind, key: string): string | null {
  try {
    return getStorage(kind)?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

export function safeSetStorageItem(kind: StorageKind, key: string, value: string): boolean {
  try {
    getStorage(kind)?.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function safeRemoveStorageItem(kind: StorageKind, key: string): boolean {
  try {
    getStorage(kind)?.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

export const safeGetLocalStorageItem = (key: string) => safeGetStorageItem('local', key);
export const safeSetLocalStorageItem = (key: string, value: string) =>
  safeSetStorageItem('local', key, value);
export const safeRemoveLocalStorageItem = (key: string) => safeRemoveStorageItem('local', key);

export const safeGetSessionStorageItem = (key: string) => safeGetStorageItem('session', key);
export const safeSetSessionStorageItem = (key: string, value: string) =>
  safeSetStorageItem('session', key, value);
export const safeRemoveSessionStorageItem = (key: string) => safeRemoveStorageItem('session', key);
