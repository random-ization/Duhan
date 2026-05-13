/**
 * Unified in-app notifications + preferences + push subscription orchestration.
 */

import { ConvexError, v } from 'convex/values';
import { mutation, query, internalMutation, type MutationCtx } from './_generated/server';
import type { Doc, Id } from './_generated/dataModel';
import { getAuthUserId, getOptionalAuthUserId } from './utils';
import {
  buildExamCountdownCopy,
  buildFriendActivityDigestCopy,
  buildStreakReminderCopy,
  resolveNotificationLanguage,
  type NotificationLanguage,
} from './notificationCopy';

const DEFAULT_LIST_LIMIT = 20;
const MAX_LIST_LIMIT = 100;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const ONE_HOUR_MS = 60 * 60 * 1000;
const STREAK_REMINDER_INACTIVE_MS = ONE_DAY_MS;
const STREAK_REMINDER_MAX_IDLE_MS = 30 * ONE_DAY_MS;
const PARTNER_MILESTONE_DEDUPE_MS = ONE_HOUR_MS;
const EXAM_COUNTDOWN_WINDOW_DAYS = 8;
const EXAM_COUNTDOWN_TARGET_DAYS = new Set<number>([1, 7]);
const EXAM_COUNTDOWN_TARGET_HOURS = new Set<number>([1]);
const EXAM_COUNTDOWN_ACTIVE_WINDOW_MS = 90 * ONE_DAY_MS;
const SOCIAL_DIGEST_ACTIVE_WINDOW_MS = 14 * ONE_DAY_MS;
const USER_SCAN_PAGE_SIZE = 500;
const MAX_SCANNED_ACTIVE_USERS = 10_000;
const DAILY_TIME_WINDOW_MINUTES = 25;
const SOCIAL_DIGEST_MAX_FRIEND_SCAN = 30;
const SOCIAL_DIGEST_MAX_EVENTS_SCAN = 100;

export type NotificationKind =
  | 'streak_reminder'
  | 'exam_countdown'
  | 'partner_milestone'
  | 'achievement_unlocked'
  | 'answer_received'
  | 'answer_accepted'
  | 'mention'
  | 'friend_activity'
  | 'friend_request'
  | 'friend_accepted'
  | 'group_invite'
  | 'group_accepted';

export type NotificationCategory = 'learning' | 'exam' | 'social' | 'system';
export type NotificationPriority = 'low' | 'normal' | 'high';
export type NotificationMetadata = Record<string, string | number | boolean>;

export type NotificationDto = {
  id: Id<'notifications'>;
  kind: NotificationKind;
  category: NotificationCategory;
  priority: NotificationPriority;
  title: string;
  body: string;
  linkPath?: string;
  metadata?: NotificationMetadata;
  readAt?: number;
  deliveredAt?: number;
  pushSentAt?: number;
  expiresAt?: number;
  createdAt: number;
};

export type NotificationPreferencesDto = {
  enabled: boolean;
  channels: {
    inApp: boolean;
    pwa: boolean;
  };
  categories: {
    learning: boolean;
    exam: boolean;
    social: boolean;
    system: boolean;
  };
  dailyReminderLocalTime: string;
  timezone: string;
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
  };
};

const KIND_VALIDATOR = v.union(
  v.literal('streak_reminder'),
  v.literal('exam_countdown'),
  v.literal('partner_milestone'),
  v.literal('achievement_unlocked'),
  v.literal('answer_received'),
  v.literal('answer_accepted'),
  v.literal('mention'),
  v.literal('friend_activity'),
  v.literal('friend_request'),
  v.literal('friend_accepted'),
  v.literal('group_invite'),
  v.literal('group_accepted')
);

const METADATA_VALIDATOR = v.record(v.string(), v.union(v.string(), v.number(), v.boolean()));
const HHMM_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

const DEFAULT_PREFS: NotificationPreferencesDto = {
  enabled: true,
  channels: {
    inApp: true,
    pwa: false,
  },
  categories: {
    learning: true,
    exam: true,
    social: true,
    system: true,
  },
  dailyReminderLocalTime: '20:00',
  timezone: 'Asia/Seoul',
  quietHours: {
    enabled: true,
    start: '22:00',
    end: '08:00',
  },
};

type EnqueueNotificationArgs = {
  userId: Id<'users'>;
  kind: NotificationKind;
  title: string;
  body: string;
  linkPath?: string;
  metadata?: NotificationMetadata;
  dedupeKey?: string;
  expiresAt?: number;
};

type EnqueueNotificationResult = { inserted: false } | { inserted: true; id: Id<'notifications'> };

type ActiveUserCandidate = {
  userId: Id<'users'>;
  lastActivityAt: number;
  accountStatus?: string;
};

type PushSubscriptionPayload = {
  endpoint: string;
  expirationTime?: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
};

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

function resolveHoursUntil(targetAt: number, now: number): number {
  return Math.ceil((targetAt - now) / ONE_HOUR_MS);
}

function getDedupeWindowMs(kind: NotificationKind): number | null {
  if (kind === 'streak_reminder' || kind === 'exam_countdown' || kind === 'friend_activity') {
    return ONE_DAY_MS;
  }
  if (kind === 'partner_milestone') return PARTNER_MILESTONE_DEDUPE_MS;
  return null;
}

function parseHHMM(value: string): { hour: number; minute: number } | null {
  const match = HHMM_REGEX.exec(value);
  if (!match) return null;
  const hour = Number.parseInt(match[1], 10);
  const minute = Number.parseInt(match[2], 10);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  return { hour, minute };
}

function normalizeHHMM(value: string | undefined, fallback: string): string {
  if (!value) return fallback;
  return HHMM_REGEX.test(value) ? value : fallback;
}

function normalizeTimezone(value: string | undefined, fallback: string): string {
  if (!value || !value.trim()) return fallback;
  try {
    const formatter = new Intl.DateTimeFormat('en-US', { timeZone: value, hour: '2-digit' });
    void formatter.format(new Date());
    return value;
  } catch {
    return fallback;
  }
}

function toLocalMinutes(now: number, timezone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(new Date(now));
  const hourToken = parts.find(part => part.type === 'hour');
  const minuteToken = parts.find(part => part.type === 'minute');
  const hour = hourToken ? Number.parseInt(hourToken.value, 10) : 0;
  const minute = minuteToken ? Number.parseInt(minuteToken.value, 10) : 0;
  return hour * 60 + minute;
}

function minuteDistance(a: number, b: number): number {
  const direct = Math.abs(a - b);
  return Math.min(direct, 24 * 60 - direct);
}

function isWithinReminderWindow(now: number, timezone: string, hhmm: string): boolean {
  const parsed = parseHHMM(hhmm);
  if (!parsed) return false;
  const targetMinutes = parsed.hour * 60 + parsed.minute;
  const localMinutes = toLocalMinutes(now, timezone);
  return minuteDistance(localMinutes, targetMinutes) <= DAILY_TIME_WINDOW_MINUTES;
}

function isWithinQuietHours(now: number, timezone: string, startHHMM: string, endHHMM: string): boolean {
  const start = parseHHMM(startHHMM);
  const end = parseHHMM(endHHMM);
  if (!start || !end) return false;
  const startMinutes = start.hour * 60 + start.minute;
  const endMinutes = end.hour * 60 + end.minute;
  const localMinutes = toLocalMinutes(now, timezone);
  if (startMinutes === endMinutes) return true;
  if (startMinutes < endMinutes) {
    return localMinutes >= startMinutes && localMinutes < endMinutes;
  }
  return localMinutes >= startMinutes || localMinutes < endMinutes;
}

function sanitizeLinkPath(linkPath: string | undefined): string | undefined {
  if (!linkPath) return undefined;
  if (!linkPath.startsWith('/')) return undefined;
  if (linkPath.startsWith('//')) return undefined;
  return linkPath;
}

function isSubscriptionExpired(
  subscription: Doc<'push_subscriptions'>,
  now: number
): boolean {
  return typeof subscription.expirationTime === 'number' && subscription.expirationTime <= now;
}

function resolveCategoryFromKind(kind: NotificationKind): NotificationCategory {
  if (
    kind === 'streak_reminder' ||
    kind === 'answer_received' ||
    kind === 'answer_accepted' ||
    kind === 'mention'
  ) {
    return 'learning';
  }
  if (kind === 'exam_countdown') return 'exam';
  if (
    kind === 'friend_activity' ||
    kind === 'friend_request' ||
    kind === 'friend_accepted' ||
    kind === 'group_invite' ||
    kind === 'group_accepted' ||
    kind === 'partner_milestone'
  ) {
    return 'social';
  }
  return 'system';
}

function resolvePriorityFromKind(kind: NotificationKind): NotificationPriority {
  if (kind === 'exam_countdown' || kind === 'friend_request' || kind === 'group_invite') {
    return 'high';
  }
  if (kind === 'achievement_unlocked') return 'low';
  return 'normal';
}

export async function enqueueNotificationFromMutation(
  ctx: MutationCtx,
  args: EnqueueNotificationArgs
): Promise<EnqueueNotificationResult> {
  return enqueueNotificationInternal(ctx, args);
}

function toPreferencesDto(row?: Doc<'notification_preferences'> | null): NotificationPreferencesDto {
  if (!row) return DEFAULT_PREFS;
  return {
    enabled: row.enabled,
    channels: {
      inApp: row.inAppEnabled,
      pwa: row.pwaEnabled,
    },
    categories: {
      learning: row.learningEnabled,
      exam: row.examEnabled,
      social: row.socialEnabled,
      system: row.systemEnabled,
    },
    dailyReminderLocalTime: normalizeHHMM(
      row.dailyReminderLocalTime,
      DEFAULT_PREFS.dailyReminderLocalTime
    ),
    timezone: normalizeTimezone(row.timezone, DEFAULT_PREFS.timezone),
    quietHours: {
      enabled: row.quietHoursEnabled,
      start: normalizeHHMM(row.quietHoursStart, DEFAULT_PREFS.quietHours.start),
      end: normalizeHHMM(row.quietHoursEnd, DEFAULT_PREFS.quietHours.end),
    },
  };
}

async function loadPreferences(ctx: MutationCtx, userId: Id<'users'>): Promise<NotificationPreferencesDto> {
  const row = await ctx.db
    .query('notification_preferences')
    .withIndex('by_user', q => q.eq('userId', userId))
    .first();
  return toPreferencesDto(row);
}

async function ensurePreferencesRow(ctx: MutationCtx, userId: Id<'users'>) {
  const existing = await ctx.db
    .query('notification_preferences')
    .withIndex('by_user', q => q.eq('userId', userId))
    .first();
  if (existing) return existing;
  const now = Date.now();
  const id = await ctx.db.insert('notification_preferences', {
    userId,
    enabled: DEFAULT_PREFS.enabled,
    inAppEnabled: DEFAULT_PREFS.channels.inApp,
    pwaEnabled: DEFAULT_PREFS.channels.pwa,
    learningEnabled: DEFAULT_PREFS.categories.learning,
    examEnabled: DEFAULT_PREFS.categories.exam,
    socialEnabled: DEFAULT_PREFS.categories.social,
    systemEnabled: DEFAULT_PREFS.categories.system,
    dailyReminderLocalTime: DEFAULT_PREFS.dailyReminderLocalTime,
    timezone: DEFAULT_PREFS.timezone,
    quietHoursEnabled: DEFAULT_PREFS.quietHours.enabled,
    quietHoursStart: DEFAULT_PREFS.quietHours.start,
    quietHoursEnd: DEFAULT_PREFS.quietHours.end,
    createdAt: now,
    updatedAt: now,
  });
  const created = await ctx.db.get(id);
  if (!created) {
    throw new ConvexError({ code: 'NOTIFICATION_PREF_CREATE_FAILED' });
  }
  return created;
}

function isCategoryEnabled(prefs: NotificationPreferencesDto, category: NotificationCategory): boolean {
  if (category === 'learning') return prefs.categories.learning;
  if (category === 'exam') return prefs.categories.exam;
  if (category === 'social') return prefs.categories.social;
  return prefs.categories.system;
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

async function hasPendingStudySignal(ctx: MutationCtx, userId: Id<'users'>, now: number): Promise<boolean> {
  const dueByNextReview = await ctx.db
    .query('user_vocab_progress')
    .withIndex('by_user_next_review', q => q.eq('userId', userId).lte('nextReviewAt', now))
    .take(1);
  if (dueByNextReview.length > 0) return true;

  const dueByDue = await ctx.db
    .query('user_vocab_progress')
    .withIndex('by_user_due', q => q.eq('userId', userId).lte('due', now))
    .take(1);
  if (dueByDue.length > 0) return true;

  const queuedNotes = await ctx.db
    .query('note_review_queue')
    .withIndex('by_user_status', q => q.eq('userId', userId).eq('status', 'queued'))
    .take(25);
  if (
    queuedNotes.some(
      row => typeof row.scheduledFor !== 'number' || !Number.isFinite(row.scheduledFor) || row.scheduledFor <= now
    )
  ) {
    return true;
  }

  const activeSessions = await ctx.db
    .query('vocab_learning_sessions')
    .withIndex('by_user_status_updatedAt', q => q.eq('userId', userId).eq('status', 'ACTIVE'))
    .take(1);
  return activeSessions.length > 0;
}

async function enqueueNotificationInternal(
  ctx: MutationCtx,
  args: EnqueueNotificationArgs
): Promise<EnqueueNotificationResult> {
  const category = resolveCategoryFromKind(args.kind);
  const priority = resolvePriorityFromKind(args.kind);
  const now = Date.now();
  const prefs = await loadPreferences(ctx, args.userId);

  if (!prefs.enabled || !prefs.channels.inApp) return { inserted: false };
  if (!isCategoryEnabled(prefs, category)) return { inserted: false };
  if (
    prefs.quietHours.enabled &&
    priority !== 'high' &&
    isWithinQuietHours(now, prefs.timezone, prefs.quietHours.start, prefs.quietHours.end)
  ) {
    return { inserted: false };
  }

  const dedupeWindowMs = getDedupeWindowMs(args.kind);
  if (args.dedupeKey && dedupeWindowMs !== null) {
    const since = now - dedupeWindowMs;
    const recent = await ctx.db
      .query('notifications')
      .withIndex('by_user_createdAt', q => q.eq('userId', args.userId).gte('createdAt', since))
      .take(60);

    const alreadySent = recent.some(row => {
      if (row.kind !== args.kind) return false;
      const metadata = row.metadata;
      if (!metadata) return false;
      return metadata.dedupeKey === args.dedupeKey;
    });
    if (alreadySent) return { inserted: false };
  }

  const mergedMeta: NotificationMetadata | undefined =
    args.metadata || args.dedupeKey
      ? {
          ...(args.metadata ?? {}),
          ...(args.dedupeKey ? { dedupeKey: args.dedupeKey } : {}),
        }
      : undefined;

  const id = await ctx.db.insert('notifications', {
    userId: args.userId,
    kind: args.kind,
    category,
    priority,
    title: args.title,
    body: args.body,
    linkPath: sanitizeLinkPath(args.linkPath),
    metadata: mergedMeta,
    deliveredAt: now,
    createdAt: now,
    expiresAt: args.expiresAt,
  });

  if (prefs.channels.pwa) {
    const activeSubscriptions = await ctx.db
      .query('push_subscriptions')
      .withIndex('by_user', q => q.eq('userId', args.userId))
      .take(20);
    let hasDeliverableSubscription = false;
    for (const subscription of activeSubscriptions) {
      if (subscription.revokedAt) continue;
      if (isSubscriptionExpired(subscription, now)) {
        await ctx.db.patch(subscription._id, {
          revokedAt: now,
          updatedAt: now,
        });
        continue;
      }
      hasDeliverableSubscription = true;
    }
    if (hasDeliverableSubscription) {
      await ctx.db.patch(id, { pushSentAt: now });
    }
  }

  return { inserted: true, id };
}

function toDto(row: Doc<'notifications'>): NotificationDto {
  const category = row.category ?? resolveCategoryFromKind(row.kind);
  const priority = row.priority ?? resolvePriorityFromKind(row.kind);
  return {
    id: row._id,
    kind: row.kind,
    category,
    priority,
    title: row.title,
    body: row.body,
    linkPath: row.linkPath,
    metadata: row.metadata,
    readAt: row.readAt,
    deliveredAt: row.deliveredAt,
    pushSentAt: row.pushSentAt,
    expiresAt: row.expiresAt,
    createdAt: row.createdAt,
  };
}

export const getPreferences = query({
  args: {},
  handler: async ctx => {
    const userId = await getOptionalAuthUserId(ctx);
    if (!userId) return DEFAULT_PREFS;
    const row = await ctx.db
      .query('notification_preferences')
      .withIndex('by_user', q => q.eq('userId', userId))
      .first();
    return toPreferencesDto(row);
  },
});

export const updatePreferences = mutation({
  args: {
    enabled: v.optional(v.boolean()),
    channels: v.optional(
      v.object({
        inApp: v.optional(v.boolean()),
        pwa: v.optional(v.boolean()),
      })
    ),
    categories: v.optional(
      v.object({
        learning: v.optional(v.boolean()),
        exam: v.optional(v.boolean()),
        social: v.optional(v.boolean()),
        system: v.optional(v.boolean()),
      })
    ),
    dailyReminderLocalTime: v.optional(v.string()),
    timezone: v.optional(v.string()),
    quietHours: v.optional(
      v.object({
        enabled: v.optional(v.boolean()),
        start: v.optional(v.string()),
        end: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const existing = await ensurePreferencesRow(ctx, userId);
    const current = toPreferencesDto(existing);

    const next: NotificationPreferencesDto = {
      enabled: args.enabled ?? current.enabled,
      channels: {
        inApp: args.channels?.inApp ?? current.channels.inApp,
        pwa: args.channels?.pwa ?? current.channels.pwa,
      },
      categories: {
        learning: args.categories?.learning ?? current.categories.learning,
        exam: args.categories?.exam ?? current.categories.exam,
        social: args.categories?.social ?? current.categories.social,
        system: args.categories?.system ?? current.categories.system,
      },
      dailyReminderLocalTime: normalizeHHMM(
        args.dailyReminderLocalTime,
        current.dailyReminderLocalTime
      ),
      timezone: normalizeTimezone(args.timezone, current.timezone),
      quietHours: {
        enabled: args.quietHours?.enabled ?? current.quietHours.enabled,
        start: normalizeHHMM(args.quietHours?.start, current.quietHours.start),
        end: normalizeHHMM(args.quietHours?.end, current.quietHours.end),
      },
    };

    await ctx.db.patch(existing._id, {
      enabled: next.enabled,
      inAppEnabled: next.channels.inApp,
      pwaEnabled: next.channels.pwa,
      learningEnabled: next.categories.learning,
      examEnabled: next.categories.exam,
      socialEnabled: next.categories.social,
      systemEnabled: next.categories.system,
      dailyReminderLocalTime: next.dailyReminderLocalTime,
      timezone: next.timezone,
      quietHoursEnabled: next.quietHours.enabled,
      quietHoursStart: next.quietHours.start,
      quietHoursEnd: next.quietHours.end,
      updatedAt: Date.now(),
    });

    return next;
  },
});

export const subscribePush = mutation({
  args: {
    subscription: v.object({
      endpoint: v.string(),
      expirationTime: v.optional(v.union(v.number(), v.null())),
      keys: v.object({
        p256dh: v.string(),
        auth: v.string(),
      }),
    }),
    userAgent: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const payload: PushSubscriptionPayload = {
      endpoint: args.subscription.endpoint,
      expirationTime: args.subscription.expirationTime,
      keys: args.subscription.keys,
    };
    const now = Date.now();

    const existing = await ctx.db
      .query('push_subscriptions')
      .withIndex('by_user_endpoint', q => q.eq('userId', userId).eq('endpoint', payload.endpoint))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        platform: 'web',
        p256dh: payload.keys.p256dh,
        auth: payload.keys.auth,
        expirationTime:
          typeof payload.expirationTime === 'number' ? payload.expirationTime : undefined,
        userAgent: args.userAgent,
        revokedAt: undefined,
        lastSeenAt: now,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert('push_subscriptions', {
        userId,
        platform: 'web',
        endpoint: payload.endpoint,
        p256dh: payload.keys.p256dh,
        auth: payload.keys.auth,
        expirationTime:
          typeof payload.expirationTime === 'number' ? payload.expirationTime : undefined,
        userAgent: args.userAgent,
        lastSeenAt: now,
        createdAt: now,
        updatedAt: now,
      });
    }

    return { ok: true as const };
  },
});

export const unsubscribePush = mutation({
  args: {
    endpoint: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const now = Date.now();

    const endpoint = args.endpoint;
    if (typeof endpoint === 'string' && endpoint.length > 0) {
      const item = await ctx.db
        .query('push_subscriptions')
        .withIndex('by_user_endpoint', q => q.eq('userId', userId).eq('endpoint', endpoint))
        .first();
      if (item) {
        await ctx.db.patch(item._id, { revokedAt: now, updatedAt: now });
      }
      return { ok: true as const };
    }

    const rows = await ctx.db
      .query('push_subscriptions')
      .withIndex('by_user', q => q.eq('userId', userId))
      .take(50);
    for (const row of rows) {
      if (!row.revokedAt) {
        await ctx.db.patch(row._id, { revokedAt: now, updatedAt: now });
      }
    }
    return { ok: true as const };
  },
});

export const getVapidPublicKey = query({
  args: {},
  handler: async () => {
    const key = process.env.WEB_PUSH_VAPID_PUBLIC_KEY;
    return typeof key === 'string' && key.trim().length > 0 ? key : null;
  },
});

/**
 * Unread notifications, newest first.
 */
export const listUnread = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<NotificationDto[]> => {
    const userId = await getOptionalAuthUserId(ctx);
    if (!userId) return [];
    const limit = Math.max(1, Math.min(args.limit ?? DEFAULT_LIST_LIMIT, MAX_LIST_LIMIT));
    const now = Date.now();

    const rows = await ctx.db
      .query('notifications')
      .withIndex('by_user_createdAt', q => q.eq('userId', userId))
      .order('desc')
      .take(limit * 3);
    return rows
      .filter(r => !r.readAt && (!r.expiresAt || r.expiresAt > now))
      .slice(0, limit)
      .map(toDto);
  },
});

/**
 * Recent notifications (read + unread), newest first.
 */
export const listRecent = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<NotificationDto[]> => {
    const userId = await getOptionalAuthUserId(ctx);
    if (!userId) return [];
    const limit = Math.max(1, Math.min(args.limit ?? DEFAULT_LIST_LIMIT, MAX_LIST_LIMIT));
    const now = Date.now();

    const rows = await ctx.db
      .query('notifications')
      .withIndex('by_user_createdAt', q => q.eq('userId', userId))
      .order('desc')
      .take(limit);
    return rows.filter(row => !row.expiresAt || row.expiresAt > now).map(toDto);
  },
});

export const getUnreadCount = query({
  args: {},
  handler: async (ctx): Promise<number> => {
    const userId = await getOptionalAuthUserId(ctx);
    if (!userId) return 0;
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

export const enqueueNotification = internalMutation({
  args: {
    userId: v.id('users'),
    kind: KIND_VALIDATOR,
    title: v.string(),
    body: v.string(),
    linkPath: v.optional(v.string()),
    metadata: v.optional(METADATA_VALIDATOR),
    dedupeKey: v.optional(v.string()),
    expiresAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return enqueueNotificationInternal(ctx, args);
  },
});

export const sendStreakReminder = internalMutation({
  args: {},
  handler: async ctx => {
    const now = Date.now();
    const users = await scanUsersByLastActivity(ctx, now - STREAK_REMINDER_MAX_IDLE_MS);

    let usersConsidered = 0;
    let inserted = 0;
    for (const user of users) {
      if (user.accountStatus === 'DISABLED') continue;
      const inactiveMs = now - user.lastActivityAt;
      if (inactiveMs < STREAK_REMINDER_INACTIVE_MS) continue;
      if (inactiveMs > STREAK_REMINDER_MAX_IDLE_MS) continue;

      const prefs = await loadPreferences(ctx, user.userId);
      if (!prefs.enabled || !prefs.categories.learning) continue;
      if (!isWithinReminderWindow(now, prefs.timezone, prefs.dailyReminderLocalTime)) continue;

      const hasPending = await hasPendingStudySignal(ctx, user.userId, now);
      if (!hasPending) continue;

      usersConsidered += 1;
      const dedupeKey = `learning-reminder:${formatDateKey(now)}:${user.userId}`;
      const language = await resolveNotificationLanguage(ctx, user.userId);
      const copy = buildStreakReminderCopy(language);
      const result = await enqueueNotificationInternal(ctx, {
        userId: user.userId,
        kind: 'streak_reminder',
        title: copy.title,
        body: copy.body,
        linkPath: '/review',
        metadata: {
          inactiveHours: Math.floor(inactiveMs / ONE_HOUR_MS),
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
      const hoursUntil = resolveHoursUntil(exam.scheduledAt, now);
      return EXAM_COUNTDOWN_TARGET_DAYS.has(daysUntil) || EXAM_COUNTDOWN_TARGET_HOURS.has(hoursUntil);
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

    const languageByUser = new Map<Id<'users'>, NotificationLanguage>();
    for (const user of enabledUsers) {
      languageByUser.set(user.userId, await resolveNotificationLanguage(ctx, user.userId));
    }

    let inserted = 0;
    for (const exam of targetExams) {
      if (typeof exam.scheduledAt !== 'number') continue;
      const daysUntil = resolveDaysUntil(exam.scheduledAt, now);
      const hoursUntil = resolveHoursUntil(exam.scheduledAt, now);
      const isHourLevel = EXAM_COUNTDOWN_TARGET_HOURS.has(hoursUntil) && daysUntil <= 1;
      const scheduledIso = formatIsoDate(exam.scheduledAt);
      const marker = isHourLevel ? `h${String(hoursUntil)}` : `d${String(daysUntil)}`;
      const dedupeKey = `exam-countdown:${String(exam._id)}:${marker}:${runDateKey}`;

      for (const user of enabledUsers) {
        const language = languageByUser.get(user.userId) ?? 'en';
        const copy = buildExamCountdownCopy({
          language,
          examTitle: exam.title,
          scheduledIso,
          daysUntil,
          hoursUntil,
        });
        const result = await enqueueNotificationInternal(ctx, {
          userId: user.userId,
          kind: 'exam_countdown',
          title: copy.title,
          body: copy.body,
          linkPath: `/topik`,
          metadata: {
            examId: String(exam._id),
            examTitle: exam.title,
            scheduledAt: exam.scheduledAt,
            daysUntil,
            hoursUntil,
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

export const sendFriendActivityDigest = internalMutation({
  args: {},
  handler: async ctx => {
    const now = Date.now();
    const todayStart = new Date(new Date(now).toDateString()).getTime();
    const users = await scanUsersByLastActivity(ctx, now - SOCIAL_DIGEST_ACTIVE_WINDOW_MS);
    let considered = 0;
    let inserted = 0;

    for (const user of users) {
      if (user.accountStatus === 'DISABLED') continue;
      const prefs = await loadPreferences(ctx, user.userId);
      if (!prefs.enabled || !prefs.categories.social) continue;
      if (prefs.quietHours.enabled && isWithinQuietHours(now, prefs.timezone, prefs.quietHours.start, prefs.quietHours.end)) {
        continue;
      }

      const followings = await ctx.db
        .query('friendships')
        .withIndex('by_follower', q => q.eq('followerId', user.userId))
        .take(SOCIAL_DIGEST_MAX_FRIEND_SCAN);

      const friendIds: Id<'users'>[] = [];
      for (const edge of followings) {
        const reverse = await ctx.db
          .query('friendships')
          .withIndex('by_both', q => q.eq('followerId', edge.followingId).eq('followingId', user.userId))
          .first();
        if (reverse) friendIds.push(edge.followingId);
      }
      if (friendIds.length === 0) continue;

      let eventCount = 0;
      for (const friendId of friendIds) {
        const events = await ctx.db
          .query('learning_events')
          .withIndex('by_user_eventAt', q => q.eq('userId', friendId).gte('eventAt', todayStart))
          .take(SOCIAL_DIGEST_MAX_EVENTS_SCAN);
        eventCount += events.filter(item => item.eventName === 'review_completed' || item.eventName === 'content_completed' || item.eventName === 'session_completed' || item.eventName === 'exam_submitted').length;
        if (eventCount > 0) break;
      }

      if (eventCount === 0) continue;
      considered += 1;
      const dedupeKey = `friend-activity:${formatDateKey(now)}:${user.userId}`;
      const language = await resolveNotificationLanguage(ctx, user.userId);
      const copy = buildFriendActivityDigestCopy(language);
      const result = await enqueueNotificationInternal(ctx, {
        userId: user.userId,
        kind: 'friend_activity',
        title: copy.title,
        body: copy.body,
        linkPath: '/community',
        metadata: {
          eventCount,
        },
        dedupeKey,
      });
      if (result.inserted) inserted += 1;
    }

    return {
      scannedUsers: users.length,
      usersConsidered: considered,
      inserted,
    };
  },
});
