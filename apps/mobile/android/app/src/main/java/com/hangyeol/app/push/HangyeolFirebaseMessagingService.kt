package com.hangyeol.app.push

import android.util.Log
import com.google.firebase.messaging.FirebaseMessagingService
import com.hangyeol.app.compose.data.ComposeServiceLocator

class HangyeolFirebaseMessagingService : FirebaseMessagingService() {
    override fun onNewToken(token: String) {
        super.onNewToken(token)
        runCatching {
            ComposeServiceLocator.initialize(applicationContext)
            ComposeServiceLocator.pushTokenRegistrar?.enqueueSync(
                reason = "firebase_on_new_token",
                forcedToken = token,
            )
        }.onFailure { error ->
            Log.w(TAG, "Failed to schedule FCM token sync", error)
        }
    }

    private companion object {
        const val TAG = "HangyeolFCMService"
    }
}
