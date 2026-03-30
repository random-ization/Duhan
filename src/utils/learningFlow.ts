import { Institute } from '../types';

export type LearningFlowModule = 'grammar' | 'vocabulary' | 'listening' | 'reading';

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
