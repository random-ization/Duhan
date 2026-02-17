import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { useAction } from 'convex/react';
import { aRef } from '../../utils/convexRefs';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { cleanDictionaryText } from '../../utils/dictionaryMeaning';
import { Button } from '../ui';
import { Input } from '../ui';
import { DropdownMenu, DropdownMenuAnchor, DropdownMenuContent } from '../ui';

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

const DictionarySearchDropdown: React.FC = () => {
  const { language } = useAuth();
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  const runSearch = useCallback(
    async (q: string) => {
      const trimmed = q.trim();
      if (trimmed.length < 2) {
        setResults(null);
        setError(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const res = await searchDictionary({
          query: trimmed,
          translationLang,
          num: 8,
          sort: 'popular',
        });
        setResults(res);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        setResults(null);
        setError(msg || t('dashboard.dictionary.error', { defaultValue: 'Search failed' }));
      } finally {
        setLoading(false);
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
              <Button
                type="button"
                variant="ghost"
                size="auto"
                onClick={() => {
                  setQuery(entry.word);
                  setOpen(false);
                }}
                className="w-full text-left px-3 py-2 hover:bg-accent"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <div className="font-black text-foreground">{entry.word}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {entry.pos || entry.pronunciation || ''}
                  </div>
                </div>
                {meaning && (
                  <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{meaning}</div>
                )}
              </Button>
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
    </div>
  );
};

export default DictionarySearchDropdown;
