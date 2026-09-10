package com.imei.inventory.util

import android.content.Context
import android.content.SharedPreferences

class PreferencesManager(context: Context) {
    private val prefs: SharedPreferences = context.getSharedPreferences("gadget_deluxe_prefs", Context.MODE_PRIVATE)

    companion object {
        private const val KEY_SAVED_USERNAME = "saved_username"
        private const val KEY_SAVED_PASSWORD = "saved_password"
        private const val KEY_SAVED_TOKEN = "saved_token"
        private const val KEY_BIOMETRIC_ENABLED = "biometric_enabled"
    }

    fun saveCredentials(username: String, password: String, token: String? = null) {
        prefs.edit().apply {
            putString(KEY_SAVED_USERNAME, username)
            putString(KEY_SAVED_PASSWORD, password)
            if (token != null) {
                putString(KEY_SAVED_TOKEN, token)
            }
            putBoolean(KEY_BIOMETRIC_ENABLED, true)
            apply()
        }
    }

    fun saveToken(token: String) {
        prefs.edit().putString(KEY_SAVED_TOKEN, token).apply()
    }

    fun getSavedUsername(): String? = prefs.getString(KEY_SAVED_USERNAME, null)

    fun getSavedPassword(): String? = prefs.getString(KEY_SAVED_PASSWORD, null)

    fun getSavedToken(): String? = prefs.getString(KEY_SAVED_TOKEN, null)

    fun isBiometricEnabled(): Boolean = prefs.getBoolean(KEY_BIOMETRIC_ENABLED, false) && !getSavedUsername().isNullOrBlank()

    fun clearCredentials() {
        prefs.edit().apply {
            remove(KEY_SAVED_USERNAME)
            remove(KEY_SAVED_PASSWORD)
            remove(KEY_SAVED_TOKEN)
            putBoolean(KEY_BIOMETRIC_ENABLED, false)
            apply()
        }
    }
}
