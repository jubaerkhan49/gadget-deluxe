package com.imei.inventory.data.model

import com.google.gson.annotations.SerializedName

data class PaginatedResponse<T>(
    val count: Int,
    val next: String?,
    val previous: String?,
    val results: List<T>
)

data class DeviceDto(
    val id: Int,
    val imei: String,
    val imei2: String? = null,
    val meid: String? = null,
    @SerializedName("serial_number") val serialNumber: String? = null,
    val model: String,
    @SerializedName("model_description") val modelDescription: String? = null,
    val capacity: String? = null,
    val color: String? = null,
    val variant: String? = null,
    @SerializedName("battery_health") val batteryHealth: Int? = null,
    @SerializedName("current_status") val currentStatus: String,
    @SerializedName("status_display") val statusDisplay: String? = null,
    @SerializedName("buying_price") val buyingPrice: Double? = null,
    @SerializedName("sim_lock_status") val simLockStatus: String? = null,
    @SerializedName("icloud_status") val icloudStatus: String? = null,
    @SerializedName("purchase_country") val purchaseCountry: String? = null
)

data class DeviceScanResult(
    val found: Boolean,
    val device: DeviceDto?,
    val message: String?
)
