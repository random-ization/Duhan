import React from 'react';
import { useTranslation } from 'react-i18next';
import { Sparkles } from 'lucide-react';
import { GrammarPointData } from '../../types';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Button } from '../ui';

type TranslateFn = (key: string, options?: string | Record<string, unknown>) => string;

const TYPE_STYLE_MAP: Record<string, { bg: string; text: string; border: string }> = {
  ENDING: {
    bg: 'bg-blue-50 dark:bg-blue-950',
    text: 'text-blue-600 dark:text-blue-400',
    border: 'border-blue-200 dark:border-blue-800',
  },
  PARTICLE: {
    bg: 'bg-purple-50 dark:bg-purple-950',
    text: 'text-purple-600 dark:text-purple-400',
    border: 'border-purple-200 dark:border-purple-800',
  },
  CONNECTIVE: {
    bg: 'bg-amber-50 dark:bg-amber-950',
    text: 'text-amber-600 dark:text-amber-400',
    border: 'border-amber-200 dark:border-amber-800',
  },
};

interface GrammarDetailPaneProps {
  grammar: GrammarPointData | null;
  onNext?: () => void;
  onPrev?: () => void;
  hasNext?: boolean;
  hasPrev?: boolean;
}

// Re-usable Markdown Component adapted for the Neobrutalist Typography
const MarkdownRenderer: React.FC<{ content: string }> = ({ content }) => {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1: ({ ...props }) => (
          <h1 className="text-2xl font-black mt-6 mb-4 text-foreground" {...props} />
        ),
        h2: ({ ...props }) => (
          <h2 className="text-xl font-bold mt-5 mb-3 text-foreground" {...props} />
        ),
        h3: ({ ...props }) => (
          <h3 className="text-lg font-bold mt-4 mb-2 text-foreground" {...props} />
        ),
        p: ({ ...props }) => (
          <p className="mb-4 leading-relaxed text-muted-foreground font-medium" {...props} />
        ),
        strong: ({ ...props }) => (
          <strong
            className="font-black text-foreground bg-yellow-200/40 px-1 rounded dark:bg-yellow-900/40 dark:text-yellow-100"
            {...props}
          />
        ),
        ul: ({ ...props }) => (
          <ul
            className="list-disc pl-5 mb-4 space-y-2 text-muted-foreground font-medium"
            {...props}
          />
        ),
        ol: ({ ...props }) => (
          <ol
            className="list-decimal pl-5 mb-4 space-y-2 text-muted-foreground font-medium"
            {...props}
          />
        ),
        li: ({ ...props }) => <li className="" {...props} />,
        blockquote: ({ ...props }) => (
          <blockquote
            className="border-l-4 border-border pl-4 italic text-muted-foreground bg-muted p-2 rounded-r-lg mb-4"
            {...props}
          />
        ),
        code: ({ ...props }) => (
          <code
            className="bg-muted text-pink-600 dark:text-pink-400 font-bold px-1.5 py-0.5 rounded text-sm border-b-2 border-border"
            {...props}
          />
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
};

type LocalizedSection = { zh?: string; en?: string; vi?: string; mn?: string };
type SupportedLanguage = 'zh' | 'en' | 'vi' | 'mn';

function resolveSupportedLanguage(language?: string): SupportedLanguage {
  const normalized = (language || '').toLowerCase();
  if (normalized.startsWith('en')) return 'en';
  if (normalized.startsWith('vi')) return 'vi';
  if (normalized.startsWith('mn')) return 'mn';
  if (normalized.startsWith('zh') || normalized.startsWith('cn')) return 'zh';
  return 'zh';
}

function pickLocalizedText(
  localized: LocalizedSection,
  language: SupportedLanguage
): string | undefined {
  const order: SupportedLanguage[] =
    language === 'zh'
      ? ['zh', 'en', 'vi', 'mn']
      : language === 'en'
        ? ['en', 'zh', 'vi', 'mn']
        : language === 'vi'
          ? ['vi', 'en', 'zh', 'mn']
          : ['mn', 'en', 'zh', 'vi'];

  for (const key of order) {
    const value = localized[key];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value;
    }
  }
  return undefined;
}

function getLocalizedSectionText(
  section: string | LocalizedSection | null | undefined,
  language: SupportedLanguage
): string {
  if (!section) return '';
  if (typeof section === 'string') return section;
  return pickLocalizedText(section, language) || '';
}

function getTypeStyles(type: string): { bg: string; text: string; border: string } {
  return (
    TYPE_STYLE_MAP[type] || {
      bg: 'bg-muted',
      text: 'text-muted-foreground',
      border: 'border-border',
    }
  );
}

function getLocalizedTitle(grammar: GrammarPointData, language: SupportedLanguage): string {
  if (language === 'zh') return grammar.titleZh || grammar.title;
  if (language === 'vi') return grammar.titleVi || grammar.title;
  if (language === 'mn') return grammar.titleMn || grammar.title;
  return grammar.titleEn || grammar.title;
}

function getLocalizedSummary(grammar: GrammarPointData, language: SupportedLanguage): string {
  const candidates =
    language === 'en'
      ? [grammar.summaryEn, grammar.summary, grammar.summaryVi, grammar.summaryMn]
      : language === 'vi'
        ? [grammar.summaryVi, grammar.summaryEn, grammar.summary, grammar.summaryMn]
        : language === 'mn'
          ? [grammar.summaryMn, grammar.summaryEn, grammar.summary, grammar.summaryVi]
          : [grammar.summary, grammar.summaryEn, grammar.summaryVi, grammar.summaryMn];

  return candidates.find(text => typeof text === 'string' && text.trim().length > 0) || '';
}

function getLocalizedExplanation(grammar: GrammarPointData, language: SupportedLanguage): string {
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

  return candidates.find(text => typeof text === 'string' && text.trim().length > 0) || '';
}

function getLocalizedExampleTranslation(
  example: { cn?: string; en?: string; vi?: string; mn?: string },
  language: SupportedLanguage
): string {
  const candidates =
    language === 'en'
      ? [example.en, example.cn, example.vi, example.mn]
      : language === 'vi'
        ? [example.vi, example.en, example.cn, example.mn]
        : language === 'mn'
          ? [example.mn, example.en, example.cn, example.vi]
          : [example.cn, example.en, example.vi, example.mn];

  return candidates.find(text => typeof text === 'string' && text.trim().length > 0) || '';
}

function getLocalizedCustomNote(grammar: GrammarPointData, language: SupportedLanguage): string {
  const candidates =
    language === 'en'
      ? [grammar.customNoteEn, grammar.customNote, grammar.customNoteVi, grammar.customNoteMn]
      : language === 'vi'
        ? [grammar.customNoteVi, grammar.customNoteEn, grammar.customNote, grammar.customNoteMn]
        : language === 'mn'
          ? [grammar.customNoteMn, grammar.customNoteEn, grammar.customNote, grammar.customNoteVi]
          : [grammar.customNote, grammar.customNoteEn, grammar.customNoteVi, grammar.customNoteMn];

  return candidates.find(text => typeof text === 'string' && text.trim().length > 0) || '';
}

const EmptyGrammarState: React.FC<{ t: TranslateFn }> = ({ t }) => (
  <main className="flex-1 flex flex-col h-full overflow-y-auto relative p-3">
    <div className="w-full bg-card rounded-2xl border-2 border-border shadow-pop-card p-10 flex flex-col items-center justify-center min-h-[50vh] opacity-50">
      <Sparkles className="w-16 h-16 text-muted-foreground mb-4 opacity-50" />
      <h2 className="text-xl font-bold text-muted-foreground">
        {t('grammarDetail.selectPrompt', 'Select a grammar point to view details')}
      </h2>
    </div>
  </main>
);

const GrammarHeader: React.FC<{
  grammar: GrammarPointData;
  language: SupportedLanguage;
  typeStyles: { bg: string; text: string; border: string };
}> = ({ grammar, language, typeStyles }) => (
  <header className="border-b-2 border-border pb-6 mb-8">
    <div className="flex items-center gap-2 mb-3">
      <span
        className={`text-xs font-black px-2 py-1 border-2 rounded uppercase ${typeStyles.bg} ${typeStyles.text} ${typeStyles.border}`}
      >
        {grammar.type}
      </span>
      {grammar.level && (
        <span className="text-xs font-bold text-muted-foreground px-2 py-1 bg-muted rounded border border-border">
          {grammar.level}
        </span>
      )}
    </div>
    <h1 className="text-4xl font-black text-foreground mb-4">
      {getLocalizedTitle(grammar, language)}
    </h1>
    <p className="text-lg text-muted-foreground font-medium bg-yellow-100/50 dark:bg-yellow-900/20 inline-block px-2 py-1 rounded">
      {getLocalizedSummary(grammar, language)}
    </p>
  </header>
);

const GrammarExtendedSections: React.FC<{
  sections: GrammarPointData['sections'];
  language: SupportedLanguage;
  t: TranslateFn;
}> = ({ sections, language, t }) => {
  if (!sections || typeof sections !== 'object') return null;

  return (
    <>
      {sections.introduction ? (
        <MarkdownRenderer content={getLocalizedSectionText(sections.introduction, language)} />
      ) : null}
      {sections.core ? (
        <div className="mt-8 border-t-2 border-dashed border-border pt-6">
          <MarkdownRenderer content={getLocalizedSectionText(sections.core, language)} />
        </div>
      ) : null}
      {sections.comparative ? (
        <div className="mt-6 p-5 bg-orange-50 dark:bg-orange-950/20 border-2 border-orange-200 dark:border-orange-800 rounded-lg shadow-sm">
          <h4 className="font-black text-orange-800 dark:text-orange-400 mb-2">
            💡 {t('grammarDetail.comparative', 'Similar grammar comparison')}
          </h4>
          <MarkdownRenderer content={getLocalizedSectionText(sections.comparative, language)} />
        </div>
      ) : null}
      {sections.commonMistakes ? (
        <div className="mt-6 p-5 bg-red-50 dark:bg-red-950/20 border-2 border-red-200 dark:border-red-800 rounded-lg shadow-sm">
          <h4 className="font-black text-red-800 dark:text-red-400 mb-2">
            ⚠️ {t('grammarDetail.commonMistakes', 'Common mistakes')}
          </h4>
          <MarkdownRenderer content={getLocalizedSectionText(sections.commonMistakes, language)} />
        </div>
      ) : null}
    </>
  );
};

const GrammarRulesSection: React.FC<{
  rulesObject: Record<string, unknown>;
  t: TranslateFn;
}> = ({ rulesObject, t }) => {
  if (Object.keys(rulesObject).length === 0) return null;

  return (
    <>
      <h3 className="text-lg font-black text-foreground mt-12 mb-4 flex items-center gap-2 border-b-2 border-border pb-2 w-fit">
        <span className="bg-primary text-primary-foreground w-6 h-6 inline-flex items-center justify-center rounded-full text-sm">
          2
        </span>
        {t('grammarDetail.rules', 'Conjugation rules')}
      </h3>
      <div className="overflow-x-auto mb-10">
        <table className="w-full text-left border-collapse border-2 border-border">
          <thead>
            <tr className="bg-muted">
              <th className="p-3 border-2 border-border font-black text-foreground">
                {t('grammarDetail.condition', 'Condition')}
              </th>
              <th className="p-3 border-2 border-border font-black text-foreground">
                {t('grammarDetail.rule', 'Rule')}
              </th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(rulesObject).map(([key, value]) => (
              <tr key={key}>
                <td className="p-3 border-2 border-border font-bold text-foreground">{key}</td>
                <td className="p-3 border-2 border-border text-blue-600 dark:text-blue-400 font-bold bg-blue-50/50 dark:bg-blue-900/10">
                  {String(value)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
};

const GrammarExamplesSection: React.FC<{
  examples: GrammarPointData['examples'];
  language: SupportedLanguage;
  t: TranslateFn;
}> = ({ examples, language, t }) => {
  if (!Array.isArray(examples) || examples.length === 0) return null;

  return (
    <>
      <h3 className="text-lg font-black text-foreground mt-12 mb-4 flex items-center gap-2 border-b-2 border-border pb-2 w-fit">
        <span className="bg-primary text-primary-foreground w-6 h-6 inline-flex items-center justify-center rounded-full text-sm">
          3
        </span>
        {t('grammarDetail.examples', 'Usage examples')}
      </h3>
      <div className="space-y-4 mt-4 mb-4">
        {examples.map((ex, index) => {
          if (!ex) return null;
          const kr = typeof ex.kr === 'string' ? ex.kr : '';
          const translation = getLocalizedExampleTranslation(ex, language);
          if (!kr && !translation) return null;

          return (
            <div
              key={index}
              className="p-5 bg-muted/50 border-l-8 border-border rounded-r-lg shadow-pop-sm transition-transform hover:-translate-y-0.5 hover:shadow-pop"
            >
              <div className="font-bold text-lg text-foreground mb-1 leading-snug">
                {kr.split(/(?=\d+\.)/).map((line, idx) => (
                  <div key={`kr-${index}-${idx}`}>{line.trim()}</div>
                ))}
              </div>
              <div className="text-muted-foreground text-sm font-medium">
                {translation.split(/(?=\d+\.)/).map((line, idx) => (
                  <div key={`cn-${index}-${idx}`}>{line.trim()}</div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
};

const GrammarQuizSection: React.FC<{
  quizItems: GrammarPointData['quizItems'];
  language: SupportedLanguage;
  t: TranslateFn;
}> = ({ quizItems, language, t }) => {
  if (!quizItems || quizItems.length === 0) return null;

  return (
    <>
      <h3 className="text-lg font-black text-foreground mt-12 mb-4 flex items-center gap-2 border-b-2 border-border pb-2 w-fit">
        <span className="bg-primary text-primary-foreground w-6 h-6 inline-flex items-center justify-center rounded-full text-sm">
          4
        </span>
        {t('grammarDetail.quizzes', 'Practice quizzes')}
      </h3>
      <div className="space-y-6 mt-4 mb-4">
        {quizItems.map((quiz, index) => {
          const prompt = getLocalizedSectionText(quiz.prompt, language);
          const answer = getLocalizedSectionText(quiz.answer, language);
          if (!prompt) return null;

          return (
            <div
              key={index}
              className="p-6 bg-indigo-50 dark:bg-indigo-950/20 border-2 border-indigo-200 dark:border-indigo-800 rounded-xl shadow-[4px_4px_0_0_rgba(79,70,229,0.2)]"
            >
              <div className="flex items-start gap-3 mb-4">
                <span className="font-black text-indigo-700 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900 px-2.5 py-1 rounded border-2 border-indigo-700 dark:border-indigo-400 text-sm">
                  Q{index + 1}
                </span>
                <div className="flex-1 text-foreground font-bold mt-1">
                  <MarkdownRenderer content={prompt} />
                </div>
              </div>

              {answer ? (
                <div className="flex items-start gap-3 pl-2 border-l-4 border-emerald-400 dark:border-emerald-600 ml-4 pt-2">
                  <span className="font-black text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900 px-2 py-0.5 rounded text-xs select-none">
                    {t('grammarDetail.answerShort', 'Ans.')}
                  </span>
                  <div className="flex-1 text-emerald-800 dark:text-emerald-300 font-medium text-sm">
                    <MarkdownRenderer content={answer} />
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </>
  );
};

const GrammarCustomNote: React.FC<{ customNote?: string; t: TranslateFn }> = ({
  customNote,
  t,
}) => {
  if (!customNote) return null;
  return (
    <div className="mt-12 p-6 bg-muted border-2 border-border rounded-xl shadow-pop-sm">
      <h4 className="font-black text-foreground mb-2 flex items-center gap-2">
        <span>📝</span> {t('grammarDetail.customNote', 'Instructor note')}
      </h4>
      <div className="text-muted-foreground">
        <MarkdownRenderer content={customNote} />
      </div>
    </div>
  );
};

function getNavigationButtonClass(enabled: boolean, variant: 'prev' | 'next'): string {
  if (!enabled) {
    return 'bg-muted text-muted-foreground border-border cursor-not-allowed opacity-70';
  }
  if (variant === 'next') {
    return 'bg-primary text-primary-foreground border-primary shadow-pop hover:-translate-y-0.5 active:translate-y-0 active:shadow-none';
  }
  return 'bg-card text-foreground border-border shadow-pop hover:-translate-y-0.5 active:translate-y-0 active:shadow-none';
}

const GrammarNavigation: React.FC<{
  onPrev?: () => void;
  onNext?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
  t: TranslateFn;
}> = ({ onPrev, onNext, hasPrev, hasNext, t }) => (
  <div className="mt-12 pt-8 border-t-2 border-border flex items-center justify-between gap-4">
    <Button
      type="button"
      variant="ghost"
      size="auto"
      onClick={onPrev}
      disabled={!hasPrev}
      className={`flex-1 px-6 py-4 rounded-xl font-black text-sm transition-all border-2 flex items-center justify-center gap-2 ${getNavigationButtonClass(Boolean(hasPrev), 'prev')}`}
    >
      ← {t('common.prev', 'Previous')}
    </Button>
    <Button
      type="button"
      variant="ghost"
      size="auto"
      onClick={onNext}
      disabled={!hasNext}
      className={`flex-1 px-6 py-4 rounded-xl font-black text-sm transition-all border-2 flex items-center justify-center gap-2 ${getNavigationButtonClass(Boolean(hasNext), 'next')}`}
    >
      {t('common.next', 'Next')} →
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
  const typeStyles = getTypeStyles(grammar.type);
  const rulesObject = (grammar.conjugationRules || grammar.construction || {}) as Record<
    string,
    unknown
  >;

  return (
    <main className="flex-1 flex flex-col h-full overflow-y-auto scrollbar-hide relative p-3">
      <div className="w-full bg-card rounded-2xl border-2 border-border shadow-pop-card p-8 lg:p-10">
        <GrammarHeader grammar={grammar} language={language} typeStyles={typeStyles} />

        <article className="prose prose-slate dark:prose-invert max-w-none">
          <h3 className="text-lg font-black text-foreground mt-8 mb-4 flex items-center gap-2 border-b-2 border-border pb-2 w-fit">
            <span className="bg-primary text-primary-foreground w-6 h-6 inline-flex items-center justify-center rounded-full text-sm">
              1
            </span>
            {t('grammarDetail.explanation', 'Detailed explanation')}
          </h3>

          <div className="mb-10 text-base">
            <MarkdownRenderer content={getLocalizedExplanation(grammar, language)} />
            <GrammarExtendedSections
              sections={grammar.sections}
              language={language}
              t={t as TranslateFn}
            />
          </div>

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
          <GrammarCustomNote
            customNote={getLocalizedCustomNote(grammar, language)}
            t={t as TranslateFn}
          />
        </article>

        <GrammarNavigation
          onPrev={onPrev}
          onNext={onNext}
          hasPrev={hasPrev}
          hasNext={hasNext}
          t={t as TranslateFn}
        />
      </div>
    </main>
  );
};

export default GrammarDetailPane;
