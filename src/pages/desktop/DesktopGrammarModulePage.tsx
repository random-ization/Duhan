import React, { useDeferredValue, useMemo, useState, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { remarkGrammarMasking } from '../../utils/grammarMaskingRemark';
import {
  GRAMMAR_MASK_TRANSLATION_TOKEN,
  GRAMMAR_MASK_ANSWER_TOKEN,
  GRAMMAR_MASK_TRANSLATION_START_TOKEN,
  GRAMMAR_MASK_TRANSLATION_END_TOKEN,
  GRAMMAR_MASK_ANSWER_START_TOKEN,
  GRAMMAR_MASK_ANSWER_END_TOKEN,
  stripGrammarMaskTokens,
} from '../../utils/grammarDisplaySanitizer';
import { useAction } from 'convex/react';
import { DesktopCard } from '../../components/desktop/ui/DesktopCard';
import {
  Share2,
  Eye,
  EyeOff,
  Volume2,
  Lightbulb,
  BookOpen,
  AlertTriangle,
  Sparkles,
  HelpCircle,
  CheckCircle2,
  Languages,
  ChevronLeft,
  ChevronRight,
  Search,
  ChevronDown,
  Send,
  Loader2,
} from 'lucide-react';
import type { GrammarPointData } from '../../types';
import { sanitizeGrammarDisplayText } from '../../utils/grammarDisplaySanitizer';
import { getLocalizedContent } from '../../utils/languageUtils';
import { aRef, mRef } from '../../utils/convexRefs';
import type { Id } from '../../../convex/_generated/dataModel';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { cn } from '../../lib/utils';
import { Button } from '../../components/ui/button';

// Red-eye mode wrapper – wraps an entire block and reveals on hover
export function RedEyeBlock({
  enabled,
  children,
  className,
}: {
  enabled: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  const [revealed, setRevealed] = React.useState(false);

  if (!enabled) return <>{children}</>;
  return (
    <span
      className={className}
      style={{
        filter: revealed ? 'none' : 'blur(8px)',
        userSelect: revealed ? 'auto' : 'none',
        cursor: 'help',
        display: 'inline-block',
        width: '100%',
        transition: 'filter 0.2s ease',
      }}
      onMouseEnter={() => setRevealed(true)}
      onMouseLeave={() => setRevealed(false)}
    >
      {children}
    </span>
  );
}

// Inline Red-eye mask – per-span click-to-reveal used inside markdown content
const RedEyeMask: React.FC<{
  enabled: boolean;
  kind: 'translation' | 'answer';
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}> = ({ enabled, kind, children, className, style }) => {
  const [revealed, setRevealed] = React.useState(false);

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
        userSelect: revealed ? 'auto' : 'none',
        transition: 'filter 0.2s ease',
      }}
      onClick={() => setRevealed(prev => !prev)}
      onPointerEnter={() => setRevealed(true)}
      onPointerLeave={() => setRevealed(false)}
      onMouseEnter={() => setRevealed(true)}
      onMouseLeave={() => setRevealed(false)}
      onFocus={() => setRevealed(true)}
      onBlur={() => setRevealed(false)}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setRevealed(p => !p);
        }
      }}
    >
      {children}
    </span>
  );
};

const LEADING_ANSWER_LABEL_RE =
  /^(?:\*{1,2})?(?:参考答案|测验参考答案|示例答案|答案|reference answers?|answers?)(?:\*{1,2})?\s*[:：]/i;

function extractTextContent(node: React.ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(extractTextContent).join('');
  if (React.isValidElement(node))
    return extractTextContent((node.props as { children?: React.ReactNode }).children);
  return '';
}

function getStandaloneLineMaskKind(input: string): 'translation' | 'answer' | null {
  const stripped = stripGrammarMaskTokens(input).trim();
  if (stripped.length > 0) return null;
  if (input.includes(GRAMMAR_MASK_TRANSLATION_TOKEN)) return 'translation';
  if (input.includes(GRAMMAR_MASK_ANSWER_TOKEN)) return 'answer';
  return null;
}

function getNodeMaskKind(node: unknown): 'translation' | 'answer' | null {
  if (typeof node !== 'object' || node === null || Array.isArray(node)) return null;
  const rec = node as Record<string, unknown>;
  const props = rec.properties as Record<string, unknown> | undefined;
  if (props) {
    const d = props['data-grammar-mask'];
    if (d === 'translation' || d === 'answer') return d;
  }
  const data = rec.data as Record<string, unknown> | undefined;
  const hProps = data?.hProperties as Record<string, unknown> | undefined;
  if (hProps) {
    const h = hProps['data-grammar-mask'];
    if (h === 'translation' || h === 'answer') return h;
  }
  return null;
}

function wrapMaskedInlineNode(
  node: React.ReactNode,
  maskKind: 'translation' | 'answer',
  redEyeEnabled: boolean,
  key: string
): React.ReactNode {
  return (
    <RedEyeMask key={key} enabled={redEyeEnabled} kind={maskKind}>
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
    if (next.index > 0) segments.push(stripGrammarMaskTokens(remaining.slice(0, next.index)));

    if (next.kind === 'translation-line' || next.kind === 'answer-line') {
      const token =
        next.kind === 'translation-line'
          ? GRAMMAR_MASK_TRANSLATION_TOKEN
          : GRAMMAR_MASK_ANSWER_TOKEN;
      const maskKind: 'translation' | 'answer' =
        next.kind === 'translation-line' ? 'translation' : 'answer';
      const maskedContent = stripGrammarMaskTokens(remaining.slice(next.index + token.length));
      segments.push(
        <RedEyeMask key={`mask-${key++}`} enabled={redEyeEnabled} kind={maskKind}>
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
    const maskKind: 'translation' | 'answer' =
      next.kind === 'translation-inline' ? 'translation' : 'answer';
    const endIndex = remaining.indexOf(endToken, next.index + startToken.length);

    if (endIndex < 0) {
      segments.push(stripGrammarMaskTokens(remaining));
      break;
    }

    const maskedContent = stripGrammarMaskTokens(
      remaining.slice(next.index + startToken.length, endIndex)
    );
    segments.push(
      <RedEyeMask key={`mask-${key++}`} enabled={redEyeEnabled} kind={maskKind}>
        {maskedContent}
      </RedEyeMask>
    );
    remaining = remaining.slice(endIndex + endToken.length);
  }

  return segments;
}

function renderMaskedNode(node: React.ReactNode, redEyeEnabled: boolean): React.ReactNode {
  if (typeof node === 'string' || typeof node === 'number')
    return renderMaskedTextSegments(String(node), redEyeEnabled);

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

function renderMaskedBlockContent(
  children: React.ReactNode,
  maskKind: 'translation' | 'answer' | null,
  redEyeEnabled: boolean
): React.ReactNode {
  if (!maskKind || !redEyeEnabled) return renderMaskedNode(children, redEyeEnabled);
  return (
    <RedEyeMask enabled kind={maskKind} style={{ whiteSpace: 'normal' }}>
      {renderMaskedNode(children, false)}
    </RedEyeMask>
  );
}

export const MarkdownRenderer: React.FC<{
  content: string;
  redEyeEnabled?: boolean;
  t: TFunction;
}> = ({ content, redEyeEnabled = false, t }) => {
  if (!content) return null;

  // DEBUG: Check if masking tokens exist in content after remarkGrammarMasking processes it
  if (typeof window !== 'undefined' && (window as any).__REDEYE_DEBUG) {
    console.log(
      '[MarkdownRenderer] redEyeEnabled:',
      redEyeEnabled,
      'content has MASK_TRANSLATION:',
      content.includes('@@GRAMMAR_MASK_TRANSLATION')
    );
  }

  return (
    <div className="grammar-prose prose prose-slate max-w-none prose-sm sm:prose-base dark:prose-invert">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkGrammarMasking]}
        components={{
          h1: ({ children }) => (
            <h1 className="font-k-serif text-[32px] font-medium text-k-ink mb-6 mt-10 tracking-tight leading-tight">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="flex items-center gap-3 border-b border-[#f0ede8] pb-3 font-bold text-k-ink mb-6 mt-12 tracking-tight">
              <span className="w-1.5 h-6 bg-k-crimson rounded-full" />
              <span className="text-[20px]">{children}</span>
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="mb-4 mt-8 text-[14px] font-extrabold uppercase tracking-[0.15em] text-k-sub">
              {children}
            </h3>
          ),
          p: ({ children, node }) => {
            const nodeMaskKind = getNodeMaskKind(node);
            return (
              <p className="my-4 text-[15px] leading-[1.8] text-k-ink/80 font-medium">
                {renderMaskedBlockContent(children, nodeMaskKind, redEyeEnabled)}
              </p>
            );
          },
          ul: ({ children }) => (
            <ul className="my-6 list-disc space-y-2.5 pl-6 marker:text-k-crimson">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="my-6 list-decimal space-y-3 pl-6 marker:font-bold marker:text-k-crimson">
              {children}
            </ol>
          ),
          li: ({ children, node }) => {
            const nodeMaskKind = getNodeMaskKind(node);
            return (
              <li className="text-[15px] leading-[1.8] text-k-ink/80">
                {renderMaskedBlockContent(children, nodeMaskKind, redEyeEnabled)}
              </li>
            );
          },
          blockquote: ({ children }) => (
            <blockquote className="my-8 rounded-[18px] border-l-4 border-l-k-crimson bg-[#faf8f5] px-6 py-5 not-italic shadow-sm">
              <div className="mb-2 flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.15em] text-k-crimson">
                <Lightbulb size={14} />
                {t('coursesOverview.desktop.grammar.learningNote')}
              </div>
              <div className="text-k-ink/80">{children}</div>
            </blockquote>
          ),
          table: ({ children }) => (
            <div className="my-8 overflow-x-auto rounded-[16px] border border-[#f0ede8] bg-white shadow-sm">
              <table className="m-0 w-full border-separate border-spacing-0">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-[#faf8f5] text-k-sub">{children}</thead>,
          th: ({ children }) => (
            <th className="border-b border-r border-[#f0ede8] px-5 py-3.5 text-left text-[11px] font-extrabold uppercase tracking-[0.12em] last:border-r-0">
              {children}
            </th>
          ),
          td: ({ children }) => {
            const rawText = extractTextContent(children);
            const maskKind = rawText.trim().startsWith(GRAMMAR_MASK_TRANSLATION_TOKEN)
              ? ('translation' as const)
              : rawText.trim().startsWith(GRAMMAR_MASK_ANSWER_TOKEN)
                ? ('answer' as const)
                : null;
            return (
              <td className="border-b border-r border-[#f0ede8] px-5 py-4 align-top text-[13px] font-medium text-k-ink/80 last:border-r-0">
                {renderMaskedBlockContent(children, maskKind, redEyeEnabled)}
              </td>
            );
          },
          strong: ({ children }) => (
            <strong className="rounded-[4px] bg-k-crimson/5 px-1.5 py-0.5 font-bold text-k-crimson">
              {children}
            </strong>
          ),
          code: ({ inline, className, children, ...props }: any) => (
            <code
              className={cn(
                'font-mono font-bold',
                inline
                  ? 'rounded-[4px] bg-[#f0ede8] px-1.5 py-0.5 text-[13px] text-k-ink'
                  : 'block rounded-[12px] bg-k-ink text-[#faf8f5] p-4 text-[14px] my-6'
              )}
            >
              {children}
            </code>
          ),
          hr: () => <hr className="my-10 border-0 h-px bg-[#f0ede8]" />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

function DesktopAiGrammarCheck({
  grammar,
  language,
  t,
}: {
  grammar: GrammarPointData;
  language: string;
  t: TFunction;
}) {
  const [practiceSentence, setPracticeSentence] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [result, setResult] = useState<{
    isCorrect: boolean;
    feedback: string;
    correctedSentence: string;
  } | null>(null);

  const checkAction = useAction(
    aRef<
      { sentence: string; context: string; language?: string },
      { success?: boolean; data?: { nuance?: unknown; isCorrect?: unknown; corrected?: unknown } }
    >('ai:analyzeSentence')
  );

  const summary =
    getLocalizedContent(grammar, 'summary', language) || grammar.summary || grammar.title;

  const handleCheck = useCallback(async () => {
    const trimmed = practiceSentence.trim();
    if (!trimmed) return;
    setIsChecking(true);
    setResult(null);
    try {
      const response = await checkAction({
        sentence: trimmed,
        context: `Grammar point: ${summary}`,
        language: language as string,
      });
      const data = (response as Record<string, unknown>)?.data as
        | Record<string, unknown>
        | undefined;
      setResult({
        isCorrect: data?.isCorrect === true,
        feedback: String(data?.nuance ?? ''),
        correctedSentence: String(data?.corrected ?? ''),
      });
    } catch {
      setResult({
        isCorrect: false,
        feedback: t('common.error', 'Analysis failed. Please try again.'),
        correctedSentence: '',
      });
    } finally {
      setIsChecking(false);
    }
  }, [practiceSentence, checkAction, summary, language, t]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles size={18} className="text-k-crimson" />
        <span className="text-[13px] font-black tracking-wider text-k-ink uppercase">
          {t('coursesOverview.desktop.grammar.aiCheck', { defaultValue: 'AI Sentence Check' })}
        </span>
      </div>

      <p className="text-[11px] font-bold text-k-sub/70 leading-relaxed max-w-lg">
        {t('coursesOverview.desktop.grammar.aiCheckDesc', {
          defaultValue: 'Write a Korean sentence using this grammar pattern to get AI feedback.',
        })}
      </p>

      <div className="flex gap-2">
        <input
          type="text"
          value={practiceSentence}
          onChange={e => setPracticeSentence(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !isChecking) handleCheck();
          }}
          placeholder={t('coursesOverview.desktop.grammar.aiCheckPlaceholder', {
            defaultValue: 'Type a Korean sentence...',
          })}
          className="flex-1 h-11 rounded-xl border border-k-line/40 px-4 text-[13px] font-bold outline-none transition-all focus:border-k-crimson/30 focus:ring-4 focus:ring-k-crimson/5 bg-white"
        />
        <button
          onClick={handleCheck}
          disabled={isChecking || !practiceSentence.trim()}
          className="h-11 cursor-pointer rounded-xl bg-k-crimson px-5 text-white shadow-lg shadow-k-crimson/20 transition-all hover:bg-k-crimson/90 disabled:opacity-30 disabled:shadow-none"
        >
          {isChecking ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
        </button>
      </div>

      {result && (
        <div
          className={cn(
            'mt-4 rounded-2xl p-5 border animate-in fade-in slide-in-from-top-2 duration-300',
            result.isCorrect
              ? 'bg-k-mint/10 border-k-mint/20 text-k-mint-deep'
              : 'bg-k-crimson/5 border-k-crimson/10 text-k-crimson'
          )}
        >
          <div className="flex items-center gap-2 mb-2 font-black text-[13px]">
            {result.isCorrect ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
            {result.isCorrect
              ? t('coursesOverview.desktop.grammar.aiCorrect', { defaultValue: 'Correct!' })
              : t('coursesOverview.desktop.grammar.aiIncorrect', { defaultValue: 'Needs work' })}
          </div>

          {result.feedback && (
            <div className="text-[12px] font-bold leading-relaxed opacity-90">
              {result.feedback}
            </div>
          )}

          {result.correctedSentence && (
            <div className="mt-3 pt-3 border-t border-current/10">
              <span className="text-[10px] font-black uppercase tracking-widest opacity-60 block mb-1">
                {t('coursesOverview.desktop.grammar.aiSuggested', { defaultValue: 'Suggested' })}
              </span>
              <span className="text-[14px] font-bold font-k-serif">{result.correctedSentence}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// 渲染构造规则，支持多种格式
function renderConjugationRules(
  rules: Record<string, string> | Record<string, string>[] | string[] | undefined,
  t: TFunction
) {
  if (!rules) return null;

  const entries: Array<[string, string]> = [];

  if (Array.isArray(rules)) {
    rules.forEach((item, idx) => {
      if (typeof item === 'string') {
        entries.push([`${t('coursesOverview.desktop.grammar.conjugationRules')} ${idx + 1}`, item]);
      } else if (typeof item === 'object') {
        Object.entries(item).forEach(([key, value]) => {
          entries.push([key, String(value)]);
        });
      }
    });
  } else if (typeof rules === 'object') {
    Object.entries(rules).forEach(([key, value]) => {
      entries.push([key, String(value)]);
    });
  }

  if (entries.length === 0) return null;

  return entries.map(([rule, example], idx) => {
    const parts = example.split(/[→→]/);
    if (parts.length === 2) {
      const after = parts[1].trim();
      const match = after.match(/(.*?)([가-힣]+)$/);
      if (match) {
        return (
          <div key={idx} className="mb-4 last:mb-0">
            <div className="mb-2 text-[11px] font-semibold" style={{ color: '#999' }}>
              {rule}
            </div>
            <div className="font-k-serif text-[24px] font-medium" style={{ color: '#1f1b17' }}>
              {parts[0].trim()} <span style={{ color: '#ccc' }}>→</span> {match[1]}
              <span style={{ color: '#c41230', fontWeight: 600 }}>{match[2]}</span>
            </div>
          </div>
        );
      }
    }

    return (
      <div key={idx} className="mb-4 last:mb-0">
        <div className="mb-2 text-[11px] font-semibold" style={{ color: '#999' }}>
          {rule}
        </div>
        <div className="font-k-serif text-[24px] font-medium" style={{ color: '#1f1b17' }}>
          {example}
        </div>
      </div>
    );
  });
}

interface DesktopGrammarModulePageProps {
  allCourseGrammar: GrammarPointData[];
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  desktopSelectedGrammarId: string | null;
  setHasManualUnitSelection: (v: boolean) => void;
  setSelectedUnit: (u: number) => void;
  setSelectedGrammarId: (id: string | null) => void;
  clearRecommendedDismissal: () => void;
  activeSelectedUnit: number;
  clampUnit: (u: number) => number;
  instituteName: string;
  instituteId: string;
  language: string;
  t: TFunction;
  selectedStatus: string;
  statusLabel: string;
  statusClass: string;
  selectedProficiency: number;
  selectedTitle: string | null;
  desktopSelectedGrammar: GrammarPointData | null;
  handleToggleStatus: (grammarId: string) => void;
  isGrammarLoading: boolean;
  isAiPanelOpen: boolean;
  setIsAiPanelOpen: (v: boolean) => void;
  grammarListWithUpdates: GrammarPointData[];
  currentIndex: number;
  handleNext: () => void;
  handlePrev: () => void;
  navigate: (path: string) => void;
}

export default function DesktopGrammarModulePage({
  allCourseGrammar,
  searchQuery,
  setSearchQuery,
  desktopSelectedGrammarId,
  setHasManualUnitSelection,
  setSelectedUnit,
  setSelectedGrammarId,
  clearRecommendedDismissal,
  activeSelectedUnit,
  clampUnit,
  instituteName,
  instituteId,
  language,
  t,
  selectedStatus,
  statusLabel,
  statusClass,
  selectedProficiency,
  selectedTitle,
  desktopSelectedGrammar,
  handleToggleStatus,
  isGrammarLoading,
  isAiPanelOpen,
  setIsAiPanelOpen,
  grammarListWithUpdates,
  currentIndex,
  handleNext,
  handlePrev,
  navigate,
}: DesktopGrammarModulePageProps) {
  const [redEyeMode, setRedEyeMode] = React.useState(false);
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const normalizedSearchQuery = deferredSearchQuery.trim().toLowerCase();

  const filteredGrammarByUnit = useMemo(() => {
    const groups = new Map<number, GrammarPointData[]>();
    if (!allCourseGrammar || allCourseGrammar.length === 0) return groups;

    allCourseGrammar.forEach(grammar => {
      const unitId = grammar.unitId || 1;
      if (normalizedSearchQuery) {
        const matchesSearch =
          grammar.title.toLowerCase().includes(normalizedSearchQuery) ||
          (grammar.titleZh || '').toLowerCase().includes(normalizedSearchQuery) ||
          (grammar.summary || '').toLowerCase().includes(normalizedSearchQuery);
        if (!matchesSearch) {
          return;
        }
      }

      const bucket = groups.get(unitId);
      if (bucket) {
        bucket.push(grammar);
      } else {
        groups.set(unitId, [grammar]);
      }
    });

    return groups;
  }, [allCourseGrammar, normalizedSearchQuery]);

  // Grouped by unit statistics
  const unitsByCategory = useMemo(() => {
    return Array.from(filteredGrammarByUnit.entries())
      .map(([unitId, grammars]) => ({
        unitId,
        name: t(`coursesOverview.desktop.grammar.categories.${unitId}`, {
          defaultValue: `Unit ${unitId}`,
        }),
        count: grammars.length,
      }))
      .sort((a, b) => a.unitId - b.unitId);
  }, [filteredGrammarByUnit, t]);

  // Calculate total progress
  const totalMastered = useMemo(() => {
    if (!allCourseGrammar) return 0;
    return allCourseGrammar.filter(g => g.status === 'MASTERED').length;
  }, [allCourseGrammar]);

  const totalCount = allCourseGrammar?.length || 0;
  const g = desktopSelectedGrammar;
  const completedBadgeLabel = t('grammar.status.completedBadge', { defaultValue: '已完成' });
  const hasAltTitles = !!(g?.titleEn || g?.titleZh || g?.titleVi || g?.titleMn);
  const hasAltSummaries = !!(g?.summaryEn || g?.summaryVi || g?.summaryMn);
  const hasConjugationRules = g?.conjugationRules != null;
  const conjugationRules = g?.conjugationRules as
    | Record<string, string>
    | Record<string, string>[]
    | string[]
    | undefined;

  return (
    <div className="h-screen overflow-hidden flex flex-col bg-k-bg">
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="mx-auto w-full max-w-6xl px-6 py-10">
          {/* --- Breadcrumb/Header --- */}
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={() => navigate('/courses')}
              className="w-8 h-8 rounded-full border border-k-line flex items-center justify-center text-k-sub hover:bg-k-bg2 transition-colors"
            >
              <ChevronLeft size={18} />
            </button>
            <div className="w-px h-6 bg-k-line mx-2" />
            <div className="text-[11px] font-black text-k-sub uppercase tracking-widest opacity-60">
              {instituteName} · {t('courseDashboard.modules.grammar')}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] items-start gap-8">
            {/* Left sidebar - Grammar directory */}
            <aside className="space-y-6 sticky top-0">
              <DesktopCard pad={0} className="overflow-hidden">
                <div className="p-4 border-b border-k-line flex items-center gap-2">
                  <span className="font-k-serif text-sm text-k-crimson font-medium">表</span>
                  <span className="text-[12px] font-black text-k-ink uppercase tracking-wider">
                    {t('grammarModule.catalog', { defaultValue: 'Grammar Catalog' })}
                  </span>
                </div>

                <div className="p-3 bg-k-bg2/30 border-b border-k-line">
                  <div className="relative">
                    <Search
                      size={14}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-k-sub"
                    />
                    <input
                      type="text"
                      placeholder={t('coursesOverview.desktop.grammar.quickFilter')}
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="w-full h-8 pl-8 pr-3 rounded-lg bg-white border border-k-line/20 text-[11px] font-bold outline-none focus:ring-2 focus:ring-k-crimson/10 transition-all"
                    />
                  </div>
                </div>

                <div className="max-h-[600px] overflow-y-auto hide-scrollbar divide-y divide-k-line">
                  {unitsByCategory.map(unit => {
                    const points = filteredGrammarByUnit.get(unit.unitId) ?? [];

                    if (points.length === 0 && normalizedSearchQuery) return null;

                    return (
                      <div key={unit.unitId}>
                        <div className="px-4 py-2 bg-k-bg2/50 text-[10px] font-black text-k-sub uppercase tracking-widest border-b border-k-line/10">
                          {unit.name}
                        </div>
                        {points.map(point => (
                          <div
                            key={point.id}
                            className={cn(
                              'px-4 py-3.5 cursor-pointer border-l-[3px] transition-all',
                              desktopSelectedGrammarId === point.id
                                ? 'bg-k-crimson/5 border-k-crimson'
                                : 'border-transparent hover:bg-k-bg2/30'
                            )}
                            onClick={() => {
                              clearRecommendedDismissal();
                              setHasManualUnitSelection(true);
                              setSelectedUnit(unit.unitId);
                              setSelectedGrammarId(point.id);
                            }}
                          >
                            <div className="flex items-center gap-2">
                              <div
                                className={cn(
                                  'text-[13px] font-black',
                                  desktopSelectedGrammarId === point.id
                                    ? 'text-k-ink'
                                    : 'text-k-ink2/80'
                                )}
                              >
                                {point.title}
                              </div>
                              {point.status === 'MASTERED' ? (
                                <span className="rounded-full bg-k-mint/20 px-2 py-0.5 text-[9px] font-black tracking-[0.08em] text-k-mint-deep">
                                  {completedBadgeLabel}
                                </span>
                              ) : null}
                            </div>
                            <div className="text-[10px] font-bold text-k-sub mt-1">
                              {point.status === 'MASTERED'
                                ? t('status.mastered')
                                : t('status.learning')}
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </DesktopCard>

              {/* Progress card */}
              <DesktopCard className="bg-k-ink text-k-bg p-5">
                <div className="text-[10px] font-black tracking-widest uppercase opacity-60 mb-2">
                  {t('coursesOverview.desktop.grammar.myProgress')}
                </div>
                <div className="text-2xl font-black mb-1">
                  {totalMastered} / {totalCount}
                </div>
                <div className="text-[11px] font-bold opacity-70">
                  {t('coursesOverview.desktop.grammar.masteryRate')}{' '}
                  {totalCount > 0 ? Math.round((totalMastered / totalCount) * 100) : 0}%
                </div>
              </DesktopCard>
            </aside>

            {/* Right content */}
            <div className="space-y-6">
              {isGrammarLoading ? (
                <DesktopCard className="p-20 text-center">
                  <div className="animate-pulse text-k-sub font-bold">{t('common.loading')}</div>
                </DesktopCard>
              ) : g ? (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  {/* Main grammar card */}
                  <DesktopCard className="p-8 relative">
                    <div className="flex items-center justify-between mb-4">
                      <span className="px-2 py-0.5 bg-k-crimson text-white text-[10px] font-black rounded uppercase tracking-widest">
                        Unit {g.unitId || activeSelectedUnit} ·{' '}
                        {t(
                          `coursesOverview.desktop.grammar.categories.${g.unitId || activeSelectedUnit}`,
                          { defaultValue: `Unit ${g.unitId || activeSelectedUnit}` }
                        )}
                      </span>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-k-sub font-bold text-[11px]"
                        >
                          {t('community.desktop.share', 'Share')} ↗
                        </Button>
                      </div>
                    </div>

                    <h2 className="font-k-serif text-[48px] font-medium text-k-ink leading-tight tracking-tight mb-2">
                      {selectedTitle || g.title}
                    </h2>

                    {/* Multi-language titles */}
                    {(g.titleEn || g.titleZh || g.titleVi || g.titleMn) && (
                      <div className="mt-2 flex flex-wrap gap-4">
                        {g.titleZh && g.titleZh !== g.title && (
                          <div className="flex items-center gap-1.5 text-k-sub/70">
                            <Languages size={14} className="opacity-50" />
                            <span className="text-[12px] font-bold">ZH: {g.titleZh}</span>
                          </div>
                        )}
                        {g.titleEn && (
                          <div className="flex items-center gap-1.5 text-k-sub/70">
                            <Languages size={14} className="opacity-50" />
                            <span className="text-[12px] font-bold">EN: {g.titleEn}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Summary */}
                    <div className="mt-4 p-5 bg-k-bg2/40 rounded-2xl border border-k-line/10">
                      <div className="text-[11px] font-black text-k-crimson uppercase tracking-[2px] mb-2">
                        {t('common.summary', 'Summary')}
                      </div>
                      <div className="text-[15px] font-bold text-k-ink/80 leading-relaxed">
                        {sanitizeGrammarDisplayText(
                          getLocalizedContent(g, 'summary', language) || g.summary || ''
                        )}
                      </div>

                      {/* Multi-language summaries */}
                      {(g.summaryEn || g.summaryVi || g.summaryMn) && (
                        <div className="mt-4 space-y-2 pt-4 border-t border-k-line/20">
                          {g.summaryEn && (
                            <RedEyeBlock enabled={redEyeMode}>
                              <div className="text-[12px] font-bold text-k-sub/60">
                                EN: {g.summaryEn}
                              </div>
                            </RedEyeBlock>
                          )}
                          {g.summaryZh && g.summaryZh !== g.summary && (
                            <RedEyeBlock enabled={redEyeMode}>
                              <div className="text-[12px] font-bold text-k-sub/60">
                                ZH: {g.summaryZh}
                              </div>
                            </RedEyeBlock>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Controls */}
                    <div className="mt-6 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <button
                          className="cursor-pointer rounded-[10px] border px-[14px] py-[8px] text-[12px] font-black transition-all flex items-center gap-2"
                          style={{
                            background: redEyeMode ? '#c41230' : '#fff',
                            borderColor: redEyeMode ? '#c41230' : '#e8e5e0',
                            color: redEyeMode ? '#fff' : '#666',
                          }}
                          onClick={() => setRedEyeMode(!redEyeMode)}
                        >
                          {redEyeMode ? <EyeOff size={16} /> : <Eye size={16} />}
                          {redEyeMode
                            ? t('coursesOverview.desktop.grammar.redEyeOff')
                            : t('coursesOverview.desktop.grammar.redEyeMode')}
                        </button>

                        <button
                          className={cn(
                            'px-4 py-2 rounded-[10px] text-[12px] font-black uppercase tracking-widest transition-all',
                            selectedStatus === 'MASTERED'
                              ? 'bg-k-mint text-white'
                              : 'bg-k-bg2 text-k-sub border border-k-line'
                          )}
                          onClick={() => g && handleToggleStatus(g.id)}
                        >
                          {selectedStatus === 'MASTERED'
                            ? t('status.mastered')
                            : t('coursesOverview.desktop.grammar.markMastered')}
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={handlePrev}
                          disabled={currentIndex <= 0}
                          className="w-10 h-10 rounded-xl border border-k-line flex items-center justify-center text-k-sub hover:bg-k-bg2 transition-colors disabled:opacity-30"
                        >
                          <ChevronLeft size={20} />
                        </button>
                        <button
                          onClick={handleNext}
                          disabled={currentIndex >= (grammarListWithUpdates?.length || 0) - 1}
                          className="w-10 h-10 rounded-xl border border-k-line flex items-center justify-center text-k-sub hover:bg-k-bg2 transition-colors disabled:opacity-30"
                        >
                          <ChevronRight size={20} />
                        </button>
                      </div>
                    </div>
                  </DesktopCard>

                  {/* AI Check Section */}
                  <DesktopCard className="p-8 border-2 border-k-mint/20 bg-k-mint/5">
                    <DesktopAiGrammarCheck grammar={g} language={language} t={t} />
                  </DesktopCard>

                  {/* Detail Sections */}
                  <div className="space-y-6 pb-20">
                    {/* Render sections if they exist in G (similar to Overview) */}
                    {g.sections && (
                      <div className="space-y-6">
                        {[
                          {
                            id: 'introduction',
                            icon: Lightbulb,
                            label: 'INTRODUCTION',
                            tKey: 'introduction',
                          },
                          { id: 'core', icon: BookOpen, label: 'CORE USAGE', tKey: 'coreUsage' },
                          {
                            id: 'comparative',
                            icon: Sparkles,
                            label: 'COMPARATIVE',
                            tKey: 'comparative',
                          },
                          {
                            id: 'cultural',
                            icon: HelpCircle,
                            label: 'CULTURAL NOTES',
                            tKey: 'culturalNotes',
                          },
                          {
                            id: 'commonMistakes',
                            icon: AlertTriangle,
                            label: 'COMMON MISTAKES',
                            tKey: 'commonMistakes',
                          },
                          { id: 'review', icon: CheckCircle2, label: 'REVIEW', tKey: 'review' },
                        ].map(sec => {
                          const content = (g.sections as any)?.[sec.id];
                          if (!content?.zh && !content?.en) return null;
                          return (
                            <div
                              key={sec.id}
                              className="rounded-[18px] border border-k-line bg-white px-8 py-7 shadow-sm"
                            >
                              <div className="mb-4 flex items-center gap-2.5">
                                <sec.icon size={18} className="text-k-crimson" />
                                <span className="text-[12px] font-black tracking-[1.5px] text-k-ink uppercase">
                                  {t(`coursesOverview.desktop.grammar.${sec.tKey}`)} · {sec.label}
                                </span>
                              </div>
                              {content.zh && (
                                <MarkdownRenderer
                                  content={content.zh}
                                  redEyeEnabled={redEyeMode}
                                  t={t}
                                />
                              )}
                              {content.en && (
                                <RedEyeBlock enabled={redEyeMode}>
                                  <div className="mt-6 pt-6 border-t border-dashed border-k-line">
                                    <MarkdownRenderer
                                      content={`EN: ${content.en}`}
                                      redEyeEnabled={redEyeMode}
                                      t={t}
                                    />
                                  </div>
                                </RedEyeBlock>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Conjugation Rules */}
                    {hasConjugationRules && (
                      <div className="bg-k-bg2/40 rounded-[22px] p-8 border border-k-line/20">
                        <div className="text-[11px] font-black text-k-sub uppercase tracking-[2px] mb-6">
                          {t('coursesOverview.desktop.grammar.conjugationRules')} · CONSTRUCTIONS
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                          {renderConjugationRules(conjugationRules, t)}
                        </div>
                      </div>
                    )}

                    {/* Explanation (Legacy fallback) */}
                    {!g.sections && g.explanation && (
                      <div className="rounded-[18px] border border-k-line bg-white px-8 py-7 shadow-sm">
                        <div className="mb-4 flex items-center gap-2.5">
                          <Lightbulb size={18} className="text-k-crimson" />
                          <span className="text-[12px] font-black tracking-[1.5px] text-k-ink uppercase">
                            {t('coursesOverview.desktop.grammar.explanation')} · EXPLANATION
                          </span>
                        </div>
                        <MarkdownRenderer
                          content={g.explanation}
                          redEyeEnabled={redEyeMode}
                          t={t}
                        />
                        {g.explanationEn && (
                          <RedEyeBlock enabled={redEyeMode}>
                            <div className="mt-6 pt-6 border-t border-dashed border-k-line">
                              <MarkdownRenderer
                                content={`EN: ${g.explanationEn}`}
                                redEyeEnabled={redEyeMode}
                                t={t}
                              />
                            </div>
                          </RedEyeBlock>
                        )}
                      </div>
                    )}

                    {/* Examples */}
                    {g.examples && g.examples.length > 0 && (
                      <div className="space-y-4">
                        <div className="text-[11px] font-black text-k-sub uppercase tracking-[2px] mb-4">
                          {t('coursesOverview.desktop.grammar.examples')} · EXAMPLES
                        </div>
                        {g.examples.map((e, i) => (
                          <div
                            key={i}
                            className="group p-6 rounded-[20px] border border-k-line hover:border-k-crimson/20 bg-white transition-all shadow-sm"
                          >
                            <div className="font-k-serif text-[20px] text-k-ink leading-relaxed">
                              {e.kr}
                            </div>
                            {(e.cn || e.en) && (
                              <div className="mt-3 flex flex-col gap-1.5 border-t border-k-line/10 pt-3">
                                {e.cn && (
                                  <RedEyeBlock enabled={redEyeMode}>
                                    <div className="text-[13px] font-bold text-k-sub">{e.cn}</div>
                                  </RedEyeBlock>
                                )}
                                {e.en && (
                                  <RedEyeBlock enabled={redEyeMode}>
                                    <div className="text-[11px] font-bold text-k-sub/50">
                                      EN: {e.en}
                                    </div>
                                  </RedEyeBlock>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex h-[600px] flex-col items-center justify-center text-k-sub font-bold gap-4 bg-white rounded-3xl border border-k-line/20">
                  <div className="text-6xl opacity-20">📭</div>
                  <div className="text-[14px] uppercase tracking-widest">
                    {t('coursesOverview.desktop.grammar.selectGrammar')}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
