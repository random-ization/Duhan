# Hangyeol Web Capability Entry and Strategy Audit

Date: 2026-05-22
Scope: Web app, Convex-backed product capability, and user-facing entry points.

## Executive Summary

Hangyeol already has the right strategic modules for an AI Korean deep-learning product: onboarding, daily tasks, content import, sentence explanation, TOPIK writing coaching, speaking practice, weekly reports, review queues, and a help center. The main product risk was not missing modules. It was broken or weak connective tissue between modules.

This pass fixes the highest-risk Web gaps:

- Imported content sentences now route to a real sentence learning page instead of a missing route.
- The sentence page can call the existing sentence explainer, save sentence/vocabulary/grammar assets, and enqueue review assets.
- The dashboard now promotes AI sentence explanation as a primary action and can continue recently imported content.
- Onboarding now uses backend diagnosis questions and submits diagnosis answers before entering the dashboard.
- Daily tasks now expose the diagnosis rationale behind the generated plan.
- Speaking practice no longer relies on loose Web Speech API typing.
- Weekly report persisted schema no longer uses loose validators for TOPIK and KAGAS fields.
- Weekly reports now include saved sentence, vocabulary, grammar, and sentence/grammar review-due summaries.
- Weekly reports can now show cross-week feedback and write an explainable focus strategy back into today's task plan.
- Imported-content study now tracks reading progress, resumes from the last read sentence, supports marking a full import as complete, and exposes a lightweight content library with status/source filters, URL host labels, per-content daily sentence targets, estimated completion days, cumulative outcome totals, and reopen-workspace actions.
- Sentence learning now lets users confirm known/unknown vocabulary, merge duplicate words, edit meanings, preview cards before saving, manage generated cards after saving, write back imported-content progress, and continue to the next sentence.
- TOPIK writing now shows longitudinal score trend, same-prompt rewrite comparisons, before/after answer text, AI improved version, multi-day retry history, explicit revision goals, and retry coaching focus from saved writing attempts.
- Daily tasks now promote due saved sentences, due saved grammar, TOPIK writing weaknesses, and manually scheduled TOPIK rewrite drills into explicit actionable tasks instead of summary-only signals.
- Scheduled TOPIK rewrite drills now carry a task id in the writing-coach link, prefill the retry form from the latest same-prompt attempt, and are marked complete automatically after the user submits the retry.
- Saved sentence-learning assets now surface AI quality traceability after save: confidence, prompt version, provider, source, review status, and generated-card review state.
- Low-confidence and unreviewed sentence explanations now have a dedicated AI asset quality queue with approve/reject, batch-approve, reason filters, and prompt/provider workload analytics.
- The quality review queue now supports inline correction of natural translation and summary, plus reviewer notes and structured correction history on the sentence explanation asset.

The remaining priority is product packaging: make the first-run and dashboard experience consistently communicate one learning loop:

Goal -> diagnosis -> today's task -> sentence/content explanation -> saved learning assets -> review -> weekly feedback.

## Capability Matrix

| Capability              | Route / Surface                   | Entry Status                                                        | Backend Status                                                                                                                                                                                                                                | Current Verdict                                                                                                                                                                                                                                                                                                         |
| ----------------------- | --------------------------------- | ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Onboarding + diagnosis  | `/onboarding`                     | Protected full-screen flow                                          | `onboarding.getDiagnosisQuestions`, `submitGoals`, `submitDiagnosisResult`, daily plan generation                                                                                                                                             | Usable P0 flow after this pass                                                                                                                                                                                                                                                                                          |
| Daily task cockpit      | `/dashboard`, `/dashboard/course` | Desktop and mobile dashboard                                        | `dailyTask.getTodayPlan`, `generateTodayPlan`, `scheduleTopikRewriteTask`, `updateTaskCompletion`, review/weak-point signals, diagnosis rationale                                                                                             | Usable as an adaptive action planner across imported content, saved assets, TOPIK weak points, scheduled rewrite drills, and completion writeback                                                                                                                                                                       |
| Text import             | `/learning/text-import`           | Courses overview, dashboard sentence action, command palette        | `importedContent`, `contentImport`, `content_sentences`, `listStudyStates`, `updateContentTags`, `updateContentFolder`, `user_reading_progress`                                                                                               | Usable with continuation cards, filterable content library, URL source labels, editable tags, lightweight folders, 7-day reading plan, 30-day outcome trend, per-content study-plan targets, per-content completion summaries, cumulative outcome totals, sentence queue, progress resume, and reading-completion state |
| Sentence learning       | `/learning/sentence/:sentenceId`  | Dashboard action and imported content sentence cards                | `sentenceExplainer`, `saveAssets`, `readingProgress`, FSRS sentence/grammar queues, AI quality metadata                                                                                                                                       | Connected as a primary learning loop with editable vocabulary-card selection, quality traceability, progress writeback, next-sentence handoff, and single-card undo                                                                                                                                                     |
| AI asset quality review | `/learning/asset-quality`         | Review center sidebar/mobile card                                   | `sentenceExplainer/quality.getQualityReviewQueue`, `getQualityReviewStats`, `reviewQualityItem`, `bulkReviewQualityItems`                                                                                                                     | Usable low-confidence queue for filtering, approving, rejecting, batch-approving, correcting, and auditing sentence explanations by prompt/provider                                                                                                                                                                     |
| TOPIK writing coach     | `/topik/writing-coach`            | TOPIK page, dashboard cards, mobile TOPIK, course dashboard         | Writing coach, hot topics, score prediction, writing trend, rewrite comparisons, before/after text, multi-day retry history, explicit revision goals, scheduled rewrite task, retry prefill, completion writeback, mistakes, improvement plan | Strong paid-feature candidate with prompt-bank, retry loop, and progress feedback                                                                                                                                                                                                                                       |
| Speaking practice       | `/speaking`                       | Dashboard entry                                                     | `speaking_sessions`, `pronunciation_scores`                                                                                                                                                                                                   | Usable MVP; still browser-ASR dependent                                                                                                                                                                                                                                                                                 |
| Weekly report           | `/dashboard/weekly-report`        | Desktop sidebar, desktop dashboard, mobile dashboard                | `weeklyReport.getWeeklyReport`, weak points, focus strategy writeback                                                                                                                                                                         | Usable with cross-week feedback, next-task handoff, and visible adjustment reasons                                                                                                                                                                                                                                      |
| Help center             | `/help`                           | Public route, sidebar, profile support, command palette, SEO config | Static help content                                                                                                                                                                                                                           | Good public support surface                                                                                                                                                                                                                                                                                             |

## Fixed Gaps

- Text import had a live UI action that navigated to an unregistered sentence route. This is now connected to a real learning page.
- Text import now exposes recent imported-content continuation cards and a lightweight content library with source/status/tag/folder filters, editable tags, editable folders, URL host labels, next sentence, saved sentence, saved word, saved grammar, remaining sentence count, daily target, estimated completion days, a 7-day reading plan, a 30-day outcome trend, per-content completion summaries, cumulative outcome totals, and reopen-workspace actions.
- Dashboard now makes AI sentence explanation a visible primary action, not only a downstream text-import subflow.
- Onboarding previously collected self-assessed level only. It now loads backend diagnosis questions and submits answers through the existing Convex API.
- Daily task plans now carry a readable rationale from onboarding goals and diagnosis summaries.
- Speaking practice used loose browser API typing and type assertions. It now has explicit local Web Speech API interfaces.
- The weekly reports schema used loose validators for TOPIK and KAGAS summaries. Those fields are now explicitly shaped.
- Weekly reports now show saved sentence, vocabulary, and grammar assets, plus sentence/grammar review due counts.
- Weekly reports now compare this week with the previous week, apply a profile-aware focus strategy to today's task plan, and show task-level adjustment reasons.
- TOPIK writing now has a recommended prompt bank and same-prompt retry path after feedback.
- TOPIK writing now converts saved attempts into a score trend, normalized attempt bars, same-prompt rewrite comparison, before/after answer text, multi-day retry history, explicit revision goals, and retry coaching focus.
- TOPIK writing rewrite coaching can now be added to today's task plan, so a retry recommendation becomes an actionable daily drill.
- TOPIK rewrite drills opened from today's task plan now prefill the task type, prompt, and latest draft to remove repeat setup work.
- TOPIK rewrite drills launched from today's task plan now mark themselves complete after the retry is submitted.
- Text import now writes sentence-reading progress before opening the sentence explainer and can mark an imported text as completed.
- Sentence learning now excludes words marked as known, deduplicates repeated words, and saves edited meanings before generating vocabulary review cards.
- Sentence learning now shows generated vocabulary cards after saving, writes imported-content progress/saved counts, offers a next-sentence action, and can undo a single generated card from the same source sentence.
- Daily tasks now create direct review tasks for due saved sentences and saved grammar, route TOPIK writing weaknesses into the writing coach, preserve manually scheduled TOPIK rewrite drills, and accept completion writeback from the writing coach.
- Sentence learning now shows save-time quality metadata for generated assets, including confidence, prompt version, provider, source, source reference, review status, and card review state.
- Review center now links to an AI asset quality queue. Users can filter by review reason, approve, reject, or batch-approve low-confidence/unreviewed sentence explanations, and approved/rejected items leave the queue.
- AI asset quality review now records inline corrections and reviewer notes, so approved assets preserve a correction trail rather than overwriting silently.
- AI asset quality review now shows prompt/provider workload analytics, making recurring low-quality generation sources visible.

## Remaining Product Gaps

- Daily tasks now prioritize imported sentences, saved sentence/grammar review, TOPIK writing weaknesses, and scheduled rewrite drills in one adaptive plan. The next gap is richer cross-module sequencing over multiple days.
- Text import supports paste, URL import, continuation cards, a lightweight filterable content library, editable tags, editable folders, per-content daily targets, a 7-day reading plan, a 30-day outcome trend, completion outcome summaries, cumulative outcome totals, sentence-level study, queue filters, reading-completion state, save-time progress writeback, and next-sentence continuation. The next gap is deeper cross-week comparison beyond the current lightweight folder, 7-day plan, and 30-day snapshot model.
- Speaking practice is closer to pronunciation scoring than the PRD's scenario-based speaking coach. It needs scenario goals, role prompts, naturalness/politeness feedback, and reusable expressions.
- Weekly report now includes asset summaries, cross-week feedback, a next-week priority cue, and a same-day focus writeback. The next gap is deeper long-range trend history beyond the current previous-week comparison.
- TOPIK writing now has progress feedback and revision-specific coaching that compares the actual old and new Korean text side by side.
- Commercial packaging should emphasize outcomes: TOPIK score improvement, real-content comprehension, speaking confidence, and daily coach guidance.

## Competitor Comparison

| Competitor   | Strong Signal                                                                                                          | Hangyeol Response                                                                       |
| ------------ | ---------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| TTMIK / Seyo | Structured curriculum and guided speaking/writing practice                                                             | Keep textbook/course depth, but differentiate with AI explanation and saved-asset loops |
| LingoDeer    | Beginner-friendly structured grammar and course progression                                                            | Avoid competing only on beginner lessons; use grammar depth plus real-content learning  |
| Migaku       | Learn from native content, mine words/sentences, create cards                                                          | Make text import + sentence explainer + FSRS the primary differentiator                 |
| Lingopie     | Interactive subtitle/content learning with flashcards                                                                  | Improve media/content learning handoff into vocabulary, sentence, and review assets     |
| Teuida       | Speaking-focused practice and roleplay positioning                                                                     | Build scenario speaking after pronunciation MVP stabilizes                              |
| Duolingo     | AI conversation/video call for high-engagement practice; Korean is available on iOS and announced as coming to Android | Do not copy game-first flow; use AI coach for serious learners and TOPIK outcomes       |

Reference pages:

- TTMIK curriculum: https://courses.talktomeinkorean.com/
- Seyo speaking product: https://courses.talktomeinkorean.com/seyo
- LingoDeer Korean structured grammar course: https://www.lingodeer.com/language/korean
- Migaku Korean native-content learning: https://migaku.com/learn-korean
- Lingopie Korean content learning: https://lingopie.com/learn-korean
- Teuida speaking and pronunciation positioning: https://www.teuida.net/blog/why-teuida-is-the-best-app-for-speaking-korean-fluently
- Duolingo AI video call Android expansion: https://investors.duolingo.com/news-releases/news-release-details/duolingo-launches-ai-powered-video-call-android
- Duolingo video call language availability: https://blog.duolingo.com/video-call/

## P0 / P1 Recommendations

P0 completed in this pass:

- Promote the sentence explainer as a primary dashboard action, not only a text-import subflow.
- Add "continue imported content" cards after import, with clear next sentence and saved asset counts.
- Convert diagnosis output into visible dashboard rationale.
- Surface saved sentence, word, and grammar counts in review and weekly report summaries.
- Make weekly report show cross-week feedback and explain why today's task order and targets changed.

Next P1 should focus on differentiation:

- Expand TOPIK writing into a fuller coach: deeper error taxonomy, richer improvement plan, and cross-week retry scheduling.
- Expand content import from the new lightweight tagged/foldered library, 7-day plan, and 30-day snapshot into deeper cross-week comparison.
- Add generated-card edit history and deeper FSRS detail after saving.
- Extend human review workflow with deeper review workload reporting over time and reviewer-specific throughput.

## Acceptance Criteria for Next Pass

- A new user can complete onboarding and see a daily task plan generated from their goal and diagnosis.
- A user can paste Korean text, open a sentence, generate an explanation, save assets, continue to the next sentence, and see those assets in review.
- A TOPIK learner can enter the writing coach from both TOPIK and dashboard surfaces.
- A TOPIK learner can see score trend, same-prompt rewrite progress, multi-day retry history, before/after answer text, explicit revision goals, and next retry focus after repeated attempts.
- Weekly report and dashboard both explain what the user should do next, not only what happened before.
