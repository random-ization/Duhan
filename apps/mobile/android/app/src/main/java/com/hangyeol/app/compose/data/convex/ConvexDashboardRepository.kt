package com.hangyeol.app.compose.data.convex

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.intPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.hangyeol.app.compose.data.DailyChallengeClaimResult
import com.hangyeol.app.compose.data.DashboardAchievement
import com.hangyeol.app.compose.data.DashboardChallengeCard
import com.hangyeol.app.compose.data.DashboardFeedItem
import com.hangyeol.app.compose.data.DashboardPathItem
import com.hangyeol.app.compose.data.DashboardRepository
import com.hangyeol.app.compose.data.DashboardTodayStep
import com.hangyeol.app.compose.data.DashboardUiState
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.flow.first
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.booleanOrNull
import kotlinx.serialization.json.intOrNull
import kotlinx.serialization.json.jsonPrimitive
import java.time.LocalDate
import java.time.LocalTime

private const val DASHBOARD_CACHE_NAME = "hangyeol_dashboard_cache"
private val Context.dashboardCache by preferencesDataStore(name = DASHBOARD_CACHE_NAME)

private object DashboardCacheKeys {
    val streakDays = intPreferencesKey("streak_days")
    val badgesUnlocked = intPreferencesKey("badges_unlocked")
    val reviewCount = intPreferencesKey("review_count")
    val completedTopics = intPreferencesKey("completed_topics")
    val challengeTitle = stringPreferencesKey("challenge_title")
    val challengeSubtitle = stringPreferencesKey("challenge_subtitle")
    val challengeProgress = stringPreferencesKey("challenge_progress")
    val challengeReward = stringPreferencesKey("challenge_reward")
    val challengeBadge = stringPreferencesKey("challenge_badge")
    val challengeAction = stringPreferencesKey("challenge_action")
    val challengeRoute = stringPreferencesKey("challenge_route")
    val resumeTitle = stringPreferencesKey("resume_title")
    val resumeSubtitle = stringPreferencesKey("resume_subtitle")
}

class ConvexDashboardRepository(
    private val context: Context,
    private val convexClient: ConvexClient,
) : DashboardRepository {

    override suspend fun loadDashboard(): DashboardUiState {
        // Load cache for instant display
        val cache = context.dashboardCache.data.first()
        val cachedChallenge = parseChallengeCardFromCache(cache)
        val cachedReviewCount = cache[DashboardCacheKeys.reviewCount]
        val cachedStreakDays = cache[DashboardCacheKeys.streakDays]
        val cachedBadges = cache[DashboardCacheKeys.badgesUnlocked]
        val cachedTopics = cache[DashboardCacheKeys.completedTopics]
        val cachedState = DashboardUiState(
            isLoading = false,
            dateLabel = currentDateLabel(),
            greeting = currentGreeting(),
            pathItems = defaultPathItems(cachedReviewCount),
            achievements = listOf(
                DashboardAchievement("🔥", formatDays(cachedStreakDays), "连续学习"),
                DashboardAchievement("🏅", formatCount(cachedBadges), "已解锁徽章"),
                DashboardAchievement("📚", formatCount(cachedTopics), "词汇/语法"),
            ),
            feedItems = emptyList(),
            resumeTitle = cache[DashboardCacheKeys.resumeTitle] ?: "",
            resumeSubtitle = cache[DashboardCacheKeys.resumeSubtitle] ?: "",
            resumeRoute = "main/grammar",
            challengeCard = cachedChallenge,
            challengeTitle = cachedChallenge?.title ?: "",
            challengeSubtitle = cachedChallenge?.subtitle ?: "",
            challengeRoute = cachedChallenge?.route ?: "",
            todaySteps = buildTodaySteps(
                reviewCount = cachedReviewCount,
                challengeCard = cachedChallenge,
            ),
        )

        // Fetch fresh data from Convex
        return try {
            fetchFreshDashboard(cachedState)
        } catch (_: Exception) {
            cachedState
        }
    }

    override suspend fun claimDailyChallenge(): DailyChallengeClaimResult {
        val result = convexClient.mutation("dailyChallenges:claimReward")
        return when (result) {
            is ConvexResult.Success -> DailyChallengeClaimResult(success = true)
            is ConvexResult.Error -> DailyChallengeClaimResult(
                success = false,
                errorMessage = result.message,
            )
        }
    }

    override suspend fun markNotificationsRead(): DailyChallengeClaimResult {
        val result = convexClient.mutation("notifications:markAllRead")
        return when (result) {
            is ConvexResult.Success -> DailyChallengeClaimResult(success = true)
            is ConvexResult.Error -> DailyChallengeClaimResult(
                success = false,
                errorMessage = result.message,
            )
        }
    }

    override suspend fun likeActivity(activityId: String): DailyChallengeClaimResult {
        val result = convexClient.mutation("community:likeActivity", buildArgs("activityId" to activityId))
        return when (result) {
            is ConvexResult.Success -> DailyChallengeClaimResult(success = true)
            is ConvexResult.Error -> DailyChallengeClaimResult(
                success = false,
                errorMessage = result.message,
            )
        }
    }

    override suspend fun unlikeActivity(activityId: String): DailyChallengeClaimResult {
        val result = convexClient.mutation("community:unlikeActivity", buildArgs("activityId" to activityId))
        return when (result) {
            is ConvexResult.Success -> DailyChallengeClaimResult(success = true)
            is ConvexResult.Error -> DailyChallengeClaimResult(
                success = false,
                errorMessage = result.message,
            )
        }
    }

    private suspend fun fetchFreshDashboard(fallback: DashboardUiState): DashboardUiState = coroutineScope {
        val statsDeferred = async { convexClient.query("userStats:getStats") }
        val reviewDeferred = async { convexClient.query("vocab:getReviewSummary") }
        val dailyPhraseDeferred = async { convexClient.query("vocab:getDailyPhrase", buildArgs("language" to "zh")) }
        val examAttemptsDeferred = async { convexClient.query("user:getExamAttempts", buildArgs("limit" to 6)) }
        val podcastHistoryDeferred = async { convexClient.query("podcasts:getHistory") }
        val grammarDeferred = async {
            convexClient.query(
                "grammars:getByCourse",
                buildArgs("courseId" to "topik-grammar", "language" to "zh"),
            )
        }
        val challengeDeferred = async { convexClient.query("android:getDailyChallengeCard", buildArgs("language" to "zh")) }
        val recommendDeferred = async {
            convexClient.query("recommendations:getNextBestAction", buildArgs("localHour" to LocalTime.now().hour))
        }
        val communityDeferred = async {
            convexClient.query("community:getRecentFriendActivity", buildArgs("limit" to 5))
        }
        val weakVocabDeferred = async {
            convexClient.query("weakPoints:getWeakVocabCategories", buildArgs("limit" to 3, "language" to "zh"))
        }
        val unreadDeferred = async { convexClient.query("notifications:getUnreadCount") }
        val rankDeferred = async { convexClient.query("leaderboard:getMyRank") }
        val activePartnershipDeferred = async { convexClient.query("partnerships:getActivePartnership") }
        val pendingPartnershipsDeferred = async { convexClient.query("partnerships:listPending") }

        val stats = statsDeferred.await()
        val review = reviewDeferred.await()
        val dailyPhrase = dailyPhraseDeferred.await()
        val examAttempts = examAttemptsDeferred.await()
        val podcastHistory = podcastHistoryDeferred.await()
        val grammar = grammarDeferred.await()
        val challenge = challengeDeferred.await()
        val recommend = recommendDeferred.await()
        val community = communityDeferred.await()
        val weakVocab = weakVocabDeferred.await()
        val unread = unreadDeferred.await()
        val rank = rankDeferred.await()
        val activePartnership = activePartnershipDeferred.await()
        val pendingPartnerships = pendingPartnershipsDeferred.await()

        val streakDays = extractInt(stats, "streakDays", "streak") ?: 0
        val badgesUnlocked = extractInt(stats, "badgesUnlocked") ?: 0
        val completedTopics =
            (extractInt(stats, "masteredVocabCount")
                ?: extractInt(stats, "totalWordsLearned", "totalGrammarLearned")
                ?: 0)
        val reviewCount = extractInt(review, "dueCount", "dueNow") ?: 0
        val challengeCard = parseChallengeCard(challenge)

        val recommendation = parseRecommendationCard(recommend)
        val resumeTitle = recommendation?.title ?: fallback.resumeTitle
        val resumeSubtitle = recommendation?.subtitle ?: fallback.resumeSubtitle

        val feedItems = parseCommunityFeed(community)
        val todaySteps = buildTodaySteps(reviewCount, recommendation, challengeCard)
        val dailyPhrasePair = parseDailyPhrase(dailyPhrase)
        val topikAttemptCount = countRows(examAttempts)
        val podcastHistoryCount = countRows(podcastHistory)
        val grammarCount = countRows(grammar)
        val weakPointLabel = parseWeakVocabLabel(weakVocab)
        val unreadNotificationCount = extractScalarInt(unread) ?: 0
        val leaderboardLabel = parseLeaderboardLabel(rank)
        val partnershipLabel = parsePartnershipLabel(activePartnership, pendingPartnerships)

        // Persist cache
        context.dashboardCache.edit { prefs ->
            prefs[DashboardCacheKeys.streakDays] = streakDays
            prefs[DashboardCacheKeys.badgesUnlocked] = badgesUnlocked
            prefs[DashboardCacheKeys.reviewCount] = reviewCount
            prefs[DashboardCacheKeys.completedTopics] = completedTopics
            prefs[DashboardCacheKeys.resumeTitle] = resumeTitle
            prefs[DashboardCacheKeys.resumeSubtitle] = resumeSubtitle
            if (challengeCard != null) {
                prefs[DashboardCacheKeys.challengeTitle] = challengeCard.title
                prefs[DashboardCacheKeys.challengeSubtitle] = challengeCard.subtitle
                prefs[DashboardCacheKeys.challengeProgress] = challengeCard.progressText
                prefs[DashboardCacheKeys.challengeReward] = challengeCard.rewardText
                prefs[DashboardCacheKeys.challengeBadge] = challengeCard.badgeLabel
                prefs[DashboardCacheKeys.challengeAction] = challengeCard.actionLabel
                prefs[DashboardCacheKeys.challengeRoute] = challengeCard.route
            }
        }

        DashboardUiState(
            isLoading = false,
            dateLabel = currentDateLabel(),
            greeting = currentGreeting(),
            dailyPhraseKorean = dailyPhrasePair.first,
            dailyPhraseTranslation = dailyPhrasePair.second,
            unreadNotificationCount = unreadNotificationCount,
            topikAttemptCount = topikAttemptCount,
            podcastHistoryCount = podcastHistoryCount,
            weakPointLabel = weakPointLabel,
            leaderboardLabel = leaderboardLabel,
            partnershipLabel = partnershipLabel,
            pathItems = defaultPathItems(reviewCount),
            achievements = listOf(
                DashboardAchievement("🔥", "$streakDays 天", "连续学习"),
                DashboardAchievement("🏅", badgesUnlocked.toString(), "已解锁徽章"),
                DashboardAchievement("📚", (completedTopics + grammarCount).toString(), "词汇/语法"),
            ),
            feedItems = feedItems,
            resumeTitle = resumeTitle,
            resumeSubtitle = resumeSubtitle,
            resumeRoute = recommendation?.route ?: fallback.resumeRoute,
            challengeCard = challengeCard,
            challengeTitle = challengeCard?.title ?: "",
            challengeSubtitle = challengeCard?.subtitle ?: "",
            challengeRoute = challengeCard?.route ?: "",
            todaySteps = todaySteps,
        )
    }

    private fun parseCommunityFeed(result: ConvexResult<kotlinx.serialization.json.JsonElement>): List<DashboardFeedItem> {
        if (result !is ConvexResult.Success) return emptyList()
        val arr = result.value as? JsonArray ?: return emptyList()
        return arr.take(5).mapNotNull { item ->
            val obj = item as? JsonObject ?: return@mapNotNull null
            val actor = obj.getString("actorName") ?: "学习伙伴"
            val module = resolveModuleLabel(obj.getString("module"))
            val itemCount = obj.getInt("itemCount") ?: 0
            val score = obj.getInt("score")
            val eventName = obj.getString("eventName").orEmpty()
            val title = when {
                eventName.contains("exam", ignoreCase = true) && score != null ->
                    "完成了 $module，得分 $score 分"
                itemCount > 0 -> "完成了 $module · $itemCount 项"
                else -> "刚完成了 $module 训练"
            }
            val time = formatRelativeTime(obj.getLong("eventAt"))
            DashboardFeedItem(
                title = title,
                time = time,
                actorName = actor,
                badgeLabel = communityBadgeLabel(eventName),
                tone = communityBadgeTone(eventName),
                emoji = communityBadgeEmoji(eventName),
                activityId = obj.getString("activityId").orEmpty(),
                likeCount = (obj.getInt("likeCount") ?: 0).coerceAtLeast(0),
                likedByMe = obj.getBoolean("likedByMe") == true,
            )
        }
    }

    private fun parseChallengeCard(
        result: ConvexResult<kotlinx.serialization.json.JsonElement>,
    ): DashboardChallengeCard? {
        if (result !is ConvexResult.Success) return null
        val obj = result.value as? JsonObject ?: return null
        val title = obj.getString("title") ?: return null
        val route = obj.getString("route") ?: "main/topik"
        return DashboardChallengeCard(
            title = title,
            subtitle = obj.getString("subtitle") ?: "",
            progressText = obj.getString("progressText") ?: "",
            rewardText = obj.getString("rewardText") ?: "",
            badgeLabel = obj.getString("badgeLabel") ?: "今日挑战",
            actionLabel = obj.getString("actionLabel") ?: "继续挑战",
            route = route,
            isCompleted = obj.getBoolean("isCompleted") == true,
            isClaimed = obj.getBoolean("isClaimed") == true,
        )
    }

    private fun parseChallengeCardFromCache(
        cache: androidx.datastore.preferences.core.Preferences,
    ): DashboardChallengeCard? {
        val title = cache[DashboardCacheKeys.challengeTitle] ?: return null
        val route = cache[DashboardCacheKeys.challengeRoute] ?: "main/topik"
        return DashboardChallengeCard(
            title = title,
            subtitle = cache[DashboardCacheKeys.challengeSubtitle] ?: "",
            progressText = cache[DashboardCacheKeys.challengeProgress] ?: "",
            rewardText = cache[DashboardCacheKeys.challengeReward] ?: "",
            badgeLabel = cache[DashboardCacheKeys.challengeBadge] ?: "今日挑战",
            actionLabel = cache[DashboardCacheKeys.challengeAction] ?: "继续挑战",
            route = route,
            isCompleted = false,
            isClaimed = false,
        )
    }

    private fun parseRecommendationCard(
        result: ConvexResult<kotlinx.serialization.json.JsonElement>,
    ): DashboardRecommendationCard? {
        if (result !is ConvexResult.Success) return null
        val obj = result.value as? JsonObject ?: return null
        val kind = obj.getString("kind") ?: return null
        val count = obj.getInt("count") ?: 0
        val title = when (kind) {
            "review_due_vocab" -> "继续词汇复习"
            "continue_course" -> "继续课程学习"
            "exam_practice" -> "继续 TOPIK 练习"
            "podcast_resume" -> "继续播客听力"
            "reading_continue" -> "继续阅读"
            "typing_drill" -> "继续打字训练"
            "new_vocab" -> "学习新词"
            else -> "继续学习"
        }
        val subtitle = when (kind) {
            "review_due_vocab" -> "当前有 $count 个到期词卡"
            "continue_course" -> "保持学习连贯节奏"
            "exam_practice" -> "推进客观题与写作训练"
            "podcast_resume" -> "利用碎片时间保持输入"
            "reading_continue" -> "继续当前阅读进度"
            "typing_drill" -> "巩固韩语输入速度"
            "new_vocab" -> "开始新的词汇学习"
            else -> "打开下一步推荐任务"
        }
        val route = recommendationPathToRoute(obj.getString("path"), kind)
        val tone = recommendationTone(kind)
        val seal = recommendationSeal(kind)
        return DashboardRecommendationCard(
            title = title,
            subtitle = subtitle,
            route = route,
            tone = tone,
            seal = seal,
            kind = kind,
        )
    }

    private fun recommendationPathToRoute(path: String?, kind: String): String {
        val normalizedPath = path?.trim().orEmpty()
        return when {
            normalizedPath.endsWith("/review") -> "main/review"
            normalizedPath.endsWith("/reading") -> "main/reading"
            normalizedPath.endsWith("/media") -> "main/podcasts"
            normalizedPath.endsWith("/courses") -> "main/grammar"
            normalizedPath.endsWith("/typing") -> "main/vocab"
            normalizedPath.endsWith("/topik") -> "main/topik"
            kind == "podcast_resume" -> "main/podcasts"
            kind == "exam_practice" -> "main/topik"
            kind == "reading_continue" -> "main/reading"
            kind == "continue_course" -> "main/grammar"
            else -> "main/review"
        }
    }

    private fun recommendationTone(kind: String): String = when (kind) {
        "podcast_resume" -> "butter"
        "reading_continue" -> "mint"
        "exam_practice" -> "lilac"
        "continue_course" -> "mint"
        "new_vocab" -> "pink"
        else -> "pink"
    }

    private fun recommendationSeal(kind: String): String = when (kind) {
        "podcast_resume" -> "聽"
        "reading_continue" -> "讀"
        "exam_practice" -> "試"
        "continue_course" -> "文"
        "new_vocab" -> "新"
        else -> "復"
    }

    private fun buildTodaySteps(
        reviewCount: Int?,
        recommendation: DashboardRecommendationCard? = null,
        challengeCard: DashboardChallengeCard? = null,
    ): List<DashboardTodayStep> {
        val normalizedReviewCount = reviewCount?.coerceAtLeast(0)
        val reviewStep = DashboardTodayStep(
            kind = "复习",
            mins = when {
                normalizedReviewCount == null -> 5
                normalizedReviewCount >= 30 -> 12
                normalizedReviewCount >= 10 -> 8
                normalizedReviewCount > 0 -> 5
                else -> 3
            },
            title = "待复习词卡 ${normalizedReviewCount?.toString() ?: "--"} 个",
            subtitle = "FSRS · 到期卡片",
            tone = "pink",
            seal = "復",
            route = "main/review",
        )
        val recommendationStep = DashboardTodayStep(
            kind = recommendation?.kind?.let(::recommendationKindLabel) ?: "学习",
            mins = 6,
            title = recommendation?.title ?: "继续当前学习任务",
            subtitle = recommendation?.subtitle ?: "按推荐节奏推进课程",
            tone = recommendation?.tone ?: "mint",
            seal = recommendation?.seal ?: "學",
            route = recommendation?.route ?: "main/grammar",
        )
        val challengeStep = DashboardTodayStep(
            kind = "TOPIK",
            mins = 4,
            title = challengeCard?.title ?: "今日挑战待刷新",
            subtitle = challengeCard?.subtitle ?: "等待挑战数据同步",
            tone = "lilac",
            seal = "試",
            route = challengeCard?.route ?: "main/topik",
        )
        return listOf(reviewStep, recommendationStep, challengeStep)
    }

    private fun recommendationKindLabel(kind: String): String = when (kind) {
        "review_due_vocab" -> "复习"
        "continue_course" -> "语法"
        "exam_practice" -> "TOPIK"
        "podcast_resume" -> "收听"
        "reading_continue" -> "阅读"
        "typing_drill" -> "打字"
        "new_vocab" -> "新词"
        else -> "学习"
    }

    private fun parseDailyPhrase(
        result: ConvexResult<kotlinx.serialization.json.JsonElement>,
    ): Pair<String, String> {
        if (result !is ConvexResult.Success) return "" to ""
        val obj = result.value as? JsonObject ?: return "" to ""
        return (obj.getString("korean") ?: "") to (obj.getString("translationZh") ?: obj.getString("translation") ?: "")
    }

    private fun countRows(result: ConvexResult<kotlinx.serialization.json.JsonElement>): Int {
        if (result !is ConvexResult.Success) return 0
        return when (val value = result.value) {
            is JsonArray -> value.size
            is JsonObject -> {
                val candidates = listOf("items", "rows", "data", "history", "entries")
                candidates.firstNotNullOfOrNull { key -> (value[key] as? JsonArray)?.size } ?: 0
            }
            else -> 0
        }
    }

    private fun extractScalarInt(result: ConvexResult<kotlinx.serialization.json.JsonElement>): Int? {
        if (result !is ConvexResult.Success) return null
        return (result.value as? JsonPrimitive)?.intOrNull
    }

    private fun parseWeakVocabLabel(result: ConvexResult<kotlinx.serialization.json.JsonElement>): String {
        if (result !is ConvexResult.Success) return ""
        val first = (result.value as? JsonArray)?.firstOrNull() as? JsonObject ?: return ""
        val label = first.getString("partOfSpeech") ?: first.getString("categoryLabel") ?: first.getString("label") ?: return ""
        val count = first.getInt("wordCount")
        return if (count != null && count > 0) "$label · $count 词" else label
    }

    private fun parseLeaderboardLabel(result: ConvexResult<kotlinx.serialization.json.JsonElement>): String {
        if (result !is ConvexResult.Success) return ""
        val obj = result.value as? JsonObject ?: return ""
        val total = obj.getInt("totalRanked")
        val myEntry = obj["myEntry"] as? JsonObject
        val rank = myEntry?.getInt("rank")
        return when {
            rank != null && total != null && total > 0 -> "本周第 $rank / $total"
            total != null && total > 0 -> "本周 $total 人上榜"
            else -> ""
        }
    }

    private fun parsePartnershipLabel(
        activeResult: ConvexResult<kotlinx.serialization.json.JsonElement>,
        pendingResult: ConvexResult<kotlinx.serialization.json.JsonElement>,
    ): String {
        val active = (activeResult as? ConvexResult.Success)?.value as? JsonObject
        if (active != null) {
            val partner = active.getString("partnerName") ?: active.getString("displayName") ?: active.getString("name")
            val streak = active.getInt("combinedStreak")
            return listOfNotNull(
                partner?.takeIf { it.isNotBlank() }?.let { "搭档 $it" },
                streak?.takeIf { it > 0 }?.let { "共同连续 $it 天" },
            ).joinToString(" · ").ifBlank { "学习搭档进行中" }
        }
        val pendingCount = countRows(pendingResult)
        return if (pendingCount > 0) "$pendingCount 个搭档请求" else ""
    }

    private fun extractInt(result: ConvexResult<kotlinx.serialization.json.JsonElement>, vararg keys: String): Int? {
        if (result !is ConvexResult.Success) return null
        val obj = result.value as? JsonObject ?: return null
        for (key in keys) {
            val value = obj[key]?.jsonPrimitive?.intOrNull
            if (value != null) return value
        }
        return null
    }

    private fun extractString(result: ConvexResult<kotlinx.serialization.json.JsonElement>, vararg keys: String): String? {
        if (result !is ConvexResult.Success) return null
        val obj = result.value as? JsonObject ?: return null
        for (key in keys) {
            val value = obj[key] ?: continue
            if (value is JsonNull) continue
            return value.jsonPrimitive.content
        }
        return null
    }

    private fun buildArgs(vararg pairs: Pair<String, Any>): JsonObject {
        val map = pairs.associate { (k, v) ->
            k to when (v) {
                is Int -> kotlinx.serialization.json.JsonPrimitive(v)
                is String -> kotlinx.serialization.json.JsonPrimitive(v)
                is Boolean -> kotlinx.serialization.json.JsonPrimitive(v)
                else -> kotlinx.serialization.json.JsonPrimitive(v.toString())
            }
        }
        return JsonObject(map)
    }

    private fun defaultPathItems(reviewCount: Int?) = listOf(
        DashboardPathItem("复习", "待复习词卡 ${reviewCount?.toString() ?: "--"} 个", "main/review"),
        DashboardPathItem("语法", "TOPIK 语法练习", "main/grammar"),
        DashboardPathItem("挑战", "开始今日学习任务", "main/topik"),
    )

    private fun formatCount(value: Int?): String = value?.toString() ?: "--"

    private fun formatDays(value: Int?): String = value?.let { "$it 天" } ?: "--"

    private fun resolveModuleLabel(module: String?): String = when (module?.uppercase()) {
        "VOCAB" -> "词汇"
        "GRAMMAR" -> "语法"
        "READING" -> "阅读"
        "LISTENING" -> "听力"
        "PODCAST" -> "播客"
        "EXAM" -> "TOPIK"
        "TYPING" -> "打字"
        else -> "学习"
    }

    private fun communityBadgeLabel(eventName: String): String = when {
        eventName.contains("exam", ignoreCase = true) -> "考試"
        eventName.contains("review", ignoreCase = true) -> "复习"
        eventName.contains("content", ignoreCase = true) -> "里程碑"
        else -> "动态"
    }

    private fun communityBadgeTone(eventName: String): String = when {
        eventName.contains("exam", ignoreCase = true) -> "ink"
        eventName.contains("review", ignoreCase = true) -> "crimson"
        eventName.contains("content", ignoreCase = true) -> "butter"
        else -> "muted"
    }

    private fun communityBadgeEmoji(eventName: String): String = when {
        eventName.contains("exam", ignoreCase = true) -> "📝"
        eventName.contains("review", ignoreCase = true) -> "📘"
        eventName.contains("content", ignoreCase = true) -> "🌱"
        else -> "📚"
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

    private fun JsonObject.getString(key: String): String? {
        val value = this[key] ?: return null
        if (value is JsonNull) return null
        return value.jsonPrimitive.content
    }

    private fun JsonObject.getInt(key: String): Int? = this[key]?.jsonPrimitive?.intOrNull

    private fun JsonObject.getLong(key: String): Long? = this[key]?.jsonPrimitive?.content?.toLongOrNull()

    private fun JsonObject.getBoolean(key: String): Boolean? = this[key]?.jsonPrimitive?.booleanOrNull

    private fun currentDateLabel(now: LocalDate = LocalDate.now()): String {
        val months = listOf("一月", "二月", "三月", "四月", "五月", "六月", "七月", "八月", "九月", "十月", "十一月", "十二月")
        return "${months[now.monthValue - 1]} ${now.dayOfMonth}日"
    }

    private fun currentGreeting(now: LocalTime = LocalTime.now()): String = when (now.hour) {
        in 0..5 -> "凌晨"
        in 6..11 -> "早上"
        in 12..17 -> "下午"
        else -> "晚上"
    }

    private data class DashboardRecommendationCard(
        val title: String,
        val subtitle: String,
        val route: String,
        val tone: String,
        val seal: String,
        val kind: String,
    )
}
