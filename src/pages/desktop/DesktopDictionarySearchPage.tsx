import React, { useMemo } from 'react';
import { DesktopCard } from '../../components/desktop/ui/DesktopCard';
import { DesignChip } from '../../components/desktop/ui/DesignChip';
import { Search, Volume2, Clock, Link as LinkIcon, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { TFunction } from 'i18next';
import type { SearchAllResult } from '../../utils/convexRefs';

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

type DesktopDictionarySearchPageProps = {
  navigate: (path: string) => void;
  t: TFunction;
  scope: string;
  returnTo: string;
  query: string;
  setQuery: (q: string) => void;
  isSearching: boolean;
  error: string | null;
  result: { entries: DictionaryEntry[] } | null;
  onSubmit: (e: React.FormEvent) => void;
  handleOpenDetail: (entry: DictionaryEntry) => void;
  detailOpen: boolean;
  setDetailOpen: (open: boolean) => void;
  detailEntry: DictionaryEntry | null;
  detailLoading: boolean;
  detailError: string | null;
  detailSenses: unknown[];
  showGlobalEmpty: boolean;
  hasGlobalResults: boolean;
  globalSearchResult: unknown;
  getGlobalBucketLabel: (bucket: keyof SearchAllResult['buckets'], t: TFunction) => string;
  getMeaning: (entry: DictionaryEntry) => string;
  cleanDictionaryText: (text: string) => string;
};

function DRail({
  kanji,
  title,
  action,
  children,
  pad = 14,
}: {
  kanji?: string;
  title: string;
  action?: string;
  children: React.ReactNode;
  pad?: number;
}) {
  return (
    <div className="mb-[22px]">
      <div className="mb-2.5 flex items-baseline px-0.5">
        {kanji && (
          <span className="mr-1.5 font-k-serif text-[14px] font-medium text-k-crimson">
            {kanji}
          </span>
        )}
        <span className="text-[11px] font-extrabold tracking-[0.4px] text-k-ink uppercase opacity-40">
          {title}
        </span>
        {action && (
          <span className="ml-auto text-[10px] font-black text-k-sub cursor-pointer hover:text-k-ink transition-colors uppercase tracking-wider">
            {action}
          </span>
        )}
      </div>
      <div
        className="rounded-[24px] bg-k-card shadow-k-sh-sm border border-k-line/5"
        style={{ padding: pad }}
      >
        {children}
      </div>
    </div>
  );
}

export default function DesktopDictionarySearchPage({
  navigate: _navigate,
  t: _t,
  query,
  setQuery,
  isSearching,
  error: _error,
  result,
  onSubmit,
  handleOpenDetail,
  detailEntry,
  detailLoading,
  detailError: _detailError,
  getMeaning,
  cleanDictionaryText,
}: DesktopDictionarySearchPageProps) {
  // Get all examples from all senses
  const exampleSentences = useMemo(() => {
    if (!detailEntry?.senses) return [];
    return detailEntry.senses.flatMap(s => s.examples || []).slice(0, 6);
  }, [detailEntry]);

  // Handle speak
  const handleSpeak = (text: string) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ko-KR';
    window.speechSynthesis.speak(utterance);
  };

  // Temporary search history - ideally from local storage or backend
  const searchHistory = ['한국어', '공부', '바다', '하늘'];

  return (
    <div className="p-10 max-w-[1400px] mx-auto">
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-1.5 rounded-full bg-k-crimson" />
          <h2 className="text-[12px] font-black uppercase tracking-[0.2em] text-k-sub">
            DICTIONARY · {detailEntry?.word || query || '搜词'}
          </h2>
        </div>
      </div>

      <div className="grid grid-cols-[340px_1fr] items-start gap-10">
        <aside className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-500">
          <DesktopCard pad={16} className="bg-k-bg2/40 border-none shadow-none">
            <form onSubmit={onSubmit} className="relative mb-4">
              <div className="flex items-center gap-3 rounded-2xl bg-k-card px-4 py-3 shadow-k-sh-sm border border-k-line/5">
                <Search
                  size={18}
                  className={cn(
                    'transition-colors',
                    isSearching ? 'text-k-crimson animate-pulse' : 'text-k-sub'
                  )}
                />
                <input
                  className="flex-1 bg-transparent font-sans text-[14px] font-extrabold text-k-ink outline-none placeholder:text-k-sub/40"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="输入韩语单词..."
                />
              </div>
            </form>
            <div className="flex flex-wrap gap-2">
              <DesignChip tone="ink" size="sm" className="px-3 py-1.5 text-[10px] font-black">
                韩→中
              </DesignChip>
              <DesignChip
                tone="muted"
                size="sm"
                className="px-3 py-1.5 text-[10px] font-black opacity-40"
              >
                中→韩
              </DesignChip>
              <DesignChip
                tone="muted"
                size="sm"
                className="px-3 py-1.5 text-[10px] font-black opacity-40"
              >
                韩→英
              </DesignChip>
            </div>
          </DesktopCard>

          {result && result.entries.length > 0 && (
            <DRail kanji="果" title="搜索结果" pad={0}>
              <div className="max-h-[400px] overflow-y-auto py-2">
                {result.entries.map(entry => (
                  <div
                    key={entry.targetCode}
                    onClick={() => handleOpenDetail(entry)}
                    className={cn(
                      'flex flex-col gap-0.5 px-5 py-3.5 cursor-pointer transition-all border-l-4',
                      detailEntry?.targetCode === entry.targetCode
                        ? 'border-k-crimson bg-k-bg2'
                        : 'border-transparent hover:bg-k-bg2/60'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[15px] font-black text-k-ink">{entry.word}</span>
                      <span className="text-[10px] font-bold text-k-sub opacity-40 uppercase tracking-widest">
                        {entry.pos}
                      </span>
                    </div>
                    <span className="text-[12px] font-medium text-k-sub line-clamp-1">
                      {getMeaning(entry)}
                    </span>
                  </div>
                ))}
              </div>
            </DRail>
          )}

          <DRail kanji="史" title="搜索历史" pad={0}>
            {searchHistory.map((w, i, a) => (
              <div
                key={i}
                onClick={() => setQuery(w)}
                className="flex cursor-pointer items-center justify-between px-5 py-3 transition-colors hover:bg-k-bg2 group"
                style={{
                  borderBottom: i < a.length - 1 ? '1px solid var(--color-k-line)' : 'none',
                }}
              >
                <div className="flex items-center gap-3">
                  <Clock
                    size={14}
                    className="text-k-sub/20 group-hover:text-k-crimson/40 transition-colors"
                  />
                  <span className="text-[13px] font-extrabold text-k-ink tracking-tight">{w}</span>
                </div>
                <ChevronRight
                  size={14}
                  className="text-k-sub/20 group-hover:translate-x-0.5 transition-all"
                />
              </div>
            ))}
          </DRail>
        </aside>

        <main className="animate-in fade-in slide-in-from-right-4 duration-700">
          {detailLoading ? (
            <DesktopCard
              pad={40}
              className="flex flex-col items-center justify-center min-h-[500px]"
            >
              <div className="w-12 h-12 rounded-full border-4 border-k-line/20 border-t-k-crimson animate-spin mb-6" />
              <p className="text-[13px] font-black text-k-sub uppercase tracking-[0.2em]">
                正在获取词条详情...
              </p>
            </DesktopCard>
          ) : detailEntry ? (
            <div className="space-y-6">
              <DesktopCard pad={40} className="relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
                  <LinkIcon size={120} />
                </div>

                <div className="relative z-10">
                  <div className="mb-6 flex items-baseline flex-wrap gap-4">
                    <h1 className="font-k-serif text-[56px] font-medium tracking-tight text-k-ink leading-none">
                      {detailEntry.word}
                    </h1>
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-[18px] font-bold text-k-sub/60 font-sans tracking-tight">
                        [ {detailEntry.pronunciation || '...'} ]
                      </span>
                      <button
                        onClick={() => handleSpeak(detailEntry.word)}
                        className="group w-10 h-10 rounded-full flex items-center justify-center bg-k-ink text-k-bg hover:bg-k-crimson transition-all shadow-k-sh-sm"
                      >
                        <Volume2 size={18} className="group-hover:scale-110 transition-transform" />
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3 mb-10">
                    <DesignChip tone="ink" size="sm" className="px-4 py-1.5 text-[11px] font-black">
                      {detailEntry.pos || '未知品类'}
                    </DesignChip>
                    {detailEntry.wordGrade && (
                      <DesignChip
                        tone="crimson"
                        size="sm"
                        className="px-4 py-1.5 text-[11px] font-black"
                      >
                        {detailEntry.wordGrade}
                      </DesignChip>
                    )}
                    <DesignChip
                      tone="muted"
                      size="sm"
                      className="px-4 py-1.5 text-[11px] font-black opacity-40"
                    >
                      词频 5/5
                    </DesignChip>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-12 border-t border-k-line/10 pt-10">
                    <section>
                      <h3 className="mb-5 text-[11px] font-black uppercase tracking-[0.2em] text-k-sub opacity-40">
                        释义 / Senses
                      </h3>
                      <div className="space-y-8">
                        {detailEntry.senses.map((sense, i) => (
                          <div key={i} className="group">
                            <div className="flex items-start gap-4">
                              <span className="mt-1 flex-shrink-0 w-6 h-6 rounded-lg bg-k-ink/5 flex items-center justify-center text-[11px] font-black text-k-crimson">
                                {sense.order || i + 1}
                              </span>
                              <div>
                                <p className="font-k-serif text-[22px] font-medium leading-[1.3] text-k-ink mb-1">
                                  {cleanDictionaryText(sense.translation?.word || sense.definition)}
                                </p>
                                {sense.translation?.definition && (
                                  <p className="text-[14px] font-medium text-k-sub leading-relaxed opacity-80">
                                    {cleanDictionaryText(sense.translation.definition)}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>

                    <section>
                      <h3 className="mb-5 text-[11px] font-black uppercase tracking-[0.2em] text-k-sub opacity-40">
                        例句 / Examples
                      </h3>
                      <div className="space-y-4">
                        {exampleSentences.length > 0 ? (
                          exampleSentences.map((s, i) => (
                            <div
                              key={i}
                              className="p-5 rounded-[20px] bg-k-bg2 border border-k-line/5 hover:border-k-crimson/20 transition-all group"
                            >
                              <p className="font-k-serif text-[15px] leading-relaxed text-k-ink mb-2 group-hover:text-k-crimson transition-colors">
                                {s.ko}
                              </p>
                              {s.translation && (
                                <p className="text-[12px] font-bold text-k-sub opacity-60 leading-relaxed">
                                  {s.translation}
                                </p>
                              )}
                            </div>
                          ))
                        ) : (
                          <div className="py-12 flex flex-col items-center justify-center text-center opacity-40">
                            <p className="text-[12px] font-black uppercase tracking-widest text-k-sub">
                              暂无例句数据
                            </p>
                          </div>
                        )}
                      </div>
                    </section>
                  </div>
                </div>
              </DesktopCard>

              {/* Optional related section if we have data later */}
              <DRail kanji="關" title="派生与相关" action="查看全部 →" pad={0}>
                <div className="py-4 px-6 text-center">
                  <p className="text-[12px] font-black text-k-sub opacity-20 uppercase tracking-widest">
                    相关词条模块开发中
                  </p>
                </div>
              </DRail>
            </div>
          ) : (
            <DesktopCard
              pad={40}
              className="flex flex-col items-center justify-center min-h-[500px] bg-k-bg2/20 border-dashed border-2"
            >
              <div className="w-20 h-20 rounded-[30px] bg-k-card shadow-k-sh-sm flex items-center justify-center mb-8">
                <Search size={32} className="text-k-sub/20" />
              </div>
              <h2 className="text-[20px] font-black text-k-ink mb-2">准备好开启探索了吗？</h2>
              <p className="text-[14px] font-medium text-k-sub max-w-[300px] text-center opacity-60 mb-8">
                在左侧输入韩语单词，我们将为您提供来自权威词典的详细解析。
              </p>
              <div className="flex gap-4">
                <button
                  onClick={() => setQuery('바다')}
                  className="px-5 py-2 rounded-xl bg-k-card text-[12px] font-black text-k-ink border border-k-line/10 hover:border-k-crimson transition-all"
                >
                  바다 (大海)
                </button>
                <button
                  onClick={() => setQuery('공부')}
                  className="px-5 py-2 rounded-xl bg-k-card text-[12px] font-black text-k-ink border border-k-line/10 hover:border-k-crimson transition-all"
                >
                  공부 (学习)
                </button>
              </div>
            </DesktopCard>
          )}
        </main>
      </div>
    </div>
  );
}
