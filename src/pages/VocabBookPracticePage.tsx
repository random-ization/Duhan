import React, { Suspense, lazy, useMemo, useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from 'convex/react';
import { ChevronLeft, CheckCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getLabels } from '../utils/i18n';
import { VOCAB } from '../utils/convexRefs';
import { AppBreadcrumb } from '../components/common/AppBreadcrumb';
import { VocabModuleSkeleton } from '../components/common';
import { Button } from '../components/ui';
import type { Language } from '../types';
import type { PartOfSpeech } from '../types';
import { useTTS } from '../hooks/useTTS';

const FlashcardView = lazy(() => import('../features/vocab/components/FlashcardView'));
const VocabQuiz = lazy(() => import('../features/vocab/components/VocabQuiz'));
const VocabMatch = lazy(() => import('../features/vocab/components/VocabMatch'));
const VocabTest = lazy(() => import('../features/vocab/components/VocabTest'));
const VocabLearnOverlay = lazy(() => import('../features/vocab/components/VocabLearnOverlay'));

export type PracticeMode = 'flashcard' | 'learn' | 'test' | 'match';

const normalizePartOfSpeech = (value: string | undefined): PartOfSpeech | undefined => {
  switch (value) {
    case 'NOUN':
    case 'VERB_T':
    case 'VERB_I':
    case 'ADJ':
    case 'ADV':
    case 'PARTICLE':
      return value;
    default:
      return undefined;
  }
};

export default function VocabBookPracticePage() {
  const { language, user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { speak } = useTTS();
  const [isFinished, setIsFinished] = useState(false);
  const [sessionResults, setSessionResults] = useState<{ correct: any[], incorrect: any[] } | null>(null);
  
  const labels = useMemo(() => getLabels(language), [language]);
  
  // Extract params
  const mode = (searchParams.get('mode') || 'flashcard') as PracticeMode;
  const courseId = searchParams.get('courseId') || undefined;
  const all = searchParams.get('all') === 'true';
  const categoryParam = (searchParams.get('category') || 'DUE').toUpperCase();
  const unit = searchParams.get('unit') ? Number(searchParams.get('unit')) : undefined;
  
  // Data fetching
  const vocabBookPage = useQuery(VOCAB.getVocabBookPage, {
    includeMastered: true,
    savedByUserOnly: !courseId && !all,
    category: categoryParam as any,
    courseId: courseId,
    unit: unit,
    limit: 200,
  });

  const words = useMemo(() => {
    if (!vocabBookPage) return [];
    return vocabBookPage.items.map(item => ({
      id: item.id,
      korean: item.word,
      english: item.meaning || item.meaningEn || '',
      unit: item.courseData?.unitId || 0,
      partOfSpeech: normalizePartOfSpeech(item.partOfSpeech),
      pos: item.partOfSpeech,
      hanja: item.hanja,
      exampleSentence: item.exampleSentence,
      exampleMeaning: item.exampleMeaning || item.exampleZh,
      exampleTranslation: item.exampleMeaning || item.exampleZh,
    }));
  }, [vocabBookPage]);

  const loading = vocabBookPage === undefined;

  const handleBack = () => {
    navigate(-1);
  };

  const handleComplete = (results?: any) => {
    if (results) setSessionResults(results);
    setIsFinished(true);
  };

  const renderSummary = () => {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center animate-in fade-in zoom-in duration-300">
        <div className="w-24 h-24 bg-k-mint-deep/10 text-k-mint-deep rounded-3xl flex items-center justify-center mb-6 shadow-sm">
          <CheckCircle className="w-12 h-12" />
        </div>
        <h2 className="text-3xl font-black text-k-ink mb-2">
          {labels.vocab?.matchTitle || 'Great Job!'}
        </h2>
        <p className="text-k-sub font-bold mb-8">
          {labels.vocab?.matchDesc || 'Session completed successfully.'}
        </p>
        
        {sessionResults && (
          <div className="grid grid-cols-2 gap-4 mb-10 w-full max-w-xs">
            <div className="bg-k-mint-deep/5 border border-k-mint-deep/10 p-4 rounded-2xl">
              <div className="text-2xl font-black text-k-mint-deep">{sessionResults.correct.length}</div>
              <div className="text-xs font-bold text-k-sub uppercase tracking-wider">{labels.vocab?.remembered || 'Known'}</div>
            </div>
            <div className="bg-k-pink-deep/5 border border-k-pink-deep/10 p-4 rounded-2xl">
              <div className="text-2xl font-black text-k-pink-deep">{sessionResults.incorrect.length}</div>
              <div className="text-xs font-bold text-k-sub uppercase tracking-wider">{labels.vocab?.forgot || 'Forgot'}</div>
            </div>
          </div>
        )}

        <div className="flex gap-4">
          <Button onClick={() => { setIsFinished(false); setSessionResults(null); }} variant="outline" className="rounded-2xl px-8 py-3 font-bold">
            {labels.vocab?.restart || 'Restart'}
          </Button>
          <Button onClick={handleBack} className="rounded-2xl px-10 py-3 font-black bg-k-ink text-k-card hover:bg-k-ink/90 shadow-lg">
            {labels.common?.back || 'Finish'}
          </Button>
        </div>
      </div>
    );
  };

  const renderInnerContent = () => {
    if (isFinished) return renderSummary();

    switch (mode) {
      case 'flashcard':
        return (
          <FlashcardView
            words={words}
            language={language as Language}
            courseId={courseId}
            onComplete={handleComplete}
            onSpeak={speak}
            settings={{
              flashcard: {
                batchSize: 100,
                random: true,
                autoTTS: true,
                cardFront: 'KOREAN',
                ratingMode: 'PASS_FAIL',
              },
              learn: {
                batchSize: 20,
                random: true,
                ratingMode: 'PASS_FAIL',
                types: { multipleChoice: true, writing: true },
                answers: { korean: true, native: true },
              },
            }}
          />
        );
      case 'learn':
        return (
          <VocabQuiz
            words={words}
            courseId={courseId}
            variant="learn"
            language={language as Language}
            onComplete={handleComplete}
            onClose={handleBack}
          />
        );
      case 'test':
        return (
          <VocabTest
            words={words}
            language={language as Language}
            scopeTitle={all ? (labels.vocab?.allVocab || 'All Vocabulary') : (labels.vocab?.myVocab || 'My Vocabulary')}
            onClose={handleBack}
            onComplete={handleComplete}
          />
        );
      case 'match':
        return (
          <VocabMatch
            words={words}
            onClose={handleBack}
            onComplete={handleComplete}
          />
        );
      default:
        return <div>Invalid Mode</div>;
    }
  };

  const renderContent = () => {
    if (loading) return <VocabModuleSkeleton />;
    if (words.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-20 text-center h-screen bg-k-bg w-full">
          <div className="text-6xl mb-6">📚</div>
          <h2 className="text-2xl font-black text-k-ink mb-2">
            {labels.vocab?.noWords || 'No words found'}
          </h2>
          <p className="text-k-sub font-bold mb-8">
            {labels.vocab?.noWordsDesc || 'Try adding some words or choosing a different category.'}
          </p>
          <Button onClick={handleBack} variant="outline" className="rounded-xl px-8 py-3">
            {labels.common?.back || 'Go Back'}
          </Button>
        </div>
      );
    }

    const isFlashcard = mode === 'flashcard' && !isFinished;

    return (
      <div 
        className={`w-full overflow-hidden flex flex-col min-h-[650px] ${
          isFlashcard 
            ? 'bg-transparent h-screen' 
            : 'bg-[#FDFCFB]/80 rounded-[40px] border border-slate-100 shadow-[0_20px_60px_rgba(0,0,0,0.03)]'
        }`}
        style={{ overscrollBehaviorX: 'none' }}
      >
         {renderInnerContent()}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-k-bg flex flex-col items-center py-8 px-6">
      <div className="w-full max-w-7xl mb-8 animate-in fade-in slide-in-from-top duration-500">
        <AppBreadcrumb
          className="mb-4 opacity-50"
          items={[
            { label: labels.vocab?.pageTitle || 'Vocabulary', to: '/vocab-book' },
            { label: mode.charAt(0).toUpperCase() + mode.slice(1) },
          ]}
        />
        
        <div className="flex items-center gap-6">
          <Button
            variant="ghost"
            size="auto"
            onClick={handleBack}
            className="w-12 h-12 bg-white border border-slate-200 rounded-full flex items-center justify-center hover:border-k-crimson hover:text-k-crimson transition-all shadow-sm active:scale-95"
          >
            <ChevronLeft className="w-6 h-6" />
          </Button>
          <h1 className="text-4xl font-black text-slate-800 tracking-tight">
            {mode === 'flashcard' && (labels.vocab?.flashcard || '闪卡复习')}
            {mode === 'learn' && (labels.vocab?.learn || '学习')}
            {mode === 'test' && (labels.vocab?.quiz || 'Test')}
            {mode === 'match' && (labels.vocab?.match || 'Match')}
          </h1>
        </div>
      </div>

      <div className="w-full max-w-7xl flex flex-col items-center h-full">
        <Suspense fallback={<VocabModuleSkeleton />}>
          {renderContent()}
        </Suspense>
      </div>
    </div>
  );
}
