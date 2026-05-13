package com.hangyeol.app.compose.data.convex.dto

import kotlinx.serialization.Serializable

@Serializable
data class SignInRequest(
    val email: String,
    val password: String,
)

@Serializable
data class SignUpRequest(
    val email: String,
    val password: String,
    val name: String? = null,
)

@Serializable
data class RefreshRequest(
    val refreshToken: String,
)

@Serializable
data class OAuthExchangeRequest(
    val code: String,
    val verifier: String,
)

@Serializable
data class AuthTokensResponse(
    val token: String,
    val refreshToken: String,
)

@Serializable
data class ErrorResponse(
    val error: String,
)
