import { mutation, query } from './_generated/server';
import { getAuthUserId } from '@convex-dev/auth/server';
import { v, ConvexError } from 'convex/values';
import { MetadataJson, parsePhoneNumberWithError } from 'libphonenumber-js/core';
import phoneMetadata from './phone/metadata.cn-vn-mn';
import { canExposeViewerRecord } from './adminUserUtils';
import { normalizeStoragePublicUrl } from './spacesConfig';

export const viewer = query({
  args: {},
  handler: async ctx => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }
    const user = await ctx.db.get(userId);
    if (!user) {
      return null;
    }
    if (!canExposeViewerRecord(user)) {
      return null;
    }
    return {
      ...user,
      avatar: normalizeStoragePublicUrl(user.avatar) || undefined,
    };
  },
});

// Debug query to verify JWT recognition
export const currentUser = query({
  args: {},
  handler: async ctx => {
    const identity = await ctx.auth.getUserIdentity();
    return identity;
  },
});

const REGION_CALLING_CODE = {
  CN: '86',
  VN: '84',
  MN: '976',
} as const;

const CN_MOBILE_REGEX_PREFIX = /^(?:\+?86)?1/;

// Split complex regex into simpler parts to avoid complexity limits
const CN_MOBILE_PATTERNS = [
  /^3\d{9}$/, // 13x
  /^5[^4\D]\d{8}$/, // 15x (except 154)
  /^8\d{9}$/, // 18x
  /^7(?:[235-8]\d|4[019])\d{7}$/, // 17x
  /^9[0-35-9]\d{8}$/, // 19x
  /^66\d{8}$/, // 166
];

function isValidCnMobile(input: string) {
  if (!CN_MOBILE_REGEX_PREFIX.test(input)) return false;
  const body = input.replace(CN_MOBILE_REGEX_PREFIX, '');
  return CN_MOBILE_PATTERNS.some(pattern => pattern.test(body));
}

function normalizeCnCandidate(input: string) {
  let candidate = input.trim().replaceAll(/[^\d+]/g, '');
  if (candidate.startsWith('00')) {
    candidate = `+${candidate.slice(2)}`;
  }
  return candidate;
}

export const verifyAndMarkRegion = mutation({
  args: {
    phoneRaw: v.string(),
    regionHint: v.union(v.literal('CN'), v.literal('VN'), v.literal('MN')),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new ConvexError({ code: 'UNAUTHORIZED' });
    }

    let digits = args.phoneRaw.replaceAll(/\D/g, '');
    const code = REGION_CALLING_CODE[args.regionHint];
    if (digits.startsWith('00')) {
      digits = digits.slice(2);
    }
    const rawNational = digits.startsWith(code) ? digits.slice(code.length) : digits;
    const trimmedNational = rawNational.replace(/^0+/, '');
    const input = `+${code}${trimmedNational}`;

    let eligible = false;
    let region: 'CN' | 'VN' | 'MN' | 'OTHER' = 'OTHER';

    if (args.regionHint === 'CN' && !isValidCnMobile(normalizeCnCandidate(args.phoneRaw))) {
      // eligible and region are already set to default
    } else {
      try {
        const phone = parsePhoneNumberWithError(input, phoneMetadata as unknown as MetadataJson);
        const type = phone.getType();
        const isMobile = type ? type === 'MOBILE' || type === 'FIXED_LINE_OR_MOBILE' : true;
        const callingMatches = phone.countryCallingCode === REGION_CALLING_CODE[args.regionHint];
        eligible =
          phone.isPossible() &&
          phone.isValid() &&
          phone.country === args.regionHint &&
          callingMatches &&
          isMobile;
        region = eligible ? args.regionHint : 'OTHER';
      } catch {
        eligible = false;
        region = 'OTHER';
      }
    }

    await ctx.db.patch(userId, {
      phoneRegion: region,
      isRegionalPromoEligible: eligible,
      phoneVerifiedAt: eligible ? new Date().toISOString() : undefined,
      kycStatus: eligible ? 'VERIFIED' : 'NONE',
    });

    return { eligible, region };
  },
});

export const registerPushToken = mutation({
  args: {
    platform: v.union(v.literal('android'), v.literal('ios')),
    fcmToken: v.string(),
    userAgent: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new ConvexError({ code: 'UNAUTHORIZED' });
    }

    const token = args.fcmToken.trim();
    if (!token) {
      throw new ConvexError({ code: 'INVALID_FCM_TOKEN' });
    }

    const now = Date.now();
    const existing = await ctx.db
      .query('push_subscriptions')
      .withIndex('by_user_fcmToken', q => q.eq('userId', userId).eq('fcmToken', token))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        platform: args.platform,
        userAgent: args.userAgent,
        revokedAt: undefined,
        lastSeenAt: now,
        updatedAt: now,
      });
      return { ok: true as const, subscriptionId: existing._id };
    }

    const insertedId = await ctx.db.insert('push_subscriptions', {
      userId,
      platform: args.platform,
      fcmToken: token,
      userAgent: args.userAgent,
      lastSeenAt: now,
      createdAt: now,
      updatedAt: now,
    });

    return { ok: true as const, subscriptionId: insertedId };
  },
});
export const updateCurrentCourse = mutation({
  args: {
    courseId: v.string(),
    level: v.optional(v.number()),
    unit: v.optional(v.number()),
    module: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError({ code: 'UNAUTHORIZED' });

    const update: {
      lastInstitute?: string;
      lastActivityAt: number;
      lastLevel?: number;
      lastUnit?: number;
      lastModule?: string;
    } = {
      lastInstitute: args.courseId,
      lastActivityAt: Date.now(),
    };
    if (args.level !== undefined) update.lastLevel = args.level;
    if (args.unit !== undefined) update.lastUnit = args.unit;
    if (args.module !== undefined) update.lastModule = args.module;

    await ctx.db.patch(userId, update);
    
    // Also update course progress record to track when this course was last accessed
    const existingProgress = await ctx.db
      .query('user_course_progress')
      .withIndex('by_user_course', (q) => q.eq('userId', userId).eq('courseId', args.courseId))
      .first();

    if (existingProgress) {
      await ctx.db.patch(existingProgress._id, {
        lastAccessAt: Date.now(),
        ...(args.unit !== undefined ? { lastUnitIndex: args.unit } : {}),
      });
    } else {
      await ctx.db.insert('user_course_progress', {
        userId,
        courseId: args.courseId,
        completedUnits: [],
        lastAccessAt: Date.now(),
        lastUnitIndex: args.unit ?? 1,
        createdAt: Date.now(),
      });
    }

    return { success: true };
  },
});
