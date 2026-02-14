# 韩语新闻阅读数据源技术草案（MVP）

## 1. 目标与边界

- 目标：为“文章阅读”功能提供稳定的韩语新闻数据输入，支持按难度分层投放。
- 本文范围：数据源选择、统一字段、抓取频率、去重策略、入库流程。
- 不在本文范围：阅读页 UI、推荐算法、完整版权法务文本。

## 2. 首批 6 个主源 + 1 个补源

## 2.1 主源（直接采集）

- `khan`：경향신문（RSS）
- `donga`：동아일보（RSS）
- `hankyung`：한국경제（RSS）
- `mk`：매일경제（RSS）
- `itdonga`：IT동아（RSS）
- `voa_ko`：VOA 한국어（RSS）

说明：主源用于稳定供给，不依赖第三方聚合可用性。

## 2.2 补源（发现入口）

- `naver_news_search`：NAVER News Search API

说明：只用于发现候选链接，不作为正文真源；正文仍回源到原媒体页面抽取。

## 3. 数据模型（建议）

当前项目 `textbook_units` 结构是教材导向（`courseId/unitIndex/articleIndex`）。
为避免污染教材语义，建议新增新闻专用表，再按需要投影到教材表。

## 3.1 新增表：`news_articles`

字段建议：

- `sourceKey: string` 数据源标识（如 `khan`）
- `sourceType: string` `rss | api`
- `sourceGuid: string?` RSS `guid` 或 API 唯一 ID
- `sourceUrl: string` 原始文章 URL
- `canonicalUrl: string` 规范化 URL（去追踪参数）
- `urlHash: string` `sha256(canonicalUrl)`
- `title: string` 标题
- `summary: string?` 摘要（RSS description 或抽取结果）
- `bodyText: string` 纯文本正文
- `bodyHtml: string?` 清洗后 HTML（可选）
- `language: string` 固定 `ko`
- `section: string?` 频道（정치/경제/사회/국제/문화 等）
- `tags: string[]?`
- `author: string?`
- `publishedAt: number` 文章发布时间（ms）
- `fetchedAt: number` 抓取时间（ms）
- `difficultyLevel: string` `L1 | L2 | L3`
- `difficultyScore: number` 0-100
- `difficultyReason: string[]` 命中的规则标签
- `dedupeClusterId: string` 去重簇 ID
- `status: string` `active | filtered | archived`
- `licenseTier: string` `unknown | internal_ok | restricted`

索引建议：

- `by_url_hash(urlHash)`
- `by_source_published(sourceKey, publishedAt)`
- `by_difficulty_published(difficultyLevel, publishedAt)`
- `by_status_published(status, publishedAt)`

## 3.2 可选表：`news_fetch_logs`

用于可观测性和告警。

- `sourceKey`
- `runAt`
- `fetched`
- `inserted`
- `updated`
- `deduped`
- `failed`
- `errorSample`

## 4. 统一字段映射（首批 6+1）

统一入库对象 `NormalizedArticle`：

- `sourceKey`
- `sourceGuid`
- `sourceUrl`
- `canonicalUrl`
- `title`
- `summary`
- `bodyText`
- `section`
- `author`
- `publishedAt`
- `language=ko`

各源映射规则：

1. `khan/donga/hankyung/mk/itdonga/voa_ko`（RSS）

- `sourceGuid <- item.guid || hash(item.link + item.pubDate)`
- `sourceUrl <- item.link`
- `title <- item.title`
- `summary <- item.description`（先 strip HTML）
- `publishedAt <- Date.parse(item.pubDate)`
- `section <- feed category 或 URL path 推断`
- `bodyText <- 打开 sourceUrl 后正文抽取`

2. `naver_news_search`（API）

- `sourceGuid <- item.originallink || item.link`
- `sourceUrl <- item.originallink`（优先）
- `title <- item.title`（先 HTML entity decode）
- `summary <- item.description`
- `publishedAt <- Date.parse(item.pubDate)`
- `section <- 无稳定字段，先置空`
- `bodyText <- 回源 sourceUrl 抽取`

注意：NAVER 返回的 `link` 可能是中转链接；优先使用 `originallink`。

## 5. 抓取频率与调度

调度建议（MVP）：

- `khan/donga/hankyung/mk`：每 `10` 分钟
- `itdonga/voa_ko`：每 `20` 分钟
- `naver_news_search`：每 `30` 分钟（只做发现）
- 回补任务：每天 `03:30` 扫描过去 `48` 小时漏抓

失败重试：

- 首次失败后：`5` 分钟
- 二次失败后：`15` 分钟
- 三次失败后：`60` 分钟
- 连续失败 `> 12` 次：标记为 `degraded` 并告警

并发与限流：

- 单源并发抓取：`3`
- 单域名 QPS：`<= 1`
- 抽取超时：`8s`

## 6. 去重策略（必须）

按三层去重，避免重复文章灌入阅读池。

1. URL 去重（硬去重）

- 规范化 URL：去掉 `utm_*`, `fbclid`, `gclid` 等追踪参数
- `urlHash` 唯一；命中则更新 `fetchedAt` 和可变字段

2. 标题+时间去重（软去重）

- 标题归一化：去括号后缀、空白标准化、全半角归一
- 条件：`normalizedTitle` 相同且 `publishedAt` 差值 `< 48h`
- 命中则进入正文相似度检查

3. 正文相似度去重（语义近重复）

- `bodyText` 预处理后计算 `simhash`
- 阈值建议：汉明距离 `<= 3` 视为重复
- 重复保留策略：
  - 优先保留首发源（源优先级：`khan > donga > hankyung > mk > itdonga > voa_ko > naver`）
  - 其余记录保留为 `dedupeClusterId` 成员，`status=filtered`

## 7. 难度分级规则（先规则，后模型）

MVP 三档：

- `L1`：入门
- `L2`：中级
- `L3`：高阶

## 7.1 频道先验规则

- `L1`：생활/문화/연예/스포츠、VOA 简明栏目
- `L2`：사회/국제/IT 일반
- `L3`：정치/경제/사설/오피니언

## 7.2 文本特征打分（0-100）

- 平均句长（字符）
- 长句占比（> 70 字）
- 书面连接词密度（예: 그러나, 또한, 반면에）
- 专有名词与数字密度（经济/政策文常见）
- 低频词占比（基于内部词频表）

映射规则：

- `0-33 -> L1`
- `34-66 -> L2`
- `67-100 -> L3`

最终等级：`max(频道先验等级, 分数等级)`，避免把高难频道误分为低难。

## 8. 与现有 `textbook_units` 的对接策略

为最小改动上线，可先做“投影写入”：

- 新文章入 `news_articles`
- 每天/每小时将精选文章投影到 `textbook_units` 的虚拟课程 `courseId="news_ko_mvp"`

映射：

- `unitIndex <- YYYYMMDD`（例：20260214）
- `articleIndex <- 当日序号`
- `title <- news_articles.title`
- `readingText <- news_articles.bodyText`
- `translation* <- 为空（后续 AI 补全）`
- `audioUrl <- 为空（后续 TTS）`
- `analysisData <- 复用现有 analyzeText 流程`

这样前端阅读页可先复用现有读取链路，不阻塞数据源建设。

## 9. 4 周执行计划（可直接拆任务）

第 1 周：数据源接入

- 建 `source registry`（源配置、优先级、抓取频率）
- 实现 RSS 拉取与解析
- 实现 NAVER 候选拉取（仅发现）

第 2 周：抽取与标准化

- URL 规范化
- 正文抽取器（按站点 selector + 通用回退）
- `NormalizedArticle` 入库

第 3 周：去重与难度

- 三层去重（URL/标题时间/simhash）
- 频道先验 + 文本特征打分
- 产出 `difficultyLevel` 与 `difficultyReason`

第 4 周：对接与稳定性

- `news_articles -> textbook_units` 投影任务
- 失败重试、回补、抓取日志与告警
- 人工抽检 200 篇，校准阈值

## 10. 验收标准（MVP）

- 每日新增有效韩语文章 `>= 120`
- 去重后重复率 `< 8%`
- 正文抽取成功率 `>= 92%`
- 难度分层分布合理（L1/L2/L3 不低于 `15%/35%/15%`）
- 连续 7 天抓取成功率 `>= 98%`

## 11. 下一步实现建议

按你的当前代码结构，优先顺序建议：

1. 在 `convex/schema.ts` 新增 `news_articles` 与 `news_fetch_logs`
2. 新建 `convex/newsSources.ts`（源配置、抓取调度入口）
3. 新建 `convex/newsIngestion.ts`（标准化、去重、入库）
4. 新建 `scripts/news-backfill.mjs`（历史回补）
5. 增加一个管理端页签查看抓取状态与失败样本
