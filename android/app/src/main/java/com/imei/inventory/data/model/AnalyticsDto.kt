package com.imei.inventory.data.model

import com.google.gson.annotations.SerializedName

data class AnalyticsSummaryDto(
    @SerializedName("total_profit") val totalProfit: Double = 0.0,
    @SerializedName("net_profit") val netProfit: Double = 0.0,
    @SerializedName("total_revenue") val totalRevenue: Double = 0.0,
    @SerializedName("total_sales_count") val totalSalesCount: Int = 0,
    @SerializedName("profit_margin") val profitMargin: Double = 0.0,
    @SerializedName("roi_percentage") val roiPercentage: Double = 0.0,
    @SerializedName("total_investment") val totalInvestment: Double = 0.0,
    @SerializedName("total_devices_invested") val totalDevicesInvested: Int = 0,
    @SerializedName("avg_investment_per_device") val avgInvestmentPerDevice: Double = 0.0,
    @SerializedName("total_repair_cost") val totalRepairCost: Double = 0.0,
    @SerializedName("repair_devices_count") val repairDevicesCount: Int = 0,
    @SerializedName("repairs_in_progress") val repairsInProgress: Int = 0,
    @SerializedName("repairs_completed") val repairsCompleted: Int = 0,
    @SerializedName("total_shipping_cost") val totalShippingCost: Double = 0.0,
    @SerializedName("shipment_batches_count") val shipmentBatchesCount: Int = 0,
    @SerializedName("shipment_devices_count") val shipmentDevicesCount: Int = 0
)

data class SellerRankingDto(
    @SerializedName("seller_id") val sellerId: Int? = null,
    @SerializedName("username") val username: String = "",
    @SerializedName("display_name") val displayName: String = "",
    @SerializedName("units_sold") val unitsSold: Int = 0,
    @SerializedName("total_revenue") val totalRevenue: Double = 0.0,
    @SerializedName("total_profit") val totalProfit: Double = 0.0,
    @SerializedName("avg_turnaround_days") val avgTurnaroundDays: Double = 0.0,
    @SerializedName("active_sale_days") val activeSaleDays: Int = 0,
    @SerializedName("consistency_score") val consistencyScore: Int = 0,
    @SerializedName("profit_rank") val profitRank: Int = 0
)

data class TopModelDto(
    @SerializedName("model") val model: String = "",
    @SerializedName("units_sold") val unitsSold: Int = 0,
    @SerializedName("total_revenue") val totalRevenue: Double = 0.0,
    @SerializedName("total_profit") val totalProfit: Double = 0.0
)

data class DailyTrendDto(
    @SerializedName("date") val date: String = "",
    @SerializedName("day") val day: Int = 0,
    @SerializedName("sales_count") val salesCount: Int = 0,
    @SerializedName("revenue") val revenue: Double = 0.0,
    @SerializedName("profit") val profit: Double = 0.0
)

data class AnalyticsResponseDto(
    @SerializedName("selected_year") val selectedYear: Int = 0,
    @SerializedName("selected_month") val selectedMonth: Int = 0,
    @SerializedName("month_label") val monthLabel: String = "",
    @SerializedName("summary") val summary: AnalyticsSummaryDto = AnalyticsSummaryDto(),
    @SerializedName("best_seller") val bestSeller: SellerRankingDto? = null,
    @SerializedName("sellers_ranking") val sellersRanking: List<SellerRankingDto> = emptyList(),
    @SerializedName("top_models") val topModels: List<TopModelDto> = emptyList(),
    @SerializedName("daily_trends") val dailyTrends: List<DailyTrendDto> = emptyList()
)
