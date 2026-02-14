import { makeFunctionReference } from 'convex/server';
import type { FunctionReference } from 'convex/server';
import { internalMutation, mutation, query } from './_generated/server';
import { v } from 'convex/values';
import { requireAdmin } from './utils';
import { DEGRADE_FAILURE_THRESHOLD, NEWS_SOURCES } from './newsConfig';

type PollSourceArgs = {
  sourceKey: string;
};

type PollSourceResult = {
  sourceKey: string;
  fetched: number;
  inserted: number;
  updated: number;
  deduped: number;
  failed: number;
  durationMs: number;
  status: 'ok' | 'partial' | 'error';
  errors: string[];
};

const pollSourceAction = makeFunctionReference<'action', PollSourceArgs, PollSourceResult>(
  'newsSources:pollSource'
) as unknown as FunctionReference<'action', 'internal', PollSourceArgs, PollSourceResult>;

export const listSources = query({
  args: {},
  handler: async () => {
    return NEWS_SOURCES;
  },
});

export const getSourceHealth = query({
  args: {},
  handler: async ctx => {
    const rows = await ctx.db
      .query('news_source_health')
      .withIndex('by_lastRunAt')
      .order('desc')
      .take(200);
    const rowBySource = new Map(rows.map(row => [row.sourceKey, row]));

    return NEWS_SOURCES.map(source => {
      const health = rowBySource.get(source.key);
      return {
        sourceKey: source.key,
        name: source.name,
        enabled: source.enabled,
        pollMinutes: source.pollMinutes,
        degradeThreshold: DEGRADE_FAILURE_THRESHOLD,
        totalRuns: health?.totalRuns ?? 0,
        totalFailures: health?.totalFailures ?? 0,
        consecutiveFailures: health?.consecutiveFailures ?? 0,
        degraded: health?.degraded ?? false,
        degradedSince: health?.degradedSince,
        lastRunAt: health?.lastRunAt,
        lastStatus: health?.lastStatus,
        lastError: health?.lastError,
        lastSuccessAt: health?.lastSuccessAt,
      };
    });
  },
});

export const triggerSource = mutation({
  args: {
    sourceKey: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const source = NEWS_SOURCES.find(item => item.key === args.sourceKey && item.enabled);
    if (!source) {
      throw new Error(`Unknown source key: ${args.sourceKey}`);
    }
    await ctx.scheduler.runAfter(0, pollSourceAction, { sourceKey: source.key });
    return { scheduled: true, sourceKey: source.key };
  },
});

export const triggerAllSources = mutation({
  args: {
    delayMs: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const delayMs = Math.max(args.delayMs ?? 0, 0);
    const enabledSources = NEWS_SOURCES.filter(source => source.enabled);
    for (const source of enabledSources) {
      await ctx.scheduler.runAfter(delayMs, pollSourceAction, { sourceKey: source.key });
    }
    return {
      scheduled: enabledSources.length,
      delayMs,
    };
  },
});

export const updateSourceHealth = internalMutation({
  args: {
    sourceKey: v.string(),
    status: v.union(v.literal('ok'), v.literal('partial'), v.literal('error')),
    lastRunAt: v.number(),
    lastError: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('news_source_health')
      .withIndex('by_sourceKey', q => q.eq('sourceKey', args.sourceKey))
      .first();

    const totalRuns = (existing?.totalRuns ?? 0) + 1;
    const failedThisRun = args.status === 'ok' ? 0 : 1;
    const totalFailures = (existing?.totalFailures ?? 0) + failedThisRun;
    const consecutiveFailures = args.status === 'ok' ? 0 : (existing?.consecutiveFailures ?? 0) + 1;
    const degraded = consecutiveFailures >= DEGRADE_FAILURE_THRESHOLD;
    const degradedSince = degraded
      ? (existing?.degradedSince ?? (existing?.degraded ? existing.degradedSince : args.lastRunAt))
      : undefined;
    const lastSuccessAt = args.status === 'ok' ? args.lastRunAt : existing?.lastSuccessAt;

    const next = {
      sourceKey: args.sourceKey,
      totalRuns,
      totalFailures,
      consecutiveFailures,
      lastRunAt: args.lastRunAt,
      lastStatus: args.status,
      lastError: args.status === 'ok' ? undefined : args.lastError,
      lastSuccessAt,
      degraded,
      degradedSince,
      updatedAt: Date.now(),
    };

    if (existing) {
      await ctx.db.patch(existing._id, next);
    } else {
      await ctx.db.insert('news_source_health', next);
    }
  },
});
