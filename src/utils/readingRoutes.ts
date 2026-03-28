function applyReturnTo(params: URLSearchParams, returnTo?: string | null) {
  if (typeof returnTo !== 'string' || !returnTo.trim()) return;
  params.set('returnTo', returnTo);
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
