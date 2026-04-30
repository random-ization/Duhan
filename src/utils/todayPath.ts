import type { VocabReviewSummaryDto } from '../../convex/vocab/vocabTypes';
import type { WeakVocabCategory } from '../../convex/weakPoints';
import type { LearningMaterialSelection } from './learningFlow';

export type VocabPathStepKind = 'review' | 'new' | 'weak';

export type VocabPathStep =
  | { kind: 'review'; count: number; estimatedMinutes: number; target: string }
  | {
      kind: 'new';
      count: number;
      estimatedMinutes: number;
      instituteId: string;
      unitId?: number;
      courseLabel: string;
      target: string;
    }
  | {
      kind: 'weak';
      count: number;
      estimatedMinutes: number;
      categoryLabel: string;
      instituteId: string;
      target: string;
    };

export type VocabTodayPath = {
  steps: VocabPathStep[];
  estimatedMinutes: number;
};

const NEW_WORD_TARGET_DEFAULT = 10;

const minutesForReview = (count: number): number => Math.max(2, Math.round(count * 0.3));
const minutesForNew = (count: number): number => Math.max(3, Math.round(count * 0.6));
const minutesForWeak = (count: number): number => Math.max(2, Math.round(count * 0.5));

export type BuildVocabTodayPathInput = {
  reviewSummary?: VocabReviewSummaryDto | null;
  weakCategories?: ReadonlyArray<WeakVocabCategory> | null;
  recentVocab?: LearningMaterialSelection | null;
  recentInstituteName?: string;
  newWordTarget?: number;
};

export const buildVocabTodayPath = (input: BuildVocabTodayPathInput): VocabTodayPath => {
  const steps: VocabPathStep[] = [];

  const dueNow = input.reviewSummary?.dueNow ?? 0;
  if (dueNow > 0) {
    steps.push({
      kind: 'review',
      count: dueNow,
      estimatedMinutes: minutesForReview(dueNow),
      target: '/review',
    });
  }

  const recent = input.recentVocab;
  if (recent?.instituteId) {
    const target = input.newWordTarget ?? NEW_WORD_TARGET_DEFAULT;
    const courseLabel = input.recentInstituteName ?? recent.instituteId;
    const unitParam = recent.unit ? `?unit=${recent.unit}` : '';
    steps.push({
      kind: 'new',
      count: target,
      estimatedMinutes: minutesForNew(target),
      instituteId: recent.instituteId,
      unitId: recent.unit,
      courseLabel,
      target: `/course/${recent.instituteId}/vocab${unitParam}`,
    });
  }

  const topWeak = input.weakCategories?.[0];
  if (topWeak && topWeak.wordCount > 0 && recent?.instituteId) {
    const count = Math.min(topWeak.wordCount, 5);
    const encodedCategory = encodeURIComponent(topWeak.partOfSpeech || 'unknown');
    steps.push({
      kind: 'weak',
      count,
      estimatedMinutes: minutesForWeak(count),
      categoryLabel: topWeak.partOfSpeech || 'unknown',
      instituteId: recent.instituteId,
      target: `/course/${recent.instituteId}/vocab?focusCategory=${encodedCategory}`,
    });
  }

  return {
    steps,
    estimatedMinutes: steps.reduce((sum, step) => sum + step.estimatedMinutes, 0),
  };
};
