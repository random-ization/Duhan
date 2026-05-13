package com.hangyeol.app.compose.ui

import androidx.compose.ui.test.hasSetTextAction
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onAllNodesWithText
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performTextInput
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import android.content.Context
import com.hangyeol.app.compose.data.ComposeServiceLocator
import com.hangyeol.app.compose.data.GrammarHubUiState
import com.hangyeol.app.compose.data.GrammarModuleUiState
import com.hangyeol.app.compose.data.InMemoryLearningRepository
import com.hangyeol.app.compose.data.LearningHubUiState
import com.hangyeol.app.compose.data.LearningRepository
import com.hangyeol.app.compose.data.ReviewHubUiState
import com.hangyeol.app.compose.data.TopikCenterUiState
import com.hangyeol.app.compose.data.TopikWritingQuestionUiModel
import com.hangyeol.app.compose.data.TopikWritingSessionUiModel
import com.hangyeol.app.compose.data.TopikWritingSubmitResultUiModel
import com.hangyeol.app.compose.data.VocabUiState
import com.hangyeol.app.compose.data.WritingHubUiState
import com.hangyeol.app.compose.data.WritingPromptUiModel
import com.hangyeol.app.compose.theme.HangyeolAppTheme
import org.junit.Rule
import org.junit.Test
import org.junit.After
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class TopikWritingSubmitLockUiTest {

  @get:Rule
  val composeRule = createComposeRule()

  @After
  fun tearDown() {
    val context = ApplicationProvider.getApplicationContext<Context>()
    ComposeServiceLocator.resetTestingOverrides(context)
  }

  @Test
  fun topikWritingSubmitSuccessLocksSessionAndHidesActions() {
    val repository = SubmitLockTopikWritingRepository()
    ComposeServiceLocator.overrideLearningRepositoryForTesting(repository)

    composeRule.setContent {
      HangyeolAppTheme {
        TopikWritingScreenTestHarness(examId = repository.examId)
      }
    }

    composeRule.waitUntilTextExists("开始写作会话")
    composeRule.onNodeWithText("开始写作会话").performClick()

    composeRule.waitUntilTextExists("提交评估")
    composeRule.onNode(hasSetTextAction(), useUnmergedTree = true).performTextInput("这是用于提交锁定验证的草稿内容。")
    composeRule.onNodeWithText("提交评估").performClick()

    composeRule.waitUntilTextExists("写作会话已提交")
    composeRule.waitUntilTextAbsent("提交评估")
    composeRule.waitUntilTextAbsent("保存草稿")
  }

  private fun androidx.compose.ui.test.junit4.ComposeContentTestRule.waitUntilTextExists(
    text: String,
    timeoutMillis: Long = 7_000L,
  ) {
    waitUntil(timeoutMillis) {
      onAllNodesWithText(text, substring = true, useUnmergedTree = true).fetchSemanticsNodes().isNotEmpty()
    }
  }

  private fun androidx.compose.ui.test.junit4.ComposeContentTestRule.waitUntilTextAbsent(
    text: String,
    timeoutMillis: Long = 7_000L,
  ) {
    waitUntil(timeoutMillis) {
      onAllNodesWithText(text, substring = true, useUnmergedTree = true).fetchSemanticsNodes().isEmpty()
    }
  }
}

private class SubmitLockTopikWritingRepository : LearningRepository {
  private val delegate = InMemoryLearningRepository()

  val examId: String = "writing-submit-lock-test"
  private val sessionId: String = "writing-session-lock-1"
  private val persistedAnswers = linkedMapOf<String, String>()

  override suspend fun loadLearningHub(): LearningHubUiState = delegate.loadLearningHub()

  override suspend fun loadVocab(): VocabUiState = delegate.loadVocab()

  override suspend fun loadGrammarHub(): GrammarHubUiState = delegate.loadGrammarHub()

  override suspend fun loadGrammarModule(deckId: String): GrammarModuleUiState =
    delegate.loadGrammarModule(deckId)

  override suspend fun loadReviewHub(): ReviewHubUiState = delegate.loadReviewHub()

  override suspend fun loadWritingHub(): WritingHubUiState =
    WritingHubUiState(
      isLoading = false,
      prompts =
        listOf(
          WritingPromptUiModel(
            seal = "述",
            title = "TOPIK 写作模拟",
            subtitle = "提交后应锁定会话",
            meta = "自动化测试数据",
            accent = "mint",
            route = "main/topik/writing/$examId",
          ),
        ),
      drafts = emptyList(),
    )

  override suspend fun loadTopikCenter(): TopikCenterUiState = delegate.loadTopikCenter()

  override suspend fun startTopikWritingSession(examDocumentId: String): Result<TopikWritingSessionUiModel> =
    Result.success(
      TopikWritingSessionUiModel(
        sessionId = sessionId,
        endTimeMillis = System.currentTimeMillis() + 30 * 60_000L,
        answers = persistedAnswers.toMap(),
        answerCount = persistedAnswers.size,
        isResuming = persistedAnswers.isNotEmpty(),
      ),
    )

  override suspend fun loadTopikWritingQuestions(examDocumentId: String): Result<List<TopikWritingQuestionUiModel>> =
    Result.success(
      listOf(
        TopikWritingQuestionUiModel(
          number = 1,
          instruction = "请根据给定主题写一段 80-100 字短文。",
          score = 20,
        ),
      ),
    )

  override suspend fun saveTopikWritingDraft(
    sessionId: String,
    answers: Map<String, String>,
  ): Result<Unit> {
    persistedAnswers.putAll(answers)
    return Result.success(Unit)
  }

  override suspend fun submitTopikWritingSession(sessionId: String): Result<TopikWritingSubmitResultUiModel> =
    Result.success(TopikWritingSubmitResultUiModel(alreadySubmitted = false))
}
