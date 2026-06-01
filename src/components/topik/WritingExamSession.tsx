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
import { AlertTriangle, CheckCircle2, Clock, LogOut, Send, ZoomIn, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import WongojiEditor from './WongojiEditor';
import { Button, Input, Textarea } from '../ui';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { useIsMobile } from '../../hooks/useIsMobile';
import { MobileImmersiveHeader } from '../mobile/MobileImmersiveHeader';
import { DesignChip } from '../desktop/ui/DesignChip';
import { KT } from '../../theme/ksoftTokens';

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
  sessionId: Id<'topik_writing_sessions'>;
  examId: string;
  endTime: number;
  questions: WritingQuestion[];
  /** Pre-loaded draft answers from the session doc */
  initialAnswers?: Record<string, string>;
  onSubmitted?: (answers: Record<string, string>) => void;
  onSubmitError?: (error: unknown) => void;
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
type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

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

function getQuestionTypeLabel(
  questionType: WritingQuestion['questionType'],
  t: WritingTranslationFn
): string {
  if (questionType === 'FILL_BLANK') {
    return t('topikWriting.session.fillBlank', {
      defaultValue: 'Fill in the blank',
    });
  }
  if (questionType === 'GRAPH_ESSAY') {
    return t('topikWriting.session.graphEssay', { defaultValue: 'Graph essay' });
  }
  return t('topikWriting.session.opinionEssay', {
    defaultValue: 'Opinion essay',
  });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface QuestionTabProps {
  number: number;
  isActive: boolean;
  hasContent: boolean;
  onClick: () => void;
}

const QuestionTab: React.FC<QuestionTabProps> = ({ number, isActive, hasContent, onClick }) => (
  <Button
    type="button"
    variant="ghost"
    size="auto"
    onClick={onClick}
    className={cn(
      'relative flex items-center justify-center w-12 h-12 rounded-xl font-black text-sm border-2 transition-all',
      isActive
        ? 'bg-primary text-primary-foreground border-primary shadow-md scale-105'
        : hasContent
          ? 'bg-emerald-50 text-emerald-700 border-emerald-400'
          : 'bg-card text-muted-foreground border-border hover:border-foreground hover:text-foreground'
    )}
  >
    {number}
    {hasContent && !isActive && (
      <CheckCircle2
        size={10}
        className="absolute -top-1 -right-1 text-emerald-500 fill-emerald-500"
      />
    )}
  </Button>
);

// ─── FillBlankTextarea ────────────────────────────────────────────────────────

interface FillBlankProps {
  value: string;
  onChange: (v: string) => void;
  maxLength: number;
  compact?: boolean;
}

const FillBlankTextarea: React.FC<FillBlankProps> = ({
  value,
  onChange,
  maxLength,
  compact = false,
}) => {
  const { t } = useTranslation();
  const remaining = maxLength - value.length;
  return (
    <div className="flex flex-col gap-2 h-full">
      <Textarea
        value={value}
        onChange={e => onChange(e.target.value.slice(0, maxLength))}
        className={cn(
          'flex-1 w-full resize-none border-2 border-border bg-background font-medium text-foreground leading-relaxed',
          compact
            ? 'min-h-[240px] rounded-[18px] p-4 text-[16px]'
            : 'min-h-[200px] rounded-xl p-4 text-base',
          'focus:outline-none focus:border-primary transition-colors'
        )}
        placeholder={t('topikWriting.session.answerPlaceholder', {
          defaultValue: 'Type your answer here...',
        })}
        spellCheck={false}
      />
      <div className="flex justify-between text-xs text-muted-foreground px-1">
        <span>
          {t('topikWriting.session.characterCount', {
            count: value.length,
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

interface DualFillBlankProps {
  value: string;
  onChange: (v: string) => void;
  maxLength: number;
  compact?: boolean;
}

const DualFillBlankInputs: React.FC<DualFillBlankProps> = ({
  value,
  onChange,
  maxLength,
  compact = false,
}) => {
  const { t } = useTranslation();
  const parsed = useMemo(() => parseDualFillAnswer(value), [value]);
  const perFieldMax = Math.max(40, Math.floor(maxLength / 2));
  const totalUsed = parsed.slotA.length + parsed.slotB.length;
  const remaining = maxLength - totalUsed;

  return (
    <div className="flex h-full flex-col gap-3">
      <div
        className={cn(
          'flex-1 border',
          compact
            ? 'space-y-4 rounded-[18px] p-4 shadow-sm'
            : 'space-y-5 rounded-2xl p-5 shadow-sm md:p-6'
        )}
        style={{
          backgroundColor: KT.bg,
          borderColor: KT.line2,
        }}
      >
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <p className="text-sm font-black" style={{ color: KT.ink }}>
            {t('topikWriting.session.fillBlankPaperTitle', {
              defaultValue: 'Fill in blanks (㉠ / ㉡)',
            })}
          </p>
          <span className="text-[11px] font-bold" style={{ color: KT.sub }}>
            {t('topikWriting.session.fillBlankOneSentence', {
              defaultValue: 'One sentence per blank recommended',
            })}
          </span>
        </div>
        <p className="text-sm font-medium leading-relaxed" style={{ color: KT.sub }}>
          {t('topikWriting.session.fillBlankHint', {
            defaultValue: 'Please fill both ㉠ and ㉡ with complete sentences.',
          })}
        </p>
        <div className="grid grid-cols-1 gap-3">
          <label className="grid grid-cols-[auto_1fr] items-end gap-3">
            <span
              className="inline-flex h-9 min-w-9 items-center justify-center rounded-full border px-2 text-sm font-black shadow-sm"
              style={{ backgroundColor: KT.card, borderColor: KT.line2, color: KT.ink }}
            >
              ㉠
            </span>
            <Input
              value={parsed.slotA}
              onChange={e =>
                onChange(
                  serializeDualFillAnswer({
                    slotA: e.target.value.slice(0, perFieldMax),
                    slotB: parsed.slotB,
                  })
                )
              }
              className={cn(
                'w-full rounded-none border-0 border-b-2 bg-transparent px-1 pb-1 font-semibold',
                compact ? 'h-12 text-[16px]' : 'h-11 text-base md:text-lg',
                'transition-colors focus:outline-none',
                'placeholder:text-muted-foreground/50'
              )}
              style={{ borderColor: KT.line2, color: KT.ink }}
              placeholder={t('topikWriting.session.fillBlankA', {
                defaultValue: 'Fill ㉠ here',
              })}
              spellCheck={false}
            />
          </label>

          <label className="grid grid-cols-[auto_1fr] items-end gap-3">
            <span
              className="inline-flex h-9 min-w-9 items-center justify-center rounded-full border px-2 text-sm font-black shadow-sm"
              style={{ backgroundColor: KT.card, borderColor: KT.line2, color: KT.ink }}
            >
              ㉡
            </span>
            <Input
              value={parsed.slotB}
              onChange={e =>
                onChange(
                  serializeDualFillAnswer({
                    slotA: parsed.slotA,
                    slotB: e.target.value.slice(0, perFieldMax),
                  })
                )
              }
              className={cn(
                'w-full rounded-none border-0 border-b-2 bg-transparent px-1 pb-1 font-semibold',
                compact ? 'h-12 text-[16px]' : 'h-11 text-base md:text-lg',
                'transition-colors focus:outline-none',
                'placeholder:text-muted-foreground/50'
              )}
              style={{ borderColor: KT.line2, color: KT.ink }}
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
  surfaceTone?: 'default' | 'paper';
  compact?: boolean;
}

const QuestionPrompt: React.FC<QuestionPromptProps> = ({
  question,
  hideTextContent = false,
  hideMetaHeader = false,
  surfaceTone = 'default',
  compact = false,
}) => {
  const { t } = useTranslation();
  const isPaperTone = surfaceTone === 'paper';
  const [isZoomed, setIsZoomed] = useState(false);
  return (
    <div className={cn('h-full overflow-y-auto pr-1.5', compact ? 'space-y-4' : 'space-y-5')}>
      {!hideTextContent && !hideMetaHeader && (
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 bg-primary text-primary-foreground px-3 py-2 rounded-lg font-black text-sm">
            {t('topikWriting.session.questionX', {
              questionNumber: question.number,
              defaultValue: `Question ${question.number}`,
            })}
          </div>
          <div className="text-sm font-bold text-muted-foreground bg-card px-3 py-1.5 rounded-md border border-border">
            {question.score} {t('topikWriting.session.points', { defaultValue: 'pts' })}
          </div>
          <div className="text-xs font-black text-foreground/80 uppercase tracking-[0.08em] bg-muted px-2.5 py-1 rounded-md">
            {
              {
                FILL_BLANK: t('topikWriting.session.fillBlank', {
                  defaultValue: 'Fill in the blank',
                }),
                GRAPH_ESSAY: t('topikWriting.session.graphEssay', { defaultValue: 'Graph essay' }),
                OPINION_ESSAY: t('topikWriting.session.opinionEssay', {
                  defaultValue: 'Opinion essay',
                }),
              }[question.questionType]
            }
          </div>
        </div>
      )}

      {!hideTextContent && question.instruction && (
        <div
          className={cn('rounded-2xl border-2 shadow-sm', compact ? 'p-3.5 md:p-4' : 'p-4 md:p-5')}
          style={
            isPaperTone
              ? {
                  borderColor: KT.line2,
                  background: KT.card,
                }
              : undefined
          }
        >
          <p
            className={cn(
              'whitespace-pre-wrap break-words font-semibold',
              compact
                ? 'text-[14px] leading-7 md:text-[15px]'
                : 'text-[15px] leading-8 md:text-base'
            )}
            style={isPaperTone ? { color: KT.ink } : undefined}
          >
            {question.instruction}
          </p>
        </div>
      )}

      {!hideTextContent && question.contextBox && (
        <div
          className={cn(
            'relative rounded-2xl border-2 shadow-sm',
            compact ? 'p-3.5 md:p-4' : 'p-4 md:p-5'
          )}
          style={
            isPaperTone
              ? {
                  borderColor: KT.line2,
                  background: KT.bg,
                }
              : undefined
          }
        >
          <div
            className="absolute -top-3 left-4 rounded border px-2 text-[11px] font-black text-muted-foreground"
            style={
              isPaperTone
                ? {
                    borderColor: KT.line2,
                    background: KT.bg,
                  }
                : undefined
            }
          >
            {t('topikWriting.session.exampleBox', { defaultValue: 'Example / Context' })}
          </div>
          <p
            className={cn(
              'whitespace-pre-wrap break-words',
              compact
                ? 'text-[14px] leading-7 md:text-[15px]'
                : 'text-[15px] leading-8 md:text-base'
            )}
            style={isPaperTone ? { color: KT.ink2 } : undefined}
          >
            {question.contextBox}
          </p>
        </div>
      )}

      {question.image && (
        <>
          <div
            className="group relative cursor-zoom-in rounded-2xl border-2 p-3 shadow-sm transition-all hover:border-[rgba(31,27,23,0.3)]"
            style={
              isPaperTone
                ? {
                    borderColor: KT.line2,
                    background: KT.card,
                  }
                : undefined
            }
            onClick={() => setIsZoomed(true)}
          >
            <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-[rgba(31,27,23,0.04)] opacity-0 transition-opacity group-hover:opacity-100">
              <div className="rounded-full bg-white/90 p-2 shadow-sm backdrop-blur-sm">
                <ZoomIn size={20} style={{ color: KT.ink }} />
              </div>
            </div>
            <img
              src={question.image}
              alt={String(question.number)}
              className={cn(
                'w-full rounded-xl border object-contain',
                compact ? 'max-h-[400px]' : 'max-h-[500px]'
              )}
              style={
                isPaperTone
                  ? {
                      borderColor: KT.line2,
                      background: KT.bg,
                    }
                  : undefined
              }
            />
          </div>

          {isZoomed && (
            <div
              className="fixed inset-0 z-[100] flex flex-col items-center justify-center p-4 backdrop-blur-md transition-all animate-in fade-in duration-200 md:p-12 cursor-zoom-out"
              style={{ background: 'rgba(251,248,243,0.92)' }}
              onClick={() => setIsZoomed(false)}
            >
              <div
                className="relative flex max-h-full max-w-5xl flex-col items-center"
                onClick={e => e.stopPropagation()}
              >
                <button
                  className="absolute -top-12 right-0 p-2 transition-colors hover:scale-110"
                  style={{ color: KT.ink2 }}
                  onMouseEnter={e => (e.currentTarget.style.color = KT.crimson)}
                  onMouseLeave={e => (e.currentTarget.style.color = KT.ink2)}
                  onClick={() => setIsZoomed(false)}
                >
                  <X size={32} />
                </button>
                <img
                  src={question.image}
                  alt={String(question.number)}
                  className="max-h-[85vh] w-full rounded-2xl object-contain p-4 shadow-2xl"
                  style={{ background: KT.card }}
                />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

type WritingTranslationFn = ReturnType<typeof useTranslation>['t'];

function getSaveStatusClass(saveStatus: SaveStatus): string {
  if (saveStatus === 'saving') return 'text-amber-500';
  if (saveStatus === 'saved') return 'text-emerald-600';
  if (saveStatus === 'error') return 'text-destructive';
  return 'text-muted-foreground';
}

function getSaveStatusText(saveStatus: SaveStatus, t: WritingTranslationFn): string {
  if (saveStatus === 'saving') {
    return t('topikWriting.session.saving', { defaultValue: 'Saving...' });
  }
  if (saveStatus === 'saved') {
    return t('topikWriting.session.saved', { defaultValue: '✓ Saved' });
  }
  if (saveStatus === 'error') {
    return t('topikWriting.session.saveError', { defaultValue: 'Save Failed' });
  }
  return t('topikWriting.session.saveIdle', { defaultValue: 'Auto-save' });
}

const SessionHeader: React.FC<{
  isMobile: boolean;
  t: WritingTranslationFn;
  questions: WritingQuestion[];
  activeQuestion: number;
  localAnswers: Record<number, string>;
  answeredCount: number;
  totalScore: number;
  saveStatus: SaveStatus;
  remainingMs: number;
  isSubmitting: boolean;
  isExiting: boolean;
  onSelectQuestion: (questionNumber: number) => void;
  onRequestExit: () => void;
  onRequestSubmit: () => void;
}> = ({
  isMobile,
  t,
  questions,
  activeQuestion,
  localAnswers,
  answeredCount,
  totalScore,
  saveStatus,
  remainingMs,
  isSubmitting,
  isExiting,
  onSelectQuestion,
  onRequestExit,
  onRequestSubmit,
}) => {
  if (isMobile) {
    return (
      <MobileImmersiveHeader
        eyebrow={t('dashboard.topik.writing', { defaultValue: 'TOPIK Writing' })}
        title={t('topikWriting.title', { defaultValue: 'TOPIK II Writing' })}
        subtitle={t('topikWriting.session.mobileHeaderSubtitle', {
          active: activeQuestion,
          answered: answeredCount,
          total: questions.length,
          defaultValue: `Question ${activeQuestion} · ${answeredCount}/${questions.length} answered`,
        })}
        onBack={onRequestExit}
        backLabel={t('dashboard.topik.controller.exit', { defaultValue: 'Exit' })}
        status={
          <div className="rounded-2xl border border-border bg-card px-3 py-2 text-right shadow-sm">
            <div className="text-[9px] font-black uppercase tracking-[0.18em] text-muted-foreground">
              {t('topikWriting.session.time', { defaultValue: 'Time' })}
            </div>
            <div className="mt-1 text-sm font-black text-foreground">{formatTime(remainingMs)}</div>
          </div>
        }
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="rounded-2xl border border-border bg-card px-3 py-2 shadow-sm">
              <div className="text-[9px] font-black uppercase tracking-[0.18em] text-muted-foreground">
                {t('topikWriting.session.progress', { defaultValue: 'Progress' })}
              </div>
              <div className="mt-1 text-sm font-black text-foreground">
                {answeredCount}/{questions.length} · {totalScore}{' '}
                {t('topikWriting.session.points', { defaultValue: 'pts' })}
              </div>
            </div>
            <div
              className={cn('text-[11px] font-bold transition-all', getSaveStatusClass(saveStatus))}
            >
              {getSaveStatusText(saveStatus, t)}
            </div>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {questions.map(question => (
              <QuestionTab
                key={question.number}
                number={question.number}
                isActive={question.number === activeQuestion}
                hasContent={hasMeaningfulContent(
                  question.number,
                  localAnswers[question.number] ?? ''
                )}
                onClick={() => onSelectQuestion(question.number)}
              />
            ))}
          </div>

          <Button
            type="button"
            variant="ghost"
            size="auto"
            onClick={onRequestSubmit}
            disabled={isSubmitting || isExiting}
            className="h-11 w-full rounded-2xl border-2 border-primary bg-primary text-sm font-black text-primary-foreground shadow-sm disabled:opacity-50"
          >
            <Send size={14} className="mr-2" />
            {t('topikWriting.session.submitButton', { defaultValue: 'Submit' })}
          </Button>
        </div>
      </MobileImmersiveHeader>
    );
  }

  // On desktop, we hide the top bar to maximize vertical space for writing.
  // All status information (Timer, Progress, Navigator, Save state) is already visible in the sidebar.
  return null;
};

const SubmitConfirmDialog: React.FC<{
  open: boolean;
  isMobile: boolean;
  t: WritingTranslationFn;
  answeredCount: number;
  totalQuestions: number;
  isSubmitting: boolean;
  isExiting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}> = ({
  open,
  isMobile,
  t,
  answeredCount,
  totalQuestions,
  isSubmitting,
  isExiting,
  onCancel,
  onConfirm,
}) => {
  if (!open) return null;
  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex backdrop-blur-sm',
        isMobile
          ? 'items-end justify-center px-4 pb-[calc(var(--mobile-safe-bottom)+16px)] pt-16'
          : 'items-center justify-center'
      )}
      style={{ backgroundColor: 'rgba(251,248,243,0.78)' }}
    >
      <div
        className={cn(
          'w-full max-w-md space-y-5 border-2 border-border bg-card shadow-2xl',
          isMobile ? 'rounded-[28px] p-6' : 'mx-4 rounded-2xl p-8'
        )}
      >
        <div className="flex items-center gap-3">
          <AlertTriangle size={28} className="text-amber-500 shrink-0" />
          <div>
            <h3 className="font-black text-foreground text-lg">
              {t('topikWriting.session.submitConfirmTitle', { defaultValue: 'Submit Exam?' })}
            </h3>
            <p className="text-muted-foreground text-sm mt-1">
              {t('topikWriting.session.submitConfirmDesc', {
                ans: answeredCount,
                total: totalQuestions,
                defaultValue: `Answered ${answeredCount}/${totalQuestions} questions. You cannot change your answers after submitting.`,
              })}
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button
            type="button"
            variant="ghost"
            size="auto"
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl border-2 border-border font-bold text-sm text-foreground hover:bg-muted transition"
          >
            {t('topikWriting.session.continueForm', { defaultValue: 'Continue' })}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="auto"
            onClick={onConfirm}
            disabled={isSubmitting || isExiting}
            className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground font-black text-sm hover:opacity-90 transition disabled:opacity-50"
          >
            {isSubmitting
              ? t('topikWriting.session.submitting', { defaultValue: 'Submitting...' })
              : t('topikWriting.session.confirmSubmit', { defaultValue: 'Confirm Submit' })}
          </Button>
        </div>
      </div>
    </div>
  );
};

const ExitConfirmDialog: React.FC<{
  open: boolean;
  isMobile: boolean;
  t: WritingTranslationFn;
  isSubmitting: boolean;
  isExiting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}> = ({ open, isMobile, t, isSubmitting, isExiting, onCancel, onConfirm }) => {
  if (!open) return null;
  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex backdrop-blur-sm',
        isMobile
          ? 'items-end justify-center px-4 pb-[calc(var(--mobile-safe-bottom)+16px)] pt-16'
          : 'items-center justify-center'
      )}
      style={{ backgroundColor: 'rgba(251,248,243,0.78)' }}
    >
      <div
        className={cn(
          'w-full max-w-md space-y-5 border-2 border-border bg-card shadow-2xl',
          isMobile ? 'rounded-[28px] p-6' : 'mx-4 rounded-2xl p-8'
        )}
      >
        <div className="flex items-center gap-3">
          <AlertTriangle size={28} className="text-amber-500 shrink-0" />
          <div>
            <h3 className="font-black text-foreground text-lg">
              {t('topikWriting.session.exitConfirmTitle', { defaultValue: 'Exit Exam?' })}
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
          <Button
            type="button"
            variant="ghost"
            size="auto"
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl border-2 border-border font-bold text-sm text-foreground hover:bg-muted transition"
          >
            {t('topikWriting.session.continueForm', { defaultValue: 'Continue' })}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="auto"
            onClick={onConfirm}
            disabled={isSubmitting || isExiting}
            className="flex-1 py-2.5 rounded-xl bg-card border-2 border-border text-foreground font-black text-sm hover:bg-muted transition disabled:opacity-50"
          >
            {isExiting
              ? t('topikWriting.session.exiting', { defaultValue: 'Exiting...' })
              : t('dashboard.topik.controller.exit', { defaultValue: 'Exit' })}
          </Button>
        </div>
      </div>
    </div>
  );
};

function DRail({
  kanji,
  title,
  action,
  children,
  pad = 14,
}: {
  kanji?: string;
  title: string;
  action?: string;
  children: React.ReactNode;
  pad?: number;
}) {
  return (
    <div className="mb-3">
      <div className="mb-2 flex items-baseline px-0.5">
        {kanji && (
          <span className="mr-2 font-serif text-[14px] font-bold" style={{ color: KT.crimson }}>
            {kanji}
          </span>
        )}
        <span className="text-[12px] font-extrabold" style={{ color: KT.ink }}>
          {title}
        </span>
        {action && (
          <span className="ml-auto cursor-pointer text-[11px] font-bold" style={{ color: KT.sub }}>
            {action}
          </span>
        )}
      </div>
      <div
        className="rounded-[14px] border"
        style={{
          padding: pad,
          background: KT.card,
          borderColor: KT.line2,
          boxShadow: KT.shSm,
        }}
      >
        {children}
      </div>
    </div>
  );
}

const WritingSessionBody: React.FC<{
  isMobile: boolean;
  t: WritingTranslationFn;
  questions: WritingQuestion[];
  currentQuestion: WritingQuestion | undefined;
  isDualFillQuestion: boolean;
  isImageOnlyPromptQuestion: boolean;
  localAnswers: Record<number, string>;
  saveStatus: SaveStatus;
  remainingMs: number;
  isSubmitting: boolean;
  isExiting: boolean;
  onSelectQuestion: (questionNumber: number) => void;
  onAnswerChange: (questionNumber: number, text: string) => void;
  onRequestExit: () => void;
  onRequestSubmit: () => void;
}> = ({
  isMobile,
  t,
  questions,
  currentQuestion,
  isDualFillQuestion,
  isImageOnlyPromptQuestion,
  localAnswers,
  saveStatus,
  remainingMs,
  isSubmitting,
  isExiting,
  onSelectQuestion,
  onAnswerChange,
  onRequestExit,
  onRequestSubmit,
}) => {
  const activeQuestionNumber = currentQuestion?.number;
  const [expandedImageQuestion, setExpandedImageQuestion] = useState<number | null>(null);

  if (!currentQuestion) return null;
  const isDesktopImageExpanded =
    expandedImageQuestion === activeQuestionNumber && Boolean(currentQuestion.image);

  const maxLength = MAX_LENGTH[currentQuestion.number] ?? 200;

  if (isMobile && isDualFillQuestion) {
    return (
      <div
        className={cn(
          'flex-1 overflow-y-auto bg-muted/20',
          isMobile ? 'px-4 pb-mobile-safe pt-4' : 'p-4 md:p-6 md:p-8'
        )}
      >
        <div className={cn('space-y-6', isMobile ? '' : 'max-w-5xl mx-auto')}>
          <section className="rounded-2xl border-2 border-border bg-card p-4 md:p-6 shadow-sm">
            <div className="flex items-center gap-3 flex-wrap mb-4">
              <div className="flex items-center gap-2 bg-primary text-primary-foreground px-3 py-2 rounded-lg font-black text-sm">
                {t('topikWriting.session.questionX', {
                  num: currentQuestion.number,
                  defaultValue: `Question ${currentQuestion.number}`,
                })}
              </div>
              <div className="text-sm font-bold text-muted-foreground bg-muted px-3 py-1.5 rounded-md border border-border">
                {currentQuestion.score} {t('topikWriting.session.points', { defaultValue: 'pts' })}
              </div>
            </div>
            <QuestionPrompt
              question={currentQuestion}
              hideTextContent={isImageOnlyPromptQuestion}
              hideMetaHeader
            />
          </section>

          <section className="rounded-2xl border-2 border-border bg-background p-4 md:p-6 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-black text-sm text-foreground uppercase tracking-wide">
                {t('topikWriting.session.answerArea', { defaultValue: 'Answer Area' })}
              </h3>
              <span className="text-xs text-muted-foreground font-medium">
                {t('topikWriting.session.maxLength', {
                  count: maxLength,
                  defaultValue: `Max ${maxLength} chars`,
                })}
              </span>
            </div>
            <DualFillBlankInputs
              value={localAnswers[currentQuestion.number] ?? ''}
              onChange={text => onAnswerChange(currentQuestion.number, text)}
              maxLength={maxLength}
            />
          </section>
        </div>
      </div>
    );
  }

  if (isMobile) {
    return (
      <div className="flex-1 overflow-y-auto bg-muted/20 px-4 pb-mobile-safe pt-4">
        <div className="space-y-4">
          <section className="rounded-2xl border-2 border-border bg-card p-4 shadow-sm">
            <QuestionPrompt question={currentQuestion} />
          </section>

          <section className="rounded-2xl border-2 border-border bg-background p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-black text-sm uppercase tracking-wide text-foreground">
                {WONGOJI_QUESTIONS.has(currentQuestion.number)
                  ? t('topikWriting.session.wongojiAnswer', { defaultValue: 'Wongoji Answer' })
                  : t('topikWriting.session.answerArea', { defaultValue: 'Answer Area' })}
              </h3>
              <span className="text-xs font-medium text-muted-foreground">
                {t('topikWriting.session.maxLength', {
                  count: MAX_LENGTH[currentQuestion.number] ?? 600,
                  defaultValue: `Max ${MAX_LENGTH[currentQuestion.number] ?? 600} chars`,
                })}
              </span>
            </div>

            {WONGOJI_QUESTIONS.has(currentQuestion.number) ? (
              <WongojiEditor
                value={localAnswers[currentQuestion.number] ?? ''}
                onChange={text => onAnswerChange(currentQuestion.number, text)}
                maxLength={MAX_LENGTH[currentQuestion.number] ?? 600}
                className="flex-1"
              />
            ) : (
              <FillBlankTextarea
                value={localAnswers[currentQuestion.number] ?? ''}
                onChange={text => onAnswerChange(currentQuestion.number, text)}
                maxLength={MAX_LENGTH[currentQuestion.number] ?? 200}
              />
            )}
          </section>
        </div>
      </div>
    );
  }

  const currentAnswer = localAnswers[currentQuestion.number] ?? '';
  const maxAnswerLength = MAX_LENGTH[currentQuestion.number] ?? 200;
  const currentQuestionTypeLabel = getQuestionTypeLabel(currentQuestion.questionType, t);
  const dualFillAnswer = isDualFillQuestion ? parseDualFillAnswer(currentAnswer) : null;
  const currentCharCount = dualFillAnswer
    ? dualFillAnswer.slotA.length + dualFillAnswer.slotB.length
    : currentAnswer.length;
  const remainingChars = Math.max(0, maxAnswerLength - currentCharCount);
  const isLongFormQuestion = WONGOJI_QUESTIONS.has(currentQuestion.number);
  const isOpinionPromptQuestion = currentQuestion.questionType === 'OPINION_ESSAY';
  const isTextOnlyPromptQuestion = !currentQuestion.image;
  const completedQuestionCount = questions.filter(question =>
    hasMeaningfulContent(question.number, localAnswers[question.number] ?? '')
  ).length;
  const totalScore = questions.reduce((sum, question) => sum + question.score, 0);
  const questionMeta = t('topikWriting.session.desktopQuestionMeta', {
    num: currentQuestion.number,
    score: currentQuestion.score,
    type: currentQuestionTypeLabel,
    defaultValue: `Question ${currentQuestion.number} · ${currentQuestionTypeLabel} · ${currentQuestion.score} pts`,
  });

  return (
    <div
      className="flex-1 overflow-hidden px-3 py-3 lg:px-4 lg:py-4"
      style={{ backgroundColor: KT.bg }}
    >
      <div
        data-testid="desktop-writing-layout"
        className="mx-auto grid h-full min-h-0 max-w-[1680px] gap-4 xl:grid-cols-[minmax(0,1fr)_214px]"
      >
        <div className="flex min-h-0 flex-col gap-4">
          <div
            className={cn(
              'flex min-h-0 flex-col rounded-[16px] border',
              isDesktopImageExpanded
                ? 'basis-[48%] p-3 lg:p-3'
                : isTextOnlyPromptQuestion
                  ? 'p-4 lg:p-5'
                  : 'p-4 lg:p-5'
            )}
            style={{ backgroundColor: KT.card, borderColor: KT.line2 }}
          >
            {!isDesktopImageExpanded && (
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <DesignChip tone="pink">
                  {t('topikWriting.session.questionX', {
                    num: currentQuestion.number,
                    defaultValue: `Question ${currentQuestion.number}`,
                  })}
                </DesignChip>
                <DesignChip tone="butter">
                  {currentQuestion.score}{' '}
                  {t('topikWriting.session.points', { defaultValue: 'pts' })}
                </DesignChip>
                <DesignChip tone="sky">{currentQuestionTypeLabel}</DesignChip>
              </div>
            )}

            <div className={cn('min-h-0', isDesktopImageExpanded ? 'flex flex-1' : 'space-y-4')}>
              {!isDesktopImageExpanded && (
                <div className={cn('space-y-3', isTextOnlyPromptQuestion ? 'w-full' : '')}>
                  {currentQuestion.instruction ? (
                    <div
                      className={cn(
                        'whitespace-pre-wrap font-semibold',
                        isTextOnlyPromptQuestion
                          ? 'text-[17px] leading-7 lg:text-[18px]'
                          : 'text-[15px] leading-7 lg:text-[16px]'
                      )}
                      style={{
                        color: KT.ink,
                        wordBreak: isTextOnlyPromptQuestion ? 'keep-all' : undefined,
                      }}
                    >
                      {currentQuestion.instruction}
                    </div>
                  ) : null}
                  {currentQuestion.contextBox ? (
                    <div
                      className={cn(
                        'rounded-[14px] border',
                        isOpinionPromptQuestion
                          ? 'px-5 py-4 text-[15px] leading-8 lg:text-[16px]'
                          : isTextOnlyPromptQuestion
                            ? 'px-5 py-4 text-[15px] leading-8 lg:text-[16px]'
                            : 'max-h-[220px] overflow-auto p-4 text-[14px] leading-7'
                      )}
                      style={{
                        backgroundColor: isTextOnlyPromptQuestion ? KT.bg : KT.bg,
                        borderColor: KT.line,
                        color: KT.ink2,
                        wordBreak: isTextOnlyPromptQuestion ? 'keep-all' : undefined,
                      }}
                    >
                      <div className={cn('whitespace-pre-wrap', isOpinionPromptQuestion ? '' : '')}>
                        {currentQuestion.contextBox}
                      </div>
                    </div>
                  ) : null}
                </div>
              )}

              {currentQuestion.image && (
                <div
                  className={cn(
                    'relative flex min-h-0 items-center justify-center overflow-hidden rounded-[14px] border',
                    isDesktopImageExpanded ? 'flex-1 px-3 py-3' : 'px-4 py-3'
                  )}
                  style={{ backgroundColor: KT.bg, borderColor: KT.line }}
                >
                  <Button
                    type="button"
                    variant="ghost"
                    size="auto"
                    onClick={() =>
                      setExpandedImageQuestion(
                        isDesktopImageExpanded ? null : currentQuestion.number
                      )
                    }
                    className="absolute right-3 top-3 z-10 h-9 rounded-full border px-3 text-[12px] font-black shadow-sm"
                    style={{ backgroundColor: KT.card, borderColor: KT.line2, color: KT.ink }}
                  >
                    {isDesktopImageExpanded ? (
                      <X size={14} className="mr-1.5" />
                    ) : (
                      <ZoomIn size={14} className="mr-1.5" />
                    )}
                    {isDesktopImageExpanded
                      ? t('topikWriting.session.collapseImage', { defaultValue: 'Collapse image' })
                      : t('topikWriting.session.expandImage', { defaultValue: 'Expand image' })}
                  </Button>
                  <img
                    src={currentQuestion.image}
                    alt={questionMeta}
                    className={cn(
                      'max-w-full rounded-[8px] object-contain',
                      isDesktopImageExpanded ? 'h-full w-full' : ''
                    )}
                    style={{
                      maxHeight: isDesktopImageExpanded
                        ? '100%'
                        : isLongFormQuestion
                          ? '340px'
                          : '260px',
                    }}
                  />
                </div>
              )}
            </div>
          </div>

          <div
            data-testid="desktop-answer-panel"
            className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[16px] border"
            style={{ backgroundColor: KT.card, borderColor: KT.line2 }}
          >
            <div
              className="flex flex-wrap items-center gap-2 border-b px-4 py-3"
              style={{ backgroundColor: KT.bg2, borderColor: KT.line2 }}
            >
              <span className="font-extrabold text-[13px]" style={{ color: KT.ink }}>
                {isLongFormQuestion
                  ? t('topikWriting.session.writingSheet', { defaultValue: 'Writing sheet' })
                  : t('topikWriting.session.answerArea', { defaultValue: 'Answer area' })}
              </span>
              <span
                className="rounded-full px-3 py-1 text-[11px] font-bold"
                style={{ backgroundColor: KT.bg, color: KT.sub }}
              >
                {t('topikWriting.session.characterCount', {
                  count: currentCharCount,
                  defaultValue: '{{count}} chars',
                })}
              </span>
              <span
                className="rounded-full px-3 py-1 text-[11px] font-bold"
                style={{ backgroundColor: KT.bg, color: remainingChars > 0 ? KT.sub : KT.mintDeep }}
              >
                {t('topikWriting.session.remainingChars', {
                  count: remainingChars,
                  defaultValue: '{{count}} left',
                })}
              </span>

              <div className="flex-1" />
              <span
                className="flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-black"
                style={{ backgroundColor: KT.butter, color: KT.butterDeep }}
              >
                <Clock size={14} />
                {formatTime(remainingMs)}
              </span>
            </div>

            <div
              className={cn(
                'flex min-h-0 flex-1 flex-col',
                isLongFormQuestion ? 'p-3 lg:p-4' : 'p-4'
              )}
            >
              {isLongFormQuestion ? (
                <WongojiEditor
                  value={currentAnswer}
                  onChange={text => onAnswerChange(currentQuestion.number, text)}
                  maxLength={maxAnswerLength}
                  className={cn(
                    'h-full flex-1',
                    isDesktopImageExpanded ? 'min-h-0' : 'min-h-[560px]'
                  )}
                  surfaceTone="paper"
                  fullWidth
                />
              ) : isDualFillQuestion ? (
                <DualFillBlankInputs
                  value={currentAnswer}
                  onChange={text => onAnswerChange(currentQuestion.number, text)}
                  maxLength={maxAnswerLength}
                  compact
                />
              ) : (
                <FillBlankTextarea
                  value={currentAnswer}
                  onChange={text => onAnswerChange(currentQuestion.number, text)}
                  maxLength={maxAnswerLength}
                  compact
                />
              )}
            </div>
          </div>
        </div>

        <aside className="min-h-0 overflow-y-auto">
          <DRail
            title={t('topikWriting.session.examStatus', { defaultValue: 'Exam status' })}
            pad={12}
          >
            <div className="space-y-2">
              <div
                className="rounded-[10px] border px-3 py-2"
                style={{ borderColor: KT.line, background: KT.bg }}
              >
                <div className="text-[10px] font-bold" style={{ color: KT.sub }}>
                  {t('topikWriting.session.time', { defaultValue: 'Time' })}
                </div>
                <div
                  className="mt-1 flex items-center gap-1.5 text-[15px] font-black"
                  style={{ color: KT.ink }}
                >
                  <Clock size={14} />
                  {formatTime(remainingMs)}
                </div>
              </div>
              <div
                className="rounded-[10px] border px-3 py-2"
                style={{ borderColor: KT.line, background: KT.bg }}
              >
                <div className="text-[10px] font-bold" style={{ color: KT.sub }}>
                  {t('topikWriting.session.progress', { defaultValue: 'Progress' })}
                </div>
                <div className="mt-1 text-[15px] font-black" style={{ color: KT.ink }}>
                  {completedQuestionCount}/{questions.length}
                </div>
                <div className="text-[11px] font-medium" style={{ color: KT.sub }}>
                  {t('topikWriting.session.pointsSummary', {
                    total: totalScore,
                    defaultValue: '{{total}} pts total',
                  })}
                </div>
              </div>
              <div
                className="rounded-[10px] border px-3 py-2"
                style={{ borderColor: KT.line, background: KT.bg }}
              >
                <div className="text-[10px] font-bold" style={{ color: KT.sub }}>
                  {t('topikWriting.session.saveState', { defaultValue: 'Save state' })}
                </div>
                <div className={cn('mt-1 text-[12px] font-black', getSaveStatusClass(saveStatus))}>
                  {getSaveStatusText(saveStatus, t)}
                </div>
              </div>
            </div>
          </DRail>

          <DRail
            title={t('topikWriting.session.questionNavigator', {
              defaultValue: 'Question navigator',
            })}
            pad={12}
          >
            <div className="grid grid-cols-2 gap-2">
              {questions.map(question => {
                const isCurrent = question.number === currentQuestion.number;
                const hasAnswer = hasMeaningfulContent(
                  question.number,
                  localAnswers[question.number] ?? ''
                );
                return (
                  <button
                    key={question.number}
                    type="button"
                    onClick={() => onSelectQuestion(question.number)}
                    className="rounded-[10px] border px-3 py-2 text-left transition-opacity hover:opacity-80"
                    style={{
                      backgroundColor: isCurrent ? KT.pink : hasAnswer ? KT.mint : KT.bg,
                      borderColor: isCurrent ? KT.pinkDeep : hasAnswer ? KT.mintDeep : KT.line,
                      color: KT.ink,
                    }}
                  >
                    <div className="text-[13px] font-black">
                      {t('topikWriting.session.questionX', {
                        questionNumber: question.number,
                        defaultValue: `Question ${question.number}`,
                      })}
                    </div>
                    <div className="mt-1 text-[10px] font-semibold" style={{ color: KT.sub }}>
                      {hasAnswer
                        ? t('topikWriting.session.completed', { defaultValue: 'Done' })
                        : isCurrent
                          ? t('topikWriting.session.current', { defaultValue: 'Current' })
                          : t('topikWriting.session.pending', { defaultValue: 'Pending' })}
                    </div>
                  </button>
                );
              })}
            </div>
          </DRail>

          <div className="grid gap-2">
            <Button
              type="button"
              variant="ghost"
              size="auto"
              onClick={onRequestSubmit}
              disabled={isSubmitting || isExiting}
              className="h-11 justify-center rounded-[12px] text-[13px] font-black"
              style={{ backgroundColor: KT.crimson, color: KT.card }}
            >
              <Send size={15} className="mr-2" />
              {isSubmitting
                ? t('topikWriting.session.submitting', { defaultValue: 'Submitting...' })
                : t('topikWriting.session.submitButton', { defaultValue: 'Submit' })}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="auto"
              onClick={onRequestExit}
              disabled={isSubmitting || isExiting}
              className="h-10 justify-center rounded-[12px] border text-[13px] font-black"
              style={{ backgroundColor: KT.card, borderColor: KT.line2, color: KT.ink }}
            >
              <LogOut size={15} className="mr-2" />
              {isExiting
                ? t('topikWriting.session.exiting', { defaultValue: 'Exiting...' })
                : t('dashboard.topik.controller.exit', { defaultValue: 'Exit' })}
            </Button>
          </div>
        </aside>
      </div>
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
  onSubmitError,
  onExit,
}) => {
  const { t, i18n } = useTranslation();
  const isMobile = useIsMobile();

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

  const [activeQuestion, setActiveQuestion] = useState<number>(questions[0]?.number ?? 51);
  const [remainingMs, setRemainingMs] = useState<number>(endTime - Date.now());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');

  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasAutoSubmitted = useRef(false);
  const handleSubmitRef = useRef<(forced?: boolean) => Promise<void>>(async () => {});

  // ── Timer ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = endTime - Date.now();
      setRemainingMs(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
        if (!hasAutoSubmitted.current) {
          hasAutoSubmitted.current = true;
          void handleSubmitRef.current(true);
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [endTime]);

  // ── Debounced auto-save ───────────────────────────────────────────────────
  useEffect(() => {
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    if (isSubmitting || isExiting || isSubmitted) return;

    setSaveStatus('idle');
    autoSaveTimerRef.current = setTimeout(async () => {
      setSaveStatus('saving');
      try {
        const answersRecord: Record<string, string> = {};
        for (const [k, v] of Object.entries(localAnswers)) {
          answersRecord[String(k)] = v;
        }
        await saveDraft({ sessionId, answers: answersRecord });
        setSaveStatus('saved');
      } catch {
        setSaveStatus('error');
      }
    }, 2000);

    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [localAnswers, sessionId, saveDraft, isSubmitting, isExiting, isSubmitted]);

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

  const handleSubmit = useCallback(
    async (_forced = false) => {
      if (isSubmitting || isSubmitted || isExiting) return;

      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }
      setIsSubmitting(true);
      setShowConfirm(false);
      setShowExitConfirm(false);

      try {
        // Final save before submit
        const answersRecord = buildAnswersRecord();
        await saveDraft({ sessionId, answers: answersRecord });
        await submitSession({ sessionId, language: i18n.language });
        setIsSubmitted(true);
        onSubmitted?.(answersRecord);
      } catch (error) {
        onSubmitError?.(error);
        setIsSubmitting(false);
      }
    },
    [
      isSubmitting,
      isSubmitted,
      isExiting,
      buildAnswersRecord,
      sessionId,
      saveDraft,
      submitSession,
      i18n.language,
      onSubmitted,
      onSubmitError,
    ]
  );

  useEffect(() => {
    handleSubmitRef.current = handleSubmit;
  }, [handleSubmit]);

  const handleExit = useCallback(async () => {
    if (isSubmitting || isSubmitted || isExiting) return;

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }
    setIsExiting(true);
    setShowExitConfirm(false);

    try {
      // Best-effort save before leaving so users can resume later.
      const answersRecord = buildAnswersRecord();
      try {
        await saveDraft({ sessionId, answers: answersRecord });
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
    hasMeaningfulContent(q.number, localAnswers[q.number] ?? '')
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
            {t('topikWriting.session.submittedDesc', {
              ans: answeredCount,
              total: questions.length,
              defaultValue: `Answered ${answeredCount} / ${questions.length} questions. Waiting for AI evaluation...`,
            })}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex h-screen h-[100dvh] flex-col font-sans',
        isMobile ? 'bg-background' : 'bg-[#FBF8F3]'
      )}
    >
      <SessionHeader
        isMobile={isMobile}
        t={t}
        questions={questions}
        activeQuestion={activeQuestion}
        localAnswers={localAnswers}
        answeredCount={answeredCount}
        totalScore={totalScore}
        saveStatus={saveStatus}
        remainingMs={remainingMs}
        isSubmitting={isSubmitting}
        isExiting={isExiting}
        onSelectQuestion={setActiveQuestion}
        onRequestExit={() => setShowExitConfirm(true)}
        onRequestSubmit={() => setShowConfirm(true)}
      />

      <SubmitConfirmDialog
        open={showConfirm}
        isMobile={isMobile}
        t={t}
        answeredCount={answeredCount}
        totalQuestions={questions.length}
        isSubmitting={isSubmitting}
        isExiting={isExiting}
        onCancel={() => setShowConfirm(false)}
        onConfirm={() => {
          void handleSubmit(true);
        }}
      />

      <ExitConfirmDialog
        open={showExitConfirm}
        isMobile={isMobile}
        t={t}
        isSubmitting={isSubmitting}
        isExiting={isExiting}
        onCancel={() => setShowExitConfirm(false)}
        onConfirm={() => {
          void handleExit();
        }}
      />

      <WritingSessionBody
        isMobile={isMobile}
        t={t}
        questions={questions}
        currentQuestion={currentQuestion}
        isDualFillQuestion={isDualFillQuestion}
        isImageOnlyPromptQuestion={isImageOnlyPromptQuestion}
        localAnswers={localAnswers}
        saveStatus={saveStatus}
        remainingMs={remainingMs}
        isSubmitting={isSubmitting}
        isExiting={isExiting}
        onSelectQuestion={setActiveQuestion}
        onAnswerChange={handleAnswerChange}
        onRequestExit={() => setShowExitConfirm(true)}
        onRequestSubmit={() => setShowConfirm(true)}
      />
    </div>
  );
};

export default WritingExamSession;
