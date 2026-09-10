package com.imei.inventory.data.model

import com.google.gson.annotations.SerializedName

data class DashboardStatsDto(
    @SerializedName("total_devices") val totalDevices: Int = 0,
    @SerializedName("in_stock") val inStock: Int = 0,
    @SerializedName("sold") val sold: Int = 0,
    @SerializedName("under_repair") val underRepair: Int = 0,
    @SerializedName("waiting_shipment") val waitingShipment: Int = 0,
    @SerializedName("returned") val returned: Int = 0,
    @SerializedName("total_assets") val totalAssets: Double = 0.0,
    @SerializedName("today_sales") val todaySales: Double = 0.0,
    @SerializedName("today_profit") val todayProfit: Double = 0.0,
    @SerializedName("monthly_profit") val monthlyProfit: Double = 0.0
)
