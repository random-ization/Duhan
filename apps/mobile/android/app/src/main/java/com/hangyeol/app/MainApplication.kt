package com.hangyeol.app

import android.app.Application
import com.hangyeol.app.compose.data.ComposeServiceLocator

class MainApplication : Application() {
  override fun onCreate() {
    super.onCreate()
    ComposeServiceLocator.initialize(this)
  }
}
