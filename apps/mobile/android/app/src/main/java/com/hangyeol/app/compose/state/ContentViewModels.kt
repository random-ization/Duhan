package com.hangyeol.app.compose.state

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.hangyeol.app.compose.data.ContentRepository
import com.hangyeol.app.compose.data.CommunityUiState
import com.hangyeol.app.compose.data.DictionaryUiState
import com.hangyeol.app.compose.data.HistoryUiState
import com.hangyeol.app.compose.data.NotebookUiState
import com.hangyeol.app.compose.data.AchievementsUiState
import com.hangyeol.app.compose.data.VideoDetailUiState
import com.hangyeol.app.compose.data.VocabBookUiState
import com.hangyeol.app.compose.data.VocabBookListUiState
import com.hangyeol.app.compose.data.VocabBookModeUiState
import com.hangyeol.app.compose.data.TypingSurfaceUiState
import com.hangyeol.app.compose.data.TypingRecordPayload
import com.hangyeol.app.compose.data.EpubReaderUiState
import com.hangyeol.app.compose.data.PodcastHistoryUiState
import com.hangyeol.app.compose.data.PodcastLibraryUiState
import com.hangyeol.app.compose.data.PodcastPlayerUiState
import com.hangyeol.app.compose.data.PodcastSearchUiState
import com.hangyeol.app.compose.data.PodcastSubscriptionsUiState
import com.hangyeol.app.compose.data.PricingUiState
import com.hangyeol.app.compose.data.SubscriptionDetailUiState
import com.hangyeol.app.compose.data.WritingEvaluationUiState
import com.hangyeol.app.compose.data.ReadingArticleUiState
import com.hangyeol.app.compose.data.ProfileUiState
import com.hangyeol.app.compose.data.ReadingLibraryUiState
import com.hangyeol.app.compose.data.SettingsUiState
import com.hangyeol.app.compose.data.TopikHistoryUiState
import com.hangyeol.app.compose.data.VideoLibraryUiState
import com.hangyeol.app.compose.data.MutationResult
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

class DictionaryViewModel(
  private val contentRepository: ContentRepository,
) : ViewModel() {
  private val mutableUiState = MutableStateFlow(DictionaryUiState())
  val uiState: StateFlow<DictionaryUiState> = mutableUiState.asStateFlow()

  init {
    refresh()
  }

  fun refresh() {
    viewModelScope.launch {
      val current = mutableUiState.value
      mutableUiState.value = current.copy(isLoading = true, errorMessage = null)
      try {
        val loaded =
          if (current.query.isBlank()) {
            contentRepository.loadDictionary()
          } else {
            contentRepository.searchDictionary(current.query)
          }
        mutableUiState.value = loaded
      } catch (throwable: Throwable) {
        mutableUiState.value =
          current.copy(
            isLoading = false,
            errorMessage = throwable.message ?: "词典加载失败，请稍后重试",
          )
      }
    }
  }

  fun onQueryChanged(query: String) {
    mutableUiState.update { it.copy(query = query, errorMessage = null) }
  }

  fun submitQuery(query: String = mutableUiState.value.query) {
    viewModelScope.launch {
      val normalized = query.trim()
      mutableUiState.update { it.copy(isLoading = true, errorMessage = null) }
      try {
        val loaded = contentRepository.searchDictionary(normalized)
        mutableUiState.value = loaded
      } catch (throwable: Throwable) {
        mutableUiState.update {
          it.copy(
            isLoading = false,
            errorMessage = throwable.message ?: "最近搜索保存失败，请稍后重试",
          )
        }
      }
    }
  }

  companion object {
    fun factory(contentRepository: ContentRepository): ViewModelProvider.Factory =
      contentFactory { DictionaryViewModel(contentRepository) }
  }
}

class NotebookViewModel(
  private val contentRepository: ContentRepository,
) : ViewModel() {
  private val mutableUiState = MutableStateFlow(NotebookUiState())
  val uiState: StateFlow<NotebookUiState> = mutableUiState.asStateFlow()

  init {
    refresh()
  }

  fun refresh() {
    viewModelScope.launch {
      val current = mutableUiState.value
      mutableUiState.value = current.copy(isLoading = true, errorMessage = null)
      try {
        mutableUiState.value = contentRepository.loadNotebook()
      } catch (throwable: Throwable) {
        mutableUiState.value =
          current.copy(
            isLoading = false,
            errorMessage = throwable.message ?: "笔记加载失败，请稍后重试",
          )
      }
    }
  }

  companion object {
    fun factory(contentRepository: ContentRepository): ViewModelProvider.Factory =
      contentFactory { NotebookViewModel(contentRepository) }
  }
}

class ReadingLibraryViewModel(
  private val contentRepository: ContentRepository,
) : ViewModel() {
  private val mutableUiState = MutableStateFlow(ReadingLibraryUiState())
  val uiState: StateFlow<ReadingLibraryUiState> = mutableUiState.asStateFlow()

  init {
    refresh()
  }

  fun refresh() {
    viewModelScope.launch {
      val current = mutableUiState.value
      mutableUiState.value = current.copy(isLoading = true, errorMessage = null)
      try {
        mutableUiState.value = contentRepository.loadReadingLibrary()
      } catch (throwable: Throwable) {
        mutableUiState.value =
          current.copy(
            isLoading = false,
            errorMessage = throwable.message ?: "阅读内容加载失败，请稍后重试",
          )
      }
    }
  }

  companion object {
    fun factory(contentRepository: ContentRepository): ViewModelProvider.Factory =
      contentFactory { ReadingLibraryViewModel(contentRepository) }
  }
}

class VideoLibraryViewModel(
  private val contentRepository: ContentRepository,
) : ViewModel() {
  private val mutableUiState = MutableStateFlow(VideoLibraryUiState())
  val uiState: StateFlow<VideoLibraryUiState> = mutableUiState.asStateFlow()

  init {
    refresh()
  }

  fun refresh() {
    viewModelScope.launch {
      val current = mutableUiState.value
      mutableUiState.value = current.copy(isLoading = true, errorMessage = null)
      try {
        mutableUiState.value = contentRepository.loadVideoLibrary()
      } catch (throwable: Throwable) {
        mutableUiState.value =
          current.copy(
            isLoading = false,
            errorMessage = throwable.message ?: "视频内容加载失败，请稍后重试",
          )
      }
    }
  }

  companion object {
    fun factory(contentRepository: ContentRepository): ViewModelProvider.Factory =
      contentFactory { VideoLibraryViewModel(contentRepository) }
  }
}

class PodcastLibraryViewModel(
  private val contentRepository: ContentRepository,
) : ViewModel() {
  private val mutableUiState = MutableStateFlow(PodcastLibraryUiState())
  val uiState: StateFlow<PodcastLibraryUiState> = mutableUiState.asStateFlow()

  init {
    refresh()
  }

  fun refresh() {
    viewModelScope.launch {
      val current = mutableUiState.value
      mutableUiState.value = current.copy(isLoading = true, errorMessage = null)
      try {
        mutableUiState.value = contentRepository.loadPodcastLibrary()
      } catch (throwable: Throwable) {
        mutableUiState.value =
          current.copy(
            isLoading = false,
            errorMessage = throwable.message ?: "播客内容加载失败，请稍后重试",
          )
      }
    }
  }

  companion object {
    fun factory(contentRepository: ContentRepository): ViewModelProvider.Factory =
      contentFactory { PodcastLibraryViewModel(contentRepository) }
  }
}

class PodcastChannelViewModel(
  private val contentRepository: ContentRepository,
  private val channelId: String,
) : ViewModel() {
  private val mutableUiState = MutableStateFlow(PodcastLibraryUiState())
  val uiState: StateFlow<PodcastLibraryUiState> = mutableUiState.asStateFlow()

  init {
    refresh()
  }

  fun refresh() {
    viewModelScope.launch {
      val current = mutableUiState.value
      mutableUiState.value = current.copy(isLoading = true, errorMessage = null)
      try {
        mutableUiState.value = contentRepository.loadPodcastChannelEpisodes(channelId)
      } catch (throwable: Throwable) {
        mutableUiState.value =
          current.copy(
            isLoading = false,
            errorMessage = throwable.message ?: "频道剧集加载失败，请稍后重试",
          )
      }
    }
  }

  companion object {
    fun factory(
      contentRepository: ContentRepository,
      channelId: String,
    ): ViewModelProvider.Factory = contentFactory { PodcastChannelViewModel(contentRepository, channelId) }
  }
}

class PodcastSearchViewModel(
  private val contentRepository: ContentRepository,
) : ViewModel() {
  private val mutableUiState = MutableStateFlow(PodcastSearchUiState())
  val uiState: StateFlow<PodcastSearchUiState> = mutableUiState.asStateFlow()

  fun onQueryChanged(query: String) {
    mutableUiState.update { it.copy(query = query, errorMessage = null) }
  }

  fun submitSearch(query: String = mutableUiState.value.query) {
    val normalized = query.trim()
    if (normalized.isBlank()) return
    viewModelScope.launch {
      mutableUiState.update { it.copy(isLoading = true, errorMessage = null) }
      try {
        mutableUiState.value = contentRepository.searchPodcasts(normalized)
      } catch (throwable: Throwable) {
        mutableUiState.update {
          it.copy(isLoading = false, errorMessage = throwable.message ?: "播客搜索失败")
        }
      }
    }
  }

  companion object {
    fun factory(contentRepository: ContentRepository): ViewModelProvider.Factory =
      contentFactory { PodcastSearchViewModel(contentRepository) }
  }
}

class PodcastHistoryViewModel(
  private val contentRepository: ContentRepository,
) : ViewModel() {
  private val mutableUiState = MutableStateFlow(PodcastHistoryUiState())
  val uiState: StateFlow<PodcastHistoryUiState> = mutableUiState.asStateFlow()

  init {
    refresh()
  }

  fun refresh() {
    viewModelScope.launch {
      mutableUiState.value = mutableUiState.value.copy(isLoading = true, errorMessage = null)
      try {
        mutableUiState.value = contentRepository.loadPodcastHistory()
      } catch (throwable: Throwable) {
        mutableUiState.update {
          it.copy(isLoading = false, errorMessage = throwable.message ?: "播客历史加载失败")
        }
      }
    }
  }

  companion object {
    fun factory(contentRepository: ContentRepository): ViewModelProvider.Factory =
      contentFactory { PodcastHistoryViewModel(contentRepository) }
  }
}

class PodcastPlayerViewModel(
  private val contentRepository: ContentRepository,
  private val episodeId: String,
) : ViewModel() {
  private val mutableUiState = MutableStateFlow(PodcastPlayerUiState())
  val uiState: StateFlow<PodcastPlayerUiState> = mutableUiState.asStateFlow()

  init {
    refresh()
  }

  fun refresh() {
    viewModelScope.launch {
      mutableUiState.value = mutableUiState.value.copy(isLoading = true, errorMessage = null)
      try {
        mutableUiState.value = contentRepository.loadPodcastEpisode(episodeId)
      } catch (throwable: Throwable) {
        mutableUiState.update {
          it.copy(isLoading = false, errorMessage = throwable.message ?: "播客加载失败")
        }
      }
    }
  }

  fun saveProgress(progressSec: Int) {
    if (episodeId.isBlank()) return
    viewModelScope.launch {
      contentRepository.savePodcastProgress(episodeId, progressSec)
    }
  }

  companion object {
    fun factory(
      contentRepository: ContentRepository,
      episodeId: String,
    ): ViewModelProvider.Factory = contentFactory { PodcastPlayerViewModel(contentRepository, episodeId) }
  }
}

class VocabBookViewModel(
  private val contentRepository: ContentRepository,
) : ViewModel() {
  private val mutableUiState = MutableStateFlow(VocabBookUiState())
  val uiState: StateFlow<VocabBookUiState> = mutableUiState.asStateFlow()

  init {
    refresh()
  }

  fun refresh() {
    viewModelScope.launch {
      mutableUiState.value = mutableUiState.value.copy(isLoading = true, errorMessage = null)
      try {
        mutableUiState.value = contentRepository.loadVocabBook()
      } catch (throwable: Throwable) {
        mutableUiState.update {
          it.copy(isLoading = false, errorMessage = throwable.message ?: "词汇本加载失败")
        }
      }
    }
  }

  companion object {
    fun factory(contentRepository: ContentRepository): ViewModelProvider.Factory =
      contentFactory { VocabBookViewModel(contentRepository) }
  }
}

class VocabBookListViewModel(
  private val contentRepository: ContentRepository,
) : ViewModel() {
  private val mutableUiState = MutableStateFlow(VocabBookListUiState())
  val uiState: StateFlow<VocabBookListUiState> = mutableUiState.asStateFlow()

  init {
    refresh()
  }

  fun refresh(search: String = "", category: String = "DUE") {
    viewModelScope.launch {
      mutableUiState.value = mutableUiState.value.copy(isLoading = true, errorMessage = null)
      try {
        mutableUiState.value = contentRepository.loadVocabBookEntries(search, category, null)
      } catch (throwable: Throwable) {
        mutableUiState.update {
          it.copy(isLoading = false, errorMessage = throwable.message ?: "词汇本加载失败")
        }
      }
    }
  }

  fun loadMore(search: String, category: String) {
    val cursor = mutableUiState.value.nextCursor ?: return
    viewModelScope.launch {
      try {
        val loaded = contentRepository.loadVocabBookEntries(search, category, cursor)
        mutableUiState.update {
          it.copy(
            isLoading = false,
            items = it.items + loaded.items,
            nextCursor = loaded.nextCursor,
          )
        }
      } catch (throwable: Throwable) {
        mutableUiState.update {
          it.copy(isLoading = false, errorMessage = throwable.message ?: "词汇本加载失败")
        }
      }
    }
  }

  fun setMastery(wordId: String, mastered: Boolean) {
    viewModelScope.launch {
      val result = contentRepository.setVocabMastery(wordId, mastered)
      if (result.success) {
        mutableUiState.update { state ->
          state.copy(
            items =
              state.items.map { entry ->
                if (entry.id == wordId) {
                  entry.copy(status = if (mastered) "MASTERED" else "LEARNING")
                } else {
                  entry
                }
              },
          )
        }
      } else {
        mutableUiState.update {
          it.copy(errorMessage = result.errorMessage ?: "词汇本更新失败")
        }
      }
    }
  }

  companion object {
    fun factory(contentRepository: ContentRepository): ViewModelProvider.Factory =
      contentFactory { VocabBookListViewModel(contentRepository) }
  }
}

class VocabBookModeViewModel(
  private val contentRepository: ContentRepository,
  private val mode: String,
) : ViewModel() {
  private val mutableUiState = MutableStateFlow(VocabBookModeUiState())
  val uiState: StateFlow<VocabBookModeUiState> = mutableUiState.asStateFlow()

  init {
    refresh()
  }

  fun refresh() {
    viewModelScope.launch {
      mutableUiState.value = mutableUiState.value.copy(isLoading = true, errorMessage = null)
      try {
        mutableUiState.value = contentRepository.loadVocabBookMode(mode)
      } catch (throwable: Throwable) {
        mutableUiState.update {
          it.copy(isLoading = false, errorMessage = throwable.message ?: "词汇本模式加载失败")
        }
      }
    }
  }

  companion object {
    fun factory(contentRepository: ContentRepository, mode: String): ViewModelProvider.Factory =
      contentFactory { VocabBookModeViewModel(contentRepository, mode) }
  }
}

class TypingViewModel(
  private val contentRepository: ContentRepository,
) : ViewModel() {
  private val mutableUiState = MutableStateFlow(TypingSurfaceUiState())
  val uiState: StateFlow<TypingSurfaceUiState> = mutableUiState.asStateFlow()

  init {
    refresh()
  }

  fun refresh() {
    viewModelScope.launch {
      mutableUiState.value = mutableUiState.value.copy(isLoading = true, errorMessage = null)
      try {
        mutableUiState.value = contentRepository.loadTypingSurface()
      } catch (throwable: Throwable) {
        mutableUiState.update {
          it.copy(isLoading = false, errorMessage = throwable.message ?: "打字练习加载失败")
        }
      }
    }
  }

  suspend fun saveRecord(payload: TypingRecordPayload): MutationResult =
    contentRepository.saveTypingRecord(payload)

  companion object {
    fun factory(contentRepository: ContentRepository): ViewModelProvider.Factory =
      contentFactory { TypingViewModel(contentRepository) }
  }
}

class EpubReaderViewModel(
  private val contentRepository: ContentRepository,
  private val slug: String,
) : ViewModel() {
  private val mutableUiState = MutableStateFlow(EpubReaderUiState())
  val uiState: StateFlow<EpubReaderUiState> = mutableUiState.asStateFlow()
  private val mutableCurrentPageIndex = MutableStateFlow(0)
  val currentPageIndex: StateFlow<Int> = mutableCurrentPageIndex.asStateFlow()
  private var didRestoreProgress = false

  init {
    refresh()
  }

  fun refresh() {
    viewModelScope.launch {
      mutableUiState.value = mutableUiState.value.copy(isLoading = true, errorMessage = null)
      try {
        val loaded = contentRepository.loadEpubReader(slug)
        mutableUiState.value = loaded
        val maxIndex = (loaded.totalPages - 1).coerceAtLeast(0)
        val nextIndex = loaded.currentPageIndex.coerceIn(0, maxIndex)
        if (!didRestoreProgress) {
          mutableCurrentPageIndex.value = nextIndex
          didRestoreProgress = true
        } else {
          mutableCurrentPageIndex.value = mutableCurrentPageIndex.value.coerceIn(0, maxIndex)
        }
      } catch (throwable: Throwable) {
        mutableUiState.update {
          it.copy(isLoading = false, errorMessage = throwable.message ?: "阅读内容加载失败")
        }
      }
    }
  }

  fun setCurrentPage(index: Int) {
    val maxIndex = (mutableUiState.value.totalPages - 1).coerceAtLeast(0)
    mutableCurrentPageIndex.value = index.coerceIn(0, maxIndex)
  }

  fun saveReadingProgress() {
    val state = mutableUiState.value
    if (state.sourceBookId.isBlank()) return
    val totalPages = state.totalPages
    val pageIndex = mutableCurrentPageIndex.value
    viewModelScope.launch {
      contentRepository.saveReadingProgress(
        bookId = state.sourceBookId,
        pageIndex = pageIndex,
        totalPages = totalPages,
      )
    }
  }

  companion object {
    fun factory(contentRepository: ContentRepository, slug: String): ViewModelProvider.Factory =
      contentFactory { EpubReaderViewModel(contentRepository, slug) }
  }
}

class VideoDetailViewModel(
  private val contentRepository: ContentRepository,
  private val videoId: String,
) : ViewModel() {
  private val mutableUiState = MutableStateFlow(VideoDetailUiState())
  val uiState: StateFlow<VideoDetailUiState> = mutableUiState.asStateFlow()

  init {
    refresh()
  }

  fun refresh() {
    viewModelScope.launch {
      mutableUiState.value = mutableUiState.value.copy(isLoading = true, errorMessage = null)
      try {
        mutableUiState.value = contentRepository.loadVideoDetail(videoId)
      } catch (throwable: Throwable) {
        mutableUiState.update {
          it.copy(isLoading = false, errorMessage = throwable.message ?: "视频加载失败")
        }
      }
    }
  }

  suspend fun consumeMediaPlay(resourceKey: String): MutationResult =
    contentRepository.consumeMediaPlay(resourceKey)

  suspend fun saveProgress(progressSec: Int, durationSec: Int?): MutationResult =
    contentRepository.saveVideoProgress(videoId, progressSec, durationSec)

  companion object {
    fun factory(
      contentRepository: ContentRepository,
      videoId: String,
    ): ViewModelProvider.Factory = contentFactory { VideoDetailViewModel(contentRepository, videoId) }
  }
}

class AchievementsViewModel(
  private val contentRepository: ContentRepository,
) : ViewModel() {
  private val mutableUiState = MutableStateFlow(AchievementsUiState())
  val uiState: StateFlow<AchievementsUiState> = mutableUiState.asStateFlow()

  init {
    viewModelScope.launch { contentRepository.syncAchievements() }
    refresh()
  }

  fun refresh() {
    viewModelScope.launch {
      mutableUiState.value = mutableUiState.value.copy(isLoading = true, errorMessage = null)
      try {
        mutableUiState.value = contentRepository.loadAchievements()
      } catch (throwable: Throwable) {
        mutableUiState.update {
          it.copy(isLoading = false, errorMessage = throwable.message ?: "成就加载失败")
        }
      }
    }
  }

  companion object {
    fun factory(contentRepository: ContentRepository): ViewModelProvider.Factory =
      contentFactory { AchievementsViewModel(contentRepository) }
  }
}

class ProfileViewModel(
  private val contentRepository: ContentRepository,
) : ViewModel() {
  private val mutableUiState = MutableStateFlow(ProfileUiState())
  val uiState: StateFlow<ProfileUiState> = mutableUiState.asStateFlow()

  init {
    refresh()
    syncAchievements()
  }

  fun refresh() {
    viewModelScope.launch {
      val current = mutableUiState.value
      mutableUiState.value = current.copy(isLoading = true, errorMessage = null)
      try {
        mutableUiState.value = contentRepository.loadProfile()
      } catch (throwable: Throwable) {
        mutableUiState.value =
          current.copy(
            isLoading = false,
            errorMessage = throwable.message ?: "个人资料加载失败，请稍后重试",
          )
      }
    }
  }

  private fun syncAchievements() {
    viewModelScope.launch {
      contentRepository.syncAchievements()
    }
  }

  companion object {
    fun factory(contentRepository: ContentRepository): ViewModelProvider.Factory =
      contentFactory { ProfileViewModel(contentRepository) }
  }
}

class HistoryViewModel(
  private val contentRepository: ContentRepository,
) : ViewModel() {
  private val mutableUiState = MutableStateFlow(HistoryUiState())
  val uiState: StateFlow<HistoryUiState> = mutableUiState.asStateFlow()

  init {
    refresh()
  }

  fun refresh() {
    viewModelScope.launch {
      val current = mutableUiState.value
      mutableUiState.value = current.copy(isLoading = true, errorMessage = null)
      try {
        mutableUiState.value = contentRepository.loadHistory()
      } catch (throwable: Throwable) {
        mutableUiState.value =
          current.copy(
            isLoading = false,
            errorMessage = throwable.message ?: "学习记录加载失败，请稍后重试",
          )
      }
    }
  }

  companion object {
    fun factory(contentRepository: ContentRepository): ViewModelProvider.Factory =
      contentFactory { HistoryViewModel(contentRepository) }
  }
}

class CommunityViewModel(
  private val contentRepository: ContentRepository,
  private val mode: String,
) : ViewModel() {
  private val mutableUiState = MutableStateFlow(CommunityUiState())
  val uiState: StateFlow<CommunityUiState> = mutableUiState.asStateFlow()

  private val mutableLikeInFlightIds = MutableStateFlow<Set<String>>(emptySet())
  val likeInFlightIds: StateFlow<Set<String>> = mutableLikeInFlightIds.asStateFlow()

  init {
    refresh()
  }

  fun refresh() {
    viewModelScope.launch {
      val current = mutableUiState.value
      mutableUiState.value = current.copy(isLoading = true, errorMessage = null)
      try {
        mutableUiState.value = contentRepository.loadCommunity(mode)
      } catch (throwable: Throwable) {
        mutableUiState.value =
          current.copy(
            isLoading = false,
            errorMessage = throwable.message ?: "社区数据加载失败，请稍后重试",
          )
      }
    }
  }

  fun sendFriendRequestByCode(code: String) {
    viewModelScope.launch {
      val result = contentRepository.sendFriendRequestByCode(code)
      if (result.success) {
        refresh()
      } else {
        mutableUiState.update {
          it.copy(errorMessage = result.errorMessage ?: "好友请求发送失败")
        }
      }
    }
  }

  fun respondFriendRequest(targetUserId: String, action: String) {
    viewModelScope.launch {
      val result = contentRepository.respondFriendRequest(targetUserId, action)
      if (result.success) {
        refresh()
      }
    }
  }

  fun regenerateFriendCode() {
    viewModelScope.launch {
      val result = contentRepository.regenerateFriendCode()
      if (result.success) {
        refresh()
      }
    }
  }

  fun toggleActivityLike(activityId: String, likedByMe: Boolean) {
    val normalizedId = activityId.trim()
    if (normalizedId.isBlank()) return
    if (mutableLikeInFlightIds.value.contains(normalizedId)) return
    viewModelScope.launch {
      mutableLikeInFlightIds.update { it + normalizedId }
      val result =
        if (likedByMe) {
          contentRepository.unlikeActivity(normalizedId)
        } else {
          contentRepository.likeActivity(normalizedId)
        }
      mutableLikeInFlightIds.update { it - normalizedId }
      if (result.success) {
        refresh()
      }
    }
  }

  companion object {
    fun factory(
      contentRepository: ContentRepository,
      mode: String,
    ): ViewModelProvider.Factory = contentFactory { CommunityViewModel(contentRepository, mode) }
  }
}

class PricingViewModel(
  private val contentRepository: ContentRepository,
) : ViewModel() {
  private val mutableUiState = MutableStateFlow(PricingUiState())
  val uiState: StateFlow<PricingUiState> = mutableUiState.asStateFlow()

  init {
    refresh()
  }

  fun refresh() {
    viewModelScope.launch {
      val current = mutableUiState.value
      mutableUiState.value = current.copy(isLoading = true, errorMessage = null)
      try {
        mutableUiState.value = contentRepository.loadPricing()
      } catch (throwable: Throwable) {
        mutableUiState.value =
          current.copy(
            isLoading = false,
            errorMessage = throwable.message ?: "订阅信息加载失败，请稍后重试",
          )
      }
    }
  }

  companion object {
    fun factory(contentRepository: ContentRepository): ViewModelProvider.Factory =
      contentFactory { PricingViewModel(contentRepository) }
  }
}

class SettingsViewModel(
  private val contentRepository: ContentRepository,
) : ViewModel() {
  private val mutableUiState = MutableStateFlow(SettingsUiState())
  val uiState: StateFlow<SettingsUiState> = mutableUiState.asStateFlow()

  init {
    refresh()
  }

  fun refresh() {
    viewModelScope.launch {
      val current = mutableUiState.value
      mutableUiState.value = current.copy(isLoading = true, errorMessage = null)
      try {
        mutableUiState.value = contentRepository.loadSettings()
      } catch (throwable: Throwable) {
        mutableUiState.value =
          current.copy(
            isLoading = false,
            errorMessage = throwable.message ?: "设置加载失败，请稍后重试",
          )
      }
    }
  }

  fun toggleSetting(key: String) {
    viewModelScope.launch {
      val current = mutableUiState.value
      mutableUiState.value = current.copy(isLoading = true, errorMessage = null)
      try {
        mutableUiState.value = contentRepository.toggleSetting(key)
      } catch (throwable: Throwable) {
        mutableUiState.value =
          current.copy(
            isLoading = false,
            errorMessage = throwable.message ?: "设置保存失败，请稍后重试",
          )
      }
    }
  }

  companion object {
    fun factory(contentRepository: ContentRepository): ViewModelProvider.Factory =
      contentFactory { SettingsViewModel(contentRepository) }
  }
}

class TopikHistoryViewModel(
  private val contentRepository: ContentRepository,
) : ViewModel() {
  private val mutableUiState = MutableStateFlow(TopikHistoryUiState())
  val uiState: StateFlow<TopikHistoryUiState> = mutableUiState.asStateFlow()

  init {
    refresh()
  }

  fun refresh() {
    viewModelScope.launch {
      val current = mutableUiState.value
      mutableUiState.value = current.copy(isLoading = true, errorMessage = null)
      try {
        mutableUiState.value = contentRepository.loadTopikHistory()
      } catch (throwable: Throwable) {
        mutableUiState.value =
          current.copy(
            isLoading = false,
            errorMessage = throwable.message ?: "TOPIK 历史加载失败，请稍后重试",
          )
      }
    }
  }

  companion object {
    fun factory(contentRepository: ContentRepository): ViewModelProvider.Factory =
      contentFactory { TopikHistoryViewModel(contentRepository) }
  }
}

class WritingEvaluationViewModel(
  private val contentRepository: ContentRepository,
  private val sessionId: String,
) : ViewModel() {
  private val mutableUiState = MutableStateFlow(WritingEvaluationUiState())
  val uiState: StateFlow<WritingEvaluationUiState> = mutableUiState.asStateFlow()

  init { refresh() }

  fun refresh() {
    viewModelScope.launch {
      mutableUiState.value = WritingEvaluationUiState(isLoading = true, sessionId = sessionId)
      try {
        mutableUiState.value = contentRepository.loadWritingEvaluation(sessionId)
      } catch (t: Throwable) {
        mutableUiState.value = WritingEvaluationUiState(isLoading = false, sessionId = sessionId, errorMessage = t.message ?: "加载写作评价失败")
      }
    }
  }

  companion object {
    fun factory(contentRepository: ContentRepository, sessionId: String): ViewModelProvider.Factory =
      contentFactory { WritingEvaluationViewModel(contentRepository, sessionId) }
  }
}

class PodcastSubscriptionsViewModel(
  private val contentRepository: ContentRepository,
) : ViewModel() {
  private val mutableUiState = MutableStateFlow(PodcastSubscriptionsUiState())
  val uiState: StateFlow<PodcastSubscriptionsUiState> = mutableUiState.asStateFlow()

  init { refresh() }

  fun refresh() {
    viewModelScope.launch {
      mutableUiState.value = PodcastSubscriptionsUiState(isLoading = true)
      try {
        mutableUiState.value = contentRepository.loadPodcastSubscriptions()
      } catch (t: Throwable) {
        mutableUiState.value = PodcastSubscriptionsUiState(isLoading = false, errorMessage = t.message ?: "加载播客订阅失败")
      }
    }
  }

  fun toggleSubscription(itunesId: String, title: String, author: String, feedUrl: String, artworkUrl: String) {
    viewModelScope.launch {
      contentRepository.togglePodcastSubscription(itunesId, title, author, feedUrl, artworkUrl)
      refresh()
    }
  }

  companion object {
    fun factory(contentRepository: ContentRepository): ViewModelProvider.Factory =
      contentFactory { PodcastSubscriptionsViewModel(contentRepository) }
  }
}

class SubscriptionDetailViewModel(
  private val contentRepository: ContentRepository,
) : ViewModel() {
  private val mutableUiState = MutableStateFlow(SubscriptionDetailUiState())
  val uiState: StateFlow<SubscriptionDetailUiState> = mutableUiState.asStateFlow()

  init { refresh() }

  fun refresh() {
    viewModelScope.launch {
      mutableUiState.value = SubscriptionDetailUiState(isLoading = true)
      try {
        mutableUiState.value = contentRepository.loadSubscriptionDetail()
      } catch (t: Throwable) {
        mutableUiState.value = SubscriptionDetailUiState(isLoading = false, errorMessage = t.message ?: "加载订阅详情失败")
      }
    }
  }

  suspend fun createCheckout(plan: String, billingInterval: String) =
    contentRepository.createCheckout(plan, billingInterval)

  companion object {
    fun factory(contentRepository: ContentRepository): ViewModelProvider.Factory =
      contentFactory { SubscriptionDetailViewModel(contentRepository) }
  }
}

class ReadingArticleViewModel(
  private val contentRepository: ContentRepository,
  private val articleId: String,
) : ViewModel() {
  private val mutableUiState = MutableStateFlow(ReadingArticleUiState())
  val uiState: StateFlow<ReadingArticleUiState> = mutableUiState.asStateFlow()

  init { refresh() }

  fun refresh() {
    viewModelScope.launch {
      mutableUiState.value = ReadingArticleUiState(isLoading = true, articleId = articleId)
      try {
        val loaded = contentRepository.loadReadingArticle(articleId)
        mutableUiState.value = loaded
        if (!loaded.isRead && loaded.errorMessage == null) {
          contentRepository.markArticleRead(articleId)
        }
      } catch (t: Throwable) {
        mutableUiState.value = ReadingArticleUiState(isLoading = false, articleId = articleId, errorMessage = t.message ?: "加载文章失败")
      }
    }
  }

  companion object {
    fun factory(contentRepository: ContentRepository, articleId: String): ViewModelProvider.Factory =
      contentFactory { ReadingArticleViewModel(contentRepository, articleId) }
  }
}

private inline fun <reified T : ViewModel> contentFactory(crossinline creator: () -> T): ViewModelProvider.Factory =
  object : ViewModelProvider.Factory {
    @Suppress("UNCHECKED_CAST")
    override fun <VM : ViewModel> create(modelClass: Class<VM>): VM = creator() as VM
  }
