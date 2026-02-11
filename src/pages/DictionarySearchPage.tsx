import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAction } from 'convex/react';
import { ArrowLeft, Loader2, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { aRef } from '../utils/convexRefs';
import { useAuth } from '../contexts/AuthContext';
import { useLocalizedNavigate } from '../hooks/useLocalizedNavigate';
import { cleanDictionaryText } from '../utils/dictionaryMeaning';

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
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-20 bg-white/90 backdrop-blur-md border-b border-slate-200 px-4 py-3">
        <div className="flex items-center gap-3 mb-3">
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center"
            aria-label={t('common.back', { defaultValue: 'Back' })}
          >
            <ArrowLeft className="w-4 h-4 text-slate-700" />
          </button>
          <h1 className="text-lg font-black text-slate-900">
            {t('dashboard.dictionary.label', { defaultValue: 'Dictionary' })}
          </h1>
        </div>

        <form onSubmit={onSubmit} className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={t('dashboard.dictionary.placeholder', {
              defaultValue: 'Search Korean word...',
            })}
            className="w-full h-11 rounded-xl border border-slate-200 bg-slate-100 pl-9 pr-20 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:bg-white"
          />
          <button
            type="submit"
            className="absolute right-1.5 top-1.5 h-8 px-3 rounded-lg bg-slate-900 text-white text-xs font-bold"
          >
            {t('search', { defaultValue: 'Search' })}
          </button>
        </form>
      </header>

      <main className="px-4 py-4 pb-24">
        {loading && (
          <div className="py-16 flex flex-col items-center gap-2 text-slate-500">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span className="text-sm font-semibold">
              {t('dashboard.dictionary.searching', { defaultValue: 'Searching...' })}
            </span>
          </div>
        )}

        {!loading && error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700">
            {error}
          </div>
        )}

        {!loading && !error && result && result.entries.length === 0 && (
          <div className="py-16 text-center text-slate-500">
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
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-black text-slate-900">{entry.word}</h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {[entry.pronunciation, entry.pos].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                </div>
                <p className="mt-2 text-sm text-slate-700 leading-relaxed">
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
