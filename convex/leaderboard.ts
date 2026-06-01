/**
 * Weekly leaderboard queries (D3).
 *
 * The data source is `user_xp_stats` (already populated by `xp.ts` on every
 * XP-awarding event) + `users`. This module exposes:
 *  - `getWeeklyTop`           — top N with rank numbers baked in.
 *  - `getMyRank`              — caller's rank + two neighbours on either side.
 *  - `getWeeklyOverview`      — totals + my rank only (no user docs).
 *  - `getLeaderboardSnapshot` — combined query for the Leaderboard page, makes
 *                                one scan and one settings/users batch instead of three.
 *
 * Privacy: rows whose owner has `privacy.leaderboardOptOut === true` or
 * `privacy.profileVisibility === 'private'` are removed from the visible list.
 * Their absolute rank position is still consumed (an opted-out top scorer
 * leaves a "gap" rather than promoting the next user) so that visible ranks
 * remain consistent with `getWeeklyOverview.myRank`.
 *
 * Using the live `user_xp_stats` table keeps the feature cheap (no cron,
 * no materialised view yet) and the `by_week_and_xp` index already orders
 * rows by weekly XP. We cap scans to 500 rows for ranking which is well
 * beyond the product's current active-user count.
 */

import { query, type QueryCtx } from './_generated/server';
import { v } from 'convex/values';
import type { Doc, Id } from './_generated/dataModel';
import { getOptionalAuthUserId } from './utils';
import { getCurrentWeekIdentifier } from './xp';

const MAX_LEADERBOARD_SCAN = 500;
const DEFAULT_TOP_LIMIT = 20;
const MAX_TOP_LIMIT = 100;
const NEIGHBOUR_WINDOW = 2;
const DEFAULT_SNAPSHOT_TOP_LIMIT = 50;

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

export type WeeklyOverview = {
  weekIdentifier: string;
  weekEndsAt: number;
  totalRanked: number;
  myRank: number | null;
  promotionCutoffRank: number;
  leagueTierKey: 'gold';
  leagueSeal: string;
};

export type LeaderboardSnapshot = {
  weekIdentifier: string;
  weekEndsAt: number;
  totalRanked: number;
  promotionCutoffRank: number;
  leagueTierKey: 'gold';
  leagueSeal: string;
  top: LeaderboardEntry[];
  myEntry: LeaderboardEntry | null;
  neighbours: LeaderboardEntry[];
};

type RankedRow = {
  row: Doc<'user_xp_stats'>;
  rank: number;
};

const getCurrentIsoWeekEndsAt = (): number => {
  const now = new Date();
  const todayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const isoDay = todayUtc.getUTCDay() || 7;
  todayUtc.setUTCDate(todayUtc.getUTCDate() + (7 - isoDay));
  todayUtc.setUTCHours(23, 59, 59, 999);
  return todayUtc.getTime();
};

async function scanRankedStats(ctx: QueryCtx, weekIdentifier: string) {
  return ctx.db
    .query('user_xp_stats')
    .withIndex('by_week_and_xp', q => q.eq('weekIdentifier', weekIdentifier))
    .order('desc')
    .take(MAX_LEADERBOARD_SCAN);
}

/**
 * For the given user IDs, return the subset that opted out of the leaderboard
 * or set their profile to private. Used to filter rows from `user_xp_stats`
 * without changing their absolute rank position.
 */
async function loadHiddenUserSet(ctx: QueryCtx, userIds: Id<'users'>[]): Promise<Set<string>> {
  const unique = Array.from(new Set(userIds.map(String))) as string[];
  const idsToLookup = unique as unknown as Id<'users'>[];
  const settings = await Promise.all(
    idsToLookup.map(uid =>
      ctx.db
        .query('user_settings')
        .withIndex('by_user', q => q.eq('userId', uid))
        .first()
    )
  );
  const hidden = new Set<string>();
  settings.forEach((settingDoc, idx) => {
    const privacy = settingDoc?.privacy;
    if (privacy?.leaderboardOptOut === true || privacy?.profileVisibility === 'private') {
      hidden.add(unique[idx]);
    }
  });
  return hidden;
}

/**
 * Scan `user_xp_stats`, assign absolute ranks, and drop rows whose owner is
 * hidden from the leaderboard. The returned `rank` is still 1-based against
 * the full unfiltered ordering — opted-out top scorers leave gaps rather than
 * shifting other users up.
 */
async function getVisibleRankedRows(ctx: QueryCtx, weekIdentifier: string): Promise<RankedRow[]> {
  const rows = await scanRankedStats(ctx, weekIdentifier);
  const hidden = await loadHiddenUserSet(
    ctx,
    rows.map(r => r.userId)
  );
  return rows
    .map((row, i) => ({ row, rank: i + 1 }))
    .filter(({ row }) => !hidden.has(String(row.userId)));
}

async function entriesFromRanked(
  ctx: QueryCtx,
  ranked: RankedRow[],
  viewerId: Id<'users'> | null
): Promise<LeaderboardEntry[]> {
  const users = await Promise.all(ranked.map(({ row }) => ctx.db.get(row.userId)));
  return ranked
    .map(({ row, rank }, i) => {
      const user = users[i];
      if (!user) return null;
      const entry: LeaderboardEntry = {
        rank,
        userId: row.userId,
        name: user.name ?? null,
        avatarUrl: user.image ?? null,
        currentWeekXp: row.currentWeekXp,
        totalXp: row.totalXp,
        isMe: viewerId !== null && row.userId === viewerId,
      };
      return entry;
    })
    .filter((entry): entry is LeaderboardEntry => entry !== null);
}

function neighbourSliceIndex(visibleRanked: RankedRow[], viewerId: Id<'users'> | null): number {
  if (!viewerId) return -1;
  return visibleRanked.findIndex(({ row }) => row.userId === viewerId);
}

export const getWeeklyTop = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<LeaderboardEntry[]> => {
    const limit = Math.max(1, Math.min(args.limit ?? DEFAULT_TOP_LIMIT, MAX_TOP_LIMIT));
    const weekIdentifier = getCurrentWeekIdentifier();
    const viewerId = await getOptionalAuthUserId(ctx);

    const visibleRanked = await getVisibleRankedRows(ctx, weekIdentifier);
    const top = visibleRanked.slice(0, limit);
    return entriesFromRanked(ctx, top, viewerId);
  },
});

export const getMyRank = query({
  args: {},
  handler: async (ctx): Promise<MyRankResult> => {
    const weekIdentifier = getCurrentWeekIdentifier();
    const viewerId = await getOptionalAuthUserId(ctx);
    const visibleRanked = await getVisibleRankedRows(ctx, weekIdentifier);

    if (!viewerId) {
      return {
        weekIdentifier,
        totalRanked: visibleRanked.length,
        myEntry: null,
        neighbours: [],
      };
    }

    const myVisibleIndex = neighbourSliceIndex(visibleRanked, viewerId);
    if (myVisibleIndex === -1) {
      return {
        weekIdentifier,
        totalRanked: visibleRanked.length,
        myEntry: null,
        neighbours: [],
      };
    }

    const from = Math.max(0, myVisibleIndex - NEIGHBOUR_WINDOW);
    const to = Math.min(visibleRanked.length, myVisibleIndex + NEIGHBOUR_WINDOW + 1);
    const slice = visibleRanked.slice(from, to);

    const neighbours = await entriesFromRanked(ctx, slice, viewerId);
    const myEntry = neighbours.find(e => e.isMe) ?? null;
    return {
      weekIdentifier,
      totalRanked: visibleRanked.length,
      myEntry,
      neighbours,
    };
  },
});

export const getWeeklyOverview = query({
  args: {},
  handler: async (ctx): Promise<WeeklyOverview> => {
    const weekIdentifier = getCurrentWeekIdentifier();
    const viewerId = await getOptionalAuthUserId(ctx);
    const visibleRanked = await getVisibleRankedRows(ctx, weekIdentifier);
    const myIndex = neighbourSliceIndex(visibleRanked, viewerId);

    return {
      weekIdentifier,
      weekEndsAt: getCurrentIsoWeekEndsAt(),
      totalRanked: visibleRanked.length,
      myRank: myIndex >= 0 ? visibleRanked[myIndex].rank : null,
      promotionCutoffRank: 10,
      leagueTierKey: 'gold',
      leagueSeal: '盟',
    };
  },
});

/**
 * Combined query for the Leaderboard page: returns everything the page needs
 * from one scan + one user-doc batch, instead of fanning out into three
 * separate `useQuery` calls that each re-scan the table.
 */
export const getLeaderboardSnapshot = query({
  args: {
    topLimit: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<LeaderboardSnapshot> => {
    const topLimit = Math.max(
      1,
      Math.min(args.topLimit ?? DEFAULT_SNAPSHOT_TOP_LIMIT, MAX_TOP_LIMIT)
    );
    const weekIdentifier = getCurrentWeekIdentifier();
    const viewerId = await getOptionalAuthUserId(ctx);
    const visibleRanked = await getVisibleRankedRows(ctx, weekIdentifier);

    const myVisibleIndex = neighbourSliceIndex(visibleRanked, viewerId);
    const topRanked = visibleRanked.slice(0, topLimit);

    // Build a deduped set of ranked rows we need user docs for: top N + my window.
    const neededIndexSet = new Set<number>();
    for (let i = 0; i < topRanked.length; i++) neededIndexSet.add(i);
    if (myVisibleIndex >= 0) {
      const from = Math.max(0, myVisibleIndex - NEIGHBOUR_WINDOW);
      const to = Math.min(visibleRanked.length, myVisibleIndex + NEIGHBOUR_WINDOW + 1);
      for (let i = from; i < to; i++) neededIndexSet.add(i);
    }
    const neededIndices = Array.from(neededIndexSet).sort((a, b) => a - b);
    const neededRanked = neededIndices.map(i => visibleRanked[i]);
    const builtEntries = await entriesFromRanked(ctx, neededRanked, viewerId);

    // Map from absolute index → entry (some may have been dropped if user doc is missing).
    const entryByIndex = new Map<number, LeaderboardEntry>();
    builtEntries.forEach(entry => {
      // entry.rank is the absolute rank; we recover the source index via rank-1.
      entryByIndex.set(entry.rank - 1, entry);
    });

    const top = topRanked
      .map(({ rank }) => entryByIndex.get(rank - 1))
      .filter((entry): entry is LeaderboardEntry => entry !== undefined);

    let neighbours: LeaderboardEntry[] = [];
    let myEntry: LeaderboardEntry | null = null;
    if (myVisibleIndex >= 0) {
      const from = Math.max(0, myVisibleIndex - NEIGHBOUR_WINDOW);
      const to = Math.min(visibleRanked.length, myVisibleIndex + NEIGHBOUR_WINDOW + 1);
      neighbours = visibleRanked
        .slice(from, to)
        .map(({ rank }) => entryByIndex.get(rank - 1))
        .filter((entry): entry is LeaderboardEntry => entry !== undefined);
      myEntry = neighbours.find(e => e.isMe) ?? null;
    }

    return {
      weekIdentifier,
      weekEndsAt: getCurrentIsoWeekEndsAt(),
      totalRanked: visibleRanked.length,
      promotionCutoffRank: 10,
      leagueTierKey: 'gold',
      leagueSeal: '盟',
      top,
      myEntry,
      neighbours,
    };
  },
});
