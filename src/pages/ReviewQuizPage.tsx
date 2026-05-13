import React, { useMemo, Suspense, lazy } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from 'convex/react';
import { useLocalizedNavigate } from '../hooks/useLocalizedNavigate';
import { useAuth } from '../contexts/AuthContext';
import { getLabels } from '../utils/i18n';
import { VOCAB } from '../utils/convexRefs';
import { useTranslation } from 'react-i18next';
import { useIsMobile } from '../hooks/useIsMobile';
import { Card as KsoftCard, KT, PageShell } from '../components/mobile/ksoft/ksoft';
import {
  KsoftEmptyState,
  KsoftImmersiveHeader,
} from '../components/mobile/ksoft/KsoftMobilePrimitives';

const VocabQuiz = lazy(() => import('../features/vocab/components/VocabQuiz'));
const DesktopReviewQuizPage = lazy(() => import('./desktop/DesktopReviewQuizPage'));

type ReviewMode = 'quick' | 'full' | 'weak';

const QUICK_LIMIT = 10;
const WEAK_LIMIT = 25;

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const ReviewQuizPage: React.FC = () => {
  const navigate = useLocalizedNavigate();
  const { language } = useAuth();
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const labels = useMemo(() => getLabels(language), [language]);
  const [params] = useSearchParams();

  const modeParam = (params.get('mode') ?? 'full') as ReviewMode;
  const mode: ReviewMode = modeParam === 'quick' || modeParam === 'weak' ? modeParam : 'full';

  const reviewQueue = useQuery(VOCAB.getDueForReview);
  const [now] = React.useState(() => Date.now());

  const dueItems = useMemo(() => {
    if (!reviewQueue) return [];
    return reviewQueue.filter(
      item => !!item.progress.nextReviewAt && item.progress.nextReviewAt <= now
    );
  }, [reviewQueue, now]);

  const words = useMemo(() => {
    if (!reviewQueue) return [];

    let source = dueItems;

    if (mode === 'quick') {
      source = shuffleArray(dueItems).slice(0, QUICK_LIMIT);
    } else if (mode === 'weak') {
      // Sort by difficulty desc, then lapses desc; take top N
      source = [...reviewQueue]
        .filter(item => item.progress.status !== 'NEW')
        .sort((a, b) => {
          const lapsesDiff = (b.progress.lapses ?? 0) - (a.progress.lapses ?? 0);
          if (lapsesDiff !== 0) return lapsesDiff;
          return (b.progress.difficulty ?? 0) - (a.progress.difficulty ?? 0);
        })
        .slice(0, WEAK_LIMIT);
    }

    return source.map(item => ({
      id: String(item.id),
      korean: item.word,
      english: item.meaning,
      meaning: item.meaning,
      meaningZh: item.meaningZh || item.meaning,
      unit: 0,
      partOfSpeech: item.partOfSpeech,
      pronunciation: item.pronunciation,
      example: item.exampleSentence,
    }));
  }, [reviewQueue, dueItems, mode]);

  const modeLabel = useMemo(() => {
    if (mode === 'quick')
      return t('reviewPage.modes.quick.title', { defaultValue: 'Quick Review' });
    if (mode === 'weak') return t('reviewPage.modes.weak.title', { defaultValue: 'Weakest Words' });
    return t('reviewPage.modes.full.title', { defaultValue: 'Full Review' });
  }, [mode, t]);

  const loading = reviewQueue === undefined;

  if (isMobile) {
    return (
      <PageShell bg={`linear-gradient(180deg, ${KT.bg} 0%, ${KT.bg2} 100%)`}>
        <KsoftImmersiveHeader
          eyebrow="復 · REVIEW"
          title={modeLabel}
          subtitle={
            loading
              ? t('common.loading', { defaultValue: 'Loading...' })
              : `${words.length} ${labels.wordsUnit ?? 'words'}`
          }
          seal="復"
          onBack={() => navigate('/review')}
        />
        <main style={{ padding: '2px 16px 112px' }}>
          {loading ? (
            <KsoftCard pad={22}>
              <div style={{ color: KT.sub, fontSize: 14, fontWeight: 800 }}>
                {t('dashboard.dictionary.searching', { defaultValue: 'Searching...' })}
              </div>
            </KsoftCard>
          ) : words.length === 0 ? (
            <KsoftEmptyState
              title={t('reviewPage.queue.empty_due', {
                defaultValue: 'No words due for review! Good job.',
              })}
              actionLabel={t('reviewPage.dashboard.title', { defaultValue: 'Back to Review' })}
              onAction={() => navigate('/review')}
            />
          ) : (
            <Suspense
              fallback={
                <div
                  style={{ minHeight: 220, display: 'grid', placeItems: 'center', color: KT.sub }}
                >
                  {t('common.loading', { defaultValue: 'Loading...' })}
                </div>
              }
            >
              <VocabQuiz
                words={words}
                language={language}
                variant="quiz"
                presetSettings={{
                  multipleChoice: true,
                  writingMode: false,
                  mcDirection: 'KR_TO_NATIVE',
                  autoTTS: true,
                  soundEffects: true,
                }}
                onComplete={() => navigate('/review')}
              />
            </Suspense>
          )}
        </main>
      </PageShell>
    );
  }

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <DesktopReviewQuizPage
        modeLabel={modeLabel}
        loading={loading}
        words={words}
        labels={labels}
        dueItems={dueItems}
        mode={mode}
        language={language}
        navigate={navigate}
        t={t}
      />
    </Suspense>
  );
};

export default ReviewQuizPage;
