import { useCallback } from 'react';
import { useMutation } from 'convex/react';
import { useAuth } from '../contexts/AuthContext';
import { toErrorMessage } from '../utils/errors';
import { mRef } from '../utils/convexRefs';

export const useActivityLogger = () => {
  const { user } = useAuth();
  const logActivityMutation = useMutation(
    mRef<
      { activityType: string; duration?: number; itemsStudied?: number; metadata?: unknown },
      { success: boolean }
    >('user:logActivity')
  );

  const logActivity = useCallback(
    async (
      activityType: 'VOCAB' | 'READING' | 'LISTENING' | 'GRAMMAR' | 'EXAM',
      duration?: number,
      itemsStudied?: number,
      metadata?: unknown
    ) => {
      if (!user) return;
      try {
        await logActivityMutation({
          activityType,
          duration,
          itemsStudied,
          metadata,
        });
      } catch (e) {
        console.error('Failed to log activity', toErrorMessage(e));
      }
    },
    [user, logActivityMutation]
  );

  return { logActivity };
};
