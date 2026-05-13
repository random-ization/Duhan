package com.hangyeol.app.compose.data.convex

import com.hangyeol.app.compose.data.convex.dto.AuthTokensResponse
import com.hangyeol.app.compose.data.convex.dto.ErrorResponse
import com.hangyeol.app.compose.data.convex.dto.SignInRequest
import com.hangyeol.app.compose.data.convex.dto.SignUpRequest
import com.hangyeol.app.compose.data.convex.dto.RefreshRequest
import com.hangyeol.app.compose.data.convex.dto.OAuthExchangeRequest
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.POST

interface ConvexAuthApi {
    @POST("/api/mobile/auth/signIn")
    suspend fun signIn(@Body request: SignInRequest): Response<AuthTokensResponse>

    @POST("/api/mobile/auth/signUp")
    suspend fun signUp(@Body request: SignUpRequest): Response<AuthTokensResponse>

    @POST("/api/mobile/auth/refresh")
    suspend fun refresh(@Body request: RefreshRequest): Response<AuthTokensResponse>

    @POST("/api/mobile/auth/signOut")
    suspend fun signOut(): Response<Unit>

    @POST("/api/mobile/auth/oauth/exchange")
    suspend fun oauthExchange(@Body request: OAuthExchangeRequest): Response<AuthTokensResponse>
}
