import type { VocabularyItem } from './types';
import { STOPWORDS, TERM_GLOSSARY } from './constants';
import type { NoteColor, NoteVisualState } from './types';

export function difficultyLabel(
  level: 'L1' | 'L2' | 'L3',
  t: (key: string, options?: Record<string, unknown>) => string
) {
  if (level === 'L1') return t('readingArticle.difficulty.l1', { defaultValue: 'A2 Beginner' });
  if (level === 'L2') return t('readingArticle.difficulty.l2', { defaultValue: 'B1 Intermediate' });
  return t('readingArticle.difficulty.l3', { defaultValue: 'C1 Advanced' });
}

export function difficultyClass(level: 'L1' | 'L2' | 'L3') {
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

  const sentences = normalized.split(/(?<=[.!?。！？])\s+/).filter(Boolean);
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

export function noteUnderlineClass(color: NoteColor, state: NoteVisualState) {
  const base = 'underline-offset-4';
  const active = state === 'hovered' || state === 'selected';
  if (!active) return `${base} decoration-transparent`;
  const colors: Record<NoteColor, string> = {
    yellow: 'decoration-yellow-400',
    green: 'decoration-green-400',
    blue: 'decoration-sky-400',
    pink: 'decoration-pink-400',
  };
  const styles: Record<NoteVisualState, string> = {
    default: 'underline decoration-transparent',
    hovered: `${colors[color]} underline decoration-2`,
    selected: `${colors[color]} underline decoration-2`,
  };
  return `${base} ${styles[state] || styles.default}`;
}

export function noteColorDotClass(color: NoteColor) {
  const map: Record<NoteColor, string> = {
    yellow: 'bg-yellow-400',
    green: 'bg-green-400',
    blue: 'bg-sky-400',
    pink: 'bg-pink-400',
  };
  return map[color] || 'bg-muted-foreground';
}
