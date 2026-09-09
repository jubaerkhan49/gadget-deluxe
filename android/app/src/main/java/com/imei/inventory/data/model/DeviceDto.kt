package com.imei.inventory.data.model

import com.google.gson.annotations.SerializedName

data class PaginatedResponse<T>(
    val count: Int = 0,
    val next: String? = null,
    val previous: String? = null,
    val results: List<T> = emptyList()
)

data class DeviceDto(
    val id: Int = 0,
    val imei: String = "",
    val imei2: String? = null,
    val meid: String? = null,
    @SerializedName("serial_number") val serialNumber: String? = null,
    val model: String = "",
    @SerializedName("model_description") val modelDescription: String? = null,
    val capacity: String? = null,
    val color: String? = null,
    val variant: String? = null,
    @SerializedName("battery_health") val batteryHealth: Int? = null,
    @SerializedName("battery_cycle") val batteryCycle: Int? = null,
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
    val id: Int = 0,
    @SerializedName("tracking_number") val trackingNumber: String = "",
    @SerializedName("shipping_company") val shippingCompany: String? = null,
    @SerializedName("supplier_name") val supplierName: String? = null,
    @SerializedName("receive_date") val receiveDate: String? = null,
    @SerializedName("shipping_cost") val shippingCost: String? = null,
    val country: String? = null,
    val notes: String? = null,
    @SerializedName("devices_count") val devicesCount: Int = 0,
    @SerializedName("created_at") val createdAt: String? = null
)

data class SaleDto(
    val id: Int = 0,
    @SerializedName("invoice_number") val invoiceNumber: String = "",
    @SerializedName("device_imei") val deviceImei: String? = null,
    @SerializedName("customer_name") val customerName: String? = null,
    @SerializedName("final_price") val finalPrice: Double = 0.0,
    val profit: Double? = null,
    @SerializedName("payment_method") val paymentMethod: String? = null,
    @SerializedName("created_at") val createdAt: String? = null
)

data class RepairDto(
    val id: Int = 0,
    @SerializedName("device_imei") val deviceImei: String? = null,
    @SerializedName("repair_type") val repairType: String? = null,
    @SerializedName("issue_description") val issueDescription: String? = null,
    val cost: Double? = null,
    val status: String = "PENDING",
    @SerializedName("status_display") val statusDisplay: String? = null
)

data class SickwReportDto(
    val id: Int = 0,
    val imei: String? = null,
    val model: String? = null,
    val capacity: String? = null,
    val color: String? = null,
    @SerializedName("icloud_status") val icloudStatus: String? = null,
    @SerializedName("sim_lock_status") val simLockStatus: String? = null,
    @SerializedName("purchase_country") val purchaseCountry: String? = null,
    @SerializedName("raw_text") val rawText: String? = null
)

data class DeviceScanResult(
    val found: Boolean = false,
    val device: DeviceDto? = null,
    val message: String? = null
)
