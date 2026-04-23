import {
  type AudioRepeatCount,
  type AudioSpeed,
  type DictationGapSeconds,
  type DictationPlayCount,
  type GlobalUserSettingsUpdate,
  type StoredGlobalUserSettings,
  AUDIO_REPEAT_COUNT_VALUES,
  AUDIO_SPEED_VALUES,
  DICTATION_GAP_SECOND_VALUES,
  DICTATION_PLAY_COUNT_VALUES,
} from '../types/globalUserSettings';
import type { Language } from '../types';
import { safeGetLocalStorageItem } from './browserStorage';
import { isValidLanguage } from '../components/LanguageRouter';

const LISTEN_SESSION_PREFIX = 'vocab-book-listen-session:';
const DICTATION_SESSION_PREFIX = 'vocab-book-dictation-session:';

type TimestampedCandidate<T> = {
  timestamp: number;
  value: T;
};

type LegacyListenPreferences = Partial<{
  listenPlayMeaning: boolean;
  listenPlayExampleTranslation: boolean;
  audioRepeatCount: AudioRepeatCount;
  audioSpeed: AudioSpeed;
}>;

type LegacyDictationPreferences = Partial<{
  dictationPlayCount: DictationPlayCount;
  dictationGapSeconds: DictationGapSeconds;
  dictationAutoNext: boolean;
}>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isBoolean = (value: unknown): value is boolean => typeof value === 'boolean';

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const isAudioRepeatCount = (value: unknown): value is AudioRepeatCount =>
  AUDIO_REPEAT_COUNT_VALUES.some(option => option === value);

const isAudioSpeed = (value: unknown): value is AudioSpeed =>
  AUDIO_SPEED_VALUES.some(option => option === value);

const isDictationPlayCount = (value: unknown): value is DictationPlayCount =>
  DICTATION_PLAY_COUNT_VALUES.some(option => option === value);

const isDictationGapSeconds = (value: unknown): value is DictationGapSeconds =>
  DICTATION_GAP_SECOND_VALUES.some(option => option === value);

const iterateSessionStorageEntries = (): Array<[string, string]> => {
  if (typeof globalThis.window === 'undefined') return [];

  try {
    const storage = globalThis.window.sessionStorage;
    const entries: Array<[string, string]> = [];
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);
      if (!key) continue;
      const value = storage.getItem(key);
      if (value === null) continue;
      entries.push([key, value]);
    }
    return entries;
  } catch {
    return [];
  }
};

const getLegacyDisplayLanguage = (): Language | undefined => {
  const storedLanguage = safeGetLocalStorageItem('preferredLanguage');
  const storedSource = safeGetLocalStorageItem('preferredLanguageSource');
  if (!storedLanguage) return undefined;
  if (storedSource === 'auto') return undefined;

  const normalized = storedLanguage.toLowerCase();
  return isValidLanguage(normalized) ? normalized : undefined;
};

const extractLegacyListenPreferences = (): LegacyListenPreferences => {
  let latest: TimestampedCandidate<LegacyListenPreferences> | null = null;

  for (const [key, rawValue] of iterateSessionStorageEntries()) {
    if (!key.startsWith(LISTEN_SESSION_PREFIX)) continue;

    try {
      const parsed = JSON.parse(rawValue) as unknown;
      if (!isRecord(parsed) || !isFiniteNumber(parsed.timestamp)) continue;

      const candidate: LegacyListenPreferences = {};
      if (isBoolean(parsed.playMeaning)) {
        candidate.listenPlayMeaning = parsed.playMeaning;
      }
      if (isBoolean(parsed.playExampleTranslation)) {
        candidate.listenPlayExampleTranslation = parsed.playExampleTranslation;
      }
      if (isAudioRepeatCount(parsed.repeatCount)) {
        candidate.audioRepeatCount = parsed.repeatCount;
      }
      if (isAudioSpeed(parsed.speed)) {
        candidate.audioSpeed = parsed.speed;
      }
      if (Object.keys(candidate).length === 0) continue;

      if (!latest || parsed.timestamp > latest.timestamp) {
        latest = { timestamp: parsed.timestamp, value: candidate };
      }
    } catch {
      continue;
    }
  }

  return latest?.value ?? {};
};

const extractLegacyDictationPreferences = (): LegacyDictationPreferences => {
  let latest: TimestampedCandidate<LegacyDictationPreferences> | null = null;

  for (const [key, rawValue] of iterateSessionStorageEntries()) {
    if (!key.startsWith(DICTATION_SESSION_PREFIX)) continue;

    try {
      const parsed = JSON.parse(rawValue) as unknown;
      if (!isRecord(parsed) || !isFiniteNumber(parsed.timestamp)) continue;

      const candidate: LegacyDictationPreferences = {};
      if (isDictationPlayCount(parsed.playCount)) {
        candidate.dictationPlayCount = parsed.playCount;
      }
      if (isDictationGapSeconds(parsed.gapSeconds)) {
        candidate.dictationGapSeconds = parsed.gapSeconds;
      }
      if (isBoolean(parsed.autoNext)) {
        candidate.dictationAutoNext = parsed.autoNext;
      }
      if (Object.keys(candidate).length === 0) continue;

      if (!latest || parsed.timestamp > latest.timestamp) {
        latest = { timestamp: parsed.timestamp, value: candidate };
      }
    } catch {
      continue;
    }
  }

  return latest?.value ?? {};
};

export const getLegacySettingsMigrationPatch = (
  storedSettings: StoredGlobalUserSettings | null
): GlobalUserSettingsUpdate => {
  const updates: GlobalUserSettingsUpdate = {};
  const legacyDisplayLanguage = getLegacyDisplayLanguage();
  const legacyListenPreferences = extractLegacyListenPreferences();
  const legacyDictationPreferences = extractLegacyDictationPreferences();

  if (storedSettings?.displayLanguage === undefined && legacyDisplayLanguage) {
    updates.displayLanguage = legacyDisplayLanguage;
  }
  if (
    storedSettings?.listenPlayMeaning === undefined &&
    legacyListenPreferences.listenPlayMeaning !== undefined
  ) {
    updates.listenPlayMeaning = legacyListenPreferences.listenPlayMeaning;
  }
  if (
    storedSettings?.listenPlayExampleTranslation === undefined &&
    legacyListenPreferences.listenPlayExampleTranslation !== undefined
  ) {
    updates.listenPlayExampleTranslation = legacyListenPreferences.listenPlayExampleTranslation;
  }
  if (
    storedSettings?.audioRepeatCount === undefined &&
    legacyListenPreferences.audioRepeatCount !== undefined
  ) {
    updates.audioRepeatCount = legacyListenPreferences.audioRepeatCount;
  }
  if (storedSettings?.audioSpeed === undefined && legacyListenPreferences.audioSpeed !== undefined) {
    updates.audioSpeed = legacyListenPreferences.audioSpeed;
  }
  if (
    storedSettings?.dictationPlayCount === undefined &&
    legacyDictationPreferences.dictationPlayCount !== undefined
  ) {
    updates.dictationPlayCount = legacyDictationPreferences.dictationPlayCount;
  }
  if (
    storedSettings?.dictationGapSeconds === undefined &&
    legacyDictationPreferences.dictationGapSeconds !== undefined
  ) {
    updates.dictationGapSeconds = legacyDictationPreferences.dictationGapSeconds;
  }
  if (
    storedSettings?.dictationAutoNext === undefined &&
    legacyDictationPreferences.dictationAutoNext !== undefined
  ) {
    updates.dictationAutoNext = legacyDictationPreferences.dictationAutoNext;
  }

  return updates;
};
