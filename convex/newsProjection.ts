import { internalMutation, mutation, query } from './_generated/server';
import { makeFunctionReference } from 'convex/server';
import type { FunctionReference } from 'convex/server';
import { v } from 'convex/values';
import { requireAdmin } from './utils';
import { toErrorMessage } from './errors';

const DEFAULT_NEWS_COURSE_ID = 'news_ko_mvp';

type ProjectBatchArgs = {
  courseId: string;
  limit: number;
};

type ProjectBatchResult = {
  scanned: number;
  projected: number;
  skipped: number;
  failed: number;
  errors: string[];
};

const projectBatchMutation = makeFunctionReference<
  'mutation',
  ProjectBatchArgs,
  ProjectBatchResult
>('newsProjection:projectBatch') as unknown as FunctionReference<
  'mutation',
  'internal',
  ProjectBatchArgs,
  ProjectBatchResult
>;

export const triggerProjection = mutation({
  args: {
    courseId: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const courseId = args.courseId || DEFAULT_NEWS_COURSE_ID;
    const limit = Math.min(Math.max(args.limit ?? 100, 1), 300);
    const jobId = await ctx.scheduler.runAfter(0, projectBatchMutation, {
      courseId,
      limit,
    });
    return { scheduled: true, jobId, courseId, limit };
  },
});

export const projectBatch = internalMutation({
  args: {
    courseId: v.string(),
    limit: v.number(),
  },
  handler: async (ctx, args): Promise<ProjectBatchResult> => {
    const now = Date.now();
    const limit = Math.min(Math.max(args.limit, 1), 300);
    const candidates = await ctx.db
      .query('news_articles')
      .withIndex('by_status_published', q => q.eq('status', 'active'))
      .order('desc')
      .take(Math.max(limit * 3, 60));

    const pending = candidates.filter(
      article =>
        !article.projectedAt &&
        !!article.bodyText &&
        article.bodyText.trim().length > 40 &&
        article.status === 'active'
    );

    const toProcess = pending.slice(0, limit);
    let projected = 0;
    let skipped = 0;
    let failed = 0;
    const errors: string[] = [];

    const nextIndexByUnit = new Map<number, number>();
    for (const article of toProcess) {
      try {
        const articleLive = await ctx.db.get(article._id);
        if (!articleLive || articleLive.projectedAt || articleLive.status !== 'active') {
          skipped += 1;
          continue;
        }

        const unitIndex = toKstDateKey(articleLive.publishedAt || now);
        let nextArticleIndex = nextIndexByUnit.get(unitIndex);
        if (!nextArticleIndex) {
          const unitRows = await ctx.db
            .query('textbook_units')
            .withIndex('by_course_unit_article', q =>
              q.eq('courseId', args.courseId).eq('unitIndex', unitIndex)
            )
            .collect();

          const maxIndex = unitRows.reduce((max, row) => Math.max(max, row.articleIndex || 0), 0);
          nextArticleIndex = maxIndex + 1;
        }

        const articleIndex = nextArticleIndex;
        nextIndexByUnit.set(unitIndex, articleIndex + 1);

        await ctx.db.insert('textbook_units', {
          courseId: args.courseId,
          unitIndex,
          articleIndex,
          title: articleLive.title,
          readingText: articleLive.bodyText,
          createdAt: now,
        });

        await ctx.db.patch(articleLive._id, {
          projectedAt: now,
          projectedCourseId: args.courseId,
          projectedUnitIndex: unitIndex,
          projectedArticleIndex: articleIndex,
        });
        projected += 1;
      } catch (error: unknown) {
        failed += 1;
        if (errors.length < 10) {
          errors.push(toErrorMessage(error));
        }
      }
    }

    return {
      scanned: toProcess.length,
      projected,
      skipped,
      failed,
      errors,
    };
  },
});

export const getProjectionStats = query({
  args: {
    courseId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const courseId = args.courseId || DEFAULT_NEWS_COURSE_ID;
    const recentNews = await ctx.db
      .query('news_articles')
      .withIndex('by_status_published', q => q.eq('status', 'active'))
      .order('desc')
      .take(300);
    const projectedRows = recentNews.filter(
      item => item.projectedCourseId === courseId && !!item.projectedAt
    );
    const pendingRows = recentNews.filter(item => !item.projectedAt && item.status === 'active');

    return {
      courseId,
      recentActiveCount: recentNews.length,
      projectedCount: projectedRows.length,
      pendingCount: pendingRows.length,
    };
  },
});

function toKstDateKey(ts: number): number {
  const kstMs = ts + 9 * 60 * 60 * 1000;
  const kst = new Date(kstMs);
  const y = kst.getUTCFullYear();
  const m = String(kst.getUTCMonth() + 1).padStart(2, '0');
  const d = String(kst.getUTCDate()).padStart(2, '0');
  return Number(`${y}${m}${d}`);
}
