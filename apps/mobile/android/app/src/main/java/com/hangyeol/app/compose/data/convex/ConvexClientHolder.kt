package com.hangyeol.app.compose.data.convex

import com.jakewharton.retrofit2.converter.kotlinx.serialization.asConverterFactory
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import java.util.concurrent.TimeUnit

object ConvexClientHolder {
    private lateinit var baseUrl: String
    private lateinit var authBaseUrl: String
    private lateinit var okHttpClient: OkHttpClient
    private lateinit var queryRetrofit: Retrofit
    private lateinit var authRetrofit: Retrofit

    private val json = Json {
        ignoreUnknownKeys = true
        coerceInputValues = true
        encodeDefaults = true
    }

    fun initialize(convexUrl: String, debug: Boolean = false) {
        baseUrl = ensureTrailingSlash(convexUrl)
        authBaseUrl = resolveAuthBaseUrl(baseUrl)

        val clientBuilder = OkHttpClient.Builder()
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .writeTimeout(30, TimeUnit.SECONDS)

        if (debug) {
            val logging = HttpLoggingInterceptor().apply {
                level = HttpLoggingInterceptor.Level.BODY
            }
            clientBuilder.addInterceptor(logging)
        }

        okHttpClient = clientBuilder.build()

        queryRetrofit = Retrofit.Builder()
            .baseUrl(baseUrl)
            .client(okHttpClient)
            .addConverterFactory(json.asConverterFactory("application/json".toMediaType()))
            .build()

        authRetrofit = Retrofit.Builder()
            .baseUrl(authBaseUrl)
            .client(okHttpClient)
            .addConverterFactory(json.asConverterFactory("application/json".toMediaType()))
            .build()
    }

    fun getAuthApi(): ConvexAuthApi {
        return authRetrofit.create(ConvexAuthApi::class.java)
    }

    fun getQueryApi(): ConvexQueryApi {
        return queryRetrofit.create(ConvexQueryApi::class.java)
    }

    fun getBaseUrl(): String = baseUrl
    fun getAuthBaseUrl(): String = authBaseUrl
    fun getJson(): Json = json

    private fun ensureTrailingSlash(url: String): String {
        val trimmed = url.trim()
        return if (trimmed.endsWith("/")) trimmed else "$trimmed/"
    }

    private fun resolveAuthBaseUrl(queryBaseUrl: String): String {
        return try {
            val queryUrl = java.net.URL(queryBaseUrl)
            val host = queryUrl.host
            if (host.endsWith(".convex.cloud")) {
                val authHost = host.removeSuffix(".convex.cloud") + ".convex.site"
                java.net.URL(queryUrl.protocol, authHost, queryUrl.port, "/").toString()
            } else {
                queryBaseUrl
            }
        } catch (_: Exception) {
            queryBaseUrl
        }
    }
}
