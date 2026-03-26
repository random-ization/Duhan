export const BODY_NOISE_TOKENS = [
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

export const BODY_TRAILING_MARKERS = [
  '트렌드뉴스 많이 본 댓글 순',
  '많이 본 뉴스',
  '많이 본 기사',
  '많이 본 댓글',
  '좋아요',
  '댓글',
  '공유',
  '무단 전재',
  '재배포 금지',
];

const BODY_NOISE_REGEXES: RegExp[] = [
  /(기자\s*입력|기사\s*입력|입력\s*[:：]\s*\d{4}[./-]\d{1,2}[./-]\d{1,2})/i,
  /(좋아요|댓글|공유|북마크|스크랩|추천)\s*\d*/,
  /(뉴스홈|기사\s*원문|원문\s*보기|본문\s*바로가기)/,
  /(구독|알림)\s*(하기|설정|켜기|끄기)/,
  /(copyright|저작권자|무단\s*전재|재배포\s*금지)/i,
  /[A-Za-z_-]*container["']?\s*>/i,
];

const normalizeWhitespace = (value: string): string => value.replace(/\s+/g, ' ').trim();

export function isNoiseChunk(chunk: string): boolean {
  const lower = chunk.toLowerCase();
  if (BODY_NOISE_TOKENS.some(token => lower.includes(token))) return true;
  if (BODY_NOISE_REGEXES.some(pattern => pattern.test(chunk))) return true;

  const hangulCount = (chunk.match(/[가-힣]/g) || []).length;
  const latinCount = (chunk.match(/[A-Za-z]/g) || []).length;
  const symbolCount = (chunk.match(/[{};=_<>]/g) || []).length;

  if (chunk.includes('>') && chunk.split('>').length >= 3 && chunk.length < 220) return true;
  if (/(좋아요|댓글|공유|북마크|스크랩|추천)/.test(chunk) && hangulCount < 45) return true;

  if (/https?:\/\/\S+/i.test(chunk) && hangulCount < 12) return true;
  if (symbolCount >= 4 && hangulCount < 20) return true;
  if (latinCount > hangulCount * 2 && hangulCount < 10) return true;

  return false;
}

export function cleanArticleBodyText(
  rawText: string,
  options?: { collapseWhitespaceOnFallback?: boolean }
): string {
  const plain = rawText
    .replace(/\r\n/g, '\n')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const fallback = options?.collapseWhitespaceOnFallback
    ? normalizeWhitespace(rawText)
    : rawText.trim();

  if (!plain) return fallback;

  const chunks = plain
    .split(/(?<=[.!?。！？])\s+|\n+/)
    .map(chunk => chunk.trim())
    .filter(Boolean);
  const filteredChunks = chunks.filter(chunk => !isNoiseChunk(chunk));

  let cleaned = options?.collapseWhitespaceOnFallback
    ? normalizeWhitespace(filteredChunks.join(' '))
    : filteredChunks.join(' ').trim();
  if (!cleaned) {
    cleaned = options?.collapseWhitespaceOnFallback ? normalizeWhitespace(plain) : plain;
  }

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

  return cleaned || fallback;
}
