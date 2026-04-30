/**
 * Study partnerships (D4).
 *
 * Lightweight pairing between two learners. The surface the mobile UI
 * needs is small:
 *  - `invitePartner`       — the signed-in user invites a target user.
 *  - `acceptPartnership`   — the target user accepts the pending invite.
 *  - `declinePartnership`  — the target user rejects; partnership ends.
 *  - `endPartnership`      — either side ends an active partnership.
 *  - `listPending`         — invites the viewer has sent or received.
 *  - `getActivePartnership`— the viewer's single active pair (or null).
 *
 * This module deliberately does not implement a friend graph — the
 * partnership table itself is the source of truth. Milestone notifications
 * live in `notifications.ts`; we only enqueue them from here.
 */

import { query, mutation, type QueryCtx } from './_generated/server';
import { v } from 'convex/values';
import { ConvexError } from 'convex/values';
import { makeFunctionReference, type FunctionReference } from 'convex/server';
import type { Id } from './_generated/dataModel';
import { getAuthUserId, getOptionalAuthUserId } from './utils';
import { ONE_DAY_MS, computeStreak, startOfDay } from './userStatsHelpers';
import { buildPartnerAcceptedCopy, resolveNotificationLanguage } from './notificationCopy';

/** Window we scan back through `learning_events` when deriving a partner's
 * streak. 35 days is enough for the longest realistic streak chain without
 * unbounded reads; if a streak legitimately exceeds this we report `35`
 * which is visually indistinguishable on the Study buddy card. */
const PARTNER_STREAK_WINDOW_DAYS = 35;
const PARTNER_EVENT_PAGE_SIZE = 250;

/**
 * Lightweight single-user stat scan for the Study buddy card only.
 * Returns the user's current streak (same algorithm as `userStats.getStats`)
 * and minutes studied so far today. Bounded by PARTNER_STREAK_WINDOW_DAYS —
 * we stop reading once the oldest seen day is older than that window.
 *
 * We keep this local (rather than calling `userStats.getStats`) because
 * `getStats` also fans out to courses/vocab/grammar progress tables, which
 * would triple the read cost for a query that just wants two numbers.
 */
async function getPartnerLiteStats(
  ctx: QueryCtx,
  userId: Id<'users'>,
  todayStart: number
): Promise<{ streak: number; todayMinutes: number }> {
  const cutoff = todayStart - PARTNER_STREAK_WINDOW_DAYS * ONE_DAY_MS;
  const activeDays = new Set<number>();
  let todayMinutesRaw = 0;
  let cursor: string | null = null;
  let pages = 0;
  const MAX_PAGES = 4; // hard stop — ≤ 1000 events

  while (pages < MAX_PAGES) {
    const page = await ctx.db
      .query('learning_events')
      .withIndex('by_user_eventAt', q => q.eq('userId', userId))
      .order('desc')
      .paginate({ cursor, numItems: PARTNER_EVENT_PAGE_SIZE });
    pages += 1;

    let oldestSeen = Number.POSITIVE_INFINITY;
    for (const event of page.page) {
      const eventDay = startOfDay(event.eventAt);
      oldestSeen = Math.min(oldestSeen, eventDay);
      activeDays.add(eventDay);
      if (event.eventAt >= todayStart) {
        todayMinutesRaw += Math.max(0, (event.durationSec ?? 0) / 60);
      }
    }

    if (page.isDone) break;
    if (oldestSeen <= cutoff) break;
    cursor = page.continueCursor;
  }

  return {
    streak: computeStreak(activeDays, todayStart),
    todayMinutes: Math.round(todayMinutesRaw),
  };
}

export type PartnershipStatus = 'pending' | 'active' | 'ended';

export type PartnerProfileLite = {
  userId: Id<'users'>;
  name: string | null;
  avatarUrl: string | null;
};

export type PartnershipDto = {
  id: Id<'studyPartnerships'>;
  status: PartnershipStatus;
  role: 'inviter' | 'invitee';
  partner: PartnerProfileLite;
  startedAt: number;
  acceptedAt?: number;
  endedAt?: number;
};

export type ActivePartnershipDto = PartnershipDto & {
  status: 'active';
  /** Sum of today's study minutes across both learners. */
  sharedMinutesToday: number;
  /** Min of the two streaks — keeps both honest. */
  combinedStreak: number;
};

type EnqueueNotificationArgs = {
  userId: Id<'users'>;
  kind: 'partner_milestone';
  title: string;
  body: string;
  linkPath?: string;
  metadata?: Record<string, unknown>;
  dedupeKey?: string;
};

const enqueueNotificationMutation = makeFunctionReference<
  'mutation',
  EnqueueNotificationArgs,
  unknown
>('notifications:enqueueNotification') as unknown as FunctionReference<
  'mutation',
  'internal',
  EnqueueNotificationArgs,
  unknown
>;

async function partnerProfile(ctx: QueryCtx, userId: Id<'users'>): Promise<PartnerProfileLite> {
  const user = await ctx.db.get(userId);
  return {
    userId,
    name: user?.name ?? null,
    avatarUrl: user?.image ?? null,
  };
}

function toDto(
  row: {
    _id: Id<'studyPartnerships'>;
    userA: Id<'users'>;
    userB: Id<'users'>;
    status: PartnershipStatus;
    startedAt: number;
    acceptedAt?: number;
    endedAt?: number;
  },
  viewerId: Id<'users'>,
  partner: PartnerProfileLite
): PartnershipDto {
  return {
    id: row._id,
    status: row.status,
    role: row.userA === viewerId ? 'inviter' : 'invitee',
    partner,
    startedAt: row.startedAt,
    acceptedAt: row.acceptedAt,
    endedAt: row.endedAt,
  };
}

async function findExistingPairing(ctx: QueryCtx, userA: Id<'users'>, userB: Id<'users'>) {
  const asAInvitee = await ctx.db
    .query('studyPartnerships')
    .withIndex('by_userA_status', q => q.eq('userA', userA))
    .take(50);
  const asBInvitee = await ctx.db
    .query('studyPartnerships')
    .withIndex('by_userB_status', q => q.eq('userB', userA))
    .take(50);
  return [...asAInvitee, ...asBInvitee].find(
    row =>
      (row.userA === userA && row.userB === userB) || (row.userA === userB && row.userB === userA)
  );
}

async function hasActivePartnership(ctx: QueryCtx, userId: Id<'users'>): Promise<boolean> {
  const [asUserAActive, asUserBActive] = await Promise.all([
    ctx.db
      .query('studyPartnerships')
      .withIndex('by_userA_status', q => q.eq('userA', userId).eq('status', 'active'))
      .take(1),
    ctx.db
      .query('studyPartnerships')
      .withIndex('by_userB_status', q => q.eq('userB', userId).eq('status', 'active'))
      .take(1),
  ]);
  return asUserAActive.length > 0 || asUserBActive.length > 0;
}

export const invitePartner = mutation({
  args: {
    targetUserId: v.id('users'),
  },
  handler: async (ctx, args) => {
    const viewerId = await getAuthUserId(ctx);
    if (viewerId === args.targetUserId) {
      throw new ConvexError({
        code: 'INVALID_TARGET',
        message: 'Cannot pair with yourself.',
      });
    }
    const target = await ctx.db.get(args.targetUserId);
    if (!target) {
      throw new ConvexError({
        code: 'TARGET_NOT_FOUND',
        message: 'User does not exist.',
      });
    }

    const existing = await findExistingPairing(ctx, viewerId, args.targetUserId);
    if (existing) {
      if (existing.status === 'active' || existing.status === 'pending') {
        return { id: existing._id, alreadyExists: true as const };
      }
    }

    if (await hasActivePartnership(ctx, args.targetUserId)) {
      throw new ConvexError({
        code: 'TARGET_ALREADY_PAIRED',
        message: 'That learner already has a study buddy.',
      });
    }

    if (existing) {
      // Old "ended" pairing — revive instead of duplicating.
      await ctx.db.patch(existing._id, {
        userA: viewerId,
        userB: args.targetUserId,
        status: 'pending',
        startedAt: Date.now(),
        acceptedAt: undefined,
        endedAt: undefined,
      });
      return { id: existing._id, alreadyExists: false as const };
    }

    const id = await ctx.db.insert('studyPartnerships', {
      userA: viewerId,
      userB: args.targetUserId,
      status: 'pending',
      startedAt: Date.now(),
    });
    return { id, alreadyExists: false as const };
  },
});

export const acceptPartnership = mutation({
  args: {
    partnershipId: v.id('studyPartnerships'),
  },
  handler: async (ctx, args) => {
    const viewerId = await getAuthUserId(ctx);
    const row = await ctx.db.get(args.partnershipId);
    if (!row) {
      throw new ConvexError({ code: 'NOT_FOUND' });
    }
    if (row.userB !== viewerId) {
      throw new ConvexError({ code: 'FORBIDDEN' });
    }
    if (row.status !== 'pending') {
      return { ok: false as const, reason: row.status };
    }

    const now = Date.now();
    await ctx.db.patch(args.partnershipId, {
      status: 'active',
      acceptedAt: now,
    });

    const language = await resolveNotificationLanguage(ctx, row.userA);
    const copy = buildPartnerAcceptedCopy(language);
    await ctx.scheduler.runAfter(0, enqueueNotificationMutation, {
      userId: row.userA,
      kind: 'partner_milestone',
      title: copy.title,
      body: copy.body,
      linkPath: '/dashboard',
      metadata: {
        partnershipId: String(args.partnershipId),
        partnerUserId: String(row.userB),
      },
      dedupeKey: `partnership-accepted:${String(args.partnershipId)}`,
    });

    return { ok: true as const };
  },
});

export const declinePartnership = mutation({
  args: {
    partnershipId: v.id('studyPartnerships'),
  },
  handler: async (ctx, args) => {
    const viewerId = await getAuthUserId(ctx);
    const row = await ctx.db.get(args.partnershipId);
    if (!row) throw new ConvexError({ code: 'NOT_FOUND' });
    if (row.userB !== viewerId) throw new ConvexError({ code: 'FORBIDDEN' });
    if (row.status !== 'pending') return { ok: false as const };
    await ctx.db.patch(args.partnershipId, {
      status: 'ended',
      endedAt: Date.now(),
    });
    return { ok: true as const };
  },
});

export const endPartnership = mutation({
  args: {
    partnershipId: v.id('studyPartnerships'),
  },
  handler: async (ctx, args) => {
    const viewerId = await getAuthUserId(ctx);
    const row = await ctx.db.get(args.partnershipId);
    if (!row) throw new ConvexError({ code: 'NOT_FOUND' });
    if (row.userA !== viewerId && row.userB !== viewerId) {
      throw new ConvexError({ code: 'FORBIDDEN' });
    }
    if (row.status === 'ended') return { ok: false as const };
    await ctx.db.patch(args.partnershipId, {
      status: 'ended',
      endedAt: Date.now(),
    });
    return { ok: true as const };
  },
});

export const listPending = query({
  args: {},
  handler: async (ctx): Promise<PartnershipDto[]> => {
    const viewerId = await getOptionalAuthUserId(ctx);
    if (!viewerId) return [];

    const sentRows = await ctx.db
      .query('studyPartnerships')
      .withIndex('by_userA_status', q => q.eq('userA', viewerId).eq('status', 'pending'))
      .take(20);
    const receivedRows = await ctx.db
      .query('studyPartnerships')
      .withIndex('by_userB_status', q => q.eq('userB', viewerId).eq('status', 'pending'))
      .take(20);

    const combined = [...sentRows, ...receivedRows];
    const dtos = await Promise.all(
      combined.map(async row => {
        const partnerId = row.userA === viewerId ? row.userB : row.userA;
        const partner = await partnerProfile(ctx, partnerId);
        return toDto(row, viewerId, partner);
      })
    );
    return dtos;
  },
});

export const getActivePartnership = query({
  args: {},
  handler: async (ctx): Promise<ActivePartnershipDto | null> => {
    const viewerId = await getOptionalAuthUserId(ctx);
    if (!viewerId) return null;

    const asAActive = await ctx.db
      .query('studyPartnerships')
      .withIndex('by_userA_status', q => q.eq('userA', viewerId).eq('status', 'active'))
      .take(1);
    const asBActive = await ctx.db
      .query('studyPartnerships')
      .withIndex('by_userB_status', q => q.eq('userB', viewerId).eq('status', 'active'))
      .take(1);
    const row = asAActive[0] ?? asBActive[0] ?? null;
    if (!row) return null;

    const partnerId = row.userA === viewerId ? row.userB : row.userA;
    const partner = await partnerProfile(ctx, partnerId);
    const base = toDto(row, viewerId, partner);

    // Derive the two shared numbers locally with a bounded scan of each
    // user's `learning_events`. Each call reads at most
    // PARTNER_EVENT_PAGE_SIZE × MAX_PAGES events and stops early once
    // `oldestSeen` falls outside the 35-day window.
    const todayStart = startOfDay(Date.now());
    const [viewerStats, partnerStats] = await Promise.all([
      getPartnerLiteStats(ctx, viewerId, todayStart),
      getPartnerLiteStats(ctx, partnerId, todayStart),
    ]);

    return {
      ...base,
      status: 'active',
      sharedMinutesToday: viewerStats.todayMinutes + partnerStats.todayMinutes,
      // `combinedStreak` is the minimum of the two — both partners have to
      // show up the same day for it to increment. Keeps accountability honest.
      combinedStreak: Math.min(viewerStats.streak, partnerStats.streak),
    };
  },
});
