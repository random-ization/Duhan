/**
 * WritingEvaluationReport.tsx
 *
 * Displays AI evaluation results for a completed TOPIK II writing session.
 *
 * States:
 *  EVALUATING  → animated "AI grading…" skeleton
 *  EVALUATED   → full report with scores, dimensions, diff view, and feedback
 */

import React, { useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { Award, BookOpen, CheckCircle2, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { api } from '../../../convex/_generated/api';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WritingEvaluationReportProps {
    sessionId: string;
    /** Original answers keyed by question number (string) */
    originalAnswers?: Record<string, string>;
    onBack?: () => void;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Animated skeleton while EVALUATING */
interface EvaluatingScreenProps {
    onRetry?: () => void;
    retrying?: boolean;
    retryError?: string | null;
}

const EvaluatingScreen: React.FC<EvaluatingScreenProps> = ({
    onRetry,
    retrying = false,
    retryError = null,
}) => {
    const { t } = useTranslation();
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8">
            {/* Orbiting glow animation */}
            <div className="relative w-28 h-28">
                <div className="absolute inset-0 rounded-full border-4 border-primary/20 animate-ping" />
                <div className="absolute inset-2 rounded-full border-4 border-primary/40 animate-ping [animation-delay:0.3s]" />
                <div className="absolute inset-4 rounded-full bg-primary/10 flex items-center justify-center">
                    <Sparkles size={36} className="text-primary animate-pulse" />
                </div>
            </div>

            <div className="text-center space-y-2">
                <h2 className="text-2xl font-black text-foreground">{t('topikWriting.report.evaluatingTitle', { defaultValue: 'AI is evaluating...' })}</h2>
                <p className="text-muted-foreground font-medium text-sm max-w-xs">
                    {t('topikWriting.report.evaluatingDesc', { defaultValue: 'Analyzing based on official TOPIK grading criteria. Usually takes 30-60 seconds.' })}
                </p>
            </div>

            {/* Skeleton bars */}
            <div className="w-full max-w-lg space-y-3 px-4">
                {[
                    t('topikWriting.report.dimTask', { defaultValue: 'Task Accomplishment' }),
                    t('topikWriting.report.dimStructure', { defaultValue: 'Development & Structure' }),
                    t('topikWriting.report.dimLanguage', { defaultValue: 'Language Use' }),
                    t('topikWriting.report.dimWongoji', { defaultValue: 'Wongoji Formatting' })
                ].map((label, i) => (
                    <div key={label} className="space-y-1">
                        <div className="text-xs font-bold text-muted-foreground">{label}</div>
                        <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                            <div
                                className="h-full bg-primary/20 rounded-full animate-pulse"
                                style={{
                                    width: `${60 + i * 8}%`,
                                    animationDelay: `${i * 0.2}s`,
                                }}
                            />
                        </div>
                    </div>
                ))}
            </div>

            {onRetry && (
                <div className="flex flex-col items-center gap-3">
                    <button
                        type="button"
                        onClick={onRetry}
                        disabled={retrying}
                        className="px-4 py-2 rounded-xl border-2 border-border font-bold text-sm text-foreground hover:bg-muted transition disabled:opacity-60"
                    >
                        {retrying
                            ? t('topikWriting.report.retriggering', { defaultValue: 'Retrying...' })
                            : t('topikWriting.report.retrigger', { defaultValue: 'Retry Evaluation' })}
                    </button>
                    {retryError && (
                        <p className="text-xs text-destructive font-medium text-center">{retryError}</p>
                    )}
                </div>
            )}
        </div>
    );
};

/** Dimension score bar */
interface DimensionBarProps {
    label: string;
    value: number;
    color: string;
}

const DimensionBar: React.FC<DimensionBarProps> = ({ label, value, color }) => (
    <div className="space-y-1.5">
        <div className="flex justify-between items-center">
            <span className="text-sm font-bold text-foreground">{label}</span>
            <span className="text-sm font-black text-foreground">{value}</span>
        </div>
        <div className="h-2.5 bg-muted rounded-full overflow-hidden">
            <div
                className={cn('h-full rounded-full transition-all duration-700', color)}
                style={{ width: `${Math.min(100, value)}%` }}
            />
        </div>
    </div>
);

/** Score ring — simple CSS-based circular score display */
interface ScoreRingProps {
    score: number;
    maxScore: number;
    label: string;
}

const ScoreRing: React.FC<ScoreRingProps> = ({ score, maxScore, label }) => {
    const pct = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
    const color =
        pct >= 80 ? 'text-emerald-500' : pct >= 60 ? 'text-amber-500' : 'text-rose-500';

    const { t } = useTranslation();
    return (
        <div className="flex flex-col items-center gap-1.5">
            <div
                className={cn(
                    'relative w-20 h-20 rounded-full border-4 flex items-center justify-center',
                    pct >= 80
                        ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20'
                        : pct >= 60
                            ? 'border-amber-400 bg-amber-50 dark:bg-amber-900/20'
                            : 'border-rose-400 bg-rose-50 dark:bg-rose-900/20',
                )}
            >
                <span className={cn('text-xl font-black', color)}>{score}</span>
            </div>
            <span className="text-[11px] font-bold text-muted-foreground text-center">{label}</span>
            <span className="text-[10px] text-muted-foreground">{t('topikWriting.report.maxScore', { score: maxScore, defaultValue: `Max ${maxScore}` })}</span>
        </div>
    );
};

/** Collapsible per-question evaluation card */
interface QuestionCardProps {
    evaluation: {
        _id: string;
        questionNumber: number;
        score: number;
        dimensions: {
            taskAccomplishment: number;
            developmentStructure: number;
            languageUse: number;
            wongojiRules?: number;
        };
        feedbackText: string;
        correctedText?: string;
    };
    originalAnswer?: string;
    questionMaxScore: number;
    defaultOpen?: boolean;
}

const QuestionCard: React.FC<QuestionCardProps> = ({
    evaluation,
    originalAnswer,
    questionMaxScore,
    defaultOpen = false,
}) => {
    const { t } = useTranslation();
    const [isOpen, setIsOpen] = useState(defaultOpen);

    const DIMENSION_CONFIG = [
        {
            key: 'taskAccomplishment' as const,
            label: t('topikWriting.report.dimTask', { defaultValue: 'Task Accomplishment' }),
            color: 'bg-blue-500',
        },
        {
            key: 'developmentStructure' as const,
            label: t('topikWriting.report.dimStructure', { defaultValue: 'Development & Structure' }),
            color: 'bg-violet-500',
        },
        {
            key: 'languageUse' as const,
            label: t('topikWriting.report.dimLanguage', { defaultValue: 'Language Use' }),
            color: 'bg-emerald-500',
        },
        {
            key: 'wongojiRules' as const,
            label: t('topikWriting.report.dimWongoji', { defaultValue: 'Wongoji Formatting' }),
            color: 'bg-amber-500',
        },
    ] as const;

    const pct =
        questionMaxScore > 0
            ? Math.round((evaluation.score / questionMaxScore) * 100)
            : 0;

    return (
        <div className="rounded-2xl border-2 border-border bg-card overflow-hidden">
            {/* Card header — always visible */}
            <button
                type="button"
                onClick={() => setIsOpen(v => !v)}
                className="w-full flex items-center justify-between p-5 hover:bg-muted/50 transition text-left"
            >
                <div className="flex items-center gap-4">
                    <div className="w-11 h-11 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-black text-sm shrink-0">
                        #{evaluation.questionNumber}
                    </div>
                    <div>
                        <div className="font-black text-foreground">
                            {t('topikWriting.session.questionX', { num: evaluation.questionNumber, defaultValue: `Question ${evaluation.questionNumber}` })}
                        </div>
                        <div className="text-xs text-muted-foreground font-medium">
                            {t('topikWriting.report.scoreLabel', { defaultValue: 'Score:' })}
                            <span
                                className={cn(
                                    'font-black text-sm ml-0.5',
                                    pct >= 80
                                        ? 'text-emerald-600 dark:text-emerald-400'
                                        : pct >= 60
                                            ? 'text-amber-600 dark:text-amber-400'
                                            : 'text-rose-600 dark:text-rose-400',
                                )}
                            >
                                {evaluation.score}
                            </span>
                            /{questionMaxScore}
                        </div>
                    </div>
                </div>
                {isOpen ? (
                    <ChevronUp size={18} className="text-muted-foreground" />
                ) : (
                    <ChevronDown size={18} className="text-muted-foreground" />
                )}
            </button>

            {/* Expanded content */}
            {isOpen && (
                <div className="border-t border-border divide-y divide-border">
                    {/* Dimension bars */}
                    <div className="p-5 space-y-3">
                        <h4 className="text-xs font-black text-muted-foreground uppercase tracking-wider">
                            {t('topikWriting.report.dimScores', { defaultValue: 'Dimension Scores' })}
                        </h4>
                        {DIMENSION_CONFIG.flatMap(dim => {
                            const val = evaluation.dimensions[dim.key];
                            if (val === undefined || val === null) return [];
                            return [
                                <DimensionBar
                                    key={dim.key}
                                    label={dim.label}
                                    value={val}
                                    color={dim.color}
                                />,
                            ];
                        })}
                    </div>

                    {/* Dual-pane: original vs corrected */}
                    {(originalAnswer || evaluation.correctedText) && (
                        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border">
                            {/* Original */}
                            <div className="p-5 space-y-2">
                                <div className="flex items-center gap-2 text-xs font-black text-muted-foreground uppercase tracking-wide">
                                    <BookOpen size={13} />
                                    {t('topikWriting.report.originalText', { defaultValue: 'Your Original Answer' })}
                                </div>
                                <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap font-medium bg-muted/40 rounded-xl p-3 min-h-[80px]">
                                    {originalAnswer?.trim() || (
                                        <span className="text-muted-foreground italic">{t('topikWriting.report.notAnswered', { defaultValue: '(Not answered)' })}</span>
                                    )}
                                </p>
                            </div>

                            {/* AI corrected */}
                            <div className="p-5 space-y-2">
                                <div className="flex items-center gap-2 text-xs font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">
                                    <Sparkles size={13} />
                                    {t('topikWriting.report.aiCorrected', { defaultValue: 'AI Polished Version' })}
                                </div>
                                <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap font-medium bg-emerald-50/60 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-400/20 rounded-xl p-3 min-h-[80px]">
                                    {evaluation.correctedText ?? evaluation.dimensions.taskAccomplishment > 0
                                        ? evaluation.correctedText
                                        : t('topikWriting.report.noCorrection', { defaultValue: '(No correction)' })}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Feedback */}
                    <div className="p-5 space-y-2">
                        <div className="flex items-center gap-2 text-xs font-black text-muted-foreground uppercase tracking-wide">
                            <Award size={13} />
                            {t('topikWriting.report.feedback', { defaultValue: 'Overall Feedback' })}
                        </div>
                        <div className="bg-muted/50 rounded-xl p-4 text-sm text-foreground leading-relaxed font-medium whitespace-pre-wrap">
                            {evaluation.feedbackText}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// ─── Main component ───────────────────────────────────────────────────────────

const QUESTION_MAX_SCORES: Record<number, number> = {
    51: 10,
    52: 10,
    53: 30,
    54: 50,
};

export const WritingEvaluationReport: React.FC<WritingEvaluationReportProps> = ({
    sessionId,
    originalAnswers = {},
    onBack,
}) => {
    const { t } = useTranslation();
    const result = useQuery(api.aiWritingEvaluation.getEvaluations, { sessionId: sessionId as any });
    const retriggerEvaluation = useMutation(api.topikWriting.submitSession);
    const [retrying, setRetrying] = useState(false);
    const [retryError, setRetryError] = useState<string | null>(null);

    // ── Loading ──────────────────────────────────────────────────────────────
    if (result === undefined) {
        return (
            <div className="flex items-center justify-center min-h-[40vh]">
                <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary border-t-transparent" />
            </div>
        );
    }

    if (result === null) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4 text-center">
                <div className="text-4xl">⚠️</div>
                <p className="text-muted-foreground font-bold">{t('topikWriting.report.loadingError', { defaultValue: 'Failed to load evaluation, please refresh the page.' })}</p>
                {onBack && (
                    <button
                        type="button"
                        onClick={onBack}
                        className="text-sm text-primary font-bold underline"
                    >
                        {t('topikWriting.report.back', { defaultValue: 'Back' })}
                    </button>
                )}
            </div>
        );
    }

    const { session, evaluations } = result;
    const sessionAnswers = ((session.answers as Record<string, string> | undefined) ?? {});

    // ── Still evaluating ─────────────────────────────────────────────────────
    if (session.status === 'EVALUATING') {
        return (
            <EvaluatingScreen
                onRetry={() => {
                    setRetrying(true);
                    setRetryError(null);
                    void retriggerEvaluation({ sessionId: sessionId as any })
                        .catch((error: unknown) => {
                            const msg =
                                error instanceof Error
                                    ? error.message
                                    : t('topikWriting.report.retryFailed', {
                                          defaultValue: 'Retry failed. Please try again later.',
                                      });
                            setRetryError(msg);
                        })
                        .finally(() => setRetrying(false));
                }}
                retrying={retrying}
                retryError={retryError}
            />
        );
    }

    // ── Computed stats ───────────────────────────────────────────────────────
    const totalScore = session.totalScore ?? evaluations.reduce((s, e) => s + e.score, 0);
    const maxPossible = Object.values(QUESTION_MAX_SCORES).reduce((a, b) => a + b, 0);
    const pct = maxPossible > 0 ? Math.round((totalScore / maxPossible) * 100) : 0;
    const elapsedMs =
        session.completedAt && session.startTime
            ? session.completedAt - session.startTime
            : null;
    const elapsedStr = elapsedMs
        ? t('topikWriting.report.timeFormat', {
            min: Math.floor(elapsedMs / 60000),
            sec: Math.floor((elapsedMs % 60000) / 1000),
            defaultValue: `{{min}}m {{sec}}s`
        })
        : '—';

    const passLabel =
        pct >= 80 ? t('topikWriting.report.passExcellent', { defaultValue: 'Excellent 🎉' }) :
            pct >= 60 ? t('topikWriting.report.passGood', { defaultValue: 'Pass ✅' }) :
                t('topikWriting.report.passNeedsWork', { defaultValue: 'Needs Work 📚' });

    // ── Full report ───────────────────────────────────────────────────────────
    return (
        <div className="max-w-4xl mx-auto px-4 py-8 space-y-8 font-sans">
            {/* ── Header ── */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black text-foreground">{t('topikWriting.report.title', { defaultValue: 'Writing Evaluation Report' })}</h1>
                    <p className="text-muted-foreground font-medium mt-1">
                        {t('topikWriting.report.subtitle', { defaultValue: 'TOPIK II Writing · AI Evaluation' })}
                    </p>
                </div>
                {onBack && (
                    <button
                        type="button"
                        onClick={onBack}
                        className="px-4 py-2 rounded-xl border-2 border-border font-bold text-sm text-foreground hover:bg-muted transition"
                    >
                        ← {t('topikWriting.report.back', { defaultValue: 'Back' })}
                    </button>
                )}
            </div>

            {/* ── Summary card ── */}
            <div className="rounded-2xl border-2 border-border bg-card p-6 grid grid-cols-2 md:grid-cols-4 gap-6">
                {/* Total score ring */}
                <div className="col-span-2 md:col-span-1 flex justify-center">
                    <ScoreRing score={totalScore} maxScore={maxPossible} label={passLabel} />
                </div>

                {/* Per-question rings */}
                {evaluations.map(e => (
                    <div key={e._id} className="flex justify-center">
                        <ScoreRing
                            score={e.score}
                            maxScore={QUESTION_MAX_SCORES[e.questionNumber] ?? 50}
                            label={t('topikWriting.session.questionX', { num: e.questionNumber, defaultValue: `Question ${e.questionNumber}` })}
                        />
                    </div>
                ))}

                {/* Elapsed time */}
                <div className="col-span-2 md:col-span-4 pt-4 border-t border-border flex items-center justify-between text-sm text-muted-foreground font-medium">
                    <span>{t('topikWriting.report.timeElapsed', { defaultValue: 'Time elapsed:' })} <strong className="text-foreground">{elapsedStr}</strong></span>
                    <span>{t('topikWriting.report.totalScore', { defaultValue: 'Total Score:' })} <strong className="text-foreground">{totalScore} / {maxPossible}</strong></span>
                    <div className="flex items-center gap-1.5">
                        <CheckCircle2 size={14} className="text-emerald-500" />
                        <span>{t('topikWriting.report.aiDone', { defaultValue: 'AI Evaluation Complete' })}</span>
                    </div>
                </div>
            </div>

            {/* ── Aggregate dimension bars ── */}
            {evaluations.length > 0 && (
                <div className="rounded-2xl border-2 border-border bg-card p-6 space-y-4">
                    <h2 className="font-black text-base text-foreground">{t('topikWriting.report.overallAnalysis', { defaultValue: 'Overall Dimension Analysis' })}</h2>
                    {(
                        [
                            { key: 'taskAccomplishment', label: t('topikWriting.report.dimTask', { defaultValue: 'Task Accomplishment' }), color: 'bg-blue-500' },
                            { key: 'developmentStructure', label: t('topikWriting.report.dimStructure', { defaultValue: 'Development & Structure' }), color: 'bg-violet-500' },
                            { key: 'languageUse', label: t('topikWriting.report.dimLanguage', { defaultValue: 'Language Use' }), color: 'bg-emerald-500' },
                            { key: 'wongojiRules', label: t('topikWriting.report.dimWongoji', { defaultValue: 'Wongoji Formatting' }), color: 'bg-amber-500' },
                        ] as const
                    ).map(dim => {
                        const vals = evaluations
                            .map(e => e.dimensions[dim.key])
                            .filter((v): v is number => v !== undefined && v !== null);
                        if (vals.length === 0) return null;
                        const avg = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
                        return (
                            <DimensionBar key={dim.key} label={dim.label} value={avg} color={dim.color} />
                        );
                    })}
                </div>
            )}

            {/* ── Per-question cards ── */}
            <div className="space-y-4">
                <h2 className="font-black text-base text-foreground">{t('topikWriting.report.questionFeedback', { defaultValue: 'Detailed Feedback by Question' })}</h2>
                {evaluations.map((e, idx) => (
                    <QuestionCard
                        key={e._id}
                        evaluation={e}
                        originalAnswer={
                            originalAnswers[String(e.questionNumber)] ??
                            sessionAnswers[String(e.questionNumber)]
                        }
                        questionMaxScore={QUESTION_MAX_SCORES[e.questionNumber] ?? 50}
                        defaultOpen={idx === 0}
                    />
                ))}
            </div>
        </div>
    );
};

export default WritingEvaluationReport;
