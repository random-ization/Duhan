package com.hangyeol.app.compose.data.convex

import com.hangyeol.app.compose.data.GrammarDeckUiModel
import com.hangyeol.app.compose.data.GrammarHubUiState
import com.hangyeol.app.compose.data.GrammarExampleUiModel
import com.hangyeol.app.compose.data.GrammarModuleUiState
import com.hangyeol.app.compose.data.GrammarPointUiModel
import com.hangyeol.app.compose.data.GrammarQuizItemUiModel
import com.hangyeol.app.compose.data.GrammarSentenceAnalysisResult
import com.hangyeol.app.compose.data.GrammarProgressUpdateResult
import com.hangyeol.app.compose.data.LearningCurrentCourse
import com.hangyeol.app.compose.data.LearningHubUiState
import com.hangyeol.app.compose.data.LearningJourneyUnit
import com.hangyeol.app.compose.data.LearningRepository
import com.hangyeol.app.compose.data.LearningTab
import com.hangyeol.app.compose.data.LearningToolShortcut
import com.hangyeol.app.compose.data.ReviewHubUiState
import com.hangyeol.app.compose.data.ReviewSessionUiModel
import com.hangyeol.app.compose.data.TopikCenterUiState
import com.hangyeol.app.compose.data.TopikExamQuestionUiModel
import com.hangyeol.app.compose.data.TopikExamSessionUiModel
import com.hangyeol.app.compose.data.TopikExamSubmitResultUiModel
import com.hangyeol.app.compose.data.TopikExamUiModel
import com.hangyeol.app.compose.data.TopikHistoryUiModel
import com.hangyeol.app.compose.data.TopikQuestionAnalysisResult
import com.hangyeol.app.compose.data.TopikType
import com.hangyeol.app.compose.data.TopikWrongQuestionSaveResult
import com.hangyeol.app.compose.data.TopikWritingSessionUiModel
import com.hangyeol.app.compose.data.TopikWritingSubmitResultUiModel
import com.hangyeol.app.compose.data.TopikWritingEvaluationDimensionsUiModel
import com.hangyeol.app.compose.data.TopikWritingEvaluationReportUiModel
import com.hangyeol.app.compose.data.TopikWritingQuestionEvaluationUiModel
import com.hangyeol.app.compose.data.TopikWritingQuestionUiModel
import com.hangyeol.app.compose.data.VocabEntryUiModel
import com.hangyeol.app.compose.data.VocabReviewResult
import com.hangyeol.app.compose.data.VocabUiState
import com.hangyeol.app.compose.data.WritingDraftUiModel
import com.hangyeol.app.compose.data.WritingHubUiState
import com.hangyeol.app.compose.data.WritingPromptUiModel
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.booleanOrNull
import kotlinx.serialization.json.intOrNull
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.longOrNull
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class ConvexLearningRepository(
    private val client: ConvexClient,
) : LearningRepository {

    override suspend fun loadLearningHub(): LearningHubUiState = coroutineScope {
        val institutesDeferred = async { client.query("institutes:getAll") }
        val learningSurfaceDeferred = async { client.query("android:getMobileLearningSurface") }
        val statsDeferred = async { client.query("userStats:getStats") }

        val institutes = institutesDeferred.await()
        val learningSurface = parseMobileLearningSurface(learningSurfaceDeferred.await())
        val stats = statsDeferred.await()

        val courses = parseInstitutes(institutes)

        val currentCourse = learningSurface?.currentCourse ?: parseCurrentCourse(stats, courses)
        val journeyUnits = buildJourneyUnits(stats, courses)
        val shortcuts = learningSurface?.shortcuts.orEmpty()

        LearningHubUiState(
            isLoading = false,
            tabs = listOf(
                LearningTab("我的课程", active = true),
                LearningTab("语法", active = false),
                LearningTab("词汇", active = false),
                LearningTab("写作", active = false),
                LearningTab("TOPIK", active = false),
            ),
            currentCourse = currentCourse,
            journeyUnits = journeyUnits,
            shortcuts = shortcuts,
        )
    }

    override suspend fun loadVocab(): VocabUiState = coroutineScope {
        val summaryDeferred = async { client.query("vocab:getReviewSummary") }
        val dueWordsDeferred = async { client.query("vocab:getDueForReview") }

        val summary = summaryDeferred.await()
        val dueWords = dueWordsDeferred.await()

        val total = extractInt(summary, "total") ?: 0
        val dueNow = extractInt(summary, "dueNow") ?: 0
        val mastered = extractInt(summary, "mastered") ?: 0
        val learning = extractInt(summary, "learning") ?: 0
        val unlearned = extractInt(summary, "unlearned") ?: 0

        val entries = parseDueWords(dueWords)

        VocabUiState(
            isLoading = false,
            dueCount = dueNow,
            totalWords = total,
            masteredCount = mastered,
            learningCount = learning,
            newWordCount = unlearned,
            selectedTab = "due",
            entries = entries,
        )
    }

    override suspend fun updateVocabProgress(wordId: String, status: String, proficiency: Int): VocabReviewResult {
        val normalizedWordId = wordId.trim()
        if (normalizedWordId.isBlank()) {
            return VocabReviewResult(success = false, errorMessage = "单词 ID 无效")
        }
        val result = client.mutation(
            "vocab/vocabMutations:updateProgress",
            buildArgs("wordId" to normalizedWordId, "status" to status, "proficiency" to proficiency),
        )
        return when (result) {
            is ConvexResult.Success -> VocabReviewResult(success = true)
            is ConvexResult.Error -> VocabReviewResult(success = false, errorMessage = result.message)
        }
    }

    override suspend fun analyzeGrammarSentence(
        sentence: String,
        context: String,
        language: String,
    ): GrammarSentenceAnalysisResult {
        val normalizedSentence = sentence.trim()
        if (normalizedSentence.isBlank()) {
            return GrammarSentenceAnalysisResult(success = false, errorMessage = "请输入句子后再分析")
        }
        val result = client.action(
            "ai:analyzeSentence",
            buildArgs("sentence" to normalizedSentence, "context" to context, "language" to language),
        )
        return when (result) {
            is ConvexResult.Error -> GrammarSentenceAnalysisResult(
                success = false,
                errorMessage = result.message,
            )
            is ConvexResult.Success -> {
                val payload = result.value as? JsonObject
                val data = payload?.get("data") as? JsonObject
                val feedback = data?.getString("nuance").orEmpty()
                val corrected = data?.getString("corrected").orEmpty()
                val isCorrect = data?.getBoolean("isCorrect") == true
                GrammarSentenceAnalysisResult(
                    success = true,
                    isCorrect = isCorrect,
                    feedback = feedback,
                    correctedSentence = corrected,
                )
            }
        }
    }

    override suspend fun updateGrammarStatus(
        grammarId: String,
        status: String?,
        proficiency: Int?,
        increment: Int?,
    ): GrammarProgressUpdateResult {
        val normalizedId = grammarId.trim()
        if (normalizedId.isBlank()) {
            return GrammarProgressUpdateResult(success = false, errorMessage = "语法 ID 无效")
        }
        val argsMap = mutableMapOf<String, JsonElement>(
            "grammarId" to JsonPrimitive(normalizedId),
        )
        status?.takeIf { it.isNotBlank() }?.let { argsMap["status"] = JsonPrimitive(it) }
        proficiency?.let { argsMap["proficiency"] = JsonPrimitive(it.coerceIn(0, 100)) }
        increment?.let { argsMap["increment"] = JsonPrimitive(it.coerceAtLeast(0)) }
        val result = client.mutation("grammars:updateStatus", JsonObject(argsMap))
        return when (result) {
            is ConvexResult.Error -> GrammarProgressUpdateResult(
                success = false,
                errorMessage = result.message,
            )
            is ConvexResult.Success -> {
                val payload = result.value as? JsonObject
                GrammarProgressUpdateResult(
                    success = true,
                    status = payload?.getString("status").orEmpty(),
                    proficiency = payload?.getInt("proficiency") ?: 0,
                )
            }
        }
    }

    override suspend fun loadGrammarHub(): GrammarHubUiState = coroutineScope {
        val institutesDeferred = async { client.query("institutes:getAll") }
        val statsDeferred = async { client.query("userStats:getStats") }
        val learningSurfaceDeferred = async { client.query("android:getMobileLearningSurface") }

        val institutesResult = institutesDeferred.await()
        val statsResult = statsDeferred.await()
        val learningSurface = parseMobileLearningSurface(learningSurfaceDeferred.await())
        val courses = parseInstitutes(institutesResult)

        val decks = courses.mapIndexed { index, course ->
            val courseId = course.getString("id") ?: course.getString("_id") ?: ""
            val statsResult = client.query(
                "grammars:getStats",
                buildArgs("courseId" to courseId),
            )
            val total = extractInt(statsResult, "total") ?: 0
            val masteredGrammar = extractInt(statsResult, "mastered") ?: 0
            val progress = if (total > 0) (masteredGrammar * 100 / total) else 0

            GrammarDeckUiModel(
                id = courseId,
                title = course.getString("nameZh") ?: course.getString("name") ?: "课程 ${index + 1}",
                subtitle = course.getString("name") ?: "",
                level = course.getString("displayLevel") ?: "",
                itemCount = total,
                progress = progress,
                totalUnits = course.getInt("totalUnits") ?: extractTotalUnits(course),
                isLocked = false,
            )
        }

        GrammarHubUiState(
            isLoading = false,
            decks = decks,
            currentCourse = learningSurface?.currentCourse ?: parseCurrentCourse(statsResult, courses),
            journeyUnits = buildJourneyUnits(statsResult, courses),
            shortcuts = learningSurface?.shortcuts.orEmpty(),
        )
    }

    override suspend fun loadGrammarModule(deckId: String): GrammarModuleUiState {
        val detailResult = client.query(
            "android:getGrammarModuleDetail",
            buildArgs("courseId" to deckId, "language" to "zh"),
        )
        val detail = parseGrammarModuleDetail(detailResult)
        if (detail != null) {
            return detail
        }

        val grammarResult = client.query(
            "grammars:getByCourse",
            buildArgs("courseId" to deckId),
        )
        val statsResult = client.query(
            "grammars:getStats",
            buildArgs("courseId" to deckId),
        )
        val instituteResult = client.query("institutes:get", buildArgs("id" to deckId))

        val deckTitle = extractString(instituteResult, "nameZh")
            ?: extractString(instituteResult, "name") ?: deckId
        val deckLevel = extractString(instituteResult, "displayLevel") ?: ""

        val points = parseGrammarPoints(grammarResult)
        val total = extractInt(statsResult, "total") ?: points.size
        val masteredCount = points.count { it.status == "MASTERED" }
        val learningCount = points.count { it.status == "LEARNING" }

        return GrammarModuleUiState(
            isLoading = false,
            deckTitle = deckTitle,
            deckLevel = deckLevel,
            totalCount = total,
            masteredCount = masteredCount,
            learningCount = learningCount,
            points = points,
        )
    }

    override suspend fun loadReviewHub(): ReviewHubUiState = coroutineScope {
        val vocabDeferred = async { client.query("vocab:getReviewSummary") }
        val statsDeferred = async { client.query("userStats:getStats") }
        val topikHistoryDeferred = async { client.query("topik:getMyHistory", buildArgs("limit" to 20)) }

        val vocab = vocabDeferred.await()
        val stats = statsDeferred.await()
        val topikHistory = topikHistoryDeferred.await()

        val pendingCount = extractInt(vocab, "dueNow") ?: 0
        val masteredToday = extractInt(stats, "todayWordsStudied", "totalWordsLearned") ?: 0
        val accuracy = extractInt(stats, "accuracy", "dailyProgress") ?: 0
        val grammarPending = extractNestedInt(stats, "grammarStats", "total")
            ?.let { total ->
                val mastered = extractNestedInt(stats, "grammarStats", "mastered") ?: 0
                (total - mastered).coerceAtLeast(0)
            } ?: 0
        val topikPending = parseTopikHistory(topikHistory).size

        ReviewHubUiState(
            isLoading = false,
            pendingCount = pendingCount,
            masteredToday = masteredToday,
            accuracy = accuracy,
            sessions = listOf(
                ReviewSessionUiModel(
                    "词汇复习",
                    "优先处理到期词卡。",
                    "${pendingCount}个项目 · 约 ${(pendingCount / 3).coerceAtLeast(1)}分钟",
                    "main/vocab",
                ),
                ReviewSessionUiModel(
                    "语法复习",
                    "继续语法巩固任务。",
                    "${grammarPending}个项目 · 约 ${(grammarPending / 2).coerceAtLeast(1)}分钟",
                    "main/grammar",
                ),
                ReviewSessionUiModel(
                    "TOPIK 错题重做",
                    "回看上次考试中答错的题目。",
                    "${topikPending}条历史 · 约 ${(topikPending * 2).coerceAtLeast(5)}分钟",
                    "main/topik",
                ),
            ),
        )
    }

    override suspend fun loadWritingHub(): WritingHubUiState = coroutineScope {
        val sessionsDeferred = async { client.query("android:getTopikWritingSessions", buildArgs("limit" to 80)) }
        val examsDeferred = async {
            client.query("topik:getExams", buildArgs("type" to "WRITING"))
        }
        val statsDeferred = async { client.query("userStats:getStats") }
        val learningSurfaceDeferred = async { client.query("android:getMobileLearningSurface") }

        val sessions = sessionsDeferred.await()
        val exams = examsDeferred.await()
        val stats = statsDeferred.await()
        val learningSurface = parseMobileLearningSurface(learningSurfaceDeferred.await())

        val drafts = parseWritingDrafts(sessions)
        val prompts = parseWritingPrompts(exams)
        val streakDays = extractInt(stats, "streak", "streakDays") ?: 0
        val completedCount = countCompletedWritingSessions(sessions)
        val averageScore = calculateWritingAverageScore(sessions)
        val weeklyGoalTarget = learningSurface?.writingWeeklyGoalTarget
        val completedThisWeek = learningSurface?.writingCompletedThisWeek

        WritingHubUiState(
            isLoading = false,
            weeklyGoal =
                if (weeklyGoalTarget != null && weeklyGoalTarget > 0 && completedThisWeek != null) {
                    "本周目标 ${completedThisWeek.coerceAtMost(weeklyGoalTarget)} / $weeklyGoalTarget 篇"
                } else {
                    "本周目标 -- / -- 篇"
                },
            completedCount = completedCount,
            averageScore = averageScore,
            streakDays = streakDays,
            focusTitle = prompts.firstOrNull()?.title ?: "TOPIK 写作任务",
            focusSubtitle = prompts.firstOrNull()?.subtitle ?: "开始写作练习",
            focusMeta = prompts.firstOrNull()?.meta ?: "",
            drafts = drafts,
            prompts = prompts,
        )
    }

    override suspend fun loadTopikCenter(): TopikCenterUiState = coroutineScope {
        val examsDeferred = async { client.query("topik:getExams") }
        val historyDeferred = async { client.query("topik:getMyHistory") }
        val writingHistoryDeferred = async { client.query("android:getTopikWritingSessions", buildArgs("limit" to 40)) }

        val examsResult = examsDeferred.await()
        val historyResult = historyDeferred.await()
        val writingHistoryResult = writingHistoryDeferred.await()

        val exams = parseTopikExams(examsResult)
        val history = (parseTopikHistory(historyResult) + parseTopikWritingHistory(writingHistoryResult)).take(20)

        TopikCenterUiState(
            isLoading = false,
            exams = exams,
            history = history,
        )
    }

    override suspend fun startTopikExamSession(examId: String): Result<TopikExamSessionUiModel> {
        if (examId.isBlank()) {
            return Result.failure(IllegalArgumentException("试卷 ID 无效"))
        }
        return when (val result = client.mutation("topik:startExam", buildArgs("examId" to examId))) {
            is ConvexResult.Success -> {
                val payload = result.value as? JsonObject
                    ?: return Result.failure(IllegalArgumentException("开始考试失败，请稍后重试"))
                val sessionId = payload.getString("sessionId")
                    ?: return Result.failure(IllegalArgumentException("开始考试失败，请稍后重试"))
                val endTime = payload.getLong("endTime")
                    ?: return Result.failure(IllegalArgumentException("开始考试失败，请稍后重试"))
                val answerCount = (payload["answers"] as? JsonObject)?.size ?: 0
                val isResuming = payload.getBoolean("resuming") ?: false
                Result.success(
                    TopikExamSessionUiModel(
                        sessionId = sessionId,
                        endTimeMillis = endTime,
                        answers = parseIntAnswerMap(payload["answers"] as? JsonObject),
                        answerCount = answerCount,
                        isResuming = isResuming,
                    ),
                )
            }
            is ConvexResult.Error -> {
                Result.failure(IllegalArgumentException(resolveStartExamError(result.message)))
            }
        }
    }

    override suspend fun loadTopikExamQuestions(examId: String): Result<List<TopikExamQuestionUiModel>> {
        if (examId.isBlank()) {
            return Result.failure(IllegalArgumentException("试卷 ID 无效"))
        }
        return when (val result = client.query("topik:getExamQuestions", buildArgs("examId" to examId))) {
            is ConvexResult.Success -> {
                val arr = result.value as? JsonArray ?: JsonArray(emptyList())
                val questions = arr.mapNotNull { item ->
                    val obj = item as? JsonObject ?: return@mapNotNull null
                    val number = obj.getInt("number") ?: return@mapNotNull null
                    val options = (obj["options"] as? JsonArray)?.mapNotNull { opt ->
                        (opt as? JsonPrimitive)?.content
                    } ?: emptyList()
                    TopikExamQuestionUiModel(
                        number = number,
                        question = obj.getString("question") ?: "",
                        passage = obj.getString("passage") ?: "",
                        options = options,
                        score = obj.getInt("score") ?: 0,
                        correctAnswer = obj.getInt("correctAnswer"),
                        instruction = obj.getString("instruction") ?: "",
                        contextBox = obj.getString("contextBox") ?: "",
                    )
                }
                Result.success(questions)
            }
            is ConvexResult.Error -> Result.failure(IllegalArgumentException(resolveTopikError(result.message)))
        }
    }

    override suspend fun analyzeTopikQuestion(
        question: TopikExamQuestionUiModel,
        language: String,
    ): TopikQuestionAnalysisResult {
        val correctAnswer = question.correctAnswer
        if (correctAnswer == null || correctAnswer < 1) {
            return TopikQuestionAnalysisResult(
                success = false,
                errorMessage = "当前题目缺少正确答案，无法进行 AI 解析",
            )
        }
        val normalizedOptions = question.options.filter { it.isNotBlank() }
        if (normalizedOptions.isEmpty()) {
            return TopikQuestionAnalysisResult(
                success = false,
                errorMessage = "当前题目缺少选项，无法进行 AI 解析",
            )
        }
        val result = client.action(
            "ai:analyzeQuestion",
            buildArgs(
                "question" to question.question,
                "options" to toStringArrayJson(normalizedOptions),
                "correctAnswer" to (correctAnswer - 1).coerceAtLeast(0),
                "type" to "TOPIK",
                "language" to language,
                "instruction" to question.instruction,
                "passage" to question.passage,
                "contextBox" to question.contextBox,
                "questionNumber" to question.number,
            ),
        )
        return when (result) {
            is ConvexResult.Error -> TopikQuestionAnalysisResult(
                success = false,
                errorMessage = result.message,
            )
            is ConvexResult.Success -> {
                val payload = result.value as? JsonObject
                val data = payload?.get("data") as? JsonObject
                val wrongOptionsObject = data?.get("wrongOptions") as? JsonObject
                val wrongOptions =
                    wrongOptionsObject
                        ?.entries
                        ?.mapNotNull { (key, value) ->
                            val text = (value as? JsonPrimitive)?.content?.trim().orEmpty()
                            if (key.isBlank() || text.isBlank()) {
                                null
                            } else {
                                key to text
                            }
                        }
                        ?.toMap()
                        ?: emptyMap()
                TopikQuestionAnalysisResult(
                    success = true,
                    translation = data?.getString("translation").orEmpty(),
                    keyPoint = data?.getString("keyPoint").orEmpty(),
                    analysis = data?.getString("analysis").orEmpty(),
                    wrongOptions = wrongOptions,
                )
            }
        }
    }

    override suspend fun saveTopikWrongQuestionNote(
        examTitle: String,
        question: TopikExamQuestionUiModel,
        analysis: TopikQuestionAnalysisResult,
    ): TopikWrongQuestionSaveResult {
        val normalizedQuestion = question.question.trim()
        if (normalizedQuestion.isBlank()) {
            return TopikWrongQuestionSaveResult(success = false, errorMessage = "题干为空，无法保存错题笔记")
        }
        val normalizedOptions = question.options.map { it.trim() }.filter { it.isNotBlank() }
        if (normalizedOptions.isEmpty()) {
            return TopikWrongQuestionSaveResult(success = false, errorMessage = "题目选项为空，无法保存错题笔记")
        }
        val correctAnswer = question.correctAnswer
        if (correctAnswer == null || correctAnswer < 1) {
            return TopikWrongQuestionSaveResult(success = false, errorMessage = "缺少正确答案，无法保存错题笔记")
        }

        val sanitizedExamTitle = examTitle.trim().ifBlank { "TOPIK 试卷" }
        val wrongOptionsForNotebook =
            analysis.wrongOptions
                .entries
                .sortedBy { it.key }
                .map { entry -> "选项 ${entry.key}: ${entry.value}" }
        val notebookPayload = JsonObject(
            mapOf(
                "questionText" to JsonPrimitive(normalizedQuestion),
                "options" to toStringArrayJson(normalizedOptions),
                "correctAnswer" to JsonPrimitive(correctAnswer),
                "aiAnalysis" to JsonObject(
                    mapOf(
                        "translation" to JsonPrimitive(analysis.translation.trim()),
                        "keyPoint" to JsonPrimitive(analysis.keyPoint.trim()),
                        "analysis" to JsonPrimitive(analysis.analysis.trim()),
                        "wrongOptions" to toStringArrayJson(wrongOptionsForNotebook),
                    ),
                ),
            ),
        )
        val tags = toStringArrayJson(listOf("TOPIK", "错题", "第${question.number}题"))
        val notebookResult = client.mutation(
            "notebooks:save",
            buildArgs(
                "type" to "mistake",
                "title" to "$sanitizedExamTitle · 第${question.number}题",
                "content" to notebookPayload,
                "tags" to tags,
            ),
        )

        if (notebookResult is ConvexResult.Error) {
            return TopikWrongQuestionSaveResult(success = false, errorMessage = notebookResult.message)
        }

        val annotationNote = buildTopikAnnotationNote(analysis)
        val annotationResult = client.mutation(
            "annotations:save",
            buildArgs(
                "contextKey" to "topik:$sanitizedExamTitle",
                "text" to normalizedQuestion,
                "note" to annotationNote,
                "scopeType" to "topik_question",
                "scopeId" to "${sanitizedExamTitle}#${question.number}",
            ),
        )
        val annotationSaved = annotationResult is ConvexResult.Success
        return if (annotationSaved) {
            TopikWrongQuestionSaveResult(
                success = true,
                notebookSaved = true,
                annotationSaved = true,
            )
        } else {
            TopikWrongQuestionSaveResult(
                success = true,
                notebookSaved = true,
                annotationSaved = false,
                errorMessage = "错题已保存到笔记，批注保存失败",
            )
        }
    }

    override suspend fun saveTopikExamAnswers(sessionId: String, answers: Map<String, Int>): Result<Unit> {
        if (sessionId.isBlank()) {
            return Result.failure(IllegalArgumentException("会话 ID 无效"))
        }
        if (answers.isEmpty()) {
            return Result.failure(IllegalArgumentException("请至少作答一题"))
        }
        return when (
            val result = client.mutation(
                "topik:updateAnswers",
                buildArgs(
                    "sessionId" to sessionId,
                    "answers" to toIntAnswerJson(answers),
                ),
            )
        ) {
            is ConvexResult.Success -> Result.success(Unit)
            is ConvexResult.Error -> Result.failure(IllegalArgumentException(resolveTopikError(result.message)))
        }
    }

    override suspend fun submitTopikExam(
        sessionId: String,
        answers: Map<String, Int>,
    ): Result<TopikExamSubmitResultUiModel> {
        if (sessionId.isBlank()) {
            return Result.failure(IllegalArgumentException("会话 ID 无效"))
        }
        if (answers.isEmpty()) {
            return Result.failure(IllegalArgumentException("请至少作答一题"))
        }
        return when (
            val result = client.mutation(
                "topik:submitExam",
                buildArgs(
                    "sessionId" to sessionId,
                    "answers" to toIntAnswerJson(answers),
                ),
            )
        ) {
            is ConvexResult.Success -> {
                val payload = result.value as? JsonObject
                    ?: return Result.failure(IllegalArgumentException("交卷失败，请稍后重试"))
                val score = payload.getInt("score") ?: 0
                val totalQuestions = payload.getInt("totalQuestions") ?: answers.size
                val totalScore = payload.getInt("totalScore") ?: 0
                Result.success(
                    TopikExamSubmitResultUiModel(
                        score = score,
                        totalQuestions = totalQuestions,
                        totalScore = totalScore,
                    ),
                )
            }
            is ConvexResult.Error -> Result.failure(IllegalArgumentException(resolveTopikError(result.message)))
        }
    }

    override suspend fun startTopikWritingSession(examDocumentId: String): Result<TopikWritingSessionUiModel> {
        if (examDocumentId.isBlank()) {
            return Result.failure(IllegalArgumentException("写作试卷 ID 无效"))
        }
        return when (
            val result = client.mutation(
                "topikWriting:startSession",
                buildArgs("examId" to examDocumentId),
            )
        ) {
            is ConvexResult.Success -> {
                val payload = result.value as? JsonObject
                    ?: return Result.failure(IllegalArgumentException("开始写作失败，请稍后重试"))
                val sessionId = payload.getString("sessionId")
                    ?: return Result.failure(IllegalArgumentException("开始写作失败，请稍后重试"))
                val endTime = payload.getLong("endTime")
                    ?: return Result.failure(IllegalArgumentException("开始写作失败，请稍后重试"))
                val answers = parseTextAnswerMap(payload["answers"] as? JsonObject)
                Result.success(
                    TopikWritingSessionUiModel(
                        sessionId = sessionId,
                        endTimeMillis = endTime,
                        answers = answers,
                        answerCount = answers.size,
                        isResuming = answers.isNotEmpty(),
                    ),
                )
            }
            is ConvexResult.Error -> Result.failure(IllegalArgumentException(resolveTopikError(result.message)))
        }
    }

    override suspend fun saveTopikWritingDraft(sessionId: String, answers: Map<String, String>): Result<Unit> {
        if (sessionId.isBlank()) {
            return Result.failure(IllegalArgumentException("会话 ID 无效"))
        }
        if (answers.values.none { it.isNotBlank() }) {
            return Result.failure(IllegalArgumentException("草稿内容为空"))
        }
        return when (
            val result = client.mutation(
                "topikWriting:saveDraft",
                buildArgs(
                    "sessionId" to sessionId,
                    "answers" to toTextAnswerJson(answers),
                ),
            )
        ) {
            is ConvexResult.Success -> {
                val payload = result.value as? JsonObject
                val saved = payload?.getBoolean("saved") ?: true
                if (saved) {
                    Result.success(Unit)
                } else {
                    val reason = payload?.getString("reason") ?: "unknown"
                    Result.failure(IllegalArgumentException(resolveWritingSaveReason(reason)))
                }
            }
            is ConvexResult.Error -> Result.failure(IllegalArgumentException(resolveTopikError(result.message)))
        }
    }

    override suspend fun submitTopikWritingSession(sessionId: String): Result<TopikWritingSubmitResultUiModel> {
        if (sessionId.isBlank()) {
            return Result.failure(IllegalArgumentException("会话 ID 无效"))
        }
        val languageTag = Locale.getDefault().toLanguageTag()
        return when (
            val result = client.mutation(
                "topikWriting:submitSession",
                buildArgs(
                    "sessionId" to sessionId,
                    "language" to languageTag,
                ),
            )
        ) {
            is ConvexResult.Success -> {
                val payload = result.value as? JsonObject
                val alreadySubmitted = payload?.getBoolean("alreadySubmitted") ?: false
                Result.success(TopikWritingSubmitResultUiModel(alreadySubmitted = alreadySubmitted))
            }
            is ConvexResult.Error -> Result.failure(IllegalArgumentException(resolveTopikError(result.message)))
        }
    }

    override suspend fun loadTopikWritingQuestions(examDocumentId: String): Result<List<TopikWritingQuestionUiModel>> {
        if (examDocumentId.isBlank()) {
            return Result.failure(IllegalArgumentException("写作试卷 ID 无效"))
        }
        return when (
            val result = client.query(
                "topikWriting:getWritingQuestions",
                buildArgs("examId" to examDocumentId),
            )
        ) {
            is ConvexResult.Success -> {
                val arr = result.value as? JsonArray ?: JsonArray(emptyList())
                val parsedQuestions = arr.mapNotNull { item ->
                    val obj = item as? JsonObject ?: return@mapNotNull null
                    val number = obj.getInt("number") ?: return@mapNotNull null
                    TopikWritingQuestionUiModel(
                        number = number,
                        instruction = obj.getString("instruction") ?: obj.getString("contextBox") ?: "",
                        contextBox = obj.getString("contextBox") ?: "",
                        score = obj.getInt("score") ?: 0,
                    )
                }
                Result.success(hydrateTopikWritingMaterial(parsedQuestions))
            }
            is ConvexResult.Error -> Result.failure(IllegalArgumentException(resolveTopikError(result.message)))
        }
    }

    override suspend fun loadTopikWritingEvaluationReport(sessionId: String): Result<TopikWritingEvaluationReportUiModel?> {
        if (sessionId.isBlank()) {
            return Result.failure(IllegalArgumentException("写作会话 ID 无效"))
        }
        return when (
            val result = client.query(
                "aiWritingEvaluation:getEvaluations",
                buildArgs("sessionId" to sessionId),
            )
        ) {
            is ConvexResult.Success -> Result.success(parseTopikWritingEvaluationReport(result))
            is ConvexResult.Error -> Result.failure(IllegalArgumentException(resolveTopikError(result.message)))
        }
    }

    private suspend fun hydrateTopikWritingMaterial(
        questions: List<TopikWritingQuestionUiModel>,
    ): List<TopikWritingQuestionUiModel> {
        if (questions.isEmpty()) return questions
        val missing = questions.filter { it.instruction.isBlank() || it.contextBox.isBlank() }
        if (missing.isEmpty()) return questions

        val requestRows =
            JsonArray(
                missing.map { question ->
                    buildArgs(
                        "number" to question.number,
                        "questionType" to inferWritingQuestionType(question.number),
                        "score" to question.score,
                    )
                },
            )

        val actionResult =
            client.action(
                "ai:generateTopikWritingMaterialFallback",
                buildArgs(
                    "questions" to requestRows,
                    "language" to "zh",
                ),
            )

        val generatedByNumber = parseWritingMaterialFallback(actionResult)
        return questions.map { question ->
            val generated = generatedByNumber[question.number]
            val instruction =
                question.instruction
                    .ifBlank { generated?.instruction.orEmpty() }
                    .ifBlank { defaultTopikInstruction(question.number) }
            val contextBox =
                question.contextBox
                    .ifBlank { generated?.contextBox.orEmpty() }
            question.copy(
                instruction = instruction,
                contextBox = contextBox,
            )
        }
    }

    private fun parseWritingMaterialFallback(
        result: ConvexResult<JsonElement>,
    ): Map<Int, AiWritingMaterialFallback> {
        if (result !is ConvexResult.Success) return emptyMap()
        val payload = result.value as? JsonObject ?: return emptyMap()
        val arr = payload["items"] as? JsonArray ?: return emptyMap()
        return arr.mapNotNull { item ->
            val obj = item as? JsonObject ?: return@mapNotNull null
            val number = obj.getInt("number") ?: return@mapNotNull null
            val instruction = obj.getString("instruction")?.trim().orEmpty()
            val contextBox = obj.getString("contextBox")?.trim().orEmpty()
            number to AiWritingMaterialFallback(
                instruction = instruction,
                contextBox = contextBox,
            )
        }.toMap()
    }

    private fun parseTopikWritingEvaluationReport(
        result: ConvexResult.Success<JsonElement>,
    ): TopikWritingEvaluationReportUiModel? {
        val payload = result.value
        if (payload is JsonNull) return null
        val obj = payload as? JsonObject ?: return null
        val session = obj["session"] as? JsonObject ?: return null
        val status = session.getString("status") ?: return null
        val totalScore = session.getInt("totalScore") ?: 0
        val answers = parseTextAnswerMap(session["answers"] as? JsonObject)
        val evaluationsArray = obj["evaluations"] as? JsonArray ?: JsonArray(emptyList())
        val evaluations =
            evaluationsArray
                .mapNotNull { row ->
                    val rowObject = row as? JsonObject ?: return@mapNotNull null
                    val questionNumber = rowObject.getInt("questionNumber") ?: return@mapNotNull null
                    val score = rowObject.getInt("score") ?: 0
                    val dimensionsObject = rowObject["dimensions"] as? JsonObject
                    val dimensions =
                        TopikWritingEvaluationDimensionsUiModel(
                            taskAccomplishment = dimensionsObject?.getInt("taskAccomplishment") ?: 0,
                            developmentStructure = dimensionsObject?.getInt("developmentStructure") ?: 0,
                            languageUse = dimensionsObject?.getInt("languageUse") ?: 0,
                            wongojiRules = dimensionsObject?.getInt("wongojiRules"),
                        )
                    val feedbackText = rowObject.getString("feedbackText").orEmpty()
                    val correctedText = rowObject.getString("correctedText").orEmpty()
                    TopikWritingQuestionEvaluationUiModel(
                        questionNumber = questionNumber,
                        score = score,
                        dimensions = dimensions,
                        feedbackText = feedbackText,
                        correctedText = correctedText,
                    )
                }.sortedBy { it.questionNumber }
        return TopikWritingEvaluationReportUiModel(
            status = status,
            totalScore = totalScore,
            answers = answers,
            evaluations = evaluations,
        )
    }

    private fun inferWritingQuestionType(number: Int): String = when (number) {
        53 -> "GRAPH_ESSAY"
        54 -> "OPINION_ESSAY"
        else -> "FILL_BLANK"
    }

    private fun defaultTopikInstruction(number: Int): String = when (number) {
        51 -> "请根据上下文完成第 51 题填空。"
        52 -> "请根据题目要求完成第 52 题填空。"
        53 -> "根据图表信息写一篇说明文（200-300字）。"
        54 -> "围绕主题写一篇议论文（400-700字）。"
        else -> "请根据题目要求完成写作。"
    }

    private data class AiWritingMaterialFallback(
        val instruction: String,
        val contextBox: String,
    )

    private data class MobileLearningSurfacePayload(
        val currentCourse: LearningCurrentCourse?,
        val shortcuts: List<LearningToolShortcut>,
        val writingWeeklyGoalTarget: Int?,
        val writingCompletedThisWeek: Int?,
    )

    // --- JSON parsing helpers ---

    private fun parseInstitutes(result: ConvexResult<JsonElement>): List<JsonObject> {
        if (result !is ConvexResult.Success) return emptyList()
        val arr = result.value as? JsonArray ?: return emptyList()
        return arr.mapNotNull { it as? JsonObject }
    }

    private fun parseMobileLearningSurface(
        result: ConvexResult<JsonElement>,
    ): MobileLearningSurfacePayload? {
        if (result !is ConvexResult.Success) return null
        val payload = result.value as? JsonObject ?: return null
        val currentCourseObj = payload["currentCourse"] as? JsonObject
        val currentCourse =
            currentCourseObj?.let { course ->
                LearningCurrentCourse(
                    progress = (course.getInt("progress") ?: 0).coerceIn(0, 100),
                    title = course.getString("title") ?: "学习课程",
                    subtitle = course.getString("subtitle") ?: "",
                    completedHours = course.getInt("completedHours"),
                    totalHours = course.getInt("totalHours"),
                    etaDays = course.getInt("etaDays"),
                    route = course.getString("route") ?: "main/grammar",
                )
            }

        val shortcutRows = (payload["shortcuts"] as? JsonArray)?.mapNotNull { it as? JsonObject }.orEmpty()
        val shortcuts = shortcutRows.mapNotNull { row ->
            val route = row.getString("route") ?: return@mapNotNull null
            val accentRaw = row.getString("accent") ?: "pink"
            val accent = if (accentRaw in setOf("pink", "mint", "butter", "lilac")) accentRaw else "pink"
            LearningToolShortcut(
                seal = row.getString("seal") ?: "學",
                label = row.getString("label") ?: "",
                subtitle = row.getString("subtitle") ?: "",
                accent = accent,
                route = route,
            )
        }

        return MobileLearningSurfacePayload(
            currentCourse = currentCourse,
            shortcuts = shortcuts,
            writingWeeklyGoalTarget = payload.getInt("writingWeeklyGoalTarget"),
            writingCompletedThisWeek = payload.getInt("writingCompletedThisWeek"),
        )
    }

    private fun parseCurrentCourse(
        statsResult: ConvexResult<JsonElement>,
        courses: List<JsonObject>,
    ): LearningCurrentCourse? {
        if (statsResult !is ConvexResult.Success) return null
        val stats = statsResult.value as? JsonObject ?: return null
        val courseProgressRows =
            (stats["courseProgress"] as? JsonArray)?.mapNotNull { it as? JsonObject }.orEmpty()
        val currentProgress = stats["currentProgress"] as? JsonObject

        val courseId =
            currentProgress?.getString("instituteId")
                ?: courseProgressRows.firstOrNull()?.getString("courseId")
        val course = courses.find {
            (it.getString("id") ?: it.getString("_id")) == courseId
        } ?: courses.firstOrNull()
        val currentCourseProgress = courseProgressRows.firstOrNull { row ->
            row.getString("courseId") == courseId
        }
        val completedUnits = currentCourseProgress?.getInt("completedUnits") ?: 0
        val totalUnits = currentCourseProgress?.getInt("totalUnits")
            ?: course?.getInt("totalUnits")
            ?: 0
        val progress =
            if (totalUnits > 0) {
                ((completedUnits.toDouble() / totalUnits.toDouble()) * 100.0).toInt().coerceIn(0, 100)
            } else {
                0
            }
        val courseName = course?.getString("nameZh") ?: course?.getString("name") ?: "学习课程"
        val displayLevel = course?.getString("displayLevel") ?: ""
        val estimatedTotalMinutes = course?.getInt("estimatedTotalMinutes")
        val completedMinutes =
            if (estimatedTotalMinutes != null && totalUnits > 0) {
                ((estimatedTotalMinutes.toDouble() * completedUnits.toDouble()) / totalUnits.toDouble()).toInt()
            } else {
                null
            }
        val completedHours = completedMinutes?.div(60)
        val totalHours = estimatedTotalMinutes?.div(60)
        val dailyGoalMinutes = stats.getInt("dailyGoal") ?: 0
        val etaDays =
            if (estimatedTotalMinutes != null && completedMinutes != null && dailyGoalMinutes > 0) {
                val remainingMinutes = (estimatedTotalMinutes - completedMinutes).coerceAtLeast(0)
                kotlin.math.ceil(remainingMinutes.toDouble() / dailyGoalMinutes.toDouble()).toInt()
            } else {
                null
            }

        return LearningCurrentCourse(
            progress = progress,
            title = courseName,
            subtitle = displayLevel,
            completedHours = completedHours,
            totalHours = totalHours,
            etaDays = etaDays,
            route = "main/grammar/${courseId ?: ""}",
        )
    }

    private fun buildJourneyUnits(
        statsResult: ConvexResult<JsonElement>,
        courses: List<JsonObject>,
    ): List<LearningJourneyUnit> {
        val stats = (statsResult as? ConvexResult.Success)?.value as? JsonObject
        val progressRows =
            (stats?.get("courseProgress") as? JsonArray)?.mapNotNull { it as? JsonObject }.orEmpty()
        val progressByCourseId = mutableMapOf<String, Float>()
        progressRows.forEach { row ->
            val rowCourseId = row.getString("courseId") ?: return@forEach
            val rowCompleted = row.getInt("completedUnits") ?: 0
            val rowTotal = row.getInt("totalUnits") ?: 0
            val rowProgress =
                if (rowTotal > 0) {
                    (rowCompleted.toFloat() / rowTotal.toFloat()).coerceIn(0f, 1f)
                } else {
                    0f
                }
            progressByCourseId[rowCourseId] = rowProgress
        }

        return courses.take(5).mapIndexed { index, course ->
            val courseId = course.getString("id") ?: course.getString("_id") ?: ""
            val nameZh = course.getString("nameZh") ?: course.getString("name") ?: ""
            val name = course.getString("name") ?: ""
            val seal = nameZh.firstOrNull()?.toString() ?: "${index + 1}"
            val progress = progressByCourseId[courseId] ?: 0f

            LearningJourneyUnit(
                number = index + 1,
                title = nameZh,
                subtitle = name,
                progress = progress,
                seal = seal,
                route = "main/grammar/$courseId",
            )
        }
    }

    private fun parseDueWords(result: ConvexResult<JsonElement>): List<VocabEntryUiModel> {
        if (result !is ConvexResult.Success) return emptyList()
        val arr = result.value as? JsonArray ?: return emptyList()
        val accents = listOf("mint", "butter", "pink", "lilac")
        return arr.take(20).mapIndexedNotNull { index, item ->
            val obj = item as? JsonObject ?: return@mapIndexedNotNull null
            val id = obj.getString("_id") ?: return@mapIndexedNotNull null
            VocabEntryUiModel(
                id = id,
                word = obj.getString("word") ?: "",
                hanja = obj.getString("meaningZh") ?: obj.getString("meaning") ?: "",
                pronunciation = obj.getString("word") ?: "",
                partOfSpeech = obj.getString("partOfSpeech") ?: "",
                memoryRate = obj.getInt("proficiency") ?: 0,
                accent = accents[index % accents.size],
            )
        }
    }

    private fun parseGrammarPoints(result: ConvexResult<JsonElement>): List<GrammarPointUiModel> {
        if (result !is ConvexResult.Success) return emptyList()
        val arr = result.value as? JsonArray ?: return emptyList()
        return arr.mapNotNull { item ->
            val obj = item as? JsonObject ?: return@mapNotNull null
            val id = obj.getString("_id") ?: obj.getString("id") ?: return@mapNotNull null
            GrammarPointUiModel(
                id = id,
                title = obj.getString("title") ?: obj.getString("pattern") ?: "",
                summary = obj.getString("summaryZh") ?: obj.getString("summary") ?: "",
                status = obj.getString("status") ?: "NEW",
                proficiency = obj.getInt("proficiency") ?: 0,
                translation = obj.getString("translationZh") ?: "",
            )
        }
    }

    private fun parseGrammarModuleDetail(
        result: ConvexResult<JsonElement>,
    ): GrammarModuleUiState? {
        if (result !is ConvexResult.Success) return null
        val obj = result.value as? JsonObject ?: return null
        val pointsArray = obj["points"] as? JsonArray ?: JsonArray(emptyList())
        val points = pointsArray.mapNotNull { item ->
            val row = item as? JsonObject ?: return@mapNotNull null
            val id = row.getString("id") ?: return@mapNotNull null
            val rulesObject = row["rules"] as? JsonObject
            val rules = rulesObject?.entries?.mapNotNull { (key, value) ->
                val content = (value as? JsonPrimitive)?.content?.trim().orEmpty()
                if (key.isBlank() || content.isBlank()) {
                    null
                } else {
                    key to content
                }
            }.orEmpty()
            val examplesArray = row["examples"] as? JsonArray ?: JsonArray(emptyList())
            val examples = examplesArray.mapNotNull { example ->
                val exampleObj = example as? JsonObject ?: return@mapNotNull null
                val korean = exampleObj.getString("kr") ?: ""
                val translation = exampleObj.getString("cn") ?: ""
                if (korean.isBlank() && translation.isBlank()) return@mapNotNull null
                GrammarExampleUiModel(
                    korean = korean,
                    translation = translation,
                )
            }
            val quizzesArray = row["quizzes"] as? JsonArray ?: JsonArray(emptyList())
            val quizzes = quizzesArray.mapNotNull { quiz ->
                val quizObj = quiz as? JsonObject ?: return@mapNotNull null
                val prompt = quizObj.getString("prompt") ?: ""
                val answer = quizObj.getString("answer") ?: ""
                if (prompt.isBlank() && answer.isBlank()) return@mapNotNull null
                GrammarQuizItemUiModel(
                    prompt = prompt,
                    answer = answer,
                )
            }
            GrammarPointUiModel(
                id = id,
                title = row.getString("title") ?: "",
                summary = row.getString("summary") ?: "",
                status = row.getString("status") ?: "NEW",
                proficiency = row.getInt("proficiency") ?: 0,
                translation = row.getString("translation") ?: "",
                explanation = row.getString("explanation") ?: "",
                rules = rules,
                examples = examples,
                quizzes = quizzes,
            )
        }
        val totalCount = obj.getInt("totalCount") ?: points.size
        val masteredCount = obj.getInt("masteredCount") ?: points.count { it.status == "MASTERED" }
        val learningCount = obj.getInt("learningCount") ?: points.count { it.status == "LEARNING" }
        return GrammarModuleUiState(
            isLoading = false,
            deckTitle = obj.getString("deckTitle") ?: "",
            deckLevel = obj.getString("deckLevel") ?: "",
            totalCount = totalCount,
            masteredCount = masteredCount,
            learningCount = learningCount,
            points = points,
        )
    }

    private fun parseWritingDrafts(result: ConvexResult<JsonElement>): List<WritingDraftUiModel> {
        if (result !is ConvexResult.Success) return emptyList()
        val arr = result.value as? JsonArray ?: return emptyList()
        return arr.filter { item ->
            val obj = item as? JsonObject ?: return@filter false
            obj.getString("status") == "IN_PROGRESS"
        }.take(3).mapNotNull { item ->
            val obj = item as? JsonObject ?: return@mapNotNull null
            val examDocumentId = obj.getString("examDocumentId") ?: return@mapNotNull null
            val updatedAt = obj.getLong("updatedAt") ?: obj.getLong("completedAt")
            val timeLabel = if (updatedAt != null) formatTimestamp(updatedAt) else ""
            WritingDraftUiModel(
                title = obj.getString("examTitle") ?: "写作草稿",
                subtitle = "上次保存 $timeLabel",
                progress = "",
                route = "main/topik/writing/$examDocumentId",
            )
        }
    }

    private fun countCompletedWritingSessions(result: ConvexResult<JsonElement>): Int {
        if (result !is ConvexResult.Success) return 0
        val arr = result.value as? JsonArray ?: return 0
        return arr.count { item ->
            val obj = item as? JsonObject ?: return@count false
            val status = obj.getString("status") ?: return@count false
            status != "IN_PROGRESS"
        }
    }

    private fun calculateWritingAverageScore(result: ConvexResult<JsonElement>): Int {
        if (result !is ConvexResult.Success) return 0
        val arr = result.value as? JsonArray ?: return 0
        val scores =
            arr.mapNotNull { item ->
                val obj = item as? JsonObject ?: return@mapNotNull null
                obj.getInt("score")
            }
        if (scores.isEmpty()) return 0
        return scores.sum() / scores.size
    }

    private fun parseWritingPrompts(result: ConvexResult<JsonElement>): List<WritingPromptUiModel> {
        if (result !is ConvexResult.Success) return emptyList()
        val value = result.value
        val arr = when (value) {
            is JsonArray -> value
            is JsonObject -> value["page"] as? JsonArray ?: return emptyList()
            else -> return emptyList()
        }
        val seals = listOf("圖", "論", "句", "字")
        val accents = listOf("butter", "pink", "mint", "lilac")
        return arr.take(4).mapIndexedNotNull { index, item ->
            val obj = item as? JsonObject ?: return@mapIndexedNotNull null
            val examId = obj.getString("_id") ?: obj.getString("id") ?: return@mapIndexedNotNull null
            WritingPromptUiModel(
                seal = seals.getOrElse(index) { "寫" },
                title = obj.getString("title") ?: "写作任务 ${index + 1}",
                subtitle = obj.getString("description") ?: obj.getString("subtitle") ?: "",
                meta = "${obj.getInt("timeLimit") ?: 50} 分钟",
                accent = accents.getOrElse(index) { "butter" },
                route = "main/topik/writing/$examId",
            )
        }
    }

    private fun parseTopikExams(result: ConvexResult<JsonElement>): List<TopikExamUiModel> {
        if (result !is ConvexResult.Success) return emptyList()
        val value = result.value
        val arr = when (value) {
            is JsonArray -> value
            is JsonObject -> value["page"] as? JsonArray ?: return emptyList()
            else -> return emptyList()
        }
        return arr.mapNotNull { item ->
            val obj = item as? JsonObject ?: return@mapNotNull null
            val typeStr = obj.getString("type") ?: "READING"
            val type = parseTopikType(typeStr)
            val legacyId = obj.getString("id") ?: obj.getString("legacyId")
            val documentId = obj.getString("_id")
            val routeId = when (type) {
                TopikType.WRITING -> documentId ?: legacyId
                else -> legacyId ?: documentId
            } ?: return@mapNotNull null
            TopikExamUiModel(
                id = routeId,
                legacyExamId = legacyId ?: routeId,
                examDocumentId = documentId,
                title = obj.getString("title") ?: "",
                type = type,
                level = obj.getString("level") ?: "TOPIK II",
                durationMinutes = obj.getInt("timeLimit") ?: 50,
                questionCount = obj.getInt("questionCount") ?: ((obj["questions"] as? JsonArray)?.size ?: 0),
                isLocked = obj.getBoolean("isPaid") == true,
                bestScore = obj.getInt("bestScore") ?: 0,
            )
        }
    }

    private fun parseTopikHistory(result: ConvexResult<JsonElement>): List<TopikHistoryUiModel> {
        if (result !is ConvexResult.Success) return emptyList()
        val arr = result.value as? JsonArray ?: return emptyList()
        return arr.take(10).mapNotNull { item ->
            val obj = item as? JsonObject ?: return@mapNotNull null
            val examId = obj.getString("examId") ?: return@mapNotNull null
            val completedAt = obj.getLong("completedAt") ?: obj.getLong("submittedAt")
            TopikHistoryUiModel(
                title = obj.getString("title") ?: obj.getString("examTitle") ?: "TOPIK 考试",
                submittedAt = if (completedAt != null) formatTimestamp(completedAt) else "",
                score = obj.getInt("score") ?: 0,
                examId = examId,
                mode = parseTopikType(resolveHistoryType(obj)),
            )
        }
    }

    private fun parseTopikWritingHistory(result: ConvexResult<JsonElement>): List<TopikHistoryUiModel> {
        if (result !is ConvexResult.Success) return emptyList()
        val arr = result.value as? JsonArray ?: return emptyList()
        return arr
            .filter { item ->
                val obj = item as? JsonObject ?: return@filter false
                obj.getString("status") != "IN_PROGRESS"
            }
            .mapNotNull { item ->
                val obj = item as? JsonObject ?: return@mapNotNull null
                val examId =
                    obj.getString("examLegacyId")
                        ?: obj.getString("examDocumentId")
                        ?: return@mapNotNull null
                val ts = obj.getLong("completedAt") ?: obj.getLong("updatedAt")
                TopikHistoryUiModel(
                    title = obj.getString("examTitle") ?: "TOPIK 写作",
                    submittedAt = if (ts != null) formatTimestamp(ts) else "",
                    score = obj.getInt("score") ?: 0,
                    examId = examId,
                    mode = TopikType.WRITING,
                )
            }
    }

    private fun parseTopikType(type: String): TopikType = when (type.uppercase()) {
        "LISTENING" -> TopikType.LISTENING
        "WRITING" -> TopikType.WRITING
        else -> TopikType.READING
    }

    private fun formatTimestamp(ts: Long): String {
        val now = System.currentTimeMillis()
        val diff = now - ts
        return when {
            diff < 60_000 -> "刚刚"
            diff < 3_600_000 -> "${diff / 60_000} 分钟前"
            diff < 86_400_000 -> "今天 ${SimpleDateFormat("HH:mm", Locale.getDefault()).format(Date(ts))}"
            diff < 172_800_000 -> "昨天 ${SimpleDateFormat("HH:mm", Locale.getDefault()).format(Date(ts))}"
            else -> SimpleDateFormat("MM-dd HH:mm", Locale.getDefault()).format(Date(ts))
        }
    }

    private fun extractInt(result: ConvexResult<JsonElement>, vararg keys: String): Int? {
        if (result !is ConvexResult.Success) return null
        val obj = result.value as? JsonObject ?: return null
        for (key in keys) {
            val value = obj[key]?.jsonPrimitive?.intOrNull
            if (value != null) return value
        }
        return null
    }

    private fun extractString(result: ConvexResult<JsonElement>, vararg keys: String): String? {
        if (result !is ConvexResult.Success) return null
        val obj = result.value as? JsonObject ?: return null
        for (key in keys) {
            val value = obj[key] ?: continue
            if (value is JsonNull) continue
            return value.jsonPrimitive.content
        }
        return null
    }

    private fun extractNestedInt(
        result: ConvexResult<JsonElement>,
        parentKey: String,
        childKey: String,
    ): Int? {
        if (result !is ConvexResult.Success) return null
        val obj = result.value as? JsonObject ?: return null
        val parent = obj[parentKey] as? JsonObject ?: return null
        return parent[childKey]?.jsonPrimitive?.intOrNull
    }

    private fun resolveStartExamError(rawError: String): String {
        val upper = rawError.uppercase()
        return when {
            upper.contains("SUBSCRIPTION_REQUIRED") -> "该试卷需要会员权限"
            upper.contains("EXAM_NOT_FOUND") -> "试卷不存在或已下线"
            upper.contains("UNAUTHENTICATED") || upper.contains("401") -> "登录状态已失效，请重新登录"
            upper.contains("FORBIDDEN") -> "当前账号没有访问权限"
            else -> "开始考试失败，请稍后重试"
        }
    }

    private fun resolveTopikError(rawError: String): String {
        val upper = rawError.uppercase()
        return when {
            upper.contains("SESSION_EXPIRED") -> "考试会话已过期，请重新开始"
            upper.contains("SESSION_ALREADY_COMPLETED") -> "该会话已完成，请重新开始"
            upper.contains("SESSION_NOT_FOUND") -> "考试会话不存在"
            upper.contains("INVALID_ANSWERS_PAYLOAD") -> "答题数据无效，请重试"
            upper.contains("DAILY_LIMIT_REACHED") -> "今日写作评估额度已用完"
            upper.contains("SUBSCRIPTION_REQUIRED") -> "该功能需要会员权限"
            upper.contains("UNAUTHENTICATED") || upper.contains("401") -> "登录状态已失效，请重新登录"
            else -> "操作失败，请稍后重试"
        }
    }

    private fun resolveWritingSaveReason(reason: String): String {
        return when (reason.lowercase()) {
            "expired" -> "写作会话已过期，请重新开始"
            "not_in_progress" -> "写作会话已结束"
            "forbidden" -> "当前账号没有该会话权限"
            "not_found" -> "写作会话不存在"
            else -> "草稿保存失败，请稍后重试"
        }
    }

    private fun buildTopikAnnotationNote(analysis: TopikQuestionAnalysisResult): String {
        val wrongOptionsText =
            if (analysis.wrongOptions.isEmpty()) {
                ""
            } else {
                analysis.wrongOptions.entries
                    .sortedBy { it.key }
                    .joinToString(separator = "\n") { entry ->
                        "选项 ${entry.key}: ${entry.value}"
                    }
            }
        return listOf(
            analysis.translation.takeIf { it.isNotBlank() }?.let { "题干翻译: $it" },
            analysis.keyPoint.takeIf { it.isNotBlank() }?.let { "考点: $it" },
            analysis.analysis.takeIf { it.isNotBlank() }?.let { "解析: $it" },
            wrongOptionsText.takeIf { it.isNotBlank() }?.let { "错误选项分析:\n$it" },
        ).filterNotNull().joinToString(separator = "\n\n")
    }

    private fun resolveHistoryType(obj: JsonObject): String {
        val explicit = obj.getString("type")
        if (!explicit.isNullOrBlank()) return explicit
        val title = (obj.getString("title") ?: obj.getString("examTitle") ?: "").uppercase()
        return when {
            title.contains("WRITING") || title.contains("写作") -> "WRITING"
            title.contains("LISTENING") || title.contains("听力") -> "LISTENING"
            else -> "READING"
        }
    }

    private fun extractTotalUnits(course: JsonObject): Int {
        val levels = course["levels"] as? JsonArray ?: return 10
        if (levels.isEmpty()) return 10
        val first = levels[0]
        if (first is JsonObject) {
            return first.getInt("units") ?: 10
        }
        return 10
    }

    private fun buildArgs(vararg pairs: Pair<String, Any>): JsonObject {
        val map = pairs.associate { (k, v) ->
            k to when (v) {
                is Int -> JsonPrimitive(v)
                is Long -> JsonPrimitive(v)
                is String -> JsonPrimitive(v)
                is Boolean -> JsonPrimitive(v)
                is JsonObject -> v
                is JsonArray -> v
                else -> JsonPrimitive(v.toString())
            }
        }
        return JsonObject(map)
    }

    private fun toIntAnswerJson(answers: Map<String, Int>): JsonObject {
        val map = answers.mapValues { (_, value) -> JsonPrimitive(value) }
        return JsonObject(map)
    }

    private fun toStringArrayJson(values: List<String>): JsonArray =
        JsonArray(values.map { JsonPrimitive(it) })

    private fun toTextAnswerJson(answers: Map<String, String>): JsonObject {
        val map = answers.mapValues { (_, value) -> JsonPrimitive(value) }
        return JsonObject(map)
    }

    private fun parseIntAnswerMap(raw: JsonObject?): Map<String, Int> {
        if (raw == null) return emptyMap()
        return raw.mapNotNull { (key, value) ->
            val parsed = value.jsonPrimitive.intOrNull ?: return@mapNotNull null
            key to parsed
        }.toMap()
    }

    private fun parseTextAnswerMap(raw: JsonObject?): Map<String, String> {
        if (raw == null) return emptyMap()
        return raw.map { (key, value) ->
            key to value.jsonPrimitive.content
        }.toMap()
    }

    private fun JsonObject.getString(key: String): String? {
        val v = this[key] ?: return null
        if (v is JsonNull) return null
        return v.jsonPrimitive.content
    }

    private fun JsonObject.getInt(key: String): Int? {
        val v = this[key] ?: return null
        return v.jsonPrimitive.intOrNull
    }

    private fun JsonObject.getLong(key: String): Long? {
        val v = this[key] ?: return null
        return v.jsonPrimitive.longOrNull
    }

    private fun JsonObject.getBoolean(key: String): Boolean? {
        val v = this[key] ?: return null
        return v.jsonPrimitive.booleanOrNull
    }
}
