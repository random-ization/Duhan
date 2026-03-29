'use node';

import { captureServerException, captureServerMessage } from './sentry';

const DEFAULT_POSTHOG_HOST = 'https://us.i.posthog.com';

type PostHogProperties = Record<string, unknown>;

type CaptureServerPostHogEventArgs = {
  event: string;
  distinctId: string;
  properties?: PostHogProperties;
  timestamp?: string;
};

function getPostHogConfig() {
  const apiKey = process.env.POSTHOG_PROJECT_KEY?.trim();
  if (!apiKey) return null;

  const host = (process.env.POSTHOG_HOST?.trim() || DEFAULT_POSTHOG_HOST).replace(/\/+$/, '');
  return { apiKey, host };
}

export async function captureServerPostHogEvent({
  event,
  distinctId,
  properties,
  timestamp,
}: CaptureServerPostHogEventArgs) {
  const config = getPostHogConfig();
  if (!config) return false;

  try {
    const response = await fetch(`${config.host}/capture/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: config.apiKey,
        event,
        distinct_id: distinctId,
        properties: {
          source: 'convex',
          runtime: 'convex-node',
          ...properties,
        },
        timestamp,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      await captureServerMessage('PostHog capture failed', 'warning', {
        module: 'posthog',
        operation: 'capture',
        event,
        status: response.status,
        body: body.slice(0, 500),
      });
      return false;
    }

    return true;
  } catch (error) {
    await captureServerException(error, {
      module: 'posthog',
      operation: 'capture',
      event,
    });
    return false;
  }
}
