import React from 'react';
import { useTranslation } from 'react-i18next';
import i18n from 'i18next';
import { Sparkles } from 'lucide-react';
import { GrammarPointData } from '../../types';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

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
            className="border-l-4 border-slate-900 dark:border-border pl-4 italic text-muted-foreground bg-muted p-2 rounded-r-lg mb-4"
            {...props}
          />
        ),
        code: ({ ...props }) => (
          <code
            className="bg-slate-100 dark:bg-slate-800 text-pink-600 dark:text-pink-400 font-bold px-1.5 py-0.5 rounded text-sm border-b-2 border-slate-300 dark:border-slate-700"
            {...props}
          />
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
};

const GrammarDetailPane: React.FC<GrammarDetailPaneProps> = ({
  grammar,
  onNext,
  onPrev,
  hasNext,
  hasPrev,
}) => {
  const { t } = useTranslation();

  if (!grammar) {
    return (
      <main className="flex-1 flex flex-col h-full overflow-y-auto relative p-6">
        <div className="max-w-4xl w-full mx-auto bg-card rounded-2xl border-2 border-slate-900 dark:border-border shadow-[8px_8px_0px_0px_#0f172a] dark:shadow-[8px_8px_0px_0px_rgba(148,163,184,0.26)] p-10 mt-2 mb-10 flex flex-col items-center justify-center min-h-[50vh] opacity-50">
          <Sparkles className="w-16 h-16 text-muted-foreground mb-4 opacity-50" />
          <h2 className="text-xl font-bold text-muted-foreground">
            {t('grammarModule.selectPrompt', 'Select a grammar point to view details')}
          </h2>
        </div>
      </main>
    );
  }

  const getTypeStyles = () => {
    switch (grammar.type) {
      case 'ENDING':
        return {
          bg: 'bg-blue-50 dark:bg-blue-950',
          text: 'text-blue-600 dark:text-blue-400',
          border: 'border-blue-200 dark:border-blue-800',
        };
      case 'PARTICLE':
        return {
          bg: 'bg-purple-50 dark:bg-purple-950',
          text: 'text-purple-600 dark:text-purple-400',
          border: 'border-purple-200 dark:border-purple-800',
        };
      case 'CONNECTIVE':
        return {
          bg: 'bg-amber-50 dark:bg-amber-950',
          text: 'text-amber-600 dark:text-amber-400',
          border: 'border-amber-200 dark:border-amber-800',
        };
      default:
        return { bg: 'bg-muted', text: 'text-muted-foreground', border: 'border-border' };
    }
  };

  const typeStyles = getTypeStyles();
  const rulesObject = (grammar.conjugationRules || grammar?.construction || {}) as Record<
    string,
    unknown
  >;
  const hasRules = Object.keys(rulesObject).length > 0;
  const listExamples = Array.isArray(grammar.examples) ? grammar.examples : [];

  // Helper to extract localized text from the complex sections object
  const getLocalizedSectionText = (section: any): string => {
    if (!section) return '';
    // Just fallback to string directly if it's already a string, or attempt to grab the currently active language (default to zh/en for now based on context)
    // Since user context implies Chinese/English TOPIK learning, we prioritize 'zh' or fallback to 'en'.
    if (typeof section === 'string') return section;
    return section.zh || section.en || section.vi || section.mn || '';
  };

  return (
    <main className="flex-1 flex flex-col h-full overflow-y-auto scrollbar-hide relative p-6">
      <div className="max-w-4xl w-full mx-auto bg-card rounded-2xl border-2 border-slate-900 dark:border-border shadow-[8px_8px_0px_0px_#0f172a] dark:shadow-[8px_8px_0px_0px_rgba(148,163,184,0.26)] p-10 mt-2 mb-10">
        {/* Header */}
        <header className="border-b-2 border-slate-200 dark:border-slate-800 pb-6 mb-8">
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
            {i18n.language === 'zh'
              ? grammar.titleZh || grammar.title
              : i18n.language === 'vi'
                ? grammar.titleVi || grammar.title
                : i18n.language === 'mn'
                  ? grammar.titleMn || grammar.title
                  : grammar.titleEn || grammar.title}
          </h1>
          <p className="text-lg text-muted-foreground font-medium bg-yellow-100/50 dark:bg-yellow-900/20 inline-block px-2 py-1 rounded">
            {grammar.summary}
          </p>
        </header>

        {/* Article Body */}
        <article className="prose prose-slate dark:prose-invert max-w-none">
          <h3 className="text-lg font-black text-foreground mt-8 mb-4 flex items-center gap-2 border-b-2 border-slate-900 dark:border-border pb-2 w-fit">
            <span className="bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 w-6 h-6 inline-flex items-center justify-center rounded-full text-sm">
              1
            </span>
            {t('grammarDetail.explanation', 'Detailed explanation')}
          </h3>

          <div className="mb-10 text-base">
            <MarkdownRenderer content={grammar.explanation} />

            {/* Extended Sections (e.g. core, introduction) which were missing previously */}
            {grammar.sections && typeof grammar.sections === 'object' && (
              <>
                {'introduction' in grammar.sections && grammar.sections.introduction && (
                  <MarkdownRenderer
                    content={getLocalizedSectionText(grammar.sections.introduction)}
                  />
                )}
                {'core' in grammar.sections && grammar.sections.core && (
                  <div className="mt-8 border-t-2 border-dashed border-slate-200 dark:border-slate-800 pt-6">
                    <MarkdownRenderer content={getLocalizedSectionText(grammar.sections.core)} />
                  </div>
                )}
                {'comparative' in grammar.sections && grammar.sections.comparative && (
                  <div className="mt-6 p-5 bg-orange-50 dark:bg-orange-950/20 border-2 border-orange-200 dark:border-orange-800 rounded-lg shadow-sm">
                    <h4 className="font-black text-orange-800 dark:text-orange-400 mb-2">
                      💡 {t('grammarDetail.comparative', 'Similar grammar comparison')}
                    </h4>
                    <MarkdownRenderer
                      content={getLocalizedSectionText(grammar.sections.comparative)}
                    />
                  </div>
                )}
                {'commonMistakes' in grammar.sections && grammar.sections.commonMistakes && (
                  <div className="mt-6 p-5 bg-red-50 dark:bg-red-950/20 border-2 border-red-200 dark:border-red-800 rounded-lg shadow-sm">
                    <h4 className="font-black text-red-800 dark:text-red-400 mb-2">
                      ⚠️ {t('grammarDetail.commonMistakes', 'Common mistakes')}
                    </h4>
                    <MarkdownRenderer
                      content={getLocalizedSectionText(grammar.sections.commonMistakes)}
                    />
                  </div>
                )}
              </>
            )}
          </div>

          {hasRules && (
            <>
              <h3 className="text-lg font-black text-foreground mt-12 mb-4 flex items-center gap-2 border-b-2 border-slate-900 dark:border-border pb-2 w-fit">
                <span className="bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 w-6 h-6 inline-flex items-center justify-center rounded-full text-sm">
                  2
                </span>
                {t('grammarDetail.rules', 'Conjugation rules')}
              </h3>
              <div className="overflow-x-auto mb-10">
                <table className="w-full text-left border-collapse border-2 border-slate-900 dark:border-border">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-800/50">
                      <th className="p-3 border-2 border-slate-900 dark:border-border font-black text-foreground">
                        {t('grammarDetail.condition', 'Condition')}
                      </th>
                      <th className="p-3 border-2 border-slate-900 dark:border-border font-black text-foreground">
                        {t('grammarDetail.rule', 'Rule')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(rulesObject).map(([key, value]) => (
                      <tr key={key}>
                        <td className="p-3 border-2 border-slate-900 dark:border-border font-bold text-foreground">
                          {key}
                        </td>
                        <td className="p-3 border-2 border-slate-900 dark:border-border text-blue-600 dark:text-blue-400 font-bold bg-blue-50/50 dark:bg-blue-900/10">
                          {String(value)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {listExamples.length > 0 && (
            <>
              <h3 className="text-lg font-black text-foreground mt-12 mb-4 flex items-center gap-2 border-b-2 border-slate-900 dark:border-border pb-2 w-fit">
                <span className="bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 w-6 h-6 inline-flex items-center justify-center rounded-full text-sm">
                  3
                </span>
                {t('grammarDetail.examples', 'Usage examples')}
              </h3>
              <div className="space-y-4 mt-4 mb-4">
                {listExamples.map((ex, i) => {
                  if (!ex || typeof ex !== 'object') return null;
                  const r = ex as Record<string, unknown>;
                  const kr = typeof r.kr === 'string' ? r.kr : '';
                  const cn = typeof r.cn === 'string' ? r.cn : '';
                  if (!kr && !cn) return null;

                  return (
                    <div
                      key={i}
                      className="p-5 bg-slate-50 dark:bg-slate-800/50 border-l-8 border-slate-900 dark:border-slate-100 rounded-r-lg shadow-[2px_2px_0_0_#0f172a] dark:shadow-[2px_2px_0_0_rgba(148,163,184,0.26)] transition-transform hover:-translate-y-0.5 hover:shadow-[4px_4px_0_0_#0f172a] dark:hover:shadow-[4px_4px_0_0_rgba(148,163,184,0.26)]"
                    >
                      <div className="font-bold text-lg text-foreground mb-1 leading-snug">
                        {kr.split(/(?=\d+\.)/).map((line, idx) => (
                          <div key={`kr-${i}-${idx}`}>{line.trim()}</div>
                        ))}
                      </div>
                      <div className="text-slate-500 dark:text-slate-400 text-sm font-medium">
                        {cn.split(/(?=\d+\.)/).map((line, idx) => (
                          <div key={`cn-${i}-${idx}`}>{line.trim()}</div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {grammar.quizItems && grammar.quizItems.length > 0 && (
            <>
              <h3 className="text-lg font-black text-foreground mt-12 mb-4 flex items-center gap-2 border-b-2 border-slate-900 dark:border-border pb-2 w-fit">
                <span className="bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 w-6 h-6 inline-flex items-center justify-center rounded-full text-sm">
                  4
                </span>
                {t('grammarDetail.quizzes', 'Practice quizzes')}
              </h3>
              <div className="space-y-6 mt-4 mb-4">
                {grammar.quizItems.map((quiz, idx) => {
                  const prompt = getLocalizedSectionText(quiz.prompt);
                  const answer = getLocalizedSectionText(quiz.answer);
                  if (!prompt) return null;

                  return (
                    <div
                      key={idx}
                      className="p-6 bg-indigo-50 dark:bg-indigo-950/20 border-2 border-indigo-200 dark:border-indigo-800 rounded-xl shadow-[4px_4px_0_0_rgba(79,70,229,0.2)]"
                    >
                      <div className="flex items-start gap-3 mb-4">
                        <span className="font-black text-indigo-700 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900 px-2.5 py-1 rounded border-2 border-indigo-700 dark:border-indigo-400 text-sm">
                          Q{idx + 1}
                        </span>
                        <div className="flex-1 text-foreground font-bold mt-1">
                          <MarkdownRenderer content={prompt} />
                        </div>
                      </div>

                      {answer && (
                        <div className="flex items-start gap-3 pl-2 border-l-4 border-emerald-400 dark:border-emerald-600 ml-4 pt-2">
                          <span className="font-black text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900 px-2 py-0.5 rounded text-xs select-none">
                            Ans.
                          </span>
                          <div className="flex-1 text-emerald-800 dark:text-emerald-300 font-medium text-sm">
                            <MarkdownRenderer content={answer} />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {grammar.customNote && (
            <div className="mt-12 p-6 bg-slate-100 dark:bg-slate-800/80 border-2 border-slate-900 dark:border-slate-500 rounded-xl shadow-[4px_4px_0_0_#0f172a] dark:shadow-[4px_4px_0_0_#64748b]">
              <h4 className="font-black text-slate-800 dark:text-slate-200 mb-2 flex items-center gap-2">
                <span>📝</span> {t('grammarDetail.customNote', 'Instructor note')}
              </h4>
              <div className="text-slate-700 dark:text-slate-300">
                <MarkdownRenderer content={grammar.customNote} />
              </div>
            </div>
          )}
        </article>

        {/* Navigation Buttons */}
        <div className="mt-12 pt-8 border-t-2 border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4">
          <button
            onClick={onPrev}
            disabled={!hasPrev}
            className={`
                            flex-1 px-6 py-4 rounded-xl font-black text-sm transition-all border-2 flex items-center justify-center gap-2
                            ${
                              hasPrev
                                ? 'bg-white text-slate-900 border-slate-900 shadow-[4px_4px_0px_0px_#0f172a] hover:-translate-y-0.5 active:translate-y-0 active:shadow-none dark:bg-slate-900 dark:text-slate-100 dark:border-border dark:shadow-[4px_4px_0px_0px_rgba(148,163,184,0.26)]'
                                : 'bg-slate-50 text-slate-300 border-slate-200 cursor-not-allowed dark:bg-slate-900/50 dark:text-slate-700 dark:border-slate-800'
                            }
                        `}
          >
            ← {t('common.prev', 'Previous')}
          </button>
          <button
            onClick={onNext}
            disabled={!hasNext}
            className={`
                            flex-1 px-6 py-4 rounded-xl font-black text-sm transition-all border-2 flex items-center justify-center gap-2
                            ${
                              hasNext
                                ? 'bg-slate-900 text-white border-slate-900 shadow-[4px_4px_0px_0px_#0f172a] hover:-translate-y-0.5 active:translate-y-0 active:shadow-none dark:bg-slate-100 dark:text-slate-900 dark:border-slate-100 dark:shadow-[4px_4px_0px_0px_rgba(148,163,184,0.26)]'
                                : 'bg-slate-50 text-slate-300 border-slate-200 cursor-not-allowed dark:bg-slate-900/50 dark:text-slate-700 dark:border-slate-800'
                            }
                        `}
          >
            {t('common.next', 'Next')} →
          </button>
        </div>
      </div>
    </main>
  );
};

export default GrammarDetailPane;
