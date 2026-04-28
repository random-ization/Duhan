/**
 * In-app notification feed (E3).
 *
 * Responsibilities
 * - Query: `listUnread`, `listRecent` — power the bell badge & panel in
 *   `MobileHeader.tsx`.
 * - Mutation: `markRead`, `markAllRead`, `dismiss`.
 * - Internal mutation: `enqueueNotification` — the single write path used
 *   by scheduled actions (streak reminder, exam countdown) and other
 *   server-side code (partner milestone, achievement unlock).
 *
 * This module deliberately stays tiny: scheduling / push delivery lives
 * elsewhere (crons + an action that iterates users). The table is the
 * source of truth the UI reads.
 */

import { query, mutation, internalMutation, type MutationCtx } from './_generated/server';
import { v } from 'convex/values';
import type { Id } from './_generated/dataModel';
import { getAuthUserId, getOptionalAuthUserId } from './utils';

const DEFAULT_LIST_LIMIT = 20;
const MAX_LIST_LIMIT = 100;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const STREAK_REMINDER_INACTIVE_MS = ONE_DAY_MS;
const STREAK_REMINDER_MAX_IDLE_MS = 30 * ONE_DAY_MS;
const PARTNER_MILESTONE_DEDUPE_MS = 60 * 60 * 1000;
const EXAM_COUNTDOWN_WINDOW_DAYS = 8;
const EXAM_COUNTDOWN_TARGET_DAYS = new Set<number>([1, 7]);
const EXAM_COUNTDOWN_ACTIVE_WINDOW_MS = 90 * ONE_DAY_MS;
const USER_SCAN_PAGE_SIZE = 500;
const MAX_SCANNED_ACTIVE_USERS = 10_000;

export type NotificationKind =
  | 'streak_reminder'
  | 'exam_countdown'
  | 'partner_milestone'
  | 'achievement_unlocked'
  | 'friend_activity'
  | 'friend_request'
  | 'friend_accepted'
  | 'group_invite'
  | 'group_accepted';

export type NotificationDto = {
  id: Id<'notifications'>;
  kind: NotificationKind;
  title: string;
  body: string;
  linkPath?: string;
  metadata?: unknown;
  readAt?: number;
  createdAt: number;
};

const KIND_VALIDATOR = v.union(
  v.literal('streak_reminder'),
  v.literal('exam_countdown'),
  v.literal('partner_milestone'),
  v.literal('achievement_unlocked'),
  v.literal('friend_activity'),
  v.literal('friend_request'),
  v.literal('friend_accepted'),
  v.literal('group_invite'),
  v.literal('group_accepted')
);

type NotificationMetadata = Record<string, unknown>;

type EnqueueNotificationArgs = {
  userId: Id<'users'>;
  kind: NotificationKind;
  title: string;
  body: string;
  linkPath?: string;
  metadata?: unknown;
  dedupeKey?: string;
};

type EnqueueNotificationResult = { inserted: false } | { inserted: true; id: Id<'notifications'> };

type ActiveUserCandidate = {
  userId: Id<'users'>;
  lastActivityAt: number;
  accountStatus?: string;
};

function asRecord(value: unknown): NotificationMetadata | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  return value as NotificationMetadata;
}

function formatDateKey(timestamp: number): string {
  const date = new Date(timestamp);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatIsoDate(timestamp: number): string {
  return new Date(timestamp).toISOString().slice(0, 10);
}

function resolveDaysUntil(targetAt: number, now: number): number {
  return Math.ceil((targetAt - now) / ONE_DAY_MS);
}

function getDedupeWindowMs(kind: NotificationKind): number | null {
  if (kind === 'streak_reminder' || kind === 'exam_countdown') return ONE_DAY_MS;
  if (kind === 'partner_milestone') return PARTNER_MILESTONE_DEDUPE_MS;
  return null;
}

async function scanUsersByLastActivity(
  ctx: MutationCtx,
  minLastActivityAt: number
): Promise<ActiveUserCandidate[]> {
  const users: ActiveUserCandidate[] = [];
  let cursor: string | null = null;

  while (users.length < MAX_SCANNED_ACTIVE_USERS) {
    const page = await ctx.db
      .query('users')
      .withIndex('by_lastActivityAt', q => q.gte('lastActivityAt', minLastActivityAt))
      .order('desc')
      .paginate({ cursor, numItems: USER_SCAN_PAGE_SIZE });

    for (const user of page.page) {
      if (typeof user.lastActivityAt !== 'number') continue;
      users.push({
        userId: user._id,
        lastActivityAt: user.lastActivityAt,
        accountStatus: user.accountStatus,
      });
      if (users.length >= MAX_SCANNED_ACTIVE_USERS) break;
    }

    if (page.isDone || users.length >= MAX_SCANNED_ACTIVE_USERS) break;
    cursor = page.continueCursor;
  }

  return users;
}

async function enqueueNotificationInternal(
  ctx: MutationCtx,
  args: EnqueueNotificationArgs
): Promise<EnqueueNotificationResult> {
  const dedupeWindowMs = getDedupeWindowMs(args.kind);
  if (args.dedupeKey && dedupeWindowMs !== null) {
    const since = Date.now() - dedupeWindowMs;
    const recent = await ctx.db
      .query('notifications')
      .withIndex('by_user_createdAt', q => q.eq('userId', args.userId).gte('createdAt', since))
      .take(50);

    const alreadySent = recent.some(row => {
      if (row.kind !== args.kind) return false;
      const metadata = asRecord(row.metadata);
      return metadata?.dedupeKey === args.dedupeKey;
    });
    if (alreadySent) return { inserted: false };
  }

  const baseMetadata = asRecord(args.metadata);
  const mergedMeta =
    args.dedupeKey || baseMetadata
      ? { ...(baseMetadata ?? {}), dedupeKey: args.dedupeKey }
      : undefined;

  const id = await ctx.db.insert('notifications', {
    userId: args.userId,
    kind: args.kind,
    title: args.title,
    body: args.body,
    linkPath: args.linkPath,
    metadata: mergedMeta,
    createdAt: Date.now(),
  });
  return { inserted: true, id };
}

function toDto(row: {
  _id: Id<'notifications'>;
  kind: NotificationKind;
  title: string;
  body: string;
  linkPath?: string;
  metadata?: unknown;
  readAt?: number;
  createdAt: number;
}): NotificationDto {
  return {
    id: row._id,
    kind: row.kind,
    title: row.title,
    body: row.body,
    linkPath: row.linkPath,
    metadata: row.metadata,
    readAt: row.readAt,
    createdAt: row.createdAt,
  };
}

/**
 * Unread notifications, newest first. Used for the bell badge count and
 * the first open of the notifications panel.
 */
export const listUnread = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<NotificationDto[]> => {
    const userId = await getOptionalAuthUserId(ctx);
    if (!userId) return [];
    const limit = Math.max(1, Math.min(args.limit ?? DEFAULT_LIST_LIMIT, MAX_LIST_LIMIT));

    const rows = await ctx.db
      .query('notifications')
      .withIndex('by_user_createdAt', q => q.eq('userId', userId))
      .order('desc')
      .take(limit * 3); // overscan — we filter unread client-side to avoid
    return rows
      .filter(r => !r.readAt)
      .slice(0, limit)
      .map(toDto);
  },
});

/**
 * Recent notifications (read + unread), newest first. Used by the full
 * notifications panel / modal.
 */
export const listRecent = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<NotificationDto[]> => {
    const userId = await getOptionalAuthUserId(ctx);
    if (!userId) return [];
    const limit = Math.max(1, Math.min(args.limit ?? DEFAULT_LIST_LIMIT, MAX_LIST_LIMIT));

    const rows = await ctx.db
      .query('notifications')
      .withIndex('by_user_createdAt', q => q.eq('userId', userId))
      .order('desc')
      .take(limit);
    return rows.map(toDto);
  },
});

/**
 * Cheap count query so the bell badge can refresh without fetching bodies.
 */
export const getUnreadCount = query({
  args: {},
  handler: async (ctx): Promise<number> => {
    const userId = await getOptionalAuthUserId(ctx);
    if (!userId) return 0;
    // Cap the scan — badge UX just needs "1+" precision above ~50.
    const rows = await ctx.db
      .query('notifications')
      .withIndex('by_user_read', q => q.eq('userId', userId).eq('readAt', undefined))
      .take(50);
    return rows.length;
  },
});

export const markRead = mutation({
  args: {
    id: v.id('notifications'),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const row = await ctx.db.get(args.id);
    if (!row || row.userId !== userId) return { ok: false as const };
    if (!row.readAt) {
      await ctx.db.patch(args.id, { readAt: Date.now() });
    }
    return { ok: true as const };
  },
});

export const markAllRead = mutation({
  args: {},
  handler: async ctx => {
    const userId = await getAuthUserId(ctx);
    const rows = await ctx.db
      .query('notifications')
      .withIndex('by_user_read', q => q.eq('userId', userId).eq('readAt', undefined))
      .take(200);
    const now = Date.now();
    for (const row of rows) {
      await ctx.db.patch(row._id, { readAt: now });
    }
    return { updated: rows.length };
  },
});

export const dismiss = mutation({
  args: {
    id: v.id('notifications'),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const row = await ctx.db.get(args.id);
    if (!row || row.userId !== userId) return { ok: false as const };
    await ctx.db.delete(args.id);
    return { ok: true as const };
  },
});

/**
 * Internal — the single write path. Scheduled actions (cron-based streak
 * reminder, exam countdown) and synchronous server code (achievement
 * unlock, partner milestone) call this to enqueue a notification.
 *
 * Idempotency: callers can pass `dedupeKey`; if a notification with the
 * same kind + dedupeKey exists for this user within the last 24h we skip.
 */
export const enqueueNotification = internalMutation({
  args: {
    userId: v.id('users'),
    kind: KIND_VALIDATOR,
    title: v.string(),
    body: v.string(),
    linkPath: v.optional(v.string()),
    metadata: v.optional(v.any()),
    dedupeKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return enqueueNotificationInternal(ctx, args);
  },
});

export const sendStreakReminder = internalMutation({
  args: {},
  handler: async ctx => {
    const now = Date.now();
    const dedupeKey = `streak-reminder:${formatDateKey(now)}`;
    const users = await scanUsersByLastActivity(ctx, now - STREAK_REMINDER_MAX_IDLE_MS);

    let usersConsidered = 0;
    let inserted = 0;
    for (const user of users) {
      if (user.accountStatus === 'DISABLED') continue;

      const inactiveMs = now - user.lastActivityAt;
      if (inactiveMs < STREAK_REMINDER_INACTIVE_MS) continue;
      if (inactiveMs > STREAK_REMINDER_MAX_IDLE_MS) continue;

      usersConsidered += 1;
      const result = await enqueueNotificationInternal(ctx, {
        userId: user.userId,
        kind: 'streak_reminder',
        title: 'Keep your streak alive',
        body: 'You have reviews waiting today. Complete a short session to keep momentum.',
        linkPath: '/review',
        metadata: {
          inactiveHours: Math.floor(inactiveMs / (60 * 60 * 1000)),
        },
        dedupeKey,
      });
      if (result.inserted) inserted += 1;
    }

    return {
      scannedUsers: users.length,
      usersConsidered,
      inserted,
    };
  },
});

export const sendExamCountdown = internalMutation({
  args: {},
  handler: async ctx => {
    const now = Date.now();
    const windowEnd = now + EXAM_COUNTDOWN_WINDOW_DAYS * ONE_DAY_MS;
    const runDateKey = formatDateKey(now);

    const upcomingExams = await ctx.db
      .query('topik_exams')
      .withIndex('by_scheduledAt', q => q.gte('scheduledAt', now).lte('scheduledAt', windowEnd))
      .collect();

    const targetExams = upcomingExams.filter(exam => {
      if (typeof exam.scheduledAt !== 'number' || !Number.isFinite(exam.scheduledAt)) return false;
      const daysUntil = resolveDaysUntil(exam.scheduledAt, now);
      return EXAM_COUNTDOWN_TARGET_DAYS.has(daysUntil);
    });

    if (targetExams.length === 0) {
      return {
        scannedUsers: 0,
        targetExams: 0,
        inserted: 0,
      };
    }

    const users = await scanUsersByLastActivity(ctx, now - EXAM_COUNTDOWN_ACTIVE_WINDOW_MS);
    const enabledUsers = users.filter(user => {
      if (user.accountStatus === 'DISABLED') return false;
      return now - user.lastActivityAt <= EXAM_COUNTDOWN_ACTIVE_WINDOW_MS;
    });

    let inserted = 0;
    for (const exam of targetExams) {
      if (typeof exam.scheduledAt !== 'number') continue;
      const daysUntil = resolveDaysUntil(exam.scheduledAt, now);
      const title =
        daysUntil === 1 ? 'TOPIK exam tomorrow' : `TOPIK exam in ${String(daysUntil)} days`;
      const body = `${exam.title} is scheduled on ${formatIsoDate(exam.scheduledAt)}.`;
      const dedupeKey = `exam-countdown:${String(exam._id)}:d${String(daysUntil)}:${runDateKey}`;

      for (const user of enabledUsers) {
        const result = await enqueueNotificationInternal(ctx, {
          userId: user.userId,
          kind: 'exam_countdown',
          title,
          body,
          linkPath: '/topik',
          metadata: {
            examId: String(exam._id),
            examTitle: exam.title,
            scheduledAt: exam.scheduledAt,
            daysUntil,
          },
          dedupeKey,
        });
        if (result.inserted) inserted += 1;
      }
    }

    return {
      scannedUsers: enabledUsers.length,
      targetExams: targetExams.length,
      inserted,
    };
  },
});
