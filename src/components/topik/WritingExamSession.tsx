/**
 * WritingExamSession.tsx
 *
 * Full exam engine for TOPIK II Writing section.
 *
 * Responsibilities:
 *  - Countdown timer (from backend endTime), auto-submit on expiry
 *  - Debounced auto-save via `saveDraft` mutation (2 s delay)
 *  - Early-exit with confirmation (save draft, leave exam without submit)
 *  - Question navigator (Q51–54, with completion indicators)
 *  - Split-pane layout: prompt (left) + answer editor (right)
 *  - Q53/54 use <WongojiEditor>; Q51/52 use dual fill inputs (㉠ / ㉡)
 *  - Manual submit button with confirmation dialog
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation } from 'convex/react';
import { AlertTriangle, CheckCircle2, Clock, LogOut, Send } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import WongojiEditor from './WongojiEditor';
import { api } from '../../../convex/_generated/api';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WritingQuestion {
    _id: string;
    number: number;
    questionType: 'FILL_BLANK' | 'GRAPH_ESSAY' | 'OPINION_ESSAY';
    instruction?: string;
    contextBox?: string;
    image?: string;
    score: number;
    modelAnswer?: string;
}

export interface WritingExamSessionProps {
    sessionId: string;
    examId: string;
    endTime: number;
    questions: WritingQuestion[];
    /** Pre-loaded draft answers from the session doc */
    initialAnswers?: Record<string, string>;
    onSubmitted?: (answers: Record<string, string>) => void;
    onExit?: (answers: Record<string, string>) => void | Promise<void>;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const WONGOJI_QUESTIONS = new Set([53, 54]); // Q53/54 use 원고지
const DUAL_FILL_QUESTIONS = new Set([51, 52]); // Q51/52 use ㉠ / ㉡ inputs
const MAX_LENGTH: Record<number, number> = {
    51: 200,
    52: 200,
    53: 300,
    54: 700,
};
const WARNING_SECONDS = 5 * 60; // 5 minutes

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatTime(ms: number): string {
    if (ms <= 0) return '00:00';
    const totalSec = Math.floor(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

interface DualFillAnswer {
    slotA: string;
    slotB: string;
}

function parseDualFillAnswer(raw: string): DualFillAnswer {
    const text = (raw ?? '').trim();
    if (!text) return { slotA: '', slotB: '' };

    const normalized = text.replace(/\r\n/g, '\n');
    const markerPattern = /(?:^|\n)\s*㉠\s*([^\n]*)(?:\n\s*㉡\s*([^\n]*))?/;
    const markerMatch = normalized.match(markerPattern);
    if (markerMatch) {
        return {
            slotA: (markerMatch[1] ?? '').trim(),
            slotB: (markerMatch[2] ?? '').trim(),
        };
    }

    const lines = normalized
        .split('\n')
        .map(line => line.trim())
        .filter(Boolean);
    return {
        slotA: lines[0] ?? '',
        slotB: lines[1] ?? '',
    };
}

function serializeDualFillAnswer(answer: DualFillAnswer): string {
    const slotA = answer.slotA.trim();
    const slotB = answer.slotB.trim();
    if (!slotA && !slotB) return '';
    return `㉠ ${slotA}\n㉡ ${slotB}`;
}

function hasMeaningfulContent(questionNumber: number, rawAnswer: string): boolean {
    if (DUAL_FILL_QUESTIONS.has(questionNumber)) {
        const parsed = parseDualFillAnswer(rawAnswer ?? '');
        return parsed.slotA.length > 0 && parsed.slotB.length > 0;
    }
    return (rawAnswer ?? '').trim().length > 0;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface TimerProps {
    remainingMs: number;
}

const Timer: React.FC<TimerProps> = ({ remainingMs }) => {
    const isWarning = remainingMs <= WARNING_SECONDS * 1000 && remainingMs > 0;
    const isExpired = remainingMs <= 0;
    return (
        <div
            className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-full font-mono font-black text-lg border-2 transition-colors',
                isExpired
                    ? 'bg-destructive text-destructive-foreground border-destructive'
                    : isWarning
                        ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 border-amber-400 animate-pulse'
                        : 'bg-muted text-foreground border-border',
            )}
        >
            <Clock size={18} />
            {formatTime(remainingMs)}
        </div>
    );
};

interface QuestionTabProps {
    number: number;
    isActive: boolean;
    hasContent: boolean;
    onClick: () => void;
}

const QuestionTab: React.FC<QuestionTabProps> = ({ number, isActive, hasContent, onClick }) => (
    <button
        type="button"
        onClick={onClick}
        className={cn(
            'relative flex items-center justify-center w-12 h-12 rounded-xl font-black text-sm border-2 transition-all',
            isActive
                ? 'bg-primary text-primary-foreground border-primary shadow-md scale-105'
                : hasContent
                    ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-400'
                    : 'bg-card text-muted-foreground border-border hover:border-foreground hover:text-foreground',
        )}
    >
        {number}
        {hasContent && !isActive && (
            <CheckCircle2
                size={10}
                className="absolute -top-1 -right-1 text-emerald-500 fill-emerald-500"
            />
        )}
    </button>
);

// ─── FillBlankTextarea ────────────────────────────────────────────────────────

interface FillBlankProps {
    value: string;
    onChange: (v: string) => void;
    maxLength: number;
}

const FillBlankTextarea: React.FC<FillBlankProps> = ({ value, onChange, maxLength }) => {
    const { t } = useTranslation();
    const remaining = maxLength - value.length;
    return (
        <div className="flex flex-col gap-2 h-full">
            <textarea
                value={value}
                onChange={e => onChange(e.target.value.slice(0, maxLength))}
                className={cn(
                    'flex-1 w-full resize-none rounded-xl border-2 border-border bg-background p-4',
                    'text-foreground text-base leading-relaxed font-medium',
                    'focus:outline-none focus:border-primary transition-colors',
                    'min-h-[200px]',
                )}
                placeholder={t('topikWriting.session.answerPlaceholder', { defaultValue: 'Type your answer here...' })}
                spellCheck={false}
            />
            <div className="flex justify-between text-xs text-muted-foreground px-1">
                <span>{t('topikWriting.session.characterCount', { count: value.length, defaultValue: '{{count}} chars' })}</span>
                <span className={cn(remaining <= 20 ? 'text-destructive font-bold' : '')}>
                    {t('topikWriting.session.remainingChars', { count: remaining, defaultValue: '{{count}} left' })}
                </span>
            </div>
        </div>
    );
};

interface DualFillBlankProps {
    value: string;
    onChange: (v: string) => void;
    maxLength: number;
}

const DualFillBlankInputs: React.FC<DualFillBlankProps> = ({ value, onChange, maxLength }) => {
    const { t } = useTranslation();
    const parsed = useMemo(() => parseDualFillAnswer(value), [value]);
    const perFieldMax = Math.max(40, Math.floor(maxLength / 2));
    const totalUsed = parsed.slotA.length + parsed.slotB.length;
    const remaining = maxLength - totalUsed;

    return (
        <div className="flex flex-col gap-4 h-full">
            <div className="rounded-2xl border-2 border-zinc-900 bg-[#fffef8] p-5 md:p-6 space-y-5 shadow-[4px_4px_0px_0px_#18181B]">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                    <p className="text-sm font-black text-zinc-800">
                        {t('topikWriting.session.fillBlankPaperTitle', {
                            defaultValue: 'Fill in blanks (㉠ / ㉡)',
                        })}
                    </p>
                    <span className="text-[11px] font-bold text-zinc-500">
                        {t('topikWriting.session.fillBlankOneSentence', {
                            defaultValue: 'One sentence per blank recommended',
                        })}
                    </span>
                </div>
                <p className="text-sm text-zinc-600 font-medium leading-relaxed">
                    {t('topikWriting.session.fillBlankHint', {
                        defaultValue: 'Please fill both ㉠ and ㉡ with complete sentences.',
                    })}
                </p>
                <div className="grid grid-cols-1 gap-3">
                    <label className="grid grid-cols-[auto_1fr] items-end gap-3">
                        <span className="inline-flex items-center justify-center h-9 min-w-9 px-2 rounded-full border-2 border-zinc-900 text-sm font-black text-zinc-900 bg-white">
                            ㉠
                        </span>
                        <input
                            value={parsed.slotA}
                            onChange={e =>
                                onChange(
                                    serializeDualFillAnswer({
                                        slotA: e.target.value.slice(0, perFieldMax),
                                        slotB: parsed.slotB,
                                    }),
                                )
                            }
                            className={cn(
                                'h-11 w-full bg-transparent border-0 border-b-[3px] border-zinc-900 rounded-none px-1 pb-1',
                                'text-base md:text-lg font-semibold text-zinc-900',
                                'focus:outline-none focus:border-primary transition-colors',
                                'placeholder:text-zinc-400',
                            )}
                            placeholder={t('topikWriting.session.fillBlankA', {
                                defaultValue: 'Fill ㉠ here',
                            })}
                            spellCheck={false}
                        />
                    </label>

                    <label className="grid grid-cols-[auto_1fr] items-end gap-3">
                        <span className="inline-flex items-center justify-center h-9 min-w-9 px-2 rounded-full border-2 border-zinc-900 text-sm font-black text-zinc-900 bg-white">
                            ㉡
                        </span>
                        <input
                            value={parsed.slotB}
                            onChange={e =>
                                onChange(
                                    serializeDualFillAnswer({
                                        slotA: parsed.slotA,
                                        slotB: e.target.value.slice(0, perFieldMax),
                                    }),
                                )
                            }
                            className={cn(
                                'h-11 w-full bg-transparent border-0 border-b-[3px] border-zinc-900 rounded-none px-1 pb-1',
                                'text-base md:text-lg font-semibold text-zinc-900',
                                'focus:outline-none focus:border-primary transition-colors',
                                'placeholder:text-zinc-400',
                            )}
                            placeholder={t('topikWriting.session.fillBlankB', {
                                defaultValue: 'Fill ㉡ here',
                            })}
                            spellCheck={false}
                        />
                    </label>
                </div>
            </div>

            <div className="flex justify-between text-xs text-muted-foreground px-1">
                <span>
                    {t('topikWriting.session.characterCount', {
                        count: totalUsed,
                        defaultValue: '{{count}} chars',
                    })}
                </span>
                <span className={cn(remaining <= 20 ? 'text-destructive font-bold' : '')}>
                    {t('topikWriting.session.remainingChars', {
                        count: remaining,
                        defaultValue: '{{count}} left',
                    })}
                </span>
            </div>
        </div>
    );
};

// ─── QuestionPrompt ───────────────────────────────────────────────────────────

interface QuestionPromptProps {
    question: WritingQuestion;
    hideTextContent?: boolean;
    hideMetaHeader?: boolean;
}

const QuestionPrompt: React.FC<QuestionPromptProps> = ({
    question,
    hideTextContent = false,
    hideMetaHeader = false,
}) => {
    const { t } = useTranslation();
    return (
        <div className="space-y-5 h-full overflow-y-auto pr-2">
            {!hideTextContent && !hideMetaHeader && (
                <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-2 bg-primary text-primary-foreground px-3 py-2 rounded-lg font-black text-sm">
                        {t('topikWriting.session.questionX', { num: question.number, defaultValue: `Question ${question.number}` })}
                    </div>
                    <div className="text-sm font-bold text-muted-foreground bg-card px-3 py-1.5 rounded-md border border-border">
                        {question.score} {t('topikWriting.session.points', { defaultValue: 'pts' })}
                    </div>
                    <div className="text-xs font-black text-foreground/80 uppercase tracking-[0.08em] bg-muted px-2.5 py-1 rounded-md">
                        {{
                            FILL_BLANK: t('topikWriting.session.fillBlank', { defaultValue: 'Fill in the blank' }),
                            GRAPH_ESSAY: t('topikWriting.session.graphEssay', { defaultValue: 'Graph essay' }),
                            OPINION_ESSAY: t('topikWriting.session.opinionEssay', { defaultValue: 'Opinion essay' }),
                        }[question.questionType]}
                    </div>
                </div>
            )}

            {!hideTextContent && question.instruction && (
                <div className="rounded-2xl border-2 border-border bg-card p-4 md:p-5 shadow-sm">
                    <p className="text-foreground font-semibold leading-8 text-[15px] md:text-base whitespace-pre-wrap break-words">
                        {question.instruction}
                    </p>
                </div>
            )}

            {!hideTextContent && question.contextBox && (
                <div className="relative border-2 border-border rounded-2xl p-4 md:p-5 bg-background shadow-sm">
                    <div className="absolute -top-3 left-4 bg-background px-2 text-[11px] font-black text-muted-foreground border border-border rounded">
                        {t('topikWriting.session.exampleBox', { defaultValue: 'Example / Context' })}
                    </div>
                    <p className="text-foreground text-[15px] md:text-base leading-8 whitespace-pre-wrap break-words">
                        {question.contextBox}
                    </p>
                </div>
            )}

            {question.image && (
                <div className="rounded-2xl border-2 border-border bg-card p-3 shadow-sm">
                    <img
                        src={question.image}
                        alt={`Question ${question.number}`}
                        className="w-full rounded-xl border border-border object-contain max-h-[460px] bg-background"
                    />
                </div>
            )}
        </div>
    );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export const WritingExamSession: React.FC<WritingExamSessionProps> = ({
    sessionId,
    endTime,
    questions,
    initialAnswers = {},
    onSubmitted,
    onExit,
}) => {
    const { t } = useTranslation();

    // ── Convex mutations ──────────────────────────────────────────────────────
    const saveDraft = useMutation(api.topikWriting.saveDraft);
    const submitSession = useMutation(api.topikWriting.submitSession);

    // ── Local state ───────────────────────────────────────────────────────────
    const [localAnswers, setLocalAnswers] = useState<Record<number, string>>(() => {
        const result: Record<number, string> = {};
        for (const [k, v] of Object.entries(initialAnswers)) {
            result[Number(k)] = v;
        }
        return result;
    });

    const [activeQuestion, setActiveQuestion] = useState<number>(
        questions[0]?.number ?? 51,
    );
    const [remainingMs, setRemainingMs] = useState<number>(endTime - Date.now());
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isExiting, setIsExiting] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [showExitConfirm, setShowExitConfirm] = useState(false);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

    const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const hasAutoSubmitted = useRef(false);

    // ── Timer ─────────────────────────────────────────────────────────────────
    useEffect(() => {
        const interval = setInterval(() => {
            const remaining = endTime - Date.now();
            setRemainingMs(remaining);

            if (remaining <= 0) {
                clearInterval(interval);
                if (!hasAutoSubmitted.current) {
                    hasAutoSubmitted.current = true;
                    void handleSubmit(true);
                }
            }
        }, 1000);

        return () => clearInterval(interval);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [endTime]);

    // ── Debounced auto-save ───────────────────────────────────────────────────
    useEffect(() => {
        if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);

        setSaveStatus('idle');
        autoSaveTimerRef.current = setTimeout(async () => {
            setSaveStatus('saving');
            try {
                const answersRecord: Record<string, string> = {};
                for (const [k, v] of Object.entries(localAnswers)) {
                    answersRecord[String(k)] = v;
                }
                await saveDraft({ sessionId: sessionId as any, answers: answersRecord });
                setSaveStatus('saved');
            } catch {
                setSaveStatus('error');
            }
        }, 2000);

        return () => {
            if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
        };
    }, [localAnswers, sessionId, saveDraft]);

    // ── Handlers ──────────────────────────────────────────────────────────────
    const handleAnswerChange = useCallback((qNum: number, text: string) => {
        setLocalAnswers(prev => ({ ...prev, [qNum]: text }));
    }, []);

    const buildAnswersRecord = useCallback(() => {
        const answersRecord: Record<string, string> = {};
        for (const [k, v] of Object.entries(localAnswers)) {
            answersRecord[String(k)] = v;
        }
        return answersRecord;
    }, [localAnswers]);

    const handleSubmit = useCallback(async (forced = false) => {
        if (isSubmitting || isSubmitted || isExiting) return;

        setIsSubmitting(true);
        setShowConfirm(false);
        setShowExitConfirm(false);

        try {
            // Final save before submit
            const answersRecord = buildAnswersRecord();
            await saveDraft({ sessionId: sessionId as any, answers: answersRecord });
            await submitSession({ sessionId: sessionId as any });
            setIsSubmitted(true);
            onSubmitted?.(answersRecord);
        } catch {
            setIsSubmitting(false);
        }
    }, [isSubmitting, isSubmitted, isExiting, buildAnswersRecord, sessionId, saveDraft, submitSession, onSubmitted]);

    const handleExit = useCallback(async () => {
        if (isSubmitting || isSubmitted || isExiting) return;

        setIsExiting(true);
        setShowExitConfirm(false);

        try {
            // Best-effort save before leaving so users can resume later.
            const answersRecord = buildAnswersRecord();
            try {
                await saveDraft({ sessionId: sessionId as any, answers: answersRecord });
            } catch {
                /* ignore save failure on exit */
            }
            await onExit?.(answersRecord);
        } finally {
            setIsExiting(false);
        }
    }, [isSubmitting, isSubmitted, isExiting, buildAnswersRecord, saveDraft, sessionId, onExit]);

    // ── Derived values ────────────────────────────────────────────────────────
    const currentQuestion = questions.find(q => q.number === activeQuestion) ?? questions[0];
    const isDualFillQuestion = DUAL_FILL_QUESTIONS.has(currentQuestion.number);
    const isImageOnlyPromptQuestion = currentQuestion.number === 51;
    const answeredCount = questions.filter(q =>
        hasMeaningfulContent(q.number, localAnswers[q.number] ?? ''),
    ).length;
    const totalScore = questions.reduce((sum, q) => sum + q.score, 0);

    // ── Submitted screen ──────────────────────────────────────────────────────
    if (isSubmitted) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center">
                <CheckCircle2 size={64} className="text-emerald-500" />
                <div>
                    <h2 className="text-2xl font-black text-foreground">
                        {t('topikWriting.session.submittedTitle', { defaultValue: 'Successfully Submitted!' })}
                    </h2>
                    <p className="text-muted-foreground mt-2">
                        {t('topikWriting.session.submittedDesc', { ans: answeredCount, total: questions.length, defaultValue: `Answered ${answeredCount} / ${questions.length} questions. Waiting for AI evaluation...` })}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-screen bg-background font-sans">
            {/* ── Navbar ── */}
            <header className="flex items-center justify-between px-6 py-3 border-b-2 border-border bg-card shrink-0 gap-4">
                {/* Left: exam info */}
                <div className="flex items-center gap-3">
                    <div className="font-black text-foreground text-base">
                        {t('topikWriting.title', { defaultValue: 'TOPIK II Writing' })}
                    </div>
                    <div className="text-xs text-muted-foreground font-bold bg-muted px-2 py-1 rounded-md">
                        {answeredCount}/{questions.length} · {totalScore} {t('topikWriting.session.points', { defaultValue: 'pts' })}
                    </div>
                </div>

                {/* Center: question navigator */}
                <div className="flex items-center gap-2">
                    {questions.map(q => (
                        <QuestionTab
                            key={q.number}
                            number={q.number}
                            isActive={q.number === activeQuestion}
                            hasContent={hasMeaningfulContent(q.number, localAnswers[q.number] ?? '')}
                            onClick={() => setActiveQuestion(q.number)}
                        />
                    ))}
                </div>

                {/* Right: timer + save status + submit */}
                <div className="flex items-center gap-3">
                    {/* Auto-save indicator */}
                    <div className={cn(
                        'text-[11px] font-bold transition-all',
                        saveStatus === 'saving' ? 'text-amber-500' :
                            saveStatus === 'saved' ? 'text-emerald-600 dark:text-emerald-400' :
                                saveStatus === 'error' ? 'text-destructive' :
                                    'text-muted-foreground'
                    )}>
                        {saveStatus === 'saving' ? t('topikWriting.session.saving', { defaultValue: 'Saving...' }) :
                            saveStatus === 'saved' ? t('topikWriting.session.saved', { defaultValue: '✓ Saved' }) :
                                saveStatus === 'error' ? t('topikWriting.session.saveError', { defaultValue: 'Save Failed' }) :
                                    t('topikWriting.session.saveIdle', { defaultValue: 'Auto-save' })}
                    </div>

                    <Timer remainingMs={remainingMs} />

                    <button
                        type="button"
                        onClick={() => setShowExitConfirm(true)}
                        disabled={isSubmitting || isExiting}
                        className={cn(
                            'flex items-center gap-2 px-4 py-2 rounded-xl font-black text-sm border-2 transition-all',
                            'bg-card text-muted-foreground border-border',
                            'hover:bg-muted active:scale-95',
                            'disabled:opacity-50 disabled:cursor-not-allowed',
                        )}
                    >
                        <LogOut size={14} />
                        {t('dashboard.topik.controller.exit', { defaultValue: 'Exit' })}
                    </button>

                    <button
                        type="button"
                        onClick={() => setShowConfirm(true)}
                        disabled={isSubmitting || isExiting}
                        className={cn(
                            'flex items-center gap-2 px-4 py-2 rounded-xl font-black text-sm border-2 transition-all',
                            'bg-primary text-primary-foreground border-primary',
                            'hover:opacity-90 active:scale-95',
                            'disabled:opacity-50 disabled:cursor-not-allowed',
                        )}
                    >
                        <Send size={14} />
                        {t('topikWriting.session.submitButton', { defaultValue: 'Submit' })}
                    </button>
                </div>
            </header>

            {/* ── Confirm dialog overlay ── */}
            {showConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-card rounded-2xl border-2 border-border p-8 shadow-2xl max-w-md w-full mx-4 space-y-5">
                        <div className="flex items-center gap-3">
                            <AlertTriangle size={28} className="text-amber-500 shrink-0" />
                            <div>
                                <h3 className="font-black text-foreground text-lg">
                                    {t('topikWriting.session.submitConfirmTitle', { defaultValue: 'Submit Exam?' })}
                                </h3>
                                <p className="text-muted-foreground text-sm mt-1">
                                    {t('topikWriting.session.submitConfirmDesc', { ans: answeredCount, total: questions.length, defaultValue: `Answered ${answeredCount}/${questions.length} questions. You cannot change your answers after submitting.` })}
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={() => setShowConfirm(false)}
                                className="flex-1 py-2.5 rounded-xl border-2 border-border font-bold text-sm text-foreground hover:bg-muted transition"
                            >
                                {t('topikWriting.session.continueForm', { defaultValue: 'Continue' })}
                            </button>
                            <button
                                type="button"
                                onClick={() => void handleSubmit(true)}
                                disabled={isSubmitting || isExiting}
                                className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground font-black text-sm hover:opacity-90 transition disabled:opacity-50"
                            >
                                {isSubmitting ? t('topikWriting.session.submitting', { defaultValue: 'Submitting...' }) : t('topikWriting.session.confirmSubmit', { defaultValue: 'Confirm Submit' })}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showExitConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-card rounded-2xl border-2 border-border p-8 shadow-2xl max-w-md w-full mx-4 space-y-5">
                        <div className="flex items-center gap-3">
                            <AlertTriangle size={28} className="text-amber-500 shrink-0" />
                            <div>
                                <h3 className="font-black text-foreground text-lg">
                                    {t('topikWriting.session.exitConfirmTitle', {
                                        defaultValue: 'Exit Exam?',
                                    })}
                                </h3>
                                <p className="text-muted-foreground text-sm mt-1">
                                    {t('topikWriting.session.exitConfirmDesc', {
                                        defaultValue:
                                            'Your current answers will be saved as a draft. You can return later to continue this exam.',
                                    })}
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={() => setShowExitConfirm(false)}
                                className="flex-1 py-2.5 rounded-xl border-2 border-border font-bold text-sm text-foreground hover:bg-muted transition"
                            >
                                {t('topikWriting.session.continueForm', { defaultValue: 'Continue' })}
                            </button>
                            <button
                                type="button"
                                onClick={() => void handleExit()}
                                disabled={isSubmitting || isExiting}
                                className="flex-1 py-2.5 rounded-xl bg-card border-2 border-border text-foreground font-black text-sm hover:bg-muted transition disabled:opacity-50"
                            >
                                {isExiting
                                    ? t('topikWriting.session.exiting', { defaultValue: 'Exiting...' })
                                    : t('dashboard.topik.controller.exit', { defaultValue: 'Exit' })}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Main content ── */}
            {currentQuestion && (
                isDualFillQuestion ? (
                    <div className="flex-1 overflow-y-auto bg-muted/20 p-4 md:p-6 xl:p-8">
                        <div className="max-w-5xl mx-auto space-y-6">
                            <section className="rounded-2xl border-2 border-border bg-card p-4 md:p-6 shadow-sm">
                                <div className="flex items-center gap-3 flex-wrap mb-4">
                                    <div className="flex items-center gap-2 bg-primary text-primary-foreground px-3 py-2 rounded-lg font-black text-sm">
                                        {t('topikWriting.session.questionX', {
                                            num: currentQuestion.number,
                                            defaultValue: `Question ${currentQuestion.number}`,
                                        })}
                                    </div>
                                    <div className="text-sm font-bold text-muted-foreground bg-muted px-3 py-1.5 rounded-md border border-border">
                                        {currentQuestion.score}{' '}
                                        {t('topikWriting.session.points', { defaultValue: 'pts' })}
                                    </div>
                                </div>
                                <QuestionPrompt
                                    question={currentQuestion}
                                    hideTextContent={isImageOnlyPromptQuestion}
                                    hideMetaHeader={true}
                                />
                            </section>

                            <section className="rounded-2xl border-2 border-border bg-background p-4 md:p-6 shadow-sm">
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="font-black text-sm text-foreground uppercase tracking-wide">
                                        {t('topikWriting.session.answerArea', { defaultValue: 'Answer Area' })}
                                    </h3>
                                    <span className="text-xs text-muted-foreground font-medium">
                                        {t('topikWriting.session.maxLength', {
                                            count: MAX_LENGTH[currentQuestion.number] ?? 200,
                                            defaultValue: `Max ${MAX_LENGTH[currentQuestion.number] ?? 200} chars`,
                                        })}
                                    </span>
                                </div>
                                <DualFillBlankInputs
                                    value={localAnswers[currentQuestion.number] ?? ''}
                                    onChange={text => handleAnswerChange(currentQuestion.number, text)}
                                    maxLength={MAX_LENGTH[currentQuestion.number] ?? 200}
                                />
                            </section>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 overflow-hidden grid grid-cols-1 xl:grid-cols-12 gap-0">
                        {/* ── Left side: Prompt ── */}
                        <div className="xl:col-span-5 bg-muted/30 border-r-2 border-border overflow-y-auto p-4 md:p-6 xl:p-8 flex flex-col gap-6">
                            <QuestionPrompt question={currentQuestion} />
                        </div>

                        {/* ── Right side: Answer area ── */}
                        <div className="xl:col-span-7 bg-background overflow-y-auto p-4 md:p-6 xl:p-8 relative">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="font-black text-sm text-foreground uppercase tracking-wide">
                                    {WONGOJI_QUESTIONS.has(currentQuestion.number)
                                        ? t('topikWriting.session.wongojiAnswer', {
                                              defaultValue: 'Wongoji Answer',
                                          })
                                        : t('topikWriting.session.answerArea', {
                                              defaultValue: 'Answer Area',
                                          })}
                                </h3>
                                <span className="text-xs text-muted-foreground font-medium">
                                    {t('topikWriting.session.maxLength', {
                                        count: MAX_LENGTH[currentQuestion.number] ?? 600,
                                        defaultValue: `Max ${MAX_LENGTH[currentQuestion.number] ?? 600} chars`,
                                    })}
                                </span>
                            </div>

                            {WONGOJI_QUESTIONS.has(currentQuestion.number) ? (
                                <WongojiEditor
                                    value={localAnswers[currentQuestion.number] ?? ''}
                                    onChange={text => handleAnswerChange(currentQuestion.number, text)}
                                    maxLength={MAX_LENGTH[currentQuestion.number] ?? 600}
                                    className="flex-1"
                                />
                            ) : (
                                <FillBlankTextarea
                                    value={localAnswers[currentQuestion.number] ?? ''}
                                    onChange={text => handleAnswerChange(currentQuestion.number, text)}
                                    maxLength={MAX_LENGTH[currentQuestion.number] ?? 200}
                                />
                            )}
                        </div>
                    </div>
                )
            )}
        </div>
    );
};

export default WritingExamSession;
