import type { VocabularyItem, GrammarItem, NoteColor, NoteVisualState, NewsArticle, ReaderNote, DraftNote, DictionaryEntry } from './types';
import { STOPWORDS, TERM_GLOSSARY } from './constants';
import { cleanDictionaryText } from '../../utils/dictionaryMeaning';

export function difficultyLabel(
  level: string,
  t: (key: string, options?: Record<string, unknown>) => string
) {
  if (level === 'L1') return t('readingArticle.difficulty.l1', { defaultValue: 'A2 Beginner' });
  if (level === 'L2') return t('readingArticle.difficulty.l2', { defaultValue: 'B1 Intermediate' });
  return t('readingArticle.difficulty.l3', { defaultValue: 'C1 Advanced' });
}

export function difficultyClass(level: string) {
  if (level === 'L1')
    return 'border-emerald-100 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300';
  if (level === 'L2')
    return 'border-blue-100 bg-blue-50 text-blue-600 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300';
  return 'border-indigo-100 bg-indigo-50 text-indigo-700 dark:border-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-300';
}

export function toParagraphs(text: string) {
  const normalized = text.replace(/\r\n/g, '\n').trim();
  const byBreak = normalized
    .split(/\n{2,}/)
    .map(item => item.trim())
    .filter(Boolean);
  if (byBreak.length > 1) return byBreak;

  const sentenceMatches = normalized.match(/[^.!?。！？]+[.!?。！？]?/g) || [];
  const sentences = sentenceMatches.map(item => item.trim()).filter(Boolean);
  if (sentences.length <= 2) return [normalized];

  const blocks: string[] = [];
  for (let i = 0; i < sentences.length; i += 3) {
    blocks.push(sentences.slice(i, i + 3).join(' '));
  }
  return blocks;
}

export function summarizeArticle(
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
    return `${title}。本文聚焦韩国社会与经济动态。`;
  }
  return `${title}. ${sentences.join('. ')}.`;
}

export function extractVocabulary(
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

export function extractGrammar(text: string, language: 'zh' | 'en' | 'vi' | 'mn'): GrammarItem[] {
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
        '表示在叙述基础上，又叠加了后面的情况。',
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
        '表示两个动作/状态同时进行。',
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
        '表示“不可能/无法”。',
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
        '表示决定做某事。',
        'Indicates a decision to do something.',
        'Diễn tả quyết định làm việc gì đó.',
        'Ямар нэг зүйл хийхээр шийдсэнийг илэрхийлнэ.'
      ),
      example: '위원회는 금리를 동결하기로 했다.',
    });
  }

  return items.slice(0, 3);
}

export function normalizeInlineWhitespace(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

export function findContextSentence(text: string, term: string) {
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

export function getClosestParagraphElement(node: Node | null): HTMLElement | null {
  if (!node) return null;
  const element = node.nodeType === Node.ELEMENT_NODE ? (node as HTMLElement) : node.parentElement;
  return element?.closest('p[data-paragraph-index]') ?? null;
}

export function getDictionaryMeaning(entry: DictionaryEntry): string {
  const first = (entry.senses ?? [])
    .slice()
    .sort((a, b) => (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER))[0];
  if (!first) return '';
  return cleanDictionaryText(
    first.translation?.definition || first.translation?.word || first.definition || ''
  );
}

export function noteUnderlineClass(_color: NoteColor, state: NoteVisualState) {
  void _color;
  if (state === 'hovered') {
    return 'border-b-2 border-yellow-500 bg-yellow-200/40 text-foreground transition-colors dark:border-yellow-500/80 dark:bg-yellow-300/25';
  }
  if (state === 'selected') {
    return 'border-b-2 border-yellow-400 bg-yellow-100/30 text-foreground transition-colors dark:border-yellow-400/80 dark:bg-yellow-300/18';
  }
  return 'border-b-2 border-yellow-300/70 bg-yellow-50/35 transition-colors dark:border-yellow-500/60 dark:bg-yellow-300/12';
}

export function noteColorDotClass(color: NoteColor) {
  if (color === 'yellow') return 'bg-yellow-300 dark:bg-yellow-400/85';
  if (color === 'green') return 'bg-green-300 dark:bg-green-400/85';
  if (color === 'blue') return 'bg-blue-300 dark:bg-blue-400/85';
  return 'bg-pink-300 dark:bg-pink-400/85';
}

export function normalizeAnnotationNoteColor(color?: string): NoteColor {
  if (color === 'green' || color === 'blue' || color === 'pink') return color;
  return 'yellow';
}

export function translationLanguageLabel(language?: string) {
  if (language === 'en') return 'English';
  if (language === 'vi') return 'Tiếng Việt';
  if (language === 'mn') return 'Монгол';
  return '中文';
}

export function normalizePartOfSpeech(pos?: string) {
  if (!pos) return 'UNKNOWN';
  const normalized = pos.trim().toUpperCase();
  if (!normalized) return 'UNKNOWN';
  if (normalized.includes('NOUN') || normalized.includes('명사')) return 'NOUN';
  if (normalized.includes('VERB') || normalized.includes('동사')) return 'VERB';
  if (normalized.includes('ADJ') || normalized.includes('형용사')) return 'ADJECTIVE';
  if (normalized.includes('ADV') || normalized.includes('부사')) return 'ADVERB';
  return normalized;
}

export function toTranslationErrorMessage(error: unknown, language: 'zh' | 'en' | 'vi' | 'mn') {
  const text = (zh: string, en: string, vi: string, mn: string) => {
    if (language === 'en') return en;
    if (language === 'vi') return vi;
    if (language === 'mn') return mn;
    return zh;
  };
  const raw = error instanceof Error ? error.message : String(error);
  if (raw.includes('AI_RATE_LIMIT_EXCEEDED') || raw.includes('quota') || raw.includes('limit')) {
    return text(
      '翻译请求过于频繁，请稍后再试',
      'Too many translation requests. Please try again later.',
      'Yêu cầu dịch quá nhiều. Vui lòng thử lại sau.',
      'Орчуулгын хүсэлт хэт олон байна. Дараа дахин оролдоно уу.'
    );
  }
  if (raw.includes('UNAUTHORIZED')) {
    return text(
      '请先登录后再使用翻译',
      'Please sign in to use translation.',
      'Vui lòng đăng nhập để dùng tính năng dịch.',
      'Орчуулга ашиглахын тулд нэвтэрнэ үү.'
    );
  }
  if (raw.includes("Could not find public function for 'ai:translateReadingParagraphs'")) {
    return text(
      '翻译服务尚未更新，请稍后刷新',
      'Translation service is not updated yet. Please refresh later.',
      'Dịch vụ dịch chưa được cập nhật. Vui lòng tải lại sau.',
      'Орчуулгын үйлчилгээ шинэчлэгдээгүй байна. Дараа дахин шинэчилнэ үү.'
    );
  }
  return text(
    '当前翻译服务不可用',
    'Translation service is currently unavailable.',
    'Dịch vụ dịch hiện không khả dụng.',
    'Орчуулгын үйлчилгээ одоогоор ашиглах боломжгүй байна.'
  );
}

export async function handleReadingToggleSpeak(args: {
  article: NewsArticle | null | undefined;
  speaking: boolean;
  speakingLoading: boolean;
  stop: () => void;
  setSpeaking: (val: boolean) => void;
  cleanedBodyText: string;
  speak: (text: string, options?: { voice?: string; rate?: string }) => Promise<boolean | void>;
}) {
  const { article, speaking, speakingLoading, stop, setSpeaking, cleanedBodyText, speak } = args;
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
}

export function resolveReadingNoteVisualState(
  noteId: string,
  hoveredNoteId: string | null,
  selectedNoteId: string | null
): NoteVisualState {
  if (hoveredNoteId === noteId) return 'hovered';
  if (selectedNoteId === noteId) return 'selected';
  return 'default';
}

export function areReaderNotesEqual(left: ReaderNote[], right: ReaderNote[]): boolean {
  if (left.length !== right.length) return false;
  return left.every((note, index) => {
    const other = right[index];
    return (
      other !== undefined &&
      note.id === other.id &&
      note.quote === other.quote &&
      note.comment === other.comment &&
      note.color === other.color &&
      note.createdAt === other.createdAt &&
      note.anchor.paragraphIndex === other.anchor.paragraphIndex &&
      note.anchor.start === other.anchor.start &&
      note.anchor.end === other.anchor.end
    );
  });
}

export function areStringArraysEqual(left: string[], right: string[]): boolean {
  if (left.length !== right.length) return false;
  return left.every((item, index) => item === right[index]);
}

export function discardDraftNoteSelection(
  setSelectedNoteId: (val: string | null | ((prev: string | null) => string | null)) => void,
  setDraftNote: (val: DraftNote | null) => void
) {
  setSelectedNoteId(previous => (previous === 'draft' ? null : previous));
  setDraftNote(null);
}

export type ReadingUiLanguage = 'zh' | 'en' | 'vi' | 'mn';

export function resolveReadingUiLanguage(language: string | null | undefined): ReadingUiLanguage {
  if (language === 'zh' || language === 'en' || language === 'vi' || language === 'mn') {
    return language;
  }
  return 'en';
}

export function resolveReadingTranslationLanguage(
  language: string | null | undefined
): ReadingUiLanguage | undefined {
  if (language === 'zh' || language === 'en' || language === 'vi' || language === 'mn') {
    return language;
  }
  return undefined;
}

export function getReadingArticleQueryArg(articleId: string) {
  return articleId ? { articleId } : 'skip';
}

export function getNextReadingFontSize(current: number) {
  return current >= 22 ? 16 : current + 2;
}
