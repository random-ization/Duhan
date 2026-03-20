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
  importedAt: number;
}

type GrammarConjugationRules = UnitGrammarDto['conjugationRules'];
type ParsedConjugationRules = Exclude<GrammarConjugationRules, undefined>;

type GrammarRecord = {
  _id: Id<'grammar_points'>;
  title: string;
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

// Get Grammar stats for sidebar
export const getStats = query({
  args: {
    courseId: v.string(),
  },
  handler: async (ctx, args): Promise<GrammarStatsDto> => {
    const userId = await getOptionalAuthUserId(ctx);
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

    if (!userId) return { total: courseGrammars.length, mastered: 0 };

    const progressMap = await getProgressMapForGrammarIds(
      ctx,
      userId,
      courseGrammars.map(link => link.grammarId)
    );

    // Count mastered
    const mastered = [...progressMap.values()].filter(p => p.status === 'MASTERED').length;

    return {
      total: courseGrammars.length,
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
  },
  handler: async (ctx, args): Promise<GrammarItemDto[]> => {
    const userId = await getOptionalAuthUserId(ctx);
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

      return {
        id: grammar._id,
        title: grammar.title,
        titleEn: grammar.titleEn,
        titleZh: grammar.titleZh,
        titleVi: grammar.titleVi,
        titleMn: grammar.titleMn,
        summary: grammar.summary,
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
  },
  handler: async (ctx, args): Promise<UnitGrammarDto[]> => {
    try {
      const userId = await getOptionalAuthUserId(ctx);

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
