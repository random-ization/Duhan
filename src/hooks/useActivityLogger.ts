import { useCallback } from 'react';
import type { LearningModule } from '../../convex/analytics';
import { useAuth } from '../contexts/AuthContext';
import { createLearningSessionId, useLearningAnalytics } from './useLearningAnalytics';

export const useActivityLogger = () => {
  const { user } = useAuth();
  const { trackSessionSummary } = useLearningAnalytics();

  const logActivity = useCallback(
    async (
      activityType: LearningModule,
      duration?: number,
      itemsStudied?: number,
      metadata?: Record<string, string | number | boolean | undefined> & {
        sessionId?: string;
        surface?: string;
        courseId?: string;
        unitId?: number;
        contentId?: string;
        score?: number;
        accuracy?: number;
        result?: string;
        source?: string;
      }
    ) => {
      if (!user) return;
      const durationMinutes = Math.max(0, duration || 0);
      await trackSessionSummary({
        sessionId:
          metadata?.sessionId || createLearningSessionId(`${activityType.toLowerCase()}-summary`),
        module: activityType,
        surface: metadata?.surface,
        courseId: metadata?.courseId,
        unitId: metadata?.unitId,
        contentId: metadata?.contentId,
        durationSec: durationMinutes * 60,
        itemCount: itemsStudied,
        score: metadata?.score,
        accuracy: metadata?.accuracy,
        result: metadata?.result,
        source: metadata?.source || 'activity_logger',
        metadata: Object.fromEntries(
          Object.entries(metadata || {}).filter(([, value]) => value !== undefined)
        ) as Record<string, string | number | boolean>,
      });
    },
    [trackSessionSummary, user]
  );

  return { logActivity };
};
