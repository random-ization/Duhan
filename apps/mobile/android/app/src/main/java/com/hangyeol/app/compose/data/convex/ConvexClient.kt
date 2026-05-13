package com.hangyeol.app.compose.data.convex

import com.hangyeol.app.compose.data.convex.auth.SecureTokenStore
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put

sealed class ConvexResult<out T> {
    data class Success<T>(val value: T) : ConvexResult<T>()
    data class Error(val message: String, val code: String? = null) : ConvexResult<Nothing>()
}

class ConvexClient(
    private val queryApi: ConvexQueryApi,
    private val tokenStore: SecureTokenStore,
    private val json: Json,
) {
    suspend fun query(path: String, args: JsonObject = JsonObject(emptyMap())): ConvexResult<JsonElement> {
        return execute("query", path, args)
    }

    suspend fun mutation(path: String, args: JsonObject = JsonObject(emptyMap())): ConvexResult<JsonElement> {
        return execute("mutation", path, args)
    }

    suspend fun action(path: String, args: JsonObject = JsonObject(emptyMap())): ConvexResult<JsonElement> {
        return execute("action", path, args)
    }

    private suspend fun execute(type: String, path: String, args: JsonObject): ConvexResult<JsonElement> {
        val body = buildJsonObject {
            put("path", path)
            put("args", args)
            put("format", "json")
        }
        val authHeader = tokenStore.getBearerHeader()

        val response = when (type) {
            "query" -> queryApi.query(authHeader, body)
            "mutation" -> queryApi.mutation(authHeader, body)
            "action" -> queryApi.action(authHeader, body)
            else -> return ConvexResult.Error("Invalid operation type")
        }

        if (!response.isSuccessful) {
            val errorBody = response.errorBody()?.string() ?: "Unknown error"
            if (response.code() == 401) {
                return ConvexResult.Error("UNAUTHENTICATED", "401")
            }
            return ConvexResult.Error(errorBody, response.code().toString())
        }

        val responseBody = response.body()
        if (responseBody == null) {
            return ConvexResult.Success(JsonNull)
        }

        val status = (responseBody["status"] as? JsonPrimitive)?.content
        if (status == "error") {
            val errorMessage = (responseBody["errorMessage"] as? JsonPrimitive)?.content ?: "Unknown error"
            return ConvexResult.Error(errorMessage)
        }

        val value = responseBody["value"] ?: JsonNull
        return ConvexResult.Success(value)
    }
}
