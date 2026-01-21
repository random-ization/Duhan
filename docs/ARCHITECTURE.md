# 架构概览

## 技术栈

- React + TypeScript + Vite
- React Router（语言前缀路由）
- Convex（Query/Mutation/Action + Convex Auth）
- Tailwind CSS

## 路由与多语言

- 路由统一为 `/:lang/*`，语言集合以 `scripts/seoConfig.mjs` 与前端语言路由定义保持一致。
- 页面内导航优先使用 [useLocalizedNavigate](file:///Users/ryan/Documents/GitHub/hangyeol/src/hooks/useLocalizedNavigate.ts) 与 `LocalizedLink`，确保自动补齐语言前缀。

## Context 分层

- [AuthContext](file:///Users/ryan/Documents/GitHub/hangyeol/src/contexts/AuthContext.tsx)：Convex Auth 会话状态、`viewer`、语言选择、内容访问权限判断。
- [LearningContext](file:///Users/ryan/Documents/GitHub/hangyeol/src/contexts/LearningContext.tsx)：学习态（选中教材、级别、模块、列表视图等）。
- [DataContext](file:///Users/ryan/Documents/GitHub/hangyeol/src/contexts/DataContext.tsx)：只提供跨页面共享的只读数据（目前为 `institutes` 与 `topikExams`），避免混入管理端的写入 stub。
- [LayoutContext](file:///Users/ryan/Documents/GitHub/hangyeol/src/contexts/LayoutContext.tsx)：布局编辑态与卡片排序等 UI 状态。
- [AppContext](file:///Users/ryan/Documents/GitHub/hangyeol/src/contexts/AppContext.tsx)：兼容层，把多个 context 与常用 actions 聚合为 `useApp()`，便于逐步迁移旧代码。

## Convex 引用策略

- 统一从 [convexRefs](file:///Users/ryan/Documents/GitHub/hangyeol/src/utils/convexRefs.ts) 访问 Query/Mutation/Action 引用，避免散落的字符串路径与 `as any`。
- 约定：前端只引用 `qRef/mRef/aRef` 或 `INSTITUTES/TOPIK/...` 这类集中导出的句柄；不要在业务组件里拼字符串。

## 用户提示与日志

- 用户可见提示统一使用 [notify](file:///Users/ryan/Documents/GitHub/hangyeol/src/utils/notify.ts)（基于 `react-hot-toast`）。
- 调试/告警日志统一使用 [logger](file:///Users/ryan/Documents/GitHub/hangyeol/src/utils/logger.ts)，线上默认不输出（预留对接 Sentry/LogRocket 的入口）。

## SEO 与预渲染

- `npm run build` 会依次执行 `generate:seo` 与 `prerender`：
  - [generate-seo-files.mjs](file:///Users/ryan/Documents/GitHub/hangyeol/scripts/generate-seo-files.mjs)：生成 sitemap/robots 等静态 SEO 文件。
  - [prerender.mjs](file:///Users/ryan/Documents/GitHub/hangyeol/scripts/prerender.mjs)：为公开页面（登录/注册/定价等）按语言生成静态 HTML（注入 meta tags）。
- 语言/公开路由的单一数据源在 [seoConfig.mjs](file:///Users/ryan/Documents/GitHub/hangyeol/scripts/seoConfig.mjs)。

## 页面拆分约定

- 体量较大的页面（例如 Profile）优先按 `pages/<domain>/components` 与 `pages/<domain>/tabs` 拆分。
- 纯计算逻辑优先抽到 `pages/<domain>/hooks` 或 `src/hooks`，减少页面文件的复杂度与回归风险。
