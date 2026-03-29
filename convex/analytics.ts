import { mutation, type MutationCtx } from './_generated/server';
import type { Id } from './_generated/dataModel';
import { ConvexError, v } from 'convex/values';
import { getAuthUserId } from './utils';

const metadataValueValidator = v.union(v.string(), v.number(), v.boolean());
const metadataValidator = v.optional(v.record(v.string(), metadataValueValidator));

export const LEARNING_MODULE_VALUES = [
  'VOCAB',
  'READING',
  'LISTENING',
  'GRAMMAR',
  'EXAM',
  'PODCAST',
  'TYPING',
] as const;

export const NORMALIZED_LAST_MODULE_VALUES = [
  'VOCAB',
  'READING',
  'LISTENING',
  'GRAMMAR',
  'EXAM',
  'PODCAST',
  'TYPING',
] as const;

export const LEARNING_EVENT_NAME_VALUES = [
  'session_started',
  'session_resumed',
  'session_completed',
  'session_abandoned',
  'session_recovered',
  'session_progress',
  'review_started',
  'review_answered',
  'review_completed',
  'word_saved',
  'word_mistake_added',
  'content_opened',
  'content_completed',
  'dictionary_lookup',
  'annotation_created',
  'exam_started',
  'exam_submitted',
  'exam_auto_submitted',
] as const;

export type LearningModule = (typeof LEARNING_MODULE_VALUES)[number];
export type NormalizedLastModule = (typeof NORMALIZED_LAST_MODULE_VALUES)[number];
export type LearningEventName = (typeof LEARNING_EVENT_NAME_VALUES)[number];
export type LearningMetadata = Record<string, string | number | boolean>;

export type LearningEventInput = {
  sessionId: string;
  module: LearningModule;
  surface?: string;
  courseId?: string;
  unitId?: number;
  contentId?: string;
  eventName: LearningEventName;
  eventAt?: number;
  durationSec?: number;
  itemCount?: number;
  score?: number;
  accuracy?: number;
  result?: string;
  source?: string;
  metadata?: LearningMetadata;
};

export type LearningSessionSummaryInput = {
  sessionId: string;
  module: LearningModule;
  surface?: string;
  courseId?: string;
  unitId?: number;
  contentId?: string;
  durationSec?: number;
  itemCount?: number;
  score?: number;
  accuracy?: number;
  result?: string;
  source?: string;
  metadata?: LearningMetadata;
  eventAt?: number;
};

const learningModuleValidator = v.union(...LEARNING_MODULE_VALUES.map(value => v.literal(value)));
const learningEventNameValidator = v.union(
  ...LEARNING_EVENT_NAME_VALUES.map(value => v.literal(value))
);

const LEGACY_ACTIVITY_EVENT_MAP: Record<LearningModule, LearningEventName> = {
  VOCAB: 'review_completed',
  READING: 'content_completed',
  LISTENING: 'content_completed',
  GRAMMAR: 'session_completed',
  EXAM: 'exam_submitted',
  PODCAST: 'content_completed',
  TYPING: 'session_completed',
};

const LAST_MODULE_ALIASES: Record<string, NormalizedLastModule> = {
  VOCAB: 'VOCAB',
  VOCABULARY: 'VOCAB',
  FLASHCARD: 'VOCAB',
  LEARN: 'VOCAB',
  TEST: 'VOCAB',
  READING: 'READING',
  LISTENING: 'LISTENING',
  GRAMMAR: 'GRAMMAR',
  EXAM: 'EXAM',
  TOPIK: 'EXAM',
  PODCAST: 'PODCAST',
  TYPING: 'TYPING',
};

const MODULE_ALIASES: Record<string, LearningModule> = {
  ...LAST_MODULE_ALIASES,
  REVIEW: 'VOCAB',
};

function sanitizeSessionId(sessionId: string) {
  const value = sessionId.trim();
  if (!value) {
    throw new ConvexError({ code: 'INVALID_SESSION_ID' });
  }
  return value.slice(0, 120);
}

function sanitizeOptionalString(value?: string) {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, 160) : undefined;
}

function sanitizeOptionalNumber(value?: number) {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

export function normalizeLearningModule(value: string): LearningModule {
  const normalized = MODULE_ALIASES[value.trim().toUpperCase()];
  if (!normalized) {
    throw new ConvexError({
      code: 'INVALID_LEARNING_MODULE',
      message: `Unsupported learning module: ${value}`,
    });
  }
  return normalized;
}

export function normalizeLastModuleValue(value?: string | null): NormalizedLastModule | undefined {
  if (!value) return undefined;
  return LAST_MODULE_ALIASES[value.trim().toUpperCase()];
}

function sanitizeMetadata(metadata?: LearningMetadata) {
  if (!metadata) return undefined;
  const entries = Object.entries(metadata).filter(([, value]) => {
    if (typeof value === 'string') return value.trim().length > 0;
    return Number.isFinite(value) || typeof value === 'boolean';
  });
  if (entries.length === 0) return undefined;
  return Object.fromEntries(entries) as LearningMetadata;
}

function buildLastActivityPatch(module: LearningModule, nowMs: number) {
  return {
    lastActivityAt: nowMs,
    lastActivityType: module,
  };
}

export async function appendLearningEvent(
  ctx: MutationCtx,
  userId: Id<'users'>,
  input: LearningEventInput
) {
  const now = sanitizeOptionalNumber(input.eventAt) ?? Date.now();
  const module = normalizeLearningModule(input.module);
  const metadata = sanitizeMetadata(input.metadata);
  return await ctx.db.insert('learning_events', {
    userId,
    sessionId: sanitizeSessionId(input.sessionId),
    module,
    surface: sanitizeOptionalString(input.surface),
    courseId: sanitizeOptionalString(input.courseId),
    unitId: sanitizeOptionalNumber(input.unitId),
    contentId: sanitizeOptionalString(input.contentId),
    eventName: input.eventName,
    eventAt: now,
    durationSec: sanitizeOptionalNumber(input.durationSec),
    itemCount: sanitizeOptionalNumber(input.itemCount),
    score: sanitizeOptionalNumber(input.score),
    accuracy: sanitizeOptionalNumber(input.accuracy),
    result: sanitizeOptionalString(input.result),
    source: sanitizeOptionalString(input.source),
    metadata,
    createdAt: Date.now(),
  });
}

export async function appendActivitySummary(
  ctx: MutationCtx,
  userId: Id<'users'>,
  input: LearningSessionSummaryInput
) {
  const user = await ctx.db.get(userId);
  if (!user) {
    throw new ConvexError({ code: 'USER_NOT_FOUND' });
  }

  const now = sanitizeOptionalNumber(input.eventAt) ?? Date.now();
  const module = normalizeLearningModule(input.module);
  const metadata = sanitizeMetadata(input.metadata);
  const durationSec = Math.max(0, sanitizeOptionalNumber(input.durationSec) ?? 0);
  const durationMinutes = Math.round((durationSec / 60) * 100) / 100;
  const eventName = LEGACY_ACTIVITY_EVENT_MAP[module];

  await appendLearningEvent(ctx, userId, {
    ...input,
    module,
    eventName,
    eventAt: now,
    durationSec,
    metadata,
  });

  await ctx.db.insert('activity_logs', {
    userId,
    activityType: module,
    sessionId: sanitizeSessionId(input.sessionId),
    module,
    surface: sanitizeOptionalString(input.surface),
    courseId: sanitizeOptionalString(input.courseId),
    unitId: sanitizeOptionalNumber(input.unitId),
    contentId: sanitizeOptionalString(input.contentId),
    duration: durationMinutes,
    itemsStudied: sanitizeOptionalNumber(input.itemCount),
    score: sanitizeOptionalNumber(input.score),
    accuracy: sanitizeOptionalNumber(input.accuracy),
    result: sanitizeOptionalString(input.result),
    source: sanitizeOptionalString(input.source),
    metadata,
    createdAt: now,
  });

  await ctx.db.patch(userId, {
    totalStudyMinutes: (user.totalStudyMinutes || 0) + durationMinutes,
    ...buildLastActivityPatch(module, now),
  });
}

export const trackLearningEvent = mutation({
  args: {
    sessionId: v.string(),
    module: learningModuleValidator,
    surface: v.optional(v.string()),
    courseId: v.optional(v.string()),
    unitId: v.optional(v.number()),
    contentId: v.optional(v.string()),
    eventName: learningEventNameValidator,
    eventAt: v.optional(v.number()),
    durationSec: v.optional(v.number()),
    itemCount: v.optional(v.number()),
    score: v.optional(v.number()),
    accuracy: v.optional(v.number()),
    result: v.optional(v.string()),
    source: v.optional(v.string()),
    metadata: metadataValidator,
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    await appendLearningEvent(ctx, userId, args);
    return { success: true };
  },
});

export const trackSessionSummary = mutation({
  args: {
    sessionId: v.string(),
    module: learningModuleValidator,
    surface: v.optional(v.string()),
    courseId: v.optional(v.string()),
    unitId: v.optional(v.number()),
    contentId: v.optional(v.string()),
    durationSec: v.optional(v.number()),
    itemCount: v.optional(v.number()),
    score: v.optional(v.number()),
    accuracy: v.optional(v.number()),
    result: v.optional(v.string()),
    source: v.optional(v.string()),
    metadata: metadataValidator,
    eventAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    await appendActivitySummary(ctx, userId, args);
    return { success: true };
  },
});
