package com.imei.inventory.service

import android.util.Log
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import com.imei.inventory.data.api.ApiClient
import com.imei.inventory.util.NotificationHelper
import com.imei.inventory.util.PreferencesManager
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class InventoryFirebaseMessagingService : FirebaseMessagingService() {

    override fun onNewToken(token: String) {
        super.onNewToken(token)
        Log.d("FCM", "New FCM registration token received: $token")

        val prefsManager = PreferencesManager(applicationContext)
        prefsManager.saveFcmToken(token)

        val authToken = prefsManager.getSavedToken()
        if (!authToken.isNullOrBlank()) {
            CoroutineScope(Dispatchers.IO).launch {
                try {
                    val response = ApiClient.apiService.registerFcmToken(
                        "Bearer $authToken",
                        mapOf("token" to token, "device_type" to "android")
                    )
                    if (response.isSuccessful) {
                        Log.d("FCM", "Successfully registered new FCM token with backend server.")
                    } else {
                        Log.w("FCM", "Failed to register FCM token with server: ${response.code()}")
                    }
                } catch (e: Exception) {
                    Log.e("FCM", "Error sending FCM token to server: ${e.message}")
                }
            }
        }
    }

    override fun onMessageReceived(remoteMessage: RemoteMessage) {
        super.onMessageReceived(remoteMessage)
        Log.d("FCM", "FCM push message received: data=${remoteMessage.data}")

        val data = remoteMessage.data
        val notification = remoteMessage.notification

        val title = notification?.title ?: data["title"] ?: "Gadget Deluxe Alert"
        val body = notification?.body ?: data["body"] ?: "You have a new update in inventory."
        val requestId = data["request_id"]?.toIntOrNull()

        // Display heads-up high-priority notification with sound & vibration
        NotificationHelper.showPushNotification(
            context = applicationContext,
            title = title,
            body = body,
            requestId = requestId
        )
    }
}
