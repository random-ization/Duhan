import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAction, useMutation, useQuery } from 'convex/react';
import { useParams } from 'react-router-dom';
import { BookOpen, Check, ChevronLeft, Languages, Star, Volume2, VolumeX } from 'lucide-react';
import { AI, DICTIONARY, NEWS, VOCAB, mRef } from '../utils/convexRefs';
import { useLocalizedNavigate } from '../hooks/useLocalizedNavigate';
import { cleanDictionaryText } from '../utils/dictionaryMeaning';
import { useAuth } from '../contexts/AuthContext';
import { useTTS } from '../hooks/useTTS';
import { useOutsideDismiss } from '../hooks/useOutsideDismiss';
import { useTranslation } from 'react-i18next';
import { Tooltip, TooltipContent, TooltipPortal, TooltipTrigger } from '../components/ui';
import { Button } from '../components/ui';
import { Textarea } from '../components/ui';
import { AppBreadcrumb } from '../components/common/AppBreadcrumb';

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
  paragraphTranslations?: Partial<Record<'zh' | 'en' | 'vi' | 'mn', string[]>>;
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

type ReadingTranslationResult = {
  translations: string[];
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

const TERM_GLOSSARY: Record<
  string,
  { meaning: Record<'zh' | 'en' | 'vi' | 'mn', string>; level: string }
> = {
  기준금리: {
    meaning: { zh: '\u57fa\u51c6\u5229\u7387', en: 'base interest rate', vi: 'lãi suất cơ bản', mn: 'суурь хүү' },
    level: 'TOPIK 4',
  },
  동결: {
    meaning: {
      zh: '\u51bb\u7ed3，\u7ef4\u6301\u4e0d\u53d8',
      en: 'freeze, keep unchanged',
      vi: 'đóng băng, giữ nguyên',
      mn: 'хэвээр барих',
    },
    level: 'TOPIK 3',
  },
  동결하다: {
    meaning: {
      zh: '\u51bb\u7ed3，\u7ef4\u6301\u4e0d\u53d8',
      en: 'freeze, keep unchanged',
      vi: 'đóng băng, giữ nguyên',
      mn: 'хэвээр барих',
    },
    level: 'TOPIK 3',
  },
  가계부채: {
    meaning: { zh: '\u5bb6\u5ead\u503a\u52a1', en: 'household debt', vi: 'nợ hộ gia đình', mn: 'өрхийн өр' },
    level: 'TOPIK 4',
  },
  물가: {
    meaning: { zh: '\u7269\u4ef7', en: 'prices', vi: 'giá cả', mn: 'үнийн түвшин' },
    level: 'TOPIK 3',
  },
  상승률: {
    meaning: { zh: '\u4e0a\u6da8\u7387', en: 'growth rate', vi: 'tỷ lệ tăng', mn: 'өсөлтийн хувь' },
    level: 'TOPIK 4',
  },
  가능성: {
    meaning: { zh: '\u53ef\u80fd\u6027', en: 'possibility', vi: 'khả năng', mn: 'боломж' },
    level: 'TOPIK 3',
  },
  배제: {
    meaning: { zh: '\u6392\u9664', en: 'exclude', vi: 'loại trừ', mn: 'үгүйсгэх' },
    level: 'TOPIK 5',
  },
  충돌: {
    meaning: { zh: '\u51b2\u7a81', en: 'conflict', vi: 'xung đột', mn: 'мөргөлдөөн' },
    level: 'TOPIK 4',
  },
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
    wiki_ko_featured: '위키백과 알찬 글',
  };
  return map[sourceKey] || sourceKey;
}

function difficultyLabel(
  level: 'L1' | 'L2' | 'L3',
  t: (key: string, options?: Record<string, unknown>) => string
) {
  if (level === 'L1') return t('readingArticle.difficulty.l1', { defaultValue: 'A2 Beginner' });
  if (level === 'L2') return t('readingArticle.difficulty.l2', { defaultValue: 'B1 Intermediate' });
  return t('readingArticle.difficulty.l3', { defaultValue: 'C1 Advanced' });
}

function difficultyClass(level: 'L1' | 'L2' | 'L3') {
  if (level === 'L1')
    return 'border-emerald-100 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300';
  if (level === 'L2')
    return 'border-blue-100 bg-blue-50 text-blue-600 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300';
  return 'border-indigo-100 bg-indigo-50 text-indigo-700 dark:border-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-300';
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

function summarizeArticle(
  title: string,
  summary: string | undefined,
  bodyText: string,
  language: 'zh' | 'en' | 'vi' | 'mn'
) {
  if (summary && summary.trim().length > 40) {
    return `${title}. ${summary.trim()}`;
  }
  const sentences = bodyText
    .split(/[.!?。！？]\s*/)
    .filter(Boolean)
    .slice(0, 2);
  if (sentences.length === 0) {
    if (language === 'en')
      return `${title}. This article focuses on social and economic trends in Korea.`;
    if (language === 'vi')
      return `${title}. Bài viết tập trung vào các xu hướng xã hội và kinh tế tại Hàn Quốc.`;
    if (language === 'mn')
      return `${title}. Энэхүү нийтлэл нь Солонгосын нийгэм, эдийн засгийн чиг хандлагад төвлөрнө.`;
    return `${title}。\u672c\u6587\u805a\u7126\u97e9\u56fd\u793e\u4f1a\u4e0e\u7ecf\u6d4e\u52a8\u6001。`;
  }
  return `${title}. ${sentences.join('. ')}.`;
}

function extractVocabulary(
  bodyText: string,
  language: 'zh' | 'en' | 'vi' | 'mn',
  fallbackMeaning: string
): VocabularyItem[] {
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
      meaning: gloss?.meaning?.[language] || fallbackMeaning,
      level: gloss?.level || 'TOPIK 3-5',
    };
  });
}

function extractGrammar(text: string, language: 'zh' | 'en' | 'vi' | 'mn'): GrammarItem[] {
  const items: GrammarItem[] = [];
  const explain = (zh: string, en: string, vi: string, mn: string) => {
    if (language === 'en') return en;
    if (language === 'vi') return vi;
    if (language === 'mn') return mn;
    return zh;
  };

  if (/데다/.test(text)) {
    items.push({
      pattern: '-은/는 데다(가)',
      explanation: explain(
        '\u8868\u793a\u5728\u524d\u8ff0\u57fa\u7840\u4e0a，\u53c8\u53e0\u52a0\u4e86\u540e\u9762\u7684\u60c5\u51b5。',
        'Adds another condition on top of the previous one.',
        'Diễn tả thêm một tình huống chồng lên điều đã nêu trước đó.',
        'Өмнөх нөхцөл дээр нэмэлт нөхцөл давхардаж байгааг илэрхийлнэ.'
      ),
      example: '물가 상승률이 내려오지 않은 데다, 가계부채도 꺾이지 않고 있어...',
    });
  }
  if (/(으)?면서/.test(text)) {
    items.push({
      pattern: '-(으)면서',
      explanation: explain(
        '\u8868\u793a\u4e24\u4e2a\u52a8\u4f5c/\u72b6\u6001\u540c\u65f6\u8fdb\u884c。',
        'Indicates two actions or states happening at the same time.',
        'Diễn tả hai hành động/trạng thái diễn ra đồng thời.',
        'Хоёр үйлдэл/байдал зэрэгцэн явагдаж байгааг илэрхийлнэ.'
      ),
      example: '국제 유가가 들썩이면서 물가 불안이 커지고 있다.',
    });
  }
  if (/수 없다/.test(text)) {
    items.push({
      pattern: '-(으)ㄹ 수 없다',
      explanation: explain(
        '\u8868\u793a“\u4e0d\u53ef\u80fd/\u65e0\u6cd5”。',
        'Expresses impossibility or inability.',
        'Diễn tả sự không thể hoặc không có khả năng.',
        'Боломжгүй эсвэл чадваргүйг илэрхийлнэ.'
      ),
      example: '가능성을 완전히 배제할 수는 없다.',
    });
  }

  if (items.length === 0) {
    items.push({
      pattern: '-기로 하다',
      explanation: explain(
        '\u8868\u793a\u51b3\u5b9a\u505a\u67d0\u4e8b。',
        'Indicates a decision to do something.',
        'Diễn tả quyết định làm việc gì đó.',
        'Ямар нэг зүйл хийхээр шийдсэнийг илэрхийлнэ.'
      ),
      example: '위원회는 금리를 동결하기로 했다.',
    });
  }

  return items.slice(0, 3);
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
    return 'border-b-2 border-yellow-500 bg-yellow-200/40 text-foreground transition-colors dark:border-yellow-500/80 dark:bg-yellow-300/25';
  }
  if (state === 'selected') {
    return 'border-b-2 border-yellow-400 bg-yellow-100/30 text-foreground transition-colors dark:border-yellow-400/80 dark:bg-yellow-300/18';
  }
  return 'border-b-2 border-yellow-300/70 bg-yellow-50/35 transition-colors dark:border-yellow-500/60 dark:bg-yellow-300/12';
}

function noteColorDotClass(color: NoteColor) {
  if (color === 'yellow') return 'bg-yellow-300 dark:bg-yellow-400/85';
  if (color === 'green') return 'bg-green-300 dark:bg-green-400/85';
  return 'bg-pink-300 dark:bg-pink-400/85';
}

function translationLanguageLabel(language?: string) {
  if (language === 'en') return 'English';
  if (language === 'vi') return 'Tiếng Việt';
  if (language === 'mn') return 'Монгол';
  return '\u4e2d\u6587';
}

function normalizePartOfSpeech(pos?: string) {
  if (!pos) return 'UNKNOWN';
  const normalized = pos.trim().toUpperCase();
  if (!normalized) return 'UNKNOWN';
  if (normalized.includes('NOUN') || normalized.includes('명사')) return 'NOUN';
  if (normalized.includes('VERB') || normalized.includes('동사')) return 'VERB';
  if (normalized.includes('ADJ') || normalized.includes('형용사')) return 'ADJECTIVE';
  if (normalized.includes('ADV') || normalized.includes('부사')) return 'ADVERB';
  return normalized;
}

function toTranslationErrorMessage(error: unknown, language: 'zh' | 'en' | 'vi' | 'mn') {
  const text = (zh: string, en: string, vi: string, mn: string) => {
    if (language === 'en') return en;
    if (language === 'vi') return vi;
    if (language === 'mn') return mn;
    return zh;
  };
  const raw = error instanceof Error ? error.message : String(error);
  if (raw.includes('AI_RATE_LIMIT_EXCEEDED')) {
    return text(
      '\u7ffb\u8bd1\u8bf7\u6c42\u8fc7\u4e8e\u9891\u7e41，\u8bf7\u7a0d\u540e\u91cd\u8bd5',
      'Too many translation requests. Please try again later.',
      'Yêu cầu dịch quá nhiều. Vui lòng thử lại sau.',
      'Орчуулгын хүсэлт хэт олон байна. Дараа дахин оролдоно уу.'
    );
  }
  if (raw.includes('UNAUTHORIZED')) {
    return text(
      '\u8bf7\u5148\u767b\u5f55\u540e\u518d\u4f7f\u7528\u7ffb\u8bd1',
      'Please sign in to use translation.',
      'Vui lòng đăng nhập để dùng tính năng dịch.',
      'Орчуулга ашиглахын тулд нэвтэрнэ үү.'
    );
  }
  if (raw.includes("Could not find public function for 'ai:translateReadingParagraphs'")) {
    return text(
      '\u7ffb\u8bd1\u670d\u52a1\u5c1a\u672a\u66f4\u65b0，\u8bf7\u7a0d\u540e\u5237\u65b0',
      'Translation service is not updated yet. Please refresh later.',
      'Dịch vụ dịch chưa được cập nhật. Vui lòng tải lại sau.',
      'Орчуулгын үйлчилгээ шинэчлэгдээгүй байна. Дараа дахин шинэчилнэ үү.'
    );
  }
  return text(
    '\u5f53\u524d\u7ffb\u8bd1\u670d\u52a1\u4e0d\u53ef\u7528',
    'Translation service is currently unavailable.',
    'Dịch vụ dịch hiện không khả dụng.',
    'Орчуулгын үйлчилгээ одоогоор ашиглах боломжгүй байна.'
  );
}

function createNoteId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

const SELECTION_TOOLBAR_DISMISS_SELECTORS = ['[data-reading-selection-toolbar]'] as const;

export default function ReadingArticlePage() {
  const { articleId = '' } = useParams<{ articleId: string }>();
  const navigate = useLocalizedNavigate();
  const { t } = useTranslation();
  const { language } = useAuth();
  const uiLanguage: 'zh' | 'en' | 'vi' | 'mn' =
    language === 'zh' || language === 'en' || language === 'vi' || language === 'mn'
      ? language
      : 'en';
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [panelTab, setPanelTab] = useState<PanelTab>('ai');
  const [fontSize, setFontSize] = useState(18);
  const [translationEnabled, setTranslationEnabled] = useState(false);
  const [translations, setTranslations] = useState<string[]>([]);
  const [translationLoading, setTranslationLoading] = useState(false);
  const [translationError, setTranslationError] = useState<string | null>(null);
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
  const [savedWords, setSavedWords] = useState<Record<string, boolean>>({});
  const [savingWordKey, setSavingWordKey] = useState<string | null>(null);
  const [noteSyncError, setNoteSyncError] = useState<string | null>(null);
  const [speaking, setSpeaking] = useState(false);

  const analyzeReadingArticle = useAction(AI.analyzeReadingArticle);
  const explainWordFallback = useAction(AI.explainWordFallback);
  const translateReadingParagraphs = useAction(AI.translateReadingParagraphs);
  const searchDictionary = useAction(DICTIONARY.searchDictionary);
  const addToReview = useMutation(VOCAB.addToReview);
  const markArticleRead = useMutation(NEWS.markArticleRead);
  const saveNotebook = useMutation(
    mRef<
      {
        type: string;
        title: string;
        content: unknown;
        tags?: string[];
      },
      { success: boolean }
    >('notebooks:save')
  );
  const { speak, stop, isLoading: speakingLoading, error: ttsError } = useTTS();

  const translationLang = useMemo(() => {
    if (language === 'en' || language === 'zh' || language === 'vi' || language === 'mn') {
      return language;
    }
    return undefined;
  }, [language]);
  const translationLabel = useMemo(
    () => translationLanguageLabel(translationLang),
    [translationLang]
  );
  const dateLocale = useMemo(() => {
    if (uiLanguage === 'zh') return 'zh-CN';
    if (uiLanguage === 'vi') return 'vi-VN';
    if (uiLanguage === 'mn') return 'mn-MN';
    return 'en-US';
  }, [uiLanguage]);

  const article = useQuery(NEWS.getById, articleId ? { articleId } : 'skip') as
    | NewsArticle
    | null
    | undefined;
  const markedArticleIdRef = useRef<string | null>(null);

  const cleanedBodyText = useMemo(
    () => (article ? cleanArticleBodyText(article.bodyText) : ''),
    [article]
  );
  const fallbackVocabulary = useMemo(
    () =>
      cleanedBodyText
        ? extractVocabulary(
            cleanedBodyText,
            uiLanguage,
            t('readingArticle.vocabFallbackMeaning', {
              defaultValue: 'Core contextual word (tap to look up)',
            })
          )
        : [],
    [cleanedBodyText, t, uiLanguage]
  );
  const fallbackGrammar = useMemo(
    () => (cleanedBodyText ? extractGrammar(cleanedBodyText, uiLanguage) : []),
    [cleanedBodyText, uiLanguage]
  );
  const fallbackSummary = useMemo(
    () =>
      article ? summarizeArticle(article.title, article.summary, cleanedBodyText, uiLanguage) : '',
    [article, cleanedBodyText, uiLanguage]
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
    setTranslations([]);
    setTranslationEnabled(false);
    setTranslationError(null);
    setSavedWords({});
    setNoteSyncError(null);
    setSpeaking(false);
    stop();
  }, [articleConvexId, stop]);

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
        setAiAnalysisError(
          message ||
            t('readingArticle.errors.aiAnalysisFailed', { defaultValue: 'AI analysis failed' })
        );
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
    t,
  ]);

  useEffect(() => {
    if (!article?._id) return;
    if (markedArticleIdRef.current === article._id) return;
    markedArticleIdRef.current = article._id;
    void markArticleRead({ articleId: article._id }).catch(() => undefined);
  }, [article?._id, markArticleRead]);

  const requestTranslations = useCallback(async () => {
    if (!articleTitle || paragraphs.length === 0) {
      setTranslations([]);
      setTranslationLoading(false);
      setTranslationError(null);
      return;
    }

    setTranslationLoading(true);
    setTranslationError(null);
    try {
      const result = (await translateReadingParagraphs({
        title: articleTitle,
        paragraphs,
        language: translationLang,
      })) as ReadingTranslationResult | null;
      const next = Array.isArray(result?.translations) ? result.translations : [];
      const normalized = paragraphs.map((_, index) => next[index] || '');
      setTranslations(normalized);
      const hasAnyTranslation = normalized.some(item => item.trim().length > 0);
      setTranslationError(
        hasAnyTranslation
          ? null
          : t('readingArticle.errors.translationUnavailable', {
              defaultValue: 'Translation service is currently unavailable.',
            })
      );
    } catch (error) {
      setTranslations([]);
      setTranslationError(toTranslationErrorMessage(error, uiLanguage));
    } finally {
      setTranslationLoading(false);
    }
  }, [articleTitle, paragraphs, t, translateReadingParagraphs, translationLang, uiLanguage]);

  const onToggleTranslation = useCallback(() => {
    setTranslationEnabled(prev => {
      const next = !prev;
      if (
        next &&
        !translationLoading &&
        (translations.length === 0 || !translations.some(item => item.trim().length > 0))
      ) {
        void requestTranslations();
      }
      return next;
    });
  }, [requestTranslations, translationLoading, translations]);

  useEffect(() => {
    if (!article || !articleTitle || paragraphs.length === 0) {
      setTranslations([]);
      setTranslationLoading(false);
      setTranslationError(null);
      return;
    }

    const pretranslated =
      translationLang && article.paragraphTranslations?.[translationLang]
        ? article.paragraphTranslations[translationLang]
        : undefined;
    if (Array.isArray(pretranslated) && pretranslated.length >= paragraphs.length) {
      setTranslations(paragraphs.map((_, index) => pretranslated[index] || ''));
      setTranslationLoading(false);
      setTranslationError(null);
      return;
    }

    void requestTranslations();
  }, [article, articleTitle, paragraphs, requestTranslations, translationLang]);

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
      stop();
    };
  }, [stop]);

  useOutsideDismiss({
    enabled: selectionToolbar.visible,
    onDismiss: () => setSelectionToolbar(prev => ({ ...prev, visible: false })),
    ignoreSelectors: SELECTION_TOOLBAR_DISMISS_SELECTORS,
  });

  const toggleSpeak = async () => {
    if (!article) return;
    if (speaking || speakingLoading) {
      stop();
      setSpeaking(false);
      return;
    }
    const text = cleanedBodyText || article.bodyText;
    if (!text.trim()) return;
    setSpeaking(true);
    try {
      await speak(text, {
        voice: 'ko-KR-SunHiNeural',
        rate: '-5.00%',
      });
    } finally {
      setSpeaking(false);
    }
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
        setDictionaryFallbackError(
          message ||
            t('readingArticle.errors.aiDictionaryFailed', {
              defaultValue: 'AI dictionary fallback failed',
            })
        );
      } finally {
        setDictionaryFallbackLoading(false);
      }
    },
    [cleanedBodyText, explainWordFallback, t, translationLang]
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
        setDictionaryError(
          message ||
            t('readingArticle.errors.dictionaryLookupFailed', {
              defaultValue: 'Dictionary lookup failed',
            })
        );
        await runAIDictionaryFallback(query);
      } finally {
        setDictionaryLoading(false);
      }
    },
    [runAIDictionaryFallback, searchDictionary, t, translationLang]
  );

  useEffect(() => {
    if (!activeWord) return;
    void runDictionaryLookup(activeWord);
  }, [activeWord, runDictionaryLookup]);

  const saveWordToReview = useCallback(
    async ({
      word,
      meaning,
      partOfSpeech,
      source,
    }: {
      word: string;
      meaning: string;
      partOfSpeech?: string;
      source: string;
    }) => {
      const normalizedWord = normalizeInlineWhitespace(word);
      if (!normalizedWord) return;
      const saveKey = normalizedWord.toLowerCase();
      if (savedWords[saveKey]) return;
      setSavingWordKey(saveKey);
      try {
        await addToReview({
          word: normalizedWord,
          meaning:
            meaning.trim() ||
            t('readingArticle.vocabDefaultMeaning', { defaultValue: 'Reading vocabulary' }),
          partOfSpeech: normalizePartOfSpeech(partOfSpeech),
          context: findContextSentence(cleanedBodyText, normalizedWord),
          source,
        });
        setSavedWords(prev => ({ ...prev, [saveKey]: true }));
      } finally {
        setSavingWordKey(current => (current === saveKey ? null : current));
      }
    },
    [addToReview, cleanedBodyText, savedWords, t]
  );

  const onSaveVocabularyItem = useCallback(
    async (item: VocabularyItem) => {
      await saveWordToReview({
        word: item.term,
        meaning: item.meaning,
        partOfSpeech: 'NOUN',
        source: 'READING_AI_CORE',
      });
    },
    [saveWordToReview]
  );

  const onSaveDictionaryEntry = useCallback(
    async (entry: DictionaryEntry) => {
      await saveWordToReview({
        word: entry.word,
        meaning:
          getDictionaryMeaning(entry) ||
          t('readingArticle.dictionaryFallbackMeaning', {
            defaultValue: 'Reading dictionary meaning',
          }),
        partOfSpeech: entry.pos,
        source: 'READING_DICTIONARY',
      });
    },
    [saveWordToReview, t]
  );

  const onSaveDictionaryFallback = useCallback(async () => {
    if (!dictionaryFallback) return;
    await saveWordToReview({
      word: dictionaryFallback.word,
      meaning:
        dictionaryFallback.meaning ||
        t('readingArticle.aiMeaningFallback', { defaultValue: 'AI explanation' }),
      partOfSpeech: dictionaryFallback.pos,
      source: 'READING_DICTIONARY_AI',
    });
  }, [dictionaryFallback, saveWordToReview, t]);

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

  const onSaveDraftNote = async () => {
    if (!draftNote) return;
    const nextNote: ReaderNote = {
      id: createNoteId(),
      quote: normalizeInlineWhitespace(draftNote.quote),
      color: draftNote.color,
      comment: draftNote.comment.trim(),
      createdAt: Date.now(),
      anchor: draftNote.anchor,
    };
    setNotes(prev => [nextNote, ...prev]);
    setDraftNote(null);
    setNoteSyncError(null);
    try {
      await saveNotebook({
        type: 'GENERAL',
        title: `${t('readingArticle.noteTitlePrefix', { defaultValue: 'Reading Note' })}｜${
          articleTitle || t('readingArticle.untitled', { defaultValue: 'Untitled Article' })
        }`,
        content: {
          text: nextNote.quote,
          notes: nextNote.comment,
          source: 'READING',
          articleId: articleConvexId || articleId,
          articleTitle: articleTitle || '',
          articleSource: article ? sourceLabel(article.sourceKey) : '',
          color: nextNote.color,
          createdAt: nextNote.createdAt,
        },
        tags: ['reading', article ? sourceLabel(article.sourceKey) : 'news'],
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setNoteSyncError(
        message ||
          t('readingArticle.errors.noteSyncFailed', {
            defaultValue: 'Failed to sync note to Notebook',
          })
      );
    }
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
      <div className="rounded-3xl border border-border bg-card p-10 text-center text-sm font-semibold text-muted-foreground">
        {t('readingArticle.errors.missingArticleId', { defaultValue: 'Missing article ID' })}
      </div>
    );
  }

  if (article === undefined) {
    return (
      <div className="grid gap-4 md:grid-cols-[minmax(0,_1fr)_360px]">
        <div className="h-[76vh] animate-pulse rounded-3xl bg-muted" />
        <div className="h-[76vh] animate-pulse rounded-3xl bg-muted" />
      </div>
    );
  }

  if (article === null) {
    return (
      <div className="rounded-3xl border border-border bg-card p-10 text-center">
        <p className="text-base font-bold text-muted-foreground">
          {t('readingArticle.errors.articleUnavailable', {
            defaultValue: 'This article does not exist or is not available.',
          })}
        </p>
        <Button
          type="button"
          variant="ghost"
          size="auto"
          onClick={() => navigate('/reading')}
          className="mt-4 rounded-xl border border-border bg-card px-4 py-2 text-sm font-bold text-muted-foreground hover:bg-muted"
        >
          {t('readingArticle.backToDiscovery', { defaultValue: 'Back to discovery' })}
        </Button>
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
    return <React.Fragment key={`t-${paragraphIndex}-${segmentIndex}`}>{text}</React.Fragment>;
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
    <div className="relative grid min-h-[82vh] gap-0 overflow-hidden rounded-3xl border border-border bg-muted md:grid-cols-[minmax(0,_1fr)_380px]">
      <main className="relative z-10 flex min-h-[82vh] flex-col border-border bg-card md:border-r">
        <header className="flex h-16 shrink-0 items-center justify-between border-b bg-card px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-4">
            <AppBreadcrumb
              className="hidden 2xl:block max-w-[360px]"
              items={[
                { label: t('nav.media', { defaultValue: 'Media' }), to: '/media' },
                {
                  label: t('readingArticle.backToDiscovery', { defaultValue: 'Reading' }),
                  to: '/reading',
                },
                { label: article.title },
              ]}
            />
            <Button
              type="button"
              variant="ghost"
              size="auto"
              onClick={() => navigate('/reading')}
              className="flex items-center gap-1 text-sm font-semibold text-muted-foreground transition hover:text-muted-foreground"
            >
              <ChevronLeft size={16} />
              {t('readingArticle.backToDiscovery', { defaultValue: 'Back to discovery' })}
            </Button>
            <span
              className={`rounded-md border px-2.5 py-1 text-xs font-semibold ${difficultyClass(article.difficultyLevel)}`}
            >
              {difficultyLabel(article.difficultyLevel, t)} ({sourceLabel(article.sourceKey)})
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="auto"
              onClick={() => setFontSize(prev => (prev >= 22 ? 16 : prev + 2))}
              className="rounded-full px-3 py-1.5 text-sm font-semibold text-muted-foreground hover:bg-muted"
            >
              Aa
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="auto"
              onClick={() => {
                void toggleSpeak();
              }}
              className="flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-semibold text-muted-foreground hover:bg-muted"
            >
              {speaking || speakingLoading ? <VolumeX size={15} /> : <Volume2 size={15} />}
              {speaking || speakingLoading
                ? t('readingArticle.tts.stop', { defaultValue: 'Stop' })
                : t('readingArticle.tts.play', { defaultValue: 'Read aloud' })}
            </Button>
            {translationError ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="auto"
                    onClick={onToggleTranslation}
                    loading={translationLoading}
                    loadingText={
                      <>
                        {t('readingArticle.translation.label', { defaultValue: 'Translation' })}
                        <span className="text-xs font-bold">
                          {translationEnabled
                            ? t('readingArticle.translation.on', { defaultValue: 'On' })
                            : t('readingArticle.translation.off', { defaultValue: 'Off' })}
                        </span>
                      </>
                    }
                    loadingIconClassName="h-[15px] w-[15px]"
                    className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-semibold ${
                      translationEnabled
                        ? 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-foreground'
                        : 'text-muted-foreground hover:bg-muted'
                    }`}
                    aria-label={t('readingArticle.translation.toggleAria', {
                      defaultValue: 'Toggle translation',
                    })}
                  >
                    <Languages size={15} />
                    {t('readingArticle.translation.label', { defaultValue: 'Translation' })}
                    <span className="text-xs font-bold">
                      {translationEnabled
                        ? t('readingArticle.translation.on', { defaultValue: 'On' })
                        : t('readingArticle.translation.off', { defaultValue: 'Off' })}
                    </span>
                  </Button>
                </TooltipTrigger>
                <TooltipPortal>
                  <TooltipContent side="top">{translationError}</TooltipContent>
                </TooltipPortal>
              </Tooltip>
            ) : (
              <Button
                type="button"
                variant="ghost"
                size="auto"
                onClick={onToggleTranslation}
                loading={translationLoading}
                loadingText={
                  <>
                    {t('readingArticle.translation.label', { defaultValue: 'Translation' })}
                    <span className="text-xs font-bold">
                      {translationEnabled
                        ? t('readingArticle.translation.on', { defaultValue: 'On' })
                        : t('readingArticle.translation.off', { defaultValue: 'Off' })}
                    </span>
                  </>
                }
                loadingIconClassName="h-[15px] w-[15px]"
                className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-semibold ${
                  translationEnabled
                    ? 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted'
                }`}
                aria-label={t('readingArticle.translation.toggleAria', {
                  defaultValue: 'Toggle translation',
                })}
              >
                <Languages size={15} />
                {t('readingArticle.translation.label', { defaultValue: 'Translation' })}
                <span className="text-xs font-bold">
                  {translationEnabled
                    ? t('readingArticle.translation.on', { defaultValue: 'On' })
                    : t('readingArticle.translation.off', { defaultValue: 'Off' })}
                </span>
              </Button>
            )}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-8 sm:px-8 lg:px-12" ref={contentRef}>
          <div className="mx-auto w-full max-w-2xl">
            <h1 className="mb-6 text-3xl font-black leading-tight text-foreground">
              {article.title}
            </h1>
            <div className="mb-8 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm font-medium text-muted-foreground">
              <span>{new Date(article.publishedAt).toLocaleDateString(dateLocale)}</span>
              <span>{sourceLabel(article.sourceKey)}</span>
              <span>
                {t('readingArticle.meta.words', {
                  defaultValue: '{{count}} chars',
                  count: wordCount.toLocaleString(),
                })}
              </span>
              <span>
                {t('readingArticle.meta.translationTarget', {
                  defaultValue: 'Translation: {{language}}',
                  language: translationLabel,
                })}
              </span>
            </div>
            {ttsError && (
              <div className="mb-5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700 dark:border-rose-900 dark:bg-rose-950/35 dark:text-rose-300">
                {t('readingArticle.tts.status', { defaultValue: 'TTS status' })}: {ttsError}
              </div>
            )}
            {translationError && (
              <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700 dark:border-amber-900 dark:bg-amber-950/35 dark:text-amber-300">
                {t('readingArticle.translation.status', { defaultValue: 'Translation status' })}:{' '}
                {translationError}
              </div>
            )}

            <div className="space-y-7 text-muted-foreground" style={{ lineHeight: 2.2, fontSize }}>
              {paragraphs.map((paragraph, paragraphIndex) => {
                const translated = translations[paragraphIndex] || '';
                return (
                  <div key={`${paragraphIndex}-${paragraph.slice(0, 18)}`}>
                    {renderParagraph(paragraph, paragraphIndex)}
                    {translationEnabled &&
                      (translated ? (
                        <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:text-base">
                          {translated}
                        </p>
                      ) : paragraphIndex === 0 && translationLoading ? (
                        <p className="mt-2 text-sm text-muted-foreground">
                          {t('readingArticle.translation.preparing', {
                            defaultValue: 'Preparing translation...',
                          })}
                        </p>
                      ) : paragraphIndex === 0 && translationError ? (
                        <p className="mt-2 text-sm text-amber-600 dark:text-amber-300">
                          {translationError}
                        </p>
                      ) : null)}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {selectionToolbar.visible && (
          <div
            data-reading-selection-toolbar
            className="fixed z-50 flex -translate-x-1/2 items-center rounded-lg border border-border bg-card/95 p-1 text-foreground shadow-pop backdrop-blur"
            style={{ left: selectionToolbar.x, top: selectionToolbar.y }}
          >
            <Button
              type="button"
              variant="ghost"
              size="auto"
              onClick={onLookupSelection}
              className="rounded px-3 py-1.5 text-sm hover:bg-muted"
            >
              🔍 {t('readingArticle.toolbar.lookup', { defaultValue: 'Lookup' })}
            </Button>
            <div className="mx-1 h-4 w-px bg-muted" />
            <Button
              type="button"
              variant="ghost"
              size="auto"
              onClick={() => setNoteColor('yellow')}
              className="rounded p-1.5 hover:bg-muted"
            >
              <span
                className={`block h-4 w-4 rounded-full bg-yellow-300 dark:bg-yellow-400/85 ${noteColor === 'yellow' ? 'ring-2 ring-foreground/70 ring-offset-1 ring-offset-card' : ''}`}
              />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="auto"
              onClick={() => setNoteColor('green')}
              className="rounded p-1.5 hover:bg-muted"
            >
              <span
                className={`block h-4 w-4 rounded-full bg-green-300 dark:bg-green-400/85 ${noteColor === 'green' ? 'ring-2 ring-foreground/70 ring-offset-1 ring-offset-card' : ''}`}
              />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="auto"
              onClick={() => setNoteColor('pink')}
              className="rounded p-1.5 hover:bg-muted"
            >
              <span
                className={`block h-4 w-4 rounded-full bg-pink-300 dark:bg-pink-400/85 ${noteColor === 'pink' ? 'ring-2 ring-foreground/70 ring-offset-1 ring-offset-card' : ''}`}
              />
            </Button>
            <div className="mx-1 h-4 w-px bg-muted" />
            <Button
              type="button"
              variant="ghost"
              size="auto"
              onClick={startNoteFromSelection}
              className={`rounded px-3 py-1.5 text-sm hover:bg-muted ${
                selectionToolbar.anchor ? '' : 'cursor-not-allowed opacity-50'
              }`}
              disabled={!selectionToolbar.anchor}
            >
              📝 {t('readingArticle.toolbar.note', { defaultValue: 'Note' })}
            </Button>
          </div>
        )}
      </main>

      <aside className="flex min-h-[82vh] flex-col border-t border-border bg-muted md:border-t-0">
        <div className="flex border-b border-border bg-card">
          <Button
            type="button"
            variant="ghost"
            size="auto"
            onClick={() => setPanelTab('ai')}
            className={`flex-1 py-4 text-sm font-bold ${
              panelTab === 'ai'
                ? 'border-b-2 border-primary text-primary dark:text-primary-foreground'
                : 'text-muted-foreground hover:text-muted-foreground'
            }`}
          >
            ✨ {t('readingArticle.tabs.ai', { defaultValue: 'AI Analysis' })}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="auto"
            onClick={() => setPanelTab('notes')}
            className={`flex-1 py-4 text-sm font-bold ${
              panelTab === 'notes'
                ? 'border-b-2 border-primary text-primary dark:text-primary-foreground'
                : 'text-muted-foreground hover:text-muted-foreground'
            }`}
          >
            📚 {t('readingArticle.tabs.notes', { defaultValue: 'Dictionary / Notes' })}
          </Button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto p-5">
          {panelTab === 'ai' ? (
            <>
              <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
                <h3 className="mb-2 flex items-center gap-2 font-bold text-muted-foreground">
                  <span>💡</span>{' '}
                  {t('readingArticle.ai.summaryTitle', { defaultValue: 'AI Summary' })}
                </h3>
                {aiAnalysisLoading && (
                  <p className="mb-2 text-xs font-semibold text-primary">
                    {t('readingArticle.ai.loading', { defaultValue: 'Generating AI analysis...' })}
                  </p>
                )}
                {aiAnalysisError && (
                  <p className="mb-2 text-xs font-semibold text-amber-600 dark:text-amber-300">
                    {t('readingArticle.ai.fallbackNotice', {
                      defaultValue: 'AI unavailable, local fallback is used.',
                    })}
                  </p>
                )}
                <p className="text-sm leading-relaxed text-muted-foreground">{summary}</p>
              </section>

              <section>
                <h3 className="mb-3 px-1 text-sm font-bold text-muted-foreground">
                  🔑 {t('readingArticle.ai.coreVocab', { defaultValue: 'Core Vocabulary' })}
                </h3>
                <div className="space-y-2">
                  {vocabulary.slice(0, 8).map(item => (
                    <div
                      key={item.term}
                      className="group flex w-full items-center justify-between rounded-lg border border-border bg-card p-3 text-left shadow-sm transition hover:border-primary/50"
                    >
                      <Button
                        type="button"
                        variant="ghost"
                        size="auto"
                        onClick={() => onWordClick(item.term)}
                        className="!block flex-1 text-left"
                      >
                        <div className="font-bold text-muted-foreground">{item.term}</div>
                        <div className="text-xs text-muted-foreground">{item.meaning}</div>
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="auto"
                        onClick={() => {
                          void onSaveVocabularyItem(item);
                        }}
                        loading={savingWordKey === item.term.toLowerCase()}
                        loadingText={
                          savedWords[item.term.toLowerCase()]
                            ? t('readingArticle.vocab.saved', { defaultValue: 'Saved' })
                            : t('readingArticle.vocab.save', { defaultValue: 'Add' })
                        }
                        loadingIconClassName="w-3 h-3"
                        className={`ml-3 inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold ${
                          savedWords[item.term.toLowerCase()]
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                            : 'bg-muted text-muted-foreground hover:bg-muted'
                        }`}
                      >
                        {savedWords[item.term.toLowerCase()] ? (
                          <Check size={12} />
                        ) : (
                          <Star size={12} />
                        )}
                        {savedWords[item.term.toLowerCase()]
                          ? t('readingArticle.vocab.saved', { defaultValue: 'Saved' })
                          : t('readingArticle.vocab.save', { defaultValue: 'Add' })}
                      </Button>
                    </div>
                  ))}
                </div>
              </section>

              <section>
                <h3 className="mb-3 px-1 text-sm font-bold text-muted-foreground">
                  📖 {t('readingArticle.ai.grammarTitle', { defaultValue: 'Grammar Points' })}
                </h3>
                <div className="space-y-3">
                  {grammar.map(item => (
                    <article
                      key={item.pattern}
                      className="rounded-xl border border-blue-100 bg-blue-50/50 p-4 dark:border-blue-900 dark:bg-blue-950/35"
                    >
                      <div className="mb-1 font-bold text-blue-800 dark:text-blue-300">
                        {item.pattern}
                      </div>
                      <div className="mb-2 text-sm text-blue-700 dark:text-blue-300/90">
                        {item.explanation}
                      </div>
                      <div className="rounded border border-blue-50 bg-card p-2 text-xs text-muted-foreground dark:border-blue-900/70 dark:bg-background/50">
                        {item.example}
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            </>
          ) : (
            <>
              <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
                <h3 className="mb-2 flex items-center gap-2 font-bold text-muted-foreground">
                  <BookOpen size={16} />{' '}
                  {t('readingArticle.dictionary.currentSelection', {
                    defaultValue: 'Current Selection',
                  })}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {activeWord ||
                    t('readingArticle.dictionary.selectionHint', {
                      defaultValue: 'Tap highlighted words or select text to add notes.',
                    })}
                </p>
              </section>

              <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
                <h3 className="mb-2 flex items-center gap-2 font-bold text-muted-foreground">
                  <Languages size={16} />{' '}
                  {t('readingArticle.dictionary.title', { defaultValue: 'Dictionary' })}
                </h3>
                {!activeWord && (
                  <p className="text-sm text-muted-foreground">
                    {t('readingArticle.dictionary.emptySelection', {
                      defaultValue: 'No selected word yet.',
                    })}
                  </p>
                )}

                {activeWord && (
                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-muted-foreground">
                      {t('readingArticle.dictionary.queryWord', { defaultValue: 'Query' })}:{' '}
                      {dictionaryQuery || activeWord}
                    </div>

                    {dictionaryLoading && (
                      <p className="text-sm text-muted-foreground">
                        {t('readingArticle.dictionary.loading', {
                          defaultValue: 'Looking up dictionary...',
                        })}
                      </p>
                    )}

                    {!dictionaryLoading && dictionaryError && (
                      <p className="text-sm text-amber-600 dark:text-amber-300">
                        {t('readingArticle.dictionary.serviceError', {
                          defaultValue: 'Dictionary unavailable, switched to AI fallback.',
                        })}
                      </p>
                    )}

                    {dictionaryFallbackLoading && (
                      <p className="text-sm text-muted-foreground">
                        {t('readingArticle.dictionary.aiLoading', {
                          defaultValue: 'AI is generating explanation...',
                        })}
                      </p>
                    )}

                    {!dictionaryFallbackLoading &&
                      dictionaryFallbackError &&
                      !dictionaryFallback && (
                        <p className="text-sm text-rose-600 dark:text-rose-300">
                          {dictionaryFallbackError}
                        </p>
                      )}

                    {!dictionaryLoading && dictionaryEntries.length > 0 && (
                      <div className="space-y-2">
                        {dictionaryEntries.slice(0, 3).map(entry => {
                          const saveKey = normalizeInlineWhitespace(entry.word).toLowerCase();
                          return (
                            <article
                              key={entry.targetCode}
                              className="rounded-lg border border-border bg-muted p-3"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-foreground">{entry.word}</span>
                                  <span className="text-xs text-muted-foreground">
                                    {[entry.pos, entry.pronunciation].filter(Boolean).join(' · ')}
                                  </span>
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="auto"
                                  onClick={() => {
                                    void onSaveDictionaryEntry(entry);
                                  }}
                                  loading={savingWordKey === saveKey}
                                  loadingText={
                                    savedWords[saveKey]
                                      ? t('readingArticle.vocab.saved', { defaultValue: 'Saved' })
                                      : t('readingArticle.vocab.save', { defaultValue: 'Add' })
                                  }
                                  loadingIconClassName="w-3 h-3"
                                  className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold ${
                                    savedWords[saveKey]
                                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                                      : 'bg-card text-muted-foreground hover:bg-muted'
                                  }`}
                                >
                                  {savedWords[saveKey] ? <Check size={12} /> : <Star size={12} />}
                                  {savedWords[saveKey]
                                    ? t('readingArticle.vocab.saved', { defaultValue: 'Saved' })
                                    : t('readingArticle.vocab.save', { defaultValue: 'Add' })}
                                </Button>
                              </div>
                              <p className="mt-1 text-sm text-muted-foreground">
                                {getDictionaryMeaning(entry) ||
                                  t('readingArticle.dictionary.noMeaning', {
                                    defaultValue: 'No meaning available.',
                                  })}
                              </p>
                            </article>
                          );
                        })}
                      </div>
                    )}

                    {!dictionaryLoading &&
                      dictionaryEntries.length === 0 &&
                      !dictionaryFallbackLoading &&
                      dictionaryFallback && (
                        <article className="rounded-lg border border-blue-100 bg-blue-50/50 p-3 dark:border-blue-900 dark:bg-blue-950/35">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-foreground">
                                {dictionaryFallback.word}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {dictionaryFallback.pos ||
                                  t('readingArticle.dictionary.unknownPos', {
                                    defaultValue: 'Part of speech pending',
                                  })}
                              </span>
                              <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-700 dark:bg-blue-900/60 dark:text-blue-300">
                                AI
                              </span>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="auto"
                              onClick={() => {
                                void onSaveDictionaryFallback();
                              }}
                              loading={
                                savingWordKey ===
                                normalizeInlineWhitespace(dictionaryFallback.word).toLowerCase()
                              }
                              loadingText={
                                savedWords[
                                  normalizeInlineWhitespace(dictionaryFallback.word).toLowerCase()
                                ]
                                  ? t('readingArticle.vocab.saved', { defaultValue: 'Saved' })
                                  : t('readingArticle.vocab.save', { defaultValue: 'Add' })
                              }
                              loadingIconClassName="w-3 h-3"
                              className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold ${
                                savedWords[
                                  normalizeInlineWhitespace(dictionaryFallback.word).toLowerCase()
                                ]
                                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                                  : 'bg-card text-muted-foreground hover:bg-muted'
                              }`}
                            >
                              {savedWords[
                                normalizeInlineWhitespace(dictionaryFallback.word).toLowerCase()
                              ] ? (
                                <Check size={12} />
                              ) : (
                                <Star size={12} />
                              )}
                              {savedWords[
                                normalizeInlineWhitespace(dictionaryFallback.word).toLowerCase()
                              ]
                                ? t('readingArticle.vocab.saved', { defaultValue: 'Saved' })
                                : t('readingArticle.vocab.save', { defaultValue: 'Add' })}
                            </Button>
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {dictionaryFallback.meaning ||
                              t('readingArticle.dictionary.noMeaning', {
                                defaultValue: 'No meaning available.',
                              })}
                          </p>
                          {dictionaryFallback.example && (
                            <p className="mt-2 text-xs text-muted-foreground">
                              {t('readingArticle.dictionary.example', { defaultValue: 'Example' })}:
                              {dictionaryFallback.example}
                            </p>
                          )}
                          {dictionaryFallback.note && (
                            <p className="mt-1 text-xs text-muted-foreground">
                              {t('readingArticle.dictionary.note', { defaultValue: 'Tip' })}:
                              {dictionaryFallback.note}
                            </p>
                          )}
                        </article>
                      )}

                    {!dictionaryLoading &&
                      dictionaryEntries.length === 0 &&
                      !dictionaryFallbackLoading &&
                      !dictionaryFallback &&
                      !dictionaryFallbackError && (
                        <p className="text-sm text-muted-foreground">
                          {t('readingArticle.dictionary.noResult', {
                            defaultValue: 'No available definition found.',
                          })}
                        </p>
                      )}
                  </div>
                )}
              </section>

              <section>
                <h3 className="mb-3 text-sm font-bold text-muted-foreground">
                  📝 {t('readingArticle.notes.title', { defaultValue: 'Notes' })}
                </h3>
                {noteSyncError && (
                  <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-900 dark:bg-amber-950/35 dark:text-amber-300">
                    {t('readingArticle.notes.syncError', {
                      defaultValue: 'Saved locally, but failed to sync to Notebook',
                    })}
                    ：{noteSyncError}
                  </div>
                )}
                {draftNote && (
                  <article className="mb-3 rounded-xl border border-sky-200 bg-card p-4 shadow-sm dark:border-sky-900">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs font-bold text-sky-600 dark:text-sky-300">
                        {t('readingArticle.notes.newQuote', { defaultValue: 'New Quote Note' })}
                      </span>
                      <span
                        className={`h-3 w-3 rounded-full ${noteColorDotClass(draftNote.color)}`}
                      />
                    </div>
                    <blockquote
                      className={`rounded bg-muted p-3 text-sm text-muted-foreground ${noteUnderlineClass(draftNote.color, getNoteVisualState('draft'))}`}
                    >
                      “{draftNote.quote}”
                    </blockquote>
                    <Textarea
                      value={draftNote.comment}
                      onChange={e => onDraftCommentChange(e.target.value)}
                      placeholder={t('readingArticle.notes.placeholder', {
                        defaultValue: 'Write your understanding, questions, or translation...',
                      })}
                      className="mt-3 h-24 w-full resize-none rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-none"
                    />
                    <div className="mt-3 flex items-center justify-end gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="auto"
                        onClick={onDiscardDraftNote}
                        className="rounded-lg border border-border px-3 py-1.5 text-xs font-bold text-muted-foreground hover:bg-muted"
                      >
                        {t('readingArticle.notes.cancel', { defaultValue: 'Cancel' })}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="auto"
                        onClick={onSaveDraftNote}
                        className="rounded-lg border border-primary bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground hover:bg-primary/90"
                      >
                        {t('readingArticle.notes.save', { defaultValue: 'Save Note' })}
                      </Button>
                    </div>
                  </article>
                )}
                <div className="space-y-2">
                  {notes.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-border bg-card p-4 text-xs text-muted-foreground">
                      {t('readingArticle.notes.empty', {
                        defaultValue:
                          'No notes yet. Select text and tap Note to create an underlined quote.',
                      })}
                    </div>
                  ) : (
                    notes.map(note => (
                      <Button
                        key={note.id}
                        type="button"
                        variant="ghost"
                        size="auto"
                        onClick={() => focusNote(note.id)}
                        onMouseEnter={() => setHoveredNoteId(note.id)}
                        onMouseLeave={() =>
                          setHoveredNoteId(prev => (prev === note.id ? null : prev))
                        }
                        className={`!block w-full rounded-lg border bg-card px-3 py-3 text-left text-sm text-muted-foreground shadow-sm transition ${
                          getNoteVisualState(note.id) === 'hovered'
                            ? 'border-yellow-400 shadow-yellow-200 dark:border-yellow-500/70 dark:shadow-yellow-950/40'
                            : getNoteVisualState(note.id) === 'selected'
                              ? 'border-yellow-300 shadow-yellow-100 dark:border-yellow-500/55 dark:shadow-yellow-950/30'
                              : 'border-border hover:border-border'
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
                        <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                          {note.comment ||
                            t('readingArticle.notes.noComment', { defaultValue: '(No comment)' })}
                        </p>
                      </Button>
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
