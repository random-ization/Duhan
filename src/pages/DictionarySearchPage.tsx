import React, { useCallback, useEffect, useMemo, useRef, useState, lazy, Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAction, useQuery } from 'convex/react';
import { Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { aRef, SEARCH, type SearchAllResult } from '../utils/convexRefs';
import { useAuth } from '../contexts/AuthContext';
import { useLocalizedNavigate } from '../hooks/useLocalizedNavigate';
import { useIsMobile } from '../hooks/useIsMobile';
import { cleanDictionaryText } from '../utils/dictionaryMeaning';
import { resolveSafeReturnTo } from '../utils/navigation';

const DesktopDictionarySearchPage = lazy(() => import('./desktop/DesktopDictionarySearchPage'));
import {
  Card as KsoftCard,
  Chip,
  KT,
  PageShell,
  SectionHead,
} from '../components/mobile/ksoft/ksoft';
import {
  KsoftEmptyState,
  KsoftImmersiveHeader,
  KsoftListRow,
} from '../components/mobile/ksoft/KsoftMobilePrimitives';
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
    examples?: Array<{ ko: string; translation?: string }>;
  }>;
};

type SearchResult = {
  total: number;
  start: number;
  num: number;
  entries: DictionaryEntry[];
};
type SearchScope = 'all' | 'dictionary';
type GlobalSearchBucket = keyof SearchAllResult['buckets'];

const GLOBAL_BUCKET_ORDER: GlobalSearchBucket[] = ['grammar', 'book', 'podcast', 'note'];

function getGlobalBucketLabel(
  bucket: GlobalSearchBucket,
  t: ReturnType<typeof useTranslation>['t']
) {
  if (bucket === 'grammar') {
    return t('search.bucket.grammar', { defaultValue: 'Grammar' });
  }
  if (bucket === 'book') {
    return t('search.bucket.book', { defaultValue: 'Books' });
  }
  if (bucket === 'podcast') {
    return t('search.bucket.podcast', { defaultValue: 'Podcasts' });
  }
  return t('search.bucket.note', { defaultValue: 'Notes' });
}

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
  const isMobile = useIsMobile();
  const [searchParams, setSearchParams] = useSearchParams();
  const scope: SearchScope = searchParams.get('scope') === 'all' ? 'all' : 'dictionary';
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
  const globalSearchResult = useQuery(
    SEARCH.searchAll,
    scope === 'all' && initialQuery.length >= 2
      ? { query: initialQuery, limitPerBucket: 6 }
      : 'skip'
  );

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
    if (scope === 'all') {
      setResult(null);
      setError(null);
      setLoading(false);
      return;
    }
    if (!initialQuery) {
      setResult(null);
      setError(null);
      return;
    }
    void runSearch(initialQuery);
  }, [initialQuery, runSearch, scope]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    const nextParams = new URLSearchParams();
    nextParams.set('q', q);
    if (scope === 'all') {
      nextParams.set('scope', 'all');
    }
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

  useEffect(() => {
    if (result && result.entries.length > 0 && !detailEntry && !detailLoading) {
      void handleOpenDetail(result.entries[0]);
    }
  }, [result, detailEntry, detailLoading, handleOpenDetail]);

  const detailSenses = useMemo(() => {
    if (!detailEntry?.senses?.length) return [];
    return detailEntry.senses
      .slice()
      .sort((a, b) => (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER));
  }, [detailEntry]);
  const globalSearchLoading =
    scope === 'all' && initialQuery.length >= 2 && globalSearchResult === undefined;
  const isSearching = scope === 'all' ? globalSearchLoading : loading;
  const globalTotalCount = globalSearchResult?.totalCount ?? 0;
  const hasGlobalResults = globalTotalCount > 0;
  const showGlobalEmpty =
    scope === 'all' && !globalSearchLoading && initialQuery.length >= 2 && !hasGlobalResults;

  if (isMobile) {
    return (
      <PageShell>
        <KsoftImmersiveHeader
          eyebrow={
            scope === 'all'
              ? `搜 · ${t('search.title', { defaultValue: 'SEARCH' })}`
              : `典 · ${t('dashboard.dictionary.label', { defaultValue: 'DICTIONARY' })}`
          }
          title={
            scope === 'all'
              ? t('common.search', { defaultValue: 'Search' })
              : t('dashboard.dictionary.label', { defaultValue: 'Dictionary' })
          }
          subtitle={
            scope === 'all'
              ? t('search.placeholder', {
                  defaultValue: 'Search grammar, books, podcasts, notes...',
                })
              : t('dashboard.dictionary.placeholder', {
                  defaultValue: 'Search Korean word...',
                })
          }
          seal={scope === 'all' ? '搜' : '典'}
          onBack={() => navigate(returnTo)}
        />
        <main style={{ padding: '4px 20px 112px', display: 'grid', gap: 18 }}>
          <form onSubmit={onSubmit} style={{ position: 'relative' }}>
            <Search
              size={17}
              style={{
                position: 'absolute',
                left: 14,
                top: '50%',
                transform: 'translateY(-50%)',
                color: KT.sub,
              }}
            />
            <Input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={
                scope === 'all'
                  ? t('search.placeholder', {
                      defaultValue: 'Search grammar, books, podcasts, notes...',
                    })
                  : t('dashboard.dictionary.placeholder', {
                      defaultValue: 'Search Korean word...',
                    })
              }
              className="h-12 pl-10 pr-20"
              style={{
                borderRadius: 18,
                borderColor: KT.line2,
                background: KT.card,
                boxShadow: KT.shSm,
                color: KT.ink,
                fontWeight: 800,
              }}
            />
            <button
              type="submit"
              disabled={isSearching || !query.trim()}
              style={{
                position: 'absolute',
                right: 6,
                top: 6,
                height: 36,
                border: 'none',
                borderRadius: 14,
                background: KT.ink,
                color: KT.card,
                padding: '0 14px',
                fontSize: 12,
                fontWeight: 900,
                fontFamily: KT.font,
                opacity: isSearching || !query.trim() ? 0.45 : 1,
              }}
            >
              {t('search', { defaultValue: 'Search' })}
            </button>
          </form>

          {isSearching ? (
            <KsoftCard pad={18}>
              <div style={{ color: KT.sub, fontSize: 13, fontWeight: 800 }}>
                {t('dashboard.dictionary.searching', { defaultValue: 'Searching...' })}
              </div>
            </KsoftCard>
          ) : error ? (
            <KsoftEmptyState title={error} />
          ) : scope === 'dictionary' && result && result.entries.length > 0 ? (
            <section style={{ display: 'grid', gap: 10 }}>
              <SectionHead
                kanji="詞"
                title={t('dashboard.dictionary.label', { defaultValue: 'Dictionary' })}
              />
              {result.entries.map(entry => (
                <KsoftListRow
                  key={entry.targetCode}
                  seal="詞"
                  title={entry.word}
                  subtitle={getMeaning(entry)}
                  meta={[entry.pronunciation, entry.pos].filter(Boolean).join(' · ')}
                  onClick={() => void handleOpenDetail(entry)}
                />
              ))}
            </section>
          ) : scope === 'dictionary' && result && result.entries.length === 0 ? (
            <KsoftEmptyState
              title={t('dashboard.dictionary.noResults', { defaultValue: 'No results found' })}
            />
          ) : showGlobalEmpty ? (
            <KsoftEmptyState
              title={t('search.noResults', { defaultValue: 'No matching results' })}
            />
          ) : scope === 'all' && hasGlobalResults && globalSearchResult ? (
            <div style={{ display: 'grid', gap: 18 }}>
              {GLOBAL_BUCKET_ORDER.map(bucket => {
                const bucketHits = globalSearchResult.buckets[bucket];
                if (!bucketHits || bucketHits.length === 0) return null;
                return (
                  <section key={bucket} style={{ display: 'grid', gap: 10 }}>
                    <SectionHead title={getGlobalBucketLabel(bucket, t)} />
                    {bucketHits.map(hit => (
                      <KsoftListRow
                        key={`${bucket}-${hit.id}`}
                        seal={
                          bucket === 'grammar'
                            ? '文'
                            : bucket === 'book'
                              ? '讀'
                              : bucket === 'podcast'
                                ? '聲'
                                : '記'
                        }
                        title={hit.title}
                        subtitle={hit.subtitle}
                        onClick={() => navigate(hit.linkPath)}
                      />
                    ))}
                  </section>
                );
              })}
            </div>
          ) : (
            <KsoftEmptyState
              title={t('search.startTyping', { defaultValue: 'Start typing to search' })}
            />
          )}
        </main>

        <Dialog open={scope === 'dictionary' ? detailOpen : false} onOpenChange={setDetailOpen}>
          <DialogContent
            className="w-[min(92vw,520px)] max-h-[82vh] overflow-hidden p-0"
            style={{ borderRadius: 24, background: KT.card, borderColor: KT.line }}
          >
            <div style={{ padding: 20, borderBottom: `1px solid ${KT.line}` }}>
              <DialogHeader>
                <DialogTitle style={{ color: KT.ink, fontSize: 28, fontWeight: 900 }}>
                  {detailEntry?.word ||
                    t('dashboard.dictionary.label', { defaultValue: 'Dictionary' })}
                </DialogTitle>
                <DialogDescription style={{ color: KT.sub, fontWeight: 700 }}>
                  {[detailEntry?.pronunciation, detailEntry?.pos, detailEntry?.wordGrade]
                    .filter(Boolean)
                    .join(' · ')}
                </DialogDescription>
              </DialogHeader>
            </div>
            <div style={{ padding: 20, maxHeight: 'calc(82vh - 110px)', overflowY: 'auto' }}>
              {detailLoading ? (
                <div style={{ color: KT.sub, fontWeight: 800 }}>
                  {t('dashboard.dictionary.searching', { defaultValue: 'Searching...' })}
                </div>
              ) : detailError ? (
                <KsoftEmptyState title={detailError} />
              ) : (
                <div style={{ display: 'grid', gap: 10 }}>
                  {detailSenses.map((sense, idx) => (
                    <KsoftCard
                      key={`${detailEntry?.targetCode || 'detail'}-${sense.order}-${idx}`}
                      pad={16}
                      tone="bg2"
                    >
                      <Chip tone="muted">
                        {t('dashboard.dictionary.sense', { defaultValue: 'Sense' })}{' '}
                        {sense.order || idx + 1}
                      </Chip>
                      {sense.translation?.word ? (
                        <div
                          style={{ marginTop: 10, color: KT.ink, fontSize: 16, fontWeight: 900 }}
                        >
                          {sense.translation.word}
                        </div>
                      ) : null}
                      <div
                        style={{
                          marginTop: 8,
                          color: KT.ink2,
                          fontSize: 14,
                          lineHeight: 1.6,
                          fontWeight: 700,
                        }}
                      >
                        {cleanDictionaryText(
                          sense.translation?.definition ||
                            sense.definition ||
                            sense.translation?.word ||
                            ''
                        )}
                      </div>
                    </KsoftCard>
                  ))}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </PageShell>
    );
  }

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <DesktopDictionarySearchPage
        navigate={navigate}
        t={t}
        scope={scope}
        returnTo={returnTo}
        query={query}
        setQuery={setQuery}
        isSearching={isSearching}
        error={error}
        result={result}
        onSubmit={onSubmit}
        handleOpenDetail={handleOpenDetail}
        detailOpen={detailOpen}
        setDetailOpen={setDetailOpen}
        detailEntry={detailEntry}
        detailLoading={detailLoading}
        detailError={detailError}
        detailSenses={detailSenses}
        showGlobalEmpty={showGlobalEmpty}
        hasGlobalResults={hasGlobalResults}
        globalSearchResult={globalSearchResult}
        getGlobalBucketLabel={getGlobalBucketLabel}
        getMeaning={getMeaning}
        cleanDictionaryText={cleanDictionaryText}
      />
    </Suspense>
  );
}
