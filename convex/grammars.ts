import { mutation, query } from './_generated/server';
import { v } from 'convex/values';
import { getAuthUserId, getOptionalAuthUserId, requireAdmin } from './utils';
import { toErrorMessage } from './errors';
import type { Id } from './_generated/dataModel';

export type GrammarStatsDto = {
  total: number;
  mastered: number;
};

// Get Grammar stats for sidebar
export const getStats = query({
  args: {
    courseId: v.string(),
  },
  handler: async (ctx, args): Promise<GrammarStatsDto> => {
    const userId = await getOptionalAuthUserId(ctx);

    // 1. Get all CourseGrammar links for this course
    // OPTIMIZATION: Limit to prevent excessive queries
    const MAX_GRAMMAR_POINTS = 500;
    const courseGrammars = await ctx.db
      .query('course_grammars')
      .withIndex('by_course_unit', q => q.eq('courseId', args.courseId))
      .take(MAX_GRAMMAR_POINTS);

    if (!userId) return { total: courseGrammars.length, mastered: 0 };
    // ...

    // 2. Fetch progress
    // OPTIMIZATION: Limit to prevent excessive queries
    const MAX_PROGRESS_ITEMS = 500;
    const progress = await ctx.db
      .query('user_grammar_progress')
      .filter(q => q.eq(q.field('userId'), userId))
      .take(MAX_PROGRESS_ITEMS);

    // Count mastered
    const mastered = progress.filter(p => p.status === 'MASTERED').length;

    return {
      total: courseGrammars.length,
      mastered,
    };
  },
});

export type GrammarItemDto = {
  id: Id<'grammar_points'>;
  title: string;
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

    const links = await ctx.db
      .query('course_grammars')
      .withIndex('by_course_unit', q => q.eq('courseId', args.courseId))
      .collect();

    // OPTIMIZATION: Batch fetch all grammars and progress
    const grammarIds = [...new Set(links.map(l => l.grammarId))];
    const grammarsArray = await Promise.all(grammarIds.map(id => ctx.db.get(id)));
    const grammarsMap = new Map(grammarsArray.filter(Boolean).map(g => [g!._id.toString(), g!]));

    // Batch fetch user progress if userId exists
    let progressMap = new Map();
    if (userId) {
      const allProgress = await ctx.db
        .query('user_grammar_progress')
        .withIndex('by_user_grammar', q => q.eq('userId', userId))
        .collect();
      progressMap = new Map(allProgress.map(p => [p.grammarId.toString(), p]));
    }

    // Assemble data in memory
    const results = links.map(link => {
      const grammar = grammarsMap.get(link.grammarId.toString());
      if (!grammar) return null;

      const progress = progressMap.get(link.grammarId.toString());
      const userStatus = progress ? progress.status : 'NOT_STARTED';

      return {
        id: grammar._id,
        title: grammar.title,
        summary: grammar.summary,
        unitId: link.unitId,
        status: userStatus,
      };
    });

    return results
      .filter((g): g is GrammarItemDto => g !== null)
      .sort((a, b) => a.unitId - b.unitId);
  },
});

export type UnitGrammarDto = {
  id: Id<'grammar_points'>;
  title: string;
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
  examples: Array<{
    kr: string;
    cn: string;
    en?: string;
    vi?: string;
    mn?: string;
    audio?: string;
  }>;
  conjugationRules: unknown[];
  createdAt: number;
  updatedAt: number;
  // Course Context
  customNote: string | undefined;
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
      if (instituteId) {
        const institute = await ctx.db.get(instituteId);
        if (institute) {
          effectiveCourseId = institute.id || institute._id;
        }
      }

      // SPECIAL HANDLING: Legacy Yonsei 1-2
      // The grammar data is stored as Unit 11-20, but frontend requests Unit 1-10
      if (effectiveCourseId === 'course_yonsei_1b_appendix' && args.unitId <= 10) {
        effectiveUnitId = args.unitId + 10;
      }

      // 1. Get links
      // OPTIMIZATION: Limit to prevent excessive queries
      const MAX_UNIT_GRAMMAR = 100;
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
      const grammarIds = [...new Set(sortedGrammars.map(l => l.grammarId))];
      const grammarsArray = await Promise.all(grammarIds.map(id => ctx.db.get(id)));
      const grammarsMap = new Map(grammarsArray.filter(Boolean).map(g => [g!._id.toString(), g!]));

      // Batch fetch user progress if userId exists
      let progressMap = new Map();
      if (userId) {
        const allProgress = await ctx.db
          .query('user_grammar_progress')
          .withIndex('by_user_grammar', q => q.eq('userId', userId))
          .collect();
        progressMap = new Map(allProgress.map(p => [p.grammarId.toString(), p]));
      }

      // 4. Assemble data in memory
      const results = sortedGrammars.map(link => {
        const grammar = grammarsMap.get(link.grammarId.toString());
        if (!grammar) return null;

        const userProgress = progressMap.get(link.grammarId.toString());

        return {
          id: grammar._id,
          title: grammar.title,
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
          examples: grammar.examples,
          conjugationRules: grammar.conjugationRules,
          createdAt: grammar.createdAt,
          updatedAt: grammar.updatedAt,
          // Course Context
          customNote: link.customNote,
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
    status: v.string(), // "LEARNING", "MASTERED"
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);

    const { grammarId, status } = args;
    const now = Date.now();

    const existing = await ctx.db
      .query('user_grammar_progress')
      .withIndex('by_user_grammar', q => q.eq('userId', userId).eq('grammarId', grammarId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        status,
        lastStudiedAt: now,
        proficiency: status === 'MASTERED' ? 100 : existing.proficiency,
      });
      return { status, proficiency: status === 'MASTERED' ? 100 : existing.proficiency };
    } else {
      await ctx.db.insert('user_grammar_progress', {
        userId,
        grammarId,
        status,
        proficiency: status === 'MASTERED' ? 100 : 0,
        lastStudiedAt: now,
      });
      return { status, proficiency: status === 'MASTERED' ? 100 : 0 };
    }
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

export const assignToUnit = mutation({
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

    if (existing) return existing._id;

    // Get max display order
    const currentParams = await ctx.db
      .query('course_grammars')
      .withIndex('by_course_unit', q => q.eq('courseId', args.courseId).eq('unitId', args.unitId))
      .collect();

    const maxOrder = currentParams.reduce((max, p) => Math.max(max, p.displayOrder || 0), 0);

    return await ctx.db.insert('course_grammars', {
      courseId: args.courseId,
      unitId: args.unitId,
      grammarId: args.grammarId,
      displayOrder: maxOrder + 1,
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
        examples: v.optional(v.any()), // JSON array or string
        conjugationRules: v.optional(v.any()),
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
      try {
        // 1. Get current course's publisher
        const currentCourse = await ctx.db
          .query('institutes')
          .withIndex('by_legacy_id', q => q.eq('id', item.courseId))
          .unique();
        const currentPublisher = currentCourse?.publisher || currentCourse?.name || 'unknown';

        // 2. Find all grammars with similar titles (base title without #N suffix)
        const baseTitle = item.title.replace(/ #\d+$/, '').trim();
        const allGrammars = await ctx.db.query('grammar_points').collect();

        // Filter grammars that match the base title
        const matchingGrammars = allGrammars.filter(g => {
          const gBaseTitle = g.title.replace(/ #\d+$/, '').trim();
          return gBaseTitle === baseTitle;
        });

        let grammarId: Id<'grammar_points'> | null = null;
        let shouldCreateNew = false;
        let reuseGrammar = null;

        if (matchingGrammars.length === 0) {
          // No existing grammar with this title - create new
          shouldCreateNew = true;
        } else {
          // Check if any matching grammar is used by the same publisher
          for (const grammar of matchingGrammars) {
            // Get all courses using this grammar
            const links = await ctx.db
              .query('course_grammars')
              .filter(q => q.eq(q.field('grammarId'), grammar._id))
              .collect();

            let usedBySamePublisher = false;
            let usedByDifferentPublisher = false;

            for (const link of links) {
              const linkedCourse = await ctx.db
                .query('institutes')
                .withIndex('by_legacy_id', q => q.eq('id', link.courseId))
                .unique();
              const linkedPublisher = linkedCourse?.publisher || linkedCourse?.name || 'unknown';

              if (linkedPublisher === currentPublisher) {
                usedBySamePublisher = true;
              } else {
                usedByDifferentPublisher = true;
              }
            }

            // If this grammar is only used by different publishers, we can reuse it
            if (!usedBySamePublisher && usedByDifferentPublisher && !reuseGrammar) {
              reuseGrammar = grammar;
            }

            // If grammar not used by anyone yet, we can reuse it
            if (links.length === 0 && !reuseGrammar) {
              reuseGrammar = grammar;
            }
          }

          // If we found a reusable grammar from different publisher
          if (reuseGrammar) {
            shouldCreateNew = false;
          } else {
            // Same publisher already has a grammar with this title - create new with suffix
            shouldCreateNew = true;
          }
        }

        // Parse examples if it's a string
        let examples = item.examples;
        if (typeof examples === 'string') {
          try {
            examples = JSON.parse(examples);
          } catch {
            examples = examples ? [{ kr: examples, cn: '' }] : [];
          }
        }

        // Parse conjugationRules if it's a string
        let conjugationRules = item.conjugationRules;
        if (typeof conjugationRules === 'string') {
          try {
            conjugationRules = JSON.parse(conjugationRules);
          } catch {
            conjugationRules = [];
          }
        }

        if (shouldCreateNew) {
          // Determine title with suffix if needed
          let finalTitle = item.title;
          if (matchingGrammars.length > 0) {
            // Find the highest existing suffix number
            const suffixNumbers = matchingGrammars.map(g => {
              const match = g.title.match(/ #(\d+)$/);
              return match ? parseInt(match[1], 10) : 1;
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
            conjugationRules: conjugationRules || [],
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });
          newGrammarCount++;
        } else if (reuseGrammar) {
          // Reuse existing grammar from different publisher
          grammarId = reuseGrammar._id;
          // Optionally update with new content if provided
          await ctx.db.patch(grammarId, {
            summary: item.summary || reuseGrammar.summary,
            summaryEn: item.summaryEn !== undefined ? item.summaryEn : reuseGrammar.summaryEn,
            summaryVi: item.summaryVi !== undefined ? item.summaryVi : reuseGrammar.summaryVi,
            summaryMn: item.summaryMn !== undefined ? item.summaryMn : reuseGrammar.summaryMn,
            explanation: item.explanation || reuseGrammar.explanation,
            explanationEn:
              item.explanationEn !== undefined ? item.explanationEn : reuseGrammar.explanationEn,
            explanationVi:
              item.explanationVi !== undefined ? item.explanationVi : reuseGrammar.explanationVi,
            explanationMn:
              item.explanationMn !== undefined ? item.explanationMn : reuseGrammar.explanationMn,
            examples: examples || reuseGrammar.examples,
            conjugationRules: conjugationRules || reuseGrammar.conjugationRules,
            updatedAt: Date.now(),
          });
        }

        if (!grammarId) {
          failedCount++;
          errors.push(`${item.title}: Failed to resolve grammarId`);
          continue;
        }

        // 2. Link to course unit (upsert)
        const existingLink = await ctx.db
          .query('course_grammars')
          .withIndex('by_course_unit', q =>
            q.eq('courseId', item.courseId).eq('unitId', item.unitId)
          )
          .filter(q => q.eq(q.field('grammarId'), grammarId))
          .unique();

        if (!existingLink) {
          // Get max display order for this unit
          const unitGrammars = await ctx.db
            .query('course_grammars')
            .withIndex('by_course_unit', q =>
              q.eq('courseId', item.courseId).eq('unitId', item.unitId)
            )
            .collect();
          const maxOrder = unitGrammars.reduce((max, g) => Math.max(max, g.displayOrder || 0), 0);

          await ctx.db.insert('course_grammars', {
            courseId: item.courseId,
            unitId: item.unitId,
            grammarId,
            displayOrder: maxOrder + 1,
          });
        }

        successCount++;
      } catch (e: unknown) {
        failedCount++;
        errors.push(`${item.title}: ${toErrorMessage(e)}`);
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
