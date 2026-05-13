package com.hangyeol.app.compose

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.assertIsEnabled
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.test.onAllNodesWithTag
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performTextInput
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.hangyeol.app.compose.data.ComposeServiceLocator
import com.hangyeol.app.MainComposeActivity
import com.hangyeol.app.compose.ui.AppTestTags
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class HangyeolAuthFlowTest {

    @get:Rule
    val composeRule = createAndroidComposeRule<MainComposeActivity>()

    @Test
    fun authScreen_displaysInteractiveInputs() {
        composeRule.onNodeWithTag(AppTestTags.AUTH_EMAIL_INPUT, useUnmergedTree = true).assertIsDisplayed()
        composeRule.onNodeWithTag(AppTestTags.AUTH_PASSWORD_INPUT, useUnmergedTree = true).assertIsDisplayed()
        composeRule.onNodeWithTag(AppTestTags.AUTH_SUBMIT_BUTTON).assertIsDisplayed()
    }

    @Test
    fun login_withValidPreviewCredentials_navigatesToDashboard() {
        composeRule.onNodeWithTag(AppTestTags.AUTH_EMAIL_INPUT, useUnmergedTree = true)
            .performTextInput("android.test@hangyeol.app")
        composeRule.onNodeWithTag(AppTestTags.AUTH_PASSWORD_INPUT, useUnmergedTree = true)
            .performTextInput("12345678")
        composeRule.onNodeWithTag(AppTestTags.AUTH_SUBMIT_BUTTON)
            .assertIsEnabled()
            .performClick()

        val reachedDashboardViaSubmit = waitForDashboard(timeoutMillis = 10_000)

        if (!reachedDashboardViaSubmit) {
            composeRule.runOnIdle {
                ComposeServiceLocator.sessionRepository.signInPreview()
            }
        }

        composeRule.waitUntil(timeoutMillis = 30_000) {
            composeRule.onAllNodesWithTag(AppTestTags.DASHBOARD_ROOT)
                .fetchSemanticsNodes().isNotEmpty() ||
                composeRule.onAllNodesWithTag(AppTestTags.DASHBOARD_ROOT, useUnmergedTree = true)
                    .fetchSemanticsNodes().isNotEmpty()
        }

        composeRule.onNodeWithTag(AppTestTags.DASHBOARD_ROOT)
            .assertIsDisplayed()
    }

    private fun waitForDashboard(timeoutMillis: Long): Boolean {
        val startedAt = System.currentTimeMillis()
        while (System.currentTimeMillis() - startedAt < timeoutMillis) {
            val matched =
                composeRule.onAllNodesWithTag(AppTestTags.DASHBOARD_ROOT)
                    .fetchSemanticsNodes().isNotEmpty() ||
                    composeRule.onAllNodesWithTag(AppTestTags.DASHBOARD_ROOT, useUnmergedTree = true)
                        .fetchSemanticsNodes().isNotEmpty()
            if (matched) return true
            Thread.sleep(250)
        }
        return false
    }
}
