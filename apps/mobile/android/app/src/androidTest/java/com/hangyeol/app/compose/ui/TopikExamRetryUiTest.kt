package com.hangyeol.app.compose.ui

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onAllNodesWithText
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
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
import com.hangyeol.app.compose.data.TopikExamQuestionUiModel
import com.hangyeol.app.compose.data.TopikExamSessionUiModel
import com.hangyeol.app.compose.data.TopikExamSubmitResultUiModel
import com.hangyeol.app.compose.data.TopikExamUiModel
import com.hangyeol.app.compose.data.TopikType
import com.hangyeol.app.compose.data.VocabUiState
import com.hangyeol.app.compose.data.WritingHubUiState
import com.hangyeol.app.compose.theme.HangyeolAppTheme
import org.junit.Rule
import org.junit.Test
import org.junit.After
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class TopikExamRetryUiTest {

  @get:Rule
  val composeRule = createComposeRule()

  @After
  fun tearDown() {
    val context = ApplicationProvider.getApplicationContext<Context>()
    ComposeServiceLocator.resetTestingOverrides(context)
  }

  @Test
  fun topikExamLoadFailureCanRetryAndRecover() {
    val repository = RetryableTopikLearningRepository()
    ComposeServiceLocator.overrideLearningRepositoryForTesting(repository)

    composeRule.setContent {
      HangyeolAppTheme {
        TopikExamScreenTestHarness(examId = repository.examId)
      }
    }

    composeRule.waitUntilTextExists("开始考试")
    composeRule.onNodeWithText("开始考试").performClick()

    composeRule.waitUntilTextExists("题目加载失败")
    composeRule.onNodeWithText("重试加载题目").performClick()

    composeRule.waitUntilTextExists(repository.recoveredQuestionText)
    composeRule.onNodeWithText(repository.recoveredQuestionText).assertIsDisplayed()
  }

  private fun androidx.compose.ui.test.junit4.ComposeContentTestRule.waitUntilTextExists(
    text: String,
    timeoutMillis: Long = 7_000L,
  ) {
    waitUntil(timeoutMillis) {
      onAllNodesWithText(text, substring = true, useUnmergedTree = true).fetchSemanticsNodes().isNotEmpty()
    }
  }
}

private class RetryableTopikLearningRepository : LearningRepository {
  private val delegate = InMemoryLearningRepository()
  private var questionLoadAttempts = 0

  val examId: String = "retry-exam-ui-test"
  val recoveredQuestionText: String = "这是重试后恢复的题目内容。"

  override suspend fun loadLearningHub(): LearningHubUiState = delegate.loadLearningHub()

  override suspend fun loadVocab(): VocabUiState = delegate.loadVocab()

  override suspend fun loadGrammarHub(): GrammarHubUiState = delegate.loadGrammarHub()

  override suspend fun loadGrammarModule(deckId: String): GrammarModuleUiState =
    delegate.loadGrammarModule(deckId)

  override suspend fun loadReviewHub(): ReviewHubUiState = delegate.loadReviewHub()

  override suspend fun loadWritingHub(): WritingHubUiState = delegate.loadWritingHub()

  override suspend fun loadTopikCenter(): TopikCenterUiState =
    TopikCenterUiState(
      isLoading = false,
      exams =
        listOf(
          TopikExamUiModel(
            id = examId,
            legacyExamId = examId,
            examDocumentId = null,
            title = "重试恢复测试卷",
            type = TopikType.READING,
            level = "TOPIK I",
            durationMinutes = 30,
            questionCount = 1,
            isLocked = false,
            bestScore = 0,
          ),
        ),
      history = emptyList(),
    )

  override suspend fun startTopikExamSession(examId: String): Result<TopikExamSessionUiModel> =
    Result.success(
      TopikExamSessionUiModel(
        sessionId = "session-$examId",
        endTimeMillis = System.currentTimeMillis() + 30 * 60_000L,
        answers = emptyMap(),
        answerCount = 0,
        isResuming = false,
      ),
    )

  override suspend fun loadTopikExamQuestions(examId: String): Result<List<TopikExamQuestionUiModel>> {
    questionLoadAttempts += 1
    if (questionLoadAttempts == 1) {
      return Result.failure(IllegalStateException("模拟题目加载失败，请重试"))
    }
    return Result.success(
      listOf(
        TopikExamQuestionUiModel(
          number = 1,
          question = recoveredQuestionText,
          passage = "这是用于验证重试恢复路径的测试材料。",
          options = listOf("选项 A", "选项 B", "选项 C", "选项 D"),
          score = 5,
        ),
      ),
    )
  }

  override suspend fun saveTopikExamAnswers(
    sessionId: String,
    answers: Map<String, Int>,
  ): Result<Unit> = Result.success(Unit)

  override suspend fun submitTopikExam(
    sessionId: String,
    answers: Map<String, Int>,
  ): Result<TopikExamSubmitResultUiModel> =
    Result.success(
      TopikExamSubmitResultUiModel(
        score = 5,
        totalQuestions = 1,
        totalScore = 5,
      ),
    )
}
