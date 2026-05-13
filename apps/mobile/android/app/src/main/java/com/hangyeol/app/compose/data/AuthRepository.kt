package com.hangyeol.app.compose.data

import kotlinx.coroutines.delay

data class AuthFormState(
  val name: String = "",
  val email: String = "",
  val password: String = "",
  val isSubmitting: Boolean = false,
  val errorMessage: String? = null,
)

interface AuthRepository {
  suspend fun submitPreview(
    isRegister: Boolean,
    state: AuthFormState,
  ): Result<Unit>

  suspend fun submitOAuthExchange(
    code: String,
    verifier: String,
  ): Result<Unit> = Result.failure(IllegalArgumentException("当前环境不支持 OAuth 登录"))
}

class InMemoryAuthRepository : AuthRepository {
  override suspend fun submitPreview(
    isRegister: Boolean,
    state: AuthFormState,
  ): Result<Unit> {
    delay(300)

    if (isRegister && state.name.isBlank()) {
      return Result.failure(IllegalArgumentException("请输入昵称"))
    }

    if (state.email.isBlank()) {
      return Result.failure(IllegalArgumentException("请输入电子邮箱"))
    }

    if (!state.email.contains("@")) {
      return Result.failure(IllegalArgumentException("请输入有效的电子邮箱"))
    }

    if (state.password.isBlank()) {
      return Result.failure(IllegalArgumentException("请输入密码"))
    }

    if (isRegister && state.password.length < 8) {
      return Result.failure(IllegalArgumentException("注册密码至少需要 8 位"))
    }

    return Result.success(Unit)
  }
}
