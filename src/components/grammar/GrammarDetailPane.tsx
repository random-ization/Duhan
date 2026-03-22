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
import { Button, Card, CardContent, CardHeader } from '../ui';

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

const MarkdownRenderer: React.FC<{ content: string }> = ({ content }) => {
  if (!content.trim()) return null;

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        blockquote: ({ children }) => (
          <blockquote className="my-6 rounded-xl border border-blue-200 bg-blue-50/70 px-4 py-3 not-italic text-slate-700 dark:border-blue-400/30 dark:bg-blue-500/12 dark:text-slate-200">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-blue-700 dark:text-blue-200">
              <Lightbulb className="h-4 w-4" />
              Note
            </div>
            <div>{children}</div>
          </blockquote>
        ),
        table: ({ children }) => (
          <div className="my-6 overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
            <table className="m-0 w-full border-separate border-spacing-0 text-sm">
              {children}
            </table>
          </div>
        ),
        thead: ({ children }) => (
          <thead className="bg-slate-100 dark:bg-slate-900">{children}</thead>
        ),
        tbody: ({ children }) => (
          <tbody className="[&_tr:nth-child(even)]:bg-slate-50/80 [&_tr:hover]:bg-blue-50/60 dark:[&_tr:nth-child(even)]:bg-slate-900/80 dark:[&_tr:hover]:bg-blue-500/10">
            {children}
          </tbody>
        ),
        th: ({ children }) => (
          <th className="border-b border-r border-slate-200 px-3 py-2 text-left font-semibold text-slate-700 last:border-r-0 dark:border-slate-800 dark:text-slate-200">
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td className="border-b border-r border-slate-200 px-3 py-2 align-top text-slate-700 last:border-r-0 dark:border-slate-800 dark:text-slate-300">
            {children}
          </td>
        ),
        code: ({ inline, className, children, ...props }: any) =>
          inline ? (
            <code
              className="rounded bg-slate-100 px-1.5 py-0.5 text-[0.9em] text-slate-700 dark:bg-slate-800 dark:text-slate-200"
              {...props}
            >
              {children}
            </code>
          ) : (
            <pre className="my-4 overflow-x-auto rounded-xl border border-slate-200 bg-slate-950 p-4 text-slate-100 dark:border-slate-800 dark:bg-slate-900">
              <code className={className} {...props}>
                {children}
              </code>
            </pre>
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
}> = ({ title, content, tone = 'default' }) => {
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
        <div className="grammar-prose prose prose-slate dark:prose-invert max-w-none prose-sm prose-p:text-slate-700 prose-li:text-slate-700 dark:prose-p:text-slate-300 dark:prose-li:text-slate-300">
          <MarkdownRenderer content={content} />
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
      <h3 className="text-base font-semibold text-slate-900 mb-3 dark:text-slate-100">
        {t('grammarDetail.rules', { defaultValue: 'Conjugation rules' })}
      </h3>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
        <table className="w-full text-sm border-separate border-spacing-0">
          <thead className="bg-slate-100 dark:bg-slate-900">
            <tr>
              <th className="px-3 py-2 text-left text-slate-700 font-semibold border-b border-r border-slate-200 dark:border-slate-800 dark:text-slate-200">
                {t('grammarDetail.condition', { defaultValue: 'Condition' })}
              </th>
              <th className="px-3 py-2 text-left text-slate-700 font-semibold border-b border-slate-200 dark:border-slate-800 dark:text-slate-200">
                {t('grammarDetail.rule', { defaultValue: 'Rule' })}
              </th>
            </tr>
          </thead>
          <tbody className="[&_tr:nth-child(even)]:bg-slate-50/80 [&_tr:hover]:bg-blue-50/60 dark:[&_tr:nth-child(even)]:bg-slate-900/80 dark:[&_tr:hover]:bg-blue-500/10">
            {entries.map(([key, value]) => (
              <tr key={key}>
                <td className="px-3 py-2 text-slate-700 border-b border-r border-slate-200 align-top dark:border-slate-800 dark:text-slate-300">
                  {key}
                </td>
                <td className="px-3 py-2 text-blue-700 border-b border-slate-200 align-top dark:border-slate-800 dark:text-blue-200">
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
      <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
        {t('grammarDetail.examples', { defaultValue: 'Usage examples' })}
      </h3>
      {examples.map((example, index) => {
        if (!example) return null;
        return (
          <Card
            key={`${index}-${example.kr}`}
            className="border-slate-200 shadow-none bg-slate-50/70 dark:border-slate-800 dark:bg-slate-900/80"
          >
            <CardContent className="pt-5">
              <p className="font-medium text-slate-900 dark:text-slate-100">{example.kr}</p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                {getLocalizedExampleTranslation(example, language)}
              </p>
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
      <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
        {t('grammarDetail.quizzes', { defaultValue: 'Practice quizzes' })}
      </h3>
      {quizItems.map((quiz, index) => {
        const prompt = getLocalizedSectionText(quiz.prompt, language);
        const answer = getLocalizedSectionText(quiz.answer, language);
        if (!prompt) return null;

        return (
          <Card
            key={`quiz-${index}`}
            className="border-slate-200 shadow-none dark:border-slate-800 dark:bg-slate-900"
          >
            <CardContent className="pt-5">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Q{index + 1}. {prompt}
              </p>
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
  const markdownDocument = sanitizeGrammarMarkdown(
    localizedExplanation || buildMarkdownFromSections(grammar.sections, language)
  );
  const customNote = getLocalizedCustomNote(grammar, language);
  const rulesObject = (grammar.conjugationRules || grammar.construction || {}) as Record<
    string,
    unknown
  >;

  return (
    <main className="flex-1 min-h-0 overflow-y-auto p-6 bg-slate-100/40 dark:bg-slate-950">
      <Card className="border-slate-200 shadow-none bg-white dark:border-slate-800 dark:bg-slate-950">
        <CardContent className="pt-6">
          {!hasFullMarkdownDocument ? (
            <header className="mb-6 border-b border-slate-200 pb-5 dark:border-slate-800">
              <div className="flex items-center gap-2 mb-2 text-xs">
                <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-600 font-medium dark:bg-slate-800 dark:text-slate-300">
                  {grammar.type}
                </span>
                {grammar.level ? (
                  <span className="rounded-full bg-blue-50 px-2 py-1 text-blue-700 font-medium dark:bg-blue-500/15 dark:text-blue-200">
                    {grammar.level}
                  </span>
                ) : null}
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                {localizedTitle}
              </h1>
              {localizedSummary ? (
                <p className="mt-2 text-slate-600 leading-relaxed dark:text-slate-400">
                  {localizedSummary}
                </p>
              ) : null}
            </header>
          ) : null}

          <article className="grammar-prose prose prose-slate dark:prose-invert max-w-none prose-p:text-slate-700 prose-li:text-slate-700 prose-headings:text-slate-900 prose-a:text-blue-700 dark:prose-p:text-slate-300 dark:prose-li:text-slate-300 dark:prose-headings:text-slate-100 dark:prose-strong:text-slate-100 dark:prose-a:text-blue-300">
            <MarkdownRenderer content={markdownDocument} />

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
              />
            ) : null}
          </article>

          {!hasFullMarkdownDocument ? (
            <GrammarNavigation
              onPrev={onPrev}
              onNext={onNext}
              hasPrev={hasPrev}
              hasNext={hasNext}
              t={t as TranslateFn}
            />
          ) : null}
        </CardContent>
      </Card>
    </main>
  );
};

export default GrammarDetailPane;
