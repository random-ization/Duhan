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

const CN_MOBILE_REGEX =
  /^(?:\+?86)?1(?:3\d{3}|5[^4\D]\d{2}|8\d{3}|7(?:[235-8]\d{2}|4(?:0\d|1[0-2]|9\d))|9[0-35-9]\d{2}|66\d{2})\d{6}$/;

function normalizeCnCandidate(input: string) {
  let candidate = input.trim().replace(/[^\d+]/g, '');
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

    let digits = args.phoneRaw.replace(/\\D/g, '');
    const code = REGION_CALLING_CODE[args.regionHint];
    if (digits.startsWith('00')) {
      digits = digits.slice(2);
    }
    const rawNational = digits.startsWith(code) ? digits.slice(code.length) : digits;
    const trimmedNational = rawNational.replace(/^0+/, '');
    const input = `+${code}${trimmedNational}`;

    let eligible = false;
    let region: 'CN' | 'VN' | 'MN' | 'OTHER' = 'OTHER';

    if (args.regionHint === 'CN' && !CN_MOBILE_REGEX.test(normalizeCnCandidate(args.phoneRaw))) {
      eligible = false;
      region = 'OTHER';
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
        region = eligible ? (args.regionHint as 'CN' | 'VN' | 'MN') : 'OTHER';
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
