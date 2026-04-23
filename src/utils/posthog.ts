/**
 * PostHog is lazy-loaded so the ~58 kB gzip `posthog-js` chunk is not part
 * of the entry bundle that every pre-auth page (landing / auth / legal /
 * pricing / learn) must download before first paint.
 *
 * The public API is unchanged: each exported function is a synchronous
 * no-op until the underlying module finishes loading and `initPostHog()`
 * completes, at which point subsequent calls forward to the real client.
 * Any events fired before ready are quietly dropped — same behaviour as
 * the previous `if (!initialized) return` guards.
 */

type PostHogModule = typeof import('posthog-js');
type PostHogInstance = PostHogModule['default'];

type PostHogPersonProperties = Record<string, string | number | boolean | null | undefined>;
type PostHogEventProperties = Record<string, unknown>;

let client: PostHogInstance | null = null;
let loadPromise: Promise<PostHogInstance | null> | null = null;
let initPromise: Promise<void> | null = null;

const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY?.trim();
const POSTHOG_HOST = import.meta.env.VITE_POSTHOG_HOST?.trim() || 'https://us.i.posthog.com';

export function isPostHogEnabled() {
  return Boolean(POSTHOG_KEY);
}

async function loadClient(): Promise<PostHogInstance | null> {
  if (client) return client;
  if (!loadPromise) {
    loadPromise = import('posthog-js').then(mod => {
      client = mod.default;
      return client;
    });
  }
  return loadPromise;
}

export function initPostHog(): Promise<void> {
  if (initPromise) return initPromise;
  if (!POSTHOG_KEY || typeof globalThis.window === 'undefined') {
    initPromise = Promise.resolve();
    return initPromise;
  }

  initPromise = loadClient().then(instance => {
    if (!instance) return;
    instance.init(POSTHOG_KEY, {
      api_host: POSTHOG_HOST,
      capture_pageview: false,
      autocapture: true,
      persistence: 'localStorage+cookie',
      person_profiles: 'identified_only',
      loaded: loaded => {
        if (import.meta.env.DEV || import.meta.env.VITE_ANALYTICS_DEBUG === 'true') {
          loaded.debug(true);
        }
      },
    });
  });

  return initPromise;
}

function whenReady(fn: (instance: PostHogInstance) => void) {
  // Fast path: module already resolved, avoid an extra microtask.
  if (client) {
    fn(client);
    return;
  }
  // Drop if PostHog is disabled; keeps caller sites branch-free.
  if (!isPostHogEnabled()) return;
  void initPostHog().then(() => {
    if (client) fn(client);
  });
}

export function capturePostHogEvent(event: string, properties?: PostHogEventProperties) {
  whenReady(instance => instance.capture(event, properties));
}

export function capturePostHogPageview(properties: {
  path: string;
  search: string;
  hash: string;
  url: string;
}) {
  whenReady(instance => {
    instance.capture('$pageview', {
      $current_url: properties.url,
      path: properties.path,
      search: properties.search,
      hash: properties.hash,
    });
  });
}

export function identifyPostHogUser(id: string, properties?: PostHogPersonProperties) {
  whenReady(instance => instance.identify(id, properties));
}

export function resetPostHogUser() {
  whenReady(instance => instance.reset());
}
