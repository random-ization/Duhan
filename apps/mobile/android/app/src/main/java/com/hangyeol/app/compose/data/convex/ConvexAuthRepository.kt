package com.hangyeol.app.compose.data.convex

import com.hangyeol.app.compose.data.AuthFormState
import com.hangyeol.app.compose.data.AuthRepository
import com.hangyeol.app.compose.data.convex.auth.SecureTokenStore
import com.hangyeol.app.compose.data.convex.dto.OAuthExchangeRequest
import com.hangyeol.app.compose.data.convex.dto.SignInRequest
import com.hangyeol.app.compose.data.convex.dto.SignUpRequest
import kotlinx.serialization.json.Json

class ConvexAuthRepository(
    private val authApi: ConvexAuthApi,
    private val tokenStore: SecureTokenStore,
    private val onAuthSuccess: (displayName: String?) -> Unit,
    private val json: Json,
) : AuthRepository {

    override suspend fun submitPreview(
        isRegister: Boolean,
        state: AuthFormState,
    ): Result<Unit> {
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

        return try {
            val response = if (isRegister) {
                authApi.signUp(
                    SignUpRequest(
                        email = state.email.trim().lowercase(),
                        password = state.password,
                        name = state.name.takeIf { it.isNotBlank() },
                    )
                )
            } else {
                authApi.signIn(
                    SignInRequest(
                        email = state.email.trim().lowercase(),
                        password = state.password,
                    )
                )
            }

            if (response.isSuccessful && response.body() != null) {
                val tokens = response.body()!!
                tokenStore.saveTokens(tokens.token, tokens.refreshToken)
                onAuthSuccess(state.name.takeIf { it.isNotBlank() })
                Result.success(Unit)
            } else {
                val errorBody = response.errorBody()?.string()
                val errorMessage = parseErrorMessage(errorBody, isRegister)
                Result.failure(IllegalArgumentException(errorMessage))
            }
        } catch (e: Exception) {
            Result.failure(IllegalArgumentException("网络错误，请检查网络连接"))
        }
    }

    override suspend fun submitOAuthExchange(
        code: String,
        verifier: String,
    ): Result<Unit> {
        if (code.isBlank() || verifier.isBlank()) {
            return Result.failure(IllegalArgumentException("OAuth 参数无效，请重试"))
        }
        return try {
            val response = authApi.oauthExchange(
                OAuthExchangeRequest(
                    code = code,
                    verifier = verifier,
                ),
            )
            if (response.isSuccessful && response.body() != null) {
                val tokens = response.body()!!
                tokenStore.saveTokens(tokens.token, tokens.refreshToken)
                onAuthSuccess(null)
                Result.success(Unit)
            } else {
                val errorBody = response.errorBody()?.string()
                Result.failure(IllegalArgumentException(parseErrorMessage(errorBody, isRegister = false)))
            }
        } catch (_: Exception) {
            Result.failure(IllegalArgumentException("OAuth 登录失败，请检查网络后重试"))
        }
    }

    private fun parseErrorMessage(errorBody: String?, isRegister: Boolean): String {
        if (errorBody == null) {
            return if (isRegister) "注册失败" else "登录失败"
        }
        return try {
            val errorResponse = json.decodeFromString<com.hangyeol.app.compose.data.convex.dto.ErrorResponse>(errorBody)
            when (errorResponse.error) {
                "MISSING_CREDENTIALS" -> "请填写邮箱和密码"
                "INVALID_CREDENTIALS" -> "邮箱或密码错误"
                "ACCOUNT_EXISTS_LINK_REQUIRED" -> "该邮箱已注册，请直接登录"
                "INCORRECT_PASSWORD" -> "密码错误"
                "EMAIL_REQUIRED" -> "请输入邮箱"
                else -> errorResponse.error
            }
        } catch (e: Exception) {
            if (isRegister) "注册失败，请稍后再试" else "登录失败，请稍后再试"
        }
    }
}
