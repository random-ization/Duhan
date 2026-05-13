package com.hangyeol.app.compose.data

import android.content.Context
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.intPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.first

data class LearningTab(
  val label: String,
  val active: Boolean,
)

data class LearningCurrentCourse(
  val progress: Int,
  val title: String,
  val subtitle: String,
  val completedHours: Int?,
  val totalHours: Int?,
  val etaDays: Int?,
  val route: String,
)

data class LearningJourneyUnit(
  val number: Int,
  val title: String,
  val subtitle: String,
  val progress: Float,
  val seal: String,
  val route: String,
)

data class LearningToolShortcut(
  val seal: String,
  val label: String,
  val subtitle: String,
  val accent: String,
  val route: String,
)

data class LearningHubUiState(
  val isLoading: Boolean = true,
  val tabs: List<LearningTab> = emptyList(),
  val currentCourse: LearningCurrentCourse? = null,
  val journeyUnits: List<LearningJourneyUnit> = emptyList(),
  val shortcuts: List<LearningToolShortcut> = emptyList(),
)

data class GrammarDeckUiModel(
  val id: String,
  val title: String,
  val subtitle: String,
  val level: String,
  val itemCount: Int,
  val progress: Int,
  val totalUnits: Int,
  val isLocked: Boolean = false,
)

data class GrammarHubUiState(
  val isLoading: Boolean = true,
  val decks: List<GrammarDeckUiModel> = emptyList(),
  val currentCourse: LearningCurrentCourse? = null,
  val journeyUnits: List<LearningJourneyUnit> = emptyList(),
  val shortcuts: List<LearningToolShortcut> = emptyList(),
)

data class GrammarPointUiModel(
  val id: String,
  val title: String,
  val summary: String,
  val status: String,
  val proficiency: Int,
  val translation: String = "",
  val explanation: String = "",
  val rules: List<Pair<String, String>> = emptyList(),
  val examples: List<GrammarExampleUiModel> = emptyList(),
  val quizzes: List<GrammarQuizItemUiModel> = emptyList(),
)

data class GrammarExampleUiModel(
  val korean: String,
  val translation: String,
)

data class GrammarQuizItemUiModel(
  val prompt: String,
  val answer: String,
)

data class GrammarModuleUiState(
  val isLoading: Boolean = true,
  val deckTitle: String = "",
  val deckLevel: String = "",
  val totalCount: Int = 0,
  val masteredCount: Int = 0,
  val learningCount: Int = 0,
  val points: List<GrammarPointUiModel> = emptyList(),
)

data class VocabEntryUiModel(
  val id: String,
  val word: String,
  val hanja: String,
  val pronunciation: String,
  val partOfSpeech: String,
  val memoryRate: Int,
  val accent: String,
)

data class VocabUiState(
  val isLoading: Boolean = true,
  val dueCount: Int = 0,
  val totalWords: Int = 0,
  val masteredCount: Int = 0,
  val learningCount: Int = 0,
  val newWordCount: Int = 0,
  val selectedTab: String = "due",
  val entries: List<VocabEntryUiModel> = emptyList(),
)

data class ReviewSessionUiModel(
  val title: String,
  val subtitle: String,
  val countLabel: String,
  val route: String,
)

data class ReviewHubUiState(
  val isLoading: Boolean = true,
  val pendingCount: Int = 0,
  val masteredToday: Int = 0,
  val accuracy: Int = 0,
  val sessions: List<ReviewSessionUiModel> = emptyList(),
)

data class WritingDraftUiModel(
  val title: String,
  val subtitle: String,
  val progress: String,
  val route: String,
)

data class WritingPromptUiModel(
  val seal: String,
  val title: String,
  val subtitle: String,
  val meta: String,
  val accent: String,
  val route: String,
)

data class WritingHubUiState(
  val isLoading: Boolean = true,
  val weeklyGoal: String = "",
  val completedCount: Int = 0,
  val averageScore: Int = 0,
  val streakDays: Int = 0,
  val focusTitle: String = "",
  val focusSubtitle: String = "",
  val focusMeta: String = "",
  val drafts: List<WritingDraftUiModel> = emptyList(),
  val prompts: List<WritingPromptUiModel> = emptyList(),
)

enum class TopikType {
  READING,
  LISTENING,
  WRITING,
}

enum class TopikFilter {
  ALL,
  READING,
  LISTENING,
  WRITING,
}

data class TopikExamUiModel(
  val id: String,
  val legacyExamId: String,
  val examDocumentId: String? = null,
  val title: String,
  val type: TopikType,
  val level: String,
  val durationMinutes: Int,
  val questionCount: Int,
  val isLocked: Boolean,
  val bestScore: Int,
)

data class TopikExamSessionUiModel(
  val sessionId: String,
  val endTimeMillis: Long,
  val answers: Map<String, Int>,
  val answerCount: Int,
  val isResuming: Boolean,
)

data class TopikExamQuestionUiModel(
  val number: Int,
  val question: String,
  val passage: String,
  val options: List<String>,
  val score: Int,
  val correctAnswer: Int? = null,
  val instruction: String = "",
  val contextBox: String = "",
)

data class TopikExamSubmitResultUiModel(
  val score: Int,
  val totalQuestions: Int,
  val totalScore: Int,
)

data class TopikWritingSessionUiModel(
  val sessionId: String,
  val endTimeMillis: Long,
  val answers: Map<String, String>,
  val answerCount: Int,
  val isResuming: Boolean,
)

data class TopikWritingSubmitResultUiModel(
  val alreadySubmitted: Boolean,
)

data class TopikWritingQuestionUiModel(
  val number: Int,
  val instruction: String,
  val contextBox: String = "",
  val score: Int,
)

data class TopikWritingEvaluationDimensionsUiModel(
  val taskAccomplishment: Int,
  val developmentStructure: Int,
  val languageUse: Int,
  val wongojiRules: Int? = null,
)

data class TopikWritingQuestionEvaluationUiModel(
  val questionNumber: Int,
  val score: Int,
  val dimensions: TopikWritingEvaluationDimensionsUiModel,
  val feedbackText: String,
  val correctedText: String = "",
)

data class TopikWritingEvaluationReportUiModel(
  val status: String,
  val totalScore: Int,
  val answers: Map<String, String>,
  val evaluations: List<TopikWritingQuestionEvaluationUiModel>,
)

data class TopikHistoryUiModel(
  val title: String,
  val submittedAt: String,
  val score: Int,
  val examId: String,
  val mode: TopikType,
)

data class TopikCenterUiState(
  val isLoading: Boolean = true,
  val exams: List<TopikExamUiModel> = emptyList(),
  val history: List<TopikHistoryUiModel> = emptyList(),
)

data class VocabReviewResult(
  val success: Boolean,
  val errorMessage: String? = null,
)

data class ReviewQuizQuestion(
  val id: String,
  val korean: String,
  val translation: String,
  val pronunciation: String,
  val partOfSpeech: String,
  val options: List<String>,
  val correctIndex: Int,
)

data class ReviewQuizUiState(
  val isLoading: Boolean = true,
  val questions: List<ReviewQuizQuestion> = emptyList(),
  val currentIndex: Int = 0,
  val score: Int = 0,
  val isComplete: Boolean = false,
  val errorMessage: String? = null,
)

data class GrammarSentenceAnalysisResult(
  val success: Boolean,
  val isCorrect: Boolean = false,
  val feedback: String = "",
  val correctedSentence: String = "",
  val errorMessage: String? = null,
)

data class GrammarProgressUpdateResult(
  val success: Boolean,
  val status: String = "",
  val proficiency: Int = 0,
  val errorMessage: String? = null,
)

data class TopikQuestionAnalysisResult(
  val success: Boolean,
  val translation: String = "",
  val keyPoint: String = "",
  val analysis: String = "",
  val wrongOptions: Map<String, String> = emptyMap(),
  val errorMessage: String? = null,
)

data class TopikWrongQuestionSaveResult(
  val success: Boolean,
  val notebookSaved: Boolean = false,
  val annotationSaved: Boolean = false,
  val errorMessage: String? = null,
)

interface LearningRepository {
  suspend fun loadLearningHub(): LearningHubUiState

  suspend fun loadVocab(): VocabUiState

  suspend fun loadGrammarHub(): GrammarHubUiState

  suspend fun loadGrammarModule(deckId: String): GrammarModuleUiState

  suspend fun loadReviewHub(): ReviewHubUiState

  suspend fun loadReviewQuizQuestions(limit: Int = 10): List<ReviewQuizQuestion>

  suspend fun loadWritingHub(): WritingHubUiState

  suspend fun loadTopikCenter(): TopikCenterUiState

  suspend fun updateVocabProgress(wordId: String, status: String, proficiency: Int): VocabReviewResult =
    VocabReviewResult(success = false, errorMessage = "此仓储不支持词汇进度更新")

  suspend fun analyzeGrammarSentence(
    sentence: String,
    context: String,
    language: String = "zh",
  ): GrammarSentenceAnalysisResult =
    GrammarSentenceAnalysisResult(success = false, errorMessage = "此仓储不支持 AI 语法分析")

  suspend fun updateGrammarStatus(
    grammarId: String,
    status: String? = null,
    proficiency: Int? = null,
    increment: Int? = null,
  ): GrammarProgressUpdateResult =
    GrammarProgressUpdateResult(success = false, errorMessage = "此仓储不支持语法进度更新")

  suspend fun analyzeTopikQuestion(
    question: TopikExamQuestionUiModel,
    language: String = "zh",
  ): TopikQuestionAnalysisResult =
    TopikQuestionAnalysisResult(success = false, errorMessage = "此仓储不支持 TOPIK 题目 AI 解析")

  suspend fun saveTopikWrongQuestionNote(
    examTitle: String,
    question: TopikExamQuestionUiModel,
    analysis: TopikQuestionAnalysisResult,
  ): TopikWrongQuestionSaveResult =
    TopikWrongQuestionSaveResult(success = false, errorMessage = "此仓储不支持 TOPIK 错题笔记保存")

  suspend fun startTopikExamSession(examId: String): Result<TopikExamSessionUiModel> =
    Result.failure(UnsupportedOperationException("Topik exam session is not supported by this repository"))

  suspend fun loadTopikExamQuestions(examId: String): Result<List<TopikExamQuestionUiModel>> =
    Result.failure(UnsupportedOperationException("Topik exam questions are not supported by this repository"))

  suspend fun saveTopikExamAnswers(sessionId: String, answers: Map<String, Int>): Result<Unit> =
    Result.failure(UnsupportedOperationException("Saving Topik exam answers is not supported by this repository"))

  suspend fun submitTopikExam(sessionId: String, answers: Map<String, Int>): Result<TopikExamSubmitResultUiModel> =
    Result.failure(UnsupportedOperationException("Submitting Topik exam answers is not supported by this repository"))

  suspend fun startTopikWritingSession(examDocumentId: String): Result<TopikWritingSessionUiModel> =
    Result.failure(UnsupportedOperationException("Topik writing session is not supported by this repository"))

  suspend fun saveTopikWritingDraft(sessionId: String, answers: Map<String, String>): Result<Unit> =
    Result.failure(UnsupportedOperationException("Saving Topik writing draft is not supported by this repository"))

  suspend fun submitTopikWritingSession(sessionId: String): Result<TopikWritingSubmitResultUiModel> =
    Result.failure(UnsupportedOperationException("Submitting Topik writing session is not supported by this repository"))

  suspend fun loadTopikWritingQuestions(examDocumentId: String): Result<List<TopikWritingQuestionUiModel>> =
    Result.failure(UnsupportedOperationException("Topik writing questions are not supported by this repository"))

  suspend fun loadTopikWritingEvaluationReport(sessionId: String): Result<TopikWritingEvaluationReportUiModel?> =
    Result.failure(UnsupportedOperationException("Topik writing evaluation report is not supported by this repository"))
}

class InMemoryLearningRepository : LearningRepository {
  private val grammarDecks =
    listOf(
      GrammarDeckUiModel("deck-1", "问候与介绍", "기초 회화", "初级", 18, 100, 6),
      GrammarDeckUiModel("deck-2", "条件与假设", "~(으)면", "中级", 24, 48, 8),
      GrammarDeckUiModel("deck-3", "过去时态", "~았/었", "中级", 16, 0, 5),
      GrammarDeckUiModel("deck-4", "间接引语", "~다고 하다", "中高级", 30, 0, 9, isLocked = true),
    )

  override suspend fun loadLearningHub(): LearningHubUiState {
    delay(180)
    return LearningHubUiState(
      isLoading = false,
      tabs =
        listOf(
          LearningTab("我的课程", active = true),
          LearningTab("语法", active = false),
          LearningTab("词汇", active = false),
          LearningTab("写作", active = false),
          LearningTab("TOPIK", active = false),
        ),
      currentCourse =
        LearningCurrentCourse(
          progress = 48,
          title = "TOPIK II 综合课程",
          subtitle = "中级 · Unit 3 / 10",
          completedHours = 144,
          totalHours = 300,
          etaDays = 28,
          route = "main/grammar/deck-2",
        ),
      journeyUnits =
        listOf(
          LearningJourneyUnit(1, "问候与介绍", "기초 회话", 1f, "挨", "main/grammar/deck-1"),
          LearningJourneyUnit(2, "数字与时间", "일상 표현", 1f, "時", "main/grammar/deck-1"),
          LearningJourneyUnit(3, "条件与假设", "~(으)면", 0.48f, "若", "main/grammar/deck-2"),
          LearningJourneyUnit(4, "过去时态", "~았/었", 0f, "過", "main/grammar/deck-3"),
          LearningJourneyUnit(5, "间接引语", "~다고 하다", 0f, "傳", "main/grammar/deck-4"),
        ),
      shortcuts =
        listOf(
          LearningToolShortcut("詞", "单词闪卡", "24 张待办", "pink", "main/vocab"),
          LearningToolShortcut("聽", "听写", "新一集", "mint", "main/review"),
          LearningToolShortcut("寫", "打字练习", "15 WPM", "butter", "main/writing"),
          LearningToolShortcut("說", "考试训练", "AI 评估", "lilac", "main/topik"),
        ),
    )
  }

  override suspend fun loadVocab(): VocabUiState {
    delay(180)
    return buildVocabState(dueCount = 24)
  }

  override suspend fun loadGrammarHub(): GrammarHubUiState {
    delay(180)
    return GrammarHubUiState(isLoading = false, decks = grammarDecks)
  }

  override suspend fun loadGrammarModule(deckId: String): GrammarModuleUiState {
    delay(180)
    val deck = grammarDecks.find { it.id == deckId } ?: grammarDecks.first()
    val points =
      listOf(
        GrammarPointUiModel(
          id = "${deck.id}-1",
          title = "${deck.title} · 基础用法",
          summary = "掌握核心语法结构与最常见的句型变化。",
          status = "MASTERED",
          proficiency = 100,
        ),
        GrammarPointUiModel(
          id = "${deck.id}-2",
          title = "${deck.title} · 场景应用",
          summary = "在日常会话和考试语境中使用该语法表达。",
          status = "LEARNING",
          proficiency = deck.progress.coerceAtLeast(35),
        ),
        GrammarPointUiModel(
          id = "${deck.id}-3",
          title = "${deck.title} · 易错辨析",
          summary = "对比相近语法点，避免在写作和阅读中混淆。",
          status = if (deck.progress == 0) "NEW" else "LEARNING",
          proficiency = (deck.progress / 2).coerceAtLeast(10),
        ),
      )
    val masteredCount = points.count { it.status == "MASTERED" }
    val learningCount = points.count { it.status == "LEARNING" }
    return GrammarModuleUiState(
      isLoading = false,
      deckTitle = deck.title,
      deckLevel = deck.level,
      totalCount = points.size,
      masteredCount = masteredCount,
      learningCount = learningCount,
      points = points,
    )
  }

  override suspend fun loadReviewHub(): ReviewHubUiState {
    delay(180)
    return ReviewHubUiState(
      isLoading = false,
      pendingCount = 24,
      masteredToday = 18,
      accuracy = 87,
      sessions =
        listOf(
          ReviewSessionUiModel("词汇复习", "粉色卡组优先处理到期词卡。", "24个项目 · 约 8分钟", "main/review/quiz"),
          ReviewSessionUiModel("语法复习", "继续中级语法巩固任务。", "8个项目 · 约 6分钟", "main/grammar/deck-2"),
          ReviewSessionUiModel("TOPIK 错题重做", "回看上次考试中答错的题目。", "6个项目 · 约 10分钟", "main/topik/set-1?review=true&wrongOnly=true"),
          ReviewSessionUiModel("听写 재시도", "上一轮听写题再来一遍。", "3个项目 · 约 5分钟", "main/podcasts"),
        ),
    )
  }

  override suspend fun loadReviewQuizQuestions(limit: Int): List<ReviewQuizQuestion> {
    delay(200)
    return listOf(
      ReviewQuizQuestion("q1", "골목길", "小巷", "[골목낄]", "名词", listOf("小巷", "大海", "天空", "森林"), 0),
      ReviewQuizQuestion("q2", "벚꽃", "樱花", "[벋꼳]", "名词", listOf("梅花", "樱花", "桃花", "菊花"), 1),
      ReviewQuizQuestion("q3", "공부하다", "学习", "[공부하다]", "动词", listOf("玩耍", "睡觉", "学习", "跑步"), 2),
      ReviewQuizQuestion("q4", "맛있다", "好吃", "[맛있다]", "形容词", listOf("难看", "好听", "好闻", "好吃"), 3),
      ReviewQuizQuestion("q5", "사랑하다", "爱", "[사랑하다]", "动词", listOf("爱", "恨", "讨厌", "喜欢"), 0)
    ).take(limit)
  }

  override suspend fun loadWritingHub(): WritingHubUiState {
    delay(180)
    return buildWritingHubState()
  }

  override suspend fun loadTopikCenter(): TopikCenterUiState {
    delay(180)
    return buildTopikCenterState(readingBestScore = 86, listeningBestScore = 78, writingBestScore = 0)
  }

  override suspend fun startTopikExamSession(examId: String): Result<TopikExamSessionUiModel> {
    if (examId.isBlank()) {
      return Result.failure(IllegalArgumentException("试卷 ID 无效"))
    }
    val now = System.currentTimeMillis()
    return Result.success(
      TopikExamSessionUiModel(
        sessionId = "local-$examId-$now",
        endTimeMillis = now + 50 * 60 * 1000,
        answers = emptyMap(),
        answerCount = 0,
        isResuming = false,
      ),
    )
  }

  override suspend fun loadTopikExamQuestions(examId: String): Result<List<TopikExamQuestionUiModel>> {
    if (examId.isBlank()) {
      return Result.failure(IllegalArgumentException("试卷 ID 无效"))
    }
    val questions =
      listOf(
        TopikExamQuestionUiModel(
          number = 1,
          question = "请选择最适合填入空格的表达。",
          passage = "오늘은 날씨가 좋아서 산책을 ___ 합니다.",
          options = listOf("하고", "하며", "하니까", "하게"),
          score = 2,
        ),
        TopikExamQuestionUiModel(
          number = 2,
          question = "根据短文内容选择正确答案。",
          passage = "지하철이 많이 붐벼서 다음 열차를 탔습니다.",
          options = listOf("马上上车了", "下一班更空", "改乘公交", "错过了末班车"),
          score = 2,
        ),
      )
    return Result.success(questions)
  }

  override suspend fun saveTopikExamAnswers(sessionId: String, answers: Map<String, Int>): Result<Unit> {
    if (sessionId.isBlank()) {
      return Result.failure(IllegalArgumentException("会话 ID 无效"))
    }
    if (answers.isEmpty()) {
      return Result.failure(IllegalArgumentException("请至少作答一题"))
    }
    return Result.success(Unit)
  }

  override suspend fun submitTopikExam(sessionId: String, answers: Map<String, Int>): Result<TopikExamSubmitResultUiModel> {
    if (sessionId.isBlank()) {
      return Result.failure(IllegalArgumentException("会话 ID 无效"))
    }
    if (answers.isEmpty()) {
      return Result.failure(IllegalArgumentException("请至少作答一题"))
    }
    val answeredCount = answers.size
    val score = (answeredCount * 2).coerceAtMost(100)
    return Result.success(
      TopikExamSubmitResultUiModel(
        score = score,
        totalQuestions = answeredCount,
        totalScore = answeredCount * 2,
      ),
    )
  }

  override suspend fun startTopikWritingSession(examDocumentId: String): Result<TopikWritingSessionUiModel> {
    if (examDocumentId.isBlank()) {
      return Result.failure(IllegalArgumentException("写作试卷 ID 无效"))
    }
    val now = System.currentTimeMillis()
    return Result.success(
      TopikWritingSessionUiModel(
        sessionId = "writing-local-$examDocumentId-$now",
        endTimeMillis = now + 50 * 60 * 1000,
        answers = emptyMap(),
        answerCount = 0,
        isResuming = false,
      ),
    )
  }

  override suspend fun saveTopikWritingDraft(sessionId: String, answers: Map<String, String>): Result<Unit> {
    if (sessionId.isBlank()) {
      return Result.failure(IllegalArgumentException("会话 ID 无效"))
    }
    val hasNonEmptyAnswer = answers.values.any { it.isNotBlank() }
    if (!hasNonEmptyAnswer) {
      return Result.failure(IllegalArgumentException("草稿内容为空"))
    }
    return Result.success(Unit)
  }

  override suspend fun submitTopikWritingSession(sessionId: String): Result<TopikWritingSubmitResultUiModel> {
    if (sessionId.isBlank()) {
      return Result.failure(IllegalArgumentException("会话 ID 无效"))
    }
    return Result.success(TopikWritingSubmitResultUiModel(alreadySubmitted = false))
  }

  override suspend fun loadTopikWritingQuestions(examDocumentId: String): Result<List<TopikWritingQuestionUiModel>> {
    if (examDocumentId.isBlank()) {
      return Result.failure(IllegalArgumentException("写作试卷 ID 无效"))
    }
    return Result.success(
      listOf(
        TopikWritingQuestionUiModel(
          number = 1,
          instruction = "请根据题目要求写一段完整回答。",
          score = 50,
        ),
      ),
    )
  }
}

private const val LEARNING_DATASTORE_NAME = "hangyeol_compose_learning"
private val Context.learningDataStore by preferencesDataStore(name = LEARNING_DATASTORE_NAME)

private object LearningPreferenceKeys {
  val deck1Progress = intPreferencesKey("learning_deck_1_progress")
  val deck2Progress = intPreferencesKey("learning_deck_2_progress")
  val deck3Progress = intPreferencesKey("learning_deck_3_progress")
  val deck4Progress = intPreferencesKey("learning_deck_4_progress")
  val reviewPendingCount = intPreferencesKey("learning_review_pending_count")
  val reviewMasteredToday = intPreferencesKey("learning_review_mastered_today")
  val reviewAccuracy = intPreferencesKey("learning_review_accuracy")
  val topikReadingBestScore = intPreferencesKey("learning_topik_reading_best_score")
  val topikListeningBestScore = intPreferencesKey("learning_topik_listening_best_score")
  val topikWritingBestScore = intPreferencesKey("learning_topik_writing_best_score")
}

class DataStoreLearningRepository(
  private val context: Context,
) : LearningRepository {
  override suspend fun loadLearningHub(): LearningHubUiState {
    delay(120)
    ensureSeeded()
    val preferences = context.learningDataStore.data.first()
    val decks = learningDecksFromPreferences(preferences)
    return buildLearningHubState(
      decks = decks,
      reviewPendingCount = preferences[LearningPreferenceKeys.reviewPendingCount] ?: 24,
    )
  }

  override suspend fun loadVocab(): VocabUiState {
    delay(120)
    ensureSeeded()
    val preferences = context.learningDataStore.data.first()
    return buildVocabState(dueCount = preferences[LearningPreferenceKeys.reviewPendingCount] ?: 24)
  }

  override suspend fun loadGrammarHub(): GrammarHubUiState {
    delay(120)
    ensureSeeded()
    val preferences = context.learningDataStore.data.first()
    return GrammarHubUiState(
      isLoading = false,
      decks = learningDecksFromPreferences(preferences),
    )
  }

  override suspend fun loadGrammarModule(deckId: String): GrammarModuleUiState {
    delay(120)
    ensureSeeded()
    val preferences = context.learningDataStore.data.first()
    val deck = learningDecksFromPreferences(preferences).find { it.id == deckId } ?: learningDecksFromPreferences(preferences).first()
    return buildGrammarModuleState(deck)
  }

  override suspend fun loadReviewHub(): ReviewHubUiState {
    delay(120)
    ensureSeeded()
    val preferences = context.learningDataStore.data.first()
    return ReviewHubUiState(
      isLoading = false,
      pendingCount = preferences[LearningPreferenceKeys.reviewPendingCount] ?: 24,
      masteredToday = preferences[LearningPreferenceKeys.reviewMasteredToday] ?: 18,
      accuracy = preferences[LearningPreferenceKeys.reviewAccuracy] ?: 87,
      sessions =
        listOf(
          ReviewSessionUiModel("词汇复习", "粉色卡组优先处理到期词卡。", "${preferences[LearningPreferenceKeys.reviewPendingCount] ?: 24}个项目 · 约 8分钟", "main/review/quiz"),
          ReviewSessionUiModel("语法复习", "继续中级语法巩固任务。", "8个项目 · 约 6分钟", "main/grammar/deck-2"),
          ReviewSessionUiModel("TOPIK 错题重做", "回看上次考试中答错的题目。", "6个项目 · 约 10分钟", "main/topik/set-1?review=true&wrongOnly=true"),
          ReviewSessionUiModel("听写 재시도", "上一轮听写题再来一遍。", "3个项目 · 约 5分钟", "main/podcasts"),
        ),
    )
  }

  override suspend fun loadReviewQuizQuestions(limit: Int): List<ReviewQuizQuestion> {
    delay(150)
    return listOf(
      ReviewQuizQuestion("q1", "골목길", "小巷", "[골목낄]", "名词", listOf("小巷", "大海", "天空", "森林"), 0),
      ReviewQuizQuestion("q2", "벚꽃", "樱花", "[벋꼳]", "名词", listOf("梅花", "樱花", "桃花", "菊花"), 1),
      ReviewQuizQuestion("q3", "공부하다", "学习", "[공부하다]", "动词", listOf("玩耍", "睡觉", "学习", "跑步"), 2),
      ReviewQuizQuestion("q4", "맛있다", "好吃", "[맛있다]", "形容词", listOf("难看", "好听", "好闻", "好吃"), 3),
      ReviewQuizQuestion("q5", "사랑하다", "爱", "[사랑하다]", "动词", listOf("爱", "恨", "讨厌", "喜欢"), 0)
    ).take(limit)
  }

  override suspend fun loadWritingHub(): WritingHubUiState {
    delay(120)
    ensureSeeded()
    val preferences = context.learningDataStore.data.first()
    return buildWritingHubState(writingBestScore = preferences[LearningPreferenceKeys.topikWritingBestScore] ?: 84)
  }

  override suspend fun loadTopikCenter(): TopikCenterUiState {
    delay(120)
    ensureSeeded()
    val preferences = context.learningDataStore.data.first()
    return buildTopikCenterState(
      readingBestScore = preferences[LearningPreferenceKeys.topikReadingBestScore] ?: 86,
      listeningBestScore = preferences[LearningPreferenceKeys.topikListeningBestScore] ?: 78,
      writingBestScore = preferences[LearningPreferenceKeys.topikWritingBestScore] ?: 0,
    )
  }

  override suspend fun startTopikExamSession(examId: String): Result<TopikExamSessionUiModel> {
    if (examId.isBlank()) {
      return Result.failure(IllegalArgumentException("试卷 ID 无效"))
    }
    val now = System.currentTimeMillis()
    return Result.success(
      TopikExamSessionUiModel(
        sessionId = "cache-$examId-$now",
        endTimeMillis = now + 50 * 60 * 1000,
        answers = emptyMap(),
        answerCount = 0,
        isResuming = false,
      ),
    )
  }

  override suspend fun loadTopikExamQuestions(examId: String): Result<List<TopikExamQuestionUiModel>> {
    if (examId.isBlank()) {
      return Result.failure(IllegalArgumentException("试卷 ID 无效"))
    }
    return Result.success(
      listOf(
        TopikExamQuestionUiModel(
          number = 1,
          question = "请选择最适合填入空格的表达。",
          passage = "주말에는 도서관에서 한국어를 ___",
          options = listOf("공부해요", "공부했어요", "공부하면", "공부하려고"),
          score = 2,
        ),
      ),
    )
  }

  override suspend fun saveTopikExamAnswers(sessionId: String, answers: Map<String, Int>): Result<Unit> {
    if (sessionId.isBlank()) {
      return Result.failure(IllegalArgumentException("会话 ID 无效"))
    }
    if (answers.isEmpty()) {
      return Result.failure(IllegalArgumentException("请至少作答一题"))
    }
    return Result.success(Unit)
  }

  override suspend fun submitTopikExam(sessionId: String, answers: Map<String, Int>): Result<TopikExamSubmitResultUiModel> {
    if (sessionId.isBlank()) {
      return Result.failure(IllegalArgumentException("会话 ID 无效"))
    }
    if (answers.isEmpty()) {
      return Result.failure(IllegalArgumentException("请至少作答一题"))
    }
    val score = (answers.size * 2).coerceAtMost(100)
    return Result.success(
      TopikExamSubmitResultUiModel(
        score = score,
        totalQuestions = answers.size,
        totalScore = answers.size * 2,
      ),
    )
  }

  override suspend fun startTopikWritingSession(examDocumentId: String): Result<TopikWritingSessionUiModel> {
    if (examDocumentId.isBlank()) {
      return Result.failure(IllegalArgumentException("写作试卷 ID 无效"))
    }
    val now = System.currentTimeMillis()
    return Result.success(
      TopikWritingSessionUiModel(
        sessionId = "writing-cache-$examDocumentId-$now",
        endTimeMillis = now + 50 * 60 * 1000,
        answers = emptyMap(),
        answerCount = 0,
        isResuming = false,
      ),
    )
  }

  override suspend fun saveTopikWritingDraft(sessionId: String, answers: Map<String, String>): Result<Unit> {
    if (sessionId.isBlank()) {
      return Result.failure(IllegalArgumentException("会话 ID 无效"))
    }
    val hasNonEmptyAnswer = answers.values.any { it.isNotBlank() }
    if (!hasNonEmptyAnswer) {
      return Result.failure(IllegalArgumentException("草稿内容为空"))
    }
    return Result.success(Unit)
  }

  override suspend fun submitTopikWritingSession(sessionId: String): Result<TopikWritingSubmitResultUiModel> {
    if (sessionId.isBlank()) {
      return Result.failure(IllegalArgumentException("会话 ID 无效"))
    }
    return Result.success(TopikWritingSubmitResultUiModel(alreadySubmitted = false))
  }

  override suspend fun loadTopikWritingQuestions(examDocumentId: String): Result<List<TopikWritingQuestionUiModel>> {
    if (examDocumentId.isBlank()) {
      return Result.failure(IllegalArgumentException("写作试卷 ID 无效"))
    }
    return Result.success(
      listOf(
        TopikWritingQuestionUiModel(
          number = 1,
          instruction = "请根据题目要求写一段完整回答。",
          score = 50,
        ),
      ),
    )
  }

  private suspend fun ensureSeeded() {
    context.learningDataStore.edit { preferences ->
      if (preferences[LearningPreferenceKeys.deck1Progress] == null) {
        preferences[LearningPreferenceKeys.deck1Progress] = 100
      }
      if (preferences[LearningPreferenceKeys.deck2Progress] == null) {
        preferences[LearningPreferenceKeys.deck2Progress] = 48
      }
      if (preferences[LearningPreferenceKeys.deck3Progress] == null) {
        preferences[LearningPreferenceKeys.deck3Progress] = 0
      }
      if (preferences[LearningPreferenceKeys.deck4Progress] == null) {
        preferences[LearningPreferenceKeys.deck4Progress] = 0
      }
      if (preferences[LearningPreferenceKeys.reviewPendingCount] == null) {
        preferences[LearningPreferenceKeys.reviewPendingCount] = 24
      }
      if (preferences[LearningPreferenceKeys.reviewMasteredToday] == null) {
        preferences[LearningPreferenceKeys.reviewMasteredToday] = 18
      }
      if (preferences[LearningPreferenceKeys.reviewAccuracy] == null) {
        preferences[LearningPreferenceKeys.reviewAccuracy] = 87
      }
      if (preferences[LearningPreferenceKeys.topikReadingBestScore] == null) {
        preferences[LearningPreferenceKeys.topikReadingBestScore] = 86
      }
      if (preferences[LearningPreferenceKeys.topikListeningBestScore] == null) {
        preferences[LearningPreferenceKeys.topikListeningBestScore] = 78
      }
      if (preferences[LearningPreferenceKeys.topikWritingBestScore] == null) {
        preferences[LearningPreferenceKeys.topikWritingBestScore] = 0
      }
    }
  }
}

private fun learningDecksFromPreferences(preferences: Preferences): List<GrammarDeckUiModel> {
  val deck2Progress =
    when (preferences[LearningPreferenceKeys.deck2Progress] ?: 48) {
      62 -> 48
      else -> preferences[LearningPreferenceKeys.deck2Progress] ?: 48
    }
  val deck3Progress =
    when (preferences[LearningPreferenceKeys.deck3Progress] ?: 0) {
      24 -> 0
      else -> preferences[LearningPreferenceKeys.deck3Progress] ?: 0
    }
  return listOf(
    GrammarDeckUiModel("deck-1", "问候与介绍", "기초 회화", "初级", 18, preferences[LearningPreferenceKeys.deck1Progress] ?: 100, 6),
    GrammarDeckUiModel("deck-2", "条件与假设", "~(으)면", "中级", 24, deck2Progress, 8),
    GrammarDeckUiModel("deck-3", "过去时态", "~았/었", "中级", 16, deck3Progress, 5),
    GrammarDeckUiModel("deck-4", "间接引语", "~다고 하다", "中高级", 30, preferences[LearningPreferenceKeys.deck4Progress] ?: 0, 9, isLocked = true),
  )
}

private fun buildLearningHubState(
  decks: List<GrammarDeckUiModel>,
  reviewPendingCount: Int,
): LearningHubUiState {
  val currentDeck = decks.find { it.id == "deck-2" } ?: decks.firstOrNull()
  return LearningHubUiState(
    isLoading = false,
    tabs =
      listOf(
        LearningTab("我的课程", active = true),
        LearningTab("语法", active = false),
        LearningTab("词汇", active = false),
        LearningTab("写作", active = false),
        LearningTab("TOPIK", active = false),
      ),
    currentCourse =
      currentDeck?.let { deck ->
        LearningCurrentCourse(
          progress = 48,
          title = "TOPIK II 综合课程",
          subtitle = "${deck.level} · Unit 3 / 10",
          completedHours = 144,
          totalHours = 300,
          etaDays = 28,
          route = "main/grammar/${deck.id}",
        )
      },
    journeyUnits =
      listOf(
        LearningJourneyUnit(1, "问候与介绍", "기초 회话", 1f, "挨", "main/grammar/deck-1"),
        LearningJourneyUnit(2, "数字与时间", "일상 표현", 1f, "時", "main/grammar/deck-1"),
        LearningJourneyUnit(3, "条件与假设", "~(으)면", 0.6f, "若", "main/grammar/deck-2"),
        LearningJourneyUnit(4, "过去时态", "~았/었", 0f, "過", "main/grammar/deck-3"),
        LearningJourneyUnit(5, "间接引语", "~다고 하다", (decks.find { it.id == "deck-4" }?.progress ?: 0) / 100f, "傳", "main/grammar/deck-4"),
      ),
    shortcuts =
      listOf(
        LearningToolShortcut("詞", "单词闪卡", "$reviewPendingCount 张待办", "pink", "main/vocab"),
        LearningToolShortcut("聽", "听写", "新一集", "mint", "main/review"),
        LearningToolShortcut("寫", "打字练习", "15 WPM", "butter", "main/writing"),
        LearningToolShortcut("說", "考试训练", "AI 评估", "lilac", "main/topik"),
      ),
  )
}

private fun buildWritingHubState(
  writingBestScore: Int = 84,
): WritingHubUiState =
  WritingHubUiState(
    isLoading = false,
    weeklyGoal = "本周目标 3 / 5 篇",
    completedCount = 12,
    averageScore = writingBestScore,
    streakDays = 6,
    focusTitle = "TOPIK 写作任务 01",
    focusSubtitle = "图表说明 + 短文组织",
    focusMeta = "50分钟 · 2题 · 继续上次草稿",
    drafts =
      listOf(
        WritingDraftUiModel("第 53 题 图表说明", "已写 168 字 · 上次保存 21:14", "68%", "main/topik/writing/set-1"),
        WritingDraftUiModel("第 54 题 议论文", "已写 302 字 · 上次保存 昨天", "42%", "main/topik/writing/set-3"),
      ),
    prompts =
      listOf(
        WritingPromptUiModel("圖", "图表改写", "按数据趋势完成说明", "20 分钟 · 53题", "butter", "main/topik/writing/set-1"),
        WritingPromptUiModel("論", "观点短文", "围绕题干写出立场与理由", "30 分钟 · 54题", "pink", "main/topik/writing/set-3"),
        WritingPromptUiModel("句", "句式重写", "把口语表达改成书面语", "8 分钟 · 6句", "mint", "main/grammar/deck-2"),
        WritingPromptUiModel("字", "打字练习", "韩文输入与速度训练", "10 分钟 · 15 WPM", "lilac", "main/writing"),
      ),
  )

private fun buildVocabState(
  dueCount: Int,
): VocabUiState =
  VocabUiState(
    isLoading = false,
    dueCount = dueCount,
    totalWords = 1247,
    masteredCount = 892,
    learningCount = 231,
    newWordCount = 124,
    selectedTab = "due",
    entries =
      listOf(
        VocabEntryUiModel("word-1", "골목길", "小巷", "골목낄", "名词", 85, "mint"),
        VocabEntryUiModel("word-2", "상춘객", "賞春客", "상춘객", "名词", 55, "butter"),
        VocabEntryUiModel("word-3", "만개하다", "滿開", "만개하다", "动词", 70, "mint"),
        VocabEntryUiModel("word-4", "분홍빛", "粉紅", "분홍빋", "名词", 40, "pink"),
        VocabEntryUiModel("word-5", "구불구불", "彎曲", "구불구불", "副词", 30, "pink"),
      ),
  )

private fun buildGrammarModuleState(deck: GrammarDeckUiModel): GrammarModuleUiState {
  val points =
    if (deck.id == "deck-2") {
      listOf(
        GrammarPointUiModel(
          id = "${deck.id}-1",
          title = "비가 오면 우산을 써야 해요.",
          summary = "如果下雨就得撑伞。",
          translation = "条件成立时，后句动作自然发生。",
          status = "MASTERED",
          proficiency = 100,
        ),
        GrammarPointUiModel(
          id = "${deck.id}-2",
          title = "시간이 있으면 같이 가요.",
          summary = "如果有时间就一起去吧。",
          translation = "可用于邀请、提议和约定场景。",
          status = "LEARNING",
          proficiency = 68,
        ),
        GrammarPointUiModel(
          id = "${deck.id}-3",
          title = "한국에 가면 뭐 하고 싶어요?",
          summary = "如果去韩国想做什么？",
          translation = "在问句里表达假设后的意图。",
          status = "LEARNING",
          proficiency = 42,
        ),
      )
    } else {
      listOf(
        GrammarPointUiModel(
          id = "${deck.id}-1",
          title = "${deck.title} · 基础用法",
          summary = "掌握核心语法结构与最常见的句型变化。",
          status = "MASTERED",
          proficiency = 100,
        ),
        GrammarPointUiModel(
          id = "${deck.id}-2",
          title = "${deck.title} · 场景应用",
          summary = "在日常会话和考试语境中使用该语法表达。",
          status = "LEARNING",
          proficiency = deck.progress.coerceAtLeast(35),
        ),
        GrammarPointUiModel(
          id = "${deck.id}-3",
          title = "${deck.title} · 易错辨析",
          summary = "对比相近语法点，避免在写作和阅读中混淆。",
          status = if (deck.progress == 0) "NEW" else "LEARNING",
          proficiency = (deck.progress / 2).coerceAtLeast(10),
        ),
      )
    }
  val masteredCount = points.count { it.status == "MASTERED" }
  val learningCount = points.count { it.status == "LEARNING" }
  return GrammarModuleUiState(
    isLoading = false,
    deckTitle = deck.title,
    deckLevel = deck.level,
    totalCount = points.size,
    masteredCount = masteredCount,
    learningCount = learningCount,
    points = points,
  )
}

private fun buildTopikCenterState(
  readingBestScore: Int,
  listeningBestScore: Int,
  writingBestScore: Int,
): TopikCenterUiState =
  TopikCenterUiState(
    isLoading = false,
    exams =
      listOf(
        TopikExamUiModel("set-1", "set-1", null, "TOPIK 阅读模拟 01", TopikType.READING, "TOPIK II", 50, 30, false, readingBestScore),
        TopikExamUiModel("set-2", "set-2", null, "TOPIK 听力模拟 01", TopikType.LISTENING, "TOPIK II", 40, 30, false, listeningBestScore),
        TopikExamUiModel("set-3", "set-3", null, "TOPIK 写作任务 01", TopikType.WRITING, "TOPIK II", 50, 0, false, writingBestScore),
        TopikExamUiModel("set-4", "set-4", null, "TOPIK 阅读模拟 02", TopikType.READING, "TOPIK III", 55, 30, true, 0),
      ),
    history =
      listOf(
        TopikHistoryUiModel("TOPIK 阅读模拟 01", "今天 14:20", readingBestScore, "set-1", TopikType.READING),
        TopikHistoryUiModel("TOPIK 听力模拟 01", "昨天 20:10", listeningBestScore, "set-2", TopikType.LISTENING),
        TopikHistoryUiModel("TOPIK 写作任务 01", "周六 10:00", writingBestScore, "set-3", TopikType.WRITING),
      ),
  )
