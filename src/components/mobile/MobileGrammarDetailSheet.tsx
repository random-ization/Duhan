import React, { useEffect, useRef, useState } from 'react';
import { X, Trophy, AlertCircle, Eye, EyeOff, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { GrammarPointData } from '../../types';
import { useAction, useMutation } from 'convex/react';
import type { Id } from '../../../convex/_generated/dataModel';
import { aRef, mRef } from '../../utils/convexRefs';
import { useTranslation } from 'react-i18next';
import {
  sanitizeGrammarDisplayText,
  sanitizeGrammarMarkdown,
  stripLeadingDuplicateHeading,
  GRAMMAR_MASK_ANSWER_TOKEN,
  GRAMMAR_MASK_ANSWER_END_TOKEN,
  GRAMMAR_MASK_ANSWER_START_TOKEN,
  GRAMMAR_MASK_TRANSLATION_TOKEN,
  GRAMMAR_MASK_TRANSLATION_END_TOKEN,
  GRAMMAR_MASK_TRANSLATION_START_TOKEN,
  getGrammarMaskKind,
  stripGrammarMaskTokens,
} from '../../utils/grammarDisplaySanitizer';
import { remarkGrammarMasking } from '../../utils/grammarMaskingRemark';
import { safeGetLocalStorageItem, safeSetLocalStorageItem } from '../../utils/browserStorage';
import { Button } from '../ui';
import { Input } from '../ui';
import { Sheet, SheetContent, SheetOverlay, SheetPortal } from '../ui';

interface MobileGrammarDetailSheetProps {
  readonly grammar: GrammarPointData | null;
  readonly onClose: () => void;
  readonly onProficiencyUpdate?: (
    grammarId: string,
    proficiency: number,
    status: GrammarPointData['status']
  ) => void;
  readonly instituteId: string;
}

type AiCheckResponse = {
  success?: boolean;
  data?: { nuance?: unknown; isCorrect?: unknown; corrected?: unknown };
} | null;

type AiFeedbackState = {
  isCorrect: boolean;
  feedback: string;
  correctedSentence?: string;
  progress?: { proficiency: number; status: string };
};
type SupportedLanguage = 'zh' | 'en' | 'vi' | 'mn';

const NEGATIVE_FEEDBACK_MARKERS = ['incorrect', '\u9519\u8BEF', 'Incorrect'] as const;

const getFeedbackText = (nuance: unknown): string =>
  typeof nuance === 'string' ? nuance : 'Analysis complete';

const isNegativeFeedback = (feedback: string): boolean =>
  NEGATIVE_FEEDBACK_MARKERS.some(marker =>
    marker === 'incorrect' ? feedback.toLowerCase().startsWith(marker) : feedback.includes(marker)
  );

const triggerConfetti = (setShowConfetti: (value: boolean) => void) => {
  setShowConfetti(true);
  setTimeout(() => setShowConfetti(false), 2000);
};

const getRulesObject = (grammar: GrammarPointData): Record<string, unknown> =>
  (grammar.conjugationRules ?? grammar.construction ?? {}) as Record<string, unknown>;

const getExamples = (
  grammar: GrammarPointData
): Array<{ kr?: string; cn?: string; en?: string; vi?: string; mn?: string }> =>
  Array.isArray(grammar.examples)
    ? (grammar.examples as Array<{
        kr?: string;
        cn?: string;
        en?: string;
        vi?: string;
        mn?: string;
      }>)
    : [];

const resolveSupportedLanguage = (language?: string): SupportedLanguage => {
  const normalized = (language || '').toLowerCase();
  if (normalized.startsWith('en')) return 'en';
  if (normalized.startsWith('vi')) return 'vi';
  if (normalized.startsWith('mn')) return 'mn';
  if (normalized.startsWith('zh') || normalized.startsWith('cn')) return 'zh';
  return 'zh';
};

const getLocalizedTitle = (grammar: GrammarPointData, language: SupportedLanguage): string => {
  if (language === 'en') return sanitizeGrammarDisplayText(grammar.titleEn || grammar.title);
  if (language === 'vi') return sanitizeGrammarDisplayText(grammar.titleVi || grammar.title);
  if (language === 'mn') return sanitizeGrammarDisplayText(grammar.titleMn || grammar.title);
  return sanitizeGrammarDisplayText(grammar.titleZh || grammar.title);
};

const getLocalizedSummary = (grammar: GrammarPointData, language: SupportedLanguage): string => {
  const candidates =
    language === 'en'
      ? [grammar.summaryEn, grammar.summary, grammar.summaryVi, grammar.summaryMn]
      : language === 'vi'
        ? [grammar.summaryVi, grammar.summaryEn, grammar.summary, grammar.summaryMn]
        : language === 'mn'
          ? [grammar.summaryMn, grammar.summaryEn, grammar.summary, grammar.summaryVi]
          : [grammar.summary, grammar.summaryEn, grammar.summaryVi, grammar.summaryMn];

  return sanitizeGrammarDisplayText(
    candidates.find(text => typeof text === 'string' && text.trim().length > 0) || ''
  );
};

const getLocalizedExplanation = (
  grammar: GrammarPointData,
  language: SupportedLanguage
): string => {
  const candidates =
    language === 'en'
      ? [grammar.explanationEn, grammar.explanation, grammar.explanationVi, grammar.explanationMn]
      : language === 'vi'
        ? [grammar.explanationVi, grammar.explanationEn, grammar.explanation, grammar.explanationMn]
        : language === 'mn'
          ? [
              grammar.explanationMn,
              grammar.explanationEn,
              grammar.explanation,
              grammar.explanationVi,
            ]
          : [
              grammar.explanation,
              grammar.explanationEn,
              grammar.explanationVi,
              grammar.explanationMn,
            ];

  return sanitizeGrammarMarkdown(
    candidates.find(text => typeof text === 'string' && text.trim().length > 0) || ''
  );
};

const RED_EYE_STORAGE_KEY = 'grammar_mobile_red_eye';

function extractTextContent(node: React.ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(extractTextContent).join('');
  if (React.isValidElement(node))
    return extractTextContent((node.props as { children?: React.ReactNode }).children);
  return '';
}

function getRedEyeMaskClass(enabled: boolean): string {
  return enabled ? 'blur-sm hover:blur-none select-none transition-all duration-200' : '';
}

function getStandaloneLineMaskKind(input: string): 'translation' | 'answer' | null {
  const stripped = stripGrammarMaskTokens(input).trim();
  if (stripped.length > 0) return null;
  if (input.includes(GRAMMAR_MASK_TRANSLATION_TOKEN)) return 'translation';
  if (input.includes(GRAMMAR_MASK_ANSWER_TOKEN)) return 'answer';
  return null;
}

function wrapMaskedInlineNode(
  node: React.ReactNode,
  maskKind: 'translation' | 'answer',
  redEyeEnabled: boolean,
  key: string
): React.ReactNode {
  return (
    <span key={key} data-grammar-mask={maskKind} className={getRedEyeMaskClass(redEyeEnabled)}>
      {node}
    </span>
  );
}

function renderMaskedTextSegments(input: string, redEyeEnabled: boolean): React.ReactNode[] {
  const segments: React.ReactNode[] = [];
  let remaining = input;
  let key = 0;

  while (remaining.length > 0) {
    const indices = [
      { kind: 'translation-line', index: remaining.indexOf(GRAMMAR_MASK_TRANSLATION_TOKEN) },
      { kind: 'answer-line', index: remaining.indexOf(GRAMMAR_MASK_ANSWER_TOKEN) },
      {
        kind: 'translation-inline',
        index: remaining.indexOf(GRAMMAR_MASK_TRANSLATION_START_TOKEN),
      },
      { kind: 'answer-inline', index: remaining.indexOf(GRAMMAR_MASK_ANSWER_START_TOKEN) },
    ].filter(item => item.index >= 0);

    if (indices.length === 0) {
      const cleanRemaining = stripGrammarMaskTokens(remaining);
      segments.push(cleanRemaining);
      break;
    }

    const next = indices.sort((a, b) => a.index - b.index)[0];
    if (next.index > 0) {
      const plainText = stripGrammarMaskTokens(remaining.slice(0, next.index));
      segments.push(plainText);
    }

    if (next.kind === 'translation-line' || next.kind === 'answer-line') {
      const token =
        next.kind === 'translation-line'
          ? GRAMMAR_MASK_TRANSLATION_TOKEN
          : GRAMMAR_MASK_ANSWER_TOKEN;
      const maskedContent = stripGrammarMaskTokens(remaining.slice(next.index + token.length));
      segments.push(
        <span
          key={`mask-${key++}`}
          data-grammar-mask={next.kind.startsWith('translation') ? 'translation' : 'answer'}
          className={getRedEyeMaskClass(redEyeEnabled)}
        >
          {maskedContent}
        </span>
      );
      break;
    }

    const startToken =
      next.kind === 'translation-inline'
        ? GRAMMAR_MASK_TRANSLATION_START_TOKEN
        : GRAMMAR_MASK_ANSWER_START_TOKEN;
    const endToken =
      next.kind === 'translation-inline'
        ? GRAMMAR_MASK_TRANSLATION_END_TOKEN
        : GRAMMAR_MASK_ANSWER_END_TOKEN;
    const endIndex = remaining.indexOf(endToken, next.index + startToken.length);
    if (endIndex < 0) {
      segments.push(stripGrammarMaskTokens(remaining));
      break;
    }
    const maskedContent = stripGrammarMaskTokens(
      remaining.slice(next.index + startToken.length, endIndex)
    );
    segments.push(
      <span
        key={`mask-${key++}`}
        data-grammar-mask={next.kind.startsWith('translation') ? 'translation' : 'answer'}
        className={getRedEyeMaskClass(redEyeEnabled)}
      >
        {maskedContent}
      </span>
    );
    remaining = remaining.slice(endIndex + endToken.length);
  }

  return segments;
}

function renderMaskedNode(node: React.ReactNode, redEyeEnabled: boolean): React.ReactNode {
  if (typeof node === 'string' || typeof node === 'number') {
    return renderMaskedTextSegments(String(node), redEyeEnabled);
  }
  if (Array.isArray(node)) {
    const rendered: React.ReactNode[] = [];
    let pendingMask: 'translation' | 'answer' | null = null;

    node.forEach((child, index) => {
      if (typeof child === 'string' || typeof child === 'number') {
        const text = String(child);
        const standaloneMaskKind = getStandaloneLineMaskKind(text);
        if (standaloneMaskKind) {
          pendingMask = standaloneMaskKind;
          return;
        }

        const renderedChild = renderMaskedNode(child, redEyeEnabled);
        if (pendingMask) {
          rendered.push(
            wrapMaskedInlineNode(renderedChild, pendingMask, redEyeEnabled, `masked-${index}`)
          );
        } else {
          rendered.push(<React.Fragment key={`masked-${index}`}>{renderedChild}</React.Fragment>);
        }
        return;
      }

      const renderedChild = renderMaskedNode(child, redEyeEnabled);
      if (pendingMask) {
        rendered.push(
          wrapMaskedInlineNode(renderedChild, pendingMask, redEyeEnabled, `masked-${index}`)
        );
      } else {
        rendered.push(<React.Fragment key={`masked-${index}`}>{renderedChild}</React.Fragment>);
      }
    });

    return rendered;
  }
  if (React.isValidElement(node)) {
    const props = node.props as { children?: React.ReactNode };
    return React.cloneElement(node, props, renderMaskedNode(props.children, redEyeEnabled));
  }
  return node;
}

const MarkdownRenderer: React.FC<{
  content: string;
  redEyeEnabled: boolean;
}> = ({ content, redEyeEnabled }) => {
  if (!content.trim()) return null;

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkGrammarMasking]}
      components={{
        h1: ({ children }) => (
          <h1 className="mt-6 mb-4 text-2xl font-black text-foreground">{children}</h1>
        ),
        h2: ({ children }) => (
          <h2 className="mt-8 mb-4 flex items-center gap-2 border-b border-border pb-2 text-xl font-bold text-foreground">
            <span className="text-indigo-500">❖</span>
            {children}
          </h2>
        ),
        h3: ({ children }) => (
          <h3 className="mt-6 mb-2 text-xs font-black uppercase tracking-widest text-muted-foreground">
            {children}
          </h3>
        ),
        p: ({ children, node: _node }) => {
          const rawText = extractTextContent(children);
          const maskKind = getGrammarMaskKind(rawText);

          return (
            <p
              className={`my-3 text-sm leading-relaxed text-muted-foreground ${
                maskKind ? getRedEyeMaskClass(redEyeEnabled) : ''
              }`}
            >
              {renderMaskedNode(children, maskKind ? false : redEyeEnabled)}
            </p>
          );
        },
        ul: ({ children }) => <ul className="my-3 list-disc space-y-1 pl-5">{children}</ul>,
        ol: ({ children }) => <ol className="my-3 list-decimal space-y-1 pl-5">{children}</ol>,
        li: ({ children, node: _node }) => {
          const rawText = extractTextContent(children);
          const maskKind = getGrammarMaskKind(rawText);
          return (
            <li
              className={`text-sm leading-relaxed text-muted-foreground ${
                maskKind ? getRedEyeMaskClass(redEyeEnabled) : ''
              }`}
            >
              {renderMaskedNode(children, maskKind ? false : redEyeEnabled)}
            </li>
          );
        },
        strong: ({ children }) => (
          <strong className="rounded bg-indigo-50 px-1 font-bold text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-300">
            {children}
          </strong>
        ),
        blockquote: ({ children }) => (
          <blockquote className="my-4 rounded-xl border-l-4 border-indigo-500 bg-indigo-50/50 p-4 italic text-muted-foreground dark:bg-indigo-950/20">
            {children}
          </blockquote>
        ),
        table: ({ children }) => (
          <div className="my-4 overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-xs text-left">{children}</table>
          </div>
        ),
        th: ({ children }) => (
          <th className="border-b border-border bg-muted px-3 py-2 font-bold">{children}</th>
        ),
        td: ({ children }) => {
          const rawText = extractTextContent(children);
          const maskKind = getGrammarMaskKind(rawText);
          return (
            <td
              className={`border-b border-border px-3 py-2 align-top ${
                maskKind ? getRedEyeMaskClass(redEyeEnabled) : ''
              }`}
            >
              {renderMaskedNode(children, maskKind ? false : redEyeEnabled)}
            </td>
          );
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
};

const getExampleTranslation = (
  example: { cn?: string; en?: string; vi?: string; mn?: string },
  language: SupportedLanguage
): string => {
  const candidates =
    language === 'en'
      ? [example.en, example.cn, example.vi, example.mn]
      : language === 'vi'
        ? [example.vi, example.en, example.cn, example.mn]
        : language === 'mn'
          ? [example.mn, example.en, example.cn, example.vi]
          : [example.cn, example.en, example.vi, example.mn];
  return sanitizeGrammarDisplayText(
    candidates.find(text => typeof text === 'string' && text.trim().length > 0) || ''
  );
};

const getLocalizedCustomNote = (grammar: GrammarPointData, language: SupportedLanguage): string => {
  const candidates =
    language === 'en'
      ? [grammar.customNoteEn, grammar.customNote, grammar.customNoteVi, grammar.customNoteMn]
      : language === 'vi'
        ? [grammar.customNoteVi, grammar.customNoteEn, grammar.customNote, grammar.customNoteMn]
        : language === 'mn'
          ? [grammar.customNoteMn, grammar.customNoteEn, grammar.customNote, grammar.customNoteVi]
          : [grammar.customNote, grammar.customNoteEn, grammar.customNoteVi, grammar.customNoteMn];

  return candidates.find(text => typeof text === 'string' && text.trim().length > 0) || '';
};

const isEmptySentence = (sentence: string): boolean => sentence.trim().length === 0;

export default function MobileGrammarDetailSheet({
  grammar,
  onClose,
  onProficiencyUpdate,
  instituteId: _instituteId,
}: MobileGrammarDetailSheetProps) {
  const { i18n, t } = useTranslation();
  const [practiceSentence, setPracticeSentence] = useState('');
  const [aiFeedback, setAiFeedback] = useState<AiFeedbackState | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const dragStartY = useRef<number>(0);
  const [redEyeEnabled, setRedEyeEnabled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return safeGetLocalStorageItem(RED_EYE_STORAGE_KEY) === '1';
  });

  useEffect(() => {
    safeSetLocalStorageItem(RED_EYE_STORAGE_KEY, redEyeEnabled ? '1' : '0');
  }, [redEyeEnabled]);

  const checkAction = useAction(
    aRef<
      { sentence: string; context: string; language?: string },
      { success?: boolean; data?: { nuance?: unknown; isCorrect?: unknown; corrected?: unknown } }
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

  useEffect(() => {
    if (!grammar?.id) return;
    setPracticeSentence('');
    setAiFeedback(null);
    setShowConfetti(false);
  }, [grammar?.id]);

  const handleCheck = async () => {
    if (!grammar || !practiceSentence.trim()) return;

    setIsChecking(true);
    setAiFeedback(null);
    try {
      const response = await checkAction({
        sentence: practiceSentence.trim(),
        context: getLocalizedTitle(grammar, resolveSupportedLanguage(i18n.language)),
        language: i18n.language,
      });

      const res = response as AiCheckResponse;
      if (res?.success && res.data) {
        // Logic duplicated from desktop component
        const feedback = getFeedbackText(res.data.nuance);
        const isFeedbackNegative = isNegativeFeedback(feedback);
        const aiIsCorrect =
          typeof res.data.isCorrect === 'boolean' ? res.data.isCorrect : undefined;
        const finalIsCorrect = aiIsCorrect ?? !isFeedbackNegative;
        const correctedSentence =
          typeof res.data.corrected === 'string' && res.data.corrected.trim().length > 0
            ? res.data.corrected.trim()
            : undefined;

        // Progress Update
        let progress: { proficiency: number; status: string } | undefined = undefined;
        if (finalIsCorrect) {
          const updateRes = await updateStatus({
            grammarId: grammar.id as unknown as Id<'grammar_points'>,
            increment: 50,
          });
          progress = updateRes;

          if (updateRes.proficiency >= 100) {
            triggerConfetti(setShowConfetti);
          }

          onProficiencyUpdate?.(
            grammar.id,
            updateRes.proficiency,
            updateRes.status as GrammarPointData['status']
          );
        }

        setAiFeedback({
          isCorrect: finalIsCorrect,
          feedback,
          correctedSentence,
          progress,
        });
      }
    } catch (error) {
      console.error('Check failed', error);
      setAiFeedback({ isCorrect: false, feedback: 'Error checking sentence.' });
    } finally {
      setIsChecking(false);
    }
  };

  const handleToggleStatus = () => {
    if (!grammar) return;
    const newStatus = grammar.status === 'MASTERED' ? 'LEARNING' : 'MASTERED';
    updateStatus({
      grammarId: grammar.id as unknown as Id<'grammar_points'>,
      status: newStatus,
    }).then(res => {
      onProficiencyUpdate?.(grammar.id, res.proficiency, res.status as GrammarPointData['status']);
      if (res.status === 'MASTERED') {
        triggerConfetti(setShowConfetti);
      }
    });
  };

  if (!grammar) return null;

  const rulesObject = getRulesObject(grammar);
  const examples = getExamples(grammar);
  const language = resolveSupportedLanguage(i18n.language);
  const localizedTitle = getLocalizedTitle(grammar, language);
  const localizedSummary = getLocalizedSummary(grammar, language);
  const localizedExplanation = stripLeadingDuplicateHeading(
    getLocalizedExplanation(grammar, language),
    localizedTitle
  );
  const localizedCustomNote = getLocalizedCustomNote(grammar, language);
  const proficiency = aiFeedback?.progress?.proficiency ?? grammar.proficiency ?? 0;
  const status = aiFeedback?.progress?.status ?? grammar.status ?? 'NEW';
  const isCheckDisabled = isChecking || isEmptySentence(practiceSentence);

  const handleDragStart = (e: React.TouchEvent | React.MouseEvent) => {
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    dragStartY.current = clientY;
  };

  const handleDragEnd = (e: React.TouchEvent | React.MouseEvent) => {
    const clientY = 'changedTouches' in e ? e.changedTouches[0].clientY : e.clientY;
    const delta = dragStartY.current - clientY;
    if (delta > 40) setIsExpanded(true); // swipe up → expand
    if (delta < -40) setIsExpanded(false); // swipe down → collapse
  };

  return (
    <Sheet open onOpenChange={open => !open && onClose()}>
      <SheetPortal>
        <SheetOverlay unstyled className="fixed inset-0 bg-black/50 z-[60] backdrop-blur-sm" />
        <SheetContent
          unstyled
          closeOnEscape={false}
          lockBodyScroll={false}
          className={`fixed bottom-0 left-0 right-0 bg-white dark:bg-zinc-950 rounded-t-[2rem] z-[61] flex flex-col shadow-2xl overflow-hidden border-t border-border transition-[height] duration-300 ease-out ${
            isExpanded ? 'h-[92dvh]' : 'h-[50dvh]'
          }`}
        >
          {/* Drag Handle + Header */}
          <div
            className="shrink-0 cursor-grab active:cursor-grabbing select-none"
            onTouchStart={handleDragStart}
            onTouchEnd={handleDragEnd}
            onMouseDown={handleDragStart}
            onMouseUp={handleDragEnd}
            onClick={() => setIsExpanded(prev => !prev)}
          >
            {/* Pill handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-border" />
            </div>

            {/* Header content */}
            <div
              className="px-5 pt-3 pb-4 border-b border-border flex items-start justify-between relative z-10"
              onCopy={e => e.preventDefault()}
              onContextMenu={e => e.preventDefault()}
            >
              <div className="flex-1 min-w-0 pr-3">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="bg-muted text-muted-foreground px-2 py-0.5 rounded text-[10px] font-black uppercase">
                    {grammar.type}
                  </span>
                  <span className="text-xs font-bold text-muted-foreground">{grammar.level}</span>
                </div>
                <h2 className="text-2xl font-black text-foreground leading-tight mb-2 truncate">
                  {localizedTitle}
                </h2>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${status === 'MASTERED' ? 'bg-green-500' : 'bg-amber-500'}`}
                      style={{ width: `${proficiency}%` }}
                    />
                  </div>
                  <span className="text-xs font-bold text-muted-foreground shrink-0">
                    {proficiency}%
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0" onClick={e => e.stopPropagation()}>
                <Button
                  variant="ghost"
                  size="auto"
                  onClick={() => setRedEyeEnabled(prev => !prev)}
                  className={`w-8 h-8 rounded-full border flex items-center justify-center transition-all ${
                    redEyeEnabled
                      ? 'bg-red-50 border-red-300 text-red-600'
                      : 'bg-muted border-border text-muted-foreground'
                  }`}
                >
                  {redEyeEnabled ? <EyeOff className="w-4 h-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                <Button
                  variant="ghost"
                  size="auto"
                  onClick={handleToggleStatus}
                  className={`w-8 h-8 rounded-full border flex items-center justify-center transition-all ${
                    status === 'MASTERED'
                      ? 'bg-green-100 border-green-500 text-green-600'
                      : 'bg-muted border-border text-muted-foreground'
                  }`}
                >
                  <Trophy className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="auto"
                  onClick={onClose}
                  className="w-8 h-8 rounded-full bg-muted border border-border flex items-center justify-center text-muted-foreground active:scale-95 transition-transform"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Summary — always visible (collapsed & expanded) */}
          <div
            className="px-5 pt-4 pb-2 shrink-0 select-none"
            onClick={() => setIsExpanded(prev => !prev)}
            onCopy={e => e.preventDefault()}
          >
            <div className="text-sm font-semibold text-muted-foreground leading-relaxed bg-muted/60 px-4 py-3 rounded-2xl border border-border">
              <Sparkles className="w-3.5 h-3.5 mb-1.5 text-indigo-400 inline-block" />
              <span className={isExpanded ? '' : 'line-clamp-2'}>{localizedSummary}</span>
            </div>
          </div>

          {/* Full content — only visible when expanded */}
          <div
            className={`flex-1 overflow-y-auto px-5 py-2 space-y-5 select-none print:hidden transition-opacity duration-200 ${
              isExpanded ? 'opacity-100' : 'opacity-0 pointer-events-none h-0'
            }`}
            onCopy={e => e.preventDefault()}
            onContextMenu={e => e.preventDefault()}
            onDragStart={e => e.preventDefault()}
          >
            {/* Explanation */}
            <div className="grammar-prose prose prose-slate dark:prose-invert max-w-none">
              <MarkdownRenderer content={localizedExplanation} redEyeEnabled={redEyeEnabled} />
            </div>

            {/* Rules */}
            {Object.keys(rulesObject).length > 0 && (
              <div>
                <h3 className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-[0.2em] mb-4">
                  {t('grammarDetail.rules')}
                </h3>
                <div className="flex flex-wrap gap-3">
                  {Object.entries(rulesObject).map(([key, val]) => (
                    <div
                      key={key}
                      className="flex items-center bg-card/40 backdrop-blur-md border border-white/10 rounded-2xl px-4 py-2.5 shadow-xl rim-light"
                    >
                      <span className="font-black text-xs text-muted-foreground mr-3">{key}</span>
                      <span className="text-indigo-400 font-black mr-3">→</span>
                      <span className="font-black text-sm text-foreground">{String(val)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Examples */}
            <div>
              <h3 className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-[0.2em] mb-4">
                {t('grammarDetail.examples')}
              </h3>
              <div className="space-y-4">
                {examples.map((ex, i) => (
                  <div
                    key={i}
                    className="bg-card/40 backdrop-blur-md border border-white/10 rounded-[2rem] p-5 active:scale-[0.98] active:bg-muted/30 transition-all shadow-xl rim-light grain-overlay"
                  >
                    <p className="font-black text-lg text-foreground mb-1 leading-tight tracking-tight italic">
                      {ex.kr}
                    </p>
                    <p className="text-sm text-muted-foreground/80 font-semibold italic">
                      {getExampleTranslation(ex, language)}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {localizedCustomNote ? (
              <div>
                <h3 className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-3">
                  {t('grammarDetail.customNote')}
                </h3>
                <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap bg-muted border border-border rounded-xl p-4">
                  {localizedCustomNote}
                </div>
              </div>
            ) : null}
          </div>

          {/* AI Practice input fixed at bottom */}
          <div className="px-5 py-4 bg-white dark:bg-zinc-950 border-t border-border pb-safe relative z-10">
            {aiFeedback && (
              <div
                className={`mb-4 p-4 rounded-2xl text-sm font-black italic tracking-tight flex items-start gap-3 shadow-xl rim-light ${aiFeedback.isCorrect ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-600 border border-rose-500/20'}`}
              >
                {aiFeedback.isCorrect ? (
                  <Trophy className="w-5 h-5 shrink-0 mt-0.5 text-emerald-500" />
                ) : (
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-500" />
                )}
                <div>
                  <p className="leading-tight">{aiFeedback.feedback}</p>
                </div>
              </div>
            )}
            <div className="flex gap-3">
              <Input
                value={practiceSentence}
                onChange={e => setPracticeSentence(e.target.value)}
                placeholder={t('grammarDetail.practicePlaceholder', { title: localizedTitle })}
                className="flex-1 h-12 bg-muted/50 border border-white/10 rounded-2xl font-bold tracking-tight text-foreground placeholder:text-muted-foreground/40 focus:bg-card transition-all shadow-inner px-5"
                onKeyDown={e => e.key === 'Enter' && handleCheck()}
              />
              <Button
                onClick={handleCheck}
                disabled={isCheckDisabled}
                loading={isChecking}
                loadingText={t('grammarDetail.checking')}
                loadingIconClassName="w-4 h-4"
                className="h-12 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl shadow-[0_8px_16px_rgba(79,70,229,0.3)] active:translate-y-1 active:shadow-none transition-all rim-light"
              >
                {t('grammarDetail.check')}
              </Button>
            </div>
          </div>

          {/* Confetti */}
          {showConfetti && (
            <div className="absolute inset-0 pointer-events-none z-[70] flex items-start justify-center overflow-hidden">
              {Array.from({ length: 15 }).map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ y: -20, x: (Math.random() - 0.5) * 300, rotate: 0 }}
                  animate={{ y: 800, rotate: 720 }}
                  transition={{ duration: 2, delay: Math.random() * 0.5, ease: 'linear' }}
                  className="absolute text-2xl"
                >
                  {['🎉', '⭐', '✨'][i % 3]}
                </motion.div>
              ))}
            </div>
          )}
        </SheetContent>
      </SheetPortal>
    </Sheet>
  );
}
