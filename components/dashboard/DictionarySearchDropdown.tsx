import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Search, Loader2, X, Star, ExternalLink, ChevronRight } from 'lucide-react';
import { useAction, useMutation } from 'convex/react';
import { makeFunctionReference } from 'convex/server';
import { useAuth } from '../../src/contexts/AuthContext';
import { getLabels } from '../../src/utils/i18n';
import { VOCAB } from '../../src/utils/convexRefs';

// Map app language codes to KRDICT translation language codes
const LANG_MAP: Record<string, string> = {
  en: 'en',
  zh: 'zh',
  vi: 'vi',
  mn: 'mn',
};

interface DictionaryEntry {
  targetCode: string;
  word: string;
  pronunciation?: string;
  wordGrade?: string;
  pos?: string;
  link?: string;
  senses: Array<{
    order: number;
    definition: string;
    translation?: {
      lang: string;
      word: string;
      definition: string;
    };
  }>;
}

export default function DictionarySearchDropdown() {
  const { language, user } = useAuth();
  const labels = getLabels(language);
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<DictionaryEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<DictionaryEntry | null>(null);
  const [savingWord, setSavingWord] = useState<string | null>(null);
  const [savedWords, setSavedWords] = useState<Set<string>>(new Set());

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const searchDictionary = (
    useAction as unknown as (a: unknown) => (args: unknown) => Promise<unknown>
  )(makeFunctionReference('dictionary:searchDictionary'));
  const addToReview = useMutation(VOCAB.addToReview);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSelectedEntry(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search
  const performSearch = useCallback(
    async (searchQuery: string) => {
      if (!searchQuery.trim()) {
        setResults([]);
        setHasSearched(false);
        return;
      }

      setIsLoading(true);
      setError(null);
      setHasSearched(true);
      setIsOpen(true);
      setSelectedEntry(null);

      try {
        const translationLang = LANG_MAP[language] || 'en';
        const result = await searchDictionary({
          query: searchQuery.trim(),
          translationLang,
          num: 8,
        });
        const data = result as { entries?: DictionaryEntry[] };
        setResults(data.entries ?? []);
      } catch (err: unknown) {
        console.error('Dictionary search error:', err);
        setError(err instanceof Error ? err.message : 'Search failed');
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    },
    [language, searchDictionary]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    setSelectedEntry(null);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (value.trim()) {
      debounceRef.current = setTimeout(() => {
        performSearch(value);
      }, 300);
    } else {
      setIsOpen(false);
      setResults([]);
      setHasSearched(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      setSelectedEntry(null);
      inputRef.current?.blur();
    } else if (e.key === 'Enter') {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      performSearch(query);
    }
  };

  const clearSearch = () => {
    setQuery('');
    setResults([]);
    setIsOpen(false);
    setHasSearched(false);
    setSelectedEntry(null);
    inputRef.current?.focus();
  };

  // Clean CDATA tags from API response
  const cleanText = (text: string) => {
    return text?.replace(/<!\[CDATA\[|\]\]>/g, '') || '';
  };

  // Save word to vocab book
  const handleSaveWord = async (entry: DictionaryEntry) => {
    console.log('Attempting to save word:', entry.word);
    console.log('User state:', user);

    if (!user) {
      console.error('Save failed: No user found');
      return;
    }

    setSavingWord(entry.word);
    try {
      const meaning =
        entry.senses[0]?.translation?.word ||
        entry.senses[0]?.translation?.definition ||
        entry.senses[0]?.definition ||
        '';

      console.log('Calling addToReview mutation...');
      const result = await addToReview({
        word: entry.word,
        meaning: cleanText(meaning),
        partOfSpeech: entry.pos || 'NOUN',
        source: 'DICTIONARY',
      });
      console.log('Save result:', result);

      setSavedWords(prev => new Set(prev).add(entry.word));
    } catch (err) {
      console.error('Failed to save word:', err);
    } finally {
      setSavingWord(null);
    }
  };

  // Get word grade badge style (claymorphism)
  const getGradeStyle = (grade?: string) => {
    switch (grade) {
      case '초급':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case '중급':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      case '고급':
        return 'bg-rose-100 text-rose-700 border-rose-200';
      default:
        return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  const gradeLabels: Record<string, string> = {
    초급: 'Beginner',
    중급: 'Intermediate',
    고급: 'Advanced',
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Search Input - Enhanced Claymorphism style */}
      <div className="relative group">
        {/* Gradient border effect */}
        <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-200 via-purple-200 to-pink-200 rounded-2xl opacity-60 group-hover:opacity-100 blur-sm transition-opacity duration-300" />

        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => hasSearched && setIsOpen(true)}
            placeholder={labels.dashboard?.dictionary?.placeholder || 'Search Korean...'}
            className="relative w-72 px-4 py-3 pl-11 pr-10 bg-white border-2 border-white/80 rounded-2xl text-sm font-medium text-slate-700 placeholder:text-slate-400 focus:outline-none shadow-[0_8px_32px_rgba(0,0,0,0.08),inset_0_2px_4px_rgba(255,255,255,1)] transition-all"
          />

          {/* Search Icon with gradient background */}
          <div className="absolute left-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-lg flex items-center justify-center shadow-sm">
            <Search className="w-3.5 h-3.5 text-white" />
          </div>

          {/* Clear button or Loading spinner */}
          {isLoading ? (
            <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-500 animate-spin" />
          ) : (
            query && (
              <button
                onClick={clearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5 text-slate-500" />
              </button>
            )
          )}
        </div>
      </div>

      {/* Dropdown Results - Claymorphism style */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-96 bg-white border-[3px] border-slate-200 rounded-3xl shadow-[0_12px_40px_rgba(0,0,0,0.1),inset_0_2px_6px_rgba(255,255,255,0.9)] max-h-[420px] overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Error State */}
          {error && (
            <div className="px-5 py-4 text-sm text-rose-500 text-center bg-rose-50 border-b-2 border-rose-100">
              {error}
            </div>
          )}

          {/* No Results State */}
          {hasSearched && results.length === 0 && !isLoading && !error && (
            <div className="px-5 py-8 text-center">
              <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Search className="w-6 h-6 text-slate-400" />
              </div>
              <p className="text-sm font-medium text-slate-500">
                {labels.dashboard?.dictionary?.noResults || 'No results found'}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Try a different keyword or check spelling
              </p>
            </div>
          )}

          {/* Results List */}
          <div className="max-h-[380px] overflow-y-auto">
            {results.map((entry, index) => (
              <div
                key={entry.targetCode || index}
                onClick={() =>
                  setSelectedEntry(selectedEntry?.targetCode === entry.targetCode ? null : entry)
                }
                className={`px-5 py-4 cursor-pointer transition-all border-b-2 border-slate-100 last:border-b-0 ${
                  selectedEntry?.targetCode === entry.targetCode
                    ? 'bg-indigo-50'
                    : 'hover:bg-slate-50'
                }`}
              >
                {/* Word Header Row */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-lg font-bold text-slate-900">{entry.word}</span>
                    {entry.pronunciation && entry.pronunciation !== entry.word && (
                      <span className="text-xs text-slate-400 font-medium">
                        [{entry.pronunciation}]
                      </span>
                    )}
                    {entry.wordGrade && (
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${getGradeStyle(entry.wordGrade)}`}
                      >
                        {gradeLabels[entry.wordGrade] || entry.wordGrade}
                      </span>
                    )}
                    {entry.pos && (
                      <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg">
                        {entry.pos}
                      </span>
                    )}
                  </div>
                  <ChevronRight
                    className={`w-4 h-4 text-slate-400 transition-transform ${selectedEntry?.targetCode === entry.targetCode ? 'rotate-90' : ''}`}
                  />
                </div>

                {/* Basic Definition */}
                {entry.senses[0] && (
                  <div className="mt-1.5">
                    <p className="text-sm text-slate-600 line-clamp-1">
                      {entry.senses[0].definition}
                    </p>
                    {entry.senses[0].translation && (
                      <p className="text-sm text-indigo-600 font-semibold mt-0.5 line-clamp-1">
                        {cleanText(
                          entry.senses[0].translation.word || entry.senses[0].translation.definition
                        )}
                      </p>
                    )}
                  </div>
                )}

                {/* Expanded Detail View */}
                {selectedEntry?.targetCode === entry.targetCode && (
                  <div className="mt-4 pt-4 border-t-2 border-indigo-100 space-y-3 animate-in fade-in duration-200">
                    {/* All Senses */}
                    {entry.senses.length > 1 && (
                      <div className="space-y-2">
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                          All Meanings
                        </p>
                        {entry.senses.map((sense, i) => (
                          <div
                            key={i}
                            className="bg-white rounded-xl p-3 border-2 border-slate-100"
                          >
                            <p className="text-sm text-slate-700">
                              {i + 1}. {sense.definition}
                            </p>
                            {sense.translation && (
                              <p className="text-sm text-indigo-600 font-medium mt-1">
                                →{' '}
                                {cleanText(sense.translation.word || sense.translation.definition)}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-2 pt-2">
                      {user && (
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            handleSaveWord(entry);
                          }}
                          disabled={savingWord === entry.word || savedWords.has(entry.word)}
                          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all cursor-pointer border-2 ${
                            savedWords.has(entry.word)
                              ? 'bg-amber-100 text-amber-700 border-amber-200'
                              : 'bg-indigo-500 text-white border-indigo-600 hover:bg-indigo-600 shadow-[0_4px_12px_rgba(99,102,241,0.3)]'
                          }`}
                        >
                          {savingWord === entry.word ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Star
                              className={`w-4 h-4 ${savedWords.has(entry.word) ? 'fill-current' : ''}`}
                            />
                          )}
                          {savedWords.has(entry.word) ? 'Saved!' : 'Save to Vocab'}
                        </button>
                      )}

                      {entry.link && (
                        <a
                          href={entry.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()}
                          className="px-4 py-2.5 rounded-xl font-bold text-sm bg-slate-100 text-slate-700 border-2 border-slate-200 hover:bg-slate-200 transition-all flex items-center gap-2"
                        >
                          <ExternalLink className="w-4 h-4" />
                          KRDICT
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
