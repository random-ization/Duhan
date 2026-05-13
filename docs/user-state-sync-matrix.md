# User State Sync Matrix

Last updated: 2026-05-12
Status: Phase B working draft

## Scope

This matrix tracks user-visible state stored in `localStorage`, `sessionStorage`, or `userSettings`, and decides whether it should sync across devices.

## Current Decisions

| Key / setting | Owner | Storage today | Cross-device sync | Current source of truth | Decision / rationale | Next action |
| --- | --- | --- | --- | --- | --- | --- |
| `fontScale` | Global UI preference | `userSettings.fontScale` + `mobile_font_scale_index` fallback | Yes | `userSettings.fontScale` | Real user preference; should follow account across web desktop/mobile | Done in Phase B1 |
| `mobile_font_scale_index` | Mobile header | `localStorage` | Fallback only | Local fallback for `fontScale` | Keep for offline boot and legacy migration; do not treat as primary source | Keep as cache only |
| `preferredLanguage` | Language routing | `localStorage` | Yes | URL language + `userSettings.displayLanguage` intent + local fallback | Real user preference; local value is still needed before auth and for route boot | Keep and continue syncing to `userSettings.displayLanguage` |
| `preferredLanguageSource` | Language routing | `localStorage` | Indirect | Local routing helper | Needed to distinguish explicit user choice vs auto-detect; not a standalone preference | Keep local only |
| `displayLanguage` | Global user settings | `userSettings.displayLanguage` | Yes | User settings, reflected into route/local state | Real user preference; should sync across devices | Sync on explicit language changes |
| `flashcardAutoTTS` | Flashcard settings | `userSettings` | Yes | `userSettings` | Real study preference used on desktop and mobile | Audit passed |
| `flashcardFront` | Flashcard settings | `userSettings` | Yes | `userSettings` | Real study preference used on desktop and mobile | Audit passed |
| `flashcardRatingMode` | Flashcard settings | `userSettings` | Yes | `userSettings` | Real study preference used on desktop and mobile | Audit passed |
| `mediaSubtitleMode` | Media playback | `userSettings` | Yes | `userSettings` | Real playback preference used across podcast, mobile video, and desktop video subtitle display | Audit passed |
| `mediaShowTranslation` | Media playback | `userSettings` derived | Yes | Derived from `mediaSubtitleMode` | Keep derived to avoid split brain | No change |
| `mediaAutoScroll` | Media playback | `userSettings` | Partial | `userSettings` where scrollable transcript UI exists | Used by podcast transcript and mobile video transcript; legacy desktop video page has no scrollable transcript panel yet | Accept partial parity for v1.0 |
| `listenPlayMeaning` | Listen mode | `userSettings` + session snapshot | Yes | `userSettings` for defaults, `sessionStorage` for in-session resume | Real study preference; new sessions should follow account, current session can keep local progress state | Phase B wired into `VocabBookListenPage` |
| `listenPlayExampleTranslation` | Listen mode | `userSettings` + session snapshot | Yes | `userSettings` for defaults, `sessionStorage` for in-session resume | Same as above | Phase B wired into `VocabBookListenPage` |
| `audioRepeatCount` | Listen mode | `userSettings` + session snapshot | Yes | `userSettings` for defaults, `sessionStorage` for in-session resume | Real playback preference; defaults now follow account | Phase B wired into `VocabBookListenPage` |
| `audioSpeed` | Listen mode | `userSettings` + session snapshot | Yes | `userSettings` for defaults, `sessionStorage` for in-session resume | Real playback preference; defaults now follow account | Phase B wired into `VocabBookListenPage` |
| `dictationPlayCount` | Dictation mode | `userSettings` + session snapshot | Yes | `userSettings` for defaults, `sessionStorage` for in-session resume | Real study preference; defaults now follow account | Phase B wired into `VocabBookDictationPage` |
| `dictationGapSeconds` | Dictation mode | `userSettings` + session snapshot | Yes | `userSettings` for defaults, `sessionStorage` for in-session resume | Real study preference; defaults now follow account | Phase B wired into `VocabBookDictationPage` |
| `dictationAutoNext` | Dictation mode | `userSettings` + session snapshot | Yes | `userSettings` for defaults, `sessionStorage` for in-session resume | Real study preference; defaults now follow account | Phase B wired into `VocabBookDictationPage` |
| `dailyGoalMinutes` | Goal setting | `userSettings` | Yes | `userSettings` via `userStats.dailyGoal` | Real user preference; dashboards already consume the backend-projected value | Audit passed |
| `privacy.profileVisibility` | Profile privacy | `userSettings.privacy` | Yes | `userSettings` | Account-level privacy setting | Recheck desktop/mobile profile surfaces |
| `privacy.leaderboardOptOut` | Privacy | `userSettings.privacy` | Yes | `userSettings` | Account-level privacy setting | Recheck leaderboard/profile surfaces |
| `grammar_mobile_reader_font_scale` | Mobile grammar reader | `localStorage` | No for now | Local device UI preference | Reader-only display tweak; acceptable as device-specific until unified reader prefs exist | Keep local for v1.0 |
| `grammar_reader_font_scale` | Desktop grammar reader | `localStorage` | No for now | Local device UI preference | Reader-only display tweak; currently independent from global app font scale | Keep local for v1.0 |
| `grammar_reader_red_eye` | Desktop grammar reader | `localStorage` | No | Local device UI preference | Accessibility/display mode can remain device-specific | Keep local |
| `grammar_ai_panel_open` | Grammar page | `localStorage` | No | Local UI state | Pure panel open/close state; should not follow user across devices | Keep local |
| `podcast:koreanChart` / `podcast:koreanChart:ts` | Podcast dashboard | `localStorage` | No | Local cache | Performance cache, not a user preference | Keep local cache |
| `duhan:stale-chunk-recovery-attempts` | Chunk recovery | `localStorage` | No | Local resilience counter | Device/runtime-specific recovery guard | Keep local |
| Reading article session key | Reading article page | `sessionStorage` | No | Session snapshot | Session resume state belongs to one browser tab/device | Keep session-only |
| Picture book reader session key | Picture book reader | `sessionStorage` | No | Session snapshot | Session resume state belongs to one browser tab/device | Keep session-only |
| Vocab immersive session key | Vocab immersive mode | `sessionStorage` | No | Session snapshot | Session resume state belongs to one browser tab/device | Keep session-only |
| Vocab listen session key | Vocab listen mode | `sessionStorage` | No | Session snapshot | Session resume state belongs to one browser tab/device; only extracted for migration help | Keep session-only |
| Vocab dictation session key | Vocab dictation mode | `sessionStorage` | No | Session snapshot | Session resume state belongs to one browser tab/device; only extracted for migration help | Keep session-only |
| Vocab spelling session key | Vocab spelling mode | `sessionStorage` | No | Session snapshot | Session resume state belongs to one browser tab/device | Keep session-only |
| `mobile_topik_filter_type` | Topik mobile filter | Not found in current `src/` snapshot | Unknown | Unknown | Mentioned in launch plan, but not present in current codebase snapshot | Reconfirm current implementation path |
| `mobile_vocab_active_tab` | Mobile vocab default tab | Not found in current `src/` snapshot | Unknown | Unknown | Mentioned in launch plan, but not present in current codebase snapshot | Reconfirm current implementation path |

## Audit Notes

- Desktop and mobile flashcard preferences are already reading and writing `userSettings`.
- Mobile app font scaling now syncs through `userSettings.fontScale`, while preserving `localStorage` as an offline fallback.
- Language switching still relies on URL + localStorage for routing, but explicit user changes now also sync `userSettings.displayLanguage`.
- Route resolution now prefers `userSettings.displayLanguage` over local explicit language when both exist, then falls back to `preferredLanguage`, then browser detection.
- `mediaSubtitleMode` is now confirmed on podcast, mobile video, and desktop video surfaces; `mediaAutoScroll` remains meaningful only on surfaces with a scrollable transcript.
- Listen and dictation defaults now read from `userSettings`, while active session progress remains in `sessionStorage`.
- `dailyGoalMinutes` is already projected by Convex `userStats.getStats` into `dailyGoal`, so dashboard surfaces stay aligned as long as they read stats from the backend.

## Suggested Follow-up

1. Finish B2 coverage audit for listen/dictation/media/dashboard consumers.
2. Manually verify the canonical language priority on a fresh device and a stale-device scenario:
   `userSettings.displayLanguage` -> explicit `preferredLanguage` -> browser language.
3. Decide whether grammar reader font preferences should remain device-local for v1.0 or be folded into a dedicated reader preferences namespace in v1.1.
