import { useCallback } from 'react';
import { useMutation } from 'convex/react';

import { mRef } from '../utils/convexRefs';

type UpdateLearningProgressArgs = {
  lastInstitute?: string;
  lastLevel?: number;
  lastUnit?: number;
  lastModule?: string;
};

type UpdateLearningProgressResult = {
  success: boolean;
};

export function useUpdateLearningProgress() {
  const updateLearningProgressMutation = useMutation(
    mRef<UpdateLearningProgressArgs, UpdateLearningProgressResult>('user:updateLearningProgress')
  );

  return useCallback(
    (lastInstitute: string, lastLevel: number) =>
      updateLearningProgressMutation({ lastInstitute, lastLevel }),
    [updateLearningProgressMutation]
  );
}
