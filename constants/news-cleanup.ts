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
  '무단 전재',
  '재배포 금지',
];

const normalizeWhitespace = (value: string): string => value.replace(/\s+/g, ' ').trim();

export function isNoiseChunk(chunk: string): boolean {
  const lower = chunk.toLowerCase();
  if (BODY_NOISE_TOKENS.some(token => lower.includes(token))) return true;

  const hangulCount = (chunk.match(/[가-힣]/g) || []).length;
  const latinCount = (chunk.match(/[A-Za-z]/g) || []).length;
  const symbolCount = (chunk.match(/[{};=_<>]/g) || []).length;

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
