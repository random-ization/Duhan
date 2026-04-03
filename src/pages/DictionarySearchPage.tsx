import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAction } from 'convex/react';
import { ArrowLeft, ExternalLink, Loader2, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { aRef } from '../utils/convexRefs';
import { useAuth } from '../contexts/AuthContext';
import { useLocalizedNavigate } from '../hooks/useLocalizedNavigate';
import { cleanDictionaryText } from '../utils/dictionaryMeaning';
import { resolveSafeReturnTo } from '../utils/navigation';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Input,
} from '../components/ui';

type DictionaryEntry = {
  targetCode: string;
  word: string;
  pronunciation?: string;
  wordGrade?: string;
  pos?: string;
  link?: string;
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
  const returnTo = useMemo(() => {
    return resolveSafeReturnTo(searchParams.get('returnTo'), '/dashboard');
  }, [searchParams]);

  const initialQuery = (searchParams.get('q') || '').trim();
  const [query, setQuery] = useState(initialQuery);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SearchResult | null>(null);
  const searchRequestRef = useRef(0);
  const detailRequestRef = useRef(0);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detailEntry, setDetailEntry] = useState<DictionaryEntry | null>(null);

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

  const getWordDetail = useAction(
    aRef<{ targetCode: string; translationLang?: string }, DictionaryEntry | null>(
      'dictionary:getWordDetail'
    )
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
      const requestId = searchRequestRef.current + 1;
      searchRequestRef.current = requestId;

      if (!normalized) {
        setResult(null);
        setError(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const baseArgs = {
          query: normalized,
          translationLang,
          num: 30,
          part: 'word' as const,
          sort: 'popular' as const,
        };

        let res = await searchDictionary(baseArgs);
        if (!res.entries.length) {
          res = await searchDictionary({ ...baseArgs, sort: 'dict' });
        }
        if (!res.entries.length) {
          res = await searchDictionary({ ...baseArgs, part: undefined, sort: 'dict' });
        }

        if (searchRequestRef.current !== requestId) return;
        setResult(res);
      } catch (err) {
        if (searchRequestRef.current !== requestId) return;
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg || t('dashboard.dictionary.error', { defaultValue: 'Something went wrong' }));
        setResult(null);
      } finally {
        if (searchRequestRef.current === requestId) {
          setLoading(false);
        }
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
    const nextParams = new URLSearchParams();
    nextParams.set('q', q);
    if (returnTo) {
      nextParams.set('returnTo', returnTo);
    }
    setSearchParams(nextParams);
  };

  const handleOpenDetail = useCallback(
    async (entry: DictionaryEntry) => {
      setDetailOpen(true);
      setDetailLoading(true);
      setDetailError(null);
      setDetailEntry(entry);

      const requestId = detailRequestRef.current + 1;
      detailRequestRef.current = requestId;

      try {
        const full = await getWordDetail({ targetCode: entry.targetCode, translationLang });
        if (detailRequestRef.current !== requestId) return;
        if (full) {
          setDetailEntry(full);
          return;
        }
        setDetailError(t('dashboard.dictionary.noResults', { defaultValue: 'No results found' }));
      } catch (err) {
        if (detailRequestRef.current !== requestId) return;
        const msg = err instanceof Error ? err.message : String(err);
        setDetailError(
          msg || t('dashboard.dictionary.error', { defaultValue: 'Something went wrong' })
        );
      } finally {
        if (detailRequestRef.current === requestId) {
          setDetailLoading(false);
        }
      }
    },
    [getWordDetail, t, translationLang]
  );

  const detailSenses = useMemo(() => {
    if (!detailEntry?.senses?.length) return [];
    return detailEntry.senses
      .slice()
      .sort((a, b) => (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER));
  }, [detailEntry]);

  return (
    <div className="min-h-[100dvh] bg-background pb-safe">
      <header className="sticky top-0 z-20 bg-card/90 backdrop-blur-lg border-b border-border px-4 md:px-8 py-3 md:py-4">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-3 mb-3 md:mb-4">
            <Button
              type="button"
              onClick={() => navigate(returnTo)}
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
        </div>
      </header>

      <main className="px-4 md:px-8 max-w-3xl mx-auto py-6 pb-[130px] md:pb-32">
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
                    <h2 className="text-xl md:text-2xl font-black text-foreground">{entry.word}</h2>
                    <p className="text-xs md:text-sm font-semibold text-muted-foreground mt-1">
                      {[entry.pronunciation, entry.pos].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                </div>
                <p className="mt-3 text-[15px] md:text-base text-muted-foreground leading-relaxed">
                  {getMeaning(entry) ||
                    t('dashboard.dictionary.noResults', { defaultValue: 'No results found' })}
                </p>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <p className="text-xs text-muted-foreground font-semibold">#{entry.targetCode}</p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="auto"
                    onClick={() => void handleOpenDetail(entry)}
                    className="h-8 px-3 rounded-lg border border-border bg-muted text-foreground text-xs font-bold"
                  >
                    {t('common.details', { defaultValue: 'Details' })}
                  </Button>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="w-[min(92vw,760px)] max-h-[85vh] overflow-hidden p-0">
          <div className="border-b border-border px-5 py-4 md:px-6 md:py-5">
            <DialogHeader>
              <DialogTitle className="text-2xl md:text-3xl font-black text-foreground">
                {detailEntry?.word ||
                  t('dashboard.dictionary.label', { defaultValue: 'Dictionary' })}
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground font-semibold">
                {[detailEntry?.pronunciation, detailEntry?.pos, detailEntry?.wordGrade]
                  .filter(Boolean)
                  .join(' · ') ||
                  t('dashboard.dictionary.searching', { defaultValue: 'Searching...' })}
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="px-5 py-4 md:px-6 md:py-5 overflow-y-auto max-h-[calc(85vh-120px)]">
            {detailLoading && (
              <div className="py-8 flex items-center justify-center gap-2 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm font-semibold">
                  {t('dashboard.dictionary.searching', { defaultValue: 'Searching...' })}
                </span>
              </div>
            )}

            {!detailLoading && detailError && (
              <div className="rounded-xl border border-rose-200 dark:border-rose-300/35 bg-rose-50 dark:bg-rose-400/12 p-4 text-sm font-semibold text-rose-700 dark:text-rose-200">
                {detailError}
              </div>
            )}

            {!detailLoading && !detailError && detailSenses.length > 0 && (
              <div className="space-y-3">
                {detailSenses.map((sense, idx) => (
                  <section
                    key={`${detailEntry?.targetCode || 'detail'}-${sense.order}-${idx}`}
                    className="rounded-xl border border-border bg-muted/30 p-4"
                  >
                    <div className="text-xs font-black text-muted-foreground mb-2">
                      {t('dashboard.dictionary.sense', { defaultValue: 'Sense' })}{' '}
                      {sense.order || idx + 1}
                    </div>
                    {sense.translation?.word && (
                      <p className="text-sm font-bold text-foreground">{sense.translation.word}</p>
                    )}
                    <p className="text-sm md:text-base text-foreground leading-relaxed mt-1">
                      {cleanDictionaryText(
                        sense.translation?.definition ||
                          sense.definition ||
                          sense.translation?.word ||
                          ''
                      ) ||
                        t('dashboard.dictionary.noResults', { defaultValue: 'No results found' })}
                    </p>
                    {sense.definition && (
                      <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                        {cleanDictionaryText(sense.definition)}
                      </p>
                    )}
                  </section>
                ))}
              </div>
            )}

            {!detailLoading && !detailError && detailEntry?.link && (
              <div className="mt-4">
                <a
                  href={detailEntry.link}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
                >
                  {t('dashboard.dictionary.viewSource', {
                    defaultValue: 'Open official dictionary source',
                  })}
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
