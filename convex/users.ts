import { mutation, query } from './_generated/server';
import { getAuthUserId } from '@convex-dev/auth/server';
import { v } from 'convex/values';
import { MetadataJson, parsePhoneNumberWithError } from 'libphonenumber-js/core';
import phoneMetadata from './phone/metadata.cn-vn-mn';

export const viewer = query({
  args: {},
  handler: async ctx => {
    const userId = await getAuthUserId(ctx);
    console.log('Viewer Query - Auth User ID:', userId);
    if (!userId) {
      return null;
    }
    const user = await ctx.db.get(userId);
    console.log('Viewer Query - DB User:', user);
    if (!user) {
      return null;
    }
    return user;
  },
});

// Debug query to verify JWT recognition
export const currentUser = query({
  args: {},
  handler: async ctx => {
    const identity = await ctx.auth.getUserIdentity();
    console.log('getUserIdentity result:', identity);
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
      throw new Error('UNAUTHORIZED');
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
