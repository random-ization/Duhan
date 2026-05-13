import React, { Suspense, useEffect, useState } from 'react';

const PostHogTracker = React.lazy(() =>
  import('./PostHogTracker').then(mod => ({ default: mod.PostHogTracker }))
);

type IdleWindow = Window & {
  requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
  cancelIdleCallback?: (handle: number) => void;
};

export const DeferredPostHogTracker: React.FC = () => {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (typeof globalThis.window === 'undefined') return;

    const w = globalThis.window as IdleWindow;
    const trigger = () => setReady(true);

    const idleHandle = w.requestIdleCallback
      ? w.requestIdleCallback(trigger, { timeout: 2500 })
      : null;
    const timeoutHandle = idleHandle === null ? w.setTimeout(trigger, 1800) : null;

    return () => {
      if (idleHandle !== null && w.cancelIdleCallback) {
        w.cancelIdleCallback(idleHandle);
      }
      if (timeoutHandle !== null) {
        w.clearTimeout(timeoutHandle);
      }
    };
  }, []);

  if (!ready) return null;

  return (
    <Suspense fallback={null}>
      <PostHogTracker />
    </Suspense>
  );
};

export default DeferredPostHogTracker;
