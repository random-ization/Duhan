import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { getAuthUserId } from '@convex-dev/auth/server';
import type { Doc, Id } from './_generated/dataModel';

const displayLanguageValidator = v.union(
  v.literal('en'),
  v.literal('zh'),
  v.literal('vi'),
  v.literal('mn')
);
const flashcardFrontValidator = v.union(v.literal('KOREAN'), v.literal('NATIVE'));
const flashcardRatingModeValidator = v.union(v.literal('PASS_FAIL'), v.literal('FOUR_BUTTONS'));
const audioRepeatCountValidator = v.union(
  v.literal(1),
  v.literal(2),
  v.literal(3),
  v.literal('INFINITE')
);
const audioSpeedValidator = v.union(v.literal(0.8), v.literal(1), v.literal(1.2), v.literal(1.4));
const dictationPlayCountValidator = v.union(v.literal(1), v.literal(2), v.literal(3));
const dictationGapSecondsValidator = v.union(v.literal(2), v.literal(4), v.literal(6), v.literal(8));

type UserSettingsDoc = Doc<'user_settings'>;
type StoredUserSettings = Omit<UserSettingsDoc, '_id' | '_creationTime' | 'userId' | 'updatedAt'>;
type UserSettingsUpdate = Partial<StoredUserSettings>;

const DEFAULT_USER_SETTINGS: Required<StoredUserSettings> = {
  displayLanguage: 'en',
  flashcardAutoTTS: true,
  flashcardFront: 'KOREAN',
  flashcardRatingMode: 'PASS_FAIL',
  listenPlayMeaning: true,
  listenPlayExampleTranslation: true,
  audioRepeatCount: 2,
  audioSpeed: 1,
  dictationPlayCount: 2,
  dictationGapSeconds: 2,
  dictationAutoNext: true,
};

const compactDefined = <T extends Record<string, unknown>>(value: T): Partial<T> => {
  const result: Partial<T> = {};
  const keys = Object.keys(value) as Array<keyof T>;

  for (const key of keys) {
    const candidate = value[key];
    if (candidate !== undefined) {
      result[key] = candidate;
    }
  }

  return result;
};

const toStoredSettings = (settings: UserSettingsDoc | null): StoredUserSettings | null => {
  if (!settings) return null;
  const { _id: _unusedId, _creationTime: _unusedCreatedTime, userId: _unusedUserId, updatedAt: _unusedUpdatedAt, ...storedSettings } =
    settings;
  return storedSettings;
};

export const getSettings = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return DEFAULT_USER_SETTINGS;

    const settings = await ctx.db
      .query('user_settings')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .first();

    return {
      ...DEFAULT_USER_SETTINGS,
      ...(toStoredSettings(settings) ?? {}),
    };
  },
});

export const getStoredSettings = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const settings = await ctx.db
      .query('user_settings')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .first();

    return toStoredSettings(settings);
  },
});

export const updateSettings = mutation({
  args: {
    displayLanguage: v.optional(displayLanguageValidator),
    flashcardAutoTTS: v.optional(v.boolean()),
    flashcardFront: v.optional(flashcardFrontValidator),
    flashcardRatingMode: v.optional(flashcardRatingModeValidator),
    listenPlayMeaning: v.optional(v.boolean()),
    listenPlayExampleTranslation: v.optional(v.boolean()),
    audioRepeatCount: v.optional(audioRepeatCountValidator),
    audioSpeed: v.optional(audioSpeedValidator),
    dictationPlayCount: v.optional(dictationPlayCountValidator),
    dictationGapSeconds: v.optional(dictationGapSecondsValidator),
    dictationAutoNext: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error('Unauthenticated');

    const existing = await ctx.db
      .query('user_settings')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .first();

    const now = Date.now();
    const cleanArgs = compactDefined(args) as UserSettingsUpdate;
    const hasUpdates = Object.keys(cleanArgs).length > 0;

    if (existing) {
      if (hasUpdates) {
        await ctx.db.patch(existing._id, {
          ...cleanArgs,
          updatedAt: now,
        });
      }
      return existing._id;
    }

    if (!hasUpdates) return null;

    const newId: Id<'user_settings'> = await ctx.db.insert('user_settings', {
      userId,
      ...cleanArgs,
      updatedAt: now,
    });
    return newId;
  },
});
