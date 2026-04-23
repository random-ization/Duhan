import React, { useEffect } from 'react';

import { useAuth } from './authContextCore';
import { useLearningSelection } from './LearningContext';
import { useUpdateLearningProgress } from '../hooks/useUpdateLearningProgress';

/**
 * Side-effect-only component that syncs the user's current institute/level
 * selection to the backend whenever it changes.
 *
 * This used to live directly inside `App.tsx`, which meant `useMutation`
 * (and therefore the entire Convex React SDK) was statically reachable from
 * the entry chunk — even on the landing page where no user exists yet.
 *
 * Mounting it inside `AuthedAppProviders` instead means:
 *
 *   1. The Convex React hooks ship only in the authed-provider chunk, not
 *      in the entry bundle (no more `vendor-convex` preload on pre-auth
 *      HTML pages).
 *   2. The hook runs only when `AuthedAppProviders` is in the tree, i.e.
 *      after the user has navigated to an authed route.
 *
 * Renders nothing.
 */
export const LearningProgressTracker: React.FC = () => {
  const { user } = useAuth();
  const { selectedInstitute, selectedLevel } = useLearningSelection();
  const updateLearningProgress = useUpdateLearningProgress();

  useEffect(() => {
    if (!user) return;
    if (!selectedInstitute) return;
    if (!Number.isFinite(selectedLevel)) return;
    // Prevent feedback loop / concurrent updates when the server copy
    // already matches the local selection.
    if (user.lastInstitute === selectedInstitute && user.lastLevel === selectedLevel) {
      return;
    }
    updateLearningProgress(selectedInstitute, selectedLevel);
  }, [selectedInstitute, selectedLevel, user, updateLearningProgress]);

  return null;
};

export default LearningProgressTracker;
