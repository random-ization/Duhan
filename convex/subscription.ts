type SubscriptionSnapshot =
  | {
      subscriptionType?: string;
      subscriptionExpiry?: string;
    }
  | null
  | undefined;

function parseExpiryMs(expiry?: string): number | null {
  if (!expiry) return null;
  const trimmed = expiry.trim();
  if (!trimmed) return null;

  const numeric = Number(trimmed);
  if (Number.isFinite(numeric) && numeric > 0) {
    // Accept both seconds and milliseconds.
    return numeric < 1_000_000_000_000 ? numeric * 1000 : numeric;
  }

  const parsed = Date.parse(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

export function hasActiveSubscription(
  subscription: SubscriptionSnapshot,
  nowMs: number = Date.now()
): boolean {
  const plan = subscription?.subscriptionType?.trim().toUpperCase();
  if (!plan) return false;

  if (plan === 'LIFETIME') {
    return true;
  }

  const expiryMs = parseExpiryMs(subscription?.subscriptionExpiry);
  return expiryMs !== null && expiryMs > nowMs;
}
