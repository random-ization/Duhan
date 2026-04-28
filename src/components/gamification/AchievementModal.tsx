import { Suspense, lazy, useEffect } from 'react';
import { useQuery } from 'convex/react';
import type { Doc } from '../../../convex/_generated/dataModel';
import { api } from '../../../convex/_generated/api';

const loadAchievementModalDialog = () =>
  import('./AchievementModalDialog').then(module => ({
    default: module.AchievementModalDialog,
  }));

const LazyAchievementModalDialog = lazy(loadAchievementModalDialog);

type PendingBadge = Doc<'user_badges'>;

type IdleWindow = Window & {
  requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
  cancelIdleCallback?: (handle: number) => void;
};

function getFirstPendingBadge(pendingBadges: PendingBadge[] | undefined): PendingBadge | null {
  if (!pendingBadges || pendingBadges.length === 0) {
    return null;
  }
  return pendingBadges[0];
}

export function AchievementModal() {
  const pendingBadges = useQuery(api.achievements.getPendingBadges);
  const badge = getFirstPendingBadge(pendingBadges);

  useEffect(() => {
    if (!badge || typeof globalThis.window === 'undefined') {
      return;
    }

    const idleWindow = globalThis.window as IdleWindow;

    if (!idleWindow.requestIdleCallback) {
      void loadAchievementModalDialog();
      return;
    }

    const idleHandle = idleWindow.requestIdleCallback(
      () => {
        void loadAchievementModalDialog();
      },
      { timeout: 1200 }
    );

    return () => {
      if (idleHandle !== undefined) {
        idleWindow.cancelIdleCallback?.(idleHandle);
      }
    };
  }, [badge]);

  if (!badge) {
    return null;
  }

  return (
    <Suspense fallback={null}>
      <LazyAchievementModalDialog badge={badge} />
    </Suspense>
  );
}
