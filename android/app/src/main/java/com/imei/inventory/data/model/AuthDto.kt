package com.imei.inventory.data.model

data class LoginRequest(
    val username: String,
    val password: String
)

data class AuthResponse(
    val access: String,
    val refresh: String
)
