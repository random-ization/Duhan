import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Lightbulb, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { GrammarPointData } from '../../types';
import {
  sanitizeGrammarDisplayText,
  sanitizeGrammarMarkdown,
} from '../../utils/grammarDisplaySanitizer';
import { Badge, Button, Card, CardContent, CardHeader } from '../ui';

type TranslateFn = (key: string, options?: string | Record<string, unknown>) => string;
type SupportedLanguage = 'zh' | 'en' | 'vi' | 'mn';
type LocalizedSection = { zh?: string; en?: string; vi?: string; mn?: string };

interface GrammarDetailPaneProps {
  grammar: GrammarPointData | null;
  onNext?: () => void;
  onPrev?: () => void;
  hasNext?: boolean;
  hasPrev?: boolean;
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

function normalizeHeadingComparison(input: string): string {
  return sanitizeGrammarDisplayText(input)
    .toLowerCase()
    .replace(/^[~\-–—]+/, '')
    .replace(/[^\p{L}\p{N}]+/gu, '');
}

function stripLeadingDuplicateHeading(markdown: string, title: string): string {
  const trimmed = markdown.trimStart();
  const match = trimmed.match(/^#\s+(.+?)(?:\r?\n|$)/);
  if (!match) return markdown;

  const heading = match[1]?.trim() || '';
  const normalizedHeading = normalizeHeadingComparison(heading);
  const normalizedTitle = normalizeHeadingComparison(title);

  if (!normalizedHeading || !normalizedTitle) return markdown;

  const isEquivalent =
    normalizedHeading === normalizedTitle ||
    normalizedHeading.startsWith(normalizedTitle) ||
    normalizedTitle.startsWith(normalizedHeading);

  if (!isEquivalent) return markdown;

  return trimmed
    .slice(match[0].length)
    .replace(/^\s*\n+/, '')
    .trim();
}

const MarkdownRenderer: React.FC<{ content: string; t: TranslateFn }> = ({ content, t }) => {
  if (!content.trim()) return null;

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1: ({ children }) => (
          <h1 className="mt-12 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 md:text-4xl">
            {children}
          </h1>
        ),
        h2: ({ children }) => (
          <h2 className="mt-14 mb-6 flex items-center gap-3 border-b border-slate-200 pb-3 text-xl font-bold tracking-tight text-slate-900 dark:border-slate-800 dark:text-slate-100 md:text-2xl">
            <span className="text-lg font-black text-indigo-500 dark:text-indigo-300">❖</span>
            <span>{children}</span>
          </h2>
        ),
        h3: ({ children }) => (
          <h3 className="mb-4 mt-8 text-xs font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
            {children}
          </h3>
        ),
        p: ({ children }) => (
          <p className="my-5 text-[1.04rem] leading-8 text-slate-700 dark:text-slate-300">
            {children}
          </p>
        ),
        ul: ({ children }) => (
          <ul className="my-5 list-disc space-y-2 pl-6 marker:text-indigo-400 dark:marker:text-indigo-300">
            {children}
          </ul>
        ),
        ol: ({ children }) => (
          <ol className="my-5 list-decimal space-y-3 pl-6 marker:font-semibold marker:text-indigo-500 dark:marker:text-indigo-300">
            {children}
          </ol>
        ),
        li: ({ children }) => (
          <li className="pl-1 text-[1.02rem] leading-8 text-slate-700 dark:text-slate-300">
            {children}
          </li>
        ),
        hr: () => <hr className="my-10 border-0 h-px bg-slate-200 dark:bg-slate-800" />,
        blockquote: ({ children }) => (
          <blockquote className="my-7 rounded-2xl border-l-4 border-indigo-500 bg-indigo-50/85 px-5 py-4 not-italic text-slate-700 shadow-sm dark:border-indigo-300 dark:bg-indigo-500/12 dark:text-slate-200">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-indigo-700 dark:text-indigo-200">
              <Lightbulb className="h-4 w-4" />
              {t('grammarDetail.learningNote', { defaultValue: 'Learning note' })}
            </div>
            <div>{children}</div>
          </blockquote>
        ),
        table: ({ children }) => (
          <div className="my-7 overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <table className="m-0 w-full border-separate border-spacing-0 text-sm">
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
        td: ({ children }) => (
          <td className="border-b border-r border-slate-200 px-4 py-3 align-top text-sm text-slate-700 last:border-r-0 dark:border-slate-800 dark:text-slate-300">
            {children}
          </td>
        ),
        strong: ({ children }) => (
          <strong className="rounded-md bg-indigo-50 px-1.5 py-0.5 font-semibold text-indigo-700 dark:bg-indigo-500/12 dark:text-indigo-200">
            {children}
          </strong>
        ),
        pre: ({ children }) => (
          <pre className="my-6 overflow-x-auto rounded-2xl border border-slate-700 bg-gradient-to-br from-slate-800 to-slate-900 p-5 text-slate-100 shadow-lg dark:border-slate-700 dark:from-slate-900 dark:to-slate-950">
            {children}
          </pre>
        ),
        code: ({ inline, className, children, ...props }: any) => (
          <code
            className={
              inline
                ? 'rounded-md bg-slate-100 px-2 py-1 text-[0.9em] font-semibold text-indigo-700 dark:bg-slate-800 dark:text-indigo-200'
                : className
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
}> = ({ title, content, tone = 'default', t }) => {
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
          <MarkdownRenderer content={content} t={t} />
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
}> = ({ examples, language, t }) => {
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
                  <p className="text-lg font-bold tracking-wide text-slate-900 dark:text-slate-100">
                    {example.kr}
                  </p>
                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
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
}> = ({ quizItems, language, t }) => {
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
                <p className="text-sm text-blue-700 mt-2 dark:text-blue-200">
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
    <main className="flex-1 min-h-0 overflow-y-auto bg-slate-50 dark:bg-slate-950">
      <div className="mx-auto w-full max-w-4xl px-8 py-10 pb-24 lg:px-12 xl:px-16">
        <article className="grammar-prose prose prose-slate dark:prose-invert max-w-none">
          <header
            data-testid="grammar-reader-hero"
            className="mb-10 rounded-[28px] border border-slate-200 bg-white px-6 py-7 shadow-sm dark:border-slate-800 dark:bg-slate-950"
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
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50 md:text-4xl">
              {localizedTitle}
            </h1>
            {localizedSummary ? (
              <p className="mt-4 text-lg font-medium leading-8 text-slate-500 dark:text-slate-400">
                {localizedSummary}
              </p>
            ) : null}
          </header>

          <div className="rounded-[28px] border border-slate-200 bg-white px-6 py-8 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="[&>p:first-of-type]:rounded-2xl [&>p:first-of-type]:border [&>p:first-of-type]:border-slate-200 [&>p:first-of-type]:bg-slate-50/90 [&>p:first-of-type]:px-5 [&>p:first-of-type]:py-4 [&>p:first-of-type]:shadow-sm dark:[&>p:first-of-type]:border-slate-800 dark:[&>p:first-of-type]:bg-slate-900/80">
              <MarkdownRenderer content={markdownDocument} t={t as TranslateFn} />
            </div>

            {!hasFullMarkdownDocument ? (
              <>
                <GrammarRulesSection rulesObject={rulesObject} t={t as TranslateFn} />
                <GrammarExamplesSection
                  examples={grammar.examples}
                  language={language}
                  t={t as TranslateFn}
                />
                <GrammarQuizSection
                  quizItems={grammar.quizItems}
                  language={language}
                  t={t as TranslateFn}
                />
              </>
            ) : null}

            {customNote ? (
              <GrammarExtendedSection
                title={t('grammarDetail.customNote', { defaultValue: 'Instructor note' })}
                content={customNote}
                t={t as TranslateFn}
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
