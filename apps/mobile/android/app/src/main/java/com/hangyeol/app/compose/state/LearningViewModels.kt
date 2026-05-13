package com.hangyeol.app.compose.state

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.hangyeol.app.compose.data.GrammarHubUiState
import com.hangyeol.app.compose.data.GrammarModuleUiState
import com.hangyeol.app.compose.data.LearningHubUiState
import com.hangyeol.app.compose.data.LearningRepository
import com.hangyeol.app.compose.data.ReviewHubUiState
import com.hangyeol.app.compose.data.TopikCenterUiState
import com.hangyeol.app.compose.data.TopikFilter
import com.hangyeol.app.compose.data.TopikType
import com.hangyeol.app.compose.data.VocabUiState
import com.hangyeol.app.compose.data.WritingHubUiState
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

class LearningHubViewModel(
  private val learningRepository: LearningRepository,
) : ViewModel() {
  private val mutableUiState = MutableStateFlow(LearningHubUiState())
  val uiState: StateFlow<LearningHubUiState> = mutableUiState.asStateFlow()

  init {
    refresh()
  }

  fun refresh() {
    viewModelScope.launch {
      mutableUiState.value = mutableUiState.value.copy(isLoading = true)
      mutableUiState.value = learningRepository.loadLearningHub()
    }
  }

  companion object {
    fun factory(learningRepository: LearningRepository): ViewModelProvider.Factory =
      simpleFactory { LearningHubViewModel(learningRepository) }
  }
}

class VocabViewModel(
  private val learningRepository: LearningRepository,
) : ViewModel() {
  private val mutableUiState = MutableStateFlow(VocabUiState())
  val uiState: StateFlow<VocabUiState> = mutableUiState.asStateFlow()

  init {
    refresh()
  }

  fun refresh() {
    viewModelScope.launch {
      mutableUiState.value = mutableUiState.value.copy(isLoading = true)
      mutableUiState.value = learningRepository.loadVocab()
    }
  }

  fun selectTab(tab: String) {
    mutableUiState.update { it.copy(selectedTab = tab) }
  }

  fun updateProgress(wordId: String, status: String, proficiency: Int) {
    viewModelScope.launch {
      val result = learningRepository.updateVocabProgress(wordId, status, proficiency)
      if (result.success) {
        refresh()
      }
    }
  }

  companion object {
    fun factory(learningRepository: LearningRepository): ViewModelProvider.Factory =
      simpleFactory { VocabViewModel(learningRepository) }
  }
}

class GrammarHubViewModel(
  private val learningRepository: LearningRepository,
) : ViewModel() {
  private val mutableUiState = MutableStateFlow(GrammarHubUiState())
  val uiState: StateFlow<GrammarHubUiState> = mutableUiState.asStateFlow()

  init {
    refresh()
  }

  fun refresh() {
    viewModelScope.launch {
      mutableUiState.value = mutableUiState.value.copy(isLoading = true)
      mutableUiState.value = learningRepository.loadGrammarHub()
    }
  }

  companion object {
    fun factory(learningRepository: LearningRepository): ViewModelProvider.Factory =
      simpleFactory { GrammarHubViewModel(learningRepository) }
  }
}

class GrammarModuleViewModel(
  private val learningRepository: LearningRepository,
  private val deckId: String,
) : ViewModel() {
  private val mutableUiState = MutableStateFlow(GrammarModuleUiState())
  val uiState: StateFlow<GrammarModuleUiState> = mutableUiState.asStateFlow()

  init {
    refresh()
  }

  fun refresh() {
    viewModelScope.launch {
      mutableUiState.value = mutableUiState.value.copy(isLoading = true)
      mutableUiState.value = learningRepository.loadGrammarModule(deckId)
    }
  }

  companion object {
    fun factory(
      learningRepository: LearningRepository,
      deckId: String,
    ): ViewModelProvider.Factory = simpleFactory { GrammarModuleViewModel(learningRepository, deckId) }
  }
}

class ReviewHubViewModel(
  private val learningRepository: LearningRepository,
) : ViewModel() {
  private val mutableUiState = MutableStateFlow(ReviewHubUiState())
  val uiState: StateFlow<ReviewHubUiState> = mutableUiState.asStateFlow()

  init {
    refresh()
  }

  fun refresh() {
    viewModelScope.launch {
      mutableUiState.value = mutableUiState.value.copy(isLoading = true)
      mutableUiState.value = learningRepository.loadReviewHub()
    }
  }

  companion object {
    fun factory(learningRepository: LearningRepository): ViewModelProvider.Factory =
      simpleFactory { ReviewHubViewModel(learningRepository) }
  }
}

class ReviewQuizViewModel(
  private val learningRepository: LearningRepository,
) : ViewModel() {
  private val mutableUiState = MutableStateFlow(ReviewQuizUiState())
  val uiState: StateFlow<ReviewQuizUiState> = mutableUiState.asStateFlow()

  init {
    loadQuestions()
  }

  fun loadQuestions() {
    viewModelScope.launch {
      mutableUiState.update { it.copy(isLoading = true) }
      val questions = learningRepository.loadReviewQuizQuestions(10)
      mutableUiState.update { it.copy(isLoading = false, questions = questions, currentIndex = 0, score = 0, isComplete = false) }
    }
  }

  fun submitAnswer(index: Int) {
    val current = mutableUiState.value
    if (current.isComplete || current.currentIndex >= current.questions.size) return

    val question = current.questions[current.currentIndex]
    val isCorrect = index == question.correctIndex
    
    mutableUiState.update { state ->
      val newScore = if (isCorrect) state.score + 1 else state.score
      val nextIndex = state.currentIndex + 1
      val isComplete = nextIndex >= state.questions.size
      state.copy(score = newScore, currentIndex = nextIndex, isComplete = isComplete)
    }
  }

  companion object {
    fun factory(learningRepository: LearningRepository): ViewModelProvider.Factory =
      simpleFactory { ReviewQuizViewModel(learningRepository) }
  }
}

class WritingHubViewModel(
  private val learningRepository: LearningRepository,
) : ViewModel() {
  private val mutableUiState = MutableStateFlow(WritingHubUiState())
  val uiState: StateFlow<WritingHubUiState> = mutableUiState.asStateFlow()

  init {
    refresh()
  }

  fun refresh() {
    viewModelScope.launch {
      mutableUiState.value = mutableUiState.value.copy(isLoading = true)
      mutableUiState.value = learningRepository.loadWritingHub()
    }
  }

  companion object {
    fun factory(learningRepository: LearningRepository): ViewModelProvider.Factory =
      simpleFactory { WritingHubViewModel(learningRepository) }
  }
}

data class TopikCenterScreenState(
  val filter: TopikFilter = TopikFilter.ALL,
  val data: TopikCenterUiState = TopikCenterUiState(),
) {
  val filteredExams =
    data.exams.filter { exam ->
      when (filter) {
        TopikFilter.ALL -> true
        TopikFilter.READING -> exam.type == TopikType.READING
        TopikFilter.LISTENING -> exam.type == TopikType.LISTENING
        TopikFilter.WRITING -> exam.type == TopikType.WRITING
      }
    }
}

class TopikCenterViewModel(
  private val learningRepository: LearningRepository,
) : ViewModel() {
  private val mutableUiState = MutableStateFlow(TopikCenterScreenState())
  val uiState: StateFlow<TopikCenterScreenState> = mutableUiState.asStateFlow()

  init {
    refresh()
  }

  fun refresh() {
    viewModelScope.launch {
      mutableUiState.update { it.copy(data = it.data.copy(isLoading = true)) }
      val loaded = learningRepository.loadTopikCenter()
      mutableUiState.update { it.copy(data = loaded) }
    }
  }

  fun setFilter(filter: TopikFilter) {
    mutableUiState.update { it.copy(filter = filter) }
  }

  companion object {
    fun factory(learningRepository: LearningRepository): ViewModelProvider.Factory =
      simpleFactory { TopikCenterViewModel(learningRepository) }
  }
}

private inline fun <reified T : ViewModel> simpleFactory(crossinline creator: () -> T): ViewModelProvider.Factory =
  object : ViewModelProvider.Factory {
    @Suppress("UNCHECKED_CAST")
    override fun <VM : ViewModel> create(modelClass: Class<VM>): VM = creator() as VM
  }
