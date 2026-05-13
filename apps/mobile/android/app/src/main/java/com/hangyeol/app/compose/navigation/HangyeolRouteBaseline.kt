package com.hangyeol.app.compose.navigation

import android.net.Uri

enum class RouteGraph {
  AUTH,
  TABS,
  MAIN,
  AUTH_FLOW,
}

enum class RoutePresentation {
  PUSH,
  TAB,
  MODAL,
  FULL_SCREEN_MODAL,
}

data class RouteArgumentSpec(
  val name: String,
  val required: Boolean,
  val type: String,
)

data class RouteBaselineEntry(
  val composeRoute: String,
  val graph: RouteGraph,
  val presentation: RoutePresentation,
  val arguments: List<RouteArgumentSpec> = emptyList(),
  val deepLinks: List<String> = emptyList(),
)

sealed class HangyeolDestination(
  val pattern: String,
  val baseline: RouteBaselineEntry,
) {
  data object AuthLogin :
    HangyeolDestination(
      pattern = "auth/login",
      baseline =
        RouteBaselineEntry(
          composeRoute = "auth/login",
          graph = RouteGraph.AUTH,
          presentation = RoutePresentation.PUSH,
          deepLinks = listOf("hangyeol://auth/login"),
        ),
    )

  data object AuthRegister :
    HangyeolDestination(
      pattern = "auth/register",
      baseline =
        RouteBaselineEntry(
          composeRoute = "auth/register",
          graph = RouteGraph.AUTH,
          presentation = RoutePresentation.PUSH,
          deepLinks = listOf("hangyeol://auth/register"),
        ),
    )

  data object AuthForgotPassword :
    HangyeolDestination(
      pattern = "auth/forgot-password",
      baseline =
        RouteBaselineEntry(
          composeRoute = "auth/forgot-password",
          graph = RouteGraph.AUTH,
          presentation = RoutePresentation.PUSH,
          deepLinks = listOf("hangyeol://auth/forgot-password"),
        ),
    )

  data object AuthResetPassword :
    HangyeolDestination(
      pattern = "auth/reset-password?token={token}",
      baseline =
        RouteBaselineEntry(
          composeRoute = "auth/reset-password?token={token}",
          graph = RouteGraph.AUTH_FLOW,
          presentation = RoutePresentation.PUSH,
          arguments = listOf(RouteArgumentSpec("token", required = false, type = "String")),
          deepLinks = listOf("hangyeol://auth/reset-password?token={token}"),
        ),
    ) {
    fun createRoute(token: String?) = "auth/reset-password?token=${token.orEmpty()}"
  }

  data object AuthVerifyEmail :
    HangyeolDestination(
      pattern = "auth/verify-email?token={token}",
      baseline =
        RouteBaselineEntry(
          composeRoute = "auth/verify-email?token={token}",
          graph = RouteGraph.AUTH_FLOW,
          presentation = RoutePresentation.PUSH,
          arguments = listOf(RouteArgumentSpec("token", required = false, type = "String")),
          deepLinks = listOf("hangyeol://auth/verify-email?token={token}"),
        ),
    ) {
    fun createRoute(token: String?) = "auth/verify-email?token=${token.orEmpty()}"
  }

  data object AuthOAuthCallback :
    HangyeolDestination(
      pattern = "auth/oauth-callback?provider={provider}&code={code}&verifier={verifier}",
      baseline =
        RouteBaselineEntry(
          composeRoute = "auth/oauth-callback?provider={provider}&code={code}&verifier={verifier}",
          graph = RouteGraph.AUTH_FLOW,
          presentation = RoutePresentation.PUSH,
          arguments =
            listOf(
              RouteArgumentSpec("provider", required = false, type = "String"),
              RouteArgumentSpec("code", required = false, type = "String"),
              RouteArgumentSpec("verifier", required = false, type = "String"),
            ),
          deepLinks =
            listOf(
              "hangyeol://auth/oauth-callback?provider={provider}&code={code}&verifier={verifier}",
              "hangyeol://auth/oauth-callback?provider={provider}&code={code}",
              "hangyeol://oauth/callback?provider={provider}&code={code}&verifier={verifier}",
              "hangyeol://oauth/callback?provider={provider}&code={code}",
            ),
        ),
    ) {
    fun createRoute(provider: String, code: String, verifier: String): String =
      "auth/oauth-callback?provider=${Uri.encode(provider)}&code=${Uri.encode(code)}&verifier=${Uri.encode(verifier)}"
  }

  data object TabsToday :
    HangyeolDestination(
      pattern = "tabs/today",
      baseline =
        RouteBaselineEntry(
          composeRoute = "tabs/today",
          graph = RouteGraph.TABS,
          presentation = RoutePresentation.TAB,
          deepLinks = listOf("hangyeol://today"),
        ),
    )

  data object TabsCourses :
    HangyeolDestination(
      pattern = "tabs/courses",
      baseline =
        RouteBaselineEntry(
          composeRoute = "tabs/courses",
          graph = RouteGraph.TABS,
          presentation = RoutePresentation.TAB,
          deepLinks = listOf("hangyeol://courses"),
        ),
    )

  data object TabsMedia :
    HangyeolDestination(
      pattern = "tabs/media",
      baseline =
        RouteBaselineEntry(
          composeRoute = "tabs/media",
          graph = RouteGraph.TABS,
          presentation = RoutePresentation.TAB,
          deepLinks = listOf("hangyeol://media"),
        ),
    )

  data object TabsProfile :
    HangyeolDestination(
      pattern = "tabs/profile",
      baseline =
        RouteBaselineEntry(
          composeRoute = "tabs/profile",
          graph = RouteGraph.TABS,
          presentation = RoutePresentation.TAB,
          deepLinks = listOf("hangyeol://profile"),
        ),
    )

  data object Vocab :
    HangyeolDestination(
      pattern = "main/vocab",
      baseline =
        RouteBaselineEntry(
          composeRoute = "main/vocab",
          graph = RouteGraph.MAIN,
          presentation = RoutePresentation.PUSH,
          deepLinks = listOf("hangyeol://vocab"),
        ),
    )

  data object VocabDeck :
    HangyeolDestination(
      pattern = "main/vocab/{deckId}",
      baseline =
        RouteBaselineEntry(
          composeRoute = "main/vocab/{deckId}",
          graph = RouteGraph.MAIN,
          presentation = RoutePresentation.PUSH,
          arguments = listOf(RouteArgumentSpec("deckId", required = true, type = "String")),
          deepLinks = listOf("hangyeol://vocab/{deckId}"),
        ),
    ) {
    fun createRoute(deckId: String) = "main/vocab/$deckId"
  }

  data object VocabBook :
    HangyeolDestination(
      pattern = "main/vocab-book",
      baseline =
        RouteBaselineEntry(
          composeRoute = "main/vocab-book",
          graph = RouteGraph.MAIN,
          presentation = RoutePresentation.PUSH,
          deepLinks = listOf("hangyeol://vocab-book"),
        ),
    )

  data object VocabBookMode :
    HangyeolDestination(
      pattern = "main/vocab-book/{mode}",
      baseline =
        RouteBaselineEntry(
          composeRoute = "main/vocab-book/{mode}",
          graph = RouteGraph.MAIN,
          presentation = RoutePresentation.FULL_SCREEN_MODAL,
          arguments = listOf(RouteArgumentSpec("mode", required = true, type = "String")),
          deepLinks = listOf("hangyeol://vocab-book/{mode}"),
        ),
    ) {
    fun createRoute(mode: String): String = "main/vocab-book/${Uri.encode(mode)}"
  }

  data object Grammar :
    HangyeolDestination(
      pattern = "main/grammar",
      baseline =
        RouteBaselineEntry(
          composeRoute = "main/grammar",
          graph = RouteGraph.MAIN,
          presentation = RoutePresentation.PUSH,
          deepLinks = listOf("hangyeol://grammar"),
        ),
    )

  data object GrammarModule :
    HangyeolDestination(
      pattern = "main/grammar/{deckId}",
      baseline =
        RouteBaselineEntry(
          composeRoute = "main/grammar/{deckId}",
          graph = RouteGraph.MAIN,
          presentation = RoutePresentation.PUSH,
          arguments = listOf(RouteArgumentSpec("deckId", required = true, type = "String")),
          deepLinks = listOf("hangyeol://grammar/{deckId}"),
        ),
    ) {
    fun createRoute(deckId: String) = "main/grammar/$deckId"
  }

  data object GrammarPractice :
    HangyeolDestination(
      pattern = "main/grammar/{deckId}/practice",
      baseline =
        RouteBaselineEntry(
          composeRoute = "main/grammar/{deckId}/practice",
          graph = RouteGraph.MAIN,
          presentation = RoutePresentation.PUSH,
          arguments = listOf(RouteArgumentSpec("deckId", required = true, type = "String")),
          deepLinks = listOf("hangyeol://grammar/{deckId}/practice"),
        ),
    ) {
    fun createRoute(deckId: String) = "main/grammar/$deckId/practice"
  }

  data object Review :
    HangyeolDestination(
      pattern = "main/review",
      baseline =
        RouteBaselineEntry(
          composeRoute = "main/review",
          graph = RouteGraph.MAIN,
          presentation = RoutePresentation.PUSH,
          deepLinks = listOf("hangyeol://review"),
        ),
    )

    )

  data object ReviewQuiz :
    HangyeolDestination(
      pattern = "main/review/quiz",
      baseline =
        RouteBaselineEntry(
          composeRoute = "main/review/quiz",
          graph = RouteGraph.MAIN,
          presentation = RoutePresentation.FULL_SCREEN_MODAL,
          deepLinks = listOf("hangyeol://review/quiz"),
        ),
    )

  data object Writing :
    HangyeolDestination(
      pattern = "main/writing",
      baseline =
        RouteBaselineEntry(
          composeRoute = "main/writing",
          graph = RouteGraph.MAIN,
          presentation = RoutePresentation.PUSH,
          deepLinks = listOf("hangyeol://writing"),
        ),
    )

  data object Typing :
    HangyeolDestination(
      pattern = "main/typing",
      baseline =
        RouteBaselineEntry(
          composeRoute = "main/typing",
          graph = RouteGraph.MAIN,
          presentation = RoutePresentation.PUSH,
          deepLinks = listOf("hangyeol://typing"),
        ),
    )

  data object Topik :
    HangyeolDestination(
      pattern = "main/topik",
      baseline =
        RouteBaselineEntry(
          composeRoute = "main/topik",
          graph = RouteGraph.MAIN,
          presentation = RoutePresentation.PUSH,
          deepLinks = listOf("hangyeol://topik"),
        ),
    )

  data object TopikExam :
    HangyeolDestination(
      pattern = "main/topik/{examId}?review={review}&wrongOnly={wrongOnly}",
      baseline =
        RouteBaselineEntry(
          composeRoute = "main/topik/{examId}?review={review}&wrongOnly={wrongOnly}",
          graph = RouteGraph.MAIN,
          presentation = RoutePresentation.FULL_SCREEN_MODAL,
          arguments =
            listOf(
              RouteArgumentSpec("examId", required = true, type = "String"),
              RouteArgumentSpec("review", required = false, type = "Boolean"),
              RouteArgumentSpec("wrongOnly", required = false, type = "Boolean"),
            ),
          deepLinks = listOf("hangyeol://topik/{examId}?review={review}&wrongOnly={wrongOnly}"),
        ),
    ) {
    fun createRoute(examId: String, review: Boolean = false, wrongOnly: Boolean = false) =
      "main/topik/$examId?review=$review&wrongOnly=$wrongOnly"
  }

  data object TopikWriting :
    HangyeolDestination(
      pattern = "main/topik/writing/{examId}",
      baseline =
        RouteBaselineEntry(
          composeRoute = "main/topik/writing/{examId}",
          graph = RouteGraph.MAIN,
          presentation = RoutePresentation.FULL_SCREEN_MODAL,
          arguments = listOf(RouteArgumentSpec("examId", required = true, type = "String")),
          deepLinks = listOf("hangyeol://topik/writing/{examId}"),
        ),
    ) {
    fun createRoute(examId: String) = "main/topik/writing/$examId"
  }

  data object Dictionary :
    HangyeolDestination(
      pattern = "main/dictionary",
      baseline =
        RouteBaselineEntry(
          composeRoute = "main/dictionary",
          graph = RouteGraph.MAIN,
          presentation = RoutePresentation.PUSH,
          deepLinks = listOf("hangyeol://dictionary"),
        ),
    )

  data object Notebook :
    HangyeolDestination(
      pattern = "main/notebook",
      baseline =
        RouteBaselineEntry(
          composeRoute = "main/notebook",
          graph = RouteGraph.MAIN,
          presentation = RoutePresentation.PUSH,
          deepLinks = listOf("hangyeol://notebook"),
        ),
    )

  data object Reading :
    HangyeolDestination(
      pattern = "main/reading",
      baseline =
        RouteBaselineEntry(
          composeRoute = "main/reading",
          graph = RouteGraph.MAIN,
          presentation = RoutePresentation.PUSH,
          deepLinks = listOf("hangyeol://reading"),
        ),
    )

  data object PictureBook :
    HangyeolDestination(
      pattern = "main/picture-book?level={level}&slug={slug}",
      baseline =
        RouteBaselineEntry(
          composeRoute = "main/picture-book?level={level}&slug={slug}",
          graph = RouteGraph.MAIN,
          presentation = RoutePresentation.PUSH,
          arguments =
            listOf(
              RouteArgumentSpec("level", required = false, type = "String"),
              RouteArgumentSpec("slug", required = false, type = "String"),
            ),
          deepLinks = listOf("hangyeol://picture-book?level={level}&slug={slug}"),
        ),
    ) {
    fun createRoute(level: String? = null, slug: String? = null): String {
      val encodedLevel = Uri.encode(level.orEmpty())
      val encodedSlug = Uri.encode(slug.orEmpty())
      return "main/picture-book?level=$encodedLevel&slug=$encodedSlug"
    }
  }

  data object ReaderFocus :
    HangyeolDestination(
      pattern = "main/reader-focus?slug={slug}&pageIndex={pageIndex}",
      baseline =
        RouteBaselineEntry(
          composeRoute = "main/reader-focus?slug={slug}&pageIndex={pageIndex}",
          graph = RouteGraph.MAIN,
          presentation = RoutePresentation.PUSH,
          arguments =
            listOf(
              RouteArgumentSpec("slug", required = false, type = "String"),
              RouteArgumentSpec("pageIndex", required = false, type = "Int"),
            ),
          deepLinks = listOf("hangyeol://reader-focus?slug={slug}&pageIndex={pageIndex}"),
        ),
    ) {
    fun createRoute(slug: String? = null, pageIndex: Int = 0): String {
      val encodedSlug = Uri.encode(slug.orEmpty())
      return "main/reader-focus?slug=$encodedSlug&pageIndex=$pageIndex"
    }
  }

  data object EpubReader :
    HangyeolDestination(
      pattern = "main/reading/library/{slug}",
      baseline =
        RouteBaselineEntry(
          composeRoute = "main/reading/library/{slug}",
          graph = RouteGraph.MAIN,
          presentation = RoutePresentation.PUSH,
          arguments = listOf(RouteArgumentSpec("slug", required = true, type = "String")),
          deepLinks = listOf("hangyeol://reading/library/{slug}"),
        ),
    ) {
    fun createRoute(slug: String): String = "main/reading/library/${Uri.encode(slug)}"
  }

  data object Videos :
    HangyeolDestination(
      pattern = "main/videos",
      baseline =
        RouteBaselineEntry(
          composeRoute = "main/videos",
          graph = RouteGraph.MAIN,
          presentation = RoutePresentation.PUSH,
          deepLinks = listOf("hangyeol://videos"),
        ),
    )

  data object VideoPlayer :
    HangyeolDestination(
      pattern = "main/video/{videoId}",
      baseline =
        RouteBaselineEntry(
          composeRoute = "main/video/{videoId}",
          graph = RouteGraph.MAIN,
          presentation = RoutePresentation.FULL_SCREEN_MODAL,
          arguments = listOf(RouteArgumentSpec("videoId", required = true, type = "String")),
          deepLinks = listOf("hangyeol://video/{videoId}"),
        ),
    ) {
    fun createRoute(videoId: String): String = "main/video/${Uri.encode(videoId)}"
  }

  data object Podcasts :
    HangyeolDestination(
      pattern = "main/podcasts",
      baseline =
        RouteBaselineEntry(
          composeRoute = "main/podcasts",
          graph = RouteGraph.MAIN,
          presentation = RoutePresentation.PUSH,
          deepLinks = listOf("hangyeol://podcasts"),
        ),
    )

  data object PodcastChannel :
    HangyeolDestination(
      pattern = "main/podcast-channel?channelId={channelId}",
      baseline =
        RouteBaselineEntry(
          composeRoute = "main/podcast-channel?channelId={channelId}",
          graph = RouteGraph.MAIN,
          presentation = RoutePresentation.PUSH,
          arguments =
            listOf(
              RouteArgumentSpec("channelId", required = false, type = "String"),
            ),
          deepLinks = listOf("hangyeol://podcast-channel?channelId={channelId}"),
        ),
    ) {
    fun createRoute(channelId: String? = null): String {
      val encodedId = Uri.encode(channelId.orEmpty())
      return "main/podcast-channel?channelId=$encodedId"
    }
  }

  data object PodcastSearch :
    HangyeolDestination(
      pattern = "main/podcasts/search",
      baseline =
        RouteBaselineEntry(
          composeRoute = "main/podcasts/search",
          graph = RouteGraph.MAIN,
          presentation = RoutePresentation.PUSH,
          deepLinks = listOf("hangyeol://podcasts/search"),
        ),
    )

  data object PodcastPlayer :
    HangyeolDestination(
      pattern = "main/podcasts/player?episodeId={episodeId}",
      baseline =
        RouteBaselineEntry(
          composeRoute = "main/podcasts/player?episodeId={episodeId}",
          graph = RouteGraph.MAIN,
          presentation = RoutePresentation.FULL_SCREEN_MODAL,
          arguments = listOf(RouteArgumentSpec("episodeId", required = false, type = "String")),
          deepLinks = listOf("hangyeol://podcasts/player?episodeId={episodeId}"),
        ),
    ) {
    fun createRoute(episodeId: String? = null): String =
      "main/podcasts/player?episodeId=${Uri.encode(episodeId.orEmpty())}"
  }

  data object PodcastHistory :
    HangyeolDestination(
      pattern = "main/podcasts/history",
      baseline =
        RouteBaselineEntry(
          composeRoute = "main/podcasts/history",
          graph = RouteGraph.MAIN,
          presentation = RoutePresentation.PUSH,
          deepLinks = listOf("hangyeol://podcasts/history"),
        ),
    )

  data object History :
    HangyeolDestination(
      pattern = "main/history",
      baseline =
        RouteBaselineEntry(
          composeRoute = "main/history",
          graph = RouteGraph.MAIN,
          presentation = RoutePresentation.PUSH,
          deepLinks = listOf("hangyeol://history"),
        ),
    )

  data object Community :
    HangyeolDestination(
      pattern = "main/community",
      baseline =
        RouteBaselineEntry(
          composeRoute = "main/community",
          graph = RouteGraph.MAIN,
          presentation = RoutePresentation.PUSH,
          deepLinks = listOf("hangyeol://community"),
        ),
    )

  data object CommunityAdd :
    HangyeolDestination(
      pattern = "main/community/add",
      baseline =
        RouteBaselineEntry(
          composeRoute = "main/community/add",
          graph = RouteGraph.MAIN,
          presentation = RoutePresentation.PUSH,
          deepLinks = listOf("hangyeol://community/add"),
        ),
    )

  data object Leaderboard :
    HangyeolDestination(
      pattern = "main/leaderboard",
      baseline =
        RouteBaselineEntry(
          composeRoute = "main/leaderboard",
          graph = RouteGraph.MAIN,
          presentation = RoutePresentation.PUSH,
          deepLinks = listOf("hangyeol://leaderboard"),
        ),
    )

  data object ProfileSettings :
    HangyeolDestination(
      pattern = "main/profile/settings",
      baseline =
        RouteBaselineEntry(
          composeRoute = "main/profile/settings",
          graph = RouteGraph.MAIN,
          presentation = RoutePresentation.PUSH,
          deepLinks = listOf("hangyeol://profile/settings"),
        ),
    )

  data object ProfileSettingsSection :
    HangyeolDestination(
      pattern = "main/profile/settings/{section}",
      baseline =
        RouteBaselineEntry(
          composeRoute = "main/profile/settings/{section}",
          graph = RouteGraph.MAIN,
          presentation = RoutePresentation.PUSH,
          arguments = listOf(RouteArgumentSpec("section", required = true, type = "String")),
          deepLinks = listOf("hangyeol://profile/settings/{section}"),
        ),
    ) {
    fun createRoute(section: String): String = "main/profile/settings/${Uri.encode(section)}"
  }

  data object Achievements :
    HangyeolDestination(
      pattern = "main/achievements",
      baseline =
        RouteBaselineEntry(
          composeRoute = "main/achievements",
          graph = RouteGraph.MAIN,
          presentation = RoutePresentation.PUSH,
          deepLinks = listOf("hangyeol://achievements"),
        ),
    )

  data object TopikHistory :
    HangyeolDestination(
      pattern = "main/topik/history",
      baseline =
        RouteBaselineEntry(
          composeRoute = "main/topik/history",
          graph = RouteGraph.MAIN,
          presentation = RoutePresentation.PUSH,
          deepLinks = listOf("hangyeol://topik/history"),
        ),
    )

  data object Pricing :
    HangyeolDestination(
      pattern = "main/pricing",
      baseline =
        RouteBaselineEntry(
          composeRoute = "main/pricing",
          graph = RouteGraph.MAIN,
          presentation = RoutePresentation.MODAL,
          deepLinks = listOf("hangyeol://pricing"),
        ),
    )

  data object SubscriptionDetail :
    HangyeolDestination(
      pattern = "main/subscription",
      baseline =
        RouteBaselineEntry(
          composeRoute = "main/subscription",
          graph = RouteGraph.MAIN,
          presentation = RoutePresentation.PUSH,
          deepLinks = listOf("hangyeol://subscription"),
        ),
    )

  data object PodcastSubscriptions :
    HangyeolDestination(
      pattern = "main/podcasts/subscriptions",
      baseline =
        RouteBaselineEntry(
          composeRoute = "main/podcasts/subscriptions",
          graph = RouteGraph.MAIN,
          presentation = RoutePresentation.PUSH,
          deepLinks = listOf("hangyeol://podcasts/subscriptions"),
        ),
    )

  data object WritingEvaluation :
    HangyeolDestination(
      pattern = "main/topik/writing/{sessionId}/evaluation",
      baseline =
        RouteBaselineEntry(
          composeRoute = "main/topik/writing/{sessionId}/evaluation",
          graph = RouteGraph.MAIN,
          presentation = RoutePresentation.PUSH,
          arguments = listOf(RouteArgumentSpec("sessionId", required = true, type = "String")),
          deepLinks = listOf("hangyeol://topik/writing/{sessionId}/evaluation"),
        ),
    ) {
    fun createRoute(sessionId: String): String = "main/topik/writing/${Uri.encode(sessionId)}/evaluation"
  }

  data object ReadingArticle :
    HangyeolDestination(
      pattern = "main/reading/article/{articleId}",
      baseline =
        RouteBaselineEntry(
          composeRoute = "main/reading/article/{articleId}",
          graph = RouteGraph.MAIN,
          presentation = RoutePresentation.PUSH,
          arguments = listOf(RouteArgumentSpec("articleId", required = true, type = "String")),
          deepLinks = listOf("hangyeol://reading/article/{articleId}"),
        ),
    ) {
    fun createRoute(articleId: String): String = "main/reading/article/${Uri.encode(articleId)}"
  }

  data object EpubUpload :
    HangyeolDestination(
      pattern = "main/reading/upload",
      baseline =
        RouteBaselineEntry(
          composeRoute = "main/reading/upload",
          graph = RouteGraph.MAIN,
          presentation = RoutePresentation.PUSH,
          deepLinks = listOf("hangyeol://reading/upload"),
        ),
    )

}

object HangyeolRouteBaseline {
  val entries: List<RouteBaselineEntry> =
    listOf(
      HangyeolDestination.AuthLogin.baseline,
      HangyeolDestination.AuthRegister.baseline,
      HangyeolDestination.AuthForgotPassword.baseline,
      HangyeolDestination.AuthResetPassword.baseline,
      HangyeolDestination.AuthVerifyEmail.baseline,
      HangyeolDestination.AuthOAuthCallback.baseline,
      HangyeolDestination.TabsToday.baseline,
      HangyeolDestination.TabsCourses.baseline,
      HangyeolDestination.TabsMedia.baseline,
      HangyeolDestination.TabsProfile.baseline,
      HangyeolDestination.Vocab.baseline,
      HangyeolDestination.VocabDeck.baseline,
      HangyeolDestination.VocabBook.baseline,
      HangyeolDestination.VocabBookMode.baseline,
      HangyeolDestination.Grammar.baseline,
      HangyeolDestination.GrammarModule.baseline,
      HangyeolDestination.GrammarPractice.baseline,
      HangyeolDestination.Review.baseline,
      HangyeolDestination.ReviewQuiz.baseline,
      HangyeolDestination.Writing.baseline,
      HangyeolDestination.Typing.baseline,
      HangyeolDestination.Topik.baseline,
      HangyeolDestination.TopikExam.baseline,
      HangyeolDestination.TopikWriting.baseline,
      HangyeolDestination.Dictionary.baseline,
      HangyeolDestination.Notebook.baseline,
      HangyeolDestination.Reading.baseline,
      HangyeolDestination.PictureBook.baseline,
      HangyeolDestination.ReaderFocus.baseline,
      HangyeolDestination.EpubReader.baseline,
      HangyeolDestination.Videos.baseline,
      HangyeolDestination.VideoPlayer.baseline,
      HangyeolDestination.Podcasts.baseline,
      HangyeolDestination.PodcastChannel.baseline,
      HangyeolDestination.PodcastSearch.baseline,
      HangyeolDestination.PodcastPlayer.baseline,
      HangyeolDestination.PodcastHistory.baseline,
      HangyeolDestination.History.baseline,
      HangyeolDestination.Community.baseline,
      HangyeolDestination.CommunityAdd.baseline,
      HangyeolDestination.Leaderboard.baseline,
      HangyeolDestination.ProfileSettings.baseline,
      HangyeolDestination.ProfileSettingsSection.baseline,
      HangyeolDestination.Achievements.baseline,
      HangyeolDestination.TopikHistory.baseline,
      HangyeolDestination.Pricing.baseline,
      HangyeolDestination.SubscriptionDetail.baseline,
      HangyeolDestination.PodcastSubscriptions.baseline,
      HangyeolDestination.WritingEvaluation.baseline,
      HangyeolDestination.ReadingArticle.baseline,
      HangyeolDestination.EpubUpload.baseline,
    )
}
