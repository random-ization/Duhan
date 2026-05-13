type SearchInput = string | URLSearchParams | null | undefined;

function toQueryString(search?: SearchInput): string {
  if (!search) return '';
  if (typeof search === 'string') {
    return search.startsWith('?') ? search.slice(1) : search;
  }
  return search.toString();
}

export function buildVocabBookPath(search?: SearchInput): string {
  const query = toQueryString(search);
  return query ? `/vocab-book?${query}` : '/vocab-book';
}

export function buildVocabBookModePath(
  mode: 'flashcard' | 'learn' | 'test' | 'match',
  search?: SearchInput
): string {
  const params = new URLSearchParams(toQueryString(search));
  params.set('mode', mode);
  return `/vocab-book/practice?${params.toString()}`;
}
