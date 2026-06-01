/**
 * Hook for semantic similarity search via embeddings.
 *
 * Wraps the `embeddings:searchSimilar` action with:
 * - Debounced query to avoid spamming the API
 * - Loading / error state
 * - Caching of last result to prevent flicker
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAction } from 'convex/react';
import { EMBEDDINGS, type EmbeddingSearchResult } from '../utils/convexRefs';

export type SemanticSearchState = {
  results: EmbeddingSearchResult[];
  loading: boolean;
  error: string | null;
  search: (query: string) => void;
};

/**
 * @param sourceTable - optional filter (e.g. 'news_articles', 'content_sentences')
 * @param limit - max results (default 5)
 * @param debounceMs - debounce delay (default 600ms)
 */
export function useSemanticSearch(
  sourceTable?: string,
  limit = 5,
  debounceMs = 600
): SemanticSearchState {
  const searchSimilar = useAction(EMBEDDINGS.searchSimilar);
  const [results, setResults] = useState<EmbeddingSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef(0); // simple generation counter for stale-result prevention

  const search = useCallback(
    (query: string) => {
      if (timerRef.current) clearTimeout(timerRef.current);

      const trimmed = query.trim();
      if (!trimmed || trimmed.length < 2) {
        setResults([]);
        setLoading(false);
        setError(null);
        return;
      }

      setLoading(true);
      setError(null);

      timerRef.current = setTimeout(() => {
        const gen = ++abortRef.current;
        searchSimilar({ query: trimmed, sourceTable, limit })
          .then(res => {
            if (gen !== abortRef.current) return; // stale
            setResults(res);
            setLoading(false);
          })
          .catch(err => {
            if (gen !== abortRef.current) return;
            setError(err instanceof Error ? err.message : 'Search failed');
            setLoading(false);
          });
      }, debounceMs);
    },
    [searchSimilar, sourceTable, limit, debounceMs]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return { results, loading, error, search };
}
