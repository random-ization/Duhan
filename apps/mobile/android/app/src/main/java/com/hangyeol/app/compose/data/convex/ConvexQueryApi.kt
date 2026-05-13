package com.hangyeol.app.compose.data.convex

import kotlinx.serialization.json.JsonObject
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.Header
import retrofit2.http.POST

/**
 * Low-level Convex HTTP API for queries, mutations, and actions.
 * Uses the standard Convex HTTP transport: POST with { path, args, format: "json" }.
 */
interface ConvexQueryApi {
    @POST("/api/query")
    suspend fun query(
        @Header("Authorization") authToken: String?,
        @Body body: JsonObject,
    ): Response<JsonObject>

    @POST("/api/mutation")
    suspend fun mutation(
        @Header("Authorization") authToken: String?,
        @Body body: JsonObject,
    ): Response<JsonObject>

    @POST("/api/action")
    suspend fun action(
        @Header("Authorization") authToken: String?,
        @Body body: JsonObject,
    ): Response<JsonObject>
}
