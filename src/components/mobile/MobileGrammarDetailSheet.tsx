import React, {
  type CSSProperties,
  type ComponentPropsWithoutRef,
  useEffect,
  useRef,
  useState,
} from 'react';
import { AlertCircle, Eye, EyeOff, Sparkles, Trophy, X } from 'lucide-react';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useAction, useMutation } from 'convex/react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';

import type { Id } from '../../../convex/_generated/dataModel';
import type { GrammarPointData } from '../../types';
import { aRef, mRef } from '../../utils/convexRefs';
import {
  GRAMMAR_MASK_ANSWER_END_TOKEN,
  GRAMMAR_MASK_ANSWER_START_TOKEN,
  GRAMMAR_MASK_ANSWER_TOKEN,
  GRAMMAR_MASK_TRANSLATION_END_TOKEN,
  GRAMMAR_MASK_TRANSLATION_START_TOKEN,
  GRAMMAR_MASK_TRANSLATION_TOKEN,
  sanitizeGrammarDisplayText,
  sanitizeGrammarMarkdown,
  stripGrammarMaskTokens,
  stripLeadingDuplicateHeading,
} from '../../utils/grammarDisplaySanitizer';
import { remarkGrammarMasking } from '../../utils/grammarMaskingRemark';
import { safeGetLocalStorageItem, safeSetLocalStorageItem } from '../../utils/browserStorage';
import { Button, Input, Sheet, SheetContent, SheetOverlay, SheetPortal } from '../ui';
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
  readonly isCorrect: boolean;
  readonly feedback: string;
  readonly correctedSentence?: string;
  readonly progress?: { proficiency: number; status: string };
};

type SupportedLanguage = 'zh' | 'en' | 'vi' | 'mn';
type ReaderFontScale = 'compact' | 'comfortable' | 'relaxed';
type GrammarMaskKind = 'translation' | 'answer';
type GrammarExample = GrammarPointData['examples'][number];
type GrammarQuizItem = NonNullable<GrammarPointData['quizItems']>[number];
type LocalizedQuizItem = {
  readonly prompt: string;
  readonly answer: string;
};
type LocalizedSection = { zh?: string; en?: string; vi?: string; mn?: string };
type MarkdownCodeProps = ComponentPropsWithoutRef<'code'> & { inline?: boolean };

type ReaderStyleVars = CSSProperties & {
  '--mobile-reader-title-size': string;
  '--mobile-reader-section-size': string;
  '--mobile-reader-label-size': string;
  '--mobile-reader-body-size': string;
  '--mobile-reader-body-leading': string;
  '--mobile-reader-list-size': string;
  '--mobile-reader-inline-code-size': string;
  '--mobile-reader-block-code-size': string;
  '--mobile-reader-example-size': string;
  '--mobile-reader-translation-size': string;
};

type GrammarTone = {
  readonly chipTone: ChipTone;
  readonly deep: string;
  readonly surface: string;
  readonly gradient: string;
  readonly seal: string;
};

const RED_EYE_STORAGE_KEY = 'grammar_mobile_red_eye';
const READER_FONT_SCALE_STORAGE_KEY = 'grammar_mobile_reader_font_scale';
const NEGATIVE_FEEDBACK_MARKERS = ['incorrect', '错误', 'Incorrect'] as const;
const LEADING_ANSWER_LABEL_RE =
  /^(?:\*{1,2})?(?:参考答案|测验参考答案|示例答案|答案|reference answers?|answers?)(?:\*{1,2})?\s*[:：]/i;

const READER_FONT_SCALE_OPTIONS: ReadonlyArray<{
  value: ReaderFontScale;
  label: string;
  titleKey: string;
  titleDefault: string;
}> = [
  {
    value: 'compact',
    label: 'A-',
    titleKey: 'grammarDetail.fontScaleCompact',
    titleDefault: 'Compact',
  },
  {
    value: 'comfortable',
    label: 'A',
    titleKey: 'grammarDetail.fontScaleComfortable',
    titleDefault: 'Comfortable',
  },
  {
    value: 'relaxed',
    label: 'A+',
    titleKey: 'grammarDetail.fontScaleRelaxed',
    titleDefault: 'Relaxed',
  },
];

const READER_FONT_SCALE_VARS: Record<ReaderFontScale, ReaderStyleVars> = {
  compact: {
    '--mobile-reader-title-size': '1.65rem',
    '--mobile-reader-section-size': '1.05rem',
    '--mobile-reader-label-size': '0.68rem',
    '--mobile-reader-body-size': '0.94rem',
    '--mobile-reader-body-leading': '1.72',
    '--mobile-reader-list-size': '0.93rem',
    '--mobile-reader-inline-code-size': '0.88em',
    '--mobile-reader-block-code-size': '0.83rem',
    '--mobile-reader-example-size': '1rem',
    '--mobile-reader-translation-size': '0.85rem',
  },
  comfortable: {
    '--mobile-reader-title-size': '1.82rem',
    '--mobile-reader-section-size': '1.12rem',
    '--mobile-reader-label-size': '0.7rem',
    '--mobile-reader-body-size': '0.98rem',
    '--mobile-reader-body-leading': '1.8',
    '--mobile-reader-list-size': '0.96rem',
    '--mobile-reader-inline-code-size': '0.9em',
    '--mobile-reader-block-code-size': '0.85rem',
    '--mobile-reader-example-size': '1.04rem',
    '--mobile-reader-translation-size': '0.88rem',
  },
  relaxed: {
    '--mobile-reader-title-size': '1.96rem',
    '--mobile-reader-section-size': '1.2rem',
    '--mobile-reader-label-size': '0.73rem',
    '--mobile-reader-body-size': '1.05rem',
    '--mobile-reader-body-leading': '1.9',
    '--mobile-reader-list-size': '1rem',
    '--mobile-reader-inline-code-size': '0.94em',
    '--mobile-reader-block-code-size': '0.9rem',
    '--mobile-reader-example-size': '1.08rem',
    '--mobile-reader-translation-size': '0.92rem',
  },
};

type PracticeComposerProps = {
  readonly localizedTitle: string;
  readonly statusLabel: string;
  readonly tone: GrammarTone;
  readonly aiFeedback: AiFeedbackState | null;
  readonly isChecking: boolean;
  readonly onCheck: (sentence: string) => Promise<void>;
  readonly t: TFunction;
};

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

function MobileGrammarPracticeComposer({
  localizedTitle,
  statusLabel,
  tone,
  aiFeedback,
  isChecking,
  onCheck,
  t,
}: Readonly<PracticeComposerProps>) {
  const [draftSentence, setDraftSentence] = useState('');

  const trimmedDraft = draftSentence.trim();
  const isCheckDisabled = isChecking || isEmptySentence(trimmedDraft);

  const submitDraft = () => {
    if (!trimmedDraft) return;
    void onCheck(trimmedDraft);
  };

  return (
    <Card pad={16} style={{ boxShadow: KT.shSm }}>
      <div className="flex items-start justify-between gap-3">
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
            marginTop: 12,
            marginBottom: 12,
            padding: 14,
            borderRadius: 18,
            background: aiFeedback.isCorrect ? `${KT.mint}78` : `${KT.pink}78`,
            border: `1px solid ${aiFeedback.isCorrect ? `${KT.mintDeep}33` : `${KT.pinkDeep}33`}`,
            color: aiFeedback.isCorrect ? KT.mintDeep : KT.pinkDeep,
          }}
        >
          <div className="flex items-start gap-3">
            {aiFeedback.isCorrect ? (
              <Trophy size={18} style={{ flexShrink: 0, marginTop: 1 }} />
            ) : (
              <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 1 }} />
            )}
            <div className="min-w-0 flex-1">
              <div style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.6 }}>
                {aiFeedback.feedback}
              </div>
              {aiFeedback.correctedSentence ? (
                <div
                  style={{
                    marginTop: 8,
                    paddingTop: 8,
                    borderTop: `1px solid ${
                      aiFeedback.isCorrect ? `${KT.mintDeep}22` : `${KT.pinkDeep}22`
                    }`,
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

      <div className="mt-3 flex gap-3">
        <Input
          value={draftSentence}
          onChange={event => setDraftSentence(event.target.value)}
          placeholder={t('grammarDetail.practicePlaceholder', {
            defaultValue: `Use ${localizedTitle} in a sentence`,
            title: localizedTitle,
          })}
          className="h-12 flex-1 rounded-[1.15rem] px-5 text-sm font-bold shadow-none"
          style={{
            border: `1px solid ${KT.line}`,
            background: KT.bg,
            color: KT.ink,
          }}
          onKeyDown={event => {
            if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
              event.preventDefault();
              submitDraft();
            }
          }}
        />
        <Button
          onClick={submitDraft}
          disabled={isCheckDisabled}
          loading={isChecking}
          loadingText={t('grammarDetail.checking', { defaultValue: 'Checking…' })}
          loadingIconClassName="h-4 w-4"
          className="h-12 rounded-[1.15rem] px-6 font-black"
          style={{
            background: KT.ink,
            color: KT.card,
            boxShadow: KT.shSm,
          }}
        >
          {t('grammarDetail.check', { defaultValue: 'Check' })}
        </Button>
      </div>
    </Card>
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isReaderFontScale(value: string): value is ReaderFontScale {
  return value === 'compact' || value === 'comfortable' || value === 'relaxed';
}

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

const getLocalizedTitle = (grammar: GrammarPointData, language: SupportedLanguage): string => {
  if (language === 'en') return sanitizeGrammarDisplayText(grammar.titleEn || grammar.title);
  if (language === 'vi') return sanitizeGrammarDisplayText(grammar.titleVi || grammar.title);
  if (language === 'mn') return sanitizeGrammarDisplayText(grammar.titleMn || grammar.title);
  return sanitizeGrammarDisplayText(grammar.titleZh || grammar.title);
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

const getLocalizedCustomNote = (grammar: GrammarPointData, language: SupportedLanguage): string => {
  const candidates =
    language === 'en'
      ? [grammar.customNoteEn, grammar.customNote, grammar.customNoteVi, grammar.customNoteMn]
      : language === 'vi'
        ? [grammar.customNoteVi, grammar.customNoteEn, grammar.customNote, grammar.customNoteMn]
        : language === 'mn'
          ? [grammar.customNoteMn, grammar.customNoteEn, grammar.customNote, grammar.customNoteVi]
          : [grammar.customNote, grammar.customNoteEn, grammar.customNoteVi, grammar.customNoteMn];

  return sanitizeGrammarMarkdown(
    candidates.find(text => typeof text === 'string' && text.trim().length > 0) || ''
  );
};

function pickLocalizedText(localized: LocalizedSection, language: SupportedLanguage): string {
  const value = localized[language];
  return typeof value === 'string' && value.trim().length > 0 ? value : '';
}

function getLocalizedSectionText(
  section: string | LocalizedSection | null | undefined,
  language: SupportedLanguage
): string {
  if (!section) return '';
  if (typeof section === 'string') return section;
  return pickLocalizedText(section, language);
}

function buildMarkdownFromSections(
  sections: GrammarPointData['sections'],
  language: SupportedLanguage
): string {
  if (!sections) return '';

  const sectionDefs: Array<{
    key: keyof NonNullable<GrammarPointData['sections']>;
    title: string;
  }> = [
    { key: 'introduction', title: 'Introduction' },
    { key: 'core', title: 'Core Usage' },
    { key: 'comparative', title: 'Comparative Notes' },
    { key: 'cultural', title: 'Cultural Notes' },
    { key: 'commonMistakes', title: 'Common Mistakes' },
    { key: 'review', title: 'Review' },
  ];

  return sectionDefs
    .map(({ key, title }) => {
      const content = getLocalizedSectionText(sections[key], language);
      if (!content) return '';
      return `## ${title}\n\n${content}`;
    })
    .filter(Boolean)
    .join('\n\n');
}

const getRulesObject = (grammar: GrammarPointData): Record<string, unknown> => {
  if (isRecord(grammar.conjugationRules)) return grammar.conjugationRules;
  if (grammar.construction && isRecord(grammar.construction)) return grammar.construction;
  return {};
};

const getExamples = (grammar: GrammarPointData): GrammarExample[] =>
  Array.isArray(grammar.examples)
    ? grammar.examples.filter(
        (example): example is GrammarExample => isRecord(example) && typeof example.kr === 'string'
      )
    : [];

const getLocalizedExampleTranslation = (
  example: Pick<GrammarExample, 'cn' | 'en' | 'vi' | 'mn'>,
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

const getLocalizedQuizText = (
  value: GrammarQuizItem['prompt'] | GrammarQuizItem['answer'] | undefined,
  language: SupportedLanguage
): string => {
  if (!value) return '';

  const candidates =
    language === 'en'
      ? [value.en, value.zh, value.vi, value.mn]
      : language === 'vi'
        ? [value.vi, value.en, value.zh, value.mn]
        : language === 'mn'
          ? [value.mn, value.en, value.zh, value.vi]
          : [value.zh, value.en, value.vi, value.mn];

  return sanitizeGrammarDisplayText(
    candidates.find(text => typeof text === 'string' && text.trim().length > 0) || ''
  );
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

  if (isRecord(value)) {
    return Object.entries(value)
      .map(([key, entryValue]) => {
        const rendered = stringifyRuleValue(entryValue);
        return rendered.trim().length > 0 ? `${key}: ${rendered}` : key;
      })
      .join(' · ');
  }

  return '';
};

function extractTextContent(node: React.ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(extractTextContent).join('');
  if (React.isValidElement(node)) {
    return extractTextContent((node.props as { children?: React.ReactNode }).children);
  }
  return '';
}

function getStandaloneLineMaskKind(input: string): GrammarMaskKind | null {
  const stripped = stripGrammarMaskTokens(input).trim();
  if (stripped.length > 0) return null;
  if (input.includes(GRAMMAR_MASK_TRANSLATION_TOKEN)) return 'translation';
  if (input.includes(GRAMMAR_MASK_ANSWER_TOKEN)) return 'answer';
  return null;
}

function getNodeMaskKind(node: unknown): GrammarMaskKind | null {
  if (!isRecord(node)) return null;

  const properties = node.properties;
  if (isRecord(properties)) {
    const direct = properties['data-grammar-mask'];
    if (direct === 'translation' || direct === 'answer') return direct;
  }

  const data = node.data;
  if (!isRecord(data)) return null;
  const hProperties = data.hProperties;
  if (!isRecord(hProperties)) return null;
  const fromHProperties = hProperties['data-grammar-mask'];
  return fromHProperties === 'translation' || fromHProperties === 'answer' ? fromHProperties : null;
}

const isEmptySentence = (sentence: string): boolean => sentence.trim().length === 0;

const formatImportedAt = (value: number | undefined, locale: string): string => {
  if (typeof value !== 'number' || Number.isNaN(value)) return '';

  try {
    return new Intl.DateTimeFormat(locale || 'en', { dateStyle: 'medium' }).format(new Date(value));
  } catch {
    return new Date(value).toLocaleDateString();
  }
};

const getRevealMaskClassName = (enabled: boolean): string =>
  enabled ? 'select-none transition-[filter,opacity] duration-200' : '';

function isInteractiveElementTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;

  return Boolean(
    target.closest('input, textarea, select, button, a, [role="button"], [contenteditable="true"]')
  );
}

const RedEyeMask: React.FC<{
  enabled: boolean;
  kind: GrammarMaskKind;
  children: React.ReactNode;
  className?: string;
  style?: CSSProperties;
}> = ({ enabled, kind, children, className, style }) => {
  const [revealed, setRevealed] = useState(false);

  if (!enabled) {
    return (
      <span data-grammar-mask={kind} className={className} style={style}>
        {children}
      </span>
    );
  }

  return (
    <span
      data-grammar-mask={kind}
      role="button"
      tabIndex={0}
      className={className}
      style={{
        ...style,
        display: 'inline-block',
        cursor: 'pointer',
        filter: revealed ? 'none' : 'blur(7px)',
      }}
      onClick={() => setRevealed(previous => !previous)}
      onPointerEnter={() => setRevealed(true)}
      onPointerLeave={() => setRevealed(false)}
      onMouseEnter={() => setRevealed(true)}
      onMouseLeave={() => setRevealed(false)}
      onFocus={() => setRevealed(true)}
      onBlur={() => setRevealed(false)}
      onKeyDown={event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          setRevealed(previous => !previous);
        }
      }}
    >
      {children}
    </span>
  );
};

function wrapMaskedInlineNode(
  node: React.ReactNode,
  maskKind: GrammarMaskKind,
  redEyeEnabled: boolean,
  key: string
): React.ReactNode {
  return (
    <RedEyeMask
      key={key}
      enabled={redEyeEnabled}
      kind={maskKind}
      className={getRevealMaskClassName(redEyeEnabled)}
    >
      {node}
    </RedEyeMask>
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
      segments.push(stripGrammarMaskTokens(remaining));
      break;
    }

    const next = indices.sort((a, b) => a.index - b.index)[0];
    if (next.index > 0) {
      segments.push(stripGrammarMaskTokens(remaining.slice(0, next.index)));
    }

    if (next.kind === 'translation-line' || next.kind === 'answer-line') {
      const token =
        next.kind === 'translation-line'
          ? GRAMMAR_MASK_TRANSLATION_TOKEN
          : GRAMMAR_MASK_ANSWER_TOKEN;
      const maskKind: GrammarMaskKind = next.kind === 'translation-line' ? 'translation' : 'answer';
      const maskedContent = stripGrammarMaskTokens(remaining.slice(next.index + token.length));

      segments.push(
        <RedEyeMask
          key={`mask-${key++}`}
          enabled={redEyeEnabled}
          kind={maskKind}
          className={getRevealMaskClassName(redEyeEnabled)}
        >
          {maskedContent}
        </RedEyeMask>
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
    const maskKind: GrammarMaskKind = next.kind === 'translation-inline' ? 'translation' : 'answer';
    const endIndex = remaining.indexOf(endToken, next.index + startToken.length);

    if (endIndex < 0) {
      segments.push(stripGrammarMaskTokens(remaining));
      break;
    }

    const maskedContent = stripGrammarMaskTokens(
      remaining.slice(next.index + startToken.length, endIndex)
    );

    segments.push(
      <RedEyeMask
        key={`mask-${key++}`}
        enabled={redEyeEnabled}
        kind={maskKind}
        className={getRevealMaskClassName(redEyeEnabled)}
      >
        {maskedContent}
      </RedEyeMask>
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
    let pendingMask: GrammarMaskKind | null = null;

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

function renderMaskedBlockContent(
  children: React.ReactNode,
  maskKind: GrammarMaskKind | null,
  redEyeEnabled: boolean
): React.ReactNode {
  if (!maskKind) return renderMaskedNode(children, redEyeEnabled);
  if (!redEyeEnabled) return renderMaskedNode(children, false);

  return (
    <RedEyeMask
      enabled
      kind={maskKind}
      className={getRevealMaskClassName(true)}
      style={{ whiteSpace: 'normal' }}
    >
      {renderMaskedNode(children, false)}
    </RedEyeMask>
  );
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
              fontSize: 'var(--mobile-reader-title-size)',
              fontWeight: 800,
              lineHeight: 1.1,
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
              fontSize: 'var(--mobile-reader-section-size)',
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
              marginBottom: 10,
              fontSize: 'var(--mobile-reader-label-size)',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: 1.4,
              color: KT.sub,
            }}
          >
            {children}
          </h3>
        ),
        p: ({ children, node }) => {
          const rawText = extractTextContent(children);
          const nodeMaskKind = getNodeMaskKind(node);
          const maskKind =
            nodeMaskKind ||
            (rawText.trim().startsWith(GRAMMAR_MASK_TRANSLATION_TOKEN)
              ? 'translation'
              : rawText.trim().startsWith(GRAMMAR_MASK_ANSWER_TOKEN) ||
                  LEADING_ANSWER_LABEL_RE.test(stripGrammarMaskTokens(rawText).trim())
                ? 'answer'
                : null);

          return (
            <p
              style={{
                margin: '12px 0',
                fontSize: 'var(--mobile-reader-body-size)',
                lineHeight: 'var(--mobile-reader-body-leading)',
                color: KT.ink2,
              }}
            >
              {renderMaskedBlockContent(children, maskKind, redEyeEnabled)}
            </p>
          );
        },
        ul: ({ children }) => (
          <ul
            style={{
              margin: '12px 0',
              paddingLeft: 22,
              display: 'grid',
              gap: 6,
            }}
          >
            {children}
          </ul>
        ),
        ol: ({ children }) => (
          <ol
            style={{
              margin: '12px 0',
              paddingLeft: 22,
              display: 'grid',
              gap: 6,
            }}
          >
            {children}
          </ol>
        ),
        li: ({ children, node }) => {
          const rawText = extractTextContent(children);
          const nodeMaskKind = getNodeMaskKind(node);
          const maskKind =
            nodeMaskKind ||
            (rawText.trim().startsWith(GRAMMAR_MASK_TRANSLATION_TOKEN)
              ? 'translation'
              : rawText.trim().startsWith(GRAMMAR_MASK_ANSWER_TOKEN) ||
                  LEADING_ANSWER_LABEL_RE.test(stripGrammarMaskTokens(rawText).trim())
                ? 'answer'
                : null);

          return (
            <li
              style={{
                fontSize: 'var(--mobile-reader-list-size)',
                lineHeight: 'var(--mobile-reader-body-leading)',
                color: KT.ink2,
              }}
            >
              {renderMaskedBlockContent(children, maskKind, redEyeEnabled)}
            </li>
          );
        },
        strong: ({ children }) => (
          <strong
            style={{
              padding: '1px 5px',
              borderRadius: 6,
              background: `${KT.butter}99`,
              color: KT.ink,
              fontWeight: 800,
            }}
          >
            {children}
          </strong>
        ),
        a: ({ children, href }) => (
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            style={{
              color: KT.crimson,
              textDecoration: 'underline',
              textUnderlineOffset: 3,
            }}
          >
            {children}
          </a>
        ),
        blockquote: ({ children }) => (
          <blockquote
            style={{
              margin: '16px 0',
              padding: '14px 16px',
              borderLeft: `4px solid ${KT.crimson}`,
              borderRadius: 16,
              background: KT.bg2,
              color: KT.ink2,
            }}
          >
            {children}
          </blockquote>
        ),
        hr: () => (
          <hr
            style={{
              margin: '22px 0',
              border: 0,
              height: 1,
              background: KT.line,
            }}
          />
        ),
        table: ({ children }) => (
          <div
            className="hide-scroll"
            style={{
              margin: '16px 0',
              overflowX: 'auto',
              borderRadius: 16,
              border: `1px solid ${KT.line}`,
              background: KT.card,
            }}
          >
            <table
              style={{
                width: '100%',
                fontSize: '0.8rem',
                textAlign: 'left',
                borderCollapse: 'collapse',
              }}
            >
              {children}
            </table>
          </div>
        ),
        thead: ({ children }) => <thead style={{ background: KT.bg2 }}>{children}</thead>,
        th: ({ children }) => (
          <th
            style={{
              padding: '10px 12px',
              borderBottom: `1px solid ${KT.line}`,
              fontWeight: 800,
              color: KT.ink,
              whiteSpace: 'nowrap',
            }}
          >
            {children}
          </th>
        ),
        td: ({ children, node }) => {
          const rawText = extractTextContent(children);
          const nodeMaskKind = getNodeMaskKind(node);
          const maskKind =
            nodeMaskKind ||
            (rawText.trim().startsWith(GRAMMAR_MASK_TRANSLATION_TOKEN)
              ? 'translation'
              : rawText.trim().startsWith(GRAMMAR_MASK_ANSWER_TOKEN)
                ? 'answer'
                : null);

          return (
            <td
              style={{
                padding: '10px 12px',
                borderBottom: `1px solid ${KT.line}`,
                color: KT.ink2,
                verticalAlign: 'top',
              }}
            >
              {renderMaskedBlockContent(children, maskKind, redEyeEnabled)}
            </td>
          );
        },
        pre: ({ children }) => (
          <pre
            style={{
              margin: '16px 0',
              overflowX: 'auto',
              borderRadius: 18,
              background: KT.ink,
              color: KT.card,
              padding: '14px 16px',
              fontSize: 'var(--mobile-reader-block-code-size)',
              lineHeight: 1.65,
            }}
          >
            {children}
          </pre>
        ),
        code: ({ inline, className, children, ...props }: MarkdownCodeProps) => (
          <code
            className={className}
            style={
              inline
                ? {
                    padding: '1px 6px',
                    borderRadius: 6,
                    background: `${KT.sky}55`,
                    color: KT.ink,
                    fontSize: 'var(--mobile-reader-inline-code-size)',
                    fontWeight: 700,
                  }
                : undefined
            }
            {...props}
          >
            {children}
          </code>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
};

const ReaderDisplayControls: React.FC<{
  fontScale: ReaderFontScale;
  onChange: (value: ReaderFontScale) => void;
  redEyeEnabled: boolean;
  onToggleRedEye: () => void;
  t: TFunction;
}> = ({ fontScale, onChange, redEyeEnabled, onToggleRedEye, t }) => (
  <div
    style={{
      background: 'rgba(255,255,255,0.92)',
      boxShadow: KT.shSm,
      backdropFilter: 'blur(16px)',
      borderRadius: 20,
      border: `1px solid ${KT.line}`,
      padding: '6px 8px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
    }}
  >
    <div className="flex items-center gap-1">
      {READER_FONT_SCALE_OPTIONS.map(option => {
        const active = option.value === fontScale;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            aria-label={t(option.titleKey, { defaultValue: `Font size: ${option.titleDefault}` })}
            className="flex h-9 px-3 items-center justify-center rounded-xl transition-all active:scale-95"
            style={{
              background: active ? KT.ink : 'transparent',
              color: active ? KT.card : KT.sub,
              fontSize: option.value === 'compact' ? 12 : option.value === 'comfortable' ? 14 : 16,
              fontWeight: 800,
            }}
          >
            {option.label}
          </button>
        );
      })}
    </div>

    <div className="h-4 w-[1px] bg-zinc-200 mx-1" />

    <button
      type="button"
      onClick={onToggleRedEye}
      aria-label={t('grammarDetail.redEyeMode', { defaultValue: 'Red eye mode' })}
      className="flex h-9 w-12 items-center justify-center rounded-xl transition-all active:scale-95"
      style={{
        background: redEyeEnabled ? `${KT.pink}88` : 'transparent',
        color: redEyeEnabled ? KT.crimson : KT.sub,
        border: redEyeEnabled ? `1px solid ${KT.crimson}22` : 'none',
      }}
    >
      {redEyeEnabled ? <EyeOff size={18} /> : <Eye size={18} />}
    </button>
  </div>
);

export default function MobileGrammarDetailSheet({
  grammar,
  onClose,
  onProficiencyUpdate,
  instituteId: _instituteId,
}: MobileGrammarDetailSheetProps) {
  const { i18n, t } = useTranslation();
  const [aiFeedback, setAiFeedback] = useState<AiFeedbackState | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [redEyeEnabled, setRedEyeEnabled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return safeGetLocalStorageItem(RED_EYE_STORAGE_KEY) === '1';
  });
  const [fontScale, setFontScale] = useState<ReaderFontScale>(() => {
    if (typeof window === 'undefined') return 'comfortable';
    const stored = safeGetLocalStorageItem(READER_FONT_SCALE_STORAGE_KEY);
    return stored && isReaderFontScale(stored) ? stored : 'comfortable';
  });

  const dragStartY = useRef(0);
  const readerScrollRef = useRef<HTMLDivElement | null>(null);
  const updateUserSettings = useMutation(
    mRef<{ fontScale?: ReaderFontScale }, unknown>('userSettings:updateSettings')
  );

  useEffect(() => {
    safeSetLocalStorageItem(RED_EYE_STORAGE_KEY, redEyeEnabled ? '1' : '0');
  }, [redEyeEnabled]);

  useEffect(() => {
    safeSetLocalStorageItem(READER_FONT_SCALE_STORAGE_KEY, fontScale);
    const timeoutId = window.setTimeout(() => {
      void updateUserSettings({ fontScale }).catch(() => {
        // 用户未登录或网络抖动时，继续保留本地字体偏好，不中断阅读。
      });
    }, 300);
    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [fontScale, updateUserSettings]);

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
    setAiFeedback(null);
    setShowConfetti(false);
    setIsExpanded(true);
  }, [grammar?.id]);

  if (!grammar) return null;

  const language = resolveSupportedLanguage(i18n.language);
  const readerVars = READER_FONT_SCALE_VARS[fontScale];
  const localizedTitle = getLocalizedTitle(grammar, language);
  const localizedExplanation = getLocalizedExplanation(grammar, language);
  const markdownDocument = stripLeadingDuplicateHeading(
    sanitizeGrammarMarkdown(
      localizedExplanation || buildMarkdownFromSections(grammar.sections, language)
    ),
    localizedTitle
  );
  const localizedCustomNote = getLocalizedCustomNote(grammar, language);
  const renderedRules = Object.entries(getRulesObject(grammar))
    .map(([key, value]) => ({ key, value: stringifyRuleValue(value) }))
    .filter(rule => rule.value.trim().length > 0);
  const examples = getExamples(grammar);
  const quizItems: LocalizedQuizItem[] = (grammar.quizItems ?? [])
    .map(item => ({
      prompt: getLocalizedQuizText(item.prompt, language),
      answer: getLocalizedQuizText(item.answer, language),
    }))
    .filter(item => item.prompt.trim().length > 0 || item.answer.trim().length > 0);
  const status = aiFeedback?.progress?.status ?? grammar.status ?? 'NEW';
  const tone = getGrammarTone(grammar.type);
  const statusLabel =
    status === 'MASTERED'
      ? t('grammar.status.mastered', { defaultValue: 'Mastered' })
      : status === 'LEARNING'
        ? t('grammar.status.learning', { defaultValue: 'Learning' })
        : t('grammar.status.new', { defaultValue: 'New' });
  const importedAtLabel = formatImportedAt(grammar.sourceMeta?.importedAt, i18n.language || 'en');

  const handleCheck = async (sentence: string) => {
    const trimmedSentence = sentence.trim();
    if (!trimmedSentence) return;

    setIsChecking(true);
    setAiFeedback(null);

    try {
      const response = await checkAction({
        sentence: trimmedSentence,
        context: localizedTitle,
        language: i18n.language,
      });

      const result = response as AiCheckResponse;
      if (!result?.success || !result.data) return;

      const feedback = getFeedbackText(result.data.nuance);
      const isFeedbackNegative = isNegativeFeedback(feedback);
      const aiIsCorrect =
        typeof result.data.isCorrect === 'boolean' ? result.data.isCorrect : undefined;
      const finalIsCorrect = aiIsCorrect ?? !isFeedbackNegative;
      const correctedSentence =
        typeof result.data.corrected === 'string' && result.data.corrected.trim().length > 0
          ? result.data.corrected.trim()
          : undefined;

      let progress: { proficiency: number; status: string } | undefined;
      if (finalIsCorrect) {
        const updateResult = await updateStatus({
          grammarId: grammar.id as unknown as Id<'grammar_points'>,
          increment: 50,
        });
        progress = updateResult;

        if (updateResult.proficiency >= 100) {
          triggerConfetti(setShowConfetti);
        }

        onProficiencyUpdate?.(
          grammar.id,
          updateResult.proficiency,
          updateResult.status as GrammarPointData['status']
        );
      }

      setAiFeedback({
        isCorrect: finalIsCorrect,
        feedback,
        correctedSentence,
        progress,
      });
    } catch (error) {
      console.error('Check failed', error);
      setAiFeedback({
        isCorrect: false,
        feedback: t('grammarDetail.checkError', { defaultValue: 'Error checking sentence.' }),
      });
    } finally {
      setIsChecking(false);
    }
  };

  const handleToggleStatus = () => {
    const nextStatus = grammar.status === 'MASTERED' ? 'LEARNING' : 'MASTERED';

    void updateStatus({
      grammarId: grammar.id as unknown as Id<'grammar_points'>,
      status: nextStatus,
    }).then(result => {
      onProficiencyUpdate?.(
        grammar.id,
        result.proficiency,
        result.status as GrammarPointData['status']
      );

      if (result.status === 'MASTERED') {
        triggerConfetti(setShowConfetti);
      }
    });
  };

  const handleDragStart = (event: React.TouchEvent | React.MouseEvent) => {
    const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY;
    dragStartY.current = clientY;
  };

  const handleDragEnd = (event: React.TouchEvent | React.MouseEvent) => {
    const clientY = 'changedTouches' in event ? event.changedTouches[0].clientY : event.clientY;
    const delta = dragStartY.current - clientY;
    if (delta > 40) setIsExpanded(true);
    if (delta < -40) setIsExpanded(false);
  };

  const forwardWheelToReader = (event: React.WheelEvent<HTMLElement>) => {
    if (isInteractiveElementTarget(event.target)) return;

    const reader = readerScrollRef.current;
    if (!reader) return;
    if (Math.abs(event.deltaY) < 0.5 && Math.abs(event.deltaX) < 0.5) return;

    const canScrollVertically = reader.scrollHeight > reader.clientHeight;
    const canScrollHorizontally = reader.scrollWidth > reader.clientWidth;
    if (!canScrollVertically && !canScrollHorizontally) return;

    reader.scrollBy({
      top: event.deltaY,
      left: event.deltaX,
      behavior: 'auto',
    });
    event.preventDefault();
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
          lockBodyScroll
          className={`fixed bottom-0 left-0 right-0 z-[61] flex flex-col overflow-hidden transition-[height] duration-300 ease-out ${
            isExpanded ? 'h-[94dvh]' : 'h-[62dvh]'
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
            className="shrink-0 cursor-grab select-none active:cursor-grabbing"
            onTouchStart={handleDragStart}
            onTouchEnd={handleDragEnd}
            onMouseDown={handleDragStart}
            onMouseUp={handleDragEnd}
            onWheel={forwardWheelToReader}
            onClick={() => setIsExpanded(previous => !previous)}
            style={{
              background: `linear-gradient(180deg, ${KT.bg2} 0%, ${KT.bg} 100%)`,
              borderBottom: `1px solid ${KT.line}`,
            }}
          >
            <div className="flex justify-center pb-1 pt-3">
              <div
                className="h-1 w-10 rounded-full"
                style={{ background: 'rgba(31,27,23,0.14)' }}
              />
            </div>

            <div
              className="relative z-10"
              onCopy={event => event.preventDefault()}
              onContextMenu={event => event.preventDefault()}
              style={{ padding: '10px 18px 18px' }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 800,
                      color: KT.sub,
                      letterSpacing: 1.1,
                    }}
                  >
                    {grammar.level ? `${grammar.level} · ` : ''}
                    {statusLabel}
                  </div>
                  <div
                    style={{
                      marginTop: 6,
                      fontFamily: KT.serif,
                      fontSize: 13,
                      color: KT.crimson,
                      letterSpacing: 3.2,
                      fontWeight: 500,
                    }}
                  >
                    語法 · MOBILE
                  </div>
                </div>

                <div className="flex items-center gap-2" onClick={event => event.stopPropagation()}>
                  <button
                    type="button"
                    onClick={handleToggleStatus}
                    aria-label={t('grammar.status.mastered', { defaultValue: 'Mastered' })}
                    className="flex h-10 w-10 items-center justify-center rounded-full transition-all active:scale-95"
                    style={{
                      border: status === 'MASTERED' ? 'none' : `1px solid ${KT.line}`,
                      background: status === 'MASTERED' ? KT.mint : KT.card,
                      color: status === 'MASTERED' ? KT.mintDeep : KT.sub,
                      boxShadow: KT.shSm,
                    }}
                  >
                    <Trophy size={16} fill={status === 'MASTERED' ? 'currentColor' : 'none'} />
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    aria-label={t('common.close', { defaultValue: 'Close' })}
                    className="flex h-10 w-10 items-center justify-center rounded-full transition-all active:scale-95"
                    style={{
                      border: `1px solid ${KT.line}`,
                      background: KT.card,
                      color: KT.sub,
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
                  marginTop: 14,
                  background: tone.gradient,
                  boxShadow: KT.sh,
                }}
              >
                <div className="flex items-center gap-3">
                  <HanjaSeal c={tone.seal} size={44} bg={tone.deep} round={12} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
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
                        marginTop: 4,
                        fontSize: 24,
                        fontWeight: 800,
                        color: KT.ink,
                        letterSpacing: -0.6,
                        lineHeight: 1.1,
                      }}
                    >
                      {localizedTitle}
                    </div>
                  </div>
                </div>

                {/* Simplified Expand/Collapse handle */}
                <div className="mt-4 flex justify-center">
                  <div
                    className="flex items-center gap-1.5 rounded-full px-3 py-1"
                    style={{
                      background: 'rgba(255,255,255,0.6)',
                      color: tone.deep,
                      fontSize: 10,
                      fontWeight: 800,
                    }}
                  >
                    <Sparkles size={12} />
                    <span>
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
            ref={readerScrollRef}
            className={`flex-1 overflow-y-auto select-none print:hidden transition-[opacity,transform] duration-300 ${
              isExpanded ? 'opacity-100' : 'pointer-events-none opacity-0'
            }`}
            onCopy={event => event.preventDefault()}
            onContextMenu={event => event.preventDefault()}
            onDragStart={event => event.preventDefault()}
            style={{
              padding: '14px 18px 0',
              transform: isExpanded ? 'translateY(0)' : 'translateY(12px)',
              WebkitOverflowScrolling: 'touch',
              overscrollBehavior: 'contain',
              touchAction: 'pan-y',
            }}
          >
            <article
              data-testid="mobile-grammar-reader-shell"
              data-font-scale={fontScale}
              data-red-eye={redEyeEnabled ? 'on' : 'off'}
              style={readerVars}
            >
              {/* Reader Controls */}
              <div className="sticky top-0 z-10 pb-3" onWheel={forwardWheelToReader}>
                <ReaderDisplayControls
                  fontScale={fontScale}
                  onChange={setFontScale}
                  redEyeEnabled={redEyeEnabled}
                  onToggleRedEye={() => setRedEyeEnabled(previous => !previous)}
                  t={t}
                />
              </div>

              {markdownDocument.trim() ? (
                <Card
                  pad={20}
                  style={{
                    boxShadow: KT.shSm,
                    background: `linear-gradient(180deg, ${KT.card} 0%, rgba(255,255,255,0.92) 100%)`,
                  }}
                >
                  <SectionHead
                    kanji="文"
                    title={t('grammarDetail.explanation', { defaultValue: 'Explanation' })}
                  />
                  <div style={{ marginTop: 6 }}>
                    <MarkdownRenderer content={markdownDocument} redEyeEnabled={redEyeEnabled} />
                  </div>
                </Card>
              ) : null}

              {grammar.sourceMeta ? (
                <div
                  style={{
                    marginTop: 24,
                    padding: '0 4px 40px',
                    fontSize: 10,
                    fontWeight: 800,
                    color: KT.sub,
                    opacity: 0.6,
                    letterSpacing: 0.5,
                  }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span style={{ color: KT.ink }}>SOURCE TYPE:</span>
                    <span>{grammar.sourceMeta.sourceType}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span style={{ color: KT.ink }}>SOURCE PATH:</span>
                    <span className="truncate">{grammar.sourceMeta.sourcePath}</span>
                  </div>
                  {importedAtLabel && <div className="mt-1">IMPORTED: {importedAtLabel}</div>}
                </div>
              ) : null}

              {renderedRules.length > 0 ? (
                <Card
                  pad={18}
                  style={{
                    marginTop: 12,
                    background: `linear-gradient(135deg, ${tone.surface} 0%, ${KT.card} 82%)`,
                    boxShadow: KT.shSm,
                  }}
                >
                  <SectionHead
                    kanji="式"
                    title={t('grammarDetail.rules', { defaultValue: 'Conjugation rules' })}
                  />
                  <div className="mt-3 grid gap-3">
                    {renderedRules.map(rule => (
                      <div
                        key={rule.key}
                        style={{
                          borderRadius: 18,
                          background: KT.card,
                          padding: '14px 16px',
                          boxShadow: KT.shSm,
                        }}
                      >
                        <div
                          style={{
                            fontSize: 11,
                            fontWeight: 800,
                            color: KT.sub,
                            letterSpacing: 0.9,
                          }}
                        >
                          {rule.key}
                        </div>
                        <div
                          style={{
                            marginTop: 6,
                            fontSize: 14,
                            fontWeight: 700,
                            color: KT.ink,
                            lineHeight: 1.6,
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
                      title={`${t('grammarDetail.examples', { defaultValue: 'Examples' })} · ${examples.length}`}
                    />
                  </div>
                  {examples.map((example, index) => {
                    const translation = getLocalizedExampleTranslation(example, language);
                    return (
                      <div
                        key={`${example.kr}-${index}`}
                        style={{
                          padding: '14px 20px',
                          borderTop: index === 0 ? 'none' : `1px solid ${KT.line}`,
                        }}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className="flex h-8 w-8 items-center justify-center rounded-full"
                            style={{
                              background: tone.surface,
                              color: tone.deep,
                              fontSize: 11,
                              fontWeight: 800,
                            }}
                          >
                            {index + 1}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div
                              style={{
                                fontSize: 'var(--mobile-reader-example-size)',
                                fontWeight: 700,
                                color: KT.ink,
                                lineHeight: 1.65,
                              }}
                            >
                              {example.kr}
                            </div>
                            {translation ? (
                              <div
                                data-testid={`mobile-grammar-example-translation-${index}`}
                                style={{
                                  marginTop: 7,
                                  fontSize: 'var(--mobile-reader-translation-size)',
                                  color: KT.sub,
                                  lineHeight: 1.65,
                                }}
                              >
                                <RedEyeMask
                                  enabled={redEyeEnabled}
                                  kind="translation"
                                  className={getRevealMaskClassName(redEyeEnabled)}
                                  style={{ whiteSpace: 'normal' }}
                                >
                                  {translation}
                                </RedEyeMask>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </Card>
              ) : null}

              {quizItems.length > 0 ? (
                <Card pad={0} style={{ marginTop: 12, overflow: 'hidden', boxShadow: KT.shSm }}>
                  <div style={{ padding: '18px 20px 12px' }}>
                    <SectionHead
                      kanji="問"
                      title={`${t('grammarDetail.quizzes', { defaultValue: 'Practice quizzes' })} · ${quizItems.length}`}
                    />
                  </div>
                  {quizItems.map((quiz, index) => (
                    <div
                      key={`quiz-${index}`}
                      style={{
                        padding: '14px 20px',
                        borderTop: index === 0 ? 'none' : `1px solid ${KT.line}`,
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className="flex h-8 w-8 items-center justify-center rounded-full"
                          style={{
                            background: `${KT.sky}55`,
                            color: tone.deep,
                            fontSize: 11,
                            fontWeight: 800,
                          }}
                        >
                          Q{index + 1}
                        </div>
                        <div className="min-w-0 flex-1">
                          {quiz.prompt ? (
                            <div
                              style={{
                                fontSize: 14,
                                fontWeight: 700,
                                color: KT.ink,
                                lineHeight: 1.6,
                              }}
                            >
                              {quiz.prompt}
                            </div>
                          ) : null}
                          {quiz.answer ? (
                            <div
                              data-testid={`mobile-grammar-quiz-answer-${index}`}
                              style={{
                                marginTop: 8,
                                fontSize: 13,
                                color: KT.sub,
                                lineHeight: 1.65,
                              }}
                            >
                              <RedEyeMask
                                enabled={redEyeEnabled}
                                kind="answer"
                                className={getRevealMaskClassName(redEyeEnabled)}
                                style={{ whiteSpace: 'normal' }}
                              >
                                {t('grammarDetail.answerShort', { defaultValue: 'Ans.' })}{' '}
                                {quiz.answer}
                              </RedEyeMask>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ))}
                </Card>
              ) : null}

              {localizedCustomNote ? (
                <Card
                  pad={18}
                  tone="bg2"
                  style={{
                    marginTop: 12,
                    boxShadow: KT.shSm,
                  }}
                >
                  <SectionHead
                    kanji="註"
                    title={t('grammarDetail.customNote', { defaultValue: 'Instructor note' })}
                  />
                  <div style={{ marginTop: 6 }}>
                    <MarkdownRenderer content={localizedCustomNote} redEyeEnabled={false} />
                  </div>
                </Card>
              ) : null}

              <div style={{ height: 18 }} />
            </article>
          </div>

          <div
            className="relative z-10"
            onWheel={forwardWheelToReader}
            style={{
              padding: '14px 18px calc(env(safe-area-inset-bottom) + 18px)',
              borderTop: `1px solid ${KT.line}`,
              background: `linear-gradient(180deg, rgba(245,239,229,0) 0%, ${KT.bg2} 28%, ${KT.bg2} 100%)`,
            }}
          >
            <MobileGrammarPracticeComposer
              key={grammar.id}
              localizedTitle={localizedTitle}
              statusLabel={statusLabel}
              tone={tone}
              aiFeedback={aiFeedback}
              isChecking={isChecking}
              onCheck={handleCheck}
              t={t}
            />
          </div>

          {showConfetti ? (
            <div className="pointer-events-none absolute inset-0 z-[70] flex items-start justify-center overflow-hidden">
              {Array.from({ length: 15 }).map((_, index) => (
                <motion.div
                  key={index}
                  initial={{ y: -20, x: (Math.random() - 0.5) * 300, rotate: 0 }}
                  animate={{ y: 800, rotate: 720 }}
                  transition={{ duration: 2, delay: Math.random() * 0.5, ease: 'linear' }}
                  className="absolute text-2xl"
                >
                  {['🎉', '⭐', '✨'][index % 3]}
                </motion.div>
              ))}
            </div>
          ) : null}
        </SheetContent>
      </SheetPortal>
    </Sheet>
  );
}
