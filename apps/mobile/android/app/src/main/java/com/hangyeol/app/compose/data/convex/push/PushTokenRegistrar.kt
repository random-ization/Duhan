package com.hangyeol.app.compose.data.convex.push

import android.content.Context
import android.content.SharedPreferences
import android.os.Build
import android.util.Log
import com.google.firebase.FirebaseApp
import com.google.firebase.FirebaseOptions
import com.google.firebase.messaging.FirebaseMessaging
import com.hangyeol.app.BuildConfig
import com.hangyeol.app.compose.data.convex.ConvexClient
import com.hangyeol.app.compose.data.convex.ConvexResult
import com.hangyeol.app.compose.data.convex.auth.SecureTokenStore
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlin.coroutines.resume

class PushTokenRegistrar(
    context: Context,
    private val client: ConvexClient,
    private val tokenStore: SecureTokenStore,
) {
    private val appContext: Context = context.applicationContext
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private val prefs: SharedPreferences =
        appContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    fun enqueueSync(reason: String, forcedToken: String? = null) {
        scope.launch {
            syncWithRetry(reason = reason, forcedToken = forcedToken)
        }
    }

    private suspend fun syncWithRetry(reason: String, forcedToken: String?) {
        var attempt = 1
        while (attempt <= MAX_SYNC_ATTEMPTS) {
            val attemptReason = "$reason#attempt$attempt"
            val success = syncNow(reason = attemptReason, forcedToken = forcedToken)
            if (success) {
                return
            }
            if (!tokenStore.hasTokens()) {
                return
            }
            if (attempt >= MAX_SYNC_ATTEMPTS) {
                Log.w(TAG, "FCM token sync failed after $attempt attempts ($reason)")
                return
            }
            delay(syncRetryDelayMs(attempt))
            attempt += 1
        }
    }

    suspend fun syncNow(reason: String, forcedToken: String? = null): Boolean {
        if (!tokenStore.hasTokens()) {
            return false
        }

        if (!isFirebaseAvailable()) {
            Log.i(TAG, "Skip FCM token sync ($reason): Firebase is not configured")
            return false
        }

        val token =
            forcedToken
                ?.trim()
                ?.takeIf { it.isNotEmpty() }
                ?: fetchFcmToken()
                ?: return false

        val accessToken = tokenStore.getAccessToken().orEmpty()
        val syncFingerprint = buildSyncFingerprint(token = token, accessToken = accessToken)
        val lastSyncedFingerprint = prefs.getString(KEY_LAST_SYNCED_FINGERPRINT, null)
        if (syncFingerprint == lastSyncedFingerprint) {
            return true
        }

        return when (client.mutation("users:registerPushToken", buildRegisterArgs(token))) {
            is ConvexResult.Success -> {
                prefs.edit().putString(KEY_LAST_SYNCED_FINGERPRINT, syncFingerprint).apply()
                true
            }
            is ConvexResult.Error -> {
                Log.w(TAG, "registerPushToken mutation failed ($reason)")
                false
            }
        }
    }

    private fun syncRetryDelayMs(attempt: Int): Long =
        when (attempt) {
            1 -> 5_000L
            2 -> 15_000L
            else -> 30_000L
        }

    private fun isFirebaseAvailable(): Boolean {
        return runCatching {
            when {
                FirebaseApp.getApps(appContext).isNotEmpty() -> true
                FirebaseApp.initializeApp(appContext) != null -> true
                else -> initializeFirebaseFromBuildConfig()
            }
        }.getOrDefault(false)
    }

    private fun initializeFirebaseFromBuildConfig(): Boolean {
        val config = resolveRuntimeConfig() ?: return false
        val optionsBuilder =
            FirebaseOptions.Builder()
                .setApiKey(config.apiKey)
                .setApplicationId(config.appId)
                .setProjectId(config.projectId)
                .setGcmSenderId(config.senderId)

        config.storageBucket?.let { optionsBuilder.setStorageBucket(it) }
        config.databaseUrl?.let { optionsBuilder.setDatabaseUrl(it) }

        FirebaseApp.initializeApp(appContext, optionsBuilder.build())
        return FirebaseApp.getApps(appContext).isNotEmpty()
    }

    private fun resolveRuntimeConfig(): FirebaseRuntimeConfig? {
        val apiKey = BuildConfig.FIREBASE_API_KEY.trim()
        val appId = BuildConfig.FIREBASE_APP_ID.trim()
        val projectId = BuildConfig.FIREBASE_PROJECT_ID.trim()
        val senderId = BuildConfig.FIREBASE_SENDER_ID.trim()
        if (apiKey.isEmpty() || appId.isEmpty() || projectId.isEmpty() || senderId.isEmpty()) {
            return null
        }

        return FirebaseRuntimeConfig(
            apiKey = apiKey,
            appId = appId,
            projectId = projectId,
            senderId = senderId,
            storageBucket = BuildConfig.FIREBASE_STORAGE_BUCKET.trim().ifEmpty { null },
            databaseUrl = BuildConfig.FIREBASE_DATABASE_URL.trim().ifEmpty { null },
        )
    }

    private suspend fun fetchFcmToken(): String? {
        return suspendCancellableCoroutine { continuation ->
            val task =
                runCatching { FirebaseMessaging.getInstance().token }
                    .getOrElse {
                        Log.w(TAG, "FCM token task initialization failed", it)
                        continuation.resume(null)
                        return@suspendCancellableCoroutine
                    }

            task.addOnCompleteListener { completedTask ->
                if (!continuation.isActive) {
                    return@addOnCompleteListener
                }
                if (!completedTask.isSuccessful) {
                    Log.w(TAG, "Failed to fetch FCM token", completedTask.exception)
                    continuation.resume(null)
                    return@addOnCompleteListener
                }

                val resolvedToken = completedTask.result?.trim().orEmpty()
                continuation.resume(resolvedToken.takeIf { it.isNotEmpty() })
            }
        }
    }

    private fun buildRegisterArgs(token: String): JsonObject {
        val userAgent = buildUserAgent()
        return JsonObject(
            mapOf(
                "platform" to JsonPrimitive("android"),
                "fcmToken" to JsonPrimitive(token),
                "userAgent" to JsonPrimitive(userAgent),
            ),
        )
    }

    private fun buildUserAgent(): String {
        val manufacturer = Build.MANUFACTURER.trim().ifEmpty { "unknown" }
        val model = Build.MODEL.trim().ifEmpty { "unknown" }
        return "HangyeolAndroid/$manufacturer-$model API${Build.VERSION.SDK_INT}"
    }

    private fun buildSyncFingerprint(token: String, accessToken: String): String {
        val accessHash = accessToken.hashCode()
        return "$token::$accessHash"
    }

    private data class FirebaseRuntimeConfig(
        val apiKey: String,
        val appId: String,
        val projectId: String,
        val senderId: String,
        val storageBucket: String?,
        val databaseUrl: String?,
    )

    private companion object {
        const val TAG = "PushTokenRegistrar"
        const val PREFS_NAME = "hangyeol_push_sync"
        const val KEY_LAST_SYNCED_FINGERPRINT = "last_synced_fingerprint"
        const val MAX_SYNC_ATTEMPTS = 3
    }
}
