import { mutation, query, type MutationCtx, type QueryCtx } from './_generated/server';
import { v } from 'convex/values';
import { getAuthUserId, getOptionalAuthUserId, requireAdmin } from './utils';
import { toErrorMessage } from './errors';
import type { Id } from './_generated/dataModel';

interface GrammarExample {
  kr: string;
  cn: string;
  en?: string;
  vi?: string;
  mn?: string;
  audio?: string;
}

interface GrammarLocalizedText {
  zh?: string;
  en?: string;
  vi?: string;
  mn?: string;
}

interface GrammarSections {
  introduction?: GrammarLocalizedText;
  core?: GrammarLocalizedText;
  comparative?: GrammarLocalizedText;
  cultural?: GrammarLocalizedText;
  commonMistakes?: GrammarLocalizedText;
  review?: GrammarLocalizedText;
}

interface GrammarQuizItem {
  prompt: GrammarLocalizedText;
  answer?: GrammarLocalizedText;
}

interface GrammarSourceMeta {
  sourceType: string;
  sourcePath?: string;
  sourceUrl?: string;
  checksum?: string;
  parserVersion?: string;
  sourceLanguage?: 'zh' | 'en' | 'vi' | 'mn';
  grammarKey?: string;
  categoryStatus?: 'AUTO_OK' | 'NEEDS_REVIEW';
  categoryConfidence?: number;
  categoryReason?: string;
  categoryEvidence?: string;
  importedAt: number;
}

type GrammarConjugationRules = UnitGrammarDto['conjugationRules'];
type ParsedConjugationRules = Exclude<GrammarConjugationRules, undefined>;

type GrammarRecord = {
  _id: Id<'grammar_points'>;
  title: string;
  titleEn?: string;
  titleZh?: string;
  titleVi?: string;
  titleMn?: string;
  level: string;
  type: string;
  summary: string;
  summaryEn?: string;
  summaryVi?: string;
  summaryMn?: string;
  explanation: string;
  explanationEn?: string;
  explanationVi?: string;
  explanationMn?: string;
  sections?: GrammarSections;
  quizItems?: GrammarQuizItem[];
  sourceMeta?: GrammarSourceMeta;
  examples: GrammarExample[];
  conjugationRules?: GrammarConjugationRules;
  searchPatterns?: string[];
};

type GrammarProgressRecord = {
  grammarId: Id<'grammar_points'>;
  status: string;
  proficiency: number;
};

type SupportedLanguage = 'zh' | 'en' | 'vi' | 'mn';

export type GrammarStatsDto = {
  total: number;
  mastered: number;
};

const isVisibleInstitute = <T extends { isArchived?: boolean }>(
  institute: T | null | undefined
): institute is T => !!institute && institute.isArchived !== true;

const uniqueGrammarIds = (
  grammarIds: ReadonlyArray<Id<'grammar_points'>>
): Id<'grammar_points'>[] => {
  const seen = new Set<string>();
  const uniqueIds: Id<'grammar_points'>[] = [];

  for (const grammarId of grammarIds) {
    const key = grammarId.toString();
    if (seen.has(key)) continue;
    seen.add(key);
    uniqueIds.push(grammarId);
  }

  return uniqueIds;
};

const TOPIK_ROMANIZATION_BRACKET_RE =
  /\[(?=[^\]]{2,90}\])(?=[^\]]*[A-Za-z])[A-Za-z0-9\s/.,'"`~:;!?()-]+\]/g;
const TOPIK_LABEL_RE = /(?:韩语语法点|Korean Grammar Point|Korean Grammar)\s*[:：]\s*/gi;
const TOPIK_PROCESSING_KEYWORD_RE = /(?:Processing keyword|处理关键词)\s*[:：][^\n\r]*/gi;
const TOPIK_PROCESSING_KEYWORD_LINE_RE =
  /(^|\n)\s*(?:[#>*-]\s*)?(?:Processing keyword|处理关键词)\s*[:：][^\n\r]*(?=\n|$)/gi;
const TOPIK_MERGED_MARKER_LINE_RE =
  /(^|\n)\s*---\s*ADDITIONAL CONTENT FROM MERGED FILES\s*---\s*(?=\n|$)/gi;
const TOPIK_MERGED_FILE_HEADER_RE = /(^|\n)\s*###\s+Examples from [^\n\r]+(?=\n|$)/gi;
const TOPIK_PRONUNCIATION_PAREN_RE =
  /\s*[（(]\s*(?:pronounced|romanized(?:\s+as)?|romanisation|romanization|发音(?:为)?|读作|罗马字(?:为)?|罗马音(?:为)?|罗马拼音(?:为)?)\s*(?:[:：]\s*)?(?:\*{1,2}|`)?(?:\[[^\]\n\r]{1,80}\]|[A-Za-z][A-Za-z0-9\s/.,'"`~:;!?()-]{1,80})(?:\*{1,2}|`)?\s*[)）]/gi;
const TOPIK_PRONUNCIATION_CLAUSE_RE =
  /[，,]?\s*(?:pronounced|romanized(?:\s+as)?|romanisation|romanization|发音(?:为)?|读作|罗马字(?:为)?|罗马音(?:为)?|罗马拼音(?:为)?)\s*(?:[:：]\s*)?(?:\*{1,2}|`)?(?:\[[^\]\n\r]{1,80}\]|[A-Za-z][A-Za-z0-9\s/.,'"`~:;!?()-]{1,80})(?:\*{1,2}|`)?(?=\s*[，,。.;；]|$)/gi;
const TOPIK_PRONUNCIATION_LINE_RE =
  /(^|\n)\s*(?:[-*>]\s*)?(?:发音|读作|罗马字|罗马音|罗马拼音)\s*[:：]\s*[A-Za-z][^\n\r]*(?=\n|$)/gi;
const TOPIK_PRONUNCIATION_TABLE_HEADER_RE = /(罗马|pronunciation|romanization|romanisation|发音)/i;
const TOPIK_MARKDOWN_TABLE_SEPARATOR_RE = /^\s*\|?(?:\s*:?-{3,}:?\s*\|)+\s*:?-{3,}:?\s*\|?\s*$/;
const TOPIK_EMPTY_PARENS_SUFFIX_RE = /\s*(?:\((?:[-\s]*)\)|（(?:[-\s]*)）)\s*$/g;
const TOPIK_TRAILING_SEPARATOR_RE = /\s*[-/]\s*$/g;

function collapseInlineWhitespace(input: string): string {
  return input
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/ +([,.;!?])/g, '$1')
    .trim();
}

function stripTopikPronunciationMetadata(input: string): string {
  return input
    .replace(TOPIK_PRONUNCIATION_PAREN_RE, '')
    .replace(TOPIK_PRONUNCIATION_CLAUSE_RE, '')
    .replace(/[，,]\s*[，,]+/g, '，')
    .replace(/\(\s*\)/g, '')
    .replace(/（\s*）/g, '');
}

function splitTopikMarkdownTableRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map(cell => cell.trim());
}

function joinTopikMarkdownTableRow(cells: string[]): string {
  return `| ${cells.join(' | ')} |`;
}

function stripTopikPronunciationTableColumns(input: string): string {
  const lines = input.split('\n');
  const output: string[] = [];

  for (let index = 0; index < lines.length; ) {
    const headerLine = lines[index];
    const separatorLine = lines[index + 1];
    if (
      headerLine?.trim().startsWith('|') &&
      separatorLine &&
      TOPIK_MARKDOWN_TABLE_SEPARATOR_RE.test(separatorLine)
    ) {
      const headerCells = splitTopikMarkdownTableRow(headerLine);
      const separatorCells = splitTopikMarkdownTableRow(separatorLine);
      const keepIndices = headerCells
        .map((cell, cellIndex) =>
          TOPIK_PRONUNCIATION_TABLE_HEADER_RE.test(cell) ? null : cellIndex
        )
        .filter((cellIndex): cellIndex is number => cellIndex !== null);

      if (keepIndices.length > 0 && keepIndices.length < headerCells.length) {
        output.push(
          joinTopikMarkdownTableRow(keepIndices.map(cellIndex => headerCells[cellIndex]))
        );
        output.push(
          joinTopikMarkdownTableRow(
            keepIndices.map(cellIndex => separatorCells[cellIndex] || '---')
          )
        );
        index += 2;

        while (index < lines.length && lines[index].trim().startsWith('|')) {
          const rowCells = splitTopikMarkdownTableRow(lines[index]);
          output.push(
            joinTopikMarkdownTableRow(keepIndices.map(cellIndex => rowCells[cellIndex] || ''))
          );
          index += 1;
        }
        continue;
      }
    }

    output.push(headerLine);
    index += 1;
  }

  return output.join('\n');
}

function sanitizeTopikInlineText(input?: string | null): string {
  if (!input) return '';
  const cleaned = input.replace(TOPIK_PROCESSING_KEYWORD_RE, '').replace(TOPIK_LABEL_RE, '');
  return collapseInlineWhitespace(stripTopikPronunciationMetadata(cleaned));
}

function sanitizeTopikTitleText(input?: string | null): string {
  if (!input) return '';
  let cleaned = sanitizeTopikInlineText(input).replace(TOPIK_ROMANIZATION_BRACKET_RE, '');
  let previous = '';

  while (cleaned !== previous) {
    previous = cleaned;
    cleaned = cleaned
      .replace(/\(\s*[-/\s]*\)/g, '')
      .replace(/（\s*[-/\s]*）/g, '')
      .replace(/\s*([/-])\s*\1+\s*/g, '$1')
      .replace(/\s*-\s*\/\s*/g, '/')
      .replace(TOPIK_EMPTY_PARENS_SUFFIX_RE, '')
      .replace(TOPIK_TRAILING_SEPARATOR_RE, '');
  }

  return collapseInlineWhitespace(cleaned);
}

function sanitizeTopikMarkdownText(input?: string | null): string {
  if (!input) return '';
  const withoutArtifacts = input
    .replace(TOPIK_PROCESSING_KEYWORD_LINE_RE, '$1')
    .replace(TOPIK_PROCESSING_KEYWORD_RE, '')
    .replace(TOPIK_MERGED_MARKER_LINE_RE, '$1')
    .replace(TOPIK_MERGED_FILE_HEADER_RE, '$1')
    .replace(
      /(^|\n)(\s{0,3}#{1,6}\s*)(?:韩语语法点|Korean Grammar Point|Korean Grammar)\s*[:：]\s*/gi,
      '$1$2'
    )
    .replace(/(^|\n)\s*(?:韩语语法点|Korean Grammar Point|Korean Grammar)\s*[:：]\s*/gi, '$1')
    .replace(
      /(^|\n)(\s{0,3}#{1,6}[^\n\r]*?)\s*\[(?=[^\]]{2,90}\])(?=[^\]]*[A-Za-z])[A-Za-z0-9\s/.'"`~-]+\](?=\s*(?:\(|（|$))/g,
      '$1$2'
    )
    .replace(TOPIK_PRONUNCIATION_LINE_RE, '$1')
    .replace(/\n{3,}/g, '\n\n');

  return stripTopikPronunciationTableColumns(
    stripTopikPronunciationMetadata(withoutArtifacts)
  ).trim();
}

function stripMarkdownForSummary(input: string): string {
  return input
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^>\s?/gm, '')
    .replace(/^\|.*\|$/gm, '')
    .replace(/^\s*[-*]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    .replace(/\n{3,}/g, '\n\n');
}

function buildTopikSummaryFromMarkdown(markdown: string, sanitizedTitle?: string): string {
  const title = (sanitizedTitle || '').trim().toLowerCase();
  const lines = stripMarkdownForSummary(markdown)
    .split('\n')
    .map(line => collapseInlineWhitespace(line))
    .filter(Boolean)
    .filter(line => !/^[-=]{3,}$/.test(line))
    .map(line =>
      line.replace(
        /^(?:\d+\.\s*)?(Introduction|简介|Core Grammar Explanation|核心语法解析|Meaning and Usage|含义与用法|Summary and Review|总结与回顾)\s*[:：]?\s*/i,
        ''
      )
    )
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      if (!title) return line;
      const normalized = line.toLowerCase().replace(/\s+/g, ' ').trim();
      if (normalized === title) return '';
      if (!normalized.startsWith(title)) return line;
      return line
        .slice(sanitizedTitle?.length || 0)
        .replace(/^[\s:：,.-]+/, '')
        .trim();
    })
    .filter(Boolean)
    .filter(
      line => !/^(For Action Verbs|For Descriptive Verbs|Examples?|Rules?|Answers?)\b/i.test(line)
    )
    .filter(line => !(!/[.!?。！？]/.test(line) && /[()（）/~]/.test(line) && line.length <= 120))
    .filter(line => line.length >= 16);

  return (lines.find(line => line.length >= 24) || lines[0] || '').slice(0, 420);
}

function hasTopikArtifactIssue(input?: string | null): {
  processingKeyword: boolean;
  labelPrefix: boolean;
  romanization: boolean;
  mergedMarker: boolean;
  noisyTitleSuffix: boolean;
} {
  const value = input || '';
  return {
    processingKeyword: value.match(TOPIK_PROCESSING_KEYWORD_RE) !== null,
    labelPrefix: value.match(TOPIK_LABEL_RE) !== null,
    romanization:
      value.match(TOPIK_ROMANIZATION_BRACKET_RE) !== null ||
      value.match(TOPIK_PRONUNCIATION_PAREN_RE) !== null ||
      value.match(TOPIK_PRONUNCIATION_CLAUSE_RE) !== null ||
      value.match(TOPIK_PRONUNCIATION_LINE_RE) !== null,
    mergedMarker:
      value.match(TOPIK_MERGED_MARKER_LINE_RE) !== null ||
      value.match(TOPIK_MERGED_FILE_HEADER_RE) !== null,
    noisyTitleSuffix:
      value.match(TOPIK_EMPTY_PARENS_SUFFIX_RE) !== null ||
      value.match(TOPIK_TRAILING_SEPARATOR_RE) !== null,
  };
}

const getProgressMapForGrammarIds = async (
  ctx: QueryCtx,
  userId: Id<'users'> | null,
  grammarIds: ReadonlyArray<Id<'grammar_points'>>
): Promise<Map<string, GrammarProgressRecord>> => {
  if (!userId || grammarIds.length === 0) {
    return new Map();
  }

  const progressEntries = await Promise.all(
    uniqueGrammarIds(grammarIds).map(async grammarId => {
      const progress = await ctx.db
        .query('user_grammar_progress')
        .withIndex('by_user_grammar', q => q.eq('userId', userId).eq('grammarId', grammarId))
        .unique();

      return progress ? ([grammarId.toString(), progress] as const) : null;
    })
  );

  const progressMap = new Map<string, GrammarProgressRecord>();
  for (const entry of progressEntries) {
    if (!entry) continue;
    progressMap.set(entry[0], entry[1]);
  }

  return progressMap;
};

function resolveSupportedLanguage(language?: string): SupportedLanguage {
  const normalized = (language || '').trim().toLowerCase();
  if (normalized.startsWith('en')) return 'en';
  if (normalized.startsWith('vi')) return 'vi';
  if (normalized.startsWith('mn')) return 'mn';
  return 'zh';
}

function hasText(value: unknown): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

function hasLocalizedSectionText(
  sections: GrammarSections | undefined,
  language: SupportedLanguage
): boolean {
  if (!sections) return false;
  const values = Object.values(sections);
  return values.some(section => {
    if (!section) return false;
    if (language === 'en') return hasText(section.en);
    if (language === 'vi') return hasText(section.vi);
    if (language === 'mn') return hasText(section.mn);
    return hasText(section.zh);
  });
}

function hasLocalizedQuizText(
  quizItems: GrammarQuizItem[] | undefined,
  language: SupportedLanguage
): boolean {
  if (!quizItems || quizItems.length === 0) return false;
  return quizItems.some(item => {
    const prompt = item.prompt;
    const answer = item.answer;
    if (language === 'en') return hasText(prompt?.en) || hasText(answer?.en);
    if (language === 'vi') return hasText(prompt?.vi) || hasText(answer?.vi);
    if (language === 'mn') return hasText(prompt?.mn) || hasText(answer?.mn);
    return hasText(prompt?.zh) || hasText(answer?.zh);
  });
}

function hasLocalizedExampleText(
  examples: GrammarExample[] | undefined,
  language: SupportedLanguage
): boolean {
  if (!examples || examples.length === 0) return false;
  return examples.some(example => {
    if (language === 'en') return hasText(example.en);
    if (language === 'vi') return hasText(example.vi);
    if (language === 'mn') return hasText(example.mn);
    return hasText(example.cn);
  });
}

function grammarHasLanguageContent(
  grammar: GrammarRecord,
  link:
    | {
        customNote?: string;
        customNoteEn?: string;
        customNoteVi?: string;
        customNoteMn?: string;
      }
    | undefined,
  language: SupportedLanguage
): boolean {
  const sourceLanguage = grammar.sourceMeta?.sourceLanguage;
  if (sourceLanguage && sourceLanguage !== language) return false;

  if (language === 'en') {
    return (
      hasText(grammar.titleEn) ||
      hasText(grammar.summaryEn) ||
      hasText(grammar.explanationEn) ||
      hasLocalizedSectionText(grammar.sections, 'en') ||
      hasLocalizedQuizText(grammar.quizItems, 'en') ||
      hasLocalizedExampleText(grammar.examples, 'en') ||
      hasText(link?.customNoteEn)
    );
  }
  if (language === 'vi') {
    return (
      hasText(grammar.titleVi) ||
      hasText(grammar.summaryVi) ||
      hasText(grammar.explanationVi) ||
      hasLocalizedSectionText(grammar.sections, 'vi') ||
      hasLocalizedQuizText(grammar.quizItems, 'vi') ||
      hasLocalizedExampleText(grammar.examples, 'vi') ||
      hasText(link?.customNoteVi)
    );
  }
  if (language === 'mn') {
    return (
      hasText(grammar.titleMn) ||
      hasText(grammar.summaryMn) ||
      hasText(grammar.explanationMn) ||
      hasLocalizedSectionText(grammar.sections, 'mn') ||
      hasLocalizedQuizText(grammar.quizItems, 'mn') ||
      hasLocalizedExampleText(grammar.examples, 'mn') ||
      hasText(link?.customNoteMn)
    );
  }

  return (
    hasText(grammar.titleZh) ||
    hasText(grammar.summary) ||
    hasText(grammar.explanation) ||
    hasLocalizedSectionText(grammar.sections, 'zh') ||
    hasLocalizedQuizText(grammar.quizItems, 'zh') ||
    hasLocalizedExampleText(grammar.examples, 'zh') ||
    hasText(link?.customNote)
  );
}

function pickLocalizedSummary(grammar: GrammarRecord, language: SupportedLanguage): string {
  const candidates =
    language === 'en'
      ? [grammar.summaryEn, grammar.summary, grammar.summaryVi, grammar.summaryMn]
      : language === 'vi'
        ? [grammar.summaryVi, grammar.summaryEn, grammar.summary, grammar.summaryMn]
        : language === 'mn'
          ? [grammar.summaryMn, grammar.summaryEn, grammar.summary, grammar.summaryVi]
          : [grammar.summary, grammar.summaryEn, grammar.summaryVi, grammar.summaryMn];
  return (candidates.find(hasText) as string | undefined) || '';
}

// Get Grammar stats for sidebar
export const getStats = query({
  args: {
    courseId: v.string(),
    language: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<GrammarStatsDto> => {
    const userId = await getOptionalAuthUserId(ctx);
    const language = resolveSupportedLanguage(args.language);
    let effectiveCourseId = args.courseId;

    const instituteId = ctx.db.normalizeId('institutes', args.courseId);
    let institute = null;
    if (instituteId) {
      institute = await ctx.db.get(instituteId);
    } else {
      institute = await ctx.db
        .query('institutes')
        .withIndex('by_legacy_id', q => q.eq('id', args.courseId))
        .unique();
    }
    if (institute) {
      effectiveCourseId = institute.id || institute._id;
    }
    if (!isVisibleInstitute(institute)) {
      return { total: 0, mastered: 0 };
    }

    // 1. Get all CourseGrammar links for this course
    // OPTIMIZATION: Limit to prevent excessive queries
    const MAX_GRAMMAR_POINTS = 5000;
    const courseGrammars = await ctx.db
      .query('course_grammars')
      .withIndex('by_course_unit', q => q.eq('courseId', effectiveCourseId))
      .take(MAX_GRAMMAR_POINTS);

    const grammarsArray = await Promise.all(courseGrammars.map(link => ctx.db.get(link.grammarId)));
    const visibleLinks = courseGrammars.filter((link, index) => {
      const grammar = grammarsArray[index] as GrammarRecord | null;
      if (!grammar) return false;
      return grammarHasLanguageContent(grammar, link, language);
    });

    if (!userId) return { total: visibleLinks.length, mastered: 0 };

    const progressMap = await getProgressMapForGrammarIds(
      ctx,
      userId,
      visibleLinks.map(link => link.grammarId)
    );

    // Count mastered
    const mastered = [...progressMap.values()].filter(p => p.status === 'MASTERED').length;

    return {
      total: visibleLinks.length,
      mastered,
    };
  },
});

export type GrammarItemDto = {
  id: Id<'grammar_points'>;
  title: string;
  titleEn?: string;
  titleZh?: string;
  titleVi?: string;
  titleMn?: string;
  summary: string;
  unitId: number;
  status: string;
};

// Get all grammars for a course (Student View)
// OPTIMIZATION: Batch query with Map instead of N*2 queries
export const getByCourse = query({
  args: {
    courseId: v.string(),
    language: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<GrammarItemDto[]> => {
    const userId = await getOptionalAuthUserId(ctx);
    const language = resolveSupportedLanguage(args.language);
    let effectiveCourseId = args.courseId;

    const instituteId = ctx.db.normalizeId('institutes', args.courseId);
    let institute = null;
    if (instituteId) {
      institute = await ctx.db.get(instituteId);
    } else {
      institute = await ctx.db
        .query('institutes')
        .withIndex('by_legacy_id', q => q.eq('id', args.courseId))
        .unique();
    }
    if (institute) {
      effectiveCourseId = institute.id || institute._id;
    }
    if (!isVisibleInstitute(institute)) {
      return [];
    }

    const links = await ctx.db
      .query('course_grammars')
      .withIndex('by_course_unit', q => q.eq('courseId', effectiveCourseId))
      .collect();

    // OPTIMIZATION: Batch fetch all grammars and progress
    const grammarIds = uniqueGrammarIds(links.map(link => link.grammarId));
    const grammarsArray = await Promise.all(grammarIds.map(id => ctx.db.get(id)));
    const grammarsMap = new Map(grammarsArray.filter(Boolean).map(g => [g!._id.toString(), g!]));

    const progressMap = await getProgressMapForGrammarIds(ctx, userId, grammarIds);

    // Assemble data in memory
    const results = links.map(link => {
      const grammar = grammarsMap.get(link.grammarId.toString());
      if (!grammar) return null;

      const progress = progressMap.get(link.grammarId.toString());
      const userStatus = progress ? progress.status : 'NOT_STARTED';

      if (!grammarHasLanguageContent(grammar as GrammarRecord, link, language)) {
        return null;
      }

      return {
        id: grammar._id,
        title: grammar.title,
        titleEn: grammar.titleEn,
        titleZh: grammar.titleZh,
        titleVi: grammar.titleVi,
        titleMn: grammar.titleMn,
        summary: pickLocalizedSummary(grammar as GrammarRecord, language),
        unitId: link.unitId,
        status: userStatus,
      };
    });

    return (results.filter(g => g !== null) as GrammarItemDto[]).sort(
      (a, b) => a.unitId - b.unitId
    );
  },
});

export type UnitGrammarDto = {
  id: Id<'grammar_points'>;
  title: string;
  titleEn: string | undefined;
  titleZh: string | undefined;
  titleVi: string | undefined;
  titleMn: string | undefined;
  level: string;
  type: string;
  summary: string;
  summaryEn: string | undefined;
  summaryVi: string | undefined;
  summaryMn: string | undefined;
  explanation: string;
  explanationEn: string | undefined;
  explanationVi: string | undefined;
  explanationMn: string | undefined;
  sections: GrammarSections | undefined;
  quizItems: GrammarQuizItem[] | undefined;
  sourceMeta: GrammarSourceMeta | undefined;
  examples: Array<{
    kr: string;
    cn: string;
    en?: string;
    vi?: string;
    mn?: string;
    audio?: string;
  }>;
  conjugationRules: Record<string, string> | Record<string, string>[] | string[] | undefined;
  createdAt: number;
  updatedAt: number;
  // Course Context
  customNote: string | undefined;
  customNoteEn: string | undefined;
  customNoteVi: string | undefined;
  customNoteMn: string | undefined;
  unitId: number;
  // Progress
  status: string;
  proficiency: number;
};

export const getUnitGrammar = query({
  args: {
    courseId: v.string(),
    unitId: v.number(),
    language: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<UnitGrammarDto[]> => {
    try {
      const userId = await getOptionalAuthUserId(ctx);
      const language = resolveSupportedLanguage(args.language);

      // RESOLVE COURSE ID: Support both Convex ID and Legacy ID
      let effectiveCourseId = args.courseId;
      let effectiveUnitId = args.unitId;

      const instituteId = ctx.db.normalizeId('institutes', args.courseId);
      let institute = null;
      if (instituteId) {
        institute = await ctx.db.get(instituteId);
      } else {
        // Fallback: Try to find by legacy ID
        institute = await ctx.db
          .query('institutes')
          .withIndex('by_legacy_id', q => q.eq('id', args.courseId))
          .unique();
      }

      if (institute) {
        effectiveCourseId = institute.id || institute._id;
      }
      if (!isVisibleInstitute(institute)) {
        return [];
      }

      // SPECIAL HANDLING: Legacy Yonsei 1-2 & new Volume 2 courses
      // The grammar data is stored as Unit 11-20, but frontend requests Unit 1-10
      // Check if it's a Yonsei course and Volume 2
      const isYonsei = institute?.name.includes('연세') || institute?.publisher?.includes('延世');
      const isVolume2 =
        institute?.volume === '2' || institute?.name.includes('2') || institute?.volume === 'II'; // safe checks

      if (
        (effectiveCourseId === 'course_yonsei_1b_appendix' || (isYonsei && isVolume2)) &&
        args.unitId <= 10
      ) {
        effectiveUnitId = args.unitId + 10;
      }

      // 1. Get links
      // OPTIMIZATION: Limit to prevent excessive queries
      const MAX_UNIT_GRAMMAR = 300;
      const courseGrammars = await ctx.db
        .query('course_grammars')
        .withIndex('by_course_unit', q =>
          q.eq('courseId', effectiveCourseId).eq('unitId', effectiveUnitId)
        )
        .take(MAX_UNIT_GRAMMAR);

      // 2. Sort by displayOrder (copy to avoid mutating readonly array)
      const sortedGrammars = [...courseGrammars].sort(
        (a, b) => (a.displayOrder || 0) - (b.displayOrder || 0)
      );

      // 3. OPTIMIZATION: Batch fetch grammars and progress
      const grammarIds = uniqueGrammarIds(sortedGrammars.map(link => link.grammarId));
      const grammarsArray = await Promise.all(grammarIds.map(id => ctx.db.get(id)));
      const grammarsMap = new Map(grammarsArray.filter(Boolean).map(g => [g!._id.toString(), g!]));

      const progressMap = await getProgressMapForGrammarIds(ctx, userId, grammarIds);

      // 4. Assemble data in memory
      const results = sortedGrammars.map(link => {
        const grammar = grammarsMap.get(link.grammarId.toString());
        if (!grammar) return null;
        if (!grammarHasLanguageContent(grammar as GrammarRecord, link, language)) return null;

        const userProgress = progressMap.get(link.grammarId.toString());

        return {
          id: grammar._id,
          title: grammar.title,
          titleEn: grammar.titleEn,
          titleZh: grammar.titleZh,
          titleVi: grammar.titleVi,
          titleMn: grammar.titleMn,
          level: grammar.level,
          type: grammar.type,
          summary: grammar.summary,
          summaryEn: grammar.summaryEn,
          summaryVi: grammar.summaryVi,
          summaryMn: grammar.summaryMn,
          explanation: grammar.explanation,
          explanationEn: grammar.explanationEn,
          explanationVi: grammar.explanationVi,
          explanationMn: grammar.explanationMn,
          sections: grammar.sections,
          quizItems: grammar.quizItems,
          sourceMeta: grammar.sourceMeta,
          examples: grammar.examples,
          conjugationRules: grammar.conjugationRules,
          createdAt: grammar.createdAt,
          updatedAt: grammar.updatedAt,
          // Course Context
          customNote: link.customNote,
          customNoteEn: link.customNoteEn,
          customNoteVi: link.customNoteVi,
          customNoteMn: link.customNoteMn,
          unitId: link.unitId,
          // Progress
          status: userProgress?.status || 'NOT_STARTED',
          proficiency: userProgress?.proficiency || 0,
        };
      });

      return results.filter((g): g is UnitGrammarDto => g !== null);
    } catch (error: unknown) {
      console.error('[getUnitGrammar] Error:', toErrorMessage(error));
      throw error;
    }
  },
});

export const updateStatus = mutation({
  args: {
    grammarId: v.id('grammar_points'),
    status: v.optional(v.string()), // "LEARNING", "MASTERED" - Optional now
    proficiency: v.optional(v.number()), // Direct set
    increment: v.optional(v.number()), // Add to existing
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);

    const { grammarId, status, proficiency, increment } = args;
    const now = Date.now();

    const existing = await ctx.db
      .query('user_grammar_progress')
      .withIndex('by_user_grammar', q => q.eq('userId', userId).eq('grammarId', grammarId))
      .unique();

    let newProficiency = existing?.proficiency || 0;
    let newStatus = existing?.status || 'NEW';

    // 1. Calculate Proficiency
    if (typeof proficiency === 'number') {
      newProficiency = proficiency;
    } else if (typeof increment === 'number') {
      newProficiency = Math.min((existing?.proficiency || 0) + increment, 100);
    }

    // 2. Determine Status behavior
    // 2. Determine Status behavior
    if (status) {
      // Explicit status change (e.g. manual toggle)
      newStatus = status;
      if (status === 'MASTERED') newProficiency = 100;
    } else if (newProficiency >= 100) {
      newStatus = 'MASTERED';
    } else if (newProficiency > 0) {
      newStatus = 'LEARNING';
    }

    if (existing) {
      await ctx.db.patch(existing._id, {
        status: newStatus,
        proficiency: newProficiency,
        lastStudiedAt: now,
      });
    } else {
      await ctx.db.insert('user_grammar_progress', {
        userId,
        grammarId,
        status: newStatus,
        proficiency: newProficiency,
        lastStudiedAt: now,
      });
    }

    return { status: newStatus, proficiency: newProficiency };
  },
});

// Search Grammar (Admin)
export const search = query({
  args: { query: v.string() },
  handler: async (ctx, args): Promise<GrammarItemDto[]> => {
    if (!args.query) return [];
    const results = await ctx.db
      .query('grammar_points')
      .withSearchIndex('search_title', q => q.search('title', args.query))
      .take(20);

    return results.map(g => ({
      id: g._id,
      title: g.title,
      summary: g.summary,
      // Mock these for search results if they don't exist in the search view/context
      unitId: 0,
      status: 'NOT_STARTED',
    }));
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    summary: v.string(),
    explanation: v.string(),
    type: v.string(),
    level: v.string(),
    searchPatterns: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args): Promise<{ id: Id<'grammar_points'> }> => {
    const id = await ctx.db.insert('grammar_points', {
      ...args,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      examples: [],
      conjugationRules: [],
    });
    return { id };
  },
});

export const getByIdInternal = query({
  args: {
    grammarId: v.id('grammar_points'),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.grammarId);
  },
});

export const getAdminById = query({
  args: {
    grammarId: v.id('grammar_points'),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const grammar = await ctx.db.get(args.grammarId);
    if (!grammar) return null;
    return {
      id: grammar._id,
      title: grammar.title,
      searchPatterns: grammar.searchPatterns ?? [],
    };
  },
});

export const updateSearchPatterns = mutation({
  args: {
    grammarId: v.id('grammar_points'),
    searchPatterns: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.patch(args.grammarId, {
      searchPatterns: args.searchPatterns.map(s => s.trim()).filter(Boolean),
      updatedAt: Date.now(),
    });
  },
});

export const updateUnitId = mutation({
  args: {
    courseId: v.string(),
    grammarId: v.id('grammar_points'),
    unitId: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('course_grammars')
      .withIndex('by_course_unit') // We can also use a filter if we dont have by_course_grammar
      .filter(
        q => q.eq(q.field('courseId'), args.courseId) && q.eq(q.field('grammarId'), args.grammarId)
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, { unitId: args.unitId });
      return existing._id;
    }

    // If doesn't exist, create it
    return await ctx.db.insert('course_grammars', {
      courseId: args.courseId,
      unitId: args.unitId,
      grammarId: args.grammarId,
      displayOrder: 0,
    });
  },
});

export const removeFromUnit = mutation({
  args: {
    courseId: v.string(),
    unitId: v.number(),
    grammarId: v.id('grammar_points'),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('course_grammars')
      .withIndex('by_course_unit', q => q.eq('courseId', args.courseId).eq('unitId', args.unitId))
      .filter(q => q.eq(q.field('grammarId'), args.grammarId))
      .unique();

    if (existing) {
      await ctx.db.delete(existing._id);
    }
  },
});

// Delete All Grammars (Admin) - for cleanup
export const deleteAllGrammars = mutation({
  args: {},
  handler: async ctx => {
    await requireAdmin(ctx);

    // Delete all course_grammars links
    const links = await ctx.db.query('course_grammars').collect();
    for (const link of links) {
      await ctx.db.delete(link._id);
    }

    // Delete all grammar_points
    const grammars = await ctx.db.query('grammar_points').collect();
    for (const grammar of grammars) {
      await ctx.db.delete(grammar._id);
    }

    return {
      deletedGrammars: grammars.length,
      deletedLinks: links.length,
    };
  },
});

// Bulk Import Grammar (Admin)
export const bulkImport = mutation({
  args: {
    items: v.array(
      v.object({
        title: v.string(),
        // Chinese (default)
        summary: v.optional(v.string()),
        explanation: v.optional(v.string()),
        // Multi-language
        summaryEn: v.optional(v.string()),
        summaryVi: v.optional(v.string()),
        summaryMn: v.optional(v.string()),
        explanationEn: v.optional(v.string()),
        explanationVi: v.optional(v.string()),
        explanationMn: v.optional(v.string()),
        // Examples and rules
        examples: v.optional(
          v.union(
            v.string(),
            v.array(
              v.object({
                kr: v.string(),
                cn: v.string(),
                en: v.optional(v.string()),
                vi: v.optional(v.string()),
                mn: v.optional(v.string()),
                audio: v.optional(v.string()),
              })
            )
          )
        ),
        conjugationRules: v.optional(
          v.union(
            v.record(v.string(), v.string()),
            v.array(v.string()),
            v.array(v.record(v.string(), v.string()))
          )
        ),
        searchPatterns: v.optional(v.union(v.string(), v.array(v.string()))),
        // Course context
        courseId: v.string(),
        unitId: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    let successCount = 0;
    let failedCount = 0;
    let newGrammarCount = 0;
    const errors: string[] = [];

    for (const item of args.items) {
      const result = await processImportItem(ctx, item);
      if (result.success) {
        successCount++;
        if (result.isNew) newGrammarCount++;
      } else {
        failedCount++;
        if (result.error) errors.push(`${item.title}: ${result.error}`);
      }
    }

    return {
      success: true,
      results: {
        success: successCount,
        failed: failedCount,
        newGrammars: newGrammarCount,
        errors,
      },
    };
  },
});

// --- Helper Functions ---

interface ImportGrammarItem {
  title: string;
  courseId: string;
  unitId: number;
  summary?: string;
  explanation?: string;
  summaryEn?: string;
  summaryVi?: string;
  summaryMn?: string;
  explanationEn?: string;
  explanationVi?: string;
  explanationMn?: string;
  examples?: unknown;
  conjugationRules?: unknown;
  searchPatterns?: string | string[];
}

interface ImportResult {
  success: boolean;
  isNew: boolean;
  error?: string;
}

// Extracted helper function to reduce Cognitive Complexity of bulkImport
async function processImportItem(ctx: MutationCtx, item: ImportGrammarItem): Promise<ImportResult> {
  try {
    // 1. Get current course's publisher
    const currentCourse = await ctx.db
      .query('institutes')
      .withIndex('by_legacy_id', q => q.eq('id', item.courseId))
      .unique();
    if (!isVisibleInstitute(currentCourse)) {
      return { success: false, isNew: false, error: 'COURSE_NOT_FOUND_OR_ARCHIVED' };
    }
    const currentPublisher = currentCourse?.publisher || currentCourse?.name || 'unknown';

    // 2. Find all grammars with similar titles (base title without #N suffix)
    const baseTitle = item.title.replace(/ #\d+$/, '').trim();
    const allGrammars = (await ctx.db.query('grammar_points').collect()) as GrammarRecord[];

    // Filter grammars that match the base title
    const matchingGrammars = allGrammars.filter(g => {
      const gBaseTitle = g.title.replace(/ #\d+$/, '').trim();
      return gBaseTitle === baseTitle;
    });

    let grammarId: Id<'grammar_points'> | null = null;
    const { reuseGrammar, shouldCreateNew } = (await determineGrammarAction(
      ctx,
      matchingGrammars,
      currentPublisher
    )) as {
      reuseGrammar: GrammarRecord | null;
      shouldCreateNew: boolean;
    };
    const resolvedReuseGrammar: GrammarRecord | null = reuseGrammar;

    // Parse examples if it's a string
    const examples = parseExamples(item.examples);

    // Parse conjugationRules if it's a string
    const conjugationRules = parseConjugationRules(item.conjugationRules);

    const searchPatterns = parseSearchPatterns(item.searchPatterns);

    let isNew = false;

    if (shouldCreateNew) {
      // Determine title with suffix if needed
      let finalTitle = item.title;
      if (matchingGrammars.length > 0) {
        // Find the highest existing suffix number
        const suffixNumbers = matchingGrammars.map(g => {
          const match = / #(\d+)$/.exec(g.title);
          return match ? Number.parseInt(match[1], 10) : 1;
        });
        const maxNumber = Math.max(...suffixNumbers, 1);
        finalTitle = `${baseTitle} #${maxNumber + 1}`;
      }

      // Create new grammar
      grammarId = await ctx.db.insert('grammar_points', {
        title: finalTitle,
        level: 'Beginner',
        type: 'GRAMMAR',
        summary: item.summary || '',
        summaryEn: item.summaryEn,
        summaryVi: item.summaryVi,
        summaryMn: item.summaryMn,
        explanation: item.explanation || '',
        explanationEn: item.explanationEn,
        explanationVi: item.explanationVi,
        explanationMn: item.explanationMn,
        examples: examples || [],
        conjugationRules: conjugationRules ?? [],
        searchPatterns,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      isNew = true;
    } else if (resolvedReuseGrammar) {
      // Reuse existing grammar from different publisher
      grammarId = resolvedReuseGrammar._id;
      // Optionally update with new content if provided
      await ctx.db.patch(resolvedReuseGrammar._id, {
        summary: item.summary || resolvedReuseGrammar.summary,
        summaryEn: item.summaryEn ?? resolvedReuseGrammar.summaryEn,
        summaryVi: item.summaryVi ?? resolvedReuseGrammar.summaryVi,
        summaryMn: item.summaryMn ?? resolvedReuseGrammar.summaryMn,
        explanation: item.explanation || resolvedReuseGrammar.explanation,
        explanationEn: item.explanationEn ?? resolvedReuseGrammar.explanationEn,
        explanationVi: item.explanationVi ?? resolvedReuseGrammar.explanationVi,
        explanationMn: item.explanationMn ?? resolvedReuseGrammar.explanationMn,
        examples: examples || resolvedReuseGrammar.examples,
        conjugationRules: conjugationRules ?? resolvedReuseGrammar.conjugationRules,
        searchPatterns: searchPatterns ?? resolvedReuseGrammar.searchPatterns,
        updatedAt: Date.now(),
      });
    }

    if (!grammarId) {
      return { success: false, isNew: false, error: 'Failed to resolve grammarId' };
    }

    // 2. Link to course unit (upsert)
    const existingLink = await ctx.db
      .query('course_grammars')
      .withIndex('by_course_unit', q => q.eq('courseId', item.courseId).eq('unitId', item.unitId))
      .filter(q => q.eq(q.field('grammarId'), grammarId))
      .unique();

    if (!existingLink) {
      // Get max display order for this unit
      const unitGrammars = await ctx.db
        .query('course_grammars')
        .withIndex('by_course_unit', q => q.eq('courseId', item.courseId).eq('unitId', item.unitId))
        .collect();
      const maxOrder = unitGrammars.reduce((max, g) => Math.max(max, g.displayOrder || 0), 0);

      await ctx.db.insert('course_grammars', {
        courseId: item.courseId,
        unitId: item.unitId,
        grammarId,
        displayOrder: maxOrder + 1,
      });
    }

    return { success: true, isNew };
  } catch (e: unknown) {
    return { success: false, isNew: false, error: toErrorMessage(e) };
  }
}

async function determineGrammarAction(
  ctx: MutationCtx,
  matchingGrammars: GrammarRecord[],
  currentPublisher: string
) {
  let reuseGrammar: GrammarRecord | null = null;
  let shouldCreateNew = false;

  if (matchingGrammars.length === 0) {
    shouldCreateNew = true;
  } else {
    for (const grammar of matchingGrammars) {
      const { usedBySamePublisher, usedByDifferentPublisher, isUnused } = await checkUsage(
        ctx,
        grammar._id,
        currentPublisher
      );

      if (!usedBySamePublisher && usedByDifferentPublisher && !reuseGrammar) {
        reuseGrammar = grammar;
      }
      if (isUnused && !reuseGrammar) {
        reuseGrammar = grammar;
      }
    }

    if (!reuseGrammar) {
      shouldCreateNew = true;
    }
  }

  return { reuseGrammar, shouldCreateNew };
}

// Helper for complexity reduction
async function checkUsage(
  ctx: MutationCtx,
  grammarId: Id<'grammar_points'>,
  currentPublisher: string
) {
  const links = await ctx.db
    .query('course_grammars')
    .filter(q => q.eq(q.field('grammarId'), grammarId))
    .collect();

  let usedBySamePublisher = false;
  let usedByDifferentPublisher = false;

  for (const link of links) {
    const linkedCourse = await ctx.db
      .query('institutes')
      .withIndex('by_legacy_id', q => q.eq('id', link.courseId))
      .unique();
    if (!isVisibleInstitute(linkedCourse)) {
      continue;
    }
    const linkedPublisher = linkedCourse?.publisher || linkedCourse?.name || 'unknown';

    if (linkedPublisher === currentPublisher) {
      usedBySamePublisher = true;
    } else {
      usedByDifferentPublisher = true;
    }
  }

  return { usedBySamePublisher, usedByDifferentPublisher, isUnused: links.length === 0 };
}

function parseExamples(examples: unknown): GrammarExample[] {
  if (typeof examples === 'string') {
    try {
      return JSON.parse(examples);
    } catch {
      return [{ kr: examples, cn: '' }];
    }
  }
  return (examples as GrammarExample[]) || [];
}

function parseConjugationRules(rules: unknown): ParsedConjugationRules {
  if (typeof rules === 'string') {
    try {
      const parsed = JSON.parse(rules) as unknown;
      if (Array.isArray(parsed)) return parsed as ParsedConjugationRules;
      return [];
    } catch {
      return [];
    }
  }
  if (Array.isArray(rules)) return rules as ParsedConjugationRules;
  return [];
}

function parseSearchPatterns(patterns: string | string[] | undefined): string[] | undefined {
  if (Array.isArray(patterns)) {
    return patterns.map(s => s.trim()).filter(Boolean);
  } else if (typeof patterns === 'string') {
    const parts = patterns
      .split(/[\n,]+/)
      .map(s => s.trim())
      .filter(Boolean);
    if (parts.length > 0) return parts;
  }
  return undefined;
}

export const updateSections = mutation({
  args: {
    id: v.id('grammar_points'),
    sections: v.any(),
  },
  handler: async (ctx, args) => {
    // Force bypass validation by patching directly
    await ctx.db.patch(args.id, { sections: args.sections });
  },
});

const LocalizedTextInputValidator = v.object({
  zh: v.optional(v.string()),
  en: v.optional(v.string()),
  vi: v.optional(v.string()),
  mn: v.optional(v.string()),
});

const GrammarSectionsInputValidator = v.object({
  introduction: v.optional(LocalizedTextInputValidator),
  core: v.optional(LocalizedTextInputValidator),
  comparative: v.optional(LocalizedTextInputValidator),
  cultural: v.optional(LocalizedTextInputValidator),
  commonMistakes: v.optional(LocalizedTextInputValidator),
  review: v.optional(LocalizedTextInputValidator),
});

const GrammarSourceMetaInputValidator = v.object({
  sourceType: v.string(),
  sourcePath: v.optional(v.string()),
  sourceUrl: v.optional(v.string()),
  checksum: v.optional(v.string()),
  parserVersion: v.optional(v.string()),
  sourceLanguage: v.optional(
    v.union(v.literal('zh'), v.literal('en'), v.literal('vi'), v.literal('mn'))
  ),
  grammarKey: v.optional(v.string()),
  categoryStatus: v.optional(v.union(v.literal('AUTO_OK'), v.literal('NEEDS_REVIEW'))),
  categoryConfidence: v.optional(v.number()),
  categoryReason: v.optional(v.string()),
  categoryEvidence: v.optional(v.string()),
  importedAt: v.number(),
});

const GrammarExampleInputValidator = v.object({
  kr: v.string(),
  cn: v.string(),
  en: v.optional(v.string()),
  vi: v.optional(v.string()),
  mn: v.optional(v.string()),
  audio: v.optional(v.string()),
});

export const adminBulkUpsertContent = mutation({
  args: {
    courseId: v.string(),
    createIfMissing: v.optional(v.boolean()),
    items: v.array(
      v.object({
        title: v.string(),
        unitId: v.number(),
        displayOrder: v.optional(v.number()),
        type: v.optional(v.string()),
        level: v.optional(v.string()),
        titleEn: v.optional(v.string()),
        titleZh: v.optional(v.string()),
        titleVi: v.optional(v.string()),
        titleMn: v.optional(v.string()),
        summary: v.optional(v.string()),
        summaryEn: v.optional(v.string()),
        summaryVi: v.optional(v.string()),
        summaryMn: v.optional(v.string()),
        explanation: v.optional(v.string()),
        explanationEn: v.optional(v.string()),
        explanationVi: v.optional(v.string()),
        explanationMn: v.optional(v.string()),
        sections: v.optional(GrammarSectionsInputValidator),
        sourceMeta: v.optional(GrammarSourceMetaInputValidator),
        examples: v.optional(v.array(GrammarExampleInputValidator)),
      })
    ),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const createIfMissing = args.createIfMissing === true;
    const errors: string[] = [];
    let updated = 0;
    let created = 0;
    let skipped = 0;
    let linked = 0;

    const existingCourseLinks = await ctx.db
      .query('course_grammars')
      .withIndex('by_course_unit', q => q.eq('courseId', args.courseId))
      .collect();

    const linkByGrammarId = new Map<string, (typeof existingCourseLinks)[number]>();
    const maxDisplayByUnit = new Map<number, number>();
    for (const link of existingCourseLinks) {
      const key = link.grammarId.toString();
      if (!linkByGrammarId.has(key)) {
        linkByGrammarId.set(key, link);
      }
      const current = maxDisplayByUnit.get(link.unitId) ?? 0;
      maxDisplayByUnit.set(link.unitId, Math.max(current, link.displayOrder || 0));
    }

    const normalizeLocalizedText = (value?: {
      zh?: string;
      en?: string;
      vi?: string;
      mn?: string;
    }) => {
      if (!value) return undefined;
      const next = {
        zh: value.zh?.trim() || undefined,
        en: value.en?.trim() || undefined,
        vi: value.vi?.trim() || undefined,
        mn: value.mn?.trim() || undefined,
      };
      return next.zh || next.en || next.vi || next.mn ? next : undefined;
    };

    for (const item of args.items) {
      try {
        const title = item.title.trim();
        if (!title) {
          skipped++;
          errors.push('Skipped empty title item');
          continue;
        }

        const existing = await ctx.db
          .query('grammar_points')
          .withIndex('by_title', q => q.eq('title', title))
          .unique();

        let grammarId: Id<'grammar_points'>;

        if (!existing) {
          if (!createIfMissing) {
            skipped++;
            errors.push(`Not found by title: ${title}`);
            continue;
          }

          grammarId = await ctx.db.insert('grammar_points', {
            title,
            titleEn: item.titleEn?.trim() || undefined,
            titleZh: item.titleZh?.trim() || undefined,
            titleVi: item.titleVi?.trim() || undefined,
            titleMn: item.titleMn?.trim() || undefined,
            type: item.type?.trim() || 'GRAMMAR',
            level: item.level?.trim() || 'TOPIK',
            summary: item.summary?.trim() || '',
            summaryEn: item.summaryEn?.trim() || undefined,
            summaryVi: item.summaryVi?.trim() || undefined,
            summaryMn: item.summaryMn?.trim() || undefined,
            explanation: item.explanation?.trim() || '',
            explanationEn: item.explanationEn?.trim() || undefined,
            explanationVi: item.explanationVi?.trim() || undefined,
            explanationMn: item.explanationMn?.trim() || undefined,
            sections: item.sections
              ? ({
                  introduction: normalizeLocalizedText(item.sections.introduction),
                  core: normalizeLocalizedText(item.sections.core),
                  comparative: normalizeLocalizedText(item.sections.comparative),
                  cultural: normalizeLocalizedText(item.sections.cultural),
                  commonMistakes: normalizeLocalizedText(item.sections.commonMistakes),
                  review: normalizeLocalizedText(item.sections.review),
                } as const)
              : undefined,
            sourceMeta: item.sourceMeta
              ? {
                  sourceType: item.sourceMeta.sourceType.trim(),
                  sourcePath: item.sourceMeta.sourcePath?.trim() || undefined,
                  sourceUrl: item.sourceMeta.sourceUrl?.trim() || undefined,
                  checksum: item.sourceMeta.checksum?.trim() || undefined,
                  parserVersion: item.sourceMeta.parserVersion?.trim() || undefined,
                  sourceLanguage: item.sourceMeta.sourceLanguage,
                  grammarKey: item.sourceMeta.grammarKey?.trim() || undefined,
                  categoryStatus: item.sourceMeta.categoryStatus,
                  categoryConfidence: item.sourceMeta.categoryConfidence,
                  categoryReason: item.sourceMeta.categoryReason?.trim() || undefined,
                  categoryEvidence: item.sourceMeta.categoryEvidence?.trim() || undefined,
                  importedAt: item.sourceMeta.importedAt,
                }
              : undefined,
            examples:
              item.examples?.map(example => ({
                kr: example.kr.trim(),
                cn: example.cn.trim(),
                en: example.en?.trim() || undefined,
                vi: example.vi?.trim() || undefined,
                mn: example.mn?.trim() || undefined,
                audio: example.audio?.trim() || undefined,
              })) || [],
            searchPatterns: [],
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });
          created++;
        } else {
          grammarId = existing._id;

          const patchPayload: Record<string, unknown> = {
            updatedAt: Date.now(),
          };

          if (item.titleEn !== undefined) patchPayload.titleEn = item.titleEn.trim() || undefined;
          if (item.titleZh !== undefined) patchPayload.titleZh = item.titleZh.trim() || undefined;
          if (item.titleVi !== undefined) patchPayload.titleVi = item.titleVi.trim() || undefined;
          if (item.titleMn !== undefined) patchPayload.titleMn = item.titleMn.trim() || undefined;
          if (item.summary !== undefined) patchPayload.summary = item.summary.trim();
          if (item.summaryEn !== undefined)
            patchPayload.summaryEn = item.summaryEn.trim() || undefined;
          if (item.summaryVi !== undefined)
            patchPayload.summaryVi = item.summaryVi.trim() || undefined;
          if (item.summaryMn !== undefined)
            patchPayload.summaryMn = item.summaryMn.trim() || undefined;
          if (item.explanation !== undefined) patchPayload.explanation = item.explanation.trim();
          if (item.explanationEn !== undefined)
            patchPayload.explanationEn = item.explanationEn.trim() || undefined;
          if (item.explanationVi !== undefined)
            patchPayload.explanationVi = item.explanationVi.trim() || undefined;
          if (item.explanationMn !== undefined)
            patchPayload.explanationMn = item.explanationMn.trim() || undefined;
          if (item.type !== undefined) patchPayload.type = item.type.trim() || existing.type;
          if (item.level !== undefined) patchPayload.level = item.level.trim() || existing.level;

          if (item.sections !== undefined) {
            patchPayload.sections = {
              introduction: normalizeLocalizedText(item.sections.introduction),
              core: normalizeLocalizedText(item.sections.core),
              comparative: normalizeLocalizedText(item.sections.comparative),
              cultural: normalizeLocalizedText(item.sections.cultural),
              commonMistakes: normalizeLocalizedText(item.sections.commonMistakes),
              review: normalizeLocalizedText(item.sections.review),
            };
          }

          if (item.sourceMeta !== undefined) {
            patchPayload.sourceMeta = {
              sourceType: item.sourceMeta.sourceType.trim(),
              sourcePath: item.sourceMeta.sourcePath?.trim() || undefined,
              sourceUrl: item.sourceMeta.sourceUrl?.trim() || undefined,
              checksum: item.sourceMeta.checksum?.trim() || undefined,
              parserVersion: item.sourceMeta.parserVersion?.trim() || undefined,
              sourceLanguage: item.sourceMeta.sourceLanguage,
              grammarKey: item.sourceMeta.grammarKey?.trim() || undefined,
              categoryStatus: item.sourceMeta.categoryStatus,
              categoryConfidence: item.sourceMeta.categoryConfidence,
              categoryReason: item.sourceMeta.categoryReason?.trim() || undefined,
              categoryEvidence: item.sourceMeta.categoryEvidence?.trim() || undefined,
              importedAt: item.sourceMeta.importedAt,
            };
          }

          if (item.examples !== undefined) {
            patchPayload.examples = item.examples.map(example => ({
              kr: example.kr.trim(),
              cn: example.cn.trim(),
              en: example.en?.trim() || undefined,
              vi: example.vi?.trim() || undefined,
              mn: example.mn?.trim() || undefined,
              audio: example.audio?.trim() || undefined,
            }));
          }

          await ctx.db.patch(grammarId, patchPayload);
          updated++;
        }

        const linkKey = grammarId.toString();
        const existingLink = linkByGrammarId.get(linkKey);
        if (existingLink) {
          const patchLink: { unitId?: number; displayOrder?: number } = {};
          if (existingLink.unitId !== item.unitId) {
            patchLink.unitId = item.unitId;
          }
          if (item.displayOrder !== undefined && existingLink.displayOrder !== item.displayOrder) {
            patchLink.displayOrder = item.displayOrder;
          }
          if (Object.keys(patchLink).length > 0) {
            await ctx.db.patch(existingLink._id, patchLink);
          }
        } else {
          const nextOrder = item.displayOrder ?? (maxDisplayByUnit.get(item.unitId) ?? 0) + 1;
          const linkId = await ctx.db.insert('course_grammars', {
            courseId: args.courseId,
            unitId: item.unitId,
            grammarId,
            displayOrder: nextOrder,
          });
          linkByGrammarId.set(linkKey, {
            _id: linkId,
            _creationTime: Date.now(),
            courseId: args.courseId,
            unitId: item.unitId,
            grammarId,
            displayOrder: nextOrder,
          });
          maxDisplayByUnit.set(
            item.unitId,
            Math.max(maxDisplayByUnit.get(item.unitId) ?? 0, nextOrder)
          );
          linked++;
        }
      } catch (error) {
        skipped++;
        errors.push(`${item.title}: ${toErrorMessage(error)}`);
      }
    }

    return {
      success: true,
      updated,
      created,
      linked,
      skipped,
      errors: errors.slice(0, 80),
    };
  },
});

export const adminClearCourseGrammarLinks = mutation({
  args: {
    courseId: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const links = await ctx.db
      .query('course_grammars')
      .withIndex('by_course_unit', q => q.eq('courseId', args.courseId))
      .collect();

    for (const link of links) {
      await ctx.db.delete(link._id);
    }

    return {
      success: true,
      courseId: args.courseId,
      deleted: links.length,
    };
  },
});

const TopikLanguageValidator = v.union(
  v.literal('zh'),
  v.literal('en'),
  v.literal('vi'),
  v.literal('mn')
);

const TopikImportItemValidator = v.object({
  title: v.string(),
  titleEn: v.optional(v.string()),
  titleZh: v.optional(v.string()),
  titleVi: v.optional(v.string()),
  titleMn: v.optional(v.string()),
  summary: v.optional(v.string()),
  summaryEn: v.optional(v.string()),
  summaryVi: v.optional(v.string()),
  summaryMn: v.optional(v.string()),
  explanation: v.optional(v.string()),
  explanationEn: v.optional(v.string()),
  explanationVi: v.optional(v.string()),
  explanationMn: v.optional(v.string()),
  grammarKey: v.optional(v.string()),
  sourcePath: v.optional(v.string()),
  checksum: v.optional(v.string()),
  categoryId: v.optional(v.number()),
  categoryConfidence: v.optional(v.number()),
  categoryStatus: v.optional(v.union(v.literal('AUTO_OK'), v.literal('NEEDS_REVIEW'))),
  categoryReason: v.optional(v.string()),
  categoryEvidence: v.optional(v.string()),
});

export const adminPreserveTopikViMnSnapshot = mutation({
  args: {
    courseId: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const pickViMnSection = (section: unknown) => {
      if (!section || typeof section !== 'object') return undefined;
      const record = section as Record<string, unknown>;
      const vi = typeof record.vi === 'string' && record.vi.trim() ? record.vi : undefined;
      const mn = typeof record.mn === 'string' && record.mn.trim() ? record.mn : undefined;
      if (!vi && !mn) return undefined;
      return { vi, mn };
    };

    const pickSectionsViMn = (sections: unknown) => {
      if (!sections || typeof sections !== 'object') return undefined;
      const raw = sections as Record<string, unknown>;
      const result: Record<string, { vi?: string; mn?: string }> = {};
      for (const key of [
        'introduction',
        'core',
        'comparative',
        'cultural',
        'commonMistakes',
        'review',
      ]) {
        const normalized = pickViMnSection(raw[key]);
        if (normalized) result[key] = normalized;
      }
      return Object.keys(result).length > 0 ? result : undefined;
    };

    const pickQuizViMn = (quizItems: unknown) => {
      if (!Array.isArray(quizItems)) return undefined;
      const result = quizItems
        .map(raw => {
          if (!raw || typeof raw !== 'object') return null;
          const item = raw as Record<string, unknown>;
          const prompt = pickViMnSection(item.prompt);
          const answer = pickViMnSection(item.answer);
          if (!prompt && !answer) return null;
          return {
            prompt: prompt || {},
            answer: answer || undefined,
          };
        })
        .filter(Boolean);
      return result.length > 0 ? result : undefined;
    };

    const pickExamplesViMn = (examples: unknown) => {
      if (!Array.isArray(examples)) return undefined;
      const result = examples
        .map(raw => {
          if (!raw || typeof raw !== 'object') return null;
          const example = raw as Record<string, unknown>;
          const vi = typeof example.vi === 'string' && example.vi.trim() ? example.vi : undefined;
          const mn = typeof example.mn === 'string' && example.mn.trim() ? example.mn : undefined;
          if (!vi && !mn) return null;
          const kr = typeof example.kr === 'string' ? example.kr : '';
          return { kr, vi, mn };
        })
        .filter(Boolean);
      return result.length > 0 ? result : undefined;
    };

    const links = await ctx.db
      .query('course_grammars')
      .withIndex('by_course_unit', q => q.eq('courseId', args.courseId))
      .collect();

    const snapshot = [];
    for (const link of links) {
      const grammar = await ctx.db.get(link.grammarId);
      if (!grammar) continue;

      const hasViOrMn =
        hasText(grammar.titleVi) ||
        hasText(grammar.titleMn) ||
        hasText(grammar.summaryVi) ||
        hasText(grammar.summaryMn) ||
        hasText(grammar.explanationVi) ||
        hasText(grammar.explanationMn) ||
        hasLocalizedSectionText(grammar.sections as GrammarSections | undefined, 'vi') ||
        hasLocalizedSectionText(grammar.sections as GrammarSections | undefined, 'mn') ||
        hasLocalizedQuizText(grammar.quizItems as GrammarQuizItem[] | undefined, 'vi') ||
        hasLocalizedQuizText(grammar.quizItems as GrammarQuizItem[] | undefined, 'mn') ||
        hasLocalizedExampleText(grammar.examples as GrammarExample[] | undefined, 'vi') ||
        hasLocalizedExampleText(grammar.examples as GrammarExample[] | undefined, 'mn') ||
        hasText(link.customNoteVi) ||
        hasText(link.customNoteMn);

      if (!hasViOrMn) continue;

      snapshot.push({
        linkId: link._id,
        grammarId: grammar._id,
        title: grammar.title,
        titleVi: grammar.titleVi,
        titleMn: grammar.titleMn,
        summaryVi: grammar.summaryVi,
        summaryMn: grammar.summaryMn,
        explanationVi: grammar.explanationVi,
        explanationMn: grammar.explanationMn,
        sections: pickSectionsViMn(grammar.sections),
        quizItems: pickQuizViMn(grammar.quizItems),
        examples: pickExamplesViMn(grammar.examples),
        customNoteVi: link.customNoteVi,
        customNoteMn: link.customNoteMn,
        unitId: link.unitId,
        sourceMeta: grammar.sourceMeta
          ? {
              sourceType: grammar.sourceMeta.sourceType,
              sourcePath: grammar.sourceMeta.sourcePath,
              checksum: grammar.sourceMeta.checksum,
              sourceLanguage: grammar.sourceMeta.sourceLanguage,
              importedAt: grammar.sourceMeta.importedAt,
            }
          : undefined,
      });
    }

    return {
      success: true,
      courseId: args.courseId,
      count: snapshot.length,
      snapshot,
    };
  },
});

export const adminResetTopikCourseLinks = mutation({
  args: {
    courseId: v.string(),
    deleteOrphanGrammars: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const links = await ctx.db
      .query('course_grammars')
      .withIndex('by_course_unit', q => q.eq('courseId', args.courseId))
      .collect();

    const grammarIds = uniqueGrammarIds(links.map(link => link.grammarId));
    for (const link of links) {
      await ctx.db.delete(link._id);
    }

    let deletedOrphans = 0;
    if (args.deleteOrphanGrammars === true) {
      for (const grammarId of grammarIds) {
        const remainingLinks = await ctx.db
          .query('course_grammars')
          .filter(q => q.eq(q.field('grammarId'), grammarId))
          .take(1);
        if (remainingLinks.length > 0) continue;
        await ctx.db.delete(grammarId);
        deletedOrphans++;
      }
    }

    return {
      success: true,
      courseId: args.courseId,
      deletedLinks: links.length,
      deletedOrphans,
    };
  },
});

export const adminImportTopikMarkdownByLanguage = mutation({
  args: {
    courseId: v.string(),
    language: TopikLanguageValidator,
    items: v.array(TopikImportItemValidator),
    defaultCategoryId: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const defaultCategoryId = Math.min(15, Math.max(1, Math.floor(args.defaultCategoryId ?? 15)));
    const now = Date.now();
    const links = await ctx.db
      .query('course_grammars')
      .withIndex('by_course_unit', q => q.eq('courseId', args.courseId))
      .collect();

    const maxDisplayByUnit = new Map<number, number>();
    for (const link of links) {
      const current = maxDisplayByUnit.get(link.unitId) ?? 0;
      maxDisplayByUnit.set(link.unitId, Math.max(current, link.displayOrder || 0));
    }

    let created = 0;
    let linked = 0;
    const errors: string[] = [];

    for (const item of args.items) {
      try {
        const title = item.title.trim();
        if (!title) {
          errors.push('Skipped empty title');
          continue;
        }

        const categoryId = Math.min(
          15,
          Math.max(1, Math.floor(item.categoryId ?? defaultCategoryId))
        );

        const grammarId = await ctx.db.insert('grammar_points', {
          title,
          titleEn: item.titleEn?.trim() || undefined,
          titleZh: item.titleZh?.trim() || undefined,
          titleVi: item.titleVi?.trim() || undefined,
          titleMn: item.titleMn?.trim() || undefined,
          type: 'GRAMMAR',
          level: 'TOPIK',
          summary: item.summary?.trim() || '',
          summaryEn: item.summaryEn?.trim() || undefined,
          summaryVi: item.summaryVi?.trim() || undefined,
          summaryMn: item.summaryMn?.trim() || undefined,
          explanation: item.explanation?.trim() || '',
          explanationEn: item.explanationEn?.trim() || undefined,
          explanationVi: item.explanationVi?.trim() || undefined,
          explanationMn: item.explanationMn?.trim() || undefined,
          sections: undefined,
          quizItems: undefined,
          sourceMeta: {
            sourceType: 'topik_markdown_rebuild',
            sourcePath: item.sourcePath?.trim() || undefined,
            checksum: item.checksum?.trim() || undefined,
            parserVersion: 'v2-semantic-rebuild',
            sourceLanguage: args.language,
            grammarKey: item.grammarKey?.trim() || undefined,
            categoryStatus: item.categoryStatus ?? 'NEEDS_REVIEW',
            categoryConfidence: item.categoryConfidence,
            categoryReason: item.categoryReason?.trim() || undefined,
            categoryEvidence: item.categoryEvidence?.trim() || undefined,
            importedAt: now,
          },
          examples: [],
          searchPatterns: [],
          createdAt: now,
          updatedAt: now,
        });
        created++;

        const nextOrder = (maxDisplayByUnit.get(categoryId) ?? 0) + 1;
        await ctx.db.insert('course_grammars', {
          courseId: args.courseId,
          unitId: categoryId,
          grammarId,
          displayOrder: nextOrder,
        });
        maxDisplayByUnit.set(categoryId, nextOrder);
        linked++;
      } catch (error) {
        errors.push(`${item.title}: ${toErrorMessage(error)}`);
      }
    }

    return {
      success: true,
      courseId: args.courseId,
      language: args.language,
      created,
      linked,
      errors: errors.slice(0, 120),
    };
  },
});

export const adminListCourseGrammarRecords = query({
  args: {
    courseId: v.string(),
    language: v.optional(TopikLanguageValidator),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const language = args.language ? resolveSupportedLanguage(args.language) : null;
    const limit = Math.max(1, Math.min(1000, Math.floor(args.limit ?? 300)));
    const offset = Math.max(0, Math.floor(args.offset ?? 0));

    const links = await ctx.db
      .query('course_grammars')
      .withIndex('by_course_unit', q => q.eq('courseId', args.courseId))
      .collect();

    const sorted = [...links].sort((a, b) => {
      if (a.unitId !== b.unitId) return a.unitId - b.unitId;
      return (a.displayOrder || 0) - (b.displayOrder || 0);
    });
    const sliced = sorted.slice(offset, offset + limit);

    const rows = [];
    for (const link of sliced) {
      const grammar = (await ctx.db.get(link.grammarId)) as GrammarRecord | null;
      if (!grammar) continue;
      if (language && !grammarHasLanguageContent(grammar, link, language)) continue;
      rows.push({
        linkId: link._id,
        grammarId: grammar._id,
        unitId: link.unitId,
        displayOrder: link.displayOrder,
        title: grammar.title,
        titleEn: grammar.titleEn,
        titleZh: grammar.titleZh,
        summary: grammar.summary,
        summaryEn: grammar.summaryEn,
        explanation: grammar.explanation,
        explanationEn: grammar.explanationEn,
        sourceMeta: grammar.sourceMeta,
      });
    }

    return {
      success: true,
      courseId: args.courseId,
      language: language || 'all',
      offset,
      limit,
      returned: rows.length,
      rows,
    };
  },
});

export const adminApplyTopikReviewDecisions = mutation({
  args: {
    decisions: v.array(
      v.object({
        linkId: v.id('course_grammars'),
        categoryId: v.number(),
        confidence: v.optional(v.number()),
        status: v.optional(v.union(v.literal('AUTO_OK'), v.literal('NEEDS_REVIEW'))),
        reason: v.optional(v.string()),
        evidence: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    let updated = 0;
    const errors: string[] = [];
    for (const decision of args.decisions) {
      try {
        const link = await ctx.db.get(decision.linkId);
        if (!link) {
          errors.push(`Link not found: ${decision.linkId}`);
          continue;
        }

        const categoryId = Math.min(15, Math.max(1, Math.floor(decision.categoryId)));
        if (link.unitId !== categoryId) {
          await ctx.db.patch(link._id, { unitId: categoryId });
        }

        const grammar = await ctx.db.get(link.grammarId);
        if (grammar) {
          const previousMeta = (grammar.sourceMeta as GrammarSourceMeta | undefined) || {
            sourceType: 'topik_markdown_rebuild',
            importedAt: Date.now(),
          };
          await ctx.db.patch(grammar._id, {
            sourceMeta: {
              ...previousMeta,
              categoryStatus: decision.status ?? previousMeta.categoryStatus ?? 'NEEDS_REVIEW',
              categoryConfidence:
                decision.confidence ?? previousMeta.categoryConfidence ?? undefined,
              categoryReason: decision.reason ?? previousMeta.categoryReason ?? undefined,
              categoryEvidence: decision.evidence ?? previousMeta.categoryEvidence ?? undefined,
              importedAt: previousMeta.importedAt || Date.now(),
            },
            updatedAt: Date.now(),
          });
        }
        updated++;
      } catch (error) {
        errors.push(`${decision.linkId}: ${toErrorMessage(error)}`);
      }
    }

    return {
      success: true,
      updated,
      errors: errors.slice(0, 120),
    };
  },
});

export const adminSanitizeTopikCourseBatch = mutation({
  args: {
    courseId: v.string(),
    offset: v.optional(v.number()),
    limit: v.optional(v.number()),
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const offset = Math.max(0, Math.floor(args.offset ?? 0));
    const limit = Math.max(1, Math.min(200, Math.floor(args.limit ?? 80)));
    const dryRun = args.dryRun === true;

    const links = await ctx.db
      .query('course_grammars')
      .withIndex('by_course_unit', q => q.eq('courseId', args.courseId))
      .collect();

    const uniqueGrammarIdsForCourse = uniqueGrammarIds(links.map(link => link.grammarId));
    const slicedIds = uniqueGrammarIdsForCourse.slice(offset, offset + limit);

    let scanned = 0;
    let changed = 0;
    let summariesRegenerated = 0;
    const issueCounts = {
      processingKeyword: 0,
      labelPrefix: 0,
      romanization: 0,
      mergedMarker: 0,
      noisyTitleSuffix: 0,
    };
    const samples: Array<{ grammarId: string; beforeTitle: string; afterTitle: string }> = [];
    const errors: string[] = [];

    for (const grammarId of slicedIds) {
      scanned++;
      try {
        const grammar = await ctx.db.get(grammarId);
        if (!grammar) continue;

        const rawBundle = [
          grammar.title,
          grammar.titleEn,
          grammar.titleZh,
          grammar.summary,
          grammar.summaryEn,
          grammar.explanation,
          grammar.explanationEn,
        ]
          .filter(Boolean)
          .join('\n');
        const issues = hasTopikArtifactIssue(rawBundle);
        if (issues.processingKeyword) issueCounts.processingKeyword++;
        if (issues.labelPrefix) issueCounts.labelPrefix++;
        if (issues.romanization) issueCounts.romanization++;
        if (issues.mergedMarker) issueCounts.mergedMarker++;
        if (issues.noisyTitleSuffix) issueCounts.noisyTitleSuffix++;

        const nextTitle = sanitizeTopikTitleText(grammar.title);
        const nextTitleEn =
          grammar.titleEn !== undefined
            ? sanitizeTopikTitleText(grammar.titleEn) || undefined
            : undefined;
        const nextTitleZh =
          grammar.titleZh !== undefined
            ? sanitizeTopikTitleText(grammar.titleZh) || undefined
            : undefined;
        const nextSummary =
          grammar.summary !== undefined
            ? sanitizeTopikInlineText(grammar.summary)
            : grammar.summary;
        const nextSummaryEn =
          grammar.summaryEn !== undefined
            ? sanitizeTopikInlineText(grammar.summaryEn) || undefined
            : grammar.summaryEn;
        const nextExplanation =
          grammar.explanation !== undefined
            ? sanitizeTopikMarkdownText(grammar.explanation)
            : grammar.explanation;
        const nextExplanationEn =
          grammar.explanationEn !== undefined
            ? sanitizeTopikMarkdownText(grammar.explanationEn) || undefined
            : grammar.explanationEn;

        const sourceLanguage = grammar.sourceMeta?.sourceLanguage;
        let patchedSummary = nextSummary;
        let patchedSummaryEn = nextSummaryEn;

        if (sourceLanguage === 'zh' && nextExplanation) {
          const generated = buildTopikSummaryFromMarkdown(
            nextExplanation,
            nextTitleZh || nextTitle
          );
          if (generated && generated !== patchedSummary) {
            patchedSummary = generated;
            summariesRegenerated++;
          }
        }

        if (sourceLanguage === 'en' && nextExplanationEn) {
          const generated = buildTopikSummaryFromMarkdown(
            nextExplanationEn,
            nextTitleEn || nextTitle
          );
          if (generated && generated !== patchedSummaryEn) {
            patchedSummaryEn = generated;
            summariesRegenerated++;
          }
        }

        const patchPayload: Record<string, unknown> = {};
        if (nextTitle && nextTitle !== grammar.title) patchPayload.title = nextTitle;
        if (grammar.titleEn !== undefined && nextTitleEn !== grammar.titleEn) {
          patchPayload.titleEn = nextTitleEn;
        }
        if (grammar.titleZh !== undefined && nextTitleZh !== grammar.titleZh) {
          patchPayload.titleZh = nextTitleZh;
        }
        if (grammar.summary !== undefined && patchedSummary !== grammar.summary) {
          patchPayload.summary = patchedSummary;
        }
        if (grammar.summaryEn !== undefined && patchedSummaryEn !== grammar.summaryEn) {
          patchPayload.summaryEn = patchedSummaryEn;
        }
        if (grammar.explanation !== undefined && nextExplanation !== grammar.explanation) {
          patchPayload.explanation = nextExplanation;
        }
        if (grammar.explanationEn !== undefined && nextExplanationEn !== grammar.explanationEn) {
          patchPayload.explanationEn = nextExplanationEn;
        }

        if (Object.keys(patchPayload).length > 0) {
          patchPayload.updatedAt = Date.now();
          changed++;
          if (samples.length < 20) {
            samples.push({
              grammarId: grammar._id,
              beforeTitle: grammar.title,
              afterTitle: nextTitle || grammar.title,
            });
          }
          if (!dryRun) {
            await ctx.db.patch(grammar._id, patchPayload);
          }
        }
      } catch (error) {
        errors.push(`${grammarId}: ${toErrorMessage(error)}`);
      }
    }

    return {
      success: true,
      courseId: args.courseId,
      offset,
      limit,
      total: uniqueGrammarIdsForCourse.length,
      scanned,
      changed,
      summariesRegenerated,
      dryRun,
      issueCounts,
      samples,
      errors: errors.slice(0, 100),
    };
  },
});

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function normalizeViMnLocalized(value: unknown): { vi?: string; mn?: string } | undefined {
  if (!isRecord(value)) return undefined;
  const vi = typeof value.vi === 'string' && value.vi.trim() ? value.vi : undefined;
  const mn = typeof value.mn === 'string' && value.mn.trim() ? value.mn : undefined;
  if (!vi && !mn) return undefined;
  return { vi, mn };
}

function clearZhEnFromSectionsValue(sections: unknown): { cleaned: unknown; changed: boolean } {
  if (!isRecord(sections)) {
    return { cleaned: sections, changed: false };
  }

  const next: Record<string, unknown> = {};
  let changed = false;

  for (const [key, raw] of Object.entries(sections)) {
    if (isRecord(raw) && ('zh' in raw || 'en' in raw || 'vi' in raw || 'mn' in raw)) {
      const localized = normalizeViMnLocalized(raw);
      if (localized) {
        next[key] = localized;
      } else {
        changed = true;
      }
      if (JSON.stringify(localized ?? null) !== JSON.stringify(raw)) {
        changed = true;
      }
      continue;
    }

    next[key] = raw;
  }

  if (!changed) return { cleaned: sections, changed: false };
  return { cleaned: Object.keys(next).length > 0 ? next : undefined, changed: true };
}

function clearZhEnFromQuizItemsValue(quizItems: unknown): { cleaned: unknown; changed: boolean } {
  if (!Array.isArray(quizItems)) return { cleaned: quizItems, changed: false };

  const next: Array<{ prompt: Record<string, string>; answer?: Record<string, string> }> = [];
  let changed = false;

  for (const raw of quizItems) {
    if (!isRecord(raw)) {
      changed = true;
      continue;
    }

    const prompt = normalizeViMnLocalized(raw.prompt) || {};
    const answer = normalizeViMnLocalized(raw.answer);
    const hasPrompt = !!prompt.vi || !!prompt.mn;
    const hasAnswer = !!answer?.vi || !!answer?.mn;

    if (!hasPrompt && !hasAnswer) {
      changed = true;
      continue;
    }

    const item = answer ? { prompt, answer } : { prompt };
    next.push(item);
    if (JSON.stringify(item) !== JSON.stringify(raw)) changed = true;
  }

  if (!changed && next.length === quizItems.length) return { cleaned: quizItems, changed: false };
  return { cleaned: next, changed: true };
}

function clearZhEnFromExamplesValue(
  examples: unknown,
  clearChineseDefault: boolean
): { cleaned: unknown; changed: boolean } {
  if (!Array.isArray(examples)) return { cleaned: examples, changed: false };

  let changed = false;
  const next = examples.map(raw => {
    if (!isRecord(raw)) {
      changed = true;
      return raw;
    }
    const currentCn = typeof raw.cn === 'string' ? raw.cn : '';
    const nextCn = clearChineseDefault ? '' : currentCn;
    const nextExample = {
      ...raw,
      cn: nextCn,
      en: undefined,
    };
    if (nextCn !== currentCn || raw.en !== undefined) changed = true;
    return nextExample;
  });

  return changed ? { cleaned: next, changed: true } : { cleaned: examples, changed: false };
}

export const adminClearCourseEnglishChineseBatch = mutation({
  args: {
    courseId: v.string(),
    offset: v.optional(v.number()),
    limit: v.optional(v.number()),
    dryRun: v.optional(v.boolean()),
    clearChineseDefault: v.optional(v.boolean()),
    clearCourseCustomNotes: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const offset = Math.max(0, Math.floor(args.offset ?? 0));
    const limit = Math.max(1, Math.min(200, Math.floor(args.limit ?? 80)));
    const dryRun = args.dryRun === true;
    const clearChineseDefault = args.clearChineseDefault !== false;
    const clearCourseCustomNotes = args.clearCourseCustomNotes !== false;

    const allLinks = await ctx.db
      .query('course_grammars')
      .withIndex('by_course_unit', q => q.eq('courseId', args.courseId))
      .collect();

    const grammarIdSet = new Set<string>();
    const uniqueGrammarIds: Id<'grammar_points'>[] = [];
    for (const link of allLinks) {
      const key = link.grammarId.toString();
      if (grammarIdSet.has(key)) continue;
      grammarIdSet.add(key);
      uniqueGrammarIds.push(link.grammarId);
    }

    const slicedIds = uniqueGrammarIds.slice(offset, offset + limit);
    const targetIdSet = new Set(slicedIds.map(id => id.toString()));

    let grammarUpdated = 0;
    let grammarScanned = 0;
    let linkUpdated = 0;
    const errors: string[] = [];

    for (const grammarId of slicedIds) {
      grammarScanned++;
      const grammar = await ctx.db.get(grammarId);
      if (!grammar) continue;

      const patchPayload: Record<string, unknown> = {};
      let changed = false;

      if (grammar.titleEn !== undefined) {
        patchPayload.titleEn = undefined;
        changed = true;
      }
      if (grammar.titleZh !== undefined) {
        patchPayload.titleZh = undefined;
        changed = true;
      }
      if (grammar.summaryEn !== undefined) {
        patchPayload.summaryEn = undefined;
        changed = true;
      }
      if (grammar.explanationEn !== undefined) {
        patchPayload.explanationEn = undefined;
        changed = true;
      }
      if (clearChineseDefault && grammar.summary !== '') {
        patchPayload.summary = '';
        changed = true;
      }
      if (clearChineseDefault && grammar.explanation !== '') {
        patchPayload.explanation = '';
        changed = true;
      }

      const clearedSections = clearZhEnFromSectionsValue(grammar.sections);
      if (clearedSections.changed) {
        patchPayload.sections = clearedSections.cleaned;
        changed = true;
      }

      const clearedQuizItems = clearZhEnFromQuizItemsValue(grammar.quizItems);
      if (clearedQuizItems.changed) {
        patchPayload.quizItems = clearedQuizItems.cleaned;
        changed = true;
      }

      const clearedExamples = clearZhEnFromExamplesValue(grammar.examples, clearChineseDefault);
      if (clearedExamples.changed) {
        patchPayload.examples = clearedExamples.cleaned;
        changed = true;
      }

      if (changed) {
        patchPayload.updatedAt = Date.now();
        grammarUpdated++;
        if (!dryRun) {
          try {
            await ctx.db.patch(grammarId, patchPayload);
          } catch (error) {
            errors.push(`grammar ${grammar.title}: ${toErrorMessage(error)}`);
          }
        }
      }
    }

    if (clearCourseCustomNotes) {
      for (const link of allLinks) {
        if (!targetIdSet.has(link.grammarId.toString())) continue;

        const linkPatch: Record<string, unknown> = {};
        if (link.customNoteEn !== undefined) linkPatch.customNoteEn = undefined;
        if (clearChineseDefault && link.customNote !== undefined) linkPatch.customNote = undefined;

        if (Object.keys(linkPatch).length > 0) {
          linkUpdated++;
          if (!dryRun) {
            try {
              await ctx.db.patch(link._id, linkPatch);
            } catch (error) {
              errors.push(`link ${link._id}: ${toErrorMessage(error)}`);
            }
          }
        }
      }
    }

    const nextOffset = offset + slicedIds.length;
    const hasMore = nextOffset < uniqueGrammarIds.length;

    return {
      success: true,
      dryRun,
      courseId: args.courseId,
      totalGrammars: uniqueGrammarIds.length,
      offset,
      limit,
      processed: slicedIds.length,
      grammarScanned,
      grammarUpdated,
      linkUpdated,
      nextOffset: hasMore ? nextOffset : null,
      hasMore,
      errors: errors.slice(0, 120),
    };
  },
});
