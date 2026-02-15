import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAction, useQuery } from 'convex/react';
import { useParams } from 'react-router-dom';
import { BookOpen, ChevronLeft, Languages, Volume2, VolumeX } from 'lucide-react';
import { AI, DICTIONARY, NEWS } from '../utils/convexRefs';
import { useLocalizedNavigate } from '../hooks/useLocalizedNavigate';
import { cleanDictionaryText } from '../utils/dictionaryMeaning';
import { useAuth } from '../contexts/AuthContext';

type NewsArticle = {
  _id: string;
  sourceKey: string;
  sourceUrl: string;
  title: string;
  summary?: string;
  bodyText: string;
  publishedAt: number;
  difficultyLevel: 'L1' | 'L2' | 'L3';
  difficultyScore: number;
};

type PanelTab = 'ai' | 'notes';
type NoteVisualState = 'default' | 'selected' | 'hovered';

type VocabularyItem = {
  term: string;
  meaning: string;
  level: string;
};

type GrammarItem = {
  pattern: string;
  explanation: string;
  example: string;
};

type DictionaryEntry = {
  targetCode: string;
  word: string;
  pronunciation?: string;
  pos?: string;
  senses: Array<{
    order: number;
    definition: string;
    translation?: { lang: string; word: string; definition: string };
  }>;
};

type DictionarySearchResult = {
  total: number;
  start: number;
  num: number;
  entries: DictionaryEntry[];
};

type ReadingAiResult = {
  summary: string;
  vocabulary: VocabularyItem[];
  grammar: GrammarItem[];
};

type DictionaryFallbackResult = {
  word: string;
  pos: string;
  meaning: string;
  example: string;
  note: string;
};

type NoteColor = 'yellow' | 'green' | 'pink';

type ReaderNote = {
  id: string;
  quote: string;
  comment: string;
  color: NoteColor;
  createdAt: number;
  anchor: NoteAnchor;
};

type NoteAnchor = {
  paragraphIndex: number;
  start: number;
  end: number;
};

type DraftNote = {
  quote: string;
  color: NoteColor;
  comment: string;
  anchor: NoteAnchor;
};

type SelectionToolbarState = {
  visible: boolean;
  x: number;
  y: number;
  text: string;
  anchor: NoteAnchor | null;
};

const STOPWORDS = new Set([
  '그리고',
  '하지만',
  '그러나',
  '또한',
  '이것은',
  '그것은',
  '대한',
  '에서',
  '이다',
  '있다',
  '했다',
  '하는',
  '으로',
  '위해',
  '이번',
  '지난',
  '현재',
  '관련',
  '기자',
  '보도',
  '대한민국',
]);

const TERM_GLOSSARY: Record<string, { meaning: string; level: string }> = {
  기준금리: { meaning: '基准利率', level: 'TOPIK 4' },
  동결: { meaning: '冻结，维持不变', level: 'TOPIK 3' },
  동결하다: { meaning: '冻结，维持不变', level: 'TOPIK 3' },
  가계부채: { meaning: '家庭债务', level: 'TOPIK 4' },
  물가: { meaning: '物价', level: 'TOPIK 3' },
  상승률: { meaning: '上涨率', level: 'TOPIK 4' },
  가능성: { meaning: '可能性', level: 'TOPIK 3' },
  배제: { meaning: '排除', level: 'TOPIK 5' },
  충돌: { meaning: '冲突', level: 'TOPIK 4' },
};

function sourceLabel(sourceKey: string) {
  const map: Record<string, string> = {
    khan: '경향신문',
    donga: '동아일보',
    hankyung: '한국경제',
    mk: '매일경제',
    itdonga: 'IT동아',
    voa_ko: 'VOA 한국어',
    naver_news_search: 'NAVER News',
  };
  return map[sourceKey] || sourceKey;
}

function difficultyLabel(level: 'L1' | 'L2' | 'L3') {
  if (level === 'L1') return 'A2 初阶';
  if (level === 'L2') return 'B1 中阶';
  return 'C1 高阶';
}

function difficultyClass(level: 'L1' | 'L2' | 'L3') {
  if (level === 'L1') return 'bg-emerald-50 text-emerald-700 border-emerald-100';
  if (level === 'L2') return 'bg-blue-50 text-blue-600 border-blue-100';
  return 'bg-indigo-50 text-indigo-700 border-indigo-100';
}

const BODY_NOISE_TOKENS = [
  'addeventlistener(',
  'tlistener(',
  'oncontentready',
  'contentaudio.load',
  "soundobj.attr('data-on'",
  'audioplayer.pause',
  'location.href',
  'membership/login',
  'onclick=',
  'function(',
  'var ',
  'const ',
  '=>',
];

const BODY_TRAILING_MARKERS = [
  '트렌드뉴스 많이 본 댓글 순',
  '많이 본 뉴스',
  '많이 본 기사',
  '무단 전재',
  '재배포 금지',
];

function isNoiseChunk(chunk: string) {
  const lower = chunk.toLowerCase();
  const hasNoiseToken = BODY_NOISE_TOKENS.some(token => lower.includes(token));
  if (hasNoiseToken) return true;

  const hangulCount = (chunk.match(/[가-힣]/g) || []).length;
  const latinCount = (chunk.match(/[A-Za-z]/g) || []).length;
  const symbolCount = (chunk.match(/[{};=_<>]/g) || []).length;

  if (/https?:\/\/\S+/i.test(chunk) && hangulCount < 12) return true;
  if (symbolCount >= 4 && hangulCount < 20) return true;
  if (latinCount > hangulCount * 2 && hangulCount < 10) return true;

  return false;
}

function cleanArticleBodyText(rawText: string) {
  const plain = rawText
    .replace(/\r\n/g, '\n')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!plain) return rawText.trim();

  const chunks = plain
    .split(/(?<=[.!?。！？])\s+|\n+/)
    .map(chunk => chunk.trim())
    .filter(Boolean);
  const filteredChunks = chunks.filter(chunk => !isNoiseChunk(chunk));

  let cleaned = filteredChunks.join(' ').trim();
  if (!cleaned) cleaned = plain;

  for (const marker of BODY_TRAILING_MARKERS) {
    const markerIndex = cleaned.indexOf(marker);
    if (markerIndex > 0) {
      cleaned = cleaned.slice(0, markerIndex).trim();
      break;
    }
  }

  const firstHangulIndex = cleaned.search(/[가-힣]/);
  if (firstHangulIndex > 40) {
    cleaned = cleaned.slice(firstHangulIndex).trim();
  }

  return cleaned || rawText.trim();
}

function toParagraphs(text: string) {
  const normalized = text.replace(/\r\n/g, '\n').trim();
  const byBreak = normalized
    .split(/\n{2,}/)
    .map(item => item.trim())
    .filter(Boolean);
  if (byBreak.length > 1) return byBreak;

  const sentences = normalized.split(/(?<=[.!?。！？])\s+/).filter(Boolean);
  if (sentences.length <= 2) return [normalized];

  const blocks: string[] = [];
  for (let i = 0; i < sentences.length; i += 3) {
    blocks.push(sentences.slice(i, i + 3).join(' '));
  }
  return blocks;
}

function summarizeArticle(title: string, summary: string | undefined, bodyText: string) {
  if (summary && summary.trim().length > 40) {
    return `${title}。${summary.trim()}`;
  }
  const sentences = bodyText
    .split(/[.!?。！？]\s*/)
    .filter(Boolean)
    .slice(0, 2);
  if (sentences.length === 0) {
    return `${title}。这篇文章聚焦韩国社会与经济动态。`;
  }
  return `${title}。${sentences.join('。')}。`;
}

function extractVocabulary(bodyText: string): VocabularyItem[] {
  const matches = bodyText.match(/[가-힣]{2,}/g) || [];
  const counts = new Map<string, number>();
  for (const token of matches) {
    if (token.length < 2 || token.length > 12) continue;
    if (STOPWORDS.has(token)) continue;
    counts.set(token, (counts.get(token) || 0) + 1);
  }

  const terms = [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || b[0].length - a[0].length)
    .slice(0, 8)
    .map(([term]) => term);

  return terms.map(term => {
    const gloss = TERM_GLOSSARY[term];
    return {
      term,
      meaning: gloss?.meaning || '上下文核心词汇（可点击查词）',
      level: gloss?.level || 'TOPIK 3-5',
    };
  });
}

function extractGrammar(text: string): GrammarItem[] {
  const items: GrammarItem[] = [];

  if (/데다/.test(text)) {
    items.push({
      pattern: '-은/는 데다(가)',
      explanation: '表示在前述基础上，又叠加了后面的情况。',
      example: '물가 상승률이 내려오지 않은 데다, 가계부채도 꺾이지 않고 있어...',
    });
  }
  if (/(으)?면서/.test(text)) {
    items.push({
      pattern: '-(으)면서',
      explanation: '表示两个动作/状态同时进行。',
      example: '국제 유가가 들썩이면서 물가 불안이 커지고 있다.',
    });
  }
  if (/수 없다/.test(text)) {
    items.push({
      pattern: '-(으)ㄹ 수 없다',
      explanation: '表示“不可能/无法”。',
      example: '가능성을 완전히 배제할 수는 없다.',
    });
  }

  if (items.length === 0) {
    items.push({
      pattern: '-기로 하다',
      explanation: '表示决定做某事。',
      example: '위원회는 금리를 동결하기로 했다.',
    });
  }

  return items.slice(0, 3);
}

function escapeRegExp(input: string) {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeInlineWhitespace(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

function findContextSentence(text: string, term: string) {
  const normalizedTerm = normalizeInlineWhitespace(term);
  if (!normalizedTerm) return '';
  const sentences = text
    .replace(/\r\n/g, '\n')
    .replace(/\n+/g, ' ')
    .split(/(?<=[.!?。！？])\s+/)
    .map(item => item.trim())
    .filter(Boolean);
  return sentences.find(sentence => sentence.includes(normalizedTerm)) || sentences[0] || '';
}

function getClosestParagraphElement(node: Node | null): HTMLElement | null {
  if (!node) return null;
  const element = node.nodeType === Node.ELEMENT_NODE ? (node as HTMLElement) : node.parentElement;
  return element?.closest('p[data-paragraph-index]') ?? null;
}

function getDictionaryMeaning(entry: DictionaryEntry): string {
  const first = (entry.senses ?? [])
    .slice()
    .sort((a, b) => (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER))[0];
  if (!first) return '';
  return cleanDictionaryText(
    first.translation?.definition || first.translation?.word || first.definition || ''
  );
}

function noteUnderlineClass(_color: NoteColor, state: NoteVisualState) {
  void _color;
  if (state === 'hovered') {
    return 'border-b-2 border-yellow-500 bg-yellow-200/40 text-slate-900 transition-colors';
  }
  if (state === 'selected') {
    return 'border-b-2 border-yellow-400 bg-yellow-100/30 text-slate-900 transition-colors';
  }
  return 'border-b-2 border-yellow-300/70 bg-yellow-50/35 transition-colors';
}

function noteColorDotClass(color: NoteColor) {
  if (color === 'yellow') return 'bg-yellow-300';
  if (color === 'green') return 'bg-green-300';
  return 'bg-pink-300';
}

function createNoteId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function ReadingArticlePage() {
  const { articleId = '' } = useParams<{ articleId: string }>();
  const navigate = useLocalizedNavigate();
  const { language } = useAuth();
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [panelTab, setPanelTab] = useState<PanelTab>('ai');
  const [fontSize, setFontSize] = useState(18);
  const [selectionToolbar, setSelectionToolbar] = useState<SelectionToolbarState>({
    visible: false,
    x: 0,
    y: 0,
    text: '',
    anchor: null,
  });
  const [noteColor, setNoteColor] = useState<NoteColor>('yellow');
  const [notes, setNotes] = useState<ReaderNote[]>([]);
  const [draftNote, setDraftNote] = useState<DraftNote | null>(null);
  const [hoveredNoteId, setHoveredNoteId] = useState<string | null>(null);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [activeWord, setActiveWord] = useState<string>('');
  const [dictionaryQuery, setDictionaryQuery] = useState('');
  const [dictionaryResult, setDictionaryResult] = useState<DictionarySearchResult | null>(null);
  const [dictionaryLoading, setDictionaryLoading] = useState(false);
  const [dictionaryError, setDictionaryError] = useState<string | null>(null);
  const [dictionaryFallback, setDictionaryFallback] = useState<DictionaryFallbackResult | null>(
    null
  );
  const [dictionaryFallbackLoading, setDictionaryFallbackLoading] = useState(false);
  const [dictionaryFallbackError, setDictionaryFallbackError] = useState<string | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<ReadingAiResult | null>(null);
  const [aiAnalysisLoading, setAiAnalysisLoading] = useState(false);
  const [aiAnalysisError, setAiAnalysisError] = useState<string | null>(null);
  const [speaking, setSpeaking] = useState(false);

  const analyzeReadingArticle = useAction(AI.analyzeReadingArticle);
  const explainWordFallback = useAction(AI.explainWordFallback);
  const searchDictionary = useAction(DICTIONARY.searchDictionary);

  const translationLang = useMemo(() => {
    if (language === 'en' || language === 'zh' || language === 'vi' || language === 'mn') {
      return language;
    }
    return undefined;
  }, [language]);

  const article = useQuery(NEWS.getById, articleId ? { articleId } : 'skip') as
    | NewsArticle
    | null
    | undefined;

  const cleanedBodyText = useMemo(
    () => (article ? cleanArticleBodyText(article.bodyText) : ''),
    [article]
  );
  const fallbackVocabulary = useMemo(
    () => (cleanedBodyText ? extractVocabulary(cleanedBodyText) : []),
    [cleanedBodyText]
  );
  const fallbackGrammar = useMemo(
    () => (cleanedBodyText ? extractGrammar(cleanedBodyText) : []),
    [cleanedBodyText]
  );
  const fallbackSummary = useMemo(
    () => (article ? summarizeArticle(article.title, article.summary, cleanedBodyText) : ''),
    [article, cleanedBodyText]
  );
  const vocabulary = useMemo(
    () => (aiAnalysis?.vocabulary?.length ? aiAnalysis.vocabulary : fallbackVocabulary),
    [aiAnalysis, fallbackVocabulary]
  );
  const grammar = useMemo(
    () => (aiAnalysis?.grammar?.length ? aiAnalysis.grammar : fallbackGrammar),
    [aiAnalysis, fallbackGrammar]
  );
  const summary = useMemo(
    () => (aiAnalysis?.summary ? aiAnalysis.summary : fallbackSummary),
    [aiAnalysis, fallbackSummary]
  );
  const paragraphs = useMemo(
    () => (cleanedBodyText ? toParagraphs(cleanedBodyText) : []),
    [cleanedBodyText]
  );
  const articleConvexId = article?._id ?? '';
  const articleTitle = article?.title ?? '';
  const articleSummary = article?.summary;

  useEffect(() => {
    if (!articleConvexId || !articleTitle || !cleanedBodyText) {
      setAiAnalysis(null);
      setAiAnalysisLoading(false);
      setAiAnalysisError(null);
      return;
    }

    let cancelled = false;
    setAiAnalysisLoading(true);
    setAiAnalysisError(null);

    const run = async () => {
      try {
        const result = await analyzeReadingArticle({
          title: articleTitle,
          summary: articleSummary,
          bodyText: cleanedBodyText,
          language: translationLang,
        });
        if (cancelled) return;
        setAiAnalysis(result);
      } catch (error) {
        if (cancelled) return;
        const message = error instanceof Error ? error.message : String(error);
        setAiAnalysis(null);
        setAiAnalysisError(message || 'AI 分析失败');
      } finally {
        if (!cancelled) {
          setAiAnalysisLoading(false);
        }
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [
    analyzeReadingArticle,
    articleConvexId,
    articleTitle,
    articleSummary,
    cleanedBodyText,
    translationLang,
  ]);

  const vocabularyMap = useMemo(() => {
    const map = new Map<string, VocabularyItem>();
    for (const item of vocabulary) map.set(item.term, item);
    return map;
  }, [vocabulary]);

  const highlightRegex = useMemo(() => {
    if (vocabulary.length === 0) return null;
    const pattern = vocabulary
      .map(item => item.term)
      .sort((a, b) => b.length - a.length)
      .map(escapeRegExp)
      .join('|');
    if (!pattern) return null;
    return new RegExp(`(${pattern})`, 'g');
  }, [vocabulary]);

  useEffect(() => {
    const onMouseUp = () => {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) {
        setSelectionToolbar(prev => ({ ...prev, visible: false }));
        return;
      }
      const text = selection.toString().trim();
      if (!text) {
        setSelectionToolbar(prev => ({ ...prev, visible: false }));
        return;
      }

      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      const container = contentRef.current;
      if (!container) return;
      if (!container.contains(range.commonAncestorContainer)) {
        setSelectionToolbar(prev => ({ ...prev, visible: false }));
        return;
      }

      const noteElement = (
        range.commonAncestorContainer.nodeType === Node.ELEMENT_NODE
          ? (range.commonAncestorContainer as Element)
          : range.commonAncestorContainer.parentElement
      )?.closest('[data-note-id]');
      if (noteElement instanceof HTMLElement && noteElement.dataset.noteId) {
        setSelectedNoteId(noteElement.dataset.noteId);
      }

      let anchor: NoteAnchor | null = null;
      const startParagraph = getClosestParagraphElement(range.startContainer);
      const endParagraph = getClosestParagraphElement(range.endContainer);
      if (startParagraph && endParagraph && startParagraph === endParagraph) {
        const paragraphIndex = Number(startParagraph.dataset.paragraphIndex ?? -1);
        if (Number.isInteger(paragraphIndex) && paragraphIndex >= 0) {
          const visibleParagraphText = normalizeInlineWhitespace(startParagraph.innerText || '');
          const selectedVisibleText = normalizeInlineWhitespace(text);
          const start = visibleParagraphText.indexOf(selectedVisibleText);
          if (start >= 0) {
            const end = start + selectedVisibleText.length;
            anchor = { paragraphIndex, start, end };
          }
        }
      }

      setSelectionToolbar({
        visible: true,
        x: rect.left + rect.width / 2,
        y: Math.max(72, rect.top - 14),
        text,
        anchor,
      });
    };

    document.addEventListener('mouseup', onMouseUp);
    return () => document.removeEventListener('mouseup', onMouseUp);
  }, []);

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined') {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const toggleSpeak = () => {
    if (!article || typeof window === 'undefined') return;
    const synth = window.speechSynthesis;
    if (!synth) return;

    if (speaking) {
      synth.cancel();
      setSpeaking(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(cleanedBodyText || article.bodyText);
    utterance.lang = 'ko-KR';
    utterance.rate = 0.95;
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    synth.cancel();
    synth.speak(utterance);
    setSpeaking(true);
  };

  const onWordClick = (word: string) => {
    setActiveWord(word);
    setPanelTab('notes');
  };

  const runAIDictionaryFallback = useCallback(
    async (query: string) => {
      setDictionaryFallbackLoading(true);
      setDictionaryFallbackError(null);
      try {
        const result = await explainWordFallback({
          word: query,
          context: findContextSentence(cleanedBodyText, query),
          language: translationLang,
        });
        setDictionaryFallback(result);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        setDictionaryFallback(null);
        setDictionaryFallbackError(message || 'AI 释义失败');
      } finally {
        setDictionaryFallbackLoading(false);
      }
    },
    [cleanedBodyText, explainWordFallback, translationLang]
  );

  const runDictionaryLookup = useCallback(
    async (rawWord: string) => {
      const query = normalizeInlineWhitespace(rawWord);
      if (!query) {
        setDictionaryResult(null);
        setDictionaryError(null);
        setDictionaryLoading(false);
        setDictionaryFallback(null);
        setDictionaryFallbackError(null);
        setDictionaryFallbackLoading(false);
        return;
      }

      setDictionaryQuery(query);
      setDictionaryLoading(true);
      setDictionaryError(null);
      setDictionaryResult(null);
      setDictionaryFallback(null);
      setDictionaryFallbackError(null);

      try {
        const result = await searchDictionary({
          query,
          translationLang,
          num: 5,
          part: 'word',
          sort: 'popular',
        });
        setDictionaryResult(result);
        if ((result.entries ?? []).length === 0) {
          await runAIDictionaryFallback(query);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        setDictionaryResult(null);
        setDictionaryError(message || '词典查询失败');
        await runAIDictionaryFallback(query);
      } finally {
        setDictionaryLoading(false);
      }
    },
    [runAIDictionaryFallback, searchDictionary, translationLang]
  );

  useEffect(() => {
    if (!activeWord) return;
    void runDictionaryLookup(activeWord);
  }, [activeWord, runDictionaryLookup]);

  const startNoteFromSelection = () => {
    const quote = normalizeInlineWhitespace(selectionToolbar.text);
    const anchor = selectionToolbar.anchor;
    if (!quote || !anchor) return;
    setDraftNote({ quote, color: noteColor, comment: '', anchor });
    setSelectionToolbar(prev => ({ ...prev, visible: false }));
    setPanelTab('notes');
  };

  const onLookupSelection = () => {
    const text = selectionToolbar.text.trim();
    if (!text) return;
    setActiveWord(text);
    setPanelTab('notes');
    setSelectionToolbar(prev => ({ ...prev, visible: false }));
  };

  const onDraftCommentChange = (value: string) => {
    setDraftNote(prev => (prev ? { ...prev, comment: value } : prev));
  };

  const onSaveDraftNote = () => {
    if (!draftNote) return;
    setNotes(prev => [
      {
        id: createNoteId(),
        quote: normalizeInlineWhitespace(draftNote.quote),
        color: draftNote.color,
        comment: draftNote.comment.trim(),
        createdAt: Date.now(),
        anchor: draftNote.anchor,
      },
      ...prev,
    ]);
    setDraftNote(null);
  };

  const onDiscardDraftNote = () => {
    if (selectedNoteId === 'draft') {
      setSelectedNoteId(null);
    }
    setDraftNote(null);
  };

  const getNoteVisualState = (noteId: string): NoteVisualState => {
    if (hoveredNoteId === noteId) return 'hovered';
    if (selectedNoteId === noteId) return 'selected';
    return 'default';
  };

  const focusNote = (noteId: string) => {
    setSelectedNoteId(noteId);
    requestAnimationFrame(() => {
      const container = contentRef.current;
      if (!container) return;
      const el = container.querySelector(`[data-note-id="${noteId}"]`);
      if (!(el instanceof HTMLElement)) return;
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  };

  if (!articleId) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center text-sm font-semibold text-slate-500">
        缺少文章 ID
      </div>
    );
  }

  if (article === undefined) {
    return (
      <div className="grid gap-4 md:grid-cols-[minmax(0,_1fr)_360px]">
        <div className="h-[76vh] animate-pulse rounded-3xl bg-slate-100" />
        <div className="h-[76vh] animate-pulse rounded-3xl bg-slate-100" />
      </div>
    );
  }

  if (article === null) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center">
        <p className="text-base font-bold text-slate-800">文章不存在或暂不可访问</p>
        <button
          type="button"
          onClick={() => navigate('/reading')}
          className="mt-4 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50"
        >
          返回阅读发现页
        </button>
      </div>
    );
  }

  const wordCount = Math.max(1, Math.round(cleanedBodyText.length / 2));
  const dictionaryEntries = dictionaryResult?.entries ?? [];

  const renderTextWithVocab = (
    text: string,
    paragraphIndex: number,
    segmentIndex: number,
    forceUnderlineColor?: NoteColor,
    targetNoteId?: string
  ) => {
    if (!text) return null;
    if (forceUnderlineColor) {
      const resolvedNoteId = targetNoteId || 'draft';
      const noteState = getNoteVisualState(resolvedNoteId);
      return (
        <span
          data-note-id={resolvedNoteId}
          onClick={() => focusNote(resolvedNoteId)}
          onMouseEnter={() => setHoveredNoteId(resolvedNoteId)}
          onMouseLeave={() => setHoveredNoteId(prev => (prev === resolvedNoteId ? null : prev))}
          className={`${noteUnderlineClass(forceUnderlineColor, noteState)} cursor-pointer rounded-[2px]`}
          key={`u-${paragraphIndex}-${segmentIndex}`}
        >
          {text}
        </span>
      );
    }
    if (!highlightRegex)
      return <React.Fragment key={`t-${paragraphIndex}-${segmentIndex}`}>{text}</React.Fragment>;

    const tokens = text.split(highlightRegex);
    return (
      <React.Fragment key={`h-${paragraphIndex}-${segmentIndex}`}>
        {tokens.map((token, tokenIndex) => {
          const vocabItem = vocabularyMap.get(token);
          if (!vocabItem)
            return (
              <React.Fragment key={`${paragraphIndex}-${segmentIndex}-${tokenIndex}`}>
                {token}
              </React.Fragment>
            );

          const yellow = tokenIndex % 2 === 0;
          return (
            <button
              key={`${paragraphIndex}-${segmentIndex}-${tokenIndex}-${token}`}
              type="button"
              onClick={() => onWordClick(token)}
              className={`group relative mx-[1px] rounded-sm px-[3px] text-left ${
                yellow ? 'bg-yellow-200' : 'bg-green-200'
              }`}
            >
              {token}
              <span className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded bg-slate-800 px-2 py-1 text-xs font-semibold text-white group-hover:block">
                {vocabItem.meaning} ({vocabItem.level})
              </span>
            </button>
          );
        })}
      </React.Fragment>
    );
  };

  const renderParagraph = (paragraph: string, paragraphIndex: number) => {
    const plainParagraph = normalizeInlineWhitespace(paragraph);
    const noteRefs: ReaderNote[] = [
      ...(draftNote
        ? [
            {
              id: 'draft',
              quote: draftNote.quote,
              comment: draftNote.comment,
              color: draftNote.color,
              createdAt: Date.now(),
              anchor: draftNote.anchor,
            },
          ]
        : []),
      ...notes,
    ];

    const sortedRanges = noteRefs
      .filter(note => note.anchor.paragraphIndex === paragraphIndex)
      .map(note => {
        const directValid =
          note.anchor.start >= 0 &&
          note.anchor.end > note.anchor.start &&
          note.anchor.end <= plainParagraph.length;

        if (directValid) {
          return {
            noteId: note.id,
            color: note.color,
            start: note.anchor.start,
            end: note.anchor.end,
          };
        }

        const fallbackQuote = normalizeInlineWhitespace(note.quote);
        const fallbackStart = plainParagraph.indexOf(fallbackQuote);
        if (fallbackStart < 0) return null;
        return {
          noteId: note.id,
          color: note.color,
          start: fallbackStart,
          end: fallbackStart + fallbackQuote.length,
        };
      })
      .filter((item): item is { noteId: string; color: NoteColor; start: number; end: number } =>
        Boolean(item)
      )
      .sort((a, b) => (a.start === b.start ? b.end - a.end : a.start - b.start));

    if (sortedRanges.length === 0) {
      return (
        <p
          data-paragraph-index={paragraphIndex}
          key={`${paragraphIndex}-${plainParagraph.slice(0, 18)}`}
        >
          {renderTextWithVocab(plainParagraph, paragraphIndex, 0)}
        </p>
      );
    }

    const nodes: React.ReactNode[] = [];
    let lastIndex = 0;
    let segmentIndex = 0;
    for (const range of sortedRanges) {
      if (range.start < lastIndex) {
        continue;
      }
      if (range.start > lastIndex) {
        const before = plainParagraph.slice(lastIndex, range.start);
        nodes.push(renderTextWithVocab(before, paragraphIndex, segmentIndex));
        segmentIndex += 1;
      }
      const highlighted = plainParagraph.slice(range.start, range.end);
      nodes.push(
        renderTextWithVocab(highlighted, paragraphIndex, segmentIndex, range.color, range.noteId)
      );
      segmentIndex += 1;
      lastIndex = range.end;
    }
    if (lastIndex < plainParagraph.length) {
      const tail = plainParagraph.slice(lastIndex);
      nodes.push(renderTextWithVocab(tail, paragraphIndex, segmentIndex));
    }

    return (
      <p
        data-paragraph-index={paragraphIndex}
        key={`${paragraphIndex}-${plainParagraph.slice(0, 18)}`}
      >
        {nodes}
      </p>
    );
  };

  return (
    <div className="relative grid min-h-[82vh] gap-0 overflow-hidden rounded-3xl border border-slate-200 bg-slate-50 md:grid-cols-[minmax(0,_1fr)_380px]">
      <main className="relative z-10 flex min-h-[82vh] flex-col border-slate-200 bg-white md:border-r">
        <header className="flex h-16 shrink-0 items-center justify-between border-b bg-white px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-4">
            <button
              type="button"
              onClick={() => navigate('/reading')}
              className="flex items-center gap-1 text-sm font-semibold text-slate-500 transition hover:text-slate-800"
            >
              <ChevronLeft size={16} />
              返回发现页
            </button>
            <span
              className={`rounded-md border px-2.5 py-1 text-xs font-semibold ${difficultyClass(article.difficultyLevel)}`}
            >
              {difficultyLabel(article.difficultyLevel)} ({sourceLabel(article.sourceKey)})
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setFontSize(prev => (prev >= 22 ? 16 : prev + 2))}
              className="rounded-full px-3 py-1.5 text-sm font-semibold text-slate-500 hover:bg-slate-100"
            >
              Aa
            </button>
            <button
              type="button"
              onClick={toggleSpeak}
              className="flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-semibold text-slate-500 hover:bg-slate-100"
            >
              {speaking ? <VolumeX size={15} /> : <Volume2 size={15} />}
              {speaking ? '停止朗读' : '朗读'}
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-8 sm:px-8 lg:px-12" ref={contentRef}>
          <div className="mx-auto w-full max-w-2xl">
            <h1 className="mb-6 text-3xl font-black leading-tight text-slate-900">
              {article.title}
            </h1>
            <div className="mb-8 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm font-medium text-slate-500">
              <span>{new Date(article.publishedAt).toLocaleDateString()}</span>
              <span>{sourceLabel(article.sourceKey)}</span>
              <span>{wordCount.toLocaleString()}字</span>
            </div>

            <div className="space-y-7 text-slate-700" style={{ lineHeight: 2.2, fontSize }}>
              {paragraphs.map((paragraph, paragraphIndex) =>
                renderParagraph(paragraph, paragraphIndex)
              )}
            </div>
          </div>
        </div>

        {selectionToolbar.visible && (
          <div
            className="fixed z-50 flex -translate-x-1/2 items-center rounded-lg border border-slate-700 bg-slate-800 p-1 text-white shadow-lg"
            style={{ left: selectionToolbar.x, top: selectionToolbar.y }}
          >
            <button
              type="button"
              onClick={onLookupSelection}
              className="rounded px-3 py-1.5 text-sm hover:bg-slate-700"
            >
              🔍 查词
            </button>
            <div className="mx-1 h-4 w-px bg-slate-600" />
            <button
              type="button"
              onClick={() => setNoteColor('yellow')}
              className="rounded p-1.5 hover:bg-slate-700"
            >
              <span
                className={`block h-4 w-4 rounded-full bg-yellow-300 ${noteColor === 'yellow' ? 'ring-2 ring-white/80 ring-offset-1 ring-offset-slate-800' : ''}`}
              />
            </button>
            <button
              type="button"
              onClick={() => setNoteColor('green')}
              className="rounded p-1.5 hover:bg-slate-700"
            >
              <span
                className={`block h-4 w-4 rounded-full bg-green-300 ${noteColor === 'green' ? 'ring-2 ring-white/80 ring-offset-1 ring-offset-slate-800' : ''}`}
              />
            </button>
            <button
              type="button"
              onClick={() => setNoteColor('pink')}
              className="rounded p-1.5 hover:bg-slate-700"
            >
              <span
                className={`block h-4 w-4 rounded-full bg-pink-300 ${noteColor === 'pink' ? 'ring-2 ring-white/80 ring-offset-1 ring-offset-slate-800' : ''}`}
              />
            </button>
            <div className="mx-1 h-4 w-px bg-slate-600" />
            <button
              type="button"
              onClick={startNoteFromSelection}
              className={`rounded px-3 py-1.5 text-sm hover:bg-slate-700 ${
                selectionToolbar.anchor ? '' : 'cursor-not-allowed opacity-50'
              }`}
              disabled={!selectionToolbar.anchor}
            >
              📝 笔记
            </button>
          </div>
        )}
      </main>

      <aside className="flex min-h-[82vh] flex-col border-t border-slate-200 bg-slate-50 md:border-t-0">
        <div className="flex border-b border-slate-200 bg-white">
          <button
            type="button"
            onClick={() => setPanelTab('ai')}
            className={`flex-1 py-4 text-sm font-bold ${
              panelTab === 'ai'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            ✨ AI 分析
          </button>
          <button
            type="button"
            onClick={() => setPanelTab('notes')}
            className={`flex-1 py-4 text-sm font-bold ${
              panelTab === 'notes'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            📚 词典/笔记
          </button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto p-5">
          {panelTab === 'ai' ? (
            <>
              <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <h3 className="mb-2 flex items-center gap-2 font-bold text-slate-800">
                  <span>💡</span> AI 全文摘要
                </h3>
                {aiAnalysisLoading && (
                  <p className="mb-2 text-xs font-semibold text-blue-600">正在生成 AI 分析...</p>
                )}
                {aiAnalysisError && (
                  <p className="mb-2 text-xs font-semibold text-amber-600">
                    AI 不可用，已使用本地解析。
                  </p>
                )}
                <p className="text-sm leading-relaxed text-slate-600">{summary}</p>
              </section>

              <section>
                <h3 className="mb-3 px-1 text-sm font-bold text-slate-800">🔑 本文核心词汇</h3>
                <div className="space-y-2">
                  {vocabulary.slice(0, 8).map(item => (
                    <button
                      key={item.term}
                      type="button"
                      onClick={() => onWordClick(item.term)}
                      className="group flex w-full items-center justify-between rounded-lg border border-slate-100 bg-white p-3 text-left shadow-sm transition hover:border-blue-300"
                    >
                      <div>
                        <div className="font-bold text-slate-800">{item.term}</div>
                        <div className="text-xs text-slate-500">{item.meaning}</div>
                      </div>
                      <span className="hidden text-slate-300 group-hover:block">★</span>
                    </button>
                  ))}
                </div>
              </section>

              <section>
                <h3 className="mb-3 px-1 text-sm font-bold text-slate-800">📖 关键语法解析</h3>
                <div className="space-y-3">
                  {grammar.map(item => (
                    <article
                      key={item.pattern}
                      className="rounded-xl border border-blue-100 bg-blue-50/50 p-4"
                    >
                      <div className="mb-1 font-bold text-blue-800">{item.pattern}</div>
                      <div className="mb-2 text-sm text-blue-700">{item.explanation}</div>
                      <div className="rounded border border-blue-50 bg-white p-2 text-xs text-slate-600">
                        {item.example}
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            </>
          ) : (
            <>
              <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <h3 className="mb-2 flex items-center gap-2 font-bold text-slate-800">
                  <BookOpen size={16} /> 当前选中
                </h3>
                <p className="text-sm text-slate-600">
                  {activeWord || '点击正文高亮词，或划词后添加笔记'}
                </p>
              </section>

              <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <h3 className="mb-2 flex items-center gap-2 font-bold text-slate-800">
                  <Languages size={16} /> 词典建议
                </h3>
                {!activeWord && <p className="text-sm text-slate-600">暂无选词。</p>}

                {activeWord && (
                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-slate-500">
                      查询词：{dictionaryQuery || activeWord}
                    </div>

                    {dictionaryLoading && <p className="text-sm text-slate-500">词典查询中...</p>}

                    {!dictionaryLoading && dictionaryError && (
                      <p className="text-sm text-amber-600">词典服务异常，已切换 AI 释义。</p>
                    )}

                    {dictionaryFallbackLoading && (
                      <p className="text-sm text-slate-500">AI 正在生成释义...</p>
                    )}

                    {!dictionaryFallbackLoading &&
                      dictionaryFallbackError &&
                      !dictionaryFallback && (
                        <p className="text-sm text-rose-600">{dictionaryFallbackError}</p>
                      )}

                    {!dictionaryLoading && dictionaryEntries.length > 0 && (
                      <div className="space-y-2">
                        {dictionaryEntries.slice(0, 3).map(entry => (
                          <article
                            key={entry.targetCode}
                            className="rounded-lg border border-slate-200 bg-slate-50 p-3"
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900">{entry.word}</span>
                              <span className="text-xs text-slate-500">
                                {[entry.pos, entry.pronunciation].filter(Boolean).join(' · ')}
                              </span>
                            </div>
                            <p className="mt-1 text-sm text-slate-700">
                              {getDictionaryMeaning(entry) || '暂无释义'}
                            </p>
                          </article>
                        ))}
                      </div>
                    )}

                    {!dictionaryLoading &&
                      dictionaryEntries.length === 0 &&
                      !dictionaryFallbackLoading &&
                      dictionaryFallback && (
                        <article className="rounded-lg border border-blue-100 bg-blue-50/50 p-3">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900">
                              {dictionaryFallback.word}
                            </span>
                            <span className="text-xs text-slate-500">
                              {dictionaryFallback.pos || '词性待判断'}
                            </span>
                            <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-700">
                              AI
                            </span>
                          </div>
                          <p className="mt-1 text-sm text-slate-700">
                            {dictionaryFallback.meaning || '暂无释义'}
                          </p>
                          {dictionaryFallback.example && (
                            <p className="mt-2 text-xs text-slate-500">
                              例句：{dictionaryFallback.example}
                            </p>
                          )}
                          {dictionaryFallback.note && (
                            <p className="mt-1 text-xs text-slate-500">
                              提示：{dictionaryFallback.note}
                            </p>
                          )}
                        </article>
                      )}

                    {!dictionaryLoading &&
                      dictionaryEntries.length === 0 &&
                      !dictionaryFallbackLoading &&
                      !dictionaryFallback &&
                      !dictionaryFallbackError && (
                        <p className="text-sm text-slate-500">未找到可用释义。</p>
                      )}
                  </div>
                )}
              </section>

              <section>
                <h3 className="mb-3 text-sm font-bold text-slate-800">📝 笔记</h3>
                {draftNote && (
                  <article className="mb-3 rounded-xl border border-sky-200 bg-white p-4 shadow-sm">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs font-bold text-sky-600">新建引用笔记</span>
                      <span
                        className={`h-3 w-3 rounded-full ${noteColorDotClass(draftNote.color)}`}
                      />
                    </div>
                    <blockquote
                      className={`rounded bg-slate-50 p-3 text-sm text-slate-700 ${noteUnderlineClass(draftNote.color, getNoteVisualState('draft'))}`}
                    >
                      “{draftNote.quote}”
                    </blockquote>
                    <textarea
                      value={draftNote.comment}
                      onChange={e => onDraftCommentChange(e.target.value)}
                      placeholder="写下你的理解、疑问或翻译..."
                      className="mt-3 h-24 w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    />
                    <div className="mt-3 flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={onDiscardDraftNote}
                        className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
                      >
                        取消
                      </button>
                      <button
                        type="button"
                        onClick={onSaveDraftNote}
                        className="rounded-lg border border-blue-600 bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700"
                      >
                        保存笔记
                      </button>
                    </div>
                  </article>
                )}
                <div className="space-y-2">
                  {notes.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-slate-300 bg-white p-4 text-xs text-slate-500">
                      还没有笔记。划词后点击“📝 笔记”，可创建带颜色下划线的引用并输入备注。
                    </div>
                  ) : (
                    notes.map(note => (
                      <button
                        key={note.id}
                        type="button"
                        onClick={() => focusNote(note.id)}
                        onMouseEnter={() => setHoveredNoteId(note.id)}
                        onMouseLeave={() =>
                          setHoveredNoteId(prev => (prev === note.id ? null : prev))
                        }
                        className={`w-full rounded-lg border bg-white px-3 py-3 text-left text-sm text-slate-700 shadow-sm transition ${
                          getNoteVisualState(note.id) === 'hovered'
                            ? 'border-yellow-400 shadow-yellow-200'
                            : getNoteVisualState(note.id) === 'selected'
                              ? 'border-yellow-300 shadow-yellow-100'
                              : 'border-slate-100 hover:border-slate-200'
                        }`}
                      >
                        <p
                          className={`font-semibold ${noteUnderlineClass(
                            note.color,
                            getNoteVisualState(note.id)
                          )}`}
                        >
                          “{note.quote}”
                        </p>
                        <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">
                          {note.comment || '（无备注）'}
                        </p>
                      </button>
                    ))
                  )}
                </div>
              </section>
            </>
          )}
        </div>
      </aside>
    </div>
  );
}
