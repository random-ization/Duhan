package com.hangyeol.app.compose.data

import android.content.Context
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.intPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.hangyeol.app.BuildConfig
import com.hangyeol.app.compose.data.convex.ConvexAuthRepository
import com.hangyeol.app.compose.data.convex.ConvexClient
import com.hangyeol.app.compose.data.convex.ConvexClientHolder
import com.hangyeol.app.compose.data.convex.ConvexContentRepository
import com.hangyeol.app.compose.data.convex.ConvexDashboardRepository
import com.hangyeol.app.compose.data.convex.ConvexLearningRepository
import com.hangyeol.app.compose.data.convex.ConvexSessionRepository
import com.hangyeol.app.compose.data.convex.auth.SecureTokenStore
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

private const val SESSION_DATASTORE_NAME = "hangyeol_compose_session"
private val Context.sessionDataStore by preferencesDataStore(name = SESSION_DATASTORE_NAME)

private object SessionPreferencesKeys {
  val isAuthenticated = booleanPreferencesKey("is_authenticated")
  val displayName = stringPreferencesKey("display_name")
  val streakDays = intPreferencesKey("streak_days")
  val learningHours = intPreferencesKey("learning_hours")
}

data class SessionUiState(
  val isBootstrapping: Boolean = true,
  val isAuthenticated: Boolean = false,
  val displayName: String = "한결",
  val streakDays: Int = 12,
  val learningHours: Int = 148,
)

interface SessionRepository {
  val sessionState: StateFlow<SessionUiState>

  suspend fun bootstrap()

  fun signInPreview(displayName: String? = null)

  fun signOut()
}

class InMemorySessionRepository : SessionRepository {
  private val mutableSessionState = MutableStateFlow(SessionUiState())

  override val sessionState: StateFlow<SessionUiState> = mutableSessionState.asStateFlow()

  override suspend fun bootstrap() {
    mutableSessionState.update { current -> current.copy(isBootstrapping = false) }
  }

  override fun signInPreview(displayName: String?) {
    mutableSessionState.update { current ->
      current.copy(
        isBootstrapping = false,
        isAuthenticated = true,
        displayName = displayName?.ifBlank { current.displayName } ?: current.displayName,
      )
    }
  }

  override fun signOut() {
    mutableSessionState.update { current ->
      current.copy(
        isBootstrapping = false,
        isAuthenticated = false,
      )
    }
  }
}

class DataStoreSessionRepository(
  private val context: Context,
) : SessionRepository {
  private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
  private val mutableSessionState = MutableStateFlow(SessionUiState())

  override val sessionState: StateFlow<SessionUiState> = mutableSessionState.asStateFlow()

  override suspend fun bootstrap() {
    val preferences = context.sessionDataStore.data.first()
    val current = mutableSessionState.value
    val restoredAuthenticated = preferences[SessionPreferencesKeys.isAuthenticated] ?: false
    val mergedAuthenticated = current.isAuthenticated || restoredAuthenticated
    val restoredDisplayName = preferences[SessionPreferencesKeys.displayName] ?: current.displayName
    val mergedDisplayName =
      if (current.isAuthenticated && current.displayName.isNotBlank()) {
        current.displayName
      } else {
        restoredDisplayName
      }
    mutableSessionState.value =
      SessionUiState(
        isBootstrapping = false,
        isAuthenticated = mergedAuthenticated,
        displayName = mergedDisplayName,
        streakDays = preferences[SessionPreferencesKeys.streakDays] ?: current.streakDays,
        learningHours = preferences[SessionPreferencesKeys.learningHours] ?: current.learningHours,
      )
  }

  override fun signInPreview(displayName: String?) {
    val resolvedDisplayName = displayName?.takeIf { it.isNotBlank() } ?: mutableSessionState.value.displayName
    mutableSessionState.update { current ->
      current.copy(
        isBootstrapping = false,
        isAuthenticated = true,
        displayName = resolvedDisplayName,
      )
    }
    scope.launch {
      context.sessionDataStore.edit { preferences ->
        preferences[SessionPreferencesKeys.isAuthenticated] = true
        preferences[SessionPreferencesKeys.displayName] = resolvedDisplayName
        preferences[SessionPreferencesKeys.streakDays] = mutableSessionState.value.streakDays
        preferences[SessionPreferencesKeys.learningHours] = mutableSessionState.value.learningHours
      }
    }
  }

  override fun signOut() {
    mutableSessionState.update { current ->
      current.copy(
        isBootstrapping = false,
        isAuthenticated = false,
      )
    }
    scope.launch {
      context.sessionDataStore.edit { preferences ->
        preferences[SessionPreferencesKeys.isAuthenticated] = false
      }
    }
  }
}

object ComposeServiceLocator {
  @Volatile
  private var initialized = false
  @Volatile
  private var learningRepositoryOverrideForTesting: LearningRepository? = null
  @Volatile
  private var dashboardRepositoryOverrideForTesting: DashboardRepository? = null
  @Volatile
  private var contentRepositoryOverrideForTesting: ContentRepository? = null

  lateinit var sessionRepository: SessionRepository
    private set

  lateinit var authRepository: AuthRepository
    private set

  lateinit var dashboardRepository: DashboardRepository
    private set

  lateinit var learningRepository: LearningRepository
    private set

  lateinit var contentRepository: ContentRepository
    private set

  var convexClient: ConvexClient? = null
    private set

  var pushTokenRegistrar: PushTokenRegistrar? = null
    private set

  fun initialize(context: Context) {
    if (initialized) {
      return
    }
    synchronized(this) {
      if (initialized) {
        return
      }

      if (BuildConfig.USE_CONVEX_BACKEND) {
        ConvexClientHolder.initialize(BuildConfig.CONVEX_URL, debug = BuildConfig.DEBUG)
        val tokenStore = SecureTokenStore(context.applicationContext)
        val authApi = ConvexClientHolder.getAuthApi()
        val queryApi = ConvexClientHolder.getQueryApi()
        val client = ConvexClient(queryApi, tokenStore, ConvexClientHolder.getJson())
        val registrar = PushTokenRegistrar(context.applicationContext, client, tokenStore)
        convexClient = client
        pushTokenRegistrar = registrar

        val convexSessionRepo = ConvexSessionRepository(
          context.applicationContext,
          tokenStore,
          client,
          authApi,
          registrar,
        )
        sessionRepository = convexSessionRepo
        authRepository = ConvexAuthRepository(
          authApi = authApi,
          tokenStore = tokenStore,
          onAuthSuccess = { displayName ->
            convexSessionRepo.signInPreview(displayName)
            registrar.enqueueSync(reason = "auth_success")
          },
          json = ConvexClientHolder.getJson(),
        )
        val defaultDashboardRepository = ConvexDashboardRepository(context.applicationContext, client)
        dashboardRepository = dashboardRepositoryOverrideForTesting ?: defaultDashboardRepository
        val defaultLearningRepository = ConvexLearningRepository(client)
        learningRepository = learningRepositoryOverrideForTesting ?: defaultLearningRepository
        val defaultContentRepository = ConvexContentRepository(context.applicationContext, client)
        contentRepository = contentRepositoryOverrideForTesting ?: defaultContentRepository
      } else {
        pushTokenRegistrar = null
        sessionRepository = DataStoreSessionRepository(context.applicationContext)
        authRepository = InMemoryAuthRepository()
        val defaultDashboardRepository = DataStoreDashboardRepository(context.applicationContext)
        dashboardRepository = dashboardRepositoryOverrideForTesting ?: defaultDashboardRepository
        val defaultLearningRepository = DataStoreLearningRepository(context.applicationContext)
        learningRepository = learningRepositoryOverrideForTesting ?: defaultLearningRepository
        val defaultContentRepository = DataStoreContentRepository(context.applicationContext)
        contentRepository = contentRepositoryOverrideForTesting ?: defaultContentRepository
      }

      initialized = true
    }
  }

  /**
   * Test-only helper for instrumentation coverage that targets specific learning flows.
   * Keeps production initialization logic untouched.
   */
  fun overrideLearningRepositoryForTesting(testLearningRepository: LearningRepository) {
    synchronized(this) {
      learningRepositoryOverrideForTesting = testLearningRepository
      if (initialized) {
        learningRepository = testLearningRepository
      }
    }
  }

  /**
   * Test-only helper for dashboard screen instrumentation.
   */
  fun overrideDashboardRepositoryForTesting(testDashboardRepository: DashboardRepository) {
    synchronized(this) {
      dashboardRepositoryOverrideForTesting = testDashboardRepository
      if (initialized) {
        dashboardRepository = testDashboardRepository
      }
    }
  }

  /**
   * Test-only helper for content surface instrumentation.
   */
  fun overrideContentRepositoryForTesting(testContentRepository: ContentRepository) {
    synchronized(this) {
      contentRepositoryOverrideForTesting = testContentRepository
      if (initialized) {
        contentRepository = testContentRepository
      }
    }
  }

  /**
   * Test-only reset hook. Clears repository overrides and reinitializes default wiring.
   */
  fun resetTestingOverrides(context: Context) {
    synchronized(this) {
      learningRepositoryOverrideForTesting = null
      dashboardRepositoryOverrideForTesting = null
      contentRepositoryOverrideForTesting = null
      convexClient = null
      pushTokenRegistrar = null
      initialized = false
    }
    initialize(context.applicationContext)
  }
}
