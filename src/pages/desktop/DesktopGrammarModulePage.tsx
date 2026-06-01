import React, { useEffect, useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
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
  ChevronLeft,
  ChevronDown,
  Loader2,
  MessageCircle,
  Send,
  X,
} from 'lucide-react';
import type { GrammarPointData } from '../../types';
import { sanitizeGrammarDisplayText } from '../../utils/grammarDisplaySanitizer';
import { getLocalizedContent } from '../../utils/languageUtils';
import { AI } from '../../utils/convexRefs';
import { buildDesktopGrammarDisplayModel } from './desktopGrammarDisplayModel';

// 红眼模式包装器
export function RedEyeBlock({
  enabled,
  children,
  className,
}: {
  enabled: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  if (!enabled) return <>{children}</>;
  return (
    <span
      className={className}
      style={{
        filter: 'blur(8px)',
        userSelect: 'none',
        pointerEvents: 'none',
        display: 'inline-block',
        width: '100%',
      }}
    >
      {children}
    </span>
  );
}

export function MarkdownRenderer({
  content,
  redEyeEnabled,
}: {
  content: string;
  redEyeEnabled: boolean;
  t?: unknown;
}) {
  const normalized = sanitizeGrammarDisplayText(content).trim();
  if (!normalized) {
    return null;
  }

  const components: Components = {
    h1: ({ children }) => (
      <h1 className="mt-8 mb-4 text-[28px] font-bold leading-tight text-stone-950">{children}</h1>
    ),
    h2: ({ children }) => (
      <h2 className="mt-8 mb-3 border-b border-stone-200 pb-2 text-[20px] font-bold leading-tight text-stone-950">
        {children}
      </h2>
    ),
    h3: ({ children }) => (
      <h3 className="mt-6 mb-2 text-[16px] font-bold text-stone-950">{children}</h3>
    ),
    h4: ({ children }) => (
      <h4 className="mt-4 mb-2 text-[14px] font-bold text-stone-700">{children}</h4>
    ),
    p: ({ children }) => <p className="my-3 text-[14px] leading-[2] text-stone-700">{children}</p>,
    ul: ({ children }) => (
      <ul className="my-3 list-disc space-y-1 pl-6 text-[14px] leading-[2] text-stone-700">
        {children}
      </ul>
    ),
    ol: ({ children }) => (
      <ol className="my-3 list-decimal space-y-1 pl-6 text-[14px] leading-[2] text-stone-700">
        {children}
      </ol>
    ),
    li: ({ children }) => (
      <li className="pl-1 text-[14px] leading-[2] text-stone-700">{children}</li>
    ),
    hr: () => <hr className="my-6 h-px border-0 bg-stone-200" />,
    strong: ({ children }) => <strong className="font-bold text-rose-700">{children}</strong>,
    blockquote: ({ children }) => (
      <blockquote className="my-4 rounded-[10px] border-l-[3px] border-rose-700 bg-rose-50/70 px-4 py-3">
        {children}
      </blockquote>
    ),
    table: ({ children }) => (
      <div className="my-4 overflow-x-auto rounded-[10px] border border-stone-200">
        <table className="m-0 w-full border-separate border-spacing-0 text-[13px]">
          {children}
        </table>
      </div>
    ),
    thead: ({ children }) => <thead className="bg-stone-50">{children}</thead>,
    tbody: ({ children }) => <tbody>{children}</tbody>,
    th: ({ children }) => (
      <th className="border-b border-r border-stone-200 px-4 py-2 text-left text-[12px] font-bold text-stone-500 last:border-r-0">
        {children}
      </th>
    ),
    td: ({ children }) => (
      <td className="border-b border-r border-stone-200 px-4 py-2 text-[13px] text-stone-700 last:border-r-0">
        {children}
      </td>
    ),
    code: ({ children, className, ...props }) => (
      <code
        className={`rounded-[4px] bg-rose-50 px-1.5 py-0.5 text-[12px] font-semibold text-rose-700 ${className ?? ''}`}
        {...props}
      >
        {children}
      </code>
    ),
    pre: ({ children }) => (
      <pre className="my-4 overflow-x-auto rounded-[10px] bg-stone-50 p-4 text-[13px]">
        {children}
      </pre>
    ),
  };

  return (
    <RedEyeBlock enabled={redEyeEnabled}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {normalized}
      </ReactMarkdown>
    </RedEyeBlock>
  );
}

// 渲染构造规则，支持多种格式
function renderConjugationRules(
  rules: Record<string, string> | Array<Record<string, string> | string> | undefined
) {
  if (!rules) return null;

  const entries: Array<[string, string]> = [];

  if (Array.isArray(rules)) {
    rules.forEach((item, idx) => {
      if (typeof item === 'string') {
        entries.push([`规则 ${idx + 1}`, item]);
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

// 语法分类名称
const unitNames: Record<number, string> = {
  1: '基础助词',
  2: '时态变化',
  3: '条件假设',
  4: '间接引语',
  5: '使役被动',
  6: '高级连接',
  7: '推测与推断',
  8: '假设与前提',
  9: '让步与包含',
  10: '机会与变化',
  11: '引述与传闻',
  12: '必要与经验',
  13: '列举与顺序',
  14: '标准与范围',
  15: '助词与语气',
};

const MAX_AI_CONTEXT_MESSAGES = 8;

interface AiPracticeMessage {
  id: string;
  role: 'assistant' | 'user';
  content: string;
  pending?: boolean;
}

const aiPracticeMarkdownComponents: Components = {
  p: ({ children }) => <p className="my-1.5 first:mt-0 last:mb-0">{children}</p>,
  strong: ({ children }) => <strong className="font-bold text-stone-950">{children}</strong>,
  em: ({ children }) => <em className="font-medium not-italic text-stone-800">{children}</em>,
  ul: ({ children }) => <ul className="my-2 list-disc space-y-1 pl-5">{children}</ul>,
  ol: ({ children }) => <ol className="my-2 list-decimal space-y-1 pl-5">{children}</ol>,
  li: ({ children }) => <li className="pl-1">{children}</li>,
  blockquote: ({ children }) => (
    <blockquote className="my-2 border-l-2 border-rose-700/50 pl-3 text-stone-600">
      {children}
    </blockquote>
  ),
  code: ({ children }) => (
    <code className="rounded-[4px] bg-stone-100 px-1 py-0.5 text-[12px] font-semibold text-stone-800">
      {children}
    </code>
  ),
};

function AiPracticeMarkdown({ content }: { content: string }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={aiPracticeMarkdownComponents}>
      {content}
    </ReactMarkdown>
  );
}

interface DesktopAiPracticeDialogProps {
  grammar: GrammarPointData | null;
  grammarTitle: string;
  grammarSummary: string;
  grammarExplanation: string;
  language: string;
  isOpen: boolean;
  setIsOpen: (v: boolean) => void;
}

function DesktopAiPracticeDialog({
  grammar,
  grammarTitle,
  grammarSummary,
  grammarExplanation,
  language,
  isOpen,
  setIsOpen,
}: DesktopAiPracticeDialogProps) {
  const askGrammarTutor = useAction(AI.grammarTutorChat);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [messages, setMessages] = useState<AiPracticeMessage[]>([]);
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!grammar) {
      setMessages([]);
      setInput('');
      setIsSending(false);
      return;
    }

    setMessages([
      {
        id: `assistant-init-${grammar.id}`,
        role: 'assistant',
        content: '输入一句包含当前语法点的韩语句子，我会检查是否自然，并给出更好的表达。',
      },
    ]);
    setInput('');
    setIsSending(false);
  }, [grammar]);

  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, isOpen]);

  const sendMessage = async () => {
    const userText = input.trim();
    if (!grammar || userText.length === 0 || isSending) return;

    const userMessage: AiPracticeMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: userText,
    };
    const pendingMessageId = `assistant-pending-${Date.now()}`;
    const pendingMessage: AiPracticeMessage = {
      id: pendingMessageId,
      role: 'assistant',
      content: '检查中...',
      pending: true,
    };
    const conversationHistory = [
      ...messages
        .filter(message => !message.pending)
        .map(message => ({
          role: message.role,
          content: message.content,
        })),
      { role: 'user' as const, content: userText },
    ].slice(-MAX_AI_CONTEXT_MESSAGES);

    setMessages(prev => [...prev, userMessage, pendingMessage]);
    setInput('');
    setIsSending(true);

    try {
      const response = await askGrammarTutor({
        grammarTitle,
        grammarSummary,
        grammarExplanation,
        language,
        messages: conversationHistory,
      });
      const reply =
        response?.success && response.reply ? response.reply : '暂时无法完成检查，请稍后再试。';

      setMessages(prev =>
        prev.map(message =>
          message.id === pendingMessageId ? { ...message, content: reply, pending: false } : message
        )
      );
    } catch {
      setMessages(prev =>
        prev.map(message =>
          message.id === pendingMessageId
            ? { ...message, content: '暂时无法完成检查，请稍后再试。', pending: false }
            : message
        )
      );
    } finally {
      setIsSending(false);
    }
  };

  return (
    <>
      <button
        type="button"
        className="fixed bottom-[28px] right-[32px] z-40 flex h-[54px] w-[54px] items-center justify-center rounded-full bg-[#c41230] text-white shadow-[0_14px_35px_rgba(196,18,48,0.32)] transition-transform hover:scale-[1.03]"
        onClick={() => setIsOpen(true)}
        aria-label="打开 AI 语法练习"
      >
        <MessageCircle size={22} />
      </button>

      {isOpen && (
        <div
          className="fixed bottom-[96px] right-[32px] z-50 flex max-h-[calc(100vh-130px)] w-[430px] flex-col overflow-hidden rounded-[16px] border border-stone-200 bg-white shadow-[0_24px_70px_rgba(31,27,23,0.18)]"
          role="dialog"
          aria-modal="false"
          aria-label="AI 语法练习"
        >
          <div className="flex items-start justify-between border-b border-stone-100 px-[18px] py-[16px]">
            <div className="min-w-0">
              <div className="text-[13px] font-extrabold text-stone-950">AI 语法练习</div>
              <div className="mt-1 truncate text-[12px] font-semibold text-stone-500">
                {grammarTitle}
              </div>
            </div>
            <button
              type="button"
              className="ml-3 rounded-full p-1.5 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-900"
              onClick={() => setIsOpen(false)}
              aria-label="关闭 AI 语法练习"
            >
              <X size={16} />
            </button>
          </div>

          <div
            ref={listRef}
            className="min-h-[260px] flex-1 space-y-3 overflow-y-auto bg-stone-50/70 px-[18px] py-[16px]"
          >
            {messages.map(message => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[82%] rounded-[12px] px-[14px] py-[10px] text-[13px] leading-6 ${
                    message.role === 'user'
                      ? 'bg-[#c41230] text-white'
                      : 'border border-stone-200 bg-white text-stone-700'
                  }`}
                >
                  {message.pending && <Loader2 size={13} className="mr-1 inline animate-spin" />}
                  {message.role === 'assistant' ? (
                    <AiPracticeMarkdown content={message.content} />
                  ) : (
                    <span className="whitespace-pre-wrap">{message.content}</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-stone-100 p-[14px]">
            <textarea
              value={input}
              onChange={event => setInput(event.target.value)}
              onKeyDown={event => {
                if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
                  event.preventDefault();
                  void sendMessage();
                }
              }}
              placeholder="输入韩语句子，按 Ctrl/⌘ + Enter 发送"
              className="min-h-[86px] w-full resize-none rounded-[12px] border border-stone-200 bg-white px-3 py-2 text-[13px] leading-6 text-stone-800 outline-none transition-colors placeholder:text-stone-400 focus:border-[#c41230]"
            />
            <div className="mt-3 flex justify-end">
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-[10px] bg-[#c41230] px-4 py-2 text-[12px] font-bold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-45"
                onClick={() => void sendMessage()}
                disabled={input.trim().length === 0 || isSending}
              >
                {isSending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                发送
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

interface DesktopGrammarModulePageProps {
  allCourseGrammar: GrammarPointData[];
  desktopSelectedGrammarId: string | null;
  setHasManualUnitSelection: (v: boolean) => void;
  setSelectedUnit: (u: number) => void;
  setSelectedGrammarId: (id: string | null) => void;
  activeSelectedUnit: number;
  clampUnit: (u: number) => number;
  language: string;
  selectedTitle: string | null;
  desktopSelectedGrammar: GrammarPointData | null;
  isGrammarLoading: boolean;
  isAiPanelOpen: boolean;
  setIsAiPanelOpen: (v: boolean) => void;
  navigate: (path: string) => void;
}

export default function DesktopGrammarModulePage({
  allCourseGrammar,
  desktopSelectedGrammarId,
  setHasManualUnitSelection,
  setSelectedUnit,
  setSelectedGrammarId,
  activeSelectedUnit,
  clampUnit,
  language,
  selectedTitle,
  desktopSelectedGrammar,
  isGrammarLoading,
  isAiPanelOpen,
  setIsAiPanelOpen,
  navigate,
}: DesktopGrammarModulePageProps) {
  const [redEyeMode, setRedEyeMode] = React.useState(false);
  const [expandedUnits, setExpandedUnits] = useState<Set<number>>(
    () => new Set([activeSelectedUnit])
  );

  const unitsByCategory = useMemo(() => {
    if (!allCourseGrammar || allCourseGrammar.length === 0) return [];

    const unitMap = new Map<number, GrammarPointData[]>();
    allCourseGrammar.forEach(g => {
      const uid = g.unitId || 1;
      if (!unitMap.has(uid)) unitMap.set(uid, []);
      unitMap.get(uid)!.push(g);
    });

    return Array.from(unitMap.entries())
      .map(([unitId, items]) => ({
        unitId,
        name: unitNames[unitId] || `Unit ${unitId}`,
        count: items.length,
        items,
      }))
      .sort((a, b) => a.unitId - b.unitId);
  }, [allCourseGrammar]);

  // 计算总进度
  const totalMastered = useMemo(() => {
    if (!allCourseGrammar) return 0;
    return allCourseGrammar.filter(g => g.status === 'MASTERED').length;
  }, [allCourseGrammar]);

  const totalCount = allCourseGrammar?.length || 0;

  const g = desktopSelectedGrammar;
  const display = buildDesktopGrammarDisplayModel(g, language);
  const grammarTitle = selectedTitle || display.title;

  return (
    <div className="h-full min-h-0 overflow-hidden bg-[#f7f4ef]">
      <div className="mx-auto h-full min-h-0 max-w-[1440px] px-[28px] py-[24px]">
        <div className="grid h-full min-h-0 grid-cols-[292px_minmax(0,1fr)] items-stretch gap-[24px]">
          {/* Left sidebar - 语法目录 */}
          <div className="flex min-h-0 flex-col gap-[16px]">
            <DesktopCard
              pad={0}
              className="flex min-h-0 flex-1 flex-col overflow-hidden"
              style={{ background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
            >
              <div
                className="flex items-center border-b px-[16px] py-[14px]"
                style={{ borderColor: '#f0ede8' }}
              >
                <span
                  className="mr-1.5 font-k-serif text-[14px] font-medium"
                  style={{ color: '#c41230' }}
                >
                  表
                </span>
                <span className="text-[12px] font-extrabold" style={{ color: '#1f1b17' }}>
                  语法目录
                </span>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto pb-[12px]">
                {unitsByCategory.map((unit, i) => {
                  const isActive = unit.unitId === activeSelectedUnit;
                  const isExpanded = expandedUnits.has(unit.unitId);
                  return (
                    <div key={unit.unitId}>
                      <div
                        className="cursor-pointer border-l-[3px] px-[16px] py-[12px] transition-all"
                        style={{
                          borderBottom:
                            !isExpanded && i < unitsByCategory.length - 1
                              ? '1px solid #f0ede8'
                              : 'none',
                          background: isActive ? '#faf5f5' : 'transparent',
                          borderLeftColor: isActive ? '#c41230' : 'transparent',
                        }}
                        onClick={() => {
                          setExpandedUnits(prev => {
                            const next = new Set(prev);
                            if (next.has(unit.unitId)) {
                              next.delete(unit.unitId);
                            } else {
                              next.add(unit.unitId);
                            }
                            return next;
                          });
                          setHasManualUnitSelection(true);
                          setSelectedUnit(clampUnit(unit.unitId));
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div
                            className="text-[12px]"
                            style={{ color: '#1f1b17', fontWeight: isActive ? 800 : 600 }}
                          >
                            {unit.name}
                          </div>
                          <ChevronDown
                            size={14}
                            className="transition-transform"
                            style={{
                              color: '#999',
                              transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                            }}
                          />
                        </div>
                        <div className="mt-0.5 text-[10px] font-semibold" style={{ color: '#999' }}>
                          {unit.count} 个语法点
                        </div>
                      </div>
                      {isExpanded && (
                        <div
                          style={{
                            borderBottom:
                              i < unitsByCategory.length - 1 ? '1px solid #f0ede8' : 'none',
                          }}
                        >
                          {unit.items.map(item => {
                            const isItemActive = item.id === desktopSelectedGrammarId;
                            const itemTitle = sanitizeGrammarDisplayText(
                              getLocalizedContent(item, 'title', language) || item.title
                            );
                            return (
                              <div
                                key={item.id}
                                className="cursor-pointer px-[16px] py-[8px] pl-[28px] transition-all"
                                style={{
                                  background: isItemActive ? '#c41230' : 'transparent',
                                }}
                                onClick={e => {
                                  e.stopPropagation();
                                  setHasManualUnitSelection(true);
                                  setSelectedUnit(clampUnit(unit.unitId));
                                  setSelectedGrammarId(item.id);
                                }}
                              >
                                <div
                                  className="truncate text-[11px]"
                                  style={{
                                    color: isItemActive ? '#fff' : '#666',
                                    fontWeight: isItemActive ? 700 : 500,
                                  }}
                                >
                                  {itemTitle}
                                </div>
                                {item.status === 'MASTERED' && (
                                  <span
                                    className="text-[9px] font-bold"
                                    style={{
                                      color: isItemActive ? 'rgba(255,255,255,0.7)' : '#10b981',
                                    }}
                                  >
                                    ✓ 已掌握
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </DesktopCard>

            {/* Progress card */}
            <div className="shrink-0 rounded-[14px] p-[20px]" style={{ background: '#1f1b17' }}>
              <div className="text-[10px] font-bold" style={{ color: 'rgba(250,248,245,0.5)' }}>
                MY PROGRESS
              </div>
              <div
                className="mt-2 font-k-serif text-[28px] font-medium"
                style={{ color: '#faf8f5' }}
              >
                {totalMastered} / {totalCount}
              </div>
              <div className="mt-1 text-[11px]" style={{ color: 'rgba(250,248,245,0.6)' }}>
                掌握率 {totalCount > 0 ? Math.round((totalMastered / totalCount) * 100) : 0}%
              </div>
            </div>
          </div>

          {/* Right content */}
          <div className="min-h-0 overflow-y-auto pr-[6px]">
            {isGrammarLoading ? (
              <DesktopCard
                pad={60}
                style={{
                  background: '#fff',
                  textAlign: 'center',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                }}
              >
                <div className="animate-pulse" style={{ color: '#999' }}>
                  加载中...
                </div>
              </DesktopCard>
            ) : g ? (
              <div className="mx-auto max-w-[940px] space-y-[18px] pb-[32px]">
                {/* Main grammar card */}
                <DesktopCard
                  pad={36}
                  className="relative overflow-hidden border border-stone-100"
                  style={{ background: '#fff', boxShadow: '0 18px 45px rgba(31,27,23,0.06)' }}
                >
                  <button
                    type="button"
                    className="absolute left-[24px] top-[24px] cursor-pointer rounded-full p-2 transition-colors hover:bg-stone-100"
                    style={{ color: '#1f1b17' }}
                    onClick={() => navigate('/courses')}
                    aria-label="Back to courses"
                  >
                    <ChevronLeft size={18} />
                  </button>

                  {/* Share button */}
                  <button
                    className="absolute right-[24px] top-[24px] cursor-pointer rounded-full p-2 transition-colors hover:bg-stone-100"
                    style={{ color: '#999' }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#1f1b17')}
                    onMouseLeave={e => (e.currentTarget.style.color = '#999')}
                  >
                    <Share2 size={16} />
                  </button>

                  {/* Unit badge */}
                  <div className="mb-4">
                    <span
                      className="inline-block rounded-[6px] px-[10px] py-[4px] text-[11px] font-bold"
                      style={{ background: '#c41230', color: '#fff' }}
                    >
                      {unitNames[activeSelectedUnit] || `Unit ${activeSelectedUnit}`} · UNIT{' '}
                      {activeSelectedUnit}
                    </span>
                  </div>

                  {/* Grammar title */}
                  <div
                    className="max-w-[760px] font-k-serif text-[48px] font-medium leading-[1.12]"
                    style={{ color: '#1f1b17' }}
                  >
                    {grammarTitle}
                  </div>

                  {/* Summary */}
                  <div
                    className="mt-3 max-w-[680px] text-[15px] font-semibold leading-7"
                    style={{ color: '#625a52' }}
                  >
                    {display.summary}
                  </div>

                  {/* Multi-language summaries */}
                  {display.altSummaries.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {display.altSummaries.map(summaryLine => (
                        <RedEyeBlock key={summaryLine.label} enabled={redEyeMode}>
                          <div className="text-[12px]" style={{ color: '#bbb' }}>
                            {summaryLine.label}: {summaryLine.text}
                          </div>
                        </RedEyeBlock>
                      ))}
                    </div>
                  )}

                  {/* Controls */}
                  <div className="mt-5 flex items-center gap-3 border-b border-stone-100 pb-[26px]">
                    <button
                      className="cursor-pointer rounded-[8px] border px-[12px] py-[6px] text-[11px] font-bold transition-all"
                      style={{
                        background: redEyeMode ? '#c41230' : '#faf8f5',
                        borderColor: redEyeMode ? '#c41230' : '#e8e5e0',
                        color: redEyeMode ? '#fff' : '#999',
                      }}
                      onClick={() => setRedEyeMode(!redEyeMode)}
                    >
                      {redEyeMode ? (
                        <EyeOff size={14} className="mr-1 inline" />
                      ) : (
                        <Eye size={14} className="mr-1 inline" />
                      )}
                      {redEyeMode ? '关闭红眼' : '红眼模式'}
                    </button>
                  </div>

                  {/* Conjugation Rules */}
                  {display.conjugationRules && (
                    <div className="mt-[28px] rounded-[12px] border border-stone-200 bg-stone-50/80 p-[24px]">
                      <div className="mb-4 text-[11px] font-extrabold" style={{ color: '#999' }}>
                        构造规则 · CONSTRUCTIONS
                      </div>
                      <div className="grid grid-cols-2 gap-[28px]">
                        {renderConjugationRules(display.conjugationRules)}
                      </div>
                    </div>
                  )}

                  {/* Examples */}
                  {display.examples.length > 0 && (
                    <div className="mt-[28px]">
                      <div className="mb-4 text-[11px] font-extrabold" style={{ color: '#999' }}>
                        例句 · EXAMPLES ({display.examples.length})
                      </div>
                      <div className="space-y-[12px]">
                        {display.examples.map((example, i) => (
                          <div
                            key={i}
                            className="rounded-[12px] border border-stone-200 bg-white px-[22px] py-[18px] shadow-[0_1px_0_rgba(31,27,23,0.03)]"
                          >
                            <div className="flex items-start justify-between">
                              <div
                                className="font-k-serif text-[18px] font-medium leading-[1.7]"
                                style={{ color: '#1f1b17' }}
                              >
                                {example.kr}
                              </div>
                              {example.hasAudio && (
                                <button
                                  className="ml-3 cursor-pointer rounded-full p-2 transition-colors hover:bg-slate-100"
                                  style={{ color: '#999' }}
                                >
                                  <Volume2 size={16} />
                                </button>
                              )}
                            </div>
                            {example.cn && (
                              <RedEyeBlock enabled={redEyeMode}>
                                <div
                                  className="mt-2 text-[12px] font-semibold"
                                  style={{ color: '#999' }}
                                >
                                  {example.cn}
                                </div>
                              </RedEyeBlock>
                            )}
                            {example.en && (
                              <RedEyeBlock enabled={redEyeMode}>
                                <div className="mt-1 text-[11px]" style={{ color: '#bbb' }}>
                                  EN: {example.en}
                                </div>
                              </RedEyeBlock>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Sections */}
                  {g.sections && (
                    <div className="mt-[28px] space-y-[18px]">
                      {display.sections.introduction.zh && (
                        <div className="rounded-[12px] border border-stone-200 bg-white px-[24px] py-[20px] shadow-[0_1px_0_rgba(31,27,23,0.03)]">
                          <div className="mb-3 flex items-center gap-2">
                            <Lightbulb size={16} style={{ color: '#c41230' }} />
                            <span
                              className="text-[12px] font-extrabold"
                              style={{ color: '#1f1b17' }}
                            >
                              简介 · INTRODUCTION
                            </span>
                          </div>
                          <MarkdownRenderer
                            content={display.sections.introduction.zh}
                            redEyeEnabled={false}
                          />
                          {display.sections.introduction.en && (
                            <MarkdownRenderer
                              content={`EN: ${display.sections.introduction.en}`}
                              redEyeEnabled={redEyeMode}
                            />
                          )}
                        </div>
                      )}

                      {display.sections.core.zh && (
                        <div className="rounded-[12px] border border-stone-200 bg-white px-[24px] py-[20px] shadow-[0_1px_0_rgba(31,27,23,0.03)]">
                          <div className="mb-3 flex items-center gap-2">
                            <BookOpen size={16} style={{ color: '#c41230' }} />
                            <span
                              className="text-[12px] font-extrabold"
                              style={{ color: '#1f1b17' }}
                            >
                              核心要点 · CORE USAGE
                            </span>
                          </div>
                          <MarkdownRenderer
                            content={display.sections.core.zh}
                            redEyeEnabled={false}
                          />
                          {display.sections.core.en && (
                            <MarkdownRenderer
                              content={`EN: ${display.sections.core.en}`}
                              redEyeEnabled={redEyeMode}
                            />
                          )}
                        </div>
                      )}

                      {display.sections.comparative.zh && (
                        <div className="rounded-[12px] border border-stone-200 bg-white px-[24px] py-[20px] shadow-[0_1px_0_rgba(31,27,23,0.03)]">
                          <div className="mb-3 flex items-center gap-2">
                            <Sparkles size={16} style={{ color: '#c41230' }} />
                            <span
                              className="text-[12px] font-extrabold"
                              style={{ color: '#1f1b17' }}
                            >
                              对比分析 · COMPARATIVE
                            </span>
                          </div>
                          <MarkdownRenderer
                            content={display.sections.comparative.zh}
                            redEyeEnabled={redEyeMode}
                          />
                          {display.sections.comparative.en && (
                            <MarkdownRenderer
                              content={`EN: ${display.sections.comparative.en}`}
                              redEyeEnabled={redEyeMode}
                            />
                          )}
                        </div>
                      )}

                      {display.sections.cultural.zh && (
                        <div className="rounded-[12px] border border-stone-200 bg-white px-[24px] py-[20px] shadow-[0_1px_0_rgba(31,27,23,0.03)]">
                          <div className="mb-3 flex items-center gap-2">
                            <HelpCircle size={16} style={{ color: '#c41230' }} />
                            <span
                              className="text-[12px] font-extrabold"
                              style={{ color: '#1f1b17' }}
                            >
                              文化注释 · CULTURAL NOTES
                            </span>
                          </div>
                          <MarkdownRenderer
                            content={display.sections.cultural.zh}
                            redEyeEnabled={false}
                          />
                          {display.sections.cultural.en && (
                            <MarkdownRenderer
                              content={`EN: ${display.sections.cultural.en}`}
                              redEyeEnabled={redEyeMode}
                            />
                          )}
                        </div>
                      )}

                      {display.sections.commonMistakes.zh && (
                        <div className="rounded-[12px] border border-stone-200 bg-white px-[24px] py-[20px] shadow-[0_1px_0_rgba(31,27,23,0.03)]">
                          <div className="mb-3 flex items-center gap-2">
                            <AlertTriangle size={16} style={{ color: '#c41230' }} />
                            <span
                              className="text-[12px] font-extrabold"
                              style={{ color: '#1f1b17' }}
                            >
                              常见错误 · COMMON MISTAKES
                            </span>
                          </div>
                          <MarkdownRenderer
                            content={display.sections.commonMistakes.zh}
                            redEyeEnabled={redEyeMode}
                          />
                          {display.sections.commonMistakes.en && (
                            <MarkdownRenderer
                              content={`EN: ${display.sections.commonMistakes.en}`}
                              redEyeEnabled={redEyeMode}
                            />
                          )}
                        </div>
                      )}

                      {display.sections.review.zh && (
                        <div className="rounded-[12px] border border-stone-200 bg-white px-[24px] py-[20px] shadow-[0_1px_0_rgba(31,27,23,0.03)]">
                          <div className="mb-3 flex items-center gap-2">
                            <CheckCircle2 size={16} style={{ color: '#c41230' }} />
                            <span
                              className="text-[12px] font-extrabold"
                              style={{ color: '#1f1b17' }}
                            >
                              复习要点 · REVIEW
                            </span>
                          </div>
                          <MarkdownRenderer
                            content={display.sections.review.zh}
                            redEyeEnabled={false}
                          />
                          {display.sections.review.en && (
                            <MarkdownRenderer
                              content={`EN: ${display.sections.review.en}`}
                              redEyeEnabled={redEyeMode}
                            />
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Explanation */}
                  {display.explanation && (
                    <div className="mt-[32px]">
                      <div className="mb-2 text-[11px] font-extrabold" style={{ color: '#999' }}>
                        详细解释 · EXPLANATION
                      </div>
                      <div className="rounded-[12px] border border-stone-200 bg-stone-50/80 px-[24px] py-[18px]">
                        <MarkdownRenderer
                          content={display.explanation}
                          redEyeEnabled={redEyeMode}
                        />
                      </div>
                      {display.explanationEn && (
                        <RedEyeBlock enabled={redEyeMode}>
                          <div className="mt-2 rounded-[12px] border border-stone-200 bg-stone-50/80 px-[24px] py-[18px]">
                            <div className="mb-1 text-[11px] font-bold" style={{ color: '#999' }}>
                              ENGLISH
                            </div>
                            <MarkdownRenderer
                              content={display.explanationEn}
                              redEyeEnabled={false}
                            />
                          </div>
                        </RedEyeBlock>
                      )}
                    </div>
                  )}

                  {/* Custom Note */}
                  {display.customNote && (
                    <div className="mt-[24px]">
                      <div className="mb-2 text-[11px] font-extrabold" style={{ color: '#999' }}>
                        补充说明 · CUSTOM NOTE
                      </div>
                      <div className="rounded-[12px] border border-dashed border-stone-300 px-[24px] py-[18px]">
                        <MarkdownRenderer content={display.customNote} redEyeEnabled={false} />
                      </div>
                    </div>
                  )}

                  {/* Quiz Items */}
                  {display.quizItems.length > 0 && (
                    <div className="mt-[32px]">
                      <div className="mb-4 text-[11px] font-extrabold" style={{ color: '#999' }}>
                        练习题 · QUIZ ({display.quizItems.length} 题)
                      </div>
                      <div className="space-y-[12px]">
                        {display.quizItems.map((quizItem, i) => (
                          <div
                            key={i}
                            className="rounded-[12px] border border-stone-200 bg-white px-[24px] py-[18px] shadow-[0_1px_0_rgba(31,27,23,0.03)]"
                          >
                            <div
                              className="mb-2 text-[12px] font-bold"
                              style={{ color: '#1f1b17' }}
                            >
                              题目 {i + 1}
                            </div>
                            <div
                              className="text-[13px] leading-[1.8]"
                              style={{ color: '#444', whiteSpace: 'pre-wrap' }}
                            >
                              {quizItem.prompt}
                            </div>
                            {quizItem.answer && (
                              <RedEyeBlock enabled={redEyeMode}>
                                <div className="mt-3 rounded-[8px] bg-stone-50 px-[16px] py-[12px]">
                                  <div className="text-[11px] font-bold" style={{ color: '#999' }}>
                                    答案
                                  </div>
                                  <div
                                    className="mt-1 text-[13px]"
                                    style={{ color: '#c41230', whiteSpace: 'pre-wrap' }}
                                  >
                                    {quizItem.answer}
                                  </div>
                                </div>
                              </RedEyeBlock>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </DesktopCard>
                <DesktopAiPracticeDialog
                  grammar={g}
                  grammarTitle={grammarTitle}
                  grammarSummary={display.summary}
                  grammarExplanation={display.explanation}
                  language={language}
                  isOpen={isAiPanelOpen}
                  setIsOpen={setIsAiPanelOpen}
                />
              </div>
            ) : (
              <DesktopCard
                pad={60}
                style={{
                  background: '#fff',
                  textAlign: 'center',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                }}
              >
                <div style={{ color: '#999' }}>请从左侧目录选择一个语法点</div>
              </DesktopCard>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
