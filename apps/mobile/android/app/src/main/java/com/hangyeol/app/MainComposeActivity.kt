package com.hangyeol.app

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.view.Window
import androidx.activity.ComponentActivity
import androidx.activity.result.contract.ActivityResultContracts
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.core.content.ContextCompat
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import com.hangyeol.app.compose.data.ComposeServiceLocator
import com.hangyeol.app.compose.ui.HangyeolComposeApp

class MainComposeActivity : ComponentActivity() {
  companion object {
    private const val STATE_DEEP_LINK_INTENT = "state_deep_link_intent"
  }

  private var deepLinkIntent by mutableStateOf<Intent?>(null)
  private val notificationPermissionLauncher =
    registerForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
      if (!granted) return@registerForActivityResult
      ComposeServiceLocator.pushTokenRegistrar?.enqueueSync(reason = "notification_permission_granted")
    }

  override fun onCreate(savedInstanceState: Bundle?) {
    window.requestFeature(Window.FEATURE_NO_TITLE)
    super.onCreate(savedInstanceState)
    @Suppress("DEPRECATION")
    deepLinkIntent = savedInstanceState?.getParcelable(STATE_DEEP_LINK_INTENT) ?: intent
    title = ""
    actionBar?.hide()
    enableEdgeToEdge()
    requestNotificationPermissionIfNeeded()
    setContent { HangyeolComposeApp(deepLinkIntent = deepLinkIntent) }
  }

  override fun onNewIntent(intent: Intent) {
    super.onNewIntent(intent)
    setIntent(intent)
    deepLinkIntent = intent
  }

  override fun onSaveInstanceState(outState: Bundle) {
    super.onSaveInstanceState(outState)
    outState.putParcelable(STATE_DEEP_LINK_INTENT, deepLinkIntent)
  }

  private fun requestNotificationPermissionIfNeeded() {
    if (!BuildConfig.REQUEST_NOTIFICATIONS_ON_LAUNCH) return
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) return
    val granted = ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED
    if (granted) return
    notificationPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
  }
}
