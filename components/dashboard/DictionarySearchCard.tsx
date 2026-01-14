import React, { useState, useCallback } from 'react';
import { Search, Loader2, Volume2, BookOpen } from 'lucide-react';
import { useAction } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useAuth } from '../../contexts/AuthContext';
import { getLabels } from '../../utils/i18n';

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

export default function DictionarySearchCard() {
    const { language } = useAuth();
    const labels = getLabels(language);
    const [query, setQuery] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [results, setResults] = useState<DictionaryEntry[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [hasSearched, setHasSearched] = useState(false);

    const searchDictionary = useAction(api.dictionary.searchDictionary as any);

    const handleSearch = useCallback(async () => {
        if (!query.trim()) return;

        setIsLoading(true);
        setError(null);
        setHasSearched(true);

        try {
            const translationLang = LANG_MAP[language] || 'en';
            const result = await searchDictionary({
                query: query.trim(),
                translationLang,
                num: 10,
            });
            setResults(result.entries);
        } catch (err: any) {
            console.error('Dictionary search error:', err);
            setError(err.message || 'Search failed');
            setResults([]);
        } finally {
            setIsLoading(false);
        }
    }, [query, language, searchDictionary]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    };

    // Clean CDATA tags from API response
    const cleanText = (text: string) => {
        return text?.replace(/<!\[CDATA\[|\]\]>/g, '') || '';
    };

    // Get word grade badge color and localized text
    const getGradeInfo = (grade?: string) => {
        const gradeLabels = labels.dashboard?.dictionary?.grade;
        switch (grade) {
            case '초급': return {
                color: 'bg-green-100 text-green-700 border-green-200',
                text: gradeLabels?.beginner || 'Beginner'
            };
            case '중급': return {
                color: 'bg-yellow-100 text-yellow-700 border-yellow-200',
                text: gradeLabels?.intermediate || 'Intermediate'
            };
            case '고급': return {
                color: 'bg-red-100 text-red-700 border-red-200',
                text: gradeLabels?.advanced || 'Advanced'
            };
            default: return {
                color: 'bg-slate-100 text-slate-600 border-slate-200',
                text: grade || ''
            };
        }
    };

    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <BookOpen size={16} className="text-indigo-500" />
                    <span className="text-xs font-black text-indigo-500 uppercase tracking-wider">
                        {labels.dashboard?.dictionary?.label || "Dictionary"}
                    </span>
                </div>
            </div>

            {/* Search Input */}
            <div className="relative mb-3">
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={labels.dashboard?.dictionary?.placeholder || "Search Korean word..."}
                    className="w-full px-4 py-2.5 pr-12 rounded-xl border-2 border-slate-200 bg-white text-slate-900 font-medium placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition"
                />
                <button
                    onClick={handleSearch}
                    disabled={isLoading || !query.trim()}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm"
                >
                    {isLoading ? (
                        <Loader2 size={16} className="animate-spin" />
                    ) : (
                        <Search size={16} />
                    )}
                </button>
            </div>

            {/* Results Area */}
            <div className="flex-1 overflow-y-auto space-y-2 scrollbar-thin scrollbar-thumb-slate-200">
                {error && (
                    <div className="text-sm text-red-500 text-center py-2">
                        {error}
                    </div>
                )}

                {!hasSearched && !isLoading && (
                    <div className="text-sm text-slate-400 text-center py-4">
                        {labels.dashboard?.dictionary?.hint || "Enter a Korean word to search"}
                    </div>
                )}

                {hasSearched && results.length === 0 && !isLoading && !error && (
                    <div className="text-sm text-slate-400 text-center py-4">
                        {labels.dashboard?.dictionary?.noResults || "No results found"}
                    </div>
                )}

                {results.map((entry, index) => (
                    <div
                        key={entry.targetCode || index}
                        className="bg-slate-50 rounded-xl p-3 border border-slate-100 hover:border-indigo-200 transition group"
                    >
                        {/* Word Header */}
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-lg font-black text-slate-900">{entry.word}</span>
                            {entry.pronunciation && entry.pronunciation !== entry.word && (
                                <span className="text-sm text-slate-400">[{entry.pronunciation}]</span>
                            )}
                            {entry.wordGrade && (() => {
                                const gradeInfo = getGradeInfo(entry.wordGrade);
                                return (
                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${gradeInfo.color}`}>
                                        {gradeInfo.text}
                                    </span>
                                );
                            })()}
                            {entry.pos && (
                                <span className="text-[10px] font-medium text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                                    {entry.pos}
                                </span>
                            )}
                        </div>

                        {/* First Sense */}
                        {entry.senses[0] && (
                            <div className="text-sm">
                                <p className="text-slate-600 line-clamp-1">{entry.senses[0].definition}</p>
                                {entry.senses[0].translation && (
                                    <p className="text-indigo-600 font-medium mt-0.5 line-clamp-1">
                                        {cleanText(entry.senses[0].translation.word)}
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
