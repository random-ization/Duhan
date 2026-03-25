import React, { CSSProperties, useEffect, useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Eye, EyeOff, Lightbulb, Sparkles, Type } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { GrammarPointData } from '../../types';
import {
  GRAMMAR_MASK_ANSWER_TOKEN,
  GRAMMAR_MASK_ANSWER_END_TOKEN,
  GRAMMAR_MASK_ANSWER_START_TOKEN,
  GRAMMAR_MASK_TRANSLATION_TOKEN,
  GRAMMAR_MASK_TRANSLATION_END_TOKEN,
  GRAMMAR_MASK_TRANSLATION_START_TOKEN,
  getGrammarMaskKind,
  sanitizeGrammarDisplayText,
  sanitizeGrammarMarkdown,
  stripGrammarMaskTokens,
  stripLeadingDuplicateHeading,
} from '../../utils/grammarDisplaySanitizer';
import { remarkGrammarMasking } from '../../utils/grammarMaskingRemark';
import { Badge, Button, Card, CardContent, CardHeader } from '../ui';

type TranslateFn = (key: string, options?: string | Record<string, unknown>) => string;
type SupportedLanguage = 'zh' | 'en' | 'vi' | 'mn';
type LocalizedSection = { zh?: string; en?: string; vi?: string; mn?: string };
type ReaderFontScale = 'compact' | 'comfortable' | 'relaxed' | 'large';

const READER_FONT_SCALE_STORAGE_KEY = 'grammar_reader_font_scale';
const READER_RED_EYE_STORAGE_KEY = 'grammar_reader_red_eye';

const READER_FONT_SCALE_OPTIONS: Array<{
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
  { value: 'large', label: 'A++', titleKey: 'grammarDetail.fontScaleLarge', titleDefault: 'Large' },
];

const READER_FONT_SCALE_VARS: Record<ReaderFontScale, Record<string, string>> = {
  compact: {
    '--reader-hero-title-size': 'clamp(1.88rem, 2.55vw, 2.52rem)',
    '--reader-hero-title-leading': '1.12',
    '--reader-summary-size': '1.02rem',
    '--reader-summary-leading': '1.82',
    '--reader-section-title-size': 'clamp(1.28rem, 1.65vw, 1.7rem)',
    '--reader-section-title-leading': '1.24',
    '--reader-subsection-size': '0.72rem',
    '--reader-body-size': '1.04rem',
    '--reader-body-leading': '1.92',
    '--reader-list-size': '1.01rem',
    '--reader-list-leading': '1.9',
    '--reader-inline-code-size': '0.9em',
    '--reader-block-code-size': '0.98rem',
    '--reader-example-original-size': '1.08rem',
    '--reader-example-translation-size': '0.96rem',
    '--reader-content-measure': '100%',
    '--reader-hero-measure': '100%',
    '--reader-summary-measure': '100%',
  },
  comfortable: {
    '--reader-hero-title-size': 'clamp(1.98rem, 2.75vw, 2.68rem)',
    '--reader-hero-title-leading': '1.12',
    '--reader-summary-size': '1.05rem',
    '--reader-summary-leading': '1.84',
    '--reader-section-title-size': 'clamp(1.34rem, 1.8vw, 1.8rem)',
    '--reader-section-title-leading': '1.22',
    '--reader-subsection-size': '0.74rem',
    '--reader-body-size': '1.04rem',
    '--reader-body-leading': '1.9',
    '--reader-list-size': '1rem',
    '--reader-list-leading': '1.88',
    '--reader-inline-code-size': '0.93em',
    '--reader-block-code-size': '0.98rem',
    '--reader-example-original-size': '1.08rem',
    '--reader-example-translation-size': '0.96rem',
    '--reader-content-measure': '100%',
    '--reader-hero-measure': '100%',
    '--reader-summary-measure': '100%',
  },
  relaxed: {
    '--reader-hero-title-size': 'clamp(2.3rem, 3.2vw, 3.15rem)',
    '--reader-hero-title-leading': '1.1',
    '--reader-summary-size': '1.18rem',
    '--reader-summary-leading': '1.92',
    '--reader-section-title-size': 'clamp(1.45rem, 1.95vw, 1.95rem)',
    '--reader-section-title-leading': '1.2',
    '--reader-subsection-size': '0.76rem',
    '--reader-body-size': '1.16rem',
    '--reader-body-leading': '2',
    '--reader-list-size': '1.12rem',
    '--reader-list-leading': '1.98',
    '--reader-inline-code-size': '0.96em',
    '--reader-block-code-size': '1.04rem',
    '--reader-example-original-size': '1.22rem',
    '--reader-example-translation-size': '1.04rem',
    '--reader-content-measure': '100%',
    '--reader-hero-measure': '100%',
    '--reader-summary-measure': '100%',
  },
  large: {
    '--reader-hero-title-size': 'clamp(2.5rem, 3.45vw, 3.45rem)',
    '--reader-hero-title-leading': '1.09',
    '--reader-summary-size': '1.24rem',
    '--reader-summary-leading': '1.96',
    '--reader-section-title-size': 'clamp(1.56rem, 2.08vw, 2.08rem)',
    '--reader-section-title-leading': '1.18',
    '--reader-subsection-size': '0.78rem',
    '--reader-body-size': '1.22rem',
    '--reader-body-leading': '2.04',
    '--reader-list-size': '1.18rem',
    '--reader-list-leading': '2.02',
    '--reader-inline-code-size': '1em',
    '--reader-block-code-size': '1.08rem',
    '--reader-example-original-size': '1.3rem',
    '--reader-example-translation-size': '1.08rem',
    '--reader-content-measure': '100%',
    '--reader-hero-measure': '100%',
    '--reader-summary-measure': '100%',
  },
};

interface GrammarDetailPaneProps {
  grammar: GrammarPointData | null;
  onNext?: () => void;
  onPrev?: () => void;
  hasNext?: boolean;
  hasPrev?: boolean;
}

function isReaderFontScale(value: string): value is ReaderFontScale {
  return value === 'compact' || value === 'comfortable' || value === 'relaxed' || value === 'large';
}

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

function resolveSupportedLanguage(language?: string): SupportedLanguage {
  const normalized = (language || '').toLowerCase();
  if (normalized.startsWith('en')) return 'en';
  if (normalized.startsWith('vi')) return 'vi';
  if (normalized.startsWith('mn')) return 'mn';
  return 'zh';
}

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

function getLocalizedTitle(grammar: GrammarPointData, language: SupportedLanguage): string {
  if (language === 'zh') return grammar.titleZh || grammar.title;
  if (language === 'vi') return grammar.titleVi || grammar.title;
  if (language === 'mn') return grammar.titleMn || grammar.title;
  return grammar.titleEn || grammar.title;
}

function getLocalizedSummary(grammar: GrammarPointData, language: SupportedLanguage): string {
  if (language === 'en') return grammar.summaryEn || '';
  if (language === 'vi') return grammar.summaryVi || '';
  if (language === 'mn') return grammar.summaryMn || '';
  return grammar.summary || '';
}

function getLocalizedExplanation(grammar: GrammarPointData, language: SupportedLanguage): string {
  if (language === 'en') return grammar.explanationEn || '';
  if (language === 'vi') return grammar.explanationVi || '';
  if (language === 'mn') return grammar.explanationMn || '';
  return grammar.explanation || '';
}

function getLocalizedExampleTranslation(
  example: { cn?: string; en?: string; vi?: string; mn?: string },
  language: SupportedLanguage
): string {
  if (language === 'en') return example.en || '';
  if (language === 'vi') return example.vi || '';
  if (language === 'mn') return example.mn || '';
  return example.cn || '';
}

function getLocalizedCustomNote(grammar: GrammarPointData, language: SupportedLanguage): string {
  if (language === 'en') return grammar.customNoteEn || '';
  if (language === 'vi') return grammar.customNoteVi || '';
  if (language === 'mn') return grammar.customNoteMn || '';
  return grammar.customNote || '';
}

function resolveRulesObject(grammar: GrammarPointData): Record<string, unknown> {
  const conjugationRules =
    grammar.conjugationRules && typeof grammar.conjugationRules === 'object'
      ? (grammar.conjugationRules as Record<string, unknown>)
      : {};
  const construction = grammar.construction || {};

  return Object.keys(conjugationRules).length > 0 ? conjugationRules : construction;
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
    { key: 'comparative', title: 'Comparative' },
    { key: 'cultural', title: 'Cultural Notes' },
    { key: 'commonMistakes', title: 'Common Mistakes' },
    { key: 'review', title: 'Review' },
  ];

  const blocks = sectionDefs
    .map(def => {
      const content = getLocalizedSectionText(sections[def.key], language);
      if (!content) return '';
      return `## ${def.title}\n\n${content}`;
    })
    .filter(Boolean);

  return blocks.join('\n\n');
}

const MarkdownRenderer: React.FC<{
  content: string;
  t: TranslateFn;
  redEyeEnabled: boolean;
}> = ({ content, t, redEyeEnabled }) => {
  if (!content.trim()) return null;

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkGrammarMasking]}
      components={{
        h1: ({ children }) => (
          <h1
            className="mt-12 font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-500 dark:from-white dark:to-slate-400"
            style={{
              fontSize: 'var(--reader-hero-title-size)',
              lineHeight: 'var(--reader-hero-title-leading)',
            }}
          >
            {children}
          </h1>
        ),
        h2: ({ children }) => (
          <h2
            className="mt-14 mb-6 flex items-center gap-3 border-b border-slate-200 pb-3 font-bold tracking-tight text-slate-900 dark:border-slate-800 dark:text-slate-100"
            style={{
              fontSize: 'var(--reader-section-title-size)',
              lineHeight: 'var(--reader-section-title-leading)',
            }}
          >
            <span className="text-lg font-black text-indigo-500 dark:text-indigo-300">❖</span>
            <span>{children}</span>
          </h2>
        ),
        h3: ({ children }) => (
          <h3
            className="mb-4 mt-8 font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400"
            style={{ fontSize: 'var(--reader-subsection-size)' }}
          >
            {children}
          </h3>
        ),
        p: ({ children, node: _node }) => {
          const rawText = extractTextContent(children);
          const maskKind = getGrammarMaskKind(rawText);
          return (
            <p
              className={`my-5 text-slate-700 dark:text-slate-300 ${
                maskKind ? getRedEyeMaskClass(redEyeEnabled) : ''
              }`}
              style={{
                fontSize: 'var(--reader-body-size)',
                lineHeight: 'var(--reader-body-leading)',
                maxWidth: 'var(--reader-content-measure)',
              }}
              data-grammar-mask={maskKind || undefined}
            >
              {renderMaskedNode(children, maskKind ? false : redEyeEnabled)}
            </p>
          );
        },
        ul: ({ children }) => (
          <ul
            className="my-5 list-disc space-y-2 pl-6 marker:text-indigo-400 dark:marker:text-indigo-300"
            style={{ maxWidth: 'var(--reader-content-measure)' }}
          >
            {children}
          </ul>
        ),
        ol: ({ children }) => (
          <ol
            className="my-5 list-decimal space-y-3 pl-6 marker:font-semibold marker:text-indigo-500 dark:marker:text-indigo-300"
            style={{ maxWidth: 'var(--reader-content-measure)' }}
          >
            {children}
          </ol>
        ),
        li: ({ children, node: _node }) => {
          const rawText = extractTextContent(children);
          const maskKind = getGrammarMaskKind(rawText);
          return (
            <li
              className={`pl-1 text-slate-700 dark:text-slate-300 ${
                maskKind ? getRedEyeMaskClass(redEyeEnabled) : ''
              }`}
              style={{
                fontSize: 'var(--reader-list-size)',
                lineHeight: 'var(--reader-list-leading)',
              }}
              data-grammar-mask={maskKind || undefined}
            >
              {renderMaskedNode(children, maskKind ? false : redEyeEnabled)}
            </li>
          );
        },
        hr: () => <hr className="my-10 border-0 h-px bg-slate-200 dark:bg-slate-800" />,
        blockquote: ({ children }) => (
          <blockquote
            className="my-7 rounded-2xl border border-indigo-200/50 border-l-4 border-l-indigo-500 bg-indigo-50/60 backdrop-blur-md px-5 py-5 not-italic text-slate-700 shadow-sm dark:border-indigo-500/30 dark:border-l-indigo-400 dark:bg-indigo-500/10 dark:text-slate-200"
            style={{ maxWidth: 'calc(var(--reader-content-measure) + 2ch)' }}
          >
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-indigo-700 dark:text-indigo-200">
              <Lightbulb className="h-4 w-4" />
              {t('grammarDetail.learningNote', { defaultValue: 'Learning note' })}
            </div>
            <div>{children}</div>
          </blockquote>
        ),
        table: ({ children }) => (
          <div className="my-7 overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <table
              className="m-0 w-full border-separate border-spacing-0"
              style={{ fontSize: 'calc(var(--reader-body-size) * 0.92)' }}
            >
              {children}
            </table>
          </div>
        ),
        thead: ({ children }) => (
          <thead className="bg-slate-50 text-slate-600 dark:bg-slate-900 dark:text-slate-300">
            {children}
          </thead>
        ),
        tbody: ({ children }) => (
          <tbody className="[&_tr:nth-child(even)]:bg-slate-50/80 [&_tr:hover]:bg-blue-50/60 dark:[&_tr:nth-child(even)]:bg-slate-900/80 dark:[&_tr:hover]:bg-blue-500/10">
            {children}
          </tbody>
        ),
        th: ({ children }) => (
          <th className="border-b border-r border-slate-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-600 last:border-r-0 dark:border-slate-800 dark:text-slate-300">
            {children}
          </th>
        ),
        td: ({ children }) => {
          const rawText = extractTextContent(children);
          const maskKind = getGrammarMaskKind(rawText);
          return (
            <td
              className={`border-b border-r border-slate-200 px-4 py-3 align-top text-sm text-slate-700 last:border-r-0 dark:border-slate-800 dark:text-slate-300 ${
                maskKind ? getRedEyeMaskClass(redEyeEnabled) : ''
              }`}
              data-grammar-mask={maskKind || undefined}
            >
              {renderMaskedNode(children, maskKind ? false : redEyeEnabled)}
            </td>
          );
        },
        strong: ({ children }) => (
          <strong
            className="rounded-md bg-indigo-50 px-1.5 py-0.5 font-semibold text-indigo-700 dark:bg-indigo-500/12 dark:text-indigo-200"
            style={{ fontSize: 'var(--reader-inline-code-size)' }}
          >
            {children}
          </strong>
        ),
        pre: ({ children }) => (
          <pre
            className="my-6 overflow-x-auto rounded-2xl border border-slate-700 bg-gradient-to-br from-slate-800 to-slate-900 p-5 text-slate-100 shadow-lg dark:border-slate-700 dark:from-slate-900 dark:to-slate-950"
            style={{ fontSize: 'var(--reader-block-code-size)' }}
          >
            {children}
          </pre>
        ),
        code: ({ inline, className, children, ...props }: any) => (
          <code
            className={
              inline
                ? 'rounded-md bg-slate-100 px-2 py-1 font-semibold text-indigo-700 dark:bg-slate-800 dark:text-indigo-200'
                : className
            }
            style={inline ? { fontSize: 'var(--reader-inline-code-size)' } : undefined}
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
  t: TranslateFn;
}> = ({ fontScale, onChange, redEyeEnabled, onToggleRedEye, t }) => {
  const [fontPickerHover, setFontPickerHover] = useState(false);
  const [fontPickerPinned, setFontPickerPinned] = useState(false);
  const controlsRef = useRef<HTMLDivElement | null>(null);
  const fontPickerOpen = fontPickerHover || fontPickerPinned;

  useEffect(() => {
    if (!fontPickerPinned) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (target && controlsRef.current?.contains(target)) return;
      setFontPickerPinned(false);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [fontPickerPinned]);

  return (
    <div className="sticky top-0 z-20 mb-5 flex justify-end px-4 pt-4 sm:px-6 lg:px-8">
      <div
        ref={controlsRef}
        className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/92 px-2 py-2 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-950/92"
      >
        <div
          className="flex items-center overflow-hidden rounded-full"
          onMouseEnter={() => setFontPickerHover(true)}
          onMouseLeave={() => setFontPickerHover(false)}
        >
          <Button
            type="button"
            variant="ghost"
            size="auto"
            aria-label={t('grammarDetail.fontSize', { defaultValue: 'Font size' })}
            title={t('grammarDetail.fontSize', { defaultValue: 'Font size' })}
            aria-expanded={fontPickerOpen}
            onClick={() => setFontPickerPinned(current => !current)}
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors ${
              fontPickerOpen
                ? 'bg-indigo-600 text-white hover:bg-indigo-600 dark:bg-indigo-500 dark:text-white dark:hover:bg-indigo-500'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
            }`}
          >
            <Type className="h-4 w-4" />
          </Button>

          <div
            className={`flex items-center gap-1 overflow-hidden transition-all duration-200 ease-out ${
              fontPickerOpen ? 'ml-2 w-[11.5rem] opacity-100' : 'ml-0 w-0 opacity-0'
            }`}
            aria-hidden={!fontPickerOpen}
          >
            {READER_FONT_SCALE_OPTIONS.map(option => {
              const active = option.value === fontScale;
              return (
                <Button
                  key={option.value}
                  type="button"
                  variant="ghost"
                  size="auto"
                  aria-pressed={active}
                  aria-label={`${t('grammarDetail.fontSize', { defaultValue: 'Font size' })}: ${t(option.titleKey, { defaultValue: option.titleDefault })}`}
                  title={`${t('grammarDetail.fontSize', { defaultValue: 'Font size' })}: ${t(option.titleKey, { defaultValue: option.titleDefault })}`}
                  className={`h-8 min-w-9 rounded-full px-2.5 text-xs font-semibold transition-colors ${
                    active
                      ? 'bg-indigo-600 text-white hover:bg-indigo-600 dark:bg-indigo-500 dark:hover:bg-indigo-500'
                      : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                  }`}
                  onClick={() => {
                    onChange(option.value);
                    setFontPickerPinned(false);
                    setFontPickerHover(false);
                  }}
                >
                  {option.label}
                </Button>
              );
            })}
          </div>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="auto"
          onClick={onToggleRedEye}
          aria-pressed={redEyeEnabled}
          aria-label={t('grammarDetail.redEyeMode', { defaultValue: 'Red eye mode' })}
          title={
            redEyeEnabled
              ? t('grammarDetail.redEyeOn', {
                  defaultValue: 'Red eye mode on: hide translations and answers',
                })
              : t('grammarDetail.redEyeOff', {
                  defaultValue: 'Red eye mode off: show translations and answers',
                })
          }
          className={`flex h-9 min-w-9 items-center justify-center rounded-full border transition-colors ${
            redEyeEnabled
              ? 'border-red-300 bg-red-50 text-red-600 hover:bg-red-100 dark:border-red-500/40 dark:bg-red-500/15 dark:text-red-200 dark:hover:bg-red-500/20'
              : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800'
          }`}
        >
          {redEyeEnabled ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
};

const EmptyGrammarState: React.FC<{ t: TranslateFn }> = ({ t }) => (
  <main className="flex-1 min-h-0 overflow-y-auto p-6">
    <Card className="h-full border-slate-200 shadow-none dark:border-slate-800 dark:bg-slate-900">
      <CardContent className="h-full flex flex-col items-center justify-center text-center text-slate-500 dark:text-slate-400">
        <Sparkles className="h-10 w-10 mb-3" />
        <p className="text-sm font-medium">
          {t('grammarDetail.selectPrompt', {
            defaultValue: 'Select a grammar point to view details',
          })}
        </p>
      </CardContent>
    </Card>
  </main>
);

const GrammarExtendedSection: React.FC<{
  title: string;
  content: string;
  tone?: 'default' | 'warning' | 'info';
  t: TranslateFn;
  redEyeEnabled: boolean;
}> = ({ title, content, tone = 'default', t, redEyeEnabled }) => {
  if (!content) return null;

  const toneClasses =
    tone === 'warning'
      ? 'border-amber-200 bg-amber-50/70 dark:border-amber-400/30 dark:bg-amber-500/10'
      : tone === 'info'
        ? 'border-blue-200 bg-blue-50/70 dark:border-blue-400/30 dark:bg-blue-500/10'
        : 'border-slate-200 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-900/80';

  return (
    <Card className={`border ${toneClasses} shadow-none my-6`}>
      <CardHeader className="pb-2">
        <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200">{title}</h4>
      </CardHeader>
      <CardContent>
        <div className="grammar-prose prose prose-slate dark:prose-invert max-w-none prose-sm">
          <MarkdownRenderer content={content} t={t} redEyeEnabled={redEyeEnabled} />
        </div>
      </CardContent>
    </Card>
  );
};

const GrammarRulesSection: React.FC<{
  rulesObject: Record<string, unknown>;
  t: TranslateFn;
}> = ({ rulesObject, t }) => {
  const entries = Object.entries(rulesObject);
  if (entries.length === 0) return null;

  return (
    <section className="mt-10">
      <h3 className="mb-4 text-xs font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
        {t('grammarDetail.rules', { defaultValue: 'Conjugation rules' })}
      </h3>
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <table className="w-full text-sm border-separate border-spacing-0">
          <thead className="bg-slate-50 dark:bg-slate-900">
            <tr>
              <th className="px-4 py-3 text-left text-xs uppercase tracking-[0.12em] text-slate-600 font-semibold border-b border-r border-slate-200 dark:border-slate-800 dark:text-slate-300">
                {t('grammarDetail.condition', { defaultValue: 'Condition' })}
              </th>
              <th className="px-4 py-3 text-left text-xs uppercase tracking-[0.12em] text-slate-600 font-semibold border-b border-slate-200 dark:border-slate-800 dark:text-slate-300">
                {t('grammarDetail.rule', { defaultValue: 'Rule' })}
              </th>
            </tr>
          </thead>
          <tbody className="[&_tr:nth-child(even)]:bg-slate-50/80 [&_tr:hover]:bg-blue-50/60 dark:[&_tr:nth-child(even)]:bg-slate-900/80 dark:[&_tr:hover]:bg-blue-500/10">
            {entries.map(([key, value]) => (
              <tr key={key}>
                <td className="px-4 py-3 text-slate-700 border-b border-r border-slate-200 align-top dark:border-slate-800 dark:text-slate-300">
                  {key}
                </td>
                <td className="px-4 py-3 text-indigo-700 font-medium border-b border-slate-200 align-top dark:border-slate-800 dark:text-indigo-200">
                  {String(value)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};

const GrammarExamplesSection: React.FC<{
  examples: GrammarPointData['examples'];
  language: SupportedLanguage;
  t: TranslateFn;
  redEyeEnabled: boolean;
}> = ({ examples, language, t, redEyeEnabled }) => {
  if (!Array.isArray(examples) || examples.length === 0) return null;

  return (
    <section className="mt-10 space-y-3">
      <h3 className="mb-4 text-xs font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
        {t('grammarDetail.examples', { defaultValue: 'Usage examples' })}
      </h3>
      {examples.map((example, index) => {
        if (!example) return null;
        return (
          <Card
            key={`${index}-${example.kr}`}
            className="border-slate-200 bg-white shadow-sm transition-colors hover:border-indigo-200 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-400/30"
          >
            <CardContent className="pt-5">
              <div className="flex items-start gap-4">
                <div className="mt-1 text-xl opacity-60">💬</div>
                <div className="min-w-0">
                  <p
                    className="font-bold tracking-wide text-slate-900 dark:text-slate-100"
                    style={{
                      fontSize: 'var(--reader-example-original-size)',
                      lineHeight: '1.7',
                    }}
                  >
                    {example.kr}
                  </p>
                  <p
                    className={`mt-2 text-slate-500 dark:text-slate-400 ${getRedEyeMaskClass(redEyeEnabled)}`}
                    style={{
                      fontSize: 'var(--reader-example-translation-size)',
                      lineHeight: '1.8',
                    }}
                    data-testid={`grammar-example-translation-${index}`}
                  >
                    {getLocalizedExampleTranslation(example, language)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </section>
  );
};

const GrammarQuizSection: React.FC<{
  quizItems: GrammarPointData['quizItems'];
  language: SupportedLanguage;
  t: TranslateFn;
  redEyeEnabled: boolean;
}> = ({ quizItems, language, t, redEyeEnabled }) => {
  if (!quizItems || quizItems.length === 0) return null;

  return (
    <section className="mt-10 space-y-3">
      <h3 className="mb-4 text-xs font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
        {t('grammarDetail.quizzes', { defaultValue: 'Practice quizzes' })}
      </h3>
      {quizItems.map((quiz, index) => {
        const prompt = getLocalizedSectionText(quiz.prompt, language);
        const answer = getLocalizedSectionText(quiz.answer, language);
        if (!prompt) return null;

        return (
          <Card
            key={`quiz-${index}`}
            className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
          >
            <CardContent className="pt-5">
              <div className="mb-3 inline-flex rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-indigo-700 dark:bg-indigo-500/12 dark:text-indigo-200">
                Practice {index + 1}
              </div>
              <p className="text-base font-semibold text-slate-900 dark:text-slate-100">{prompt}</p>
              {answer ? (
                <p
                  className={`text-sm text-blue-700 mt-2 dark:text-blue-200 ${getRedEyeMaskClass(redEyeEnabled)}`}
                  data-testid={`grammar-quiz-answer-${index}`}
                >
                  {t('grammarDetail.answerShort', { defaultValue: 'Ans.' })} {answer}
                </p>
              ) : null}
            </CardContent>
          </Card>
        );
      })}
    </section>
  );
};

const GrammarNavigation: React.FC<{
  onPrev?: () => void;
  onNext?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
  t: TranslateFn;
}> = ({ onPrev, onNext, hasPrev, hasNext, t }) => (
  <div className="mt-10 pt-6 border-t border-slate-200 flex items-center gap-3 dark:border-slate-800">
    <Button
      variant="outline"
      onClick={onPrev}
      disabled={!hasPrev}
      className="border-slate-200 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
    >
      {t('common.prev', { defaultValue: 'Previous' })}
    </Button>
    <Button
      onClick={onNext}
      disabled={!hasNext}
      className="bg-blue-600 hover:bg-blue-700 text-white shadow-none border-0 dark:bg-blue-500 dark:hover:bg-blue-400"
    >
      {t('common.next', { defaultValue: 'Next' })}
    </Button>
  </div>
);

const GrammarDetailPane: React.FC<GrammarDetailPaneProps> = ({
  grammar,
  onNext,
  onPrev,
  hasNext,
  hasPrev,
}) => {
  const { t, i18n } = useTranslation();
  const [fontScale, setFontScale] = useState<ReaderFontScale>(() => {
    if (typeof window === 'undefined') return 'compact';
    const stored = window.localStorage.getItem(READER_FONT_SCALE_STORAGE_KEY);
    return stored && isReaderFontScale(stored) ? stored : 'compact';
  });
  const [redEyeEnabled, setRedEyeEnabled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(READER_RED_EYE_STORAGE_KEY) === '1';
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(READER_FONT_SCALE_STORAGE_KEY, fontScale);
  }, [fontScale]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(READER_RED_EYE_STORAGE_KEY, redEyeEnabled ? '1' : '0');
  }, [redEyeEnabled]);

  const readerVars = useMemo(() => READER_FONT_SCALE_VARS[fontScale] as CSSProperties, [fontScale]);

  if (!grammar) return <EmptyGrammarState t={t as TranslateFn} />;

  const language = resolveSupportedLanguage(i18n.language);
  const localizedTitle = sanitizeGrammarDisplayText(getLocalizedTitle(grammar, language));
  const localizedSummary = sanitizeGrammarDisplayText(getLocalizedSummary(grammar, language));
  const localizedExplanation = getLocalizedExplanation(grammar, language);
  const hasFullMarkdownDocument = localizedExplanation.trim().length > 0;
  const markdownDocument = stripLeadingDuplicateHeading(
    sanitizeGrammarMarkdown(
      localizedExplanation || buildMarkdownFromSections(grammar.sections, language)
    ),
    localizedTitle
  );
  const customNote = getLocalizedCustomNote(grammar, language);
  const rulesObject = resolveRulesObject(grammar);

  return (
    <main
      className="flex-1 min-h-0 overflow-y-auto bg-slate-50 dark:bg-slate-950 select-none print:hidden"
      onCopy={e => e.preventDefault()}
      onContextMenu={e => e.preventDefault()}
      onDragStart={e => e.preventDefault()}
    >
      <ReaderDisplayControls
        fontScale={fontScale}
        onChange={setFontScale}
        redEyeEnabled={redEyeEnabled}
        onToggleRedEye={() => setRedEyeEnabled(previous => !previous)}
        t={t as TranslateFn}
      />
      <div className="mx-auto w-[94%] max-w-[92rem] px-0 pb-24 pt-4 lg:w-[95%]">
        <article
          data-testid="grammar-reader-shell"
          data-font-scale={fontScale}
          data-red-eye={redEyeEnabled ? 'on' : 'off'}
          className="grammar-prose prose prose-slate dark:prose-invert max-w-none"
          style={readerVars}
        >
          <header
            data-testid="grammar-reader-hero"
            className="mb-10 relative overflow-hidden rounded-[32px] border border-indigo-100/60 bg-gradient-to-br from-indigo-50/80 via-white to-white px-6 py-8 shadow-sm transition-[width,padding] dark:border-indigo-500/10 dark:from-indigo-950/20 dark:to-slate-950 md:px-8 md:py-10 xl:px-12"
          >
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <Badge className="rounded-md bg-slate-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-700 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-200">
                {grammar.type}
              </Badge>
              {grammar.level ? (
                <Badge className="rounded-md bg-indigo-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-500/15 dark:text-indigo-200">
                  {grammar.level}
                </Badge>
              ) : null}
            </div>
            <h1
              className="font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-900 via-slate-800 to-slate-500 dark:from-white dark:via-slate-200 dark:to-slate-400 py-1"
              style={{
                fontSize: 'var(--reader-hero-title-size)',
                lineHeight: 'var(--reader-hero-title-leading)',
                maxWidth: 'var(--reader-hero-measure)',
              }}
            >
              {localizedTitle}
            </h1>
            {localizedSummary ? (
              <p
                className="mt-4 font-medium text-slate-500 dark:text-slate-400"
                style={{
                  fontSize: 'var(--reader-summary-size)',
                  lineHeight: 'var(--reader-summary-leading)',
                  maxWidth: 'var(--reader-summary-measure)',
                }}
              >
                {localizedSummary}
              </p>
            ) : null}
          </header>

          <div className="rounded-[32px] border border-slate-200/80 bg-white px-6 py-8 shadow-sm transition-[width,padding] dark:border-slate-800 dark:bg-slate-950 md:px-8 md:py-10 xl:px-12 xl:py-12">
            <div className="[&>p:first-of-type]:rounded-2xl [&>p:first-of-type]:border [&>p:first-of-type]:border-indigo-100/60 [&>p:first-of-type]:bg-gradient-to-br [&>p:first-of-type]:from-indigo-50/50 [&>p:first-of-type]:to-white [&>p:first-of-type]:px-6 [&>p:first-of-type]:py-5 [&>p:first-of-type]:shadow-sm [&>p:first-of-type]:text-indigo-950/90 dark:[&>p:first-of-type]:border-indigo-500/20 dark:[&>p:first-of-type]:from-indigo-900/10 dark:[&>p:first-of-type]:to-slate-900 dark:[&>p:first-of-type]:text-indigo-100">
              <MarkdownRenderer
                content={markdownDocument}
                t={t as TranslateFn}
                redEyeEnabled={redEyeEnabled}
              />
            </div>

            {!hasFullMarkdownDocument ? (
              <>
                <GrammarRulesSection rulesObject={rulesObject} t={t as TranslateFn} />
                <GrammarExamplesSection
                  examples={grammar.examples}
                  language={language}
                  t={t as TranslateFn}
                  redEyeEnabled={redEyeEnabled}
                />
                <GrammarQuizSection
                  quizItems={grammar.quizItems}
                  language={language}
                  t={t as TranslateFn}
                  redEyeEnabled={redEyeEnabled}
                />
              </>
            ) : null}

            {customNote ? (
              <GrammarExtendedSection
                title={t('grammarDetail.customNote', { defaultValue: 'Instructor note' })}
                content={customNote}
                t={t as TranslateFn}
                redEyeEnabled={redEyeEnabled}
              />
            ) : null}

            {!hasFullMarkdownDocument ? (
              <GrammarNavigation
                onPrev={onPrev}
                onNext={onNext}
                hasPrev={hasPrev}
                hasNext={hasNext}
                t={t as TranslateFn}
              />
            ) : null}
          </div>
        </article>
      </div>
    </main>
  );
};

export default GrammarDetailPane;
