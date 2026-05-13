package com.hangyeol.app.compose.ui

import android.content.Intent
import android.net.Uri
import androidx.activity.compose.BackHandler
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawing
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.VerticalDivider
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.setValue
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.saveable.mapSaver
import androidx.annotation.StringRes
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalSoftwareKeyboardController
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import androidx.navigation.navDeepLink
import com.hangyeol.app.BuildConfig
import com.hangyeol.app.compose.data.ComposeServiceLocator
import com.hangyeol.app.compose.data.CommunityFeedUiModel
import com.hangyeol.app.compose.data.CommunityFriendSummaryUiModel
import com.hangyeol.app.compose.data.DashboardChallengeCard
import com.hangyeol.app.compose.data.DashboardFeedItem
import com.hangyeol.app.compose.data.GrammarDeckUiModel
import com.hangyeol.app.compose.data.LearningCurrentCourse
import com.hangyeol.app.compose.data.LearningToolShortcut
import com.hangyeol.app.compose.data.ReadingPageUiModel
import com.hangyeol.app.compose.data.TopikFilter
import com.hangyeol.app.compose.data.TopikExamQuestionUiModel
import com.hangyeol.app.compose.data.TopikExamUiModel
import com.hangyeol.app.compose.data.TopikQuestionAnalysisResult
import com.hangyeol.app.compose.data.TopikType
import com.hangyeol.app.compose.data.TopikWritingEvaluationReportUiModel
import com.hangyeol.app.compose.data.TopikWritingQuestionEvaluationUiModel
import com.hangyeol.app.compose.data.TopikWritingQuestionUiModel
import com.hangyeol.app.compose.data.WritingDraftUiModel
import com.hangyeol.app.compose.data.WritingPromptUiModel
import com.hangyeol.app.compose.navigation.HangyeolDestination
import com.hangyeol.app.compose.navigation.HangyeolRouteBaseline
import com.hangyeol.app.compose.navigation.RouteBaselineEntry
import com.hangyeol.app.compose.state.AppRootViewModel
import com.hangyeol.app.compose.state.AuthViewModel
import com.hangyeol.app.compose.state.CommunityViewModel
import com.hangyeol.app.compose.state.DictionaryViewModel
import com.hangyeol.app.compose.state.DashboardViewModel
import com.hangyeol.app.compose.state.GrammarHubViewModel
import com.hangyeol.app.compose.state.GrammarModuleViewModel
import com.hangyeol.app.compose.state.HistoryViewModel
import com.hangyeol.app.compose.state.LearningHubViewModel
import com.hangyeol.app.compose.state.NotebookViewModel
import com.hangyeol.app.compose.state.AchievementsViewModel
import com.hangyeol.app.compose.state.PodcastChannelViewModel
import com.hangyeol.app.compose.state.PodcastHistoryViewModel
import com.hangyeol.app.compose.state.PodcastLibraryViewModel
import com.hangyeol.app.compose.state.PodcastPlayerViewModel
import com.hangyeol.app.compose.state.PodcastSearchViewModel
import com.hangyeol.app.compose.state.PricingViewModel
import com.hangyeol.app.compose.state.ProfileViewModel
import com.hangyeol.app.compose.state.ReadingLibraryViewModel
import com.hangyeol.app.compose.state.ReviewHubViewModel
import com.hangyeol.app.compose.state.SettingsViewModel
import com.hangyeol.app.compose.state.TopikCenterViewModel
import com.hangyeol.app.compose.state.TopikHistoryViewModel
import com.hangyeol.app.compose.state.EpubReaderViewModel
import com.hangyeol.app.compose.state.TypingViewModel
import com.hangyeol.app.compose.state.VideoDetailViewModel
import com.hangyeol.app.compose.state.VideoLibraryViewModel
import com.hangyeol.app.compose.state.VocabBookViewModel
import com.hangyeol.app.compose.state.VocabBookListViewModel
import com.hangyeol.app.compose.state.VocabBookModeViewModel
import com.hangyeol.app.compose.state.VocabViewModel
import com.hangyeol.app.compose.state.WritingHubViewModel
import com.hangyeol.app.compose.theme.HangyeolAppTheme
import com.hangyeol.app.compose.theme.HangyeolTheme
import com.hangyeol.app.compose.ui.components.KSoftBottomTab
import com.hangyeol.app.compose.ui.components.KSoftChip
import com.hangyeol.app.compose.ui.components.KSoftDivider
import com.hangyeol.app.compose.ui.components.KSoftHanjaSeal
import com.hangyeol.app.compose.ui.components.KSoftInputField
import com.hangyeol.app.compose.ui.components.KSoftOverlineStyle
import com.hangyeol.app.compose.ui.components.KSoftPrimaryButton
import com.hangyeol.app.compose.ui.components.KSoftSectionHead
import com.hangyeol.app.compose.ui.components.KSoftSerifLabelStyle
import com.hangyeol.app.compose.ui.components.KSoftSocialAuthButton
import com.hangyeol.app.compose.ui.components.KSoftStreakRow
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch

private enum class BottomTabKind {
  Today,
  Learn,
  Immerse,
  My,
}

private data class BottomTabItem(
  @StringRes val labelRes: Int,
  val mark: String,
  val kr: String,
  val destination: HangyeolDestination,
  val kind: BottomTabKind,
)

private data class TodayHeroStep(
  @StringRes val kindRes: Int,
  val mins: Int,
  @StringRes val titleRes: Int,
  val titleArgs: List<Any> = emptyList(),
  @StringRes val subRes: Int,
  val tone: String,
  val kanji: String,
  val route: String,
)

private data class TopikExamStartState(
  val isSubmitting: Boolean = false,
  val infoMessage: String? = null,
  val errorMessage: String? = null,
)

private data class TopikWritingActionState(
  val isSubmitting: Boolean = false,
  val infoMessage: String? = null,
  val errorMessage: String? = null,
)

private val TopikExamStartStateSaver =
  mapSaver(
    save = { state ->
      mapOf(
        "isSubmitting" to state.isSubmitting,
        "infoMessage" to state.infoMessage,
        "errorMessage" to state.errorMessage,
      )
    },
    restore = { restored ->
      TopikExamStartState(
        isSubmitting = restored["isSubmitting"] as? Boolean ?: false,
        infoMessage = restored["infoMessage"] as? String,
        errorMessage = restored["errorMessage"] as? String,
      )
    },
  )

private val TopikWritingActionStateSaver =
  mapSaver(
    save = { state ->
      mapOf(
        "isSubmitting" to state.isSubmitting,
        "infoMessage" to state.infoMessage,
        "errorMessage" to state.errorMessage,
      )
    },
    restore = { restored ->
      TopikWritingActionState(
        isSubmitting = restored["isSubmitting"] as? Boolean ?: false,
        infoMessage = restored["infoMessage"] as? String,
        errorMessage = restored["errorMessage"] as? String,
      )
    },
  )

private enum class TopikJumpFilter(val label: String) {
  ALL("全部"),
  UNANSWERED("未答"),
  ANSWERED("已答"),
  MARKED("标记");

  companion object {
    fun fromName(raw: String): TopikJumpFilter {
      return entries.firstOrNull { it.name == raw } ?: ALL
    }
  }
}

private fun formatRemainingClock(totalSeconds: Long): String {
  val safe = totalSeconds.coerceAtLeast(0L)
  val minutes = safe / 60
  val seconds = safe % 60
  return String.format("%02d:%02d", minutes, seconds)
}

@Composable
private fun AuthHeroSeal(
  modifier: Modifier = Modifier,
) {
  Surface(
    modifier = modifier.size(64.dp),
    color = HangyeolTheme.extendedColors.crimson,
    shape = RoundedCornerShape(16.dp),
  ) {
    Box(contentAlignment = androidx.compose.ui.Alignment.Center) {
      Text(
        text = "韓",
        color = HangyeolTheme.colorScheme.surface,
        style =
          HangyeolTheme.typography.headlineLarge.copy(
            fontFamily = FontFamily.Serif,
            fontSize = 27.sp,
            lineHeight = 31.sp,
            fontWeight = FontWeight.ExtraBold,
            letterSpacing = (-0.8).sp,
          ),
        modifier = Modifier.offset(y = (-0.5).dp),
      )
    }
  }
}

private val BottomTabs =
  listOf(
    BottomTabItem(R.string.tab_today, "今", "오늘", HangyeolDestination.TabsToday, BottomTabKind.Today),
    BottomTabItem(R.string.tab_learn, "學", "배우다", HangyeolDestination.TabsCourses, BottomTabKind.Learn),
    BottomTabItem(R.string.tab_immerse, "浸", "몰입", HangyeolDestination.TabsMedia, BottomTabKind.Immerse),
    BottomTabItem(R.string.tab_my, "我", "나의", HangyeolDestination.TabsProfile, BottomTabKind.My),
  )

private fun bottomTabForRoute(route: String?): BottomTabItem? {
  if (route.isNullOrBlank()) return null
  return when {
    route == HangyeolDestination.TabsToday.pattern ||
      route == HangyeolDestination.Dictionary.pattern ||
      route.startsWith("main/community") ||
      route == HangyeolDestination.Leaderboard.pattern -> BottomTabs.first { it.kind == BottomTabKind.Today }

    route == HangyeolDestination.TabsCourses.pattern ||
      route.startsWith("main/vocab") ||
      route.startsWith("main/grammar") ||
      route == HangyeolDestination.Review.pattern ||
      route == HangyeolDestination.Writing.pattern ||
      route.startsWith("main/topik") ||
      route == HangyeolDestination.Notebook.pattern ||
      route == HangyeolDestination.Typing.pattern -> BottomTabs.first { it.kind == BottomTabKind.Learn }

    route == HangyeolDestination.TabsMedia.pattern ||
      route.startsWith("main/reading") ||
      route.startsWith("main/picture-book") ||
      route.startsWith("main/reader-focus") ||
      route.startsWith("main/videos") ||
      route.startsWith("main/video") ||
      route.startsWith("main/podcasts") ||
      route.startsWith("main/podcast-channel") -> BottomTabs.first { it.kind == BottomTabKind.Immerse }

    route == HangyeolDestination.TabsProfile.pattern ||
      route.startsWith("main/profile") ||
      route == HangyeolDestination.Pricing.pattern ||
      route == HangyeolDestination.Achievements.pattern -> BottomTabs.first { it.kind == BottomTabKind.My }

    else -> null
  }
}

internal fun shouldShowBottomBar(route: String?): Boolean {
  if (bottomTabForRoute(route) == null) return false
  if (route == null) return false
  return !isImmersiveRoute(route)
}

private fun isRootBottomTabRoute(route: String?): Boolean =
  BottomTabs.any { it.destination.pattern == route }

private fun isImmersiveRoute(route: String): Boolean =
  route.startsWith("main/topik/writing/") ||
    (route.startsWith("main/topik/") && route != HangyeolDestination.TopikHistory.pattern) ||
    route.startsWith("main/reader-focus") ||
    route.startsWith("main/picture-book") ||
    route.startsWith("main/video/") ||
    route.startsWith("main/podcasts/player") ||
    route.startsWith("main/vocab-book/immerse") ||
    route.startsWith("main/vocab-book/listen") ||
    route.startsWith("main/vocab-book/dictation") ||
    route.startsWith("main/vocab-book/spelling")

@Composable
private fun serifLabelTextStyle() =
  HangyeolTheme.typography.bodySmall.copy(
    fontFamily = FontFamily.Serif,
    fontSize = 12.sp,
    lineHeight = 15.sp,
    fontWeight = FontWeight.Medium,
    letterSpacing = 3.sp,
  )

@Composable
private fun overlineTextStyle() =
  HangyeolTheme.typography.bodySmall.copy(
    fontSize = 11.sp,
    lineHeight = 14.sp,
    fontWeight = FontWeight.Bold,
    letterSpacing = 1.8.sp,
  )

private val SupportedAuthAppLinkHosts =
  setOf(
    "hangyeol.app",
    "www.hangyeol.app",
    "koreanstudy.me",
    "www.koreanstudy.me",
  )

private val SupportedAuthLocalePrefixes = setOf("en", "zh", "vi", "mn")

internal fun resolveRoute(route: String): String =
  when {
    route.isBlank() -> HangyeolDestination.TabsToday.pattern
    route.startsWith("http://") || route.startsWith("https://") ->
      HangyeolDestination.TabsToday.pattern
    route.startsWith("/") -> resolveWebPathRoute(route)
    route == "main/achievements" -> HangyeolDestination.Achievements.pattern
    route == "main/leaderboard" -> HangyeolDestination.Leaderboard.pattern
    route == "main/typing" -> HangyeolDestination.Typing.pattern
    route == "main/vocab-book" -> HangyeolDestination.VocabBook.pattern
    route.startsWith("main/vocab-book/") -> {
      val mode = route.removePrefix("main/vocab-book/").substringBefore("?")
      HangyeolDestination.VocabBookMode.createRoute(mode)
    }
    route.startsWith("main/grammar/") && route.endsWith("/practice") -> {
      val deckId = route.removePrefix("main/grammar/").removeSuffix("/practice")
      HangyeolDestination.GrammarPractice.createRoute(deckId)
    }
    route.startsWith("main/grammar/") -> {
      val deckId = route.removePrefix("main/grammar/")
      HangyeolDestination.GrammarModule.createRoute(deckId)
    }
    route.startsWith("main/topik/writing/") -> {
      val examId = route.removePrefix("main/topik/writing/")
      HangyeolDestination.TopikWriting.createRoute(examId)
    }
    route.startsWith("main/topik/") -> {
      val examId = route.removePrefix("main/topik/").substringBefore("?")
      val review = route.contains("review=true")
      val wrongOnly = route.contains("wrongOnly=true")
      HangyeolDestination.TopikExam.createRoute(examId, review, wrongOnly)
    }
    route == "main/grammar" -> HangyeolDestination.Grammar.pattern
    route == "main/review" -> HangyeolDestination.Review.pattern
    route == "main/review/quiz" -> HangyeolDestination.ReviewQuiz.pattern
    route == "main/writing" -> HangyeolDestination.Writing.pattern
    route == "main/vocab" -> HangyeolDestination.Vocab.pattern
    route == "main/dictionary" -> HangyeolDestination.Dictionary.pattern
    route == "main/notebook" -> HangyeolDestination.Notebook.pattern
    route == "main/reading" -> HangyeolDestination.Reading.pattern
    route.startsWith("main/reading/library/") -> {
      val slug = route.removePrefix("main/reading/library/").substringBefore("?")
      HangyeolDestination.EpubReader.createRoute(slug)
    }
    route.startsWith("main/picture-book") -> HangyeolDestination.PictureBook.pattern
    route.startsWith("main/reader-focus") -> {
      val slug = route.substringAfter("slug=", "").substringBefore("&").ifBlank { null }
      val pageIndex = route.substringAfter("pageIndex=", "0").substringBefore("&").toIntOrNull() ?: 0
      HangyeolDestination.ReaderFocus.createRoute(slug = slug, pageIndex = pageIndex)
    }
    route == "main/videos" -> HangyeolDestination.Videos.pattern
    route.startsWith("main/video/") -> {
      val videoId = route.removePrefix("main/video/").substringBefore("?")
      HangyeolDestination.VideoPlayer.createRoute(videoId)
    }
    route == "main/podcasts" -> HangyeolDestination.Podcasts.pattern
    route == "main/podcasts/search" -> HangyeolDestination.PodcastSearch.pattern
    route == "main/podcasts/history" -> HangyeolDestination.PodcastHistory.pattern
    route.startsWith("main/podcasts/player") -> {
      val episodeId = route.substringAfter("episodeId=", "").substringBefore("&").ifBlank { null }
      HangyeolDestination.PodcastPlayer.createRoute(episodeId)
    }
    route.startsWith("main/podcast-channel") -> {
      val channelId = route.substringAfter("channelId=", "").substringBefore("&").ifBlank { null }
      HangyeolDestination.PodcastChannel.createRoute(channelId = channelId)
    }
    route == "main/history" -> HangyeolDestination.History.pattern
    route == "main/community" -> HangyeolDestination.Community.pattern
    route == "main/community/add" -> HangyeolDestination.CommunityAdd.pattern
    route == "main/profile/settings/notifications" -> HangyeolDestination.ProfileSettingsSection.createRoute("notifications")
    route == "main/profile/settings/language" -> HangyeolDestination.ProfileSettingsSection.createRoute("language")
    route == "main/profile/settings" -> HangyeolDestination.ProfileSettings.pattern
    route == "main/topik/history" -> HangyeolDestination.TopikHistory.pattern
    route == "main/pricing" -> HangyeolDestination.Pricing.pattern
    route == "main/subscription" -> HangyeolDestination.SubscriptionDetail.pattern
    route == "main/podcasts/subscriptions" -> HangyeolDestination.PodcastSubscriptions.pattern
    route.startsWith("main/topik/writing/") && route.endsWith("/evaluation") -> {
      val sessionId = route.removePrefix("main/topik/writing/").removeSuffix("/evaluation")
      HangyeolDestination.WritingEvaluation.createRoute(sessionId)
    }
    route.startsWith("main/reading/article/") -> {
      val articleId = route.removePrefix("main/reading/article/").substringBefore("?")
      HangyeolDestination.ReadingArticle.createRoute(articleId)
    }
    route == "main/reading/upload" -> HangyeolDestination.EpubUpload.pattern
    else -> HangyeolDestination.TabsToday.pattern
  }

internal fun resolveWebPathRoute(path: String): String {
  val normalized = path.substringBefore("?").trimEnd('/')
  val segments =
    normalized
      .split("/")
      .filter { it.isNotBlank() }
      .let { raw ->
        if (raw.firstOrNull() in SupportedAuthLocalePrefixes) raw.drop(1) else raw
      }
  return when {
    segments.isEmpty() -> HangyeolDestination.TabsToday.pattern
    segments == listOf("dashboard") -> HangyeolDestination.TabsToday.pattern
    segments == listOf("courses") -> HangyeolDestination.TabsCourses.pattern
    segments == listOf("media") -> HangyeolDestination.TabsMedia.pattern
    segments == listOf("profile") -> HangyeolDestination.TabsProfile.pattern
    segments == listOf("profile", "settings") -> HangyeolDestination.ProfileSettings.pattern
    segments.size >= 3 && segments[0] == "profile" && segments[1] == "settings" ->
      HangyeolDestination.ProfileSettingsSection.createRoute(segments[2])
    segments == listOf("achievements") -> HangyeolDestination.Achievements.pattern
    segments == listOf("leaderboard") -> HangyeolDestination.Leaderboard.pattern
    segments == listOf("history") -> HangyeolDestination.History.pattern
    segments == listOf("review") -> HangyeolDestination.Review.pattern
    segments == listOf("review", "quiz") -> HangyeolDestination.ReviewQuiz.pattern
    segments == listOf("typing") -> HangyeolDestination.Typing.pattern
    segments == listOf("notebook") -> HangyeolDestination.Notebook.pattern
    segments == listOf("vocab-book") -> HangyeolDestination.VocabBook.pattern
    segments.size == 2 && segments.first() == "vocab-book" -> HangyeolDestination.VocabBookMode.createRoute(segments[1])
    segments == listOf("topik") -> HangyeolDestination.Topik.pattern
    segments == listOf("topik", "history") -> HangyeolDestination.TopikHistory.pattern
    segments.size >= 4 && segments[0] == "topik" && segments[1] == "writing" && segments[3] == "evaluation" ->
      HangyeolDestination.WritingEvaluation.createRoute(segments[2])
    segments.size >= 3 && segments[0] == "topik" && segments[1] == "writing" -> HangyeolDestination.TopikWriting.createRoute(segments[2])
    segments.size >= 2 && segments[0] == "topik" -> HangyeolDestination.TopikExam.createRoute(segments[1])
    segments == listOf("dictionary", "search") -> HangyeolDestination.Dictionary.pattern
    segments == listOf("community") -> HangyeolDestination.Community.pattern
    segments == listOf("community", "add") -> HangyeolDestination.CommunityAdd.pattern
    segments == listOf("pricing") -> HangyeolDestination.Pricing.pattern
    segments == listOf("subscription") -> HangyeolDestination.SubscriptionDetail.pattern
    segments == listOf("reading") -> HangyeolDestination.Reading.pattern
    segments.size >= 3 && segments[0] == "reading" && segments[1] == "books" -> HangyeolDestination.PictureBook.createRoute(slug = segments[2])
    segments.size >= 3 && segments[0] == "reading" && segments[1] == "library" -> HangyeolDestination.EpubReader.createRoute(segments[2])
    segments.size >= 3 && segments[0] == "reading" && segments[1] == "article" -> HangyeolDestination.ReadingArticle.createRoute(segments[2])
    segments == listOf("reading", "upload") -> HangyeolDestination.EpubUpload.pattern
    segments == listOf("videos") -> HangyeolDestination.Videos.pattern
    segments.size >= 2 && segments[0] == "video" -> HangyeolDestination.VideoPlayer.createRoute(segments[1])
    segments == listOf("podcasts") -> HangyeolDestination.Podcasts.pattern
    segments == listOf("podcasts", "subscriptions") -> HangyeolDestination.PodcastSubscriptions.pattern
    segments == listOf("podcasts", "search") -> HangyeolDestination.PodcastSearch.pattern
    segments == listOf("podcasts", "history") -> HangyeolDestination.PodcastHistory.pattern
    segments == listOf("podcasts", "player") -> HangyeolDestination.PodcastPlayer.createRoute()
    segments == listOf("podcasts", "channel") -> HangyeolDestination.PodcastChannel.pattern
    segments.size >= 2 && segments[0] == "course" -> {
      when (segments.getOrNull(2)) {
        "vocab" -> HangyeolDestination.VocabDeck.createRoute(segments[1])
        "grammar" -> HangyeolDestination.GrammarModule.createRoute(segments[1])
        else -> HangyeolDestination.VocabDeck.createRoute(segments[1])
      }
    }
    else -> HangyeolDestination.TabsToday.pattern
  }
}

internal fun resolveOAuthCallbackRoute(intent: Intent): String? {
  val uri = intent.data ?: return null
  if (!uri.isOAuthCallbackUri()) return null

  val fragmentValues = uri.fragmentValues()
  val code = uri.firstQueryValue("code", "auth_code") ?: fragmentValues["code"] ?: fragmentValues["auth_code"]
  val verifier =
    uri.firstQueryValue("verifier", "code_verifier", "codeVerifier", "pkce_verifier", "pkceVerifier")
      ?: fragmentValues["verifier"]
      ?: fragmentValues["code_verifier"]
      ?: fragmentValues["codeVerifier"]
      ?: fragmentValues["pkce_verifier"]
      ?: fragmentValues["pkceVerifier"]
  val provider = uri.firstQueryValue("provider").orEmpty().ifBlank { fragmentValues["provider"].orEmpty().ifBlank { "oauth" } }
  return HangyeolDestination.AuthOAuthCallback.createRoute(
    provider = provider,
    code = code.orEmpty(),
    verifier = verifier.orEmpty(),
  )
}

internal fun resolveInboundAuthRoute(intent: Intent): String? {
  resolveOAuthCallbackRoute(intent)?.let { return it }
  val uri = intent.data ?: return null
  val segments = uri.normalizedAuthPathSegments()
  if (segments.size < 2) return null
  val authArea = segments[0]
  val target = segments[1]
  if (authArea != "auth") return null

  return when (target) {
    "login" -> HangyeolDestination.AuthLogin.pattern
    "register" -> HangyeolDestination.AuthRegister.pattern
    "forgot-password" -> HangyeolDestination.AuthForgotPassword.pattern
    "verify-email" -> HangyeolDestination.AuthVerifyEmail.createRoute(uri.firstQueryValue("token"))
    "reset-password" -> HangyeolDestination.AuthResetPassword.createRoute(uri.firstQueryValue("token"))
    else -> null
  }
}

private fun Uri.isOAuthCallbackUri(): Boolean {
  val segments = normalizedAuthPathSegments()
  if (segments.isEmpty()) return false
  return (segments[0] == "auth" && segments.getOrNull(1) == "oauth-callback") ||
    (segments[0] == "oauth" && segments.getOrNull(1) == "callback")
}

private fun Uri.firstQueryValue(vararg keys: String): String? {
  for (key in keys) {
    val value = getQueryParameter(key)?.trim()
    if (!value.isNullOrEmpty()) {
      return value
    }
  }
  return null
}

private fun Uri.normalizedAuthPathSegments(): List<String> {
  val rawSegments = pathSegments.mapNotNull { it.trim().ifEmpty { null } }
  if (scheme == "hangyeol") {
    val normalizedHost = host.orEmpty()
    if (normalizedHost == "auth" || normalizedHost == "oauth") {
      return listOf(normalizedHost) + rawSegments
    }
    return rawSegments
  }

  if (scheme != "https") return rawSegments
  val normalizedHost = host.orEmpty().lowercase()
  if (normalizedHost !in SupportedAuthAppLinkHosts) return rawSegments
  if (rawSegments.isEmpty()) return rawSegments

  val firstSegment = rawSegments.first().lowercase()
  return if (firstSegment in SupportedAuthLocalePrefixes) {
    rawSegments.drop(1)
  } else {
    rawSegments
  }
}

private fun Uri.fragmentValues(): Map<String, String> {
  val fragment = fragment?.trim().orEmpty()
  if (fragment.isEmpty()) return emptyMap()

  return fragment
    .split("&")
    .mapNotNull { token ->
      val keyValue = token.split("=", limit = 2)
      val key = keyValue.firstOrNull()?.trim().orEmpty()
      if (key.isEmpty()) return@mapNotNull null
      val value = keyValue.getOrNull(1)?.trim().orEmpty()
      key to Uri.decode(value)
    }
    .toMap()
}

private fun buildOAuthRedirectUri(provider: String): String {
  val encodedProvider = Uri.encode(provider)
  val configuredBase = BuildConfig.OAUTH_REDIRECT_BASE_URL.trim().trimEnd('/')
  if (configuredBase.isNotEmpty()) {
    return "$configuredBase/auth/oauth-callback?provider=$encodedProvider"
  }
  return "hangyeol://auth/oauth-callback?provider=$encodedProvider"
}

private fun NavHostController.navigateToRootTab(route: String) {
  navigate(route) {
    popUpTo(graph.findStartDestination().id) {
      saveState = true
    }
    launchSingleTop = true
    restoreState = true
  }
}

private fun NavHostController.navigateSingleTopTo(route: String) {
  if (currentDestination?.route == route) {
    return
  }
  navigate(route) {
    launchSingleTop = true
  }
}

private fun isAuthRoute(route: String): Boolean = route.startsWith("auth/")

@Composable
fun HangyeolComposeApp(
  deepLinkIntent: Intent? = null,
) {
  val viewModel: AppRootViewModel =
    viewModel(factory = AppRootViewModel.factory(ComposeServiceLocator.sessionRepository))
  val sessionState by viewModel.sessionState.collectAsStateWithLifecycle()
  val navController = rememberNavController()
  val rootBackStackEntry by navController.currentBackStackEntryAsState()
  val rootRoute = rootBackStackEntry?.destination?.route
  val shouldHonorAuthDeepLink = deepLinkIntent?.let(::resolveInboundAuthRoute) != null

  HangyeolAppTheme {
    LaunchedEffect(sessionState.isBootstrapping, sessionState.isAuthenticated, shouldHonorAuthDeepLink, rootRoute) {
      if (sessionState.isBootstrapping) {
        return@LaunchedEffect
      }

      if (shouldHonorAuthDeepLink) {
        return@LaunchedEffect
      }

      if (rootRoute == null) {
        return@LaunchedEffect
      }

      if (sessionState.isAuthenticated) {
        if (!isAuthRoute(rootRoute)) {
          return@LaunchedEffect
        }
        navController.navigate(HangyeolDestination.TabsToday.pattern) {
          popUpTo(navController.graph.findStartDestination().id) {
            inclusive = true
          }
          launchSingleTop = true
        }
        return@LaunchedEffect
      }

      if (isAuthRoute(rootRoute)) {
        return@LaunchedEffect
      }

      navController.navigate(HangyeolDestination.AuthLogin.pattern) {
        popUpTo(navController.graph.findStartDestination().id) {
          inclusive = true
        }
        launchSingleTop = true
      }
    }

    Surface(
      modifier = Modifier.fillMaxSize(),
      color = HangyeolTheme.colorScheme.background,
    ) {
      ComposeNavShell(
        navController = navController,
        deepLinkIntent = deepLinkIntent,
        sessionDisplayName = sessionState.displayName,
        streakDays = sessionState.streakDays,
        learningHours = sessionState.learningHours,
        isAuthenticated = sessionState.isAuthenticated,
        onSignInPreview = viewModel::signInPreview,
        onSignOut = viewModel::signOut,
      )
    }
  }
}

@Composable
private fun ComposeNavShell(
  navController: NavHostController,
  deepLinkIntent: Intent?,
  sessionDisplayName: String,
  streakDays: Int,
  learningHours: Int,
  isAuthenticated: Boolean,
  onSignInPreview: () -> Unit,
  onSignOut: () -> Unit,
) {
  val context = LocalContext.current
  var handledDeepLinkSignature by rememberSaveable { mutableStateOf<String?>(null) }
  val launchOAuthProvider: (String) -> Unit = { provider ->
    val redirectTo = Uri.encode(buildOAuthRedirectUri(provider))
    val entryUrl = "${BuildConfig.CONVEX_URL}/api/auth/signin/$provider?redirectTo=$redirectTo"
    runCatching {
      context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(entryUrl)))
    }
  }
  val currentBackStackEntry by navController.currentBackStackEntryAsState()
  val currentRoute = currentBackStackEntry?.destination?.route
  val currentBottomTab = bottomTabForRoute(currentRoute)
  val showBottomBar = shouldShowBottomBar(currentRoute)
  val isRootTabRoute = isRootBottomTabRoute(currentRoute)
  val authenticatedRootRoute = HangyeolDestination.TabsToday.pattern
  val guestRootRoute = HangyeolDestination.AuthLogin.pattern
  val canFallbackToAuthenticatedRoot =
    isAuthenticated &&
      currentRoute != null &&
      !isRootTabRoute &&
      !isAuthRoute(currentRoute) &&
      navController.previousBackStackEntry == null
  val canFallbackToGuestRoot =
    !isAuthenticated &&
      currentRoute != null &&
      currentRoute.startsWith("auth/") &&
      currentRoute != guestRootRoute

  BackHandler(enabled = isRootTabRoute && currentRoute != authenticatedRootRoute) {
    navController.navigateToRootTab(authenticatedRootRoute)
  }

  BackHandler(enabled = canFallbackToAuthenticatedRoot && navController.previousBackStackEntry == null) {
    navController.navigateToRootTab(authenticatedRootRoute)
  }

  BackHandler(enabled = canFallbackToGuestRoot && navController.previousBackStackEntry == null) {
    navController.navigateSingleTopTo(guestRootRoute)
  }

  LaunchedEffect(deepLinkIntent, currentRoute) {
    if (currentRoute == null) {
      return@LaunchedEffect
    }

    val intent = deepLinkIntent ?: return@LaunchedEffect
    val signature = intent.dataString ?: intent.action
    if (signature != null && signature == handledDeepLinkSignature) {
      return@LaunchedEffect
    }

    val inboundAuthRoute = resolveInboundAuthRoute(intent)
    if (inboundAuthRoute != null) {
      navController.navigateSingleTopTo(inboundAuthRoute)
      handledDeepLinkSignature = signature
      return@LaunchedEffect
    }

    navController.handleDeepLink(intent)
    handledDeepLinkSignature = signature
  }

  Scaffold(
    contentWindowInsets = WindowInsets.safeDrawing,
    containerColor = HangyeolTheme.colorScheme.background,
    bottomBar = {
      if (showBottomBar) {
        Surface(
          color = HangyeolTheme.extendedColors.tabBar,
          tonalElevation = 0.dp,
          shadowElevation = 0.dp,
          modifier = Modifier.navigationBarsPadding(),
        ) {
          Column {
            HorizontalDivider(color = HangyeolTheme.extendedColors.tabBarBorder)
            Row(
              modifier =
                Modifier
                  .fillMaxWidth()
                  .padding(horizontal = 8.dp, vertical = 10.dp),
              horizontalArrangement = Arrangement.spacedBy(4.dp),
            ) {
              BottomTabs.forEach { tab ->
                val selected = currentBottomTab?.kind == tab.kind
                KSoftBottomTab(
                  modifier =
                    Modifier
                      .weight(1f)
                      .padding(horizontal = 2.dp),
                  label = tab.kr,
                  active = selected,
                  badge = false,
                  onPress = { navController.navigateToRootTab(tab.destination.pattern) },
                  icon = {
                    BottomTabIcon(
                      kind = tab.kind,
                      mark = tab.mark,
                      selected = selected,
                    )
                  },
                )
              }
            }
          }
        }
      }
    },
  ) { innerPadding ->
    NavHost(
      navController = navController,
      startDestination = HangyeolDestination.AuthLogin.pattern,
      modifier =
        Modifier
          .fillMaxSize()
          .imePadding()
          .padding(innerPadding),
    ) {
      composable(
        route = HangyeolDestination.AuthLogin.pattern,
        deepLinks = HangyeolDestination.AuthLogin.baseline.deepLinks.map { uri ->
          navDeepLink { uriPattern = uri }
        },
      ) {
        AuthScreen(
          isRegister = false,
          titleRes = R.string.auth_login_title,
          subtitleRes = R.string.auth_login_subtitle,
          actionLabelRes = R.string.auth_login_action,
          secondaryLabelRes = R.string.auth_register_action,
          onPrimaryAction = {
            navController.navigate(HangyeolDestination.TabsToday.pattern) {
              popUpTo(navController.graph.findStartDestination().id) { inclusive = true }
              launchSingleTop = true
            }
          },
          onSocialAuth = launchOAuthProvider,
          onForgotPassword = { navController.navigate(HangyeolDestination.AuthForgotPassword.pattern) },
          onSecondaryAction = { navController.navigate(HangyeolDestination.AuthRegister.pattern) }
        )
      }

      composable(
        route = HangyeolDestination.AuthRegister.pattern,
        deepLinks = HangyeolDestination.AuthRegister.baseline.deepLinks.map { uri ->
          navDeepLink { uriPattern = uri }
        },
      ) {
        AuthScreen(
          isRegister = true,
          titleRes = R.string.auth_register_title,
          subtitleRes = R.string.auth_register_subtitle,
          actionLabelRes = R.string.auth_register_action,
          secondaryLabelRes = R.string.auth_login_action,
          onPrimaryAction = {
            navController.navigate(HangyeolDestination.TabsToday.pattern) {
              popUpTo(navController.graph.findStartDestination().id) { inclusive = true }
              launchSingleTop = true
            }
          },
          onSocialAuth = launchOAuthProvider,
          onSecondaryAction = { navController.navigate(HangyeolDestination.AuthLogin.pattern) },
        )
      }

      composable(route = HangyeolDestination.AuthForgotPassword.pattern) {
        ForgotPasswordScreen(
          onBackToLogin = { navController.popBackStack(HangyeolDestination.AuthLogin.pattern, false) },
          onSuccess = { navController.navigate(HangyeolDestination.AuthLogin.pattern) },
        )
      }

      composable(
        route = HangyeolDestination.AuthVerifyEmail.pattern,
        arguments = listOf(navArgument("token") { type = NavType.StringType; nullable = true }),
        deepLinks = HangyeolDestination.AuthVerifyEmail.baseline.deepLinks.map { uri ->
          navDeepLink { uriPattern = uri }
        },
      ) { backStackEntry ->
        EmailVerificationScreen(
          token = backStackEntry.arguments?.getString("token"),
          onBackToLogin = { navController.navigate(HangyeolDestination.AuthLogin.pattern) },
        )
      }

      composable(
        route = HangyeolDestination.AuthResetPassword.pattern,
        arguments = listOf(navArgument("token") { type = NavType.StringType; nullable = true }),
      ) { backStackEntry ->
        PasswordResetConfirmScreen(
          token = backStackEntry.arguments?.getString("token"),
          onBackToLogin = { navController.navigate(HangyeolDestination.AuthLogin.pattern) },
          onSuccess = { navController.navigate(HangyeolDestination.AuthLogin.pattern) },
        )
      }

      composable(
        route = HangyeolDestination.AuthOAuthCallback.pattern,
        arguments =
          listOf(
            navArgument("provider") { type = NavType.StringType; nullable = true },
            navArgument("code") { type = NavType.StringType; nullable = true },
            navArgument("verifier") { type = NavType.StringType; nullable = true },
          ),
        deepLinks = HangyeolDestination.AuthOAuthCallback.baseline.deepLinks.map { uri ->
          navDeepLink { uriPattern = uri }
        },
      ) { backStackEntry ->
        OAuthCallbackScreen(
          provider = backStackEntry.arguments?.getString("provider"),
          code = backStackEntry.arguments?.getString("code"),
          verifier = backStackEntry.arguments?.getString("verifier"),
          onSuccess = {
            navController.navigate(HangyeolDestination.TabsToday.pattern) {
              popUpTo(navController.graph.findStartDestination().id) { inclusive = true }
              launchSingleTop = true
            }
          },
          onBackToLogin = {
            navController.navigate(HangyeolDestination.AuthLogin.pattern) {
              popUpTo(navController.graph.findStartDestination().id) { inclusive = true }
              launchSingleTop = true
            }
          },
        )
      }

      composable(route = HangyeolDestination.TabsToday.pattern) {
        DashboardScreen(
          displayName = sessionDisplayName,
          streakDays = streakDays,
          learningHours = learningHours,
          onNavigateRoute = navController::navigate,
        )
      }

      composable(route = HangyeolDestination.TabsCourses.pattern) {
        LearningHubScreen(onNavigateRoute = navController::navigate)
      }

      composable(route = HangyeolDestination.TabsMedia.pattern) {
        MediaHubScreen(onNavigateRoute = navController::navigate)
      }

      composable(route = HangyeolDestination.TabsProfile.pattern) {
        ProfileScreen(
          displayName = sessionDisplayName,
          isAuthenticated = isAuthenticated,
          onNavigateRoute = navController::navigate,
          onSignOut = onSignOut,
        )
      }

      composable(route = HangyeolDestination.Vocab.pattern) {
        VocabScreen(
          onBack = { navController.popBackStack() },
          onNavigateRoute = navController::navigate,
        )
      }

      composable(
        route = HangyeolDestination.VocabDeck.pattern,
        arguments = listOf(navArgument("deckId") { type = NavType.StringType }),
      ) { backStackEntry ->
        VocabDeckScreen(
          deckId = backStackEntry.arguments?.getString("deckId").orEmpty(),
          onBack = { navController.popBackStack() },
          onNavigateRoute = navController::navigate,
        )
      }

      composable(route = HangyeolDestination.VocabBook.pattern) {
        VocabBookScreen(
          onBack = { navController.popBackStack() },
          onNavigateRoute = navController::navigate,
        )
      }

      composable(
        route = HangyeolDestination.VocabBookMode.pattern,
        arguments = listOf(navArgument("mode") { type = NavType.StringType }),
      ) { backStackEntry ->
        VocabBookModeScreen(
          mode = backStackEntry.arguments?.getString("mode").orEmpty(),
          onBack = { navController.popBackStack() },
          onNavigateRoute = navController::navigate,
        )
      }

      composable(route = HangyeolDestination.Grammar.pattern) {
        GrammarHubScreen(onNavigateRoute = navController::navigate)
      }

      composable(route = HangyeolDestination.Writing.pattern) {
        WritingHubScreen(
          onBack = { navController.popBackStack() },
          onNavigateRoute = navController::navigate,
        )
      }

      composable(route = HangyeolDestination.Typing.pattern) {
        TypingScreen(
          onBack = { navController.popBackStack() },
        )
      }

      composable(
        route = HangyeolDestination.GrammarModule.pattern,
        arguments = listOf(navArgument("deckId") { type = NavType.StringType }),
      ) { backStackEntry ->
        GrammarModuleScreen(
          deckId = backStackEntry.arguments?.getString("deckId").orEmpty(),
          onBack = { navController.popBackStack() },
          onNavigateRoute = navController::navigate,
        )
      }

      composable(
        route = HangyeolDestination.GrammarPractice.pattern,
        arguments = listOf(navArgument("deckId") { type = NavType.StringType }),
      ) { backStackEntry ->
        GrammarPracticeScreen(
          deckId = backStackEntry.arguments?.getString("deckId").orEmpty(),
          onBack = { navController.popBackStack() },
          onNavigateRoute = navController::navigate,
        )
      }

      composable(route = HangyeolDestination.Review.pattern) {
        ReviewHubScreen(
          onBack = { navController.popBackStack() },
          onNavigateRoute = navController::navigate,
        )
      }

      composable(route = HangyeolDestination.ReviewQuiz.pattern) {
        ReviewQuizScreen(
          onBack = { navController.popBackStack() },
        )
      }

      composable(route = HangyeolDestination.Topik.pattern) {
        TopikHubScreen(
          onBack = { navController.popBackStack() },
          onNavigateRoute = navController::navigate,
        )
      }

      composable(
        route = HangyeolDestination.TopikExam.pattern,
        arguments =
          listOf(
            navArgument("examId") { type = NavType.StringType },
            navArgument("review") {
              type = NavType.BoolType
              defaultValue = false
            },
            navArgument("wrongOnly") {
              type = NavType.BoolType
              defaultValue = false
            },
          ),
        deepLinks = HangyeolDestination.TopikExam.baseline.deepLinks.map { uri ->
          navDeepLink { uriPattern = uri }
        },
      ) { backStackEntry ->
        TopikExamScreen(
          examId = backStackEntry.arguments?.getString("examId").orEmpty(),
          review = backStackEntry.arguments?.getBoolean("review") ?: false,
          wrongOnly = backStackEntry.arguments?.getBoolean("wrongOnly") ?: false,
          onBack = { navController.popBackStack() },
          onNavigateRoute = navController::navigate,
        )
      }

      composable(
        route = HangyeolDestination.TopikWriting.pattern,
        arguments = listOf(navArgument("examId") { type = NavType.StringType }),
      ) { backStackEntry ->
        TopikWritingScreen(
          examId = backStackEntry.arguments?.getString("examId").orEmpty(),
          onBack = { navController.popBackStack() },
          onNavigateRoute = navController::navigate,
        )
      }

      composable(route = HangyeolDestination.Dictionary.pattern) {
        DictionaryScreen(onBack = { navController.popBackStack() })
      }

      composable(route = HangyeolDestination.Notebook.pattern) {
        NotebookScreen(onBack = { navController.popBackStack() })
      }

      composable(route = HangyeolDestination.Reading.pattern) {
        ReadingLibraryScreen(
          onBack = { navController.popBackStack() },
          onNavigateRoute = navController::navigate,
        )
      }

      composable(
        route = HangyeolDestination.PictureBook.pattern,
        arguments =
          listOf(
            navArgument("level") { type = NavType.StringType; nullable = true; defaultValue = "" },
            navArgument("slug") { type = NavType.StringType; nullable = true; defaultValue = "" },
          ),
      ) { backStackEntry ->
        PictureBookScreen(
          level = backStackEntry.arguments?.getString("level").orEmpty(),
          slug = backStackEntry.arguments?.getString("slug").orEmpty(),
          onBack = { navController.popBackStack() },
          onNavigateRoute = navController::navigate,
        )
      }

      composable(
        route = HangyeolDestination.ReaderFocus.pattern,
        arguments =
          listOf(
            navArgument("slug") { type = NavType.StringType; nullable = true; defaultValue = "" },
            navArgument("pageIndex") { type = NavType.IntType; defaultValue = 0 },
          ),
      ) { backStackEntry ->
        ReaderFocusScreen(
          slug = backStackEntry.arguments?.getString("slug").orEmpty(),
          pageIndex = backStackEntry.arguments?.getInt("pageIndex") ?: 0,
          onBack = { navController.popBackStack() },
          onNavigateRoute = navController::navigate,
        )
      }

      composable(
        route = HangyeolDestination.EpubReader.pattern,
        arguments = listOf(navArgument("slug") { type = NavType.StringType }),
      ) { backStackEntry ->
        EpubReaderScreen(
          slug = backStackEntry.arguments?.getString("slug").orEmpty(),
          onBack = { navController.popBackStack() },
        )
      }

      composable(route = HangyeolDestination.Videos.pattern) {
        VideoLibraryScreen(
          onBack = { navController.popBackStack() },
          onNavigateRoute = navController::navigate,
        )
      }

      composable(
        route = HangyeolDestination.VideoPlayer.pattern,
        arguments = listOf(navArgument("videoId") { type = NavType.StringType }),
      ) { backStackEntry ->
        VideoDetailScreen(
          videoId = backStackEntry.arguments?.getString("videoId").orEmpty(),
          onBack = { navController.popBackStack() },
          onNavigateRoute = navController::navigate,
        )
      }

      composable(route = HangyeolDestination.Podcasts.pattern) {
        PodcastLibraryScreen(
          onBack = { navController.popBackStack() },
          onNavigateRoute = navController::navigate,
        )
      }

      composable(
        route = HangyeolDestination.PodcastChannel.pattern,
        arguments =
          listOf(
            navArgument("channelId") { type = NavType.StringType; nullable = true; defaultValue = "" },
          ),
      ) { backStackEntry ->
        PodcastChannelScreen(
          channelId = backStackEntry.arguments?.getString("channelId").orEmpty(),
          onBack = { navController.popBackStack() },
          onNavigateRoute = navController::navigate,
        )
      }

      composable(route = HangyeolDestination.PodcastSearch.pattern) {
        PodcastSearchScreen(
          onBack = { navController.popBackStack() },
          onNavigateRoute = navController::navigate,
        )
      }

      composable(
        route = HangyeolDestination.PodcastPlayer.pattern,
        arguments = listOf(navArgument("episodeId") { type = NavType.StringType; nullable = true; defaultValue = "" }),
      ) { backStackEntry ->
        val episodeId = backStackEntry.arguments?.getString("episodeId").orEmpty()
        PodcastPlayerScreen(
          episodeId = episodeId,
          onBack = { navController.popBackStack() },
        )
      }

      composable(route = HangyeolDestination.PodcastHistory.pattern) {
        PodcastHistoryScreen(
          onBack = { navController.popBackStack() },
        )
      }

      composable(route = HangyeolDestination.History.pattern) {
        HistoryScreen(onBack = { navController.popBackStack() })
      }

      composable(route = HangyeolDestination.Community.pattern) {
        CommunityScreen(
          mode = "hub",
          onBack = { navController.popBackStack() },
          onNavigateRoute = navController::navigate,
        )
      }

      composable(route = HangyeolDestination.CommunityAdd.pattern) {
        CommunityScreen(
          mode = "add",
          onBack = { navController.popBackStack() },
          onNavigateRoute = navController::navigate,
        )
      }

      composable(route = HangyeolDestination.Leaderboard.pattern) {
        CommunityScreen(
          mode = "leaderboard",
          onBack = { navController.popBackStack() },
          onNavigateRoute = navController::navigate,
        )
      }

      composable(route = HangyeolDestination.ProfileSettings.pattern) {
        SettingsScreen(onBack = { navController.popBackStack() })
      }

      composable(
        route = HangyeolDestination.ProfileSettingsSection.pattern,
        arguments = listOf(navArgument("section") { type = NavType.StringType }),
      ) { backStackEntry ->
        SettingsScreen(
          section = backStackEntry.arguments?.getString("section"),
          onBack = { navController.popBackStack() },
        )
      }

      composable(route = HangyeolDestination.Achievements.pattern) {
        AchievementsScreen(onBack = { navController.popBackStack() })
      }

      composable(route = HangyeolDestination.TopikHistory.pattern) {
        TopikHistoryScreen(
          onBack = { navController.popBackStack() },
          onNavigateRoute = navController::navigate,
        )
      }

      composable(route = HangyeolDestination.Pricing.pattern) {
        PricingScreen(onNavigateRoute = navController::navigate)
      }

      composable(route = HangyeolDestination.SubscriptionDetail.pattern) {
        SubscriptionDetailScreen(
          onBack = { navController.popBackStack() },
          onNavigateRoute = navController::navigate,
        )
      }

      composable(route = HangyeolDestination.PodcastSubscriptions.pattern) {
        PodcastSubscriptionsScreen(
          onBack = { navController.popBackStack() },
          onNavigateRoute = navController::navigate,
        )
      }

      composable(
        route = HangyeolDestination.WritingEvaluation.pattern,
        arguments = listOf(navArgument("sessionId") { type = NavType.StringType }),
      ) { backStackEntry ->
        WritingEvaluationScreen(
          sessionId = backStackEntry.arguments?.getString("sessionId").orEmpty(),
          onBack = { navController.popBackStack() },
        )
      }

      composable(
        route = HangyeolDestination.ReadingArticle.pattern,
        arguments = listOf(navArgument("articleId") { type = NavType.StringType }),
      ) { backStackEntry ->
        ReadingArticleScreen(
          articleId = backStackEntry.arguments?.getString("articleId").orEmpty(),
          onBack = { navController.popBackStack() },
          onNavigateRoute = navController::navigate,
        )
      }

      composable(route = HangyeolDestination.EpubUpload.pattern) {
        EpubUploadScreen(
          onBack = { navController.popBackStack() },
          onNavigateRoute = navController::navigate,
        )
      }

    }
  }
}

@Composable
private fun AuthScreen(
  isRegister: Boolean,
  @StringRes titleRes: Int,
  @StringRes subtitleRes: Int,
  @StringRes actionLabelRes: Int,
  @StringRes secondaryLabelRes: Int,
  onPrimaryAction: () -> Unit,
  onSocialAuth: ((String) -> Unit)? = null,
  onForgotPassword: (() -> Unit)? = null,
  onSecondaryAction: () -> Unit,
) {
  val spacing = HangyeolTheme.spacing
  val viewModel: AuthViewModel =
    viewModel(
      factory =
        AuthViewModel.factory(
          authRepository = ComposeServiceLocator.authRepository,
          sessionRepository = ComposeServiceLocator.sessionRepository,
        ),
    )
  val uiState by viewModel.uiState.collectAsStateWithLifecycle()
  var showEmailForm by rememberSaveable(isRegister) { mutableStateOf(!isRegister) }
  val canSubmit =
    if (isRegister) {
      uiState.name.isNotBlank() && uiState.email.isNotBlank() && uiState.password.length >= 8
    } else {
      uiState.email.isNotBlank() && uiState.password.isNotBlank()
    }
  val authTitle = stringResource(if (isRegister) R.string.auth_create_account else R.string.auth_welcome_back)
  val authSubtitle = stringResource(subtitleRes)
  val footerPrefix = stringResource(if (isRegister) R.string.auth_already_have_account else R.string.auth_no_account)
  val actionLabel = stringResource(actionLabelRes)
  val secondaryLabel = stringResource(secondaryLabelRes)
  val shellBottomPadding = 20.dp

  LazyColumn(
    modifier =
      Modifier
        .fillMaxSize()
        .background(HangyeolTheme.colorScheme.background),
  ) {
    item {
      Box(
        modifier =
          Modifier
            .fillMaxWidth()
            .background(
              brush =
                Brush.verticalGradient(
                  colorStops =
                    arrayOf(
                      0.0f to Color(0xAAF5C7C0),
                      0.72f to HangyeolTheme.colorScheme.background,
                      1.0f to HangyeolTheme.colorScheme.background,
                    ),
                ),
            ),
        contentAlignment = androidx.compose.ui.Alignment.TopCenter,
      ) {
        Column(
          modifier =
            Modifier
              .fillMaxWidth()
              .widthIn(max = 480.dp)
              .statusBarsPadding()
              .padding(start = 32.dp, end = 32.dp, top = 12.dp, bottom = 12.dp),
        ) {
          AuthHeroSeal()
          Spacer(modifier = Modifier.height(20.dp))
          Text(
            text = "DUHAN · 讀韓",
            style = KSoftSerifLabelStyle(),
            color = HangyeolTheme.colorScheme.secondary,
          )
          Spacer(modifier = Modifier.height(10.dp))
          Text(
            text = "한국어,\n매일 한 걸음.",
            style =
              HangyeolTheme.typography.headlineLarge.copy(
                fontSize = 42.sp,
                lineHeight = 44.sp,
                fontWeight = FontWeight.ExtraBold,
                letterSpacing = (-1.2).sp,
              ),
            color = HangyeolTheme.colorScheme.onBackground,
          )
          Spacer(modifier = Modifier.height(16.dp))
          Text(
            text = "FSRS 复习부터 TOPIK 대비까지\n学習伙伴와 함께하는 한국어 여정.",
            style = HangyeolTheme.typography.bodyLarge,
            color = HangyeolTheme.extendedColors.subtext,
          )
          Spacer(modifier = Modifier.height(14.dp))
          Row(horizontalArrangement = Arrangement.spacedBy(spacing.sm)) {
            KSoftChip(text = "Android MVP", tone = "crimson")
            KSoftChip(text = if (isRegister) "SIGN UP" else "LOGIN", tone = "muted")
          }
          if (isRegister && !showEmailForm) {
            Spacer(modifier = Modifier.height(20.dp))
            KSoftPrimaryButton(
              text = "立即创建",
              onClick = { showEmailForm = true },
              trailingArrow = true,
            )
          }
          Spacer(modifier = Modifier.height(0.dp))
        }
      }
    }
    item {
      Box(
        modifier = Modifier.fillMaxWidth().offset(y = (-4).dp),
        contentAlignment = androidx.compose.ui.Alignment.TopCenter,
      ) {
        Surface(
          modifier =
            Modifier
              .fillMaxWidth()
              .widthIn(max = 480.dp)
              .shadow(
                elevation = 9.dp,
                shape = RoundedCornerShape(topStart = 32.dp, topEnd = 32.dp),
                clip = false,
                ambientColor = Color(0x241F1B17),
                spotColor = Color(0x1A1F1B17),
              ),
          color = HangyeolTheme.colorScheme.surface,
          shape = RoundedCornerShape(topStart = 32.dp, topEnd = 32.dp),
          border = BorderStroke(1.dp, HangyeolTheme.extendedColors.lineSoft),
        ) {
          Column(
            modifier =
              Modifier
                .padding(start = spacing.xl, end = spacing.xl, top = 16.dp, bottom = shellBottomPadding)
                .navigationBarsPadding(),
          ) {
            Text(
              text = "AUTH · ${if (isRegister) "SIGN UP" else "LOGIN"}",
              style = KSoftOverlineStyle(),
              color = HangyeolTheme.colorScheme.secondary,
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
              text = authTitle,
              style =
                HangyeolTheme.typography.headlineMedium.copy(
                  fontSize = 21.sp,
                  lineHeight = 27.sp,
                  fontWeight = FontWeight.Black,
                  letterSpacing = (-0.3).sp,
                ),
            )
            Spacer(modifier = Modifier.height(2.dp))
            Text(
              text = authSubtitle,
              style = HangyeolTheme.typography.bodySmall,
              color = HangyeolTheme.extendedColors.subtext,
            )

          uiState.errorMessage?.let { errorMessage ->
            Spacer(modifier = Modifier.height(16.dp))
            Surface(
              color = HangyeolTheme.extendedColors.tintPink,
              shape = RoundedCornerShape(20.dp),
              border = BorderStroke(1.dp, HangyeolTheme.extendedColors.lineSoft),
            ) {
              Row(
                modifier = Modifier.padding(horizontal = spacing.md, vertical = spacing.md),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = androidx.compose.ui.Alignment.Top,
              ) {
                AlertCircleGlyph(modifier = Modifier.padding(top = 2.dp))
                Text(
                  text = errorMessage,
                  style =
                    HangyeolTheme.typography.labelSmall.copy(
                      fontSize = 12.sp,
                      lineHeight = 16.sp,
                      fontWeight = FontWeight.SemiBold,
                    ),
                  color = HangyeolTheme.extendedColors.crimson,
                  modifier = Modifier.weight(1f),
                )
              }
            }
          }

          if (showEmailForm) {
            Spacer(modifier = Modifier.height(12.dp))
            if (isRegister) {
              KSoftInputField(
                value = uiState.name,
                onValueChange = viewModel::onNameChanged,
                placeholder = "昵称",
                inputFieldModifier = Modifier.testTag(AppTestTags.AUTH_NAME_INPUT),
                leftIcon = { AuthFieldGlyph(kind = "person") },
                errorText = null,
              )
              Spacer(modifier = Modifier.height(12.dp))
            }

            KSoftInputField(
              value = uiState.email,
              onValueChange = viewModel::onEmailChanged,
              placeholder = "电子邮箱",
              inputFieldModifier = Modifier.testTag(AppTestTags.AUTH_EMAIL_INPUT),
              keyboardType = KeyboardType.Email,
              leftIcon = { AuthFieldGlyph(kind = "mail") },
              errorText = null,
            )
            Spacer(modifier = Modifier.height(12.dp))

            KSoftInputField(
              value = uiState.password,
              onValueChange = viewModel::onPasswordChanged,
              placeholder = "密码",
              inputFieldModifier = Modifier.testTag(AppTestTags.AUTH_PASSWORD_INPUT),
              keyboardType = KeyboardType.Password,
              obscureText = true,
              leftIcon = { AuthFieldGlyph(kind = "lock") },
              errorText = null,
            )

            if (!isRegister) {
              Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End) {
                TextButton(onClick = { onForgotPassword?.invoke() }, contentPadding = PaddingValues(0.dp), enabled = onForgotPassword != null) {
                  Text(
                    text = "忘记密码?",
                    style = HangyeolTheme.typography.labelLarge.copy(fontWeight = FontWeight.SemiBold),
                    color = HangyeolTheme.extendedColors.subtext,
                  )
                }
              }
            }

            Spacer(modifier = Modifier.height(8.dp))
            KSoftPrimaryButton(
              text = if (uiState.isSubmitting) "提交中..." else actionLabel,
              onClick = {
                viewModel.submitPreview(
                  isRegister = isRegister,
                  onSuccess = onPrimaryAction,
                )
              },
              modifier = Modifier.testTag(AppTestTags.AUTH_SUBMIT_BUTTON),
              enabled = canSubmit && !uiState.isSubmitting,
              trailingArrow = !uiState.isSubmitting,
            )
          }

          Spacer(modifier = Modifier.height(if (showEmailForm) 12.dp else 10.dp))
          Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(10.dp),
            verticalAlignment = androidx.compose.ui.Alignment.CenterVertically,
          ) {
            HorizontalDivider(modifier = Modifier.weight(1f), color = HangyeolTheme.extendedColors.lineSoft)
            Text(
              text = "或使用社交账号",
              style = KSoftOverlineStyle(),
              color = HangyeolTheme.extendedColors.subtext,
            )
            HorizontalDivider(modifier = Modifier.weight(1f), color = HangyeolTheme.extendedColors.lineSoft)
          }

          Spacer(modifier = Modifier.height(8.dp))
          Column(verticalArrangement = Arrangement.spacedBy(spacing.sm)) {
            KSoftSocialAuthButton(
              modifier = Modifier.fillMaxWidth(),
              label = "Kakao",
              left = { KakaoGlyph() },
              onPress = { onSocialAuth?.invoke("kakao") },
              disabled = onSocialAuth == null || uiState.isSubmitting,
            )
            KSoftSocialAuthButton(
              modifier = Modifier.fillMaxWidth(),
              label = "Google",
              left = { GoogleGlyph() },
              onPress = { onSocialAuth?.invoke("google") },
              disabled = onSocialAuth == null || uiState.isSubmitting,
            )
          }

          Spacer(modifier = Modifier.height(12.dp))
          Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.Center,
            verticalAlignment = androidx.compose.ui.Alignment.CenterVertically,
          ) {
            Text(
              text = footerPrefix,
              style = HangyeolTheme.typography.bodySmall.copy(fontSize = 14.sp, lineHeight = 20.sp),
              color = HangyeolTheme.extendedColors.subtext,
            )
            Text(
              text = secondaryLabel,
              style =
                HangyeolTheme.typography.bodySmall.copy(
                  fontSize = 14.sp,
                  lineHeight = 20.sp,
                  fontWeight = FontWeight.Bold,
                  textDecoration = TextDecoration.Underline,
                ),
              color = HangyeolTheme.colorScheme.onBackground,
              modifier = Modifier.clickable(onClick = onSecondaryAction).padding(start = 2.dp, top = 2.dp, bottom = 2.dp),
            )
          }
        }
      }
    }
  }
}
}

@Composable
private fun OAuthCallbackScreen(
  provider: String?,
  code: String?,
  verifier: String?,
  onSuccess: () -> Unit,
  onBackToLogin: () -> Unit,
) {
  val viewModel: AuthViewModel =
    viewModel(
      factory =
        AuthViewModel.factory(
          authRepository = ComposeServiceLocator.authRepository,
          sessionRepository = ComposeServiceLocator.sessionRepository,
        ),
    )
  val uiState by viewModel.uiState.collectAsStateWithLifecycle()
  var submitted by rememberSaveable(code, verifier) { mutableStateOf(false) }
  val providerLabel = provider?.ifBlank { null } ?: "OAuth"

  LaunchedEffect(code, verifier, submitted) {
    if (submitted) return@LaunchedEffect
    if (code.isNullOrBlank() || verifier.isNullOrBlank()) return@LaunchedEffect
    submitted = true
    viewModel.submitOAuthExchange(code = code, verifier = verifier, onSuccess = onSuccess)
  }

  LazyColumn(
    modifier =
      Modifier
        .fillMaxSize()
        .background(HangyeolTheme.colorScheme.background)
        .testTag(AppTestTags.OAUTH_CALLBACK_ROOT)
        .statusBarsPadding(),
    contentPadding = PaddingValues(horizontal = 22.dp, vertical = 20.dp),
    verticalArrangement = Arrangement.spacedBy(12.dp),
  ) {
    item {
      BaselineCard(
        title = "$providerLabel 登录处理中",
        body =
          when {
            code.isNullOrBlank() || verifier.isNullOrBlank() ->
              "缺少 OAuth 回调参数，请返回登录页重试。"
            uiState.isSubmitting -> "正在验证授权信息，请稍候..."
            uiState.errorMessage != null -> uiState.errorMessage ?: "OAuth 登录失败"
            else -> "正在完成登录..."
          },
      )
    }
    item {
      KSoftPrimaryButton(
        text = if (uiState.isSubmitting) "处理中..." else "返回登录页",
        onClick = onBackToLogin,
        modifier = Modifier.fillMaxWidth().testTag(AppTestTags.OAUTH_CALLBACK_BACK_BUTTON),
        enabled = !uiState.isSubmitting,
      )
    }
  }
}

@Composable
private fun DashboardScreen(
  displayName: String,
  streakDays: Int,
  learningHours: Int,
  onNavigateRoute: (String) -> Unit,
) {
  val viewModel: DashboardViewModel =
    viewModel(factory = DashboardViewModel.factory(ComposeServiceLocator.dashboardRepository))
  val uiState by viewModel.uiState.collectAsStateWithLifecycle()
  val likeInFlightIds by viewModel.likeInFlightIds.collectAsStateWithLifecycle()
  val spacing = HangyeolTheme.spacing
  val resolvedDisplayName = displayName.ifBlank { "河恩" }
  val streakCount = streakDays.coerceAtLeast(0)
  val streakDoneDays =
    kotlin.math.min(7, kotlin.math.max(0, streakCount % 7).let { if (it == 0 && streakCount > 0) 7 else it })
  val todayHeroSteps =
    if (uiState.todaySteps.isNotEmpty()) {
      uiState.todaySteps.map { step ->
        TodayHeroStep(
          kindRes = step.kindRes,
          mins = step.mins,
          titleRes = step.titleRes,
          titleArgs = step.titleArgs,
          subRes = step.subtitleRes,
          tone = step.tone,
          kanji = step.seal,
          route = step.route,
        )
      }
    } else {
      uiState.pathItems.map { path ->
        TodayHeroStep(
          kindRes = when (path.label) {
            "复习" -> R.string.dashboard_step_review_kind
            "语法" -> R.string.dashboard_step_grammar_kind
            "挑战" -> R.string.dashboard_step_topik_kind
            else -> R.string.parity_unknown
          },
          mins = when (path.label) {
            "复习" -> 8
            "语法" -> 6
            "挑战" -> 4
            else -> 5
          },
          titleRes = when (path.label) {
            "复习" -> R.string.dashboard_step_review_title
            "语法" -> R.string.dashboard_step_grammar_title
            "挑战" -> R.string.dashboard_step_topik_title
            else -> R.string.parity_unknown
          },
          titleArgs = if (path.label == "复习") listOf(0) else emptyList(),
          subRes = R.string.dashboard_hero_resume,
          tone = when (path.label) {
            "复习" -> "pink"
            "语法" -> "mint"
            "挑战" -> "lilac"
            else -> "butter"
          },
          kanji = when (path.label) {
            "复习" -> "復"
            "语法" -> "文"
            "挑战" -> "試"
            else -> "學"
          },
          route = path.route,
        )
      }
    }
  val currentHeroStepIndex = 0
  val completedHeroSteps = todayHeroSteps.take(currentHeroStepIndex)
  val nextHeroStep = todayHeroSteps.getOrNull(currentHeroStepIndex)
  val todayPathTotalMinutes = todayHeroSteps.sumOf { it.mins }
  val heroTone =
    when (nextHeroStep?.tone) {
      "mint" -> HangyeolTheme.extendedColors.tintMint
      "butter" -> HangyeolTheme.extendedColors.tintButter
      "lilac" -> HangyeolTheme.extendedColors.tintLilac
      else -> HangyeolTheme.extendedColors.tintPink
    }
  val heroToneDeep =
    when (nextHeroStep?.tone) {
      "mint" -> HangyeolTheme.extendedColors.jade
      "butter" -> HangyeolTheme.extendedColors.gold
      "lilac" -> Color(0xFF7E6AA8)
      else -> HangyeolTheme.extendedColors.crimson
    }
  LazyColumn(
    modifier =
      Modifier
        .fillMaxSize()
        .background(HangyeolTheme.colorScheme.background)
        .testTag(AppTestTags.DASHBOARD_ROOT),
  ) {
    item {
      Column(
        modifier =
          Modifier
            .fillMaxWidth()
            .background(
              brush =
                Brush.verticalGradient(
                  colors =
                    listOf(
                      HangyeolTheme.extendedColors.tintPink,
                      HangyeolTheme.colorScheme.background,
                    ),
                ),
            )
            .statusBarsPadding()
            .padding(start = 22.dp, end = 22.dp, top = 8.dp, bottom = 24.dp),
      ) {
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
          Column {
            Text(
              text = uiState.dateLabel,
              style = KSoftSerifLabelStyle(),
              color = HangyeolTheme.colorScheme.secondary,
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
              text =
                buildAnnotatedString {
                  val greetingText = when(uiState.greeting) {
                    "早上" -> stringResource(R.string.dashboard_greeting_morning)
                    "下午" -> stringResource(R.string.dashboard_greeting_afternoon)
                    "晚上" -> stringResource(R.string.dashboard_greeting_evening)
                    "凌晨" -> stringResource(R.string.dashboard_greeting_night)
                    else -> uiState.greeting
                  }
                  append("$greetingText，")
                  withStyle(SpanStyle(color = HangyeolTheme.colorScheme.secondary)) {
                    append(resolvedDisplayName)
                  }
                },
              style = HangyeolTheme.typography.titleLarge.copy(fontSize = 26.sp, lineHeight = 29.sp),
              color = HangyeolTheme.colorScheme.onBackground,
            )
            Text(text = stringResource(R.string.dashboard_hero_today_ready), style = HangyeolTheme.typography.bodyMedium, color = HangyeolTheme.extendedColors.subtext, modifier = Modifier.padding(top = 6.dp))
          }
          Column(horizontalAlignment = androidx.compose.ui.Alignment.End, verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Row(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalAlignment = androidx.compose.ui.Alignment.CenterVertically) {
              Surface(
                modifier = Modifier.shadow(2.dp, RoundedCornerShape(20.dp), clip = false, ambientColor = Color(0x171F1B17), spotColor = Color(0x141F1B17)),
                color = HangyeolTheme.colorScheme.surface,
                shape = RoundedCornerShape(20.dp),
                border = BorderStroke(1.dp, HangyeolTheme.extendedColors.lineSoft),
              ) {
                Row(
                  modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                  horizontalArrangement = Arrangement.spacedBy(4.dp),
                  verticalAlignment = androidx.compose.ui.Alignment.CenterVertically,
                ) {
                  Text(text = "🔥", style = HangyeolTheme.typography.bodySmall)
                  Text(text = streakCount.toString(), style = HangyeolTheme.typography.titleMedium)
                  Text(
                    text = stringResource(R.string.dashboard_hero_days),
                    style = HangyeolTheme.typography.labelSmall.copy(fontWeight = FontWeight.SemiBold),
                    color = HangyeolTheme.extendedColors.subtext,
                  )
                }
              }
              Surface(
                modifier = Modifier.shadow(2.dp, RoundedCornerShape(14.dp), clip = false, ambientColor = Color(0x171F1B17), spotColor = Color(0x141F1B17)),
                color = HangyeolTheme.colorScheme.surface,
                shape = RoundedCornerShape(14.dp),
                border = BorderStroke(1.dp, HangyeolTheme.extendedColors.lineSoft),
              ) {
                Box(
                  modifier = Modifier.size(28.dp),
                  contentAlignment = androidx.compose.ui.Alignment.Center,
                ) {
                  TodayNotificationGlyph()
                }
              }
            }
            Text(
              text = stringResource(R.string.dashboard_streak),
              style = HangyeolTheme.typography.bodySmall.copy(fontSize = 10.sp, lineHeight = 12.sp, fontWeight = FontWeight.Bold),
              color = HangyeolTheme.extendedColors.subtext,
              modifier = Modifier.padding(end = 1.dp),
            )
          }
        }
        Spacer(modifier = Modifier.height(22.dp))
        KSoftStreakRow(done = streakDoneDays, labels = listOf("월", "화", "수", "목", "금", "토", "일"))
      }
    }
    if (uiState.dailyPhraseKorean.isNotBlank() || uiState.leaderboardLabel.isNotBlank() || uiState.partnershipLabel.isNotBlank()) {
      item {
        Surface(
          modifier = Modifier.padding(horizontal = 18.dp).offset(y = (-8).dp),
          color = HangyeolTheme.colorScheme.surface,
          shape = RoundedCornerShape(24.dp),
          border = BorderStroke(1.dp, HangyeolTheme.extendedColors.lineSoft),
          shadowElevation = 3.dp,
        ) {
          Column(modifier = Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            if (uiState.dailyPhraseKorean.isNotBlank()) {
              Column {
                Text(
                  text = "오늘의 문장",
                  style = KSoftSerifLabelStyle().copy(fontSize = 11.sp, lineHeight = 13.sp),
                  color = HangyeolTheme.extendedColors.crimson,
                )
                Text(
                  text = uiState.dailyPhraseKorean,
                  style = HangyeolTheme.typography.titleMedium.copy(fontWeight = FontWeight.ExtraBold),
                  color = HangyeolTheme.colorScheme.onSurface,
                  modifier = Modifier.padding(top = 4.dp),
                )
                if (uiState.dailyPhraseTranslation.isNotBlank()) {
                  Text(
                    text = uiState.dailyPhraseTranslation,
                    style = HangyeolTheme.typography.bodySmall.copy(fontWeight = FontWeight.Medium),
                    color = HangyeolTheme.extendedColors.subtext,
                    modifier = Modifier.padding(top = 2.dp),
                  )
                }
              }
            }
            val notificationLabel = if (uiState.unreadNotificationCount > 0) stringResource(R.string.dashboard_notification_label) else ""
            val dashboardSignals =
              listOfNotNull(
                if (notificationLabel.isNotBlank()) notificationLabel else null,
                uiState.leaderboardLabel.ifBlank { null },
                uiState.partnershipLabel.ifBlank { null },
                uiState.weakPointLabel.ifBlank { null },
                if (uiState.topikAttemptCount > 0) stringResource(R.string.dashboard_signal_topik, uiState.topikAttemptCount) else null,
                if (uiState.podcastHistoryCount > 0) stringResource(R.string.dashboard_signal_podcast, uiState.podcastHistoryCount) else null,
              )
            if (dashboardSignals.isNotEmpty()) {
              LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                items(dashboardSignals) { label ->
                  if (label == notificationLabel && notificationLabel.isNotBlank()) {
                    KSoftChip(
                      text = label,
                      tone = "crimson",
                      size = "sm",
                      modifier = Modifier.clickable { viewModel.markNotificationsRead() },
                    )
                  } else {
                    KSoftChip(text = label, tone = "muted", size = "sm")
                  }
                }
              }
            }
          }
        }
      }
    }
    item {
      Card(
        modifier = Modifier.padding(horizontal = 18.dp).offset(y = (-4).dp),
        colors = CardDefaults.cardColors(containerColor = HangyeolTheme.colorScheme.surface),
        shape = RoundedCornerShape(28.dp),
        border = BorderStroke(1.dp, HangyeolTheme.extendedColors.lineSoft),
        elevation = CardDefaults.cardElevation(defaultElevation = 6.dp),
      ) {
        Column {
          Row(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 16.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
          ) {
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
              KSoftHanjaSeal(c = "道", size = 28, bg = HangyeolTheme.extendedColors.crimson, round = 6)
              Column {
                Text(text = stringResource(R.string.dashboard_path_title), style = HangyeolTheme.typography.titleMedium)
                Text(
                  text = stringResource(R.string.dashboard_path_summary, todayPathTotalMinutes),
                  style = HangyeolTheme.typography.labelSmall.copy(fontWeight = FontWeight.Bold),
                  color = HangyeolTheme.extendedColors.subtext,
                )
              }
            }
            StepDots(count = todayHeroSteps.size, activeIndex = currentHeroStepIndex)
          }
          HorizontalDivider(color = HangyeolTheme.extendedColors.lineSoft)
          Column {
            completedHeroSteps.forEach { item ->
              Row(
                modifier =
                  Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 20.dp, vertical = 12.dp),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                verticalAlignment = androidx.compose.ui.Alignment.CenterVertically,
              ) {
                Surface(
                  color = HangyeolTheme.extendedColors.tintMint,
                  shape = RoundedCornerShape(14.dp),
                  modifier = Modifier.size(28.dp),
                ) {
                  Box(contentAlignment = androidx.compose.ui.Alignment.Center) {
                    Text(
                      text = "✓",
                      color = HangyeolTheme.colorScheme.tertiary,
                      style = HangyeolTheme.typography.labelLarge.copy(fontWeight = FontWeight.ExtraBold),
                    )
                  }
                }
                Column(modifier = Modifier.weight(1f)) {
                  Text(
                    text = item.title,
                    style =
                      HangyeolTheme.typography.bodySmall.copy(
                        fontSize = 13.sp,
                        lineHeight = 17.sp,
                        fontWeight = FontWeight.Bold,
                        textDecoration = TextDecoration.LineThrough,
                      ),
                    color = HangyeolTheme.colorScheme.onSurface.copy(alpha = 0.55f),
                  )
                  Text(
                    text = "${item.kind} · ${item.mins}分钟 完成",
                    style = HangyeolTheme.typography.labelSmall.copy(fontWeight = FontWeight.SemiBold),
                    color = HangyeolTheme.extendedColors.subtext,
                    modifier = Modifier.padding(top = 1.dp),
                  )
                }
              }
              HorizontalDivider(color = HangyeolTheme.extendedColors.lineSoft)
            }
            Surface(
              color = HangyeolTheme.colorScheme.surface,
              modifier = Modifier.fillMaxWidth(),
            ) {
              Column(
                modifier =
                  Modifier
                    .background(
                      brush =
                        Brush.verticalGradient(
                          colors = listOf(heroTone.copy(alpha = 0.3f), HangyeolTheme.colorScheme.surface),
                        ),
                    )
                    .padding(horizontal = 20.dp, vertical = 20.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp),
              ) {
                nextHeroStep?.let { nextStep ->
                  Row(horizontalArrangement = Arrangement.spacedBy(14.dp), verticalAlignment = androidx.compose.ui.Alignment.Top) {
                    KSoftHanjaSeal(c = nextStep.kanji, size = 52, bg = heroToneDeep, round = 12)
                    Column(modifier = Modifier.weight(1f)) {
                      Row(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalAlignment = androidx.compose.ui.Alignment.CenterVertically) {
                        KSoftChip(text = stringResource(nextStep.kindRes).uppercase(), tone = nextStep.tone)
                        Text(
                          text = stringResource(R.string.dashboard_approx_mins, nextStep.mins),
                          style = HangyeolTheme.typography.bodySmall.copy(fontSize = 10.sp, lineHeight = 12.sp, fontWeight = FontWeight.Bold),
                          color = HangyeolTheme.extendedColors.subtext,
                        )
                      }
                      Spacer(modifier = Modifier.height(6.dp))
                      Text(
                        text = stringResource(nextStep.titleRes, *nextStep.titleArgs.toTypedArray()),
                        style = HangyeolTheme.typography.titleLarge.copy(fontSize = 19.sp, lineHeight = 24.sp, fontWeight = FontWeight.Black),
                        color = HangyeolTheme.colorScheme.onSurface,
                      )
                      Text(
                        text = stringResource(nextStep.subRes),
                        style = HangyeolTheme.typography.bodySmall,
                        color = HangyeolTheme.extendedColors.subtext,
                        modifier = Modifier.padding(top = 4.dp),
                      )
                    }
                  }
                  KSoftPrimaryButton(
                    text = "开始",
                    onClick = { onNavigateRoute(resolveRoute(nextStep.route)) },
                    enabled = true,
                    seal = "始",
                    trailingArrow = true,
                  )
                }
                Row(
                  modifier = Modifier.fillMaxWidth().padding(horizontal = 4.dp),
                  horizontalArrangement = Arrangement.SpaceBetween,
                ) {
                  Text(
                    text = stringResource(R.string.dashboard_skip),
                    style = HangyeolTheme.typography.labelLarge.copy(fontSize = 12.sp, fontWeight = FontWeight.Bold),
                    color = HangyeolTheme.extendedColors.subtext,
                  )
                  Text(
                    text = stringResource(R.string.dashboard_later),
                    style = HangyeolTheme.typography.labelLarge.copy(fontSize = 12.sp, fontWeight = FontWeight.Bold),
                    color = HangyeolTheme.extendedColors.subtext,
                  )
                }
              }
            }
          }
        }
      }
    }
    item {
      KSoftSectionHead(
        modifier = Modifier.padding(horizontal = 18.dp).padding(top = 20.dp),
        kanji = "成",
        title = stringResource(R.string.dashboard_achievements),
      )
    }
    item {
      Row(
        modifier = Modifier.padding(horizontal = 18.dp),
        horizontalArrangement = Arrangement.spacedBy(spacing.sm),
      ) {
        uiState.achievements.forEach { achievement ->
          AchievementChip(
            modifier = Modifier.weight(1f),
            emoji = achievement.emoji,
            value = achievement.value,
            label = achievement.label,
          )
        }
      }
    }
    item {
      KSoftSectionHead(
        modifier = Modifier.padding(horizontal = 18.dp).padding(top = 20.dp),
        kanji = "續",
        title = stringResource(R.string.dashboard_resume),
      )
    }
    item {
      if (uiState.resumeTitle.isBlank()) {
        Box(modifier = Modifier.padding(horizontal = 18.dp)) {
          BaselineCard(
            title = stringResource(R.string.dashboard_no_resume),
            body = stringResource(R.string.dashboard_no_resume_body),
          )
        }
      } else {
        ResumeLearningCard(
          modifier = Modifier.padding(horizontal = 18.dp),
          title = uiState.resumeTitle,
          subtitle = uiState.resumeSubtitle,
          onClick = { onNavigateRoute(resolveRoute(uiState.resumeRoute)) },
        )
      }
    }
    item {
      KSoftSectionHead(
        modifier = Modifier.padding(horizontal = 18.dp).padding(top = 24.dp),
        kanji = "會",
        title = stringResource(R.string.dashboard_feed_title),
        action = stringResource(R.string.dashboard_feed_action),
      )
    }
    item {
      SocialFeedCard(
        modifier = Modifier.padding(horizontal = 18.dp),
        items = uiState.feedItems,
        likeInFlightIds = likeInFlightIds,
        onToggleLike = viewModel::toggleActivityLike,
      )
    }
    uiState.challengeCard?.let { challengeCard ->
      item {
        ChallengeCard(
          modifier = Modifier.padding(horizontal = 18.dp).padding(top = 24.dp, bottom = 28.dp),
          card = challengeCard,
          onClick = {
            if (challengeCard.isCompleted && !challengeCard.isClaimed) {
              viewModel.claimDailyChallenge()
            } else {
              onNavigateRoute(resolveRoute(challengeCard.route))
            }
          },
        )
      }
    }
  }
}

@Composable
private fun ComposeInputField(
  value: String,
  onValueChange: (String) -> Unit,
  label: String? = null,
  placeholder: String? = label,
  keyboardType: KeyboardType = KeyboardType.Text,
  obscureText: Boolean = false,
  imeAction: ImeAction = ImeAction.Default,
  onSubmit: (() -> Unit)? = null,
  leadingContent: (@Composable () -> Unit)? = null,
) {
  val focusManager = LocalFocusManager.current
  val keyboardController = LocalSoftwareKeyboardController.current
  OutlinedTextField(
    value = value,
    onValueChange = onValueChange,
    label = label?.let { fieldLabel -> { Text(fieldLabel) } },
    placeholder =
      placeholder?.let { hint ->
        {
          Text(text = hint, color = HangyeolTheme.extendedColors.subtext)
        }
      },
    leadingIcon = leadingContent?.let { content -> { content() } },
    modifier = Modifier.fillMaxWidth().heightIn(min = 52.dp),
    shape = RoundedCornerShape(20.dp),
    singleLine = true,
    textStyle = HangyeolTheme.typography.bodyLarge,
    keyboardOptions = KeyboardOptions(keyboardType = keyboardType, imeAction = imeAction),
    keyboardActions =
      KeyboardActions(
        onSearch = {
          focusManager.clearFocus(force = true)
          onSubmit?.invoke()
          keyboardController?.hide()
        },
        onDone = {
          focusManager.clearFocus(force = true)
          onSubmit?.invoke()
          keyboardController?.hide()
        },
      ),
    visualTransformation = if (obscureText) PasswordVisualTransformation() else VisualTransformation.None,
    colors =
      OutlinedTextFieldDefaults.colors(
        focusedBorderColor = HangyeolTheme.colorScheme.primary,
        unfocusedBorderColor = HangyeolTheme.extendedColors.lineStrong,
        focusedContainerColor = HangyeolTheme.colorScheme.surface,
        unfocusedContainerColor = HangyeolTheme.colorScheme.surfaceVariant,
        focusedLeadingIconColor = HangyeolTheme.extendedColors.subtext,
        unfocusedLeadingIconColor = HangyeolTheme.extendedColors.subtext,
        focusedPlaceholderColor = HangyeolTheme.extendedColors.subtext,
        unfocusedPlaceholderColor = HangyeolTheme.extendedColors.subtext,
      ),
  )
}

@Composable
private fun BottomTabIcon(
  kind: BottomTabKind,
  mark: String,
  selected: Boolean,
) {
  val activeColor = HangyeolTheme.colorScheme.primary
  val inactiveColor = HangyeolTheme.extendedColors.subtextLight
  val strokeColor = if (selected) activeColor else inactiveColor
  Box(
    modifier = Modifier.fillMaxWidth().height(26.dp),
    contentAlignment = androidx.compose.ui.Alignment.Center,
  ) {
    Canvas(modifier = Modifier.size(22.dp)) {
      val stroke = 1.7.dp.toPx()
      when (kind) {
        BottomTabKind.Today -> {
          drawCircle(
            color = strokeColor,
            radius = size.minDimension * 0.34f,
            center = center,
            style = Stroke(width = stroke),
          )
          drawLine(
            color = strokeColor,
            start = Offset(center.x, size.height * (6f / 22f)),
            end = Offset(center.x, center.y),
            strokeWidth = stroke,
            cap = StrokeCap.Round,
          )
          drawLine(
            color = strokeColor,
            start = center,
            end = Offset(size.width * (14f / 22f), size.height * (13f / 22f)),
            strokeWidth = stroke,
            cap = StrokeCap.Round,
          )
        }
        BottomTabKind.Learn -> {
          drawRoundRect(
            color = strokeColor,
            topLeft = Offset(size.width * (3f / 22f), size.height * (5f / 22f)),
            size = Size(size.width * (7f / 22f), size.height * (13f / 22f)),
            cornerRadius = CornerRadius(0f, 0f),
            style = Stroke(width = stroke, join = StrokeJoin.Round),
          )
          drawRoundRect(
            color = strokeColor,
            topLeft = Offset(size.width * (12f / 22f), size.height * (5f / 22f)),
            size = Size(size.width * (7f / 22f), size.height * (13f / 22f)),
            cornerRadius = CornerRadius(0f, 0f),
            style = Stroke(width = stroke, join = StrokeJoin.Round),
          )
          listOf(8f / 22f, 11f / 22f).forEach { y ->
            drawLine(
              color = strokeColor,
              start = Offset(size.width * (5f / 22f), size.height * y),
              end = Offset(size.width * (8f / 22f), size.height * y),
              strokeWidth = 1.5.dp.toPx(),
              cap = StrokeCap.Round,
            )
            drawLine(
              color = strokeColor,
              start = Offset(size.width * (14f / 22f), size.height * y),
              end = Offset(size.width * (17f / 22f), size.height * y),
              strokeWidth = 1.5.dp.toPx(),
              cap = StrokeCap.Round,
            )
          }
        }
        BottomTabKind.Immerse -> {
          val wavePath =
            Path().apply {
              moveTo(size.width * (2.5f / 22f), size.height * (11f / 22f))
              cubicTo(
                size.width * (5.5f / 22f),
                size.height * (6f / 22f),
                size.width * (8f / 22f),
                size.height * (6f / 22f),
                size.width * (11f / 22f),
                size.height * (6f / 22f),
              )
              cubicTo(
                size.width * (14f / 22f),
                size.height * (6f / 22f),
                size.width * (16.5f / 22f),
                size.height * (6f / 22f),
                size.width * (19.5f / 22f),
                size.height * (11f / 22f),
              )
            }
          drawPath(
            path = wavePath,
            color = strokeColor,
            style = Stroke(width = stroke, cap = StrokeCap.Round, join = StrokeJoin.Round),
          )
          listOf(7f / 22f, 11f / 22f, 15f / 22f).forEachIndexed { index, x ->
            drawLine(
              color = strokeColor,
              start = Offset(size.width * x, size.height * (13f / 22f)),
              end = Offset(size.width * x, size.height * (if (index == 1) 16f else 15f) / 22f),
              strokeWidth = stroke,
              cap = StrokeCap.Round,
            )
          }
        }
        BottomTabKind.My -> {
          drawCircle(
            color = strokeColor,
            radius = size.minDimension * (3.5f / 22f),
            center = Offset(center.x, size.height * (8f / 22f)),
            style = Stroke(width = stroke),
          )
          val profilePath =
            Path().apply {
              moveTo(size.width * (4f / 22f), size.height * (19f / 22f))
              cubicTo(
                size.width * (5f / 22f),
                size.height * (15f / 22f),
                size.width * (8f / 22f),
                size.height * (13.5f / 22f),
                size.width * (11f / 22f),
                size.height * (13.5f / 22f),
              )
              cubicTo(
                size.width * (14f / 22f),
                size.height * (13.5f / 22f),
                size.width * (17f / 22f),
                size.height * (15f / 22f),
                size.width * (18f / 22f),
                size.height * (19f / 22f),
              )
            }
          drawPath(
            path = profilePath,
            color = strokeColor,
            style = Stroke(width = stroke, cap = StrokeCap.Round, join = StrokeJoin.Round),
          )
        }
      }
    }
    if (selected) {
      Text(
        text = mark,
        style =
          HangyeolTheme.typography.labelSmall.copy(
            fontSize = 9.sp,
            lineHeight = 10.sp,
            fontFamily = FontFamily.Serif,
            fontWeight = FontWeight.Medium,
          ),
        color = HangyeolTheme.extendedColors.crimson.copy(alpha = 0.72f),
        modifier = Modifier.align(androidx.compose.ui.Alignment.TopEnd).offset(x = 3.dp, y = (-5).dp),
      )
    }
  }
}

@Composable
private fun TodayNotificationGlyph() {
  val glyphColor = HangyeolTheme.extendedColors.subtext
  Canvas(modifier = Modifier.size(13.dp)) {
    val stroke = 1.8.dp.toPx()
    val bellPath =
      Path().apply {
        moveTo(size.width * 0.22f, size.height * 0.68f)
        quadraticTo(size.width * 0.22f, size.height * 0.28f, size.width * 0.5f, size.height * 0.24f)
        quadraticTo(size.width * 0.78f, size.height * 0.28f, size.width * 0.78f, size.height * 0.68f)
        lineTo(size.width * 0.84f, size.height * 0.76f)
        lineTo(size.width * 0.16f, size.height * 0.76f)
        close()
      }
    drawPath(
      path = bellPath,
      color = glyphColor,
      style = Stroke(width = stroke, cap = StrokeCap.Round, join = StrokeJoin.Round),
    )
    drawLine(
      color = glyphColor,
      start = Offset(size.width * 0.38f, size.height * 0.88f),
      end = Offset(size.width * 0.62f, size.height * 0.88f),
      strokeWidth = stroke,
      cap = StrokeCap.Round,
    )
    drawCircle(
      color = glyphColor,
      radius = stroke * 0.45f,
      center = Offset(size.width * 0.5f, size.height * 0.12f),
    )
  }
}

@Composable
private fun ResumeLearningCard(
  modifier: Modifier = Modifier,
  title: String,
  subtitle: String,
  onClick: () -> Unit,
) {
  Surface(
    modifier =
      modifier
        .fillMaxWidth()
        .shadow(
          elevation = 2.dp,
          shape = RoundedCornerShape(22.dp),
          clip = false,
          ambientColor = Color(0x141F1B17),
          spotColor = Color(0x141F1B17),
        )
        .clickable(onClick = onClick),
    color = HangyeolTheme.colorScheme.surface,
    shape = RoundedCornerShape(22.dp),
    border = BorderStroke(1.dp, HangyeolTheme.extendedColors.lineSoft),
  ) {
    Row(
      modifier =
        Modifier
          .background(
            brush =
              Brush.linearGradient(
                colors = listOf(Color(0xFFEEE6DE), Color(0xFFF6F0E9)),
              ),
          )
          .padding(horizontal = 16.dp, vertical = 14.dp),
      verticalAlignment = androidx.compose.ui.Alignment.CenterVertically,
    ) {
      KSoftHanjaSeal(
        c = "文",
        size = 42,
        bg = HangyeolTheme.extendedColors.crimson.copy(alpha = 0.1f),
        color = HangyeolTheme.extendedColors.crimson,
        round = 12,
      )
      Column(
        modifier = Modifier.weight(1f).padding(start = 12.dp),
        verticalArrangement = Arrangement.spacedBy(2.dp),
      ) {
        Text(
          text = "繼續 · RESUME",
          style = KSoftOverlineStyle(),
          color = HangyeolTheme.colorScheme.secondary,
        )
        Text(
          text = title,
          style = HangyeolTheme.typography.titleMedium.copy(fontSize = 16.sp, lineHeight = 22.sp, fontWeight = FontWeight.ExtraBold),
          color = HangyeolTheme.colorScheme.onSurface,
          maxLines = 2,
          overflow = TextOverflow.Ellipsis,
        )
        Text(
          text = subtitle,
          style = HangyeolTheme.typography.labelSmall.copy(fontSize = 11.sp, lineHeight = 15.sp, fontWeight = FontWeight.Medium),
          color = HangyeolTheme.extendedColors.subtext,
          maxLines = 2,
          overflow = TextOverflow.Ellipsis,
        )
      }
      Text(
        text = "→",
        style = HangyeolTheme.typography.titleMedium.copy(fontSize = 18.sp, lineHeight = 18.sp, fontWeight = FontWeight.Bold),
        color = HangyeolTheme.colorScheme.secondary.copy(alpha = 0.7f),
      )
    }
  }
}

@Composable
private fun AlertCircleGlyph(
  modifier: Modifier = Modifier,
  color: Color = HangyeolTheme.extendedColors.crimson,
) {
  Canvas(modifier = modifier.size(16.dp)) {
    val stroke = 1.7.dp.toPx()
    drawCircle(
      color = color,
      radius = size.minDimension * 0.43f,
      center = center,
      style = Stroke(width = stroke),
    )
    drawLine(
      color = color,
      start = Offset(center.x, size.height * 0.28f),
      end = Offset(center.x, size.height * 0.54f),
      strokeWidth = stroke,
      cap = StrokeCap.Round,
    )
    drawCircle(
      color = color,
      radius = 1.2.dp.toPx(),
      center = Offset(center.x, size.height * 0.72f),
    )
  }
}

@Composable
private fun AuthFieldGlyph(kind: String) {
  val glyphColor = HangyeolTheme.extendedColors.subtext
  Canvas(modifier = Modifier.size(16.dp)) {
    val stroke = 1.6.dp.toPx()
    when (kind) {
      "person" -> {
        drawCircle(
          color = glyphColor,
          radius = size.minDimension * 0.18f,
          center = Offset(center.x, size.height * 0.28f),
          style = Stroke(width = stroke),
        )
        drawArc(
          color = glyphColor,
          startAngle = 205f,
          sweepAngle = 130f,
          useCenter = false,
          topLeft = Offset(size.width * 0.16f, size.height * 0.38f),
          size = Size(size.width * 0.68f, size.height * 0.42f),
          style = Stroke(width = stroke, cap = StrokeCap.Round),
        )
      }
      "mail" -> {
        drawRoundRect(
          color = glyphColor,
          topLeft = Offset(size.width * 0.08f, size.height * 0.16f),
          size = Size(size.width * 0.84f, size.height * 0.64f),
          cornerRadius = CornerRadius(3.dp.toPx(), 3.dp.toPx()),
          style = Stroke(width = stroke),
        )
        drawLine(
          color = glyphColor,
          start = Offset(size.width * 0.12f, size.height * 0.24f),
          end = Offset(center.x, size.height * 0.52f),
          strokeWidth = stroke,
          cap = StrokeCap.Round,
        )
        drawLine(
          color = glyphColor,
          start = Offset(size.width * 0.88f, size.height * 0.24f),
          end = Offset(center.x, size.height * 0.52f),
          strokeWidth = stroke,
          cap = StrokeCap.Round,
        )
      }
      else -> {
        drawRoundRect(
          color = glyphColor,
          topLeft = Offset(size.width * 0.18f, size.height * 0.42f),
          size = Size(size.width * 0.64f, size.height * 0.42f),
          cornerRadius = CornerRadius(3.dp.toPx(), 3.dp.toPx()),
          style = Stroke(width = stroke),
        )
        drawArc(
          color = glyphColor,
          startAngle = 200f,
          sweepAngle = 140f,
          useCenter = false,
          topLeft = Offset(size.width * 0.28f, size.height * 0.12f),
          size = Size(size.width * 0.44f, size.height * 0.46f),
          style = Stroke(width = stroke, cap = StrokeCap.Round),
        )
      }
    }
  }
}

@Composable
private fun KakaoGlyph() {
  Surface(
    color = Color(0xFFFEE500),
    shape = RoundedCornerShape(4.dp),
  ) {
    Text(
      text = "K",
      style = HangyeolTheme.typography.labelLarge.copy(fontSize = 11.sp, fontWeight = FontWeight.Black),
      color = Color.Black,
      modifier = Modifier.padding(horizontal = 5.dp, vertical = 1.dp),
    )
  }
}

@Composable
private fun GoogleGlyph() {
  Canvas(modifier = Modifier.size(18.dp)) {
    val stroke = 2.8.dp.toPx()
    val inset = 2.dp.toPx()
    drawArc(
      color = Color(0xFFEA4335),
      startAngle = -40f,
      sweepAngle = 82f,
      useCenter = false,
      topLeft = Offset(inset, inset),
      size = Size(size.width - inset * 2, size.height - inset * 2),
      style = Stroke(width = stroke, cap = StrokeCap.Round),
    )
    drawArc(
      color = Color(0xFFFBBC05),
      startAngle = 42f,
      sweepAngle = 82f,
      useCenter = false,
      topLeft = Offset(inset, inset),
      size = Size(size.width - inset * 2, size.height - inset * 2),
      style = Stroke(width = stroke, cap = StrokeCap.Round),
    )
    drawArc(
      color = Color(0xFF34A853),
      startAngle = 124f,
      sweepAngle = 92f,
      useCenter = false,
      topLeft = Offset(inset, inset),
      size = Size(size.width - inset * 2, size.height - inset * 2),
      style = Stroke(width = stroke, cap = StrokeCap.Round),
    )
    drawArc(
      color = Color(0xFF4285F4),
      startAngle = 216f,
      sweepAngle = 104f,
      useCenter = false,
      topLeft = Offset(inset, inset),
      size = Size(size.width - inset * 2, size.height - inset * 2),
      style = Stroke(width = stroke, cap = StrokeCap.Round),
    )
    drawLine(
      color = Color(0xFF4285F4),
      start = Offset(size.width * 0.56f, center.y),
      end = Offset(size.width * 0.88f, center.y),
      strokeWidth = stroke,
      cap = StrokeCap.Round,
    )
  }
}

@Composable
private fun NotificationBellButton() {
  val bellColor = HangyeolTheme.colorScheme.onSurface.copy(alpha = 0.82f)
  Surface(
    color = HangyeolTheme.colorScheme.surface,
    shape = RoundedCornerShape(14.dp),
    border = BorderStroke(1.dp, HangyeolTheme.extendedColors.lineSoft),
    shadowElevation = 4.dp,
    modifier = Modifier.size(28.dp),
  ) {
    Box(contentAlignment = androidx.compose.ui.Alignment.Center) {
      Canvas(modifier = Modifier.size(13.dp)) {
        val stroke = 2.1.dp.toPx()
        drawArc(
          color = bellColor,
          startAngle = 205f,
          sweepAngle = 130f,
          useCenter = false,
          topLeft = Offset(size.width * 0.12f, size.height * 0.12f),
          size = Size(size.width * 0.76f, size.height * 0.66f),
          style = Stroke(width = stroke, cap = StrokeCap.Round),
        )
        drawLine(
          color = bellColor,
          start = Offset(size.width * 0.22f, size.height * 0.52f),
          end = Offset(size.width * 0.22f, size.height * 0.7f),
          strokeWidth = stroke,
          cap = StrokeCap.Round,
        )
        drawLine(
          color = bellColor,
          start = Offset(size.width * 0.78f, size.height * 0.52f),
          end = Offset(size.width * 0.78f, size.height * 0.7f),
          strokeWidth = stroke,
          cap = StrokeCap.Round,
        )
        drawLine(
          color = bellColor,
          start = Offset(size.width * 0.28f, size.height * 0.74f),
          end = Offset(size.width * 0.72f, size.height * 0.74f),
          strokeWidth = stroke,
          cap = StrokeCap.Round,
        )
        drawCircle(
          color = bellColor,
          radius = 1.4.dp.toPx(),
          center = Offset(size.width * 0.5f, size.height * 0.85f),
        )
      }
      Surface(
        color = HangyeolTheme.colorScheme.secondary,
        shape = RoundedCornerShape(999.dp),
        border = BorderStroke(1.5.dp, HangyeolTheme.colorScheme.surface),
        modifier =
          Modifier
            .align(androidx.compose.ui.Alignment.TopEnd)
            .offset(x = (-1).dp, y = 1.dp)
            .size(8.dp),
      ) {}
    }
  }
}

@Composable
private fun CapsuleBadge(
  text: String,
  container: Color,
  content: Color,
) {
  Surface(
    color = container,
    shape = RoundedCornerShape(999.dp),
  ) {
    Text(
      text = text,
      style = HangyeolTheme.typography.labelLarge.copy(fontWeight = FontWeight.Bold),
      color = content,
      modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
    )
  }
}

@Composable
private fun SocialPreviewButton(
  modifier: Modifier = Modifier,
  label: String,
  leadingContent: @Composable () -> Unit,
  onClick: () -> Unit,
) {
  Surface(
    modifier = modifier.clickable(onClick = onClick),
    color = HangyeolTheme.colorScheme.surfaceVariant,
    shape = RoundedCornerShape(20.dp),
    border = BorderStroke(1.dp, HangyeolTheme.extendedColors.lineStrong),
  ) {
    Row(
      modifier = Modifier.fillMaxWidth().heightIn(min = 52.dp).padding(horizontal = 18.dp),
      horizontalArrangement = Arrangement.Center,
      verticalAlignment = androidx.compose.ui.Alignment.CenterVertically,
    ) {
      Box(modifier = Modifier.padding(end = 10.dp)) {
        leadingContent()
      }
      Text(
        text = label,
        style = HangyeolTheme.typography.bodyMedium.copy(fontWeight = FontWeight.Bold),
        color = HangyeolTheme.colorScheme.onSurface,
      )
    }
  }
}

@Composable
private fun StreakTrack(streakDays: Int) {
  val done = kotlin.math.min(7, kotlin.math.max(0, streakDays % 7).let { if (it == 0 && streakDays > 0) 7 else it })
  val labels = listOf("月", "火", "水", "木", "金", "土", "日")
  Row(
    modifier = Modifier.fillMaxWidth(),
    horizontalArrangement = Arrangement.SpaceBetween,
  ) {
    labels.forEachIndexed { index, label ->
      Column(horizontalAlignment = androidx.compose.ui.Alignment.CenterHorizontally) {
        Surface(
          modifier = Modifier.size(38.dp),
          color = if (index < done) Color(0xFFC8DCCF) else Color(0x0D1F1B17),
          shape = RoundedCornerShape(12.dp),
        ) {
          Box(contentAlignment = androidx.compose.ui.Alignment.Center) {
            if (index < done) {
              Text(
                text = "✓",
                style = HangyeolTheme.typography.bodySmall.copy(fontSize = 13.sp, fontWeight = FontWeight.Bold),
                color = Color(0xFF2F5847),
              )
            }
            if (index == done - 1) {
              Text(
                text = "🔥",
                modifier = Modifier.align(androidx.compose.ui.Alignment.TopEnd).offset(x = 4.dp, y = (-4).dp),
                style = HangyeolTheme.typography.bodySmall.copy(fontSize = 12.sp),
              )
            }
          }
        }
        Spacer(modifier = Modifier.height(6.dp))
        Text(
          text = label,
          style = HangyeolTheme.typography.labelSmall.copy(fontWeight = FontWeight.SemiBold),
          color = HangyeolTheme.extendedColors.subtext,
        )
      }
    }
  }
}

@Composable
private fun StepDots(
  count: Int,
  activeIndex: Int,
) {
  Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
    repeat(count) { index ->
      Surface(
        color =
          when {
            index < activeIndex -> HangyeolTheme.colorScheme.tertiary
            index == activeIndex -> HangyeolTheme.colorScheme.primary
            else -> HangyeolTheme.extendedColors.lineStrong
          },
        shape = RoundedCornerShape(999.dp),
      ) {
        Spacer(modifier = Modifier.width(if (index == activeIndex) 18.dp else 6.dp).height(6.dp))
      }
    }
  }
}

@Composable
private fun PathRow(
  label: String,
  title: String,
  isCurrent: Boolean,
  onClick: () -> Unit,
) {
  val spacing = HangyeolTheme.spacing
  Surface(
    modifier = Modifier.fillMaxWidth().clickable(onClick = onClick),
    color = if (isCurrent) HangyeolTheme.extendedColors.tintPink else HangyeolTheme.colorScheme.surface,
    shape = RoundedCornerShape(20.dp),
    border = BorderStroke(1.dp, HangyeolTheme.extendedColors.lineSoft),
  ) {
    Row(
      modifier = Modifier.padding(horizontal = spacing.md, vertical = spacing.md),
      horizontalArrangement = Arrangement.spacedBy(spacing.md),
    ) {
      Surface(
        color = if (isCurrent) HangyeolTheme.colorScheme.secondary else HangyeolTheme.extendedColors.tintMint,
        shape = RoundedCornerShape(12.dp),
      ) {
        Text(
          text = label.take(1),
          style = HangyeolTheme.typography.titleMedium,
          color = if (isCurrent) HangyeolTheme.colorScheme.onSecondary else HangyeolTheme.colorScheme.primary,
          modifier = Modifier.padding(horizontal = 11.dp, vertical = 8.dp),
        )
      }
      Column(modifier = Modifier.weight(1f)) {
        Text(text = label, style = HangyeolTheme.typography.bodySmall, color = HangyeolTheme.extendedColors.subtext)
        Spacer(modifier = Modifier.height(2.dp))
        Text(text = title, style = HangyeolTheme.typography.bodyMedium, color = HangyeolTheme.colorScheme.onSurface)
      }
      Text(text = "→", style = HangyeolTheme.typography.titleMedium, color = HangyeolTheme.colorScheme.secondary)
    }
  }
}

@Composable
private fun SectionTitle(
  modifier: Modifier = Modifier,
  eyebrow: String,
  title: String,
) {
  Row(
    modifier = modifier.fillMaxWidth().padding(horizontal = 4.dp),
    horizontalArrangement = Arrangement.SpaceBetween,
    verticalAlignment = androidx.compose.ui.Alignment.Bottom,
  ) {
    Row(verticalAlignment = androidx.compose.ui.Alignment.Bottom) {
      Text(
        text = eyebrow,
        style =
          HangyeolTheme.typography.bodyMedium.copy(
            fontFamily = FontFamily.Serif,
            fontSize = 16.sp,
            lineHeight = 16.sp,
            fontWeight = FontWeight.Medium,
          ),
        color = HangyeolTheme.colorScheme.secondary.copy(alpha = 0.85f),
      )
      Spacer(modifier = Modifier.width(8.dp))
      Text(
        text = title,
        style =
          HangyeolTheme.typography.bodySmall.copy(
            fontSize = 13.sp,
            lineHeight = 16.sp,
            fontWeight = FontWeight.ExtraBold,
            letterSpacing = 0.4.sp,
          ),
        color = HangyeolTheme.colorScheme.onBackground,
      )
    }
  }
}

@Composable
private fun AchievementChip(
  modifier: Modifier = Modifier,
  emoji: String,
  value: String,
  label: String,
) {
  Surface(
    modifier = modifier.width(120.dp).shadow(2.dp, RoundedCornerShape(16.dp), clip = false, ambientColor = Color(0x141F1B17), spotColor = Color(0x121F1B17)),
    color = HangyeolTheme.colorScheme.surface,
    shape = RoundedCornerShape(16.dp),
    border = BorderStroke(1.dp, HangyeolTheme.extendedColors.lineSoft),
  ) {
    Row(
      modifier = Modifier.padding(horizontal = 14.dp, vertical = 10.dp),
      horizontalArrangement = Arrangement.spacedBy(10.dp),
      verticalAlignment = androidx.compose.ui.Alignment.CenterVertically,
    ) {
      Text(text = emoji, style = HangyeolTheme.typography.bodyLarge.copy(fontSize = 20.sp))
      Column {
        Text(
          text = value,
          style = HangyeolTheme.typography.bodySmall.copy(fontSize = 12.sp, lineHeight = 15.sp, fontWeight = FontWeight.ExtraBold),
          color = HangyeolTheme.colorScheme.onSurface,
        )
        Text(
          text = label,
          style = HangyeolTheme.typography.labelSmall.copy(fontWeight = FontWeight.SemiBold),
          color = HangyeolTheme.extendedColors.subtext,
        )
      }
    }
  }
}

@Composable
private fun ResumeCard(
  modifier: Modifier = Modifier,
  title: String,
  subtitle: String,
  seal: String,
  onClick: () -> Unit,
) {
  val spacing = HangyeolTheme.spacing
  Surface(
    modifier = modifier.clickable(onClick = onClick),
    color = Color(0xFFF6F0E9),
    shape = RoundedCornerShape(24.dp),
    border = BorderStroke(1.dp, HangyeolTheme.extendedColors.lineSoft),
    shadowElevation = 3.dp,
  ) {
    Row(
      modifier = Modifier.padding(horizontal = spacing.lg, vertical = spacing.lg),
      horizontalArrangement = Arrangement.spacedBy(spacing.md),
    ) {
      Surface(color = HangyeolTheme.extendedColors.tintPink, shape = RoundedCornerShape(14.dp)) {
        Text(
          text = seal,
          style = HangyeolTheme.typography.titleLarge,
          color = HangyeolTheme.colorScheme.secondary,
          modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
        )
      }
      Column(modifier = Modifier.weight(1f)) {
        Text(text = "繼續 · RESUME", style = HangyeolTheme.typography.labelSmall, color = HangyeolTheme.colorScheme.secondary)
        Spacer(modifier = Modifier.height(4.dp))
        Text(text = title, style = HangyeolTheme.typography.titleMedium, color = HangyeolTheme.colorScheme.onSurface)
        Spacer(modifier = Modifier.height(2.dp))
        Text(text = subtitle, style = HangyeolTheme.typography.bodySmall, color = HangyeolTheme.extendedColors.subtext)
      }
      Text(text = "→", style = HangyeolTheme.typography.titleLarge, color = HangyeolTheme.colorScheme.secondary)
    }
  }
}

@Composable
private fun SocialFeedCard(
  modifier: Modifier = Modifier,
  items: List<DashboardFeedItem>,
  likeInFlightIds: Set<String>,
  onToggleLike: (DashboardFeedItem) -> Unit,
) {
  if (items.isEmpty()) {
    Box(modifier = modifier) {
      BaselineCard(
        title = "学习伙伴",
        body = "暂无社区动态。",
      )
    }
    return
  }
  Card(
    modifier = modifier,
    colors = CardDefaults.cardColors(containerColor = HangyeolTheme.colorScheme.surface),
    shape = RoundedCornerShape(28.dp),
    border = BorderStroke(1.dp, HangyeolTheme.extendedColors.lineSoft),
    elevation = CardDefaults.cardElevation(defaultElevation = 4.dp),
  ) {
    Column {
      items.forEachIndexed { index, item ->
        val canLike = item.activityId.isNotBlank()
        val likeInFlight = canLike && likeInFlightIds.contains(item.activityId)
        val accentColor =
          when (item.tone) {
            "crimson" -> HangyeolTheme.extendedColors.tintPink
            "ink" -> HangyeolTheme.extendedColors.tintLilac
            "butter" -> HangyeolTheme.extendedColors.tintButter
            else -> HangyeolTheme.extendedColors.tintMint
          }
        Row(
          modifier = Modifier.padding(horizontal = 18.dp, vertical = 14.dp),
          horizontalArrangement = Arrangement.spacedBy(12.dp),
          verticalAlignment = androidx.compose.ui.Alignment.CenterVertically,
        ) {
          Surface(
            color = accentColor,
            shape = RoundedCornerShape(12.dp),
            modifier = Modifier.size(38.dp),
          ) {
            Box(contentAlignment = androidx.compose.ui.Alignment.Center) {
              Text(
                text = item.emoji,
                style = HangyeolTheme.typography.bodyLarge.copy(fontSize = 18.sp),
              )
            }
          }
          Column(modifier = Modifier.weight(1f)) {
            Row(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalAlignment = androidx.compose.ui.Alignment.CenterVertically) {
              val actorName = item.actorName.ifBlank { "学习伙伴" }
              val badgeLabel = item.badgeLabel.ifBlank { "动态" }
              Text(
                text = actorName,
                style = HangyeolTheme.typography.bodySmall.copy(fontSize = 13.sp, lineHeight = 16.sp, fontWeight = FontWeight.ExtraBold),
                color = HangyeolTheme.colorScheme.onSurface,
              )
              KSoftChip(
                text = badgeLabel,
                tone = item.tone,
              )
            }
            Text(
              text = item.title,
              style = HangyeolTheme.typography.labelLarge.copy(fontSize = 12.sp, lineHeight = 16.sp, fontWeight = FontWeight.Medium),
              color = HangyeolTheme.colorScheme.onSurfaceVariant,
              modifier = Modifier.padding(top = 2.dp),
            )
            Text(
              text = item.time,
              style = HangyeolTheme.typography.labelSmall.copy(fontWeight = FontWeight.SemiBold),
              color = HangyeolTheme.extendedColors.subtext,
              modifier = Modifier.padding(top = 2.dp),
            )
          }
          Row(
            horizontalArrangement = Arrangement.spacedBy(6.dp),
            verticalAlignment = androidx.compose.ui.Alignment.CenterVertically,
          ) {
            if (item.likeCount > 0) {
              Text(
                text = item.likeCount.toString(),
                style = HangyeolTheme.typography.labelSmall.copy(fontWeight = FontWeight.ExtraBold),
                color = HangyeolTheme.extendedColors.subtext,
              )
            }
            Surface(
              color = if (item.likedByMe) HangyeolTheme.extendedColors.tintPink else Color.Transparent,
              shape = RoundedCornerShape(999.dp),
              border = BorderStroke(1.dp, HangyeolTheme.extendedColors.lineSoft),
              modifier =
                Modifier
                  .size(30.dp)
                  .alpha(if (canLike && !likeInFlight) 1f else 0.55f)
                  .clickable(enabled = canLike && !likeInFlight) { onToggleLike(item) },
            ) {
              Box(contentAlignment = androidx.compose.ui.Alignment.Center) {
                Text(
                  text = if (item.likedByMe) "♥" else "♡",
                  style = HangyeolTheme.typography.labelLarge.copy(fontSize = 14.sp, fontWeight = FontWeight.Bold),
                  color = if (item.likedByMe) HangyeolTheme.extendedColors.crimson else HangyeolTheme.extendedColors.subtext,
                )
              }
            }
          }
        }
        if (index != items.lastIndex) {
          HorizontalDivider(color = HangyeolTheme.extendedColors.lineSoft)
        }
      }
    }
  }
}

@Composable
private fun ChallengeCard(
  modifier: Modifier = Modifier,
  card: DashboardChallengeCard,
  onClick: () -> Unit,
) {
  Surface(
    modifier = modifier.clickable(onClick = onClick),
    color = HangyeolTheme.extendedColors.indigo,
    shape = RoundedCornerShape(28.dp),
    border = BorderStroke(1.dp, Color.White.copy(alpha = 0.06f)),
    shadowElevation = 6.dp,
  ) {
    Box {
      Text(
        text = "挑戰",
        style =
          HangyeolTheme.typography.headlineLarge.copy(
            fontFamily = FontFamily.Serif,
            fontSize = 120.sp,
            lineHeight = 120.sp,
            fontWeight = FontWeight.Medium,
          ),
        color = Color.White.copy(alpha = 0.08f),
        modifier = Modifier.align(androidx.compose.ui.Alignment.TopEnd).offset(x = 10.dp, y = (-10).dp),
      )
      Column(modifier = Modifier.padding(horizontal = 20.dp, vertical = 20.dp)) {
        KSoftChip(text = card.badgeLabel, tone = "ink")
        Spacer(modifier = Modifier.height(10.dp))
        Text(
          text = card.title,
          style = HangyeolTheme.typography.titleLarge.copy(fontSize = 20.sp, lineHeight = 26.sp, fontWeight = FontWeight.ExtraBold),
          color = Color.White,
        )
        Spacer(modifier = Modifier.height(6.dp))
        Text(
          text = listOf(card.subtitle, "${card.progressText} · ${card.rewardText}")
            .filter { it.isNotBlank() }
            .joinToString(" · "),
          style = HangyeolTheme.typography.labelLarge.copy(fontSize = 12.sp, lineHeight = 16.sp, fontWeight = FontWeight.Medium),
          color = Color.White.copy(alpha = 0.75f),
        )
        Spacer(modifier = Modifier.height(16.dp))
        Surface(color = Color.Transparent, shape = RoundedCornerShape(14.dp), border = BorderStroke(1.5.dp, Color.White)) {
          Text(
            text = "${card.actionLabel} →",
            style = HangyeolTheme.typography.bodySmall.copy(fontSize = 13.sp, lineHeight = 18.sp, fontWeight = FontWeight.ExtraBold, letterSpacing = 0.3.sp),
            color = Color.White,
            modifier = Modifier.padding(horizontal = 20.dp, vertical = 12.dp),
          )
        }
      }
    }
  }
}

@Composable
private fun LearningHubScreen(
  onNavigateRoute: (String) -> Unit,
) {
  val viewModel: LearningHubViewModel =
    viewModel(factory = LearningHubViewModel.factory(ComposeServiceLocator.learningRepository))
  val uiState by viewModel.uiState.collectAsStateWithLifecycle()
  val spacing = HangyeolTheme.spacing
  var selectedLearningTab by rememberSaveable {
    mutableStateOf(uiState.tabs.firstOrNull { it.active }?.label ?: "我的课程")
  }
  LazyColumn(
    modifier =
      Modifier
        .fillMaxSize()
        .background(HangyeolTheme.colorScheme.background)
        .statusBarsPadding()
        .padding(horizontal = spacing.lg),
    verticalArrangement = Arrangement.spacedBy(spacing.lg),
  ) {
    item {
      Column(
        modifier =
          Modifier
            .fillMaxWidth()
            .background(
              brush =
                Brush.verticalGradient(
                  colors = listOf(HangyeolTheme.extendedColors.tintButter, HangyeolTheme.colorScheme.background),
                ),
            )
            .padding(top = spacing.md, bottom = spacing.lg),
      ) {
        Text(text = "學 · LEARN", style = HangyeolTheme.typography.labelSmall, color = HangyeolTheme.colorScheme.secondary)
        Spacer(modifier = Modifier.height(spacing.xs))
        Text(text = "学习", style = HangyeolTheme.typography.headlineMedium)
        Spacer(modifier = Modifier.height(spacing.xs))
        Text(
          text = "系统掌握韩语",
          style = HangyeolTheme.typography.bodyMedium,
          color = HangyeolTheme.extendedColors.subtext,
        )
        Spacer(modifier = Modifier.height(14.dp))
        LearningTopTabRow(
          activeLabel = selectedLearningTab,
          onSelectTab = { label ->
            when (label) {
              "我的课程", "语法" -> selectedLearningTab = label
              else -> onNavigateRoute(learningTopTabRoute(label))
            }
          },
        )
      }
    }
    when (selectedLearningTab) {
      "语法" ->
        item {
          LearningGrammarTabContent(onNavigateRoute = onNavigateRoute)
        }
      else -> {
        item {
          if (uiState.isLoading) {
            BaselineCard(title = "正在加载学习页", body = "课程、旅程和工具入口正由 Android 原生 Repository 注入。")
          } else {
            LearningCurrentCourseCard(
              title = uiState.currentCourse?.title.orEmpty(),
              subtitle = uiState.currentCourse?.subtitle.orEmpty(),
              progress = uiState.currentCourse?.progress ?: 0,
              completedHours = uiState.currentCourse?.completedHours,
              totalHours = uiState.currentCourse?.totalHours,
              etaDays = uiState.currentCourse?.etaDays,
              onClick = { onNavigateRoute(resolveRoute(uiState.currentCourse?.route ?: "main/grammar")) },
            )
          }
        }
        item {
          KSoftSectionHead(kanji = "路", title = "学习旅程", action = "查看全部")
        }
        item {
          JourneyTimeline(
            items = uiState.journeyUnits,
            onNavigateRoute = onNavigateRoute,
          )
        }
        item {
          KSoftSectionHead(kanji = "具", title = "学习工具")
        }
        item {
          ShortcutGrid(
            shortcuts = uiState.shortcuts,
            onNavigateRoute = onNavigateRoute,
          )
        }
      }
    }
  }
}

@Composable
private fun LearningTopTabRow(
  activeLabel: String,
  onSelectTab: (String) -> Unit,
  modifier: Modifier = Modifier,
) {
  val tabs =
    listOf(
      "我的课程",
      "语法",
      "词汇",
      "写作",
      "TOPIK",
    )
  LazyRow(
    modifier = modifier,
    horizontalArrangement = Arrangement.spacedBy(8.dp),
  ) {
    items(tabs) { label ->
      val active = activeLabel == label
      Surface(
        modifier =
          Modifier
            .clickable(enabled = !active) { onSelectTab(label) }
            .shadow(
              elevation = if (active) 0.dp else 2.dp,
              shape = RoundedCornerShape(999.dp),
              clip = false,
              ambientColor = Color(0x121F1B17),
              spotColor = Color(0x101F1B17),
            ),
        color = if (active) HangyeolTheme.colorScheme.primary else HangyeolTheme.colorScheme.surface,
        shape = RoundedCornerShape(999.dp),
        border = if (active) null else BorderStroke(1.dp, HangyeolTheme.extendedColors.lineSoft),
      ) {
        Text(
          text = label,
          style =
            HangyeolTheme.typography.bodySmall.copy(
              fontSize = 13.sp,
              lineHeight = 16.sp,
              fontWeight = FontWeight.ExtraBold,
            ),
          color = if (active) HangyeolTheme.colorScheme.onPrimary else HangyeolTheme.colorScheme.onSurface,
          modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
        )
      }
    }
  }
}

private fun learningTopTabRoute(label: String): String =
  when (label) {
    "我的课程" -> HangyeolDestination.TabsCourses.pattern
    "语法" -> HangyeolDestination.Grammar.pattern
    "词汇" -> HangyeolDestination.Vocab.pattern
    "写作" -> HangyeolDestination.Writing.pattern
    "TOPIK" -> HangyeolDestination.Topik.pattern
    else -> HangyeolDestination.TabsCourses.pattern
  }

@Composable
private fun LearningGrammarTabContent(
  onNavigateRoute: (String) -> Unit,
) {
  val viewModel: GrammarHubViewModel =
    viewModel(factory = GrammarHubViewModel.factory(ComposeServiceLocator.learningRepository))
  val uiState by viewModel.uiState.collectAsStateWithLifecycle()
  var searchQuery by rememberSaveable { mutableStateOf("") }
  var selectedFilter by rememberSaveable { mutableStateOf("ALL") }
  val currentDeck = uiState.decks.firstOrNull { it.progress in 1..99 } ?: uiState.decks.firstOrNull()
  val currentCourse =
    uiState.currentCourse
      ?: currentDeck?.let { deck ->
        LearningCurrentCourse(
          progress = deck.progress,
          title = deck.title,
          subtitle = deck.level,
          completedHours = null,
          totalHours = null,
          etaDays = null,
          route = "main/grammar/${deck.id}",
        )
      }
  val journeyUnits =
    if (uiState.journeyUnits.isNotEmpty()) {
      uiState.journeyUnits
    } else {
      uiState.decks.take(5).mapIndexed { index, deck ->
        com.hangyeol.app.compose.data.LearningJourneyUnit(
          number = index + 1,
          title = deck.title,
          subtitle = deck.subtitle.ifBlank { deck.level },
          progress = (deck.progress / 100f).coerceIn(0f, 1f),
          seal = listOf("若", "時", "過", "傳", "助")[index % 5],
          route = "main/grammar/${deck.id}",
        )
      }
    }
  val toolShortcuts = uiState.shortcuts
  val filteredDecks =
    uiState.decks.filter { deck ->
      val keyword = searchQuery.trim()
      val matchesSearch =
        keyword.isBlank() ||
          deck.title.contains(keyword, ignoreCase = true) ||
          deck.subtitle.contains(keyword, ignoreCase = true) ||
          deck.level.contains(keyword, ignoreCase = true)
      val matchesFilter =
        when (selectedFilter) {
          "ACTIVE" -> deck.progress in 1..99
          "NEW" -> deck.progress <= 0
          else -> true
        }
      matchesSearch && matchesFilter
    }

  Column(verticalArrangement = Arrangement.spacedBy(0.dp)) {
    Box(modifier = Modifier.padding(horizontal = 0.dp)) {
      currentCourse?.let { course ->
        LearningCurrentCourseCard(
          title = course.title,
          subtitle = course.subtitle,
          progress = course.progress,
          completedHours = course.completedHours,
          totalHours = course.totalHours,
          etaDays = course.etaDays,
          onClick = { onNavigateRoute(resolveRoute(course.route)) },
        )
      } ?: BaselineCard(title = "暂无语法课程", body = "原生语法课程列表为空。")
    }
    Column(modifier = Modifier.padding(vertical = 28.dp)) {
      KSoftSectionHead(kanji = "路", title = "学习旅程", action = "全部")
      Spacer(modifier = Modifier.height(12.dp))
      JourneyTimeline(items = journeyUnits, onNavigateRoute = onNavigateRoute)
    }
    Column(modifier = Modifier.padding(vertical = 0.dp)) {
      KSoftSectionHead(kanji = "具", title = "学习工具")
      Spacer(modifier = Modifier.height(12.dp))
      if (toolShortcuts.isEmpty()) {
        BaselineCard(title = "暂无学习工具数据", body = "学习工具将随服务端数据同步后展示。")
      } else {
        val shortcutRows = toolShortcuts.chunked(2)
        shortcutRows.forEachIndexed { rowIndex, rowItems ->
          Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            rowItems.forEach { shortcut ->
              GrammarHubToolCard(
                modifier = Modifier.weight(1f),
                shortcut = shortcut,
                onClick = { onNavigateRoute(resolveRoute(shortcut.route)) },
              )
            }
          }
          if (rowIndex != shortcutRows.lastIndex) {
            Spacer(modifier = Modifier.height(10.dp))
          }
        }
      }
    }
    Column(modifier = Modifier.padding(vertical = 28.dp, horizontal = 2.dp)) {
      KSoftInputField(
        value = searchQuery,
        onValueChange = { searchQuery = it },
        placeholder = "搜索语法课程 / 教材 / 级别",
      )
      Row(
        modifier = Modifier.padding(top = 10.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
      ) {
        listOf(
          "ALL" to "全部",
          "ACTIVE" to "学习中",
          "NEW" to "待开始",
        ).forEach { (key, label) ->
          val active = selectedFilter == key
          Surface(
            modifier = Modifier.clickable { selectedFilter = key },
            color = if (active) HangyeolTheme.colorScheme.onSurface else HangyeolTheme.colorScheme.surface,
            shape = RoundedCornerShape(999.dp),
            border = BorderStroke(1.dp, if (active) HangyeolTheme.colorScheme.onSurface else HangyeolTheme.extendedColors.lineSoft),
          ) {
            Text(
              text = label,
              style = HangyeolTheme.typography.bodySmall.copy(fontSize = 12.sp, lineHeight = 16.sp, fontWeight = FontWeight.SemiBold),
              color = if (active) HangyeolTheme.colorScheme.surface else HangyeolTheme.colorScheme.onSurface,
              modifier = Modifier.padding(horizontal = 12.dp, vertical = 7.dp),
            )
          }
        }
      }
      Row(
        modifier = Modifier.fillMaxWidth().padding(top = 14.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = androidx.compose.ui.Alignment.CenterVertically,
      ) {
        Text(
          text = "语法课程",
          style = HangyeolTheme.typography.titleMedium.copy(fontSize = 20.sp, lineHeight = 24.sp, fontWeight = FontWeight.ExtraBold),
          color = HangyeolTheme.colorScheme.onSurface,
        )
        Text(
          text = "${filteredDecks.size} 个结果",
          style = HangyeolTheme.typography.bodySmall.copy(fontSize = 12.sp, lineHeight = 16.sp, fontWeight = FontWeight.Medium),
          color = HangyeolTheme.extendedColors.subtext,
        )
      }
    }
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
      filteredDecks.forEach { deck ->
        GrammarDeckCard(
          deck = deck,
          onClick = { onNavigateRoute(resolveRoute("main/grammar/${deck.id}")) },
        )
      }
    }
  }
}

@Composable
private fun WritingHubScreen(
  onBack: () -> Unit,
  onNavigateRoute: (String) -> Unit,
) {
  val viewModel: WritingHubViewModel =
    viewModel(factory = WritingHubViewModel.factory(ComposeServiceLocator.learningRepository))
  val uiState by viewModel.uiState.collectAsStateWithLifecycle()
  val continueRoute =
    resolveRoute(
      uiState.drafts.firstOrNull()?.route
        ?: uiState.prompts.firstOrNull()?.route
        ?: HangyeolDestination.Topik.pattern,
    )

  fun resolveWritingRoute(route: String): String =
    if (route == "main/writing" || route == HangyeolDestination.Writing.pattern) continueRoute else resolveRoute(route)

  LazyColumn(
    modifier =
      Modifier
        .fillMaxSize()
        .background(HangyeolTheme.colorScheme.background),
    verticalArrangement = Arrangement.spacedBy(0.dp),
    contentPadding = PaddingValues(bottom = 100.dp),
  ) {
    item {
      Column(
        modifier =
          Modifier
            .fillMaxWidth()
            .background(
              Brush.verticalGradient(
                colors =
                  listOf(
                    HangyeolTheme.extendedColors.tintButter,
                    HangyeolTheme.colorScheme.background,
                  ),
              ),
            )
            .statusBarsPadding()
            .padding(top = 8.dp, bottom = 20.dp),
      ) {
        Surface(
          modifier = Modifier.padding(horizontal = 22.dp).size(36.dp).clickable { onBack() },
          color = HangyeolTheme.colorScheme.surface,
          shape = RoundedCornerShape(18.dp),
          border = BorderStroke(1.dp, HangyeolTheme.extendedColors.lineSoft),
          shadowElevation = 2.dp,
        ) {
          Box(contentAlignment = androidx.compose.ui.Alignment.Center) {
            Text(
              text = "←",
              style = HangyeolTheme.typography.titleMedium.copy(fontSize = 16.sp, lineHeight = 16.sp, fontWeight = FontWeight.ExtraBold),
              color = HangyeolTheme.colorScheme.onSurface,
            )
          }
        }
        Column(modifier = Modifier.padding(horizontal = 22.dp, vertical = 14.dp)) {
          Text(
            text = "寫 · WRITING",
            style = KSoftSerifLabelStyle(),
            color = HangyeolTheme.extendedColors.crimson,
          )
          Text(
            text = "写作",
            style = HangyeolTheme.typography.headlineMedium.copy(fontSize = 28.sp, lineHeight = 32.sp, fontWeight = FontWeight.ExtraBold),
            color = HangyeolTheme.colorScheme.onSurface,
            modifier = Modifier.padding(top = 4.dp),
          )
          Text(
            text = "围绕 TOPIK 写作与书面表达继续训练",
            style = HangyeolTheme.typography.bodySmall.copy(fontSize = 13.sp, lineHeight = 18.sp, fontWeight = FontWeight.Medium),
            color = HangyeolTheme.extendedColors.subtext,
            modifier = Modifier.padding(top = 4.dp),
          )
        }
        LearningTopTabRow(
          activeLabel = "写作",
          onSelectTab = { label -> onNavigateRoute(learningTopTabRoute(label)) },
          modifier = Modifier.padding(horizontal = 18.dp),
        )
      }
    }
    if (uiState.isLoading) {
      item {
        Box(modifier = Modifier.padding(horizontal = 18.dp)) {
          BaselineCard(title = "正在加载写作页", body = "草稿、练习题和写作统计正在注入。")
        }
      }
    } else {
      item {
        Surface(
          modifier = Modifier.padding(horizontal = 18.dp),
          color = Color.Transparent,
          shape = RoundedCornerShape(28.dp),
          border = BorderStroke(1.dp, HangyeolTheme.extendedColors.lineSoft),
          shadowElevation = 4.dp,
        ) {
          Column(
            modifier =
              Modifier
                .background(
                  brush =
                    Brush.linearGradient(
                      colors =
                        listOf(
                          HangyeolTheme.extendedColors.tintButter,
                          HangyeolTheme.extendedColors.tintPink,
                        ),
                    ),
                  shape = RoundedCornerShape(28.dp),
                )
                .padding(20.dp),
          ) {
            Row(
              modifier = Modifier.fillMaxWidth(),
              horizontalArrangement = Arrangement.SpaceBetween,
              verticalAlignment = androidx.compose.ui.Alignment.Top,
            ) {
              Column(modifier = Modifier.weight(1f)) {
                Surface(color = HangyeolTheme.colorScheme.primary, shape = RoundedCornerShape(999.dp)) {
                  Text(
                    text = uiState.weeklyGoal,
                    style = HangyeolTheme.typography.bodySmall.copy(fontSize = 12.sp, lineHeight = 14.sp, fontWeight = FontWeight.ExtraBold),
                    color = HangyeolTheme.colorScheme.onPrimary,
                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
                  )
                }
                Text(
                  text = uiState.focusTitle,
                  style = HangyeolTheme.typography.headlineSmall.copy(fontSize = 24.sp, lineHeight = 28.sp, fontWeight = FontWeight.ExtraBold),
                  color = HangyeolTheme.colorScheme.onSurface,
                  modifier = Modifier.padding(top = 12.dp),
                )
                Text(
                  text = uiState.focusSubtitle,
                  style = HangyeolTheme.typography.bodyMedium.copy(fontWeight = FontWeight.SemiBold),
                  color = HangyeolTheme.extendedColors.subtext,
                  modifier = Modifier.padding(top = 4.dp),
                )
                Text(
                  text = uiState.focusMeta,
                  style = HangyeolTheme.typography.bodySmall.copy(fontWeight = FontWeight.Bold),
                  color = HangyeolTheme.extendedColors.subtext,
                  modifier = Modifier.padding(top = 8.dp),
                )
              }
              KSoftHanjaSeal(
                c = "寫",
                size = 52,
                round = 10,
                bg = HangyeolTheme.colorScheme.primary,
                color = HangyeolTheme.colorScheme.onPrimary,
              )
            }
            Row(
              modifier = Modifier.fillMaxWidth().padding(top = 16.dp),
              horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
              WritingStatCard(
                modifier = Modifier.weight(1f),
                seal = "篇",
                value = uiState.completedCount.toString(),
                label = "已完成",
              )
              WritingStatCard(
                modifier = Modifier.weight(1f),
                seal = "分",
                value = uiState.averageScore.toString(),
                label = "平均分",
              )
              WritingStatCard(
                modifier = Modifier.weight(1f),
                seal = "日",
                value = uiState.streakDays.toString(),
                label = "连续写作",
              )
            }
            KSoftPrimaryButton(
              text = "继续上次草稿",
              onClick = { onNavigateRoute(continueRoute) },
              modifier = Modifier.padding(top = 18.dp),
              trailingArrow = true,
            )
          }
        }
      }
      item {
        Column(modifier = Modifier.padding(horizontal = 18.dp, vertical = 28.dp)) {
          KSoftSectionHead(kanji = "稿", title = "草稿箱", action = "${uiState.drafts.size} 篇")
          Spacer(modifier = Modifier.height(12.dp))
          Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            uiState.drafts.forEach { draft ->
              WritingDraftCard(
                draft = draft,
                onClick = { onNavigateRoute(resolveWritingRoute(draft.route)) },
              )
            }
          }
        }
      }
      item {
        Column(modifier = Modifier.padding(horizontal = 18.dp)) {
          KSoftSectionHead(kanji = "題", title = "训练题库")
          Spacer(modifier = Modifier.height(12.dp))
          Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            uiState.prompts.chunked(2).forEach { rowItems ->
              Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                rowItems.forEach { prompt ->
                  WritingPromptCard(
                    modifier = Modifier.weight(1f),
                    prompt = prompt,
                    onClick = { onNavigateRoute(resolveWritingRoute(prompt.route)) },
                  )
                }
                if (rowItems.size == 1) {
                  Spacer(modifier = Modifier.weight(1f))
                }
              }
            }
          }
        }
      }
    }
  }
}

@Composable
private fun WritingStatCard(
  modifier: Modifier = Modifier,
  seal: String,
  value: String,
  label: String,
) {
  Surface(
    modifier = modifier,
    color = HangyeolTheme.colorScheme.surface.copy(alpha = 0.88f),
    shape = RoundedCornerShape(20.dp),
    border = BorderStroke(1.dp, HangyeolTheme.colorScheme.surface.copy(alpha = 0.6f)),
  ) {
    Column(modifier = Modifier.padding(horizontal = 14.dp, vertical = 14.dp)) {
      Text(
        text = seal,
        style = HangyeolTheme.typography.titleMedium.copy(fontFamily = FontFamily.Serif, fontWeight = FontWeight.Bold),
        color = HangyeolTheme.extendedColors.crimson,
      )
      Text(
        text = value,
        style = HangyeolTheme.typography.titleLarge.copy(fontSize = 22.sp, lineHeight = 24.sp, fontWeight = FontWeight.ExtraBold),
        color = HangyeolTheme.colorScheme.onSurface,
        modifier = Modifier.padding(top = 8.dp),
      )
      Text(
        text = label,
        style = HangyeolTheme.typography.labelSmall.copy(fontSize = 10.sp, lineHeight = 12.sp, fontWeight = FontWeight.SemiBold),
        color = HangyeolTheme.extendedColors.subtext,
        modifier = Modifier.padding(top = 3.dp),
      )
    }
  }
}

@Composable
private fun WritingDraftCard(
  draft: WritingDraftUiModel,
  onClick: () -> Unit,
) {
  Surface(
    modifier = Modifier.fillMaxWidth().clickable(onClick = onClick),
    color = HangyeolTheme.colorScheme.surface,
    shape = RoundedCornerShape(24.dp),
    border = BorderStroke(1.dp, HangyeolTheme.extendedColors.lineSoft),
    shadowElevation = 3.dp,
  ) {
    Row(
      modifier = Modifier.padding(horizontal = 18.dp, vertical = 18.dp),
      horizontalArrangement = Arrangement.spacedBy(14.dp),
      verticalAlignment = androidx.compose.ui.Alignment.CenterVertically,
    ) {
      KSoftHanjaSeal(
        c = "稿",
        size = 44,
        round = 12,
        bg = HangyeolTheme.extendedColors.tintButter,
      )
      Column(modifier = Modifier.weight(1f)) {
        Text(
          text = draft.title,
          style = HangyeolTheme.typography.titleMedium.copy(fontSize = 18.sp, lineHeight = 22.sp, fontWeight = FontWeight.ExtraBold),
          color = HangyeolTheme.colorScheme.onSurface,
        )
        Text(
          text = draft.subtitle,
          style = HangyeolTheme.typography.bodySmall.copy(fontSize = 12.sp, lineHeight = 16.sp, fontWeight = FontWeight.Medium),
          color = HangyeolTheme.extendedColors.subtext,
          modifier = Modifier.padding(top = 4.dp),
        )
      }
      Surface(
        color = HangyeolTheme.extendedColors.tintPink,
        shape = RoundedCornerShape(999.dp),
      ) {
        Text(
          text = draft.progress,
          style = HangyeolTheme.typography.bodySmall.copy(fontSize = 12.sp, lineHeight = 14.sp, fontWeight = FontWeight.ExtraBold),
          color = HangyeolTheme.colorScheme.onSurface,
          modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
        )
      }
    }
  }
}

@Composable
private fun WritingPromptCard(
  modifier: Modifier = Modifier,
  prompt: WritingPromptUiModel,
  onClick: () -> Unit,
) {
  Card(
    modifier = modifier.clickable(onClick = onClick),
    colors = CardDefaults.cardColors(containerColor = HangyeolTheme.colorScheme.surface),
    shape = RoundedCornerShape(22.dp),
    border = BorderStroke(1.dp, HangyeolTheme.extendedColors.lineSoft),
    elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
  ) {
    Column(
      modifier = Modifier.heightIn(min = 152.dp).padding(16.dp),
      verticalArrangement = Arrangement.SpaceBetween,
    ) {
      Surface(
        color = shortcutAccent(prompt.accent),
        shape = RoundedCornerShape(8.dp),
        modifier = Modifier.size(34.dp),
      ) {
        Box(contentAlignment = androidx.compose.ui.Alignment.Center) {
          Text(
            text = prompt.seal,
            style = HangyeolTheme.typography.bodyMedium.copy(fontFamily = FontFamily.Serif, fontSize = 18.sp, lineHeight = 18.sp, fontWeight = FontWeight.Medium),
            color = HangyeolTheme.colorScheme.onSurface,
          )
        }
      }
      Column(modifier = Modifier.padding(top = 12.dp)) {
        Text(
          text = prompt.title,
          style = HangyeolTheme.typography.bodyMedium.copy(fontSize = 14.sp, lineHeight = 18.sp, fontWeight = FontWeight.ExtraBold),
          color = HangyeolTheme.colorScheme.onSurface,
        )
        Text(
          text = prompt.subtitle,
          style = HangyeolTheme.typography.bodySmall.copy(fontSize = 12.sp, lineHeight = 16.sp, fontWeight = FontWeight.Medium),
          color = HangyeolTheme.extendedColors.subtext,
          modifier = Modifier.padding(top = 4.dp),
        )
        Text(
          text = prompt.meta,
          style = HangyeolTheme.typography.labelSmall.copy(fontSize = 10.sp, lineHeight = 12.sp, fontWeight = FontWeight.Bold),
          color = HangyeolTheme.extendedColors.crimson,
          modifier = Modifier.padding(top = 10.dp),
        )
      }
    }
  }
}

@Composable
private fun VocabScreen(
  onBack: () -> Unit,
  onNavigateRoute: (String) -> Unit,
) {
  val viewModel: VocabViewModel =
    viewModel(factory = VocabViewModel.factory(ComposeServiceLocator.learningRepository))
  val uiState by viewModel.uiState.collectAsStateWithLifecycle()
  val dueEstimateMinutes = ((uiState.dueCount + 4) / 5).coerceAtLeast(1)
  val tabs =
    listOf(
      "due" to "도착한",
      "all" to "全部",
      "decks" to "单词집",
      "starred" to "별표",
    )

  LazyColumn(
    modifier =
      Modifier
        .fillMaxSize()
        .background(HangyeolTheme.colorScheme.background)
        .statusBarsPadding(),
    verticalArrangement = Arrangement.spacedBy(12.dp),
    contentPadding = PaddingValues(bottom = HangyeolTheme.spacing.xl),
  ) {
    item {
      Column(
        modifier =
          Modifier
            .fillMaxWidth()
            .background(
              Brush.verticalGradient(
                colors =
                  listOf(
                    HangyeolTheme.extendedColors.tintPink,
                    HangyeolTheme.colorScheme.background,
                  ),
              ),
            )
            .padding(horizontal = 22.dp, vertical = 14.dp),
      ) {
        Surface(
          modifier = Modifier.size(36.dp).clickable { onBack() },
          color = HangyeolTheme.colorScheme.surface,
          shape = RoundedCornerShape(18.dp),
          border = BorderStroke(1.dp, HangyeolTheme.extendedColors.lineSoft),
          shadowElevation = 2.dp,
        ) {
          Box(contentAlignment = androidx.compose.ui.Alignment.Center) {
            Text(
              text = "←",
              style = HangyeolTheme.typography.titleMedium.copy(fontSize = 16.sp, lineHeight = 16.sp, fontWeight = FontWeight.ExtraBold),
              color = HangyeolTheme.colorScheme.onSurface,
            )
          }
        }
        Text(
          text = "詞 · VOCABULARY",
          style = KSoftSerifLabelStyle(),
          color = HangyeolTheme.extendedColors.crimson,
          modifier = Modifier.padding(top = 14.dp),
        )
        Text(
          text = "词汇本",
          style = HangyeolTheme.typography.headlineMedium.copy(fontSize = 28.sp, lineHeight = 32.sp, fontWeight = FontWeight.ExtraBold),
          color = HangyeolTheme.colorScheme.onSurface,
          modifier = Modifier.padding(top = 4.dp),
        )
        Text(
          text = "${uiState.totalWords} 单词 · ${uiState.dueCount} 个 待复习",
          style = HangyeolTheme.typography.bodySmall.copy(fontSize = 13.sp, lineHeight = 18.sp, fontWeight = FontWeight.Medium),
          color = HangyeolTheme.extendedColors.subtext,
          modifier = Modifier.padding(top = 4.dp),
        )
        Surface(
          modifier = Modifier.fillMaxWidth().padding(top = 18.dp),
          color = HangyeolTheme.colorScheme.surface,
          shape = RoundedCornerShape(20.dp),
          border = BorderStroke(1.dp, HangyeolTheme.extendedColors.lineSoft),
          shadowElevation = 3.dp,
        ) {
          Column(modifier = Modifier.padding(16.dp)) {
            Row(
              modifier = Modifier.fillMaxWidth(),
              horizontalArrangement = Arrangement.SpaceBetween,
              verticalAlignment = androidx.compose.ui.Alignment.Bottom,
            ) {
              Text(
                text = "기억 강도 · 記憶",
                style = HangyeolTheme.typography.bodySmall.copy(fontSize = 12.sp, lineHeight = 14.sp, fontWeight = FontWeight.ExtraBold),
                color = HangyeolTheme.colorScheme.onSurface,
              )
              Text(
                text = "FSRS",
                style = HangyeolTheme.typography.labelSmall.copy(fontSize = 10.sp, lineHeight = 12.sp, fontWeight = FontWeight.Bold),
                color = HangyeolTheme.extendedColors.subtext,
              )
            }
            Row(
              modifier = Modifier.fillMaxWidth().height(44.dp).padding(top = 10.dp),
              horizontalArrangement = Arrangement.spacedBy(4.dp),
              verticalAlignment = androidx.compose.ui.Alignment.Bottom,
            ) {
              listOf(0.2f, 0.4f, 0.3f, 0.55f, 0.7f, 0.6f, 0.85f, 0.75f, 0.9f, 0.82f, 0.95f, 1f, 0.88f, 0.92f).forEach { item ->
                Surface(
                  modifier = Modifier.weight(1f).height((44f * item).dp),
                  color = HangyeolTheme.extendedColors.crimson.copy(alpha = 0.3f + item * 0.7f),
                  shape = RoundedCornerShape(3.dp),
                ) {}
              }
            }
            Row(
              modifier = Modifier.fillMaxWidth().padding(top = 10.dp),
              horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
              listOf(
                uiState.masteredCount.toString() to "掌握",
                uiState.learningCount.toString() to "학습 중",
                uiState.newWordCount.toString() to "新词",
              ).forEach { (value, label) ->
                Column(
                  modifier = Modifier.weight(1f),
                  horizontalAlignment = androidx.compose.ui.Alignment.CenterHorizontally,
                ) {
                  Text(
                    text = value,
                    style = HangyeolTheme.typography.bodyMedium.copy(fontSize = 17.sp, lineHeight = 20.sp, fontWeight = FontWeight.ExtraBold),
                    color = HangyeolTheme.colorScheme.onSurface,
                  )
                  Text(
                    text = label,
                    style = HangyeolTheme.typography.labelSmall.copy(fontSize = 10.sp, lineHeight = 12.sp, fontWeight = FontWeight.SemiBold),
                    color = HangyeolTheme.extendedColors.subtext,
                    modifier = Modifier.padding(top = 1.dp),
                  )
                }
              }
            }
          }
        }
      }
    }
    item {
      Surface(
        modifier = Modifier.padding(horizontal = 18.dp).fillMaxWidth().clickable {
          onNavigateRoute(HangyeolDestination.VocabDeck.createRoute("topik-ii-core"))
        },
        color = HangyeolTheme.colorScheme.onSurface,
        shape = RoundedCornerShape(22.dp),
        shadowElevation = 4.dp,
      ) {
        Row(
          modifier = Modifier.padding(horizontal = 18.dp, vertical = 18.dp),
          horizontalArrangement = Arrangement.spacedBy(14.dp),
          verticalAlignment = androidx.compose.ui.Alignment.CenterVertically,
        ) {
          KSoftHanjaSeal(c = "復", size = 48, round = 12, bg = Color.White.copy(alpha = 0.15f), color = HangyeolTheme.colorScheme.surface)
          Column(modifier = Modifier.weight(1f)) {
            Text(
              text = "今天 复习 · DUE TODAY",
              style = HangyeolTheme.typography.labelSmall.copy(fontSize = 11.sp, lineHeight = 13.sp, fontWeight = FontWeight.Bold),
              color = HangyeolTheme.colorScheme.surface.copy(alpha = 0.65f),
            )
            Text(
              text = "${uiState.dueCount} 单词 · ${dueEstimateMinutes}分钟",
              style = HangyeolTheme.typography.titleLarge.copy(fontSize = 22.sp, lineHeight = 24.sp, fontWeight = FontWeight.ExtraBold),
              color = HangyeolTheme.colorScheme.surface,
              modifier = Modifier.padding(top = 2.dp),
            )
          }
          Surface(
            modifier = Modifier.size(44.dp),
            color = HangyeolTheme.colorScheme.surface,
            shape = RoundedCornerShape(22.dp),
          ) {
            Box(contentAlignment = androidx.compose.ui.Alignment.Center) {
              Text(
                text = "→",
                style = HangyeolTheme.typography.bodyMedium.copy(fontSize = 18.sp, lineHeight = 18.sp, fontWeight = FontWeight.Bold),
                color = HangyeolTheme.colorScheme.onSurface,
              )
            }
          }
        }
      }
    }
    item {
      LazyRow(
        modifier = Modifier.fillMaxWidth(),
        contentPadding = PaddingValues(horizontal = 22.dp),
        horizontalArrangement = Arrangement.spacedBy(22.dp),
      ) {
        items(tabs) { (id, label) ->
          val active = id == uiState.selectedTab
          Column(
            modifier = Modifier.clickable { viewModel.selectTab(id) },
            horizontalAlignment = androidx.compose.ui.Alignment.CenterHorizontally,
          ) {
            Row(horizontalArrangement = Arrangement.spacedBy(4.dp), verticalAlignment = androidx.compose.ui.Alignment.CenterVertically) {
              Text(
                text = label,
                style = HangyeolTheme.typography.bodySmall.copy(fontSize = 13.sp, lineHeight = 16.sp, fontWeight = if (active) FontWeight.ExtraBold else FontWeight.SemiBold),
                color = if (active) HangyeolTheme.colorScheme.onSurface else HangyeolTheme.extendedColors.subtext,
              )
              if (id == "due") {
                Text(
                  text = uiState.dueCount.toString(),
                  style = HangyeolTheme.typography.labelSmall.copy(fontSize = 11.sp, lineHeight = 12.sp, fontWeight = FontWeight.Bold),
                  color = HangyeolTheme.extendedColors.subtext,
                )
              }
              if (id == "all") {
                Text(
                  text = uiState.totalWords.toString(),
                  style = HangyeolTheme.typography.labelSmall.copy(fontSize = 11.sp, lineHeight = 12.sp, fontWeight = FontWeight.Bold),
                  color = HangyeolTheme.extendedColors.subtext,
                )
              }
            }
            Spacer(modifier = Modifier.height(10.dp))
            Box(
              modifier =
                Modifier
                  .height(2.dp)
                  .width(42.dp)
                  .background(if (active) HangyeolTheme.colorScheme.onSurface else Color.Transparent),
            )
          }
        }
      }
      HorizontalDivider(color = HangyeolTheme.extendedColors.lineSoft, modifier = Modifier.padding(top = 0.dp))
    }
    items(uiState.entries.size) { index ->
      val entry = uiState.entries[index]
      Surface(
        modifier = Modifier.padding(horizontal = 18.dp),
        color = HangyeolTheme.colorScheme.surface,
        shape = RoundedCornerShape(20.dp),
        border = BorderStroke(1.dp, HangyeolTheme.extendedColors.lineSoft),
        shadowElevation = 2.dp,
      ) {
        Row(
          modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 16.dp),
          horizontalArrangement = Arrangement.spacedBy(14.dp),
          verticalAlignment = androidx.compose.ui.Alignment.CenterVertically,
        ) {
          KSoftHanjaSeal(
            c = entry.hanja.take(1),
            size = 40,
            round = 10,
            bg = HangyeolTheme.extendedColors.surfaceMuted,
            color = HangyeolTheme.extendedColors.crimson,
          )
          Column(modifier = Modifier.weight(1f)) {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = androidx.compose.ui.Alignment.Bottom) {
              Text(
                text = entry.word,
                style = HangyeolTheme.typography.bodyMedium.copy(fontSize = 16.sp, lineHeight = 18.sp, fontWeight = FontWeight.ExtraBold),
                color = HangyeolTheme.colorScheme.onSurface,
              )
              Text(
                text = "[${entry.pronunciation}]",
                style = HangyeolTheme.typography.labelSmall.copy(fontSize = 11.sp, lineHeight = 13.sp, fontWeight = FontWeight.SemiBold),
                color = HangyeolTheme.extendedColors.subtext,
              )
            }
            Row(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalAlignment = androidx.compose.ui.Alignment.CenterVertically, modifier = Modifier.padding(top = 4.dp)) {
              KSoftChip(text = entry.partOfSpeech, tone = "muted", size = "sm")
              Text(
                text = entry.hanja,
                style = HangyeolTheme.typography.bodySmall.copy(fontFamily = FontFamily.Serif, fontSize = 12.sp, lineHeight = 14.sp, fontWeight = FontWeight.Medium),
                color = HangyeolTheme.extendedColors.crimson,
              )
            }
            Row(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalAlignment = androidx.compose.ui.Alignment.CenterVertically, modifier = Modifier.padding(top = 6.dp)) {
              Box(
                modifier =
                  Modifier
                    .width(120.dp)
                    .height(3.dp)
                    .background(HangyeolTheme.extendedColors.lineSoft, RoundedCornerShape(2.dp)),
              ) {
                Box(
                  modifier =
                    Modifier
                      .height(3.dp)
                      .fillMaxWidth(entry.memoryRate / 100f)
                      .background(
                        when {
                          entry.memoryRate > 70 -> HangyeolTheme.extendedColors.jade
                          entry.memoryRate > 40 -> HangyeolTheme.extendedColors.gold
                          else -> HangyeolTheme.extendedColors.crimson
                        },
                        RoundedCornerShape(2.dp),
                      ),
                )
              }
              Text(
                text = "${entry.memoryRate}%",
                style = HangyeolTheme.typography.labelSmall.copy(fontSize = 9.sp, lineHeight = 11.sp, fontWeight = FontWeight.Bold),
                color = HangyeolTheme.extendedColors.subtext,
              )
            }
          }
          Text(
            text = "★",
            style = HangyeolTheme.typography.bodySmall.copy(fontSize = 14.sp, lineHeight = 14.sp, fontWeight = FontWeight.Bold),
            color = if (entry.memoryRate > 40) HangyeolTheme.extendedColors.gold else HangyeolTheme.extendedColors.subtext,
          )
        }
      }
    }
  }
}

@Composable
private fun VocabDeckScreen(
  deckId: String,
  onBack: () -> Unit,
  onNavigateRoute: (String) -> Unit,
) {
  // 当前 Vocab UI 本身已是可交互的学习页，这里按 deck 路由复用同一数据流，
  // 先去掉占位页并保留后续按 deckId 细分筛选能力。
  VocabScreen(
    onBack = onBack,
    onNavigateRoute = onNavigateRoute,
  )
}

@Composable
private fun GrammarHubScreen(
  onNavigateRoute: (String) -> Unit,
) {
  val viewModel: GrammarHubViewModel =
    viewModel(factory = GrammarHubViewModel.factory(ComposeServiceLocator.learningRepository))
  val uiState by viewModel.uiState.collectAsStateWithLifecycle()
  var searchQuery by rememberSaveable { mutableStateOf("") }
  var selectedFilter by rememberSaveable { mutableStateOf("ALL") }
  val currentDeck = uiState.decks.firstOrNull { it.progress in 1..99 } ?: uiState.decks.firstOrNull()
  val currentCourse =
    uiState.currentCourse
      ?: currentDeck?.let { deck ->
        LearningCurrentCourse(
          progress = deck.progress,
          title = deck.title,
          subtitle = deck.level,
          completedHours = null,
          totalHours = null,
          etaDays = null,
          route = "main/grammar/${deck.id}",
        )
      }
  val journeyUnits =
    if (uiState.journeyUnits.isNotEmpty()) {
      uiState.journeyUnits
    } else {
      uiState.decks.take(5).mapIndexed { index, deck ->
        com.hangyeol.app.compose.data.LearningJourneyUnit(
          number = index + 1,
          title = deck.title,
          subtitle = deck.subtitle.ifBlank { deck.level },
          progress = (deck.progress / 100f).coerceIn(0f, 1f),
          seal = listOf("若", "時", "過", "傳", "助")[index % 5],
          route = "main/grammar/${deck.id}",
        )
      }
    }
  val toolShortcuts = uiState.shortcuts
  val filteredDecks =
    uiState.decks.filter { deck ->
      val keyword = searchQuery.trim()
      val matchesSearch =
        keyword.isBlank() ||
          deck.title.contains(keyword, ignoreCase = true) ||
          deck.subtitle.contains(keyword, ignoreCase = true) ||
          deck.level.contains(keyword, ignoreCase = true)
      val matchesFilter =
        when (selectedFilter) {
          "ACTIVE" -> deck.progress in 1..99
          "NEW" -> deck.progress <= 0
          else -> true
        }
      matchesSearch && matchesFilter
    }

  LazyColumn(
    modifier =
      Modifier
        .fillMaxSize()
        .background(HangyeolTheme.colorScheme.background)
        .statusBarsPadding(),
    verticalArrangement = Arrangement.spacedBy(0.dp),
    contentPadding = PaddingValues(bottom = 100.dp),
  ) {
    item {
      Column(
        modifier =
          Modifier
            .fillMaxWidth()
            .padding(top = 16.dp, bottom = 20.dp),
      ) {
        Column(modifier = Modifier.padding(horizontal = 22.dp)) {
          Text(
            text = "學 · LEARN",
            style = KSoftSerifLabelStyle(),
            color = HangyeolTheme.extendedColors.crimson,
          )
          Text(
            text = "学习",
            style = HangyeolTheme.typography.headlineMedium.copy(fontSize = 28.sp, lineHeight = 32.sp, fontWeight = FontWeight.ExtraBold),
            color = HangyeolTheme.colorScheme.onSurface,
            modifier = Modifier.padding(top = 4.dp),
          )
          Text(
            text = "系统掌握韩语",
            style = HangyeolTheme.typography.bodySmall.copy(fontSize = 13.sp, lineHeight = 18.sp, fontWeight = FontWeight.Medium),
            color = HangyeolTheme.extendedColors.subtext,
            modifier = Modifier.padding(top = 4.dp),
          )
        }
        LearningTopTabRow(
          activeLabel = "语法",
          onSelectTab = { label -> onNavigateRoute(learningTopTabRoute(label)) },
          modifier = Modifier.padding(top = 14.dp, start = 18.dp, end = 18.dp),
        )
      }
    }
    item {
      Box(modifier = Modifier.padding(horizontal = 18.dp)) {
        currentCourse?.let { course ->
          LearningCurrentCourseCard(
            title = course.title,
            subtitle = course.subtitle,
            progress = course.progress,
            completedHours = course.completedHours,
            totalHours = course.totalHours,
            etaDays = course.etaDays,
            onClick = { onNavigateRoute(resolveRoute(course.route)) },
          )
        } ?: BaselineCard(title = "暂无语法课程", body = "原生语法课程列表为空。")
      }
    }
    item {
      Column(modifier = Modifier.padding(horizontal = 18.dp, vertical = 28.dp)) {
        KSoftSectionHead(kanji = "路", title = "学习旅程", action = "全部")
        Spacer(modifier = Modifier.height(12.dp))
        JourneyTimeline(items = journeyUnits, onNavigateRoute = onNavigateRoute)
      }
    }
    item {
      Column(modifier = Modifier.padding(horizontal = 18.dp, vertical = 0.dp)) {
        KSoftSectionHead(kanji = "具", title = "学习工具")
        Spacer(modifier = Modifier.height(12.dp))
        if (toolShortcuts.isEmpty()) {
          BaselineCard(title = "暂无学习工具数据", body = "学习工具将随服务端数据同步后展示。")
        } else {
          val shortcutRows = toolShortcuts.chunked(2)
          shortcutRows.forEachIndexed { rowIndex, rowItems ->
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
              rowItems.forEach { shortcut ->
                GrammarHubToolCard(
                  modifier = Modifier.weight(1f),
                  shortcut = shortcut,
                  onClick = { onNavigateRoute(resolveRoute(shortcut.route)) },
                )
              }
            }
            if (rowIndex != shortcutRows.lastIndex) {
              Spacer(modifier = Modifier.height(10.dp))
            }
          }
        }
      }
    }
    item {
      Column(modifier = Modifier.padding(horizontal = 20.dp, vertical = 28.dp)) {
        KSoftInputField(
          value = searchQuery,
          onValueChange = { searchQuery = it },
          placeholder = "搜索语法课程 / 教材 / 级别",
        )
        Row(
          modifier = Modifier.padding(top = 10.dp),
          horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
          listOf(
            "ALL" to "全部",
            "ACTIVE" to "学习中",
            "NEW" to "待开始",
          ).forEach { (key, label) ->
            val active = selectedFilter == key
            Surface(
              modifier = Modifier.clickable { selectedFilter = key },
              color = if (active) HangyeolTheme.colorScheme.onSurface else HangyeolTheme.colorScheme.surface,
              shape = RoundedCornerShape(999.dp),
              border = BorderStroke(1.dp, if (active) HangyeolTheme.colorScheme.onSurface else HangyeolTheme.extendedColors.lineSoft),
            ) {
              Text(
                text = label,
                style = HangyeolTheme.typography.bodySmall.copy(fontSize = 12.sp, lineHeight = 16.sp, fontWeight = FontWeight.SemiBold),
                color = if (active) HangyeolTheme.colorScheme.surface else HangyeolTheme.colorScheme.onSurface,
                modifier = Modifier.padding(horizontal = 12.dp, vertical = 7.dp),
              )
            }
          }
        }
        Row(
          modifier = Modifier.fillMaxWidth().padding(top = 14.dp),
          horizontalArrangement = Arrangement.SpaceBetween,
          verticalAlignment = androidx.compose.ui.Alignment.CenterVertically,
        ) {
          Text(
            text = "语法课程",
            style = HangyeolTheme.typography.titleMedium.copy(fontSize = 20.sp, lineHeight = 24.sp, fontWeight = FontWeight.ExtraBold),
            color = HangyeolTheme.colorScheme.onSurface,
          )
          Text(
            text = "${filteredDecks.size} 个结果",
            style = HangyeolTheme.typography.bodySmall.copy(fontSize = 12.sp, lineHeight = 16.sp, fontWeight = FontWeight.Medium),
            color = HangyeolTheme.extendedColors.subtext,
          )
        }
      }
    }
    if (uiState.isLoading) {
      item {
        Box(modifier = Modifier.padding(horizontal = 20.dp)) {
          BaselineCard(title = "正在加载语法课程", body = "正在读取课程列表。")
        }
      }
    } else if (filteredDecks.isEmpty()) {
      item {
        Box(modifier = Modifier.padding(horizontal = 20.dp)) {
          BaselineCard(title = "没有匹配的语法课程", body = "搜索结果为空。")
        }
      }
    } else {
      items(filteredDecks.size) { index ->
        val deck = filteredDecks[index]
        Box(modifier = Modifier.padding(horizontal = 20.dp, vertical = if (index == 0) 0.dp else 12.dp)) {
          GrammarDeckCard(
            deck = deck,
            accentIndex = index,
            onClick = { onNavigateRoute(resolveRoute("main/grammar/${deck.id}")) },
          )
        }
      }
    }
  }
}

@Composable
private fun GrammarModuleScreen(
  deckId: String,
  onBack: () -> Unit,
  onNavigateRoute: (String) -> Unit,
) {
  val viewModel: GrammarModuleViewModel =
    viewModel(factory = GrammarModuleViewModel.factory(ComposeServiceLocator.learningRepository, deckId))
  val uiState by viewModel.uiState.collectAsStateWithLifecycle()
  var redEyeEnabled by rememberSaveable(deckId) { mutableStateOf(false) }
  val featuredPoint = uiState.points.firstOrNull()
  val displayExplanation =
    grammarMarkdownToDisplay(
      featuredPoint?.explanation?.takeIf { it.isNotBlank() }
        ?: featuredPoint?.summary.orEmpty(),
    )
  val explanationSections = grammarExplanationSections(displayExplanation)
  val displayRules = featuredPoint?.rules.orEmpty().take(6)
  val displayExamples =
    (featuredPoint?.examples?.takeIf { it.isNotEmpty() }
      ?: uiState.points
        .mapNotNull { point ->
          val sentence = point.title.trim()
          val translation = point.summary.trim()
          if (sentence.isBlank() && translation.isBlank()) {
            null
          } else {
            com.hangyeol.app.compose.data.GrammarExampleUiModel(
              korean = sentence,
              translation = translation,
            )
          }
        }
        .take(8))
  val displayQuizzes = featuredPoint?.quizzes.orEmpty().take(4)
  val scope = rememberCoroutineScope()
  var aiSentence by rememberSaveable(deckId) { mutableStateOf("") }
  var aiChecking by rememberSaveable(deckId) { mutableStateOf(false) }
  var aiResultMessage by rememberSaveable(deckId) { mutableStateOf("") }
  var aiCorrectedSentence by rememberSaveable(deckId) { mutableStateOf("") }
  var revealedExplanationSections by rememberSaveable(deckId) { mutableStateOf<List<Int>>(emptyList()) }

  LazyColumn(
    modifier =
      Modifier
        .fillMaxSize()
        .background(HangyeolTheme.colorScheme.background)
        .statusBarsPadding(),
    verticalArrangement = Arrangement.spacedBy(12.dp),
    contentPadding = PaddingValues(bottom = HangyeolTheme.spacing.xl),
  ) {
    item {
      Column(
        modifier =
          Modifier
            .fillMaxWidth()
            .background(HangyeolTheme.extendedColors.surfaceMuted)
            .padding(horizontal = 22.dp, vertical = 14.dp),
      ) {
        Row(
          modifier = Modifier.fillMaxWidth(),
          horizontalArrangement = Arrangement.spacedBy(10.dp),
          verticalAlignment = androidx.compose.ui.Alignment.CenterVertically,
        ) {
          Surface(
            modifier = Modifier.size(36.dp).clickable { onBack() },
            color = HangyeolTheme.colorScheme.surface,
            shape = RoundedCornerShape(18.dp),
            border = BorderStroke(1.dp, HangyeolTheme.extendedColors.lineSoft),
            shadowElevation = 2.dp,
          ) {
            Box(contentAlignment = androidx.compose.ui.Alignment.Center) {
              Text(
                text = "←",
                style = HangyeolTheme.typography.titleMedium.copy(fontSize = 16.sp, lineHeight = 16.sp, fontWeight = FontWeight.ExtraBold),
                color = HangyeolTheme.colorScheme.onSurface,
              )
            }
          }
          Text(
            text = "${uiState.deckTitle} · ${uiState.masteredCount}/${uiState.totalCount}",
            style = HangyeolTheme.typography.labelSmall.copy(fontSize = 11.sp, lineHeight = 13.sp, fontWeight = FontWeight.Bold),
            color = HangyeolTheme.extendedColors.subtext,
            modifier = Modifier.weight(1f),
          )
          Surface(
            modifier = Modifier.size(36.dp).clickable { redEyeEnabled = !redEyeEnabled },
            color = HangyeolTheme.colorScheme.surface,
            shape = RoundedCornerShape(18.dp),
            border = BorderStroke(1.dp, HangyeolTheme.extendedColors.lineSoft),
            shadowElevation = 2.dp,
          ) {
            Box(contentAlignment = androidx.compose.ui.Alignment.Center) {
              Text(
                text = if (redEyeEnabled) "紅" else "眼",
                style = HangyeolTheme.typography.bodySmall.copy(fontSize = 14.sp, lineHeight = 14.sp, fontWeight = FontWeight.Bold),
                color = HangyeolTheme.colorScheme.onSurface,
              )
            }
          }
        }
      }
    }
    item {
      Surface(
        modifier = Modifier.padding(horizontal = 22.dp),
        color = HangyeolTheme.colorScheme.surface,
        shape = RoundedCornerShape(28.dp),
        border = BorderStroke(1.dp, HangyeolTheme.extendedColors.lineSoft),
        shadowElevation = 4.dp,
      ) {
        Box(
          modifier =
            Modifier
              .background(
                Brush.linearGradient(
                  colors =
                    listOf(
                      HangyeolTheme.extendedColors.tintMint.copy(alpha = 0.9f),
                      HangyeolTheme.colorScheme.surface,
                    ),
                ),
              )
              .padding(horizontal = 20.dp, vertical = 22.dp),
        ) {
          Row(horizontalArrangement = Arrangement.spacedBy(16.dp), verticalAlignment = androidx.compose.ui.Alignment.Top) {
            KSoftHanjaSeal(
              c = uiState.deckTitle.take(1).ifBlank { "文" },
              size = 56,
              round = 14,
              bg = HangyeolTheme.extendedColors.jade,
            )
            Column(modifier = Modifier.weight(1f)) {
              KSoftChip(text = "문법 · GRAMMAR", tone = "mint", size = "sm")
              Text(
                text = uiState.deckTitle,
                style = HangyeolTheme.typography.headlineLarge.copy(fontSize = 34.sp, lineHeight = 34.sp, fontWeight = FontWeight.ExtraBold),
                color = HangyeolTheme.colorScheme.onSurface,
                modifier = Modifier.padding(top = 8.dp),
              )
              Text(
                text = uiState.deckLevel.ifBlank { "课程语法模块" },
                style = HangyeolTheme.typography.bodySmall.copy(fontSize = 13.sp, lineHeight = 18.sp, fontWeight = FontWeight.SemiBold),
                color = HangyeolTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(top = 8.dp),
              )
            }
          }
        }
      }
    }
    item {
      Surface(
        modifier = Modifier.padding(horizontal = 22.dp),
        color = HangyeolTheme.colorScheme.surface,
        shape = RoundedCornerShape(22.dp),
        border = BorderStroke(1.dp, HangyeolTheme.extendedColors.lineSoft),
        shadowElevation = 3.dp,
      ) {
        Column(modifier = Modifier.padding(20.dp)) {
          Text(
            text = "解 · EXPLANATION",
            style = KSoftSerifLabelStyle(),
            color = HangyeolTheme.extendedColors.crimson,
          )
          Text(
            text = if (redEyeEnabled) "红眼模式已开启：点击段落逐段揭示说明内容。" else "按段阅读说明内容。",
            style = HangyeolTheme.typography.bodySmall.copy(fontSize = 12.sp, lineHeight = 18.sp, fontWeight = FontWeight.Medium),
            color = HangyeolTheme.extendedColors.subtext,
            modifier = Modifier.padding(top = 8.dp),
          )
          if (explanationSections.isEmpty()) {
            Text(
              text = "暂无语法说明，请在后台补充 explanation 内容。",
              style = HangyeolTheme.typography.bodyMedium.copy(fontSize = 15.sp, lineHeight = 24.sp, fontWeight = FontWeight.Medium),
              color = HangyeolTheme.colorScheme.onSurface,
              modifier = Modifier.padding(top = 8.dp),
            )
          } else {
            Column(modifier = Modifier.padding(top = 10.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
              explanationSections.forEachIndexed { sectionIndex, section ->
                val isRevealed = !redEyeEnabled || revealedExplanationSections.contains(sectionIndex)
                val sectionTitle = section.title.takeIf { it.isNotBlank() }
                Surface(
                  color = HangyeolTheme.extendedColors.surfaceMuted,
                  shape = RoundedCornerShape(12.dp),
                  border = BorderStroke(1.dp, HangyeolTheme.extendedColors.lineSoft),
                  modifier =
                    Modifier
                      .fillMaxWidth()
                      .clickable(enabled = redEyeEnabled) {
                        if (revealedExplanationSections.contains(sectionIndex)) {
                          revealedExplanationSections =
                            revealedExplanationSections.filter { it != sectionIndex }
                        } else {
                          revealedExplanationSections = revealedExplanationSections + sectionIndex
                        }
                      },
                ) {
                  Column(modifier = Modifier.padding(horizontal = 12.dp, vertical = 10.dp)) {
                    if (sectionTitle != null) {
                      Text(
                        text = sectionTitle,
                        style = HangyeolTheme.typography.labelSmall.copy(fontSize = 11.sp, lineHeight = 14.sp, fontWeight = FontWeight.ExtraBold),
                        color = HangyeolTheme.extendedColors.crimson,
                      )
                    }
                    Text(
                      text =
                        if (isRevealed) {
                          section.body
                        } else {
                          "•••••••• •••••••• ••••••••"
                        },
                      style = HangyeolTheme.typography.bodySmall.copy(fontSize = 13.sp, lineHeight = 21.sp, fontWeight = FontWeight.Medium),
                      color = HangyeolTheme.colorScheme.onSurface,
                      modifier = Modifier.padding(top = if (sectionTitle != null) 4.dp else 0.dp),
                    )
                  }
                }
              }
            }
          }
          if (displayRules.isNotEmpty()) {
            Column(
              modifier =
                Modifier
                  .fillMaxWidth()
                  .padding(top = 16.dp)
                  .background(HangyeolTheme.extendedColors.surfaceMuted, RoundedCornerShape(12.dp))
                  .padding(horizontal = 14.dp, vertical = 12.dp),
              verticalArrangement = Arrangement.spacedBy(8.dp),
            ) {
              displayRules.forEach { rule ->
                Text(
                  text = "${rule.first}: ${rule.second}",
                  style = HangyeolTheme.typography.bodySmall.copy(fontSize = 12.sp, lineHeight = 16.sp, fontWeight = FontWeight.Medium),
                  color = HangyeolTheme.colorScheme.onSurface,
                )
              }
            }
          }
        }
      }
    }
    item {
      Surface(
        modifier = Modifier.padding(horizontal = 22.dp),
        color = HangyeolTheme.colorScheme.surface,
        shape = RoundedCornerShape(22.dp),
        border = BorderStroke(1.dp, HangyeolTheme.extendedColors.lineSoft),
        shadowElevation = 3.dp,
      ) {
        Column {
          Row(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 14.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = androidx.compose.ui.Alignment.CenterVertically,
          ) {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = androidx.compose.ui.Alignment.Bottom) {
              Text(
                text = "例",
                style = HangyeolTheme.typography.bodyMedium.copy(fontFamily = FontFamily.Serif, fontSize = 13.sp, lineHeight = 13.sp, fontWeight = FontWeight.Medium),
                color = HangyeolTheme.extendedColors.crimson,
              )
              Text(
                text = "例句 · ${displayExamples.size}",
                style = HangyeolTheme.typography.bodySmall.copy(fontSize = 12.sp, lineHeight = 14.sp, fontWeight = FontWeight.ExtraBold),
                color = HangyeolTheme.colorScheme.onSurface,
              )
            }
            Text(
              text = "🔊 모두 收听",
              style = HangyeolTheme.typography.labelSmall.copy(fontSize = 11.sp, lineHeight = 12.sp, fontWeight = FontWeight.Bold),
              color = HangyeolTheme.extendedColors.subtext,
            )
          }
          HorizontalDivider(color = HangyeolTheme.extendedColors.lineSoft)
          if (displayExamples.isEmpty()) {
            Box(modifier = Modifier.padding(horizontal = 20.dp, vertical = 16.dp)) {
              Text(
                text = "暂无例句，补充 grammar.examples 后会在此展示。",
                style = HangyeolTheme.typography.bodySmall.copy(fontSize = 12.sp, lineHeight = 18.sp, fontWeight = FontWeight.Medium),
                color = HangyeolTheme.extendedColors.subtext,
              )
            }
          }
          displayExamples.forEachIndexed { index, example ->
            Column(modifier = Modifier.padding(horizontal = 20.dp, vertical = 14.dp)) {
              Text(
                text = example.korean.ifBlank { "—" },
                style = HangyeolTheme.typography.bodyMedium.copy(fontSize = 15.sp, lineHeight = 24.sp, fontWeight = FontWeight.SemiBold),
                color = HangyeolTheme.colorScheme.onSurface,
              )
              Text(
                text = if (redEyeEnabled) "••••••••" else example.translation.ifBlank { "—" },
                style = HangyeolTheme.typography.bodySmall.copy(fontSize = 12.sp, lineHeight = 18.sp, fontWeight = FontWeight.Medium),
                color = HangyeolTheme.extendedColors.subtext,
                modifier = Modifier.padding(top = 4.dp),
              )
            }
            if (index != displayExamples.lastIndex) {
              HorizontalDivider(color = HangyeolTheme.extendedColors.lineSoft)
            }
          }
        }
      }
    }
    if (displayQuizzes.isNotEmpty()) {
      item {
        Surface(
          modifier = Modifier.padding(horizontal = 22.dp),
          color = HangyeolTheme.colorScheme.surface,
          shape = RoundedCornerShape(22.dp),
          border = BorderStroke(1.dp, HangyeolTheme.extendedColors.lineSoft),
          shadowElevation = 3.dp,
        ) {
          Column {
            Row(
              modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 14.dp),
              horizontalArrangement = Arrangement.SpaceBetween,
              verticalAlignment = androidx.compose.ui.Alignment.CenterVertically,
            ) {
              Text(
                text = "測 · QUIZ ${displayQuizzes.size}",
                style = HangyeolTheme.typography.bodySmall.copy(fontSize = 12.sp, lineHeight = 14.sp, fontWeight = FontWeight.ExtraBold),
                color = HangyeolTheme.colorScheme.onSurface,
              )
              KSoftChip(text = if (redEyeEnabled) "红眼已开" else "红眼已关", tone = "muted", size = "sm")
            }
            HorizontalDivider(color = HangyeolTheme.extendedColors.lineSoft)
            displayQuizzes.forEachIndexed { index, quiz ->
              Column(modifier = Modifier.padding(horizontal = 20.dp, vertical = 14.dp)) {
                Text(
                  text = quiz.prompt.ifBlank { "—" },
                  style = HangyeolTheme.typography.bodyMedium.copy(fontSize = 14.sp, lineHeight = 21.sp, fontWeight = FontWeight.SemiBold),
                  color = HangyeolTheme.colorScheme.onSurface,
                )
                Text(
                  text = if (redEyeEnabled) "••••••••" else quiz.answer.ifBlank { "—" },
                  style = HangyeolTheme.typography.bodySmall.copy(fontSize = 12.sp, lineHeight = 18.sp, fontWeight = FontWeight.Medium),
                  color = HangyeolTheme.extendedColors.subtext,
                  modifier = Modifier.padding(top = 4.dp),
                )
              }
              if (index != displayQuizzes.lastIndex) {
                HorizontalDivider(color = HangyeolTheme.extendedColors.lineSoft)
              }
            }
          }
        }
      }
    }
    item {
      Surface(
        modifier = Modifier.padding(horizontal = 22.dp),
        color = HangyeolTheme.colorScheme.surface,
        shape = RoundedCornerShape(22.dp),
        border = BorderStroke(1.dp, HangyeolTheme.extendedColors.lineSoft),
        shadowElevation = 3.dp,
      ) {
        Column(modifier = Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
          Text(
            text = "AI · 语法评估",
            style = KSoftSerifLabelStyle(),
            color = HangyeolTheme.extendedColors.crimson,
          )
          ComposeInputField(
            value = aiSentence,
            onValueChange = { aiSentence = it },
            label = "输入你的句子",
            placeholder = "例如：내일 비가 오면 집에 있을 거예요.",
          )
          KSoftPrimaryButton(
            text = if (aiChecking) "AI 分析中..." else "分析句子",
            onClick = {
              if (aiChecking) return@KSoftPrimaryButton
              scope.launch {
                aiChecking = true
                val result = ComposeServiceLocator.learningRepository.analyzeGrammarSentence(
                  sentence = aiSentence,
                  context = featuredPoint?.title ?: uiState.deckTitle,
                  language = "zh",
                )
                aiChecking = false
                aiResultMessage =
                  when {
                    !result.success -> result.errorMessage ?: "分析失败，请稍后重试"
                    result.feedback.isNotBlank() -> result.feedback
                    result.isCorrect -> "句子表达正确。"
                    else -> "建议继续调整语法后重试。"
                  }
                aiCorrectedSentence = result.correctedSentence
              }
            },
            enabled = !aiChecking,
            modifier = Modifier.fillMaxWidth(),
          )
          if (aiResultMessage.isNotBlank()) {
            Text(
              text = aiResultMessage,
              style = HangyeolTheme.typography.bodySmall.copy(fontSize = 12.sp, lineHeight = 18.sp, fontWeight = FontWeight.Medium),
              color = HangyeolTheme.colorScheme.onSurface,
            )
          }
          if (aiCorrectedSentence.isNotBlank()) {
            Text(
              text = "改写建议：$aiCorrectedSentence",
              style = HangyeolTheme.typography.bodySmall.copy(fontSize = 12.sp, lineHeight = 18.sp, fontWeight = FontWeight.SemiBold),
              color = HangyeolTheme.extendedColors.subtext,
            )
          }
        }
      }
    }
    if (uiState.isLoading) {
      item {
        Box(modifier = Modifier.padding(horizontal = 22.dp)) {
          BaselineCard(title = "正在加载语法内容", body = "语法点与掌握状态正由 Android 原生状态流注入。")
        }
      }
    }
    item {
      KSoftPrimaryButton(
        text = "연습 试题 풀기",
        onClick = { onNavigateRoute(resolveRoute("main/grammar/$deckId/practice")) },
        modifier = Modifier.padding(horizontal = 22.dp).fillMaxWidth(),
        enabled = !uiState.isLoading,
      )
    }
  }
}

@Composable
private fun GrammarPracticeScreen(
  deckId: String,
  onBack: () -> Unit,
  onNavigateRoute: (String) -> Unit,
) {
  val viewModel: GrammarModuleViewModel =
    viewModel(factory = GrammarModuleViewModel.factory(ComposeServiceLocator.learningRepository, deckId))
  val uiState by viewModel.uiState.collectAsStateWithLifecycle()
  val scope = rememberCoroutineScope()
  var answers by rememberSaveable(deckId) { mutableStateOf<Map<String, String>>(emptyMap()) }
  var submitInProgress by rememberSaveable(deckId) { mutableStateOf(false) }
  var submitSummary by rememberSaveable(deckId) { mutableStateOf("") }
  val quizRows =
    uiState.points.flatMap { point ->
      point.quizzes.mapIndexed { index, quiz ->
        GrammarPracticeQuizRow(
          key = "${point.id}::$index",
          grammarId = point.id,
          title = point.title,
          prompt = quiz.prompt,
          answer = quiz.answer,
        )
      }
    }.filter { row -> row.prompt.isNotBlank() || row.answer.isNotBlank() }

  LazyColumn(
    modifier =
      Modifier
        .fillMaxSize()
        .background(HangyeolTheme.colorScheme.background)
        .statusBarsPadding(),
    verticalArrangement = Arrangement.spacedBy(12.dp),
    contentPadding = PaddingValues(bottom = HangyeolTheme.spacing.xl),
  ) {
    item {
      Column(
        modifier =
          Modifier
            .fillMaxWidth()
            .padding(horizontal = 22.dp, vertical = 14.dp),
      ) {
        Surface(
          modifier = Modifier.size(36.dp).clickable { onBack() },
          color = HangyeolTheme.colorScheme.surface,
          shape = RoundedCornerShape(18.dp),
          border = BorderStroke(1.dp, HangyeolTheme.extendedColors.lineSoft),
          shadowElevation = 2.dp,
        ) {
          Box(contentAlignment = androidx.compose.ui.Alignment.Center) {
            Text(
              text = "←",
              style = HangyeolTheme.typography.titleMedium.copy(fontSize = 16.sp, lineHeight = 16.sp, fontWeight = FontWeight.ExtraBold),
              color = HangyeolTheme.colorScheme.onSurface,
            )
          }
        }
        Text(
          text = "練 · PRACTICE",
          style = KSoftSerifLabelStyle(),
          color = HangyeolTheme.extendedColors.crimson,
          modifier = Modifier.padding(top = 14.dp),
        )
        Text(
          text = "${uiState.deckTitle.ifBlank { "语法练习" }}",
          style = HangyeolTheme.typography.headlineMedium.copy(fontSize = 28.sp, lineHeight = 32.sp, fontWeight = FontWeight.ExtraBold),
          color = HangyeolTheme.colorScheme.onSurface,
          modifier = Modifier.padding(top = 4.dp),
        )
        Text(
          text = "共 ${uiState.totalCount} 题 · 已掌握 ${uiState.masteredCount} 题",
          style = HangyeolTheme.typography.bodySmall.copy(fontSize = 13.sp, lineHeight = 18.sp, fontWeight = FontWeight.Medium),
          color = HangyeolTheme.extendedColors.subtext,
          modifier = Modifier.padding(top = 4.dp),
        )
      }
    }
    if (uiState.isLoading) {
      item {
        Box(modifier = Modifier.padding(horizontal = 22.dp)) {
          BaselineCard(title = "正在加载语法练习", body = "语法题目数据正在同步。")
        }
      }
    } else if (quizRows.isEmpty()) {
      item {
        Box(modifier = Modifier.padding(horizontal = 22.dp)) {
          BaselineCard(
            title = "暂无可作答测验",
            body = "请先在后台补充 grammar.quizItems，或返回模块页查看例句与规则。",
          )
        }
      }
    } else {
      items(quizRows.size) { index ->
        val row = quizRows[index]
        Surface(
          modifier = Modifier.padding(horizontal = 22.dp),
          color = HangyeolTheme.colorScheme.surface,
          shape = RoundedCornerShape(20.dp),
          border = BorderStroke(1.dp, HangyeolTheme.extendedColors.lineSoft),
          shadowElevation = 2.dp,
        ) {
          Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Text(
              text = "Q${index + 1} · ${row.title.ifBlank { "语法题" }}",
              style = HangyeolTheme.typography.bodySmall.copy(fontSize = 12.sp, lineHeight = 16.sp, fontWeight = FontWeight.ExtraBold),
              color = HangyeolTheme.extendedColors.subtext,
            )
            Text(
              text = row.prompt.ifBlank { "请根据语法点写出正确答案。" },
              style = HangyeolTheme.typography.bodyMedium.copy(fontSize = 14.sp, lineHeight = 20.sp, fontWeight = FontWeight.SemiBold),
              color = HangyeolTheme.colorScheme.onSurface,
            )
            ComposeInputField(
              value = answers[row.key].orEmpty(),
              onValueChange = { updated ->
                answers = answers.toMutableMap().apply { put(row.key, updated) }
              },
              label = "你的答案",
              placeholder = "输入答案",
            )
            if (submitSummary.isNotBlank()) {
              val userAnswer = answers[row.key].orEmpty().trim()
              val showCorrect =
                userAnswer.isNotBlank() && !grammarPracticeAnswerMatch(userAnswer, row.answer)
              if (showCorrect && row.answer.isNotBlank()) {
                Text(
                  text = "参考答案：${row.answer}",
                  style = HangyeolTheme.typography.bodySmall.copy(fontSize = 11.sp, lineHeight = 16.sp, fontWeight = FontWeight.Medium),
                  color = HangyeolTheme.extendedColors.subtext,
                )
              }
            }
          }
        }
      }
      item {
        KSoftPrimaryButton(
          text = if (submitInProgress) "提交中..." else "提交判分并同步进度",
          onClick = {
            if (submitInProgress) return@KSoftPrimaryButton
            scope.launch {
              submitInProgress = true
              val graded =
                quizRows.map { row ->
                  val userAnswer = answers[row.key].orEmpty()
                  GrammarPracticeGradedRow(
                    grammarId = row.grammarId,
                    isCorrect = grammarPracticeAnswerMatch(userAnswer, row.answer),
                  )
                }
              val total = graded.size
              val correctCount = graded.count { it.isCorrect }
              val groups = graded.groupBy { it.grammarId }
              var syncedCount = 0
              groups.forEach { (grammarId, rows) ->
                val ratio = rows.count { it.isCorrect }.toFloat() / rows.size.toFloat()
                val increment =
                  when {
                    ratio >= 0.999f -> 18
                    ratio >= 0.7f -> 10
                    ratio > 0f -> 4
                    else -> 0
                  }
                val targetStatus =
                  when {
                    ratio >= 0.999f -> "MASTERED"
                    ratio > 0f -> "LEARNING"
                    else -> null
                  }
                val result =
                  ComposeServiceLocator.learningRepository.updateGrammarStatus(
                    grammarId = grammarId,
                    status = targetStatus,
                    increment = increment,
                  )
                if (result.success) {
                  syncedCount += 1
                }
              }
              val percent = if (total > 0) (correctCount * 100 / total) else 0
              submitSummary = "得分 $correctCount/$total（$percent%） · 已同步 $syncedCount/${groups.size} 个语法点"
              submitInProgress = false
              viewModel.refresh()
            }
          },
          modifier = Modifier.padding(horizontal = 22.dp).fillMaxWidth(),
          enabled = !submitInProgress && quizRows.isNotEmpty(),
        )
      }
      if (submitSummary.isNotBlank()) {
        item {
          Surface(
            modifier = Modifier.padding(horizontal = 22.dp),
            color = HangyeolTheme.colorScheme.surface,
            shape = RoundedCornerShape(16.dp),
            border = BorderStroke(1.dp, HangyeolTheme.extendedColors.lineSoft),
          ) {
            Text(
              text = submitSummary,
              style = HangyeolTheme.typography.bodySmall.copy(fontSize = 12.sp, lineHeight = 18.sp, fontWeight = FontWeight.Medium),
              color = HangyeolTheme.colorScheme.onSurface,
              modifier = Modifier.padding(horizontal = 14.dp, vertical = 12.dp),
            )
          }
        }
      }
    }
    item {
      KSoftPrimaryButton(
        text = "返回语法模块",
        onClick = { onNavigateRoute(resolveRoute("main/grammar/$deckId")) },
        modifier = Modifier.padding(horizontal = 22.dp).fillMaxWidth(),
      )
    }
  }
}

@Composable
private fun ReviewHubScreen(
  onBack: () -> Unit,
  onNavigateRoute: (String) -> Unit,
) {
  val viewModel: ReviewHubViewModel =
    viewModel(factory = ReviewHubViewModel.factory(ComposeServiceLocator.learningRepository))
  val uiState by viewModel.uiState.collectAsStateWithLifecycle()

  LazyColumn(
    modifier =
      Modifier
        .fillMaxSize()
        .background(HangyeolTheme.colorScheme.background)
        .statusBarsPadding(),
    verticalArrangement = Arrangement.spacedBy(14.dp),
    contentPadding = PaddingValues(bottom = HangyeolTheme.spacing.xl),
  ) {
    item {
      Column(
        modifier =
          Modifier
            .fillMaxWidth()
            .background(
              Brush.verticalGradient(
                colors =
                  listOf(
                    HangyeolTheme.extendedColors.tintMint,
                    HangyeolTheme.colorScheme.background,
                  ),
              ),
            )
            .padding(horizontal = 22.dp, vertical = 14.dp),
      ) {
        Surface(
          modifier = Modifier.size(36.dp).clickable { onBack() },
          color = HangyeolTheme.colorScheme.surface,
          shape = RoundedCornerShape(18.dp),
          border = BorderStroke(1.dp, HangyeolTheme.extendedColors.lineSoft),
          shadowElevation = 2.dp,
        ) {
          Box(contentAlignment = androidx.compose.ui.Alignment.Center) {
            Text(
              text = "←",
              style = HangyeolTheme.typography.titleMedium.copy(fontSize = 16.sp, lineHeight = 16.sp, fontWeight = FontWeight.ExtraBold),
              color = HangyeolTheme.colorScheme.onSurface,
            )
          }
        }
        Text(
          text = "復 · REVIEW",
          style = KSoftSerifLabelStyle(),
          color = HangyeolTheme.extendedColors.crimson,
          modifier = Modifier.padding(top = 14.dp),
        )
        Text(
          text = "复习中心",
          style = HangyeolTheme.typography.headlineMedium.copy(fontSize = 28.sp, lineHeight = 32.sp, fontWeight = FontWeight.ExtraBold),
          color = HangyeolTheme.colorScheme.onSurface,
          modifier = Modifier.padding(top = 4.dp),
        )
        Text(
          text = "待复习 ${uiState.pendingCount} · 今日掌握 ${uiState.masteredToday} · 正确率 ${uiState.accuracy}%",
          style = HangyeolTheme.typography.bodySmall.copy(fontSize = 13.sp, lineHeight = 18.sp, fontWeight = FontWeight.Medium),
          color = HangyeolTheme.extendedColors.subtext,
          modifier = Modifier.padding(top = 4.dp),
        )
        Surface(
          modifier = Modifier.fillMaxWidth().padding(top = 18.dp),
          color = HangyeolTheme.colorScheme.surface,
          shape = RoundedCornerShape(20.dp),
          border = BorderStroke(1.dp, HangyeolTheme.extendedColors.lineSoft),
          shadowElevation = 3.dp,
        ) {
          Column(modifier = Modifier.padding(16.dp)) {
            Text(
              text = "当前复习指标",
              style = HangyeolTheme.typography.bodySmall.copy(fontSize = 12.sp, lineHeight = 14.sp, fontWeight = FontWeight.ExtraBold),
              color = HangyeolTheme.colorScheme.onSurface,
            )
            Row(
              modifier = Modifier.fillMaxWidth().padding(top = 10.dp),
              horizontalArrangement = Arrangement.spacedBy(6.dp),
              verticalAlignment = androidx.compose.ui.Alignment.CenterVertically,
            ) {
              listOf(
                Triple("待复习", uiState.pendingCount.toString(), HangyeolTheme.extendedColors.tintButter),
                Triple("已掌握", uiState.masteredToday.toString(), HangyeolTheme.extendedColors.tintMint),
                Triple("正确率", "${uiState.accuracy}%", HangyeolTheme.extendedColors.tintLilac),
              ).forEach { metric ->
                Column(
                  modifier = Modifier.weight(1f),
                  horizontalAlignment = androidx.compose.ui.Alignment.CenterHorizontally,
                  verticalArrangement = Arrangement.Center,
                ) {
                  Text(
                    text = metric.first,
                    style = HangyeolTheme.typography.labelSmall.copy(fontSize = 10.sp, lineHeight = 12.sp, fontWeight = FontWeight.Bold),
                    color = HangyeolTheme.extendedColors.subtext,
                  )
                  Surface(
                    modifier = Modifier.fillMaxWidth().padding(top = 6.dp),
                    color = metric.third,
                    shape = RoundedCornerShape(10.dp),
                    border = BorderStroke(1.dp, HangyeolTheme.extendedColors.lineSoft),
                  ) {
                    Text(
                      text = metric.second,
                      style = HangyeolTheme.typography.bodySmall.copy(fontSize = 12.sp, lineHeight = 14.sp, fontWeight = FontWeight.ExtraBold),
                      color = HangyeolTheme.colorScheme.onSurface,
                      modifier = Modifier.padding(horizontal = 10.dp, vertical = 8.dp),
                    )
                  }
                }
              }
            }
          }
        }
      }
    }
    if (uiState.isLoading) {
      item {
        Box(modifier = Modifier.padding(horizontal = 18.dp)) {
          BaselineCard(title = "正在加载复习中心", body = "复习队列与历史数据正从 Android 原生 Repository 注入。")
        }
      }
    }
    items(uiState.sessions.size) { index ->
      val session = uiState.sessions[index]
      ReviewSessionCard(
        modifier = Modifier.padding(horizontal = 18.dp),
        seal =
          when (index) {
            0 -> "詞"
            1 -> "法"
            2 -> "試"
            else -> "聽"
          },
        title = session.title,
        meta = session.countLabel,
        tone =
          when (index) {
            0 -> HangyeolTheme.extendedColors.crimson
            1 -> HangyeolTheme.extendedColors.jade
            2 -> HangyeolTheme.extendedColors.gold
            else -> HangyeolTheme.extendedColors.indigo
          },
        onClick = { onNavigateRoute(resolveRoute(session.route)) },
      )
    }
  }
}

@Composable
private fun ReviewSessionCard(
  modifier: Modifier = Modifier,
  seal: String,
  title: String,
  meta: String,
  tone: Color,
  onClick: () -> Unit,
) {
  Surface(
    modifier = modifier.fillMaxWidth().clickable { onClick() },
    color = HangyeolTheme.colorScheme.surface,
    shape = RoundedCornerShape(22.dp),
    border = BorderStroke(1.dp, HangyeolTheme.extendedColors.lineSoft),
    shadowElevation = 3.dp,
  ) {
    Row(
      modifier = Modifier.padding(horizontal = 18.dp, vertical = 18.dp),
      horizontalArrangement = Arrangement.spacedBy(14.dp),
      verticalAlignment = androidx.compose.ui.Alignment.CenterVertically,
    ) {
      KSoftHanjaSeal(
        c = seal,
        size = 48,
        round = 12,
        bg = tone,
      )
      Column(modifier = Modifier.weight(1f)) {
        Text(
          text = title,
          style = HangyeolTheme.typography.bodyMedium.copy(fontSize = 15.sp, lineHeight = 18.sp, fontWeight = FontWeight.ExtraBold),
          color = HangyeolTheme.colorScheme.onSurface,
        )
        Text(
          text = meta,
          style = HangyeolTheme.typography.bodySmall.copy(fontSize = 12.sp, lineHeight = 16.sp, fontWeight = FontWeight.SemiBold),
          color = HangyeolTheme.extendedColors.subtext,
          modifier = Modifier.padding(top = 3.dp),
        )
      }
      Surface(
        modifier = Modifier.size(34.dp),
        color = HangyeolTheme.colorScheme.primary,
        shape = RoundedCornerShape(17.dp),
      ) {
        Box(contentAlignment = androidx.compose.ui.Alignment.Center) {
          Text(
            text = "→",
            style = HangyeolTheme.typography.bodySmall.copy(fontSize = 14.sp, lineHeight = 14.sp, fontWeight = FontWeight.Bold),
            color = HangyeolTheme.colorScheme.onPrimary,
          )
        }
      }
    }
  }
}

@Composable
private fun TopikHubScreen(
  onBack: () -> Unit,
  onNavigateRoute: (String) -> Unit,
) {
  val viewModel: TopikCenterViewModel =
    viewModel(factory = TopikCenterViewModel.factory(ComposeServiceLocator.learningRepository))
  val uiState by viewModel.uiState.collectAsStateWithLifecycle()
  val bestScore = uiState.data.history.maxOfOrNull { it.score } ?: 0
  val unlockedCount = uiState.data.exams.count { !it.isLocked }

  LazyColumn(
    modifier =
      Modifier
        .fillMaxSize()
        .background(HangyeolTheme.extendedColors.surfaceMuted)
        .statusBarsPadding(),
    verticalArrangement = Arrangement.spacedBy(0.dp),
    contentPadding = PaddingValues(bottom = 36.dp),
  ) {
    item {
      Column(
        modifier =
          Modifier
            .fillMaxWidth()
            .padding(horizontal = 22.dp, vertical = 14.dp),
      ) {
        Row(
          modifier = Modifier.fillMaxWidth(),
          horizontalArrangement = Arrangement.SpaceBetween,
          verticalAlignment = androidx.compose.ui.Alignment.Top,
        ) {
          Column(modifier = Modifier.weight(1f)) {
            Surface(
              modifier = Modifier.size(42.dp).clickable { onBack() },
              color = HangyeolTheme.colorScheme.surface,
              shape = RoundedCornerShape(14.dp),
              border = BorderStroke(1.dp, HangyeolTheme.extendedColors.lineSoft),
            ) {
              Box(contentAlignment = androidx.compose.ui.Alignment.Center) {
                Text(
                  text = "←",
                  style = HangyeolTheme.typography.bodyMedium.copy(fontSize = 18.sp, lineHeight = 18.sp, fontWeight = FontWeight.Bold),
                  color = HangyeolTheme.colorScheme.onSurface,
                )
              }
            }
            Text(
              text = "試驗 · TOPIK",
              style = KSoftSerifLabelStyle(),
              color = HangyeolTheme.extendedColors.crimson,
              modifier = Modifier.padding(top = 14.dp),
            )
            Text(
              text = "考试训练",
              style = HangyeolTheme.typography.headlineMedium.copy(fontSize = 28.sp, lineHeight = 32.sp, fontWeight = FontWeight.ExtraBold),
              color = HangyeolTheme.colorScheme.onSurface,
              modifier = Modifier.padding(top = 4.dp),
            )
            Text(
              text = "选择模拟题并保持节奏感，可用试卷 $unlockedCount/${uiState.data.exams.size}",
              style = HangyeolTheme.typography.bodySmall.copy(fontSize = 13.sp, lineHeight = 18.sp, fontWeight = FontWeight.Medium),
              color = HangyeolTheme.extendedColors.subtext,
              modifier = Modifier.padding(top = 4.dp),
            )
          }
          Surface(
            modifier =
              Modifier
                .padding(start = 12.dp)
                .size(42.dp)
                .clickable { onNavigateRoute(HangyeolDestination.TopikHistory.pattern) },
            color = HangyeolTheme.colorScheme.surface,
            shape = RoundedCornerShape(14.dp),
            border = BorderStroke(1.dp, HangyeolTheme.extendedColors.lineSoft),
          ) {
            Box(contentAlignment = androidx.compose.ui.Alignment.Center) {
              Text(
                text = "歷",
                style = HangyeolTheme.typography.titleMedium.copy(fontFamily = FontFamily.Serif, fontWeight = FontWeight.Medium),
                color = HangyeolTheme.extendedColors.crimson,
              )
            }
          }
        }
      }
    }
    item {
      Row(
        modifier = Modifier.padding(horizontal = 18.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
      ) {
        listOf(
          Triple("均", "最佳分数", bestScore.toString()),
          Triple("數", "历史次数", uiState.data.history.size.toString()),
          Triple("卷", "当前题库", uiState.filteredExams.size.toString()),
        ).forEachIndexed { index, (seal, label, value) ->
          Surface(
            modifier = Modifier.weight(1f),
            color =
              when (index) {
                0 -> HangyeolTheme.extendedColors.tintButter
                1 -> HangyeolTheme.extendedColors.tintMint
                else -> HangyeolTheme.extendedColors.tintLilac
              },
            shape = RoundedCornerShape(22.dp),
          ) {
            Column(modifier = Modifier.padding(horizontal = 16.dp, vertical = 16.dp)) {
              Text(
                text = seal,
                style = HangyeolTheme.typography.titleMedium.copy(fontFamily = FontFamily.Serif, fontWeight = FontWeight.Medium),
                color = HangyeolTheme.extendedColors.crimson,
              )
              Text(
                text = value,
                style = HangyeolTheme.typography.titleLarge.copy(fontSize = 24.sp, lineHeight = 28.sp, fontWeight = FontWeight.ExtraBold),
                color = HangyeolTheme.colorScheme.onSurface,
                modifier = Modifier.padding(top = 6.dp),
              )
              Text(
                text = label,
                style = HangyeolTheme.typography.labelSmall.copy(fontSize = 10.sp, lineHeight = 12.sp, fontWeight = FontWeight.SemiBold),
                color = HangyeolTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(top = 4.dp),
              )
            }
          }
        }
      }
    }
    item {
      Box(modifier = Modifier.padding(horizontal = 18.dp, vertical = 16.dp)) {
        TopikFilterRow(active = uiState.filter, onSelect = viewModel::setFilter)
      }
    }
    if (uiState.data.isLoading) {
      item {
        Box(modifier = Modifier.padding(horizontal = 18.dp)) {
          BaselineCard(title = "正在加载试卷", body = "正在读取试卷列表。")
        }
      }
    } else {
      items(uiState.filteredExams.size) { index ->
        val exam = uiState.filteredExams[index]
        Box(modifier = Modifier.padding(horizontal = 18.dp, vertical = if (index == 0) 0.dp else 12.dp)) {
          TopikExamCard(
            exam = exam,
            onOpen = {
              if (exam.type == TopikType.WRITING) {
                onNavigateRoute(HangyeolDestination.TopikWriting.createRoute(exam.id))
              } else {
                onNavigateRoute(HangyeolDestination.TopikExam.createRoute(exam.id))
              }
            },
            onOpenPricing = { onNavigateRoute(HangyeolDestination.Pricing.pattern) },
          )
        }
      }
    }
    item {
      Row(
        modifier = Modifier.fillMaxWidth().padding(horizontal = 18.dp, vertical = 28.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = androidx.compose.ui.Alignment.CenterVertically,
      ) {
        Column {
          Text(
            text = "歷 · HISTORY",
            style = KSoftSerifLabelStyle(),
            color = HangyeolTheme.extendedColors.crimson,
          )
          Text(
            text = "最近成绩",
            style = HangyeolTheme.typography.titleMedium.copy(fontSize = 20.sp, lineHeight = 24.sp, fontWeight = FontWeight.ExtraBold),
            color = HangyeolTheme.colorScheme.onSurface,
            modifier = Modifier.padding(top = 4.dp),
          )
        }
        Surface(
          modifier = Modifier.clickable { onNavigateRoute(HangyeolDestination.TopikHistory.pattern) },
          color = HangyeolTheme.colorScheme.surface,
          shape = RoundedCornerShape(999.dp),
          border = BorderStroke(1.dp, HangyeolTheme.extendedColors.lineSoft),
        ) {
          Text(
            text = "全部记录",
            style = HangyeolTheme.typography.labelSmall.copy(fontSize = 11.sp, lineHeight = 14.sp, fontWeight = FontWeight.SemiBold),
            color = HangyeolTheme.colorScheme.onSurface,
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
          )
        }
      }
    }
    item {
      Box(modifier = Modifier.padding(horizontal = 18.dp)) {
        TopikHistoryCard(
          entries = uiState.data.history.map { entry ->
            Triple(entry.title, "${entry.submittedAt} · ${if (entry.mode == TopikType.WRITING) "写作" else "客观题"}", "${entry.score} 分")
          },
          onOpenHistory = { onNavigateRoute(HangyeolDestination.TopikHistory.pattern) },
        )
      }
    }
  }
}

@Composable
private fun TopikExamScreen(
  examId: String,
  review: Boolean,
  wrongOnly: Boolean,
  onBack: () -> Unit,
  onNavigateRoute: (String) -> Unit,
) {
  val viewModel: TopikCenterViewModel =
    viewModel(factory = TopikCenterViewModel.factory(ComposeServiceLocator.learningRepository))
  val uiState by viewModel.uiState.collectAsStateWithLifecycle()
  val exam = uiState.data.exams.firstOrNull { it.id == examId || it.legacyExamId == examId }
  val repository = ComposeServiceLocator.learningRepository
  var startState by
    rememberSaveable(
      examId,
      review,
      wrongOnly,
      stateSaver = TopikExamStartStateSaver,
    ) { mutableStateOf(TopikExamStartState()) }
  var sessionId by rememberSaveable(examId) { mutableStateOf<String?>(null) }
  var activeLegacyExamId by rememberSaveable(examId) { mutableStateOf<String?>(null) }
  var sessionEndTimeMillis by rememberSaveable(examId) { mutableStateOf<Long?>(null) }
  var answers by rememberSaveable(examId) { mutableStateOf<Map<String, Int>>(emptyMap()) }
  var markedQuestionNumbers by rememberSaveable(examId) { mutableStateOf<List<Int>>(emptyList()) }
  var jumpFilterName by rememberSaveable(examId) { mutableStateOf(TopikJumpFilter.ALL.name) }
  var requireMarkedReviewBeforeSubmit by rememberSaveable(examId) { mutableStateOf(false) }
  var reviewedMarkedQuestionNumbers by rememberSaveable(examId) { mutableStateOf<List<Int>>(emptyList()) }
  var submitSummary by rememberSaveable(examId) { mutableStateOf<String?>(null) }
  var currentQuestionIndex by rememberSaveable(examId) { mutableStateOf(0) }
  var currentTimeMillis by remember(examId) { mutableStateOf(System.currentTimeMillis()) }
  var autoSubmitted by rememberSaveable(examId) { mutableStateOf(false) }
  var hasSubmittedExam by rememberSaveable(examId) { mutableStateOf(false) }
  var isLoadingQuestions by rememberSaveable(examId) { mutableStateOf(false) }
  var questionLoadErrorMessage by rememberSaveable(examId) { mutableStateOf<String?>(null) }
  var questions by remember(examId) { mutableStateOf<List<TopikExamQuestionUiModel>>(emptyList()) }
  var analyzingQuestionNumber by rememberSaveable(examId) { mutableStateOf<Int?>(null) }
  var questionAnalysisByNumber by rememberSaveable(examId) { mutableStateOf<Map<Int, String>>(emptyMap()) }
  var questionAnalysisResultByNumber by remember(examId) { mutableStateOf<Map<Int, TopikQuestionAnalysisResult>>(emptyMap()) }
  var savingWrongQuestionNumber by rememberSaveable(examId) { mutableStateOf<Int?>(null) }
  var savedWrongQuestionNumbers by rememberSaveable(examId) { mutableStateOf<List<Int>>(emptyList()) }
  val scope = rememberCoroutineScope()

  val remainingSeconds =
    sessionEndTimeMillis?.let { end ->
      ((end - currentTimeMillis).coerceAtLeast(0L)) / 1000
    } ?: 0L
  val shouldShowTimer = sessionId != null && sessionEndTimeMillis != null && !review
  val safeQuestionIndex =
    if (questions.isEmpty()) {
      0
    } else {
      currentQuestionIndex.coerceIn(0, questions.lastIndex)
    }
  val markedQuestionSet = markedQuestionNumbers.toSet()
  val reviewedMarkedQuestionSet = reviewedMarkedQuestionNumbers.toSet()
  val jumpFilter = TopikJumpFilter.fromName(jumpFilterName)
  val answeredCount = answers.size
  val unansweredCount = (questions.size - answeredCount).coerceAtLeast(0)
  val markedCount = markedQuestionSet.size
  val pendingMarkedReviewNumbers =
    markedQuestionSet
      .filter { it !in reviewedMarkedQuestionSet }
      .sorted()
  val pendingMarkedReviewCount = pendingMarkedReviewNumbers.size
  val filteredQuestionIndices =
    questions.indices.filter { index ->
      val question = questions[index]
      val answered = answers[question.number.toString()] != null
      val marked = question.number in markedQuestionSet
      when (jumpFilter) {
        TopikJumpFilter.ALL -> true
        TopikJumpFilter.UNANSWERED -> !answered
        TopikJumpFilter.ANSWERED -> answered
        TopikJumpFilter.MARKED -> marked
      }
    }
  val currentPositionInFiltered = filteredQuestionIndices.indexOf(safeQuestionIndex)
  val activeQuestion = questions.getOrNull(safeQuestionIndex)
  val retryLegacyExamId = activeLegacyExamId ?: exam?.legacyExamId ?: examId

  suspend fun loadExamQuestions(legacyExamId: String, successMessage: String) {
    isLoadingQuestions = true
    questionLoadErrorMessage = null
    val questionResult = repository.loadTopikExamQuestions(legacyExamId)
    questionResult
      .onSuccess { loadedQuestions ->
        isLoadingQuestions = false
        questions = loadedQuestions
        currentQuestionIndex =
          loadedQuestions
            .indexOfFirst { answers[it.number.toString()] == null }
            .let { unresolved ->
              if (unresolved >= 0) {
                unresolved
              } else {
                0
              }
            }
        startState = TopikExamStartState(infoMessage = successMessage)
      }
      .onFailure { throwable ->
        isLoadingQuestions = false
        questions = emptyList()
        questionLoadErrorMessage = throwable.message ?: "题目加载失败，请稍后重试"
        startState = TopikExamStartState(errorMessage = questionLoadErrorMessage)
      }
  }

  LaunchedEffect(sessionId, sessionEndTimeMillis, review, answers, autoSubmitted) {
    if (review) {
      return@LaunchedEffect
    }
    val activeSessionId = sessionId
    val endTime = sessionEndTimeMillis
    if (activeSessionId.isNullOrBlank() || endTime == null) {
      return@LaunchedEffect
    }

    while (true) {
      currentTimeMillis = System.currentTimeMillis()
      val remaining = endTime - currentTimeMillis
      if (remaining <= 0L) {
        if (!autoSubmitted && answers.isNotEmpty()) {
          autoSubmitted = true
          startState = TopikExamStartState(isSubmitting = true, infoMessage = "考试时间到，正在自动交卷...")
          val submitResult = repository.submitTopikExam(activeSessionId, answers)
          submitResult
            .onSuccess { summary ->
              hasSubmittedExam = true
              questionLoadErrorMessage = null
              submitSummary =
                "自动交卷完成：${summary.score} 分（${summary.totalQuestions} 题 / 满分 ${summary.totalScore}）"
              startState = TopikExamStartState(infoMessage = "考试已自动提交")
            }
            .onFailure { throwable ->
              startState =
                TopikExamStartState(
                  errorMessage = throwable.message ?: "自动交卷失败，请手动重试提交",
                )
            }
        }
        break
      }
      delay(1_000)
    }
  }

  LaunchedEffect(jumpFilterName, filteredQuestionIndices) {
    if (filteredQuestionIndices.isEmpty()) {
      return@LaunchedEffect
    }
    if (safeQuestionIndex !in filteredQuestionIndices) {
      currentQuestionIndex = filteredQuestionIndices.first()
    }
  }

  LaunchedEffect(requireMarkedReviewBeforeSubmit, safeQuestionIndex, markedQuestionNumbers) {
    if (!requireMarkedReviewBeforeSubmit) {
      return@LaunchedEffect
    }
    val activeNumber = activeQuestion?.number ?: return@LaunchedEffect
    if (activeNumber !in markedQuestionSet || activeNumber in reviewedMarkedQuestionSet) {
      return@LaunchedEffect
    }
    reviewedMarkedQuestionNumbers =
      (reviewedMarkedQuestionSet + activeNumber)
        .toList()
        .sorted()
  }

  LaunchedEffect(markedQuestionNumbers, requireMarkedReviewBeforeSubmit) {
    val filteredReviewed =
      reviewedMarkedQuestionNumbers
        .filter { it in markedQuestionSet }
    if (filteredReviewed != reviewedMarkedQuestionNumbers) {
      reviewedMarkedQuestionNumbers = filteredReviewed
    }
    if (requireMarkedReviewBeforeSubmit && markedQuestionSet.isEmpty()) {
      requireMarkedReviewBeforeSubmit = false
      jumpFilterName = TopikJumpFilter.ALL.name
    }
  }

  LazyColumn(
    modifier =
      Modifier
        .fillMaxSize()
        .background(HangyeolTheme.colorScheme.background)
        .statusBarsPadding(),
    verticalArrangement = Arrangement.spacedBy(12.dp),
    contentPadding = PaddingValues(bottom = HangyeolTheme.spacing.xl),
  ) {
    item {
      Column(
        modifier =
          Modifier
            .fillMaxWidth()
            .padding(horizontal = 22.dp, vertical = 14.dp),
      ) {
        Surface(
          modifier = Modifier.size(36.dp).clickable { onBack() },
          color = HangyeolTheme.colorScheme.surface,
          shape = RoundedCornerShape(18.dp),
          border = BorderStroke(1.dp, HangyeolTheme.extendedColors.lineSoft),
          shadowElevation = 2.dp,
        ) {
          Box(contentAlignment = androidx.compose.ui.Alignment.Center) {
            Text(
              text = "←",
              style = HangyeolTheme.typography.titleMedium.copy(fontSize = 16.sp, lineHeight = 16.sp, fontWeight = FontWeight.ExtraBold),
              color = HangyeolTheme.colorScheme.onSurface,
            )
          }
        }
        Text(
          text = "卷 · EXAM",
          style = KSoftSerifLabelStyle(),
          color = HangyeolTheme.extendedColors.crimson,
          modifier = Modifier.padding(top = 14.dp),
        )
        Text(
          text = exam?.title ?: "TOPIK 试卷",
          style = HangyeolTheme.typography.headlineMedium.copy(fontSize = 28.sp, lineHeight = 32.sp, fontWeight = FontWeight.ExtraBold),
          color = HangyeolTheme.colorScheme.onSurface,
          modifier = Modifier.padding(top = 4.dp),
        )
        Text(
          text = buildString {
            append("${exam?.durationMinutes ?: 0} 分钟")
            if ((exam?.questionCount ?: 0) > 0) append(" · ${exam?.questionCount ?: 0} 题")
            if (review) append(" · 复盘模式")
            if (wrongOnly) append(" · 仅错题")
          },
          style = HangyeolTheme.typography.bodySmall.copy(fontSize = 13.sp, lineHeight = 18.sp, fontWeight = FontWeight.Medium),
          color = HangyeolTheme.extendedColors.subtext,
          modifier = Modifier.padding(top = 4.dp),
        )
      }
    }
    item {
      Box(modifier = Modifier.padding(horizontal = 22.dp)) {
        BaselineCard(
          title = "试卷详情已接入学习数据流",
          body =
            when {
              startState.errorMessage != null -> startState.errorMessage ?: "开始考试失败，请稍后重试。"
              submitSummary != null -> submitSummary ?: "交卷完成。"
              hasSubmittedExam -> "试卷已提交，可返回考试中心查看其他试卷，或重置后重新开始。"
              startState.infoMessage != null -> startState.infoMessage ?: "考试会话已创建。"
              review -> "当前为复盘模式，可返回考试中心切换试卷。"
              else -> "可创建考试会话并同步题目；答题后支持保存与交卷。"
            },
        )
      }
    }
    if (shouldShowTimer) {
      item {
        Box(modifier = Modifier.padding(horizontal = 22.dp)) {
          BaselineCard(
            title = "考试倒计时",
            body =
              if (remainingSeconds > 0L) {
                "剩余 ${formatRemainingClock(remainingSeconds)}，到时将自动交卷。"
              } else {
                "考试时间已到，正在处理交卷。"
              },
          )
        }
      }
    }
    if (isLoadingQuestions) {
      item {
        Box(modifier = Modifier.padding(horizontal = 22.dp)) {
          BaselineCard(
            title = "题目加载中",
            body = "正在同步试卷题目，请稍候。",
          )
        }
      }
    }
    if (questionLoadErrorMessage != null && sessionId != null && !isLoadingQuestions) {
      item {
        Box(modifier = Modifier.padding(horizontal = 22.dp)) {
          BaselineCard(
            title = "题目加载失败",
            body = questionLoadErrorMessage ?: "题目加载失败，请稍后重试。",
            actionLabel = "重试加载题目",
            onAction = {
              scope.launch {
                loadExamQuestions(
                  retryLegacyExamId,
                  successMessage = "题目已重新加载，可继续答题。",
                )
              }
            },
          )
        }
      }
    }
    if (questions.isNotEmpty()) {
      item {
        Box(modifier = Modifier.padding(horizontal = 22.dp)) {
          BaselineCard(
            title = "答题进度",
            body =
              buildString {
                append("第 ${safeQuestionIndex + 1} / ${questions.size} 题，已作答 $answeredCount 题。")
                if (requireMarkedReviewBeforeSubmit) {
                  append(" 标记题复核剩余 $pendingMarkedReviewCount 题。")
                }
              },
          )
        }
      }
      item {
        Row(
          modifier = Modifier.fillMaxWidth().padding(horizontal = 22.dp),
          horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
          listOf(
            Triple("未答", unansweredCount.toString(), HangyeolTheme.extendedColors.tintButter),
            Triple("已答", answeredCount.toString(), HangyeolTheme.extendedColors.tintMint),
            Triple("标记", markedCount.toString(), HangyeolTheme.extendedColors.tintLilac),
          ).forEach { metric ->
            Surface(
              modifier = Modifier.weight(1f),
              color = metric.third,
              shape = RoundedCornerShape(12.dp),
              border = BorderStroke(1.dp, HangyeolTheme.extendedColors.lineSoft),
            ) {
              Column(modifier = Modifier.padding(horizontal = 10.dp, vertical = 10.dp)) {
                Text(
                  text = metric.first,
                  style = HangyeolTheme.typography.labelSmall.copy(fontSize = 10.sp, lineHeight = 12.sp, fontWeight = FontWeight.Bold),
                  color = HangyeolTheme.extendedColors.subtext,
                )
                Text(
                  text = metric.second,
                  style = HangyeolTheme.typography.bodyMedium.copy(fontSize = 16.sp, lineHeight = 20.sp, fontWeight = FontWeight.ExtraBold),
                  color = HangyeolTheme.colorScheme.onSurface,
                  modifier = Modifier.padding(top = 4.dp),
                )
              }
            }
          }
        }
      }
      item {
        LazyRow(
          modifier = Modifier.fillMaxWidth().padding(horizontal = 22.dp),
          horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
          items(TopikJumpFilter.entries.size) { index ->
            val filter = TopikJumpFilter.entries[index]
            val isActive = filter == jumpFilter
            Surface(
              modifier = Modifier.clickable { jumpFilterName = filter.name },
              color = if (isActive) HangyeolTheme.extendedColors.tintMint else HangyeolTheme.colorScheme.surface,
              shape = RoundedCornerShape(999.dp),
              border = BorderStroke(1.dp, HangyeolTheme.extendedColors.lineSoft),
            ) {
              Text(
                text = filter.label,
                style = HangyeolTheme.typography.bodySmall.copy(fontSize = 12.sp, lineHeight = 16.sp, fontWeight = FontWeight.SemiBold),
                color = HangyeolTheme.colorScheme.onSurface,
                modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
              )
            }
          }
        }
      }
      item {
        LazyRow(
          modifier = Modifier.fillMaxWidth().padding(horizontal = 22.dp),
          horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
          items(filteredQuestionIndices.size) { position ->
            val index = filteredQuestionIndices[position]
            val question = questions[index]
            val answered = answers[question.number.toString()] != null
            val marked = question.number in markedQuestionSet
            val isCurrent = index == safeQuestionIndex
            Surface(
              modifier =
                Modifier
                  .clickable { currentQuestionIndex = index },
              color =
                when {
                  isCurrent -> HangyeolTheme.extendedColors.tintMint
                  answered -> HangyeolTheme.extendedColors.tintButter
                  else -> HangyeolTheme.colorScheme.surface
                },
              shape = RoundedCornerShape(10.dp),
              border = BorderStroke(1.dp, HangyeolTheme.extendedColors.lineSoft),
            ) {
              Text(
                text = if (marked) "${question.number}★" else question.number.toString(),
                style = HangyeolTheme.typography.bodySmall.copy(fontSize = 12.sp, lineHeight = 16.sp, fontWeight = FontWeight.ExtraBold),
                color = HangyeolTheme.colorScheme.onSurface,
                modifier = Modifier.padding(horizontal = 10.dp, vertical = 8.dp),
              )
            }
          }
        }
      }
      if (filteredQuestionIndices.isEmpty()) {
        item {
          Box(modifier = Modifier.padding(horizontal = 22.dp)) {
            BaselineCard(
              title = "当前筛选下无题目",
              body = "切换筛选条件，或先答题/标记后再查看。",
              actionLabel = "显示全部",
              onAction = { jumpFilterName = TopikJumpFilter.ALL.name },
            )
          }
        }
      }
      if (activeQuestion != null && filteredQuestionIndices.isNotEmpty()) {
        val question = activeQuestion
        val selected = answers[question.number.toString()]
        val marked = question.number in markedQuestionSet
        val canAnalyzeQuestion = review || hasSubmittedExam
        val analysisMessage = questionAnalysisByNumber[question.number].orEmpty()
        val analysisResult = questionAnalysisResultByNumber[question.number]
        val isSavingWrongQuestion = savingWrongQuestionNumber == question.number
        val alreadySavedWrongQuestion = question.number in savedWrongQuestionNumbers
        item {
          Surface(
            modifier = Modifier.padding(horizontal = 22.dp),
            color = HangyeolTheme.colorScheme.surface,
            shape = RoundedCornerShape(18.dp),
            border = BorderStroke(1.dp, HangyeolTheme.extendedColors.lineSoft),
          ) {
            Column(modifier = Modifier.padding(horizontal = 16.dp, vertical = 14.dp)) {
              Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = androidx.compose.ui.Alignment.CenterVertically,
              ) {
                Text(
                  text = "第 ${question.number} 题 · ${question.score} 分",
                  style = HangyeolTheme.typography.labelSmall.copy(fontSize = 11.sp, lineHeight = 14.sp, fontWeight = FontWeight.Bold),
                  color = HangyeolTheme.extendedColors.subtext,
                )
                Surface(
                  modifier =
                    Modifier.clickable(enabled = !hasSubmittedExam && !startState.isSubmitting) {
                      val updated = markedQuestionSet.toMutableSet()
                      if (question.number in updated) {
                        updated.remove(question.number)
                      } else {
                        updated.add(question.number)
                      }
                      markedQuestionNumbers = updated.toList().sorted()
                    },
                  color = if (marked) HangyeolTheme.extendedColors.tintLilac else HangyeolTheme.colorScheme.surface,
                  shape = RoundedCornerShape(999.dp),
                  border = BorderStroke(1.dp, HangyeolTheme.extendedColors.lineSoft),
                ) {
                  Text(
                    text = if (marked) "已标记" else "标记此题",
                    style = HangyeolTheme.typography.bodySmall.copy(fontSize = 11.sp, lineHeight = 14.sp, fontWeight = FontWeight.SemiBold),
                    color = HangyeolTheme.colorScheme.onSurface,
                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                  )
                }
              }
              if (question.passage.isNotBlank()) {
                Text(
                  text = question.passage,
                  style = HangyeolTheme.typography.bodySmall.copy(fontSize = 12.sp, lineHeight = 18.sp, fontWeight = FontWeight.Medium),
                  color = HangyeolTheme.extendedColors.subtext,
                  modifier = Modifier.padding(top = 8.dp),
                )
              }
              Text(
                text = question.question,
                style = HangyeolTheme.typography.bodyMedium.copy(fontSize = 14.sp, lineHeight = 20.sp, fontWeight = FontWeight.SemiBold),
                color = HangyeolTheme.colorScheme.onSurface,
                modifier = Modifier.padding(top = 8.dp),
              )
              Column(
                modifier = Modifier.padding(top = 10.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp),
              ) {
                question.options.forEachIndexed { optionIndex, option ->
                  val optionValue = optionIndex + 1
                  val isSelected = selected == optionValue
                  Surface(
                    modifier =
                      Modifier
                        .fillMaxWidth()
                        .clickable(enabled = !hasSubmittedExam && !startState.isSubmitting) {
                          val updated = answers.toMutableMap()
                          updated[question.number.toString()] = optionValue
                          answers = updated
                          submitSummary = null
                          if (
                            currentPositionInFiltered >= 0 &&
                            currentPositionInFiltered < filteredQuestionIndices.lastIndex
                          ) {
                            currentQuestionIndex = filteredQuestionIndices[currentPositionInFiltered + 1]
                          }
                        },
                    color = if (isSelected) HangyeolTheme.extendedColors.tintMint else HangyeolTheme.colorScheme.surface,
                    shape = RoundedCornerShape(12.dp),
                    border = BorderStroke(1.dp, HangyeolTheme.extendedColors.lineSoft),
                  ) {
                    Text(
                      text = "${'A' + optionIndex}. $option",
                      style = HangyeolTheme.typography.bodySmall.copy(fontSize = 13.sp, lineHeight = 18.sp, fontWeight = FontWeight.Medium),
                      color = HangyeolTheme.colorScheme.onSurface,
                      modifier = Modifier.padding(horizontal = 12.dp, vertical = 10.dp),
                    )
                  }
                }
              }
              if (canAnalyzeQuestion) {
                KSoftPrimaryButton(
                  text =
                    if (analyzingQuestionNumber == question.number) {
                      "AI 解析中..."
                    } else {
                      "AI 题目解析"
                    },
                  onClick = {
                    if (analyzingQuestionNumber == question.number) {
                      return@KSoftPrimaryButton
                    }
                    scope.launch {
                      analyzingQuestionNumber = question.number
                      val result = repository.analyzeTopikQuestion(question, language = "zh")
                      analyzingQuestionNumber = null
                      val content =
                        if (!result.success) {
                          result.errorMessage ?: "解析失败，请稍后重试。"
                        } else {
                          val wrongOptionsText =
                            if (result.wrongOptions.isEmpty()) {
                              ""
                            } else {
                              result.wrongOptions.entries
                                .sortedBy { it.key }
                                .joinToString(separator = "\n") { entry ->
                                  "选项 ${entry.key}: ${entry.value}"
                                }
                            }
                          listOf(
                            result.translation.takeIf { it.isNotBlank() }?.let { "题干翻译: $it" },
                            result.keyPoint.takeIf { it.isNotBlank() }?.let { "考点: $it" },
                            result.analysis.takeIf { it.isNotBlank() }?.let { "解析: $it" },
                            wrongOptionsText.takeIf { it.isNotBlank() }?.let { "错误选项分析:\n$it" },
                          ).filterNotNull().joinToString(separator = "\n\n").ifBlank {
                            "解析完成，但暂未返回内容。"
                          }
                        }
                      questionAnalysisByNumber =
                        questionAnalysisByNumber.toMutableMap().apply {
                          put(question.number, content)
                        }
                      questionAnalysisResultByNumber =
                        questionAnalysisResultByNumber.toMutableMap().apply {
                          put(question.number, result)
                        }
                    }
                  },
                  modifier = Modifier.padding(top = 10.dp).fillMaxWidth(),
                  enabled = analyzingQuestionNumber == null || analyzingQuestionNumber != question.number,
                )
              }
              if (canAnalyzeQuestion && analysisResult?.success == true) {
                KSoftPrimaryButton(
                  text =
                    when {
                      isSavingWrongQuestion -> "保存中..."
                      alreadySavedWrongQuestion -> "已保存到笔记"
                      else -> "保存错题到笔记"
                    },
                  onClick = {
                    if (isSavingWrongQuestion || alreadySavedWrongQuestion) {
                      return@KSoftPrimaryButton
                    }
                    val examTitle = exam?.title ?: "TOPIK 试卷"
                    scope.launch {
                      savingWrongQuestionNumber = question.number
                      val saveResult = repository.saveTopikWrongQuestionNote(examTitle, question, analysisResult)
                      savingWrongQuestionNumber = null
                      if (saveResult.success) {
                        savedWrongQuestionNumbers = (savedWrongQuestionNumbers + question.number).distinct().sorted()
                        startState =
                          TopikExamStartState(
                            infoMessage =
                              saveResult.errorMessage
                                ?: "已保存第 ${question.number} 题到笔记${if (saveResult.annotationSaved) "与批注" else ""}。",
                          )
                      } else {
                        startState =
                          TopikExamStartState(
                            errorMessage = saveResult.errorMessage ?: "错题保存失败，请稍后重试",
                          )
                      }
                    }
                  },
                  modifier = Modifier.padding(top = 8.dp).fillMaxWidth(),
                  enabled = !isSavingWrongQuestion && !alreadySavedWrongQuestion,
                )
                if (alreadySavedWrongQuestion) {
                  KSoftPrimaryButton(
                    text = "查看笔记",
                    onClick = { onNavigateRoute(HangyeolDestination.Notebook.pattern) },
                    modifier = Modifier.padding(top = 8.dp).fillMaxWidth(),
                    enabled = !isSavingWrongQuestion,
                  )
                }
              }
              if (analysisMessage.isNotBlank()) {
                Text(
                  text = analysisMessage,
                  style = HangyeolTheme.typography.bodySmall.copy(fontSize = 12.sp, lineHeight = 18.sp, fontWeight = FontWeight.Medium),
                  color = HangyeolTheme.extendedColors.subtext,
                  modifier = Modifier.padding(top = 8.dp),
                )
              }
            }
          }
        }
        item {
          Row(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 22.dp),
            horizontalArrangement = Arrangement.spacedBy(10.dp),
          ) {
            KSoftPrimaryButton(
              text = "上一题",
              onClick = {
                if (currentPositionInFiltered > 0) {
                  currentQuestionIndex = filteredQuestionIndices[currentPositionInFiltered - 1]
                }
              },
              modifier = Modifier.weight(1f),
              enabled = currentPositionInFiltered > 0 && !startState.isSubmitting,
            )
            KSoftPrimaryButton(
              text = "下一题",
              onClick = {
                if (currentPositionInFiltered >= 0 && currentPositionInFiltered < filteredQuestionIndices.lastIndex) {
                  currentQuestionIndex = filteredQuestionIndices[currentPositionInFiltered + 1]
                }
              },
              modifier = Modifier.weight(1f),
              enabled =
                currentPositionInFiltered >= 0 &&
                  currentPositionInFiltered < filteredQuestionIndices.lastIndex &&
                  !startState.isSubmitting,
            )
          }
        }
      }
    }
    item {
      KSoftPrimaryButton(
        text =
          when {
            review -> "返回考试中心"
            startState.isSubmitting -> "正在开始..."
            sessionId == null -> "开始考试"
            else -> "重置并重新开始"
          },
        onClick = {
          if (review) {
            onNavigateRoute(HangyeolDestination.Topik.pattern)
            return@KSoftPrimaryButton
          }
          val targetExam = exam ?: return@KSoftPrimaryButton
          if (startState.isSubmitting) {
            return@KSoftPrimaryButton
          }
          scope.launch {
            startState = TopikExamStartState(isSubmitting = true)
            submitSummary = null
            hasSubmittedExam = false
            questionLoadErrorMessage = null
            val result =
              repository.startTopikExamSession(targetExam.legacyExamId)
            result
              .onSuccess { session ->
                activeLegacyExamId = targetExam.legacyExamId
                sessionId = session.sessionId
                sessionEndTimeMillis = session.endTimeMillis
                answers = session.answers
                markedQuestionNumbers = emptyList()
                requireMarkedReviewBeforeSubmit = false
                reviewedMarkedQuestionNumbers = emptyList()
                jumpFilterName = TopikJumpFilter.ALL.name
                autoSubmitted = false
                hasSubmittedExam = false
                questionAnalysisByNumber = emptyMap()
                questionAnalysisResultByNumber = emptyMap()
                savedWrongQuestionNumbers = emptyList()
                val summary =
                  if (session.isResuming) {
                    "已恢复进行中的会话（已答 ${session.answerCount} 题）。"
                  } else {
                    "会话已创建，可开始作答。"
                  }
                loadExamQuestions(targetExam.legacyExamId, successMessage = summary)
              }
              .onFailure { throwable ->
                activeLegacyExamId = null
                sessionId = null
                sessionEndTimeMillis = null
                markedQuestionNumbers = emptyList()
                requireMarkedReviewBeforeSubmit = false
                reviewedMarkedQuestionNumbers = emptyList()
                jumpFilterName = TopikJumpFilter.ALL.name
                hasSubmittedExam = false
                isLoadingQuestions = false
                questionLoadErrorMessage = null
                currentQuestionIndex = 0
                startState =
                  TopikExamStartState(
                    errorMessage = throwable.message ?: "开始考试失败，请稍后重试",
                  )
              }
          }
        },
        modifier = Modifier.padding(horizontal = 22.dp).fillMaxWidth(),
        enabled = !uiState.data.isLoading && exam != null && !startState.isSubmitting,
      )
    }
    if (sessionId != null && !review && questions.isNotEmpty() && !hasSubmittedExam) {
      item {
        KSoftPrimaryButton(
          text = if (startState.isSubmitting) "保存中..." else "保存进度",
          onClick = {
            val activeSessionId = sessionId.orEmpty()
            if (activeSessionId.isBlank()) {
              return@KSoftPrimaryButton
            }
            scope.launch {
              startState = TopikExamStartState(isSubmitting = true)
              val result = repository.saveTopikExamAnswers(activeSessionId, answers)
              result
                .onSuccess {
                  startState = TopikExamStartState(infoMessage = "进度已保存（${answers.size} 题）")
                }
                .onFailure { throwable ->
                  startState =
                    TopikExamStartState(
                      errorMessage = throwable.message ?: "保存失败，请稍后重试",
                    )
                }
            }
          },
          modifier = Modifier.padding(horizontal = 22.dp).fillMaxWidth(),
          enabled = !startState.isSubmitting && answers.isNotEmpty(),
        )
      }
      item {
        KSoftPrimaryButton(
          text = if (startState.isSubmitting) "提交中..." else "提交试卷",
          onClick = {
            val activeSessionId = sessionId.orEmpty()
            if (activeSessionId.isBlank()) {
              return@KSoftPrimaryButton
            }
            if (markedQuestionSet.isNotEmpty() && !requireMarkedReviewBeforeSubmit) {
              requireMarkedReviewBeforeSubmit = true
              reviewedMarkedQuestionNumbers = emptyList()
              jumpFilterName = TopikJumpFilter.MARKED.name
              val firstMarkedNumber = markedQuestionSet.minOrNull()
              val firstMarkedIndex =
                firstMarkedNumber?.let { targetNumber ->
                  questions.indexOfFirst { question -> question.number == targetNumber }
                } ?: -1
              if (firstMarkedIndex >= 0) {
                currentQuestionIndex = firstMarkedIndex
              }
              startState =
                TopikExamStartState(
                  infoMessage = "检测到标记题，请先逐题复核后再提交。",
                )
              return@KSoftPrimaryButton
            }
            if (requireMarkedReviewBeforeSubmit && pendingMarkedReviewCount > 0) {
              jumpFilterName = TopikJumpFilter.MARKED.name
              val nextPendingNumber = pendingMarkedReviewNumbers.first()
              val nextPendingIndex =
                questions.indexOfFirst { question -> question.number == nextPendingNumber }
              if (nextPendingIndex >= 0) {
                currentQuestionIndex = nextPendingIndex
              }
              startState =
                TopikExamStartState(
                  infoMessage = "还有 $pendingMarkedReviewCount 道标记题未复核，请先完成复核。",
                )
              return@KSoftPrimaryButton
            }
            scope.launch {
              startState = TopikExamStartState(isSubmitting = true)
              val result = repository.submitTopikExam(activeSessionId, answers)
              result
                .onSuccess { summary ->
                  autoSubmitted = true
                  hasSubmittedExam = true
                  requireMarkedReviewBeforeSubmit = false
                  questionLoadErrorMessage = null
                  submitSummary =
                    "交卷完成：${summary.score} 分（${summary.totalQuestions} 题 / 满分 ${summary.totalScore}）"
                  startState = TopikExamStartState(infoMessage = "试卷已提交")
                }
                .onFailure { throwable ->
                  startState =
                    TopikExamStartState(
                      errorMessage = throwable.message ?: "提交失败，请稍后重试",
                    )
                }
            }
          },
          modifier = Modifier.padding(horizontal = 22.dp).fillMaxWidth(),
          enabled = !startState.isSubmitting && answers.isNotEmpty(),
        )
      }
    }
  }
}

@Composable
internal fun TopikExamScreenTestHarness(
  examId: String,
  review: Boolean = false,
  wrongOnly: Boolean = false,
) {
  TopikExamScreen(
    examId = examId,
    review = review,
    wrongOnly = wrongOnly,
    onBack = {},
    onNavigateRoute = {},
  )
}

@Composable
internal fun TopikWritingScreenTestHarness(
  examId: String,
) {
  TopikWritingScreen(
    examId = examId,
    onBack = {},
    onNavigateRoute = {},
  )
}

@Composable
private fun TopikWritingScreen(
  examId: String,
  onBack: () -> Unit,
  onNavigateRoute: (String) -> Unit,
) {
  val viewModel: WritingHubViewModel =
    viewModel(factory = WritingHubViewModel.factory(ComposeServiceLocator.learningRepository))
  val uiState by viewModel.uiState.collectAsStateWithLifecycle()
  val repository = ComposeServiceLocator.learningRepository
  val selectedPrompt = uiState.prompts.firstOrNull { it.route.endsWith(examId) }
  var actionState by
    rememberSaveable(
      examId,
      stateSaver = TopikWritingActionStateSaver,
    ) { mutableStateOf(TopikWritingActionState()) }
  var sessionId by rememberSaveable(examId) { mutableStateOf<String?>(null) }
  var writingQuestions by remember(examId) { mutableStateOf<List<TopikWritingQuestionUiModel>>(emptyList()) }
  var currentWritingQuestionIndex by rememberSaveable(examId) { mutableStateOf(0) }
  var draftByQuestion by rememberSaveable(examId) { mutableStateOf<Map<String, String>>(emptyMap()) }
  var submitSummary by rememberSaveable(examId) { mutableStateOf<String?>(null) }
  var autoSaveMessage by rememberSaveable(examId) { mutableStateOf<String?>(null) }
  var autoSaving by rememberSaveable(examId) { mutableStateOf(false) }
  var hasSubmittedWritingSession by rememberSaveable(examId) { mutableStateOf(false) }
  var writingEvaluationReport by remember(examId) { mutableStateOf<TopikWritingEvaluationReportUiModel?>(null) }
  var writingEvaluationLoading by rememberSaveable(examId) { mutableStateOf(false) }
  var writingEvaluationError by rememberSaveable(examId) { mutableStateOf<String?>(null) }
  var writingEvaluationRetrying by rememberSaveable(examId) { mutableStateOf(false) }
  var writingEvaluationRefreshToken by rememberSaveable(examId) { mutableStateOf(0) }
  var lastSavedQuestionKey by rememberSaveable(examId) { mutableStateOf("1") }
  var lastSavedDraftText by rememberSaveable(examId) { mutableStateOf("") }
  val scope = rememberCoroutineScope()

  val safeWritingQuestionIndex =
    if (writingQuestions.isEmpty()) {
      0
    } else {
      currentWritingQuestionIndex.coerceIn(0, writingQuestions.lastIndex)
    }
  val activeWritingQuestion = writingQuestions.getOrNull(safeWritingQuestionIndex)
  val activeQuestionKey = (activeWritingQuestion?.number ?: 1).toString()
  val activeDraftText = draftByQuestion[activeQuestionKey].orEmpty()
  val filledDraftCount = draftByQuestion.values.count { draft -> draft.trim().isNotBlank() }
  val scoreByQuestionNumber = writingQuestions.associate { question -> question.number to question.score }
  val nonBlankDrafts =
    draftByQuestion.filterValues { draft -> draft.trim().isNotBlank() }

  val latestSessionId by rememberUpdatedState(sessionId)
  val latestDraftByQuestion by rememberUpdatedState(draftByQuestion)
  val latestQuestionKey by rememberUpdatedState(activeQuestionKey)
  val latestLastSavedQuestionKey by rememberUpdatedState(lastSavedQuestionKey)
  val latestLastSavedDraftText by rememberUpdatedState(lastSavedDraftText)
  val latestHasSubmittedWritingSession by rememberUpdatedState(hasSubmittedWritingSession)

  LaunchedEffect(sessionId, hasSubmittedWritingSession, writingEvaluationRefreshToken) {
    val activeSessionId = sessionId
    if (!hasSubmittedWritingSession || activeSessionId.isNullOrBlank()) return@LaunchedEffect
    writingEvaluationError = null
    writingEvaluationLoading = true
    while (isActive) {
      val result = repository.loadTopikWritingEvaluationReport(activeSessionId)
      result
        .onSuccess { report ->
          writingEvaluationReport = report
          if (report == null) {
            writingEvaluationError = "评估结果暂不可用，请稍后刷新"
            writingEvaluationLoading = false
            return@LaunchedEffect
          }
          if (report.status == "EVALUATED") {
            writingEvaluationLoading = false
            return@LaunchedEffect
          }
          writingEvaluationLoading = report.status == "EVALUATING"
        }
        .onFailure { throwable ->
          writingEvaluationError = throwable.message ?: "评估结果加载失败，请稍后重试"
          writingEvaluationLoading = false
          return@LaunchedEffect
        }
      delay(3_000)
    }
  }

  LaunchedEffect(sessionId, activeQuestionKey, activeDraftText, actionState.isSubmitting, hasSubmittedWritingSession) {
    val activeSessionId = sessionId
    if (activeSessionId.isNullOrBlank()) return@LaunchedEffect
    if (actionState.isSubmitting) return@LaunchedEffect
    if (hasSubmittedWritingSession) return@LaunchedEffect
    val questionKey = activeQuestionKey
    val trimmedDraft = activeDraftText.trim()
    if (trimmedDraft.isBlank()) return@LaunchedEffect
    if (questionKey == lastSavedQuestionKey && trimmedDraft == lastSavedDraftText) return@LaunchedEffect

    delay(1_500)
    if (sessionId != activeSessionId) return@LaunchedEffect
    if (actionState.isSubmitting) return@LaunchedEffect
    if (questionKey != activeQuestionKey) return@LaunchedEffect
    val latestDraft = draftByQuestion[questionKey].orEmpty()
    val latestTrimmedDraft = latestDraft.trim()
    if (latestTrimmedDraft.isBlank()) return@LaunchedEffect
    if (questionKey == lastSavedQuestionKey && latestTrimmedDraft == lastSavedDraftText) return@LaunchedEffect

    autoSaving = true
    val result =
      repository.saveTopikWritingDraft(
        sessionId = activeSessionId,
        answers = mapOf(questionKey to latestDraft),
      )
    autoSaving = false
    result
      .onSuccess {
        lastSavedQuestionKey = questionKey
        lastSavedDraftText = latestTrimmedDraft
        autoSaveMessage = "草稿已自动保存"
      }
      .onFailure { throwable ->
        autoSaveMessage = throwable.message ?: "自动保存失败"
      }
  }

  DisposableEffect(sessionId) {
    onDispose {
      val activeSessionId = latestSessionId
      if (latestHasSubmittedWritingSession) {
        return@onDispose
      }
      val latestDraft = latestDraftByQuestion[latestQuestionKey].orEmpty()
      val trimmedDraft = latestDraft.trim()
      val shouldFlush =
        !activeSessionId.isNullOrBlank() &&
          trimmedDraft.isNotBlank() &&
          (
            trimmedDraft != latestLastSavedDraftText ||
              latestQuestionKey != latestLastSavedQuestionKey
          )
      if (!shouldFlush) {
        return@onDispose
      }
      scope.launch {
        val resolvedSessionId = activeSessionId ?: return@launch
        repository.saveTopikWritingDraft(
          sessionId = resolvedSessionId,
          answers = mapOf(latestQuestionKey to latestDraft),
        )
      }
    }
  }

  LazyColumn(
    modifier =
      Modifier
        .fillMaxSize()
        .background(HangyeolTheme.colorScheme.background)
        .statusBarsPadding(),
    verticalArrangement = Arrangement.spacedBy(12.dp),
    contentPadding = PaddingValues(bottom = HangyeolTheme.spacing.xl),
  ) {
    item {
      Column(
        modifier =
          Modifier
            .fillMaxWidth()
            .padding(horizontal = 22.dp, vertical = 14.dp),
      ) {
        Surface(
          modifier = Modifier.size(36.dp).clickable { onBack() },
          color = HangyeolTheme.colorScheme.surface,
          shape = RoundedCornerShape(18.dp),
          border = BorderStroke(1.dp, HangyeolTheme.extendedColors.lineSoft),
          shadowElevation = 2.dp,
        ) {
          Box(contentAlignment = androidx.compose.ui.Alignment.Center) {
            Text(
              text = "←",
              style = HangyeolTheme.typography.titleMedium.copy(fontSize = 16.sp, lineHeight = 16.sp, fontWeight = FontWeight.ExtraBold),
              color = HangyeolTheme.colorScheme.onSurface,
            )
          }
        }
        Text(
          text = "述 · WRITING",
          style = KSoftSerifLabelStyle(),
          color = HangyeolTheme.extendedColors.crimson,
          modifier = Modifier.padding(top = 14.dp),
        )
        Text(
          text = selectedPrompt?.title ?: "TOPIK 写作",
          style = HangyeolTheme.typography.headlineMedium.copy(fontSize = 28.sp, lineHeight = 32.sp, fontWeight = FontWeight.ExtraBold),
          color = HangyeolTheme.colorScheme.onSurface,
          modifier = Modifier.padding(top = 4.dp),
        )
        Text(
          text = selectedPrompt?.meta ?: "写作任务准备中",
          style = HangyeolTheme.typography.bodySmall.copy(fontSize = 13.sp, lineHeight = 18.sp, fontWeight = FontWeight.Medium),
          color = HangyeolTheme.extendedColors.subtext,
          modifier = Modifier.padding(top = 4.dp),
        )
      }
    }
    if (uiState.isLoading) {
      item {
        Box(modifier = Modifier.padding(horizontal = 22.dp)) {
          BaselineCard(title = "正在加载写作会话", body = "写作草稿与提示词数据同步中。")
        }
      }
    } else {
      item {
        Box(modifier = Modifier.padding(horizontal = 22.dp)) {
          BaselineCard(
            title = "写作会话已接入后端数据流",
            body =
              when {
                actionState.errorMessage != null -> actionState.errorMessage ?: "写作会话操作失败"
                submitSummary != null -> submitSummary ?: "写作会话已提交"
                hasSubmittedWritingSession && writingEvaluationReport?.status == "EVALUATED" -> "AI 评估已完成，可查看分题报告。"
                hasSubmittedWritingSession && writingEvaluationLoading -> "写作会话已提交，AI 正在评估中。"
                hasSubmittedWritingSession -> "写作会话已提交，等待评估结果返回。"
                autoSaving -> "草稿自动保存中..."
                autoSaveMessage != null -> autoSaveMessage ?: "草稿已自动保存"
                actionState.infoMessage != null -> actionState.infoMessage ?: "写作会话已就绪"
                else -> "可开始写作会话，并执行草稿保存与提交评估。"
              },
          )
        }
      }
      item {
        KSoftPrimaryButton(
          text =
            when {
              actionState.isSubmitting -> "处理中..."
              sessionId == null -> "开始写作会话"
              else -> "重置并重新开始"
            },
          onClick = {
            if (actionState.isSubmitting) {
              return@KSoftPrimaryButton
            }
            scope.launch {
              actionState = TopikWritingActionState(isSubmitting = true)
              submitSummary = null
              hasSubmittedWritingSession = false
              writingEvaluationReport = null
              writingEvaluationLoading = false
              writingEvaluationError = null
              writingEvaluationRetrying = false
              val result = repository.startTopikWritingSession(examId)
              result
                .onSuccess { session ->
                  sessionId = session.sessionId
                  autoSaveMessage = null
                  draftByQuestion = session.answers
                  writingQuestions = emptyList()
                  currentWritingQuestionIndex = 0
                  lastSavedQuestionKey = "1"
                  lastSavedDraftText = ""
                  val questionsResult = repository.loadTopikWritingQuestions(examId)
                  val loadedQuestions =
                    questionsResult
                      .getOrNull()
                      ?.sortedBy { question -> question.number }
                      .orEmpty()
                  if (loadedQuestions.isNotEmpty()) {
                    writingQuestions = loadedQuestions
                    val firstUnfilledNumber =
                      loadedQuestions
                        .firstOrNull { question ->
                          val key = question.number.toString()
                          session.answers[key].orEmpty().trim().isBlank()
                        }
                        ?.number
                    val resumeQuestionNumber =
                      firstUnfilledNumber
                        ?: loadedQuestions
                          .firstOrNull { question ->
                            val key = question.number.toString()
                            session.answers[key].orEmpty().trim().isNotBlank()
                          }
                          ?.number
                        ?: loadedQuestions.first().number
                    val resumeIndex =
                      loadedQuestions.indexOfFirst { question ->
                        question.number == resumeQuestionNumber
                      }
                    currentWritingQuestionIndex = if (resumeIndex >= 0) resumeIndex else 0
                    val resolvedQuestionKey = resumeQuestionNumber.toString()
                    val resumedDraft = session.answers[resolvedQuestionKey].orEmpty()
                    lastSavedQuestionKey = resolvedQuestionKey
                    lastSavedDraftText = resumedDraft.trim()
                  } else {
                    val fallbackQuestionKey = session.answers.keys.firstOrNull() ?: "1"
                    lastSavedQuestionKey = fallbackQuestionKey
                    lastSavedDraftText = session.answers[fallbackQuestionKey].orEmpty().trim()
                  }
                  val summary =
                    if (session.isResuming) {
                      "已恢复进行中的写作会话（${session.answerCount} 题）。"
                    } else {
                      "写作会话已创建，可以开始输入草稿。"
                    }
                  actionState = TopikWritingActionState(infoMessage = summary)
                }
                .onFailure { throwable ->
                  actionState =
                    TopikWritingActionState(
                      errorMessage = throwable.message ?: "开始写作失败，请稍后重试",
                    )
                }
            }
          },
          modifier = Modifier.padding(horizontal = 22.dp).fillMaxWidth(),
          enabled = !actionState.isSubmitting,
        )
      }
      if (sessionId != null) {
        item {
          Surface(
            modifier = Modifier.padding(horizontal = 22.dp),
            color = HangyeolTheme.colorScheme.surface,
            shape = RoundedCornerShape(18.dp),
            border = BorderStroke(1.dp, HangyeolTheme.extendedColors.lineSoft),
          ) {
            Column(modifier = Modifier.padding(horizontal = 16.dp, vertical = 14.dp)) {
              Text(
                text = "写作草稿",
                style = HangyeolTheme.typography.bodyMedium.copy(fontSize = 14.sp, lineHeight = 18.sp, fontWeight = FontWeight.ExtraBold),
                color = HangyeolTheme.colorScheme.onSurface,
              )
              if (writingQuestions.size > 1) {
                LazyRow(
                  modifier = Modifier.fillMaxWidth().padding(top = 8.dp),
                  horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                  items(writingQuestions.size) { index ->
                    val question = writingQuestions[index]
                    val questionKey = question.number.toString()
                    val hasDraft = draftByQuestion[questionKey].orEmpty().trim().isNotBlank()
                    val isCurrent = index == safeWritingQuestionIndex
                    Surface(
                      modifier =
                        Modifier.clickable {
                          currentWritingQuestionIndex = index
                          submitSummary = null
                        },
                      color =
                        when {
                          isCurrent -> HangyeolTheme.extendedColors.tintMint
                          hasDraft -> HangyeolTheme.extendedColors.tintButter
                          else -> HangyeolTheme.colorScheme.surface
                        },
                      shape = RoundedCornerShape(999.dp),
                      border = BorderStroke(1.dp, HangyeolTheme.extendedColors.lineSoft),
                    ) {
                      Text(
                        text = "题目 ${question.number}",
                        style = HangyeolTheme.typography.bodySmall.copy(fontSize = 11.sp, lineHeight = 14.sp, fontWeight = FontWeight.SemiBold),
                        color = HangyeolTheme.colorScheme.onSurface,
                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                      )
                    }
                  }
                }
              }
              if (activeWritingQuestion?.instruction?.isNotBlank() == true) {
                Text(
                  text = "题目 ${activeWritingQuestion.number}：${activeWritingQuestion.instruction}",
                  style = HangyeolTheme.typography.bodySmall.copy(fontSize = 12.sp, lineHeight = 18.sp, fontWeight = FontWeight.Medium),
                  color = HangyeolTheme.extendedColors.subtext,
                  modifier = Modifier.padding(top = 8.dp),
                )
              }
              if (activeWritingQuestion?.contextBox?.isNotBlank() == true) {
                Text(
                  text = activeWritingQuestion.contextBox,
                  style = HangyeolTheme.typography.bodySmall.copy(fontSize = 12.sp, lineHeight = 18.sp, fontWeight = FontWeight.Medium),
                  color = HangyeolTheme.extendedColors.subtext,
                  modifier = Modifier.padding(top = 6.dp),
                )
              }
              OutlinedTextField(
                value = activeDraftText,
                onValueChange = {
                  draftByQuestion =
                    draftByQuestion.toMutableMap().apply {
                      put(activeQuestionKey, it)
                    }
                  submitSummary = null
                },
                enabled = !hasSubmittedWritingSession,
                modifier = Modifier.fillMaxWidth().padding(top = 10.dp),
                minLines = 6,
                maxLines = 10,
                placeholder = {
                  Text(
                    text = "在此输入写作答案...",
                    style = HangyeolTheme.typography.bodySmall.copy(fontSize = 13.sp, lineHeight = 18.sp),
                  )
                },
                colors =
                  OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = HangyeolTheme.extendedColors.lineSoft,
                    unfocusedBorderColor = HangyeolTheme.extendedColors.lineSoft,
                  ),
              )
              Text(
                text = "字数：${activeDraftText.trim().length}",
                style = HangyeolTheme.typography.bodySmall.copy(fontSize = 12.sp, lineHeight = 16.sp, fontWeight = FontWeight.Medium),
                color = HangyeolTheme.extendedColors.subtext,
                modifier = Modifier.padding(top = 8.dp),
              )
            }
          }
        }
        if (!hasSubmittedWritingSession) {
          item {
            KSoftPrimaryButton(
              text = if (actionState.isSubmitting) "保存中..." else "保存草稿",
              onClick = {
                val activeSessionId = sessionId.orEmpty()
                if (activeSessionId.isBlank()) {
                  return@KSoftPrimaryButton
                }
                if (nonBlankDrafts.isEmpty()) {
                  actionState = TopikWritingActionState(infoMessage = "请先输入至少一题草稿")
                  return@KSoftPrimaryButton
                }
                scope.launch {
                  actionState = TopikWritingActionState(isSubmitting = true)
                  val result =
                    repository.saveTopikWritingDraft(
                      sessionId = activeSessionId,
                      answers = nonBlankDrafts,
                    )
                  result
                    .onSuccess {
                      lastSavedDraftText = activeDraftText.trim()
                      lastSavedQuestionKey = activeQuestionKey
                      autoSaveMessage = "草稿已保存"
                      actionState = TopikWritingActionState(infoMessage = "草稿已保存（$filledDraftCount 题）")
                    }
                    .onFailure { throwable ->
                      actionState =
                        TopikWritingActionState(
                          errorMessage = throwable.message ?: "保存草稿失败，请稍后重试",
                        )
                    }
                }
              },
              modifier = Modifier.padding(horizontal = 22.dp).fillMaxWidth(),
              enabled = !actionState.isSubmitting && filledDraftCount > 0,
            )
          }
          item {
            KSoftPrimaryButton(
              text = if (actionState.isSubmitting) "提交中..." else "提交评估",
              onClick = {
                val activeSessionId = sessionId.orEmpty()
                if (activeSessionId.isBlank()) {
                  return@KSoftPrimaryButton
                }
                if (nonBlankDrafts.isEmpty()) {
                  actionState = TopikWritingActionState(infoMessage = "请先输入至少一题草稿")
                  return@KSoftPrimaryButton
                }
                scope.launch {
                  actionState = TopikWritingActionState(isSubmitting = true)
                  val saveResult =
                    repository.saveTopikWritingDraft(
                      sessionId = activeSessionId,
                      answers = nonBlankDrafts,
                    )
                  if (saveResult.isFailure) {
                    actionState =
                      TopikWritingActionState(
                        errorMessage = saveResult.exceptionOrNull()?.message ?: "保存草稿失败，请稍后重试",
                      )
                    return@launch
                  }
                  lastSavedDraftText = activeDraftText.trim()
                  lastSavedQuestionKey = activeQuestionKey
                  val result = repository.submitTopikWritingSession(activeSessionId)
                  result
                    .onSuccess { summary ->
                      hasSubmittedWritingSession = true
                      writingEvaluationError = null
                      writingEvaluationLoading = true
                      writingEvaluationRefreshToken += 1
                      submitSummary =
                        if (summary.alreadySubmitted) {
                          "会话已提交，正在评估中。"
                        } else {
                          "写作会话已提交，AI 评估已开始。"
                        }
                      actionState = TopikWritingActionState(infoMessage = "写作会话提交成功")
                    }
                    .onFailure { throwable ->
                      actionState =
                        TopikWritingActionState(
                          errorMessage = throwable.message ?: "提交失败，请稍后重试",
                        )
                    }
                }
              },
              modifier = Modifier.padding(horizontal = 22.dp).fillMaxWidth(),
              enabled = !actionState.isSubmitting && filledDraftCount > 0,
            )
          }
        } else {
          item {
            TopikWritingEvaluationSection(
              report = writingEvaluationReport,
              isLoading = writingEvaluationLoading,
              errorMessage = writingEvaluationError,
              scoreByQuestionNumber = scoreByQuestionNumber,
              retrying = writingEvaluationRetrying,
              onRefresh = {
                writingEvaluationError = null
                writingEvaluationRefreshToken += 1
              },
              onRetrigger = {
                val activeSessionId = sessionId.orEmpty()
                if (activeSessionId.isBlank() || writingEvaluationRetrying) {
                  return@TopikWritingEvaluationSection
                }
                scope.launch {
                  writingEvaluationRetrying = true
                  val result = repository.submitTopikWritingSession(activeSessionId)
                  writingEvaluationRetrying = false
                  result
                    .onSuccess {
                      submitSummary = "已重新触发 AI 评估，请稍候刷新结果。"
                      writingEvaluationError = null
                      writingEvaluationLoading = true
                      writingEvaluationRefreshToken += 1
                    }
                    .onFailure { throwable ->
                      writingEvaluationError = throwable.message ?: "重新触发评估失败，请稍后重试"
                    }
                }
              },
              modifier = Modifier.padding(horizontal = 22.dp),
            )
          }
          if (writingEvaluationReport != null && !sessionId.isNullOrBlank()) {
            item {
              TextButton(onClick = { onNavigateRoute(HangyeolDestination.WritingEvaluation.createRoute(sessionId!!)) },
                modifier = Modifier.padding(horizontal = 22.dp)) {
                Text("查看详细报告 →", style = HangyeolTheme.typography.labelMedium.copy(fontWeight = FontWeight.Bold))
              }
            }
          }
        }
      }
      items(uiState.drafts.size) { index ->
        val draft = uiState.drafts[index]
        Surface(
          modifier = Modifier.padding(horizontal = 22.dp),
          color = HangyeolTheme.colorScheme.surface,
          shape = RoundedCornerShape(18.dp),
          border = BorderStroke(1.dp, HangyeolTheme.extendedColors.lineSoft),
        ) {
          Column(modifier = Modifier.padding(horizontal = 16.dp, vertical = 14.dp)) {
            Text(
              text = draft.title,
              style = HangyeolTheme.typography.bodyMedium.copy(fontSize = 15.sp, lineHeight = 19.sp, fontWeight = FontWeight.ExtraBold),
              color = HangyeolTheme.colorScheme.onSurface,
            )
            Text(
              text = draft.subtitle,
              style = HangyeolTheme.typography.bodySmall.copy(fontSize = 12.sp, lineHeight = 16.sp, fontWeight = FontWeight.Medium),
              color = HangyeolTheme.extendedColors.subtext,
              modifier = Modifier.padding(top = 4.dp),
            )
          }
        }
      }
    }
    item {
      KSoftPrimaryButton(
        text = "返回考试中心",
        onClick = { onNavigateRoute(HangyeolDestination.Topik.pattern) },
        modifier = Modifier.padding(horizontal = 22.dp).fillMaxWidth(),
      )
    }
  }
}

@Composable
private fun TopikWritingEvaluationSection(
  report: TopikWritingEvaluationReportUiModel?,
  isLoading: Boolean,
  errorMessage: String?,
  scoreByQuestionNumber: Map<Int, Int>,
  retrying: Boolean,
  onRefresh: () -> Unit,
  onRetrigger: () -> Unit,
  modifier: Modifier = Modifier,
) {
  val status = report?.status.orEmpty()
  val statusLabel =
    when (status) {
      "EVALUATED" -> "评估完成"
      "EVALUATING" -> "AI 评估中"
      "IN_PROGRESS" -> "会话进行中"
      else -> if (isLoading) "AI 评估中" else "等待评估结果"
    }
  val hasEvaluations = report?.evaluations?.isNotEmpty() == true
  val totalMaxScore =
    if (scoreByQuestionNumber.isNotEmpty()) {
      scoreByQuestionNumber.values.sum()
    } else {
      report?.evaluations?.sumOf { resolveTopikWritingQuestionMaxScore(it.questionNumber, 0) } ?: 0
    }

  Column(
    modifier = modifier,
    verticalArrangement = Arrangement.spacedBy(10.dp),
  ) {
    Surface(
      color = HangyeolTheme.colorScheme.surface,
      shape = RoundedCornerShape(18.dp),
      border = BorderStroke(1.dp, HangyeolTheme.extendedColors.lineSoft),
    ) {
      Column(
        modifier = Modifier.padding(horizontal = 16.dp, vertical = 14.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
      ) {
        Text(
          text = "AI 写作评估报告",
          style = HangyeolTheme.typography.bodyMedium.copy(fontSize = 15.sp, lineHeight = 20.sp, fontWeight = FontWeight.ExtraBold),
          color = HangyeolTheme.colorScheme.onSurface,
        )
        Text(
          text = statusLabel,
          style = HangyeolTheme.typography.bodySmall.copy(fontSize = 12.sp, lineHeight = 16.sp, fontWeight = FontWeight.Medium),
          color = HangyeolTheme.extendedColors.subtext,
        )
        if (report != null && totalMaxScore > 0 && report.status == "EVALUATED") {
          Text(
            text = "总分：${report.totalScore} / $totalMaxScore",
            style = HangyeolTheme.typography.bodySmall.copy(fontSize = 13.sp, lineHeight = 18.sp, fontWeight = FontWeight.Bold),
            color = HangyeolTheme.colorScheme.onSurface,
          )
        }
        if (errorMessage != null) {
          Text(
            text = errorMessage,
            style = HangyeolTheme.typography.bodySmall.copy(fontSize = 12.sp, lineHeight = 16.sp, fontWeight = FontWeight.Medium),
            color = HangyeolTheme.colorScheme.error,
          )
        } else if (isLoading && !hasEvaluations) {
          Text(
            text = "正在根据 TOPIK 标准评分，通常需要 30-60 秒。",
            style = HangyeolTheme.typography.bodySmall.copy(fontSize = 12.sp, lineHeight = 16.sp, fontWeight = FontWeight.Medium),
            color = HangyeolTheme.extendedColors.subtext,
          )
        }
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
          Button(
            onClick = onRefresh,
            enabled = !retrying,
            shape = RoundedCornerShape(12.dp),
            colors =
              ButtonDefaults.buttonColors(
                containerColor = HangyeolTheme.extendedColors.tintMint,
                contentColor = HangyeolTheme.colorScheme.onSurface,
              ),
          ) {
            Text(
              text = "刷新结果",
              style = HangyeolTheme.typography.bodySmall.copy(fontSize = 12.sp, lineHeight = 14.sp, fontWeight = FontWeight.Bold),
            )
          }
          Button(
            onClick = onRetrigger,
            enabled = !retrying,
            shape = RoundedCornerShape(12.dp),
            colors =
              ButtonDefaults.buttonColors(
                containerColor = HangyeolTheme.extendedColors.tintButter,
                contentColor = HangyeolTheme.colorScheme.onSurface,
              ),
          ) {
            Text(
              text = if (retrying) "重试中..." else "重新触发评估",
              style = HangyeolTheme.typography.bodySmall.copy(fontSize = 12.sp, lineHeight = 14.sp, fontWeight = FontWeight.Bold),
            )
          }
        }
      }
    }

    if (hasEvaluations) {
      report?.evaluations?.forEach { evaluation ->
        val mappedMaxScore = scoreByQuestionNumber[evaluation.questionNumber] ?: resolveTopikWritingQuestionMaxScore(evaluation.questionNumber, 0)
        val displayMaxScore = if (mappedMaxScore > 0) mappedMaxScore else evaluation.score.coerceAtLeast(1)
        TopikWritingEvaluationQuestionCard(
          evaluation = evaluation,
          maxScore = displayMaxScore,
          answerText = report.answers[evaluation.questionNumber.toString()].orEmpty(),
        )
      }
    }
  }
}

@Composable
private fun TopikWritingEvaluationQuestionCard(
  evaluation: TopikWritingQuestionEvaluationUiModel,
  maxScore: Int,
  answerText: String,
) {
  Surface(
    color = HangyeolTheme.colorScheme.surface,
    shape = RoundedCornerShape(18.dp),
    border = BorderStroke(1.dp, HangyeolTheme.extendedColors.lineSoft),
  ) {
    Column(
      modifier = Modifier.padding(horizontal = 16.dp, vertical = 14.dp),
      verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
      Text(
        text = "第 ${evaluation.questionNumber} 题 · ${evaluation.score} / $maxScore",
        style = HangyeolTheme.typography.bodyMedium.copy(fontSize = 14.sp, lineHeight = 18.sp, fontWeight = FontWeight.ExtraBold),
        color = HangyeolTheme.colorScheme.onSurface,
      )
      TopikWritingDimensionLine("任务完成度", evaluation.dimensions.taskAccomplishment)
      TopikWritingDimensionLine("结构组织", evaluation.dimensions.developmentStructure)
      TopikWritingDimensionLine("语言使用", evaluation.dimensions.languageUse)
      evaluation.dimensions.wongojiRules?.let { wongoji ->
        TopikWritingDimensionLine("原稿纸格式", wongoji)
      }
      if (answerText.isNotBlank()) {
        Text(
          text = "你的答案：$answerText",
          style = HangyeolTheme.typography.bodySmall.copy(fontSize = 12.sp, lineHeight = 17.sp, fontWeight = FontWeight.Medium),
          color = HangyeolTheme.extendedColors.subtext,
        )
      }
      if (evaluation.correctedText.isNotBlank()) {
        Text(
          text = "参考优化：${evaluation.correctedText}",
          style = HangyeolTheme.typography.bodySmall.copy(fontSize = 12.sp, lineHeight = 17.sp, fontWeight = FontWeight.Medium),
          color = HangyeolTheme.extendedColors.subtext,
        )
      }
      if (evaluation.feedbackText.isNotBlank()) {
        Text(
          text = "AI 反馈：${evaluation.feedbackText}",
          style = HangyeolTheme.typography.bodySmall.copy(fontSize = 12.sp, lineHeight = 17.sp, fontWeight = FontWeight.Medium),
          color = HangyeolTheme.colorScheme.onSurface,
        )
      }
    }
  }
}

@Composable
private fun TopikWritingDimensionLine(
  label: String,
  value: Int,
) {
  Text(
    text = "$label：$value/100",
    style = HangyeolTheme.typography.bodySmall.copy(fontSize = 12.sp, lineHeight = 16.sp, fontWeight = FontWeight.Medium),
    color = HangyeolTheme.extendedColors.subtext,
  )
}

private fun resolveTopikWritingQuestionMaxScore(
  questionNumber: Int,
  fallback: Int,
): Int {
  return when (questionNumber) {
    51, 52 -> 10
    53 -> 30
    54 -> 50
    else -> fallback.coerceAtLeast(0)
  }
}

@Composable
private fun LearningCurrentCourseCard(
  title: String,
  subtitle: String,
  progress: Int,
  completedHours: Int?,
  totalHours: Int?,
  etaDays: Int?,
  onClick: () -> Unit,
) {
  val spacing = HangyeolTheme.spacing
  Surface(
    modifier = Modifier.fillMaxWidth().clickable(onClick = onClick),
    color = Color.Transparent,
    shape = RoundedCornerShape(28.dp),
    border = BorderStroke(1.dp, HangyeolTheme.extendedColors.lineSoft),
    shadowElevation = 4.dp,
  ) {
    Column(
      modifier =
        Modifier
          .background(
            brush =
              Brush.linearGradient(
                colors = listOf(Color(0xFFEEDFA6), Color(0xF5F1DCC7)),
              ),
            shape = RoundedCornerShape(28.dp),
          )
          .padding(spacing.xl),
      verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
      Row(horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
        Column(modifier = Modifier.weight(1f)) {
          Surface(color = HangyeolTheme.colorScheme.primary, shape = RoundedCornerShape(999.dp)) {
            Text(
              text = "进行中 · $progress%",
              style = HangyeolTheme.typography.bodySmall.copy(fontSize = 12.sp, lineHeight = 14.sp, fontWeight = FontWeight.ExtraBold),
              color = HangyeolTheme.colorScheme.onPrimary,
              modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
            )
          }
          Spacer(modifier = Modifier.height(12.dp))
          Text(text = title, style = HangyeolTheme.typography.headlineSmall.copy(fontWeight = FontWeight.ExtraBold))
          Spacer(modifier = Modifier.height(4.dp))
          Text(text = subtitle, style = HangyeolTheme.typography.bodyMedium.copy(fontWeight = FontWeight.SemiBold), color = HangyeolTheme.extendedColors.subtext)
        }
        Surface(color = HangyeolTheme.colorScheme.primary, shape = RoundedCornerShape(10.dp), modifier = Modifier.size(52.dp)) {
          Box(contentAlignment = androidx.compose.ui.Alignment.Center) {
            Text(text = "級", style = HangyeolTheme.typography.headlineSmall.copy(fontFamily = FontFamily.Serif, fontWeight = FontWeight.Black), color = HangyeolTheme.colorScheme.onPrimary)
          }
        }
      }
      Box(modifier = Modifier.fillMaxWidth()) {
        Surface(color = Color.Black.copy(alpha = 0.14f), shape = RoundedCornerShape(999.dp), modifier = Modifier.fillMaxWidth()) {
          Spacer(modifier = Modifier.height(6.dp))
        }
        Surface(
          color = HangyeolTheme.colorScheme.primary,
          shape = RoundedCornerShape(999.dp),
          modifier = Modifier.fillMaxWidth((progress / 100f).coerceIn(0f, 1f)),
        ) {
          Spacer(modifier = Modifier.height(6.dp))
        }
      }
      if (completedHours != null && totalHours != null && etaDays != null) {
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
          Text(text = "$completedHours / $totalHours 课时", style = HangyeolTheme.typography.bodySmall.copy(fontWeight = FontWeight.Bold), color = HangyeolTheme.extendedColors.subtext)
          Text(text = "预计 $etaDays 日", style = HangyeolTheme.typography.bodySmall.copy(fontWeight = FontWeight.Bold), color = HangyeolTheme.extendedColors.subtext)
        }
      }
    }
  }
}

@Composable
private fun JourneyTimeline(
  items: List<com.hangyeol.app.compose.data.LearningJourneyUnit>,
  onNavigateRoute: (String) -> Unit,
) {
  val spacing = HangyeolTheme.spacing
  Card(
    colors = CardDefaults.cardColors(containerColor = HangyeolTheme.colorScheme.surface),
    shape = RoundedCornerShape(28.dp),
    border = BorderStroke(1.dp, HangyeolTheme.extendedColors.lineSoft),
    elevation = CardDefaults.cardElevation(defaultElevation = 4.dp),
  ) {
    Column(modifier = Modifier.padding(horizontal = 18.dp, vertical = 18.dp), verticalArrangement = Arrangement.spacedBy(18.dp)) {
      items.forEachIndexed { index, unit ->
        Row(
          modifier = Modifier.fillMaxWidth().clickable { onNavigateRoute(resolveRoute(unit.route)) },
          horizontalArrangement = Arrangement.spacedBy(14.dp),
        ) {
          Column(horizontalAlignment = androidx.compose.ui.Alignment.CenterHorizontally) {
            Surface(
              color = when {
                unit.progress >= 1f -> HangyeolTheme.extendedColors.tintMint
                unit.progress > 0f -> HangyeolTheme.extendedColors.tintPink
                else -> Color(0xFFF4ECE7)
              },
              shape = RoundedCornerShape(22.dp),
              border = if (unit.progress >= 1f) BorderStroke(2.dp, HangyeolTheme.colorScheme.background) else null,
              modifier = Modifier.size(44.dp),
            ) {
              Box(contentAlignment = androidx.compose.ui.Alignment.Center) {
                Text(
                  text = unit.seal,
                  style = HangyeolTheme.typography.titleMedium.copy(fontFamily = FontFamily.Serif, fontWeight = FontWeight.Bold),
                )
              }
            }
            if (index != items.lastIndex) {
              Surface(color = HangyeolTheme.extendedColors.lineSoft, modifier = Modifier.width(2.dp).height(42.dp)) {}
            }
          }
          Column(modifier = Modifier.weight(1f)) {
            Text(text = "UNIT ${unit.number.toString().padStart(2, '0')}", style = HangyeolTheme.typography.bodySmall.copy(fontWeight = FontWeight.Bold), color = HangyeolTheme.extendedColors.subtext)
            Spacer(modifier = Modifier.height(2.dp))
            Text(text = unit.title, style = HangyeolTheme.typography.headlineSmall.copy(fontSize = 20.sp, lineHeight = 24.sp, fontWeight = FontWeight.ExtraBold))
            Text(text = unit.subtitle, style = HangyeolTheme.typography.bodyMedium.copy(fontWeight = FontWeight.SemiBold), color = HangyeolTheme.extendedColors.subtext)
            if (unit.progress in 0.01f..0.99f) {
              Spacer(modifier = Modifier.height(8.dp))
              Box(modifier = Modifier.fillMaxWidth()) {
                Surface(color = HangyeolTheme.extendedColors.lineSoft, shape = RoundedCornerShape(999.dp), modifier = Modifier.fillMaxWidth()) {
                  Spacer(modifier = Modifier.height(4.dp))
                }
                Surface(color = HangyeolTheme.colorScheme.secondary, shape = RoundedCornerShape(999.dp), modifier = Modifier.fillMaxWidth(unit.progress.coerceIn(0f, 1f))) {
                  Spacer(modifier = Modifier.height(4.dp))
                }
              }
            }
          }
        }
      }
    }
  }
}

@Composable
private fun ShortcutGrid(
  shortcuts: List<LearningToolShortcut>,
  onNavigateRoute: (String) -> Unit,
) {
  Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
    shortcuts.chunked(2).forEach { rowItems ->
      Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
        rowItems.forEach { shortcut ->
          Card(
            modifier = Modifier.weight(1f).clickable { onNavigateRoute(resolveRoute(shortcut.route)) },
            colors = CardDefaults.cardColors(containerColor = HangyeolTheme.colorScheme.surface),
            shape = RoundedCornerShape(22.dp),
            border = BorderStroke(1.dp, HangyeolTheme.extendedColors.lineSoft),
            elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
          ) {
            Column(modifier = Modifier.heightIn(min = 126.dp).padding(16.dp), verticalArrangement = Arrangement.SpaceBetween) {
              Surface(color = shortcutAccent(shortcut.accent), shape = RoundedCornerShape(8.dp), modifier = Modifier.size(42.dp)) {
                Box(contentAlignment = androidx.compose.ui.Alignment.Center) {
                  Text(text = shortcut.seal, style = HangyeolTheme.typography.titleMedium.copy(fontFamily = FontFamily.Serif, fontWeight = FontWeight.Bold))
                }
              }
              Column {
                Text(text = shortcut.label, style = HangyeolTheme.typography.titleMedium.copy(fontWeight = FontWeight.ExtraBold))
                Text(text = shortcut.subtitle, style = HangyeolTheme.typography.bodySmall.copy(fontWeight = FontWeight.SemiBold), color = HangyeolTheme.extendedColors.subtext)
              }
            }
          }
        }
        if (rowItems.size == 1) {
          Spacer(modifier = Modifier.weight(1f))
        }
      }
    }
  }
}

@Composable
private fun GrammarDeckCard(
  deck: GrammarDeckUiModel,
  accentIndex: Int = 0,
  onClick: () -> Unit,
) {
  val tones =
    listOf(
      HangyeolTheme.extendedColors.tintMint,
      HangyeolTheme.extendedColors.tintPink,
      HangyeolTheme.extendedColors.tintButter,
      HangyeolTheme.extendedColors.tintLilac,
    )
  val accent = tones[accentIndex % tones.size]
  val progressLabel =
    when {
      deck.progress >= 100 -> "已完成"
      deck.progress > 0 -> "学习中"
      else -> "待开始"
    }
  Surface(
    modifier = Modifier.fillMaxWidth().clickable(enabled = !deck.isLocked, onClick = onClick),
    color = HangyeolTheme.colorScheme.surface,
    shape = RoundedCornerShape(24.dp),
    border = BorderStroke(1.dp, HangyeolTheme.extendedColors.lineSoft),
    shadowElevation = 3.dp,
  ) {
    Row(
      modifier = Modifier.padding(horizontal = 18.dp, vertical = 18.dp),
      horizontalArrangement = Arrangement.spacedBy(14.dp),
      verticalAlignment = androidx.compose.ui.Alignment.CenterVertically,
    ) {
      KSoftHanjaSeal(
        c =
          when {
            deck.isLocked -> "鎖"
            deck.progress >= 100 -> "成"
            else -> "文"
          },
        size = 56,
        bg = accent,
        color = if (deck.progress >= 100) HangyeolTheme.extendedColors.jade else HangyeolTheme.extendedColors.crimson,
        round = 16,
      )
      Column(modifier = Modifier.weight(1f)) {
        Row(
          modifier = Modifier.fillMaxWidth(),
          horizontalArrangement = Arrangement.spacedBy(8.dp),
          verticalAlignment = androidx.compose.ui.Alignment.CenterVertically,
        ) {
          Text(
            text = deck.title,
            style = HangyeolTheme.typography.titleMedium.copy(fontSize = 18.sp, lineHeight = 22.sp, fontWeight = FontWeight.ExtraBold),
            color = HangyeolTheme.colorScheme.onSurface,
            modifier = Modifier.weight(1f),
          )
          if (deck.isLocked) {
            CapsuleBadge(text = "锁定", container = HangyeolTheme.extendedColors.lineSoft, content = HangyeolTheme.extendedColors.subtext)
          }
        }
        Text(
          text = "${deck.level} · ${deck.itemCount} 条语法",
          style = HangyeolTheme.typography.bodySmall.copy(fontSize = 12.sp, lineHeight = 16.sp, fontWeight = FontWeight.Medium),
          color = HangyeolTheme.extendedColors.subtext,
          modifier = Modifier.padding(top = 4.dp),
        )
        Text(
          text = deck.subtitle,
          style = HangyeolTheme.typography.bodySmall.copy(fontSize = 12.sp, lineHeight = 16.sp, fontWeight = FontWeight.Medium),
          color = HangyeolTheme.colorScheme.onSurfaceVariant,
          modifier = Modifier.padding(top = 4.dp),
        )
        Row(
          modifier = Modifier.fillMaxWidth().padding(top = 8.dp),
          horizontalArrangement = Arrangement.SpaceBetween,
        ) {
          Text(
            text = progressLabel,
            style = HangyeolTheme.typography.labelSmall.copy(fontSize = 11.sp, lineHeight = 13.sp, fontWeight = FontWeight.Medium),
            color = HangyeolTheme.extendedColors.subtext,
          )
          Text(
            text = "${deck.progress}%",
            style = HangyeolTheme.typography.labelSmall.copy(fontSize = 11.sp, lineHeight = 13.sp, fontWeight = FontWeight.Medium),
            color = HangyeolTheme.extendedColors.subtext,
          )
        }
        Box(modifier = Modifier.fillMaxWidth().padding(top = 6.dp)) {
          Surface(
            color = HangyeolTheme.extendedColors.lineSoft,
            shape = RoundedCornerShape(999.dp),
            modifier = Modifier.fillMaxWidth(),
          ) {
            Spacer(modifier = Modifier.height(5.dp))
          }
          Surface(
            color = HangyeolTheme.colorScheme.onSurface,
            shape = RoundedCornerShape(999.dp),
            modifier = Modifier.fillMaxWidth((deck.progress / 100f).coerceIn(0f, 1f)),
          ) {
            Spacer(modifier = Modifier.height(5.dp))
          }
        }
      }
      Surface(
        modifier = Modifier.size(36.dp),
        color = if (deck.progress >= 100) HangyeolTheme.extendedColors.tintMint else HangyeolTheme.colorScheme.onSurface,
        shape = RoundedCornerShape(18.dp),
      ) {
        Box(contentAlignment = androidx.compose.ui.Alignment.Center) {
          Text(
            text = "›",
            style = HangyeolTheme.typography.bodyMedium.copy(fontSize = 18.sp, lineHeight = 18.sp, fontWeight = FontWeight.Bold),
            color = if (deck.progress >= 100) HangyeolTheme.colorScheme.onSurface else HangyeolTheme.colorScheme.surface,
          )
        }
      }
    }
  }
}

@Composable
private fun GrammarHubToolCard(
  modifier: Modifier = Modifier,
  shortcut: LearningToolShortcut,
  onClick: () -> Unit,
) {
  Card(
    modifier = modifier.clickable(onClick = onClick),
    colors = CardDefaults.cardColors(containerColor = HangyeolTheme.colorScheme.surface),
    shape = RoundedCornerShape(22.dp),
    border = BorderStroke(1.dp, HangyeolTheme.extendedColors.lineSoft),
    elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
  ) {
    Column(
      modifier = Modifier.heightIn(min = 126.dp).padding(16.dp),
      verticalArrangement = Arrangement.SpaceBetween,
    ) {
      Surface(
        color = shortcutAccent(shortcut.accent),
        shape = RoundedCornerShape(8.dp),
        modifier = Modifier.size(34.dp),
      ) {
        Box(contentAlignment = androidx.compose.ui.Alignment.Center) {
          Text(
            text = shortcut.seal,
            style = HangyeolTheme.typography.bodyMedium.copy(fontFamily = FontFamily.Serif, fontSize = 18.sp, lineHeight = 18.sp, fontWeight = FontWeight.Medium),
            color = HangyeolTheme.colorScheme.onSurface,
          )
        }
      }
      Column(modifier = Modifier.padding(top = 12.dp)) {
        Text(
          text = shortcut.label,
          style = HangyeolTheme.typography.bodyMedium.copy(fontSize = 14.sp, lineHeight = 18.sp, fontWeight = FontWeight.ExtraBold),
          color = HangyeolTheme.colorScheme.onSurface,
        )
        Text(
          text = shortcut.subtitle,
          style = HangyeolTheme.typography.bodySmall.copy(fontSize = 12.sp, lineHeight = 16.sp, fontWeight = FontWeight.Medium),
          color = HangyeolTheme.extendedColors.subtext,
          modifier = Modifier.padding(top = 2.dp),
        )
      }
    }
  }
}

@Composable
private fun GrammarPointCard(
  title: String,
  summary: String,
  status: String,
  proficiency: Int,
) {
  val tone =
    when (status) {
      "MASTERED" -> HangyeolTheme.extendedColors.tintMint
      "LEARNING" -> HangyeolTheme.extendedColors.tintButter
      else -> HangyeolTheme.extendedColors.lineSoft
    }
  val spacing = HangyeolTheme.spacing
  Card(colors = CardDefaults.cardColors(containerColor = HangyeolTheme.colorScheme.surface), elevation = CardDefaults.cardElevation(defaultElevation = 3.dp)) {
    Column(modifier = Modifier.padding(spacing.lg), verticalArrangement = Arrangement.spacedBy(spacing.sm)) {
      Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
        Text(text = title, style = HangyeolTheme.typography.titleMedium)
        CapsuleBadge(text = status, container = tone, content = HangyeolTheme.colorScheme.primary)
      }
      Text(text = summary, style = HangyeolTheme.typography.bodySmall, color = HangyeolTheme.extendedColors.subtext)
      Text(text = "熟练度 $proficiency%", style = HangyeolTheme.typography.bodySmall, color = HangyeolTheme.extendedColors.subtext)
      Surface(color = HangyeolTheme.extendedColors.lineSoft, shape = RoundedCornerShape(999.dp)) {
        Spacer(modifier = Modifier.fillMaxWidth().height(4.dp))
      }
      Surface(color = HangyeolTheme.colorScheme.secondary, shape = RoundedCornerShape(999.dp), modifier = Modifier.fillMaxWidth((proficiency / 100f).coerceIn(0f, 1f))) {
        Spacer(modifier = Modifier.height(4.dp))
      }
    }
  }
}

private fun grammarMarkdownToDisplay(markdown: String): String {
  if (markdown.isBlank()) return ""
  return markdown
    .replace(Regex("(?m)^\\s{0,3}#{1,6}\\s*"), "")
    .replace("**", "")
    .replace("__", "")
    .replace("`", "")
    .replace(Regex("(?m)^\\s*[-*+]\\s+"), "• ")
    .replace(Regex("(?m)^\\s*\\d+\\.\\s+"), "• ")
    .replace(Regex("\\n{3,}"), "\n\n")
    .trim()
}

private data class GrammarExplanationSection(
  val title: String,
  val body: String,
)

private fun grammarExplanationSections(explanation: String): List<GrammarExplanationSection> {
  if (explanation.isBlank()) return emptyList()
  val blocks = explanation.split(Regex("\\n\\s*\\n")).map { it.trim() }.filter { it.isNotBlank() }
  return blocks.mapIndexed { index, block ->
    val lines = block.lines().map { it.trim() }.filter { it.isNotBlank() }
    if (lines.isEmpty()) {
      GrammarExplanationSection(title = "", body = "")
    } else {
      val first = lines.first()
      val looksLikeHeading =
        first.endsWith("：") ||
          first.endsWith(":") ||
          first.startsWith("•") ||
          first.length <= 18
      if (looksLikeHeading && lines.size >= 2) {
        GrammarExplanationSection(
          title = first.removePrefix("•").trimEnd(':', '：').trim(),
          body = lines.drop(1).joinToString("\n"),
        )
      } else {
        GrammarExplanationSection(
          title = if (blocks.size > 1) "段落 ${index + 1}" else "",
          body = lines.joinToString("\n"),
        )
      }
    }
  }.filter { it.body.isNotBlank() }
}

private data class GrammarPracticeQuizRow(
  val key: String,
  val grammarId: String,
  val title: String,
  val prompt: String,
  val answer: String,
)

private data class GrammarPracticeGradedRow(
  val grammarId: String,
  val isCorrect: Boolean,
)

private fun grammarPracticeAnswerMatch(userAnswerRaw: String, expectedRaw: String): Boolean {
  val userAnswer =
    userAnswerRaw
      .trim()
      .lowercase()
      .replace(Regex("\\s+"), " ")
      .replace(Regex("[.,!?;:，。！？；：]"), "")
  val expected =
    expectedRaw
      .trim()
      .lowercase()
      .replace(Regex("\\s+"), " ")
      .replace(Regex("[.,!?;:，。！？；：]"), "")
  if (expected.isBlank()) return false
  return userAnswer == expected || userAnswer.contains(expected) || expected.contains(userAnswer)
}

@Composable
private fun TopikFilterRow(
  active: TopikFilter,
  onSelect: (TopikFilter) -> Unit,
) {
  Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
    listOf(
      TopikFilter.ALL to "全部",
      TopikFilter.READING to "阅读",
      TopikFilter.LISTENING to "听力",
      TopikFilter.WRITING to "写作",
    ).forEach { (filter, label) ->
      Surface(
        modifier = Modifier.clickable { onSelect(filter) },
        color = if (active == filter) HangyeolTheme.colorScheme.onSurface else HangyeolTheme.colorScheme.surface,
        shape = RoundedCornerShape(999.dp),
        border = BorderStroke(1.dp, if (active == filter) HangyeolTheme.colorScheme.onSurface else HangyeolTheme.extendedColors.lineSoft),
      ) {
        Text(
          text = label,
          style = HangyeolTheme.typography.bodySmall.copy(fontSize = 12.sp, lineHeight = 16.sp, fontWeight = FontWeight.SemiBold),
          color = if (active == filter) HangyeolTheme.colorScheme.surface else HangyeolTheme.colorScheme.onSurface,
          modifier = Modifier.padding(horizontal = 14.dp, vertical = 10.dp),
        )
      }
    }
  }
}

@Composable
private fun TopikExamCard(
  exam: com.hangyeol.app.compose.data.TopikExamUiModel,
  onOpen: () -> Unit,
  onOpenPricing: () -> Unit,
) {
  val tone =
    when (exam.type) {
      TopikType.READING -> HangyeolTheme.extendedColors.tintButter
      TopikType.LISTENING -> HangyeolTheme.extendedColors.tintLilac
      TopikType.WRITING -> HangyeolTheme.extendedColors.tintPink
    }
  Surface(
    color = tone,
    shape = RoundedCornerShape(24.dp),
    border = BorderStroke(1.dp, HangyeolTheme.extendedColors.lineSoft.copy(alpha = 0.6f)),
    shadowElevation = 3.dp,
  ) {
    Column(modifier = Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
      Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = androidx.compose.ui.Alignment.Top,
      ) {
        Row(
          modifier = Modifier.weight(1f),
          horizontalArrangement = Arrangement.spacedBy(8.dp),
          verticalAlignment = androidx.compose.ui.Alignment.CenterVertically,
        ) {
          Surface(
            color = HangyeolTheme.colorScheme.surface,
            shape = RoundedCornerShape(12.dp),
            modifier = Modifier.widthIn(min = 32.dp).height(32.dp),
          ) {
            Box(contentAlignment = androidx.compose.ui.Alignment.Center) {
              Text(
                text =
                  when (exam.type) {
                    TopikType.READING -> "讀"
                    TopikType.LISTENING -> "聽"
                    TopikType.WRITING -> "述"
                  },
                style = HangyeolTheme.typography.bodyMedium.copy(fontFamily = FontFamily.Serif, fontSize = 18.sp, lineHeight = 18.sp, fontWeight = FontWeight.Medium),
                color = HangyeolTheme.extendedColors.crimson,
                modifier = Modifier.padding(horizontal = 8.dp),
              )
            }
          }
          Column(modifier = Modifier.weight(1f)) {
            Text(
              text = exam.title,
              style = HangyeolTheme.typography.titleMedium.copy(fontSize = 18.sp, lineHeight = 22.sp, fontWeight = FontWeight.ExtraBold),
              color = HangyeolTheme.colorScheme.onSurface,
            )
            Text(
              text =
                when (exam.type) {
                  TopikType.READING -> "Read · 阅读"
                  TopikType.LISTENING -> "Listen · 听力"
                  TopikType.WRITING -> "Write · 写作"
                },
              style = HangyeolTheme.typography.bodySmall.copy(fontSize = 12.sp, lineHeight = 16.sp, fontWeight = FontWeight.Medium),
              color = HangyeolTheme.extendedColors.subtext,
              modifier = Modifier.padding(top = 2.dp),
            )
          }
        }
        CapsuleBadge(
          text = exam.level,
          container = if (exam.isLocked) HangyeolTheme.extendedColors.lineSoft else HangyeolTheme.colorScheme.onSurface,
          content = if (exam.isLocked) HangyeolTheme.extendedColors.subtext else HangyeolTheme.colorScheme.surface,
        )
      }
      Text(
        text = if (exam.questionCount > 0) "${exam.questionCount} 题 · ${exam.durationMinutes} 分钟" else "${exam.durationMinutes} 分钟",
        style = HangyeolTheme.typography.bodySmall.copy(fontSize = 13.sp, lineHeight = 17.sp, fontWeight = FontWeight.Medium),
        color = HangyeolTheme.extendedColors.subtext,
      )
      Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        if (exam.bestScore > 0) {
          CapsuleBadge(text = "最高 ${exam.bestScore}%", container = HangyeolTheme.colorScheme.surface, content = HangyeolTheme.colorScheme.primary)
        }
        CapsuleBadge(
          text = if (exam.questionCount > 0) "${exam.questionCount} Q" else if (exam.type == TopikType.WRITING) "WRITING" else "TOPIK",
          container = HangyeolTheme.colorScheme.surface,
          content = HangyeolTheme.colorScheme.primary,
        )
        if (exam.isLocked) {
          CapsuleBadge(text = "PRO", container = HangyeolTheme.colorScheme.surface, content = HangyeolTheme.colorScheme.primary)
        }
      }
      Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
        PrimaryButton(
          text = if (exam.isLocked) "高级版解锁" else if (exam.type == TopikType.WRITING) "开始写作" else "开始考试",
          onClick = if (exam.isLocked) onOpenPricing else onOpen,
        )
        if (exam.isLocked) {
          Surface(
            modifier = Modifier.weight(0.56f).clickable { onOpenPricing() },
            color = Color.Transparent,
            shape = RoundedCornerShape(999.dp),
            border = BorderStroke(1.dp, HangyeolTheme.colorScheme.onSurface),
          ) {
            Box(
              modifier = Modifier.fillMaxWidth().padding(vertical = 12.dp),
              contentAlignment = androidx.compose.ui.Alignment.Center,
            ) {
              Text(
                text = "看方案",
                style = HangyeolTheme.typography.bodySmall.copy(fontSize = 13.sp, lineHeight = 16.sp, fontWeight = FontWeight.Bold),
                color = HangyeolTheme.colorScheme.onSurface,
              )
            }
          }
        }
      }
    }
  }
}

@Composable
private fun TopikHistoryCard(
  entries: List<Triple<String, String, String>>,
  onOpenHistory: () -> Unit,
) {
  Card(colors = CardDefaults.cardColors(containerColor = HangyeolTheme.colorScheme.surface), elevation = CardDefaults.cardElevation(defaultElevation = 4.dp)) {
    Column {
      if (entries.isEmpty()) {
        Box(
          modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 20.dp),
          contentAlignment = androidx.compose.ui.Alignment.Center,
        ) {
          Text(
            text = "历史成绩。",
            style = HangyeolTheme.typography.bodySmall.copy(fontSize = 13.sp, lineHeight = 17.sp, fontWeight = FontWeight.Medium),
            color = HangyeolTheme.extendedColors.subtext,
          )
        }
      }
      entries.forEachIndexed { index, entry ->
        Row(
          modifier = Modifier.fillMaxWidth().clickable { onOpenHistory() }.padding(horizontal = 20.dp, vertical = 14.dp),
          horizontalArrangement = Arrangement.spacedBy(14.dp),
          verticalAlignment = androidx.compose.ui.Alignment.CenterVertically,
        ) {
          Column(modifier = Modifier.weight(1f)) {
            Text(
              text = entry.first,
              style = HangyeolTheme.typography.bodyMedium.copy(fontSize = 15.sp, lineHeight = 18.sp, fontWeight = FontWeight.ExtraBold),
              color = HangyeolTheme.colorScheme.onSurface,
            )
            Text(
              text = entry.second,
              style = HangyeolTheme.typography.bodySmall.copy(fontSize = 12.sp, lineHeight = 16.sp, fontWeight = FontWeight.Medium),
              color = HangyeolTheme.extendedColors.subtext,
              modifier = Modifier.padding(top = 3.dp),
            )
          }
          CapsuleBadge(text = entry.third, container = HangyeolTheme.extendedColors.tintButter, content = HangyeolTheme.colorScheme.primary)
        }
        if (index != entries.lastIndex) {
          HorizontalDivider(color = HangyeolTheme.extendedColors.lineSoft)
        }
      }
    }
  }
}

@Composable
private fun MediaHubScreen(
  onNavigateRoute: (String) -> Unit,
) {
  val podcastViewModel: PodcastLibraryViewModel =
    viewModel(factory = PodcastLibraryViewModel.factory(ComposeServiceLocator.contentRepository))
  val podcastState by podcastViewModel.uiState.collectAsStateWithLifecycle()
  val spacing = HangyeolTheme.spacing
  val mediaTabs =
    listOf(
      Triple("聲", "播客", true),
      Triple("映", "视频", false),
      Triple("讀", "阅读", false),
    )
  val latestTitle = podcastState.featuredTitle.trim()
  val latestSubtitle = podcastState.featuredSubtitle.trim()
  val hasNowPlaying =
    !podcastState.isLoading &&
      podcastState.errorMessage == null &&
      latestTitle.isNotBlank()
  LazyColumn(
    modifier =
      Modifier
        .fillMaxSize()
        .background(HangyeolTheme.colorScheme.background)
        .statusBarsPadding()
        .padding(horizontal = spacing.lg),
    verticalArrangement = Arrangement.spacedBy(spacing.lg),
    contentPadding = PaddingValues(bottom = spacing.xl),
  ) {
    item {
      Column(
        modifier =
          Modifier
            .fillMaxWidth()
            .background(
              brush =
                Brush.verticalGradient(
                  colors = listOf(Color(0x16B38941), HangyeolTheme.colorScheme.background),
                ),
            )
            .padding(top = spacing.md, bottom = 20.dp),
      ) {
        Text(text = "沒 · IMMERSE", style = HangyeolTheme.typography.labelSmall, color = HangyeolTheme.colorScheme.secondary)
        Spacer(modifier = Modifier.height(4.dp))
        Text(text = "沉浸", style = HangyeolTheme.typography.headlineMedium.copy(fontSize = 30.sp, lineHeight = 34.sp, fontWeight = FontWeight.ExtraBold))
        Spacer(modifier = Modifier.height(4.dp))
        Text(text = "走进真实的韩语世界", style = HangyeolTheme.typography.bodyMedium, color = HangyeolTheme.extendedColors.subtext)
      }
    }
    item {
      KSoftSectionHead(kanji = "續", title = "继续收听")
    }
    if (podcastState.isLoading) {
      item {
        BaselineCard(title = "正在加载媒体数据", body = "播客、播放记录和推荐内容正在从 Convex 同步。")
      }
    }
    podcastState.errorMessage?.let { errorMessage ->
      item {
        BaselineCard(
          title = "媒体数据加载失败",
          body = errorMessage,
          actionLabel = "重试",
          onAction = podcastViewModel::refresh,
        )
      }
    }
    item {
      if (hasNowPlaying) {
        Surface(
          modifier = Modifier.fillMaxWidth().clickable { onNavigateRoute(HangyeolDestination.PodcastPlayer.createRoute()) },
          color = HangyeolTheme.colorScheme.surface,
          shape = RoundedCornerShape(28.dp),
          border = BorderStroke(1.dp, HangyeolTheme.extendedColors.lineSoft),
          shadowElevation = 4.dp,
        ) {
          Column {
            Box(
              modifier =
                Modifier
                  .fillMaxWidth()
                  .height(140.dp)
                  .background(
                    brush =
                      Brush.linearGradient(
                        colors = listOf(HangyeolTheme.extendedColors.indigo, HangyeolTheme.extendedColors.crimson.copy(alpha = 0.8f)),
                      ),
                  )
                  .padding(18.dp),
            ) {
              Canvas(modifier = Modifier.matchParentSize()) {
                val stripeColor = Color.White.copy(alpha = 0.06f)
                val step = 18.dp.toPx()
                var startX = -size.height
                while (startX < size.width + size.height) {
                  drawLine(
                    color = stripeColor,
                    start = Offset(startX, size.height),
                    end = Offset(startX + size.height, 0f),
                    strokeWidth = 1.dp.toPx(),
                  )
                  startX += step
                }
              }
              Text(
                text = "話",
                style =
                  HangyeolTheme.typography.displayLarge.copy(
                    fontFamily = FontFamily.Serif,
                    fontSize = 72.sp,
                    lineHeight = 72.sp,
                    fontWeight = FontWeight.Medium,
                  ),
                color = Color.White.copy(alpha = 0.12f),
                modifier = Modifier.align(androidx.compose.ui.Alignment.TopEnd).offset(x = (-2).dp, y = (-8).dp),
              )
              Column(modifier = Modifier.align(androidx.compose.ui.Alignment.BottomStart)) {
                Surface(color = HangyeolTheme.colorScheme.primary, shape = RoundedCornerShape(999.dp)) {
                  Text(
                    text = "播放记录",
                    style = HangyeolTheme.typography.bodySmall.copy(fontSize = 11.sp, lineHeight = 13.sp, fontWeight = FontWeight.ExtraBold),
                    color = HangyeolTheme.colorScheme.onPrimary,
                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 5.dp),
                  )
                }
                Text(
                  text = latestTitle,
                  style = HangyeolTheme.typography.titleMedium.copy(fontSize = 18.sp, lineHeight = 22.sp, fontWeight = FontWeight.ExtraBold),
                  color = HangyeolTheme.colorScheme.surface,
                  modifier = Modifier.padding(top = 8.dp),
                  maxLines = 2,
                  overflow = TextOverflow.Ellipsis,
                )
                if (latestSubtitle.isNotBlank()) {
                  Text(
                    text = latestSubtitle,
                    style = HangyeolTheme.typography.bodySmall.copy(fontWeight = FontWeight.SemiBold),
                    color = Color.White.copy(alpha = 0.75f),
                    modifier = Modifier.padding(top = 4.dp),
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                  )
                }
              }
            }
            Row(
              modifier = Modifier.fillMaxWidth().padding(horizontal = 18.dp, vertical = 14.dp),
              horizontalArrangement = Arrangement.spacedBy(12.dp),
              verticalAlignment = androidx.compose.ui.Alignment.CenterVertically,
            ) {
              Column(modifier = Modifier.weight(1f)) {
                Text(
                  text = if (podcastState.transcriptPrimary.isBlank()) "暂无当前字幕" else podcastState.transcriptPrimary,
                  style = HangyeolTheme.typography.bodySmall.copy(fontSize = 12.sp, lineHeight = 16.sp, fontWeight = FontWeight.Bold),
                  color = HangyeolTheme.extendedColors.subtext,
                  maxLines = 2,
                  overflow = TextOverflow.Ellipsis,
                )
                Text(
                  text = listOf(podcastState.elapsedLabel, podcastState.remainingLabel).filter { it.isNotBlank() }.joinToString(" / ").ifBlank { "播放进度待同步" },
                  style = HangyeolTheme.typography.bodySmall.copy(fontSize = 10.sp, lineHeight = 12.sp, fontWeight = FontWeight.Bold),
                  color = HangyeolTheme.extendedColors.subtext,
                  modifier = Modifier.padding(top = 6.dp),
                )
              }
              Surface(
                modifier = Modifier.size(44.dp),
                color = HangyeolTheme.colorScheme.primary,
                shape = RoundedCornerShape(22.dp),
              ) {
                Box(contentAlignment = androidx.compose.ui.Alignment.Center) {
                  Text(
                    text = "▶",
                    style = HangyeolTheme.typography.titleMedium.copy(fontSize = 16.sp, lineHeight = 16.sp, fontWeight = FontWeight.Black),
                    color = HangyeolTheme.colorScheme.onPrimary,
                    modifier = Modifier.offset(x = 1.dp),
                  )
                }
              }
            }
          }
        }
      } else if (!podcastState.isLoading && podcastState.errorMessage == null) {
        BaselineCard(
          title = "暂无继续收听记录",
          body = "播放历史为空时不显示样例播客；可以打开播客库或搜索真实节目。",
          actionLabel = "搜索播客",
          onAction = { onNavigateRoute(HangyeolDestination.PodcastSearch.pattern) },
        )
      }
    }
    item {
      Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
        mediaTabs.forEach { (kanji, label, active) ->
          Surface(
            modifier =
              Modifier
                .weight(1f)
                .clickable {
                  onNavigateRoute(
                    when (label) {
                      "视频" -> HangyeolDestination.Videos.pattern
                      "阅读" -> HangyeolDestination.Reading.pattern
                      else -> HangyeolDestination.Podcasts.pattern
                    },
                  )
                },
            color = if (active) HangyeolTheme.colorScheme.primary else HangyeolTheme.colorScheme.surface,
            shape = RoundedCornerShape(16.dp),
            border = if (active) null else BorderStroke(1.dp, HangyeolTheme.extendedColors.lineSoft),
            shadowElevation = if (active) 3.dp else 0.dp,
          ) {
            Column(
              modifier = Modifier.fillMaxWidth().padding(vertical = 12.dp, horizontal = 10.dp),
              horizontalAlignment = androidx.compose.ui.Alignment.CenterHorizontally,
            ) {
              Text(
                text = kanji,
                style = HangyeolTheme.typography.bodySmall.copy(fontFamily = FontFamily.Serif, fontSize = 14.sp, lineHeight = 16.sp, fontWeight = FontWeight.Medium),
                color = if (active) HangyeolTheme.colorScheme.onPrimary.copy(alpha = 0.72f) else HangyeolTheme.colorScheme.onSurface.copy(alpha = 0.78f),
              )
              Text(
                text = label,
                style = HangyeolTheme.typography.bodySmall.copy(fontSize = 12.sp, lineHeight = 14.sp, fontWeight = FontWeight.ExtraBold),
                color = if (active) HangyeolTheme.colorScheme.onPrimary else HangyeolTheme.colorScheme.onSurface,
                modifier = Modifier.padding(top = 2.dp),
              )
            }
          }
        }
      }
    }
    item {
      Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        if (!podcastState.isLoading && podcastState.errorMessage == null && podcastState.episodes.isEmpty()) {
          BaselineCard(
            title = "暂无播客推荐",
            body = "Convex 当前没有返回可展示的播客频道。",
            actionLabel = "刷新",
            onAction = podcastViewModel::refresh,
          )
        }
        podcastState.episodes.forEachIndexed { index, item ->
          val tone =
            when (index) {
              1 -> HangyeolTheme.extendedColors.tintMint
              2 -> HangyeolTheme.extendedColors.tintButter
              else -> HangyeolTheme.extendedColors.tintPink
            }
          val destinationRoute =
            item.route.ifBlank {
              if (item.channelId.isBlank()) "" else HangyeolDestination.PodcastChannel.createRoute(item.channelId)
            }
          Surface(
            modifier =
              Modifier
                .fillMaxWidth()
                .clickable {
                  if (destinationRoute.isBlank()) {
                    onNavigateRoute(HangyeolDestination.Podcasts.pattern)
                  } else {
                    onNavigateRoute(destinationRoute)
                  }
                },
            color = HangyeolTheme.colorScheme.surface,
            shape = RoundedCornerShape(24.dp),
            border = BorderStroke(1.dp, HangyeolTheme.extendedColors.lineSoft),
            shadowElevation = 2.dp,
          ) {
            Row(
              modifier = Modifier.fillMaxWidth().padding(horizontal = 14.dp, vertical = 14.dp),
              horizontalArrangement = Arrangement.spacedBy(14.dp),
              verticalAlignment = androidx.compose.ui.Alignment.CenterVertically,
            ) {
              Box(modifier = Modifier.size(64.dp).background(tone, RoundedCornerShape(14.dp))) {
                Canvas(modifier = Modifier.matchParentSize()) {
                  val stripeColor = Color(0x141F1B17)
                  val step = 7.dp.toPx()
                  var start = -size.height
                  while (start < size.width + size.height) {
                    drawLine(
                      color = stripeColor,
                      start = Offset(start, size.height),
                      end = Offset(start + size.height, 0f),
                      strokeWidth = 1.dp.toPx(),
                    )
                    start += step
                  }
                }
                Text(
                  text = (index + 1).toString(),
                  style =
                    HangyeolTheme.typography.displayLarge.copy(
                      fontFamily = FontFamily.Serif,
                      fontSize = 28.sp,
                      lineHeight = 30.sp,
                      fontWeight = FontWeight.Medium,
                    ),
                  color = HangyeolTheme.colorScheme.onSurface,
                  modifier = Modifier.align(androidx.compose.ui.Alignment.Center),
                )
              }
              Column(modifier = Modifier.weight(1f)) {
                Text(
                  text = item.title,
                  style = HangyeolTheme.typography.bodyMedium.copy(fontSize = 14.sp, lineHeight = 17.sp, fontWeight = FontWeight.ExtraBold),
                  color = HangyeolTheme.colorScheme.onSurface,
                  maxLines = 1,
                  overflow = TextOverflow.Ellipsis,
                )
                Text(
                  text = item.subtitle,
                  style = HangyeolTheme.typography.bodySmall.copy(fontSize = 11.sp, lineHeight = 14.sp, fontWeight = FontWeight.SemiBold),
                  color = HangyeolTheme.extendedColors.subtext,
                  modifier = Modifier.padding(top = 2.dp),
                  maxLines = 1,
                  overflow = TextOverflow.Ellipsis,
                )
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.padding(top = 6.dp)) {
                  if (item.duration.isNotBlank()) {
                    KSoftChip(text = item.duration, tone = "muted", size = "sm")
                  }
                  KSoftChip(text = "字幕", tone = "muted", size = "sm")
                }
              }
            }
          }
        }
      }
    }
  }
}

@Composable
private fun shortcutAccent(accent: String): Color =
  when (accent) {
    "mint" -> HangyeolTheme.extendedColors.tintMint
    "butter" -> HangyeolTheme.extendedColors.tintButter
    "lilac" -> HangyeolTheme.extendedColors.tintLilac
    else -> HangyeolTheme.extendedColors.tintPink
  }

@Composable
private fun ProfileScreen(
  displayName: String,
  isAuthenticated: Boolean,
  onNavigateRoute: (String) -> Unit,
  onSignOut: () -> Unit,
) {
  val viewModel: ProfileViewModel =
    viewModel(factory = ProfileViewModel.factory(ComposeServiceLocator.contentRepository))
  val uiState by viewModel.uiState.collectAsStateWithLifecycle()
  val spacing = HangyeolTheme.spacing
  var showAvatarUpload by rememberSaveable { mutableStateOf(false) }
  val profileName = displayName.ifBlank { "河恩" }
  val profileBadgeChar = profileName.firstOrNull()?.toString() ?: "河"
  val profileHeadline = uiState.headline.ifBlank { if (isAuthenticated) "学习进度 · 同步中" else "预览档案 · 试用中" }
  val planChipLabel = uiState.planLabel.ifBlank { if (isAuthenticated) "账号" else "访客" }
  val streakChipLabel = uiState.streakLabel.ifBlank { "学习记录同步中" }
  val profileEntries =
    if (uiState.profileMenu.isNotEmpty()) {
      uiState.profileMenu.map { entry ->
        ProfileHubEntry(
          seal = entry.seal,
          title = entry.title,
          subtitle = entry.subtitle,
          route = entry.route,
        )
      }
    } else {
      listOf(
        ProfileHubEntry("詞", "词汇本", "进入词典与复习", HangyeolDestination.Dictionary.pattern),
        ProfileHubEntry("錯", "错题本", "查看 TOPIK 历史", HangyeolDestination.TopikHistory.pattern),
        ProfileHubEntry("筆", "笔记本", "查看学习笔记", HangyeolDestination.Notebook.pattern),
        ProfileHubEntry("章", "成就与徽章", "查看学习历程", HangyeolDestination.History.pattern),
      )
    }
  val settingEntries =
    if (uiState.settingsMenu.isNotEmpty()) {
      uiState.settingsMenu.map { entry ->
        ProfileHubEntry(
          seal = entry.seal,
          title = entry.title,
          subtitle = entry.subtitle,
          route = entry.route,
        )
      }
    } else {
      listOf(
        ProfileHubEntry("星", "订阅管理", "查看订阅与权益", HangyeolDestination.SubscriptionDetail.pattern),
        ProfileHubEntry("鈴", "通知设置", "管理提醒和推送", HangyeolDestination.ProfileSettings.pattern),
        ProfileHubEntry("語", "语言设置", "管理显示语言", HangyeolDestination.ProfileSettings.pattern),
        ProfileHubEntry("助", "帮助与反馈", "常见问题与联系支持", HangyeolDestination.Community.pattern),
      )
    }
  val quickStats =
    if (uiState.quickStats.isNotEmpty()) {
      uiState.quickStats
    } else {
      listOf(
        "--" to "词汇",
        "--" to "TOPIK",
        "--" to "笔记",
      )
    }
  LazyColumn(
    modifier =
      Modifier
        .fillMaxSize()
        .background(HangyeolTheme.colorScheme.background)
        .statusBarsPadding()
        .padding(horizontal = spacing.lg),
    verticalArrangement = Arrangement.spacedBy(spacing.lg),
    contentPadding = PaddingValues(bottom = spacing.xl),
  ) {
    item {
      Column(
        modifier =
          Modifier
            .fillMaxWidth()
            .background(
              brush =
                Brush.verticalGradient(
                  colors = listOf(Color(0x1AD8CFE6), HangyeolTheme.colorScheme.background),
                ),
            )
            .padding(top = spacing.lg, bottom = 12.dp),
      ) {
        Text(text = "我 · PROFILE", style = HangyeolTheme.typography.labelSmall, color = HangyeolTheme.colorScheme.secondary)
        Spacer(modifier = Modifier.height(10.dp))
        Row(
          modifier = Modifier.fillMaxWidth(),
          horizontalArrangement = Arrangement.spacedBy(16.dp),
          verticalAlignment = androidx.compose.ui.Alignment.CenterVertically,
        ) {
          Box(modifier = Modifier.size(78.dp).clickable { showAvatarUpload = true }) {
            Surface(
              modifier = Modifier.matchParentSize(),
              color = Color.Transparent,
              shape = RoundedCornerShape(28.dp),
              border = BorderStroke(1.dp, HangyeolTheme.extendedColors.lineSoft),
              shadowElevation = 4.dp,
            ) {
              Box(
                modifier =
                  Modifier
                    .background(
                      Brush.linearGradient(
                        colors = listOf(HangyeolTheme.extendedColors.tintLilac, HangyeolTheme.extendedColors.tintPink),
                      ),
                    ),
                contentAlignment = androidx.compose.ui.Alignment.Center,
              ) {
                Text(
                  text = profileBadgeChar,
                  style =
                    HangyeolTheme.typography.displayMedium.copy(
                      fontFamily = FontFamily.Serif,
                      fontSize = 34.sp,
                      lineHeight = 36.sp,
                      fontWeight = FontWeight.Medium,
                    ),
                  color = HangyeolTheme.extendedColors.crimson,
                )
              }
            }
            Surface(
              modifier = Modifier.align(androidx.compose.ui.Alignment.BottomEnd),
              color = HangyeolTheme.colorScheme.primary,
              shape = RoundedCornerShape(10.dp),
            ) {
              Text(
                text = "讀",
                style = HangyeolTheme.typography.bodySmall.copy(fontFamily = FontFamily.Serif, fontSize = 11.sp, lineHeight = 13.sp, fontWeight = FontWeight.Bold),
                color = HangyeolTheme.colorScheme.onPrimary,
                modifier = Modifier.padding(horizontal = 6.dp, vertical = 4.dp),
              )
            }
          }
          Column(modifier = Modifier.weight(1f)) {
            Text(text = profileName, style = HangyeolTheme.typography.headlineMedium.copy(fontSize = 30.sp, lineHeight = 34.sp, fontWeight = FontWeight.ExtraBold))
            Spacer(modifier = Modifier.height(4.dp))
            Text(
              text = profileHeadline,
              style = HangyeolTheme.typography.bodyMedium.copy(fontWeight = FontWeight.SemiBold),
              color = HangyeolTheme.extendedColors.subtext,
            )
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.padding(top = 10.dp)) {
              KSoftChip(text = planChipLabel, tone = "crimson", size = "sm")
              KSoftChip(text = streakChipLabel, tone = "muted", size = "sm")
            }
          }
        }
      }
    }
    item {
      Surface(
        modifier = Modifier.fillMaxWidth(),
        color = HangyeolTheme.colorScheme.surface,
        shape = RoundedCornerShape(28.dp),
        border = BorderStroke(1.dp, HangyeolTheme.extendedColors.lineSoft),
        shadowElevation = 3.dp,
      ) {
        Row(
          modifier = Modifier.fillMaxWidth().padding(horizontal = 8.dp, vertical = 18.dp),
          horizontalArrangement = Arrangement.SpaceEvenly,
        ) {
          quickStats.forEachIndexed { index, (value, label) ->
            Column(
              modifier = Modifier.weight(1f),
              horizontalAlignment = androidx.compose.ui.Alignment.CenterHorizontally,
            ) {
              Text(
                text = value,
                style = HangyeolTheme.typography.headlineSmall.copy(fontSize = 24.sp, lineHeight = 28.sp, fontWeight = FontWeight.ExtraBold),
                color = HangyeolTheme.colorScheme.onSurface,
              )
              Text(
                text = label,
                style = HangyeolTheme.typography.bodySmall.copy(fontSize = 11.sp, lineHeight = 13.sp, fontWeight = FontWeight.Bold),
                color = HangyeolTheme.extendedColors.subtext,
                modifier = Modifier.padding(top = 4.dp),
              )
            }
            if (index != quickStats.lastIndex) {
              VerticalDivider(
                color = HangyeolTheme.extendedColors.lineSoft,
                modifier = Modifier.height(36.dp),
              )
            }
          }
        }
      }
    }
    if (isAuthenticated) {
      item {
        val context = LocalContext.current
        Surface(
          modifier = Modifier.fillMaxWidth().clickable {
            val shareText = "我在 한결 学韩语！快来一起学吧 https://hangyeol.app"
            val intent = Intent(Intent.ACTION_SEND).apply { type = "text/plain"; putExtra(Intent.EXTRA_TEXT, shareText) }
            context.startActivity(Intent.createChooser(intent, "分享学习记录"))
          },
          color = HangyeolTheme.colorScheme.surface,
          shape = RoundedCornerShape(18.dp),
          border = BorderStroke(1.dp, HangyeolTheme.extendedColors.lineSoft),
        ) {
          Row(modifier = Modifier.padding(16.dp), verticalAlignment = androidx.compose.ui.Alignment.CenterVertically) {
            Text(text = "分", style = HangyeolTheme.typography.titleMedium.copy(fontFamily = FontFamily.Serif, fontWeight = FontWeight.Medium), color = HangyeolTheme.colorScheme.primary)
            Text(text = "分享学习记录", style = HangyeolTheme.typography.titleSmall.copy(fontWeight = FontWeight.Bold), color = HangyeolTheme.colorScheme.onSurface, modifier = Modifier.padding(start = 12.dp).weight(1f))
            Text(text = "→", style = HangyeolTheme.typography.titleMedium, color = HangyeolTheme.extendedColors.subtext)
          }
        }
      }
    }
    uiState.errorMessage?.let { errorMessage ->
      item {
        BaselineCard(
          title = "个人资料加载失败",
          body = errorMessage,
          actionLabel = "重试",
          onAction = viewModel::refresh,
        )
      }
    }
    item {
      KSoftSectionHead(kanji = "案", title = "我的资料")
    }
    item {
      ProfileHubMenuCard(entries = profileEntries, onNavigateRoute = onNavigateRoute)
    }
    item {
      KSoftSectionHead(kanji = "設", title = "设置")
    }
    item {
      ProfileHubMenuCard(entries = settingEntries, onNavigateRoute = onNavigateRoute)
    }
  }
  if (showAvatarUpload && isAuthenticated) {
    AvatarUploadDialog(
      onDismiss = { showAvatarUpload = false },
      onUploaded = { showAvatarUpload = false; viewModel.refresh() },
    )
  }
}

private data class ProfileHubEntry(
  val seal: String,
  val title: String,
  val subtitle: String,
  val route: String,
)

@Composable
private fun ProfileHubMenuCard(
  entries: List<ProfileHubEntry>,
  onNavigateRoute: (String) -> Unit,
) {
  Surface(
    modifier = Modifier.fillMaxWidth(),
    color = HangyeolTheme.colorScheme.surface,
    shape = RoundedCornerShape(28.dp),
    border = BorderStroke(1.dp, HangyeolTheme.extendedColors.lineSoft),
    shadowElevation = 3.dp,
  ) {
    Column(modifier = Modifier.fillMaxWidth().padding(horizontal = 18.dp, vertical = 10.dp)) {
      entries.forEachIndexed { index, entry ->
        Row(
          modifier =
            Modifier
              .fillMaxWidth()
              .clickable { onNavigateRoute(entry.route) }
              .padding(vertical = 12.dp),
          horizontalArrangement = Arrangement.spacedBy(14.dp),
          verticalAlignment = androidx.compose.ui.Alignment.CenterVertically,
        ) {
          Surface(
            color = HangyeolTheme.extendedColors.tintLilac,
            shape = RoundedCornerShape(14.dp),
            modifier = Modifier.size(42.dp),
          ) {
            Box(contentAlignment = androidx.compose.ui.Alignment.Center) {
              Text(
                text = entry.seal,
                style = HangyeolTheme.typography.titleMedium.copy(fontFamily = FontFamily.Serif, fontWeight = FontWeight.Bold),
                color = HangyeolTheme.colorScheme.onSurface,
              )
            }
          }
          Column(modifier = Modifier.weight(1f)) {
            Text(
              text = entry.title,
              style = HangyeolTheme.typography.bodyMedium.copy(fontSize = 15.sp, lineHeight = 18.sp, fontWeight = FontWeight.ExtraBold),
              color = HangyeolTheme.colorScheme.onSurface,
            )
            Text(
              text = entry.subtitle,
              style = HangyeolTheme.typography.bodySmall.copy(fontSize = 11.sp, lineHeight = 14.sp, fontWeight = FontWeight.SemiBold),
              color = HangyeolTheme.extendedColors.subtext,
              modifier = Modifier.padding(top = 2.dp),
            )
          }
          Text(
            text = "›",
            style = HangyeolTheme.typography.titleMedium.copy(fontSize = 18.sp, lineHeight = 18.sp, fontWeight = FontWeight.Black),
            color = HangyeolTheme.extendedColors.subtext,
          )
        }
        if (index != entries.lastIndex) {
          HorizontalDivider(color = HangyeolTheme.extendedColors.lineSoft)
        }
      }
    }
  }
}

@Composable
private fun DictionaryScreen(
  onBack: () -> Unit,
) {
  val viewModel: DictionaryViewModel =
    viewModel(factory = DictionaryViewModel.factory(ComposeServiceLocator.contentRepository))
  val uiState by viewModel.uiState.collectAsStateWithLifecycle()
  val spacing = HangyeolTheme.spacing
  val currentEntry = uiState.entries.firstOrNull()
  val hasEmptyResult = !uiState.isLoading && uiState.errorMessage == null && currentEntry == null
  var previewingEntryId by rememberSaveable { mutableStateOf<String?>(null) }
  var savedEntryIds by rememberSaveable { mutableStateOf(listOf<String>()) }

  LazyColumn(
    modifier =
      Modifier
        .fillMaxSize()
        .background(HangyeolTheme.colorScheme.background)
        .statusBarsPadding()
        .padding(horizontal = spacing.lg),
    verticalArrangement = Arrangement.spacedBy(spacing.lg),
    contentPadding = PaddingValues(bottom = spacing.xl),
  ) {
    item {
      Column(
        modifier =
          Modifier
            .fillMaxWidth()
            .padding(top = spacing.xs, bottom = 2.dp),
      ) {
        Surface(
          modifier = Modifier.size(36.dp).clickable { onBack() },
          color = HangyeolTheme.colorScheme.surface,
          shape = RoundedCornerShape(18.dp),
          border = BorderStroke(1.dp, HangyeolTheme.extendedColors.lineSoft),
          shadowElevation = 2.dp,
        ) {
          Box(contentAlignment = androidx.compose.ui.Alignment.Center) {
            Text(
              text = "←",
              style = HangyeolTheme.typography.titleMedium.copy(fontSize = 16.sp, lineHeight = 16.sp, fontWeight = FontWeight.ExtraBold),
              color = HangyeolTheme.colorScheme.onSurface,
            )
          }
        }
        Text(
          text = "典 · DICTIONARY",
          style = KSoftSerifLabelStyle(),
          color = HangyeolTheme.extendedColors.crimson,
          modifier = Modifier.padding(top = 14.dp),
        )
        Text(
          text = "词典搜索",
          style = HangyeolTheme.typography.headlineMedium.copy(fontSize = 26.sp, lineHeight = 30.sp, fontWeight = FontWeight.ExtraBold),
          color = HangyeolTheme.colorScheme.onSurface,
          modifier = Modifier.padding(top = 4.dp),
        )
      }
    }
    item {
      Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        KSoftInputField(
          value = uiState.query,
          onValueChange = viewModel::onQueryChanged,
          placeholder = "搜索单词",
          leftIcon = {
            Text(
              text = "⌕",
              style = HangyeolTheme.typography.bodyMedium.copy(fontSize = 18.sp, lineHeight = 18.sp, fontWeight = FontWeight.Medium),
              color = HangyeolTheme.extendedColors.subtext,
            )
          },
          rightIcon = {
            Text(
              text = "한↔中",
              style = HangyeolTheme.typography.bodySmall.copy(fontSize = 12.sp, lineHeight = 14.sp, fontWeight = FontWeight.Bold),
              color = HangyeolTheme.extendedColors.subtext,
            )
          },
          imeAction = ImeAction.Search,
          onSubmit = viewModel::submitQuery,
        )
        LazyRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
          items(uiState.recentQueries.size) { index ->
            val query = uiState.recentQueries[index]
            Surface(
              modifier =
                Modifier.clickable {
                  viewModel.onQueryChanged(query.removePrefix("最近:"))
                  viewModel.submitQuery(query.removePrefix("最近:"))
                },
              color = HangyeolTheme.extendedColors.surfaceMuted,
              shape = RoundedCornerShape(12.dp),
            ) {
              Text(
                text = query,
                style = HangyeolTheme.typography.bodySmall.copy(fontSize = 11.sp, lineHeight = 14.sp, fontWeight = FontWeight.Bold),
                color = HangyeolTheme.extendedColors.subtext,
                modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
              )
            }
          }
        }
      }
    }
    uiState.errorMessage?.let { errorMessage ->
      item {
        BaselineCard(
          title = "词典加载失败",
          body = errorMessage,
          actionLabel = "重试",
          onAction = viewModel::refresh,
        )
      }
    }
    if (uiState.isLoading) {
      item {
        BaselineCard(
          title = "正在加载词典",
          body = "词典条目正从 Android 原生状态层注入。",
        )
      }
    }
    currentEntry?.let { entry ->
      item {
        Surface(
          modifier = Modifier.fillMaxWidth(),
          color = HangyeolTheme.colorScheme.surface,
          shape = RoundedCornerShape(24.dp),
          border = BorderStroke(1.dp, HangyeolTheme.extendedColors.lineSoft),
          shadowElevation = 3.dp,
        ) {
          Column(modifier = Modifier.padding(20.dp)) {
            Row(
              modifier = Modifier.fillMaxWidth(),
              horizontalArrangement = Arrangement.SpaceBetween,
              verticalAlignment = androidx.compose.ui.Alignment.Top,
            ) {
              Column(modifier = Modifier.weight(1f)) {
                Text(
                  text = entry.hanjaSeal,
                  style = KSoftSerifLabelStyle(),
                  color = HangyeolTheme.extendedColors.crimson,
                )
                Text(
                  text = entry.term,
                  style = HangyeolTheme.typography.headlineMedium.copy(fontSize = 30.sp, lineHeight = 30.sp, fontWeight = FontWeight.ExtraBold),
                  color = HangyeolTheme.colorScheme.onSurface,
                  modifier = Modifier.padding(top = 4.dp),
                )
                Text(
                  text = "${entry.pronunciation} · ${entry.partOfSpeech}",
                  style = HangyeolTheme.typography.bodySmall.copy(fontSize = 12.sp, lineHeight = 15.sp, fontWeight = FontWeight.SemiBold),
                  color = HangyeolTheme.extendedColors.subtext,
                  modifier = Modifier.padding(top = 6.dp),
                )
              }
              Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                DictionaryCircleButton(
                  label = "🔊",
                  active = previewingEntryId == entry.id,
                  onClick = {
                    previewingEntryId =
                      if (previewingEntryId == entry.id) {
                        null
                      } else {
                        entry.id
                      }
                  },
                )
                DictionaryCircleButton(
                  label = if (savedEntryIds.contains(entry.id)) "✓" else "+",
                  active = savedEntryIds.contains(entry.id),
                  onClick = {
                    savedEntryIds =
                      if (savedEntryIds.contains(entry.id)) {
                        savedEntryIds - entry.id
                      } else {
                        savedEntryIds + entry.id
                      }
                  },
                )
              }
            }

            Column(
              modifier =
                Modifier
                  .fillMaxWidth()
                  .padding(top = 16.dp),
            ) {
              HorizontalDivider(color = HangyeolTheme.extendedColors.lineSoft)
              Text(
                text = "뜻 1 · 韓",
                style = KSoftOverlineStyle(),
                color = HangyeolTheme.extendedColors.subtext,
                modifier = Modifier.padding(top = 14.dp),
              )
              Text(
                text = entry.meaningKo,
                style = HangyeolTheme.typography.bodyMedium.copy(fontSize = 14.sp, lineHeight = 21.sp, fontWeight = FontWeight.SemiBold),
                color = HangyeolTheme.colorScheme.onSurface,
                modifier = Modifier.padding(top = 8.dp),
              )
              Text(
                text = entry.meaningZh,
                style = HangyeolTheme.typography.bodySmall.copy(fontSize = 12.sp, lineHeight = 17.sp, fontWeight = FontWeight.Medium),
                color = HangyeolTheme.extendedColors.subtext,
                modifier = Modifier.padding(top = 4.dp),
              )
            }

            Column(
              modifier =
                Modifier
                  .fillMaxWidth()
                  .padding(top = 14.dp),
            ) {
              HorizontalDivider(color = HangyeolTheme.extendedColors.lineSoft)
              Text(
                text = "例句 · 例",
                style = KSoftOverlineStyle(),
                color = HangyeolTheme.extendedColors.subtext,
                modifier = Modifier.padding(top = 14.dp),
              )
              Column(
                modifier = Modifier.padding(top = 8.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp),
              ) {
                entry.examples.forEach { example ->
                  Text(
                    text = "• $example",
                    style = HangyeolTheme.typography.bodySmall.copy(fontSize = 13.sp, lineHeight = 19.sp, fontWeight = FontWeight.Medium),
                    color = HangyeolTheme.colorScheme.onSurface.copy(alpha = 0.86f),
                  )
                }
              }
            }
          }
        }
      }
    }
    currentEntry?.let { entry ->
      item {
        Column {
          KSoftSectionHead(kanji = "連", title = "相关词汇")
          Surface(
            modifier = Modifier.fillMaxWidth().padding(top = 12.dp),
            color = HangyeolTheme.colorScheme.surface,
            shape = RoundedCornerShape(24.dp),
            border = BorderStroke(1.dp, HangyeolTheme.extendedColors.lineSoft),
            shadowElevation = 3.dp,
          ) {
            Column(modifier = Modifier.fillMaxWidth()) {
              entry.related.forEachIndexed { index, (word, meaning) ->
                Row(
                  modifier =
                    Modifier
                      .fillMaxWidth()
                      .clickable {
                        viewModel.onQueryChanged(word)
                        viewModel.submitQuery(word)
                      }
                      .padding(horizontal = 18.dp, vertical = 12.dp),
                  horizontalArrangement = Arrangement.spacedBy(12.dp),
                  verticalAlignment = androidx.compose.ui.Alignment.CenterVertically,
                ) {
                  Column(modifier = Modifier.weight(1f)) {
                    Text(
                      text = word,
                      style = HangyeolTheme.typography.bodyMedium.copy(fontSize = 14.sp, lineHeight = 18.sp, fontWeight = FontWeight.ExtraBold),
                      color = HangyeolTheme.colorScheme.onSurface,
                    )
                    Text(
                      text = meaning,
                      style = HangyeolTheme.typography.bodySmall.copy(fontSize = 11.sp, lineHeight = 14.sp, fontWeight = FontWeight.Medium),
                      color = HangyeolTheme.extendedColors.subtext,
                      modifier = Modifier.padding(top = 1.dp),
                    )
                  }
                  Text(
                    text = "›",
                    style = HangyeolTheme.typography.titleMedium.copy(fontSize = 16.sp, lineHeight = 16.sp, fontWeight = FontWeight.Bold),
                    color = HangyeolTheme.extendedColors.subtextLight,
                  )
                }
                if (index != entry.related.lastIndex) {
                  HorizontalDivider(color = HangyeolTheme.extendedColors.lineSoft)
                }
              }
            }
          }
        }
      }
    }
    if (hasEmptyResult) {
      item {
        BaselineCard(
          title = "没有匹配词条",
          body = "请尝试从最近搜索里选择词条。",
          actionLabel = "清空搜索",
          onAction = {
            viewModel.onQueryChanged("")
            viewModel.submitQuery("")
          },
        )
      }
    }
  }
}

@Composable
private fun DictionaryCircleButton(
  label: String,
  active: Boolean,
  onClick: () -> Unit,
) {
  Surface(
    modifier = Modifier.size(36.dp).clickable { onClick() },
    color = if (active) HangyeolTheme.extendedColors.tintPink else HangyeolTheme.extendedColors.surfaceMuted,
    shape = RoundedCornerShape(18.dp),
    border =
      BorderStroke(
        1.dp,
        if (active) {
          HangyeolTheme.extendedColors.crimson.copy(alpha = 0.25f)
        } else {
          HangyeolTheme.extendedColors.lineStrong
        },
      ),
  ) {
    Box(contentAlignment = androidx.compose.ui.Alignment.Center) {
      Text(
        text = label,
        style = HangyeolTheme.typography.bodySmall.copy(fontSize = 14.sp, lineHeight = 14.sp, fontWeight = FontWeight.Bold),
        color = if (active) HangyeolTheme.extendedColors.crimson else HangyeolTheme.colorScheme.onSurface,
      )
    }
  }
}

@Composable
private fun NotebookScreen(
  onBack: () -> Unit,
) {
  val viewModel: NotebookViewModel =
    viewModel(factory = NotebookViewModel.factory(ComposeServiceLocator.contentRepository))
  val uiState by viewModel.uiState.collectAsStateWithLifecycle()
  var selectedFilter by rememberSaveable { mutableStateOf("全部") }
  val filterOptions =
    remember(uiState.entries) {
      listOf("全部") + uiState.entries.map { it.tag }.filter { it.isNotBlank() }.distinct()
    }
  if (selectedFilter !in filterOptions) {
    selectedFilter = "全部"
  }
  val filteredEntries =
    if (selectedFilter == "全部") {
      uiState.entries
    } else {
      uiState.entries.filter { it.tag == selectedFilter }
    }
  val hasEmptyNotes = !uiState.isLoading && uiState.errorMessage == null && uiState.entries.isEmpty()
  val hasEmptyFilter = !uiState.isLoading && uiState.errorMessage == null && uiState.entries.isNotEmpty() && filteredEntries.isEmpty()
  val todayUpdatedCount = uiState.entries.count { it.updatedAt.startsWith("今天") || it.updatedAt == "刚刚" }

  LazyColumn(
    modifier =
      Modifier
        .fillMaxSize()
        .background(HangyeolTheme.colorScheme.background)
        .statusBarsPadding(),
    verticalArrangement = Arrangement.spacedBy(14.dp),
    contentPadding = PaddingValues(bottom = HangyeolTheme.spacing.xl),
  ) {
    item {
      Column(
        modifier =
          Modifier
            .fillMaxWidth()
            .background(
              Brush.verticalGradient(
                colors =
                  listOf(
                    HangyeolTheme.extendedColors.tintLilac,
                    HangyeolTheme.colorScheme.background,
                  ),
              ),
            )
            .padding(horizontal = 22.dp, vertical = 14.dp),
      ) {
        Row(
          modifier = Modifier.fillMaxWidth(),
          horizontalArrangement = Arrangement.SpaceBetween,
          verticalAlignment = androidx.compose.ui.Alignment.CenterVertically,
        ) {
          Column(modifier = Modifier.weight(1f)) {
            Text(
              text = "記 · NOTEBOOK",
              style = KSoftSerifLabelStyle(),
              color = HangyeolTheme.extendedColors.crimson,
            )
            Text(
              text = "笔记本",
              style = HangyeolTheme.typography.headlineMedium.copy(fontSize = 28.sp, lineHeight = 32.sp, fontWeight = FontWeight.ExtraBold),
              color = HangyeolTheme.colorScheme.onSurface,
              modifier = Modifier.padding(top = 4.dp),
            )
            Text(
              text = "${uiState.entries.size}个笔记 · 今日更新 $todayUpdatedCount",
              style = HangyeolTheme.typography.bodySmall.copy(fontSize = 13.sp, lineHeight = 18.sp, fontWeight = FontWeight.Medium),
              color = HangyeolTheme.extendedColors.subtext,
              modifier = Modifier.padding(top = 4.dp),
            )
          }
          Surface(
            modifier = Modifier.size(44.dp),
            color = HangyeolTheme.colorScheme.primary,
            shape = RoundedCornerShape(22.dp),
            shadowElevation = 4.dp,
          ) {
            Box(contentAlignment = androidx.compose.ui.Alignment.Center) {
              Text(
                text = "+",
                style = HangyeolTheme.typography.headlineMedium.copy(fontSize = 22.sp, lineHeight = 22.sp, fontWeight = FontWeight.Bold),
                color = HangyeolTheme.colorScheme.onPrimary,
              )
            }
          }
        }
      }
    }
    item {
      LazyRow(
        contentPadding = PaddingValues(horizontal = 22.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
      ) {
        items(filterOptions) { label ->
          val active = label == selectedFilter
          Surface(
            modifier = Modifier.clickable { selectedFilter = label },
            color = if (active) HangyeolTheme.colorScheme.primary else HangyeolTheme.colorScheme.surface,
            shape = RoundedCornerShape(16.dp),
            border = if (active) null else BorderStroke(1.dp, HangyeolTheme.extendedColors.lineSoft),
            shadowElevation = if (active) 0.dp else 2.dp,
          ) {
            Text(
              text = label,
              style = HangyeolTheme.typography.bodySmall.copy(fontSize = 12.sp, lineHeight = 14.sp, fontWeight = FontWeight.ExtraBold),
              color = if (active) HangyeolTheme.colorScheme.onPrimary else HangyeolTheme.colorScheme.onSurface,
              modifier = Modifier.padding(horizontal = 14.dp, vertical = 7.dp),
            )
          }
        }
      }
    }
    if (uiState.isLoading) {
      item {
        Box(modifier = Modifier.padding(horizontal = 18.dp)) {
          BaselineCard(
            title = "正在加载笔记",
            body = "笔记流正由 Android 原生 Repository 注入。",
          )
        }
      }
    }
    uiState.errorMessage?.let { errorMessage ->
      item {
        Box(modifier = Modifier.padding(horizontal = 18.dp)) {
          BaselineCard(
            title = "笔记加载失败",
            body = errorMessage,
            actionLabel = "重试",
            onAction = viewModel::refresh,
          )
        }
      }
    }
    if (hasEmptyNotes) {
      item {
        Box(modifier = Modifier.padding(horizontal = 18.dp)) {
          BaselineCard(
            title = "暂无笔记",
            body = "语法、阅读或考试摘录会出现在这里。",
            actionLabel = "重试",
            onAction = viewModel::refresh,
          )
        }
      }
    }
    if (hasEmptyFilter) {
      item {
        Box(modifier = Modifier.padding(horizontal = 18.dp)) {
          BaselineCard(
            title = "当前筛选无笔记",
            body = "切换筛选标签查看其他笔记。",
            actionLabel = "显示全部",
            onAction = { selectedFilter = "全部" },
          )
        }
      }
    }
    items(filteredEntries.size) { index ->
      val note = filteredEntries[index]
      val accent =
        when (note.tag) {
          "會話" -> HangyeolTheme.extendedColors.tintPink
          "文法" -> HangyeolTheme.extendedColors.tintMint
          "寫作" -> HangyeolTheme.extendedColors.tintButter
          else -> HangyeolTheme.extendedColors.tintLilac
        }
      Surface(
        modifier = Modifier.padding(horizontal = 18.dp),
        color = HangyeolTheme.colorScheme.surface,
        shape = RoundedCornerShape(22.dp),
        border = BorderStroke(1.dp, HangyeolTheme.extendedColors.lineSoft),
        shadowElevation = 3.dp,
      ) {
        Row(modifier = Modifier.fillMaxWidth()) {
          Box(
            modifier =
              Modifier
                .width(4.dp)
                .heightIn(min = 118.dp)
                .background(accent),
          )
          Column(modifier = Modifier.padding(horizontal = 18.dp, vertical = 18.dp)) {
            Row(
              modifier = Modifier.fillMaxWidth(),
              horizontalArrangement = Arrangement.SpaceBetween,
              verticalAlignment = androidx.compose.ui.Alignment.Top,
            ) {
              Text(
                text = note.tag,
                style =
                  HangyeolTheme.typography.labelSmall.copy(
                    fontFamily = FontFamily.Serif,
                    fontSize = 11.sp,
                    lineHeight = 13.sp,
                    fontWeight = FontWeight.Medium,
                    letterSpacing = 2.sp,
                  ),
                color = HangyeolTheme.extendedColors.crimson,
              )
              Text(
                text = note.updatedAt,
                style = HangyeolTheme.typography.labelSmall.copy(fontSize = 10.sp, lineHeight = 12.sp, fontWeight = FontWeight.Bold),
                color = HangyeolTheme.extendedColors.subtext,
              )
            }
            Text(
              text = note.title,
              style = HangyeolTheme.typography.bodyMedium.copy(fontSize = 16.sp, lineHeight = 20.sp, fontWeight = FontWeight.ExtraBold),
              color = HangyeolTheme.colorScheme.onSurface,
              modifier = Modifier.padding(top = 6.dp),
            )
            Text(
              text = note.excerpt,
              style = HangyeolTheme.typography.bodySmall.copy(fontSize = 13.sp, lineHeight = 20.sp, fontWeight = FontWeight.Medium),
              color = HangyeolTheme.colorScheme.onSurfaceVariant,
              modifier = Modifier.padding(top = 6.dp),
            )
          }
        }
      }
    }
    item {
      Spacer(modifier = Modifier.height(4.dp))
    }
  }
}

@Composable
private fun ReadingLibraryScreen(
  onBack: () -> Unit,
  onNavigateRoute: (String) -> Unit,
) {
  val viewModel: ReadingLibraryViewModel =
    viewModel(factory = ReadingLibraryViewModel.factory(ComposeServiceLocator.contentRepository))
  val uiState by viewModel.uiState.collectAsStateWithLifecycle()
  var selectedTab by rememberSaveable { mutableStateOf("推荐") }
  val hasEmptyBooks = !uiState.isLoading && uiState.errorMessage == null && uiState.books.isEmpty()
  val displayBooks = if (uiState.books.isNotEmpty()) uiState.books else emptyList()
  val featuredBook = displayBooks.firstOrNull()

  LazyColumn(
    modifier =
      Modifier
        .fillMaxSize()
        .background(HangyeolTheme.extendedColors.surfaceMuted)
        .statusBarsPadding(),
    verticalArrangement = Arrangement.spacedBy(0.dp),
    contentPadding = PaddingValues(bottom = 32.dp),
  ) {
    item {
      Column(
        modifier =
          Modifier
            .fillMaxWidth()
            .padding(horizontal = 22.dp, vertical = 14.dp),
      ) {
        Surface(
          modifier = Modifier.size(42.dp).clickable { onBack() },
          color = HangyeolTheme.colorScheme.surface,
          shape = RoundedCornerShape(14.dp),
          border = BorderStroke(1.dp, HangyeolTheme.extendedColors.lineSoft),
        ) {
          Box(contentAlignment = androidx.compose.ui.Alignment.Center) {
            Text(
              text = "←",
              style = HangyeolTheme.typography.bodyMedium.copy(fontSize = 18.sp, lineHeight = 18.sp, fontWeight = FontWeight.Bold),
              color = HangyeolTheme.colorScheme.onSurface,
            )
          }
        }
        Text(
          text = "讀 · READING",
          style = KSoftSerifLabelStyle(),
          color = HangyeolTheme.extendedColors.crimson,
          modifier = Modifier.padding(top = 14.dp),
        )
        Row(modifier = Modifier.fillMaxWidth().padding(top = 4.dp), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = androidx.compose.ui.Alignment.CenterVertically) {
          Text(
            text = "阅读探索",
            style = HangyeolTheme.typography.headlineMedium.copy(fontSize = 28.sp, lineHeight = 32.sp, fontWeight = FontWeight.ExtraBold),
            color = HangyeolTheme.colorScheme.onSurface,
          )
          Surface(
            modifier = Modifier.clickable { onNavigateRoute(HangyeolDestination.EpubUpload.pattern) },
            color = HangyeolTheme.extendedColors.tintMint,
            shape = RoundedCornerShape(12.dp),
          ) {
            Text("上传 EPUB", style = HangyeolTheme.typography.labelMedium.copy(fontWeight = FontWeight.Bold),
              color = HangyeolTheme.colorScheme.onSurface, modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp))
          }
        }
      }
    }
    item {
      LazyRow(
        contentPadding = PaddingValues(horizontal = 22.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
      ) {
        items(listOf("推荐", "新闻", "文化", "散文", "童话")) { label ->
          val active = selectedTab == label
          Surface(
            modifier = Modifier.clickable { selectedTab = label },
            color = if (active) HangyeolTheme.colorScheme.onSurface else HangyeolTheme.colorScheme.surface,
            shape = RoundedCornerShape(16.dp),
            border = if (active) null else BorderStroke(1.dp, HangyeolTheme.extendedColors.lineSoft),
          ) {
            Text(
              text = label,
              style = HangyeolTheme.typography.bodySmall.copy(fontSize = 12.sp, lineHeight = 16.sp, fontWeight = FontWeight.ExtraBold),
              color = if (active) HangyeolTheme.colorScheme.surface else HangyeolTheme.colorScheme.onSurface,
              modifier = Modifier.padding(horizontal = 14.dp, vertical = 8.dp),
            )
          }
        }
      }
    }
    item {
      Box(modifier = Modifier.padding(horizontal = 18.dp, vertical = 16.dp)) {
        Surface(
          color = HangyeolTheme.colorScheme.surface,
          shape = RoundedCornerShape(26.dp),
          border = BorderStroke(1.dp, HangyeolTheme.extendedColors.lineSoft),
          shadowElevation = 3.dp,
          modifier = Modifier.fillMaxWidth(),
        ) {
          Column {
            Box(
              modifier =
                Modifier
                  .fillMaxWidth()
                  .height(150.dp)
                  .background(
                    Brush.linearGradient(
                      colors =
                        listOf(
                          HangyeolTheme.extendedColors.tintPink,
                          HangyeolTheme.extendedColors.tintButter,
                        ),
                    ),
                  ),
            ) {
              Text(
                text = "春",
                style = HangyeolTheme.typography.displayMedium.copy(fontFamily = FontFamily.Serif, fontSize = 64.sp, fontWeight = FontWeight.Medium),
                color = HangyeolTheme.colorScheme.onSurface.copy(alpha = 0.18f),
                modifier = Modifier.align(androidx.compose.ui.Alignment.BottomEnd).padding(end = 16.dp, bottom = 6.dp),
              )
              Row(
                modifier = Modifier.padding(start = 16.dp, top = 16.dp),
                horizontalArrangement = Arrangement.spacedBy(6.dp),
              ) {
                KSoftChip(text = "FEATURED · 推", tone = "ink", size = "sm")
                KSoftChip(
                  text =
                    if (uiState.featuredSubtitle.isNotBlank()) {
                      uiState.featuredSubtitle
                    } else if ((featuredBook?.minutes ?: 0) > 0) {
                      "${featuredBook?.minutes ?: 0}分钟 阅读"
                    } else {
                      "阅读推荐"
                    },
                  tone = "muted",
                  size = "sm",
                )
              }
            }
            Column(modifier = Modifier.padding(horizontal = 18.dp, vertical = 18.dp)) {
              Text(
                text = featuredBook?.pageTitle?.ifBlank { featuredBook.title } ?: uiState.featuredTitle.ifBlank { "阅读推荐" },
                style = HangyeolTheme.typography.titleMedium.copy(fontSize = 18.sp, lineHeight = 24.sp, fontWeight = FontWeight.ExtraBold),
                color = HangyeolTheme.colorScheme.onSurface,
              )
              Text(
                text =
                  featuredBook?.summary?.ifBlank {
                    uiState.levelSummary.joinToString(" · ") { "${it.first} ${it.second}" }
                  } ?: "暂无摘要",
                style = HangyeolTheme.typography.bodySmall.copy(fontSize = 12.sp, lineHeight = 16.sp, fontWeight = FontWeight.SemiBold),
                color = HangyeolTheme.extendedColors.subtext,
                modifier = Modifier.padding(top = 6.dp),
              )
              if (featuredBook != null) {
                Row(
                  modifier = Modifier.padding(top = 14.dp),
                  horizontalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                  KSoftPrimaryButton(
                    text = "开始阅读",
                    onClick = { onNavigateRoute(HangyeolDestination.ReaderFocus.createRoute(slug = featuredBook.slug)) },
                    modifier = Modifier.weight(1f),
                  )
                  Surface(
                    modifier =
                      Modifier
                        .clickable { onNavigateRoute(HangyeolDestination.PictureBook.createRoute(level = featuredBook.level, slug = featuredBook.slug)) }
                        .padding(top = 1.dp),
                    color = HangyeolTheme.colorScheme.surface,
                    shape = RoundedCornerShape(18.dp),
                    border = BorderStroke(1.dp, HangyeolTheme.extendedColors.lineSoft),
                  ) {
                    Text(
                      text = "绘本馆",
                      style = HangyeolTheme.typography.bodySmall.copy(fontSize = 12.sp, lineHeight = 16.sp, fontWeight = FontWeight.ExtraBold),
                      color = HangyeolTheme.colorScheme.onSurface,
                      modifier = Modifier.padding(horizontal = 14.dp, vertical = 12.dp),
                    )
                  }
                }
              }
            }
          }
        }
      }
    }
    if (uiState.isLoading) {
      item {
        Box(modifier = Modifier.padding(horizontal = 18.dp)) {
          BaselineCard(
            title = "正在加载阅读内容",
            body = "正在读取阅读推荐与书单。",
          )
        }
      }
    }
    uiState.errorMessage?.let { errorMessage ->
      item {
        Box(modifier = Modifier.padding(horizontal = 18.dp)) {
          BaselineCard(
            title = "阅读内容加载失败",
            body = errorMessage,
            actionLabel = "重试",
            onAction = viewModel::refresh,
          )
        }
      }
    }
    if (!uiState.isLoading && uiState.errorMessage == null) {
      item {
        Column(modifier = Modifier.padding(horizontal = 18.dp, vertical = 6.dp)) {
          KSoftSectionHead(kanji = "冊", title = "绘本阅读")
          Spacer(modifier = Modifier.height(10.dp))
          featuredBook?.let { book ->
            Surface(
              modifier =
                Modifier
                  .fillMaxWidth()
                  .clickable {
                    onNavigateRoute(
                      HangyeolDestination.PictureBook.createRoute(
                        level = book.level,
                        slug = book.slug,
                      ),
                    )
                  },
              color = HangyeolTheme.colorScheme.surface,
              shape = RoundedCornerShape(28.dp),
              border = BorderStroke(1.dp, HangyeolTheme.extendedColors.lineSoft),
              shadowElevation = 3.dp,
            ) {
              Column {
                Box(
                  modifier =
                    Modifier
                      .fillMaxWidth()
                      .height(196.dp)
                      .background(shortcutAccent(book.accent)),
                ) {
                  Text(
                    text = book.coverSeal,
                    style = HangyeolTheme.typography.displayMedium.copy(fontFamily = FontFamily.Serif, fontSize = 72.sp, fontWeight = FontWeight.Medium),
                    color = HangyeolTheme.colorScheme.onSurface.copy(alpha = 0.22f),
                    modifier = Modifier.align(androidx.compose.ui.Alignment.Center),
                  )
                  KSoftChip(text = book.level, tone = "ink", size = "sm", modifier = Modifier.padding(start = 14.dp, top = 14.dp))
                  Text(
                    text = "PICTURE BOOK",
                    style = HangyeolTheme.typography.labelSmall.copy(fontSize = 10.sp, lineHeight = 12.sp, fontWeight = FontWeight.ExtraBold, letterSpacing = 1.6.sp),
                    color = HangyeolTheme.colorScheme.surface,
                    modifier =
                      Modifier
                        .align(androidx.compose.ui.Alignment.BottomStart)
                        .padding(start = 16.dp, bottom = 16.dp),
                  )
                }
                Column(modifier = Modifier.padding(horizontal = 18.dp, vertical = 16.dp)) {
                  Text(
                    text = book.pageTitle,
                    style = HangyeolTheme.typography.titleMedium.copy(fontSize = 20.sp, lineHeight = 26.sp, fontWeight = FontWeight.ExtraBold),
                    color = HangyeolTheme.colorScheme.onSurface,
                  )
                  Text(
                    text = "${book.minutes}分钟 · ${book.pages}页 · ${book.summary}",
                    style = HangyeolTheme.typography.bodySmall.copy(fontSize = 12.sp, lineHeight = 18.sp, fontWeight = FontWeight.Medium),
                    color = HangyeolTheme.extendedColors.subtext,
                    modifier = Modifier.padding(top = 8.dp),
                  )
                  Row(
                    modifier = Modifier.padding(top = 14.dp),
                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                  ) {
                    KSoftPrimaryButton(
                      text = "进入绘本馆",
                      onClick = {
                        onNavigateRoute(
                          HangyeolDestination.PictureBook.createRoute(
                            level = book.level,
                            slug = book.slug,
                          ),
                        )
                      },
                      modifier = Modifier.weight(1f),
                    )
                    Surface(
                      modifier =
                        Modifier
                          .clickable { onNavigateRoute(HangyeolDestination.ReaderFocus.createRoute(slug = book.slug)) }
                          .padding(top = 1.dp),
                      color = HangyeolTheme.colorScheme.surface,
                      shape = RoundedCornerShape(18.dp),
                      border = BorderStroke(1.dp, HangyeolTheme.extendedColors.lineSoft),
                    ) {
                      Text(
                        text = "继续",
                        style = HangyeolTheme.typography.bodySmall.copy(fontSize = 12.sp, lineHeight = 16.sp, fontWeight = FontWeight.ExtraBold),
                        color = HangyeolTheme.colorScheme.onSurface,
                        modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp),
                      )
                    }
                  }
                }
              }
            }
          }
        }
      }
      item {
        Column(modifier = Modifier.padding(horizontal = 18.dp, vertical = 12.dp)) {
          displayBooks.chunked(2).forEachIndexed { rowIndex, rowItems ->
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
              rowItems.forEachIndexed { itemIndex, book ->
                ReadingDiscoveryCard(
                  modifier = Modifier.weight(1f),
                  title = book.pageTitle,
                  level = book.level,
                  meta = "${book.minutes}分钟 · ${book.pages}页",
                  seal = book.coverSeal,
                  accent = book.accent,
                  onClick = { onNavigateRoute(HangyeolDestination.ReaderFocus.createRoute(slug = book.slug)) },
                )
              }
              if (rowItems.size == 1) {
                Spacer(modifier = Modifier.weight(1f))
              }
            }
            if (rowIndex != displayBooks.chunked(2).lastIndex) {
              Spacer(modifier = Modifier.height(10.dp))
            }
          }
        }
      }
    }
    if (hasEmptyBooks) {
      item {
        Box(modifier = Modifier.padding(horizontal = 18.dp)) {
          BaselineCard(
            title = "阅读内容为空",
            body = "当前还没有可展示的阅读推荐。",
            actionLabel = "重试",
            onAction = viewModel::refresh,
          )
        }
      }
    }
  }
}

@Composable
private fun ReadingDiscoveryCard(
  modifier: Modifier = Modifier,
  title: String,
  level: String,
  meta: String,
  seal: String,
  accent: String,
  onClick: () -> Unit = {},
) {
  Surface(
    modifier = modifier.clickable(onClick = onClick),
    color = HangyeolTheme.colorScheme.surface,
    shape = RoundedCornerShape(22.dp),
    border = BorderStroke(1.dp, HangyeolTheme.extendedColors.lineSoft),
    shadowElevation = 2.dp,
  ) {
    Column {
      Box(
        modifier =
          Modifier
            .fillMaxWidth()
            .height(132.dp)
            .background(shortcutAccent(accent)),
      ) {
        Text(
          text = seal,
          style = HangyeolTheme.typography.displayMedium.copy(fontFamily = FontFamily.Serif, fontSize = 48.sp, fontWeight = FontWeight.Medium),
          color = HangyeolTheme.colorScheme.onSurface.copy(alpha = 0.22f),
          modifier = Modifier.align(androidx.compose.ui.Alignment.Center),
        )
        KSoftChip(
          text = level,
          tone = "ink",
          size = "sm",
          modifier = Modifier.padding(start = 8.dp, top = 8.dp),
        )
      }
      Column(modifier = Modifier.padding(horizontal = 12.dp, vertical = 12.dp)) {
        Text(
          text = title,
          style = HangyeolTheme.typography.bodyMedium.copy(fontSize = 13.sp, lineHeight = 18.sp, fontWeight = FontWeight.ExtraBold),
          color = HangyeolTheme.colorScheme.onSurface,
        )
        Text(
          text = meta,
          style = HangyeolTheme.typography.labelSmall.copy(fontSize = 10.sp, lineHeight = 13.sp, fontWeight = FontWeight.SemiBold),
          color = HangyeolTheme.extendedColors.subtext,
          modifier = Modifier.padding(top = 4.dp),
        )
      }
    }
  }
}

@Composable
private fun PictureBookScreen(
  level: String,
  slug: String,
  onBack: () -> Unit,
  onNavigateRoute: (String) -> Unit,
) {
  val viewModel: ReadingLibraryViewModel =
    viewModel(factory = ReadingLibraryViewModel.factory(ComposeServiceLocator.contentRepository))
  val uiState by viewModel.uiState.collectAsStateWithLifecycle()
  val books = uiState.books
  val levelOptions = listOf("全部", "Level 1", "Level 2", "Level 3", "Level 4", "Level 5", "Level 6")
  var selectedLevel by rememberSaveable(level, slug) {
    mutableStateOf(
      level.takeIf { it in levelOptions } ?: "全部",
    )
  }
  val filteredBooks = books.filter { selectedLevel == "全部" || it.level == selectedLevel }
  val featuredBook =
    filteredBooks.firstOrNull { it.slug == slug }.takeIf { it != null }
      ?: books.firstOrNull { it.slug == slug }
      ?: filteredBooks.firstOrNull()
      ?: books.firstOrNull()

  LaunchedEffect(levelOptions.joinToString("|"), selectedLevel) {
    if (selectedLevel.isBlank() && levelOptions.isNotEmpty()) {
      selectedLevel = levelOptions.first()
    }
  }

  LazyColumn(
    modifier =
      Modifier
        .fillMaxSize()
        .background(HangyeolTheme.extendedColors.surfaceMuted)
        .statusBarsPadding(),
    contentPadding = PaddingValues(bottom = 32.dp),
  ) {
    item {
      Column(modifier = Modifier.fillMaxWidth().padding(horizontal = 22.dp, vertical = 14.dp)) {
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
          Surface(
            modifier = Modifier.size(42.dp).clickable { onBack() },
            color = HangyeolTheme.colorScheme.surface,
            shape = RoundedCornerShape(14.dp),
            border = BorderStroke(1.dp, HangyeolTheme.extendedColors.lineSoft),
          ) {
            Box(contentAlignment = androidx.compose.ui.Alignment.Center) {
              Text(text = "←", style = HangyeolTheme.typography.bodyMedium.copy(fontSize = 18.sp, lineHeight = 18.sp, fontWeight = FontWeight.Bold), color = HangyeolTheme.colorScheme.onSurface)
            }
          }
          Surface(
            modifier = Modifier.clickable {
              featuredBook?.let { onNavigateRoute(HangyeolDestination.ReaderFocus.createRoute(slug = it.slug)) }
            },
            color = HangyeolTheme.colorScheme.onSurface,
            shape = RoundedCornerShape(18.dp),
          ) {
            Text(
              text = "继续阅读",
              style = HangyeolTheme.typography.bodySmall.copy(fontSize = 12.sp, lineHeight = 16.sp, fontWeight = FontWeight.ExtraBold),
              color = HangyeolTheme.colorScheme.surface,
              modifier = Modifier.padding(horizontal = 14.dp, vertical = 10.dp),
            )
          }
        }
        Text(text = "冊 · LIBRARY", style = KSoftSerifLabelStyle(), color = HangyeolTheme.extendedColors.crimson, modifier = Modifier.padding(top = 14.dp))
        Text(text = "绘本馆", style = HangyeolTheme.typography.headlineMedium.copy(fontSize = 42.sp, lineHeight = 44.sp, fontWeight = FontWeight.ExtraBold), color = HangyeolTheme.colorScheme.onSurface, modifier = Modifier.padding(top = 4.dp))
      }
    }
    if (uiState.isLoading) {
      item {
        Box(modifier = Modifier.padding(horizontal = 18.dp)) {
          BaselineCard(title = "正在准备绘本馆", body = "正在读取绘本内容。")
        }
      }
    }
    uiState.errorMessage?.let { errorMessage ->
      item {
        Box(modifier = Modifier.padding(horizontal = 18.dp)) {
          BaselineCard(title = "绘本内容加载失败", body = errorMessage, actionLabel = "重试", onAction = viewModel::refresh)
        }
      }
    }
    if (!uiState.isLoading && uiState.errorMessage == null && featuredBook != null) {
      item {
        Column(modifier = Modifier.padding(horizontal = 18.dp, vertical = 24.dp)) {
          Text(text = "續 · CONTINUE", style = KSoftSerifLabelStyle(), color = HangyeolTheme.extendedColors.crimson)
          Text(text = if (selectedLevel == "全部") "绘本推荐" else "当前级别推荐", style = HangyeolTheme.typography.titleLarge.copy(fontSize = 24.sp, lineHeight = 28.sp, fontWeight = FontWeight.ExtraBold), color = HangyeolTheme.colorScheme.onSurface, modifier = Modifier.padding(top = 4.dp))
          Surface(
            modifier = Modifier.fillMaxWidth().padding(top = 12.dp),
            color = HangyeolTheme.colorScheme.surface,
            shape = RoundedCornerShape(28.dp),
            border = BorderStroke(1.dp, HangyeolTheme.extendedColors.lineSoft),
            shadowElevation = 3.dp,
          ) {
            Column(modifier = Modifier.padding(16.dp)) {
              Row(horizontalArrangement = Arrangement.spacedBy(14.dp)) {
                Box(
                  modifier =
                    Modifier
                      .width(96.dp)
                      .height(140.dp)
                      .background(shortcutAccent(featuredBook.accent), RoundedCornerShape(20.dp)),
                ) {
                  Text(
                    text = featuredBook.coverSeal,
                    style = HangyeolTheme.typography.displayMedium.copy(fontFamily = FontFamily.Serif, fontSize = 56.sp, fontWeight = FontWeight.Medium),
                    color = HangyeolTheme.colorScheme.onSurface.copy(alpha = 0.22f),
                    modifier = Modifier.align(androidx.compose.ui.Alignment.Center),
                  )
                }
                Column(modifier = Modifier.weight(1f).padding(top = 2.dp)) {
                  Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    KSoftChip(text = featuredBook.level, tone = "sky", size = "sm")
                    Text(text = featuredBook.featuredLabel.ifBlank { "推荐继续" }, style = HangyeolTheme.typography.labelSmall.copy(fontSize = 10.sp, lineHeight = 12.sp, fontWeight = FontWeight.Bold), color = HangyeolTheme.extendedColors.subtext, modifier = Modifier.padding(top = 6.dp))
                  }
                  Text(text = featuredBook.pageTitle, style = HangyeolTheme.typography.titleLarge.copy(fontSize = 24.sp, lineHeight = 28.sp, fontWeight = FontWeight.ExtraBold), color = HangyeolTheme.colorScheme.onSurface, modifier = Modifier.padding(top = 10.dp))
                  Text(text = featuredBook.summary, style = HangyeolTheme.typography.bodySmall.copy(fontSize = 12.sp, lineHeight = 18.sp, fontWeight = FontWeight.Medium), color = HangyeolTheme.extendedColors.subtext, modifier = Modifier.padding(top = 8.dp))
                }
              }
              Row(modifier = Modifier.padding(top = 16.dp), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                KSoftPrimaryButton(text = "继续这本", onClick = { onNavigateRoute(HangyeolDestination.ReaderFocus.createRoute(slug = featuredBook.slug)) }, modifier = Modifier.weight(1f))
                Surface(
                  modifier = Modifier.clickable { onNavigateRoute(HangyeolDestination.ReaderFocus.createRoute(slug = featuredBook.slug, pageIndex = 0)) },
                  color = HangyeolTheme.colorScheme.surface,
                  shape = RoundedCornerShape(18.dp),
                  border = BorderStroke(1.dp, HangyeolTheme.extendedColors.lineSoft),
                ) {
                  Text(
                    text = "从第一页",
                    style = HangyeolTheme.typography.bodySmall.copy(fontSize = 12.sp, lineHeight = 16.sp, fontWeight = FontWeight.ExtraBold),
                    color = HangyeolTheme.colorScheme.onSurface,
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp),
                  )
                }
              }
            }
          }
        }
      }
      item {
        Column(modifier = Modifier.padding(horizontal = 18.dp)) {
          Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            Column {
              Text(text = "集 · SHELF", style = KSoftSerifLabelStyle(), color = HangyeolTheme.extendedColors.crimson)
              Text(text = "${selectedLevel} 书架", style = HangyeolTheme.typography.titleLarge.copy(fontSize = 24.sp, lineHeight = 28.sp, fontWeight = FontWeight.ExtraBold), color = HangyeolTheme.colorScheme.onSurface, modifier = Modifier.padding(top = 4.dp))
            }
            KSoftChip(text = "${filteredBooks.size} 册", tone = "muted", size = "sm")
          }
          Spacer(modifier = Modifier.height(12.dp))
          LazyRow(
            contentPadding = PaddingValues(bottom = 12.dp),
            horizontalArrangement = Arrangement.spacedBy(10.dp),
          ) {
            items(levelOptions) { option ->
              val active = option == selectedLevel
              Surface(
                modifier =
                  Modifier.clickable {
                    selectedLevel = option
                    onNavigateRoute(
                      HangyeolDestination.PictureBook.createRoute(
                        level = option.takeUnless { it == "全部" },
                      ),
                    )
                  },
                color = if (active) HangyeolTheme.colorScheme.onSurface else HangyeolTheme.colorScheme.surface,
                shape = RoundedCornerShape(22.dp),
                border = if (active) null else BorderStroke(1.dp, HangyeolTheme.extendedColors.lineSoft),
              ) {
                Row(
                  modifier = Modifier.padding(horizontal = 14.dp, vertical = 10.dp),
                  horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                  Text(
                    text = option,
                    style = HangyeolTheme.typography.bodySmall.copy(fontSize = 12.sp, lineHeight = 16.sp, fontWeight = FontWeight.ExtraBold),
                    color = if (active) HangyeolTheme.colorScheme.surface else HangyeolTheme.colorScheme.onSurface,
                  )
                  Surface(
                    color = if (active) Color.White.copy(alpha = 0.14f) else HangyeolTheme.extendedColors.surfaceMuted,
                    shape = RoundedCornerShape(12.dp),
                  ) {
                    Text(
                      text = if (option == "全部") books.size.toString() else books.count { it.level == option }.toString(),
                      style = HangyeolTheme.typography.labelSmall.copy(fontSize = 10.sp, lineHeight = 12.sp, fontWeight = FontWeight.Bold),
                      color = if (active) HangyeolTheme.colorScheme.surface else HangyeolTheme.extendedColors.subtext,
                      modifier = Modifier.padding(horizontal = 7.dp, vertical = 5.dp),
                    )
                  }
                }
              }
            }
          }
          filteredBooks.chunked(2).forEachIndexed { rowIndex, rowItems ->
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
              rowItems.forEach { book ->
                PictureBookShelfCard(
                  modifier = Modifier.weight(1f),
                  title = book.pageTitle,
                  level = book.level,
                  seal = book.coverSeal,
                  accent = book.accent,
                  onClick = { onNavigateRoute(HangyeolDestination.ReaderFocus.createRoute(slug = book.slug)) },
                )
              }
              if (rowItems.size == 1) Spacer(modifier = Modifier.weight(1f))
            }
            if (rowIndex != filteredBooks.chunked(2).lastIndex) Spacer(modifier = Modifier.height(10.dp))
          }
        }
      }
    }
  }
}

@Composable
private fun ReadingShelfPill(
  label: String,
  value: String,
) {
  Surface(
    color = HangyeolTheme.colorScheme.surface,
    shape = RoundedCornerShape(18.dp),
    border = BorderStroke(1.dp, HangyeolTheme.extendedColors.lineSoft),
  ) {
    Column(modifier = Modifier.padding(horizontal = 12.dp, vertical = 10.dp)) {
      Text(text = label, style = HangyeolTheme.typography.labelSmall.copy(fontSize = 10.sp, lineHeight = 12.sp, fontWeight = FontWeight.Bold), color = HangyeolTheme.extendedColors.subtext)
      Text(text = value, style = HangyeolTheme.typography.bodySmall.copy(fontSize = 12.sp, lineHeight = 16.sp, fontWeight = FontWeight.ExtraBold), color = HangyeolTheme.colorScheme.onSurface, modifier = Modifier.padding(top = 4.dp))
    }
  }
}

@Composable
private fun PictureBookShelfCard(
  modifier: Modifier = Modifier,
  title: String,
  level: String,
  seal: String,
  accent: String,
  onClick: () -> Unit,
) {
  Surface(
    modifier = modifier.clickable(onClick = onClick),
    color = Color.White.copy(alpha = 0.96f),
    shape = RoundedCornerShape(26.dp),
    border = BorderStroke(1.dp, HangyeolTheme.extendedColors.lineSoft),
    shadowElevation = 2.dp,
  ) {
    Column {
      Box(
        modifier =
          Modifier
            .fillMaxWidth()
            .height(214.dp)
            .background(shortcutAccent(accent)),
      ) {
        Text(
          text = seal,
          style = HangyeolTheme.typography.displayMedium.copy(fontFamily = FontFamily.Serif, fontSize = 64.sp, fontWeight = FontWeight.Medium),
          color = HangyeolTheme.colorScheme.onSurface.copy(alpha = 0.22f),
          modifier = Modifier.align(androidx.compose.ui.Alignment.Center),
        )
        KSoftChip(
          text = level,
          tone = "ink",
          size = "sm",
          modifier = Modifier.padding(start = 10.dp, top = 10.dp),
        )
      }
      Column(
        modifier =
          Modifier
            .fillMaxWidth()
            .heightIn(min = 92.dp)
            .padding(horizontal = 14.dp, vertical = 14.dp),
      ) {
        Text(
          text = title,
          style = HangyeolTheme.typography.titleMedium.copy(fontSize = 18.sp, lineHeight = 24.sp, fontWeight = FontWeight.ExtraBold),
          color = HangyeolTheme.colorScheme.onSurface,
          maxLines = 2,
          overflow = TextOverflow.Ellipsis,
        )
      }
    }
  }
}

@Composable
private fun ReaderFocusScreen(
  slug: String,
  pageIndex: Int,
  onBack: () -> Unit,
  onNavigateRoute: (String) -> Unit,
) {
  val viewModel: ReadingLibraryViewModel =
    viewModel(factory = ReadingLibraryViewModel.factory(ComposeServiceLocator.contentRepository))
  val uiState by viewModel.uiState.collectAsStateWithLifecycle()
  val books = uiState.books
  val activeBook = books.firstOrNull { it.slug == slug } ?: books.firstOrNull()
  var currentPageIndex by rememberSaveable(slug, pageIndex) {
    mutableStateOf(pageIndex.coerceAtLeast(0))
  }
  var translationEnabled by rememberSaveable(slug, pageIndex) { mutableStateOf(false) }
  var isReadingAloud by rememberSaveable(slug, pageIndex) { mutableStateOf(false) }
  var hydratedPages by remember(slug) { mutableStateOf<List<ReadingPageUiModel>>(emptyList()) }
  var isHydratingPages by rememberSaveable(slug) { mutableStateOf(false) }
  var hydrationErrorMessage by rememberSaveable(slug) { mutableStateOf<String?>(null) }
  var isAiTranslating by rememberSaveable(slug, pageIndex) { mutableStateOf(false) }
  var aiTranslationErrorMessage by rememberSaveable(slug, pageIndex) { mutableStateOf<String?>(null) }
  var translatedPageIndexes by remember(slug) { mutableStateOf(setOf<Int>()) }

  LaunchedEffect(activeBook?.slug) {
    val book = activeBook ?: run {
      hydratedPages = emptyList()
      isHydratingPages = false
      hydrationErrorMessage = null
      isAiTranslating = false
      aiTranslationErrorMessage = null
      translatedPageIndexes = emptySet()
      return@LaunchedEffect
    }
    if (book.pageContent.isNotEmpty()) {
      hydratedPages = book.pageContent
      isHydratingPages = false
      hydrationErrorMessage = null
      isAiTranslating = false
      aiTranslationErrorMessage = null
      translatedPageIndexes = emptySet()
      return@LaunchedEffect
    }

    isHydratingPages = true
    hydrationErrorMessage = null
    isAiTranslating = false
    aiTranslationErrorMessage = null
    translatedPageIndexes = emptySet()
    runCatching {
      ComposeServiceLocator.contentRepository.loadReadingBookPages(book.slug, book.pages)
    }
      .onSuccess { pages ->
        hydratedPages = pages
        if (pages.isEmpty()) {
          hydrationErrorMessage = "正文缺失，暂时无法阅读。"
        }
      }
      .onFailure { throwable ->
        hydratedPages = emptyList()
        hydrationErrorMessage = throwable.message ?: "正文加载失败，请稍后重试"
      }
    isHydratingPages = false
  }

  val pages = if (hydratedPages.isNotEmpty()) hydratedPages else activeBook?.pageContent.orEmpty()
  val safePageIndex = currentPageIndex.coerceIn(0, (pages.size - 1).coerceAtLeast(0))
  val activePage = pages.getOrNull(safePageIndex)
  val hasTranslation = activePage?.paragraphs?.any { it.translation.isNotBlank() } == true

  if (currentPageIndex != safePageIndex) {
    currentPageIndex = safePageIndex
  }

  LaunchedEffect(translationEnabled, safePageIndex, activeBook?.slug, activePage?.title) {
    if (!translationEnabled) {
      aiTranslationErrorMessage = null
      return@LaunchedEffect
    }
    val book = activeBook ?: return@LaunchedEffect
    val page = activePage ?: return@LaunchedEffect
    if (page.paragraphs.isEmpty()) return@LaunchedEffect
    if (page.paragraphs.any { it.translation.isNotBlank() }) return@LaunchedEffect
    if (translatedPageIndexes.contains(safePageIndex) || isAiTranslating) return@LaunchedEffect

    isAiTranslating = true
    aiTranslationErrorMessage = null
    val result =
      ComposeServiceLocator.contentRepository.translateReadingParagraphs(
        title = "${book.pageTitle.ifBlank { book.title }} · ${page.title}",
        paragraphs = page.paragraphs.map { it.text },
        language = "zh",
      )
    result
      .onSuccess { translations ->
        if (translations.any { it.isNotBlank() }) {
          val sourcePages = if (hydratedPages.isNotEmpty()) hydratedPages else pages
          if (safePageIndex in sourcePages.indices) {
            val targetPage = sourcePages[safePageIndex]
            val nextParagraphs =
              targetPage.paragraphs.mapIndexed { idx, paragraph ->
                paragraph.copy(translation = translations.getOrNull(idx).orEmpty())
              }
            val nextPages = sourcePages.toMutableList()
            nextPages[safePageIndex] = targetPage.copy(paragraphs = nextParagraphs)
            hydratedPages = nextPages
            translatedPageIndexes = translatedPageIndexes + safePageIndex
          }
        } else {
          aiTranslationErrorMessage = "AI 未返回可用译文。"
        }
      }
      .onFailure { throwable ->
        aiTranslationErrorMessage = throwable.message ?: "AI 翻译失败，请稍后重试。"
      }
    isAiTranslating = false
  }

  LazyColumn(
    modifier =
      Modifier
        .fillMaxSize()
        .background(Color(0xFFF7F0E4))
        .statusBarsPadding(),
    contentPadding = PaddingValues(bottom = 24.dp),
  ) {
    item {
      Row(
        modifier = Modifier.fillMaxWidth().padding(horizontal = 22.dp, vertical = 10.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
      ) {
        Surface(
          modifier = Modifier.size(36.dp).clickable { onBack() },
          color = Color.Black.copy(alpha = 0.06f),
          shape = RoundedCornerShape(18.dp),
        ) {
          Box(contentAlignment = androidx.compose.ui.Alignment.Center) {
            Text(text = "←", style = HangyeolTheme.typography.bodyMedium.copy(fontSize = 16.sp, lineHeight = 16.sp, fontWeight = FontWeight.Bold), color = HangyeolTheme.colorScheme.onSurface)
          }
        }
        Text(
          text = "第 ${safePageIndex + 1} / ${pages.size.coerceAtLeast(1)} 页",
          style = KSoftOverlineStyle(),
          color = HangyeolTheme.extendedColors.subtext,
          modifier = Modifier.padding(top = 10.dp),
        )
        Surface(
          modifier = Modifier.size(36.dp),
          color = Color.Black.copy(alpha = 0.06f),
          shape = RoundedCornerShape(18.dp),
        ) {
          Box(contentAlignment = androidx.compose.ui.Alignment.Center) {
            Text(text = "▭", style = HangyeolTheme.typography.bodySmall.copy(fontSize = 14.sp, lineHeight = 14.sp, fontWeight = FontWeight.Bold), color = HangyeolTheme.colorScheme.onSurface)
          }
        }
      }
    }
    if (uiState.isLoading || isHydratingPages) {
      item {
        Box(modifier = Modifier.padding(horizontal = 22.dp, vertical = 120.dp)) {
          BaselineCard(title = "正在准备阅读专注页", body = "正在读取阅读内容。")
        }
      }
    } else if (activeBook == null || activePage == null) {
      item {
        Box(modifier = Modifier.padding(horizontal = 22.dp, vertical = 120.dp)) {
          BaselineCard(
            title = "暂无可读内容",
            body = hydrationErrorMessage ?: "阅读内容为空。",
            actionLabel = "返回阅读页",
            onAction = { onNavigateRoute(HangyeolDestination.Reading.pattern) },
          )
        }
      }
    } else {
      item {
        Column(modifier = Modifier.padding(horizontal = 26.dp, vertical = 6.dp)) {
          Box(
            modifier =
              Modifier
                .fillMaxWidth()
                .height(244.dp)
                .background(shortcutAccent(activePage.imageAccent), RoundedCornerShape(28.dp)),
          ) {
            Text(
              text = activePage.imageSeal,
              style = HangyeolTheme.typography.displayMedium.copy(fontFamily = FontFamily.Serif, fontSize = 82.sp, fontWeight = FontWeight.Medium),
              color = HangyeolTheme.colorScheme.onSurface.copy(alpha = 0.18f),
              modifier = Modifier.align(androidx.compose.ui.Alignment.Center),
            )
            Row(
              modifier =
                Modifier
                  .align(androidx.compose.ui.Alignment.TopEnd)
                  .padding(top = 16.dp, end = 16.dp),
              horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
              ReaderToolChip(label = if (translationEnabled) "关闭翻译" else "翻译", active = translationEnabled) {
                translationEnabled = !translationEnabled
              }
              ReaderToolChip(label = if (isReadingAloud) "暂停" else "朗读", active = isReadingAloud) {
                isReadingAloud = !isReadingAloud
              }
            }
          }
        }
      }
      item {
        Column(modifier = Modifier.padding(horizontal = 26.dp, vertical = 14.dp)) {
          Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            Text(text = activeBook.level, style = KSoftOverlineStyle(), color = HangyeolTheme.extendedColors.subtext)
            Text(text = activeBook.pageTitle, style = HangyeolTheme.typography.labelSmall.copy(fontSize = 10.sp, lineHeight = 12.sp, fontWeight = FontWeight.ExtraBold), color = HangyeolTheme.extendedColors.subtext)
          }
          Text(text = activePage.title, style = HangyeolTheme.typography.titleLarge.copy(fontSize = 26.sp, lineHeight = 30.sp, fontWeight = FontWeight.ExtraBold), color = HangyeolTheme.colorScheme.onSurface, modifier = Modifier.padding(top = 8.dp))
          Text(text = "字幕", style = KSoftOverlineStyle(), color = HangyeolTheme.extendedColors.subtext, modifier = Modifier.padding(top = 18.dp))
          if (activePage.paragraphs.isEmpty()) {
            BaselineCard(
              title = "正文缺失",
              body = "当前页没有可展示的正文内容。",
            )
          } else {
            activePage.paragraphs.forEach { paragraph ->
              Surface(
                modifier = Modifier.fillMaxWidth().padding(top = 12.dp),
                color = Color(0xFFFEFCF6),
                shape = RoundedCornerShape(22.dp),
                border = BorderStroke(1.dp, Color(0x14312921)),
                shadowElevation = 2.dp,
              ) {
                Column(modifier = Modifier.padding(horizontal = 18.dp, vertical = 16.dp)) {
                  Text(
                    text = paragraph.text,
                    style = HangyeolTheme.typography.bodyLarge.copy(fontSize = 23.sp, lineHeight = 38.sp, fontWeight = FontWeight.Medium),
                    color = HangyeolTheme.colorScheme.onSurface,
                  )
                  if (translationEnabled && paragraph.translation.isNotBlank()) {
                    Text(
                      text = paragraph.translation,
                      style = HangyeolTheme.typography.bodyMedium.copy(fontSize = 16.sp, lineHeight = 28.sp, fontWeight = FontWeight.Medium),
                      color = HangyeolTheme.extendedColors.subtext,
                      modifier = Modifier.padding(top = 10.dp),
                    )
                  }
                }
              }
            }
            if (translationEnabled && !hasTranslation) {
              Text(
                text =
                  when {
                    isAiTranslating -> "AI 正在生成译文..."
                    !aiTranslationErrorMessage.isNullOrBlank() -> aiTranslationErrorMessage ?: "当前页暂无译文。"
                    else -> "当前页暂无译文。"
                  },
                style = HangyeolTheme.typography.bodySmall.copy(fontSize = 12.sp, lineHeight = 18.sp, fontWeight = FontWeight.Medium),
                color = HangyeolTheme.extendedColors.subtext,
                modifier = Modifier.padding(top = 12.dp),
              )
            }
          }
        }
      }
      item {
        Surface(
          modifier = Modifier.fillMaxWidth().navigationBarsPadding(),
          color = Color(0xFFF7F0E4),
          border = BorderStroke(1.dp, Color(0x14312921)),
        ) {
          Row(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 26.dp, vertical = 14.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
          ) {
            ReaderControlButton(
              label = "上一页",
              primary = false,
              enabled = safePageIndex > 0,
            ) {
              if (safePageIndex > 0) currentPageIndex -= 1
            }
            ReaderControlButton(
              label = if (isReadingAloud) "暂停" else "朗读",
              primary = true,
              enabled = true,
            ) {
              isReadingAloud = !isReadingAloud
            }
            ReaderControlButton(
              label = if (safePageIndex < pages.lastIndex) "下一页" else "完成",
              primary = false,
              enabled = true,
            ) {
              if (safePageIndex < pages.lastIndex) {
                currentPageIndex += 1
              } else {
                onNavigateRoute(HangyeolDestination.PictureBook.createRoute(level = activeBook.level, slug = activeBook.slug))
              }
            }
          }
        }
      }
    }
  }
}

@Composable
private fun ReaderToolChip(
  label: String,
  active: Boolean,
  onClick: () -> Unit,
) {
  Surface(
    modifier = Modifier.clickable { onClick() },
    color = if (active) Color(0xCC1F1B17) else Color.White.copy(alpha = 0.24f),
    shape = RoundedCornerShape(999.dp),
    border = BorderStroke(1.dp, if (active) Color.White.copy(alpha = 0.14f) else Color.White.copy(alpha = 0.22f)),
  ) {
    Text(
      text = label,
      style = HangyeolTheme.typography.labelSmall.copy(fontSize = 11.sp, lineHeight = 14.sp, fontWeight = FontWeight.ExtraBold),
      color = if (active) HangyeolTheme.colorScheme.surface else HangyeolTheme.colorScheme.onSurface,
      modifier = Modifier.padding(horizontal = 12.dp, vertical = 10.dp),
    )
  }
}

@Composable
private fun ReaderControlButton(
  label: String,
  primary: Boolean,
  enabled: Boolean,
  onClick: () -> Unit,
) {
  Surface(
    modifier = Modifier.width(if (primary) 104.dp else 76.dp).clickable(enabled = enabled) { onClick() },
    color =
      when {
        !enabled -> Color.White.copy(alpha = 0.52f)
        primary -> HangyeolTheme.colorScheme.onSurface
        else -> Color.White.copy(alpha = 0.82f)
      },
    shape = RoundedCornerShape(if (primary) 26.dp else 22.dp),
    border = BorderStroke(1.dp, if (primary) HangyeolTheme.colorScheme.onSurface else HangyeolTheme.extendedColors.lineSoft),
    shadowElevation = 2.dp,
  ) {
    Box(
      modifier = Modifier.height(if (primary) 78.dp else 72.dp),
      contentAlignment = androidx.compose.ui.Alignment.Center,
    ) {
      Text(
        text = label,
        style = HangyeolTheme.typography.bodySmall.copy(fontSize = 12.sp, lineHeight = 16.sp, fontWeight = FontWeight.ExtraBold),
        color =
          when {
            !enabled -> HangyeolTheme.extendedColors.subtext
            primary -> HangyeolTheme.colorScheme.surface
            else -> HangyeolTheme.colorScheme.onSurface
          },
      )
    }
  }
}

@Composable
private fun VideoLibraryScreen(
  onBack: () -> Unit,
  onNavigateRoute: (String) -> Unit,
) {
  val viewModel: VideoLibraryViewModel =
    viewModel(factory = VideoLibraryViewModel.factory(ComposeServiceLocator.contentRepository))
  val uiState by viewModel.uiState.collectAsStateWithLifecycle()
  val featuredVideo = uiState.lessons.firstOrNull()
  val hasEmptyVideos = !uiState.isLoading && uiState.errorMessage == null && uiState.lessons.isEmpty()
  LazyColumn(
    modifier =
      Modifier
        .fillMaxSize()
        .background(HangyeolTheme.colorScheme.background)
        .statusBarsPadding()
        .padding(horizontal = HangyeolTheme.spacing.lg),
    verticalArrangement = Arrangement.spacedBy(0.dp),
    contentPadding = PaddingValues(bottom = 32.dp),
  ) {
    item {
      Row(
        modifier = Modifier.fillMaxWidth().padding(top = 8.dp, bottom = 18.dp),
        horizontalArrangement = Arrangement.spacedBy(10.dp),
        verticalAlignment = androidx.compose.ui.Alignment.CenterVertically,
      ) {
        Surface(
          modifier = Modifier.size(36.dp).clickable { onBack() },
          color = HangyeolTheme.colorScheme.surface,
          shape = RoundedCornerShape(18.dp),
          border = BorderStroke(1.dp, HangyeolTheme.extendedColors.lineSoft),
          shadowElevation = 2.dp,
        ) {
          Box(contentAlignment = androidx.compose.ui.Alignment.Center) {
            Text(
              text = "←",
              style = HangyeolTheme.typography.titleMedium.copy(fontSize = 16.sp, lineHeight = 16.sp, fontWeight = FontWeight.ExtraBold),
              color = HangyeolTheme.colorScheme.onSurface,
            )
          }
        }
        Column(modifier = Modifier.weight(1f)) {
          Text(text = "映 · VIDEO", style = KSoftSerifLabelStyle(), color = HangyeolTheme.colorScheme.secondary)
          Text(
            text = "视频学习",
            style = HangyeolTheme.typography.headlineMedium.copy(fontSize = 30.sp, lineHeight = 34.sp, fontWeight = FontWeight.ExtraBold),
            color = HangyeolTheme.colorScheme.onSurface,
            modifier = Modifier.padding(top = 4.dp),
          )
        }
      }
    }
    if (uiState.isLoading) {
      item {
        BaselineCard(title = "正在加载视频库", body = "视频列表、权益和播放入口正在从 Convex 同步。")
      }
    }
    uiState.errorMessage?.let { errorMessage ->
      item {
        BaselineCard(
          title = "视频库加载失败",
          body = errorMessage,
          actionLabel = "重试",
          onAction = viewModel::refresh,
        )
      }
    }
    featuredVideo?.let { video ->
      item {
        Surface(
          modifier =
            Modifier
              .fillMaxWidth()
              .clickable {
                onNavigateRoute(video.route.ifBlank { HangyeolDestination.Videos.pattern })
              },
          color = HangyeolTheme.colorScheme.surface,
          shape = RoundedCornerShape(28.dp),
          border = BorderStroke(1.dp, HangyeolTheme.extendedColors.lineSoft),
          shadowElevation = 4.dp,
        ) {
          Column(modifier = Modifier.padding(20.dp)) {
            Box(
              modifier =
                Modifier
                  .fillMaxWidth()
                  .height(164.dp)
                  .background(
                    Brush.linearGradient(
                      colors = listOf(HangyeolTheme.extendedColors.indigo, HangyeolTheme.extendedColors.crimson),
                    ),
                    RoundedCornerShape(22.dp),
                  ),
              contentAlignment = androidx.compose.ui.Alignment.Center,
            ) {
              Text(
                text = "▶",
                style = HangyeolTheme.typography.titleLarge.copy(fontSize = 24.sp, lineHeight = 24.sp, fontWeight = FontWeight.Black),
                color = HangyeolTheme.colorScheme.surface,
              )
            }
            KSoftChip(text = "精选视频", tone = "crimson", size = "sm", modifier = Modifier.padding(top = 16.dp))
            Text(
              text = uiState.featuredTitle.ifBlank { video.title },
              style = HangyeolTheme.typography.titleLarge.copy(fontSize = 21.sp, lineHeight = 26.sp, fontWeight = FontWeight.ExtraBold),
              color = HangyeolTheme.colorScheme.onSurface,
              modifier = Modifier.padding(top = 10.dp),
            )
            Text(
              text = uiState.featuredSubtitle.ifBlank { video.subtitle },
              style = HangyeolTheme.typography.bodySmall.copy(fontSize = 12.sp, lineHeight = 16.sp, fontWeight = FontWeight.SemiBold),
              color = HangyeolTheme.extendedColors.subtext,
              modifier = Modifier.padding(top = 4.dp),
            )
            Row(
              modifier = Modifier.fillMaxWidth().padding(top = 16.dp),
              horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
              listOf("播放", "词典", "笔记", "进度").forEach { label ->
                VideoActionChip(modifier = Modifier.weight(1f), seal = label.take(1), label = label)
              }
            }
          }
        }
      }
    }
    item {
      KSoftSectionHead(kanji = "列", title = "视频列表")
    }
    if (hasEmptyVideos) {
      item {
        BaselineCard(
          title = "暂无视频内容",
          body = "Convex 当前没有返回可播放的视频；Android 不再显示示例视频。",
          actionLabel = "刷新",
          onAction = viewModel::refresh,
        )
      }
    }
    items(uiState.lessons) { video ->
      ResumeCard(
        title = video.title,
        subtitle = listOf(video.subtitle, video.duration).filter { it.isNotBlank() }.joinToString(" · "),
        seal = "影",
        onClick = {
          onNavigateRoute(video.route.ifBlank { HangyeolDestination.Videos.pattern })
        },
      )
      Spacer(modifier = Modifier.height(10.dp))
    }
  }
}

@Composable
private fun VideoActionChip(
  modifier: Modifier = Modifier,
  seal: String,
  label: String,
) {
  Surface(
    modifier = modifier,
    color = HangyeolTheme.colorScheme.surface,
    shape = RoundedCornerShape(14.dp),
    border = BorderStroke(1.dp, HangyeolTheme.extendedColors.lineSoft),
    shadowElevation = 1.dp,
  ) {
    Column(
      modifier = Modifier.padding(vertical = 12.dp, horizontal = 8.dp),
      horizontalAlignment = androidx.compose.ui.Alignment.CenterHorizontally,
    ) {
      Text(
        text = seal,
        style = HangyeolTheme.typography.bodyMedium.copy(fontFamily = FontFamily.Serif, fontSize = 13.sp, lineHeight = 13.sp, fontWeight = FontWeight.Medium),
        color = HangyeolTheme.extendedColors.crimson,
      )
      Text(
        text = label,
        style = HangyeolTheme.typography.labelSmall.copy(fontSize = 10.sp, lineHeight = 12.sp, fontWeight = FontWeight.ExtraBold),
        color = HangyeolTheme.colorScheme.onSurface,
        modifier = Modifier.padding(top = 2.dp),
      )
    }
  }
}

@Composable
private fun VideoVocabRow(
  seal: String,
  word: String,
  meaning: String,
  showDivider: Boolean,
) {
  Column {
    Row(
      modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 12.dp),
      horizontalArrangement = Arrangement.spacedBy(12.dp),
      verticalAlignment = androidx.compose.ui.Alignment.CenterVertically,
    ) {
      Text(
        text = seal,
        style = HangyeolTheme.typography.labelSmall.copy(fontFamily = FontFamily.Serif, fontSize = 12.sp, lineHeight = 12.sp, fontWeight = FontWeight.Medium),
        color = HangyeolTheme.extendedColors.crimson,
        modifier = Modifier.width(36.dp),
      )
      Column(modifier = Modifier.weight(1f)) {
        Text(
          text = word,
          style = HangyeolTheme.typography.bodyMedium.copy(fontSize = 14.sp, lineHeight = 18.sp, fontWeight = FontWeight.ExtraBold),
          color = HangyeolTheme.colorScheme.onSurface,
        )
        Text(
          text = meaning,
          style = HangyeolTheme.typography.bodySmall.copy(fontSize = 11.sp, lineHeight = 15.sp, fontWeight = FontWeight.Medium),
          color = HangyeolTheme.extendedColors.subtext,
          modifier = Modifier.padding(top = 1.dp),
        )
      }
      Surface(
        modifier = Modifier.size(28.dp),
        color = Color.Transparent,
        shape = RoundedCornerShape(14.dp),
        border = BorderStroke(1.dp, HangyeolTheme.extendedColors.lineSoft),
      ) {
        Box(contentAlignment = androidx.compose.ui.Alignment.Center) {
          Text(
            text = "+",
            style = HangyeolTheme.typography.bodyMedium.copy(fontSize = 14.sp, lineHeight = 14.sp, fontWeight = FontWeight.Bold),
            color = HangyeolTheme.colorScheme.onSurface,
          )
        }
      }
    }
    if (showDivider) {
      HorizontalDivider(color = HangyeolTheme.extendedColors.lineSoft)
    }
  }
}

@Composable
private fun PodcastLibraryScreen(
  onBack: () -> Unit,
  onNavigateRoute: (String) -> Unit,
) {
  val viewModel: PodcastLibraryViewModel =
    viewModel(factory = PodcastLibraryViewModel.factory(ComposeServiceLocator.contentRepository))
  val uiState by viewModel.uiState.collectAsStateWithLifecycle()
  val queueItems = if (uiState.episodes.isNotEmpty()) uiState.episodes else emptyList()
  var isPlaying by rememberSaveable { mutableStateOf(true) }
  var transcriptExpanded by rememberSaveable { mutableStateOf(false) }
  var speedIndex by rememberSaveable { mutableStateOf(1) }
  val speedLabel = listOf("0.8x", "1.0x", "1.2x", "1.5x")[speedIndex]

  LazyColumn(
    modifier =
      Modifier
        .fillMaxSize()
        .background(
          Brush.verticalGradient(
            colors =
              listOf(
                HangyeolTheme.extendedColors.indigo,
                HangyeolTheme.colorScheme.onSurface,
              ),
          ),
        )
        .statusBarsPadding(),
    verticalArrangement = Arrangement.spacedBy(0.dp),
    contentPadding = PaddingValues(bottom = 40.dp),
  ) {
    if (uiState.isLoading) {
      item {
        Box(
          modifier = Modifier.fillParentMaxSize().padding(horizontal = 22.dp),
          contentAlignment = androidx.compose.ui.Alignment.Center,
        ) {
          BaselineCard(title = "正在准备播客页", body = "正在读取播客内容。")
        }
      }
    } else {
      item {
        Row(
          modifier = Modifier.fillMaxWidth().padding(start = 22.dp, end = 22.dp, top = 8.dp, bottom = 14.dp),
          verticalAlignment = androidx.compose.ui.Alignment.CenterVertically,
        ) {
          Surface(
            modifier = Modifier.size(38.dp).clickable { onBack() },
            color = Color.White.copy(alpha = 0.1f),
            shape = RoundedCornerShape(19.dp),
          ) {
            Box(contentAlignment = androidx.compose.ui.Alignment.Center) {
              Text(
                text = if (transcriptExpanded) "⌃" else "⌄",
                style = HangyeolTheme.typography.bodyMedium.copy(fontSize = 18.sp, lineHeight = 18.sp, fontWeight = FontWeight.Bold),
                color = HangyeolTheme.colorScheme.surface,
              )
            }
          }
          Box(modifier = Modifier.weight(1f), contentAlignment = androidx.compose.ui.Alignment.Center) {
            Text(
              text = if (transcriptExpanded) "字幕展开" else "지금 播放中 · 今",
              style = HangyeolTheme.typography.labelSmall.copy(fontSize = 11.sp, lineHeight = 14.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.sp),
              color = HangyeolTheme.colorScheme.surface.copy(alpha = 0.72f),
            )
          }
          Surface(
            modifier = Modifier.size(38.dp),
            color = Color.White.copy(alpha = 0.1f),
            shape = RoundedCornerShape(19.dp),
          ) {
            Box(contentAlignment = androidx.compose.ui.Alignment.Center) {
              Text(
                text = "⋯",
                style = HangyeolTheme.typography.bodyMedium.copy(fontSize = 18.sp, lineHeight = 18.sp, fontWeight = FontWeight.Bold),
                color = HangyeolTheme.colorScheme.surface,
              )
            }
          }
        }
      }
      item {
        Column(modifier = Modifier.padding(horizontal = 22.dp)) {
          Surface(
            modifier = Modifier.fillMaxWidth().height(328.dp),
            color = Color.White.copy(alpha = 0.08f),
            shape = RoundedCornerShape(32.dp),
            border = BorderStroke(1.dp, Color.White.copy(alpha = 0.08f)),
            shadowElevation = 8.dp,
          ) {
            Box(
              modifier =
                Modifier
                  .fillMaxSize()
                  .background(
                    Brush.linearGradient(
                      colors =
                        listOf(
                          HangyeolTheme.extendedColors.indigo,
                          HangyeolTheme.extendedColors.crimson,
                          HangyeolTheme.colorScheme.onSurface,
                        ),
                    ),
                  ),
            ) {
              Text(
                text = "聲",
                style = HangyeolTheme.typography.displayMedium.copy(fontFamily = FontFamily.Serif, fontSize = 88.sp, fontWeight = FontWeight.Medium),
                color = HangyeolTheme.colorScheme.surface.copy(alpha = 0.14f),
                modifier = Modifier.align(androidx.compose.ui.Alignment.BottomEnd).padding(end = 20.dp, bottom = 8.dp),
              )
            }
          }
          Text(
            text = uiState.featuredTitle.ifBlank { "暂无播放记录" },
            style = HangyeolTheme.typography.headlineMedium.copy(fontSize = 29.sp, lineHeight = 34.sp, fontWeight = FontWeight.ExtraBold),
            color = HangyeolTheme.colorScheme.surface,
            modifier = Modifier.padding(top = 20.dp),
          )
          Text(
            text = uiState.featuredSubtitle.ifBlank { "打开播客库搜索真实节目" },
            style = HangyeolTheme.typography.bodySmall.copy(fontSize = 12.sp, lineHeight = 16.sp, fontWeight = FontWeight.Medium),
            color = HangyeolTheme.colorScheme.surface.copy(alpha = 0.68f),
            modifier = Modifier.padding(top = 6.dp),
          )
          Surface(
            modifier = Modifier.fillMaxWidth().padding(top = 18.dp).clickable { transcriptExpanded = !transcriptExpanded },
            color = Color.White.copy(alpha = 0.07f),
            shape = RoundedCornerShape(28.dp),
            border = BorderStroke(1.dp, Color.White.copy(alpha = 0.08f)),
          ) {
            Column(modifier = Modifier.padding(18.dp)) {
              Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = androidx.compose.ui.Alignment.CenterVertically,
              ) {
                Text(
                  text = "字幕",
                  style = HangyeolTheme.typography.labelSmall.copy(fontSize = 11.sp, lineHeight = 14.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.sp),
                  color = HangyeolTheme.colorScheme.surface.copy(alpha = 0.58f),
                )
                Text(
                  text = if (transcriptExpanded) "收起" else "展开",
                  style = HangyeolTheme.typography.labelSmall.copy(fontSize = 11.sp, lineHeight = 14.sp, fontWeight = FontWeight.Bold),
                  color = HangyeolTheme.colorScheme.surface.copy(alpha = 0.62f),
                )
              }
              Text(
                text = uiState.transcriptPrimary.ifBlank { "暂无字幕内容" },
                style = HangyeolTheme.typography.bodyMedium.copy(fontSize = 17.sp, lineHeight = 26.sp, fontWeight = FontWeight.Bold),
                color = HangyeolTheme.colorScheme.surface,
                modifier = Modifier.padding(top = 10.dp),
              )
              Text(
                text = uiState.transcriptSecondary.ifBlank { "当前无译文" },
                style = HangyeolTheme.typography.bodySmall.copy(fontSize = 12.sp, lineHeight = 20.sp, fontWeight = FontWeight.Medium),
                color = HangyeolTheme.colorScheme.surface.copy(alpha = 0.72f),
                modifier = Modifier.padding(top = 8.dp),
              )
            }
          }
          Column(modifier = Modifier.padding(top = 18.dp)) {
            Box(
              modifier =
                Modifier
                  .fillMaxWidth()
                  .height(4.dp)
                  .background(Color.White.copy(alpha = 0.18f), RoundedCornerShape(3.dp)),
            ) {
              Box(
                modifier =
                  Modifier
                    .fillMaxWidth(0.36f)
                    .height(4.dp)
                    .background(HangyeolTheme.extendedColors.gold, RoundedCornerShape(3.dp)),
              )
            }
            Row(
              modifier = Modifier.fillMaxWidth().padding(top = 10.dp),
              horizontalArrangement = Arrangement.SpaceBetween,
            ) {
              Text(
                text = uiState.elapsedLabel.ifBlank { "--:--" },
                style = HangyeolTheme.typography.labelSmall.copy(fontSize = 14.sp, lineHeight = 16.sp, fontWeight = FontWeight.SemiBold),
                color = HangyeolTheme.colorScheme.surface.copy(alpha = 0.76f),
              )
              Text(
                text = uiState.remainingLabel.ifBlank { "--:--" },
                style = HangyeolTheme.typography.labelSmall.copy(fontSize = 14.sp, lineHeight = 16.sp, fontWeight = FontWeight.SemiBold),
                color = HangyeolTheme.colorScheme.surface.copy(alpha = 0.76f),
              )
            }
            Row(
              modifier = Modifier.fillMaxWidth().padding(top = 18.dp),
              horizontalArrangement = Arrangement.SpaceBetween,
              verticalAlignment = androidx.compose.ui.Alignment.CenterVertically,
            ) {
              PodcastUtilityPill(label = speedLabel, onClick = { speedIndex = (speedIndex + 1) % 4 })
              PodcastTransportButton(label = "15", onClick = {})
              PodcastTransportButton(label = if (isPlaying) "❚❚" else "▶", primary = true, onClick = { isPlaying = !isPlaying })
              PodcastTransportButton(label = "30", onClick = {})
              PodcastUtilityPill(label = "30s", onClick = {})
            }
            Row(
              modifier = Modifier.fillMaxWidth().padding(top = 22.dp),
              horizontalArrangement = Arrangement.spacedBy(10.dp),
            ) {
              listOf("字幕", speedLabel, if (isPlaying) "暂停" else "播放", "词汇本").forEach { label ->
                PodcastActionChip(
                  modifier = Modifier.weight(1f),
                  label = label,
                  onClick = {
                    when (label) {
                      "字幕" -> transcriptExpanded = !transcriptExpanded
                      speedLabel -> speedIndex = (speedIndex + 1) % 4
                      "暂停", "播放" -> isPlaying = !isPlaying
                    }
                  },
                )
              }
            }
          }
        }
      }
      item {
        Column(modifier = Modifier.padding(horizontal = 22.dp, vertical = 26.dp)) {
          Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = androidx.compose.ui.Alignment.CenterVertically,
          ) {
            Column {
              Text(
                text = "續 · QUEUE",
                style = KSoftSerifLabelStyle(),
                color = HangyeolTheme.colorScheme.surface.copy(alpha = 0.72f),
              )
              Text(
                text = "下一步收听",
                style = HangyeolTheme.typography.titleLarge.copy(fontSize = 22.sp, lineHeight = 26.sp, fontWeight = FontWeight.ExtraBold),
                color = HangyeolTheme.colorScheme.surface,
                modifier = Modifier.padding(top = 4.dp),
              )
            }
            Surface(
              color = Color.White.copy(alpha = 0.12f),
              shape = RoundedCornerShape(999.dp),
              border = BorderStroke(1.dp, Color.White.copy(alpha = 0.18f)),
            ) {
              Text(
                text = "节目库",
                style = HangyeolTheme.typography.labelSmall.copy(fontSize = 11.sp, lineHeight = 14.sp, fontWeight = FontWeight.Bold),
                color = HangyeolTheme.colorScheme.surface,
                modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
              )
            }
          }
          Column(modifier = Modifier.padding(top = 12.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            queueItems.forEach { item ->
              val destinationRoute =
                item.route.ifBlank {
                  if (item.channelId.isBlank()) "" else HangyeolDestination.PodcastChannel.createRoute(item.channelId)
                }
              PodcastQueueCard(
                title = item.title,
                subtitle = item.subtitle,
                badge = item.duration,
                onClick = if (destinationRoute.isBlank()) null else { { onNavigateRoute(destinationRoute) } },
              )
            }
          }
        }
      }
      item {
        Surface(
          modifier = Modifier.fillMaxWidth().padding(horizontal = 22.dp, vertical = 8.dp)
            .clickable { onNavigateRoute(HangyeolDestination.PodcastSubscriptions.pattern) },
          color = Color.White.copy(alpha = 0.08f),
          shape = RoundedCornerShape(14.dp),
        ) {
          Text("管理订阅", style = HangyeolTheme.typography.labelMedium.copy(fontWeight = FontWeight.Bold),
            color = HangyeolTheme.colorScheme.surface, modifier = Modifier.padding(horizontal = 16.dp, vertical = 14.dp))
        }
      }
    }
  }
}

@Composable
private fun PodcastChannelScreen(
  channelId: String,
  onBack: () -> Unit,
  onNavigateRoute: (String) -> Unit = {},
) {
  val decodedChannelId = Uri.decode(channelId).trim()
  val viewModel: PodcastChannelViewModel =
    viewModel(
      key = "podcast-channel-$decodedChannelId",
      factory =
        PodcastChannelViewModel.factory(
          contentRepository = ComposeServiceLocator.contentRepository,
          channelId = decodedChannelId,
        ),
    )
  val uiState by viewModel.uiState.collectAsStateWithLifecycle()
  val spacing = HangyeolTheme.spacing
  val hasEmptyEpisodes = !uiState.isLoading && uiState.errorMessage == null && uiState.episodes.isEmpty()

  LazyColumn(
    modifier =
      Modifier
        .fillMaxSize()
        .background(HangyeolTheme.colorScheme.background)
        .statusBarsPadding()
        .padding(horizontal = spacing.lg),
    verticalArrangement = Arrangement.spacedBy(spacing.lg),
    contentPadding = PaddingValues(bottom = spacing.xl),
  ) {
    item {
      Column(
        modifier =
          Modifier
            .fillMaxWidth()
            .padding(top = spacing.xs, bottom = 2.dp),
      ) {
        Surface(
          modifier = Modifier.size(36.dp).clickable { onBack() },
          color = HangyeolTheme.colorScheme.surface,
          shape = RoundedCornerShape(18.dp),
          border = BorderStroke(1.dp, HangyeolTheme.extendedColors.lineSoft),
          shadowElevation = 2.dp,
        ) {
          Box(contentAlignment = androidx.compose.ui.Alignment.Center) {
            Text(
              text = "←",
              style = HangyeolTheme.typography.titleMedium.copy(fontSize = 16.sp, lineHeight = 16.sp, fontWeight = FontWeight.ExtraBold),
              color = HangyeolTheme.colorScheme.onSurface,
            )
          }
        }
        Text(
          text = "聲 · CHANNEL",
          style = KSoftSerifLabelStyle(),
          color = HangyeolTheme.extendedColors.crimson,
          modifier = Modifier.padding(top = 14.dp),
        )
        Text(
          text = "频道剧集",
          style = HangyeolTheme.typography.headlineMedium.copy(fontSize = 26.sp, lineHeight = 30.sp, fontWeight = FontWeight.ExtraBold),
          color = HangyeolTheme.colorScheme.onSurface,
          modifier = Modifier.padding(top = 4.dp),
        )
      }
    }
    if (uiState.isLoading) {
      item {
        BaselineCard(
          title = "正在加载频道剧集",
          body = "正在读取该频道的最新剧集。",
        )
      }
    }
    uiState.errorMessage?.let { message ->
      item {
        BaselineCard(
          title = "频道加载失败",
          body = message,
          actionLabel = "重试",
          onAction = viewModel::refresh,
        )
      }
    }
    item {
      BaselineCard(
        title = uiState.featuredTitle.ifBlank { "播客频道" },
        body = uiState.featuredSubtitle.ifBlank { "频道信息暂不可用。" },
      )
    }
    if (hasEmptyEpisodes) {
      item {
        BaselineCard(
          title = "暂无剧集",
          body = "该频道暂时没有可播放的剧集。",
          actionLabel = "重试",
          onAction = viewModel::refresh,
        )
      }
    }
    items(uiState.episodes.size) { index ->
      val episode = uiState.episodes[index]
      val episodeRoute = episode.route.ifBlank {
        HangyeolDestination.PodcastPlayer.createRoute(episode.channelId)
      }
      ResumeCard(
        title = episode.title,
        subtitle = "${episode.subtitle} · ${episode.duration}",
        seal = "聲",
        onClick = { onNavigateRoute(episodeRoute) },
      )
    }
  }
}

@Composable
private fun PodcastUtilityPill(
  label: String,
  onClick: () -> Unit,
) {
  Surface(
    modifier = Modifier.clickable { onClick() },
    color = Color.White.copy(alpha = 0.08f),
    shape = RoundedCornerShape(20.dp),
    border = BorderStroke(1.dp, Color.White.copy(alpha = 0.12f)),
  ) {
    Text(
      text = label,
      style = HangyeolTheme.typography.labelSmall.copy(fontSize = 12.sp, lineHeight = 14.sp, fontWeight = FontWeight.Bold),
      color = HangyeolTheme.colorScheme.surface,
      modifier = Modifier.padding(horizontal = 12.dp, vertical = 10.dp),
    )
  }
}

@Composable
private fun PodcastTransportButton(
  label: String,
  primary: Boolean = false,
  onClick: () -> Unit,
) {
  Surface(
    modifier = Modifier.size(if (primary) 64.dp else 46.dp).clickable { onClick() },
    color = if (primary) HangyeolTheme.colorScheme.surface else Color.White.copy(alpha = 0.08f),
    shape = RoundedCornerShape(if (primary) 32.dp else 23.dp),
    border = if (primary) null else BorderStroke(1.dp, Color.White.copy(alpha = 0.12f)),
  ) {
    Box(contentAlignment = androidx.compose.ui.Alignment.Center) {
      Text(
        text = label,
        style = HangyeolTheme.typography.bodyMedium.copy(fontSize = if (primary) 22.sp else 13.sp, lineHeight = if (primary) 22.sp else 13.sp, fontWeight = FontWeight.Bold),
        color = if (primary) HangyeolTheme.colorScheme.onSurface else HangyeolTheme.colorScheme.surface,
      )
    }
  }
}

@Composable
private fun PodcastActionChip(
  modifier: Modifier = Modifier,
  label: String,
  onClick: () -> Unit,
) {
  Surface(
    modifier = modifier.clickable { onClick() },
    color = Color.White.copy(alpha = 0.08f),
    shape = RoundedCornerShape(16.dp),
    border = BorderStroke(1.dp, Color.White.copy(alpha = 0.12f)),
  ) {
    Box(
      modifier = Modifier.fillMaxWidth().padding(vertical = 14.dp),
      contentAlignment = androidx.compose.ui.Alignment.Center,
    ) {
      Text(
        text = label,
        style = HangyeolTheme.typography.labelSmall.copy(fontSize = 11.sp, lineHeight = 13.sp, fontWeight = FontWeight.ExtraBold),
        color = HangyeolTheme.colorScheme.surface,
      )
    }
  }
}

@Composable
private fun PodcastQueueCard(
  title: String,
  subtitle: String,
  badge: String,
  onClick: (() -> Unit)? = null,
) {
  Surface(
    modifier = if (onClick == null) Modifier else Modifier.clickable { onClick() },
    color = Color.White.copy(alpha = 0.08f),
    shape = RoundedCornerShape(22.dp),
    border = BorderStroke(1.dp, Color.White.copy(alpha = 0.12f)),
  ) {
    Row(
      modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 14.dp),
      horizontalArrangement = Arrangement.spacedBy(12.dp),
      verticalAlignment = androidx.compose.ui.Alignment.CenterVertically,
    ) {
      Surface(
        modifier = Modifier.size(44.dp),
        color = Color.White.copy(alpha = 0.12f),
        shape = RoundedCornerShape(14.dp),
      ) {
        Box(contentAlignment = androidx.compose.ui.Alignment.Center) {
          Text(
            text = "聲",
            style = HangyeolTheme.typography.bodyMedium.copy(fontFamily = FontFamily.Serif, fontSize = 20.sp, lineHeight = 20.sp, fontWeight = FontWeight.Medium),
            color = HangyeolTheme.colorScheme.surface,
          )
        }
      }
      Column(modifier = Modifier.weight(1f)) {
        Text(
          text = title,
          style = HangyeolTheme.typography.bodyMedium.copy(fontSize = 14.sp, lineHeight = 18.sp, fontWeight = FontWeight.ExtraBold),
          color = HangyeolTheme.colorScheme.surface,
        )
        Text(
          text = subtitle,
          style = HangyeolTheme.typography.bodySmall.copy(fontSize = 11.sp, lineHeight = 15.sp, fontWeight = FontWeight.Medium),
          color = HangyeolTheme.colorScheme.surface.copy(alpha = 0.68f),
          modifier = Modifier.padding(top = 2.dp),
        )
      }
      Surface(
        color = Color.White.copy(alpha = 0.12f),
        shape = RoundedCornerShape(999.dp),
      ) {
        Text(
          text = badge,
          style = HangyeolTheme.typography.labelSmall.copy(fontSize = 10.sp, lineHeight = 12.sp, fontWeight = FontWeight.Bold),
          color = HangyeolTheme.colorScheme.surface,
          modifier = Modifier.padding(horizontal = 10.dp, vertical = 7.dp),
        )
      }
    }
  }
}


@Composable
private fun PodcastSearchScreen(
  onBack: () -> Unit,
  onNavigateRoute: (String) -> Unit,
) {
  val viewModel: PodcastSearchViewModel =
    viewModel(factory = PodcastSearchViewModel.factory(ComposeServiceLocator.contentRepository))
  val uiState by viewModel.uiState.collectAsStateWithLifecycle()
  val spacing = HangyeolTheme.spacing

  LazyColumn(
    modifier =
      Modifier
        .fillMaxSize()
        .background(HangyeolTheme.colorScheme.background)
        .statusBarsPadding()
        .padding(horizontal = spacing.lg),
    verticalArrangement = Arrangement.spacedBy(spacing.md),
    contentPadding = PaddingValues(bottom = spacing.xl),
  ) {
    item {
      Column(
        modifier = Modifier.fillMaxWidth().padding(top = spacing.xs, bottom = 2.dp),
      ) {
        Surface(
          modifier = Modifier.size(36.dp).clickable { onBack() },
          color = HangyeolTheme.colorScheme.surface,
          shape = RoundedCornerShape(18.dp),
          border = BorderStroke(1.dp, HangyeolTheme.extendedColors.lineSoft),
          shadowElevation = 2.dp,
        ) {
          Box(contentAlignment = androidx.compose.ui.Alignment.Center) {
            Text(
              text = "←",
              style = HangyeolTheme.typography.titleMedium.copy(fontSize = 16.sp, lineHeight = 16.sp, fontWeight = FontWeight.ExtraBold),
              color = HangyeolTheme.colorScheme.onSurface,
            )
          }
        }
        Text(
          text = "搜 · SEARCH",
          style = KSoftSerifLabelStyle(),
          color = HangyeolTheme.extendedColors.crimson,
          modifier = Modifier.padding(top = 14.dp),
        )
        Text(
          text = "播客搜索",
          style = HangyeolTheme.typography.headlineMedium.copy(fontSize = 26.sp, lineHeight = 30.sp, fontWeight = FontWeight.ExtraBold),
          color = HangyeolTheme.colorScheme.onSurface,
          modifier = Modifier.padding(top = 4.dp),
        )
      }
    }
    item {
      OutlinedTextField(
        value = uiState.query,
        onValueChange = viewModel::onQueryChanged,
        placeholder = {
          Text(
            text = "搜索韩语播客节目…",
            style = HangyeolTheme.typography.bodyMedium.copy(fontWeight = FontWeight.Medium),
          )
        },
        singleLine = true,
        shape = RoundedCornerShape(22.dp),
        modifier = Modifier.fillMaxWidth(),
        keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
        keyboardActions = KeyboardActions(onSearch = { viewModel.submitSearch() }),
      )
    }
    if (uiState.isLoading) {
      item {
        BaselineCard(title = "正在搜索", body = "正在从 iTunes 检索播客结果…")
      }
    }
    uiState.errorMessage?.let { msg ->
      item {
        BaselineCard(title = "搜索失败", body = msg, actionLabel = "重试", onAction = { viewModel.submitSearch() })
      }
    }
    if (!uiState.isLoading && uiState.errorMessage == null && uiState.results.isEmpty() && uiState.query.isNotBlank()) {
      item {
        BaselineCard(title = "未找到结果", body = "没有找到匹配「${uiState.query}」的播客节目。")
      }
    }
    items(uiState.results.size) { index ->
      val result = uiState.results[index]
      Surface(
        modifier = Modifier.fillMaxWidth().clickable {
          onNavigateRoute(HangyeolDestination.PodcastChannel.createRoute(result.id))
        },
        color = HangyeolTheme.colorScheme.surface,
        shape = RoundedCornerShape(22.dp),
        border = BorderStroke(1.dp, HangyeolTheme.extendedColors.lineSoft),
        shadowElevation = 3.dp,
      ) {
        Row(
          modifier = Modifier.padding(16.dp),
          horizontalArrangement = Arrangement.spacedBy(14.dp),
          verticalAlignment = androidx.compose.ui.Alignment.CenterVertically,
        ) {
          Surface(
            modifier = Modifier.size(52.dp),
            color = HangyeolTheme.extendedColors.tintLilac,
            shape = RoundedCornerShape(16.dp),
          ) {
            Box(contentAlignment = androidx.compose.ui.Alignment.Center) {
              Text(
                text = "聲",
                style = HangyeolTheme.typography.bodyMedium.copy(fontFamily = FontFamily.Serif, fontSize = 24.sp, fontWeight = FontWeight.Medium),
                color = HangyeolTheme.colorScheme.onSurface.copy(alpha = 0.22f),
              )
            }
          }
          Column(modifier = Modifier.weight(1f)) {
            Text(
              text = result.title,
              style = HangyeolTheme.typography.bodyMedium.copy(fontSize = 14.sp, lineHeight = 18.sp, fontWeight = FontWeight.ExtraBold),
              color = HangyeolTheme.colorScheme.onSurface,
              maxLines = 2,
            )
            if (result.author.isNotBlank()) {
              Text(
                text = result.author,
                style = HangyeolTheme.typography.bodySmall.copy(fontSize = 12.sp, lineHeight = 16.sp, fontWeight = FontWeight.Medium),
                color = HangyeolTheme.extendedColors.subtext,
                modifier = Modifier.padding(top = 2.dp),
                maxLines = 1,
              )
            }
          }
          Text(
            text = "→",
            style = HangyeolTheme.typography.titleMedium.copy(fontSize = 16.sp, fontWeight = FontWeight.Bold),
            color = HangyeolTheme.extendedColors.subtext,
          )
        }
      }
    }
  }
}

@Composable
private fun PodcastPlayerScreen(
  episodeId: String,
  onBack: () -> Unit,
) {
  val viewModel: PodcastPlayerViewModel =
    viewModel(
      key = "podcast-player-$episodeId",
      factory = PodcastPlayerViewModel.factory(ComposeServiceLocator.contentRepository, episodeId),
    )
  val uiState by viewModel.uiState.collectAsStateWithLifecycle()
  var isPlaying by rememberSaveable { mutableStateOf(false) }
  var transcriptExpanded by rememberSaveable { mutableStateOf(true) }
  var speedIndex by rememberSaveable { mutableStateOf(1) }
  val speedLabel = listOf("0.8x", "1.0x", "1.2x", "1.5x")[speedIndex]
  val progressFraction = if (uiState.durationSec > 0) uiState.elapsedSec.toFloat() / uiState.durationSec else 0f

  LazyColumn(
    modifier =
      Modifier
        .fillMaxSize()
        .background(
          Brush.verticalGradient(
            colors = listOf(HangyeolTheme.extendedColors.indigo, HangyeolTheme.colorScheme.onSurface),
          ),
        )
        .statusBarsPadding(),
    verticalArrangement = Arrangement.spacedBy(0.dp),
    contentPadding = PaddingValues(bottom = 40.dp),
  ) {
    if (uiState.isLoading) {
      item {
        Box(
          modifier = Modifier.fillParentMaxSize().padding(horizontal = 22.dp),
          contentAlignment = androidx.compose.ui.Alignment.Center,
        ) {
          BaselineCard(title = "正在加载播客", body = "正在读取剧集内容…")
        }
      }
    } else {
      item {
        Row(
          modifier = Modifier.fillMaxWidth().padding(start = 22.dp, end = 22.dp, top = 8.dp, bottom = 14.dp),
          verticalAlignment = androidx.compose.ui.Alignment.CenterVertically,
        ) {
          Surface(
            modifier = Modifier.size(38.dp).clickable { onBack() },
            color = Color.White.copy(alpha = 0.1f),
            shape = RoundedCornerShape(19.dp),
          ) {
            Box(contentAlignment = androidx.compose.ui.Alignment.Center) {
              Text(
                text = "←",
                style = HangyeolTheme.typography.bodyMedium.copy(fontSize = 18.sp, lineHeight = 18.sp, fontWeight = FontWeight.Bold),
                color = HangyeolTheme.colorScheme.surface,
              )
            }
          }
          Box(modifier = Modifier.weight(1f), contentAlignment = androidx.compose.ui.Alignment.Center) {
            Text(
              text = "지금 播放中",
              style = HangyeolTheme.typography.labelSmall.copy(fontSize = 11.sp, lineHeight = 14.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.sp),
              color = HangyeolTheme.colorScheme.surface.copy(alpha = 0.72f),
            )
          }
          Spacer(modifier = Modifier.size(38.dp))
        }
      }
      item {
        Column(modifier = Modifier.padding(horizontal = 22.dp)) {
          Surface(
            modifier = Modifier.fillMaxWidth().height(240.dp),
            color = Color.White.copy(alpha = 0.08f),
            shape = RoundedCornerShape(32.dp),
            border = BorderStroke(1.dp, Color.White.copy(alpha = 0.08f)),
          ) {
            Box(
              modifier = Modifier.fillMaxSize().background(
                Brush.linearGradient(
                  colors = listOf(HangyeolTheme.extendedColors.indigo, HangyeolTheme.extendedColors.crimson, HangyeolTheme.colorScheme.onSurface),
                ),
              ),
            ) {
              Text(
                text = "聲",
                style = HangyeolTheme.typography.displayMedium.copy(fontFamily = FontFamily.Serif, fontSize = 72.sp, fontWeight = FontWeight.Medium),
                color = HangyeolTheme.colorScheme.surface.copy(alpha = 0.14f),
                modifier = Modifier.align(androidx.compose.ui.Alignment.BottomEnd).padding(end = 20.dp, bottom = 8.dp),
              )
            }
          }
          Text(
            text = uiState.episodeTitle.ifBlank { "未知剧集" },
            style = HangyeolTheme.typography.headlineMedium.copy(fontSize = 24.sp, lineHeight = 30.sp, fontWeight = FontWeight.ExtraBold),
            color = HangyeolTheme.colorScheme.surface,
            modifier = Modifier.padding(top = 18.dp),
            maxLines = 2,
          )
          if (uiState.channelTitle.isNotBlank()) {
            Text(
              text = uiState.channelTitle,
              style = HangyeolTheme.typography.bodySmall.copy(fontSize = 12.sp, lineHeight = 16.sp, fontWeight = FontWeight.Medium),
              color = HangyeolTheme.colorScheme.surface.copy(alpha = 0.68f),
              modifier = Modifier.padding(top = 4.dp),
            )
          }
          if (uiState.transcriptPrimary.isNotBlank() || uiState.transcriptSecondary.isNotBlank()) {
            Surface(
              modifier = Modifier.fillMaxWidth().padding(top = 18.dp).clickable { transcriptExpanded = !transcriptExpanded },
              color = Color.White.copy(alpha = 0.07f),
              shape = RoundedCornerShape(28.dp),
              border = BorderStroke(1.dp, Color.White.copy(alpha = 0.08f)),
            ) {
              Column(modifier = Modifier.padding(18.dp)) {
                Row(
                  modifier = Modifier.fillMaxWidth(),
                  horizontalArrangement = Arrangement.SpaceBetween,
                  verticalAlignment = androidx.compose.ui.Alignment.CenterVertically,
                ) {
                  Text(
                    text = "字幕",
                    style = HangyeolTheme.typography.labelSmall.copy(fontSize = 11.sp, lineHeight = 14.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.sp),
                    color = HangyeolTheme.colorScheme.surface.copy(alpha = 0.58f),
                  )
                  Text(
                    text = if (transcriptExpanded) "收起" else "展开",
                    style = HangyeolTheme.typography.labelSmall.copy(fontSize = 11.sp, lineHeight = 14.sp, fontWeight = FontWeight.Bold),
                    color = HangyeolTheme.colorScheme.surface.copy(alpha = 0.62f),
                  )
                }
                if (transcriptExpanded) {
                  Text(
                    text = uiState.transcriptPrimary,
                    style = HangyeolTheme.typography.bodyMedium.copy(fontSize = 17.sp, lineHeight = 26.sp, fontWeight = FontWeight.Bold),
                    color = HangyeolTheme.colorScheme.surface,
                    modifier = Modifier.padding(top = 10.dp),
                  )
                  if (uiState.transcriptSecondary.isNotBlank()) {
                    Text(
                      text = uiState.transcriptSecondary,
                      style = HangyeolTheme.typography.bodySmall.copy(fontSize = 12.sp, lineHeight = 20.sp, fontWeight = FontWeight.Medium),
                      color = HangyeolTheme.colorScheme.surface.copy(alpha = 0.72f),
                      modifier = Modifier.padding(top = 8.dp),
                    )
                  }
                }
              }
            }
          }
          Column(modifier = Modifier.padding(top = 18.dp)) {
            Box(
              modifier = Modifier.fillMaxWidth().height(4.dp).background(Color.White.copy(alpha = 0.18f), RoundedCornerShape(3.dp)),
            ) {
              Box(
                modifier = Modifier.fillMaxWidth(progressFraction.coerceIn(0f, 1f)).height(4.dp).background(HangyeolTheme.extendedColors.gold, RoundedCornerShape(3.dp)),
              )
            }
            Row(
              modifier = Modifier.fillMaxWidth().padding(top = 10.dp),
              horizontalArrangement = Arrangement.SpaceBetween,
            ) {
              Text(
                text = uiState.elapsedLabel.ifBlank { "--:--" },
                style = HangyeolTheme.typography.labelSmall.copy(fontSize = 14.sp, lineHeight = 16.sp, fontWeight = FontWeight.SemiBold),
                color = HangyeolTheme.colorScheme.surface.copy(alpha = 0.76f),
              )
              Text(
                text = uiState.remainingLabel.ifBlank { "--:--" },
                style = HangyeolTheme.typography.labelSmall.copy(fontSize = 14.sp, lineHeight = 16.sp, fontWeight = FontWeight.SemiBold),
                color = HangyeolTheme.colorScheme.surface.copy(alpha = 0.76f),
              )
            }
            Row(
              modifier = Modifier.fillMaxWidth().padding(top = 18.dp),
              horizontalArrangement = Arrangement.SpaceBetween,
              verticalAlignment = androidx.compose.ui.Alignment.CenterVertically,
            ) {
              PodcastUtilityPill(label = speedLabel, onClick = { speedIndex = (speedIndex + 1) % 4 })
              PodcastTransportButton(label = "15", onClick = {})
              PodcastTransportButton(label = if (isPlaying) "❚❚" else "▶", primary = true, onClick = { isPlaying = !isPlaying })
              PodcastTransportButton(label = "30", onClick = {})
              PodcastUtilityPill(label = "词汇本", onClick = {})
            }
          }
        }
      }
    }
    uiState.errorMessage?.let { msg ->
      item {
        Box(modifier = Modifier.padding(horizontal = 22.dp)) {
          BaselineCard(title = "加载失败", body = msg, actionLabel = "重试", onAction = viewModel::refresh)
        }
      }
    }
  }
}

@Composable
private fun PodcastHistoryScreen(
  onBack: () -> Unit,
) {
  val viewModel: PodcastHistoryViewModel =
    viewModel(factory = PodcastHistoryViewModel.factory(ComposeServiceLocator.contentRepository))
  val uiState by viewModel.uiState.collectAsStateWithLifecycle()
  val spacing = HangyeolTheme.spacing

  LazyColumn(
    modifier =
      Modifier
        .fillMaxSize()
        .background(HangyeolTheme.colorScheme.background)
        .statusBarsPadding()
        .padding(horizontal = spacing.lg),
    verticalArrangement = Arrangement.spacedBy(spacing.md),
    contentPadding = PaddingValues(bottom = spacing.xl),
  ) {
    item {
      Column(
        modifier = Modifier.fillMaxWidth().padding(top = spacing.xs, bottom = 2.dp),
      ) {
        Surface(
          modifier = Modifier.size(36.dp).clickable { onBack() },
          color = HangyeolTheme.colorScheme.surface,
          shape = RoundedCornerShape(18.dp),
          border = BorderStroke(1.dp, HangyeolTheme.extendedColors.lineSoft),
          shadowElevation = 2.dp,
        ) {
          Box(contentAlignment = androidx.compose.ui.Alignment.Center) {
            Text(
              text = "←",
              style = HangyeolTheme.typography.titleMedium.copy(fontSize = 16.sp, lineHeight = 16.sp, fontWeight = FontWeight.ExtraBold),
              color = HangyeolTheme.colorScheme.onSurface,
            )
          }
        }
        Text(
          text = "歷 · HISTORY",
          style = KSoftSerifLabelStyle(),
          color = HangyeolTheme.extendedColors.crimson,
          modifier = Modifier.padding(top = 14.dp),
        )
        Text(
          text = "收听记录",
          style = HangyeolTheme.typography.headlineMedium.copy(fontSize = 26.sp, lineHeight = 30.sp, fontWeight = FontWeight.ExtraBold),
          color = HangyeolTheme.colorScheme.onSurface,
          modifier = Modifier.padding(top = 4.dp),
        )
      }
    }
    if (uiState.isLoading) {
      item { BaselineCard(title = "正在加载", body = "正在读取收听记录…") }
    }
    uiState.errorMessage?.let { msg ->
      item { BaselineCard(title = "加载失败", body = msg, actionLabel = "重试", onAction = viewModel::refresh) }
    }
    if (!uiState.isLoading && uiState.errorMessage == null && uiState.items.isEmpty()) {
      item { BaselineCard(title = "暂无记录", body = "还没有播客收听记录。") }
    }
    items(uiState.items.size) { index ->
      val item = uiState.items[index]
      Surface(
        modifier = Modifier.fillMaxWidth(),
        color = HangyeolTheme.colorScheme.surface,
        shape = RoundedCornerShape(22.dp),
        border = BorderStroke(1.dp, HangyeolTheme.extendedColors.lineSoft),
        shadowElevation = 3.dp,
      ) {
        Row(
          modifier = Modifier.padding(16.dp),
          horizontalArrangement = Arrangement.spacedBy(14.dp),
          verticalAlignment = androidx.compose.ui.Alignment.CenterVertically,
        ) {
          Surface(
            modifier = Modifier.size(44.dp),
            color = HangyeolTheme.extendedColors.tintLilac,
            shape = RoundedCornerShape(14.dp),
          ) {
            Box(contentAlignment = androidx.compose.ui.Alignment.Center) {
              Text(
                text = "聲",
                style = HangyeolTheme.typography.bodyMedium.copy(fontFamily = FontFamily.Serif, fontSize = 20.sp, fontWeight = FontWeight.Medium),
                color = HangyeolTheme.colorScheme.onSurface.copy(alpha = 0.22f),
              )
            }
          }
          Column(modifier = Modifier.weight(1f)) {
            Text(
              text = item.episodeTitle,
              style = HangyeolTheme.typography.bodyMedium.copy(fontSize = 14.sp, lineHeight = 18.sp, fontWeight = FontWeight.ExtraBold),
              color = HangyeolTheme.colorScheme.onSurface,
              maxLines = 2,
            )
            Text(
              text = listOf(item.channelName, item.progressLabel, item.timeAgo).filter { it.isNotBlank() }.joinToString(" · "),
              style = HangyeolTheme.typography.bodySmall.copy(fontSize = 11.sp, lineHeight = 15.sp, fontWeight = FontWeight.Medium),
              color = HangyeolTheme.extendedColors.subtext,
              modifier = Modifier.padding(top = 2.dp),
              maxLines = 1,
            )
          }
        }
      }
    }
  }
}

@Composable
private fun MediaCatalogScreen(
  eyebrow: String,
  title: String,
  isLoading: Boolean,
  featuredTitle: String,
  featuredSubtitle: String,
  episodes: List<Triple<String, String, String>>,
  errorMessage: String? = null,
  onRetry: (() -> Unit)? = null,
) {
  val spacing = HangyeolTheme.spacing
  val hasEmptyEpisodes = !isLoading && errorMessage == null && episodes.isEmpty()
  LazyColumn(
    modifier =
      Modifier
        .fillMaxSize()
        .background(HangyeolTheme.colorScheme.background)
        .statusBarsPadding()
        .padding(horizontal = spacing.lg),
    verticalArrangement = Arrangement.spacedBy(spacing.lg),
    contentPadding = PaddingValues(bottom = spacing.xl),
  ) {
    item {
      Spacer(modifier = Modifier.height(spacing.md))
      Text(text = eyebrow, style = HangyeolTheme.typography.labelSmall, color = HangyeolTheme.colorScheme.secondary)
      Spacer(modifier = Modifier.height(spacing.xs))
      Text(text = title, style = HangyeolTheme.typography.headlineMedium)
    }
    if (isLoading) {
      item {
        BaselineCard(
          title = "正在加载$title",
          body = "${title}内容正由 Android 原生 Repository 注入。",
        )
      }
    }
    errorMessage?.let { message ->
      item {
        BaselineCard(
          title = "${title}加载失败",
          body = message,
          actionLabel = "重试",
          onAction = onRetry,
        )
      }
    }
    item {
      BaselineCard(
        title = featuredTitle.ifBlank { "精选内容" },
        body = featuredSubtitle.ifBlank { "继续沉浸式学习。" },
      )
    }
    if (hasEmptyEpisodes) {
      item {
        BaselineCard(
          title = "暂无${title}内容",
          body = "当前还没有可展示的${title}条目。",
          actionLabel = "重试",
          onAction = onRetry,
        )
      }
    }
    items(episodes.size) { index ->
      val episode = episodes[index]
      ResumeCard(
        title = episode.first,
        subtitle = "${episode.second} · ${episode.third}",
        seal = if (title == "视频") "影" else "聲",
        onClick = {},
      )
    }
  }
}

@Composable
private fun HistoryScreen(
  onBack: () -> Unit,
) {
  val viewModel: HistoryViewModel =
    viewModel(factory = HistoryViewModel.factory(ComposeServiceLocator.contentRepository))
  val uiState by viewModel.uiState.collectAsStateWithLifecycle()
  val spacing = HangyeolTheme.spacing
  var selectedFilter by rememberSaveable { mutableStateOf(uiState.activeFilter.ifBlank { "周" }) }
  val hasEmptyTimeline = !uiState.isLoading && uiState.errorMessage == null && uiState.timeline.isEmpty()
  val hasEmptyHeatmap = !uiState.isLoading && uiState.errorMessage == null && uiState.heatmap.isEmpty()

  LazyColumn(
    modifier =
      Modifier
        .fillMaxSize()
        .background(HangyeolTheme.colorScheme.background)
        .statusBarsPadding()
        .padding(horizontal = spacing.lg),
    verticalArrangement = Arrangement.spacedBy(spacing.lg),
    contentPadding = PaddingValues(bottom = spacing.xl),
  ) {
    item {
      Column(
        modifier =
          Modifier
            .fillMaxWidth()
            .padding(top = spacing.xs, bottom = 2.dp),
      ) {
        Surface(
          modifier = Modifier.size(36.dp).clickable { onBack() },
          color = HangyeolTheme.colorScheme.surface,
          shape = RoundedCornerShape(18.dp),
          border = BorderStroke(1.dp, HangyeolTheme.extendedColors.lineSoft),
          shadowElevation = 2.dp,
        ) {
          Box(contentAlignment = androidx.compose.ui.Alignment.Center) {
            Text(
              text = "←",
              style = HangyeolTheme.typography.titleMedium.copy(fontSize = 16.sp, lineHeight = 16.sp, fontWeight = FontWeight.ExtraBold),
              color = HangyeolTheme.colorScheme.onSurface,
            )
          }
        }
        Text(
          text = "錄 · HISTORY",
          style = KSoftSerifLabelStyle(),
          color = HangyeolTheme.extendedColors.crimson,
          modifier = Modifier.padding(top = 14.dp),
        )
        Text(
          text = "学习记录",
          style = HangyeolTheme.typography.headlineMedium.copy(fontSize = 26.sp, lineHeight = 30.sp, fontWeight = FontWeight.ExtraBold),
          color = HangyeolTheme.colorScheme.onSurface,
          modifier = Modifier.padding(top = 4.dp),
        )
      }
    }
    item {
      Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
        listOf("周", "月", "연도").forEach { label ->
          Surface(
            modifier =
              Modifier
                .weight(1f)
                .clickable { selectedFilter = label },
            color = if (selectedFilter == label) HangyeolTheme.colorScheme.primary else HangyeolTheme.colorScheme.surface,
            shape = RoundedCornerShape(14.dp),
            border = if (selectedFilter == label) null else BorderStroke(1.dp, HangyeolTheme.extendedColors.lineSoft),
            shadowElevation = if (selectedFilter == label) 0.dp else 2.dp,
          ) {
            Box(
              modifier = Modifier.fillMaxWidth().padding(vertical = 10.dp),
              contentAlignment = androidx.compose.ui.Alignment.Center,
            ) {
              Text(
                text = label,
                style = HangyeolTheme.typography.bodySmall.copy(fontSize = 12.sp, lineHeight = 16.sp, fontWeight = FontWeight.ExtraBold),
                color = if (selectedFilter == label) HangyeolTheme.colorScheme.onPrimary else HangyeolTheme.colorScheme.onSurface,
              )
            }
          }
        }
      }
    }
    if (uiState.isLoading) {
      item {
        BaselineCard(
          title = "正在加载学习记录",
          body = "学习热力图与时间线正由 Android 原生 Repository 注入。",
        )
      }
    }
    uiState.errorMessage?.let { errorMessage ->
      item {
        BaselineCard(
          title = "学习记录加载失败",
          body = errorMessage,
          actionLabel = "重试",
          onAction = viewModel::refresh,
        )
      }
    }
    item {
      if (hasEmptyHeatmap) {
        BaselineCard(
          title = "暂无热力图数据",
          body = "完成学习后，这里会展示你的活跃度分布。",
          actionLabel = "重试",
          onAction = viewModel::refresh,
        )
      } else {
        Surface(
          modifier = Modifier.fillMaxWidth(),
          color = HangyeolTheme.colorScheme.surface,
          shape = RoundedCornerShape(24.dp),
          border = BorderStroke(1.dp, HangyeolTheme.extendedColors.lineSoft),
          shadowElevation = 3.dp,
        ) {
          Column(modifier = Modifier.padding(16.dp)) {
            Text(
              text = "最近 활동 · 活",
              style = HangyeolTheme.typography.bodySmall.copy(fontSize = 12.sp, lineHeight = 16.sp, fontWeight = FontWeight.ExtraBold),
              color = HangyeolTheme.colorScheme.onSurface,
            )
            Column(
              modifier = Modifier.padding(top = 10.dp),
              verticalArrangement = Arrangement.spacedBy(4.dp),
            ) {
              uiState.heatmap.chunked(14).forEach { row ->
                Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                  row.forEach { level ->
                    Surface(
                      color =
                        when (level) {
                          "strong" -> HangyeolTheme.extendedColors.crimson
                          "active" -> HangyeolTheme.extendedColors.tintPink
                          else -> HangyeolTheme.extendedColors.lineSoft
                        },
                      shape = RoundedCornerShape(3.dp),
                      modifier = Modifier.weight(1f).height(14.dp),
                    ) {}
                  }
                }
              }
            }
            Row(
              modifier = Modifier.fillMaxWidth().padding(top = 10.dp),
              horizontalArrangement = Arrangement.SpaceBetween,
              verticalAlignment = androidx.compose.ui.Alignment.CenterVertically,
            ) {
              Text(
                text = "14周前",
                style = HangyeolTheme.typography.bodySmall.copy(fontSize = 9.sp, lineHeight = 12.sp, fontWeight = FontWeight.Bold),
                color = HangyeolTheme.extendedColors.subtext,
              )
              Row(
                horizontalArrangement = Arrangement.spacedBy(4.dp),
                verticalAlignment = androidx.compose.ui.Alignment.CenterVertically,
              ) {
                Text(
                  text = "少",
                  style = HangyeolTheme.typography.bodySmall.copy(fontSize = 9.sp, lineHeight = 12.sp, fontWeight = FontWeight.Bold),
                  color = HangyeolTheme.extendedColors.subtext,
                )
                listOf(
                  HangyeolTheme.extendedColors.lineSoft,
                  HangyeolTheme.extendedColors.tintPink,
                  HangyeolTheme.extendedColors.crimson,
                ).forEach { color ->
                  Surface(
                    color = color,
                    shape = RoundedCornerShape(2.dp),
                    modifier = Modifier.size(8.dp),
                  ) {}
                }
                Text(
                  text = "多",
                  style = HangyeolTheme.typography.bodySmall.copy(fontSize = 9.sp, lineHeight = 12.sp, fontWeight = FontWeight.Bold),
                  color = HangyeolTheme.extendedColors.subtext,
                )
              }
            }
          }
        }
      }
    }
    item { KSoftSectionHead(kanji = "日", title = "今天") }
    if (hasEmptyTimeline) {
      item {
        BaselineCard(
          title = "暂无学习记录",
          body = "今天还没有新的学习活动。",
          actionLabel = "重试",
          onAction = viewModel::refresh,
        )
      }
    }
    item {
      Surface(
        modifier = Modifier.fillMaxWidth(),
        color = HangyeolTheme.colorScheme.surface,
        shape = RoundedCornerShape(24.dp),
        border = BorderStroke(1.dp, HangyeolTheme.extendedColors.lineSoft),
        shadowElevation = 3.dp,
      ) {
        Column(modifier = Modifier.fillMaxWidth()) {
          uiState.timeline.forEachIndexed { index, item ->
            Row(
              modifier = Modifier.fillMaxWidth().padding(horizontal = 18.dp, vertical = 12.dp),
              horizontalArrangement = Arrangement.spacedBy(12.dp),
              verticalAlignment = androidx.compose.ui.Alignment.CenterVertically,
            ) {
              KSoftHanjaSeal(
                c = item.seal,
                size = 32,
                round = 8,
                bg = historyToneColor(item.accent),
                color = HangyeolTheme.colorScheme.surface,
              )
              Text(
                text = item.title,
                style = HangyeolTheme.typography.bodySmall.copy(fontSize = 13.sp, lineHeight = 18.sp, fontWeight = FontWeight.Bold),
                color = HangyeolTheme.colorScheme.onSurface,
                modifier = Modifier.weight(1f),
              )
              Text(
                text = item.time,
                style = HangyeolTheme.typography.bodySmall.copy(fontSize = 11.sp, lineHeight = 14.sp, fontWeight = FontWeight.Bold),
                color = HangyeolTheme.extendedColors.subtext,
              )
            }
            if (index != uiState.timeline.lastIndex) {
              HorizontalDivider(color = HangyeolTheme.extendedColors.lineSoft)
            }
          }
        }
      }
    }
  }
}

@Composable
private fun historyToneColor(accent: String): Color =
  when (accent) {
    "mint" -> HangyeolTheme.extendedColors.skyDeep
    "butter" -> HangyeolTheme.extendedColors.jade
    "lilac" -> HangyeolTheme.extendedColors.indigo
    else -> HangyeolTheme.extendedColors.crimson
  }

@Composable

@Composable
private fun SettingsScreen(
  onBack: () -> Unit,
  section: String? = null,
) {
  val viewModel: SettingsViewModel =
    viewModel(factory = SettingsViewModel.factory(ComposeServiceLocator.contentRepository))
  val uiState by viewModel.uiState.collectAsStateWithLifecycle()
  val learningPrefsMap = uiState.learningPrefs.toMap()
  val normalizedSection = section?.trim()?.lowercase()
  val showNotifications = normalizedSection == null || normalizedSection == "notifications"
  val showLearning = normalizedSection == null || normalizedSection == "learning"
  val showLanguage = normalizedSection == null || normalizedSection == "language"
  val settingsTitle =
    when (normalizedSection) {
      "notifications" -> "通知设置"
      "language" -> "语言设置"
      "learning" -> "学习偏好"
      else -> "偏好设置"
    }
  val settingsSubtitle =
    when (normalizedSection) {
      "notifications" -> "${uiState.reminderTime.ifBlank { "--" }} 提醒 · ${uiState.notificationStatus.ifBlank { "通知状态待同步" }}"
      "language" -> uiState.language.ifBlank { "语言偏好待同步" }
      "learning" -> learningPrefsMap["学习目标"].orEmpty().ifBlank { "学习偏好待同步" }
      else -> "${uiState.reminderTime.ifBlank { "--" }} 提醒 · ${uiState.language.ifBlank { "--" }}"
    }
  var selectedReminderTime by rememberSaveable { mutableStateOf(uiState.reminderTime) }
  var selectedQuietPreset by rememberSaveable { mutableStateOf(uiState.quietHours) }
  var selectedFlashcardFront by rememberSaveable { mutableStateOf(learningPrefsMap["卡片正面"].orEmpty()) }
  var selectedFeedbackMode by rememberSaveable { mutableStateOf("") }
  var selectedDailyGoal by rememberSaveable { mutableStateOf(learningPrefsMap["学习目标"].orEmpty()) }
  var selectedAudioSpeed by rememberSaveable { mutableStateOf(learningPrefsMap["音频速度"].orEmpty()) }
  var selectedDictationCount by rememberSaveable { mutableStateOf("") }
  var selectedSubtitleMode by rememberSaveable { mutableStateOf(learningPrefsMap["字幕模式"].orEmpty()) }
  var selectedLanguage by rememberSaveable { mutableStateOf(uiState.language) }
  val spacing = HangyeolTheme.spacing
  val hasEmptyToggles = !uiState.isLoading && uiState.errorMessage == null && uiState.toggles.isEmpty()

  LazyColumn(
    modifier =
      Modifier
        .fillMaxSize()
        .background(HangyeolTheme.colorScheme.background)
        .statusBarsPadding()
        .padding(horizontal = 20.dp),
    verticalArrangement = Arrangement.spacedBy(18.dp),
    contentPadding = PaddingValues(top = 8.dp, bottom = spacing.xl),
  ) {
    item {
      Surface(
        modifier = Modifier.size(36.dp).clickable { onBack() },
        color = HangyeolTheme.colorScheme.surface,
        shape = RoundedCornerShape(18.dp),
        border = BorderStroke(1.dp, HangyeolTheme.extendedColors.lineSoft),
        shadowElevation = 2.dp,
      ) {
        Box(contentAlignment = androidx.compose.ui.Alignment.Center) {
          Text(
            text = "←",
            style = HangyeolTheme.typography.titleMedium.copy(fontSize = 16.sp, lineHeight = 16.sp, fontWeight = FontWeight.ExtraBold),
            color = HangyeolTheme.colorScheme.onSurface,
          )
        }
      }
    }
    item {
      Surface(
        modifier = Modifier.fillMaxWidth(),
        color = HangyeolTheme.colorScheme.surface,
        shape = RoundedCornerShape(28.dp),
        border = BorderStroke(1.dp, HangyeolTheme.extendedColors.lineSoft),
        shadowElevation = 3.dp,
      ) {
        Column(modifier = Modifier.padding(22.dp)) {
          Text(
            text = settingsTitle,
            style = HangyeolTheme.typography.headlineMedium.copy(fontSize = 24.sp, lineHeight = 28.sp, fontWeight = FontWeight.ExtraBold),
            color = HangyeolTheme.colorScheme.onSurface,
          )
          Text(
            text = settingsSubtitle,
            style = HangyeolTheme.typography.bodySmall.copy(fontSize = 12.sp, lineHeight = 18.sp, fontWeight = FontWeight.Medium),
            color = HangyeolTheme.extendedColors.subtext,
            modifier = Modifier.padding(top = 8.dp),
          )
          Row(
            modifier = Modifier.fillMaxWidth().padding(top = 18.dp),
            horizontalArrangement = Arrangement.spacedBy(10.dp),
          ) {
            SettingsSummaryTile(
              modifier = Modifier.weight(1f),
              label = "提醒时间",
              value = uiState.reminderTime.ifBlank { "--" },
              tone = HangyeolTheme.extendedColors.tintButter,
            )
            SettingsSummaryTile(
              modifier = Modifier.weight(1f),
              label = "界面语言",
              value = uiState.language.ifBlank { "--" },
              tone = HangyeolTheme.extendedColors.tintLilac,
            )
          }
        }
      }
    }
    if (uiState.isLoading) {
      item {
        BaselineCard(
          title = "正在加载设置",
          body = "偏好设置正由 Android 原生 Repository 注入。",
        )
      }
    }
    uiState.errorMessage?.let { errorMessage ->
      item {
        BaselineCard(
          title = "设置加载失败",
          body = errorMessage,
          actionLabel = "重试",
          onAction = viewModel::refresh,
        )
      }
    }
    if (showNotifications) {
      item { KSoftSectionHead(kanji = "通", title = "通知") }
      if (hasEmptyToggles) {
        item {
          BaselineCard(
            title = "暂无通知开关",
            body = "通知偏好稍后会同步到这里。",
            actionLabel = "重试",
            onAction = viewModel::refresh,
          )
        }
      }
      item {
        Surface(
          modifier = Modifier.fillMaxWidth(),
          color = HangyeolTheme.colorScheme.surface,
          shape = RoundedCornerShape(24.dp),
          border = BorderStroke(1.dp, HangyeolTheme.extendedColors.lineSoft),
          shadowElevation = 3.dp,
        ) {
          Column(modifier = Modifier.fillMaxWidth()) {
            val subtitles =
              mapOf(
                "接收通知" to "关闭后将暂停所有通知投递。",
                "应用内通知" to "在应用内展示通知列表和红点提醒。",
                "网页推送" to "同步 Web 端的浏览器推送开关。",
                "学习提醒" to "每日提醒、学习进度和复习相关消息。",
                "考试通知" to "TOPIK、模考倒计时和考试结果。",
                "社交通知" to "好友请求、伙伴动态和社区邀请。",
              )
            val seals =
              mapOf(
                "接收通知" to "通",
                "应用内通知" to "内",
                "网页推送" to "网",
                "学习提醒" to "学",
                "考试通知" to "考",
                "社交通知" to "友",
              )
            uiState.toggles.forEachIndexed { index, toggle ->
              SettingsToggleRow(
                seal = seals[toggle.label] ?: toggle.label.take(1),
                title = toggle.label,
                subtitle = subtitles[toggle.label] ?: "通知设置",
                enabled = toggle.enabled,
                onClick = { viewModel.toggleSetting(toggle.key) },
              )
              if (index != uiState.toggles.lastIndex) {
                HorizontalDivider(color = HangyeolTheme.extendedColors.lineSoft)
              }
            }
          }
        }
      }
      item { KSoftSectionHead(kanji = "時", title = "提醒节奏") }
      item {
        Surface(
          modifier = Modifier.fillMaxWidth(),
          color = HangyeolTheme.colorScheme.surface,
          shape = RoundedCornerShape(28.dp),
          border = BorderStroke(1.dp, HangyeolTheme.extendedColors.lineSoft),
          shadowElevation = 3.dp,
        ) {
          Column(modifier = Modifier.padding(22.dp)) {
            SettingsSubhead(
              title = "每日学习提醒",
              description = "当前时间：${uiState.reminderTime.ifBlank { "--" }}",
            )
            SettingsChipFlow(
              labels = listOf("07:00", "12:30", "19:00", "21:30"),
              activeLabel = selectedReminderTime,
              onSelect = { selectedReminderTime = it },
            )
            Surface(
              modifier = Modifier.fillMaxWidth().padding(top = 18.dp),
              color = HangyeolTheme.extendedColors.surfaceMuted,
              shape = RoundedCornerShape(18.dp),
              border = BorderStroke(1.dp, HangyeolTheme.extendedColors.lineSoft),
            ) {
              Row(
                modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 15.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = androidx.compose.ui.Alignment.CenterVertically,
              ) {
                Column(modifier = Modifier.weight(1f)) {
                  Text(
                    text = "夜间免打扰",
                    style = HangyeolTheme.typography.bodySmall.copy(fontSize = 13.sp, lineHeight = 16.sp, fontWeight = FontWeight.Bold),
                    color = HangyeolTheme.colorScheme.onSurface,
                  )
                  Text(
                    text = if (uiState.notificationStatus.contains("开启")) uiState.quietHours.ifBlank { "当前未开启" } else "当前未开启",
                    style = HangyeolTheme.typography.bodySmall.copy(fontSize = 12.sp, lineHeight = 17.sp, fontWeight = FontWeight.Medium),
                    color = HangyeolTheme.extendedColors.subtext,
                    modifier = Modifier.padding(top = 4.dp),
                  )
                }
                CapsuleBadge(
                  text = if (uiState.notificationStatus.contains("开启")) "开启" else "关闭",
                  container = HangyeolTheme.extendedColors.tintMint,
                  content = HangyeolTheme.colorScheme.primary,
                )
              }
            }
            SettingsChipFlow(
              labels = listOf("22:00 - 08:00", "23:00 - 07:00", "00:00 - 08:00"),
              activeLabel = selectedQuietPreset,
              onSelect = { selectedQuietPreset = it },
            )
          }
        }
      }
    }
    if (showLearning) {
      item { KSoftSectionHead(kanji = "學", title = "学习偏好") }
      item {
      Surface(
        modifier = Modifier.fillMaxWidth(),
        color = HangyeolTheme.colorScheme.surface,
        shape = RoundedCornerShape(28.dp),
        border = BorderStroke(1.dp, HangyeolTheme.extendedColors.lineSoft),
        shadowElevation = 3.dp,
      ) {
        Column(modifier = Modifier.padding(22.dp)) {
          SettingsSubhead(title = "单词学习默认值")
          SettingsSubhead(
            title = "卡片正面",
            description = "当前默认：${selectedFlashcardFront.ifBlank { "--" }}",
          )
          SettingsChipFlow(
            labels = listOf("韩语在前", "母语在前"),
            activeLabel = selectedFlashcardFront,
            onSelect = { selectedFlashcardFront = it },
          )
          SettingsSubhead(
            title = "记忆反馈方式",
            description = "当前默认：${selectedFeedbackMode.ifBlank { "--" }}",
          )
          SettingsChipFlow(
            labels = listOf("简单判断", "四档反馈"),
            activeLabel = selectedFeedbackMode,
            onSelect = { selectedFeedbackMode = it },
          )
        }
      }
    }
      item {
      Surface(
        modifier = Modifier.fillMaxWidth(),
        color = HangyeolTheme.colorScheme.surface,
        shape = RoundedCornerShape(28.dp),
        border = BorderStroke(1.dp, HangyeolTheme.extendedColors.lineSoft),
        shadowElevation = 3.dp,
      ) {
        Column(modifier = Modifier.padding(22.dp)) {
          SettingsSubhead(
            title = "学习目标",
            description = "当前每日目标：${selectedDailyGoal.ifBlank { "--" }}，会同步影响首页和学习统计进度。",
          )
          SettingsChipFlow(
            labels = listOf("15 分钟 / 日", "30 分钟 / 日", "45 分钟 / 日"),
            activeLabel = selectedDailyGoal,
            onSelect = { selectedDailyGoal = it },
          )
          SettingsSubhead(title = "听力与听写默认值")
          SettingsSubhead(
            title = "音频速度",
            description = "当前默认：${selectedAudioSpeed.ifBlank { "--" }}",
          )
          SettingsChipFlow(
            labels = listOf("0.8x", "1.0x", "1.2x"),
            activeLabel = selectedAudioSpeed,
            onSelect = { selectedAudioSpeed = it },
          )
          SettingsSubhead(
            title = "听写播放次数",
            description = "当前默认：${selectedDictationCount.ifBlank { "--" }}",
          )
          SettingsChipFlow(
            labels = listOf("1 次", "2 次", "3 次"),
            activeLabel = selectedDictationCount,
            onSelect = { selectedDictationCount = it },
          )
        }
      }
    }
      item {
      Surface(
        modifier = Modifier.fillMaxWidth(),
        color = HangyeolTheme.colorScheme.surface,
        shape = RoundedCornerShape(28.dp),
        border = BorderStroke(1.dp, HangyeolTheme.extendedColors.lineSoft),
        shadowElevation = 3.dp,
      ) {
        Column(modifier = Modifier.padding(22.dp)) {
          SettingsSubhead(title = "字幕偏好")
          SettingsSubhead(
            title = "字幕模式",
            description = "当前默认：${selectedSubtitleMode.ifBlank { "--" }}",
          )
          SettingsChipFlow(
            labels = listOf("仅原文", "双语字幕"),
            activeLabel = selectedSubtitleMode,
            onSelect = { selectedSubtitleMode = it },
          )
        }
      }
    }
    }
    if (showLanguage) {
      item { KSoftSectionHead(kanji = "語", title = "界面语言") }
      item {
      Surface(
        modifier = Modifier.fillMaxWidth(),
        color = HangyeolTheme.colorScheme.surface,
        shape = RoundedCornerShape(28.dp),
        border = BorderStroke(1.dp, HangyeolTheme.extendedColors.lineSoft),
        shadowElevation = 3.dp,
      ) {
        Column(modifier = Modifier.padding(22.dp)) {
          SettingsSubhead(title = "界面语言")
          SettingsChipFlow(
            labels = listOf("简体中文", "English", "한국어"),
            activeLabel = selectedLanguage,
            onSelect = { selectedLanguage = it },
          )
        }
      }
    }
    }
  }
}

@Composable
private fun SettingsSummaryTile(
  modifier: Modifier = Modifier,
  label: String,
  value: String,
  tone: Color,
) {
  Surface(
    modifier = modifier,
    color = tone,
    shape = RoundedCornerShape(18.dp),
  ) {
    Column(modifier = Modifier.padding(horizontal = 14.dp, vertical = 12.dp)) {
      Text(
        text = label,
        style = HangyeolTheme.typography.bodySmall.copy(fontSize = 11.sp, lineHeight = 14.sp, fontWeight = FontWeight.Bold),
        color = HangyeolTheme.extendedColors.subtext,
      )
      Text(
        text = value,
        style = HangyeolTheme.typography.titleMedium.copy(fontSize = 16.sp, lineHeight = 20.sp, fontWeight = FontWeight.ExtraBold),
        color = HangyeolTheme.colorScheme.onSurface,
        modifier = Modifier.padding(top = 6.dp),
      )
    }
  }
}

@Composable
private fun SettingsSubhead(
  title: String,
  description: String? = null,
) {
  Column(modifier = Modifier.padding(top = 18.dp)) {
    Text(
      text = title,
      style = HangyeolTheme.typography.bodySmall.copy(fontSize = 13.sp, lineHeight = 16.sp, fontWeight = FontWeight.ExtraBold),
      color = HangyeolTheme.colorScheme.onSurface,
    )
    description?.let {
      Text(
        text = it,
        style = HangyeolTheme.typography.bodySmall.copy(fontSize = 12.sp, lineHeight = 17.sp, fontWeight = FontWeight.Medium),
        color = HangyeolTheme.extendedColors.subtext,
        modifier = Modifier.padding(top = 4.dp),
      )
    }
  }
}

@Composable
private fun SettingsChipFlow(
  labels: List<String>,
  activeLabel: String,
  onSelect: (String) -> Unit,
) {
  Column(
    modifier = Modifier.padding(top = 12.dp),
    verticalArrangement = Arrangement.spacedBy(8.dp),
  ) {
    labels.chunked(3).forEach { rowLabels ->
      Row(
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        verticalAlignment = androidx.compose.ui.Alignment.CenterVertically,
      ) {
        rowLabels.forEach { label ->
          val active = activeLabel == label
          Surface(
            modifier = Modifier.clickable { onSelect(label) },
            color = if (active) HangyeolTheme.colorScheme.onSurface else HangyeolTheme.colorScheme.surface,
            shape = RoundedCornerShape(14.dp),
            border = if (active) null else BorderStroke(1.dp, HangyeolTheme.extendedColors.lineSoft),
            shadowElevation = if (active) 0.dp else 2.dp,
          ) {
            Text(
              text = label,
              style = HangyeolTheme.typography.bodySmall.copy(fontSize = 12.sp, lineHeight = 16.sp, fontWeight = FontWeight.Bold),
              color = if (active) HangyeolTheme.colorScheme.surface else HangyeolTheme.colorScheme.onSurface,
              modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
            )
          }
        }
      }
    }
  }
}

@Composable
private fun SettingsToggleRow(
  seal: String,
  title: String,
  subtitle: String,
  enabled: Boolean,
  onClick: () -> Unit,
  compact: Boolean = false,
) {
  Row(
    modifier =
      Modifier
        .fillMaxWidth()
        .clickable { onClick() }
        .padding(horizontal = 18.dp, vertical = if (compact) 16.dp else 15.dp),
    horizontalArrangement = Arrangement.spacedBy(12.dp),
    verticalAlignment = androidx.compose.ui.Alignment.CenterVertically,
  ) {
    Surface(
      modifier = Modifier.size(34.dp),
      color = HangyeolTheme.extendedColors.surfaceMuted,
      shape = RoundedCornerShape(12.dp),
    ) {
      Box(contentAlignment = androidx.compose.ui.Alignment.Center) {
        Text(
          text = seal,
          style = KSoftSerifLabelStyle().copy(fontSize = 14.sp, lineHeight = 14.sp),
          color = HangyeolTheme.extendedColors.crimson,
        )
      }
    }
    Column(modifier = Modifier.weight(1f)) {
      Text(
        text = title,
        style = HangyeolTheme.typography.bodySmall.copy(fontSize = 13.sp, lineHeight = 16.sp, fontWeight = FontWeight.ExtraBold),
        color = HangyeolTheme.colorScheme.onSurface,
      )
      Text(
        text = subtitle,
        style = HangyeolTheme.typography.bodySmall.copy(fontSize = 12.sp, lineHeight = 17.sp, fontWeight = FontWeight.Medium),
        color = HangyeolTheme.extendedColors.subtext,
        modifier = Modifier.padding(top = 4.dp),
      )
    }
    CapsuleBadge(
      text = if (enabled) "开启" else "关闭",
      container = if (enabled) HangyeolTheme.extendedColors.tintMint else HangyeolTheme.extendedColors.lineSoft,
      content = HangyeolTheme.colorScheme.primary,
    )
  }
}

@Composable
private fun TopikHistoryScreen(
  onBack: () -> Unit,
  onNavigateRoute: (String) -> Unit,
) {
  val viewModel: TopikHistoryViewModel =
    viewModel(factory = TopikHistoryViewModel.factory(ComposeServiceLocator.contentRepository))
  val uiState by viewModel.uiState.collectAsStateWithLifecycle()
  val hasEmptyRecords = !uiState.isLoading && uiState.errorMessage == null && uiState.records.isEmpty()
  val headerScore = uiState.averageScore

  LazyColumn(
    modifier =
      Modifier
        .fillMaxSize()
        .background(HangyeolTheme.colorScheme.background)
        .statusBarsPadding()
        .padding(horizontal = 22.dp),
    verticalArrangement = Arrangement.spacedBy(18.dp),
    contentPadding = PaddingValues(top = 8.dp, bottom = 24.dp),
  ) {
    item {
      Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(12.dp),
        verticalAlignment = androidx.compose.ui.Alignment.CenterVertically,
      ) {
        Surface(
          modifier = Modifier.size(36.dp).clickable { onBack() },
          color = HangyeolTheme.colorScheme.surface,
          shape = RoundedCornerShape(18.dp),
          border = BorderStroke(1.dp, HangyeolTheme.extendedColors.lineSoft),
          shadowElevation = 2.dp,
        ) {
          Box(contentAlignment = androidx.compose.ui.Alignment.Center) {
            Text(
              text = "←",
              style = HangyeolTheme.typography.titleMedium.copy(fontSize = 16.sp, lineHeight = 16.sp, fontWeight = FontWeight.ExtraBold),
              color = HangyeolTheme.colorScheme.onSurface,
            )
          }
        }
        Column(modifier = Modifier.weight(1f), horizontalAlignment = androidx.compose.ui.Alignment.CenterHorizontally) {
          Text(
            text = "TOPIK · 历史",
            style = HangyeolTheme.typography.bodySmall.copy(fontSize = 11.sp, lineHeight = 14.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.sp),
            color = HangyeolTheme.extendedColors.subtext,
          )
          Text(
            text = "历史记录",
            style = HangyeolTheme.typography.bodySmall.copy(fontSize = 13.sp, lineHeight = 16.sp, fontWeight = FontWeight.ExtraBold),
            color = HangyeolTheme.colorScheme.onSurface,
            modifier = Modifier.padding(top = 2.dp),
          )
        }
        Surface(
          color = HangyeolTheme.extendedColors.crimson,
          shape = RoundedCornerShape(16.dp),
        ) {
          Text(
            text = "${headerScore}分",
            style = HangyeolTheme.typography.bodySmall.copy(fontSize = 13.sp, lineHeight = 14.sp, fontWeight = FontWeight.ExtraBold),
            color = HangyeolTheme.colorScheme.surface,
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
          )
        }
      }
    }
    item {
      Surface(
        modifier = Modifier.fillMaxWidth(),
        color = HangyeolTheme.colorScheme.surface,
        shape = RoundedCornerShape(26.dp),
        border = BorderStroke(1.dp, HangyeolTheme.extendedColors.lineSoft),
        shadowElevation = 3.dp,
      ) {
        Column(modifier = Modifier.padding(20.dp)) {
          Text(
            text = "寫 · HISTORY",
            style = KSoftSerifLabelStyle(),
            color = HangyeolTheme.extendedColors.crimson,
          )
          Text(
            text = "TOPIK 写作历史",
            style = HangyeolTheme.typography.headlineMedium.copy(fontSize = 26.sp, lineHeight = 30.sp, fontWeight = FontWeight.ExtraBold),
            color = HangyeolTheme.colorScheme.onSurface,
            modifier = Modifier.padding(top = 4.dp),
          )
          Text(
            text = "保留最近写作与模考记录，快速回看题型、分数和待评估状态。",
            style = HangyeolTheme.typography.bodyMedium.copy(fontSize = 14.sp, lineHeight = 21.sp, fontWeight = FontWeight.Medium),
            color = HangyeolTheme.extendedColors.subtext,
            modifier = Modifier.padding(top = 8.dp),
          )
        }
      }
    }
    if (uiState.isLoading) {
      item {
        BaselineCard(
          title = "正在加载 TOPIK 历史",
          body = "考试记录与分数统计正由 Android 原生 Repository 注入。",
        )
      }
    }
    uiState.errorMessage?.let { errorMessage ->
      item {
        BaselineCard(
          title = "TOPIK 历史加载失败",
          body = errorMessage,
          actionLabel = "重试",
          onAction = viewModel::refresh,
        )
      }
    }
    item {
      Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
        TopikHistoryMetricTile(
          modifier = Modifier.weight(1f),
          label = "最近记录",
          value = uiState.totalCount.toString(),
          tone = HangyeolTheme.extendedColors.tintButter,
        )
        TopikHistoryMetricTile(
          modifier = Modifier.weight(1f),
          label = "平均分",
          value = uiState.averageScore.toString(),
          tone = HangyeolTheme.extendedColors.tintMint,
        )
        TopikHistoryMetricTile(
          modifier = Modifier.weight(1f),
          label = "写作场次",
          value = uiState.writingCount.toString(),
          tone = HangyeolTheme.extendedColors.tintLilac,
        )
      }
    }
    if (hasEmptyRecords) {
      item {
        BaselineCard(
          title = "暂无 TOPIK 记录",
          body = "完成一次模拟考试后，这里会展示历史成绩。",
          actionLabel = "重试",
          onAction = viewModel::refresh,
        )
      }
    }
    item { KSoftSectionHead(kanji = "錄", title = "最近提交") }
    item {
      Surface(
        modifier = Modifier.fillMaxWidth(),
        color = HangyeolTheme.colorScheme.surface,
        shape = RoundedCornerShape(26.dp),
        border = BorderStroke(1.dp, HangyeolTheme.extendedColors.lineSoft),
        shadowElevation = 3.dp,
      ) {
        Column(modifier = Modifier.fillMaxWidth()) {
          uiState.records.forEachIndexed { index, record ->
            val isWriting = record.mode.contains("议") || record.mode.contains("写") || record.title.contains("写作")
            Row(
              modifier =
                Modifier
                  .fillMaxWidth()
                  .clickable { onNavigateRoute(resolveRoute(record.route)) }
                  .padding(horizontal = 18.dp, vertical = 14.dp),
              horizontalArrangement = Arrangement.spacedBy(12.dp),
              verticalAlignment = androidx.compose.ui.Alignment.CenterVertically,
            ) {
              KSoftHanjaSeal(
                c = if (isWriting) "寫" else "試",
                size = 34,
                round = 9,
                bg = if (isWriting) HangyeolTheme.extendedColors.gold else HangyeolTheme.extendedColors.indigo,
              )
              Column(modifier = Modifier.weight(1f)) {
                Row(
                  horizontalArrangement = Arrangement.spacedBy(8.dp),
                  verticalAlignment = androidx.compose.ui.Alignment.CenterVertically,
                ) {
                  Text(
                    text = record.title,
                    style = HangyeolTheme.typography.bodySmall.copy(fontSize = 13.sp, lineHeight = 16.sp, fontWeight = FontWeight.ExtraBold),
                    color = HangyeolTheme.colorScheme.onSurface,
                    modifier = Modifier.weight(1f, fill = false),
                  )
                  Surface(
                    color =
                      if (record.score == "待评估") {
                        HangyeolTheme.extendedColors.tintButter
                      } else {
                        HangyeolTheme.extendedColors.tintMint
                      },
                    shape = RoundedCornerShape(8.dp),
                  ) {
                    Text(
                      text = record.score,
                      style = HangyeolTheme.typography.bodySmall.copy(fontSize = 9.sp, lineHeight = 12.sp, fontWeight = FontWeight.ExtraBold),
                      color = HangyeolTheme.colorScheme.onSurface,
                      modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp),
                    )
                  }
                }
                Text(
                  text = "${record.submittedAt} · ${record.mode}",
                  style = HangyeolTheme.typography.bodySmall.copy(fontSize = 11.sp, lineHeight = 15.sp, fontWeight = FontWeight.Medium),
                  color = HangyeolTheme.extendedColors.subtext,
                  modifier = Modifier.padding(top = 5.dp),
                )
              }
              Text(
                text = "›",
                style = HangyeolTheme.typography.titleMedium.copy(fontSize = 16.sp, lineHeight = 16.sp, fontWeight = FontWeight.Bold),
                color = HangyeolTheme.extendedColors.subtextLight,
              )
            }
            if (index != uiState.records.lastIndex) {
              HorizontalDivider(color = HangyeolTheme.extendedColors.lineSoft)
            }
          }
        }
      }
    }
  }
}

@Composable
private fun TopikHistoryMetricTile(
  modifier: Modifier = Modifier,
  label: String,
  value: String,
  tone: Color,
) {
  Surface(
    modifier = modifier,
    color = tone,
    shape = RoundedCornerShape(18.dp),
  ) {
    Column(modifier = Modifier.padding(horizontal = 12.dp, vertical = 12.dp)) {
      Text(
        text = label,
        style = HangyeolTheme.typography.bodySmall.copy(fontSize = 10.sp, lineHeight = 13.sp, fontWeight = FontWeight.Bold),
        color = HangyeolTheme.extendedColors.subtext,
      )
      Text(
        text = value,
        style = HangyeolTheme.typography.titleMedium.copy(fontSize = 20.sp, lineHeight = 22.sp, fontWeight = FontWeight.ExtraBold),
        color = HangyeolTheme.colorScheme.onSurface,
        modifier = Modifier.padding(top = 6.dp),
      )
    }
  }
}

@Composable
private fun PricingScreen(
  onNavigateRoute: (String) -> Unit,
) {
  val viewModel: PricingViewModel =
    viewModel(factory = PricingViewModel.factory(ComposeServiceLocator.contentRepository))
  val uiState by viewModel.uiState.collectAsStateWithLifecycle()
  val spacing = HangyeolTheme.spacing
  val benefitRows =
    listOf(
      "试" to "TOPIK 模考无限次",
      "師" to "AI 作文批改",
      "詞" to "无限创建词汇本",
      "離" to "移除广告",
      "機" to "离线模式",
      "先" to "新功能抢先体验",
    )
  val planOptions =
    listOf(
      Triple("月付", "₩14,900", "/月"),
      Triple("年付", "₩119,000", "/年"),
      Triple("终身", "₩499,000", "한号"),
    )
  val planTags = listOf<String?>(null, "33% 할인 · 推荐", "最高 혜택")
  var selectedPlanIndex by rememberSaveable { mutableStateOf(1) }

  Scaffold(
    containerColor = HangyeolTheme.extendedColors.surfaceMuted,
    bottomBar = {
      Surface(
        color = HangyeolTheme.extendedColors.surfaceMuted.copy(alpha = 0.92f),
        tonalElevation = 0.dp,
        shadowElevation = 0.dp,
        border = BorderStroke(1.dp, HangyeolTheme.extendedColors.lineSoft),
      ) {
        Column(
          modifier =
            Modifier
              .fillMaxWidth()
              .navigationBarsPadding()
              .padding(horizontal = 22.dp, vertical = 14.dp),
          verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
          KSoftPrimaryButton(
            text = "开始使用 · 7 天免费",
            onClick = {},
            modifier = Modifier.fillMaxWidth(),
          )
          Text(
            text = "随时可取消 · 服务条款 · 隐私政策",
            style = HangyeolTheme.typography.bodySmall.copy(fontSize = 10.sp, lineHeight = 14.sp, fontWeight = FontWeight.SemiBold),
            color = HangyeolTheme.extendedColors.subtext,
            modifier = Modifier.fillMaxWidth(),
            textAlign = androidx.compose.ui.text.style.TextAlign.Center,
          )
        }
      }
    },
  ) { innerPadding ->
    LazyColumn(
      modifier =
        Modifier
          .fillMaxSize()
          .background(HangyeolTheme.extendedColors.surfaceMuted)
          .padding(innerPadding)
          .statusBarsPadding(),
      verticalArrangement = Arrangement.spacedBy(18.dp),
      contentPadding = PaddingValues(start = 22.dp, end = 22.dp, top = 8.dp, bottom = 20.dp),
    ) {
      item {
        Row(
          modifier = Modifier.fillMaxWidth(),
          horizontalArrangement = Arrangement.spacedBy(12.dp),
          verticalAlignment = androidx.compose.ui.Alignment.CenterVertically,
        ) {
          Surface(
            modifier = Modifier.size(36.dp).clickable { onNavigateRoute(HangyeolDestination.TabsProfile.pattern) },
            color = HangyeolTheme.colorScheme.surface,
            shape = RoundedCornerShape(18.dp),
            shadowElevation = 3.dp,
          ) {
            Box(contentAlignment = androidx.compose.ui.Alignment.Center) {
              Text(
                text = "×",
                style = HangyeolTheme.typography.titleMedium.copy(fontSize = 18.sp, lineHeight = 18.sp, fontWeight = FontWeight.Medium),
                color = HangyeolTheme.colorScheme.onSurface,
              )
            }
          }
          Text(
            text = "会员 · 金",
            style = HangyeolTheme.typography.bodySmall.copy(fontSize = 11.sp, lineHeight = 14.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.sp),
            color = HangyeolTheme.extendedColors.subtext,
            modifier = Modifier.weight(1f),
          )
          Text(
            text = "恢复",
            style = HangyeolTheme.typography.bodySmall.copy(fontSize = 12.sp, lineHeight = 14.sp, fontWeight = FontWeight.Bold),
            color = HangyeolTheme.extendedColors.subtext,
          )
        }
      }

      item {
        Column {
          KSoftHanjaSeal(
            c = "金",
            size = 56,
            bg = HangyeolTheme.extendedColors.gold,
            round = 14,
          )
          Text(
            text = "PREMIUM · 会员",
            style = KSoftSerifLabelStyle().copy(fontSize = 12.sp, lineHeight = 14.sp, letterSpacing = 3.sp),
            color = HangyeolTheme.extendedColors.crimson,
            modifier = Modifier.padding(top = 20.dp),
          )
          Text(
            text = "打开所有大门",
            style = HangyeolTheme.typography.headlineLarge.copy(fontSize = 32.sp, lineHeight = 35.sp, fontWeight = FontWeight.ExtraBold, letterSpacing = (-1).sp),
            color = HangyeolTheme.colorScheme.onSurface,
            modifier = Modifier.padding(top = 6.dp),
          )
          Text(
            text = "TOPIK 模考无限次 · AI 批改 · 移除广告 · 무제한 词汇本 · 오프라인",
            style = HangyeolTheme.typography.bodyMedium.copy(fontSize = 14.sp, lineHeight = 21.sp, fontWeight = FontWeight.Medium),
            color = HangyeolTheme.colorScheme.onSurface.copy(alpha = 0.82f),
            modifier = Modifier.padding(top = 8.dp),
          )
        }
      }

      if (uiState.isLoading) {
        item {
          BaselineCard(
            title = "正在加载订阅信息",
            body = "价格与权益正由 Android 原生 Repository 注入。",
          )
        }
      }
      uiState.errorMessage?.let { errorMessage ->
        item {
          BaselineCard(
            title = "订阅信息加载失败",
            body = errorMessage,
            actionLabel = "重试",
            onAction = viewModel::refresh,
          )
        }
      }

      item {
        Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
          planOptions.forEachIndexed { index, plan ->
            val selected = selectedPlanIndex == index
            Surface(
              modifier =
                Modifier
                  .fillMaxWidth()
                  .clickable { selectedPlanIndex = index },
              color = if (selected) HangyeolTheme.colorScheme.onSurface else HangyeolTheme.colorScheme.surface,
              shape = RoundedCornerShape(20.dp),
              border =
                BorderStroke(
                  if (selected) 2.dp else 1.dp,
                  if (selected) HangyeolTheme.colorScheme.onSurface else Color.Transparent,
                ),
              shadowElevation = if (selected) 10.dp else 3.dp,
            ) {
              Row(
                modifier = Modifier.fillMaxWidth().padding(horizontal = 18.dp, vertical = 16.dp),
                horizontalArrangement = Arrangement.spacedBy(14.dp),
                verticalAlignment = androidx.compose.ui.Alignment.CenterVertically,
              ) {
                Surface(
                  modifier = Modifier.size(22.dp),
                  color = Color.Transparent,
                  shape = RoundedCornerShape(11.dp),
                  border = BorderStroke(2.dp, if (selected) HangyeolTheme.colorScheme.surface else HangyeolTheme.extendedColors.lineStrong),
                ) {
                  if (selected) {
                    Box(contentAlignment = androidx.compose.ui.Alignment.Center) {
                      Surface(
                        modifier = Modifier.size(10.dp),
                        color = HangyeolTheme.colorScheme.surface,
                        shape = RoundedCornerShape(5.dp),
                      ) {}
                    }
                  }
                }
                Column(modifier = Modifier.weight(1f)) {
                  Row(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = androidx.compose.ui.Alignment.CenterVertically,
                  ) {
                    Text(
                      text = plan.first,
                      style = HangyeolTheme.typography.bodyMedium.copy(fontSize = 15.sp, lineHeight = 18.sp, fontWeight = FontWeight.ExtraBold),
                      color = if (selected) HangyeolTheme.colorScheme.surface else HangyeolTheme.colorScheme.onSurface,
                    )
                    planTags[index]?.let { tag ->
                      Surface(
                        color = HangyeolTheme.extendedColors.tintButter,
                        shape = RoundedCornerShape(8.dp),
                      ) {
                        Text(
                          text = tag,
                          style = HangyeolTheme.typography.bodySmall.copy(fontSize = 9.sp, lineHeight = 12.sp, fontWeight = FontWeight.ExtraBold),
                          color = HangyeolTheme.colorScheme.onSurface,
                          modifier = Modifier.padding(horizontal = 7.dp, vertical = 2.dp),
                        )
                      }
                    }
                  }
                  Row(
                    modifier = Modifier.padding(top = 4.dp),
                    verticalAlignment = androidx.compose.ui.Alignment.Bottom,
                  ) {
                    Text(
                      text = plan.second,
                      style = HangyeolTheme.typography.headlineSmall.copy(fontSize = 22.sp, lineHeight = 24.sp, fontWeight = FontWeight.ExtraBold, letterSpacing = (-0.5).sp),
                      color = if (selected) HangyeolTheme.colorScheme.surface else HangyeolTheme.colorScheme.onSurface,
                    )
                    Text(
                      text = plan.third,
                      style = HangyeolTheme.typography.bodySmall.copy(fontSize = 12.sp, lineHeight = 14.sp, fontWeight = FontWeight.Bold),
                      color =
                        if (selected) {
                          HangyeolTheme.colorScheme.surface.copy(alpha = 0.65f)
                        } else {
                          HangyeolTheme.extendedColors.subtext
                        },
                      modifier = Modifier.padding(start = 4.dp, bottom = 2.dp),
                    )
                  }
                }
              }
            }
          }
        }
      }

      item {
        Column {
          KSoftSectionHead(kanji = "益", title = "包含权益")
          Surface(
            modifier = Modifier.fillMaxWidth().padding(top = 12.dp),
            color = HangyeolTheme.colorScheme.surface,
            shape = RoundedCornerShape(24.dp),
            border = BorderStroke(1.dp, HangyeolTheme.extendedColors.lineSoft),
            shadowElevation = 3.dp,
          ) {
            Column(modifier = Modifier.fillMaxWidth()) {
              benefitRows.forEachIndexed { index, (seal, label) ->
                Row(
                  modifier = Modifier.fillMaxWidth().padding(horizontal = 18.dp, vertical = 14.dp),
                  horizontalArrangement = Arrangement.spacedBy(12.dp),
                  verticalAlignment = androidx.compose.ui.Alignment.CenterVertically,
                ) {
                  Surface(
                    modifier = Modifier.size(32.dp),
                    color = HangyeolTheme.extendedColors.surfaceMuted,
                    shape = RoundedCornerShape(10.dp),
                  ) {
                    Box(contentAlignment = androidx.compose.ui.Alignment.Center) {
                      Text(
                        text = seal,
                        style = KSoftSerifLabelStyle().copy(fontSize = 14.sp, lineHeight = 14.sp),
                        color = HangyeolTheme.extendedColors.crimson,
                      )
                    }
                  }
                  Text(
                    text = label,
                    style = HangyeolTheme.typography.bodySmall.copy(fontSize = 13.sp, lineHeight = 18.sp, fontWeight = FontWeight.Bold),
                    color = HangyeolTheme.colorScheme.onSurface,
                    modifier = Modifier.weight(1f),
                  )
                  Text(
                    text = "✓",
                    style = HangyeolTheme.typography.bodyMedium.copy(fontSize = 14.sp, lineHeight = 14.sp, fontWeight = FontWeight.ExtraBold),
                    color = HangyeolTheme.extendedColors.jade,
                  )
                }
                if (index != benefitRows.lastIndex) {
                  HorizontalDivider(color = HangyeolTheme.extendedColors.lineSoft)
                }
              }
            }
          }
        }
      }
    }
  }
}

@Composable
private fun PlaceholderScreen(
  title: String,
  eyebrow: String,
  description: String,
  baseline: RouteBaselineEntry,
  primaryActionLabel: String = "返回",
  onPrimaryAction: (() -> Unit)? = null,
) {
  val spacing = HangyeolTheme.spacing
  LazyColumn(
    modifier =
      Modifier
        .fillMaxSize()
        .background(HangyeolTheme.colorScheme.background)
        .statusBarsPadding()
        .padding(horizontal = spacing.lg),
    verticalArrangement = Arrangement.spacedBy(spacing.lg),
  ) {
    item {
      Spacer(modifier = Modifier.height(spacing.md))
      Text(text = eyebrow, style = HangyeolTheme.typography.labelSmall, color = HangyeolTheme.colorScheme.secondary)
      Spacer(modifier = Modifier.height(spacing.xs))
      Text(text = title, style = HangyeolTheme.typography.headlineMedium)
      Spacer(modifier = Modifier.height(spacing.sm))
      Text(
        text = description,
        style = HangyeolTheme.typography.bodyLarge,
        color = HangyeolTheme.extendedColors.subtext,
      )
    }
    item {
      BaselineRouteTable(entries = listOf(baseline))
    }
    if (onPrimaryAction != null) {
      item { PrimaryButton(text = primaryActionLabel, onClick = onPrimaryAction) }
    }
  }
}

@Composable
private fun LearningActionsRow(
  actions: List<Pair<String, HangyeolDestination>>,
  onNavigate: (HangyeolDestination) -> Unit,
) {
  val spacing = HangyeolTheme.spacing
  Column(verticalArrangement = Arrangement.spacedBy(spacing.sm)) {
    actions.chunked(2).forEach { rowItems ->
      Row(horizontalArrangement = Arrangement.spacedBy(spacing.md)) {
        rowItems.forEach { (label, destination) ->
          Card(
            modifier =
              Modifier
                .weight(1f)
                .clickable { onNavigate(destination) },
            colors =
              CardDefaults.cardColors(
                containerColor = HangyeolTheme.colorScheme.surface,
              ),
          ) {
            Column(
              modifier = Modifier.padding(spacing.lg),
              verticalArrangement = Arrangement.spacedBy(spacing.xs),
            ) {
              Text(text = label, style = HangyeolTheme.typography.titleMedium)
              Text(
                text = destination.baseline.composeRoute,
                style = HangyeolTheme.typography.bodySmall,
                color = HangyeolTheme.extendedColors.subtext,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
              )
            }
          }
        }
        if (rowItems.size == 1) {
          Spacer(modifier = Modifier.weight(1f))
        }
      }
    }
  }
}

@Composable
private fun BaselineRouteTable(entries: List<RouteBaselineEntry>) {
  val spacing = HangyeolTheme.spacing
  Card(
    colors = CardDefaults.cardColors(containerColor = HangyeolTheme.colorScheme.surface),
    elevation = CardDefaults.cardElevation(defaultElevation = 3.dp),
  ) {
    Column(modifier = Modifier.padding(spacing.lg), verticalArrangement = Arrangement.spacedBy(spacing.sm)) {
      Text(text = "路由基线", style = HangyeolTheme.typography.titleMedium)
      entries.forEachIndexed { index, entry ->
        Column(verticalArrangement = Arrangement.spacedBy(spacing.xs)) {
          Text(text = entry.composeRoute, style = HangyeolTheme.typography.bodyMedium)
          Text(
            text = "${entry.graph.name} · ${entry.presentation.name}",
            style = HangyeolTheme.typography.bodySmall,
            color = HangyeolTheme.extendedColors.subtext,
          )
        }
        if (index != entries.lastIndex) {
          HorizontalDivider(color = HangyeolTheme.extendedColors.lineSoft)
        }
      }
    }
  }
}

@Composable
private fun BaselineCard(
  title: String,
  body: String,
  actionLabel: String? = null,
  onAction: (() -> Unit)? = null,
) {
  val spacing = HangyeolTheme.spacing
  Card(
    colors = CardDefaults.cardColors(containerColor = HangyeolTheme.colorScheme.surface),
    elevation = CardDefaults.cardElevation(defaultElevation = 4.dp),
  ) {
    Column(
      modifier = Modifier.padding(spacing.lg),
      verticalArrangement = Arrangement.spacedBy(spacing.xs),
    ) {
      Text(text = title, style = HangyeolTheme.typography.titleMedium)
      Text(text = body, style = HangyeolTheme.typography.bodyMedium, color = HangyeolTheme.extendedColors.subtext)
      if (actionLabel != null && onAction != null) {
        TextButton(
          onClick = onAction,
          contentPadding = PaddingValues(horizontal = 0.dp, vertical = 0.dp),
        ) {
          Text(text = actionLabel)
        }
      }
    }
  }
}

@Composable
private fun MetricCard(
  modifier: Modifier = Modifier,
  title: String,
  value: String,
  tone: Color,
) {
  val spacing = HangyeolTheme.spacing
  Card(
    modifier = modifier,
    colors = CardDefaults.cardColors(containerColor = tone),
    shape = RoundedCornerShape(16.dp),
  ) {
    Column(
      modifier = Modifier.padding(spacing.lg),
      verticalArrangement = Arrangement.spacedBy(spacing.xs),
    ) {
      Text(text = title, style = HangyeolTheme.typography.bodySmall, color = HangyeolTheme.extendedColors.subtext)
      Text(text = value, style = HangyeolTheme.typography.titleLarge, fontWeight = FontWeight.ExtraBold)
    }
  }
}

@Composable
private fun PrimaryButton(
  text: String,
  onClick: () -> Unit,
  enabled: Boolean = true,
  trailingArrow: Boolean = false,
  trailingSeal: String? = null,
) {
  Button(
    onClick = onClick,
    modifier = Modifier.fillMaxWidth().height(56.dp),
    enabled = enabled,
    shape = RoundedCornerShape(28.dp),
    border = BorderStroke(1.dp, if (enabled) HangyeolTheme.colorScheme.primary else HangyeolTheme.extendedColors.lineSoft),
    colors =
      ButtonDefaults.buttonColors(
        containerColor = HangyeolTheme.colorScheme.primary,
        contentColor = HangyeolTheme.colorScheme.onPrimary,
        disabledContainerColor = HangyeolTheme.extendedColors.lineSoft,
        disabledContentColor = HangyeolTheme.extendedColors.subtext,
      ),
    contentPadding = PaddingValues(horizontal = 20.dp, vertical = 0.dp),
  ) {
    Row(
      verticalAlignment = androidx.compose.ui.Alignment.CenterVertically,
      horizontalArrangement = Arrangement.Center,
    ) {
      Text(text = text, style = HangyeolTheme.typography.titleMedium)
      when {
        trailingSeal != null -> {
          Spacer(modifier = Modifier.width(8.dp))
          Text(
            text = trailingSeal,
            style = HangyeolTheme.typography.labelSmall.copy(fontSize = 12.sp, lineHeight = 14.sp),
          )
        }
        trailingArrow -> {
          Spacer(modifier = Modifier.width(8.dp))
          Text(
            text = "→",
            style = HangyeolTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold),
          )
        }
      }
    }
  }
}
