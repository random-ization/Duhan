package com.hangyeol.app.compose.ui

import androidx.test.ext.junit.runners.AndroidJUnit4
import com.hangyeol.app.compose.navigation.HangyeolDestination
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class AndroidMobileWebParityRouteTest {

    @Test
    fun resolvesCoreWebMobileRoutesToAndroidDestinations() {
        val cases = mapOf(
            "/zh/dashboard" to HangyeolDestination.TabsToday.pattern,
            "/zh/courses" to HangyeolDestination.TabsCourses.pattern,
            "/zh/review" to HangyeolDestination.Review.pattern,
            "/zh/topik" to HangyeolDestination.Topik.pattern,
            "/zh/topik/history" to HangyeolDestination.TopikHistory.pattern,
            "/zh/typing" to HangyeolDestination.Typing.pattern,
            "/zh/vocab-book" to HangyeolDestination.VocabBook.pattern,
            "/zh/vocab-book/dictation" to HangyeolDestination.VocabBookMode.createRoute("dictation"),
            "/zh/notebook" to HangyeolDestination.Notebook.pattern,
            "/zh/dictionary/search" to HangyeolDestination.Dictionary.pattern,
            "/zh/community" to HangyeolDestination.Community.pattern,
            "/zh/community/add" to HangyeolDestination.CommunityAdd.pattern,
            "/zh/leaderboard" to HangyeolDestination.Leaderboard.pattern,
            "/zh/history" to HangyeolDestination.History.pattern,
            "/zh/media" to HangyeolDestination.TabsMedia.pattern,
            "/zh/reading" to HangyeolDestination.Reading.pattern,
            "/zh/reading/library/book-1" to HangyeolDestination.EpubReader.createRoute("book-1"),
            "/zh/videos" to HangyeolDestination.Videos.pattern,
            "/zh/video/video-1" to HangyeolDestination.VideoPlayer.createRoute("video-1"),
            "/zh/podcasts" to HangyeolDestination.Podcasts.pattern,
            "/zh/podcasts/search" to HangyeolDestination.PodcastSearch.pattern,
            "/zh/podcasts/history" to HangyeolDestination.PodcastHistory.pattern,
            "/zh/profile" to HangyeolDestination.TabsProfile.pattern,
            "/zh/profile/settings/notifications" to HangyeolDestination.ProfileSettingsSection.createRoute("notifications"),
            "/zh/profile/settings/language" to HangyeolDestination.ProfileSettingsSection.createRoute("language"),
            "/zh/achievements" to HangyeolDestination.Achievements.pattern,
            "/zh/pricing" to HangyeolDestination.Pricing.pattern,
            "/zh/subscription" to HangyeolDestination.Pricing.pattern,
        )

        cases.forEach { (webPath, expectedRoute) ->
            assertEquals("Expected $webPath to resolve", expectedRoute, resolveRoute(webPath))
        }
    }

    @Test
    fun bottomBarMatchesGroupedWebMobileRoutes() {
        assertTrue(shouldShowBottomBar(HangyeolDestination.Dictionary.pattern))
        assertTrue(shouldShowBottomBar(HangyeolDestination.Community.pattern))
        assertTrue(shouldShowBottomBar(HangyeolDestination.Review.pattern))
        assertTrue(shouldShowBottomBar(HangyeolDestination.Typing.pattern))
        assertTrue(shouldShowBottomBar(HangyeolDestination.VocabBook.pattern))
        assertTrue(shouldShowBottomBar(HangyeolDestination.Reading.pattern))
        assertTrue(shouldShowBottomBar(HangyeolDestination.Videos.pattern))
        assertTrue(shouldShowBottomBar(HangyeolDestination.PodcastSearch.pattern))
        assertTrue(shouldShowBottomBar(HangyeolDestination.ProfileSettingsSection.createRoute("language")))
        assertTrue(shouldShowBottomBar(HangyeolDestination.Achievements.pattern))

        assertFalse(shouldShowBottomBar(HangyeolDestination.TopikExam.createRoute("exam-1")))
        assertFalse(shouldShowBottomBar(HangyeolDestination.TopikWriting.createRoute("writing-1")))
        assertFalse(shouldShowBottomBar(HangyeolDestination.VideoPlayer.createRoute("video-1")))
        assertFalse(shouldShowBottomBar(HangyeolDestination.PodcastPlayer.createRoute("episode-1")))
        assertFalse(shouldShowBottomBar(HangyeolDestination.VocabBookMode.createRoute("dictation")))
    }
}
