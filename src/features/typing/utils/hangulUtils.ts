import { disassemble } from 'es-hangul';

export type TypingMode = 'sentence' | 'paragraph' | 'word';
export type TypingPhase = 'start' | 'typing' | 'finish';

// Normalize Korean text to handle different Unicode representations
// Hangul Jamo (U+1100-U+11FF) vs Hangul Compatibility Jamo (U+3130-U+318F)
export const normalizeKorean = (str: string): string => {
  // First apply NFC normalization
  let normalized = str.normalize('NFC');

  // Map Hangul Jamo to Compatibility Jamo
  const jamoMap: Record<string, string> = {
    // Initial consonants (Choseong) -> Compatibility Jamo
    '\u1100': '\u3131',
    '\u1101': '\u3132',
    '\u1102': '\u3134',
    '\u1103': '\u3137',
    '\u1104': '\u3138',
    '\u1105': '\u3139',
    '\u1106': '\u3141',
    '\u1107': '\u3142',
    '\u1108': '\u3143',
    '\u1109': '\u3145',
    '\u110A': '\u3146',
    '\u110B': '\u3147',
    '\u110C': '\u3148',
    '\u110D': '\u3149',
    '\u110E': '\u314A',
    '\u110F': '\u314B',
    '\u1110': '\u314C',
    '\u1111': '\u314D',
    '\u1112': '\u314E',

    // Medial vowels (Jungseong) -> Compatibility Jamo
    '\u1161': '\u314F',
    '\u1162': '\u3150',
    '\u1163': '\u3151',
    '\u1164': '\u3152',
    '\u1165': '\u3153',
    '\u1166': '\u3154',
    '\u1167': '\u3155',
    '\u1168': '\u3156',
    '\u1169': '\u3157',
    '\u116A': '\u3158',
    '\u116B': '\u3159',
    '\u116C': '\u315A',
    '\u116D': '\u315B',
    '\u116E': '\u315C',
    '\u116F': '\u315D',
    '\u1170': '\u315E',
    '\u1171': '\u315F',
    '\u1172': '\u3160',
    '\u1173': '\u3161',
    '\u1174': '\u3162',
    '\u1175': '\u3163',

    // Final consonants (Jongseong) -> Compatibility Jamo
    '\u11A8': '\u3131',
    '\u11A9': '\u3132',
    '\u11AA': '\u3133',
    '\u11AB': '\u3134',
    '\u11AC': '\u3135',
    '\u11AD': '\u3136',
    '\u11AE': '\u3137',
    '\u11AF': '\u3139',
    '\u11B0': '\u313A',
    '\u11B1': '\u313B',
    '\u11B2': '\u313C',
    '\u11B3': '\u313D',
    '\u11B4': '\u313E',
    '\u11B5': '\u313F',
    '\u11B6': '\u3140',
    '\u11B7': '\u3141',
    '\u11B8': '\u3142',
    '\u11B9': '\u3144',
    '\u11BA': '\u3145',
    '\u11BB': '\u3146',
    '\u11BC': '\u3147',
    '\u11BD': '\u3148',
    '\u11BE': '\u314A',
    '\u11BF': '\u314B',
    '\u11C0': '\u314C',
    '\u11C1': '\u314D',
    '\u11C2': '\u314E',
  };

  for (const [from, to] of Object.entries(jamoMap)) {
    normalized = normalized.split(from).join(to);
  }

  return normalized;
};

export const getJamoPrefixMatch = (input: string, target: string): boolean => {
  const iJamo = normalizeKorean(disassemble(input));
  const tJamo = normalizeKorean(disassemble(target));
  return tJamo.startsWith(iJamo);
};

export const isConsonantMigration = (
  inputChar: string,
  targetChar: string,
  nextTargetChar: string
): boolean => {
  const inputJamos = normalizeKorean(disassemble(inputChar));
  const targetJamos = normalizeKorean(disassemble(targetChar));

  if (inputJamos.length <= targetJamos.length) return false;
  if (!inputJamos.startsWith(targetJamos)) return false;

  const extraJamos = inputJamos.substring(targetJamos.length);
  const nextTargetJamos = normalizeKorean(disassemble(nextTargetChar));

  return nextTargetJamos.startsWith(extraJamos);
};

export type ValidationStatus = 'correct' | 'incorrect' | 'pending';

export const checkInputStatus = (
  targetChar: string,
  inputChar: string,
  nextTargetChar?: string
): ValidationStatus => {
  if (!targetChar) return 'incorrect';
  if (!inputChar) return 'pending';

  try {
    const normalizedTarget = normalizeKorean(targetChar);
    const normalizedInput = normalizeKorean(inputChar);

    if (normalizedTarget === normalizedInput) return 'correct';

    const targetJamos = normalizeKorean(disassemble(targetChar));
    const inputJamos = normalizeKorean(disassemble(inputChar));

    if (targetJamos === inputJamos) return 'correct';

    if (targetJamos.startsWith(inputJamos)) {
      return 'pending';
    }

    if (nextTargetChar && isConsonantMigration(inputChar, targetChar, nextTargetChar)) {
      return 'pending';
    }

    return 'incorrect';
  } catch {
    return targetChar === inputChar ? 'correct' : 'incorrect';
  }
};

export const getNextJamo = (
  targetChar: string,
  inputChar: string,
  nextTargetChar?: string
): string | null => {
  if (!targetChar) return null;

  try {
    const targetJamos = normalizeKorean(disassemble(targetChar));
    const inputJamos = inputChar ? normalizeKorean(disassemble(inputChar)) : '';

    // Case 1: Normal typing - input is a prefix of target
    if (targetJamos.startsWith(inputJamos)) {
      const nextIndex = inputJamos.length;
      if (nextIndex < targetJamos.length) {
        return targetJamos[nextIndex];
      }
      // Input is complete - return first jamo of next char if available
      if (nextTargetChar) {
        const nextTargetJamos = normalizeKorean(disassemble(nextTargetChar));
        return nextTargetJamos[0] || null;
      }
      return null;
    }

    // Case 2: Consonant migration - input has extra trailing consonants
    if (
      inputJamos.startsWith(targetJamos) &&
      inputJamos.length > targetJamos.length &&
      nextTargetChar
    ) {
      const extraJamos = inputJamos.substring(targetJamos.length);
      const nextTargetJamos = normalizeKorean(disassemble(nextTargetChar));

      // Check if the extra jamos match beginning of next target (consonant migration)
      if (nextTargetJamos.startsWith(extraJamos)) {
        const nextIndex = extraJamos.length;
        if (nextIndex < nextTargetJamos.length) {
          return nextTargetJamos[nextIndex];
        }
        return null;
      }
    }

    return null;
  } catch {
    return null;
  }
};
