package com.imei.inventory.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.imei.inventory.data.api.ApiClient
import com.imei.inventory.data.model.LoginRequest
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

import com.imei.inventory.data.model.UserDto

sealed class AuthState {
    object Idle : AuthState()
    object Loading : AuthState()
    data class Success(val token: String, val user: UserDto) : AuthState()
    data class Error(val message: String) : AuthState()
}

class AuthViewModel : ViewModel() {
    private val _authState = MutableStateFlow<AuthState>(AuthState.Idle)
    val authState: StateFlow<AuthState> = _authState

    private val _currentUser = MutableStateFlow<UserDto?>(null)
    val currentUser: StateFlow<UserDto?> = _currentUser

    fun login(user: String, pass: String, expectedRole: String? = null) {
        if (user.isBlank() || pass.isBlank()) {
            _authState.value = AuthState.Error("Username and password required")
            return
        }

        viewModelScope.launch {
            _authState.value = AuthState.Loading
            try {
                val cleanUser = user.trim()
                val response = ApiClient.apiService.login(LoginRequest(cleanUser, pass.trim()))
                if (response.isSuccessful && response.body() != null) {
                    val token = response.body()!!.access
                    val bearer = "Bearer $token"

                    var userDto: UserDto
                    try {
                        val profileRes = ApiClient.apiService.getCurrentUser(bearer)
                        if (profileRes.isSuccessful && profileRes.body() != null) {
                            userDto = profileRes.body()!!
                        } else {
                            val isUserAdmin = cleanUser.equals("jubaer", ignoreCase = true) || cleanUser.equals("admin", ignoreCase = true)
                            userDto = UserDto(username = cleanUser, role = if (isUserAdmin) "ADMIN" else "EMPLOYEE")
                        }
                    } catch (e: Exception) {
                        val isUserAdmin = cleanUser.equals("jubaer", ignoreCase = true) || cleanUser.equals("admin", ignoreCase = true)
                        userDto = UserDto(username = cleanUser, role = if (isUserAdmin) "ADMIN" else "EMPLOYEE")
                    }

                    if (expectedRole == "admin" && !userDto.isAdmin) {
                        _authState.value = AuthState.Error("Access Denied: This gateway is for Administrators only. Please select Staff Portal.")
                        return@launch
                    }
                    if (expectedRole == "employee" && userDto.isAdmin) {
                        _authState.value = AuthState.Error("Access Denied: Administrator accounts must log in through Admin Command gateway.")
                        return@launch
                    }

                    _currentUser.value = userDto
                    _authState.value = AuthState.Success(token, userDto)
                } else {
                    _authState.value = AuthState.Error("Invalid credentials (${response.code()})")
                }
            } catch (e: Exception) {
                _authState.value = AuthState.Error("Connection failed: ${e.localizedMessage}")
            }
        }
    }

    fun setCurrentUser(user: UserDto) {
        _currentUser.value = user
    }

    fun logout() {
        _currentUser.value = null
        _authState.value = AuthState.Idle
    }
}
