import React, { useEffect, useState } from 'react';
import { X, Sparkles, Trophy, AlertCircle } from 'lucide-react';
import { GrammarPointData } from '../../types';
import { useAction, useMutation } from 'convex/react';
import type { Id } from '../../../convex/_generated/dataModel';
import { aRef, mRef } from '../../utils/convexRefs';
import { useTranslation } from 'react-i18next';
import { Button } from '../ui';
import { Input } from '../ui';
import { Tooltip, TooltipContent, TooltipPortal, TooltipTrigger } from '../ui';

interface GrammarDetailSheetProps {
  grammar: GrammarPointData | null;
  onClose: () => void;
  onProficiencyUpdate?: (
    grammarId: string,
    proficiency: number,
    status: GrammarPointData['status']
  ) => void;
}

const GrammarDetailSheet: React.FC<GrammarDetailSheetProps> = ({
  grammar,
  onClose,
  onProficiencyUpdate,
}) => {
  const [practiceSentence, setPracticeSentence] = useState('');
  const [aiFeedback, setAiFeedback] = useState<{
    isCorrect: boolean;
    feedback: string;
    correctedSentence?: string;
    progress?: { proficiency: number; status: string };
  } | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const { t, i18n } = useTranslation();

  const checkAction = useAction(
    aRef<
      { sentence: string; context: string; language?: string },
      { success?: boolean; data?: { nuance?: unknown } }
    >('ai:analyzeSentence')
  );
  const updateStatus = useMutation(
    mRef<
      {
        grammarId: Id<'grammar_points'>;
        status?: GrammarPointData['status'];
        proficiency?: number;
        increment?: number;
      },
      { status: string; proficiency: number }
    >('grammars:updateStatus')
  );

  // Reset state when grammar changes
  useEffect(() => {
    setPracticeSentence('');
    setAiFeedback(null);
    setShowConfetti(false);
  }, [grammar?.id]);

  const handleCheck = async () => {
    if (!grammar || !practiceSentence.trim()) return;

    setIsChecking(true);
    setAiFeedback(null);
    try {
      // 1. Check with AI
      const response = await checkAction({
        sentence: practiceSentence.trim(),
        context: grammar.title,
        language: i18n.language,
      });

      const res = response as { success?: boolean; data?: { nuance?: unknown } } | null;
      if (res?.success && res.data) {
        await handleCheckSuccess(res.data);
      }
    } catch (error) {
      console.error('Grammar check failed:', error);
      setAiFeedback({
        isCorrect: false,
        feedback: t('grammarDetail.checkFailed', { defaultValue: 'Check failed. Please try again.' }),
      });
    } finally {
      setIsChecking(false);
    }
  };

  const handleCheckSuccess = async (data: { nuance?: unknown }) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _isCorrect = true;

    let feedback =
      typeof data.nuance === 'string'
        ? data.nuance
        : t('grammarDetail.analysisDone', { defaultValue: 'Analysis completed' });
    const isFeedbackNegative =
      feedback.toLowerCase().startsWith('incorrect') ||
      feedback.includes('\u9519\u8BEF') ||
      feedback.includes('Incorrect');

    // Override isCorrect based on feedback content if strict check found errors
    const finalIsCorrect = !isFeedbackNegative;

    const correctedSentence = undefined;

    let progress: { proficiency: number; status: string } | undefined = undefined;

    // 2. If correct, update progress via mutation
    if (finalIsCorrect && grammar) {
      // Use `updateStatus` with increment
      const updateRes = (await updateStatus({
        grammarId: grammar.id as unknown as Id<'grammar_points'>,
        increment: 50,
      })) as { status: string; proficiency: number };
      progress = updateRes;

      if (updateRes.proficiency >= 100) {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 2000);
      }

      // Notify parent to refresh local view if needed (though parent might use query)
      if (onProficiencyUpdate) {
        const normalizedStatus: GrammarPointData['status'] =
          updateRes.status === 'NEW' ||
          updateRes.status === 'LEARNING' ||
          updateRes.status === 'MASTERED'
            ? (updateRes.status as GrammarPointData['status'])
            : 'LEARNING';
        onProficiencyUpdate(grammar.id, updateRes.proficiency, normalizedStatus);
      }
    }

    setAiFeedback({
      isCorrect: finalIsCorrect,
      feedback,
      correctedSentence,
      progress,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleCheck();
    }
  };

  // Get rules object (support both old and new field names)
  const rulesObject = (grammar?.conjugationRules || grammar?.construction || {}) as Record<
    string,
    unknown
  >;

  if (!grammar) {
    return (
      <aside className="w-96 bg-card border-2 border-foreground rounded-xl shadow-[4px_4px_0px_0px_#0f172a] flex flex-col overflow-hidden shrink-0 z-30">
        <div className="flex-1 flex items-center justify-center text-muted-foreground font-bold p-6">
          <div className="text-center">
            <Sparkles className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>
              {t('grammarDetail.selectPrompt', {
                defaultValue: 'Select a grammar point to view details',
              })}
            </p>
          </div>
        </div>
      </aside>
    );
  }

  const proficiency = aiFeedback?.progress?.proficiency ?? grammar.proficiency ?? 0;
  const status = aiFeedback?.progress?.status ?? grammar.status ?? 'NEW';

  return (
    <aside className="w-96 bg-card border-2 border-foreground rounded-xl shadow-[4px_4px_0px_0px_#0f172a] flex flex-col overflow-hidden shrink-0 z-30 relative">
      <Confetti show={showConfetti} />

      <DetailHeader
        grammar={grammar}
        proficiency={proficiency}
        status={status}
        onStatusToggle={() => {
          const newStatus = status === 'MASTERED' ? 'LEARNING' : 'MASTERED';
          updateStatus({
            grammarId: grammar.id as unknown as Id<'grammar_points'>,
            status: newStatus,
          }).then(res => {
            if (onProficiencyUpdate) {
              onProficiencyUpdate(
                grammar.id,
                res.proficiency,
                res.status as GrammarPointData['status']
              );
            }
            if (res.status === 'MASTERED') {
              setShowConfetti(true);
              setTimeout(() => setShowConfetti(false), 2000);
            }
          });
        }}
        onClose={onClose}
      />

      {/* AI Practice Section - Moved to Top */}
      <div className="p-4 border-b-2 border-foreground bg-muted shrink-0">
        <label className="flex items-center gap-2 text-[10px] font-black text-foreground mb-2">
          <Sparkles className="w-3 h-3" />
          {t('grammarDetail.aiPractice', { defaultValue: 'AI Practice' })}
        </label>
        <div className="flex gap-2">
          <Input
            type="text"
            value={practiceSentence}
            onChange={e => setPracticeSentence(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('grammarDetail.practicePlaceholder', {
              defaultValue: 'Make a sentence with {{title}}...',
              title: grammar.title,
            })}
            className="flex-1 px-3 py-2 border-2 border-foreground rounded-lg text-sm font-bold bg-card focus-visible:ring-0 focus-visible:ring-offset-0"
          />
          <Button
            type="button"
            size="auto"
            onClick={handleCheck}
            disabled={isChecking || !practiceSentence.trim()}
            loading={isChecking}
            loadingText={t('grammarDetail.checking', { defaultValue: 'Checking...' })}
            loadingIconClassName="w-3 h-3"
            className="px-4 py-2 bg-primary text-white font-bold rounded-lg border-2 border-foreground text-sm hover:bg-card hover:text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t('grammarDetail.check', { defaultValue: 'Check' })}
          </Button>
        </div>

        {/* AI Feedback */}
        {aiFeedback && (
          <div
            className={`mt-3 p-3 border-2 border-foreground rounded-lg ${
              aiFeedback.isCorrect ? 'bg-green-50' : 'bg-red-50'
            }`}
          >
            <div className="flex items-start gap-2">
              {aiFeedback.isCorrect ? (
                <Trophy className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <p
                  className={`text-sm font-bold ${aiFeedback.isCorrect ? 'text-green-700' : 'text-red-700'}`}
                >
                  {aiFeedback.isCorrect
                    ? t('grammarDetail.feedback.correct', { defaultValue: '✓ Great job!' })
                    : t('grammarDetail.feedback.incorrect', { defaultValue: '✗ Needs improvement' })}
                </p>
                <p className="text-xs text-muted-foreground mt-1">{aiFeedback.feedback}</p>
                {!aiFeedback.isCorrect && aiFeedback.correctedSentence && (
                  <div className="mt-2 p-2 bg-card rounded border border-border">
                    <span className="text-[10px] font-bold text-muted-foreground block mb-1">
                      {t('grammarDetail.suggested', { defaultValue: 'Suggested sentence:' })}
                    </span>
                    <span className="text-sm font-bold text-muted-foreground">
                      {aiFeedback.correctedSentence}
                    </span>
                  </div>
                )}
                {aiFeedback.progress && (
                  <div className="mt-2 text-[10px] text-muted-foreground">
                    {t('grammarDetail.proficiency', { defaultValue: 'Proficiency' })}:{' '}
                    <span className="font-bold text-muted-foreground">
                      {aiFeedback.progress.proficiency}%
                    </span>
                    {aiFeedback.progress.status === 'MASTERED' && (
                      <span className="ml-2 text-green-600 font-bold">
                        🎉 {t('grammarDetail.mastered', { defaultValue: 'Mastered!' })}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Content - Scrollable */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        <div className="text-sm text-muted-foreground font-bold leading-relaxed">
          <span className="bg-yellow-200 px-1 border border-yellow-300 rounded">
            {grammar.title}
          </span>
          <span className="ml-2">{grammar.summary}</span>
        </div>

        <div>
          <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-2">
            📖 {t('grammarDetail.explanation', { defaultValue: 'Detailed explanation' })}
          </h4>
          <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
            {grammar.explanation}
          </div>
        </div>

        {Object.keys(rulesObject).length > 0 && <RulesSection rules={rulesObject} />}
        <ExamplesSection examples={grammar.examples} />
      </div>

      {/* CSS for confetti animation */}
      <style>{`
                @keyframes confetti-fall {
                    0% { transform: translateY(0) rotate(0deg); opacity: 1; }
                    100% { transform: translateY(400px) rotate(720deg); opacity: 0; }
                }
            `}</style>
    </aside>
  );
};

export default GrammarDetailSheet;

// --- Sub-components to reduce complexity ---

const Confetti: React.FC<{ show: boolean }> = ({ show }) => {
  /* eslint-disable react-hooks/purity */
  const items = React.useMemo(
    () =>
      Array.from({ length: 20 }).map((_, i) => ({
        id: i,
        left: `${Math.random() * 100}%`,
        delay: `${Math.random() * 0.5}s`,
        char: ['🎉', '✨', '⭐', '💫', '🌟'][i % 5],
      })),
    []
  );

  if (!show) return null;
  return (
    <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden">
      {items.map(item => (
        <div
          key={`confetti-${item.id}`}
          className="absolute animate-bounce"
          style={{
            left: item.left,
            top: `-20px`,
            animation: `confetti-fall 1.5s ease-out forwards`,
            animationDelay: item.delay,
          }}
        >
          <span className="text-2xl">{item.char}</span>
        </div>
      ))}
    </div>
  );
};

interface DetailHeaderProps {
  grammar: GrammarPointData;
  proficiency: number;
  status: string;
  onStatusToggle: () => void;
  onClose: () => void;
}

const DetailHeader: React.FC<DetailHeaderProps> = ({
  grammar,
  proficiency,
  status,
  onStatusToggle,
  onClose,
}) => {
  const { t } = useTranslation();
  const getTypeStyles = () => {
    switch (grammar?.type) {
      case 'ENDING':
        return { bg: 'bg-blue-50', label: 'text-blue-600', border: 'border-blue-200' };
      case 'PARTICLE':
        return { bg: 'bg-purple-50', label: 'text-purple-600', border: 'border-purple-200' };
      case 'CONNECTIVE':
        return { bg: 'bg-amber-50', label: 'text-amber-600', border: 'border-amber-200' };
      default:
        return { bg: 'bg-muted', label: 'text-muted-foreground', border: 'border-border' };
    }
  };

  const typeStyles = getTypeStyles();

  // Helper for progress bar color
  const getProgressColor = () => {
    if (status === 'MASTERED') return 'bg-green-500';
    if (status === 'LEARNING') return 'bg-amber-500';
    return 'bg-muted';
  };

  return (
    <div
      className={`p-4 border-b-2 border-foreground ${typeStyles.bg} flex justify-between items-start`}
    >
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span
            className={`text-[10px] font-black ${typeStyles.label} uppercase px-2 py-0.5 border-2 border-current rounded`}
          >
            {grammar.type}
          </span>
          {grammar.level && (
            <span className="text-[10px] font-bold text-muted-foreground">{grammar.level}</span>
          )}
        </div>
        <h2 className="text-2xl font-black text-foreground">{grammar.title}</h2>

        <div className="mt-2 flex items-center gap-2">
          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden border border-border">
            <div
              className={`h-full transition-all duration-500 ${getProgressColor()}`}
              style={{ width: `${proficiency}%` }}
            />
          </div>
          <span className="text-xs font-bold text-muted-foreground">{proficiency}%</span>
          {status === 'MASTERED' && <Trophy className="w-4 h-4 text-green-600" />}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="auto"
              onClick={onStatusToggle}
              aria-label={
                status === 'MASTERED'
                  ? t('grammarDetail.mastered', { defaultValue: 'Mastered' })
                  : t('grammarDetail.markMastered', { defaultValue: 'Mark as mastered' })
              }
              className={`p-1.5 rounded-lg border-2 ${
                status === 'MASTERED'
                  ? 'bg-green-100 border-green-500 text-green-700'
                  : 'bg-card border-foreground text-muted-foreground hover:bg-muted'
              } transition-colors`}
            >
              <Trophy className={`w-4 h-4 ${status === 'MASTERED' ? 'fill-current' : ''}`} />
            </Button>
          </TooltipTrigger>
          <TooltipPortal>
            <TooltipContent side="top">
              {status === 'MASTERED'
                ? t('grammarDetail.mastered', { defaultValue: 'Mastered' })
                : t('grammarDetail.markMastered', { defaultValue: 'Mark as mastered' })}
            </TooltipContent>
          </TooltipPortal>
        </Tooltip>
        <Button
          type="button"
          variant="outline"
          size="auto"
          onClick={onClose}
          className="w-6 h-6 rounded border-2 border-foreground bg-card flex items-center justify-center hover:bg-red-100 text-foreground transition-colors ml-2"
        >
          <X className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
};

const RulesSection: React.FC<{ rules: Record<string, unknown> }> = ({ rules }) => {
  const { t } = useTranslation();
  return (
    <div>
      <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-2">
        🧩 {t('grammarDetail.rules', { defaultValue: 'Conjugation rules' })}
      </h4>
      <div className="flex items-center gap-1 flex-wrap">
        {Object.entries(rules).map(([key, value], i) => (
          <React.Fragment key={key}>
            {i > 0 && <span className="font-black text-lg mx-1 text-muted-foreground">/</span>}
            <div className="px-3 py-1.5 bg-card border-2 border-foreground rounded font-bold shadow-[2px_2px_0_0_#000] text-sm">
              {key}
            </div>
            <span className="font-black text-lg text-muted-foreground">→</span>
            <div className="px-3 py-1.5 bg-blue-100 text-blue-700 border-2 border-foreground rounded font-bold shadow-[2px_2px_0_0_#000] text-sm">
              {String(value)}
            </div>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

const ExamplesSection: React.FC<{ examples?: unknown[] }> = ({ examples }) => {
  const { t } = useTranslation();
  const list = Array.isArray(examples) ? examples : [];
  return (
    <div>
      <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-2">
        💬 {t('grammarDetail.examples', { defaultValue: 'Usage examples' })}
      </h4>
      <div className="space-y-2">
        {list.map((ex, i) => {
          if (!ex || typeof ex !== 'object') return null;
          const r = ex as Record<string, unknown>;
          const kr = typeof r.kr === 'string' ? r.kr : '';
          const cn = typeof r.cn === 'string' ? r.cn : '';
          if (!kr && !cn) return null;
          return (
            <div
              key={kr || i}
              className="p-2.5 bg-muted border-2 border-foreground rounded-lg relative group cursor-pointer hover:bg-card transition-colors"
            >
              <div className="font-bold text-foreground text-sm">
                {kr.split(/(?=\d+\.)/).map((line, idx) => (
                  <div key={`kr-${i}-${idx}`}>{line.trim()}</div>
                ))}
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5">
                {cn.split(/(?=\d+\.)/).map((line, idx) => (
                  <div key={`cn-${i}-${idx}`}>{line.trim()}</div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
