package com.imei.inventory.data.api

import com.imei.inventory.data.model.*
import retrofit2.Response
import retrofit2.http.*

interface ImeiApiService {

    @POST("api/token/")
    suspend fun login(@Body request: LoginRequest): Response<AuthResponse>

    // Device Endpoints
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

    @GET("api/users/")
    suspend fun getUsers(
        @Header("Authorization") token: String
    ): Response<PaginatedResponse<UserDto>>

    @POST("api/devices/")
    suspend fun createDevice(
        @Header("Authorization") token: String,
        @Body device: DeviceDto
    ): Response<DeviceDto>

    @PATCH("api/devices/{id}/")
    suspend fun updateDevice(
        @Header("Authorization") token: String,
        @Path("id") id: Int,
        @Body payload: Map<String, @JvmSuppressWildcards Any?>
    ): Response<DeviceDto>

    @DELETE("api/devices/{id}/")
    suspend fun deleteDevice(
        @Header("Authorization") token: String,
        @Path("id") id: Int
    ): Response<Unit>

    // Shipments Endpoint
    @GET("api/shipments/")
    suspend fun getShipments(
        @Header("Authorization") token: String
    ): Response<PaginatedResponse<ShipmentDto>>

    @POST("api/shipments/create-batch/")
    suspend fun createBatchShipment(
        @Header("Authorization") token: String,
        @Body payload: Map<String, @JvmSuppressWildcards Any>
    ): Response<Map<String, Any>>

    // Sales Endpoint
    @GET("api/sales/")
    suspend fun getSales(
        @Header("Authorization") token: String
    ): Response<PaginatedResponse<SaleDto>>

    // Repairs Endpoint
    @GET("api/repairs/")
    suspend fun getRepairs(
        @Header("Authorization") token: String
    ): Response<PaginatedResponse<RepairDto>>

    // Sickw Reports Endpoint
    @GET("api/sickw-reports/")
    suspend fun getSickwReports(
        @Header("Authorization") token: String
    ): Response<PaginatedResponse<SickwReportDto>>
}
