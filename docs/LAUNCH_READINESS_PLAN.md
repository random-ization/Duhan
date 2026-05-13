# Web 移动端 × 桌面端上线前联调 & 优化计划

Last updated: 2026-05-12  
Status: **Phase A 进行中** - Convex 后端 typecheck 全绿，前端还有 90 个预先存在的 TS 错误

Scope: Web 端（`src/`，同时服务桌面与移动视口）+ Convex 后端（`convex/`）。Android 原生端（`apps/mobile/android`）仅在「后端契约变更」时做被动校验，不纳入本轮代码修改范围。

---

## 0. 背景与前置事实

- 架构：React + Vite + Convex。桌面 / 移动共用同一套路由 `/:lang/*`，通过 `useIsMobile()`（`max-width: 767px` 的 `matchMedia`）在少数页面里切换 `MobileXxxPage` / `DesktopXxxPage`（例如 `CommunityPageRoute`）。绝大多数页面是自适应布局，而**非**物理分支。
- 数据一致性：所有业务数据走 Convex `query / mutation / action`，前端统一从 `src/utils/convexRefs.ts` 取引用；Convex Auth 作为单一身份源（web）、移动原生通过 `/api/mobile/auth/*` HTTP wrapper 走同一套账户体系。
- 已经覆盖的联调链路：FSRS 做题、视频进度、podcast 进度、阅读进度、TOPIK 答题、账户恢复、支付状态，都在 web 两端对齐，也在 Android 对齐。
- 已知的「体验差异源」：
  1. 桌面 sidebar / 学习 rail / 大屏布局组件只出现在 `src/components/desktop/*` 与 `src/components/layout/*`；
  2. 移动端专属 header / sheet / bottom nav 在 `src/components/mobile/*`；
  3. **本地偏好**：部分 UI 偏好只写 `localStorage / sessionStorage`，没同步到 `userSettings:updateSettings`，换设备丢状态。
  4. 登录态持久化：web 依赖 Convex Auth 的 session，没有客户端人为落盘 token 的残留。

---

## 1. 风险清单（按影响面排序）

### 1.1 一定要修（阻塞上线）

1. **TypeScript 编译报错**（`tsc_output.txt`）：
   - `convex/typing.ts` 有 12 条 `implicitly has an 'any' type`，来自 `.withIndex` 回调、`reduce` 的 `acc/r`。
   - `convex/userStats.ts` 有 13 条，因为一个 `word` / `institute` 联合类型被错误地复用到 institute 分支，属于**真实逻辑混淆**，不是纯类型噪声。
   - 影响：`npm run typecheck` 挂，`check:release` 无法过，同时 `userStats.getStats` 线上有可能返回错误数据（它同时出现在 web desktop、mobile、Android 三端）。

2. **React hooks 红线**（`lint_output.txt`）：
   - `src/components/reading/EpubReader.tsx:51` 在 render 过程中读写 `initializedChapterRef.current`。
   - React 19 下这是会触发 `react-hooks/refs` error，行为上会在 concurrent rendering 下拿到错误初始章节。

3. **ESLint `no-explicit-any` 批量 error**（`convex/readingLibrary*.ts`、`convex/vocab/vocabQueries.ts`、`convex/readingLibraryAdmin.ts`）：
   - `lint-staged` 配的是 `--max-warnings 0`，提交 / CI 已经卡。

4. **`react-hooks/refs` 以外，EpubReader 的进度恢复顺序可能和 `bookDetail.userProgress` 不一致**：
   - 服务端进度 vs 本地章节 state 的竞态需要 `useEffect` 里做一次性 sync 或改用 `useSyncExternalStore`；当前是渲染期赋值。

### 1.2 严重（不阻塞构建但破坏跨端体验）

5. **mobile 字号**：`MobileHeader.tsx` 把 `mobile_font_scale_index` 写到 `localStorage`，没写 `userSettings:updateSettings`。
   - 表现：手机上把字调到 `A+`，切到桌面浏览器（或清缓存后的另一台手机）回到默认。
   - 与此同时 `MobileGrammarDetailSheet` 的 reader `fontScale` 已经正确地 `localStorage + userSettings` 双写。

6. **TOPIK mobile 过滤项** (`mobile_topik_filter_type`)、**mobile Vocab 默认 tab** (`mobile_vocab_active_tab`)、**grammar AI 面板** (`grammar_ai_panel_open`) 都只有 localStorage。
   - 低优，但桌面 / 移动切换时会感知到状态不一致。这些可以统一成 `userSettings.privacy | ui | layoutPrefs` 下的一个 namespace，或者主动接受「localStorage only 是设计意图」并落在文档里。

7. **播客榜单缓存** (`PodcastDashboard.tsx` 里 `CHART_CACHE_KEY`)：桌面浏览器上打完榜的缓存不会迁移到手机端。可以接受，但要确认是「首屏加速」策略而非用户偏好。

8. **`useIsMobile` SSR / 预渲染**：服务端 snapshot 固定返回 `false`。`prerender.mjs` 产出的登录/落地页会是桌面版。移动用户在首次 HTML 可见期会闪桌面，随 hydrate 切换。
   - 需要确认 Landing / AuthPage 有否**视觉闪烁**；如果 prerender 页面在 CSS 层面就能做响应式，则没问题。

### 1.3 重要（性能 / 可观测 / 上线工程）

9. **首屏 JS 体积**：`stats.html` 在根目录，`vite.config.ts` manualChunks 已做了细致切分，但需要**实际复核**当前 `vendor-react / vendor-convex / vendor-vidstack-core` 的 gzip size，以及 mobile 首屏（Landing 或 AuthPage）到底会拖多少。
    - 具体关注：
      - `useDrainMutationQueueOnOnline` 在 `App.tsx` 顶层 mount 时就注册了；看其闭包是否把 Convex 客户端拉进 entry chunk。Convex 已被 `manualChunks` 单独切到 `vendor-convex`，但 lazy path 需要复查。
      - `react-hot-toast` / `@vercel/speed-insights` / `posthog-js` 是否该再 defer。
      - `finalizeStaleChunkRecovery` 在首屏无条件执行，本身很轻，但 `PostHogTracker` 需要确认是 lazy 触发。

10. **Vite PWA 缓存策略**：`navigateFallback: null` 加上 HTML 不进 precache 是对的；但 `globIgnores` 列表需要和实际产物名对齐，建议做一次 `npm run build && ls dist/assets | head -40` 比对。

11. **SEO / prerender 一致性**：已经有 `seo:audit`，但要确认 `robots.txt` / `sitemap.xml` 与 `seoConfig.mjs` 的语言列表一致，并且 `prerender.mjs` 产出的 `index.html` 里没有 Convex `VITE_CONVEX_URL` 之外的运行时 secret。

12. **告警 / 观测**：
    - `VITE_SENTRY_DSN` 前端 Sentry、`SENTRY_DSN` 后端 Sentry、Vercel Analytics / Speed Insights 已接入；但 `LAUNCH_RUNBOOK.md §2 / §6` 的告警阈值和 on-call 联系人还是 TODO。
    - 需要把 rate > 2% / p95 > 2s / webhook 失败 / 登录失败四条规则配成真实告警。

13. **环境变量校验**：已有 `scripts/validate-runtime-env.mjs`；但需要新增 Sentry DSN、Convex URL、Resend、PostHog、Creem/LemonSqueezy webhook 的必填项，并在 CI 里跑 `NODE_ENV=production npm run env:validate`。

### 1.4 后置 / 可以忍到 v1.1

14. 上面 §1.2 里提到的 tab / filter 偏好可以 v1.1 统一；  
15. `convex/notePages_new.ts` / `convex/vocab_new.ts` 这种 `_new` 结尾文件如果只是迁移中间产物，要么合并要么标注；  
16. `AdminPage` / admin 写入类功能需要再走一遍权限边界（`requireAdmin` 是否都挂了），但不影响普通用户上线。

---

## 2. 执行计划（按阶段）

每个阶段有**完成判据**，跑通判据才进下一阶段。

### Phase A — 让 `check:release` 全绿（半天到一天）

1. 修 `convex/userStats.ts`：word / institute 联合类型误用。
   - 把 `getStats` 里拿 institute 的位置改成真实的 `db.get<'institutes'>(id)`，或者在 helper 里加 `kind` 区分。
2. 修 `convex/typing.ts` 参数 any：给 `.withIndex`、`.filter`、`.reduce` 的回调补显式类型（用 `Doc<'typing_records'>` / `number` 这些现成类型）。
3. 修 `convex/readingLibrary*.ts` / `convex/readingLibraryAdmin.ts` / `convex/vocab/vocabQueries.ts` 的 `no-explicit-any`：大多只需要把 `any` 换成 `Doc<'...'>` 或 `GenericQueryCtx<DataModel>`。
4. 修 `convex/readingLibraryActions.ts:123` 的 `no-useless-escape`：单引号不需要转义。
5. 修 `src/components/reading/EpubReader.tsx` 的 `react-hooks/refs`：把章节初始化搬进 `useEffect`，或在 state 初值里用 `() => …` 懒初始化。
6. 清掉 `convex/readingLibrary.ts` 几个 `no-unused-vars`（`requireAdmin`、两个 type 别名），以及 `src/pages/ReadingDiscoveryPage.tsx:361` 的 `CardTone`。

**Done 判据**：`npm run lint` 0 error，`npm run typecheck` 全通过；`check:release` 全绿。

### Phase B — 跨端数据一致性 / 体验一致性（半天）

目标：用户在 A 设备上做的选择，到 B 设备上回来就生效。

B1. **把 mobile 字号 (`mobile_font_scale_index`) 接到 `userSettings.fontScale`**
   - `userSettings` 已有 `fontScale: compact | comfortable | relaxed`，三档正好。
   - `MobileHeader` 改成 `useQuery(qRef(USER_SETTINGS.getSettings))` 驱动，toggle 时 `mutation(userSettings:updateSettings, { fontScale })`，localStorage 仅作离线兜底（和 `MobileGrammarDetailSheet` 对齐）。
   - 桌面端的字号目前没开关；如果要保持「桌面只读 user preference、移动可编辑」这个语义，把桌面 body 也消费 `fontScale` 变量即可（即把 `document.documentElement.style.setProperty('--mobile-font-scale', …)` 改成 `--app-font-scale` 或分别挂，避免桌面被 mobile 选择意外放大）。

B2. **确认 `userSettings` 被所有消费方共用**
   - Audit 全局搜索 `userSettings:getSettings` 使用点，验证：
     - `flashcardAutoTTS` / `flashcardFront` / `flashcardRatingMode` 在桌面 FSRS 和 mobile FSRS 都读取；
     - `audioRepeatCount` / `audioSpeed` 在桌面播放器 / mobile 播放器都读取；
     - `mediaSubtitleMode` / `mediaShowTranslation` 在桌面视频、mobile 视频、Android 都读取；
     - `dailyGoalMinutes` 在桌面 Dashboard、mobile Today 都使用。
   - 任何一端没读，就补上或记录为「端内专属」。

B3. **localStorage 状态分类清单**
   - 输出一张表：`{ key, owner, 是否跨端同步, 理由 }`，作为 `docs/user-state-sync-matrix.md` 落盘。
   - 至少覆盖：`grammar_ai_panel_open`、`mobile_topik_filter_type`、`mobile_vocab_active_tab`、`grammar_mobile_reader_font_scale`、`CHART_CACHE_*`、`grammar_reader_font_scale`、`grammar_reader_red_eye`、`duhan:stale-chunk-recovery-attempts`、`preferredLanguage`（这个桌面 + mobile 共享）、FSRS 队列 session key、reading session key。
   - 有明确理由的（比如「会话内临时 UI 状态」「首屏缓存」）保留 localStorage / sessionStorage；属于「用户真实偏好」的全部挪到 `userSettings`。

B4. **语言偏好跨端确认**
   - `preferredLanguage` / `preferredLanguageSource` 已经桌面 / mobile 共享一套逻辑，但是 Convex 端 `userSettings.displayLanguage` 也存。需要验证：登录后 `userSettings.displayLanguage` > `preferredLanguage` > 浏览器语言 的优先级在 `LanguageRouter`、`globalUserSettingsMigration.ts` 中一致。
   - 端到端：PC 登录切成 `zh` → 手机端同账号登录 → 默认是否 `zh`。

**Done 判据**：两台设备 / 两个浏览器登录同账号，对照 checklist 跑一遍：字号、字幕模式、TTS 自动、音频速率、每日目标、隐私可见性、语言；全部跨端同步。

### Phase C — 性能 & 首屏（半天）

C1. **Bundle 审计**
   - 跑一次 `npm run build`，打开 `stats.html`，记录下面几个指标：
     - entry chunk gzip size
     - Landing 首屏所需 chunk 合计
     - AuthPage 首屏所需 chunk 合计
     - 首个进入 Dashboard 的 chunk 合计
   - 目标：entry < 180 KB gzip，首屏（Landing / Auth）总计 < 350 KB gzip。
   - 超标项目：进一步 lazy / defer。重点看 `@sentry/react` 是否该 dynamic import，`posthog-js` 是否该在 hover / idle 后再初始化。

C2. **关键路径 LCP / INP**
   - 用 Playwright 跑一次 Lighthouse（或复用现有 `scripts/testing/mobile-e2e-report.mjs`）采集 Mobile 项目的 CLS / LCP / INP。
   - 对首屏 hero image / landing 图片做 `preload` + `fetchpriority="high"`；对 `AppLayout` 内首屏 icon 包 (`lucide-react`) 做 tree-shake 验证。

C3. **Convex Query 热点**
   - Dashboard 上同时跑了 `userStats:getStats`, `vocab:getReviewSummary`, `notifications:getUnreadCount`, `podcasts:getHistory`, `weakPoints:getWeakVocabCategories`, `leaderboard:getMyRank`, `partnerships:*`, `recommendations:getNextBestAction`。
   - 合并可选合并项；给慢查询加 `Convex` 索引；在 `queryLimits.ts` 的指引下做一轮 `npm run test:convex:coverage`。

C4. **图片 / 字体**
   - 确认 `public/pwa/*` 图标齐全（manifest 已挂）；
   - 自定义字体（如有）是否有 `font-display: swap`；
   - `html2canvas` / `konva` / `@react-pdf` 都已按需 chunk，复核 admin / export 页面不会从普通用户路径载入。

**Done 判据**：build 产物贴近目标；`npm run ui:parity:ci` 通过；Mobile Chrome Lighthouse Performance ≥ 85。

### Phase D — 上线工程与护栏（半天）

D1. **补齐 `LAUNCH_RUNBOOK.md §2 / §6`**
   - 填 Sentry 告警规则（frontend error rate、API p95、webhook 失败、login 失败）并贴链接；
   - 填 on-call engineer / payment owner / support / backup；
   - 约定 rollback 触发条件。

D2. **`scripts/validate-runtime-env.mjs`**
   - 新增必填：`VITE_CONVEX_URL`、`CONVEX_DEPLOY_KEY`、`VITE_SENTRY_DSN`、`SENTRY_DSN`、`RESEND_API_KEY`、`POSTHOG_KEY`、LemonSqueezy / Creem webhook secret、S3 spaces（如使用）。
   - 在 `.github/workflows/ci.yml` 最末补一步 `NODE_ENV=production npm run env:validate`。

D3. **CI 护栏**
   - 在 `check:release` 之外加 `npm run test:mobile:e2e:report -- --require-min=80`（已有脚本），保证 mobile e2e 通过率基线。
   - Convex 产线 deploy 前跑一次 `npm run test:convex`。

D4. **冒烟脚本**
   - 现有 `tests/e2e/smoke.spec.ts` 基础上补：
     - 两个 viewport（桌面 1440、mobile 390）走同一路径 `Landing → Login → Dashboard → Vocab Book → Reading`，断言无控制台 error、无 Sentry event 漏报。
   - 补一条「跨设备数据一致性」自动化：用同一 Convex 账号 signin，用 API 写 `userSettings.fontScale = 'relaxed'`，再用 UI 验证两个 viewport 的字号都生效。

D5. **法律 / 退款 / 定价**
   - 对照 runbook，verify `/terms`, `/privacy`, `/refund`, `/pricing`, `/pricing/details` 在 `en / zh / vi / mn` 全跑通；试用期统一 7 天，退款政策与实际发布版本一致。
   - 支付 provider（Creem / LemonSqueezy）沙盒 → 成功 / 失败 / refund / chargeback 四条路径走一遍。

**Done 判据**：CI 绿、runbook 填满、env 校验 gate 生效、冒烟跨端跑过。

---

## 3. 桌面 × 移动 体验一致性核查矩阵

下面是上线前要人工跑一遍的 checklist（每行 = 一个场景）。每个场景在**同一账号**下，桌面 Chrome + Mobile Chrome（或真机）各一次，比对结果。

| 模块 | 场景 | 一致性点 |
| --- | --- | --- |
| 身份 | 登录 / 登出 / refresh | token 不串、session 不丢 |
| 偏好 | 语言切换 | `displayLanguage` 同步 |
| 偏好 | 字号 | `fontScale` 同步（Phase B1 修完后） |
| 偏好 | 字幕 / TTS / 音频速率 / 每日目标 / 隐私 | `userSettings:*` 字段同步 |
| 词汇 | FSRS 做 10 张卡 | 进度条、到期卡片数、streak、XP 全部同步 |
| 词汇 | 词书收藏 / 解除 | `vocab:saveSavedWord` → 两端列表同步 |
| 语法 | 完成一个模块 | `grammars:updateStatus` 同步 |
| TOPIK | 开启一次 exam，中途退出 | 再次进入草稿 resume 一致 |
| TOPIK 写作 | 提交一次 | 历史 / AI 评估 cross-device 可见 |
| 阅读 | EPUB 阅读进度 | `reading:saveProgress` 同步 + Phase A5 修完后不会跳章 |
| 视频 | 播放 1 分钟 | `videos:saveProgress` 每 10s 节流保存；两端恢复一致 |
| 播客 | 播放 + 收藏 | `podcasts:saveProgress` / 订阅同步 |
| 词典 | 收藏词条 | 保存的词、复习队列一致 |
| 笔记 | 新建页、标注词条 | `notePages` / `annotations` 一致 |
| 社区 | 发帖 / 点赞 / 好友请求 | mutation 同步 |
| 成就 | 触发一个新的成就 | `achievements:syncMyAchievements` 在另一端出现 |
| 通知 | 已读 | `notifications:markAllRead` 在另一端清零 |
| 订阅 | 升级、取消 | entitlement 在两端生效 |
| 错误 | 任何报错 | Sentry 有事件、带 user scope |

---

## 4. 交付物

1. `docs/LAUNCH_READINESS_PLAN.md`（本文）。
2. `docs/user-state-sync-matrix.md`（Phase B3 产出）。
3. 一条 PR：修 TS / lint / React refs 红线。
4. 一条 PR：mobile 字号等偏好迁移到 `userSettings`。
5. 一条 PR：bundle / perf 调整。
6. CI workflow 补丁 + runbook 填写完毕。

## 5. 不做什么

- 不做 Android / iOS 改动；只在后端契约变更时通知 Android 团队同步。
- 不引入新 UI 框架 / 新状态库。
- 不改 Convex schema 结构（除非 Phase A 修 `userStats` 需要，届时单独评估并出 migration）。
- v1.0 不做离线 / 协同编辑能力升级。
