/**
 * League tiers (community v2).
 *
 * Tiers (ascending): bronze < silver < gold < diamond.
 * Cohort target size: COHORT_TARGET (30). Per-week settlement assigns top 20%
 * to promote, bottom 20% to demote, middle 60% stay. New users start in
 * bronze. Settlement runs at most once per ISO week via the dedupe table.
 *
 * Frontend flow:
 *  1. Call `bootstrapMyMembership` mutation on community page mount
 *     (lazy creates the row for the current week if missing).
 *  2. Subscribe to `getMyLeagueMeta` + `getMyLeagueBoard` queries
 *     (read-only, return null if not bootstrapped).
 *  3. Cron calls `settleIfNeeded` daily — no-op except on the boundary day.
 */

import { ConvexError, v } from 'convex/values';
import type { Doc, Id } from './_generated/dataModel';
import { mutation, query, type MutationCtx, type QueryCtx } from './_generated/server';
import { getAuthUserId, getOptionalAuthUserId } from './utils';
import { getCurrentWeekIdentifier } from './xp';

const TIER_ORDER = ['bronze', 'silver', 'gold', 'diamond'] as const;
type Tier = (typeof TIER_ORDER)[number];

const COHORT_TARGET = 30;
const PROMOTE_FRACTION = 0.2;
const DEMOTE_FRACTION = 0.2;
const COHORT_SCAN_LIMIT = 2000;

function isTier(value: string): value is Tier {
  return (TIER_ORDER as readonly string[]).includes(value);
}

function tierIndex(tier: Tier): number {
  return TIER_ORDER.indexOf(tier);
}

function nextTierUp(tier: Tier): Tier {
  const idx = tierIndex(tier);
  return TIER_ORDER[Math.min(idx + 1, TIER_ORDER.length - 1)];
}

function nextTierDown(tier: Tier): Tier {
  const idx = tierIndex(tier);
  return TIER_ORDER[Math.max(idx - 1, 0)];
}

function previousWeekIdentifier(currentWeek: string): string {
  const match = currentWeek.match(/^(\d{4})-W(\d{1,2})$/);
  if (!match) return currentWeek;
  let year = Number(match[1]);
  const week = Number(match[2]);
  if (week > 1) return `${year}-W${week - 1}`;
  year -= 1;
  return `${year}-W52`;
}

function buildCohortId(weekIdentifier: string, tier: Tier, cohortNum: number): string {
  return `${weekIdentifier}:${tier}:${cohortNum}`;
}

export type LeagueTier = Tier;

export type LeagueMetaDto = {
  weekIdentifier: string;
  tier: Tier;
  cohortId: string;
  cohortRank: number;
  cohortSize: number;
  promoteThresholdRank: number;
  demoteThresholdRank: number;
  weeklyXp: number;
  weekEndsAtMs: number;
};

export type LeagueEntryDto = {
  rank: number;
  userId: Id<'users'>;
  name: string;
  avatarUrl: string | null;
  weeklyXp: number;
  tier: Tier;
  isMe: boolean;
  willPromote: boolean;
  willDemote: boolean;
};

function pickName(user: Doc<'users'>): string {
  const name = typeof user.name === 'string' ? user.name.trim() : '';
  return name || 'Learner';
}

type UserPrivacy = {
  profileVisibility?: 'public' | 'friends' | 'private';
  leaderboardOptOut?: boolean;
};

async function loadUserPrivacy(
  ctx: QueryCtx | MutationCtx,
  userId: Id<'users'>
): Promise<UserPrivacy> {
  const settings = await ctx.db
    .query('user_settings')
    .withIndex('by_user', q => q.eq('userId', userId))
    .first();
  return settings?.privacy ?? {};
}

function isoWeekEndsAtMs(now: number): number {
  const date = new Date(now);
  const dayOfWeek = date.getUTCDay() === 0 ? 7 : date.getUTCDay();
  const daysUntilMonday = 8 - dayOfWeek;
  const next = new Date(now);
  next.setUTCDate(date.getUTCDate() + daysUntilMonday);
  next.setUTCHours(0, 0, 0, 0);
  return next.getTime();
}

async function getMembership(
  ctx: QueryCtx | MutationCtx,
  userId: Id<'users'>,
  weekIdentifier: string
) {
  return await ctx.db
    .query('league_memberships')
    .withIndex('by_week_user', q => q.eq('weekIdentifier', weekIdentifier).eq('userId', userId))
    .first();
}

async function getCohortMembers(
  ctx: QueryCtx | MutationCtx,
  cohortId: string
): Promise<Doc<'league_memberships'>[]> {
  return await ctx.db
    .query('league_memberships')
    .withIndex('by_cohort_xp', q => q.eq('cohortId', cohortId))
    .order('desc')
    .take(COHORT_TARGET * 2);
}

async function getOrCreateCohortIdForTier(
  ctx: MutationCtx,
  weekIdentifier: string,
  tier: Tier
): Promise<string> {
  for (let cohortNum = 1; cohortNum < 1024; cohortNum += 1) {
    const cohortId = buildCohortId(weekIdentifier, tier, cohortNum);
    const members = await ctx.db
      .query('league_memberships')
      .withIndex('by_cohort_xp', q => q.eq('cohortId', cohortId))
      .take(COHORT_TARGET + 1);
    if (members.length === 0) return cohortId;
    if (members.length < COHORT_TARGET) return cohortId;
  }
  return buildCohortId(weekIdentifier, tier, 1024);
}

async function loadXp(
  ctx: QueryCtx | MutationCtx,
  userId: Id<'users'>,
  weekIdentifier: string
): Promise<number> {
  const stat = await ctx.db
    .query('user_xp_stats')
    .withIndex('by_user_week', q => q.eq('userId', userId).eq('weekIdentifier', weekIdentifier))
    .first();
  return stat?.currentWeekXp ?? 0;
}

function computeMetaFromMembers(
  membership: Doc<'league_memberships'>,
  cohortMembers: Doc<'league_memberships'>[]
): LeagueMetaDto {
  const sorted = [...cohortMembers].sort((a, b) => b.weeklyXpSnapshot - a.weeklyXpSnapshot);
  const cohortRank = sorted.findIndex(m => m._id === membership._id) + 1;
  const cohortSize = sorted.length;
  const promoteCount = Math.max(1, Math.floor(cohortSize * PROMOTE_FRACTION));
  const demoteCount = Math.max(1, Math.floor(cohortSize * DEMOTE_FRACTION));
  const promoteThresholdRank = promoteCount;
  const demoteThresholdRank = Math.max(promoteCount + 1, cohortSize - demoteCount);

  return {
    weekIdentifier: membership.weekIdentifier,
    tier: isTier(membership.tier) ? membership.tier : 'bronze',
    cohortId: membership.cohortId,
    cohortRank: Math.max(cohortRank, 1),
    cohortSize,
    promoteThresholdRank,
    demoteThresholdRank,
    weeklyXp: membership.weeklyXpSnapshot,
    weekEndsAtMs: isoWeekEndsAtMs(Date.now()),
  };
}

export const bootstrapMyMembership = mutation({
  args: {},
  handler: async (ctx): Promise<{ created: boolean }> => {
    const userId = await getAuthUserId(ctx);
    const weekIdentifier = getCurrentWeekIdentifier();
    const existing = await getMembership(ctx, userId, weekIdentifier);
    if (existing) {
      const xp = await loadXp(ctx, userId, weekIdentifier);
      if (xp !== existing.weeklyXpSnapshot) {
        await ctx.db.patch(existing._id, { weeklyXpSnapshot: xp });
      }
      return { created: false };
    }

    const previousWeek = previousWeekIdentifier(weekIdentifier);
    const lastWeek = await getMembership(ctx, userId, previousWeek);
    const tier: Tier = lastWeek && isTier(lastWeek.tier) ? lastWeek.tier : 'bronze';
    const cohortId = await getOrCreateCohortIdForTier(ctx, weekIdentifier, tier);
    const xp = await loadXp(ctx, userId, weekIdentifier);

    await ctx.db.insert('league_memberships', {
      weekIdentifier,
      userId,
      tier,
      cohortId,
      weeklyXpSnapshot: xp,
    });
    return { created: true };
  },
});

export const getMyLeagueMeta = query({
  args: {},
  handler: async (ctx): Promise<LeagueMetaDto | null> => {
    const userId = await getOptionalAuthUserId(ctx);
    if (!userId) return null;
    const weekIdentifier = getCurrentWeekIdentifier();
    const membership = await getMembership(ctx, userId, weekIdentifier);
    if (!membership || !isTier(membership.tier)) return null;
    const cohortMembers = await getCohortMembers(ctx, membership.cohortId);
    return computeMetaFromMembers(membership, cohortMembers);
  },
});

export const getMyLeagueBoard = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<LeagueEntryDto[]> => {
    const userId = await getOptionalAuthUserId(ctx);
    if (!userId) return [];
    const weekIdentifier = getCurrentWeekIdentifier();
    const membership = await getMembership(ctx, userId, weekIdentifier);
    if (!membership || !isTier(membership.tier)) return [];

    const cohortMembers = await getCohortMembers(ctx, membership.cohortId);
    const limit = Math.max(1, Math.min(50, Math.floor(args.limit ?? COHORT_TARGET)));
    const sorted = [...cohortMembers].sort((a, b) => b.weeklyXpSnapshot - a.weeklyXpSnapshot);
    const cohortSize = sorted.length;
    const promoteCount = Math.max(1, Math.floor(cohortSize * PROMOTE_FRACTION));
    const demoteCount = Math.max(1, Math.floor(cohortSize * DEMOTE_FRACTION));
    const demoteCutoffRank = Math.max(promoteCount + 1, cohortSize - demoteCount);

    const tier = membership.tier;
    const userIds = sorted.map(m => m.userId);
    const userDocs = await Promise.all(userIds.map(id => ctx.db.get(id)));
    const privacyDocs = await Promise.all(userIds.map(id => loadUserPrivacy(ctx, id)));
    const userMap = new Map(
      userDocs.filter((u): u is Doc<'users'> => u !== null).map(u => [u._id, u])
    );
    const privacyMap = new Map(userIds.map((id, index) => [String(id), privacyDocs[index]]));

    const entries: LeagueEntryDto[] = [];
    for (let i = 0; i < sorted.length && entries.length < limit; i += 1) {
      const member = sorted[i];
      const user = userMap.get(member.userId);
      if (!user) continue;
      const privacy = privacyMap.get(String(member.userId));
      const isMe = member.userId === userId;
      const hiddenByVisibility = privacy?.profileVisibility === 'private' && !isMe;
      const hiddenByOptOut = privacy?.leaderboardOptOut === true && !isMe;
      if (hiddenByVisibility || hiddenByOptOut) continue;
      const rank = i + 1;
      entries.push({
        rank,
        userId: member.userId,
        name: pickName(user),
        avatarUrl: user.avatar || user.image || null,
        weeklyXp: member.weeklyXpSnapshot,
        tier,
        isMe,
        willPromote: rank <= promoteCount && tierIndex(tier) < TIER_ORDER.length - 1,
        willDemote: rank > demoteCutoffRank && tierIndex(tier) > 0,
      });
    }
    return entries;
  },
});

export const settleIfNeeded = mutation({
  args: {},
  handler: async (
    ctx
  ): Promise<{ settled: boolean; weekIdentifier?: string; usersProcessed?: number }> => {
    const currentWeek = getCurrentWeekIdentifier();
    const previousWeek = previousWeekIdentifier(currentWeek);

    const existing = await ctx.db
      .query('league_settlements')
      .withIndex('by_week', q => q.eq('weekIdentifier', previousWeek))
      .first();
    if (existing) return { settled: false };

    const previousMemberships = await ctx.db
      .query('league_memberships')
      .withIndex('by_week_user', q => q.eq('weekIdentifier', previousWeek))
      .take(COHORT_SCAN_LIMIT);
    if (previousMemberships.length === 0) {
      await ctx.db.insert('league_settlements', {
        weekIdentifier: previousWeek,
        settledAt: Date.now(),
        nextWeekPrepared: true,
        usersProcessed: 0,
      });
      return { settled: true, weekIdentifier: previousWeek, usersProcessed: 0 };
    }

    const byCohort = new Map<string, Doc<'league_memberships'>[]>();
    for (const member of previousMemberships) {
      const list = byCohort.get(member.cohortId) ?? [];
      list.push(member);
      byCohort.set(member.cohortId, list);
    }

    let usersProcessed = 0;
    for (const [, members] of byCohort) {
      members.sort((a, b) => b.weeklyXpSnapshot - a.weeklyXpSnapshot);
      const cohortSize = members.length;
      const promoteCount = Math.max(1, Math.floor(cohortSize * PROMOTE_FRACTION));
      const demoteCount = Math.max(1, Math.floor(cohortSize * DEMOTE_FRACTION));
      const demoteCutoff = Math.max(promoteCount + 1, cohortSize - demoteCount);

      for (let i = 0; i < members.length; i += 1) {
        const member = members[i];
        if (!isTier(member.tier)) continue;
        const tier = member.tier;
        const rank = i + 1;
        let nextTier: Tier = tier;
        if (rank <= promoteCount) nextTier = nextTierUp(tier);
        else if (rank > demoteCutoff) nextTier = nextTierDown(tier);

        const alreadyExists = await getMembership(ctx, member.userId, currentWeek);
        if (alreadyExists) continue;

        const cohortId = await getOrCreateCohortIdForTier(ctx, currentWeek, nextTier);
        const xp = await loadXp(ctx, member.userId, currentWeek);
        await ctx.db.insert('league_memberships', {
          weekIdentifier: currentWeek,
          userId: member.userId,
          tier: nextTier,
          cohortId,
          weeklyXpSnapshot: xp,
        });
        usersProcessed += 1;
      }
    }

    await ctx.db.insert('league_settlements', {
      weekIdentifier: previousWeek,
      settledAt: Date.now(),
      nextWeekPrepared: true,
      usersProcessed,
    });
    return { settled: true, weekIdentifier: previousWeek, usersProcessed };
  },
});

void ConvexError;
