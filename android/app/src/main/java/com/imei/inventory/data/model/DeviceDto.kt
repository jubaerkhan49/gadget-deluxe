package com.imei.inventory.data.model

import com.google.gson.annotations.SerializedName

data class DeviceDto(
    val id: Int,
    val imei: String,
    val imei2: String?,
    val meid: String?,
    @SerializedName("serial_number") val serialNumber: String?,
    val model: String,
    @SerializedName("model_description") val modelDescription: String?,
    val capacity: String?,
    val color: String?,
    @SerializedName("battery_health") val batteryHealth: Int?,
    @SerializedName("current_status") val currentStatus: String,
    @SerializedName("status_display") val statusDisplay: String?,
    @SerializedName("sim_lock_status") val simLockStatus: String?,
    @SerializedName("icloud_status") val icloudStatus: String?,
    @SerializedName("purchase_country") val purchaseCountry: String?
)

data class DeviceScanResult(
    val found: Boolean,
    val device: DeviceDto?,
    val message: String?
)
