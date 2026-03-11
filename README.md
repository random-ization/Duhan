# DuHan Korean Learning Platform

一个基于 React + Convex 的多语言韩语学习平台，覆盖课程学习、词汇/语法训练、TOPIK 备考、播客/视频学习、阅读理解与学习数据追踪。

## 目录

- [项目概览](#项目概览)
- [核心功能](#核心功能)
- [技术栈](#技术栈)
- [项目结构](#项目结构)
- [快速开始](#快速开始)
- [环境变量说明](#环境变量说明)
- [开发脚本](#开发脚本)
- [测试与质量门禁](#测试与质量门禁)
- [多语言路由与 i18n](#多语言路由与-i18n)
- [SEO/SSG 构建流程](#seossg-构建流程)
- [部署说明](#部署说明)
- [常见问题](#常见问题)

## 项目概览

- 前端：`React 19 + TypeScript + Vite + Tailwind CSS`
- 后端：`Convex (query/mutation/action/http)`
- 鉴权：`@convex-dev/auth`（Google / Kakao / Password）
- 数据范围：课程、词汇、语法、TOPIK、播客、视频、笔记、新闻阅读、成长体系
- 多语言：`en / zh / vi / mn`
- 主要目标：在单一产品内打通「输入（读/听）- 练习（词汇/语法/打字）- 评估（TOPIK）- 复盘（错题/笔记/进度）」

## 核心功能

- 课程学习：按教材/机构/级别组织课程与单元。
- 词汇体系：词书、沉浸模式、听写、拼写、PDF 导出、SRS 复习。
- 语法体系：课程语法点、详情讲解、例句与练习。
- TOPIK 模块：考试列表、考试会话、作文模块与评估。
- 媒体学习：播客检索/频道/播放器/历史，视频库与视频播放。
- 阅读模块：文章发现、阅读详情、翻译与内容分析。
- 用户成长：学习进度、活动日志、成就/徽章、XP 记录。
- 管理后台：内容管理、导入工具、专项运营能力（admin 路由）。

## 技术栈

### 前端

- `React 19`、`React Router 7`
- `TypeScript`
- `Vite 6`
- `Tailwind CSS 4`
- `TanStack Query`
- `i18next` + `i18next-http-backend`
- `vite-plugin-pwa`

### 后端与基础设施

- `Convex`
- `@convex-dev/auth`
- `AWS S3 / Spaces`（对象存储）
- `OpenAI`、`Deepgram`、`Azure Speech`（AI/TTS）
- `Resend`（邮件）
- `Creem / LemonSqueezy`（支付）

## 项目结构

```text
.
├── src/
│   ├── components/        # 通用组件、移动端组件、模块组件
│   ├── contexts/          # Auth/Learning/Data/Layout 等上下文
│   ├── features/          # 领域模块（typing/vocab/textbook/admin）
│   ├── hooks/             # 复用 hooks
│   ├── pages/             # 路由页面
│   ├── seo/               # SEO 配置与路由元信息
│   ├── utils/             # 工具函数（i18n、logger、storage 等）
│   ├── routes.tsx         # 全量路由（/:lang/*）
│   └── index.tsx          # 应用入口
├── convex/                # Convex 后端函数与 schema
│   ├── schema.ts          # 数据模型
│   ├── auth.ts            # 鉴权逻辑
│   ├── http.ts            # webhook/health HTTP 路由
│   ├── seed*.ts           # 导入与数据修复任务
│   └── _generated/        # Convex 生成代码
├── scripts/               # SEO/i18n/色彩守卫/迁移等脚本
├── public/
│   ├── locales/           # i18n 文案资源
│   └── pwa/               # PWA 资源
├── tests/
│   ├── unit/              # Vitest 单元测试
│   └── e2e/               # Playwright E2E
└── docs/                  # 架构与专项方案文档
```

## 快速开始

### 1) 环境要求

- `Node.js >= 20`
- `npm >= 9`
- `Python 3`（用于兼容脚本 `compare_i18n.py`）

### 2) 安装依赖

```bash
npm install
```

### 3) 配置环境变量

```bash
cp .env.example .env.local
```

至少先配置：

- `VITE_CONVEX_URL`（推荐本地开发时显式填写）
- `CONVEX_DEPLOYMENT`
- `CONVEX_SITE_URL`
- `CONVEX_URL`
- `SITE_URL`

### 4) 启动开发环境

```bash
# 终端 1：运行 Convex（同步函数、生成类型、提供后端）
npx convex dev

# 终端 2：启动前端
npm run dev
```

默认前端地址：`http://localhost:3000`

说明：

- 当前项目路由是 `/:lang/*`，访问根路径会自动跳转到检测语言前缀（如 `/en`）。
- `vite.config.ts` 中已将 `/api` 代理到 `http://localhost:3001`，用于同域 API 开发模式。
- 如果你使用云端 Convex URL 直连，请设置 `VITE_CONVEX_URL`，前端会优先使用它。

### 5) 生产构建与预览

```bash
npm run build
npm run start
```

## 环境变量说明

完整变量见 `.env.example`。下面按模块说明。

### 前端/运行时

- `VITE_API_URL`：前端 API 基路径（当前代码默认同域 `/api` 思路）。
- `VITE_CONVEX_URL`：前端直连 Convex 基地址（建议本地显式设置）。
- `VITE_APP_URL`：用于支付回跳、重置密码等前端绝对链接。

### Convex 核心

- `CONVEX_DEPLOYMENT`：Convex 部署标识。
- `CONVEX_SITE_URL`：Convex 站点 URL（鉴权与回调依赖）。
- `CONVEX_URL`：Convex URL。
- `SITE_URL`：站点主域名。
- `NODE_ENV`：环境标识。

### AI / 转写

- `OPENAI_API_KEY`
- `DEEPGRAM_API_KEY`
- `DEEPGRAM_API_KEY_ID`
- `DEEPGRAM_CALLBACK_TOKEN`
- `DEEPGRAM_CALLBACK_URL`
- `AI_RATE_LIMIT_WINDOW_MS`
- `AI_RATE_LIMIT_MAX_CALLS`

### 字典 / 邮件 / 存储 / TTS

- `KRDICT_API_KEY`
- `RESEND_API_KEY`
- `EMAIL_FROM`
- `SPACES_ENDPOINT`
- `SPACES_REGION`
- `SPACES_BUCKET`
- `SPACES_KEY`
- `SPACES_SECRET`
- `SPACES_CDN_URL`
- `AZURE_SPEECH_KEY`
- `AZURE_SPEECH_REGION`

### PDF 导出资源

- `PDF_FONT_LATIN_URL`
- `PDF_FONT_SC_URL`
- `PDF_FONT_KR_URL`
- `PDF_LOGO_URL`

### 支付（Creem）

- `CREEM_API_KEY`
- `CREEM_WEBHOOK_SECRET`
- `CREEM_TEST_MODE`
- `CREEM_PRODUCT_*`（按周期配置）

### 支付（LemonSqueezy）

- `LEMONSQUEEZY_API_KEY`
- `LEMONSQUEEZY_WEBHOOK_SECRET`
- `LEMONSQUEEZY_STORE_ID`
- `LEMONSQUEEZY_VARIANT_*`

## 开发脚本

### 常用命令

- `npm run dev`：启动 Vite 开发服务器。
- `npm run build`：构建生产包（包含 SEO 生成 + 预渲染）。
- `npm run start`：以预览模式启动产物。
- `npm run preview`：Vite preview。

### 代码质量

- `npm run lint` / `npm run lint:fix`
- `npm run format`
- `npm run typecheck`
- `npm run typecheck:src`
- `npm run typecheck:convex`

### i18n / 设计守卫

- `npm run i18n:scan`
- `npm run i18n:guard`（对比 baseline，阻止新增硬编码 CJK）
- `npm run i18n:compare`（兼容命令，转发到 i18n-scan）
- `npm run color:guard`（阻止新增硬编码中性色 Tailwind 类）
- `npm run color:guard:update`（更新色彩基线）

### 测试

- `npm test`
- `npm run test:run`
- `npm run test:coverage`

### 发布前总检查

- `npm run check:release`
  - 依次执行：`lint` + `typecheck` + `i18n:guard` + `color:guard` + `test:run` + `build`

## 测试与质量门禁

### 单元测试（Vitest）

- 配置文件：`vitest.config.ts`
- 运行环境：`jsdom`
- 覆盖率：`v8`（默认关注 `utils/**`、`hooks/**`）

### E2E（Playwright）

- 配置文件：`playwright.config.ts`
- 测试目录：`tests/e2e`
- 默认 `baseURL`：`http://localhost:3000`
- 注意：E2E 需先手动启动 `npm run dev`

### Git Hook（Husky）

- `pre-commit`：`lint-staged` + `typecheck:src` + `i18n:guard`
- `pre-push`：`lint` + `typecheck` + `i18n:guard` + `test:run`

## 多语言路由与 i18n

- 路由主形态：`/:lang/*`
- 支持语言：`en / zh / vi / mn`
- 语言检测优先级：
  1. 用户手动选择（localStorage）
  2. 浏览器语言
  3. Geo 回退
  4. 默认 `en`
- i18n 资源位置：`public/locales/<lang>/public.json`
- 页面内跳转建议使用本地化导航工具（如 `useLocalizedNavigate`）保持语言前缀一致。

## SEO/SSG 构建流程

`npm run build` 实际执行链路：

1. `npm run generate:seo`
2. `vite build`
3. `npm run prerender`

### SEO 文件生成

- 脚本：`scripts/generate-seo-files.mjs`
- 产物：`public/sitemap.xml`、`public/robots.txt`
- 路由来源：`src/seo/publicRoutesData.mjs`

### SEO 外链投放资产生成

- 脚本：`scripts/generate-seo-outreach-assets.mjs`
- 命令：`npm run generate:seo:outreach`
- 产物：`docs/SEO_OUTREACH_PLAYBOOK.md`
- 用途：自动生成多语言投放文案模板（X/Reddit/社区）与锚文本矩阵，便于持续分发。

### SEO 自动审计

- 脚本：`scripts/seo-audit.mjs`
- 命令：`npm run seo:audit`
- 严格模式：`npm run seo:audit:strict`（warning 也会使命令失败）
- 可选：`node scripts/seo-audit.mjs --json`（JSON 输出）、`--fail-on-warning`（将警告视为失败）
- 审计项：标题/描述长度、canonical/hreflang 一致性、sitemap 覆盖、学习指南 `ogImage` 配置等。

### 搜索引擎主动推送

- 脚本：`scripts/ping-search-engines.mjs`
- 命令：
  - `npm run seo:ping:dry`（仅预览，不发请求）
  - `npm run seo:ping`（实际推送）
- 默认推送：Google Sitemap Ping、Bing Sitemap Ping
- 可选启用 IndexNow：设置 `INDEXNOW_KEY`（可附加 `INDEXNOW_KEY_LOCATION`、`INDEXNOW_URLS`、`INDEXNOW_ENDPOINT`）

### 公开页预渲染（SSG）

- 脚本：`scripts/prerender.mjs`
- 行为：按语言为公开页面生成静态 HTML，并注入路由级 meta/canonical/hreflang。
- 输出：`dist/<lang>/<route>/index.html`

## 部署说明

### 前端

- 已包含 `vercel.json`：
  - 多语言重定向规则
  - 安全响应头（CSP、X-Frame-Options 等）

### Convex HTTP 端点

`convex/http.ts` 暴露：

- `GET /health`
- `POST /webhook/creem`
- `POST /webhook/lemonsqueezy`
- `POST /webhook/deepgram`

在同域 `/api` 代理模式下，上述路径通常表现为 `/api/*`。

### 鉴权回调白名单

`convex/auth.ts` 中已限制 redirect origin（例如 `koreanstudy.me`、`localhost`），部署新域名前需同步更新白名单。

## 常见问题

### 1) 页面报错或请求 404（`/api`）

- 确认后端可用：`npx convex dev` 是否运行。
- 确认前端连接地址：优先设置 `VITE_CONVEX_URL`，避免环境推断错误。
- 确认本地代理：Vite 是否在 `3000` 端口启动，且 `/api` 可转发到 `3001`。

### 2) `i18n:guard` 失败

- 你在非 admin 目录新增了 CJK 硬编码文本。
- 改为放入 i18n 资源，或确认为历史存量后更新 baseline。

### 3) `color:guard` 失败

- 你新增了硬编码中性色类（例如 `text-gray-500`）。
- 优先改用设计 token（`foreground`、`muted-foreground`、`border` 等）。

### 4) E2E 失败

- 先启动开发服务器：`npm run dev`
- 检查 `PLAYWRIGHT_BASE_URL` 与本地访问端口是否一致。

---

如需进一步拆分为「开发者 README」和「运维部署 README」，建议在 `docs/` 下新增 `DEVELOPMENT.md` 与 `OPERATIONS.md`，主 README 只保留入口导航。
