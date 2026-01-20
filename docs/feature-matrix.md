# 功能矩阵与真数据验收清单

## 真数据验收（全局）

- UI 不应在生产路径展示 demo/mock/固定示例值（例如固定准考证号、固定姓名、Demo Episode、Mock Transcript）。
- 关键写操作必须落库且可回读验证（同一账号刷新页面后状态保持一致）。
- 失败要可感知：后端能力缺失/配置缺失（例如未配置转写能力）应返回明确错误，前端展示明确提示，不得用“看似成功”的假数据掩盖。

## 路由 → 页面 → 数据依赖（按模块）

| 模块             | 入口路由                                       | 页面组件                             | 主要读（Query）                               | 主要写（Mutation/Action）                                                                  | 主要表/资源                                            |
| ---------------- | ---------------------------------------------- | ------------------------------------ | --------------------------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------ |
| Auth             | `/:lang/login` `/:lang/register` `/:lang/auth` | `AuthPage`                           | `users:viewer`（在 AuthContext）              | `@convex-dev/auth` 注入                                                                    | `users`                                                |
| Courses          | `/:lang/courses` `/:lang/course/:instituteId`  | `CoursesOverview` `CourseDashboard`  | `institutes:getAll`（DataContext）            | 管理端写入由 Admin 模块承担                                                                | `institutes` `textbook_units`                          |
| Vocab（学习）    | `/:lang/course/:instituteId/vocab`             | `VocabModulePage`                    | `vocab:getOfCourse`                           | `vocab:updateProgress`                                                                     | `words` `vocabulary_appearances` `user_vocab_progress` |
| Grammar（学习）  | `/:lang/course/:instituteId/grammar`           | `GrammarModulePage`                  | `grammarPoints:*`（取决于页面实现）           | 用户笔记/收藏（取决于实现）                                                                | `grammar_points` 等                                    |
| TOPIK（学习）    | `/:lang/topik` `/:lang/topik/:examId/...`      | `TopikPage`                          | `topik:getExams`（DataContext）+ 详情类 query | 做题记录/错题（取决于实现）                                                                | `topik_*` 相关表                                       |
| Notebook         | `/:lang/notebook`                              | `NotebookPage`                       | 用户笔记相关 query                            | 用户笔记相关 mutation                                                                      | `notes`/`annotations`（取决于 schema）                 |
| VocabBook        | `/:lang/vocab-book`                            | `VocabBookPage`                      | 用户收藏/生词相关 query                       | 收藏/移除相关 mutation                                                                     | `user_saved_words`（取决于 schema）                    |
| Podcasts（列表） | `/:lang/podcasts`                              | `PodcastDashboard`                   | `podcasts:*` query                            | `podcasts:*` mutation                                                                      | `podcast_channels` `podcast_episodes`                  |
| Podcasts（搜索） | `/:lang/podcasts/search`                       | `PodcastSearchPage`                  | `podcastActions:*` action                     | 订阅/收藏（如有）                                                                          | 外部 RSS + Convex 表                                   |
| Podcasts（频道） | `/:lang/podcasts/channel`                      | `PodcastChannelPage`                 | `podcastActions:getEpisodes`                  | 订阅/收藏（如有）                                                                          | 外部 RSS + Convex 表                                   |
| Podcasts（播放） | `/:lang/podcasts/player`                       | `PodcastPlayerPage`                  | `podcasts:getHistory`                         | `podcasts:trackView` `podcasts:saveProgress` `ai:generateTranscript` `ai:deleteTranscript` | 历史/进度表 + 转写缓存（本地/CDN/后端）                |
| Videos           | `/:lang/videos` `/:lang/video/:id`             | `VideoLibraryPage` `VideoPlayerPage` | `videos:*` query                              | 观看历史/收藏（如有）                                                                      | `videos` 等                                            |
| Admin（总览）    | `/:lang/admin`                                 | `AdminPage`                          | 多个 admin query                              | 多个 admin mutation/action                                                                 | 内容生产与管理相关表                                   |

## 补充说明

- 语言路由以 URL 为真源（`/:lang/*`），无合法 `lang` 时会重定向到默认语言。
- 该矩阵用于验收与回归：每次新增模块/路由时，应补齐对应的“读/写/表”映射与真数据断言。
