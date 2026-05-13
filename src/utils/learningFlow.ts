import { Institute } from '../types';

export type LearningFlowModule = 'grammar' | 'vocabulary' | 'listening' | 'reading';
export const TOPIK_GRAMMAR_COURSE_ID = 'topik-grammar';
export type LearningMaterialSelection = {
  instituteId: string;
  level: number;
  unit?: number;
  updatedAt?: number;
};

type ResolveLearningEntryTargetArgs = {
  institutes: Institute[] | undefined;
  selectedInstitute?: string | null;
  selectedLevel?: number | null;
  userLastInstitute?: string | null;
};

type LevelConfigLike = { level: number; units: number };

const parseDisplayLevel = (displayLevel: string | undefined): number | null => {
  if (!displayLevel) return null;
  const matched = displayLevel.match(/\d+/);
  if (!matched) return null;
  const parsed = Number(matched[0]);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

export const resolveInstituteDefaultLevel = (institute: Institute): number => {
  const first = institute.levels?.[0];
  if (typeof first === 'number' && Number.isFinite(first) && first > 0) {
    return first;
  }
  if (
    typeof first === 'object' &&
    first !== null &&
    Number.isFinite((first as LevelConfigLike).level) &&
    (first as LevelConfigLike).level > 0
  ) {
    return (first as LevelConfigLike).level;
  }
  return parseDisplayLevel(institute.displayLevel) ?? 1;
};

export const resolveLearningEntryTarget = ({
  institutes,
  selectedInstitute,
  selectedLevel,
  userLastInstitute,
}: ResolveLearningEntryTargetArgs): { instituteId: string; level: number } | null => {
  if (!institutes || institutes.length === 0) return null;

  const preferredIds = [selectedInstitute, userLastInstitute].filter((value): value is string =>
    Boolean(value)
  );

  const preferredInstitute =
    preferredIds
      .map(id => institutes.find(institute => institute.id === id))
      .find((institute): institute is Institute => Boolean(institute)) ?? institutes[0];

  if (!preferredInstitute) return null;

  const shouldUseSelectedLevel =
    preferredInstitute.id === selectedInstitute &&
    typeof selectedLevel === 'number' &&
    Number.isFinite(selectedLevel) &&
    selectedLevel > 0;

  return {
    instituteId: preferredInstitute.id,
    level: shouldUseSelectedLevel
      ? selectedLevel
      : resolveInstituteDefaultLevel(preferredInstitute),
  };
};

export const buildLearningModulePath = (
  module: LearningFlowModule,
  instituteId: string
): string => {
  if (module === 'grammar') return `/course/${instituteId}/grammar`;
  if (module === 'vocabulary') return `/course/${instituteId}/vocab`;
  if (module === 'listening') return `/course/${instituteId}/listening`;
  return `/course/${instituteId}/reading`;
};

export const buildMobileCourseDefaultPath = (instituteId: string): string => {
  if (instituteId === TOPIK_GRAMMAR_COURSE_ID) {
    return buildLearningModulePath('grammar', instituteId);
  }
  return buildLearningModulePath('vocabulary', instituteId);
};

export const buildLearningPickerPath = (module: LearningFlowModule): string =>
  `/courses?module=${module}`;

export const normalizeLearningFlowModule = (
  value: string | null | undefined
): LearningFlowModule | null => {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  if (normalized === 'vocab' || normalized === 'vocabulary') return 'vocabulary';
  if (normalized === 'grammar') return 'grammar';
  if (normalized === 'listening') return 'listening';
  if (normalized === 'reading') return 'reading';
  return null;
};

export type VocabStage = 'learn' | 'flashcard' | 'test';

type VocabStageInput = {
  state?: number;
  stability?: number;
  mastered?: boolean;
};

const MATURE_STABILITY_DAYS = 7;

export const recommendVocabStage = (words: ReadonlyArray<VocabStageInput>): VocabStage => {
  if (!words || words.length === 0) return 'learn';

  let newCount = 0;
  let matureCount = 0;
  let masteredCount = 0;

  for (const w of words) {
    if (w.mastered) {
      masteredCount++;
      continue;
    }
    const state = typeof w.state === 'number' ? w.state : undefined;
    if (state === undefined || state === 0) {
      newCount++;
      continue;
    }
    const stability = typeof w.stability === 'number' ? w.stability : 0;
    if (state === 2 && stability >= MATURE_STABILITY_DAYS) {
      matureCount++;
    }
  }

  const total = words.length;
  const reviewable = total - masteredCount;
  if (reviewable === 0) return 'test';

  if (newCount / total >= 0.4) return 'learn';
  if (matureCount / Math.max(reviewable, 1) >= 0.6) return 'test';
  return 'flashcard';
};
