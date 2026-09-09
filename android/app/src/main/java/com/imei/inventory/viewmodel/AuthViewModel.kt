package com.imei.inventory.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.imei.inventory.data.api.ApiClient
import com.imei.inventory.data.model.LoginRequest
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

sealed class AuthState {
    object Idle : AuthState()
    object Loading : AuthState()
    data class Success(val token: String) : AuthState()
    data class Error(val message: String) : AuthState()
}

class AuthViewModel : ViewModel() {
    private val _authState = MutableStateFlow<AuthState>(AuthState.Idle)
    val authState: StateFlow<AuthState> = _authState

    fun login(user: String, pass: String) {
        if (user.isBlank() || pass.isBlank()) {
            _authState.value = AuthState.Error("Username and password required")
            return
        }

        viewModelScope.launch {
            _authState.value = AuthState.Loading
            try {
                val response = ApiClient.apiService.login(LoginRequest(user, pass))
                if (response.isSuccessful && response.body() != null) {
                    val token = response.body()!!.access
                    _authState.value = AuthState.Success(token)
                } else {
                    _authState.value = AuthState.Error("Invalid credentials (${response.code()})")
                }
            } catch (e: Exception) {
                _authState.value = AuthState.Error("Connection failed: ${e.localizedMessage}")
            }
        }
    }

    fun logout() {
        _authState.value = AuthState.Idle
    }
}
