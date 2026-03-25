import React, { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from 'convex/react';
import { ArrowLeft } from 'lucide-react';
import { useLocalizedNavigate } from '../hooks/useLocalizedNavigate';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { VOCAB } from '../utils/convexRefs';
import { getLocalizedContent } from '../utils/languageUtils';
import VocabQuiz from '../features/vocab/components/VocabQuiz';
import { VocabBookSpellingSkeleton } from '../components/common';
import { Button } from '../components/ui';
import type { VocabBookItemDto } from '../../convex/vocab';

type VocabBookCategory = 'UNLEARNED' | 'DUE' | 'MASTERED';
const PAGE_SIZE = 120;

const VocabBookSpellingPage: React.FC = () => {
  const navigate = useLocalizedNavigate();
  const { t } = useTranslation();
  const { language } = useAuth();
  const [params] = useSearchParams();

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
  const category: VocabBookCategory =
    categoryParam === 'UNLEARNED' || categoryParam === 'MASTERED' || categoryParam === 'DUE'
      ? (categoryParam as VocabBookCategory)
      : 'DUE';

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
    const filtered = items.filter(item => {
      const p = item.progress;
      const isMastered = p.status === 'MASTERED';
      const isUnlearned = p.state === 0 || p.status === 'NEW';

      let c: VocabBookCategory = 'DUE';
      if (isMastered) {
        c = 'MASTERED';
      } else if (isUnlearned) {
        c = 'UNLEARNED';
      }

      return c === category;
    });

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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50 dark:from-emerald-400/8 dark:via-background dark:to-emerald-300/8">
        <div className="sticky top-0 z-20 bg-card/70 backdrop-blur-xl border-b-[3px] border-emerald-100 dark:border-emerald-300/20">
          <div className="max-w-5xl mx-auto px-4 py-5 flex items-center justify-between">
            <Button
              onClick={() => navigate('/vocab-book')}
              variant="ghost"
              size="auto"
              className="p-2.5 rounded-2xl bg-card border-[3px] border-border hover:border-emerald-300 dark:hover:border-emerald-300/35 transition-all duration-200"
              aria-label={t('topikWriting.report.back', { defaultValue: 'Back' })}
            >
              <ArrowLeft className="w-5 h-5 text-muted-foreground" />
            </Button>
            <div className="text-center">
              <p className="text-xs font-black text-emerald-600 dark:text-emerald-300 tracking-wider uppercase">
                {t('vocab.modeSpelling', { defaultValue: 'Spelling' })}
              </p>
              <p className="text-sm font-black text-muted-foreground" />
              <p className="text-[10px] font-bold text-muted-foreground mt-1">
                {t('common.loading', { defaultValue: 'Loading...' })}
              </p>
            </div>
            <div className="w-12" />
          </div>
        </div>
        <VocabBookSpellingSkeleton />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50 dark:from-emerald-400/8 dark:via-background dark:to-emerald-300/8">
      <div className="sticky top-0 z-20 bg-card/70 backdrop-blur-xl border-b-[3px] border-emerald-100 dark:border-emerald-300/20">
        <div className="max-w-5xl mx-auto px-4 py-5 flex items-center justify-between">
          <Button
            onClick={() => navigate('/vocab-book')}
            variant="ghost"
            size="auto"
            className="p-2.5 rounded-2xl bg-card border-[3px] border-border hover:border-emerald-300 dark:hover:border-emerald-300/35 transition-all duration-200"
            aria-label={t('topikWriting.report.back', { defaultValue: 'Back' })}
          >
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
          </Button>
          <div className="text-center">
            <p className="text-xs font-black text-emerald-600 dark:text-emerald-300 tracking-wider uppercase">
              {t('vocab.modeSpelling', { defaultValue: 'Spelling' })}
            </p>
            <p className="text-sm font-black text-muted-foreground">
              {loading
                ? ''
                : t('dashboard.vocab.count', {
                    count: words.length,
                    defaultValue: '{{count}} words',
                  })}
            </p>
          </div>
          <div className="w-12" />
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        <VocabQuiz
          words={words}
          language={language}
          variant="learn"
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
