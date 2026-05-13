package com.hangyeol.app.compose.data

import androidx.test.ext.junit.runners.AndroidJUnit4
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class InMemoryLearningRepositoryTopikFlowTest {

    private val repository = InMemoryLearningRepository()

    @Test
    fun topikExamFlowStartLoadSubmit() = runBlocking {
        val sessionResult = repository.startTopikExamSession("set-1")
        assertTrue(sessionResult.isSuccess)
        val session = sessionResult.getOrNull()
        assertNotNull(session)
        assertTrue((session?.sessionId ?: "").isNotBlank())
        assertTrue((session?.endTimeMillis ?: 0L) > System.currentTimeMillis())
        assertTrue((session?.answers ?: emptyMap()).isEmpty())

        val questionsResult = repository.loadTopikExamQuestions("set-1")
        assertTrue(questionsResult.isSuccess)
        val questions = questionsResult.getOrNull() ?: emptyList()
        assertFalse(questions.isEmpty())

        val firstQuestion = questions.first()
        val submitResult = repository.submitTopikExam(
            sessionId = session?.sessionId ?: "fallback",
            answers = mapOf(firstQuestion.number.toString() to 1),
        )
        assertTrue(submitResult.isSuccess)
        val submitSummary = submitResult.getOrNull()
        assertNotNull(submitSummary)
        assertTrue((submitSummary?.totalQuestions ?: 0) > 0)
    }

    @Test
    fun topikWritingFlowStartSaveSubmit() = runBlocking {
        val sessionResult = repository.startTopikWritingSession("set-3")
        assertTrue(sessionResult.isSuccess)
        val session = sessionResult.getOrNull()
        assertNotNull(session)
        assertTrue((session?.sessionId ?: "").isNotBlank())

        val saveResult = repository.saveTopikWritingDraft(
            sessionId = session?.sessionId ?: "fallback",
            answers = mapOf("1" to "这是一个测试草稿。"),
        )
        assertTrue(saveResult.isSuccess)

        val submitResult = repository.submitTopikWritingSession(session?.sessionId ?: "fallback")
        assertTrue(submitResult.isSuccess)
    }
}

