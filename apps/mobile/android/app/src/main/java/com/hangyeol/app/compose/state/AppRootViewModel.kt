package com.hangyeol.app.compose.state

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.hangyeol.app.compose.data.SessionRepository
import com.hangyeol.app.compose.data.SessionUiState
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

class AppRootViewModel(
  private val sessionRepository: SessionRepository,
) : ViewModel() {
  val sessionState: StateFlow<SessionUiState> = sessionRepository.sessionState

  init {
    viewModelScope.launch { sessionRepository.bootstrap() }
  }

  fun signInPreview() {
    sessionRepository.signInPreview()
  }

  fun signOut() {
    sessionRepository.signOut()
  }

  companion object {
    fun factory(sessionRepository: SessionRepository): ViewModelProvider.Factory =
      object : ViewModelProvider.Factory {
        @Suppress("UNCHECKED_CAST")
        override fun <T : ViewModel> create(modelClass: Class<T>): T =
          AppRootViewModel(sessionRepository) as T
      }
  }
}
