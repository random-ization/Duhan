const FRONTEND_CDN_BASE =
  (import.meta.env.VITE_CDN_URL || '').trim().replace(/\/+$/, '') || undefined;

export function normalizePublicAssetUrl(value: string | null | undefined): string | null {
  if (!value) return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  if (!FRONTEND_CDN_BASE) {
    return trimmed;
  }

  try {
    const currentUrl = new URL(trimmed);
    const targetUrl = new URL(FRONTEND_CDN_BASE);
    const host = currentUrl.host.toLowerCase();
    const isLegacyStorageHost =
      host.endsWith('.digitaloceanspaces.com') || host.endsWith('.r2.cloudflarestorage.com');

    if (!isLegacyStorageHost) {
      return trimmed;
    }

    currentUrl.protocol = targetUrl.protocol;
    currentUrl.host = targetUrl.host;
    return currentUrl.toString();
  } catch {
    return trimmed;
  }
}

export function getSafeImageSrc(...candidates: Array<string | null | undefined>): string | null {
  for (const candidate of candidates) {
    const normalized = normalizePublicAssetUrl(candidate);
    if (normalized) {
      return normalized;
    }
  }
  return null;
}
