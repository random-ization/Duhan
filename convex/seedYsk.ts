'use node';
import { action } from './_generated/server';
import { v } from 'convex/values';
import { api, internal } from './_generated/api';
import { type FunctionReference } from 'convex/server';
import type { Id } from './_generated/dataModel';
import { createHash } from 'node:crypto';
import { inflateRawSync } from 'node:zlib';
import { createPresignedUploadUrl } from './storagePresign';

const DEFAULT_YSK_COURSE_ID = 'ysk-1';
const DEFAULT_YSK_BOOK = 1;
const DEFAULT_PAGE = 1;
const DEFAULT_PER_PAGE = 20;
const MAX_PER_PAGE = 20;
const DEFAULT_MAX_PAGES = 5;
const DEFAULT_PART_OF_SPEECH = 'NOUN';

type YskSeedConfig = {
  book: 1 | 2 | 3 | 4;
  courseId: string;
  pressbooksSlug: 'ysk1' | 'ysk2' | 'ysk3' | 'ysk4';
};

const YSK_SEED_CONFIGS: Record<string, YskSeedConfig> = {
  'ysk-1': {
    book: 1,
    courseId: 'ysk-1',
    pressbooksSlug: 'ysk1',
  },
  'ysk-2': {
    book: 2,
    courseId: 'ysk-2',
    pressbooksSlug: 'ysk2',
  },
  'ysk-3': {
    book: 3,
    courseId: 'ysk-3',
    pressbooksSlug: 'ysk3',
  },
  'ysk-4': {
    book: 4,
    courseId: 'ysk-4',
    pressbooksSlug: 'ysk4',
  },
};

const YSK_BOOK_TO_COURSE: Record<number, keyof typeof YSK_SEED_CONFIGS> = {
  1: 'ysk-1',
  2: 'ysk-2',
  3: 'ysk-3',
  4: 'ysk-4',
};

type PressbooksChapter = {
  id?: number;
  title?: { rendered?: string; raw?: string };
  content?: { rendered?: string; raw?: string };
};

type ParsedVocabItem = {
  word: string;
  meaningEn: string;
};

type SeedTranscriptSegment = {
  start: number;
  end: number;
  text: string;
  translation?: string;
  words?: Array<{ word: string; start: number; end: number }>;
};

type ParsedChapter = {
  sourceChapterId: number | null;
  articleIndex: number;
  rawTitle: string;
  unitIndex: number;
  title: string;
  readingText: string;
  transcriptData: SeedTranscriptSegment[];
  audioUrl: string | null;
  h5pIds: number[];
  h5pExports: H5pExportItem[];
  vocabulary: ParsedVocabItem[];
  grammarPoints: ParsedGrammarPoint[];
  warnings: string[];
};

type ParsedGrammarExample = {
  kr: string;
  cn: string;
  en?: string;
  vi?: string;
  mn?: string;
  audio?: string;
};

type ParsedGrammarPoint = {
  title: string;
  summary: string;
  explanation: string;
  examples: ParsedGrammarExample[];
  displayOrder: number;
};

type H5pExportItem = {
  id: number;
  url: string;
};

type BulkImportItem = {
  word: string;
  meaning: string;
  partOfSpeech: string;
  meaningEn?: string;
  courseId: string;
  unitId: number;
};

type InitInstituteResult = {
  inserted: boolean;
  instituteId: unknown;
  courseId: string;
};

type UpsertTextbookUnitArgs = {
  courseId: string;
  unitIndex: number;
  title: string;
  readingText: string;
  articleIndex?: number;
  audioUrl?: string;
  translation?: string;
  translationEn?: string;
  translationVi?: string;
  translationMn?: string;
  transcriptData?: SeedTranscriptSegment[] | null;
};

type UpsertTextbookUnitResult = {
  inserted: boolean;
  unitDocId: unknown;
  courseId: string;
  unitIndex: number;
  articleIndex: number;
};

type UpsertCourseGrammarArgs = {
  courseId: string;
  unitId: number;
  title: string;
  summary?: string;
  explanation?: string;
  examples?: ParsedGrammarExample[];
  type?: string;
  level?: string;
  displayOrder?: number;
};

type UpsertCourseGrammarResult = {
  insertedGrammar: boolean;
  insertedLink: boolean;
  grammarId: unknown;
  linkId: unknown;
  courseId: string;
  unitId: number;
};

type AudioUploadStats = {
  sourceDetected: number;
  uploaded: number;
  reused: number;
  failed: number;
  errors: string[];
};

type SeedMutationsInternalRefs = {
  initInstitute: FunctionReference<
    'mutation',
    'internal',
    {
      courseId?: string;
      totalUnits?: number;
    },
    InitInstituteResult
  >;
  upsertTextbookUnit: FunctionReference<
    'mutation',
    'internal',
    UpsertTextbookUnitArgs,
    UpsertTextbookUnitResult
  >;
  upsertCourseGrammar: FunctionReference<
    'mutation',
    'internal',
    UpsertCourseGrammarArgs,
    UpsertCourseGrammarResult
  >;
  cleanupCourseGrammarLinks: FunctionReference<
    'mutation',
    'internal',
    {
      courseId: string;
      unitId: number;
      keepTitles: string[];
    },
    {
      removed: number;
    }
  >;
  bulkImportVocabulary: FunctionReference<
    'mutation',
    'internal',
    {
      items: Array<{
        word: string;
        meaning: string;
        partOfSpeech?: string;
        meaningEn?: string;
        meaningVi?: string;
        meaningMn?: string;
        courseId: string;
        unitId: number;
        exampleSentence?: string;
        exampleMeaning?: string;
        exampleMeaningEn?: string;
        exampleMeaningVi?: string;
        exampleMeaningMn?: string;
      }>;
    },
    {
      success: boolean;
      results: {
        success: number;
        failed: number;
        newWords: number;
        updatedWords: number;
        insertedAppearances: number;
        updatedAppearances: number;
        errors: string[];
      };
    }
  >;
  sanitizeCourseVocabularyMeanings: FunctionReference<
    'mutation',
    'internal',
    {
      courseId?: string;
      dryRun?: boolean;
      clearOtherLocales?: boolean;
    },
    {
      success: boolean;
      dryRun: boolean;
      courseId: string;
      processed: number;
      updated: number;
      unchanged: number;
      skipped: number;
      samples: Array<{
        word: string;
        before: string;
        after: string;
        appearanceId: Id<'vocabulary_appearances'>;
      }>;
    }
  >;
  sanitizeCourseVocabularyWordForms: FunctionReference<
    'mutation',
    'internal',
    {
      courseId?: string;
      dryRun?: boolean;
    },
    {
      success: boolean;
      dryRun: boolean;
      courseId: string;
      processed: number;
      renamedWords: number;
      reassignedAppearances: number;
      mergedDuplicates: number;
      skipped: number;
      samples: Array<{
        appearanceId: Id<'vocabulary_appearances'>;
        from: string;
        to: string;
        action: 'rename_word' | 'reassign_appearance' | 'merge_duplicate';
      }>;
    }
  >;
  localizeYskCourse: FunctionReference<
    'mutation',
    'internal',
    {
      courseId?: string;
      dryRun?: boolean;
      fillOtherLocales?: boolean;
    },
    {
      success: boolean;
      dryRun: boolean;
      courseId: string;
      instituteUpdated: number;
      appearanceUpdated: number;
      grammarUpdated: number;
      grammarExamplesUpdated: number;
    }
  >;
};

const seedMutationsInternal: SeedMutationsInternalRefs = (internal as unknown as {
  seedMutations: SeedMutationsInternalRefs;
}).seedMutations;

function resolveYskSeedConfig(args: {
  courseId?: string;
  book?: number;
}): YskSeedConfig {
  const explicitCourseId = args.courseId?.trim();
  if (explicitCourseId && YSK_SEED_CONFIGS[explicitCourseId]) {
    return YSK_SEED_CONFIGS[explicitCourseId];
  }

  const book =
    args.book === 2 || args.book === 3 || args.book === 4 ? args.book : DEFAULT_YSK_BOOK;
  const mappedCourseId = YSK_BOOK_TO_COURSE[book];
  return YSK_SEED_CONFIGS[mappedCourseId] ?? YSK_SEED_CONFIGS[DEFAULT_YSK_COURSE_ID];
}

function getYskApiCandidates(config: YskSeedConfig): string[] {
  const base = `https://ysk.upenn.domains/${config.pressbooksSlug}`;
  return [`${base}/wp-json/pressbooks/v2/chapters`, `${base}/wp-json/wp/v2/chapters`];
}

function buildH5pPostApiUrl(config: YskSeedConfig, chapterId: number): string {
  return `https://ysk.upenn.domains/${config.pressbooksSlug}/wp-json/h5p/v1/post/${chapterId}`;
}

function buildH5pContentFileUrl(config: YskSeedConfig, h5pId: number, path: string): string {
  return normalizeUrl(`https://ysk.upenn.domains/${config.pressbooksSlug}/files/h5p/content/${h5pId}/${path}`);
}

function decodeHtml(value: string): string {
  return value
    .replaceAll('&nbsp;', ' ')
    .replaceAll('&amp;', '&')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&#039;', "'")
    .replaceAll('&#8217;', "'")
    .replaceAll('&#8220;', '"')
    .replaceAll('&#8221;', '"')
    .replaceAll('&#8211;', '-')
    .replaceAll('&#8212;', '-')
    .replace(/&#(\d+);/g, (_, code: string) => {
      const parsed = Number.parseInt(code, 10);
      return Number.isFinite(parsed) ? String.fromCharCode(parsed) : '';
    });
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function stripHtml(value: string): string {
  return normalizeWhitespace(
    value
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<\/li>/gi, '\n')
      .replace(/<\/tr>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
  );
}

function cleanText(value: string): string {
  return normalizeWhitespace(stripHtml(decodeHtml(value)));
}

function cleanMultilineText(value: string): string {
  return decodeHtml(value)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<\/tr>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\r/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function dedupe<T>(items: T[], keyFn: (item: T) => string): T[] {
  const seen = new Set<string>();
  const output: T[] = [];
  for (const item of items) {
    const key = keyFn(item);
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(item);
  }
  return output;
}

function extractSection(html: string, startKeywordRegex: RegExp, stopKeywordRegex: RegExp): string {
  const startMatch = startKeywordRegex.exec(html);
  if (!startMatch) return '';

  const startAt = startMatch.index + startMatch[0].length;
  const rest = html.slice(startAt);
  const stopMatch = stopKeywordRegex.exec(rest);
  const endAt = stopMatch ? startAt + stopMatch.index : html.length;
  return html.slice(startAt, endAt);
}

function normalizeUrl(value: string): string {
  const raw = normalizeWhitespace(value);
  if (!raw) return '';
  if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
  if (raw.startsWith('//')) return `https:${raw}`;
  if (raw.startsWith('/')) return `https://ysk.upenn.domains${raw}`;
  return raw;
}

function isSpacesUrl(value: string): boolean {
  const lower = value.toLowerCase();
  if (lower.includes('digitaloceanspaces.com')) return true;

  const cdn = process.env.SPACES_CDN_URL;
  if (cdn && value.startsWith(cdn)) return true;

  const endpoint = process.env.SPACES_ENDPOINT;
  const bucket = process.env.SPACES_BUCKET;
  if (endpoint && bucket) {
    try {
      const host = new URL(endpoint).host;
      return value.includes(`${bucket}.${host}`);
    } catch {
      return false;
    }
  }
  return false;
}

function inferAudioExtension(sourceUrl: string, contentType: string | null): string {
  if (contentType) {
    const lower = contentType.toLowerCase();
    if (lower.includes('mpeg') || lower.includes('mp3')) return 'mp3';
    if (lower.includes('mp4') || lower.includes('m4a') || lower.includes('aac')) return 'm4a';
    if (lower.includes('wav')) return 'wav';
    if (lower.includes('ogg')) return 'ogg';
    if (lower.includes('webm')) return 'webm';
  }

  const pathname = (() => {
    try {
      return new URL(sourceUrl).pathname.toLowerCase();
    } catch {
      return sourceUrl.toLowerCase();
    }
  })();

  if (pathname.endsWith('.mp3')) return 'mp3';
  if (pathname.endsWith('.m4a') || pathname.endsWith('.mp4') || pathname.endsWith('.aac'))
    return 'm4a';
  if (pathname.endsWith('.wav')) return 'wav';
  if (pathname.endsWith('.ogg')) return 'ogg';
  if (pathname.endsWith('.webm')) return 'webm';
  return 'mp3';
}

async function uploadAudioToSpaces(args: {
  sourceUrl: string;
  chapterId: number | null;
  unitIndex: number;
  courseId: string;
  cache: Map<string, string>;
}): Promise<{ url: string; uploaded: boolean }> {
  const normalizedSource = normalizeUrl(args.sourceUrl);
  if (!normalizedSource) {
    throw new Error('Empty source audio URL');
  }

  const cached = args.cache.get(normalizedSource);
  if (cached) {
    return { url: cached, uploaded: false };
  }

  if (isSpacesUrl(normalizedSource)) {
    args.cache.set(normalizedSource, normalizedSource);
    return { url: normalizedSource, uploaded: false };
  }

  const sourceRes = await fetch(normalizedSource);
  if (!sourceRes.ok) {
    throw new Error(`Audio fetch failed (${sourceRes.status})`);
  }

  const contentType = sourceRes.headers.get('content-type') ?? 'audio/mpeg';
  const lowerType = contentType.toLowerCase();
  if (
    !lowerType.startsWith('audio/') &&
    !lowerType.includes('application/octet-stream') &&
    !lowerType.includes('binary/octet-stream')
  ) {
    throw new Error(`Unexpected audio content-type: ${contentType}`);
  }

  const ext = inferAudioExtension(normalizedSource, contentType);
  const hash = createHash('sha1').update(normalizedSource).digest('hex').slice(0, 16);
  const chapterPart = args.chapterId ?? args.unitIndex;
  const filename = `chapter-${chapterPart}-${hash}.${ext}`;
  const key = `audio/${args.courseId}/${filename}`;

  const presigned = createPresignedUploadUrl({
    filename,
    contentType,
    folder: 'audio',
    key,
  });

  // Deterministic key makes reruns idempotent: reuse if object already exists.
  try {
    const headRes = await fetch(presigned.publicUrl, { method: 'HEAD' });
    if (headRes.ok) {
      args.cache.set(normalizedSource, presigned.publicUrl);
      return { url: presigned.publicUrl, uploaded: false };
    }
  } catch {
    // Continue to upload path.
  }

  const audioBuffer = await sourceRes.arrayBuffer();
  const uploadRes = await fetch(presigned.uploadUrl, {
    method: 'PUT',
    headers: presigned.headers,
    body: audioBuffer,
  });
  if (!uploadRes.ok) {
    const uploadError = await uploadRes.text().catch(() => '');
    throw new Error(`S3 upload failed (${uploadRes.status}) ${uploadError}`.trim());
  }

  args.cache.set(normalizedSource, presigned.publicUrl);
  return { url: presigned.publicUrl, uploaded: true };
}

function extractAudioUrl(html: string): string | null {
  const fromShortcode = html.match(/\[audio[^\]]*src=["']([^"']+)["'][^\]]*\]/i)?.[1];
  const fromAudioTag = html.match(/<audio[^>]*\ssrc=["']([^"']+)["'][^>]*>/i)?.[1];
  const fromSourceTag = html.match(/<source[^>]*\ssrc=["']([^"']+)["'][^>]*>/i)?.[1];
  const fromLink = html.match(/https?:\/\/[^\s"'<>]+?\.(?:mp3|m4a|wav|ogg)(?:\?[^\s"'<>]*)?/i)?.[0];
  const candidate = fromShortcode || fromAudioTag || fromSourceTag || fromLink || '';
  const normalized = normalizeUrl(candidate);
  return normalized || null;
}

function extractH5pIds(html: string): number[] {
  const ids = [
    ...[...html.matchAll(/\[h5p\s+id=["']?(\d+)["']?\]/gi)].map(match => match[1]),
    ...[...html.matchAll(/\/h5p\/embed\/(\d+)/gi)].map(match => match[1]),
    ...[...html.matchAll(/data-content-id=["']?(\d+)["']?/gi)].map(match => match[1]),
    ...[...html.matchAll(/h5p-iframe-(\d+)/gi)].map(match => match[1]),
  ].map(value => Number.parseInt(value, 10));
  return dedupe(ids.filter(Number.isFinite), id => String(id));
}

function cleanStructuredText(value: string): string {
  return decodeHtml(value)
    .replace(/\[h5p\s+id=["']?(\d+)["']?\]/gi, '\nH5P Activity #$1\n')
    .replace(/\[(?:\/)?pb_glossary[^\]]*\]/gi, ' ')
    .replace(/\[(?:\/)?[a-z0-9_:-]+[^\]]*\]/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(?:p|li|tr|div|h1|h2|h3|h4|h5|h6)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\r/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .split('\n')
    .map(line => normalizeWhitespace(line))
    .filter(Boolean)
    .join('\n')
    .trim();
}

function extractSectionByAnchorId(html: string, startId: string, endIds: string[]): string {
  const escapedStart = startId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const startRegex = new RegExp(`<a\\s+id=["']#?${escapedStart}["'][^>]*><\\/a>`, 'i');
  const startMatch = startRegex.exec(html);
  if (!startMatch) return '';

  const startAt = startMatch.index + startMatch[0].length;
  const rest = html.slice(startAt);
  let cutAt = rest.length;

  for (const id of endIds) {
    if (!id) continue;
    const escapedEnd = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const endRegex = new RegExp(`<a\\s+id=["']#?${escapedEnd}["'][^>]*><\\/a>`, 'i');
    const endMatch = endRegex.exec(rest);
    if (endMatch && endMatch.index < cutAt) {
      cutAt = endMatch.index;
    }
  }

  return rest.slice(0, cutAt);
}

function detectAnchorPrefix(
  html: string,
  suffix: 'tasks' | 'grammar' | 'check' | 'culture' | 'async' | 'vocab'
): string | null {
  const idRegex = new RegExp(`<a\\s+id=["']#?([A-Za-z0-9_-]+)${suffix}["'][^>]*><\\/a>`, 'i');
  const byId = idRegex.exec(html)?.[1];
  if (byId) return byId;

  const hrefRegex = new RegExp(`href=["']#([A-Za-z0-9_-]+)${suffix}["']`, 'i');
  const byHref = hrefRegex.exec(html)?.[1];
  if (byHref) return byHref;

  return null;
}

function extractVocabularySectionHtml(html: string): string {
  const vocabPrefix = detectAnchorPrefix(html, 'vocab');
  if (vocabPrefix) {
    const section = extractSectionByAnchorId(html, `${vocabPrefix}vocab`, [
      `${vocabPrefix}grammar`,
      `${vocabPrefix}tasks`,
      `${vocabPrefix}culture`,
      `${vocabPrefix}async`,
      `${vocabPrefix}check`,
    ]);
    if (section.trim().length > 0) return section;
  }

  return extractSection(
    html,
    /<(?:h[1-6]|p|strong|b)[^>]*>[\s\S]{0,180}?(?:vocabulary|words?|lexicon|어휘|단어)[\s\S]{0,180}?<\/(?:h[1-6]|p|strong|b)>/i,
    /<(?:h[1-6]|p|strong|b)[^>]*>[\s\S]{0,180}?(?:vocabulary notes?|vocabulary exercises?|단어 메모지|단어 연습|grammar|exercise|activities|문법|연습)[\s\S]{0,180}?<\/(?:h[1-6]|p|strong|b)>/i
  );
}

function htmlToLines(value: string): string[] {
  const normalized = decodeHtml(value)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(?:p|li|tr|div|h1|h2|h3|h4|h5|h6|td|th|header|section)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\r/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n');

  return normalized
    .split('\n')
    .map(line => normalizeWhitespace(line))
    .filter(Boolean);
}

function extractSectionWithin(
  html: string,
  startRegex: RegExp,
  stopRegexes: RegExp[]
): string {
  const start = startRegex.exec(html);
  if (!start) return '';

  const startAt = start.index + start[0].length;
  const rest = html.slice(startAt);
  let cutAt = rest.length;

  for (const stopRegex of stopRegexes) {
    const match = stopRegex.exec(rest);
    if (match && match.index < cutAt) {
      cutAt = match.index;
    }
  }

  return rest.slice(0, cutAt);
}

function selectCoreReadingLines(lines: string[]): string[] {
  const cleaned = lines
    .map(line =>
      normalizeWhitespace(
        line
          .replace(/\b\d{7,}\b/g, '')
          .replace(/^[^가-힣]*?(?=[가-힣])/g, '')
          .replace(/\b[A-Za-z][A-Za-z0-9'’.,!?;:()/-]*\b/g, ' ')
          .replace(/\*+/g, '')
          .replace(/_{3,}/g, ' ')
          .replace(/^[\s\-•*]+/, '')
          .replace(/\s{2,}/g, ' ')
      )
    )
    .filter(Boolean);

  const speakerOnlyLinePattern =
    /^[\p{Script=Hangul}A-Za-z][\p{Script=Hangul}A-Za-z0-9\s·.'’()_-]{0,24}[:：]$/u;
  const isReadingNoiseLine = (line: string) => {
    if (!line) return true;
    if (speakerOnlyLinePattern.test(line)) return true;
    if (/^[!?,.;:()[\]{}\-_/\\]+$/.test(line)) return true;
    if (/^(?:해\s*봐요|해봐요|스스로\s*해봐요|스스로\s*해\s*봐요)(?:\s*[!?.])+$/i.test(line))
      return true;
    if (/^(?:읽고\s*쓰기|듣고\s*말하기|듣기\s*대본|듣기\s*스크립트|읽기\s*자료)\s*$/i.test(line))
      return true;
    if (/^[가-힣\s]{1,16}\s*:\s*[가-힣]{1,3}[.!?]?$/.test(line)) return true;
    if (/^[가-힣\s]{1,20}\s*:\s*(?:다|요|네|아니요|맞아요|아니에요)[.!?]?$/.test(line)) return true;
    if (/^(?:\d+\s*[.)]\s*)?[가-힣]{1,16}\s*\/\s*[가-힣]{1,16}(?:\s*[.,!?])*$/.test(line))
      return true;
    if (/^\S+\s*\(\s*\)\s*\d+\s*[–-]\s*\d+/.test(line)) return true;
    if (
      line.length <= 18 &&
      /[.]$/.test(line) &&
      !/[:?]/.test(line) &&
      !/(?:요|다|니다|까요|세요|예요|이에요|했다|됐다|한다)[.!?]?$/.test(line)
    ) {
      return true;
    }
    return false;
  };

  const isInstruction = (line: string) =>
    /^(?:interpretive task|interpersonal task|helpful vocabulary|korean flavors|to-?do list|plans for|part\s*[ivx]+|listen\b|read\b|which of the following|having read|draw a picture|check to see|i can\b|lesson focus|goals|by the end|now you try|wb link|communicative tasks? link|language point|culture:|speaking|vocabulary notes?|vocabulary exercises?|new vocabulary and expressions|ingredients|true false|true|false|단어 메모지|발음 가이드|단어 연습|문법과 표현|말하고 발표하기|한국 문화|해 봐요|해봐요|같이 얘기해 봐요|짝하고 얘기해 봐요|스스로 해봐요|읽고 쓰기|읽기|듣기|할 수 있어요)\b/i.test(
      line
    );

  const candidates = cleaned.filter(line => {
    if (!/[가-힣]/.test(line)) return false;
    if (isInstruction(line)) return false;
    if (isReadingNoiseLine(line)) return false;
    if (/^[0-9]+(?:[:.)]\s*)?$/.test(line)) return false;
    if (/^[0-9]+\.\s*/.test(line)) return false;
    if (/,(?:\s*[^,]+){3,}/.test(line) && !/[.!?。？！]$/.test(line)) return false;
    if (/\betc\b/i.test(line)) return false;
    if (line.length <= 4) return false;
    return true;
  });

  const sentenceLike = candidates.filter(
    line =>
      /[.!?。？！]$/.test(line) ||
      (line.length >= 8 && /(?:요|다|니다|까요|세요|예요|이에요)[.!?]?$/.test(line)) ||
      line.length >= 18
  );

  const sentenceLikeLength = sentenceLike.reduce((sum, line) => sum + line.length, 0);
  if (sentenceLikeLength >= 80) return sentenceLike;

  const candidatesLength = candidates.reduce((sum, line) => sum + line.length, 0);
  if (candidatesLength >= 60) return candidates;

  return [];
}

function hasSufficientReadingQuality(lines: string[]): boolean {
  if (lines.length === 0) return false;

  const sentenceLike = lines.filter(
    line =>
      /[.!?。？！]$/.test(line) ||
      (line.length >= 8 && /(?:요|다|니다|까요|세요|예요|이에요)[.!?]?$/.test(line))
  ).length;
  const promptLike = lines.filter(line => /^(?:어디|누구|무엇|언제|왜|어떻게)\??$/.test(line)).length;
  const glossaryLike = lines.filter(line => /[:=]/.test(line) && /[A-Za-z]/.test(line)).length;

  if (sentenceLike < 2) return false;
  if (promptLike >= 2) return false;
  if (glossaryLike >= Math.ceil(lines.length / 2)) return false;
  return true;
}

function isNoisyReadingText(value: string): boolean {
  const text = normalizeWhitespace(value);
  if (!text) return true;

  const lines = value
    .split('\n')
    .map(line => normalizeWhitespace(line))
    .filter(Boolean);
  if (lines.length === 0) return true;

  const lower = text.toLowerCase();
  if (
    /(?:speaking|korean flavors|vocabulary notes?|vocabulary exercises?|to describe your plans|review and use various grammar patterns)/i.test(
      lower
    )
  ) {
    return true;
  }
  if (/맛보기\)/.test(text)) return true;
  const numberedSteps = (text.match(/\b\d+\./g) || []).length;
  if (numberedSteps >= 3) return true;

  const latinCount = (text.match(/[A-Za-z]/g) || []).length;
  const hangulCount = (text.match(/[가-힣]/g) || []).length;
  if (hangulCount > 0 && latinCount > hangulCount * 1.2 && lines.length <= 3) {
    return true;
  }

  const bracketRatio = lines.filter(line => /[\[\]]/.test(line)).length / lines.length;
  if (bracketRatio >= 0.4) return true;

  const shortRatio = lines.filter(line => line.length < 8).length / lines.length;
  if (shortRatio > 0.6 && lines.length >= 4) return true;

  return false;
}

function extractReadingText(html: string): string {
  const tasksPrefix = detectAnchorPrefix(html, 'tasks');
  if (tasksPrefix) {
    const tasksSection = extractSectionByAnchorId(html, `${tasksPrefix}tasks`, [
      `${tasksPrefix}culture`,
      `${tasksPrefix}check`,
      `${tasksPrefix}async`,
      `${tasksPrefix}Async`,
    ]);

    const readingBlock = extractSectionWithin(
      tasksSection,
      /<h[1-6][^>]*>[\s\S]{0,280}?(?:interpretive\s*(?:&amp;\s*interpersonal\s*)?task\s*\d+[:.]?)?[\s\S]{0,280}?(?:읽기|읽고\s*쓰기|read(?:ing)?(?:\s*and\s*write)?|card\s*message)[\s\S]{0,280}?<\/h[1-6]>/i,
      [
        /<h[1-6][^>]*>[\s\S]{0,220}?(?:interpersonal\s*task|말하기|말하고\s*발표하기|korean flavors|한국\s*문화|i got this|now you try|할 수 있어요|스스로 해봐요)[\s\S]{0,220}?<\/h[1-6]>/i,
      ]
    );

    const taskLines = htmlToLines(readingBlock || tasksSection);
    const coreLines = selectCoreReadingLines(taskLines);
    if (coreLines.length > 0 && hasSufficientReadingQuality(coreLines)) {
      return coreLines.join('\n').slice(0, 12000);
    }

    const cleanedLines = cleanStructuredText(readingBlock || tasksSection)
      .split('\n')
      .map(line => normalizeWhitespace(line))
      .filter(Boolean);
    const cleanedCore = selectCoreReadingLines(cleanedLines);
    if (cleanedCore.length > 0 && hasSufficientReadingQuality(cleanedCore)) {
      return cleanedCore.join('\n').slice(0, 12000);
    }
  }

  const readingSection = extractSection(
    html,
    /<(?:h[1-6]|p|strong|b)[^>]*>[\s\S]{0,220}?(?:읽기|reading)[\s\S]{0,220}?<\/(?:h[1-6]|p|strong|b)>/i,
    /<(?:h[1-6]|p|strong|b)[^>]*>[\s\S]{0,220}?(?:korean flavors|한국어와 한국 문화|i got this|now you try|연습|check)[\s\S]{0,220}?<\/(?:h[1-6]|p|strong|b)>/i
  );

  const fallbackSection =
    readingSection ||
    extractSection(
      html,
      /<(?:h[1-6]|p|strong|b)[^>]*>[\s\S]{0,220}?(?:share your thoughts|같이 얘기해 봐요|짝하고 얘기해 봐요)[\s\S]{0,220}?<\/(?:h[1-6]|p|strong|b)>/i,
      /<(?:h[1-6]|p|strong|b)[^>]*>[\s\S]{0,220}?(?:vocabulary|어휘|grammar|문법)[\s\S]{0,220}?<\/(?:h[1-6]|p|strong|b)>/i
    );

  const fallbackLines = selectCoreReadingLines(htmlToLines(fallbackSection || html));
  if (fallbackLines.length > 0 && hasSufficientReadingQuality(fallbackLines)) {
    return fallbackLines.join('\n').slice(0, 12000);
  }

  const strictFallbackLines = cleanStructuredText(fallbackSection || html)
    .split('\n')
    .map(line => normalizeWhitespace(line))
    .filter(line => /[가-힣]/.test(line))
    .filter(line => !/[:=]/.test(line))
    .filter(line => !/^(?:vocabulary|어휘|단어|grammar|문법|exercise|연습)/i.test(line));
  const strictCore = selectCoreReadingLines(strictFallbackLines);
  if (strictCore.length > 0) {
    return strictCore.join('\n').slice(0, 12000);
  }

  return '';
}

function extractListeningScriptLines(html: string): string[] {
  const collectScriptLines = (lines: string[]): string[] => {
    const output: string[] = [];
    let capture = false;

    for (const line of lines) {
      const normalized = normalizeWhitespace(
        line.replace(/\b\d{7,}\b/g, '').replace(/\s{2,}/g, ' ')
      );
      if (!normalized) continue;

      if (
        /^listening\s*script(?:\s*\d+)?[:：]?\s*$/i.test(normalized) ||
        /^듣기\s*스크립트[:：]?\s*$/i.test(normalized)
      ) {
        capture = true;
        continue;
      }

      if (!capture) continue;

      if (
        /^(?:now you try|스스로 해봐요|스스로 해 봐요|wb link|communicative tasks? link|한국\s*문화|korean flavors|check to see)/i.test(
          normalized
        )
      ) {
        if (output.length > 0) break;
        continue;
      }

      if (/^i can\b/i.test(normalized)) continue;
      if (
        /^lesson\s*\d+\s*(?:wb\s*link|integrated performance task link)\b/i.test(normalized)
      )
        continue;
      if (/^interpretive task\b/i.test(normalized)) continue;
      if (/^문법\s*\d+/.test(normalized)) continue;
      if (!/[가-힣]/.test(normalized)) continue;
      if (/^[0-9]+$/.test(normalized)) continue;
      if (/^\d+\.\s*/.test(normalized) && /\*[^*]+\*/.test(normalized)) continue;
      if (/\*[^*]+\*/.test(normalized) && /[A-Za-z]/.test(normalized)) continue;
      if (/[:=]/.test(normalized) && /[A-Za-z]/.test(normalized)) continue;
      if (/^(?:어휘|단어|vocabulary|grammar|문법)\b/i.test(normalized)) continue;
      if (normalized.length < 4) continue;
      const hangulCount = (normalized.match(/[가-힣]/g) || []).length;
      const latinCount = (normalized.match(/[A-Za-z]/g) || []).length;
      if (latinCount > hangulCount * 1.2) continue;

      output.push(normalized);
    }

    return dedupe(output, line => line);
  };

  const checkPrefix = detectAnchorPrefix(html, 'check');
  if (checkPrefix) {
    const asyncPrefix = detectAnchorPrefix(html, 'async') ?? checkPrefix;
    const checkSection = extractSectionByAnchorId(html, `${checkPrefix}check`, [
      `${asyncPrefix}async`,
      `${asyncPrefix}Async`,
    ]);
    if (checkSection) {
      const fromCheck = collectScriptLines(htmlToLines(checkSection));
      if (fromCheck.length > 0) return fromCheck;
    }
  }

  // YSK3 often places Listening Script under "I Got This" blocks without a "check" anchor.
  const globalScriptSection = extractSectionWithin(
    html,
    /(?:listening\s*script|듣기\s*스크립트)\s*[:：]?/i,
    [
      /<h[1-6][^>]*>[\s\S]{0,220}?(?:now you try|스스로 해봐요|스스로 해 봐요|wb link|communicative tasks? link|korean flavors|한국어와 한국 문화)[\s\S]{0,220}?<\/h[1-6]>/i,
    ]
  );
  if (globalScriptSection) {
    const fromGlobal = collectScriptLines(htmlToLines(globalScriptSection));
    if (fromGlobal.length > 0) return fromGlobal;
  }

  const lines = htmlToLines(html);
  const output: string[] = [];
  let capture = false;

  for (const line of lines) {
    const normalized = normalizeWhitespace(
      line.replace(/\b\d{7,}\b/g, '').replace(/\s{2,}/g, ' ')
    );
    if (!normalized) continue;

    if (
      /^listening\s*script(?:\s*\d+)?[:：]?\s*$/i.test(normalized) ||
      /^듣기\s*스크립트[:：]?\s*$/i.test(normalized)
    ) {
      capture = true;
      continue;
    }

    if (!capture) continue;

    if (
      /^(?:now you try|스스로 해봐요|wb link|communicative tasks? link|한국\s*문화|korean flavors|check to see)/i.test(
        normalized
      )
    ) {
      if (output.length > 0) break;
      continue;
    }

    if (/^i can\b/i.test(normalized)) continue;
    if (/^lesson\s*\d+\s*(?:wb\s*link|integrated performance task link)\b/i.test(normalized)) continue;
    if (/^interpretive task\b/i.test(normalized)) continue;
    if (/^문법\s*\d+/.test(normalized)) continue;
    if (!/[가-힣]/.test(normalized)) continue;
    if (/^[0-9]+$/.test(normalized)) continue;
    if (/^\d+\.\s*/.test(normalized) && /\*[^*]+\*/.test(normalized)) continue;
    if (/\*[^*]+\*/.test(normalized) && /[A-Za-z]/.test(normalized)) continue;
    if (/[:=]/.test(normalized) && /[A-Za-z]/.test(normalized)) continue;
    if (/^(?:어휘|단어|vocabulary|grammar|문법)\b/i.test(normalized)) continue;
    if (normalized.length < 4) continue;
    const hangulCount = (normalized.match(/[가-힣]/g) || []).length;
    const latinCount = (normalized.match(/[A-Za-z]/g) || []).length;
    if (latinCount > hangulCount * 1.2) continue;

    output.push(normalized);
  }

  return dedupe(output, line => line);
}

function buildTranscriptFromLines(lines: string[]): SeedTranscriptSegment[] {
  const speakerOnlyPattern = /^[\p{Script=Hangul}A-Za-z][\p{Script=Hangul}A-Za-z0-9\s·.'’()_-]{0,24}[:：]$/u;

  const coalesced: string[] = [];
  const normalizedLines = lines
    .map(line => normalizeWhitespace(line))
    .filter(Boolean)
    .slice(0, 120);

  for (let i = 0; i < normalizedLines.length; i++) {
    const current = normalizedLines[i];
    if (speakerOnlyPattern.test(current)) {
      const next = normalizeWhitespace(normalizedLines[i + 1] || '');
      if (next && !speakerOnlyPattern.test(next)) {
        coalesced.push(`${current} ${next}`.trim());
        i += 1;
      }
      // Drop orphan speaker-only rows to avoid transcript misalignment.
      continue;
    }
    coalesced.push(current);
  }

  const clipped = coalesced.slice(0, 80);

  const segments: SeedTranscriptSegment[] = [];
  let cursor = 0;
  for (const line of clipped) {
    const duration = Math.max(2.8, Math.min(9.2, line.length / 7));
    const start = Number(cursor.toFixed(2));
    const end = Number((cursor + duration).toFixed(2));
    segments.push({ start, end, text: line });
    cursor = end;
  }
  return segments;
}

function extractTranscriptData(html: string, readingText: string): SeedTranscriptSegment[] {
  const scriptLines = extractListeningScriptLines(html);
  if (scriptLines.length > 0) {
    return buildTranscriptFromLines(scriptLines);
  }

  const fallbackReadingLines = readingText
    .split('\n')
    .map(line => normalizeWhitespace(line))
    .filter(line => /[가-힣]/.test(line))
    .filter(line => line.length >= 8)
    .filter(line => !/[:=]/.test(line))
    .filter(line => /[.!?]$|(?:요|다|니다|까요|세요|예요|이에요)$/.test(line))
    .slice(0, 12);

  if (fallbackReadingLines.length > 0) {
    return buildTranscriptFromLines(fallbackReadingLines);
  }

  return [];
}

function extractGrammarSectionHtml(html: string): string {
  const grammarPrefix = detectAnchorPrefix(html, 'grammar');
  if (grammarPrefix) {
    let section = extractSectionByAnchorId(html, `${grammarPrefix}grammar`, [
      `${grammarPrefix}tasks`,
      `${grammarPrefix}culture`,
      `${grammarPrefix}check`,
    ]);
    if (!section) {
      const grammarHref = new RegExp(`href=["']#${grammarPrefix}grammar["']`, 'i');
      const match = grammarHref.exec(html);
      if (match) {
        const startAt = match.index + match[0].length;
        const rest = html.slice(startAt);
        const end = new RegExp(
          `<a\\s+id=["']#?${grammarPrefix}tasks["'][^>]*><\\/a>`,
          'i'
        ).exec(rest);
        section = end ? rest.slice(0, end.index) : rest;
      }
    }
    if (section.trim().length > 0) return section;
  }

  return extractSection(
    html,
    /<(?:h[1-6]|p|strong|b)[^>]*>[\s\S]{0,220}?(?:recipe|grammar|문법)[\s\S]{0,220}?<\/(?:h[1-6]|p|strong|b)>/i,
    /<(?:h[1-6]|p|strong|b)[^>]*>[\s\S]{0,220}?(?:let's cook|tasks|culture|korean flavors|해봐요|읽기|듣기)[\s\S]{0,220}?<\/(?:h[1-6]|p|strong|b)>/i
  );
}

function normalizeGrammarTitle(raw: string): string {
  return normalizeWhitespace(
    raw
      .replace(/^\d{1,2}\s*[.)]\s*/, '')
      .replace(/\s+/g, ' ')
      .trim()
  );
}

function isGrammarNoiseLine(line: string): boolean {
  const text = normalizeWhitespace(line);
  if (!text) return true;
  if (/^(?:\d+\s*)+$/.test(text)) return true;
  if (/^[0-9]{2,}$/.test(text)) return true;
  if (/^[-–—=~_./\\|]+$/.test(text)) return true;
  if (/^(?:연습|exercise|practice|interpretive task|interpersonal task|let's cook|i got this|now you try)/i.test(text))
    return true;
  const compact = text.replace(/\s+/g, '');
  if (!compact) return true;
  const digitRatio = compact.replace(/[^0-9]/g, '').length / compact.length;
  return digitRatio >= 0.55;
}

function isLowQualityGrammarText(value: string): boolean {
  const text = normalizeWhitespace(value);
  if (!text) return true;
  if (isGrammarNoiseLine(text)) return true;
  if (text.length < 4) return true;
  return false;
}

function isGrammarHeadingCandidate(title: string): boolean {
  const cleaned = normalizeGrammarTitle(title);
  if (!cleaned) return false;
  if (cleaned.length < 3 || cleaned.length > 180) return false;
  if (/^(?:연습|exercise|practice|lesson focus|goals|setting up|let's cook|interpretive task|interpersonal task|korean flavors|check|async|listening script)/i.test(cleaned))
    return false;
  if (/^(?:for|when|you|we)\s/i.test(cleaned) && cleaned.length > 90) return false;
  if (/^[0-9\s]+$/.test(cleaned)) return false;

  return /(?:–|particle|tense|irregular|negation|question|possessive|conjugation|casual|polite|location|time|reading time|문법|표현|은\/는|이\/가|을\/를|아\/어요|에서|에|ㄷ-?irregular)/i.test(
    cleaned
  );
}

function extractGrammarExamplesFromLines(lines: string[]): ParsedGrammarExample[] {
  const skipHeading = /^(?:문법|연습|conjugation|dictionary form|example|summary|present|past|future|recipe|odd but true|note|compare|table|맛보기)\b/i;
  const candidates = lines
    .map(line => normalizeWhitespace(line))
    .filter(Boolean)
    .filter(line => /[가-힣]/.test(line))
    .filter(line => line.length >= 6 && line.length <= 180)
    .filter(line => !skipHeading.test(line))
    .filter(line => !/^\d+\.\s*(?:[A-Za-z].*)?$/.test(line))
    .filter(line => !/^(?:dictionary form|example)\s*$/i.test(line))
    .filter(line => !isGrammarNoiseLine(line))
    .filter(line => /[:]|[.!?]$|(?:요|다|니다|까요|세요|예요|이에요)$/i.test(line));

  const parsed = dedupe(candidates, line => line).map(line => {
    const latinIndex = line.search(/[A-Za-z]/);
    let kr = line;
    let en = '';

    if (latinIndex > 0 && /[가-힣]/.test(line.slice(0, latinIndex))) {
      kr = normalizeWhitespace(line.slice(0, latinIndex));
      en = normalizeWhitespace(line.slice(latinIndex));
    }

    return {
      kr: kr.slice(0, 220),
      cn: en.slice(0, 220),
      en: en.slice(0, 220) || undefined,
      vi: undefined,
      mn: undefined,
      audio: undefined,
    } satisfies ParsedGrammarExample;
  });

  return parsed.filter(item => item.kr.length >= 4).slice(0, 8);
}

function extractGrammarPointsFromSection(sectionHtml: string): ParsedGrammarPoint[] {
  const headingMatches = [...sectionHtml.matchAll(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/gi)];
  const output: ParsedGrammarPoint[] = [];
  let displayOrder = 1;

  for (let i = 0; i < headingMatches.length; i++) {
    const match = headingMatches[i];
    const rawTitle = cleanText(match[1] || '');
    if (!isGrammarHeadingCandidate(rawTitle)) {
      continue;
    }
    const title = normalizeGrammarTitle(rawTitle).slice(0, 160);

    const blockStart = (match.index ?? 0) + match[0].length;
    const blockEnd =
      i + 1 < headingMatches.length ? headingMatches[i + 1].index ?? sectionHtml.length : sectionHtml.length;
    const blockHtml = sectionHtml.slice(blockStart, blockEnd);
    const blockLines = htmlToLines(blockHtml)
      .map(line => normalizeWhitespace(line.replace(/\b\d{7,}\b/g, '').replace(/\s{2,}/g, ' ')))
      .filter(line => !isGrammarNoiseLine(line));

    const summaryCandidate =
      blockLines.find(
        line => line.length >= 8 && !/^\d+\./.test(line) && !isLowQualityGrammarText(line)
      ) || title;
    const explanationCandidate = blockLines
      .filter(line => !isLowQualityGrammarText(line))
      .join(' ')
      .trim();
    const examples = extractGrammarExamplesFromLines(blockLines);

    output.push({
      title,
      summary: (isLowQualityGrammarText(summaryCandidate) ? title : summaryCandidate).slice(0, 280),
      explanation: (explanationCandidate || summaryCandidate || title).slice(0, 4000),
      examples,
      displayOrder,
    });
    displayOrder += 1;
  }

  return dedupe(
    output,
    item => item.title.toLowerCase().replace(/\s+/g, ' ').replace(/[–—]/g, '-').trim()
  ).slice(0, 8);
}

function extractKoreanWord(value: string): string | null {
  const match = value.match(/[가-힣][가-힣0-9\s'’\-·()]+/);
  if (!match) return null;
  let normalized = normalizeWhitespace(match[0]).replace(/^[\-\s]+|[\-\s]+$/g, '');
  const openParens = (normalized.match(/\(/g) || []).length;
  const closeParens = (normalized.match(/\)/g) || []).length;
  if (openParens > closeParens) {
    normalized = normalized.replace(/\([^)]*$/g, '').trim();
  }
  if (closeParens > openParens) {
    let remaining = closeParens - openParens;
    while (remaining > 0 && normalized.includes(')')) {
      normalized = normalized.replace(')', '');
      remaining--;
    }
  }
  normalized = normalized.replace(/[,:;]+$/g, '').trim();
  return normalized || null;
}

function isGenericMeaning(value: string): boolean {
  const normalized = normalizeWhitespace(value).toLowerCase();
  return (
    normalized === 'yes' ||
    normalized === 'no' ||
    normalized === 'ok' ||
    normalized === 'okay' ||
    normalized === 'what' ||
    normalized === 'who' ||
    normalized === 'where' ||
    normalized === 'when' ||
    normalized === 'how'
  );
}

function isGrammarGloss(value: string): boolean {
  const text = value.toLowerCase();
  return (
    /particle|connector|subject|topic|sentence|grammar|conjugation/.test(text) ||
    /\bto be\b|\bto not be\b|\bthere is\b|\bthere are\b/.test(text)
  );
}

function cleanMeaningCandidate(value: string): string {
  return normalizeWhitespace(
    value
      .replace(/\[[^\]]+\]/g, ' ')
      .replace(/\([^)]*pronunciation[^)]*\)/gi, ' ')
      .replace(/^(?:n|v|adj|adv|expr|phr|ptcl)\.\s*/i, '')
      .replace(/^[-:–—|/\\\s]+/, '')
      .replace(/[-:–—|/\\\s]+$/, '')
  );
}

function extractMeaning(value: string): string | null {
  const cleaned = cleanText(value)
    .replace(/[•·]/g, ';')
    .replace(/\s+\|\s+/g, ';')
    .replace(/\s+\/\s+/g, ';')
    .replace(/\s{2,}/g, ' ')
    .trim();
  if (!cleaned) return null;

  const candidates = cleaned
    .split(/;|\/|\||\n|，|；/g)
    .map(item => cleanMeaningCandidate(item))
    .filter(Boolean);

  if (candidates.length === 0) return null;

  const englishCandidates = candidates.filter(candidate => /[A-Za-z]/.test(candidate));
  const preferred =
    englishCandidates.find(candidate => !isGenericMeaning(candidate) && !isGrammarGloss(candidate)) ||
    englishCandidates.find(candidate => !isGenericMeaning(candidate)) ||
    englishCandidates[0] ||
    candidates[0];

  const finalMeaning = cleanMeaningCandidate(preferred);
  if (!finalMeaning) return null;
  if (finalMeaning.length < 2) return null;
  return finalMeaning.slice(0, 160);
}

function extractVocabularyFromTables(html: string): ParsedVocabItem[] {
  const tables = html.match(/<table[^>]*>[\s\S]*?<\/table>/gi) || [];
  const output: ParsedVocabItem[] = [];

  const hasKorean = (value: string) => /[가-힣]/.test(value);
  const hasLatin = (value: string) => /[A-Za-z]/.test(value);

  for (const table of tables) {
    const rows = [...table.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)]
      .map(match =>
        [...(match[1] || '').matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)]
          .map(cell => cleanText(cell[1] || ''))
          .map(cell => normalizeWhitespace(cell))
          .filter(Boolean)
      )
      .filter(row => row.length >= 2);

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const next = rows[i + 1];

      if (next && row.length === next.length && row.length >= 2) {
        const rowKo = row.filter(hasKorean).length;
        const rowLatin = row.filter(hasLatin).length;
        const nextKo = next.filter(hasKorean).length;
        const nextLatin = next.filter(hasLatin).length;
        const threshold = Math.ceil(row.length * 0.6);

        if (rowKo >= threshold && nextLatin >= threshold && nextKo === 0) {
          for (let col = 0; col < row.length; col++) {
            const word = extractKoreanWord(row[col]);
            const meaning = extractMeaning(next[col]);
            if (!word || !meaning || !hasLatin(meaning)) continue;
            output.push({ word, meaningEn: meaning });
          }
          i += 1;
          continue;
        }

        if (rowLatin >= threshold && nextKo >= threshold && rowKo === 0) {
          for (let col = 0; col < row.length; col++) {
            const word = extractKoreanWord(next[col]);
            const meaning = extractMeaning(row[col]);
            if (!word || !meaning || !hasLatin(meaning)) continue;
            output.push({ word, meaningEn: meaning });
          }
          i += 1;
          continue;
        }
      }

      for (let col = 0; col + 1 < row.length; col += 2) {
        const left = row[col];
        const right = row[col + 1];
        const leftKo = hasKorean(left);
        const rightKo = hasKorean(right);
        const leftLatin = hasLatin(left);
        const rightLatin = hasLatin(right);

        let wordRaw = '';
        let meaningRaw = '';
        if (leftKo && rightLatin && !rightKo) {
          wordRaw = left;
          meaningRaw = right;
        } else if (rightKo && leftLatin && !leftKo) {
          wordRaw = right;
          meaningRaw = left;
        } else {
          continue;
        }

        const word = extractKoreanWord(wordRaw);
        const meaning = extractMeaning(meaningRaw);
        if (!word || !meaning || !hasLatin(meaning)) continue;
        output.push({ word, meaningEn: meaning });
      }
    }
  }

  return output;
}

function extractVocabularyFromLists(html: string): ParsedVocabItem[] {
  const listItems = html.match(/<li[^>]*>[\s\S]*?<\/li>/gi) || [];
  const output: ParsedVocabItem[] = [];

  for (const item of listItems) {
    const line = cleanText(item);
    if (!line || !/[가-힣]/.test(line)) continue;

    const patterns = [
      /^([가-힣][가-힣0-9\s'’\-·()]+?)\s*[-:–—]\s*(.+)$/u,
      /^([가-힣][가-힣0-9\s'’\-·()]+?)\s+([A-Za-z].+)$/u,
      /^(.+?)\s*[-:–—]\s*([가-힣][가-힣0-9\s'’\-·()]+)$/u,
    ];

    for (const pattern of patterns) {
      const match = line.match(pattern);
      if (!match) continue;

      const left = normalizeWhitespace(match[1]);
      const right = normalizeWhitespace(match[2]);
      const leftHasKorean = /[가-힣]/.test(left);
      const rightHasKorean = /[가-힣]/.test(right);

      const word = leftHasKorean && !rightHasKorean ? extractKoreanWord(left) : extractKoreanWord(right);
      const meaning = leftHasKorean && !rightHasKorean ? extractMeaning(right) : extractMeaning(left);
      if (!word || !meaning) continue;
      if (!/[A-Za-z]/.test(meaning)) continue;

      output.push({ word, meaningEn: meaning });
      break;
    }
  }

  return output;
}

function extractVocabulary(html: string): ParsedVocabItem[] {
  const section = extractVocabularySectionHtml(html);

  const source = section || html;
  const merged = [
    ...extractVocabularyFromTables(source),
    ...extractVocabularyFromLists(source),
  ];
  return dedupe(merged, item => item.word);
}

type ZipEntry = {
  name: string;
  compressionMethod: number;
  compressedSize: number;
  localHeaderOffset: number;
};

function findZipEocdOffset(buffer: Uint8Array): number {
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  const signature = 0x06054b50;
  const minOffset = Math.max(0, buffer.byteLength - 66000);
  for (let offset = buffer.byteLength - 22; offset >= minOffset; offset--) {
    if (view.getUint32(offset, true) === signature) return offset;
  }
  return -1;
}

function listZipEntries(buffer: Uint8Array): ZipEntry[] {
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  const eocdOffset = findZipEocdOffset(buffer);
  if (eocdOffset < 0) {
    throw new Error('Invalid ZIP: EOCD not found');
  }

  const totalEntries = view.getUint16(eocdOffset + 10, true);
  const centralDirOffset = view.getUint32(eocdOffset + 16, true);
  const entries: ZipEntry[] = [];
  let offset = centralDirOffset;

  for (let i = 0; i < totalEntries; i++) {
    const signature = view.getUint32(offset, true);
    if (signature !== 0x02014b50) {
      throw new Error('Invalid ZIP: central directory signature mismatch');
    }

    const compressionMethod = view.getUint16(offset + 10, true);
    const compressedSize = view.getUint32(offset + 20, true);
    const fileNameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const localHeaderOffset = view.getUint32(offset + 42, true);
    const fileNameStart = offset + 46;
    const fileNameBytes = buffer.slice(fileNameStart, fileNameStart + fileNameLength);
    const name = new TextDecoder().decode(fileNameBytes);

    entries.push({
      name,
      compressionMethod,
      compressedSize,
      localHeaderOffset,
    });

    offset += 46 + fileNameLength + extraLength + commentLength;
  }

  return entries;
}

function readZipEntry(buffer: Uint8Array, entry: ZipEntry): Uint8Array {
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  const localHeaderOffset = entry.localHeaderOffset;
  const localSignature = view.getUint32(localHeaderOffset, true);
  if (localSignature !== 0x04034b50) {
    throw new Error(`Invalid ZIP: local file header signature mismatch for ${entry.name}`);
  }

  const fileNameLength = view.getUint16(localHeaderOffset + 26, true);
  const extraLength = view.getUint16(localHeaderOffset + 28, true);
  const dataStart = localHeaderOffset + 30 + fileNameLength + extraLength;
  const compressed = buffer.slice(dataStart, dataStart + entry.compressedSize);

  if (entry.compressionMethod === 0) return compressed;
  if (entry.compressionMethod === 8) {
    return inflateRawSync(Buffer.from(compressed));
  }
  throw new Error(`Unsupported ZIP compression method ${entry.compressionMethod} for ${entry.name}`);
}

function collectAudioPathsFromObject(value: unknown): string[] {
  const found: string[] = [];
  const visit = (node: unknown) => {
    if (typeof node === 'string') {
      const cleaned = normalizeWhitespace(node);
      if (/\.(?:mp3|m4a|wav|ogg|webm|mp4)(?:\?.*)?$/i.test(cleaned)) {
        found.push(cleaned.replace(/^\.?\//, ''));
      }
      return;
    }
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) {
      for (const item of node) visit(item);
      return;
    }

    const record = node as Record<string, unknown>;
    const path = record.path;
    const mime = record.mime;
    if (typeof path === 'string' && typeof mime === 'string' && mime.toLowerCase().startsWith('audio/')) {
      found.push(path.replace(/^\.?\//, ''));
    }
    for (const next of Object.values(record)) visit(next);
  };

  visit(value);
  return dedupe(found, item => item);
}

function collectTextSnippetsFromObject(value: unknown): string[] {
  const snippets: string[] = [];
  const allowKey = /(?:text|description|prompt|instruction|question|task|statement|sentence)/i;
  const visit = (node: unknown, keyHint = '') => {
    if (typeof node === 'string') {
      if (!allowKey.test(keyHint)) return;
      const cleaned = cleanStructuredText(node);
      if (!cleaned) return;
      snippets.push(cleaned.slice(0, 400));
      return;
    }

    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) {
      for (const item of node) visit(item, keyHint);
      return;
    }

    const record = node as Record<string, unknown>;
    for (const [key, next] of Object.entries(record)) {
      visit(next, key);
    }
  };

  visit(value);
  return dedupe(snippets, item => item);
}

async function fetchH5pExportsByChapter(
  config: YskSeedConfig,
  chapterId: number
): Promise<H5pExportItem[]> {
  const res = await fetch(buildH5pPostApiUrl(config, chapterId));
  if (!res.ok) return [];

  const payload = (await res.json()) as unknown;
  if (!Array.isArray(payload)) return [];

  const exports = payload
    .map(item => {
      if (!item || typeof item !== 'object') return null;
      const row = item as Record<string, unknown>;
      const id = Number.parseInt(String(row.id ?? ''), 10);
      const url = normalizeUrl(String(row.url ?? ''));
      if (!Number.isFinite(id) || !url) return null;
      return { id, url };
    })
    .filter((item): item is H5pExportItem => item !== null);

  return dedupe(exports, item => String(item.id));
}

type H5pInspection = {
  audioUrls: string[];
  textSnippets: string[];
};

async function inspectH5pExport(
  config: YskSeedConfig,
  item: H5pExportItem,
  cache: Map<number, H5pInspection>
): Promise<H5pInspection> {
  const cached = cache.get(item.id);
  if (cached) return cached;

  const response = await fetch(item.url);
  if (!response.ok) {
    const empty = { audioUrls: [], textSnippets: [] };
    cache.set(item.id, empty);
    return empty;
  }

  const zipBytes = new Uint8Array(await response.arrayBuffer());
  let result: H5pInspection = { audioUrls: [], textSnippets: [] };
  try {
    const entries = listZipEntries(zipBytes);
    const contentEntry = entries.find(entry => entry.name === 'content/content.json');
    if (!contentEntry) {
      cache.set(item.id, result);
      return result;
    }

    const contentJson = new TextDecoder().decode(readZipEntry(zipBytes, contentEntry));
    const parsed = JSON.parse(contentJson) as unknown;
    const paths = collectAudioPathsFromObject(parsed);
    const audioUrls = paths.map(path => buildH5pContentFileUrl(config, item.id, path));
    const textSnippets = collectTextSnippetsFromObject(parsed);

    result = {
      audioUrls: dedupe(audioUrls.filter(Boolean), url => url),
      textSnippets,
    };
  } catch {
    result = { audioUrls: [], textSnippets: [] };
  }

  cache.set(item.id, result);
  return result;
}

function parseUnitMeta(rawTitle: string, fallbackUnitIndex: number): { unitIndex: number; title: string } {
  const title = cleanText(rawTitle);

  const lessonMatch = title.match(/\blesson\s*(\d{1,3})\b/i);
  const unitMatch = title.match(/\bunit\s*(\d{1,3})\b/i);
  const koreanMatch = title.match(/(?:제\s*)?(\d{1,3})\s*(?:과|강|단원)/);
  const numericLeadMatch = title.match(/^(\d{1,3})[.)\s-]/);

  const parsedUnit =
    Number.parseInt(
      lessonMatch?.[1] || unitMatch?.[1] || koreanMatch?.[1] || numericLeadMatch?.[1] || '',
      10
    ) || fallbackUnitIndex;

  const stripped = normalizeWhitespace(
    title
      .replace(/^(?:unit|lesson)\s*\d+\s*[-:–—.)]?\s*/i, '')
      .replace(/^(?:제\s*)?\d+\s*(?:과|강|단원)\s*[-:–—.)]?\s*/u, '')
      .replace(/^(\d{1,3})[.)\s-]+/, '')
  );

  return {
    unitIndex: parsedUnit,
    title: stripped || title || `Unit ${parsedUnit}`,
  };
}

function normalizeCourseUnitIndex(config: YskSeedConfig, unitIndex: number): number {
  let normalized = unitIndex;
  if (config.courseId === 'ysk-2' && normalized >= 11) {
    normalized = normalized - 10;
  }
  if (config.courseId === 'ysk-4' && normalized >= 12) {
    normalized = normalized - 11;
  }
  return normalized > 0 ? normalized : 1;
}

function parseChapter(
  config: YskSeedConfig,
  chapter: PressbooksChapter,
  fallbackUnitIndex: number
): ParsedChapter {
  const warnings: string[] = [];
  const rawTitle = chapter.title?.rendered || chapter.title?.raw || '';
  const contentHtml = chapter.content?.rendered || chapter.content?.raw || '';

  if (!rawTitle) warnings.push('Missing chapter title');
  if (!contentHtml) warnings.push('Missing chapter HTML content');

  const meta = parseUnitMeta(rawTitle, fallbackUnitIndex);
  const articleIndex = chapter.id ?? fallbackUnitIndex;
  const audioUrl = extractAudioUrl(contentHtml);
  const h5pIds = extractH5pIds(contentHtml);

  let readingText = '';
  let transcriptData: SeedTranscriptSegment[] = [];
  let vocabulary: ParsedVocabItem[] = [];
  let grammarPoints: ParsedGrammarPoint[] = [];

  try {
    readingText = extractReadingText(contentHtml);
    if (readingText && isNoisyReadingText(readingText)) {
      warnings.push('Reading extraction looked noisy; cleared for safer fallback');
      readingText = '';
    }
    if (!readingText) warnings.push('Reading extraction returned empty text');
  } catch (error) {
    warnings.push(
      `Reading extraction failed: ${error instanceof Error ? error.message : 'unknown error'}`
    );
  }

  try {
    transcriptData = extractTranscriptData(contentHtml, readingText);
    if (transcriptData.length === 0) warnings.push('Transcript extraction returned empty list');
  } catch (error) {
    warnings.push(
      `Transcript extraction failed: ${error instanceof Error ? error.message : 'unknown error'}`
    );
  }

  if (!readingText && transcriptData.length > 0) {
    readingText = transcriptData
      .map(segment => normalizeWhitespace(segment.text))
      .filter(Boolean)
      .slice(0, 24)
      .join('\n')
      .slice(0, 12000);
  }

  try {
    vocabulary = extractVocabulary(contentHtml);
    if (vocabulary.length === 0) warnings.push('Vocabulary extraction returned empty list');
  } catch (error) {
    warnings.push(
      `Vocabulary extraction failed: ${error instanceof Error ? error.message : 'unknown error'}`
    );
  }

  try {
    grammarPoints = extractGrammarPointsFromSection(extractGrammarSectionHtml(contentHtml));
    if (grammarPoints.length === 0) warnings.push('Grammar extraction returned empty list');
  } catch (error) {
    warnings.push(`Grammar extraction failed: ${error instanceof Error ? error.message : 'unknown error'}`);
  }

  if (h5pIds.length > 0) {
    warnings.push(`Detected H5P quiz/activity IDs: ${h5pIds.join(', ')}`);
  }

  return {
    sourceChapterId: chapter.id ?? null,
    articleIndex,
    rawTitle: cleanText(rawTitle),
    unitIndex: normalizeCourseUnitIndex(config, meta.unitIndex),
    title: meta.title,
    readingText,
    transcriptData,
    audioUrl,
    h5pIds,
    h5pExports: [],
    vocabulary,
    grammarPoints,
    warnings,
  };
}

function toVocabItems(chapters: ParsedChapter[], courseId: string): BulkImportItem[] {
  const rawItems: BulkImportItem[] = [];
  for (const chapter of chapters) {
    for (const vocab of chapter.vocabulary) {
      const word = normalizeWhitespace(vocab.word);
      const meaningEn = normalizeWhitespace(vocab.meaningEn);
      if (!word || !meaningEn) continue;

      rawItems.push({
        word,
        meaning: meaningEn,
        partOfSpeech: DEFAULT_PART_OF_SPEECH,
        meaningEn,
        courseId,
        unitId: chapter.unitIndex,
      });
    }
  }

  // Keep one meaning per (course, unit, word) to avoid duplicate writes in one seed run.
  return dedupe(rawItems, item => `${item.courseId}::${item.unitId}::${item.word}`);
}

function composeReadingText(chapter: ParsedChapter, h5pTextSnippets: string[]): string {
  const base = chapter.readingText.trim();
  if (base) return base.slice(0, 12000);

  const fallbackLines = dedupe(
    h5pTextSnippets
      .map(item => normalizeWhitespace(item))
      .filter(item => item.length >= 8)
      .filter(item => /[가-힣]/.test(item))
      .filter(item => !/^(?:vocabulary|어휘|단어|grammar|문법|exercise|연습)/i.test(item)),
    item => item
  ).slice(0, 8);

  const fallbackCore = selectCoreReadingLines(fallbackLines);
  if (fallbackCore.length === 0 || !hasSufficientReadingQuality(fallbackCore)) {
    return '';
  }
  const fallback = fallbackCore.join('\n');

  return fallback.slice(0, 12000);
}

function extractTranscriptFallbackLinesFromSnippets(snippets: string[]): string[] {
  const lines = snippets
    .flatMap(snippet => cleanStructuredText(snippet).split('\n'))
    .map(line => normalizeWhitespace(line))
    .filter(Boolean)
    .filter(line => /[가-힣]/.test(line))
    .filter(line => line.length >= 8)
    .filter(line => !/^\d+\.\s*/.test(line))
    .filter(line => !/\*[^*]+\*/.test(line))
    .filter(line => !/\b(?:read|write|choose|circle|match|fill|following|worksheet)\b/i.test(line))
    .filter(line => !/^(?:vocabulary|어휘|단어|grammar|문법|exercise|연습|check)\b/i.test(line))
    .filter(line => {
      const hangul = (line.match(/[가-힣]/g) || []).length;
      const latin = (line.match(/[A-Za-z]/g) || []).length;
      return latin <= hangul * 1.2;
    })
    .filter(line => /[:.!?]|(?:요|다|니다|까요|세요|예요|이에요)$/.test(line));

  return dedupe(lines, line => line).slice(0, 24);
}

export const seedYsk = action({
  args: {
    book: v.optional(v.number()),
    courseId: v.optional(v.string()),
    page: v.optional(v.number()),
    perPage: v.optional(v.number()),
    importAllPages: v.optional(v.boolean()),
    maxPages: v.optional(v.number()),
    uploadAudioToS3: v.optional(v.boolean()),
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, args): Promise<unknown> => {
    const config = resolveYskSeedConfig({
      courseId: args.courseId,
      book: args.book,
    });
    const yskApiCandidates = getYskApiCandidates(config);
    const page = Math.max(1, Math.floor(args.page ?? DEFAULT_PAGE));
    const perPage = Math.max(1, Math.min(MAX_PER_PAGE, Math.floor(args.perPage ?? DEFAULT_PER_PAGE)));
    const importAllPages = args.importAllPages !== false;
    const maxPages = Math.max(1, Math.floor(args.maxPages ?? DEFAULT_MAX_PAGES));
    const uploadAudioToS3 = args.uploadAudioToS3 !== false;
    const dryRun = args.dryRun === true;

    let sourceUrl = '';

    const fetchPage = async (targetPage: number) => {
      let response: Response | null = null;
      let fetchError = '';
      let usedUrl = '';
      for (const baseUrl of yskApiCandidates) {
        const params = new URLSearchParams({
          page: String(targetPage),
          per_page: String(perPage),
          _fields: 'id,title,content',
        });
        const candidateUrl = `${baseUrl}?${params.toString()}`;
        const res = await fetch(candidateUrl);
        if (res.ok) {
          response = res;
          usedUrl = candidateUrl;
          break;
        }
        fetchError = `${res.status} ${res.statusText} @ ${candidateUrl}`;
      }

      if (!response) {
        throw new Error(`Failed to fetch Pressbooks chapters from all candidates: ${fetchError}`);
      }

      const payload = (await response.json()) as unknown;
      if (!Array.isArray(payload)) {
        throw new Error('Unexpected Pressbooks response: expected an array');
      }

      const totalPagesHeader = response.headers.get('x-wp-totalpages');
      const totalPages = Number.parseInt(totalPagesHeader || '', 10);

      return {
        chapters: payload as PressbooksChapter[],
        totalPages: Number.isFinite(totalPages) && totalPages > 0 ? totalPages : null,
        usedUrl,
      };
    };

    const firstPage = await fetchPage(page);
    sourceUrl = firstPage.usedUrl;
    const allChapters: PressbooksChapter[] = [...firstPage.chapters];

    const availablePages = firstPage.totalPages ?? page;
    const plannedPages = importAllPages ? Math.min(availablePages, page + maxPages - 1) : page;
    const hasMorePages = importAllPages && plannedPages < availablePages;
    const nextPageCursor = hasMorePages ? plannedPages + 1 : null;

    for (let pageNo = page + 1; pageNo <= plannedPages; pageNo++) {
      const next = await fetchPage(pageNo);
      allChapters.push(...next.chapters);
    }

    const h5pInspectCache = new Map<number, H5pInspection>();
    const parsed: ParsedChapter[] = [];
    for (const [index, chapter] of allChapters.entries()) {
      try {
        const parsedChapter = parseChapter(config, chapter, index + 1);
        const chapterId = parsedChapter.sourceChapterId;
        const h5pTextSnippets: string[] = [];

        if (Number.isFinite(chapterId)) {
          const exports = await fetchH5pExportsByChapter(config, chapterId as number);
          parsedChapter.h5pExports = exports;
          parsedChapter.h5pIds = dedupe(
            [...parsedChapter.h5pIds, ...exports.map(item => item.id)],
            id => String(id)
          );

          const h5pReferenced = new Set(parsedChapter.h5pIds);
          const prioritized = dedupe(
            [
              ...exports.filter(item => /listening|듣기/i.test(item.url)),
              ...exports.filter(item => h5pReferenced.has(item.id)),
              ...exports,
            ],
            item => String(item.id)
          ).slice(0, 8);

          for (const item of prioritized) {
            const inspection = await inspectH5pExport(config, item, h5pInspectCache);
            if (!parsedChapter.audioUrl && inspection.audioUrls.length > 0) {
              parsedChapter.audioUrl = inspection.audioUrls[0];
            }
            if (inspection.textSnippets.length > 0) {
              h5pTextSnippets.push(...inspection.textSnippets.slice(0, 3));
            }
          }
        }

        parsedChapter.readingText = composeReadingText(parsedChapter, h5pTextSnippets);
        if (parsedChapter.readingText && isNoisyReadingText(parsedChapter.readingText)) {
          parsedChapter.warnings.push('Composed reading looked noisy; replaced with title fallback');
          parsedChapter.readingText = '';
        }
        if (!parsedChapter.readingText) {
          parsedChapter.readingText = parsedChapter.rawTitle || parsedChapter.title;
        }
        if (parsedChapter.transcriptData.length === 0) {
          const transcriptFallback = extractTranscriptFallbackLinesFromSnippets(h5pTextSnippets);
          if (transcriptFallback.length > 0) {
            parsedChapter.transcriptData = buildTranscriptFromLines(transcriptFallback);
          }
        }
        parsed.push(parsedChapter);
      } catch (error) {
        parsed.push({
          sourceChapterId: chapter.id ?? null,
          articleIndex: chapter.id ?? index + 1,
          rawTitle: cleanText(chapter.title?.rendered || ''),
          unitIndex: index + 1,
          title: cleanText(chapter.title?.rendered || `Unit ${index + 1}`),
          readingText: cleanText(chapter.content?.rendered || '') || `Unit ${index + 1}`,
          transcriptData: [],
          audioUrl: null,
          h5pIds: [],
          h5pExports: [],
          vocabulary: [],
          grammarPoints: [],
          warnings: [
            `Chapter parse failed: ${error instanceof Error ? error.message : 'unknown error'}`,
          ],
        } satisfies ParsedChapter);
      }
    }

    const totalVocab = parsed.reduce((sum, chapter) => sum + chapter.vocabulary.length, 0);
    const totalGrammarPoints = parsed.reduce((sum, chapter) => sum + chapter.grammarPoints.length, 0);
    const totalTranscriptSegments = parsed.reduce(
      (sum, chapter) => sum + chapter.transcriptData.length,
      0
    );
    const chaptersWithAudio = parsed.filter(chapter => chapter.audioUrl).length;
    const totalH5pReferences = parsed.reduce((sum, chapter) => sum + chapter.h5pIds.length, 0);
    const totalH5pExports = parsed.reduce((sum, chapter) => sum + chapter.h5pExports.length, 0);
    const warningCount = parsed.reduce((sum, chapter) => sum + chapter.warnings.length, 0);
    const unitWarnings = parsed
      .filter(chapter => chapter.warnings.length > 0)
      .map(chapter => ({
        unitIndex: chapter.unitIndex,
        rawTitle: chapter.rawTitle,
        warnings: chapter.warnings,
      }));

    if (dryRun) {
      return {
        dryRun: true,
        book: config.book,
        courseId: config.courseId,
        sourceUrl,
        page,
        perPage,
        importAllPages,
        maxPages,
        uploadAudioToS3,
        availablePages,
        hasMorePages,
        nextPage: nextPageCursor,
        fetchedCount: allChapters.length,
        parsedCount: parsed.length,
        totalVocabularyItems: totalVocab,
        totalGrammarPoints,
        totalTranscriptSegments,
        chaptersWithAudio,
        totalH5pReferences,
        totalH5pExports,
        audioUpload: {
          enabled: uploadAudioToS3,
          sourceDetected: chaptersWithAudio,
        },
        warningCount,
        chapterWarnings: unitWarnings,
        chapters: parsed,
      };
    }

    // We prefer admin path for existing bulkImport, but can fallback to internal seed import.
    const viewer = (await ctx.runQuery(api.users.viewer, {})) as { role?: string } | null;
    const canUseAdminBulkImport: boolean = viewer?.role === 'ADMIN';

    const normalizedUnitCount = new Set(parsed.map(chapter => chapter.unitIndex)).size;
    const initInstituteResult = await ctx.runMutation(seedMutationsInternal.initInstitute, {
      courseId: config.courseId,
      totalUnits: normalizedUnitCount,
    });

    const audioCache = new Map<string, string>();
    const audioStats: AudioUploadStats = {
      sourceDetected: 0,
      uploaded: 0,
      reused: 0,
      failed: 0,
      errors: [],
    };

    let insertedUnits = 0;
    let skippedUnits = 0;
    let grammarLinksInserted = 0;
    let grammarLinksSkipped = 0;
    let grammarLinksRemoved = 0;
    for (const chapter of parsed) {
      let audioUrlForDb: string | undefined;
      if (chapter.audioUrl) {
        audioStats.sourceDetected++;

        if (uploadAudioToS3) {
          try {
            const uploaded = await uploadAudioToSpaces({
              sourceUrl: chapter.audioUrl,
              chapterId: chapter.sourceChapterId,
              unitIndex: chapter.unitIndex,
              courseId: config.courseId,
              cache: audioCache,
            });

            audioUrlForDb = uploaded.url;
            if (uploaded.uploaded) {
              audioStats.uploaded++;
            } else {
              audioStats.reused++;
            }
          } catch (error) {
            audioStats.failed++;
            const message = error instanceof Error ? error.message : 'Unknown audio upload error';
            audioStats.errors.push(
              `[chapter:${chapter.sourceChapterId ?? chapter.articleIndex}] ${message}`
            );
          }
        } else {
          audioUrlForDb = chapter.audioUrl;
          audioStats.reused++;
        }
      }

      const result = await ctx.runMutation(seedMutationsInternal.upsertTextbookUnit, {
        courseId: config.courseId,
        unitIndex: chapter.unitIndex,
        articleIndex: chapter.articleIndex,
        title: chapter.title,
        readingText: chapter.readingText || chapter.rawTitle || chapter.title,
        audioUrl: audioUrlForDb,
        transcriptData: chapter.transcriptData,
      });

      if ((result as { inserted?: boolean })?.inserted) {
        insertedUnits++;
      } else {
        skippedUnits++;
      }

      const grammarItems = dedupe(chapter.grammarPoints, item =>
        `${chapter.unitIndex}::${item.title.toLowerCase()}`
      );
      for (const grammar of grammarItems) {
        const link = await ctx.runMutation(seedMutationsInternal.upsertCourseGrammar, {
          courseId: config.courseId,
          unitId: chapter.unitIndex,
          title: grammar.title,
          summary: grammar.summary,
          explanation: grammar.explanation,
          examples: grammar.examples,
          type: 'GRAMMAR',
          level: 'Beginner',
          displayOrder: grammar.displayOrder,
        });
        if ((link as { insertedLink?: boolean }).insertedLink) {
          grammarLinksInserted++;
        } else {
          grammarLinksSkipped++;
        }
      }

      if (grammarItems.length > 0) {
        const cleanup = await ctx.runMutation(seedMutationsInternal.cleanupCourseGrammarLinks, {
          courseId: config.courseId,
          unitId: chapter.unitIndex,
          keepTitles: grammarItems.map(item => item.title),
        });
        grammarLinksRemoved += (cleanup as { removed?: number }).removed ?? 0;
      }
    }

    const vocabItems = toVocabItems(parsed, config.courseId);
    const vocabByUnit = new Map<number, BulkImportItem[]>();
    for (const item of vocabItems) {
      const existing = vocabByUnit.get(item.unitId);
      if (existing) {
        existing.push(item);
      } else {
        vocabByUnit.set(item.unitId, [item]);
      }
    }

    const unitIds = [...vocabByUnit.keys()].sort((a, b) => a - b);
    const bulkImportResults: Array<{ unitId: number; count: number; result: unknown }> = [];
    for (const unitId of unitIds) {
      const items = vocabByUnit.get(unitId) ?? [];
      if (items.length === 0) continue;

      // Sequential per-unit import keeps bulkImport's internal word-upsert race away from this seed path.
      const result = canUseAdminBulkImport
        ? await ctx.runMutation(api.vocab.bulkImport, { items })
        : await ctx.runMutation(seedMutationsInternal.bulkImportVocabulary, { items });
      bulkImportResults.push({ unitId, count: items.length, result });
    }

    const sanitizeResult = await ctx.runMutation(seedMutationsInternal.sanitizeCourseVocabularyMeanings, {
      courseId: config.courseId,
      dryRun: false,
      clearOtherLocales: true,
    });
    const wordFormSanitizeResult = await ctx.runMutation(
      seedMutationsInternal.sanitizeCourseVocabularyWordForms,
      {
        courseId: config.courseId,
        dryRun: false,
      }
    );

    return {
      book: config.book,
      courseId: config.courseId,
      sourceUrl,
      page,
      perPage,
      importAllPages,
      maxPages,
      uploadAudioToS3,
      availablePages,
      hasMorePages,
      nextPage: nextPageCursor,
      fetchedCount: allChapters.length,
      parsedCount: parsed.length,
      totalVocabularyItems: totalVocab,
      totalGrammarPoints,
      totalTranscriptSegments,
      chaptersWithAudio,
      totalH5pReferences,
      totalH5pExports,
      uniqueVocabularyItemsForImport: vocabItems.length,
      warningCount,
      initInstituteResult,
      textbookUnits: {
        inserted: insertedUnits,
        skipped: skippedUnits,
      },
      grammars: {
        linksInserted: grammarLinksInserted,
        linksSkipped: grammarLinksSkipped,
        linksRemoved: grammarLinksRemoved,
      },
      vocabularyImports: {
        strategy: canUseAdminBulkImport ? 'api.vocab.bulkImport' : 'internal.seedMutations.bulkImportVocabulary',
        batches: bulkImportResults.length,
        byUnit: bulkImportResults,
      },
      vocabularySanitize: sanitizeResult,
      vocabularyWordFormSanitize: wordFormSanitizeResult,
      audioUpload: audioStats,
      chapterWarnings: unitWarnings,
      chapters: parsed,
    };
  },
});

export const sanitizeYskVocabularyMeanings = action({
  args: {
    courseId: v.optional(v.string()),
    dryRun: v.optional(v.boolean()),
    clearOtherLocales: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const courseId = args.courseId || DEFAULT_YSK_COURSE_ID;
    const dryRun = args.dryRun ?? false;
    const clearOtherLocales = args.clearOtherLocales ?? true;

    const result = await ctx.runMutation(seedMutationsInternal.sanitizeCourseVocabularyMeanings, {
      courseId,
      dryRun,
      clearOtherLocales,
    });

    return {
      ...result,
      courseId,
      dryRun,
      clearOtherLocales,
    };
  },
});

export const localizeYskCourse = action({
  args: {
    courseId: v.optional(v.string()),
    dryRun: v.optional(v.boolean()),
    fillOtherLocales: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const courseId = args.courseId || DEFAULT_YSK_COURSE_ID;
    const dryRun = args.dryRun ?? false;
    const fillOtherLocales = args.fillOtherLocales ?? true;

    const result = await ctx.runMutation(seedMutationsInternal.localizeYskCourse, {
      courseId,
      dryRun,
      fillOtherLocales,
    });

    return {
      ...result,
      courseId,
      dryRun,
      fillOtherLocales,
    };
  },
});
