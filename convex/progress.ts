import { mutation, query } from './_generated/server';
import { v } from 'convex/values';
import { getAuthUserId } from './utils';

// Get course progress for a user
export const getCourseProgress = query({
  args: {
    courseId: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);

    const { courseId } = args;

    // Get the institute to find total units
    const institute = await ctx.db
      .query('institutes')
      .withIndex('by_legacy_id', q => q.eq('id', courseId))
      .first();

    if (!institute) {
      return null;
    }

    // Get user progress
    const progress = await ctx.db
      .query('user_course_progress')
      .withIndex('by_user_course', q => q.eq('userId', userId).eq('courseId', courseId))
      .first();

    const completedUnits = progress?.completedUnits || [];
    const totalUnits = institute.totalUnits || 0;

    return {
      courseId,
      courseName: institute.name,
      completedUnits,
      completedCount: completedUnits.length,
      totalUnits,
      progressPercent: totalUnits > 0 ? Math.round((completedUnits.length / totalUnits) * 100) : 0,
    };
  },
});

// Mark a unit as complete
export const completeUnit = mutation({
  args: {
    courseId: v.string(),
    unitIndex: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);

    const { courseId, unitIndex } = args;

    // Check if progress record exists
    const existing = await ctx.db
      .query('user_course_progress')
      .withIndex('by_user_course', q => q.eq('userId', userId).eq('courseId', courseId))
      .first();

    if (existing) {
      // Add unit to completedUnits if not already there
      const completedUnits = existing.completedUnits || [];
      if (!completedUnits.includes(unitIndex)) {
        completedUnits.push(unitIndex);
        completedUnits.sort((a, b) => a - b); // Keep sorted
      }

      await ctx.db.patch(existing._id, {
        completedUnits,
        lastAccessAt: Date.now(),
      });

      return { success: true, completedUnits };
    } else {
      // Create new progress record
      await ctx.db.insert('user_course_progress', {
        userId,
        courseId,
        completedUnits: [unitIndex],
        lastAccessAt: Date.now(),
        createdAt: Date.now(),
      });

      return { success: true, completedUnits: [unitIndex] };
    }
  },
});

export const uncompleteUnit = mutation({
  args: {
    courseId: v.string(),
    unitIndex: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const existing = await ctx.db
      .query('user_course_progress')
      .withIndex('by_user_course', q => q.eq('userId', userId).eq('courseId', args.courseId))
      .first();
    if (!existing) return { success: true, completedUnits: [] as number[] };

    const completedUnits = (existing.completedUnits || []).filter(u => u !== args.unitIndex);
    await ctx.db.patch(existing._id, {
      completedUnits,
      lastAccessAt: Date.now(),
    });
    return { success: true, completedUnits };
  },
});

// Get all course progress for a user (for dashboard)
export const getAllProgress = query({
  args: {},
  handler: async ctx => {
    const userId = await getAuthUserId(ctx);

    const progressRecords = await ctx.db
      .query('user_course_progress')
      .withIndex('by_user', q => q.eq('userId', userId))
      .collect();

    // OPTIMIZATION: Batch fetch institutes
    const courseIds = [...new Set(progressRecords.map(p => p.courseId))];
    const institutesArray = await Promise.all(
      courseIds.map(courseId =>
        ctx.db
          .query('institutes')
          .withIndex('by_legacy_id', q => q.eq('id', courseId))
          .first()
      )
    );
    const institutesMap = new Map(institutesArray.filter(Boolean).map(i => [i!.id, i!]));

    // Enrich with institute data in memory
    const result = progressRecords.map(p => {
      const institute = institutesMap.get(p.courseId);

      return {
        courseId: p.courseId,
        courseName: institute?.name || p.courseId,
        completedUnits: p.completedUnits.length,
        totalUnits: institute?.totalUnits || 0,
        lastAccessAt: p.lastAccessAt,
      };
    });

    return result;
  },
});
