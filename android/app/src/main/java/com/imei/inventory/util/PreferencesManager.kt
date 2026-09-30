package com.imei.inventory.util

import android.content.Context
import android.content.SharedPreferences
import com.imei.inventory.data.model.UserDto

class PreferencesManager(context: Context) {
    private val prefs: SharedPreferences = context.getSharedPreferences("gadget_deluxe_prefs", Context.MODE_PRIVATE)

    companion object {
        private const val KEY_SAVED_USERNAME = "saved_username"
        private const val KEY_SAVED_PASSWORD = "saved_password"
        private const val KEY_SAVED_TOKEN = "saved_token"
        private const val KEY_SAVED_ROLE = "saved_role"
        private const val KEY_SAVED_FIRST_NAME = "saved_first_name"
        private const val KEY_SAVED_USER_ID = "saved_user_id"
        private const val KEY_BIOMETRIC_ENABLED = "biometric_enabled"
    }

    fun saveCredentials(
        username: String,
        password: String,
        token: String? = null,
        role: String? = null,
        firstName: String? = null,
        userId: Int? = null
    ) {
        prefs.edit().apply {
            putString(KEY_SAVED_USERNAME, username)
            putString(KEY_SAVED_PASSWORD, password)
            if (token != null) {
                putString(KEY_SAVED_TOKEN, token)
            }
            if (role != null) {
                putString(KEY_SAVED_ROLE, role)
            }
            if (firstName != null) {
                putString(KEY_SAVED_FIRST_NAME, firstName)
            }
            if (userId != null) {
                putInt(KEY_SAVED_USER_ID, userId)
            }
            putBoolean(KEY_BIOMETRIC_ENABLED, true)
            apply()
        }
    }

    fun saveToken(token: String) {
        prefs.edit().putString(KEY_SAVED_TOKEN, token).apply()
    }

    fun saveUserRole(role: String, firstName: String? = null, userId: Int? = null) {
        prefs.edit().apply {
            putString(KEY_SAVED_ROLE, role)
            if (firstName != null) putString(KEY_SAVED_FIRST_NAME, firstName)
            if (userId != null) putInt(KEY_SAVED_USER_ID, userId)
            apply()
        }
    }

    fun getSavedUsername(): String? = prefs.getString(KEY_SAVED_USERNAME, null)

    fun getSavedPassword(): String? = prefs.getString(KEY_SAVED_PASSWORD, null)

    fun getSavedToken(): String? = prefs.getString(KEY_SAVED_TOKEN, null)

    fun getSavedRole(): String? = prefs.getString(KEY_SAVED_ROLE, null)

    fun getSavedFirstName(): String? = prefs.getString(KEY_SAVED_FIRST_NAME, null)

    fun getSavedUserId(): Int = prefs.getInt(KEY_SAVED_USER_ID, 0)

    fun getSavedUser(): UserDto? {
        val username = getSavedUsername() ?: return null
        val role = getSavedRole() ?: if (username.equals("jubaer", ignoreCase = true) || username.equals("admin", ignoreCase = true)) "ADMIN" else "EMPLOYEE"
        val firstName = getSavedFirstName()
        val userId = getSavedUserId()
        return UserDto(
            id = userId,
            username = username,
            role = role,
            firstName = firstName
        )
    }

    fun hasValidSession(): Boolean {
        return !getSavedToken().isNullOrBlank() && !getSavedUsername().isNullOrBlank()
    }

    fun isBiometricEnabled(): Boolean = prefs.getBoolean(KEY_BIOMETRIC_ENABLED, false)

    fun clearCredentials() {
        prefs.edit().apply {
            remove(KEY_SAVED_USERNAME)
            remove(KEY_SAVED_PASSWORD)
            remove(KEY_SAVED_TOKEN)
            remove(KEY_SAVED_ROLE)
            remove(KEY_SAVED_FIRST_NAME)
            remove(KEY_SAVED_USER_ID)
            putBoolean(KEY_BIOMETRIC_ENABLED, false)
            apply()
        }
    }
}
