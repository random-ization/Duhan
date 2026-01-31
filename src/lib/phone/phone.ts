import { MetadataJson, parsePhoneNumberWithError } from 'libphonenumber-js/core';
import phoneMetadata from './metadata.cn-vn-mn';

export type SupportedPhoneRegion = 'CN' | 'VN' | 'MN';

export const REGION_CALLING_CODE: Record<SupportedPhoneRegion, string> = {
  CN: '86',
  VN: '84',
  MN: '976',
};

const CN_MOBILE_REGEX = /^(?:\+?86)?1[3-9]\d{9}$/;

function normalizeCnCandidate(input: string) {
  let candidate = input.trim().replaceAll(/[^\d+]/g, '');
  if (candidate.startsWith('00')) {
    candidate = `+${candidate.slice(2)}`;
  }
  return candidate;
}

export function buildE164FromNational(nationalNumber: string, region: SupportedPhoneRegion) {
  let digits = nationalNumber.replaceAll(/\D/g, '');
  const code = REGION_CALLING_CODE[region];
  if (digits.startsWith('00')) {
    digits = digits.slice(2);
  }
  const rawNational = digits.startsWith(code) ? digits.slice(code.length) : digits;
  const trimmedNational = rawNational.replace(/^0+/, '');
  return `+${code}${trimmedNational}`;
}

export function tryParseSupportedPhone(nationalNumber: string, region: SupportedPhoneRegion) {
  const e164 = buildE164FromNational(nationalNumber, region);
  if (region === 'CN' && !CN_MOBILE_REGEX.test(normalizeCnCandidate(nationalNumber))) {
    return { valid: false as const, e164 };
  }
  try {
    const phone = parsePhoneNumberWithError(e164, phoneMetadata as unknown as MetadataJson);
    const type = phone.getType();
    const isMobile = type ? type === 'MOBILE' || type === 'FIXED_LINE_OR_MOBILE' : true;
    const callingMatches = phone.countryCallingCode === REGION_CALLING_CODE[region];
    const valid =
      phone.isPossible() &&
      phone.isValid() &&
      phone.country === region &&
      callingMatches &&
      isMobile;
    return {
      valid,
      e164,
      formattedInternational: phone.formatInternational(),
      country: phone.country,
    };
  } catch {
    return { valid: false as const, e164 };
  }
}
