import { internalMutation, query } from './_generated/server';
import { v } from 'convex/values';

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const XP_SOURCES = ['FSRS_REVIEW', 'TYPING_TEST', 'PODCAST', 'TOPIK_MOCK'] as const;
type XpSource = (typeof XP_SOURCES)[number];

function isXpSource(source: string): source is XpSource {
  return XP_SOURCES.includes(source as XpSource);
}

export function getCurrentWeekIdentifier() {
  const now = new Date();
  const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);

  const isoYear = date.getUTCFullYear();
  const yearStart = new Date(Date.UTC(isoYear, 0, 1));
  const isoWeek = Math.ceil(((date.getTime() - yearStart.getTime()) / DAY_IN_MS + 1) / 7);

  return `${isoYear}-W${String(isoWeek).padStart(2, '0')}`;
}

export const addXP = internalMutation({
  args: {
    userId: v.id('users'),
    amount: v.number(),
    source: v.string(),
  },
  handler: async (ctx, args) => {
    if (!isXpSource(args.source)) {
      throw new Error('INVALID_XP_SOURCE');
    }

    await ctx.db.insert('xp_logs', {
      userId: args.userId,
      amount: args.amount,
      source: args.source,
      timestamp: Date.now(),
    });

    const weekIdentifier = getCurrentWeekIdentifier();
    const currentWeekStats = await ctx.db
      .query('user_xp_stats')
      .withIndex('by_user_week', q =>
        q.eq('userId', args.userId).eq('weekIdentifier', weekIdentifier)
      )
      .first();

    if (currentWeekStats) {
      const nextCurrentWeekXp = currentWeekStats.currentWeekXp + args.amount;
      const nextTotalXp = currentWeekStats.totalXp + args.amount;

      await ctx.db.patch(currentWeekStats._id, {
        currentWeekXp: nextCurrentWeekXp,
        totalXp: nextTotalXp,
      });

      return {
        userId: args.userId,
        weekIdentifier,
        currentWeekXp: nextCurrentWeekXp,
        totalXp: nextTotalXp,
      };
    }

    const latestStats = await ctx.db
      .query('user_xp_stats')
      .withIndex('by_user_week', q => q.eq('userId', args.userId))
      .order('desc')
      .first();

    const previousTotalXp = latestStats?.totalXp ?? 0;
    const totalXp = previousTotalXp + args.amount;

    await ctx.db.insert('user_xp_stats', {
      userId: args.userId,
      weekIdentifier,
      currentWeekXp: args.amount,
      totalXp,
    });

    return {
      userId: args.userId,
      weekIdentifier,
      currentWeekXp: args.amount,
      totalXp,
    };
  },
});

export const getWeeklyLeaderboard = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const weekIdentifier = getCurrentWeekIdentifier();
    const limit = args.limit && args.limit > 0 ? args.limit : 50;

    const weeklyStats = await ctx.db
      .query('user_xp_stats')
      .withIndex('by_week_and_xp', q => q.eq('weekIdentifier', weekIdentifier))
      .order('desc')
      .take(limit);

    const leaderboard = await Promise.all(
      weeklyStats.map(async stat => {
        const user = await ctx.db.get(stat.userId);
        if (!user) {
          return null;
        }
        return {
          userId: stat.userId,
          name: user.name ?? null,
          image: user.image ?? null,
          currentWeekXp: stat.currentWeekXp,
          totalXp: stat.totalXp,
        };
      })
    );

    return leaderboard.filter((entry): entry is NonNullable<typeof entry> => entry !== null);
  },
});

export const getMyXpStats = query({
  args: {},
  handler: async ctx => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const userRecord =
      (await ctx.db
        .query('users')
        .withIndex('by_token', q => q.eq('token', identity.tokenIdentifier))
        .first()) ||
      (identity.email
        ? await ctx.db
            .query('users')
            .filter(q => q.eq(q.field('email'), identity.email))
            .first()
        : null);

    if (!userRecord) {
      return null;
    }

    const weekIdentifier = getCurrentWeekIdentifier();
    const currentWeekStats = await ctx.db
      .query('user_xp_stats')
      .withIndex('by_user_week', q =>
        q.eq('userId', userRecord._id).eq('weekIdentifier', weekIdentifier)
      )
      .first();

    const latestStats =
      currentWeekStats ||
      (await ctx.db
        .query('user_xp_stats')
        .withIndex('by_user_week', q => q.eq('userId', userRecord._id))
        .order('desc')
        .first());

    return {
      currentWeekXp: currentWeekStats?.currentWeekXp ?? 0,
      totalXp: currentWeekStats?.totalXp ?? latestStats?.totalXp ?? 0,
    };
  },
});
