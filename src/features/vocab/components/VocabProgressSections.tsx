import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Eye, EyeOff, Star, Volume2, X } from 'lucide-react';
import { getLabels } from '../../../utils/i18n';
import { getLocalizedContent } from '../../../utils/languageUtils';
import type { Language } from '../../../types';
import { Dialog, DialogContent, DialogPortal } from '../../../components/ui';
import { Button } from '../../../components/ui';

type FsrsProgress = {
  status?: string;
  state?: number;
  stability?: number;
};

export type VocabProgressWord = {
  id: string;
  korean: string;
  english: string;
  meaning?: string;
  meaningEn?: string;
  meaningVi?: string;
  meaningMn?: string;
  exampleSentence?: string;
  exampleMeaning?: string;
  exampleMeaningEn?: string;
  exampleMeaningVi?: string;
  exampleMeaningMn?: string;
  partOfSpeech?: string;
  progress?: FsrsProgress | null;
  mastered?: boolean;
};

type Props = Readonly<{
  words: VocabProgressWord[];
  language: Language;
  redEyeEnabled: boolean;
  onRedEyeEnabledChange: (enabled: boolean) => void;
  starredIds?: Set<string>;
  onToggleStar?: (id: string) => void;
  onSpeak?: (text: string) => void;
}>;

type GroupKey = 'UNLEARNED' | 'LEARNING' | 'MASTERED';

// Helper to determine group based on FSRS state
const getGroupFromState = (
  state: number,
  stability: number | undefined,
  progress: FsrsProgress,
  mastered: boolean | undefined
): GroupKey => {
  if (state === 0) return 'UNLEARNED';
  if (state === 1 || state === 3) return 'LEARNING';
  if (state === 2) {
    if (typeof stability === 'number') {
      return stability > 30 ? 'MASTERED' : 'LEARNING';
    }
    return progress.status === 'MASTERED' || mastered ? 'MASTERED' : 'LEARNING';
  }
  return 'UNLEARNED';
};

// Helper to determine group based on status string
const getGroupFromStatus = (status: string | undefined): GroupKey => {
  if (status === 'MASTERED') return 'MASTERED';
  if (status === 'LEARNING' || status === 'REVIEW') return 'LEARNING';
  return 'UNLEARNED';
};

const deriveGroupKey = (w: VocabProgressWord): GroupKey => {
  const progress = w.progress;
  if (!progress) return 'UNLEARNED';

  const state = progress.state;
  const stability = progress.stability;

  // Try state-based classification first
  if (typeof state === 'number') {
    return getGroupFromState(state, stability, progress, w.mastered);
  }

  // Fall back to status-based classification
  return getGroupFromStatus(progress.status);
};

export default function VocabProgressSections({
  words,
  language,
  redEyeEnabled,
  onRedEyeEnabledChange,
  starredIds,
  onToggleStar,
  onSpeak,
}: Props) {
  const labels = useMemo(() => getLabels(language), [language]);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const hasShownPickerRef = useRef(false);
  const [showPicker, setShowPicker] = useState(false);
  const format = (template: string, vars: Record<string, string | number>) =>
    template.replace(/\{(\w+)\}/g, (_, key) => String(vars[key] ?? ''));

  const grouped = useMemo(() => {
    const buckets: Record<GroupKey, VocabProgressWord[]> = {
      UNLEARNED: [],
      LEARNING: [],
      MASTERED: [],
    };

    for (const w of words) {
      buckets[deriveGroupKey(w)].push(w);
    }

    return buckets;
  }, [words]);

  const speak = useCallback(
    (text: string) => {
      if (!onSpeak) return;
      onSpeak(text);
    },
    [onSpeak]
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const obs = new IntersectionObserver(
      entries => {
        if (hasShownPickerRef.current) return;
        if (entries.some(e => e.isIntersecting)) {
          hasShownPickerRef.current = true;
          setShowPicker(true);
        }
      },
      { root: null, threshold: 0.2 }
    );

    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const sectionDefs = useMemo(() => {
    return [
      {
        key: 'LEARNING' as const,
        title: labels.vocab?.learningBadge || 'Learning',
        subtitle:
          labels.vocabProgress?.learningSubtitle ||
          'These are words you have started learning. Keep it up!',
      },
      {
        key: 'UNLEARNED' as const,
        title: labels.vocab?.newBadge || 'New',
        subtitle: undefined,
      },
      {
        key: 'MASTERED' as const,
        title: labels.vocab?.mastered || 'Mastered',
        subtitle: undefined,
      },
    ];
  }, [labels]);

  const renderWordRow = (w: VocabProgressWord) => {
    const isStarred = starredIds?.has(w.id) ?? false;
    const meaning = getLocalizedContent(w as never, 'meaning', language) || w.english;
    const exampleMeaning =
      getLocalizedContent(w as never, 'exampleMeaning', language) || w.exampleMeaning || '';

    // Helper to get star button aria-label
    const getStarLabel = (): string => {
      if (isStarred) {
        return labels.vocabProgress?.starred || 'Starred';
      }
      return labels.vocabProgress?.star || 'Star';
    };

    return (
      <div className="bg-card border border-border rounded-2xl p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-[1fr_1fr] gap-3">
            <div className="min-w-0">
              <div className="text-foreground font-black text-xl truncate">{w.korean}</div>
              {w.exampleSentence && (
                <div className="text-muted-foreground text-xs mt-1 line-clamp-1">
                  {w.exampleSentence}
                </div>
              )}
            </div>
            <div className="min-w-0">
              <div
                className={`text-muted-foreground text-sm font-bold transition-all ${
                  redEyeEnabled ? 'blur-sm hover:blur-none select-none' : ''
                }`}
              >
                {meaning}
              </div>
              {exampleMeaning && (
                <div
                  className={`text-muted-foreground text-xs mt-1 transition-all ${
                    redEyeEnabled ? 'blur-sm hover:blur-none select-none' : ''
                  }`}
                >
                  {exampleMeaning}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="ghost"
              size="auto"
              type="button"
              onClick={() => {
                if (isStarred) return;
                onToggleStar?.(w.id);
              }}
              disabled={isStarred}
              className="w-9 h-9 rounded-xl bg-card hover:bg-muted border border-border flex items-center justify-center"
              aria-label={getStarLabel()}
            >
              <Star
                className={`w-4 h-4 ${isStarred ? 'text-yellow-500' : 'text-muted-foreground'}`}
              />
            </Button>
            <Button
              variant="ghost"
              size="auto"
              type="button"
              onClick={() => speak(w.korean)}
              className="w-9 h-9 rounded-xl bg-card hover:bg-muted border border-border flex items-center justify-center"
              aria-label={labels.vocabProgress?.speak || 'Speak'}
            >
              <Volume2 className="w-4 h-4 text-muted-foreground" />
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const totalCount = grouped.LEARNING.length + grouped.UNLEARNED.length + grouped.MASTERED.length;

  if (totalCount === 0) return null;

  return (
    <div ref={containerRef} className="w-full">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-xl font-black text-foreground">
            {labels.vocabProgress?.listTitle || labels.list || 'List'}
          </div>
          <div className="text-sm text-muted-foreground">
            {format(
              labels.vocabProgress?.groupedByFsrs || 'Grouped by FSRS progress ({count} words)',
              { count: totalCount }
            )}
          </div>
        </div>

        <Button
          variant="ghost"
          size="auto"
          type="button"
          onClick={() => onRedEyeEnabledChange(!redEyeEnabled)}
          className={`flex items-center gap-2 px-3 py-2 rounded-xl border-2 font-bold text-sm transition-all ${
            redEyeEnabled
              ? 'bg-red-50 border-red-400 text-red-600'
              : 'bg-card border-border text-muted-foreground hover:border-border'
          }`}
        >
          {redEyeEnabled ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          {labels.vocab?.redSheet || 'Red Eye'}
        </Button>
      </div>

      <div className="space-y-8">
        {sectionDefs.map(sec => {
          const items = grouped[sec.key];
          if (items.length === 0) return null;
          return (
            <div key={sec.key} className="space-y-3">
              <div className="flex items-baseline justify-between">
                <div className="text-lg font-black text-foreground">
                  {sec.title}{' '}
                  <span className="text-muted-foreground font-normal">({items.length})</span>
                </div>
              </div>
              {sec.subtitle && (
                <div className="text-sm text-muted-foreground -mt-2">{sec.subtitle}</div>
              )}
              <div className="space-y-3">
                {items.map((w, idx) => (
                  <React.Fragment key={`${w.id}:${idx}`}>{renderWordRow(w)}</React.Fragment>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={showPicker} onOpenChange={open => !open && setShowPicker(false)}>
        <DialogPortal>
          <DialogContent
            unstyled
            closeOnEscape={false}
            lockBodyScroll={false}
            className="fixed inset-0 z-[80] pointer-events-none data-[state=closed]:pointer-events-none"
          >
            <div className="absolute left-1/2 -translate-x-1/2 bottom-6 w-[min(520px,calc(100vw-2rem))]">
              <div className="pointer-events-auto bg-card rounded-2xl border-2 border-foreground shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                  <div className="font-black text-foreground">
                    {labels.vocab?.redSheet || 'Red Eye'}
                  </div>
                  <Button
                    variant="ghost"
                    size="auto"
                    type="button"
                    onClick={() => setShowPicker(false)}
                    className="w-9 h-9 rounded-xl bg-muted hover:bg-muted flex items-center justify-center"
                    aria-label={labels.common?.close || 'Close'}
                  >
                    <X className="w-4 h-4 text-muted-foreground" />
                  </Button>
                </div>

                <div className="p-3 space-y-2">
                  <Button
                    variant="ghost"
                    size="auto"
                    type="button"
                    onClick={() => {
                      onRedEyeEnabledChange(true);
                      setShowPicker(false);
                    }}
                    className={`w-full px-4 py-3 rounded-xl border-2 font-black text-left flex items-center justify-between ${
                      redEyeEnabled
                        ? 'bg-red-50 border-red-400 text-red-700'
                        : 'bg-card border-border text-muted-foreground hover:border-border'
                    }`}
                  >
                    <span>{labels.vocabProgress?.redEyeEnable || 'Enable'}</span>
                    <span className="text-xs font-bold text-muted-foreground">
                      {labels.vocabProgress?.redEyeEnableDesc || 'Blur meanings'}
                    </span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="auto"
                    type="button"
                    onClick={() => {
                      onRedEyeEnabledChange(false);
                      setShowPicker(false);
                    }}
                    className={`w-full px-4 py-3 rounded-xl border-2 font-black text-left flex items-center justify-between ${
                      redEyeEnabled
                        ? 'bg-card border-border text-muted-foreground hover:border-border'
                        : 'bg-green-50 border-green-400 text-green-700'
                    }`}
                  >
                    <span>{labels.vocabProgress?.redEyeDisable || 'Disable'}</span>
                    <span className="text-xs font-bold text-muted-foreground">
                      {labels.vocabProgress?.redEyeDisableDesc || 'Show meanings'}
                    </span>
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </DialogPortal>
      </Dialog>
    </div>
  );
}
