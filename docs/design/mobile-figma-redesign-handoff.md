# Mobile Figma Redesign Handoff

## Status

- Goal: produce a full mobile redesign in a new Figma file before any UI implementation work starts.
- Constraint: preserve all existing user-facing functionality, routes, and high-risk flows.
- Current blocker: Figma MCP auth is not active for this session. `figma_whoami` currently returns `401 Unauthorized`.

## Figma Deliverable

Create one new Figma design file for the full mobile redesign review. Organize frames by user journey, not by isolated screens.

### Page groups

- `00 Cover & Directions`
- `01 Public`
- `02 Auth & Pricing`
- `03 Today & Path`
- `04 Drill`
- `05 Media`
- `06 Me`
- `07 Components & Tokens`

### Cover page content

- Project title: `Hangyeol Mobile Redesign`
- Direction: `BoldVoice-inspired learning workspace`
- Supporting references:
  - BoldVoice dashboard for daily plan and learning CTA
  - BoldVoice course for path/module progression
  - Promova paywall for mobile subscription clarity
  - Drops profile for streak/achievement framing
  - Kann analytics for lightweight learning metrics cards
- Design rules:
  - Do not remove any existing feature
  - Do not change core route structure
  - Keep return paths, player features, search/filter, review modes, TOPIK flows, profile/security, and pricing flows intact

## Design Direction

This redesign should feel like a focused language-learning workspace, not a marketing-heavy app and not a gamified clone.

### Primary cues to carry into the redesign

- Strong first-screen task focus
- Clear “continue learning” and “next action” hierarchy
- Distinct section cards with strong CTA treatment
- Better readability for long-form study, media study, and active drills
- Stable immersive patterns for player, exam, and vocab-book sessions

### Reference mapping

- Dashboard, Courses, Module pages: BoldVoice
- Pricing and Payment: Promova
- Profile, streak, achievements: Drops
- Summary and analytics cards: Kann

## Figma Scope Rules

Each user-facing route in `src/routes.tsx` must have a matching mobile design frame or a clearly documented shared frame pattern.

### Required per-screen coverage

- Main/default state
- High-risk states when relevant:
  - loading
  - empty
  - error
  - locked/paywall
  - active session
  - completed/result

### Required immersive page context

- header state
- bottom controls
- info/tool sheet
- return-path context

## Feature Preservation Checklist

The Figma draft must visibly preserve these abilities where applicable:

- search and filters
- `returnTo` flows
- media player and transcript controls
- dictionary, annotation, and save actions
- review, quiz, learn, test, and flashcard mode switching
- TOPIK lobby, history, exam, review, and writing flows
- membership, upgrade prompts, checkout, payment success, and redirect-back behavior
- profile, security, subscription, streak, and achievements

## Working Sequence Once Figma Auth Is Restored

1. Confirm authenticated Figma account and available plan/team.
2. Create a new design file for the redesign review.
3. Lay out the 8 page groups listed above.
4. Use `docs/design/mobile-page-coverage-matrix.csv` as the authoritative frame checklist.
5. Build shared mobile tokens and patterns first:
   - color
   - spacing
   - radius
   - typography
   - CTA styles
   - header variants
   - bottom nav
   - sheet/modal patterns
   - state cards
6. Build primary frames first:
   - Dashboard
   - Courses Overview
   - Course Dashboard
   - Media Hub
   - Pricing
   - Profile
7. Expand to all supporting pages and all high-risk states.
8. Review against the coverage matrix before handing off for approval.

## Review Gate

Before asking for design approval, verify:

- every non-admin user route has a corresponding mobile frame or shared pattern
- every high-risk flow still has all required actions visible
- no player, exam, vocab-book, pricing, or auth function has been simplified away
- immersive pages have coherent header and bottom-control behavior
- the redesign reads as a language-learning product, not a generic app reskin

## Implementation Note

No code implementation should begin until:

- Figma auth is restored
- the new file is created
- the full draft has been reviewed
- requested design changes are folded back into the Figma file
