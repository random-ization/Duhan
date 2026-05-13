# Web P0 Hardening Design

## Status

- Date: 2026-05-13
- Scope: Web P0 only
- Status: Completed
- Goal: [x] Fix the highest-risk Web regressions without mixing in broader P1/P2 refactors

## Problem Statement

The current Web app has four P0 risks:

1. Localized routing is inconsistent. Some redirects and `<Navigate>` targets preserve the active language prefix, but many page-level redirects still construct raw paths.
2. Pricing data is duplicated in multiple Web surfaces. `PricingDetailsPage` already reads backend prices, while desktop and mobile subscription surfaces still keep local pricing tables.
3. Key regression coverage is incomplete around redirect safety, XSS sanitation, vocab learning flows, settings sync, and vocab-book routing.
4. `DashboardPage` and `VocabBookPage` still mix route dispatch, query orchestration, surface assembly, and feature state. That makes them brittle and expensive to modify safely.

## User Intent

The user wants the current highest-priority Web issues fixed first, with the following constraints:

- P0 must be handled before broader dashboard, SEO, or route inventory cleanup.
- Shared abstractions are acceptable only when they directly reduce P0 risk.
- `DashboardPage` and `VocabBookPage` should become thin routing/dispatch layers instead of feature-heavy pages.

## Approaches Considered

### Option A: Page-by-page patching

Patch each redirect, each pricing page, and each test independently.

Pros:

- Lowest initial diff size
- Fastest short-term edits

Cons:

- Keeps duplicated logic in place
- High chance of future relapses
- Does not actually make `DashboardPage` or `VocabBookPage` easier to maintain

### Option B: Narrow shared layer for P0 only

Introduce the smallest possible shared helpers/hooks to centralize localization, pricing reads, and page thinning, but avoid broader P1/P2 unification.

Pros:

- Fixes the root cause of the current P0 issues
- Keeps scope contained
- Produces better long-term stability without turning into a large architecture pass

Cons:

- Slightly larger initial refactor than page-by-page patching
- Requires careful test updates while moving logic

### Option C: Full Web surface unification

Solve P0 together with dashboard source unification, SEO config extraction, route inventory, and additional surface cleanup.

Pros:

- Cleanest end state
- Reduces more duplication in one pass

Cons:

- Too wide for the current priority
- Higher regression risk
- Would delay the P0 fixes that the user explicitly wants first

## Recommendation

Choose Option B.

This is the smallest design that meaningfully lowers Web risk:

- unify localized routing behavior where redirects are constructed
- centralize backend pricing access
- restore high-value regression tests
- thin `DashboardPage` and `VocabBookPage` without rewriting their rendered surfaces

## In Scope

- Redirect and `<Navigate>` normalization for language-prefixed internal paths
- Shared pricing hook for Web subscription surfaces
- Shared premium-member subscription-management branching for desktop and mobile Web
- Page-thinning for `DashboardPage` and `VocabBookPage`
- Regression tests for the affected risk areas

## Out of Scope

- Dashboard source unification beyond what is required to thin `DashboardPage`
- Desktop achievement system rewiring
- SEO template/script extraction
- Full mobile/desktop route inventory audit
- Query count optimization not required by the page-thinning work

## Current State Summary

### Routing

- `src/routes.tsx` already localizes several route aliases and top-level redirects.
- `src/hooks/useLocalizedNavigate.ts` localizes string-based `navigate(...)` calls, but many page-level redirects still build raw strings directly.
- Existing tests already cover part of protected-route redirect behavior and upgrade-flow redirects.

### Pricing

- `src/pages/PricingDetailsPage.tsx` already fetches backend prices via `lemonsqueezy:getVariantPrices`.
- `src/pages/DesktopSubscriptionPage.tsx` still contains its own `PRICING_MAP`.
- `src/components/mobile/MobileSubscriptionPage.tsx` also contains its own `PRICING_MAP`.
- Mobile already has a premium-member management branch via `MemberSubscriptionManagement`; desktop does not follow the same rule yet.

### Page Boundaries

- `src/pages/DashboardPage.tsx` still owns query timing, banner logic, route mode interpretation, and dispatch between surfaces.
- `src/pages/VocabBookPage.tsx` still owns route parsing, query pagination, export state, optimistic mastery state, and device-specific dispatch.

## Target Design

### 1. Localized Redirect Contract

Create a single contract for internal navigation:

- Any internal string path must resolve to the active language-prefixed path unless it is already localized.
- Back/forward numeric navigation remains untouched.
- External URLs remain untouched.
- Auth redirects and preserved `returnTo` values must keep the localized destination intact.

Implementation shape:

- extend current path-localization helpers instead of replacing them
- replace raw internal redirect construction in page-level `<Navigate>` and auth/pricing flow helpers with shared path builders
- add focused tests for route aliases, protected-route redirects, and upgrade-flow redirects

### 2. Shared Pricing Hook

Add `usePricingPlans` as the single Web price source.

Responsibilities:

- fetch `lemonsqueezy:getVariantPrices`
- normalize loading, error, and plan lookup
- map backend prices into UI-safe display structures
- expose enough metadata for both compact subscription pages and detailed comparison pages

Non-responsibilities:

- checkout creation
- plan copywriting
- premium entitlement policy

Consumers:

- `src/pages/PricingDetailsPage.tsx`
- `src/pages/DesktopSubscriptionPage.tsx`
- `src/components/mobile/MobileSubscriptionPage.tsx`

### 3. Shared Subscription Surface Branching

Unify the rule for logged-in premium users:

- if the session is known and the user is already premium, show `MemberSubscriptionManagement`
- do not continue showing the purchase-first surface to active members

This rule should be shared between desktop and mobile Web. The concrete layout may differ, but the branching policy must not.

### 4. Dashboard Page Thinning

Move feature-heavy logic out of `src/pages/DashboardPage.tsx` into `useDashboardSurface`.

`DashboardPage` should remain responsible for:

- device split
- route/search-param interpretation that decides which surface to show
- passing resolved surface props into the existing desktop/mobile dashboard components

`useDashboardSurface` should own:

- low-priority query readiness
- upgrade banner timing and dismissal state
- derived user/course/progress view state
- surface-ready data packaging for the chosen dashboard UI

Constraint:

- preserve the existing performance boundary around `DashboardPage`; do not pull heavy imports back into the page shell

### 5. Vocab Book Page Thinning

Move feature-heavy route and state logic out of `src/pages/VocabBookPage.tsx` into `useVocabBookRouteState`.

`VocabBookPage` should remain responsible for:

- device split
- reading route/search params
- handing route-state outputs to desktop/mobile vocab-book surfaces

`useVocabBookRouteState` should own:

- category/search parsing
- paginated query orchestration
- selected-word state
- optimistic mastery state
- export modal state
- safe `returnTo` resolution

Constraint:

- do not redesign the vocab-book UI in this pass

## Testing Plan

### Redirect and Localization

- extend protected-route redirect tests to cover localized nested destinations
- extend upgrade-flow tests to cover localized auth and pricing handoff
- add route-alias coverage for `vocabbook -> vocab-book` and other affected aliases

### XSS

- keep `tests/unit/sanitize.test.ts` as the primary guardrail
- add any missing cases required by touched render paths, but do not broaden the test suite beyond the affected risk area

### Settings Sync

- strengthen `tests/unit/profileSettingsTab.test.tsx` around display-language updates and sync-failure fallback behavior

### Vocab Learning and Vocab Book

- add focused tests around vocab-book route parsing/state behavior
- preserve at least one high-value vocab learning smoke path instead of trying to rebuild full historical E2E coverage in the same pass

## Rollout Order

1. Normalize localized redirects and update redirect tests.
2. Add `usePricingPlans` and remove duplicated Web pricing maps.
3. Unify premium-member subscription branching across desktop/mobile Web.
4. Thin `DashboardPage` into route dispatch plus `useDashboardSurface`.
5. Thin `VocabBookPage` into route dispatch plus `useVocabBookRouteState`.
6. Run targeted verification, then broader type/lint checks as needed.

## Verification Plan

- targeted unit tests for redirects, sanitize, settings sync, pricing helpers, and vocab-book route state
- targeted lint/typecheck on touched files
- broader `npm run typecheck:src` if the touched surface reaches across multiple shared hooks

## Risks and Mitigations

### Risk: localized redirect regressions break auth or payment return paths

Mitigation:

- keep redirect builders narrow and test the exact produced URLs

### Risk: backend pricing data shape differs from current UI assumptions

Mitigation:

- isolate formatting logic inside `usePricingPlans`
- keep the UI consuming typed display fields instead of raw response objects

### Risk: page-thinning accidentally reintroduces heavy imports into page shells

Mitigation:

- preserve existing lazy boundaries and keep feature code inside hooks/components, not the shell pages

### Risk: the refactor expands into broader dashboard or vocab redesign work

Mitigation:

- treat UI output parity as a hard boundary
- reject changes that alter surface behavior unless required for the P0 fixes

## Success Criteria

- All internal redirects touched by this pass consistently preserve or add the correct language prefix.
- Desktop and mobile Web no longer rely on duplicated hardcoded price tables.
- Active premium members land on subscription management rather than purchase-first subscription pages.
- `DashboardPage` and `VocabBookPage` are thin dispatch layers instead of logic-heavy feature pages.
- Regression coverage is restored for the highest-value P0 paths named by the user.
