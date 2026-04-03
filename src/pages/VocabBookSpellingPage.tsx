import React, { useLayoutEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from 'convex/react';
import { useLocalizedNavigate } from '../hooks/useLocalizedNavigate';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { VOCAB } from '../utils/convexRefs';
import { getLocalizedContent } from '../utils/languageUtils';
import VocabQuiz from '../features/vocab/components/VocabQuiz';
import type { LearningSessionSnapshot } from '../features/vocab/components/VocabQuiz';
import { VocabBookSpellingSkeleton } from '../components/common';
import { buildVocabBookPath } from '../utils/vocabBookRoutes';
import {
  matchesVocabBookPracticeCategory,
  normalizeVocabBookPracticeCategory,
  type VocabBookPracticeCategory,
} from '../utils/vocabBookPractice';
import {
  buildVocabBookSpellingSessionStorageKey,
  clearLearningSessionSnapshot,
  loadLearningSessionSnapshot,
  persistLearningSessionSnapshot,
} from '../utils/vocabLearningSession';
import type { VocabBookItemDto } from '../../convex/vocab';
import { MobileImmersiveHeader } from '../components/mobile/MobileImmersiveHeader';

const PAGE_SIZE = 120;

const VocabBookSpellingPage: React.FC = () => {
  const navigate = useLocalizedNavigate();
  const { t } = useTranslation();
  const { language } = useAuth();
  const [params] = useSearchParams();
  const backPath = useMemo(() => buildVocabBookPath(params), [params]);
  const sessionStorageKey = useMemo(
    () => buildVocabBookSpellingSessionStorageKey(params),
    [params]
  );
  const [resumeSnapshot, setResumeSnapshot] = React.useState<LearningSessionSnapshot | null>(null);

  const categoryParam = (params.get('category') || 'DUE').toUpperCase();
  const q = params.get('q')?.trim();
  const selected = params.get('selected')?.trim();
  const selectedWordIds = useMemo(
    () =>
      selected
        ? selected
            .split(',')
            .map(id => id.trim())
            .filter(Boolean)
        : undefined,
    [selected]
  );
  const category: VocabBookPracticeCategory = normalizeVocabBookPracticeCategory(categoryParam);

  const [pageCursor, setPageCursor] = React.useState<string | null>(null);
  const [loadedItems, setLoadedItems] = React.useState<VocabBookItemDto[]>([]);

  const vocabBookPage = useQuery(VOCAB.getVocabBookPage, {
    includeMastered: true,
    search: q || undefined,
    savedByUserOnly: true,
    selectedWordIds,
    category,
    cursor: pageCursor || undefined,
    limit: PAGE_SIZE,
  });

  React.useEffect(() => {
    setResumeSnapshot(loadLearningSessionSnapshot(sessionStorageKey));
  }, [sessionStorageKey]);

  useLayoutEffect(() => {
    setPageCursor(null);
    setLoadedItems([]);
  }, [category, q, selected]);

  React.useEffect(() => {
    if (!vocabBookPage) return;
    setLoadedItems(prev => {
      if (pageCursor === null) return vocabBookPage.items;
      const existing = new Set(prev.map(item => String(item.id)));
      const appended = vocabBookPage.items.filter(item => !existing.has(String(item.id)));
      return [...prev, ...appended];
    });
    if (vocabBookPage.nextCursor) {
      setPageCursor(vocabBookPage.nextCursor);
    }
  }, [vocabBookPage, pageCursor]);

  const loading = vocabBookPage === undefined && loadedItems.length === 0;
  const items = useMemo(() => loadedItems, [loadedItems]);

  const words = useMemo(() => {
    const filtered = items.filter(item =>
      matchesVocabBookPracticeCategory(item.progress, category)
    );

    return filtered.map(w => ({
      id: String(w.id),
      korean: w.word,
      english:
        getLocalizedContent(w, 'meaning', language) ||
        w.meaning ||
        w.meaningEn ||
        w.meaningVi ||
        w.meaningMn ||
        '',
      unit: 0,
      partOfSpeech: w.partOfSpeech as string | undefined,
    }));
  }, [items, category, language]);

  const handleSessionSnapshot = React.useCallback(
    (snapshot: LearningSessionSnapshot) => {
      setResumeSnapshot(snapshot);
      persistLearningSessionSnapshot(sessionStorageKey, snapshot);
    },
    [sessionStorageKey]
  );

  const handleComplete = React.useCallback(() => {
    setResumeSnapshot(null);
    clearLearningSessionSnapshot(sessionStorageKey);
  }, [sessionStorageKey]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50 dark:from-emerald-400/8 dark:via-background dark:to-emerald-300/8">
        <MobileImmersiveHeader
          title={t('vocab.modeSpelling', { defaultValue: 'Spelling' })}
          subtitle={t('common.loading', { defaultValue: 'Loading...' })}
          eyebrow={t('dashboard.vocab.title', { defaultValue: 'Vocab' })}
          onBack={() => navigate(backPath)}
          backLabel={t('topikWriting.report.back', { defaultValue: 'Back' })}
          status={
            <div className="rounded-2xl border border-border bg-card px-3 py-2 text-right shadow-sm">
              <div className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">
                Progress
              </div>
              <div className="text-base font-black text-foreground">0</div>
            </div>
          }
          className="sticky top-0 z-20 border-b-[3px] border-emerald-100 dark:border-emerald-300/20 bg-card/80"
        />
        <VocabBookSpellingSkeleton />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50 dark:from-emerald-400/8 dark:via-background dark:to-emerald-300/8">
      <MobileImmersiveHeader
        title={t('vocab.modeSpelling', { defaultValue: 'Spelling' })}
        subtitle={t('vocab.spellingSubtitle', {
          defaultValue: 'Type the Korean word from its meaning prompt.',
        })}
        eyebrow={t('dashboard.vocab.title', { defaultValue: 'Vocab' })}
        onBack={() => navigate(backPath)}
        backLabel={t('topikWriting.report.back', { defaultValue: 'Back' })}
        status={
          <div className="rounded-2xl border border-border bg-card px-3 py-2 text-right shadow-sm">
            <div className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">
              Words
            </div>
            <div className="text-base font-black text-foreground">{words.length}</div>
          </div>
        }
        className="sticky top-0 z-20 border-b-[3px] border-emerald-100 dark:border-emerald-300/20 bg-card/80"
      />

      <div className="max-w-5xl mx-auto px-4 py-8 pb-[calc(var(--mobile-safe-bottom)+2rem)]">
        <VocabQuiz
          words={words}
          language={language}
          variant="learn"
          resumeSnapshot={resumeSnapshot}
          onSessionSnapshot={handleSessionSnapshot}
          onComplete={handleComplete}
          presetSettings={{
            multipleChoice: false,
            writingMode: true,
            writingDirection: 'NATIVE_TO_KR',
            autoTTS: true,
            soundEffects: false,
          }}
        />
      </div>
    </div>
  );
};

export default VocabBookSpellingPage;
