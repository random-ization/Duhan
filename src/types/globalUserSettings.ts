import type { Language } from './index';

export const FLASHCARD_FRONT_VALUES = ['KOREAN', 'NATIVE'] as const;
export const FLASHCARD_RATING_MODE_VALUES = ['PASS_FAIL', 'FOUR_BUTTONS'] as const;
export const AUDIO_REPEAT_COUNT_VALUES = [1, 2, 3, 'INFINITE'] as const;
export const AUDIO_SPEED_VALUES = [0.8, 1, 1.2, 1.4] as const;
export const DICTATION_PLAY_COUNT_VALUES = [1, 2, 3] as const;
export const DICTATION_GAP_SECOND_VALUES = [2, 4, 6, 8] as const;
export const DAILY_GOAL_MINUTE_VALUES = [15, 20, 30, 45, 60] as const;
export const MEDIA_SUBTITLE_MODE_VALUES = ['SOURCE_ONLY', 'BILINGUAL'] as const;
export const FONT_SCALE_VALUES = ['compact', 'comfortable', 'relaxed'] as const;

export type FlashcardFront = (typeof FLASHCARD_FRONT_VALUES)[number];
export type FlashcardRatingMode = (typeof FLASHCARD_RATING_MODE_VALUES)[number];
export type AudioRepeatCount = (typeof AUDIO_REPEAT_COUNT_VALUES)[number];
export type AudioSpeed = (typeof AUDIO_SPEED_VALUES)[number];
export type DictationPlayCount = (typeof DICTATION_PLAY_COUNT_VALUES)[number];
export type DictationGapSeconds = (typeof DICTATION_GAP_SECOND_VALUES)[number];
export type DailyGoalMinutes = (typeof DAILY_GOAL_MINUTE_VALUES)[number];
export type MediaSubtitleMode = (typeof MEDIA_SUBTITLE_MODE_VALUES)[number];
export type FontScale = (typeof FONT_SCALE_VALUES)[number];

export interface GlobalFlashcardSettings {
  flashcardAutoTTS: boolean;
  flashcardFront: FlashcardFront;
  flashcardRatingMode: FlashcardRatingMode;
}

export interface GlobalAudioSettings {
  listenPlayMeaning: boolean;
  listenPlayExampleTranslation: boolean;
  audioRepeatCount: AudioRepeatCount;
  audioSpeed: AudioSpeed;
  mediaShowTranslation: boolean;
  mediaSubtitleMode: MediaSubtitleMode;
  mediaAutoScroll: boolean;
}

export interface GlobalDictationSettings {
  dictationPlayCount: DictationPlayCount;
  dictationGapSeconds: DictationGapSeconds;
  dictationAutoNext: boolean;
}

export interface GlobalUserSettings
  extends GlobalFlashcardSettings,
    GlobalAudioSettings,
    GlobalDictationSettings {
  displayLanguage: Language;
  fontScale: FontScale;
  dailyGoalMinutes: DailyGoalMinutes;
}

export type StoredGlobalUserSettings = Partial<GlobalUserSettings>;
export type GlobalUserSettingsUpdate = Partial<GlobalUserSettings>;

export interface GlobalFlashcardPreferenceState {
  autoTTS: boolean;
  cardFront: FlashcardFront;
  ratingMode: FlashcardRatingMode;
}

export const DEFAULT_GLOBAL_USER_SETTINGS: GlobalUserSettings = {
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
};

export const toFlashcardPreferenceState = (
  settings: Pick<
    GlobalUserSettings,
    'flashcardAutoTTS' | 'flashcardFront' | 'flashcardRatingMode'
  >
): GlobalFlashcardPreferenceState => ({
  autoTTS: settings.flashcardAutoTTS,
  cardFront: settings.flashcardFront,
  ratingMode: settings.flashcardRatingMode,
});
