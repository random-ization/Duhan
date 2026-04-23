import React, { Suspense, useEffect, useState } from 'react';

/**
 * Lazy-mounted wrapper for `@vercel/analytics` + `@vercel/speed-insights`.
 *
 * Both packages were previously imported statically in `src/index.tsx`,
 * which pulled their React components into the entry chunk. They don't
 * need to run before first paint — `<Analytics />` just injects a script
 * tag that records page views, and `<SpeedInsights />` instruments Core
 * Web Vitals. Deferring them to idle removes their code from the landing
 * preload and prevents the analytics script request from competing with
 * critical resources during first paint.
 *
 * Mount strategy:
 *   1. On mount, schedule via `requestIdleCallback` (fallback: setTimeout).
 *   2. Only after the idle window fires do we React.lazy-load both modules
 *      and render them inside a Suspense with `null` fallback.
 *   3. If the component unmounts before idle, we cancel the scheduler.
 */

const Analytics = React.lazy(() =>
  import('@vercel/analytics/react').then(mod => ({ default: mod.Analytics }))
);
const SpeedInsights = React.lazy(() =>
  import('@vercel/speed-insights/react').then(mod => ({ default: mod.SpeedInsights }))
);

type IdleWindow = Window & {
  requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
  cancelIdleCallback?: (handle: number) => void;
};

export const DeferredAnalytics: React.FC = () => {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (typeof globalThis.window === 'undefined') return;

    const w = globalThis.window as IdleWindow;
    const trigger = () => setReady(true);

    const idleHandle = w.requestIdleCallback
      ? w.requestIdleCallback(trigger, { timeout: 3000 })
      : null;
    const timeoutHandle = idleHandle === null ? w.setTimeout(trigger, 2000) : null;

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
      <Analytics />
      <SpeedInsights />
    </Suspense>
  );
};

export default DeferredAnalytics;
