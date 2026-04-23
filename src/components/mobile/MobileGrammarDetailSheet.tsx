import React, { useEffect, useRef, useState } from 'react';
import { X, Trophy, AlertCircle, Eye, EyeOff, Sparkles } from 'lucide-react';
import { m as motion } from 'framer-motion';
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
import { Card, Chip, HanjaSeal, KT, SectionHead, type ChipTone } from './ksoft/ksoft';

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

type GrammarTone = {
  readonly chipTone: ChipTone;
  readonly deep: string;
  readonly surface: string;
  readonly gradient: string;
  readonly seal: string;
};

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

const getGrammarTone = (type: string): GrammarTone => {
  const normalized = type.trim().toUpperCase();
  switch (normalized) {
    case 'ENDING':
      return {
        chipTone: 'mint',
        deep: KT.mintDeep,
        surface: `${KT.mint}70`,
        gradient: `linear-gradient(135deg, ${KT.mint}B8 0%, ${KT.card} 72%)`,
        seal: '結',
      };
    case 'PARTICLE':
      return {
        chipTone: 'lilac',
        deep: KT.lilacDeep,
        surface: `${KT.lilac}74`,
        gradient: `linear-gradient(135deg, ${KT.lilac}B6 0%, ${KT.card} 72%)`,
        seal: '助',
      };
    case 'CONNECTIVE':
      return {
        chipTone: 'butter',
        deep: KT.butterDeep,
        surface: `${KT.butter}82`,
        gradient: `linear-gradient(135deg, ${KT.butter}CC 0%, ${KT.card} 72%)`,
        seal: '接',
      };
    default:
      return {
        chipTone: 'sky',
        deep: KT.skyDeep,
        surface: `${KT.sky}78`,
        gradient: `linear-gradient(135deg, ${KT.sky}B5 0%, ${KT.card} 72%)`,
        seal: '文',
      };
  }
};

const clampPercentage = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

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
  return enabled ? 'red-eye-mask red-eye-active' : '';
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
          <h1
            style={{
              marginTop: 24,
              marginBottom: 16,
              fontSize: 26,
              fontWeight: 800,
              color: KT.ink,
              letterSpacing: -0.6,
            }}
          >
            {children}
          </h1>
        ),
        h2: ({ children }) => (
          <h2
            style={{
              marginTop: 28,
              marginBottom: 14,
              paddingBottom: 10,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              borderBottom: `1px solid ${KT.line}`,
              fontSize: 19,
              fontWeight: 800,
              color: KT.ink,
              letterSpacing: -0.2,
            }}
          >
            <span style={{ fontFamily: KT.serif, color: KT.crimson, fontWeight: 500 }}>解</span>
            {children}
          </h2>
        ),
        h3: ({ children }) => (
          <h3
            style={{
              marginTop: 24,
              marginBottom: 8,
              fontSize: 11,
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: 1.2,
              color: KT.sub,
            }}
          >
            {children}
          </h3>
        ),
        p: ({ children, node: _node }) => {
          return (
            <p
              className={maskKind ? getRedEyeMaskClass(redEyeEnabled) : ''}
              style={{
                margin: '12px 0',
                fontSize: 14,
                lineHeight: 1.7,
                color: KT.ink2,
              }}
            >
              {renderMaskedNode(children, maskKind ? false : redEyeEnabled)}
            </p>
          );
        },
        ul: ({ children }) => (
          <ul style={{ margin: '12px 0', paddingLeft: 22, display: 'grid', gap: 6 }}>{children}</ul>
        ),
        ol: ({ children }) => (
          <ol style={{ margin: '12px 0', paddingLeft: 22, display: 'grid', gap: 6 }}>{children}</ol>
        ),
        li: ({ children, node: _node }) => {
          return (
            <li
              className={maskKind ? getRedEyeMaskClass(redEyeEnabled) : ''}
              style={{
                fontSize: 14,
                lineHeight: 1.7,
                color: KT.ink2,
              }}
            >
              {renderMaskedNode(children, maskKind ? false : redEyeEnabled)}
            </li>
          );
        },
        strong: ({ children }) => (
          <strong
            style={{
              padding: '1px 4px',
              borderRadius: 6,
              background: `${KT.butter}99`,
              color: KT.ink,
              fontWeight: 800,
            }}
          >
            {children}
          </strong>
        ),
        blockquote: ({ children }) => (
          <blockquote
            style={{
              margin: '16px 0',
              padding: '14px 16px',
              borderLeft: `4px solid ${KT.crimson}`,
              borderRadius: 16,
              background: `${KT.bg2}`,
              color: KT.ink2,
              fontStyle: 'italic',
            }}
          >
            {children}
          </blockquote>
        ),
        table: ({ children }) => (
          <div
            style={{
              margin: '16px 0',
              overflowX: 'auto',
              borderRadius: 16,
              border: `1px solid ${KT.line}`,
              background: KT.card,
            }}
          >
            <table style={{ width: '100%', fontSize: 12, textAlign: 'left' }}>{children}</table>
          </div>
        ),
        th: ({ children }) => (
          <th
            style={{
              padding: '10px 12px',
              borderBottom: `1px solid ${KT.line}`,
              background: KT.bg2,
              fontWeight: 800,
              color: KT.ink,
            }}
          >
            {children}
          </th>
        ),
        td: ({ children }) => {
          return (
            <td
              className={maskKind ? getRedEyeMaskClass(redEyeEnabled) : ''}
              style={{
                padding: '10px 12px',
                borderBottom: `1px solid ${KT.line}`,
                color: KT.ink2,
                verticalAlign: 'top',
              }}
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

const stringifyRuleValue = (value: unknown): string => {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) {
    return value
      .map(item => stringifyRuleValue(item))
      .filter(item => item.trim().length > 0)
      .join(' · ');
  }
  if (typeof value === 'object' && value !== null) {
    return Object.entries(value as Record<string, unknown>)
      .map(([key, entryValue]) => {
        const rendered = stringifyRuleValue(entryValue);
        return rendered.trim().length > 0 ? `${key}: ${rendered}` : key;
      })
      .join(' · ');
  }
  return '';
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
  const proficiencyValue = clampPercentage(proficiency);
  const tone = getGrammarTone(grammar.type);
  const statusLabel =
    status === 'MASTERED'
      ? t('grammar.status.mastered', { defaultValue: 'Mastered' })
      : status === 'LEARNING'
        ? t('grammar.status.learning', { defaultValue: 'Learning' })
        : t('grammar.status.new', { defaultValue: 'New' });
  const renderedRules = Object.entries(rulesObject)
    .map(([key, value]) => ({ key, value: stringifyRuleValue(value) }))
    .filter(rule => rule.value.trim().length > 0);
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
        <SheetOverlay
          unstyled
          className="fixed inset-0 z-[60] backdrop-blur-sm"
          style={{ background: 'rgba(31,27,23,0.42)' }}
        />
        <SheetContent
          unstyled
          closeOnEscape={false}
          lockBodyScroll={false}
          className={`fixed bottom-0 left-0 right-0 z-[61] flex flex-col overflow-hidden transition-[height] duration-300 ease-out ${
            isExpanded ? 'h-[92dvh]' : 'h-[56dvh]'
          }`}
          style={{
            background: KT.bg,
            borderTopLeftRadius: 32,
            borderTopRightRadius: 32,
            borderTop: `1px solid ${KT.line}`,
            boxShadow: KT.shLg,
          }}
        >
          <div
            className="shrink-0 cursor-grab active:cursor-grabbing select-none"
            onTouchStart={handleDragStart}
            onTouchEnd={handleDragEnd}
            onMouseDown={handleDragStart}
            onMouseUp={handleDragEnd}
            onClick={() => setIsExpanded(prev => !prev)}
            style={{
              background: `linear-gradient(180deg, ${KT.bg2} 0%, ${KT.bg} 100%)`,
              borderBottom: `1px solid ${KT.line}`,
            }}
          >
            <div className="flex justify-center pt-3 pb-1">
              <div
                className="h-1 w-10 rounded-full"
                style={{ background: 'rgba(31,27,23,0.14)' }}
              />
            </div>

            <div
              className="relative z-10"
              onCopy={e => e.preventDefault()}
              onContextMenu={e => e.preventDefault()}
              style={{ padding: '10px 22px 18px' }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  marginBottom: 12,
                }}
              >
                <div style={{ fontSize: 11, fontWeight: 700, color: KT.sub, letterSpacing: 1 }}>
                  {grammar.level ? `${grammar.level} · ` : ''}
                  {statusLabel}
                </div>
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: 8 }}
                  onClick={e => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => setRedEyeEnabled(prev => !prev)}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      border: redEyeEnabled ? `1px solid ${KT.crimson}44` : `1px solid ${KT.line}`,
                      background: redEyeEnabled ? `${KT.pink}88` : KT.card,
                      color: redEyeEnabled ? KT.crimson : KT.sub,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: KT.shSm,
                    }}
                  >
                    {redEyeEnabled ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                  <button
                    type="button"
                    onClick={handleToggleStatus}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      border: status === 'MASTERED' ? 'none' : `1px solid ${KT.line}`,
                      background: status === 'MASTERED' ? KT.mint : KT.card,
                      color: status === 'MASTERED' ? KT.mintDeep : KT.sub,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: KT.shSm,
                    }}
                  >
                    <Trophy size={16} fill={status === 'MASTERED' ? 'currentColor' : 'none'} />
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      border: `1px solid ${KT.line}`,
                      background: KT.card,
                      color: KT.sub,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: KT.shSm,
                    }}
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
              <Card
                pad={20}
                style={{
                  background: tone.gradient,
                  boxShadow: KT.sh,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                  <HanjaSeal c={tone.seal} size={56} bg={tone.deep} round={14} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        flexWrap: 'wrap',
                      }}
                    >
                      <Chip tone={tone.chipTone} size="sm">
                        {grammar.type}
                      </Chip>
                      {grammar.level ? <Chip size="sm">{grammar.level}</Chip> : null}
                      <Chip tone="ink" size="sm">
                        {statusLabel}
                      </Chip>
                    </div>
                    <div
                      style={{
                        marginTop: 10,
                        fontSize: 32,
                        fontWeight: 800,
                        color: KT.ink,
                        letterSpacing: -1,
                        lineHeight: 1,
                      }}
                    >
                      {localizedTitle}
                    </div>
                    <div
                      style={{
                        marginTop: 8,
                        fontSize: 13,
                        color: KT.ink2,
                        lineHeight: 1.6,
                        display: '-webkit-box',
                        WebkitLineClamp: isExpanded ? 4 : 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {localizedSummary}
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-end',
                    justifyContent: 'space-between',
                    gap: 12,
                    marginTop: 18,
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 10,
                        marginBottom: 6,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 800,
                          color: KT.sub,
                          letterSpacing: 1,
                        }}
                      >
                        {t('grammarDetail.progress', { defaultValue: 'PROFICIENCY' })}
                      </span>
                      <span style={{ fontSize: 10, fontWeight: 800, color: KT.sub }}>
                        {proficiencyValue}%
                      </span>
                    </div>
                    <div
                      style={{
                        height: 6,
                        borderRadius: 999,
                        overflow: 'hidden',
                        background: 'rgba(31,27,23,0.12)',
                      }}
                    >
                      <div
                        style={{
                          width: `${proficiencyValue}%`,
                          height: '100%',
                          borderRadius: 999,
                          background: tone.deep,
                        }}
                      />
                    </div>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '10px 12px',
                      borderRadius: 14,
                      background: 'rgba(255,255,255,0.8)',
                      color: tone.deep,
                      boxShadow: KT.shSm,
                    }}
                  >
                    <Sparkles size={14} />
                    <span style={{ fontSize: 11, fontWeight: 800 }}>
                      {isExpanded
                        ? t('grammarDetail.collapse', { defaultValue: 'Collapse' })
                        : t('grammarDetail.expand', { defaultValue: 'Expand' })}
                    </span>
                  </div>
                </div>
              </Card>
            </div>
          </div>

          <div
            className={`flex-1 overflow-y-auto select-none print:hidden transition-[opacity,transform] duration-300 ${
              isExpanded ? 'opacity-100' : 'pointer-events-none opacity-0'
            }`}
            onCopy={e => e.preventDefault()}
            onContextMenu={e => e.preventDefault()}
            onDragStart={e => e.preventDefault()}
            style={{
              padding: '14px 18px 0',
              transform: isExpanded ? 'translateY(0)' : 'translateY(12px)',
            }}
          >
            <Card pad={20} style={{ boxShadow: KT.shSm }}>
              <SectionHead
                kanji="解"
                title={t('grammarDetail.explanation', { defaultValue: 'Explanation' })}
              />
              <div style={{ marginTop: 4 }}>
                <MarkdownRenderer content={localizedExplanation} redEyeEnabled={redEyeEnabled} />
              </div>
            </Card>

            {renderedRules.length > 0 ? (
              <Card
                pad={18}
                style={{
                  marginTop: 12,
                  background: `linear-gradient(135deg, ${tone.surface} 0%, ${KT.card} 82%)`,
                  boxShadow: KT.shSm,
                }}
              >
                <SectionHead kanji="式" title={t('grammarDetail.rules')} />
                <div style={{ display: 'grid', gap: 10, marginTop: 14 }}>
                  {renderedRules.map(rule => (
                    <div
                      key={rule.key}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '88px 1fr',
                        gap: 12,
                        alignItems: 'center',
                        padding: '12px 14px',
                        borderRadius: 18,
                        background: KT.card,
                        boxShadow: KT.shSm,
                      }}
                    >
                      <div style={{ fontSize: 11, fontWeight: 800, color: KT.sub }}>{rule.key}</div>
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 700,
                          color: KT.ink,
                          lineHeight: 1.5,
                        }}
                      >
                        {rule.value}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            ) : null}

            {examples.length > 0 ? (
              <Card pad={0} style={{ marginTop: 12, overflow: 'hidden', boxShadow: KT.shSm }}>
                <div style={{ padding: '18px 20px 12px' }}>
                  <SectionHead
                    kanji="例"
                    title={`${t('grammarDetail.examples')} · ${examples.length}`}
                  />
                </div>
                {examples.map((example, index) => (
                  <div
                    key={`${example.kr || 'example'}-${index}`}
                    style={{
                      padding: '14px 20px',
                      borderTop: index === 0 ? 'none' : `1px solid ${KT.line}`,
                    }}
                  >
                    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                      <div
                        style={{
                          minWidth: 28,
                          height: 28,
                          borderRadius: 999,
                          background: `${tone.surface}`,
                          color: tone.deep,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 11,
                          fontWeight: 800,
                        }}
                      >
                        {index + 1}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: 16,
                            fontWeight: 700,
                            color: KT.ink,
                            lineHeight: 1.6,
                          }}
                        >
                          {example.kr}
                        </div>
                        <div
                          style={{
                            marginTop: 6,
                            fontSize: 13,
                            color: KT.sub,
                            lineHeight: 1.6,
                          }}
                        >
                          {getExampleTranslation(example, language)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </Card>
            ) : null}

            {localizedExplanation && (
                <section>
                    <p className="text-[10px] font-black text-slate-400 tracking-widest uppercase mb-3">
                        Detailed Explanation
                    </p>
                    <div className="grammar-prose prose max-w-none text-slate-700 prose-p:my-2 prose-strong:text-indigo-600">
                        <MarkdownRenderer content={localizedExplanation} redEyeEnabled={redEyeEnabled} />
                    </div>
                </section>
            )}

            {localizedCustomNote ? (
              <Card pad={18} tone="bg2" style={{ marginTop: 12, boxShadow: KT.shSm }}>
                <SectionHead
                  kanji="註"
                  title={t('grammarDetail.customNote', { defaultValue: 'Custom note' })}
                />
                <div
                  style={{
                    marginTop: 12,
                    fontSize: 14,
                    color: KT.ink2,
                    lineHeight: 1.7,
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {localizedCustomNote}
                </div>
              </Card>
            ) : null}

            <div style={{ height: 18 }} />
          </div>

          <div
            className="relative z-10"
            style={{
              padding: '14px 18px calc(env(safe-area-inset-bottom) + 18px)',
              borderTop: `1px solid ${KT.line}`,
              background: `linear-gradient(180deg, rgba(245,239,229,0) 0%, ${KT.bg2} 28%, ${KT.bg2} 100%)`,
            }}
          >
            <Card pad={16} style={{ boxShadow: KT.shSm }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: 12,
                  marginBottom: 12,
                }}
              >
                <div>
                  <div
                    style={{
                      fontFamily: KT.serif,
                      fontSize: 12,
                      color: KT.crimson,
                      letterSpacing: 3,
                      fontWeight: 500,
                    }}
                  >
                    問 · AI
                  </div>
                  <div
                    style={{
                      marginTop: 4,
                      fontSize: 16,
                      fontWeight: 800,
                      color: KT.ink,
                      letterSpacing: -0.2,
                    }}
                  >
                    {t('grammarDetail.practiceTitle', { defaultValue: 'Practice sentence' })}
                  </div>
                </div>
                <Chip tone={tone.chipTone} size="sm">
                  {statusLabel}
                </Chip>
              </div>

              {aiFeedback ? (
                <div
                  style={{
                    marginBottom: 12,
                    padding: 14,
                    borderRadius: 18,
                    background: aiFeedback.isCorrect ? `${KT.mint}78` : `${KT.pink}78`,
                    border: `1px solid ${aiFeedback.isCorrect ? `${KT.mintDeep}33` : `${KT.pinkDeep}33`}`,
                    color: aiFeedback.isCorrect ? KT.mintDeep : KT.pinkDeep,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    {aiFeedback.isCorrect ? (
                      <Trophy size={18} style={{ flexShrink: 0, marginTop: 1 }} />
                    ) : (
                      <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 1 }} />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.6 }}>
                        {aiFeedback.feedback}
                      </div>
                      {aiFeedback.correctedSentence ? (
                        <div
                          style={{
                            marginTop: 8,
                            paddingTop: 8,
                            borderTop: `1px solid ${aiFeedback.isCorrect ? `${KT.mintDeep}22` : `${KT.pinkDeep}22`}`,
                            fontSize: 12,
                            lineHeight: 1.6,
                          }}
                        >
                          {aiFeedback.correctedSentence}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="flex gap-3">
                <Input
                  value={practiceSentence}
                  onChange={e => setPracticeSentence(e.target.value)}
                  placeholder={t('grammarDetail.practicePlaceholder', { title: localizedTitle })}
                  className="h-12 flex-1 rounded-[1.15rem] px-5 text-sm font-bold shadow-none"
                  style={{
                    border: `1px solid ${KT.line}`,
                    background: KT.bg,
                    color: KT.ink,
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      void handleCheck();
                    }
                  }}
                />
                <Button
                  onClick={handleCheck}
                  disabled={isCheckDisabled}
                  loading={isChecking}
                  loadingText={t('grammarDetail.checking')}
                  loadingIconClassName="w-4 h-4"
                  className="h-12 rounded-[1.15rem] px-6 font-black"
                  style={{
                    background: KT.ink,
                    color: KT.card,
                    boxShadow: KT.shSm,
                  }}
                >
                  {t('grammarDetail.check')}
                </Button>
              </div>
            </Card>
          </div>

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
