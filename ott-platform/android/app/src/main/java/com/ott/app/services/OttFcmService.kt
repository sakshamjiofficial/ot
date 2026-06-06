package com.ott.app.services

import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import com.ott.app.data.local.TokenStorage
import com.ott.app.data.remote.api.OttApiService
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import timber.log.Timber
import javax.inject.Inject

@AndroidEntryPoint
class OttFcmService : FirebaseMessagingService() {

    @Inject lateinit var tokenStorage:  TokenStorage
    @Inject lateinit var api:           OttApiService

    override fun onNewToken(token: String) {
        super.onNewToken(token)
        Timber.d("FCM token refreshed: ${token.take(10)}…")
        CoroutineScope(Dispatchers.IO).launch {
            tokenStorage.saveDeviceId(token)
            try {
                api.updateProfile(mapOf("fcmToken" to token))
            } catch (e: Exception) {
                Timber.w(e, "Failed to sync FCM token")
            }
        }
    }

    override fun onMessageReceived(message: RemoteMessage) {
        super.onMessageReceived(message)
        val title = message.notification?.title ?: message.data["title"] ?: return
        val body  = message.notification?.body  ?: message.data["body"]  ?: ""
        val type  = message.data["type"] ?: "general"

        Timber.d("FCM received: $title | type=$type")

        NotificationHelper.show(applicationContext, title, body, message.data)
    }
}
