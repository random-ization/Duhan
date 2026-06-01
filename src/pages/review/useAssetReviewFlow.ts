import { useCallback } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { DAILY_TASK, FSRS_REVIEW } from '../../utils/convexRefs';
import {
  calculateFSRSReview,
  deserializeCard,
  serializeCard,
  type Grade,
} from '../../utils/srsAlgorithm';
import type { DueReviewItem } from '../../../convex/fsrsReview';
import {
  formatAssetNextReviewLabel,
  type AssetReviewFeedback,
  type AssetReviewMode,
} from './AssetReviewSession';

type UseAssetReviewFlowArgs = {
  assetMode: AssetReviewMode | null;
  todayTaskId: string | null;
};

type UseAssetReviewFlowResult = {
  assetItems: DueReviewItem[];
  assetLoading: boolean;
  completeTodayTask: (currentCount?: number) => void;
  reviewAsset: (item: DueReviewItem, grade: Grade) => AssetReviewFeedback;
};

const resolveAssetReviewRatingLabel = (grade: Grade): string => {
  if (grade === (1 as Grade)) return 'Still shaky';
  if (grade === (4 as Grade)) return 'Very familiar';
  return 'Remembered';
};

export function useAssetReviewFlow({
  assetMode,
  todayTaskId,
}: UseAssetReviewFlowArgs): UseAssetReviewFlowResult {
  const updateTaskCompletion = useMutation(DAILY_TASK.updateTaskCompletion);
  const applyAssetReviewResult = useMutation(FSRS_REVIEW.applyReviewResult);
  const assetReviewItems = useQuery(
    FSRS_REVIEW.getDueItems,
    assetMode ? { kind: assetMode === 'sentences' ? 'sentence' : 'grammar', limit: 30 } : 'skip'
  );
  const assetItems = assetReviewItems ?? [];
  const assetLoading = assetMode !== null && assetReviewItems === undefined;

  const completeTodayTask = useCallback(
    (currentCount?: number) => {
      if (!todayTaskId) return;
      void updateTaskCompletion({
        taskId: todayTaskId,
        completed: true,
        currentCount,
      });
    },
    [todayTaskId, updateTaskCompletion]
  );

  const reviewAsset = useCallback(
    (item: DueReviewItem, grade: Grade): AssetReviewFeedback => {
      const currentCard = deserializeCard({
        state: item.fsrsState.state,
        due: item.fsrsState.due,
        stability: item.fsrsState.stability,
        difficulty: item.fsrsState.difficulty,
        elapsed_days: item.fsrsState.elapsedDays,
        scheduled_days: item.fsrsState.scheduledDays,
        learning_steps: item.fsrsState.learningSteps,
        reps: item.fsrsState.reps,
        lapses: item.fsrsState.lapses,
        last_review: item.fsrsState.lastReview ?? null,
      });
      const next = calculateFSRSReview(grade, currentCard, new Date());
      void applyAssetReviewResult({
        itemId: item._id,
        kind: item.kind,
        newCardState: serializeCard(next.card),
      });
      return {
        ratingLabel: resolveAssetReviewRatingLabel(grade),
        nextReviewLabel: formatAssetNextReviewLabel(next.card.scheduled_days),
      };
    },
    [applyAssetReviewResult]
  );

  return {
    assetItems,
    assetLoading,
    completeTodayTask,
    reviewAsset,
  };
}
