package com.hangyeol.app.compose.data.convex

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.intPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.hangyeol.app.compose.data.SessionRepository
import com.hangyeol.app.compose.data.SessionUiState
import com.hangyeol.app.compose.data.convex.auth.SecureTokenStore
import com.hangyeol.app.compose.data.convex.dto.RefreshRequest
import com.hangyeol.app.compose.data.convex.push.PushTokenRegistrar
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.intOrNull
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive

private const val CACHE_DATASTORE_NAME = "hangyeol_session_cache"
private val Context.sessionCacheDataStore by preferencesDataStore(name = CACHE_DATASTORE_NAME)

private object CacheKeys {
    val displayName = stringPreferencesKey("display_name")
    val streakDays = intPreferencesKey("streak_days")
    val learningHours = intPreferencesKey("learning_hours")
}

class ConvexSessionRepository(
    private val context: Context,
    private val tokenStore: SecureTokenStore,
    private val convexClient: ConvexClient,
    private val authApi: ConvexAuthApi,
    private val pushTokenRegistrar: PushTokenRegistrar,
) : SessionRepository {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private val mutableSessionState = MutableStateFlow(SessionUiState())

    override val sessionState: StateFlow<SessionUiState> = mutableSessionState.asStateFlow()

    override suspend fun bootstrap() {
        if (!tokenStore.hasTokens()) {
            mutableSessionState.update { it.copy(isBootstrapping = false, isAuthenticated = false) }
            return
        }

        // Show cached data immediately
        val cache = context.sessionCacheDataStore.data.first()
        mutableSessionState.update {
            it.copy(
                isBootstrapping = false,
                isAuthenticated = true,
                displayName = cache[CacheKeys.displayName] ?: "한결",
                streakDays = cache[CacheKeys.streakDays] ?: 0,
                learningHours = cache[CacheKeys.learningHours] ?: 0,
            )
        }

        // Verify token is still valid by fetching current user
        scope.launch {
            fetchAndUpdateUserState()
        }
    }

    override fun signInPreview(displayName: String?) {
        val resolvedName = displayName?.takeIf { it.isNotBlank() } ?: mutableSessionState.value.displayName
        mutableSessionState.update {
            it.copy(isBootstrapping = false, isAuthenticated = true, displayName = resolvedName)
        }
        scope.launch {
            context.sessionCacheDataStore.edit { prefs ->
                prefs[CacheKeys.displayName] = resolvedName
            }
            fetchAndUpdateUserState()
        }
    }

    override fun signOut() {
        mutableSessionState.update { it.copy(isBootstrapping = false, isAuthenticated = false) }
        scope.launch {
            try {
                authApi.signOut()
            } catch (_: Exception) {}
            tokenStore.clear()
            context.sessionCacheDataStore.edit { it.clear() }
        }
    }

    suspend fun refreshTokenIfNeeded(): Boolean {
        val refreshToken = tokenStore.getRefreshToken() ?: return false
        return try {
            val response = authApi.refresh(RefreshRequest(refreshToken))
            if (response.isSuccessful && response.body() != null) {
                val tokens = response.body()!!
                tokenStore.saveTokens(tokens.token, tokens.refreshToken)
                true
            } else {
                tokenStore.clear()
                mutableSessionState.update { it.copy(isAuthenticated = false) }
                false
            }
        } catch (_: Exception) {
            false
        }
    }

    private suspend fun fetchAndUpdateUserState() {
        val result = convexClient.query("users:viewer")
        when (result) {
            is ConvexResult.Success -> {
                val userJson = result.value
                if (userJson is JsonObject) {
                    val name = userJson["name"]?.jsonPrimitive?.content
                    mutableSessionState.update { current ->
                        current.copy(
                            displayName = name ?: current.displayName,
                        )
                    }
                    if (name != null) {
                        context.sessionCacheDataStore.edit { prefs ->
                            prefs[CacheKeys.displayName] = name
                        }
                    }
                }
                fetchUserStats()
                pushTokenRegistrar.enqueueSync(reason = "session_validated")
            }
            is ConvexResult.Error -> {
                if (result.code == "401") {
                    val refreshed = refreshTokenIfNeeded()
                    if (!refreshed) {
                        mutableSessionState.update { it.copy(isAuthenticated = false) }
                    } else {
                        fetchAndUpdateUserState()
                    }
                }
            }
        }
    }

    private suspend fun fetchUserStats() {
        val result = convexClient.query("userStats:getStats")
        if (result is ConvexResult.Success && result.value is JsonObject) {
            val stats = result.value.jsonObject
            val streak = extractInt(stats, "streakDays", "streak") ?: 0
            val totalMinutes = extractInt(stats, "totalMinutes", "todayMinutes") ?: 0
            val hours = (totalMinutes / 60).coerceAtLeast(0)
            mutableSessionState.update { current ->
                current.copy(streakDays = streak, learningHours = hours)
            }
            context.sessionCacheDataStore.edit { prefs ->
                prefs[CacheKeys.streakDays] = streak
                prefs[CacheKeys.learningHours] = hours
            }
        }
    }

    private fun extractInt(obj: JsonObject, vararg keys: String): Int? {
        for (key in keys) {
            val value = obj[key]?.jsonPrimitive?.intOrNull
            if (value != null) return value
        }
        return null
    }
}
