import React, { useMemo, Suspense, lazy } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from 'convex/react';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useLocalizedNavigate } from '../hooks/useLocalizedNavigate';
import { useAuth } from '../contexts/AuthContext';
import { getLabels } from '../utils/i18n';
import { VOCAB } from '../utils/convexRefs';
import { Button } from '../components/ui';
import { useTranslation } from 'react-i18next';

const VocabQuiz = lazy(() => import('../features/vocab/components/VocabQuiz'));

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
    const labels = useMemo(() => getLabels(language), [language]);
    const [params] = useSearchParams();

    const modeParam = (params.get('mode') ?? 'full') as ReviewMode;
    const mode: ReviewMode =
        modeParam === 'quick' || modeParam === 'weak' ? modeParam : 'full';

    const vocabBook = useQuery(VOCAB.getVocabBook, { includeMastered: true, limit: 500 });
    const [now] = React.useState(() => Date.now());

    const dueItems = useMemo(() => {
        if (!vocabBook) return [];
        return vocabBook.filter(
            item =>
                item.progress.status !== 'MASTERED' &&
                !!item.progress.nextReviewAt &&
                item.progress.nextReviewAt <= now
        );
    }, [vocabBook, now]);

    const words = useMemo(() => {
        if (!vocabBook) return [];

        let source = dueItems;

        if (mode === 'quick') {
            source = shuffleArray(dueItems).slice(0, QUICK_LIMIT);
        } else if (mode === 'weak') {
            // Sort by difficulty desc, then lapses desc; take top N
            source = [...vocabBook]
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
            unit: 0,
        }));
    }, [vocabBook, dueItems, mode]);

    const modeLabel = useMemo(() => {
        if (mode === 'quick') return t('reviewPage.modes.quick.title', { defaultValue: 'Quick Review' });
        if (mode === 'weak') return t('reviewPage.modes.weak.title', { defaultValue: 'Weakest Words' });
        return t('reviewPage.modes.full.title', { defaultValue: 'Full Review' });
    }, [mode, t]);

    const loading = vocabBook === undefined;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 dark:from-indigo-400/8 dark:via-background dark:to-indigo-300/8">
            {/* Header */}
            <div className="sticky top-0 z-20 bg-card/70 backdrop-blur-xl border-b-[3px] border-indigo-100 dark:border-indigo-300/20">
                <div className="max-w-5xl mx-auto px-4 py-5 flex items-center justify-between">
                    <Button
                        onClick={() => navigate('/review')}
                        variant="ghost"
                        size="auto"
                        className="p-2.5 rounded-2xl bg-card border-[3px] border-border hover:border-indigo-300 dark:hover:border-indigo-300/35 transition-all duration-200"
                        aria-label={t('common.back', { defaultValue: 'Back' })}
                    >
                        <ArrowLeft className="w-5 h-5 text-muted-foreground" />
                    </Button>
                    <div className="text-center">
                        <p className="text-xs font-black text-indigo-600 dark:text-indigo-300 tracking-wider uppercase">
                            {modeLabel}
                        </p>
                        {!loading && (
                            <p className="text-sm font-bold text-muted-foreground">
                                {words.length} {labels.wordsUnit ?? 'words'}
                            </p>
                        )}
                    </div>
                    <div className="w-12" />
                </div>
            </div>

            {/* Content */}
            <div className="max-w-5xl mx-auto px-4 py-8">
                {loading ? (
                    <div className="flex items-center justify-center min-h-[40vh]">
                        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                    </div>
                ) : words.length === 0 ? (
                    <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
                        <p className="text-2xl">🎉</p>
                        <p className="text-lg font-bold text-slate-700 dark:text-slate-200">
                            {t('reviewPage.queue.empty_due', { defaultValue: 'No words due for review! Good job.' })}
                        </p>
                        <Button onClick={() => navigate('/review')} variant="secondary">
                            {t('reviewPage.dashboard.title', { defaultValue: 'Back to Review' })}
                        </Button>
                    </div>
                ) : (
                    <Suspense fallback={
                        <div className="flex items-center justify-center min-h-[40vh]">
                            <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                        </div>
                    }>
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
            </div>
        </div>
    );
};

export default ReviewQuizPage;
