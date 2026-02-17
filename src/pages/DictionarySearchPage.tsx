import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAction } from 'convex/react';
import { ArrowLeft, Loader2, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { aRef } from '../utils/convexRefs';
import { useAuth } from '../contexts/AuthContext';
import { useLocalizedNavigate } from '../hooks/useLocalizedNavigate';
import { cleanDictionaryText } from '../utils/dictionaryMeaning';
import { Button, Input } from '../components/ui';

type DictionaryEntry = {
  targetCode: string;
  word: string;
  pronunciation?: string;
  pos?: string;
  senses: Array<{
    order: number;
    definition: string;
    translation?: { lang: string; word: string; definition: string };
  }>;
};

type SearchResult = {
  total: number;
  start: number;
  num: number;
  entries: DictionaryEntry[];
};

function getMeaning(entry: DictionaryEntry): string {
  const first = (entry.senses ?? [])
    .slice()
    .sort((a, b) => (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER))[0];
  if (!first) return '';
  return cleanDictionaryText(
    first.translation?.definition || first.translation?.word || first.definition || ''
  );
}

export default function DictionarySearchPage() {
  const navigate = useLocalizedNavigate();
  const { t } = useTranslation();
  const { language } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const initialQuery = (searchParams.get('q') || '').trim();
  const [query, setQuery] = useState(initialQuery);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SearchResult | null>(null);

  const searchDictionary = useAction(
    aRef<
      {
        query: string;
        translationLang?: string;
        start?: number;
        num?: number;
        part?: string;
        sort?: string;
      },
      SearchResult
    >('dictionary:searchDictionary')
  );

  const translationLang = useMemo(() => {
    if (language === 'en' || language === 'zh' || language === 'vi' || language === 'mn') {
      return language;
    }
    return undefined;
  }, [language]);

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  const runSearch = useCallback(
    async (q: string) => {
      const normalized = q.trim();
      if (!normalized) {
        setResult(null);
        setError(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const res = await searchDictionary({
          query: normalized,
          translationLang,
          num: 30,
          part: 'word',
          sort: 'popular',
        });
        setResult(res);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg || t('dashboard.dictionary.error', { defaultValue: 'Something went wrong' }));
        setResult(null);
      } finally {
        setLoading(false);
      }
    },
    [searchDictionary, t, translationLang]
  );

  useEffect(() => {
    if (!initialQuery) {
      setResult(null);
      setError(null);
      return;
    }
    void runSearch(initialQuery);
  }, [initialQuery, runSearch]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    setSearchParams({ q });
  };

  return (
    <div className="min-h-screen bg-muted">
      <header className="sticky top-0 z-20 bg-card/90 backdrop-blur-md border-b border-border px-4 py-3">
        <div className="flex items-center gap-3 mb-3">
          <Button
            type="button"
            onClick={() => navigate('/dashboard')}
            variant="ghost"
            size="auto"
            className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center"
            aria-label={t('common.back', { defaultValue: 'Back' })}
          >
            <ArrowLeft className="w-4 h-4 text-muted-foreground" />
          </Button>
          <h1 className="text-lg font-black text-foreground">
            {t('dashboard.dictionary.label', { defaultValue: 'Dictionary' })}
          </h1>
        </div>

        <form onSubmit={onSubmit} className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={t('dashboard.dictionary.placeholder', {
              defaultValue: 'Search Korean word...',
            })}
            className="w-full !h-11 !rounded-xl !border-border !bg-muted !pl-9 !pr-20 text-sm font-semibold text-foreground focus-visible:!ring-2 focus-visible:!ring-indigo-300 dark:focus-visible:!ring-indigo-200/70 focus-visible:!bg-card !shadow-none"
          />
          <Button
            type="submit"
            variant="ghost"
            size="auto"
            disabled={loading || !query.trim()}
            loading={loading}
            loadingText={t('search', { defaultValue: 'Search' })}
            loadingIconClassName="w-3 h-3"
            className="absolute right-1.5 top-1.5 h-8 px-3 rounded-lg bg-primary text-white text-xs font-bold !border-0 !shadow-none"
          >
            {t('search', { defaultValue: 'Search' })}
          </Button>
        </form>
      </header>

      <main className="px-4 py-4 pb-24">
        {loading && (
          <div className="py-16 flex flex-col items-center gap-2 text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span className="text-sm font-semibold">
              {t('dashboard.dictionary.searching', { defaultValue: 'Searching...' })}
            </span>
          </div>
        )}

        {!loading && error && (
          <div className="rounded-xl border border-rose-200 dark:border-rose-300/35 bg-rose-50 dark:bg-rose-400/12 p-4 text-sm font-semibold text-rose-700 dark:text-rose-200">
            {error}
          </div>
        )}

        {!loading && !error && result && result.entries.length === 0 && (
          <div className="py-16 text-center text-muted-foreground">
            <p className="text-sm font-semibold">
              {t('dashboard.dictionary.noResults', { defaultValue: 'No results found' })}
            </p>
          </div>
        )}

        {!loading && !error && result && result.entries.length > 0 && (
          <div className="space-y-2">
            {result.entries.map(entry => (
              <article
                key={entry.targetCode}
                className="rounded-xl border border-border bg-card p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-black text-foreground">{entry.word}</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {[entry.pronunciation, entry.pos].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                </div>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  {getMeaning(entry) ||
                    t('dashboard.dictionary.noResults', { defaultValue: 'No results found' })}
                </p>
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
