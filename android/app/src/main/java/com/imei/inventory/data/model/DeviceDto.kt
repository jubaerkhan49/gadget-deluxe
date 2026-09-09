package com.imei.inventory.data.model

import com.google.gson.annotations.SerializedName

data class PaginatedResponse<T>(
    val count: Int,
    val next: String?,
    val previous: String?,
    val results: List<T>
)

data class DeviceDto(
    val id: Int = 0,
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
    @SerializedName("current_status") val currentStatus: String = "IN_STOCK",
    @SerializedName("status_display") val statusDisplay: String? = null,
    @SerializedName("buying_price") val buyingPrice: Double? = null,
    @SerializedName("selling_price") val sellingPrice: Double? = null,
    @SerializedName("current_owner_name") val currentOwnerName: String? = null,
    @SerializedName("sim_lock_status") val simLockStatus: String? = null,
    @SerializedName("icloud_status") val icloudStatus: String? = null,
    @SerializedName("purchase_country") val purchaseCountry: String? = null,
    @SerializedName("created_at") val createdAt: String? = null
)

data class ShipmentDto(
    val id: Int,
    @SerializedName("tracking_number") val trackingNumber: String,
    @SerializedName("shipping_company") val shippingCompany: String?,
    val status: String,
    @SerializedName("supplier_name") val supplierName: String?,
    @SerializedName("devices_count") val devicesCount: Int = 0,
    @SerializedName("created_at") val createdAt: String?
)

data class SaleDto(
    val id: Int,
    @SerializedName("invoice_number") val invoiceNumber: String,
    @SerializedName("device_imei") val deviceImei: String?,
    @SerializedName("customer_name") val customerName: String?,
    @SerializedName("final_price") val finalPrice: Double,
    val profit: Double?,
    @SerializedName("payment_method") val paymentMethod: String?,
    @SerializedName("created_at") val createdAt: String?
)

data class RepairDto(
    val id: Int,
    @SerializedName("device_imei") val deviceImei: String?,
    @SerializedName("repair_type") val repairType: String?,
    @SerializedName("issue_description") val issueDescription: String?,
    val cost: Double?,
    val status: String,
    @SerializedName("status_display") val statusDisplay: String?
)

data class SickwReportDto(
    val id: Int = 0,
    val imei: String?,
    val model: String?,
    val capacity: String?,
    val color: String?,
    @SerializedName("icloud_status") val icloudStatus: String?,
    @SerializedName("sim_lock_status") val simLockStatus: String?,
    @SerializedName("purchase_country") val purchaseCountry: String?,
    @SerializedName("raw_text") val rawText: String? = null
)

data class DeviceScanResult(
    val found: Boolean,
    val device: DeviceDto?,
    val message: String?
)
