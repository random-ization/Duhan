package com.hangyeol.app.compose.data

import android.content.Context
import androidx.annotation.StringRes
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.first

data class DictionaryEntryUiModel(
  val id: String,
  val term: String,
  val pronunciation: String,
  val hanjaSeal: String,
  val partOfSpeech: String,
  val meaningKo: String,
  val meaningZh: String,
  val examples: List<String>,
  val related: List<Pair<String, String>>,
)

data class DictionaryUiState(
  val isLoading: Boolean = true,
  val query: String = "",
  val recentQueries: List<String> = emptyList(),
  val entries: List<DictionaryEntryUiModel> = emptyList(),
  val errorMessage: String? = null,
)

data class NotebookEntryUiModel(
  val title: String,
  val excerpt: String,
  val tag: String,
  val updatedAt: String,
)

data class NotebookUiState(
  val isLoading: Boolean = true,
  val entries: List<NotebookEntryUiModel> = emptyList(),
  val errorMessage: String? = null,
)


data class ReadingBookUiModel(
  val id: String,
  val slug: String,
  val title: String,
  val pageTitle: String,
  val level: String,
  val pages: Int,
  val minutes: Int,
  val accent: String,
  val coverSeal: String,
  val summary: String = "",
  val featuredLabel: String = "",
  val pageContent: List<ReadingPageUiModel> = emptyList(),
)

data class ReadingLibraryUiState(
  val isLoading: Boolean = true,
  val featuredTitle: String = "",
  val featuredSubtitle: String = "",
  val levelSummary: List<Pair<String, String>> = emptyList(),
  val books: List<ReadingBookUiModel> = emptyList(),
  val errorMessage: String? = null,
)

data class ReadingPageUiModel(
  val title: String,
  val imageSeal: String,
  val imageAccent: String,
  val paragraphs: List<ReadingParagraphUiModel>,
)

data class ReadingParagraphUiModel(
  val text: String,
  val translation: String = "",
)

data class MediaEpisodeUiModel(
  val title: String,
  val subtitle: String,
  val duration: String,
  val accent: String,
  val channelId: String = "",
  val route: String = "",
)

data class VideoLibraryUiState(
  val isLoading: Boolean = true,
  val featuredTitle: String = "",
  val featuredSubtitle: String = "",
  val lessons: List<MediaEpisodeUiModel> = emptyList(),
  val errorMessage: String? = null,
)

data class PodcastLibraryUiState(
  val isLoading: Boolean = true,
  val featuredTitle: String = "",
  val featuredSubtitle: String = "",
  val transcriptPrimary: String = "",
  val transcriptSecondary: String = "",
  val elapsedLabel: String = "",
  val remainingLabel: String = "",
  val episodes: List<MediaEpisodeUiModel> = emptyList(),
  val errorMessage: String? = null,
)

data class PodcastSearchResultUiModel(
  val id: String,
  val title: String,
  val author: String,
  val artwork: String = "",
)

data class PodcastSearchUiState(
  val isLoading: Boolean = false,
  val query: String = "",
  val results: List<PodcastSearchResultUiModel> = emptyList(),
  val errorMessage: String? = null,
)

data class PodcastHistoryItemUiModel(
  val id: String,
  val episodeTitle: String,
  val channelName: String,
  val progressLabel: String,
  val timeAgo: String,
)

data class PodcastHistoryUiState(
  val isLoading: Boolean = true,
  val items: List<PodcastHistoryItemUiModel> = emptyList(),
  val errorMessage: String? = null,
)

data class PodcastPlayerUiState(
  val isLoading: Boolean = true,
  val episodeTitle: String = "",
  val channelTitle: String = "",
  val transcriptPrimary: String = "",
  val transcriptSecondary: String = "",
  val elapsedLabel: String = "",
  val remainingLabel: String = "",
  val elapsedSec: Int = 0,
  val durationSec: Int = 0,
  val errorMessage: String? = null,
)

data class VocabBookUiState(
  val isLoading: Boolean = true,
  val wordCount: Int = 0,
  val modes: List<VocabBookModeUiModel> = emptyList(),
  val errorMessage: String? = null,
)

data class VocabBookModeUiModel(
  val key: String,
  val title: String,
  val subtitle: String,
  val seal: String,
  val tone: String,
)

data class VocabBookCategoryUiModel(
  val key: String,
  @StringRes val labelRes: Int,
  val count: Int,
)

data class VocabBookEntryUiModel(
  val id: String,
  val word: String,
  val meaning: String,
  val pronunciation: String,
  val partOfSpeech: String,
  val status: String,
  val savedAt: Long?,
)

data class VocabBookListUiState(
  val isLoading: Boolean = true,
  val totalCount: Int = 0,
  val dueCount: Int = 0,
  val masteredCount: Int = 0,
  val unlearnedCount: Int = 0,
  val categories: List<VocabBookCategoryUiModel> = emptyList(),
  val items: List<VocabBookEntryUiModel> = emptyList(),
  val nextCursor: String? = null,
  val errorMessage: String? = null,
)

data class VocabBookModeUiState(
  val isLoading: Boolean = true,
  val title: String = "",
  val subtitle: String = "",
  val description: String = "",
  val actionLabel: String = "",
  val items: List<VocabBookEntryUiModel> = emptyList(),
  val errorMessage: String? = null,
)

data class TypingStatsUiModel(
  val totalTests: Int,
  val averageWpm: Int,
  val averageAccuracy: Int,
  val highestWpm: Int,
  val sessionsThisWeek: Int,
  val lastPracticeMode: String?,
  val lastCategoryId: String?,
)

data class TypingTextUiModel(
  val id: String,
  val title: String,
  val content: String,
  val type: String,
  val category: String,
)

data class TypingSurfaceUiState(
  val isLoading: Boolean = true,
  val stats: TypingStatsUiModel? = null,
  val categories: List<String> = emptyList(),
  val texts: List<TypingTextUiModel> = emptyList(),
  val errorMessage: String? = null,
)

data class TypingRecordPayload(
  val practiceMode: String,
  val categoryId: String,
  val wpm: Int,
  val accuracy: Int,
  val errorCount: Int,
  val duration: Int,
  val charactersTyped: Int,
  val sentencesCompleted: Int,
  val targetWpm: Int,
  val isTargetAchieved: Boolean,
)

data class EpubReaderUiState(
  val isLoading: Boolean = true,
  val title: String = "",
  val sourceBookId: String = "",
  val currentPageIndex: Int = 0,
  val totalPages: Int = 0,
  val pages: List<ReadingPageUiModel> = emptyList(),
  val errorMessage: String? = null,
)

data class VideoDetailUiState(
  val isLoading: Boolean = true,
  val title: String = "",
  val videoUrl: String = "",
  val description: String = "",
  val level: String = "",
  val durationSec: Int = 0,
  val durationLabel: String = "",
  val progressLabel: String = "",
  val transcriptLines: List<String> = emptyList(),
  val requiresUpgrade: Boolean = false,
  val errorMessage: String? = null,
)

data class AchievementBadgeUiModel(
  val badgeId: String,
  val title: String,
  val description: String,
  val icon: String,
  val tier: String,
  val progressValue: Int,
  val targetValue: Int,
  val rewardXp: Int,
  val isUnlocked: Boolean,
  val isNew: Boolean,
)

data class AchievementSectionUiModel(
  val category: String,
  val title: String,
  val unlockedCount: Int,
  val totalCount: Int,
  val badges: List<AchievementBadgeUiModel>,
)

data class AchievementsUiState(
  val isLoading: Boolean = true,
  val unlockedCount: Int = 0,
  val totalCount: Int = 0,
  val progressPct: Int = 0,
  val sections: List<AchievementSectionUiModel> = emptyList(),
  val errorMessage: String? = null,
)

data class ProfileShortcutUiModel(
  val label: String,
  val route: String,
  val seal: String,
)

data class ProfileMenuEntryUiModel(
  val seal: String,
  val title: String,
  val subtitle: String,
  val route: String,
)

data class ProfileUiState(
  val isLoading: Boolean = true,
  val memberSince: String = "",
  val headline: String = "",
  val planLabel: String = "",
  val streakLabel: String = "",
  val completedLabel: String = "",
  val goalLabel: String = "",
  val shortcuts: List<ProfileShortcutUiModel> = emptyList(),
  val achievements: List<Pair<String, String>> = emptyList(),
  val recentActivity: List<Pair<String, String>> = emptyList(),
  val quickStats: List<Pair<String, String>> = emptyList(),
  val profileMenu: List<ProfileMenuEntryUiModel> = emptyList(),
  val settingsMenu: List<ProfileMenuEntryUiModel> = emptyList(),
  val errorMessage: String? = null,
)

data class HistoryTimelineUiModel(
  val seal: String,
  val title: String,
  val time: String,
  val accent: String,
)

data class HistoryUiState(
  val isLoading: Boolean = true,
  val activeFilter: String = "周",
  val heatmap: List<String> = emptyList(),
  val timeline: List<HistoryTimelineUiModel> = emptyList(),
  val errorMessage: String? = null,
)

data class CommunityRankUiModel(
  val rank: Int,
  val name: String,
  val xp: Int,
  val emoji: String,
  val accent: String,
  val highlight: Boolean = false,
)

data class CommunityFeedUiModel(
  val actorName: String,
  val action: String,
  val time: String,
  val badgeLabel: String,
  val emoji: String,
  val accent: String,
  val deltaLabel: String = "",
  val activityId: String = "",
  val likeCount: Int = 0,
  val likedByMe: Boolean = false,
)

data class CommunityFriendSummaryUiModel(
  val mutualCount: Int,
  val followingCount: Int,
  val followerCount: Int,
  val outgoingPendingCount: Int,
  val incomingPendingCount: Int,
)

data class CommunityUiState(
  val isLoading: Boolean = true,
  val mode: String = "hub",
  val shareCode: String = "",
  val shareUrl: String = "",
  val summaryText: String = "",
  val rankings: List<CommunityRankUiModel> = emptyList(),
  val feed: List<CommunityFeedUiModel> = emptyList(),
  val friendSummary: CommunityFriendSummaryUiModel? = null,
  val suggestions: List<Pair<String, String>> = emptyList(),
  val errorMessage: String? = null,
)

data class PricingPlanUiModel(
  val title: String,
  val price: String,
  val badge: String,
  val description: String,
)

data class PricingUiState(
  val isLoading: Boolean = true,
  val heroStats: List<Pair<String, String>> = emptyList(),
  val selectedPlan: PricingPlanUiModel? = null,
  val featureCards: List<Pair<String, String>> = emptyList(),
  val comparison: List<Triple<String, String, String>> = emptyList(),
  val errorMessage: String? = null,
)

data class SettingsUiState(
  val isLoading: Boolean = true,
  val notificationStatus: String = "",
  val reminderTime: String = "",
  val language: String = "",
  val quietHours: String = "",
  val toggles: List<SettingToggleUiModel> = emptyList(),
  val learningPrefs: List<Pair<String, String>> = emptyList(),
  val errorMessage: String? = null,
)

data class SettingToggleUiModel(
  val key: String,
  val label: String,
  val enabled: Boolean,
)

data class TopikHistoryRecordUiModel(
  val title: String,
  val submittedAt: String,
  val mode: String,
  val score: String,
  val route: String,
)

data class TopikHistoryUiState(
  val isLoading: Boolean = true,
  val averageScore: Int = 0,
  val writingCount: Int = 0,
  val totalCount: Int = 0,
  val records: List<TopikHistoryRecordUiModel> = emptyList(),
  val errorMessage: String? = null,
)

data class MutationResult(
  val success: Boolean,
  val errorMessage: String? = null,
)

data class VocabBookExportResult(
  val success: Boolean,
  val url: String = "",
  val errorMessage: String? = null,
)

// ── Avatar upload ──────────────────────────────────────────────────
data class PresignedUploadResult(
  val success: Boolean,
  val uploadUrl: String = "",
  val publicUrl: String = "",
  val key: String = "",
  val headers: Map<String, String> = emptyMap(),
  val errorMessage: String? = null,
)

// ── EPUB upload ────────────────────────────────────────────────────
data class EpubUploadDraftResult(
  val success: Boolean,
  val bookId: String = "",
  val slug: String = "",
  val errorMessage: String? = null,
)

// ── AI writing evaluation ──────────────────────────────────────────
data class WritingDimensionScore(
  val name: String,
  val score: Int,
  val maxScore: Int,
  val feedback: String = "",
)

data class WritingQuestionEvaluation(
  val questionKey: String,
  val questionLabel: String,
  val score: Int,
  val maxScore: Int,
  val dimensions: List<WritingDimensionScore> = emptyList(),
  val feedbackText: String = "",
  val correctedText: String = "",
  val originalText: String = "",
)

data class WritingEvaluationUiState(
  val isLoading: Boolean = true,
  val sessionId: String = "",
  val totalScore: Int = 0,
  val totalMaxScore: Int = 100,
  val overallFeedback: String = "",
  val questions: List<WritingQuestionEvaluation> = emptyList(),
  val errorMessage: String? = null,
)

// ── Podcast subscriptions ──────────────────────────────────────────
data class PodcastSubscriptionUiModel(
  val channelId: String,
  val itunesId: String = "",
  val title: String,
  val author: String = "",
  val artworkUrl: String = "",
  val feedUrl: String = "",
)

data class PodcastSubscriptionsUiState(
  val isLoading: Boolean = true,
  val subscriptions: List<PodcastSubscriptionUiModel> = emptyList(),
  val errorMessage: String? = null,
)

// ── Subscription/payment details ───────────────────────────────────
data class CheckoutResult(
  val success: Boolean,
  val checkoutUrl: String = "",
  val errorMessage: String? = null,
)

data class SubscriptionDetailUiState(
  val isLoading: Boolean = true,
  val planName: String = "",
  val billingInterval: String = "",
  val status: String = "",
  val nextBillingDate: String = "",
  val monthlyPrice: String = "",
  val annualPrice: String = "",
  val features: List<String> = emptyList(),
  val isMember: Boolean = false,
  val errorMessage: String? = null,
)

// ── Reading article ────────────────────────────────────────────────
data class ReadingArticleUiState(
  val isLoading: Boolean = true,
  val articleId: String = "",
  val title: String = "",
  val source: String = "",
  val pubDate: String = "",
  val body: String = "",
  val bodyTranslation: String = "",
  val tags: List<String> = emptyList(),
  val isRead: Boolean = false,
  val errorMessage: String? = null,
)

interface ContentRepository {
  suspend fun loadDictionary(): DictionaryUiState

  suspend fun searchDictionary(query: String): DictionaryUiState

  suspend fun rememberDictionaryQuery(query: String): List<String>

  suspend fun loadNotebook(): NotebookUiState

  suspend fun loadReadingLibrary(): ReadingLibraryUiState

  suspend fun loadReadingBookPages(slug: String, pageCountHint: Int = 0): List<ReadingPageUiModel>

  suspend fun translateReadingParagraphs(
    title: String,
    paragraphs: List<String>,
    language: String = "zh",
  ): Result<List<String>>

  suspend fun loadVideoLibrary(): VideoLibraryUiState

  suspend fun loadPodcastLibrary(): PodcastLibraryUiState

  suspend fun loadPodcastChannelEpisodes(channelId: String): PodcastLibraryUiState

  suspend fun loadProfile(): ProfileUiState

  suspend fun loadHistory(): HistoryUiState

  suspend fun loadCommunity(mode: String): CommunityUiState

  suspend fun loadPricing(): PricingUiState

  suspend fun loadSettings(): SettingsUiState

  suspend fun toggleSetting(key: String): SettingsUiState

  suspend fun loadTopikHistory(): TopikHistoryUiState

  suspend fun likeActivity(activityId: String): MutationResult =
    MutationResult(success = false, errorMessage = "不支持点赞")

  suspend fun unlikeActivity(activityId: String): MutationResult =
    MutationResult(success = false, errorMessage = "不支持取消点赞")

  suspend fun sendFriendRequestByCode(code: String): MutationResult =
    MutationResult(success = false, errorMessage = "不支持好友请求")

  suspend fun respondFriendRequest(targetUserId: String, action: String): MutationResult =
    MutationResult(success = false, errorMessage = "不支持好友请求响应")

  suspend fun regenerateFriendCode(): MutationResult =
    MutationResult(success = false, errorMessage = "不支持重新生成好友码")

  suspend fun markNotificationsRead(): MutationResult =
    MutationResult(success = false, errorMessage = "不支持标记已读")

  suspend fun syncAchievements(): MutationResult =
    MutationResult(success = false, errorMessage = "不支持成就同步")

  suspend fun loadVocabBook(): VocabBookUiState =
    VocabBookUiState(isLoading = false, errorMessage = "不支持词汇本")

  suspend fun loadVocabBookEntries(
    search: String,
    category: String,
    cursor: String?,
  ): VocabBookListUiState =
    VocabBookListUiState(isLoading = false, errorMessage = "不支持词汇本列表")

  suspend fun loadVocabBookMode(mode: String): VocabBookModeUiState =
    VocabBookModeUiState(isLoading = false, errorMessage = "不支持词汇本模式")

  suspend fun setVocabMastery(wordId: String, mastered: Boolean): MutationResult =
    MutationResult(success = false, errorMessage = "不支持词汇本更新")

  suspend fun exportVocabBookPdf(
    category: String,
    mode: String,
    shuffle: Boolean,
    query: String? = null,
    selectedWordIds: List<String>? = null,
    language: String = "zh",
  ): VocabBookExportResult =
    VocabBookExportResult(success = false, errorMessage = "不支持词汇本导出")

  suspend fun loadTypingSurface(): TypingSurfaceUiState =
    TypingSurfaceUiState(isLoading = false, errorMessage = "不支持打字练习")

  suspend fun saveTypingRecord(payload: TypingRecordPayload): MutationResult =
    MutationResult(success = false, errorMessage = "不支持打字记录")

  suspend fun loadEpubReader(slug: String): EpubReaderUiState =
    EpubReaderUiState(isLoading = false, errorMessage = "不支持 EPUB 阅读")

  suspend fun saveReadingProgress(
    bookId: String,
    pageIndex: Int,
    totalPages: Int,
  ): MutationResult = MutationResult(success = false, errorMessage = "不支持阅读进度保存")

  suspend fun loadVideoDetail(videoId: String): VideoDetailUiState =
    VideoDetailUiState(isLoading = false, errorMessage = "不支持视频详情")

  suspend fun consumeMediaPlay(resourceKey: String): MutationResult =
    MutationResult(success = false, errorMessage = "不支持媒体播放解锁")

  suspend fun saveVideoProgress(
    videoId: String,
    progressSec: Int,
    durationSec: Int?,
  ): MutationResult = MutationResult(success = false, errorMessage = "不支持视频进度保存")

  suspend fun saveSavedWord(
    korean: String,
    english: String,
    exampleSentence: String? = null,
    exampleTranslation: String? = null,
  ): MutationResult = MutationResult(success = false, errorMessage = "不支持保存生词")

  suspend fun addWordToReview(
    word: String,
    meaning: String,
    context: String? = null,
    source: String? = null,
  ): MutationResult = MutationResult(success = false, errorMessage = "不支持加入复习")

  suspend fun loadAchievements(): AchievementsUiState =
    AchievementsUiState(isLoading = false, errorMessage = "不支持成就加载")

  suspend fun searchPodcasts(term: String): PodcastSearchUiState =
    PodcastSearchUiState(errorMessage = "不支持播客搜索")

  suspend fun loadPodcastHistory(): PodcastHistoryUiState =
    PodcastHistoryUiState(isLoading = false, errorMessage = "不支持播客历史")

  suspend fun loadPodcastEpisode(episodeId: String): PodcastPlayerUiState =
    PodcastPlayerUiState(isLoading = false, errorMessage = "不支持播客播放")

  suspend fun savePodcastProgress(episodeId: String, progressSec: Int): MutationResult =
    MutationResult(success = false, errorMessage = "不支持播放进度保存")

  suspend fun getUploadUrl(
    filename: String,
    contentType: String,
    fileSize: Long,
    folder: String,
  ): PresignedUploadResult =
    PresignedUploadResult(success = false, errorMessage = "不支持上传")

  suspend fun updateAvatar(publicUrl: String): MutationResult =
    MutationResult(success = false, errorMessage = "不支持头像更新")

  suspend fun createEpubUploadDraft(
    title: String,
    author: String,
    description: String?,
    language: String,
    tags: List<String>,
    epubObjectKey: String,
  ): EpubUploadDraftResult =
    EpubUploadDraftResult(success = false, errorMessage = "不支持 EPUB 上传")

  suspend fun loadWritingEvaluation(sessionId: String): WritingEvaluationUiState =
    WritingEvaluationUiState(isLoading = false, errorMessage = "不支持写作评价加载")

  suspend fun loadPodcastSubscriptions(): PodcastSubscriptionsUiState =
    PodcastSubscriptionsUiState(isLoading = false, errorMessage = "不支持播客订阅列表")

  suspend fun togglePodcastSubscription(
    itunesId: String,
    title: String,
    author: String,
    feedUrl: String,
    artworkUrl: String,
  ): MutationResult =
    MutationResult(success = false, errorMessage = "不支持播客订阅切换")

  suspend fun loadSubscriptionDetail(): SubscriptionDetailUiState =
    SubscriptionDetailUiState(isLoading = false, errorMessage = "不支持订阅详情")

  suspend fun createCheckout(plan: String, billingInterval: String): CheckoutResult =
    CheckoutResult(success = false, errorMessage = "不支持结账")

  suspend fun loadReadingArticle(articleId: String): ReadingArticleUiState =
    ReadingArticleUiState(isLoading = false, errorMessage = "不支持文章加载")

  suspend fun markArticleRead(articleId: String): MutationResult =
    MutationResult(success = false, errorMessage = "不支持标记文章已读")

  suspend fun generateShareUrl(type: String, id: String?): MutationResult =
    MutationResult(success = false, errorMessage = "不支持分享链接生成")
}

private const val CONTENT_DATASTORE_NAME = "hangyeol_compose_content"
private val Context.contentDataStore by preferencesDataStore(name = CONTENT_DATASTORE_NAME)

private object ContentPreferenceKeys {
  val dictionaryRecentQueries = stringPreferencesKey("dictionary_recent_queries")
  val notificationsEnabled = booleanPreferencesKey("notifications_enabled")
  val inAppNotifications = booleanPreferencesKey("in_app_notifications")
  val webPush = booleanPreferencesKey("web_push")
  val studyReminder = booleanPreferencesKey("study_reminder")
  val examReminder = booleanPreferencesKey("exam_reminder")
  val socialNotifications = booleanPreferencesKey("social_notifications")
  val reminderTime = stringPreferencesKey("reminder_time")
  val language = stringPreferencesKey("language")
  val quietHours = stringPreferencesKey("quiet_hours")
}

private val settingDefinitions =
  listOf(
    "notificationsEnabled" to ("接收通知" to ContentPreferenceKeys.notificationsEnabled),
    "inAppNotifications" to ("应用内通知" to ContentPreferenceKeys.inAppNotifications),
    "webPush" to ("网页推送" to ContentPreferenceKeys.webPush),
    "studyReminder" to ("学习提醒" to ContentPreferenceKeys.studyReminder),
    "examReminder" to ("考试通知" to ContentPreferenceKeys.examReminder),
    "socialNotifications" to ("社交通知" to ContentPreferenceKeys.socialNotifications),
  )

open class InMemoryContentRepository : ContentRepository {
  protected open fun defaultDictionaryEntries(): List<DictionaryEntryUiModel> =
    listOf(
      DictionaryEntryUiModel(
        id = "golmokgil",
        term = "골목길",
        pronunciation = "[골목낄]",
        hanjaSeal = "巷",
        partOfSpeech = "명사",
        meaningKo = "작은 골목의 길. 좁고 구불구불한 도시 안의 길.",
        meaningZh = "小巷的路；狭窄曲折的都市小路。",
        examples = listOf("어릴 때 살던 골목길이 그립다.", "그 골목길에서 만나요."),
        related = listOf("거리" to "street", "길거리" to "street path", "큰길" to "main road"),
      ),
      DictionaryEntryUiModel(
        id = "beotkkot",
        term = "벚꽃",
        pronunciation = "[벋꼳]",
        hanjaSeal = "花",
        partOfSpeech = "명사",
        meaningKo = "벚나무에 피는 연분홍빛 꽃.",
        meaningZh = "樱花；开在樱花树上的浅粉色花朵。",
        examples = listOf("봄이 오면 벚꽃이 핀다.", "벚꽃이 질 때 거리가 가장 예쁘다."),
        related = listOf("봄" to "spring", "꽃잎" to "petal", "개화" to "blossoming"),
      ),
      DictionaryEntryUiModel(
        id = "gongbuhada",
        term = "공부하다",
        pronunciation = "[공부하다]",
        hanjaSeal = "學",
        partOfSpeech = "동사",
        meaningKo = "지식이나 기술을 배우고 익히다.",
        meaningZh = "学习；掌握知识或技能。",
        examples = listOf("매일 한국어를 공부하고 있어요.", "도서관에서 같이 공부할까요?"),
        related = listOf("복습하다" to "review", "예습하다" to "preview", "학습" to "learning"),
      ),
      DictionaryEntryUiModel(
        id = "masitda",
        term = "맛있다",
        pronunciation = "[마싣따]",
        hanjaSeal = "味",
        partOfSpeech = "형용사",
        meaningKo = "음식의 맛이 좋다.",
        meaningZh = "好吃；味道很好。",
        examples = listOf("이 김밥은 정말 맛있다.", "한국에서 먹은 떡볶이가 제일 맛있었어요."),
        related = listOf("달다" to "sweet", "맵다" to "spicy", "싱겁다" to "bland"),
      ),
    )

  override suspend fun loadDictionary(): DictionaryUiState {
    delay(120)
    return DictionaryUiState(
      isLoading = false,
      query = "",
      recentQueries = listOf("最近:오빠", "벚꽃", "인사", "공부하다", "맛있다"),
      entries = emptyList(),
    )
  }

  override suspend fun searchDictionary(query: String): DictionaryUiState {
    delay(120)
    val normalized = query.trim()
    val recentQueries = rememberDictionaryQuery(normalized)
    if (normalized.isBlank()) {
      return DictionaryUiState(
        isLoading = false,
        query = "",
        recentQueries = recentQueries,
        entries = emptyList(),
      )
    }
    return DictionaryUiState(
      isLoading = false,
      query = normalized,
      recentQueries = recentQueries,
      entries = filterDictionaryEntries(defaultDictionaryEntries(), normalized),
    )
  }

  override suspend fun rememberDictionaryQuery(query: String): List<String> {
    val normalized = query.trim()
    if (normalized.isBlank()) {
      return loadDictionary().recentQueries
    }
    return (listOf(normalized) + loadDictionary().recentQueries)
      .distinct()
      .take(6)
  }

  override suspend fun loadNotebook(): NotebookUiState {
    delay(120)
    return NotebookUiState(
      isLoading = false,
      entries =
        listOf(
          NotebookEntryUiModel("问候表达整理", "-你好 / 만나서 반갑습니다 / 오랜만이에요", "會話", "今天"),
          NotebookEntryUiModel("-(으)면 vs -면", "有收音무로 구분. 조건 / 가정 둘 다 쓸 수 있음.", "文法", "昨日"),
          NotebookEntryUiModel("TOPIK II 写作 54번", "引言-正文-结论 구조. 한자어 词汇 적극 활용.", "寫作", "2日 전"),
          NotebookEntryUiModel("봄의 풍경 词汇", "벚꽃, 상춘객, 만개, 분홍빛, 꽃놀이...", "詞彙", "3日 전"),
        ),
    )
  }

  override suspend fun loadReadingLibrary(): ReadingLibraryUiState {
    delay(120)
    val books = buildReadingBooks()
    return ReadingLibraryUiState(
      isLoading = false,
      featuredTitle = "阅读探索",
      featuredSubtitle = "推荐阅读 · 新闻 · 文化 · 绘本",
      levelSummary = listOf("当前级别" to "Level 2", "册数" to "${books.size} 册", "总页数" to "${books.sumOf { it.pages }} 页"),
      books = books,
    )
  }

  override suspend fun loadReadingBookPages(slug: String, pageCountHint: Int): List<ReadingPageUiModel> {
    delay(120)
    val book = resolveReadingBookBySlug(buildReadingBooks(), slug) ?: return emptyList()
    return book.pageContent
  }

  override suspend fun translateReadingParagraphs(
    title: String,
    paragraphs: List<String>,
    language: String,
  ): Result<List<String>> {
    delay(80)
    if (paragraphs.isEmpty()) return Result.success(emptyList())
    return Result.success(paragraphs.map { "" })
  }

  override suspend fun loadVideoLibrary(): VideoLibraryUiState {
    delay(120)
    return VideoLibraryUiState(
      isLoading = false,
      featuredTitle = "한국 가정식 백반 만들기",
      featuredSubtitle = "李敏正 요리 · 11:00 · 中级",
      lessons =
        listOf(
          MediaEpisodeUiModel("재료", "材料 · ingredients", "", "mint"),
          MediaEpisodeUiModel("다지다", "切碎 · to mince", "", "butter"),
          MediaEpisodeUiModel("끓이다", "煮沸 · to boil", "", "pink"),
        ),
    )
  }

  override suspend fun loadPodcastLibrary(): PodcastLibraryUiState {
    delay(120)
    return PodcastLibraryUiState(
      isLoading = false,
      featuredTitle = "서울의 아침을 걷다",
      featuredSubtitle = "Hangyeol Radio · 18:24",
      transcriptPrimary = "오늘은 서울의 아침 풍경을 함께 걸어보겠습니다.",
      transcriptSecondary = "今天一起走进首尔的清晨街景。",
      elapsedLabel = "06:42",
      remainingLabel = "-11:42",
      episodes =
        listOf(
          MediaEpisodeUiModel("Episode 19", "市场里的一天 · 12분", "NEW", "lilac", channelId = "demo-channel-a"),
          MediaEpisodeUiModel("Episode 17", "考试前的 10 个短语 · 11분", "TOPIK", "mint", channelId = "demo-channel-b"),
          MediaEpisodeUiModel("Episode 16", "在咖啡店学习 · 9분", "DAILY", "butter", channelId = "demo-channel-c"),
        ),
    )
  }

  override suspend fun loadPodcastChannelEpisodes(channelId: String): PodcastLibraryUiState {
    delay(120)
    val library = loadPodcastLibrary()
    return library.copy(
      featuredTitle = if (channelId.isBlank()) "播客频道" else "播客频道 · $channelId",
      featuredSubtitle = "频道剧集列表",
      transcriptPrimary = "",
      transcriptSecondary = "",
      elapsedLabel = "",
      remainingLabel = "",
    )
  }

  override suspend fun loadProfile(): ProfileUiState {
    delay(120)
    return ProfileUiState(
      isLoading = false,
      memberSince = "加入于 2025.11",
      headline = "学习进度 · 稳定提升中",
      planLabel = "会员",
      streakLabel = "连续学习 12 天",
      completedLabel = "完成课程 24 节",
      goalLabel = "本周目标 5/7",
      shortcuts =
        listOf(
          ProfileShortcutUiModel("词典", "main/dictionary", "詞"),
          ProfileShortcutUiModel("笔记", "main/notebook", "筆"),
          ProfileShortcutUiModel("订阅", "main/pricing", "星"),
          ProfileShortcutUiModel("阅读", "main/reading", "冊"),
        ),
      achievements =
        listOf("TOPIK II" to "模拟阅读 86 分", "FSRS" to "本周稳定复习", "绘本馆" to "连续 5 天阅读"),
      recentActivity =
        listOf(
          "完成 TOPIK 阅读模拟 01" to "今天 14:20",
          "复习队列清空 18 张卡片" to "今天 09:10",
          "更新语法笔记《条件句整理》" to "昨天 21:30",
        ),
      quickStats =
        listOf(
          "1247" to "词汇",
          "86" to "TOPIK",
          "128" to "笔记",
        ),
      profileMenu =
        listOf(
          ProfileMenuEntryUiModel("詞", "词汇本", "1247 单词 · 24张待复习", "main/dictionary"),
          ProfileMenuEntryUiModel("錯", "错题本", "42 题 · TOPIK 为主", "main/topik/history"),
          ProfileMenuEntryUiModel("筆", "笔记本", "128 条笔记", "main/notebook"),
          ProfileMenuEntryUiModel("章", "成就与徽章", "24 / 60 획득", "main/history"),
        ),
      settingsMenu =
        listOf(
          ProfileMenuEntryUiModel("星", "订阅管理", "会员 · 下次续费 2026-08", "main/pricing"),
          ProfileMenuEntryUiModel("鈴", "通知设置", "每天下午 7 点", "main/profile/settings"),
          ProfileMenuEntryUiModel("語", "语言设置", "韩语 → 中文", "main/profile/settings"),
          ProfileMenuEntryUiModel("助", "帮助与反馈", "常见问题与联系支持", "main/community"),
        ),
    )
  }

  override suspend fun loadHistory(): HistoryUiState {
    delay(120)
    return HistoryUiState(
      isLoading = false,
      heatmap =
        List(98) { index ->
          when {
            index % 9 == 0 -> "strong"
            index % 3 == 0 -> "active"
            else -> "idle"
          }
        },
      timeline =
        listOf(
          HistoryTimelineUiModel("復", "单词 24 个复习", "08:12", "pink"),
          HistoryTimelineUiModel("聽", "播客 Ep.42 听力 12 分钟", "09:30", "mint"),
          HistoryTimelineUiModel("法", "-(으)면 语法完成", "18:45", "butter"),
        ),
    )
  }

  override suspend fun loadCommunity(mode: String): CommunityUiState {
    delay(120)
    return CommunityUiState(
      isLoading = false,
      mode = mode,
      shareCode = "HGYL-2026",
      shareUrl = "https://hangyeol.app/invite/HGYL-2026",
      summaryText = "3日 6小时 후 结束 · 상위 10명 승급",
      rankings =
        listOf(
          CommunityRankUiModel(1, "Minho", 1240, "🌸", "pink"),
          CommunityRankUiModel(2, "Suzy", 1180, "☕", "mint"),
          CommunityRankUiModel(3, "河恩 (我)", 1120, "🍃", "butter", highlight = true),
          CommunityRankUiModel(4, "建宇", 1050, "📚", "sky"),
          CommunityRankUiModel(5, "Jisoo", 980, "🐱", "butter"),
        ),
      friendSummary =
        CommunityFriendSummaryUiModel(
          mutualCount = 6,
          followingCount = 12,
          followerCount = 10,
          outgoingPendingCount = 1,
          incomingPendingCount = 2,
        ),
      feed =
        listOf(
          CommunityFeedUiModel(
            actorName = "Minho",
            action = "完成了语法训练 · 3 项",
            time = "刚刚",
            badgeLabel = "复习",
            emoji = "📘",
            accent = "pink",
            deltaLabel = "+18 XP",
          ),
          CommunityFeedUiModel(
            actorName = "Suzy",
            action = "播客 Ep.41 听力完成",
            time = "8分钟前",
            badgeLabel = "里程碑",
            emoji = "🎧",
            accent = "mint",
            deltaLabel = "",
          ),
          CommunityFeedUiModel(
            actorName = "Jisoo",
            action = "提交了 TOPIK 模考，得分 82 分",
            time = "15分钟前",
            badgeLabel = "考試",
            emoji = "📝",
            accent = "sky",
            deltaLabel = "82 分",
          ),
          CommunityFeedUiModel(
            actorName = "Lina",
            action = "连续学习里程碑达成",
            time = "1小时前",
            badgeLabel = "动态",
            emoji = "🌱",
            accent = "lilac",
            deltaLabel = "",
          ),
        ),
      suggestions =
        listOf(
          "MINA · 8921" to "推荐好友",
          "SORA · 1288" to "一起刷题",
          "JIN · 3881" to "播客同伴",
        ),
    )
  }

  override suspend fun loadPricing(): PricingUiState {
    delay(120)
    return PricingUiState(
      isLoading = false,
      heroStats = listOf("月付" to "$6.90", "年付" to "$49.00", "立省" to "-20%"),
      selectedPlan =
        PricingPlanUiModel(
          title = "年付 Pro 更适合长期学习",
          price = "$49.00",
          badge = "推荐方案",
          description = "解锁完整课程、媒体学习和更高 AI 额度。",
        ),
      featureCards =
        listOf(
          "完整课程库" to "全部教材单元、语法、词汇和学习路径保持开放。",
          "媒体学习不限量" to "新闻阅读、播客和视频练习保持解锁。",
          "更高 AI 使用额度" to "可使用翻译、解释、写作辅助和复习生成。",
        ),
      comparison =
        listOf(
          Triple("课程内容", "基础内容", "完整解锁"),
          Triple("媒体学习", "部分体验", "不限量"),
          Triple("AI 功能", "有限额度", "更高额度"),
        ),
    )
  }

  override suspend fun loadSettings(): SettingsUiState {
    delay(120)
    return SettingsUiState(
      isLoading = false,
      notificationStatus = "通知已开启",
      reminderTime = "19:00",
      language = "简体中文",
      quietHours = "22:00 - 08:00",
      toggles =
        listOf(
          SettingToggleUiModel("notificationsEnabled", "接收通知", true),
          SettingToggleUiModel("inAppNotifications", "应用内通知", true),
          SettingToggleUiModel("webPush", "网页推送", false),
          SettingToggleUiModel("studyReminder", "学习提醒", true),
          SettingToggleUiModel("examReminder", "考试通知", true),
          SettingToggleUiModel("socialNotifications", "社交通知", true),
        ),
      learningPrefs =
        listOf(
          "学习目标" to "30 分钟 / 日",
          "卡片正面" to "韩语在前",
          "字幕模式" to "双语字幕",
          "音频速度" to "1.0x",
        ),
    )
  }

  override suspend fun toggleSetting(key: String): SettingsUiState {
    val current = loadSettings()
    return current.copy(
      toggles =
        current.toggles.map { toggle ->
          if (toggle.key == key) {
            toggle.copy(enabled = !toggle.enabled)
          } else {
            toggle
          }
        },
      notificationStatus =
        if (key == "notificationsEnabled") {
          val enabled = current.toggles.firstOrNull { it.key == key }?.enabled?.not() ?: true
          if (enabled) "通知已开启" else "通知已关闭"
        } else {
          current.notificationStatus
        },
    )
  }

  override suspend fun exportVocabBookPdf(
    category: String,
    mode: String,
    shuffle: Boolean,
    query: String?,
  ): VocabBookExportResult {
    delay(1500)
    return VocabBookExportResult(
      success = true,
      url = "https://koreanstudy.me/demo/vocab-book-A4.pdf",
    )
  }

  override suspend fun loadTypingSurface(): TypingSurfaceUiState {
    delay(120)
    return TypingSurfaceUiState(
      isLoading = false,
      stats = TypingStatsUiModel(
        totalTests = 12,
        averageWpm = 15,
        averageAccuracy = 87,
        highestWpm = 24,
        sessionsThisWeek = 3,
        lastPracticeMode = "SENTENCE",
        lastCategoryId = "daily",
      ),
      categories = listOf("日常用语", "TOPIK 词汇", "新闻标题"),
      texts = listOf(
        TypingTextUiModel("text-1", "日常问候", "안녕하세요. 오늘 날씨가 정말 좋네요.", "SENTENCE", "日常用语"),
        TypingTextUiModel("text-2", "自我介绍", "저는 한국어를 공부하는 학생입니다.", "SENTENCE", "日常用语"),
      ),
    )
  }
}

private fun buildReadingBooks(): List<ReadingBookUiModel> =
  listOf(
    ReadingBookUiModel(
      id = "book-1",
      slug = "spring-park",
      title = "春天去赏花",
      pageTitle = "벚꽃 아래에서",
      level = "Level 1",
      pages = 12,
      minutes = 6,
      accent = "pink",
      coverSeal = "春",
      summary = "跟着河恩一起去公园看樱花。",
      featuredLabel = "推荐继续",
      pageContent =
        listOf(
          ReadingPageUiModel(
            title = "벚꽃 아래에서",
            imageSeal = "花",
            imageAccent = "pink",
            paragraphs =
              listOf(
                ReadingParagraphUiModel("봄이 오자 공원에는 분홍빛 벚꽃이 가득 피었어요.", "春天来了，公园里开满了粉色的樱花。"),
                ReadingParagraphUiModel("하은이는 작은 가방을 메고 벤치 옆 길을 천천히 걸었어요.", "河恩背着小包，慢慢走过长椅旁的小路。"),
              ),
          ),
          ReadingPageUiModel(
            title = "달콤한 도시락",
            imageSeal = "盒",
            imageAccent = "butter",
            paragraphs =
              listOf(
                ReadingParagraphUiModel("친구 민아는 딸기 샌드위치와 따뜻한 차를 준비했어요.", "朋友美娜准备了草莓三明治和热茶。"),
                ReadingParagraphUiModel("두 사람은 꽃잎이 떨어지는 소리를 들으며 이야기를 나눴어요.", "两人听着花瓣飘落的声音聊天。"),
              ),
          ),
          ReadingPageUiModel(
            title = "해 질 무렵",
            imageSeal = "暮",
            imageAccent = "lilac",
            paragraphs =
              listOf(
                ReadingParagraphUiModel("노을이 지자 강물 위에도 연분홍 빛이 번졌어요.", "夕阳落下时，河面上也铺满了淡粉色。"),
                ReadingParagraphUiModel("하은이는 다음 봄에도 꼭 다시 오자고 마음속으로 약속했어요.", "河恩在心里约定，明年春天还要再来。"),
              ),
          ),
        ),
    ),
    ReadingBookUiModel(
      id = "book-2",
      slug = "night-convenience",
      title = "便利店夜班",
      pageTitle = "늦은 밤의 불빛",
      level = "Level 2",
      pages = 18,
      minutes = 9,
      accent = "butter",
      coverSeal = "夜",
      summary = "夜晚便利店里发生的小故事。",
      featuredLabel = "夜读推荐",
      pageContent =
        listOf(
          ReadingPageUiModel(
            title = "늦은 밤의 불빛",
            imageSeal = "燈",
            imageAccent = "butter",
            paragraphs =
              listOf(
                ReadingParagraphUiModel("자정이 가까워지자 편의점 창문에는 노란 불빛만 남았어요.", "接近午夜时，便利店窗边只剩下暖黄色的灯光。"),
                ReadingParagraphUiModel("지훈은 계산대 옆에서 따끈한 어묵 국물을 정리하고 있었어요.", "志勋在收银台旁整理热腾腾的鱼饼汤。"),
              ),
          ),
          ReadingPageUiModel(
            title = "마지막 손님",
            imageSeal = "客",
            imageAccent = "mint",
            paragraphs =
              listOf(
                ReadingParagraphUiModel("마지막 손님은 우산에서 떨어지는 빗물을 털며 들어왔어요.", "最后一位客人抖落伞上的雨水走了进来。"),
                ReadingParagraphUiModel("그는 삼각김밥 하나와 따뜻한 우유를 고른 뒤 조용히 웃었어요.", "他拿起一个饭团和一盒热牛奶，安静地笑了笑。"),
              ),
          ),
          ReadingPageUiModel(
            title = "새벽의 약속",
            imageSeal = "晨",
            imageAccent = "sky",
            paragraphs =
              listOf(
                ReadingParagraphUiModel("문을 닫을 시간이 되자 두 사람은 다시 만나자는 인사를 남겼어요.", "到了关门时间，两人约好下次再见。"),
                ReadingParagraphUiModel("편의점 앞 골목은 조용했지만 마음만은 이상하게 따뜻했어요.", "虽然门前的小巷很安静，心里却莫名温暖。"),
              ),
          ),
        ),
    ),
    ReadingBookUiModel(
      id = "book-3",
      slug = "busan-trip",
      title = "第一次去釜山",
      pageTitle = "바다를 보러 가는 날",
      level = "Level 3",
      pages = 22,
      minutes = 12,
      accent = "mint",
      coverSeal = "海",
      summary = "搭上 KTX，第一次去看海。",
      featuredLabel = "旅行故事",
      pageContent =
        listOf(
          ReadingPageUiModel(
            title = "바다를 보러 가는 날",
            imageSeal = "海",
            imageAccent = "mint",
            paragraphs =
              listOf(
                ReadingParagraphUiModel("새벽 기차는 생각보다 조용했고 창밖 하늘은 천천히 밝아졌어요.", "清晨的列车比想象中安静，窗外的天空慢慢亮了起来。"),
                ReadingParagraphUiModel("하은이는 손에 꼭 쥔 표를 보며 부산 바다를 떠올렸어요.", "河恩盯着手里的车票，想着釜山的大海。"),
              ),
          ),
          ReadingPageUiModel(
            title = "파도 소리",
            imageSeal = "波",
            imageAccent = "sky",
            paragraphs =
              listOf(
                ReadingParagraphUiModel("해변에 도착하자 짭짤한 바람과 파도 소리가 한꺼번에 밀려왔어요.", "一到海边，咸咸的海风和浪声一起涌了过来。"),
                ReadingParagraphUiModel("처음 보는 푸른 바다 앞에서 모두 잠시 말을 잊었어요.", "面对第一次见到的蓝色大海，大家都一时失了语。"),
              ),
          ),
        ),
    ),
    ReadingBookUiModel(
      id = "book-4",
      slug = "exchange-diary",
      title = "语言交换日记",
      pageTitle = "오늘의 문장",
      level = "Level 1",
      pages = 10,
      minutes = 5,
      accent = "lilac",
      coverSeal = "語",
      summary = "每天一句，记下新的韩语表达。",
      featuredLabel = "轻阅读",
      pageContent =
        listOf(
          ReadingPageUiModel(
            title = "오늘의 문장",
            imageSeal = "語",
            imageAccent = "lilac",
            paragraphs =
              listOf(
                ReadingParagraphUiModel("오늘 배운 문장은 생각보다 오래 마음에 남았어요.", "今天学到的句子比想象中更久地留在心里。"),
                ReadingParagraphUiModel("짧은 표현 하나가 하루의 기분을 바꾸기도 해요.", "一个简短的表达，有时也会改变一天的心情。"),
              ),
          ),
          ReadingPageUiModel(
            title = "내일도 한 줄",
            imageSeal = "記",
            imageAccent = "pink",
            paragraphs =
              listOf(
                ReadingParagraphUiModel("하은이는 내일도 새로운 문장을 공책에 적어 보기로 했어요.", "河恩决定明天也要把新句子写进笔记本。"),
              ),
          ),
        ),
    ),
    ReadingBookUiModel(
      id = "book-5",
      slug = "mountain-letter",
      title = "山上的来信",
      pageTitle = "산길 우체통",
      level = "Level 4",
      pages = 14,
      minutes = 8,
      accent = "sky",
      coverSeal = "山",
      summary = "沿着山路寻找一封迟到的信。",
      featuredLabel = "中高阶",
      pageContent =
        listOf(
          ReadingPageUiModel(
            title = "산길 우체통",
            imageSeal = "山",
            imageAccent = "sky",
            paragraphs =
              listOf(
                ReadingParagraphUiModel("안개가 걷히자 산길 끝에 작은 우체통 하나가 보였어요.", "雾散开后，山路尽头出现了一个小小的邮筒。"),
                ReadingParagraphUiModel("하은이는 오래전에 쓰인 편지가 아직도 누군가를 기다리고 있다고 생각했어요.", "河恩想着，那封很久以前写下的信也许还在等着某个人。"),
              ),
          ),
        ),
    ),
    ReadingBookUiModel(
      id = "book-6",
      slug = "midnight-bakery",
      title = "午夜面包店",
      pageTitle = "새벽의 빵 냄새",
      level = "Level 5",
      pages = 16,
      minutes = 9,
      accent = "butter",
      coverSeal = "麵",
      summary = "凌晨四点，面包香气充满整条街。",
      featuredLabel = "高级阅读",
      pageContent =
        listOf(
          ReadingPageUiModel(
            title = "새벽의 빵 냄새",
            imageSeal = "麵",
            imageAccent = "butter",
            paragraphs =
              listOf(
                ReadingParagraphUiModel("새벽 네 시가 되면 골목 끝 제과점에서 버터 향이 먼저 흘러나왔어요.", "每到凌晨四点，巷子尽头的面包店总会先飘出黄油香。"),
                ReadingParagraphUiModel("동네 사람들은 그 냄새를 맡으면 하루가 조용히 시작된다는 걸 알았지요.", "邻居们一闻到这味道，就知道新的一天正静静开始。"),
              ),
          ),
        ),
    ),
    ReadingBookUiModel(
      id = "book-7",
      slug = "moon-river",
      title = "月光下的河流",
      pageTitle = "달빛이 흐르는 밤",
      level = "Level 6",
      pages = 20,
      minutes = 11,
      accent = "lilac",
      coverSeal = "月",
      summary = "沿着月色阅读更长、更静的故事。",
      featuredLabel = "Level 6",
      pageContent =
        listOf(
          ReadingPageUiModel(
            title = "달빛이 흐르는 밤",
            imageSeal = "月",
            imageAccent = "lilac",
            paragraphs =
              listOf(
                ReadingParagraphUiModel("강물 위에 번지는 달빛은 마치 오래된 문장을 천천히 읽어 내려가는 것 같았어요.", "铺展在河面上的月光，像是在慢慢读一段古老的句子。"),
                ReadingParagraphUiModel("하은이는 아무 말 없이 걸었지만 마음속에서는 수많은 이야기들이 조용히 이어졌어요.", "河恩什么也没说，但心里有无数故事在安静延续。"),
              ),
          ),
        ),
    ),
  )

class DataStoreContentRepository(
  private val context: Context,
) : InMemoryContentRepository() {
  override suspend fun loadDictionary(): DictionaryUiState {
    val preferences = context.contentDataStore.data.first()
    val recentQueries =
      parseRecentQueries(preferences[ContentPreferenceKeys.dictionaryRecentQueries]).ifEmpty {
        listOf("最近:오빠", "벚꽃", "인사", "공부하다", "맛있다")
      }
    return DictionaryUiState(
      isLoading = false,
      query = "",
      recentQueries = recentQueries,
      entries = emptyList(),
    )
  }

  override suspend fun searchDictionary(query: String): DictionaryUiState {
    val normalized = query.trim()
    val recentQueries = rememberDictionaryQuery(normalized)
    if (normalized.isBlank()) {
      return DictionaryUiState(
        isLoading = false,
        query = "",
        recentQueries = recentQueries,
        entries = emptyList(),
      )
    }
    return DictionaryUiState(
      isLoading = false,
      query = normalized,
      recentQueries = recentQueries,
      entries = filterDictionaryEntries(defaultDictionaryEntries(), normalized),
    )
  }

  override suspend fun rememberDictionaryQuery(query: String): List<String> {
    val normalized = query.trim()
    if (normalized.isBlank()) {
      return loadDictionary().recentQueries
    }
    val updated =
      (listOf(normalized) + loadDictionary().recentQueries)
        .distinct()
        .take(6)
    context.contentDataStore.edit { preferences ->
      preferences[ContentPreferenceKeys.dictionaryRecentQueries] = updated.joinToString(separator = "\n")
    }
    return updated
  }

  override suspend fun loadReadingBookPages(slug: String, pageCountHint: Int): List<ReadingPageUiModel> {
    val books = buildReadingBooks()
    val book = resolveReadingBookBySlug(books, slug) ?: return emptyList()
    return book.pageContent
  }

  override suspend fun translateReadingParagraphs(
    title: String,
    paragraphs: List<String>,
    language: String,
  ): Result<List<String>> {
    if (paragraphs.isEmpty()) return Result.success(emptyList())
    return Result.success(paragraphs.map { "" })
  }

  override suspend fun loadSettings(): SettingsUiState {
    val preferences = context.contentDataStore.data.first()
    val toggles =
      settingDefinitions.map { (key, labelAndPref) ->
        val (label, prefKey) = labelAndPref
        SettingToggleUiModel(
          key = key,
          label = label,
          enabled = preferences[prefKey] ?: defaultSettingEnabled(key),
        )
      }
    return SettingsUiState(
      isLoading = false,
      notificationStatus =
        if (toggles.firstOrNull { it.key == "notificationsEnabled" }?.enabled == true) {
          "通知已开启"
        } else {
          "通知已关闭"
        },
      reminderTime = preferences[ContentPreferenceKeys.reminderTime] ?: "19:00",
      language = preferences[ContentPreferenceKeys.language] ?: "简体中文",
      quietHours = preferences[ContentPreferenceKeys.quietHours] ?: "22:00 - 08:00",
      toggles = toggles,
      learningPrefs =
        listOf(
          "学习目标" to "30 分钟 / 日",
          "卡片正面" to "韩语在前",
          "字幕模式" to "双语字幕",
          "音频速度" to "1.0x",
        ),
    )
  }

  override suspend fun toggleSetting(key: String): SettingsUiState {
    val definition = settingDefinitions.firstOrNull { it.first == key } ?: return loadSettings()
    val prefKey = definition.second.second
    val current = loadSettings()
    val currentValue = current.toggles.firstOrNull { it.key == key }?.enabled ?: defaultSettingEnabled(key)
    context.contentDataStore.edit { preferences ->
      preferences[prefKey] = !currentValue
      preferences[ContentPreferenceKeys.reminderTime] = current.reminderTime
      preferences[ContentPreferenceKeys.language] = current.language
      preferences[ContentPreferenceKeys.quietHours] = current.quietHours
    }
    return loadSettings()
  }
}

private fun defaultSettingEnabled(key: String): Boolean =
  when (key) {
    "webPush" -> false
    else -> true
  }

private fun parseRecentQueries(raw: String?): List<String> =
  raw
    ?.split('\n')
    ?.map { it.trim() }
    ?.filter { it.isNotEmpty() }
    ?: emptyList()

private fun filterDictionaryEntries(
  entries: List<DictionaryEntryUiModel>,
  query: String,
): List<DictionaryEntryUiModel> {
  if (query.isBlank()) return entries
  return entries.filter { entry ->
    entry.term.contains(query, ignoreCase = true) ||
      entry.pronunciation.contains(query, ignoreCase = true) ||
      entry.meaningKo.contains(query, ignoreCase = true) ||
      entry.meaningZh.contains(query, ignoreCase = true) ||
      entry.related.any { (word, meaning) ->
        word.contains(query, ignoreCase = true) || meaning.contains(query, ignoreCase = true)
      }
  }
}

private fun resolveReadingBookBySlug(
  books: List<ReadingBookUiModel>,
  slug: String,
): ReadingBookUiModel? {
  val normalized = slug.trim()
  return books.firstOrNull { it.slug == normalized } ?: books.firstOrNull()
}
