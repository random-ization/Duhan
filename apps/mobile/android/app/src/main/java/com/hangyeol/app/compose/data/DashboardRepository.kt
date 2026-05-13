package com.hangyeol.app.compose.data

import androidx.annotation.StringRes

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.intPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import java.time.LocalDate
import java.time.LocalTime
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.first

data class DashboardPathItem(
  val label: String,
  val title: String,
  val route: String,
)

data class DashboardAchievement(
  val emoji: String,
  val value: String,
  val label: String,
)

data class DashboardFeedItem(
  val title: String,
  val time: String,
  val actorName: String = "",
  val badgeLabel: String = "",
  val tone: String = "muted",
  val emoji: String = "📚",
  val activityId: String = "",
  val likeCount: Int = 0,
  val likedByMe: Boolean = false,
)

data class DashboardChallengeCard(
  val title: String,
  val subtitle: String,
  val progressText: String,
  val rewardText: String,
  val badgeLabel: String,
  val actionLabel: String,
  val route: String,
  val isCompleted: Boolean,
  val isClaimed: Boolean,
)

data class DashboardTodayStep(
  val kind: String,
  @StringRes val kindRes: Int = 0,
  val mins: Int,
  val title: String = "",
  @StringRes val titleRes: Int = 0,
  val titleArgs: List<Any> = emptyList(),
  val subtitle: String = "",
  @StringRes val subtitleRes: Int = 0,
  val tone: String,
  val seal: String,
  val route: String,
)

data class DashboardUiState(
  val isLoading: Boolean = true,
  val dateLabel: String = "",
  val greeting: String = "",
  val dailyPhraseKorean: String = "",
  val dailyPhraseTranslation: String = "",
  val unreadNotificationCount: Int = 0,
  val topikAttemptCount: Int = 0,
  val podcastHistoryCount: Int = 0,
  val weakPointLabel: String = "",
  val leaderboardLabel: String = "",
  val partnershipLabel: String = "",
  val pathItems: List<DashboardPathItem> = emptyList(),
  val achievements: List<DashboardAchievement> = emptyList(),
  val feedItems: List<DashboardFeedItem> = emptyList(),
  val resumeTitle: String = "",
  val resumeSubtitle: String = "",
  val resumeRoute: String = "",
  val challengeCard: DashboardChallengeCard? = null,
  val challengeTitle: String = "",
  val challengeSubtitle: String = "",
  val challengeRoute: String = "",
  val todaySteps: List<DashboardTodayStep> = emptyList(),
)

data class DailyChallengeClaimResult(
  val success: Boolean,
  val errorMessage: String? = null,
)

interface DashboardRepository {
  suspend fun loadDashboard(): DashboardUiState

  suspend fun claimDailyChallenge(): DailyChallengeClaimResult =
    DailyChallengeClaimResult(success = false, errorMessage = "此仓储不支持领取挑战奖励")

  suspend fun markNotificationsRead(): DailyChallengeClaimResult =
    DailyChallengeClaimResult(success = false, errorMessage = "此仓储不支持标记通知已读")

  suspend fun likeActivity(activityId: String): DailyChallengeClaimResult =
    DailyChallengeClaimResult(success = false, errorMessage = "此仓储不支持点赞")

  suspend fun unlikeActivity(activityId: String): DailyChallengeClaimResult =
    DailyChallengeClaimResult(success = false, errorMessage = "此仓储不支持取消点赞")
}

class InMemoryDashboardRepository : DashboardRepository {
  override suspend fun loadDashboard(): DashboardUiState {
    delay(250)
    return buildDashboardState(
      streakDays = 12,
      badgesUnlocked = 6,
      completedTopics = 9,
      reviewCount = 24,
    )
  }
}

private const val DASHBOARD_DATASTORE_NAME = "hangyeol_compose_dashboard"
private val Context.dashboardDataStore by preferencesDataStore(name = DASHBOARD_DATASTORE_NAME)

private object DashboardPreferenceKeys {
  val streakDays = intPreferencesKey("dashboard_streak_days")
  val badgesUnlocked = intPreferencesKey("dashboard_badges_unlocked")
  val completedTopics = intPreferencesKey("dashboard_completed_topics")
  val reviewCount = intPreferencesKey("dashboard_review_count")
}

class DataStoreDashboardRepository(
  private val context: Context,
) : DashboardRepository {
  override suspend fun loadDashboard(): DashboardUiState {
    delay(120)
    ensureSeeded()
    val preferences = context.dashboardDataStore.data.first()
    return buildDashboardState(
      streakDays = preferences[DashboardPreferenceKeys.streakDays] ?: 12,
      badgesUnlocked = preferences[DashboardPreferenceKeys.badgesUnlocked] ?: 6,
      completedTopics = preferences[DashboardPreferenceKeys.completedTopics] ?: 9,
      reviewCount = preferences[DashboardPreferenceKeys.reviewCount] ?: 24,
    )
  }

  private suspend fun ensureSeeded() {
    context.dashboardDataStore.edit { preferences ->
      if (preferences[DashboardPreferenceKeys.streakDays] == null) {
        preferences[DashboardPreferenceKeys.streakDays] = 12
      }
      if (preferences[DashboardPreferenceKeys.badgesUnlocked] == null) {
        preferences[DashboardPreferenceKeys.badgesUnlocked] = 6
      }
      if (preferences[DashboardPreferenceKeys.completedTopics] == null) {
        preferences[DashboardPreferenceKeys.completedTopics] = 9
      }
      if (preferences[DashboardPreferenceKeys.reviewCount] == null) {
        preferences[DashboardPreferenceKeys.reviewCount] = 24
      }
    }
  }
}

private fun buildDashboardState(
  streakDays: Int,
  badgesUnlocked: Int,
  completedTopics: Int,
  reviewCount: Int,
): DashboardUiState =
  DashboardUiState(
    isLoading = false,
    dateLabel = currentDashboardDateLabel(),
    greeting = currentDashboardGreeting(),
    dailyPhraseKorean = "",
    dailyPhraseTranslation = "",
    unreadNotificationCount = 0,
    topikAttemptCount = 0,
    podcastHistoryCount = 0,
    weakPointLabel = "",
    leaderboardLabel = "",
    partnershipLabel = "",
    pathItems =
      listOf(
        DashboardPathItem("复习", "昨日单词 $reviewCount 个", "main/review"),
        DashboardPathItem("语法", "TOPIK 语法练习", "main/grammar"),
        DashboardPathItem("挑战", "开始今日学习任务", "main/topik"),
      ),
    achievements =
      listOf(
        DashboardAchievement("🔥", "$streakDays 天", "连续学习"),
        DashboardAchievement("🏅", badgesUnlocked.toString(), "已解锁徽章"),
        DashboardAchievement("📚", completedTopics.toString(), "词汇/语法"),
      ),
    feedItems =
      listOf(
        DashboardFeedItem(
          title = "完成了复习",
          time = "2 分钟前",
          actorName = "Mina",
          badgeLabel = "里程碑",
          tone = "crimson",
          emoji = "🌸",
        ),
        DashboardFeedItem(
          title = "保持了连续学习",
          time = "15 分钟前",
          actorName = "Jin",
          badgeLabel = "学习",
          tone = "ink",
          emoji = "☕",
        ),
        DashboardFeedItem(
          title = "更新了学习动态",
          time = "1 小时前",
          actorName = "Sora",
          badgeLabel = "动态",
          tone = "butter",
          emoji = "📚",
        ),
      ),
    resumeTitle = "继续 Unit 3 · -(으)면",
    resumeSubtitle = "条件假设表达 · 再完成 2 个例句练习",
    resumeRoute = "main/grammar",
    challengeCard =
      DashboardChallengeCard(
        title = "完成 TOPIK 今日一题",
        subtitle = "II级 阅读 · 14题",
        progressText = "1 / 1",
        rewardText = "25 XP",
        badgeLabel = "今日挑战",
        actionLabel = "领取奖励",
        route = "main/topik",
        isCompleted = true,
        isClaimed = false,
      ),
    challengeTitle = "完成 TOPIK 今日一题",
    challengeSubtitle = "II급 阅读 · 14번，预计 2 分钟",
    challengeRoute = "main/topik",
    todaySteps =
      listOf(
        DashboardTodayStep(
          kind = "Review",
          kindRes = R.string.dashboard_step_review_kind,
          mins = 8,
          titleRes = R.string.dashboard_step_review_title,
          titleArgs = listOf(reviewCount),
          subtitleRes = R.string.dashboard_step_review_subtitle,
          tone = "pink",
          seal = "復",
          route = "main/review",
        ),
        DashboardTodayStep(
          kind = "Grammar",
          kindRes = R.string.dashboard_step_grammar_kind,
          mins = 6,
          titleRes = R.string.dashboard_step_grammar_title,
          subtitleRes = R.string.dashboard_step_grammar_subtitle,
          tone = "mint",
          seal = "文",
          route = "main/grammar",
        ),
        DashboardTodayStep(
          kind = "TOPIK",
          kindRes = R.string.dashboard_step_topik_kind,
          mins = 4,
          titleRes = R.string.dashboard_step_topik_title,
          subtitleRes = R.string.dashboard_step_topik_subtitle,
          tone = "sky",
          seal = "試",
          route = "main/topik",
        ),
      ),
  )

private fun currentDashboardDateLabel(now: LocalDate = LocalDate.now()): String {
  val monthLabels =
    listOf("一月", "二月", "三月", "四月", "五月", "六月", "七月", "八月", "九月", "十月", "十一月", "十二月")
  return "${monthLabels[now.monthValue - 1]} ${now.dayOfMonth}日"
}

private fun currentDashboardGreeting(now: LocalTime = LocalTime.now()): String =
  when (now.hour) {
    in 0..5 -> "凌晨"
    in 6..11 -> "早上"
    in 12..17 -> "下午"
    else -> "晚上"
  }
