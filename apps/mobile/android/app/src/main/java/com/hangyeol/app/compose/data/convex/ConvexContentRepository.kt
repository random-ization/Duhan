package com.hangyeol.app.compose.data.convex

import android.content.Context
import android.content.SharedPreferences
import com.hangyeol.app.compose.data.CommunityFeedUiModel
import com.hangyeol.app.compose.data.CommunityFriendSummaryUiModel
import com.hangyeol.app.compose.data.CommunityRankUiModel
import com.hangyeol.app.compose.data.CommunityUiState
import com.hangyeol.app.compose.data.ContentRepository
import com.hangyeol.app.compose.data.MutationResult
import com.hangyeol.app.compose.data.DictionaryEntryUiModel
import com.hangyeol.app.compose.data.DictionaryUiState
import com.hangyeol.app.compose.data.HistoryTimelineUiModel
import com.hangyeol.app.compose.data.HistoryUiState
import com.hangyeol.app.compose.data.MediaEpisodeUiModel
import com.hangyeol.app.compose.data.NotebookEntryUiModel
import com.hangyeol.app.compose.data.NotebookUiState
import com.hangyeol.app.compose.data.VocabBookModeUiModel
import com.hangyeol.app.compose.data.VocabBookUiState
import com.hangyeol.app.compose.data.VocabBookCategoryUiModel
import com.hangyeol.app.compose.data.VocabBookEntryUiModel
import com.hangyeol.app.compose.data.VocabBookExportResult
import com.hangyeol.app.compose.data.VocabBookListUiState
import com.hangyeol.app.compose.data.VocabBookModeUiState
import com.hangyeol.app.compose.data.VideoDetailUiState
import com.hangyeol.app.compose.data.AchievementBadgeUiModel
import com.hangyeol.app.compose.data.AchievementSectionUiModel
import com.hangyeol.app.compose.data.AchievementsUiState
import com.hangyeol.app.compose.data.TypingRecordPayload
import com.hangyeol.app.compose.data.TypingStatsUiModel
import com.hangyeol.app.compose.data.TypingSurfaceUiState
import com.hangyeol.app.compose.data.TypingTextUiModel
import com.hangyeol.app.compose.data.PodcastHistoryItemUiModel
import com.hangyeol.app.compose.data.PodcastHistoryUiState
import com.hangyeol.app.compose.data.PodcastLibraryUiState
import com.hangyeol.app.compose.data.PodcastPlayerUiState
import com.hangyeol.app.compose.data.PodcastSearchResultUiModel
import com.hangyeol.app.compose.data.PodcastSearchUiState
import com.hangyeol.app.compose.data.PricingPlanUiModel
import com.hangyeol.app.compose.data.PricingUiState
import com.hangyeol.app.compose.data.ProfileMenuEntryUiModel
import com.hangyeol.app.compose.data.ProfileShortcutUiModel
import com.hangyeol.app.compose.data.ProfileUiState
import com.hangyeol.app.compose.data.ReadingBookUiModel
import com.hangyeol.app.compose.data.ReadingLibraryUiState
import com.hangyeol.app.compose.data.ReadingPageUiModel
import com.hangyeol.app.compose.data.ReadingParagraphUiModel
import com.hangyeol.app.compose.data.SettingToggleUiModel
import com.hangyeol.app.compose.data.SettingsUiState
import com.hangyeol.app.compose.data.TopikHistoryRecordUiModel
import com.hangyeol.app.compose.data.TopikHistoryUiState
import com.hangyeol.app.compose.data.VideoLibraryUiState
import com.hangyeol.app.compose.data.EpubReaderUiState
import com.hangyeol.app.compose.data.PresignedUploadResult
import com.hangyeol.app.compose.data.EpubUploadDraftResult
import com.hangyeol.app.compose.data.WritingDimensionScore
import com.hangyeol.app.compose.data.WritingQuestionEvaluation
import com.hangyeol.app.compose.data.WritingEvaluationUiState
import com.hangyeol.app.compose.data.PodcastSubscriptionUiModel
import com.hangyeol.app.compose.data.PodcastSubscriptionsUiState
import com.hangyeol.app.compose.data.CheckoutResult
import com.hangyeol.app.compose.data.SubscriptionDetailUiState
import com.hangyeol.app.compose.data.ReadingArticleUiState
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.coroutineScope
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.booleanOrNull
import kotlinx.serialization.json.intOrNull
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.longOrNull
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class ConvexContentRepository(
    context: Context,
    private val client: ConvexClient,
) : ContentRepository {
    private val prefs: SharedPreferences =
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    override suspend fun loadDictionary(): DictionaryUiState {
        val recentQueries = loadRecentQueries().ifEmpty { loadDictionarySuggestions() }
        val initialQuery = recentQueries.firstOrNull().orEmpty()
        if (initialQuery.isBlank()) {
            return DictionaryUiState(
                isLoading = false,
                query = "",
                recentQueries = recentQueries,
                entries = emptyList(),
            )
        }
        return searchDictionary(initialQuery)
    }

    override suspend fun searchDictionary(query: String): DictionaryUiState {
        val normalized = query.trim()
        if (normalized.isBlank()) {
            val recentQueries = loadRecentQueries().ifEmpty { loadDictionarySuggestions() }
            return DictionaryUiState(
                isLoading = false,
                query = "",
                recentQueries = recentQueries,
                entries = emptyList(),
            )
        }
        val recentQueries = rememberDictionaryQuery(normalized)

        val result = client.action(
            "dictionary:searchDictionary",
            buildArgs(
                "query" to normalized,
                "num" to 20,
                "translationLang" to "zh",
            ),
        )

        if (result !is ConvexResult.Success) {
            return DictionaryUiState(
                isLoading = false,
                query = normalized,
                recentQueries = recentQueries,
                entries = emptyList(),
                errorMessage = (result as? ConvexResult.Error)?.message ?: "词典查询失败，请稍后重试",
            )
        }

        val payload = result.value as? JsonObject
        val entries = parseDictionaryEntries(payload?.getArray("entries"))
        return DictionaryUiState(
            isLoading = false,
            query = normalized,
            recentQueries = recentQueries,
            entries = entries,
            errorMessage = if (entries.isEmpty()) "未找到匹配词条" else null,
        )
    }

    override suspend fun rememberDictionaryQuery(query: String): List<String> {
        val normalized = query.trim()
        val existing = loadRecentQueries()
        if (normalized.isBlank()) return existing
        val updated = (listOf(normalized) + existing).distinct().take(8)
        prefs.edit().putString(PREF_KEY_DICTIONARY_RECENT, updated.joinToString("\n")).apply()
        return updated
    }

    override suspend fun loadNotebook(): NotebookUiState {
        val result = client.query("notebooks:list")
        val rows = parseArrayResult(result)
        if (rows.isEmpty()) {
            return NotebookUiState(
                isLoading = false,
                entries = emptyList(),
                errorMessage = extractResultError(result),
            )
        }
        return NotebookUiState(
            isLoading = false,
            entries = rows.take(20).map { row ->
                val tags = row.getArray("tags")?.mapNotNull { (it as? JsonPrimitive)?.contentOrNull?.trim() }
                    ?.filter { it.isNotBlank() }
                    ?: emptyList()
                NotebookEntryUiModel(
                    title = row.getString("title") ?: "未命名笔记",
                    excerpt = row.getString("preview") ?: "",
                    tag = tags.firstOrNull() ?: "筆記",
                    updatedAt = formatTime(row.getLong("createdAt")),
                )
            },
        )
    }

    override suspend fun loadReadingLibrary(): ReadingLibraryUiState {
        val result = client.query("readingBooks:listPublishedBooks")
        val rows = parseArrayResult(result)
        if (rows.isEmpty()) {
            return ReadingLibraryUiState(
                isLoading = false,
                featuredTitle = "阅读探索",
                featuredSubtitle = "推荐阅读",
                levelSummary = emptyList(),
                books = emptyList(),
                errorMessage = extractResultError(result),
            )
        }

        val books = rows.mapIndexed { index, row ->
            ReadingBookUiModel(
                id = row.getString("_id") ?: "book-$index",
                slug = row.getString("slug") ?: "book-$index",
                title = row.getString("title") ?: "阅读内容",
                pageTitle = row.getString("pageTitle") ?: row.getString("title") ?: "",
                level = row.getString("levelLabel") ?: "Level 1",
                pages = row.getInt("pageCount") ?: 0,
                minutes = row.getInt("readingMinutes") ?: 0,
                accent = listOf("pink", "butter", "mint", "lilac", "sky")[index % 5],
                coverSeal = (row.getString("title") ?: "冊").take(1),
                summary = "",
            )
        }

        return ReadingLibraryUiState(
            isLoading = false,
            featuredTitle = books.firstOrNull()?.pageTitle ?: "阅读探索",
            featuredSubtitle = "推荐阅读",
            levelSummary = listOf("书籍" to "${books.size}", "总页数" to "${books.sumOf { it.pages }}"),
            books = books,
        )
    }

    override suspend fun loadReadingBookPages(slug: String, pageCountHint: Int): List<ReadingPageUiModel> = coroutineScope {
        val normalizedSlug = slug.trim()
        if (normalizedSlug.isBlank()) return@coroutineScope emptyList()

        val firstPageResult =
            client.query(
                "readingBooks:getBookPageData",
                buildArgs(
                    "slug" to normalizedSlug,
                    "pageIndex" to 0,
                ),
            )
        val firstParsed = parseReadingPageResult(firstPageResult) ?: return@coroutineScope emptyList()
        val maxPageCount = minOf(MAX_READER_PAGES, maxOf(firstParsed.pageCount, pageCountHint.coerceAtLeast(1)))
        val remainingPages =
            (1 until maxPageCount).map { index ->
                async {
                    val result =
                        client.query(
                            "readingBooks:getBookPageData",
                            buildArgs(
                                "slug" to normalizedSlug,
                                "pageIndex" to index,
                            ),
                        )
                    parseReadingPageResult(result)?.page
                }
            }.awaitAll()

        listOf(firstParsed.page) + remainingPages.filterNotNull()
    }

    override suspend fun translateReadingParagraphs(
        title: String,
        paragraphs: List<String>,
        language: String,
    ): Result<List<String>> {
        val normalizedTitle = title.trim().ifBlank { "阅读内容" }
        val cleanedParagraphs = paragraphs.map { it.trim() }
        if (cleanedParagraphs.none { it.isNotBlank() }) {
            return Result.success(List(cleanedParagraphs.size) { "" })
        }

        val paragraphArgs = JsonArray(cleanedParagraphs.map { JsonPrimitive(it) })
        val actionResult =
            client.action(
                "ai:translateReadingParagraphs",
                buildArgs(
                    "title" to normalizedTitle,
                    "paragraphs" to paragraphArgs,
                    "language" to language.trim().ifBlank { "zh" },
                ),
            )

        if (actionResult !is ConvexResult.Success) {
            val fallbackMessage = extractResultError(actionResult) ?: "AI 翻译失败，请稍后重试。"
            return Result.failure(IllegalStateException(fallbackMessage))
        }

        val payload = actionResult.value as? JsonObject
            ?: return Result.failure(IllegalStateException("AI 翻译返回格式异常。"))
        val errorCode = payload.getString("errorCode")
        val translations =
            payload.getArray("translations")
                ?.mapNotNull { item -> (item as? JsonPrimitive)?.content?.trim() }
                .orEmpty()

        if (translations.isEmpty() || translations.none { it.isNotBlank() }) {
            if (!errorCode.isNullOrBlank()) {
                return Result.failure(IllegalStateException(resolveReadingAiError(errorCode)))
            }
            return Result.success(cleanedParagraphs.map { "" })
        }

        val normalizedTranslations =
            List(cleanedParagraphs.size) { index ->
                translations.getOrNull(index).orEmpty()
            }
        return Result.success(normalizedTranslations)
    }

    override suspend fun loadVideoLibrary(): VideoLibraryUiState {
        val result = client.query("videos:list")
        val rows = parseArrayResult(result)
        if (rows.isEmpty()) {
            return VideoLibraryUiState(
                isLoading = false,
                featuredTitle = "视频学习",
                featuredSubtitle = "",
                lessons = emptyList(),
                errorMessage = extractResultError(result),
            )
        }
        val episodes = rows.take(12).mapIndexed { index, row ->
            val videoId =
                row.getString("_id")
                    ?: row.getString("id")
                    ?: row.getString("slug")
                    ?: ""
            val durationSec = row.getInt("durationSec") ?: row.getInt("duration") ?: 0
            MediaEpisodeUiModel(
                title = row.getString("title") ?: "未命名视频",
                subtitle =
                    listOfNotNull(
                        row.getString("description")?.takeIf { it.isNotBlank() },
                        row.getString("level")?.takeIf { it.isNotBlank() },
                    ).joinToString(" · "),
                duration = formatDuration(durationSec),
                accent = listOf("mint", "butter", "pink", "lilac")[index % 4],
                route = if (videoId.isBlank()) "" else "main/video/$videoId",
            )
        }
        return VideoLibraryUiState(
            isLoading = false,
            featuredTitle = episodes.firstOrNull()?.title ?: "视频学习",
            featuredSubtitle = episodes.firstOrNull()?.subtitle ?: "",
            lessons = episodes,
        )
    }

    override suspend fun loadPodcastLibrary(): PodcastLibraryUiState = coroutineScope {
        val trendingDeferred = async { client.query("podcasts:getTrending") }
        val nowPlayingDeferred = async { client.query("android:getLatestPodcastNowPlaying") }

        val result = trendingDeferred.await()
        val nowPlayingResult = nowPlayingDeferred.await()
        val payload = (result as? ConvexResult.Success)?.value as? JsonObject
        val nowPlaying = (nowPlayingResult as? ConvexResult.Success)?.value as? JsonObject
        val transcriptPrimary = nowPlaying?.getString("transcriptText").orEmpty()
        val transcriptSecondary =
            nowPlaying
                ?.getString("translationText")
                ?.trim()
                ?.ifBlank { null }
                ?: translateSingleTranscriptLine(transcriptPrimary)
        if (payload == null) {
            return@coroutineScope PodcastLibraryUiState(
                isLoading = false,
                featuredTitle = "播客学习",
                featuredSubtitle = "",
                transcriptPrimary = transcriptPrimary,
                transcriptSecondary = transcriptSecondary,
                elapsedLabel = formatElapsedLabel(nowPlaying?.getInt("elapsedSec")),
                remainingLabel = formatRemainingLabel(nowPlaying?.getInt("elapsedSec"), nowPlaying?.getInt("durationSec")),
                episodes = emptyList(),
                errorMessage = extractResultError(result) ?: extractResultError(nowPlayingResult),
            )
        }
        val internalArr = (payload["internal"] as? JsonArray)?.mapNotNull { it as? JsonObject } ?: emptyList()
        val externalArr = (payload["external"] as? JsonArray)?.mapNotNull { it as? JsonObject } ?: emptyList()
        val rows = internalArr + externalArr
        if (rows.isEmpty()) {
            return@coroutineScope PodcastLibraryUiState(
                isLoading = false,
                featuredTitle = nowPlaying?.getString("episodeTitle") ?: "播客学习",
                featuredSubtitle = nowPlaying?.getString("channelTitle").orEmpty(),
                transcriptPrimary = transcriptPrimary,
                transcriptSecondary = transcriptSecondary,
                elapsedLabel = formatElapsedLabel(nowPlaying?.getInt("elapsedSec")),
                remainingLabel = formatRemainingLabel(nowPlaying?.getInt("elapsedSec"), nowPlaying?.getInt("durationSec")),
                episodes = emptyList(),
            )
        }
        val episodes = rows.take(12).mapIndexed { index, row ->
            val channelId = row.getString("id").orEmpty()
            MediaEpisodeUiModel(
                title = row.getString("title") ?: "未命名播客",
                subtitle = row.getString("author") ?: row.getString("description").orEmpty(),
                duration = row.getString("durationText") ?: "",
                accent = listOf("lilac", "mint", "butter", "pink")[index % 4],
                channelId = channelId,
                route = if (channelId.isBlank()) "" else "main/podcast-channel?channelId=$channelId",
            )
        }
        val featuredTitle = nowPlaying?.getString("episodeTitle") ?: episodes.firstOrNull()?.title ?: "播客学习"
        val featuredSubtitle = nowPlaying?.getString("channelTitle") ?: episodes.firstOrNull()?.subtitle.orEmpty()
        return@coroutineScope PodcastLibraryUiState(
            isLoading = false,
            featuredTitle = featuredTitle,
            featuredSubtitle = featuredSubtitle,
            transcriptPrimary = transcriptPrimary,
            transcriptSecondary = transcriptSecondary,
            elapsedLabel = formatElapsedLabel(nowPlaying?.getInt("elapsedSec")),
            remainingLabel = formatRemainingLabel(nowPlaying?.getInt("elapsedSec"), nowPlaying?.getInt("durationSec")),
            episodes = episodes,
        )
    }

    override suspend fun loadPodcastChannelEpisodes(channelId: String): PodcastLibraryUiState {
        val normalizedChannelId = channelId.trim()
        if (normalizedChannelId.isBlank()) {
            return PodcastLibraryUiState(
                isLoading = false,
                featuredTitle = "播客频道",
                featuredSubtitle = "",
                episodes = emptyList(),
                errorMessage = "缺少频道标识，无法加载剧集。",
            )
        }

        val result = client.query(
            "android:getPodcastChannelEpisodes",
            buildArgs(
                "channelId" to normalizedChannelId,
                "limit" to 40,
            ),
        )
        val payload = (result as? ConvexResult.Success)?.value as? JsonObject
        if (payload == null) {
            return PodcastLibraryUiState(
                isLoading = false,
                featuredTitle = "播客频道",
                featuredSubtitle = "",
                episodes = emptyList(),
                errorMessage = extractResultError(result) ?: "频道数据暂不可用。",
            )
        }

        val channelTitle = payload.getString("channelTitle") ?: "播客频道"
        val channelAuthor = payload.getString("channelAuthor") ?: "Podcast"
        val episodeRows = payload.getArray("episodes")?.mapNotNull { it as? JsonObject }.orEmpty()
        val episodes =
            episodeRows.mapIndexed { index, row ->
                val durationSec = row.getInt("durationSec") ?: 0
                val episodeId =
                    row.getString("episodeId")
                        ?: row.getString("_id")
                        ?: row.getString("id")
                        ?: ""
                MediaEpisodeUiModel(
                    title = row.getString("title") ?: "未命名剧集",
                    subtitle = row.getString("description").orEmpty().ifBlank { channelAuthor },
                    duration = formatDuration(durationSec),
                    accent = listOf("lilac", "mint", "butter", "pink")[index % 4],
                    channelId = normalizedChannelId,
                    route = if (episodeId.isBlank()) "" else "main/podcasts/player?episodeId=$episodeId",
                )
            }
        return PodcastLibraryUiState(
            isLoading = false,
            featuredTitle = channelTitle,
            featuredSubtitle = channelAuthor,
            transcriptPrimary = "",
            transcriptSecondary = "",
            elapsedLabel = "",
            remainingLabel = "",
            episodes = episodes,
            errorMessage = if (episodes.isEmpty()) "该频道暂时没有可播放的剧集。" else null,
        )
    }

    override suspend fun loadProfile(): ProfileUiState = coroutineScope {
        val userDeferred = async { client.query("users:viewer") }
        val statsDeferred = async { client.query("userStats:getStats") }
        val notesDeferred = async { client.query("notebooks:list") }
        val objectiveHistoryDeferred = async { client.query("topik:getMyHistory") }
        val writingHistoryDeferred = async { client.query("android:getTopikWritingSessions", buildArgs("limit" to 40)) }
        val planDeferred = async { client.query("entitlements:getViewerPlan") }
        val settingsDeferred = async { client.query("userSettings:getSettings") }
        val notificationsDeferred = async { client.query("notifications:getPreferences") }

        val userResult = userDeferred.await()
        val statsResult = statsDeferred.await()
        val notesResult = notesDeferred.await()
        val objectiveHistoryResult = objectiveHistoryDeferred.await()
        val writingHistoryResult = writingHistoryDeferred.await()
        val planResult = planDeferred.await()
        val settingsResult = settingsDeferred.await()
        val notificationsResult = notificationsDeferred.await()

        val user = (userResult as? ConvexResult.Success)?.value as? JsonObject
        val stats = (statsResult as? ConvexResult.Success)?.value as? JsonObject
        if (user == null && stats == null) {
            return@coroutineScope ProfileUiState(
                isLoading = false,
                memberSince = "",
                headline = "",
                planLabel = "",
                streakLabel = "",
                completedLabel = "",
                goalLabel = "",
                shortcuts = listOf(
                    ProfileShortcutUiModel("词典", "main/dictionary", "詞"),
                    ProfileShortcutUiModel("笔记", "main/notebook", "筆"),
                    ProfileShortcutUiModel("订阅", "main/pricing", "星"),
                    ProfileShortcutUiModel("阅读", "main/reading", "冊"),
                ),
                achievements = emptyList(),
                recentActivity = emptyList(),
                quickStats = emptyList(),
                profileMenu = emptyList(),
                settingsMenu = emptyList(),
                errorMessage = firstErrorMessage(
                    userResult,
                    statsResult,
                    notesResult,
                    objectiveHistoryResult,
                    writingHistoryResult,
                    planResult,
                ),
            )
        }

        val notesCount = parseArrayResult(notesResult).size
        val objectiveRows = parseArrayResult(objectiveHistoryResult)
        val writingRows = parseArrayResult(writingHistoryResult)
        val completedWritingRows = writingRows.filter { row -> row.getString("status") != "IN_PROGRESS" }
        val topikHistoryCount = objectiveRows.size + completedWritingRows.size
        val writingCount = completedWritingRows.size
        val topikScores = objectiveRows.mapNotNull { row -> row.getInt("score") } + completedWritingRows.mapNotNull { row -> row.getInt("score") }
        val topikAverage = if (topikScores.isEmpty()) 0 else topikScores.sum() / topikScores.size

        val courseProgress = stats?.getArray("courseProgress")
        val completedUnits =
            courseProgress?.sumOf { item ->
                val row = item as? JsonObject ?: return@sumOf 0
                row.getInt("completedUnits") ?: 0
            } ?: 0
        val dailyGoal = stats?.getInt("dailyGoal")
        val todayMinutes = stats?.getInt("todayMinutes") ?: 0
        val streakDays = stats?.getInt("streak") ?: 0
        val totalWords = stats?.getInt("totalWordsLearned") ?: 0
        val totalGrammar = stats?.getInt("totalGrammarLearned") ?: 0
        val totalMinutes = stats?.getInt("totalMinutes") ?: 0
        val wordsToReview = stats?.getInt("wordsToReview") ?: stats?.getInt("dueNow") ?: 0

        val recentSession =
            stats
                ?.getArray("recentSessions")
                ?.firstOrNull() as? JsonObject
        val recentModule = resolveFeedModuleLabel(recentSession?.getString("module"))

        val planObj = (planResult as? ConvexResult.Success)?.value as? JsonObject
        val rawPlan = planObj?.getString("plan")?.uppercase(Locale.ROOT).orEmpty()
        val isPremium = planObj?.getBoolean("isPremium") == true
        val planLabel = when {
            isPremium -> "会员"
            rawPlan.contains("PRO") || rawPlan.contains("PLUS") || rawPlan.contains("PREMIUM") -> "会员"
            else -> "免费用户"
        }
        val planDisplay = if (rawPlan.isBlank()) "FREE" else rawPlan

        val settingsObj = (settingsResult as? ConvexResult.Success)?.value as? JsonObject
        val notificationObj = (notificationsResult as? ConvexResult.Success)?.value as? JsonObject
        val language = settingsObj?.getString("displayLanguage") ?: "简体中文"
        val reminderTime = notificationObj?.getStringPath("schedule", "time") ?: "未设置"

        val goalLabel =
            if (dailyGoal != null && dailyGoal > 0) {
                "今日学习 $todayMinutes/$dailyGoal 分钟"
            } else if (todayMinutes > 0) {
                "今日学习 $todayMinutes 分钟"
            } else {
                ""
            }

        return@coroutineScope ProfileUiState(
            isLoading = false,
            memberSince = user?.getLong("_creationTime")?.let(::formatDate) ?: "",
            headline = "最近模块 · $recentModule",
            planLabel = planLabel,
            streakLabel = "连续学习 $streakDays 天",
            completedLabel = "完成课程 $completedUnits 节",
            goalLabel = goalLabel,
            shortcuts = listOf(
                ProfileShortcutUiModel("词典", "main/dictionary", "詞"),
                ProfileShortcutUiModel("笔记", "main/notebook", "筆"),
                ProfileShortcutUiModel("订阅", "main/pricing", "星"),
                ProfileShortcutUiModel("阅读", "main/reading", "冊"),
            ),
            achievements = listOf(
                "词汇" to totalWords.toString(),
                "语法" to totalGrammar.toString(),
                "时长" to "$totalMinutes 分钟",
            ),
            recentActivity = listOf(
                "账户" to (user?.getString("name") ?: "学习者"),
                "最近模块" to recentModule,
                "TOPIK 记录" to "$topikHistoryCount 次",
            ),
            quickStats = listOf(
                totalWords.toString() to "词汇",
                topikAverage.toString() to "TOPIK",
                notesCount.toString() to "笔记",
            ),
            profileMenu = listOf(
                ProfileMenuEntryUiModel(
                    seal = "詞",
                    title = "词汇本",
                    subtitle = "$totalWords 单词 · $wordsToReview 待复习",
                    route = "main/dictionary",
                ),
                ProfileMenuEntryUiModel(
                    seal = "錯",
                    title = "错题本",
                    subtitle = "$topikHistoryCount 记录 · 写作 $writingCount 次",
                    route = "main/topik/history",
                ),
                ProfileMenuEntryUiModel(
                    seal = "筆",
                    title = "笔记本",
                    subtitle = "$notesCount 条笔记",
                    route = "main/notebook",
                ),
                ProfileMenuEntryUiModel(
                    seal = "章",
                    title = "成就与徽章",
                    subtitle = "已完成 $completedUnits 节课程",
                    route = "main/history",
                ),
            ),
            settingsMenu = listOf(
                ProfileMenuEntryUiModel(
                    seal = "星",
                    title = "订阅管理",
                    subtitle = "$planDisplay · $planLabel",
                    route = "main/pricing",
                ),
                ProfileMenuEntryUiModel(
                    seal = "鈴",
                    title = "通知设置",
                    subtitle = "学习提醒 $reminderTime",
                    route = "main/profile/settings",
                ),
                ProfileMenuEntryUiModel(
                    seal = "語",
                    title = "语言设置",
                    subtitle = language,
                    route = "main/profile/settings",
                ),
                ProfileMenuEntryUiModel(
                    seal = "助",
                    title = "帮助与反馈",
                    subtitle = "常见问题与联系支持",
                    route = "main/community",
                ),
            ),
        )
    }

    override suspend fun loadHistory(): HistoryUiState = coroutineScope {
        val topikDeferred = async { client.query("topik:getMyHistory") }
        val heatmapDeferred = async {
            client.query(
                "android:getActivityHeatmap",
                buildArgs("days" to 98),
            )
        }

        val topik = topikDeferred.await()
        val heatmapResult = heatmapDeferred.await()
        val rows = parseArrayResult(topik)
        val timeline =
            rows.take(8).map { row ->
                HistoryTimelineUiModel(
                    seal = "記",
                    title = row.getString("examTitle") ?: row.getString("title") ?: "TOPIK 记录",
                    time = formatTime(row.getLong("submittedAt") ?: row.getLong("completedAt")),
                    accent = "mint",
                )
            }
        val heatmap = parseHeatmapLevels(heatmapResult)
        val errorMessage =
            if (timeline.isEmpty() && heatmap.isEmpty()) {
                firstErrorMessage(topik, heatmapResult)
            } else {
                null
            }
        return@coroutineScope HistoryUiState(
            isLoading = false,
            timeline = timeline,
            heatmap = heatmap,
            errorMessage = errorMessage,
        )
    }

    override suspend fun loadCommunity(mode: String): CommunityUiState = coroutineScope {
        val leagueDeferred = async { client.query("league:getMyLeagueBoard") }
        val leagueMetaDeferred = async { client.query("league:getMyLeagueMeta") }
        val feedDeferred = async {
            client.query("community:getRecentFriendActivity", buildArgs("limit" to 8))
        }
        val shareLinkDeferred = async { client.query("friends:getMyShareLink") }
        val friendSummaryDeferred = async { client.query("friends:getMyFriendSummary") }

        val league = leagueDeferred.await()
        val leagueMeta = leagueMetaDeferred.await()
        val feedResult = feedDeferred.await()
        val shareLinkResult = shareLinkDeferred.await()
        val friendSummaryResult = friendSummaryDeferred.await()
        val boardRows = parseArrayResult(league)
        val feed = parseCommunityFeed(feedResult)
        val shareLink = (shareLinkResult as? ConvexResult.Success)?.value as? JsonObject
        val shareCode = shareLink?.getString("code") ?: ""
        val shareUrl = shareLink?.getString("url") ?: ""
        val summaryText = parseLeagueSummaryText(leagueMeta)
        val friendSummary = parseFriendSummary(friendSummaryResult)

        if (boardRows.isEmpty() && feed.isEmpty() && friendSummary == null) {
            return@coroutineScope CommunityUiState(
                isLoading = false,
                mode = mode,
                shareCode = shareCode,
                shareUrl = shareUrl,
                summaryText = summaryText,
                rankings = emptyList(),
                feed = emptyList(),
                friendSummary = null,
                suggestions = emptyList(),
                errorMessage = firstErrorMessage(league, leagueMeta, feedResult, friendSummaryResult),
            )
        }

        val rankings = boardRows.take(20).mapIndexed { index, row ->
            CommunityRankUiModel(
                rank = row.getInt("rank") ?: (index + 1),
                name = row.getString("displayName") ?: row.getString("name") ?: "Learner ${index + 1}",
                xp = row.getInt("weeklyXp") ?: row.getInt("xp") ?: 0,
                emoji = row.getString("emoji") ?: "🌿",
                accent = listOf("pink", "mint", "butter", "sky")[index % 4],
                highlight = row.getBoolean("isMe") == true,
            )
        }
        CommunityUiState(
            isLoading = false,
            mode = mode,
            shareCode = shareCode,
            shareUrl = shareUrl,
            summaryText = summaryText,
            rankings = rankings,
            feed = feed,
            friendSummary = friendSummary,
            suggestions = emptyList(),
        )
    }

    override suspend fun loadPricing(): PricingUiState {
        val access = client.query("entitlements:viewerAccess")
        val plan = client.query("entitlements:getViewerPlan")
        val accessObj = (access as? ConvexResult.Success)?.value as? JsonObject
        val planObj = (plan as? ConvexResult.Success)?.value as? JsonObject
        if (accessObj == null && planObj == null) {
            return PricingUiState(
                isLoading = false,
                heroStats = emptyList(),
                selectedPlan = null,
                featureCards = emptyList(),
                comparison = emptyList(),
                errorMessage = firstErrorMessage(access, plan),
            )
        }

        val currentPlan = planObj?.getString("plan") ?: accessObj?.getString("plan") ?: "FREE"
        val hasAccess = accessObj?.getBoolean("hasAccess") ?: false
        val premium = planObj?.getBoolean("isPremium") ?: false
        return PricingUiState(
            isLoading = false,
            heroStats = listOf(
                "当前套餐" to currentPlan,
                "访问状态" to if (hasAccess) "可用" else "受限",
            ),
            selectedPlan = PricingPlanUiModel(
                title = currentPlan,
                price = if (premium) "已订阅" else "--",
                badge = "当前方案",
                description = "移动端仅展示订阅状态，升级跳转 Web 完成。",
            ),
            featureCards = listOf("学习内容" to "按套餐权限展示"),
            comparison = emptyList(),
        )
    }

    override suspend fun loadSettings(): SettingsUiState {
        val notifications = client.query("notifications:getPreferences")
        val settings = client.query("userSettings:getSettings")

        val n = (notifications as? ConvexResult.Success)?.value as? JsonObject
        val s = (settings as? ConvexResult.Success)?.value as? JsonObject
        if (n == null && s == null) {
            return SettingsUiState(
                isLoading = false,
                notificationStatus = "",
                reminderTime = "",
                language = "",
                quietHours = "",
                toggles = emptyList(),
                learningPrefs = emptyList(),
                errorMessage = firstErrorMessage(notifications, settings),
            )
        }

        val profileVisibility = s?.getStringPath("privacy", "profileVisibility")
        val toggles = listOf(
            SettingToggleUiModel("notificationsEnabled", "接收通知", n?.getBoolean("enabled") == true),
            SettingToggleUiModel("inAppNotifications", "应用内通知", n?.getBooleanPath("channels", "inApp") == true),
            SettingToggleUiModel("webPush", "网页推送", n?.getBooleanPath("channels", "pwa") ?: false),
            SettingToggleUiModel("studyReminder", "学习提醒", n?.getBooleanPath("categories", "learning") == true),
            SettingToggleUiModel("examReminder", "考试通知", n?.getBooleanPath("categories", "exam") == true),
            SettingToggleUiModel("socialNotifications", "社交通知", n?.getBooleanPath("categories", "social") == true),
            SettingToggleUiModel("leaderboardOptOut", "隐藏排行榜排名", s?.getBooleanPath("privacy", "leaderboardOptOut") ?: false),
            SettingToggleUiModel(
                "profileVisibilityFriends",
                "个人资料仅好友可见",
                profileVisibility == "friends",
            ),
            SettingToggleUiModel("profileVisibilityPrivate", "个人资料设为私密", profileVisibility == "private"),
        )

        val languageCode = s?.getString("displayLanguage")
        val languageLabel = when (languageCode) {
            "en" -> "English"
            "vi" -> "Tiếng Việt"
            "mn" -> "Монгол"
            "zh" -> "简体中文"
            else -> ""
        }
        val quietStart = n?.getStringPath("quietHours", "start").orEmpty()
        val quietEnd = n?.getStringPath("quietHours", "end").orEmpty()
        val quietHours = if (quietStart.isNotBlank() && quietEnd.isNotBlank()) "$quietStart - $quietEnd" else ""
        val dailyGoalLabel = s?.getInt("dailyGoalMinutes")?.let { "$it 分钟 / 日" } ?: ""
        val flashcardFront = s?.getString("flashcardFront").orEmpty()
        val subtitleMode = s?.getString("mediaSubtitleMode").orEmpty()
        val audioSpeed = s?.getDoubleString("audioSpeed")?.let { "${it}x" } ?: ""
        val visibilityLabel =
            when (profileVisibility) {
                "private" -> "私密"
                "friends" -> "仅好友"
                "public" -> "公开"
                else -> ""
            }

        return SettingsUiState(
            isLoading = false,
            notificationStatus = if (toggles.first().enabled) "通知已开启" else "通知已关闭",
            reminderTime = n?.getString("dailyReminderLocalTime").orEmpty(),
            language = languageLabel,
            quietHours = quietHours,
            toggles = toggles,
            learningPrefs = listOf(
                "学习目标" to dailyGoalLabel,
                "卡片正面" to flashcardFront,
                "字幕模式" to subtitleMode,
                "音频速度" to audioSpeed,
                "资料可见性" to visibilityLabel,
            ),
        )
    }

    override suspend fun toggleSetting(key: String): SettingsUiState {
        val current = loadSettings()
        val target = current.toggles.firstOrNull { it.key == key } ?: return current
        val nextValue = !target.enabled

        val mutationResult =
            when (key) {
            "notificationsEnabled" ->
                client.mutation("notifications:updatePreferences", buildArgs("enabled" to nextValue))
            "inAppNotifications" ->
                client.mutation(
                    "notifications:updatePreferences",
                    buildArgs("channels" to jsonObject("inApp" to nextValue)),
                )
            "webPush" ->
                client.mutation(
                    "notifications:updatePreferences",
                    buildArgs("channels" to jsonObject("pwa" to nextValue)),
                )
            "studyReminder" ->
                client.mutation(
                    "notifications:updatePreferences",
                    buildArgs("categories" to jsonObject("learning" to nextValue)),
                )
            "examReminder" ->
                client.mutation(
                    "notifications:updatePreferences",
                    buildArgs("categories" to jsonObject("exam" to nextValue)),
                )
            "socialNotifications" ->
                client.mutation(
                    "notifications:updatePreferences",
                    buildArgs("categories" to jsonObject("social" to nextValue)),
                )
            "leaderboardOptOut" ->
                client.mutation(
                    "userSettings:updateSettings",
                    buildArgs("privacy" to jsonObject("leaderboardOptOut" to nextValue)),
                )
            "profileVisibilityFriends" ->
                client.mutation(
                    "userSettings:updateSettings",
                    buildArgs(
                        "privacy" to jsonObject(
                            "profileVisibility" to if (nextValue) "friends" else "public",
                        ),
                    ),
                )
            "profileVisibilityPrivate" ->
                client.mutation(
                    "userSettings:updateSettings",
                    buildArgs(
                        "privacy" to jsonObject(
                            "profileVisibility" to if (nextValue) "private" else "public",
                        ),
                    ),
                )
            else -> null
        }
        if (mutationResult is ConvexResult.Error) {
            return current.copy(
                isLoading = false,
                errorMessage = mutationResult.message,
            )
        }
        return loadSettings()
    }

    override suspend fun loadTopikHistory(): TopikHistoryUiState {
        val objectiveResult = client.query("topik:getMyHistory")
        val writingResult = client.query("android:getTopikWritingSessions", buildArgs("limit" to 40))
        val objectiveRows = parseArrayResult(objectiveResult)
        val writingRows = parseArrayResult(writingResult)
        val objectiveRecords = parseObjectiveTopikHistory(objectiveRows)
        val writingRecords = parseWritingTopikHistory(writingRows)
        val records = (objectiveRecords + writingRecords).sortedByDescending { it.sortTs }.take(30)

        if (records.isEmpty()) {
            return TopikHistoryUiState(
                isLoading = false,
                averageScore = 0,
                writingCount = 0,
                totalCount = 0,
                records = emptyList(),
                errorMessage = firstErrorMessage(objectiveResult, writingResult),
            )
        }

        val scores = records.mapNotNull { it.score }
        return TopikHistoryUiState(
            isLoading = false,
            averageScore = if (scores.isEmpty()) 0 else scores.sum() / scores.size,
            writingCount = records.count { it.mode.contains("写") },
            totalCount = records.size,
            records = records.map { it.row },
        )
    }

    override suspend fun likeActivity(activityId: String): MutationResult {
        val result = client.mutation("community:likeActivity", buildArgs("activityId" to activityId))
        return when (result) {
            is ConvexResult.Success -> MutationResult(success = true)
            is ConvexResult.Error -> MutationResult(success = false, errorMessage = result.message)
        }
    }

    override suspend fun unlikeActivity(activityId: String): MutationResult {
        val result = client.mutation("community:unlikeActivity", buildArgs("activityId" to activityId))
        return when (result) {
            is ConvexResult.Success -> MutationResult(success = true)
            is ConvexResult.Error -> MutationResult(success = false, errorMessage = result.message)
        }
    }

    override suspend fun sendFriendRequestByCode(code: String): MutationResult {
        val normalized = code.trim()
        if (normalized.isBlank()) {
            return MutationResult(success = false, errorMessage = "好友码不能为空")
        }
        val result = client.mutation("friends:sendRequestByCode", buildArgs("code" to normalized))
        return when (result) {
            is ConvexResult.Success -> MutationResult(success = true)
            is ConvexResult.Error -> MutationResult(success = false, errorMessage = result.message)
        }
    }

    override suspend fun respondFriendRequest(targetUserId: String, action: String): MutationResult {
        val result = client.mutation(
            "friends:respondRequest",
            buildArgs("targetUserId" to targetUserId, "action" to action),
        )
        return when (result) {
            is ConvexResult.Success -> MutationResult(success = true)
            is ConvexResult.Error -> MutationResult(success = false, errorMessage = result.message)
        }
    }

    override suspend fun regenerateFriendCode(): MutationResult {
        val result = client.mutation("friends:regenerateMyFriendCode")
        return when (result) {
            is ConvexResult.Success -> MutationResult(success = true)
            is ConvexResult.Error -> MutationResult(success = false, errorMessage = result.message)
        }
    }

    override suspend fun markNotificationsRead(): MutationResult {
        val result = client.mutation("notifications:markAllRead")
        return when (result) {
            is ConvexResult.Success -> MutationResult(success = true)
            is ConvexResult.Error -> MutationResult(success = false, errorMessage = result.message)
        }
    }

    override suspend fun syncAchievements(): MutationResult {
        val result = client.mutation("achievements:syncMyAchievements")
        return when (result) {
            is ConvexResult.Success -> MutationResult(success = true)
            is ConvexResult.Error -> MutationResult(success = false, errorMessage = result.message)
        }
    }

    override suspend fun loadVocabBook(): VocabBookUiState {
        val result = client.query("vocab/vocabQueries:getVocabBookCount", buildArgs("includeMastered" to true))
        val count = when (result) {
            is ConvexResult.Success -> {
                val obj = result.value as? JsonObject
                obj?.int("count") ?: 0
            }
            is ConvexResult.Error -> 0
        }
        val modes = listOf(
            VocabBookModeUiModel("immersive", "沉浸模式", "情境式词汇复习", "浸", "pink"),
            VocabBookModeUiModel("listen", "听力模式", "音频驱动的词汇训练", "聽", "mint"),
            VocabBookModeUiModel("dictation", "听写模式", "听音写词练习", "寫", "butter"),
            VocabBookModeUiModel("spelling", "拼写模式", "韩语拼写强化训练", "拼", "lilac"),
            VocabBookModeUiModel("export", "导出 PDF", "下载词汇本离线版", "出", "muted"),
        )
        return VocabBookUiState(isLoading = false, wordCount = count, modes = modes)
    }

    override suspend fun loadVocabBookEntries(
        search: String,
        category: String,
        cursor: String?,
    ): VocabBookListUiState {
        val normalizedSearch = search.trim()
        val normalizedCategory = category.trim().ifBlank { "DUE" }
        val reviewSummaryResult = client.query("vocab:getReviewSummary")
        val pageResult = client.query(
            "vocab/vocabQueries:getVocabBookPage",
            buildArgs(
                *listOfNotNull(
                    "includeMastered" to true as Any,
                    "savedByUserOnly" to true as Any,
                    normalizedSearch.ifBlank { null }?.let { "search" to it as Any },
                    "category" to normalizedCategory as Any,
                    cursor?.let { "cursor" to it as Any },
                    "limit" to 60 as Any,
                ).toTypedArray(),
            ),
        )

        val summaryObj = (reviewSummaryResult as? ConvexResult.Success)?.value as? JsonObject
        val dueNow = summaryObj?.int("dueNow") ?: 0
        val total = summaryObj?.int("total") ?: 0
        val mastered = summaryObj?.int("mastered") ?: 0
        val unlearned = summaryObj?.int("unlearned") ?: 0
        val categories = listOf(
            VocabBookCategoryUiModel("DUE", "待复习", dueNow),
            VocabBookCategoryUiModel("UNLEARNED", "新词", unlearned),
            VocabBookCategoryUiModel("MASTERED", "已掌握", mastered),
            VocabBookCategoryUiModel("ALL", "全部", total),
        )

        if (pageResult !is ConvexResult.Success) {
            return VocabBookListUiState(
                isLoading = false,
                totalCount = total,
                dueCount = dueNow,
                masteredCount = mastered,
                unlearnedCount = unlearned,
                categories = categories,
                items = emptyList(),
                nextCursor = null,
                errorMessage = extractResultError(pageResult) ?: "词汇本加载失败",
            )
        }

        val payload = pageResult.value as? JsonObject
        val itemArray = payload?.getArray("items") ?: JsonArray(emptyList())
        val items = itemArray.mapNotNull { item ->
            val obj = item as? JsonObject ?: return@mapNotNull null
            VocabBookEntryUiModel(
                id = obj.getString("id") ?: obj.getString("_id") ?: "",
                word = obj.getString("word") ?: "",
                meaning = obj.getString("meaningZh")
                    ?: obj.getString("meaning")
                    ?: obj.getString("meaningEn")
                    ?: "",
                pronunciation = obj.getString("pronunciation") ?: "",
                partOfSpeech = obj.getString("partOfSpeech") ?: "",
                status = obj.getString("status") ?: "",
                savedAt = obj.getLong("savedAt"),
            )
        }
        val nextCursor = payload?.getString("nextCursor")?.ifBlank { null }

        return VocabBookListUiState(
            isLoading = false,
            totalCount = total,
            dueCount = dueNow,
            masteredCount = mastered,
            unlearnedCount = unlearned,
            categories = categories,
            items = items,
            nextCursor = nextCursor,
        )
    }

    override suspend fun loadVocabBookMode(mode: String): VocabBookModeUiState {
        val normalized = mode.trim().lowercase(Locale.ROOT)
        val resolved = when (normalized) {
            "immerse", "immersive" -> "immersive"
            "listen" -> "listen"
            "dictation" -> "dictation"
            "spelling" -> "spelling"
            "export", "export-pdf" -> "export"
            else -> normalized
        }
        val title = when (resolved) {
            "immersive" -> "沉浸模式"
            "listen" -> "听力模式"
            "dictation" -> "听写模式"
            "spelling" -> "拼写模式"
            "export" -> "导出词汇本"
            else -> "词汇本练习"
        }
        val subtitle = when (resolved) {
            "immersive" -> "情境式词汇复习"
            "listen" -> "音频驱动的词汇训练"
            "dictation" -> "听音写词练习"
            "spelling" -> "韩语拼写强化训练"
            "export" -> "下载词汇本离线版"
            else -> "词汇本练习"
        }
        val actionLabel = if (resolved == "export") "生成 PDF" else "开始练习"

        val page = loadVocabBookEntries(search = "", category = "DUE", cursor = null)
        return VocabBookModeUiState(
            isLoading = false,
            title = title,
            subtitle = subtitle,
            description = "当前 Android 仅展示真实词汇数据，练习交互稍后补齐。",
            actionLabel = actionLabel,
            items = page.items.take(12),
        )
    }

    override suspend fun setVocabMastery(wordId: String, mastered: Boolean): MutationResult {
        val normalized = wordId.trim()
        if (normalized.isBlank()) return MutationResult(success = false, errorMessage = "词条无效")
        val result = client.mutation(
            "vocab/vocabMutations:setMastery",
            buildArgs("wordId" to normalized, "mastered" to mastered),
        )
        return when (result) {
            is ConvexResult.Success -> MutationResult(success = true)
            is ConvexResult.Error -> MutationResult(success = false, errorMessage = result.message)
        }
    }

    override suspend fun exportVocabBookPdf(
        category: String,
        mode: String,
        shuffle: Boolean,
        query: String?,
        selectedWordIds: List<String>?,
        language: String,
    ): VocabBookExportResult {
        val normalizedCategory = category.trim().uppercase(Locale.ROOT).ifBlank { "DUE" }
        val resolvedCategory = when (normalizedCategory) {
            "UNLEARNED", "DUE", "MASTERED" -> normalizedCategory
            else -> "DUE"
        }
        val normalizedMode = mode.trim().uppercase(Locale.ROOT).ifBlank { "A4_DICTATION" }
        val resolvedMode = when (normalizedMode) {
            "A4_DICTATION", "LANG_LIST", "KO_LIST" -> normalizedMode
            else -> "A4_DICTATION"
        }
        val origin = "https://hangyeol.app"
        val result = client.action(
            "vocabPdf:exportVocabBookPdf",
            buildArgs(
                "origin" to origin,
                "logoUrl" to "$origin/logo.png",
                "language" to language,
                "mode" to resolvedMode,
                "shuffle" to shuffle,
                "category" to resolvedCategory,
                "q" to query.orEmpty(),
                "selectedWordIds" to selectedWordIds,
            ),
        )
        return when (result) {
            is ConvexResult.Error -> VocabBookExportResult(
                success = false,
                errorMessage = resolveVocabExportError(result.message),
            )
            is ConvexResult.Success -> {
                val payload = result.value as? JsonObject
                val url = payload?.getString("url").orEmpty()
                if (url.isBlank()) {
                    VocabBookExportResult(success = false, errorMessage = "导出失败，请稍后重试")
                } else {
                    VocabBookExportResult(success = true, url = url)
                }
            }
        }
    }

    override suspend fun loadTypingSurface(): TypingSurfaceUiState {
        val statsResult = client.query("typing:getUserStats")
        val categoriesResult = client.query("typing:listCategories")
        val textsResult = client.query(
            "typing:listTexts",
            buildArgs(
                "type" to "SENTENCE",
                "onlyPublic" to true,
                "paginationOpts" to JsonObject(mapOf("numItems" to JsonPrimitive(12))),
            ),
        )

        val statsObj = (statsResult as? ConvexResult.Success)?.value as? JsonObject
        val stats = statsObj?.let {
            TypingStatsUiModel(
                totalTests = it.int("totalTests") ?: 0,
                averageWpm = it.int("averageWpm") ?: 0,
                averageAccuracy = it.int("averageAccuracy") ?: 0,
                highestWpm = it.int("highestWpm") ?: 0,
                sessionsThisWeek = it.int("sessionsThisWeek") ?: 0,
                lastPracticeMode = it.getString("lastPracticeMode"),
                lastCategoryId = it.getString("lastCategoryId"),
            )
        }

        val categories = (categoriesResult as? ConvexResult.Success)?.value
            ?.let { it as? JsonArray }
            ?.mapNotNull { (it as? JsonPrimitive)?.contentOrNull?.trim()?.ifBlank { null } }
            ?: emptyList()

        val textsPayload = (textsResult as? ConvexResult.Success)?.value as? JsonObject
        val textArray = textsPayload?.getArray("page") ?: JsonArray(emptyList())
        val texts = textArray.mapNotNull { item ->
            val obj = item as? JsonObject ?: return@mapNotNull null
            val id = obj.getString("_id") ?: obj.getString("id") ?: return@mapNotNull null
            TypingTextUiModel(
                id = id,
                title = obj.getString("title") ?: "练习文本",
                content = obj.getString("content") ?: "",
                type = obj.getString("type") ?: "SENTENCE",
                category = obj.getString("category") ?: "",
            )
        }

        val errorMessage = extractResultError(statsResult)
            ?: extractResultError(categoriesResult)
            ?: extractResultError(textsResult)

        return TypingSurfaceUiState(
            isLoading = false,
            stats = stats,
            categories = categories,
            texts = texts,
            errorMessage = errorMessage,
        )
    }

    override suspend fun saveTypingRecord(payload: TypingRecordPayload): MutationResult {
        val result = client.mutation(
            "typing:saveRecord",
            buildArgs(
                "practiceMode" to payload.practiceMode,
                "categoryId" to payload.categoryId,
                "wpm" to payload.wpm,
                "accuracy" to payload.accuracy,
                "errorCount" to payload.errorCount,
                "duration" to payload.duration,
                "charactersTyped" to payload.charactersTyped,
                "sentencesCompleted" to payload.sentencesCompleted,
                "targetWpm" to payload.targetWpm,
                "isTargetAchieved" to payload.isTargetAchieved,
            ),
        )
        return when (result) {
            is ConvexResult.Success -> MutationResult(success = true)
            is ConvexResult.Error -> MutationResult(success = false, errorMessage = result.message)
        }
    }

    override suspend fun loadEpubReader(slug: String): EpubReaderUiState {
        val normalized = slug.trim()
        if (normalized.isBlank()) {
            return EpubReaderUiState(isLoading = false, errorMessage = "未找到阅读内容")
        }
        val detailResult = client.query("readingBooks:getBookBySlug", buildArgs("slug" to normalized))
        val detail = (detailResult as? ConvexResult.Success)?.value as? JsonObject
        if (detail == null) {
            return EpubReaderUiState(
                isLoading = false,
                errorMessage = extractResultError(detailResult) ?: "阅读内容不可用",
            )
        }
        val pages = loadReadingBookPages(normalized, detail.getInt("pageCount") ?: 0)
        if (pages.isEmpty()) {
            return EpubReaderUiState(isLoading = false, errorMessage = "阅读内容不可用")
        }
        val sourceBookId = detail.getString("sourceBookId").orEmpty()
        val userProgressResult = client.query("readingLibrary:getBookDetail", buildArgs("slug" to normalized))
        val userProgress = ((userProgressResult as? ConvexResult.Success)?.value as? JsonObject)
            ?.getObject("userProgress")
        val currentPageIndex = (userProgress?.getInt("chapterIndex") ?: 0).coerceIn(0, pages.lastIndex)
        val title = detail?.getString("pageTitle")
            ?: detail?.getString("title")
            ?: normalized
        return EpubReaderUiState(
            isLoading = false,
            title = title,
            sourceBookId = sourceBookId,
            currentPageIndex = currentPageIndex,
            totalPages = pages.size,
            pages = pages,
            errorMessage = null,
        )
    }

    override suspend fun saveReadingProgress(
        bookId: String,
        pageIndex: Int,
        totalPages: Int,
    ): MutationResult {
        val normalizedBookId = bookId.trim()
        if (normalizedBookId.isBlank()) {
            return MutationResult(success = false, errorMessage = "缺少书籍标识，无法保存进度")
        }
        val normalizedPageIndex = pageIndex.coerceAtLeast(0)
        val completionPercent = if (totalPages > 0) {
            (((normalizedPageIndex + 1).toDouble() / totalPages.toDouble()) * 100.0).toInt().coerceIn(0, 100)
        } else {
            0
        }
        val result = client.mutation(
            "readingLibrary:saveProgress",
            buildArgs(
                "bookId" to normalizedBookId,
                "chapterIndex" to normalizedPageIndex,
                "completionPercent" to completionPercent,
            ),
        )
        return when (result) {
            is ConvexResult.Success -> MutationResult(success = true)
            is ConvexResult.Error -> MutationResult(success = false, errorMessage = result.message)
        }
    }

    override suspend fun loadVideoDetail(videoId: String): VideoDetailUiState {
        val result = client.query("videos:get", buildArgs("id" to videoId))
        return when (result) {
            is ConvexResult.Success -> {
                val obj = result.value as? JsonObject
                    ?: return VideoDetailUiState(isLoading = false, errorMessage = "视频未找到")
                val duration = obj.int("duration") ?: 0
                val transcriptData = obj["transcriptData"] as? JsonObject
                val segments = transcriptData?.get("segments") as? JsonArray
                val lines = segments?.mapNotNull { seg ->
                    val s = seg as? JsonObject ?: return@mapNotNull null
                    s.str("text")
                }?.take(20) ?: emptyList()
                VideoDetailUiState(
                    isLoading = false,
                    title = obj.str("title") ?: "",
                    videoUrl = obj.str("videoUrl") ?: "",
                    description = obj.str("description") ?: "",
                    level = obj.str("level") ?: "",
                    durationSec = duration,
                    durationLabel = if (duration > 0) formatSeconds(duration) else "",
                    transcriptLines = lines,
                )
            }
            is ConvexResult.Error -> {
                if (result.message?.contains("SUBSCRIPTION_REQUIRED") == true) {
                    VideoDetailUiState(isLoading = false, requiresUpgrade = true, errorMessage = "需要升级订阅才能观看此视频")
                } else {
                    VideoDetailUiState(isLoading = false, errorMessage = result.message)
                }
            }
        }
    }

    override suspend fun consumeMediaPlay(resourceKey: String): MutationResult {
        val normalized = resourceKey.trim()
        if (normalized.isBlank()) return MutationResult(success = false, errorMessage = "播放资源缺失")
        val result = client.mutation(
            "entitlements:consumeMediaPlay",
            buildArgs("resourceKey" to normalized),
        )
        return when (result) {
            is ConvexResult.Success -> MutationResult(success = true)
            is ConvexResult.Error -> MutationResult(success = false, errorMessage = result.message)
        }
    }

    override suspend fun saveVideoProgress(
        videoId: String,
        progressSec: Int,
        durationSec: Int?,
    ): MutationResult {
        val normalizedId = videoId.trim()
        if (normalizedId.isBlank()) return MutationResult(success = false, errorMessage = "视频标识缺失")
        val args = mutableListOf<Pair<String, Any>>(
            "videoId" to normalizedId,
            "progress" to progressSec.coerceAtLeast(0),
        )
        if (durationSec != null && durationSec > 0) {
            args.add("duration" to durationSec)
        }
        val result = client.mutation("videos:saveProgress", buildArgs(*args.toTypedArray()))
        return when (result) {
            is ConvexResult.Success -> MutationResult(success = true)
            is ConvexResult.Error -> MutationResult(success = false, errorMessage = result.message)
        }
    }

    override suspend fun saveSavedWord(
        korean: String,
        english: String,
        exampleSentence: String?,
        exampleTranslation: String?,
    ): MutationResult {
        val normalizedKorean = korean.trim()
        val normalizedEnglish = english.trim()
        if (normalizedKorean.isBlank()) {
            return MutationResult(success = false, errorMessage = "单词为空，无法保存")
        }
        if (normalizedEnglish.isBlank()) {
            return MutationResult(success = false, errorMessage = "释义为空，无法保存")
        }
        val args = mutableListOf<Pair<String, Any>>(
            "korean" to normalizedKorean,
            "english" to normalizedEnglish,
        )
        if (!exampleSentence.isNullOrBlank()) {
            args.add("exampleSentence" to exampleSentence.trim())
        }
        if (!exampleTranslation.isNullOrBlank()) {
            args.add("exampleTranslation" to exampleTranslation.trim())
        }
        val result = client.mutation("user:saveSavedWord", buildArgs(*args.toTypedArray()))
        return when (result) {
            is ConvexResult.Success -> MutationResult(success = true)
            is ConvexResult.Error -> MutationResult(success = false, errorMessage = result.message)
        }
    }

    override suspend fun addWordToReview(
        word: String,
        meaning: String,
        context: String?,
        source: String?,
    ): MutationResult {
        val normalizedWord = word.trim()
        val normalizedMeaning = meaning.trim()
        if (normalizedWord.isBlank()) {
            return MutationResult(success = false, errorMessage = "单词为空，无法加入复习")
        }
        if (normalizedMeaning.isBlank()) {
            return MutationResult(success = false, errorMessage = "释义为空，无法加入复习")
        }
        val args = mutableListOf<Pair<String, Any>>(
            "word" to normalizedWord,
            "meaning" to normalizedMeaning,
            "meaningZh" to normalizedMeaning,
            "meaningVi" to normalizedMeaning,
            "meaningMn" to normalizedMeaning,
        )
        if (!context.isNullOrBlank()) {
            args.add("context" to context.trim())
        }
        if (!source.isNullOrBlank()) {
            args.add("source" to source.trim())
        }
        val result = client.mutation("vocab:addToReview", buildArgs(*args.toTypedArray()))
        return when (result) {
            is ConvexResult.Success -> MutationResult(success = true)
            is ConvexResult.Error -> MutationResult(success = false, errorMessage = result.message)
        }
    }

    override suspend fun loadAchievements(): AchievementsUiState {
        val result = client.query("achievements:getAchievementOverview")
        return when (result) {
            is ConvexResult.Success -> {
                val obj = result.value as? JsonObject
                    ?: return AchievementsUiState(isLoading = false)
                val sectionsArr = obj["sections"] as? JsonArray ?: JsonArray(emptyList())
                val sections = sectionsArr.mapNotNull { item ->
                    val sec = item as? JsonObject ?: return@mapNotNull null
                    val badgesArr = sec["badges"] as? JsonArray ?: JsonArray(emptyList())
                    val badges = badgesArr.mapNotNull { b ->
                        val badge = b as? JsonObject ?: return@mapNotNull null
                        AchievementBadgeUiModel(
                            badgeId = badge.str("badgeId") ?: "",
                            title = badge.str("titleKey") ?: "",
                            description = badge.str("descriptionKey") ?: "",
                            icon = badge.str("iconKey") ?: "🏅",
                            tier = badge.str("tier") ?: "",
                            progressValue = badge.int("progressValue") ?: 0,
                            targetValue = badge.int("targetValue") ?: 1,
                            rewardXp = badge.int("rewardXp") ?: 0,
                            isUnlocked = badge["isUnlocked"]?.jsonPrimitive?.booleanOrNull == true,
                            isNew = badge["isNew"]?.jsonPrimitive?.booleanOrNull == true,
                        )
                    }
                    AchievementSectionUiModel(
                        category = sec.str("category") ?: "",
                        title = sec.str("titleKey") ?: "",
                        unlockedCount = sec.int("unlockedCount") ?: 0,
                        totalCount = sec.int("totalCount") ?: 0,
                        badges = badges,
                    )
                }
                AchievementsUiState(
                    isLoading = false,
                    unlockedCount = obj.int("unlockedCount") ?: 0,
                    totalCount = obj.int("totalCount") ?: 0,
                    progressPct = obj.int("progressPct") ?: 0,
                    sections = sections,
                )
            }
            is ConvexResult.Error -> AchievementsUiState(isLoading = false, errorMessage = result.message)
        }
    }

    override suspend fun searchPodcasts(term: String): PodcastSearchUiState {
        val normalized = term.trim()
        if (normalized.isBlank()) return PodcastSearchUiState(query = normalized)
        val result = client.action("podcastActions:searchPodcasts", buildArgs("term" to normalized))
        return when (result) {
            is ConvexResult.Success -> {
                val arr = result.value as? JsonArray ?: return PodcastSearchUiState(query = normalized)
                val results = arr.mapNotNull { item ->
                    val obj = item as? JsonObject ?: return@mapNotNull null
                    val title = obj.str("title") ?: return@mapNotNull null
                    PodcastSearchResultUiModel(
                        id = obj.str("id") ?: "",
                        title = title,
                        author = obj.str("author") ?: "",
                        artwork = obj.str("artwork") ?: "",
                    )
                }
                PodcastSearchUiState(query = normalized, results = results)
            }
            is ConvexResult.Error -> PodcastSearchUiState(query = normalized, errorMessage = result.message)
        }
    }

    override suspend fun loadPodcastHistory(): PodcastHistoryUiState {
        val result = client.query("podcasts:getHistory")
        return when (result) {
            is ConvexResult.Success -> {
                val arr = result.value as? JsonArray
                    ?: return PodcastHistoryUiState(isLoading = false)
                val items = arr.mapNotNull { item ->
                    val obj = item as? JsonObject ?: return@mapNotNull null
                    val title = obj.str("episodeTitle") ?: return@mapNotNull null
                    val progress = obj.int("progress") ?: 0
                    val duration = obj.int("duration")
                    val playedAt = obj.long("playedAt")
                    PodcastHistoryItemUiModel(
                        id = obj.str("id") ?: obj.str("episodeGuid") ?: "",
                        episodeTitle = title,
                        channelName = obj.str("channelName") ?: "",
                        progressLabel = formatProgressLabel(progress, duration),
                        timeAgo = formatRelativeTime(playedAt),
                    )
                }
                PodcastHistoryUiState(isLoading = false, items = items)
            }
            is ConvexResult.Error -> PodcastHistoryUiState(isLoading = false, errorMessage = result.message)
        }
    }

    override suspend fun loadPodcastEpisode(episodeId: String): PodcastPlayerUiState {
        val result = client.query("android:getLatestPodcastNowPlaying")
        return when (result) {
            is ConvexResult.Success -> {
                val obj = result.value as? JsonObject
                    ?: return PodcastPlayerUiState(isLoading = false, errorMessage = "暂无播放数据")
                val elapsed = obj.int("elapsedSec") ?: 0
                val duration = obj.int("durationSec") ?: 0
                PodcastPlayerUiState(
                    isLoading = false,
                    episodeTitle = obj.str("episodeTitle") ?: "",
                    channelTitle = obj.str("channelTitle") ?: "",
                    transcriptPrimary = obj.str("transcriptText") ?: "",
                    transcriptSecondary = obj.str("translationText") ?: "",
                    elapsedLabel = formatSeconds(elapsed),
                    remainingLabel = if (duration > 0) "-${formatSeconds(duration - elapsed)}" else "--:--",
                    elapsedSec = elapsed,
                    durationSec = duration,
                )
            }
            is ConvexResult.Error -> PodcastPlayerUiState(isLoading = false, errorMessage = result.message)
        }
    }

    override suspend fun savePodcastProgress(episodeId: String, progressSec: Int): MutationResult {
        val result = client.mutation(
            "podcasts:saveProgress",
            buildArgs("episodeId" to episodeId, "progress" to progressSec),
        )
        return when (result) {
            is ConvexResult.Success -> MutationResult(success = true)
            is ConvexResult.Error -> MutationResult(success = false, errorMessage = result.message)
        }
    }

    private fun formatProgressLabel(progressSec: Int, durationSec: Int?): String {
        val elapsed = formatSeconds(progressSec)
        return if (durationSec != null && durationSec > 0) "$elapsed / ${formatSeconds(durationSec)}" else elapsed
    }

    private fun formatSeconds(totalSec: Int): String {
        val m = totalSec / 60
        val s = totalSec % 60
        return "%d:%02d".format(m, s)
    }

    private fun formatRelativeTime(timestamp: Long?): String {
        if (timestamp == null) return ""
        val diffMs = System.currentTimeMillis() - timestamp
        return when {
            diffMs < 60_000L -> "刚刚"
            diffMs < 3_600_000L -> "${diffMs / 60_000L} 分钟前"
            diffMs < 86_400_000L -> "${diffMs / 3_600_000L} 小时前"
            diffMs < 172_800_000L -> "昨天"
            else -> "${diffMs / 86_400_000L} 天前"
        }
    }

    private fun JsonObject.str(key: String): String? {
        val v = this[key] ?: return null
        if (v is JsonNull) return null
        return v.jsonPrimitive.content.takeIf { it.isNotBlank() }
    }

    private fun JsonObject.int(key: String): Int? = this[key]?.jsonPrimitive?.intOrNull

    private fun JsonObject.long(key: String): Long? = this[key]?.jsonPrimitive?.content?.toLongOrNull()

    private fun loadRecentQueries(): List<String> {
        val raw = prefs.getString(PREF_KEY_DICTIONARY_RECENT, null)
        val parsed =
            raw
                ?.split('\n')
                ?.map { it.trim() }
                ?.filter { it.isNotEmpty() }
                ?.distinct()
                ?.take(8)
                .orEmpty()
        return parsed
    }

    private suspend fun loadDictionarySuggestions(): List<String> {
        val result = client.query("android:getDictionarySuggestions", buildArgs("limit" to 8))
        if (result !is ConvexResult.Success) return emptyList()
        val rows = result.value as? JsonArray ?: return emptyList()
        return rows.mapNotNull { item ->
            val primitive = item as? JsonPrimitive ?: return@mapNotNull null
            primitive.content.trim().takeIf { it.isNotEmpty() }
        }.distinct().take(8)
    }

    private fun parseDictionaryEntries(rows: JsonArray?): List<DictionaryEntryUiModel> {
        if (rows == null) return emptyList()
        return rows.mapIndexedNotNull { index, item ->
            val row = item as? JsonObject ?: return@mapIndexedNotNull null
            val senses = row.getArray("senses")
            val firstSense = senses?.firstOrNull() as? JsonObject
            val firstTranslation = firstSense?.getObject("translation")
            val relatedWord = firstTranslation?.getString("word")
            val relatedDefinition = firstTranslation?.getString("definition")
            val related =
                if (relatedWord.isNullOrBlank() || relatedDefinition.isNullOrBlank()) {
                    emptyList()
                } else {
                    listOf(relatedWord to relatedDefinition)
                }
            DictionaryEntryUiModel(
                id = row.getString("targetCode") ?: "entry-$index",
                term = row.getString("word") ?: "",
                pronunciation = row.getString("pronunciation") ?: "",
                hanjaSeal = (row.getString("word") ?: "詞").take(1),
                partOfSpeech = row.getString("pos") ?: "词条",
                meaningKo = firstSense?.getString("definition") ?: "",
                meaningZh = firstTranslation?.getString("definition") ?: "",
                examples = emptyList(),
                related = related,
            )
        }
    }

    private fun parseObjectiveTopikHistory(rows: List<JsonObject>): List<TopikHistoryRecordWithSort> {
        return rows.mapNotNull { row ->
            val examId = row.getString("examId") ?: return@mapNotNull null
            val submittedAt = row.getLong("submittedAt") ?: row.getLong("completedAt")
            val wrongOnly = row.getBoolean("wrongOnly") ?: false
            val score = row.getInt("score")
            TopikHistoryRecordWithSort(
                sortTs = submittedAt ?: 0L,
                score = score,
                mode = "客观题",
                row = TopikHistoryRecordUiModel(
                    title = row.getString("examTitle") ?: row.getString("title") ?: "TOPIK 考试",
                    submittedAt = formatTime(submittedAt),
                    mode = "客观题",
                    score = score?.let { "$it 分" } ?: "待评分",
                    route = "main/topik/$examId?review=true&wrongOnly=$wrongOnly",
                ),
            )
        }
    }

    private fun parseWritingTopikHistory(rows: List<JsonObject>): List<TopikHistoryRecordWithSort> {
        return rows
            .filter { row -> row.getString("status") != "IN_PROGRESS" }
            .mapNotNull { row ->
                val examId = row.getString("examDocumentId") ?: return@mapNotNull null
                val submittedAt = row.getLong("completedAt") ?: row.getLong("updatedAt")
                val score = row.getInt("score")
                TopikHistoryRecordWithSort(
                    sortTs = submittedAt ?: 0L,
                    score = score,
                    mode = "写作",
                    row = TopikHistoryRecordUiModel(
                        title = row.getString("examTitle") ?: "TOPIK 写作",
                        submittedAt = formatTime(submittedAt),
                        mode = "写作",
                        score = score?.let { "$it 分" } ?: "待评估",
                        route = "main/topik/writing/$examId",
                    ),
                )
            }
    }

    private fun parseReadingPageResult(result: ConvexResult<JsonElement>): ReadingPagePayload? {
        if (result !is ConvexResult.Success) return null
        val payload = result.value as? JsonObject ?: return null
        val pageObj = payload.getObject("page") ?: return null
        val bookObj = payload.getObject("book")
        val pageIndex = pageObj.getInt("pageIndex") ?: 0
        val pageCount = payload.getInt("pageCount") ?: 1
        val sentenceRows = pageObj.getArray("sentences")
        val paragraphs =
            sentenceRows
                ?.mapNotNull { sentence ->
                    val row = sentence as? JsonObject ?: return@mapNotNull null
                    val text = row.getString("text").orEmpty()
                    if (text.isBlank()) return@mapNotNull null
                    ReadingParagraphUiModel(
                        text = text,
                        translation = row.getString("translation").orEmpty(),
                    )
                }
                .orEmpty()
        val titlePrefix = bookObj?.getString("pageTitle") ?: bookObj?.getString("title") ?: "阅读"
        val page = ReadingPageUiModel(
            title = "$titlePrefix · 第${pageIndex + 1}页",
            imageSeal = (bookObj?.getString("title") ?: "冊").take(1),
            imageAccent = READING_ACCENTS[pageIndex % READING_ACCENTS.size],
            paragraphs = paragraphs,
        )
        return ReadingPagePayload(page = page, pageCount = pageCount)
    }

    private fun parseArrayResult(result: ConvexResult<JsonElement>): List<JsonObject> {
        if (result !is ConvexResult.Success) return emptyList()
        return when (val value = result.value) {
            is JsonArray -> value.mapNotNull { it as? JsonObject }
            is JsonObject -> {
                val candidates = listOf("page", "books", "entries", "data")
                for (key in candidates) {
                    val arr = value[key] as? JsonArray
                    if (arr != null) {
                        return arr.mapNotNull { it as? JsonObject }
                    }
                }
                emptyList()
            }
            else -> emptyList()
        }
    }

    private fun parseCommunityFeed(result: ConvexResult<JsonElement>): List<CommunityFeedUiModel> {
        if (result !is ConvexResult.Success) return emptyList()
        val arr = result.value as? JsonArray ?: return emptyList()
        return arr.take(8).mapNotNull { item ->
            val obj = item as? JsonObject ?: return@mapNotNull null
            val actor = obj.getString("actorName") ?: "学习伙伴"
            val module = resolveFeedModuleLabel(obj.getString("module"))
            val itemCount = obj.getInt("itemCount") ?: 0
            val score = obj.getInt("score")
            val eventName = obj.getString("eventName").orEmpty()
            val action = when {
                eventName.contains("exam", ignoreCase = true) && score != null ->
                    "完成了 $module，得分 $score 分"
                itemCount > 0 -> "完成了 $module · $itemCount 项"
                else -> "刚完成了 $module 训练"
            }
            val time = formatTime(obj.getLong("eventAt"))
            val deltaLabel = when {
                score != null -> "$score 分"
                itemCount > 0 -> "+$itemCount"
                else -> ""
            }
            CommunityFeedUiModel(
                actorName = actor,
                action = action,
                time = time,
                badgeLabel = resolveFeedBadgeLabel(eventName),
                emoji = resolveFeedEmoji(eventName),
                accent = resolveFeedAccent(eventName),
                deltaLabel = deltaLabel,
                activityId = obj.getString("activityId").orEmpty(),
                likeCount = (obj.getInt("likeCount") ?: 0).coerceAtLeast(0),
                likedByMe = obj.getBoolean("likedByMe") == true,
            )
        }
    }

    private fun parseLeagueSummaryText(result: ConvexResult<JsonElement>): String {
        if (result !is ConvexResult.Success) return ""
        val row = result.value as? JsonObject ?: return ""
        val rank = row.getInt("cohortRank")
        val size = row.getInt("cohortSize")
        val tier = resolveLeagueTierLabel(row.getString("tier"))
        val endsAt = row.getLong("weekEndsAtMs")
        val countdown = formatLeagueCountdown(endsAt)

        val head = when {
            !tier.isNullOrBlank() && rank != null && size != null && size > 0 -> "${tier}联赛 · 第${rank}/${size}名"
            rank != null && size != null && size > 0 -> "第${rank}/${size}名"
            !tier.isNullOrBlank() -> "${tier}联赛"
            else -> ""
        }
        return listOf(head, countdown).filter { it.isNotBlank() }.joinToString(" · ")
    }

    private fun parseFriendSummary(result: ConvexResult<JsonElement>): CommunityFriendSummaryUiModel? {
        if (result !is ConvexResult.Success) return null
        val row = result.value as? JsonObject ?: return null
        return CommunityFriendSummaryUiModel(
            mutualCount = (row.getInt("mutualCount") ?: 0).coerceAtLeast(0),
            followingCount = (row.getInt("followingCount") ?: 0).coerceAtLeast(0),
            followerCount = (row.getInt("followerCount") ?: 0).coerceAtLeast(0),
            outgoingPendingCount = (row.getInt("outgoingPendingCount") ?: 0).coerceAtLeast(0),
            incomingPendingCount = (row.getInt("incomingPendingCount") ?: 0).coerceAtLeast(0),
        )
    }

    private fun parseHeatmapLevels(result: ConvexResult<JsonElement>): List<String> {
        if (result !is ConvexResult.Success) return emptyList()
        val arr = result.value as? JsonArray ?: return emptyList()
        return arr.mapNotNull { item ->
            val primitive = item as? JsonPrimitive ?: return@mapNotNull null
            when (primitive.content.lowercase(Locale.ROOT)) {
                "strong" -> "strong"
                "active" -> "active"
                "idle" -> "idle"
                else -> null
            }
        }
    }

    private fun formatDuration(totalSeconds: Int): String {
        if (totalSeconds <= 0) return "--"
        val hours = totalSeconds / 3600
        val minutes = (totalSeconds % 3600) / 60
        val seconds = totalSeconds % 60
        return when {
            hours > 0 -> "${hours}h ${minutes}m"
            minutes > 0 -> "${minutes}m"
            else -> "${seconds}s"
        }
    }

    private fun formatElapsedLabel(elapsedSec: Int?): String {
        if (elapsedSec == null || elapsedSec < 0) return "--:--"
        return toMinuteSecond(elapsedSec)
    }

    private fun formatRemainingLabel(elapsedSec: Int?, durationSec: Int?): String {
        if (elapsedSec == null || durationSec == null || durationSec <= 0) return "--:--"
        val remaining = (durationSec - elapsedSec).coerceAtLeast(0)
        return "-${toMinuteSecond(remaining)}"
    }

    private fun toMinuteSecond(totalSec: Int): String {
        val minutes = totalSec / 60
        val seconds = totalSec % 60
        return String.format(Locale.getDefault(), "%02d:%02d", minutes, seconds)
    }

    private suspend fun translateSingleTranscriptLine(text: String): String {
        val normalized = text.trim()
        if (normalized.isBlank()) return ""
        val result =
            client.action(
                "ai:batchTranslate",
                buildArgs(
                    "texts" to JsonArray(listOf(JsonPrimitive(normalized))),
                    "targetLang" to "zh",
                ),
            )
        if (result !is ConvexResult.Success) return ""
        val payload = result.value as? JsonObject ?: return ""
        val translations = payload.getArray("translations") ?: return ""
        val first = translations.firstOrNull() as? JsonPrimitive ?: return ""
        return first.content.trim()
    }

    private fun resolveReadingAiError(errorCode: String): String = when (errorCode.uppercase(Locale.ROOT)) {
        "DAILY_LIMIT_REACHED" -> "今日 AI 翻译额度已用完，请明天再试。"
        "UNAUTHORIZED", "FORBIDDEN", "AUTH", "HTTP_401" -> "请先登录后再使用 AI 翻译。"
        else -> "AI 翻译失败，请稍后重试。"
    }

    private fun resolveVocabExportError(rawError: String?): String {
        val normalized = rawError.orEmpty().uppercase(Locale.ROOT)
        return when {
            normalized.contains("NO_WORDS") -> "当前分类没有可导出的词条"
            normalized.contains("PDF_LOCKED") || normalized.contains("SUBSCRIPTION_REQUIRED") -> "导出 PDF 需要会员权限"
            normalized.contains("UNAUTHORIZED") || normalized.contains("FORBIDDEN") || normalized.contains("401") -> "登录状态已失效，请重新登录"
            else -> rawError?.takeIf { it.isNotBlank() } ?: "导出失败，请稍后重试"
        }
    }

    private fun resolveFeedModuleLabel(module: String?): String = when (module?.uppercase()) {
        "VOCAB" -> "词汇"
        "GRAMMAR" -> "语法"
        "READING" -> "阅读"
        "LISTENING" -> "听力"
        "PODCAST" -> "播客"
        "EXAM" -> "TOPIK"
        "TYPING" -> "打字"
        else -> "学习"
    }

    private fun resolveFeedBadgeLabel(eventName: String): String = when {
        eventName.contains("exam", ignoreCase = true) -> "考試"
        eventName.contains("review", ignoreCase = true) -> "复习"
        eventName.contains("content", ignoreCase = true) -> "里程碑"
        else -> "动态"
    }

    private fun resolveFeedEmoji(eventName: String): String = when {
        eventName.contains("exam", ignoreCase = true) -> "📝"
        eventName.contains("review", ignoreCase = true) -> "📘"
        eventName.contains("content", ignoreCase = true) -> "🌱"
        else -> "📚"
    }

    private fun resolveFeedAccent(eventName: String): String = when {
        eventName.contains("exam", ignoreCase = true) -> "lilac"
        eventName.contains("review", ignoreCase = true) -> "pink"
        eventName.contains("content", ignoreCase = true) -> "mint"
        else -> "sky"
    }

    private fun resolveLeagueTierLabel(tier: String?): String? = when (tier?.lowercase(Locale.ROOT)) {
        "bronze" -> "青铜"
        "silver" -> "白银"
        "gold" -> "黄金"
        "diamond" -> "钻石"
        else -> null
    }

    private fun formatLeagueCountdown(weekEndsAtMs: Long?): String {
        if (weekEndsAtMs == null) return ""
        val remainingMs = weekEndsAtMs - System.currentTimeMillis()
        if (remainingMs <= 0L) return "本周结算中"
        val totalHours = remainingMs / 3_600_000L
        val days = totalHours / 24
        val hours = totalHours % 24
        return when {
            days > 0L -> "${days}日 ${hours}小时后结算"
            totalHours > 0L -> "${totalHours}小时后结算"
            else -> "1小时内结算"
        }
    }

    private fun extractResultError(result: ConvexResult<JsonElement>): String? =
        (result as? ConvexResult.Error)?.message

    private fun firstErrorMessage(vararg results: ConvexResult<JsonElement>): String? {
        for (result in results) {
            val message = extractResultError(result)
            if (!message.isNullOrBlank()) {
                return message
            }
        }
        return null
    }

    private fun buildArgs(vararg pairs: Pair<String, Any>): JsonObject {
        val map = pairs.associate { (k, v) ->
            k to when (v) {
                is Int -> JsonPrimitive(v)
                is Long -> JsonPrimitive(v)
                is Float -> JsonPrimitive(v)
                is Double -> JsonPrimitive(v)
                is Boolean -> JsonPrimitive(v)
                is String -> JsonPrimitive(v)
                is JsonObject -> v
                is JsonArray -> v
                else -> JsonPrimitive(v.toString())
            }
        }
        return JsonObject(map)
    }

    private fun jsonObject(vararg pairs: Pair<String, Any>): JsonObject = buildArgs(*pairs)

    private fun formatDate(ts: Long): String =
        SimpleDateFormat("yyyy.MM", Locale.getDefault()).format(Date(ts))

    private fun formatTime(ts: Long?): String {
        if (ts == null) return ""
        val now = System.currentTimeMillis()
        val diff = now - ts
        return when {
            diff < 60_000 -> "刚刚"
            diff < 3_600_000 -> "${diff / 60_000} 分钟前"
            diff < 86_400_000 -> "今天 ${SimpleDateFormat("HH:mm", Locale.getDefault()).format(Date(ts))}"
            diff < 172_800_000 -> "昨天 ${SimpleDateFormat("HH:mm", Locale.getDefault()).format(Date(ts))}"
            else -> SimpleDateFormat("MM-dd HH:mm", Locale.getDefault()).format(Date(ts))
        }
    }

    private fun JsonObject.getString(key: String): String? {
        val value = this[key] ?: return null
        if (value is JsonNull) return null
        return value.jsonPrimitive.content
    }

    private fun JsonObject.getInt(key: String): Int? = this[key]?.jsonPrimitive?.intOrNull

    private fun JsonObject.getLong(key: String): Long? = this[key]?.jsonPrimitive?.longOrNull

    private fun JsonObject.getBoolean(key: String): Boolean? = this[key]?.jsonPrimitive?.booleanOrNull

    private fun JsonObject.getArray(key: String): JsonArray? = this[key] as? JsonArray

    private fun JsonObject.getDoubleString(key: String): String? {
        val value = this[key] ?: return null
        if (value is JsonNull) return null
        return value.jsonPrimitive.content
    }

    private fun JsonObject.getObject(key: String): JsonObject? = this[key] as? JsonObject

    private fun JsonObject.getBooleanPath(parent: String, child: String): Boolean? =
        getObject(parent)?.getBoolean(child)

    private fun JsonObject.getStringPath(parent: String, child: String): String? =
        getObject(parent)?.getString(child)

    private data class TopikHistoryRecordWithSort(
        val sortTs: Long,
        val score: Int?,
        val mode: String,
        val row: TopikHistoryRecordUiModel,
    )

    private data class ReadingPagePayload(
        val page: ReadingPageUiModel,
        val pageCount: Int,
    )

    // ── Avatar / file upload ──────────────────────────────────────────
    override suspend fun getUploadUrl(
        filename: String,
        contentType: String,
        fileSize: Long,
        folder: String,
    ): PresignedUploadResult {
        val result = client.action(
            "storage:getUploadUrl",
            buildArgs("filename" to filename, "contentType" to contentType, "fileSize" to fileSize, "folder" to folder),
        )
        return when (result) {
            is ConvexResult.Success -> {
                val obj = result.value.jsonObject
                PresignedUploadResult(
                    success = true,
                    uploadUrl = obj.str("uploadUrl").orEmpty(),
                    publicUrl = obj.str("publicUrl").orEmpty(),
                    key = obj.str("key").orEmpty(),
                )
            }
            is ConvexResult.Error -> PresignedUploadResult(success = false, errorMessage = result.message)
        }
    }

    override suspend fun updateAvatar(publicUrl: String): MutationResult {
        val result = client.mutation("auth:updateUser", buildArgs("avatar" to publicUrl))
        return when (result) {
            is ConvexResult.Success -> MutationResult(success = true)
            is ConvexResult.Error -> MutationResult(success = false, errorMessage = result.message)
        }
    }

    // ── EPUB upload ────────────────────────────────────────────────────
    override suspend fun createEpubUploadDraft(
        title: String,
        author: String,
        description: String?,
        language: String,
        tags: List<String>,
        epubObjectKey: String,
    ): EpubUploadDraftResult {
        val args = mutableMapOf<String, Any>(
            "title" to title,
            "author" to author,
            "language" to language,
            "epubObjectKey" to epubObjectKey,
        )
        if (!description.isNullOrBlank()) args["description"] = description
        if (tags.isNotEmpty()) args["tags"] = tags
        val result = client.mutation("readingLibrary:createUploadDraft", buildArgs(*args.map { it.key to it.value }.toTypedArray()))
        return when (result) {
            is ConvexResult.Success -> {
                val obj = result.value.jsonObject
                EpubUploadDraftResult(success = true, bookId = obj.str("bookId").orEmpty(), slug = obj.str("slug").orEmpty())
            }
            is ConvexResult.Error -> EpubUploadDraftResult(success = false, errorMessage = result.message)
        }
    }

    // ── AI writing evaluation ──────────────────────────────────────────
    override suspend fun loadWritingEvaluation(sessionId: String): WritingEvaluationUiState {
        val result = client.query("aiWritingEvaluation:getEvaluations", buildArgs("sessionId" to sessionId))
        return when (result) {
            is ConvexResult.Success -> {
                val arr = result.value.jsonArray
                val questions = arr.mapNotNull { el ->
                    val obj = el.jsonObject
                    val dims = (obj["dimensions"] as? JsonArray)?.mapNotNull { d ->
                        val dObj = d.jsonObject
                        WritingDimensionScore(
                            name = dObj.str("name").orEmpty(),
                            score = dObj.int("score") ?: 0,
                            maxScore = dObj.int("maxScore") ?: 10,
                            feedback = dObj.str("feedback").orEmpty(),
                        )
                    }.orEmpty()
                    WritingQuestionEvaluation(
                        questionKey = obj.str("questionKey").orEmpty(),
                        questionLabel = obj.str("questionLabel").orEmpty().ifBlank { "问题 ${obj.str("questionKey").orEmpty()}" },
                        score = obj.int("score") ?: 0,
                        maxScore = obj.int("maxScore") ?: 10,
                        dimensions = dims,
                        feedbackText = obj.str("feedbackText").orEmpty(),
                        correctedText = obj.str("correctedText").orEmpty(),
                        originalText = obj.str("originalText").orEmpty(),
                    )
                }
                val totalScore = questions.sumOf { it.score }
                val totalMax = questions.sumOf { it.maxScore }
                WritingEvaluationUiState(
                    isLoading = false,
                    sessionId = sessionId,
                    totalScore = totalScore,
                    totalMaxScore = totalMax,
                    overallFeedback = "",
                    questions = questions,
                )
            }
            is ConvexResult.Error -> WritingEvaluationUiState(isLoading = false, sessionId = sessionId, errorMessage = result.message)
        }
    }

    // ── Podcast subscriptions ──────────────────────────────────────────
    override suspend fun loadPodcastSubscriptions(): PodcastSubscriptionsUiState {
        val result = client.query("podcasts:getSubscriptions", buildArgs())
        return when (result) {
            is ConvexResult.Success -> {
                val arr = result.value.jsonArray
                val subs = arr.mapNotNull { el ->
                    val obj = el.jsonObject
                    PodcastSubscriptionUiModel(
                        channelId = obj.str("_id").orEmpty(),
                        itunesId = obj.str("itunesId").orEmpty(),
                        title = obj.str("title").orEmpty(),
                        author = obj.str("author").orEmpty(),
                        artworkUrl = obj.str("artworkUrl").orEmpty(),
                        feedUrl = obj.str("feedUrl").orEmpty(),
                    )
                }
                PodcastSubscriptionsUiState(isLoading = false, subscriptions = subs)
            }
            is ConvexResult.Error -> PodcastSubscriptionsUiState(isLoading = false, errorMessage = result.message)
        }
    }

    override suspend fun togglePodcastSubscription(
        itunesId: String,
        title: String,
        author: String,
        feedUrl: String,
        artworkUrl: String,
    ): MutationResult {
        val channel = mapOf(
            "itunesId" to itunesId,
            "title" to title,
            "author" to author,
            "feedUrl" to feedUrl,
            "artworkUrl" to artworkUrl,
        )
        val result = client.mutation("podcasts:toggleSubscription", buildArgs("channel" to channel))
        return when (result) {
            is ConvexResult.Success -> MutationResult(success = true)
            is ConvexResult.Error -> MutationResult(success = false, errorMessage = result.message)
        }
    }

    // ── Subscription / payment details ─────────────────────────────────
    override suspend fun loadSubscriptionDetail(): SubscriptionDetailUiState {
        val result = client.query("android:getSubscriptionDetail", buildArgs())
        return when (result) {
            is ConvexResult.Success -> {
                val obj = result.value.jsonObject
                SubscriptionDetailUiState(
                    isLoading = false,
                    planName = obj.str("planName").orEmpty(),
                    billingInterval = obj.str("billingInterval").orEmpty(),
                    status = obj.str("status").orEmpty(),
                    nextBillingDate = obj.str("nextBillingDate").orEmpty(),
                    monthlyPrice = obj.str("monthlyPrice").orEmpty(),
                    annualPrice = obj.str("annualPrice").orEmpty(),
                    features = (obj["features"] as? JsonArray)?.mapNotNull { it.jsonPrimitive.contentOrNull }.orEmpty(),
                    isMember = obj.getBoolean("isMember") ?: false,
                )
            }
            is ConvexResult.Error -> SubscriptionDetailUiState(isLoading = false, errorMessage = result.message)
        }
    }

    override suspend fun createCheckout(plan: String, billingInterval: String): CheckoutResult {
        val result = client.action("lemonsqueezy:createCheckout", buildArgs("plan" to plan, "billingInterval" to billingInterval))
        return when (result) {
            is ConvexResult.Success -> {
                val obj = result.value.jsonObject
                CheckoutResult(success = true, checkoutUrl = obj.str("checkoutUrl").orEmpty())
            }
            is ConvexResult.Error -> CheckoutResult(success = false, errorMessage = result.message)
        }
    }

    // ── Reading article ────────────────────────────────────────────────
    override suspend fun loadReadingArticle(articleId: String): ReadingArticleUiState {
        val result = client.query("news:getById", buildArgs("articleId" to articleId))
        return when (result) {
            is ConvexResult.Success -> {
                val obj = result.value.jsonObject
                ReadingArticleUiState(
                    isLoading = false,
                    articleId = articleId,
                    title = obj.str("title").orEmpty(),
                    source = obj.str("source").orEmpty(),
                    pubDate = obj.str("pubDate").orEmpty().let { formatRelativeTime(it.toLongOrNull()) },
                    body = obj.str("body").orEmpty(),
                    bodyTranslation = obj.str("bodyTranslation").orEmpty(),
                    tags = (obj["tags"] as? JsonArray)?.mapNotNull { it.jsonPrimitive.contentOrNull }.orEmpty(),
                    isRead = obj.getBoolean("isRead") ?: false,
                )
            }
            is ConvexResult.Error -> ReadingArticleUiState(isLoading = false, articleId = articleId, errorMessage = result.message)
        }
    }

    override suspend fun markArticleRead(articleId: String): MutationResult {
        val result = client.mutation("news:markArticleRead", buildArgs("articleId" to articleId))
        return when (result) {
            is ConvexResult.Success -> MutationResult(success = true)
            is ConvexResult.Error -> MutationResult(success = false, errorMessage = result.message)
        }
    }

    // ── Social sharing ─────────────────────────────────────────────────
    override suspend fun generateShareUrl(type: String, id: String?): MutationResult {
        val args = mutableListOf<Pair<String, Any>>("type" to type)
        if (!id.isNullOrBlank()) args.add("id" to id)
        val result = client.query("android:getShareUrl", buildArgs(*args.toTypedArray()))
        return when (result) {
            is ConvexResult.Success -> {
                val url = result.value.jsonPrimitive.contentOrNull.orEmpty()
                MutationResult(success = url.isNotBlank(), errorMessage = if (url.isBlank()) "无法生成分享链接" else url)
            }
            is ConvexResult.Error -> MutationResult(success = false, errorMessage = result.message)
        }
    }

    private companion object {
        const val PREFS_NAME = "hangyeol_convex_content_cache"
        const val PREF_KEY_DICTIONARY_RECENT = "dictionary_recent_queries"
        const val MAX_READER_PAGES = 30
        val READING_ACCENTS = listOf("pink", "butter", "mint", "lilac", "sky")
    }
}
