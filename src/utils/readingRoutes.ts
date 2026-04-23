import { hasSafeReturnTo, sanitizeReturnToPath } from './navigation';

function applyReturnTo(params: URLSearchParams, returnTo?: string | null) {
  if (typeof returnTo !== 'string') return;
  const trimmed = returnTo.trim();
  if (!hasSafeReturnTo(trimmed)) return;
  params.set('returnTo', sanitizeReturnToPath(trimmed));
}

export function buildReadingArticlePath(articleId: string, returnTo?: string | null): string {
  const params = new URLSearchParams();
  applyReturnTo(params, returnTo);
  const query = params.toString();
  return query ? `/reading/${articleId}?${query}` : `/reading/${articleId}`;
}

export function buildPictureBookPath(slug: string, returnTo?: string | null): string {
  const params = new URLSearchParams();
  applyReturnTo(params, returnTo);
  const query = params.toString();
  return query ? `/reading/books/${slug}?${query}` : `/reading/books/${slug}`;
}

export function buildEpubLibraryPath(slug: string, returnTo?: string | null): string {
  const params = new URLSearchParams();
  applyReturnTo(params, returnTo);
  const query = params.toString();
  return query ? `/reading/library/${slug}?${query}` : `/reading/library/${slug}`;
}

export function buildEpubSharedPath(
  slug: string,
  shareToken: string,
  returnTo?: string | null
): string {
  const params = new URLSearchParams();
  applyReturnTo(params, returnTo);
  params.set('share', shareToken);
  const query = params.toString();
  return `/reading/library/${slug}?${query}`;
}
