import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Search, Loader2, ExternalLink } from 'lucide-react';
import { useAction } from 'convex/react';
import { aRef } from '../../utils/convexRefs';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { cleanDictionaryText } from '../../utils/dictionaryMeaning';
import { Button } from '../ui';
import { Input } from '../ui';
import { DropdownMenu, DropdownMenuAnchor, DropdownMenuContent } from '../ui';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui';

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

const DictionarySearchDropdown: React.FC = () => {
  const { language } = useAuth();
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
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

  const runSearch = useCallback(
    async (q: string) => {
      const trimmed = q.trim();
      const requestId = searchRequestRef.current + 1;
      searchRequestRef.current = requestId;

      if (trimmed.length < 2) {
        setResults(null);
        setError(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const baseArgs = {
          query: trimmed,
          translationLang,
          num: 8,
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
        setResults(res);
      } catch (e: unknown) {
        if (searchRequestRef.current !== requestId) return;
        const msg = e instanceof Error ? e.message : String(e);
        setResults(null);
        setError(msg || t('dashboard.dictionary.error', { defaultValue: 'Search failed' }));
      } finally {
        if (searchRequestRef.current === requestId) {
          setLoading(false);
        }
      }
    },
    [searchDictionary, t, translationLang]
  );

  useEffect(() => {
    if (!open) return;
    const handle = globalThis.setTimeout(() => {
      void runSearch(query);
    }, 300);
    return () => globalThis.clearTimeout(handle);
  }, [open, query, runSearch]);

  const entries = results?.entries ?? [];

  const detailSenses = useMemo(() => {
    if (!detailEntry?.senses?.length) return [];
    return detailEntry.senses
      .slice()
      .sort((a, b) => (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER));
  }, [detailEntry]);

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
      } catch (e: unknown) {
        if (detailRequestRef.current !== requestId) return;
        const msg = e instanceof Error ? e.message : String(e);
        setDetailError(msg || t('dashboard.dictionary.error', { defaultValue: 'Search failed' }));
      } finally {
        if (detailRequestRef.current === requestId) {
          setDetailLoading(false);
        }
      }
    },
    [getWordDetail, t, translationLang]
  );

  const renderDropdownContent = () => {
    if (error) {
      return <div className="p-3 text-sm text-rose-600 font-semibold">{error}</div>;
    }

    if (entries.length === 0) {
      return (
        <div className="p-3 text-sm text-muted-foreground">
          {t('dashboard.dictionary.noResults', { defaultValue: 'No results' })}
        </div>
      );
    }

    return (
      <ul className="max-h-[360px] overflow-auto">
        {entries.map(entry => {
          const firstSense = entry.senses?.[0];
          const rawMeaning =
            firstSense?.translation?.definition ||
            firstSense?.translation?.word ||
            firstSense?.definition ||
            '';
          const meaning = cleanDictionaryText(rawMeaning);
          return (
            <li key={entry.targetCode}>
              <div className="px-3 py-2 hover:bg-accent">
                <Button
                  type="button"
                  variant="ghost"
                  size="auto"
                  onClick={() => {
                    setQuery(entry.word);
                    setOpen(false);
                  }}
                  className="w-full text-left p-0"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <div className="font-black text-foreground">{entry.word}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {entry.pos || entry.pronunciation || ''}
                    </div>
                  </div>
                  {meaning && (
                    <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                      {meaning}
                    </div>
                  )}
                </Button>
                <div className="mt-1 flex justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="auto"
                    onClick={() => void handleOpenDetail(entry)}
                    className="h-6 px-2 rounded-md border border-border bg-muted text-[11px] font-bold"
                  >
                    {t('common.details', { defaultValue: 'Details' })}
                  </Button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    );
  };

  const showDropdown = open && (query.trim().length >= 2 || entries.length > 0 || Boolean(error));

  return (
    <div className="relative w-[280px]">
      <DropdownMenu open={showDropdown} onOpenChange={setOpen}>
        <DropdownMenuAnchor>
          <div className="flex items-center gap-2 bg-card border-2 border-foreground rounded-2xl px-3 py-2 shadow-sm">
            {loading ? (
              <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />
            ) : (
              <Search className="w-4 h-4 text-muted-foreground" />
            )}
            <Input
              value={query}
              onChange={e => {
                setQuery(e.target.value);
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
              placeholder={t('dashboard.dictionary.placeholder', {
                defaultValue: 'Search dictionary',
              })}
              className="w-full border-none shadow-none p-0 h-auto text-sm font-medium text-foreground placeholder:text-muted-foreground focus-visible:ring-0"
            />
          </div>
        </DropdownMenuAnchor>

        <DropdownMenuContent
          unstyled
          forceMount
          className="absolute left-0 right-0 mt-2 bg-card border-2 border-foreground rounded-2xl shadow-[4px_4px_0px_0px_rgba(15,23,42,0.25)] overflow-hidden z-50 data-[state=closed]:hidden"
        >
          {renderDropdownContent()}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="w-[min(92vw,700px)] max-h-[85vh] overflow-hidden p-0">
          <div className="border-b border-border px-5 py-4">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black text-foreground">
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

          <div className="px-5 py-4 overflow-y-auto max-h-[calc(85vh-110px)]">
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
                    <p className="text-sm text-foreground leading-relaxed mt-1">
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
};

export default DictionarySearchDropdown;
