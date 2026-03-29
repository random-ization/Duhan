import posthog from 'posthog-js';

type PostHogPersonProperties = Record<string, string | number | boolean | null | undefined>;
type PostHogEventProperties = Record<string, unknown>;

let initialized = false;

const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY?.trim();
const POSTHOG_HOST = import.meta.env.VITE_POSTHOG_HOST?.trim() || 'https://us.i.posthog.com';

export function isPostHogEnabled() {
  return Boolean(POSTHOG_KEY);
}

export function initPostHog() {
  if (initialized || !POSTHOG_KEY || typeof globalThis.window === 'undefined') {
    return;
  }

  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    capture_pageview: false,
    autocapture: true,
    persistence: 'localStorage+cookie',
    person_profiles: 'identified_only',
    loaded: instance => {
      if (import.meta.env.DEV || import.meta.env.VITE_ANALYTICS_DEBUG === 'true') {
        instance.debug(true);
      }
    },
  });

  initialized = true;
}

export function capturePostHogEvent(event: string, properties?: PostHogEventProperties) {
  if (!initialized) return;
  posthog.capture(event, properties);
}

export function capturePostHogPageview(properties: {
  path: string;
  search: string;
  hash: string;
  url: string;
}) {
  if (!initialized) return;
  posthog.capture('$pageview', {
    $current_url: properties.url,
    path: properties.path,
    search: properties.search,
    hash: properties.hash,
  });
}

export function identifyPostHogUser(id: string, properties?: PostHogPersonProperties) {
  if (!initialized) return;
  posthog.identify(id, properties);
}

export function resetPostHogUser() {
  if (!initialized) return;
  posthog.reset();
}
