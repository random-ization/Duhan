package com.hangyeol.app.compose.state

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.hangyeol.app.compose.data.AuthFormState
import com.hangyeol.app.compose.data.AuthRepository
import com.hangyeol.app.compose.data.SessionRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

class AuthViewModel(
  private val authRepository: AuthRepository,
  private val sessionRepository: SessionRepository,
) : ViewModel() {
  private val mutableUiState = MutableStateFlow(AuthFormState())
  val uiState: StateFlow<AuthFormState> = mutableUiState.asStateFlow()

  fun onNameChanged(value: String) {
    mutableUiState.update { it.copy(name = value, errorMessage = null) }
  }

  fun onEmailChanged(value: String) {
    mutableUiState.update { it.copy(email = value, errorMessage = null) }
  }

  fun onPasswordChanged(value: String) {
    mutableUiState.update { it.copy(password = value, errorMessage = null) }
  }

  fun submitPreview(
    isRegister: Boolean,
    onSuccess: () -> Unit,
  ) {
    viewModelScope.launch {
      val current = mutableUiState.value
      mutableUiState.update { it.copy(isSubmitting = true, errorMessage = null) }

      val result = authRepository.submitPreview(isRegister = isRegister, state = current)
      result
        .onSuccess {
          sessionRepository.signInPreview(
            displayName =
              if (isRegister) {
                current.name.ifBlank { null }
              } else {
                null
              },
          )
          mutableUiState.update { it.copy(isSubmitting = false, errorMessage = null) }
          onSuccess()
        }
        .onFailure { throwable ->
          mutableUiState.update {
            it.copy(
              isSubmitting = false,
              errorMessage = throwable.message ?: "提交失败，请稍后重试",
            )
          }
        }
    }
  }

  fun submitOAuthExchange(
    code: String,
    verifier: String,
    onSuccess: () -> Unit,
  ) {
    viewModelScope.launch {
      mutableUiState.update { it.copy(isSubmitting = true, errorMessage = null) }
      val result = authRepository.submitOAuthExchange(code = code, verifier = verifier)
      result
        .onSuccess {
          sessionRepository.signInPreview(displayName = null)
          mutableUiState.update { it.copy(isSubmitting = false, errorMessage = null) }
          onSuccess()
        }
        .onFailure { throwable ->
          mutableUiState.update {
            it.copy(
              isSubmitting = false,
              errorMessage = throwable.message ?: "OAuth 登录失败，请稍后重试",
            )
          }
        }
    }
  }

  companion object {
    fun factory(
      authRepository: AuthRepository,
      sessionRepository: SessionRepository,
    ): ViewModelProvider.Factory =
      object : ViewModelProvider.Factory {
        @Suppress("UNCHECKED_CAST")
        override fun <T : ViewModel> create(modelClass: Class<T>): T =
          AuthViewModel(authRepository, sessionRepository) as T
      }
  }
}
