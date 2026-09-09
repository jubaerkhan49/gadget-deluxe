package com.imei.inventory.data.api

import com.imei.inventory.data.model.AuthResponse
import com.imei.inventory.data.model.DeviceDto
import com.imei.inventory.data.model.DeviceScanResult
import com.imei.inventory.data.model.LoginRequest
import com.imei.inventory.data.model.PaginatedResponse
import retrofit2.Response
import retrofit2.http.*

interface ImeiApiService {

    @POST("api/token/")
    suspend fun login(@Body request: LoginRequest): Response<AuthResponse>

    @GET("api/devices/")
    suspend fun getDevices(
        @Header("Authorization") token: String,
        @Query("search") search: String? = null,
        @Query("current_status") status: String? = null
    ): Response<PaginatedResponse<DeviceDto>>

    @GET("api/devices/{id}/")
    suspend fun getDeviceDetail(
        @Header("Authorization") token: String,
        @Path("id") id: Int
    ): Response<DeviceDto>

    @GET("api/devices/scan/")
    suspend fun scanCode(
        @Header("Authorization") token: String,
        @Query("code") code: String
    ): Response<DeviceScanResult>

    @POST("api/devices/")
    suspend fun createDevice(
        @Header("Authorization") token: String,
        @Body device: DeviceDto
    ): Response<DeviceDto>

    @PATCH("api/devices/{id}/")
    suspend fun updateDeviceStatus(
        @Header("Authorization") token: String,
        @Path("id") id: Int,
        @Body payload: Map<String, String>
    ): Response<DeviceDto>
}
