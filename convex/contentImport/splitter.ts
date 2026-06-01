/**
 * Korean-aware sentence splitting utilities.
 *
 * Unlike the legacy regex-based splitter (which only recognized `.`, `!`, `?`),
 * this module handles Korean sentence-final endings (다, 요, 까, etc.) and
 * mixed punctuation styles common in Korean text.
 */

/**
 * Korean sentence-final suffixes (종결어미).
 * Ordered longest-first so greedy matching works correctly.
 */
const KOREAN_SENTENCE_ENDINGS = [
  // Polite/formal endings
  '습니다',
  '습니까',
  '십시오',
  '십시오',
  '세요',
  '세요',
  '어요',
  '아요',
  '여요',
  '네요',
  '군요',
  '거든요',
  '잖아요',
  '는데요',
  '던데요',
  '래요',
  '대요',
  // Informal endings
  '는다',
  '인다',
  '었다',
  '았다',
  '였다',
  '겠다',
  '든다',
  '런다',
  '는데',
  '거든',
  '잖아',
  // Question endings
  '는가',
  '은가',
  '던가',
  '런가',
  '을까',
  '을까요',
  '나요',
  '는지',
  '인지',
  '던지',
  // Imperative / propositive
  '자',
  '세',
  '렴',
  '려무나',
  // Short endings
  '다',
  '요',
  '까',
  '네',
  '군',
  '지',
  '니',
  '냐',
  '나',
  '라',
  '야',
];

/**
 * Punctuation that terminates a sentence in Korean text.
 */
const PUNCTUATION_TERMINATORS = new Set(['.', '!', '?', '。', '！', '？']);
const TRAILING_CLOSERS = new Set(['"', "'", ')', '」', '』', '”', '’']);
const QUOTE_CLOSERS = new Set(['"', "'", '」', '』', '”', '’']);
const QUOTED_SPEECH_CONTINUATIONS = [
  '라고',
  '라며',
  '라면서',
  '라고는',
  '라고도',
  '이라고',
  '이라며',
  '냐고',
  '냐며',
  '자고',
  '다고',
  '하고',
  '하며',
];

/**
 * Check if a character is Hangul (가-힣 range).
 */
function isHangul(char: string): boolean {
  const code = char.charCodeAt(0);
  return code >= 0xac00 && code <= 0xd7a3;
}

/**
 * Split Korean text into sentences using a combination of:
 * 1. Punctuation marks (., !, ?, and CJK equivalents)
 * 2. Korean sentence-final endings (다, 요, 까, etc.)
 * 3. Line breaks as sentence boundaries
 *
 * Returns non-empty trimmed sentences.
 */
export function splitKoreanSentences(text: string): string[] {
  if (!text.trim()) return [];

  // First split by explicit line breaks (paragraphs)
  const paragraphs = text.split(/\n+/).filter(p => p.trim().length > 0);
  const sentences: string[] = [];

  for (const paragraph of paragraphs) {
    const paragraphSentences = splitParagraph(paragraph.trim());
    sentences.push(...paragraphSentences);
  }

  return sentences.filter(s => s.trim().length > 0);
}

/**
 * Split a single paragraph (no line breaks) into sentences.
 */
function splitParagraph(text: string): string[] {
  const results: string[] = [];
  let current = '';

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    current += char;

    // Check punctuation terminators
    if (PUNCTUATION_TERMINATORS.has(char)) {
      // Skip trailing quotes/brackets
      let j = i + 1;
      let consumedQuote = false;
      while (j < text.length && TRAILING_CLOSERS.has(text[j])) {
        if (QUOTE_CLOSERS.has(text[j])) {
          consumedQuote = true;
        }
        current += text[j];
        j++;
      }
      i = j - 1;

      if (consumedQuote && hasQuotedSpeechContinuation(text, j)) {
        continue;
      }

      const trimmed = current.trim();
      if (trimmed.length > 0) {
        results.push(trimmed);
        current = '';
      }
      continue;
    }

    // Check Korean sentence-final endings followed by whitespace or end
    if (isHangul(char)) {
      const remaining = text.slice(i + 1);
      const nextChar = remaining[0];

      // Only consider ending if followed by space, end of text, or another sentence start
      if (nextChar === undefined || nextChar === ' ' || nextChar === '\t') {
        // Check if current ends with a Korean sentence-final suffix
        const trimmedCurrent = current.trim();
        if (trimmedCurrent.length >= 2 && endsWithKoreanSentenceEnding(trimmedCurrent)) {
          // Verify the sentence is substantial enough (not just a particle fragment)
          if (trimmedCurrent.length >= 4) {
            results.push(trimmedCurrent);
            current = '';
          }
        }
      }
    }
  }

  // Handle remaining text
  const remaining = current.trim();
  if (remaining.length > 0) {
    // If we have previous results and the remaining is very short,
    // append it to the last sentence instead
    if (results.length > 0 && remaining.length < 3) {
      results[results.length - 1] += ' ' + remaining;
    } else {
      results.push(remaining);
    }
  }

  return results;
}

/**
 * Check if a string ends with a Korean sentence-final ending.
 */
function endsWithKoreanSentenceEnding(text: string): boolean {
  for (const ending of KOREAN_SENTENCE_ENDINGS) {
    if (text.endsWith(ending)) {
      return true;
    }
  }
  return false;
}

function hasQuotedSpeechContinuation(text: string, startIndex: number): boolean {
  const remaining = text.slice(startIndex).trimStart();
  return QUOTED_SPEECH_CONTINUATIONS.some(prefix => remaining.startsWith(prefix));
}

/**
 * Legacy sentence splitter (for backward compatibility).
 * Uses the old regex-based approach as fallback.
 */
export function splitSentencesLegacy(text: string): string[] {
  const sentenceRegex = /[^.!?\s][^.!?]*(?:[.!?](?!['"]?\s|$)[^.!?]*)*[.!?]['"]?(?=\s|$)/g;
  const matches = text.match(sentenceRegex);

  if (!matches || matches.length === 0) {
    return text.split('\n').filter(s => s.trim().length > 0);
  }

  return matches;
}
