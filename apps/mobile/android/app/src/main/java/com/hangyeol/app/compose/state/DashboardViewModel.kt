package com.hangyeol.app.compose.state

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.hangyeol.app.compose.data.DashboardFeedItem
import com.hangyeol.app.compose.data.DashboardRepository
import com.hangyeol.app.compose.data.DashboardUiState
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

class DashboardViewModel(
  private val dashboardRepository: DashboardRepository,
) : ViewModel() {
  private val mutableUiState = MutableStateFlow(DashboardUiState())
  val uiState: StateFlow<DashboardUiState> = mutableUiState.asStateFlow()

  private val mutableClaimInProgress = MutableStateFlow(false)
  val claimInProgress: StateFlow<Boolean> = mutableClaimInProgress.asStateFlow()

  private val mutableLikeInFlightIds = MutableStateFlow<Set<String>>(emptySet())
  val likeInFlightIds: StateFlow<Set<String>> = mutableLikeInFlightIds.asStateFlow()

  init {
    refresh()
  }

  fun refresh() {
    viewModelScope.launch {
      mutableUiState.value = mutableUiState.value.copy(isLoading = true)
      mutableUiState.value = dashboardRepository.loadDashboard()
    }
  }

  fun claimDailyChallenge() {
    if (mutableClaimInProgress.value) return
    viewModelScope.launch {
      mutableClaimInProgress.value = true
      val result = dashboardRepository.claimDailyChallenge()
      mutableClaimInProgress.value = false
      if (result.success) {
        refresh()
      }
    }
  }

  fun markNotificationsRead() {
    viewModelScope.launch {
      val result = dashboardRepository.markNotificationsRead()
      if (result.success) {
        refresh()
      }
    }
  }

  fun toggleActivityLike(item: DashboardFeedItem) {
    val activityId = item.activityId.trim()
    if (activityId.isBlank()) return
    if (mutableLikeInFlightIds.value.contains(activityId)) return
    viewModelScope.launch {
      mutableLikeInFlightIds.update { it + activityId }
      val result =
        if (item.likedByMe) {
          dashboardRepository.unlikeActivity(activityId)
        } else {
          dashboardRepository.likeActivity(activityId)
        }
      mutableLikeInFlightIds.update { it - activityId }
      if (result.success) {
        refresh()
      }
    }
  }

  companion object {
    fun factory(dashboardRepository: DashboardRepository): ViewModelProvider.Factory =
      object : ViewModelProvider.Factory {
        @Suppress("UNCHECKED_CAST")
        override fun <T : ViewModel> create(modelClass: Class<T>): T =
          DashboardViewModel(dashboardRepository) as T
      }
  }
}
