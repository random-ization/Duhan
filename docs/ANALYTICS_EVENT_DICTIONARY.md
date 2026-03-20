# Analytics Event Dictionary

Last updated: March 19, 2026

## Core Events

| Event                        | Required Properties                        | Trigger                                              |
| ---------------------------- | ------------------------------------------ | ---------------------------------------------------- |
| `landing_cta_click`          | `language`, `ctaId`, `placement`, `target` | Landing page CTA click (nav/hero/pricing cards)      |
| `signup_start`               | `language`, `method`, `platform`           | User starts signup flow                              |
| `signup_success`             | `language`, `method`, `platform`           | Password signup succeeds before redirect             |
| `checkout_start`             | `language`, `plan`, `source`               | User clicks checkout CTA                             |
| `checkout_success`           | `language`, `plan`, `source`               | Checkout URL created successfully                    |
| `payment_activation_success` | `language`, `provider`                     | Payment success page confirms activated subscription |
| `day1_retention`             | `language`, `userTier`, `daysSinceSignup`  | Returning user opens dashboard after day 1           |

## Standard Property Definitions

- `language`: UI language (`en`, `zh`, `vi`, `mn` or locale variant).
- `method`: signup method (`password`, `google`, `kakao`).
- `platform`: device class (`desktop`, `mobile`).
- `plan`: checkout plan (`MONTHLY`, `QUARTERLY`, `SEMIANNUAL`, `ANNUAL`, `LIFETIME`).
- `source`: CTA source context (for example `pricing_details`, `desktop_subscription`, `mobile_subscription`).

## Implementation Notes

- Event emitter: `src/utils/analytics.ts`
- Current sinks:
  - `window.dataLayer.push(...)`
  - `gtag('event', ...)` when GA4 is present
  - `posthog.capture(...)` when PostHog is present
- Dev mode prints each event to console (`[analytics:event]`).
