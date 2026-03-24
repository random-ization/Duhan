import React, { useEffect, useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Bot, SendHorizonal, Sparkles, UserRound } from 'lucide-react';
import { useAction } from 'convex/react';
import { useTranslation } from 'react-i18next';

import { GrammarPointData } from '../../types';
import { aRef } from '../../utils/convexRefs';
import {
  sanitizeGrammarDisplayText,
  sanitizeGrammarMarkdown,
} from '../../utils/grammarDisplaySanitizer';
import { getLocalizedContent } from '../../utils/languageUtils';
import { Button, Card, CardContent, CardHeader, Input } from '../ui';

type ChatRole = 'assistant' | 'user';
type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  pending?: boolean;
};

interface GrammarAuxiliaryPaneProps {
  grammar: GrammarPointData | null;
  embedded?: boolean;
}

const MAX_CONTEXT_MESSAGES = 8;
const ASSISTANT_PREVIEW_MAX_LENGTH = 220;

function getCompactPreview(content: string) {
  const normalized = sanitizeGrammarDisplayText(content).replace(/\s+/g, ' ').trim();
  if (normalized.length <= ASSISTANT_PREVIEW_MAX_LENGTH) return normalized;
  return `${normalized.slice(0, ASSISTANT_PREVIEW_MAX_LENGTH).trimEnd()}...`;
}

const TutorMarkdownMessage: React.FC<{ content: string }> = ({ content }) => {
  const normalized = sanitizeGrammarMarkdown(content);
  if (!normalized.trim()) return null;

  return (
    <div className="grammar-tutor-markdown text-[0.95rem] leading-7 text-slate-700 dark:text-slate-100">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="mb-3 mt-1 text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="mb-3 mt-5 border-b border-slate-200 pb-2 text-lg font-bold tracking-tight text-slate-900 dark:border-slate-700 dark:text-white">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="mb-2 mt-4 text-sm font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
              {children}
            </h3>
          ),
          p: ({ children }) => <p className="my-3 whitespace-pre-wrap">{children}</p>,
          ul: ({ children }) => <ul className="my-3 list-disc space-y-2 pl-5 marker:text-blue-500">{children}</ul>,
          ol: ({ children }) => (
            <ol className="my-3 list-decimal space-y-2 pl-5 marker:font-semibold marker:text-blue-600">
              {children}
            </ol>
          ),
          li: ({ children }) => <li className="pl-1">{children}</li>,
          blockquote: ({ children }) => (
            <blockquote className="my-4 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-slate-700 dark:border-blue-400/30 dark:bg-blue-500/10 dark:text-slate-200">
              {children}
            </blockquote>
          ),
          code: ({ inline, className, children, ...props }: any) => (
            <code
              className={
                inline
                  ? 'rounded-md bg-slate-200/80 px-1.5 py-0.5 font-semibold text-blue-700 dark:bg-slate-700 dark:text-blue-200'
                  : className
              }
              {...props}
            >
              {children}
            </code>
          ),
          pre: ({ children }) => (
            <pre className="my-4 overflow-x-auto rounded-2xl border border-slate-200 bg-slate-950 p-4 text-sm leading-6 text-slate-100 dark:border-slate-700">
              {children}
            </pre>
          ),
          table: ({ children }) => (
            <div className="my-4 overflow-x-auto rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
              <table className="w-full border-separate border-spacing-0 text-left text-sm">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
              {children}
            </thead>
          ),
          th: ({ children }) => (
            <th className="border-b border-r border-slate-200 px-3 py-2 font-semibold last:border-r-0 dark:border-slate-700">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border-b border-r border-slate-200 px-3 py-2 align-top last:border-r-0 dark:border-slate-700">
              {children}
            </td>
          ),
          hr: () => <hr className="my-5 border-slate-200 dark:border-slate-700" />,
        }}
      >
        {normalized}
      </ReactMarkdown>
    </div>
  );
};

const GrammarAuxiliaryPane: React.FC<GrammarAuxiliaryPaneProps> = ({
  grammar,
  embedded = false,
}) => {
  const { t, i18n } = useTranslation();
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const listRef = useRef<HTMLDivElement | null>(null);

  const askGrammarTutor = useAction(
    aRef<
      {
        grammarTitle: string;
        grammarSummary?: string;
        grammarExplanation?: string;
        language?: string;
        messages: { role: 'assistant' | 'user'; content: string }[];
      },
      { success?: boolean; reply?: string; error?: string } | null
    >('ai:grammarTutorChat')
  );

  const localizedTitle = useMemo(() => {
    if (!grammar) return '';
    return sanitizeGrammarDisplayText(
      getLocalizedContent(grammar as never, 'title', i18n.language as never) || grammar.title
    );
  }, [grammar, i18n.language]);

  const localizedSummary = useMemo(() => {
    if (!grammar) return '';
    return sanitizeGrammarDisplayText(
      getLocalizedContent(grammar as never, 'summary', i18n.language as never) || grammar.summary
    );
  }, [grammar, i18n.language]);

  const localizedExplanation = useMemo(() => {
    if (!grammar) return '';
    return sanitizeGrammarMarkdown(
      getLocalizedContent(grammar as never, 'explanation', i18n.language as never) ||
        grammar.explanation
    );
  }, [grammar, i18n.language]);

  useEffect(() => {
    if (!grammar) {
      setMessages([]);
      return;
    }

    setMessages([
      {
        id: `assistant-init-${grammar.id}`,
        role: 'assistant',
        content: t('grammarModule.aiTutorGreeting', {
          defaultValue:
            'Hi, I am your AI grammar tutor. Ask me about usage, similar grammar, or sentence practice.',
        }),
      },
    ]);
    setInput('');
    setIsSending(false);
  }, [grammar, t]);

  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages]);

  const sendMessage = async () => {
    const userText = input.trim();
    if (!grammar || !userText || isSending) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: userText,
    };
    const pendingMessageId = `assistant-pending-${Date.now()}`;
    const pendingMessage: ChatMessage = {
      id: pendingMessageId,
      role: 'assistant',
      content: t('grammarModule.aiTutorThinking', { defaultValue: 'Thinking...' }),
      pending: true,
    };

    const conversationHistory = [
      ...messages.filter(m => !m.pending).map(m => ({ role: m.role, content: m.content })),
      { role: 'user' as const, content: userText },
    ].slice(-MAX_CONTEXT_MESSAGES);

    setMessages(prev => [...prev, userMessage, pendingMessage]);
    setInput('');
    setIsSending(true);

    try {
      const response = await askGrammarTutor({
        grammarTitle: localizedTitle,
        grammarSummary: localizedSummary,
        grammarExplanation: localizedExplanation,
        language: i18n.language,
        messages: conversationHistory,
      });

      const reply =
        response?.success && response.reply
          ? response.reply
          : t('grammarModule.aiTutorError', {
              defaultValue: 'Sorry, I cannot answer right now. Please try again later.',
            });

      setMessages(prev =>
        prev.map(message =>
          message.id === pendingMessageId ? { ...message, content: reply, pending: false } : message
        )
      );
    } catch {
      setMessages(prev =>
        prev.map(message =>
          message.id === pendingMessageId
            ? {
                ...message,
                content: t('grammarModule.aiTutorError', {
                  defaultValue: 'Sorry, I cannot answer right now. Please try again later.',
                }),
                pending: false,
              }
            : message
        )
      );
    } finally {
      setIsSending(false);
    }
  };

  if (!grammar) {
    return (
      <aside className={embedded ? 'w-full min-w-0 flex flex-col' : 'w-[320px] min-h-0 shrink-0 h-full border-l border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950'}>
        <Card className="h-full min-h-0 border-0 rounded-none shadow-none">
          <CardContent className="h-full flex flex-col items-center justify-center text-center text-slate-500 dark:text-slate-400">
            <Sparkles className="h-10 w-10 mb-3" />
            <p className="text-sm font-medium">
              {t('grammarModule.selectGrammarHint', {
                defaultValue: 'Select a grammar point to begin studying',
              })}
            </p>
          </CardContent>
        </Card>
      </aside>
    );
  }

  return (
    <aside
      className={
        embedded
          ? 'w-full h-full min-w-0 flex flex-col'
          : 'w-[320px] min-h-0 shrink-0 h-full border-l border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950'
      }
    >
      <Card
        className={`h-full min-h-0 border-0 shadow-none flex flex-col ${
          embedded ? 'rounded-none bg-transparent' : 'rounded-none'
        }`}
      >
        {!embedded && (
          <CardHeader
            className="shrink-0 pb-4 border-b border-slate-200 dark:border-slate-800 dark:bg-slate-950"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="h-8 w-8 rounded-full bg-blue-100 text-blue-700 inline-flex items-center justify-center dark:bg-blue-500/15 dark:text-blue-200">
                  <Bot className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {t('grammarModule.aiTutorTitle', { defaultValue: 'AI Grammar Tutor' })}
                  </p>
                  <p className="text-xs text-emerald-600 flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
                    {t('grammarModule.aiTutorOnline', { defaultValue: 'Online' })}
                  </p>
                </div>
              </div>
            </div>
          </CardHeader>
        )}

        <CardContent className={`flex-1 min-h-0 p-0 flex flex-col ${embedded ? 'bg-transparent' : ''}`}>
          <div
            ref={listRef}
            className={`flex-1 min-h-0 overflow-y-auto space-y-3 ${
              embedded ? 'px-6 py-5' : 'px-4 py-4'
            }`}
          >
            {messages.map(message => {
              const isUser = message.role === 'user';
              return (
                <div
                  key={message.id}
                  className={`flex items-start gap-2 ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  {!isUser ? (
                    <span className="h-7 w-7 rounded-full bg-blue-100 text-blue-700 inline-flex items-center justify-center shrink-0 dark:bg-blue-500/15 dark:text-blue-200">
                      <Bot className="h-4 w-4" />
                    </span>
                  ) : null}

                  <div
                    className={`rounded-2xl border ${
                      isUser
                        ? 'max-w-[78%] px-3 py-2 text-sm leading-relaxed bg-blue-600 text-white border-blue-600 dark:bg-blue-500 dark:border-blue-400'
                        : embedded
                          ? 'max-w-[92%] px-5 py-4 bg-white text-slate-700 border-slate-200 shadow-[0_10px_30px_rgba(15,23,42,0.06)] dark:bg-slate-900 dark:text-slate-100 dark:border-slate-700'
                          : 'max-w-[88%] px-4 py-3 bg-white text-slate-700 border-slate-200 shadow-sm dark:bg-slate-900 dark:text-slate-100 dark:border-slate-700'
                    }`}
                  >
                    {isUser ? (
                      <div className="whitespace-pre-wrap">{message.content}</div>
                    ) : message.pending ? (
                      <div className="text-sm text-slate-500 dark:text-slate-400">{message.content}</div>
                    ) : embedded ? (
                      <TutorMarkdownMessage content={message.content} />
                    ) : (
                      <div className="space-y-3">
                        <div className="text-[0.95rem] leading-7 text-slate-700 dark:text-slate-200 whitespace-pre-wrap">
                          {getCompactPreview(message.content)}
                        </div>
                        <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                          {t('grammarModule.aiTutorPopupHint', {
                            defaultValue: 'Open the AI panel to read the full answer.',
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {isUser ? (
                    <span className="h-7 w-7 rounded-full bg-slate-200 text-slate-600 inline-flex items-center justify-center shrink-0 dark:bg-slate-800 dark:text-slate-300">
                      <UserRound className="h-4 w-4" />
                    </span>
                  ) : null}
                </div>
              );
            })}
          </div>

          <div
            className={`sticky bottom-0 shrink-0 border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 ${
              embedded ? 'p-5' : 'p-3'
            }`}
          >
            {!embedded ? (
              <div className="mb-2 px-1 text-[11px] font-medium text-slate-400 dark:text-slate-500">
                {t('grammarModule.aiTutorCompactHint', {
                  defaultValue: 'Short preview here, full explanation opens in the reading panel.',
                })}
              </div>
            ) : null}
            <div className="flex items-center gap-2">
              <Input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    void sendMessage();
                  }
                }}
                placeholder={t('grammarModule.aiTutorPlaceholder', {
                  defaultValue: 'Ask a question and press Enter...',
                })}
                className="border-slate-200 bg-white shadow-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
              />
              <Button
                onClick={() => void sendMessage()}
                disabled={isSending || input.trim().length === 0}
                className="h-11 px-3 bg-blue-600 hover:bg-blue-700 text-white border-0 shadow-none dark:bg-blue-500 dark:hover:bg-blue-400"
              >
                <SendHorizonal className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </aside>
  );
};

export default GrammarAuxiliaryPane;
