# Launch Runbook

Last updated: March 19, 2026  
Refund policy baseline: **14-day full refund**

## 1. Release Checklist

1. Run `npm run check:release`.
2. Confirm CI (`.github/workflows/ci.yml`) is green on target commit.
3. Run production env validation:
   - `NODE_ENV=production npm run env:validate`
4. Verify legal copy consistency:
   - Terms/Privacy/Refund pages all render correctly in `en/zh/vi/mn`.
   - Pricing, landing FAQ, and refund badge all match 14-day policy.

## 2. Alert Rules (Must Configure Before Launch)

1. Frontend exception rate:
   - Source: Sentry frontend project (`VITE_SENTRY_DSN`).
   - Trigger: error rate > 2% in 5 minutes.
2. API health probe:
   - Endpoint: `GET /api/health` (or Convex `/health`).
   - Trigger: 3 consecutive failures OR p95 latency > 2s for 10 minutes.
3. Payment webhook failures:
   - Source: Sentry backend + provider dashboards.
   - Trigger: any continuous 4xx/5xx for 5 minutes.
4. Login failure spike:
   - Source: frontend error tracking + auth logs.
   - Trigger: failed login attempts > 3x 7-day baseline within 15 minutes.

## 3. Rollback Procedure

1. Frontend rollback:
   - Roll back Vercel to last healthy deployment.
2. Backend rollback (if needed):
   - Restore Convex from latest validated export snapshot.
3. Validation after rollback:
   - `/en`, `/en/login`, `/en/pricing/details`, `/api/health`.
   - Payment webhooks return 2xx.

## 4. Webhook Replay Procedure

1. Identify failed event IDs in provider dashboard (Creem/LemonSqueezy/Deepgram).
2. Replay from provider console for failed window.
3. Confirm:
   - webhook endpoint returns 200.
   - affected user `subscriptionType`/`tier` updated as expected.
4. Record replay window and affected count in incident log.

## 5. Refund SOP (14-Day Policy)

1. Confirm purchase timestamp is within 14 days.
2. Verify account email and payment record.
3. Process refund in provider dashboard.
4. Ensure subscription access is revoked if required.
5. Reply to user with confirmation and expected bank/card settlement window.

## 6. Incident Contacts (Fill Before Launch)

1. Engineering on-call:
2. Payment owner:
3. Support owner:
4. Escalation backup:
