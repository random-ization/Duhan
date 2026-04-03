import React, { useState, useMemo, useRef } from 'react';
import { TopikExam, Language } from '../../../types';
import { clsx } from 'clsx';
import { useTranslation } from 'react-i18next';
import {
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  Grid3x3,
  List,
  RotateCcw,
  Sparkles,
  Bookmark,
  BookmarkCheck,
} from 'lucide-react';
import { useAction, useMutation } from 'convex/react';
import { aRef, NOTE_PAGES } from '../../../utils/convexRefs';
import { Button } from '../../ui';
import { sanitizeStrictHtml } from '../../../utils/sanitize';
import { useNotebookPicker } from '../../../contexts/NotebookPickerContext';
import { MobileImmersiveHeader } from '../MobileImmersiveHeader';

interface MobileExamReviewProps {
  exam: TopikExam;
  userAnswers: Record<number, number>;
  language: Language;
  onBack: () => void;
  onReset?: () => void;
}

interface AIAnalysis {
  translation: string;
  keyPoint: string;
  analysis: string;
  wrongOptions: Record<string, string>;
}

type ViewMode = 'OVERVIEW' | 'DETAIL';
type TranslateFn = ReturnType<typeof useTranslation>['t'];

const buildTopikAnalysisNoteText = (aiAnalysis: AIAnalysis, t: TranslateFn) => {
  const sections: string[] = [];
  const translationTitle = t('dashboard.topik.mobile.review.translation', {
    defaultValue: 'Translation',
  });
  const keyPointTitle = t('dashboard.topik.mobile.review.keyPoint', { defaultValue: 'Key Point' });
  const analysisTitle = t('dashboard.topik.mobile.review.analysis', { defaultValue: 'Analysis' });
  const wrongOptionsTitle = t('dashboard.topik.mobile.review.wrongOptions', {
    defaultValue: 'Wrong Options',
  });
  const optionLabel = t('common.option', { defaultValue: 'Option' });

  if (aiAnalysis.translation?.trim()) {
    sections.push(`${translationTitle}\n${aiAnalysis.translation.trim()}`);
  }
  if (aiAnalysis.keyPoint?.trim()) {
    sections.push(`${keyPointTitle}\n${aiAnalysis.keyPoint.trim()}`);
  }
  if (aiAnalysis.analysis?.trim()) {
    sections.push(`${analysisTitle}\n${aiAnalysis.analysis.trim()}`);
  }
  const wrongOptions = Object.entries(aiAnalysis.wrongOptions || {})
    .map(([key, value]) => `${optionLabel} ${key}: ${value}`)
    .filter(line => line.trim().length > 0);
  if (wrongOptions.length > 0) {
    sections.push(`${wrongOptionsTitle}\n${wrongOptions.join('\n')}`);
  }
  return sections.join('\n\n');
};

const ReviewResultBanner: React.FC<{ isCorrect: boolean; t: TranslateFn }> = ({ isCorrect, t }) => (
  <div
    className={clsx(
      'mb-6 rounded-2xl p-4 flex items-center gap-3 border shadow-sm',
      isCorrect
        ? 'bg-emerald-50 dark:bg-emerald-500/12 border-emerald-100 dark:border-emerald-300/25 text-emerald-800 dark:text-emerald-200'
        : 'bg-red-50 dark:bg-red-500/12 border-red-100 dark:border-red-300/25 text-red-800 dark:text-red-200'
    )}
  >
    <div
      className={clsx(
        'w-10 h-10 rounded-full flex items-center justify-center shrink-0',
        isCorrect
          ? 'bg-emerald-100 dark:bg-emerald-500/16 text-emerald-600 dark:text-emerald-300'
          : 'bg-red-100 dark:bg-red-500/16 text-red-500 dark:text-red-300'
      )}
    >
      {isCorrect ? <Check className="w-6 h-6" /> : <X className="w-6 h-6" />}
    </div>
    <div>
      <div className="font-black text-lg">
        {isCorrect
          ? t('dashboard.topik.mobile.review.resultCorrect', { defaultValue: 'Correct!' })
          : t('dashboard.topik.mobile.review.resultIncorrect', {
              defaultValue: 'Incorrect',
            })}
      </div>
      <div className="text-xs opacity-80 font-medium">
        {isCorrect
          ? t('dashboard.topik.mobile.review.resultCorrectHint', {
              defaultValue: 'Good job!',
            })
          : t('dashboard.topik.mobile.review.resultIncorrectHint', {
              defaultValue: 'Review the explanation below.',
            })}
      </div>
    </div>
  </div>
);

const ReviewSaveToast: React.FC<{ show: boolean; saveError: string | null; t: TranslateFn }> = ({
  show,
  saveError,
  t,
}) => {
  if (!show) return null;
  return (
    <div className="fixed bottom-mobile-floating left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 fade-in duration-300 w-[90%] max-w-sm pointer-events-none">
      <div
        className={clsx(
          'pointer-events-auto px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 border',
          saveError
            ? 'bg-red-50 dark:bg-red-500/14 text-red-800 dark:text-red-200 border-red-200 dark:border-red-300/25'
            : 'bg-emerald-600 dark:bg-emerald-500/70 text-white border-emerald-500 dark:border-emerald-300/35'
        )}
      >
        {saveError ? (
          <X className="w-5 h-5 shrink-0" />
        ) : (
          <BookmarkCheck className="w-5 h-5 shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm">
            {saveError
              ? t('dashboard.topik.mobile.review.saveFailedShort', {
                  defaultValue: 'Failed to Save',
                })
              : t('dashboard.topik.mobile.review.savedToast', {
                  defaultValue: 'Saved to Notebook',
                })}
          </p>
        </div>
      </div>
    </div>
  );
};

export const MobileExamReview: React.FC<MobileExamReviewProps> = ({
  exam,
  userAnswers,
  language,
  onBack,
  onReset,
}) => {
  const { t } = useTranslation();
  const sanitize = (html?: string) => sanitizeStrictHtml(String(html ?? ''));
  const [viewMode, setViewMode] = useState<ViewMode>('OVERVIEW');
  const [reviewFilter, setReviewFilter] = useState<'ALL' | 'WRONG'>('ALL');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const detailScrollRef = useRef<HTMLDivElement>(null);

  // AI Analysis State
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Save to notebook state
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [showSaveToast, setShowSaveToast] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Convex Actions
  const analyzeQuestionAction = useAction(
    aRef<
      {
        question: string;
        options: string[];
        correctAnswer: number;
        type: string;
        language?: string;
        instruction?: string;
        passage?: string;
        contextBox?: string;
        questionNumber?: number;
      },
      { success?: boolean; data?: AIAnalysis }
    >('ai:analyzeQuestion')
  );

  const ingestFromSource = useMutation(NOTE_PAGES.ingestFromSource);
  const { pickNotebook } = useNotebookPicker();

  // Reset AI state when question is changed
  React.useEffect(() => {
    setAiAnalysis(null);
    setAiError(null);
    setIsSaved(false);
    setSaveError(null);
    setShowSaveToast(false);
  }, [currentQuestionIndex]);

  const handleAIAnalysis = async (question: any) => {
    if (aiLoading || aiAnalysis) return;

    setAiLoading(true);
    setAiError(null);

    try {
      const questionText = question.question || question.passage || '';

      const result = (await analyzeQuestionAction({
        question: questionText,
        options: question.options,
        correctAnswer: question.correctAnswer ?? 0,
        type: 'TOPIK_QUESTION',
        language,
        instruction: question.instruction,
        passage: question.passage,
        contextBox: question.contextBox,
        questionNumber: question.number ?? currentQuestionIndex + 1,
      })) as { success?: boolean; data?: AIAnalysis };

      if (result?.success && result.data) {
        setAiAnalysis(result.data);
      } else {
        setAiError(
          t('dashboard.topik.mobile.review.aiError', {
            defaultValue: 'AI is busy right now. Please try again later.',
          })
        );
      }
    } catch (err) {
      console.error('[AI Analysis] Error:', err);
      setAiError(
        t('dashboard.topik.mobile.review.aiError', {
          defaultValue: 'AI is busy right now. Please try again later.',
        })
      );
    } finally {
      setAiLoading(false);
    }
  };

  const handleSaveToNotebook = async (question: any) => {
    if (!aiAnalysis || isSaving || isSaved) return;

    setIsSaving(true);
    setSaveError(null);

    try {
      const questionText = question.question || question.passage || '';
      const title =
        questionText.length > 30
          ? questionText.substring(0, 30) + '...'
          : questionText ||
            t('dashboard.topik.mobile.review.questionTitleFallback', {
              number: question.number || currentQuestionIndex + 1,
              defaultValue: 'TOPIK Q{{number}}',
            });
      const contentId = exam.id || 'topik-review';
      const noteText = buildTopikAnalysisNoteText(aiAnalysis, t);
      const questionNumber =
        typeof question.number === 'number' ? question.number : currentQuestionIndex + 1;
      const notebookId = await pickNotebook({
        title: t('dashboard.topik.mobile.review.saveToNotebookTitle', {
          defaultValue: 'Save AI Analysis',
        }),
        description: t('dashboard.topik.mobile.review.saveToNotebookDescription', {
          defaultValue: 'Choose a notebook, or create one before saving.',
        }),
        confirmText: t('dashboard.topik.mobile.review.saveToNotebookConfirm', {
          defaultValue: 'Save to Notebook',
        }),
        cancelText: t('dashboard.topik.mobile.review.saveToNotebookCancel', {
          defaultValue: 'Cancel',
        }),
      });
      if (!notebookId) {
        setIsSaving(false);
        return;
      }

      const result = await ingestFromSource({
        notebookId,
        sourceModule: 'TOPIK_ANALYSIS',
        sourceRef: {
          module: 'TOPIK_ANALYSIS',
          contentId,
          questionIndex: currentQuestionIndex,
          questionNumber,
          contextKey: `TOPIK-${contentId}-Q${currentQuestionIndex}`,
        },
        noteType: 'ai_mistake',
        title,
        quote: questionText,
        note: noteText || undefined,
        tags: ['topik', 'ai-analysis', 'review', 'mobile'],
        status: 'Inbox',
        dedupeKey: `topik-analysis|${contentId}|q${currentQuestionIndex}`,
        contentId,
        contentTitle: `TOPIK ${contentId}`,
      });

      if (result) {
        setIsSaved(true);
        setShowSaveToast(true);
        setTimeout(() => setShowSaveToast(false), 4000);
      } else {
        throw new Error(
          t('dashboard.topik.mobile.review.saveFailed', {
            defaultValue: 'Failed to save, please try again.',
          })
        );
      }
    } catch (err: unknown) {
      console.error('[Save to Notebook] Error:', err);
      setSaveError(
        (err as Error)?.message ||
          t('dashboard.topik.mobile.review.saveFailed', {
            defaultValue: 'Failed to save, please try again.',
          })
      );
      setShowSaveToast(true);
      setTimeout(() => setShowSaveToast(false), 4000);
    } finally {
      setIsSaving(false);
    }
  };

  // Calculate statistics
  const stats = useMemo(() => {
    let correctCount = 0;
    const total = exam.questions.length;
    let score = 0;
    let totalScore = 0;

    exam.questions.forEach((q, idx) => {
      const isCorrect = userAnswers[idx] === q.correctAnswer;
      if (isCorrect) correctCount++;
      score += isCorrect ? q.score || 2 : 0;
      totalScore += q.score || 2;
    });

    return {
      correctCount,
      total,
      score,
      totalScore,
      mistakeCount: total - correctCount,
      percentage: totalScore > 0 ? Math.round((score / totalScore) * 100) : 0,
    };
  }, [exam.questions, userAnswers]);

  // Derived list of question indices to show based on filter
  const questionsToShow = useMemo(() => {
    if (reviewFilter === 'ALL') {
      return exam.questions.map((_, idx) => idx);
    }
    return exam.questions
      .map((q, idx) => ({ q, idx }))
      .filter(({ q, idx }) => userAnswers[idx] !== q.correctAnswer)
      .map(({ idx }) => idx);
  }, [exam.questions, userAnswers, reviewFilter]);

  // Determine current index within the filtered list
  const currentFilterIndex = questionsToShow.indexOf(currentQuestionIndex);

  const handleQuestionClick = (index: number) => {
    setCurrentQuestionIndex(index);
    setViewMode('DETAIL');
    // If clicking from grid, we momentarily reset filter to ALL to allow full navigation?
    // Or we keep current filter?
    // Usually grid shows all. Let's set filter to ALL if picking freely.
    setReviewFilter('ALL');
  };

  const handleReviewWrong = () => {
    const firstWrong = exam.questions.findIndex((q, idx) => userAnswers[idx] !== q.correctAnswer);
    if (firstWrong !== -1) {
      setCurrentQuestionIndex(firstWrong);
      setReviewFilter('WRONG');
      setViewMode('DETAIL');
    }
  };

  const handleNext = () => {
    if (currentFilterIndex < questionsToShow.length - 1) {
      setCurrentQuestionIndex(questionsToShow[currentFilterIndex + 1]);
      detailScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrev = () => {
    if (currentFilterIndex > 0) {
      setCurrentQuestionIndex(questionsToShow[currentFilterIndex - 1]);
      detailScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // --- RENDERERS ---

  const renderOverview = () => (
    <div className="flex flex-col h-full bg-muted">
      <MobileImmersiveHeader
        title={exam.title}
        subtitle={t('dashboard.topik.mobile.review.mode', { defaultValue: 'Review Mode' })}
        eyebrow={t('nav.topik', { defaultValue: 'TOPIK' })}
        onBack={onBack}
        backLabel={t('common.back', { defaultValue: 'Back' })}
        status={
          <div className="rounded-2xl border border-border bg-card px-3 py-2 text-right shadow-sm">
            <div className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">
              {t('dashboard.topik.mobile.review.totalScore', { defaultValue: 'Total Score' })}
            </div>
            <div className="text-base font-black text-foreground">
              {stats.score}/{stats.totalScore}
            </div>
          </div>
        }
        className="sticky top-0 z-20"
      />

      <div className="flex-1 overflow-y-auto pb-mobile-safe">
        {/* Score Card */}
        <div className="p-6">
          <div className="bg-card rounded-3xl shadow-lg border border-border overflow-hidden relative p-8 text-center flex flex-col items-center">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 to-purple-500 dark:from-indigo-400/75 dark:to-purple-400/75"></div>

            <span className="text-xs font-bold tracking-widest text-muted-foreground uppercase mb-2">
              {t('dashboard.topik.mobile.review.totalScore', { defaultValue: 'Total Score' })}
            </span>
            <div className="flex items-baseline gap-2 mb-6">
              <span
                className={clsx(
                  'text-6xl font-black tracking-tighter',
                  stats.percentage >= 60
                    ? 'text-emerald-600 dark:text-emerald-300'
                    : 'text-muted-foreground'
                )}
              >
                {stats.score}
              </span>
              <span className="text-xl font-bold text-muted-foreground">/ {stats.totalScore}</span>
            </div>

            <div className="w-full grid grid-cols-2 gap-4">
              <div className="bg-emerald-50 dark:bg-emerald-500/14 rounded-2xl p-4 border border-emerald-100 dark:border-emerald-300/25 flex flex-col items-center">
                <div className="text-2xl font-black text-emerald-600 dark:text-emerald-300">
                  {stats.correctCount}
                </div>
                <div className="text-[10px] font-bold text-emerald-800/60 dark:text-emerald-200/80 uppercase mt-1">
                  {t('dashboard.topik.mobile.review.correct', { defaultValue: 'Correct' })}
                </div>
              </div>
              <div className="bg-red-50 dark:bg-red-500/14 rounded-2xl p-4 border border-red-100 dark:border-red-300/25 flex flex-col items-center">
                <div className="text-2xl font-black text-red-500 dark:text-red-300">
                  {stats.mistakeCount}
                </div>
                <div className="text-[10px] font-bold text-red-800/60 dark:text-red-200/80 uppercase mt-1">
                  {t('dashboard.topik.mobile.review.mistakes', { defaultValue: 'Mistakes' })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 mb-8 flex gap-3">
          <Button
            variant="ghost"
            size="auto"
            onClick={() => {
              setCurrentQuestionIndex(0);
              setViewMode('DETAIL');
            }}
            className="flex-1 bg-primary text-primary-foreground rounded-xl py-3.5 font-bold shadow-lg shadow-primary/20 active:scale-95 transition-all text-sm"
          >
            {t('dashboard.topik.mobile.review.reviewAll', { defaultValue: 'Review All' })}
          </Button>
          {/* Review Wrong Only */}
          <Button
            variant="ghost"
            size="auto"
            onClick={handleReviewWrong}
            disabled={stats.mistakeCount === 0}
            className="flex-1 bg-card border border-border text-muted-foreground rounded-xl py-3.5 font-bold active:scale-95 text-sm flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
          >
            {t('dashboard.topik.mobile.review.reviewMistakes', {
              count: stats.mistakeCount,
              defaultValue: 'Review Mistakes ({{count}})',
            })}
          </Button>
          {onReset && (
            <Button
              variant="ghost"
              size="auto"
              onClick={onReset}
              className="bg-muted text-muted-foreground rounded-xl p-3.5 flex items-center justify-center"
            >
              <RotateCcw className="w-5 h-5" />
            </Button>
          )}
        </div>

        {/* Question Grid */}
        <div className="px-6 pb-20">
          <h3 className="font-bold text-muted-foreground mb-4 flex items-center gap-2 text-sm">
            <Grid3x3 className="w-4 h-4" />
            {t('dashboard.topik.mobile.review.questionMap', { defaultValue: 'Question Map' })}
          </h3>
          <div className="grid grid-cols-5 gap-3">
            {exam.questions.map((q, idx) => {
              const isCorrect = userAnswers[idx] === q.correctAnswer;
              const isAnswered = userAnswers[idx] !== undefined;

              return (
                <Button
                  variant="ghost"
                  size="auto"
                  key={q.id}
                  onClick={() => handleQuestionClick(idx)}
                  className={clsx(
                    'aspect-square rounded-xl flex items-center justify-center font-bold text-sm transition-all border active:scale-95',
                    isCorrect
                      ? 'bg-emerald-100 dark:bg-emerald-500/16 text-emerald-700 dark:text-emerald-200 border-emerald-200 dark:border-emerald-300/30 shadow-sm shadow-emerald-500/10'
                      : isAnswered
                        ? 'bg-red-100 dark:bg-red-500/16 text-red-600 dark:text-red-200 border-red-200 dark:border-red-300/30 shadow-sm shadow-red-500/10'
                        : 'bg-muted text-muted-foreground border-border'
                  )}
                >
                  {q.number || idx + 1}
                </Button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );

  const renderDetail = () => {
    const currentQuestion = exam.questions[currentQuestionIndex];
    const userAnswer = userAnswers[currentQuestionIndex];
    const isCorrect = userAnswer === currentQuestion.correctAnswer;
    const localizedExplanation =
      language === 'en'
        ? currentQuestion.explanationEn || currentQuestion.explanation
        : language === 'vi'
          ? currentQuestion.explanationVi ||
            currentQuestion.explanationEn ||
            currentQuestion.explanation
          : language === 'mn'
            ? currentQuestion.explanationMn ||
              currentQuestion.explanationEn ||
              currentQuestion.explanation
            : currentQuestion.explanation ||
              currentQuestion.explanationEn ||
              currentQuestion.explanationVi ||
              currentQuestion.explanationMn;

    // Custom renderer for review mode options
    // We override the default renderer's option display slightly by passing props,
    // but MobileQuestionRenderer is mainly for taking the exam.
    // Actually, let's reuse MobileQuestionRenderer but wrap it with review overlay logic?
    // Or better, just recreate the card here for full control over "Correct/Wrong" styling which is specific to review.
    // Wait, MobileQuestionRenderer is quite complex (images, passages). Let's reuse it but maybe pass "reviewMode"?
    // It doesn't support review mode props yet.
    // Let's copy the visual structure but add the review logic.
    // Or simpler: We render the question using MobileQuestionRenderer but DISABLE interaction,
    // and overload the styling via CSS or just recreate the option list below it.

    // Actually, strict reuse is better for maintenance.
    // Let's modify MobileQuestionRenderer to accept `correctAnswer` and `showResult` prop in a future refactor.
    // For now, I will reimplement the Option List part specifically for Review Mode here,
    // but reuse the Question Content part? No, that component is monolithic.

    // Let's BUILD the review card here directly, as the HTML preview showed.
    // It's cleaner than hacking the exam renderer.

    const QuestionContent = () => {
      // Logic to determine if we show shared passage
      // In review mode, we should just show the passage if it exists for this question context.
      // Topik data has `passage` on the question itself for some, or we might need to look up shared passages.
      // But in the DTO, `passage` is populated on the question object if it's relevant.
      // If groupCount > 1, it might be shared.

      // For simplicity, we just use q.passage / q.contextBox just like the renderer.
      const q = currentQuestion;
      const questionImage = q.imageUrl || q.image;

      return (
        <div className="bg-card rounded-3xl shadow-sm border border-border overflow-hidden mb-6">
          {/* Question Text */}
          <div className="p-5 border-b border-border">
            <div className="flex items-start gap-3">
              <div className="font-bold text-lg text-foreground leading-snug break-keep whitespace-pre-wrap">
                <span className="inline-block mr-2 text-indigo-600 dark:text-indigo-300 min-w-[20px]">
                  {q.number}.
                </span>
                <span dangerouslySetInnerHTML={{ __html: sanitize(q.question) }} />
              </div>
            </div>

            {/* Optional Passage */}
            {q.passage && (
              <div
                className="mt-4 bg-muted rounded-xl p-5 text-muted-foreground leading-8 text-base whitespace-pre-wrap border border-border font-serif break-keep text-justify"
                dangerouslySetInnerHTML={{ __html: sanitize(q.passage) }}
              />
            )}

            {/* Image */}
            {(q.layout === 'IMAGE' || !!questionImage) && questionImage && (
              <div className="mt-4 bg-muted rounded-xl overflow-hidden border border-border relative aspect-[4/3] flex items-center justify-center">
                <img
                  src={questionImage}
                  alt={q.number ? String(q.number) : ''}
                  className="w-full h-full object-contain"
                />
              </div>
            )}

            {/* Context Box */}
            {q.contextBox && (
              <div className="mt-4 bg-muted border border-border rounded-xl p-5 font-serif text-base leading-8 text-muted-foreground break-keep text-justify">
                <div
                  className="whitespace-pre-wrap"
                  dangerouslySetInnerHTML={{ __html: sanitize(q.contextBox) }}
                />
              </div>
            )}
          </div>

          {/* Options */}
          <div className="p-4 space-y-3 bg-muted/50">
            {/* If image options */}
            {q.optionImages && q.optionImages.length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {q.optionImages.map((imgUrl, idx) => {
                  const isSelected = userAnswer === idx;
                  const isCorrectOpt = idx === q.correctAnswer;

                  let borderClass = 'border-border';
                  let ringClass = '';
                  let badge = null;

                  if (isCorrectOpt) {
                    borderClass =
                      'border-emerald-500 dark:border-emerald-300 bg-emerald-50 dark:bg-emerald-500/12';
                    ringClass = 'ring-2 ring-emerald-500 dark:ring-emerald-300 ring-offset-2';
                    badge = (
                      <span className="absolute top-2 right-2 bg-emerald-500 dark:bg-emerald-400/80 text-white text-[10px] px-1.5 py-0.5 rounded font-bold shadow-sm z-10">
                        {t('dashboard.topik.mobile.review.badgeAnswer', { defaultValue: 'ANS' })}
                      </span>
                    );
                  } else if (isSelected) {
                    borderClass = 'border-red-500 dark:border-red-300 bg-red-50 dark:bg-red-500/12';
                    ringClass = 'ring-2 ring-red-500 dark:ring-red-300 ring-offset-2';
                    badge = (
                      <span className="absolute top-2 right-2 bg-red-500 dark:bg-red-400/80 text-white text-[10px] px-1.5 py-0.5 rounded font-bold shadow-sm z-10">
                        {t('dashboard.topik.mobile.review.badgeYou', { defaultValue: 'YOU' })}
                      </span>
                    );
                  }

                  return (
                    <div
                      key={idx}
                      className={clsx(
                        'relative rounded-xl border overflow-hidden aspect-[4/3] group bg-card',
                        borderClass,
                        ringClass
                      )}
                    >
                      {badge}
                      <img
                        src={imgUrl}
                        alt={String(idx + 1)}
                        className="w-full h-full object-contain"
                      />
                      <div
                        className={clsx(
                          'absolute top-2 left-2 w-6 h-6 rounded-full font-bold flex items-center justify-center text-xs shadow-sm border',
                          isCorrectOpt
                            ? 'bg-emerald-500 dark:bg-emerald-400/80 text-white border-emerald-500 dark:border-emerald-300'
                            : isSelected
                              ? 'bg-red-500 dark:bg-red-400/80 text-white border-red-500 dark:border-red-300'
                              : 'bg-card/90 text-muted-foreground border-border'
                        )}
                      >
                        {idx + 1}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              q.options.map((opt, idx) => {
                const isSelected = userAnswer === idx;
                const isCorrectOpt = idx === q.correctAnswer;

                let stateClass = 'bg-card border-border text-muted-foreground opacity-80';
                let numClass = 'bg-muted text-muted-foreground border-border';

                if (isCorrectOpt) {
                  stateClass =
                    'bg-emerald-50 dark:bg-emerald-500/12 border-emerald-500 dark:border-emerald-300 text-emerald-900 dark:text-emerald-100 ring-1 ring-emerald-500 dark:ring-emerald-300 z-10 opacity-100';
                  numClass =
                    'bg-emerald-500 dark:bg-emerald-400/80 text-white border-emerald-500 dark:border-emerald-300';
                } else if (isSelected) {
                  stateClass =
                    'bg-red-50 dark:bg-red-500/12 border-red-500 dark:border-red-300 text-red-900 dark:text-red-100 ring-1 ring-red-500 dark:ring-red-300 z-10 opacity-100';
                  numClass =
                    'bg-red-500 dark:bg-red-400/80 text-white border-red-500 dark:border-red-300';
                }

                return (
                  <div
                    key={idx}
                    className={clsx(
                      'w-full p-4 rounded-xl border text-left relative overflow-hidden transition-all flex items-start gap-3',
                      stateClass
                    )}
                  >
                    <div
                      className={clsx(
                        'w-6 h-6 mt-0.5 rounded-full flex items-center justify-center text-xs font-bold shrink-0 border',
                        numClass
                      )}
                    >
                      {idx + 1}
                    </div>
                    <span className="text-sm font-medium flex-1 leading-relaxed">{opt}</span>
                    {isCorrectOpt && (
                      <span className="text-[10px] font-bold bg-emerald-100 dark:bg-emerald-500/18 text-emerald-700 dark:text-emerald-200 px-2 py-0.5 rounded ml-auto shrink-0">
                        {t('dashboard.topik.mobile.review.badgeAnswer', { defaultValue: 'ANS' })}
                      </span>
                    )}
                    {isSelected && !isCorrectOpt && (
                      <span className="text-[10px] font-bold bg-red-100 dark:bg-red-500/18 text-red-700 dark:text-red-200 px-2 py-0.5 rounded ml-auto shrink-0">
                        {t('dashboard.topik.mobile.review.badgeYou', { defaultValue: 'YOU' })}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      );
    };

    return (
      <div className="flex flex-col h-full bg-muted relative">
        <MobileImmersiveHeader
          title={t('dashboard.topik.mobile.review.detailTitle', {
            defaultValue: 'Question Review',
          })}
          subtitle={
            reviewFilter === 'WRONG'
              ? t('dashboard.topik.mobile.review.mistakeProgress', {
                  current: currentFilterIndex + 1,
                  total: questionsToShow.length,
                  defaultValue: 'Mistake {{current}}/{{total}}',
                })
              : t('dashboard.topik.mobile.review.questionProgress', {
                  current: currentQuestionIndex + 1,
                  total: exam.questions.length,
                  defaultValue: 'Question {{current}} of {{total}}',
                })
          }
          eyebrow={t('nav.topik', { defaultValue: 'TOPIK' })}
          onBack={() => setViewMode('OVERVIEW')}
          backLabel={t('dashboard.topik.mobile.review.back', { defaultValue: 'Back' })}
          status={
            <span className="rounded-2xl border border-border bg-card px-3 py-2 text-xs font-black text-foreground shadow-sm">
              Q{exam.questions[currentQuestionIndex].number || currentQuestionIndex + 1}
            </span>
          }
          actions={
            <Button
              variant="ghost"
              size="auto"
              onClick={() => setViewMode('OVERVIEW')}
              className="grid h-11 w-11 place-items-center rounded-2xl border border-border bg-card shadow-sm active:scale-95"
            >
              <List className="w-4 h-4 text-foreground" />
            </Button>
          }
          className="sticky top-0 z-20"
        />

        <div className="flex-1 overflow-y-auto pb-mobile-safe" ref={detailScrollRef}>
          <div className="p-4 pb-32 max-w-lg mx-auto w-full">
            <ReviewResultBanner isCorrect={isCorrect} t={t} />

            <QuestionContent />

            {/* Explanation */}
            {localizedExplanation && (
              <div className="bg-indigo-50/50 dark:bg-indigo-500/12 rounded-3xl p-6 border border-indigo-100 dark:border-indigo-300/20 mb-8">
                <h3 className="font-bold text-indigo-900 dark:text-indigo-200 mb-2 flex items-center gap-2 text-sm">
                  <span className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-500/18 flex items-center justify-center">
                    💡
                  </span>
                  {t('dashboard.topik.mobile.review.explanation', { defaultValue: 'Explanation' })}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed font-serif whitespace-pre-wrap">
                  {localizedExplanation}
                </p>
              </div>
            )}

            {/* AI Analysis Section */}
            <div className="mt-6">
              {!aiAnalysis && (
                <Button
                  type="button"
                  size="auto"
                  onClick={() => handleAIAnalysis(currentQuestion)}
                  loading={aiLoading}
                  loadingText={t('dashboard.topik.mobile.review.aiThinking', {
                    defaultValue: 'Thinking...',
                  })}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 dark:from-indigo-400/75 dark:to-purple-400/75 text-white rounded-xl shadow-md dark:shadow-indigo-950/25 active:scale-[0.98] transition-transform font-bold"
                >
                  <Sparkles className="w-5 h-5" />
                  {t('dashboard.topik.mobile.review.aiTitle', { defaultValue: 'AI Analysis' })}
                </Button>
              )}

              {aiError && (
                <div className="mt-3 p-4 bg-red-50 dark:bg-red-500/12 border border-red-200 dark:border-red-300/25 rounded-xl text-red-700 dark:text-red-200 text-sm flex items-center gap-2">
                  <X className="w-4 h-4" /> {aiError}
                </div>
              )}

              {aiAnalysis && (
                <div className="mt-4 p-5 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-500/12 dark:to-purple-500/12 border border-indigo-100 dark:border-indigo-300/20 rounded-2xl shadow-sm relative">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-300" />
                      <span className="font-bold text-indigo-700 dark:text-indigo-200">
                        {t('dashboard.topik.mobile.review.aiTitle', {
                          defaultValue: 'AI Analysis',
                        })}
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="auto"
                      onClick={() => handleSaveToNotebook(currentQuestion)}
                      disabled={isSaving || isSaved}
                      loading={isSaving}
                      loadingText={t('dashboard.topik.mobile.review.saving', {
                        defaultValue: 'Saving...',
                      })}
                      loadingIconClassName="w-3.5 h-3.5"
                      className={clsx(
                        'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border',
                        isSaved
                          ? 'bg-emerald-100 dark:bg-emerald-500/18 text-emerald-700 dark:text-emerald-200 border-emerald-200 dark:border-emerald-300/25'
                          : 'bg-card text-indigo-600 dark:text-indigo-200 border-indigo-200 dark:border-indigo-300/25'
                      )}
                    >
                      {isSaved ? (
                        <BookmarkCheck className="w-3.5 h-3.5" />
                      ) : (
                        <Bookmark className="w-3.5 h-3.5" />
                      )}
                      {isSaved
                        ? t('dashboard.topik.mobile.review.saved', { defaultValue: 'Saved' })
                        : t('dashboard.topik.mobile.review.save', { defaultValue: 'Save' })}
                    </Button>
                  </div>

                  {/* Translation */}
                  {aiAnalysis.translation && (
                    <div className="mb-4">
                      <div className="text-xs font-bold text-indigo-400 dark:text-indigo-200 uppercase tracking-wider mb-1">
                        {t('dashboard.topik.mobile.review.translation', {
                          defaultValue: 'Translation',
                        })}
                      </div>
                      <div className="text-muted-foreground leading-relaxed bg-card/60 p-3 rounded-xl text-sm">
                        {aiAnalysis.translation}
                      </div>
                    </div>
                  )}

                  {/* Key Point */}
                  {aiAnalysis.keyPoint && (
                    <div className="mb-4">
                      <div className="text-xs font-bold text-indigo-400 dark:text-indigo-200 uppercase tracking-wider mb-1">
                        {t('dashboard.topik.mobile.review.keyPoint', { defaultValue: 'Key Point' })}
                      </div>
                      <div className="inline-block bg-indigo-100 dark:bg-indigo-500/18 text-indigo-800 dark:text-indigo-200 px-3 py-1.5 rounded-lg text-sm font-bold">
                        {aiAnalysis.keyPoint}
                      </div>
                    </div>
                  )}

                  {/* Analysis */}
                  {aiAnalysis.analysis && (
                    <div className="mb-4">
                      <div className="text-xs font-bold text-indigo-400 dark:text-indigo-200 uppercase tracking-wider mb-1">
                        {t('dashboard.topik.mobile.review.explanation', {
                          defaultValue: 'Explanation',
                        })}
                      </div>
                      <div className="text-muted-foreground leading-relaxed bg-card/60 p-3 rounded-xl text-sm whitespace-pre-wrap">
                        {aiAnalysis.analysis}
                      </div>
                    </div>
                  )}

                  {Object.entries(aiAnalysis.wrongOptions || {}).length > 0 && (
                    <div>
                      <div className="text-xs font-bold text-indigo-400 dark:text-indigo-200 uppercase tracking-wider mb-1">
                        {t('dashboard.topik.mobile.review.wrongOptions', {
                          defaultValue: 'Wrong Options',
                        })}
                      </div>
                      <div className="space-y-2">
                        {Object.entries(aiAnalysis.wrongOptions || {}).map(([key, value]) => (
                          <div
                            key={key}
                            className="text-muted-foreground bg-card/60 p-3 rounded-xl text-sm"
                          >
                            <span className="font-bold">
                              {t('common.option', { defaultValue: 'Option' })} {key}:
                            </span>{' '}
                            <span>{value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Nav */}
        <div className="bg-card border-t border-border px-4 py-3 flex gap-3 shrink-0 absolute bottom-0 left-0 right-0 z-30 pb-mobile-safe shadow-nav-up">
          <Button
            variant="ghost"
            size="auto"
            onClick={handlePrev}
            disabled={currentFilterIndex === 0}
            className="flex-1 py-3 rounded-xl bg-muted text-muted-foreground font-bold disabled:opacity-30 active:bg-muted transition-colors flex items-center justify-center gap-2 text-sm"
          >
            <ChevronLeft className="w-4 h-4" />
            {t('dashboard.topik.mobile.review.prev', { defaultValue: 'Prev' })}
          </Button>

          <Button
            variant="ghost"
            size="auto"
            onClick={handleNext}
            disabled={currentFilterIndex === questionsToShow.length - 1}
            className="flex-[2] py-3 rounded-xl bg-primary text-primary-foreground font-bold disabled:opacity-30 shadow-lg shadow-primary/25 dark:shadow-primary/15 active:scale-[0.98] transition-transform flex items-center justify-center gap-2 text-sm"
          >
            {t('dashboard.topik.mobile.review.next', { defaultValue: 'Next' })}
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        <ReviewSaveToast show={showSaveToast} saveError={saveError} t={t} />
      </div>
    );
  };

  return viewMode === 'OVERVIEW' ? renderOverview() : renderDetail();
};
