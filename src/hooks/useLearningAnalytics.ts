import { useCallback } from 'react';
import type { LearningEventName, LearningMetadata, LearningModule } from '../../convex/analytics';
import { mRef } from '../utils/convexRefs';
import { toErrorMessage } from '../utils/errors';
import { useOfflineMutation } from './useOfflineMutation';

type TrackLearningEventArgs = {
  sessionId: string;
  module: LearningModule;
  surface?: string;
  courseId?: string;
  unitId?: number;
  contentId?: string;
  eventName: LearningEventName;
  eventAt?: number;
  durationSec?: number;
  itemCount?: number;
  score?: number;
  accuracy?: number;
  result?: string;
  source?: string;
  metadata?: LearningMetadata;
};

type TrackSessionSummaryArgs = {
  sessionId: string;
  module: LearningModule;
  surface?: string;
  courseId?: string;
  unitId?: number;
  contentId?: string;
  durationSec?: number;
  itemCount?: number;
  score?: number;
  accuracy?: number;
  result?: string;
  source?: string;
  metadata?: LearningMetadata;
  eventAt?: number;
};

const makeFallbackId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

export const createLearningSessionId = (prefix: string) => {
  const cleanPrefix =
    prefix
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '-') || 'session';
  const uniquePart =
    typeof globalThis.crypto?.randomUUID === 'function'
      ? globalThis.crypto.randomUUID()
      : makeFallbackId();
  return `${cleanPrefix}-${uniquePart}`;
};

export function useLearningAnalytics() {
  const trackLearningEventMutation = useOfflineMutation(
    mRef<TrackLearningEventArgs, { success: boolean }>('analytics:trackLearningEvent')
  );
  const trackSessionSummaryMutation = useOfflineMutation(
    mRef<TrackSessionSummaryArgs, { success: boolean }>('analytics:trackSessionSummary')
  );

  const trackLearningEvent = useCallback(
    async (args: TrackLearningEventArgs) => {
      try {
        await trackLearningEventMutation(args);
      } catch (error) {
        console.error('Failed to track learning event', toErrorMessage(error));
      }
    },
    [trackLearningEventMutation]
  );

  const trackSessionSummary = useCallback(
    async (args: TrackSessionSummaryArgs) => {
      try {
        await trackSessionSummaryMutation(args);
      } catch (error) {
        console.error('Failed to track session summary', toErrorMessage(error));
      }
    },
    [trackSessionSummaryMutation]
  );

  return { trackLearningEvent, trackSessionSummary };
}
