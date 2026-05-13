import { v, ConvexError } from 'convex/values';
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
const mediaSubtitleModeValidator = v.union(v.literal('SOURCE_ONLY'), v.literal('BILINGUAL'));
const fontScaleValidator = v.union(
  v.literal('compact'),
  v.literal('comfortable'),
  v.literal('relaxed')
);
const dictationPlayCountValidator = v.union(v.literal(1), v.literal(2), v.literal(3));
const dictationGapSecondsValidator = v.union(v.literal(2), v.literal(4), v.literal(6), v.literal(8));
const dailyGoalMinutesValidator = v.union(
  v.literal(15),
  v.literal(20),
  v.literal(30),
  v.literal(45),
  v.literal(60)
);
const profileVisibilityValidator = v.union(
  v.literal('public'),
  v.literal('friends'),
  v.literal('private')
);

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
  mediaShowTranslation: true,
  mediaSubtitleMode: 'BILINGUAL',
  mediaAutoScroll: true,
  fontScale: 'comfortable',
  dictationPlayCount: 2,
  dictationGapSeconds: 2,
  dictationAutoNext: true,
  dailyGoalMinutes: 30,
  privacy: {
    profileVisibility: 'public',
    leaderboardOptOut: false,
  },
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

    const storedSettings = toStoredSettings(settings) ?? {};
    const mediaSubtitleMode =
      storedSettings.mediaSubtitleMode ??
      (storedSettings.mediaShowTranslation === false ? 'SOURCE_ONLY' : 'BILINGUAL');

    return {
      ...DEFAULT_USER_SETTINGS,
      ...storedSettings,
      mediaSubtitleMode,
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
    mediaShowTranslation: v.optional(v.boolean()),
    mediaSubtitleMode: v.optional(mediaSubtitleModeValidator),
    mediaAutoScroll: v.optional(v.boolean()),
    fontScale: v.optional(fontScaleValidator),
    dictationPlayCount: v.optional(dictationPlayCountValidator),
    dictationGapSeconds: v.optional(dictationGapSecondsValidator),
    dictationAutoNext: v.optional(v.boolean()),
    dailyGoalMinutes: v.optional(dailyGoalMinutesValidator),
    privacy: v.optional(
      v.object({
        profileVisibility: v.optional(profileVisibilityValidator),
        leaderboardOptOut: v.optional(v.boolean()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError({ code: 'UNAUTHENTICATED' });

    const existing = await ctx.db
      .query('user_settings')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .first();

    const now = Date.now();
    const cleanArgs = compactDefined(args) as UserSettingsUpdate;
    if (cleanArgs.mediaSubtitleMode !== undefined) {
      cleanArgs.mediaShowTranslation = cleanArgs.mediaSubtitleMode === 'BILINGUAL';
    } else if (cleanArgs.mediaShowTranslation !== undefined) {
      cleanArgs.mediaSubtitleMode = cleanArgs.mediaShowTranslation ? 'BILINGUAL' : 'SOURCE_ONLY';
    }
    if (cleanArgs.privacy !== undefined) {
      const previousPrivacy = existing?.privacy ?? DEFAULT_USER_SETTINGS.privacy;
      cleanArgs.privacy = {
        profileVisibility: cleanArgs.privacy.profileVisibility ?? previousPrivacy.profileVisibility,
        leaderboardOptOut: cleanArgs.privacy.leaderboardOptOut ?? previousPrivacy.leaderboardOptOut,
      };
    }
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
