import React, { useEffect, useState } from 'react';
import { X, Trophy, AlertCircle, Eye, EyeOff } from 'lucide-react';
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
  GRAMMAR_MASK_TRANSLATION_TOKEN,
  GRAMMAR_MASK_TRANSLATION_START_TOKEN,
  GRAMMAR_MASK_ANSWER_START_TOKEN,
} from '../../utils/grammarDisplaySanitizer';
import { remarkGrammarMasking } from '../../utils/grammarMaskingRemark';
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

function getNodeMaskKind(node: any): 'translation' | 'answer' | null {
  const value =
    node?.properties?.['data-grammar-mask'] ??
    node?.data?.hProperties?.['data-grammar-mask'] ??
    null;
  return value === 'translation' || value === 'answer' ? value : null;
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
        p: ({ children, node }) => {
          const rawText = extractTextContent(children);
          const nodeMaskKind = getNodeMaskKind(node);
          const maskKind =
            nodeMaskKind ||
            (rawText.trim().includes(GRAMMAR_MASK_ANSWER_TOKEN) ||
            rawText.trim().includes(GRAMMAR_MASK_ANSWER_START_TOKEN)
              ? 'answer'
              : rawText.trim().includes(GRAMMAR_MASK_TRANSLATION_TOKEN) ||
                  rawText.trim().includes(GRAMMAR_MASK_TRANSLATION_START_TOKEN)
                ? 'translation'
                : null);

          return (
            <p
              className={`my-3 text-sm leading-relaxed text-muted-foreground ${
                maskKind ? getRedEyeMaskClass(redEyeEnabled) : ''
              }`}
            >
              {children}
            </p>
          );
        },
        ul: ({ children }) => <ul className="my-3 list-disc space-y-1 pl-5">{children}</ul>,
        ol: ({ children }) => <ol className="my-3 list-decimal space-y-1 pl-5">{children}</ol>,
        li: ({ children, node }) => {
          const rawText = extractTextContent(children);
          const nodeMaskKind = getNodeMaskKind(node);
          const maskKind =
            nodeMaskKind ||
            (rawText.trim().includes(GRAMMAR_MASK_ANSWER_TOKEN)
              ? 'answer'
              : rawText.trim().includes(GRAMMAR_MASK_TRANSLATION_TOKEN)
                ? 'translation'
                : null);
          return (
            <li
              className={`text-sm leading-relaxed text-muted-foreground ${
                maskKind ? getRedEyeMaskClass(redEyeEnabled) : ''
              }`}
            >
              {children}
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
        td: ({ children }) => (
          <td className="border-b border-border px-3 py-2 align-top">{children}</td>
        ),
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
}: MobileGrammarDetailSheetProps) {
  const { i18n, t } = useTranslation();
  const [practiceSentence, setPracticeSentence] = useState('');
  const [aiFeedback, setAiFeedback] = useState<AiFeedbackState | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [redEyeEnabled, setRedEyeEnabled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(RED_EYE_STORAGE_KEY) === '1';
  });

  useEffect(() => {
    window.localStorage.setItem(RED_EYE_STORAGE_KEY, redEyeEnabled ? '1' : '0');
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

  return (
    <Sheet open onOpenChange={open => !open && onClose()}>
      <SheetPortal>
        <SheetOverlay unstyled className="fixed inset-0 bg-primary/60 z-[60] backdrop-blur-sm" />
        <SheetContent
          unstyled
          closeOnEscape={false}
          lockBodyScroll={false}
          className="fixed bottom-0 left-0 right-0 bg-card rounded-t-[2rem] z-[61] h-[85dvh] flex flex-col shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div
            className="bg-muted p-6 pb-4 border-b border-border flex items-start justify-between shrink-0 select-none print:hidden"
            onCopy={e => e.preventDefault()}
            onContextMenu={e => e.preventDefault()}
            onDragStart={e => e.preventDefault()}
          >
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="bg-muted text-muted-foreground px-2 py-0.5 rounded text-[10px] font-black uppercase">
                  {grammar.type}
                </span>
                <span className="text-xs font-bold text-muted-foreground">{grammar.level}</span>
              </div>
              <h2 className="text-3xl font-black text-foreground leading-tight mb-2">
                {localizedTitle}
              </h2>
              <div className="flex items-center gap-3">
                <div className="flex-1 w-24 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${status === 'MASTERED' ? 'bg-green-500' : 'bg-amber-500'}`}
                    style={{ width: `${proficiency}%` }}
                  />
                </div>
                <span className="text-xs font-bold text-muted-foreground">{proficiency}%</span>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Button
                variant="ghost"
                size="auto"
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-card border-2 border-border flex items-center justify-center text-muted-foreground active:scale-95 transition-transform"
              >
                <X className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="auto"
                onClick={() => setRedEyeEnabled(prev => !prev)}
                className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${
                  redEyeEnabled
                    ? 'bg-red-50 border-red-300 text-red-600'
                    : 'bg-card border-border text-muted-foreground'
                }`}
              >
                {redEyeEnabled ? <EyeOff className="w-4 h-4" /> : <Eye className="h-4 w-4" />}
              </Button>
              <Button
                variant="ghost"
                size="auto"
                onClick={handleToggleStatus}
                className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${
                  status === 'MASTERED'
                    ? 'bg-green-100 border-green-500 text-green-600'
                    : 'bg-card border-border text-muted-foreground'
                }`}
              >
                <Trophy className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Content */}
          <div
            className="flex-1 overflow-y-auto p-6 space-y-6 select-none print:hidden"
            onCopy={e => e.preventDefault()}
            onContextMenu={e => e.preventDefault()}
            onDragStart={e => e.preventDefault()}
          >
            {/* Summary */}
            <div className="text-base font-bold text-muted-foreground leading-relaxed bg-yellow-50 p-4 rounded-xl border-2 border-yellow-100">
              {localizedSummary}
            </div>

            {/* Explanation */}
            <div className="grammar-prose prose prose-slate dark:prose-invert max-w-none">
              <MarkdownRenderer content={localizedExplanation} redEyeEnabled={redEyeEnabled} />
            </div>

            {/* Rules */}
            {Object.keys(rulesObject).length > 0 && (
              <div>
                <h3 className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-3">
                  {t('grammarDetail.rules')}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(rulesObject).map(([key, val]) => (
                    <div
                      key={key}
                      className="flex items-center bg-card border border-border rounded-lg px-3 py-2 shadow-sm"
                    >
                      <span className="font-bold text-muted-foreground mr-2">{key}</span>
                      <span className="text-muted-foreground mr-2">→</span>
                      <span className="font-bold text-indigo-600">{String(val)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Examples */}
            <div>
              <h3 className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-3">
                {t('grammarDetail.examples')}
              </h3>
              <div className="space-y-3">
                {examples.map((ex, i) => (
                  <div
                    key={i}
                    className="bg-muted border-2 border-border rounded-xl p-4 active:bg-muted transition-colors"
                  >
                    <p className="font-bold text-foreground mb-1">{ex.kr}</p>
                    <p className="text-sm text-muted-foreground">
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
          <div className="p-4 bg-card border-t border-border pb-safe">
            {aiFeedback && (
              <div
                className={`mb-3 p-3 rounded-lg text-sm font-bold flex items-start gap-2 ${aiFeedback.isCorrect ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}
              >
                {aiFeedback.isCorrect ? (
                  <Trophy className="w-4 h-4 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                )}
                <div>
                  <p>{aiFeedback.feedback}</p>
                </div>
              </div>
            )}
            <div className="flex gap-2">
              <Input
                value={practiceSentence}
                onChange={e => setPracticeSentence(e.target.value)}
                placeholder={t('grammarDetail.practicePlaceholder')}
                className="flex-1 bg-muted border-border font-bold"
                onKeyDown={e => e.key === 'Enter' && handleCheck()}
              />
              <Button
                onClick={handleCheck}
                disabled={isCheckDisabled}
                loading={isChecking}
                loadingText={t('grammarDetail.checking')}
                loadingIconClassName="w-3 h-3"
                className="bg-primary text-white font-black"
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
