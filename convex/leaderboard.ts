/**
 * Weekly leaderboard queries (D3).
 *
 * The data source is `user_xp_stats` (already populated by `xp.ts` on every
 * XP-awarding event) + `users`. The existing `xp:getWeeklyLeaderboard`
 * query returns a flat list; this module adds:
 *  - `getWeeklyTop`  — top N with rank numbers baked in.
 *  - `getMyRank`     — caller's rank + two neighbours on either side.
 *
 * Using the live `user_xp_stats` table keeps the feature cheap (no cron,
 * no materialised view yet) and the `by_week_and_xp` index already orders
 * rows by weekly XP. We cap scans to 500 rows for ranking which is well
 * beyond the product's current active-user count.
 */

import { query, type QueryCtx } from './_generated/server';
import { v } from 'convex/values';
import type { Id } from './_generated/dataModel';
import { getOptionalAuthUserId } from './utils';
import { getCurrentWeekIdentifier } from './xp';

const MAX_LEADERBOARD_SCAN = 500;
const DEFAULT_TOP_LIMIT = 20;
const MAX_TOP_LIMIT = 100;
const NEIGHBOUR_WINDOW = 2;

export type LeaderboardEntry = {
  rank: number;
  userId: Id<'users'>;
  name: string | null;
  avatarUrl: string | null;
  currentWeekXp: number;
  totalXp: number;
  isMe: boolean;
};

export type MyRankResult = {
  weekIdentifier: string;
  totalRanked: number;
  myEntry: LeaderboardEntry | null;
  neighbours: LeaderboardEntry[];
};

async function scanRankedStats(ctx: QueryCtx, weekIdentifier: string) {
  return ctx.db
    .query('user_xp_stats')
    .withIndex('by_week_and_xp', q => q.eq('weekIdentifier', weekIdentifier))
    .order('desc')
    .take(MAX_LEADERBOARD_SCAN);
}

export const getWeeklyTop = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<LeaderboardEntry[]> => {
    const limit = Math.max(1, Math.min(args.limit ?? DEFAULT_TOP_LIMIT, MAX_TOP_LIMIT));
    const weekIdentifier = getCurrentWeekIdentifier();
    const viewerId = await getOptionalAuthUserId(ctx);

    const rows = await scanRankedStats(ctx, weekIdentifier);
    const top = rows.slice(0, limit);

    const entries = await Promise.all(
      top.map(async (row, idx) => {
        const user = await ctx.db.get(row.userId);
        if (!user) return null;
        const entry: LeaderboardEntry = {
          rank: idx + 1,
          userId: row.userId,
          name: user.name ?? null,
          avatarUrl: user.image ?? null,
          currentWeekXp: row.currentWeekXp,
          totalXp: row.totalXp,
          isMe: viewerId !== null && row.userId === viewerId,
        };
        return entry;
      })
    );

    return entries.filter((e): e is LeaderboardEntry => e !== null);
  },
});

export const getMyRank = query({
  args: {},
  handler: async (ctx): Promise<MyRankResult> => {
    const weekIdentifier = getCurrentWeekIdentifier();
    const viewerId = await getOptionalAuthUserId(ctx);
    const rows = await scanRankedStats(ctx, weekIdentifier);

    if (!viewerId) {
      return {
        weekIdentifier,
        totalRanked: rows.length,
        myEntry: null,
        neighbours: [],
      };
    }

    const myIndex = rows.findIndex(r => r.userId === viewerId);
    if (myIndex === -1) {
      return {
        weekIdentifier,
        totalRanked: rows.length,
        myEntry: null,
        neighbours: [],
      };
    }

    const from = Math.max(0, myIndex - NEIGHBOUR_WINDOW);
    const to = Math.min(rows.length, myIndex + NEIGHBOUR_WINDOW + 1);
    const slice = rows.slice(from, to);

    const entries = await Promise.all(
      slice.map(async (row, sliceIdx) => {
        const user = await ctx.db.get(row.userId);
        if (!user) return null;
        const absoluteIndex = from + sliceIdx;
        const entry: LeaderboardEntry = {
          rank: absoluteIndex + 1,
          userId: row.userId,
          name: user.name ?? null,
          avatarUrl: user.image ?? null,
          currentWeekXp: row.currentWeekXp,
          totalXp: row.totalXp,
          isMe: row.userId === viewerId,
        };
        return entry;
      })
    );

    const neighbours = entries.filter((e): e is LeaderboardEntry => e !== null);
    const myEntry = neighbours.find(e => e.isMe) ?? null;
    return {
      weekIdentifier,
      totalRanked: rows.length,
      myEntry,
      neighbours,
    };
  },
});
