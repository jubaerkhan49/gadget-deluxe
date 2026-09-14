package com.imei.inventory.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.imei.inventory.data.model.AnalyticsResponseDto
import com.imei.inventory.data.model.SellerRankingDto
import com.imei.inventory.data.model.TopModelDto
import com.imei.inventory.ui.components.formatIndianNumber
import com.imei.inventory.viewmodel.MainInventoryViewModel
import java.util.Calendar

@Composable
fun AnalyticsTab(
    token: String,
    viewModel: MainInventoryViewModel
) {
    val analyticsData by viewModel.analyticsData.collectAsState()
    val isLoading by viewModel.isAnalyticsLoading.collectAsState()
    val selectedYear by viewModel.analyticsYear.collectAsState()
    val selectedMonth by viewModel.analyticsMonth.collectAsState()

    val currentCal = Calendar.getInstance()
    val isCurrentMonth = selectedYear == currentCal.get(Calendar.YEAR) && selectedMonth == (currentCal.get(Calendar.MONTH) + 1)

    LaunchedEffect(Unit) {
        viewModel.fetchAnalytics(token)
    }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 16.dp, vertical = 12.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // 1. Header & Month Selector
        item {
            Column {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text(
                            text = "Business Analytics",
                            fontSize = 22.sp,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onBackground
                        )
                        Text(
                            text = "Monthly ROI, Team Rankings & Costs",
                            fontSize = 12.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }

                    if (!isCurrentMonth) {
                        Surface(
                            onClick = { viewModel.resetToCurrentMonth(token) },
                            color = MaterialTheme.colorScheme.primary.copy(alpha = 0.12f),
                            shape = RoundedCornerShape(8.dp)
                        ) {
                            Text(
                                text = "Current Month",
                                color = MaterialTheme.colorScheme.primary,
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))

                // Month Switcher Card
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                    shape = RoundedCornerShape(14.dp),
                    elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 8.dp, vertical = 6.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        IconButton(
                            onClick = { viewModel.prevMonth(token) },
                            modifier = Modifier.size(36.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.ChevronLeft,
                                contentDescription = "Previous Month",
                                tint = MaterialTheme.colorScheme.primary
                            )
                        }

                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                imageVector = Icons.Default.CalendarMonth,
                                contentDescription = null,
                                tint = MaterialTheme.colorScheme.primary,
                                modifier = Modifier.size(18.dp)
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                text = analyticsData?.monthLabel ?: "Loading...",
                                fontWeight = FontWeight.Bold,
                                fontSize = 15.sp,
                                color = MaterialTheme.colorScheme.onSurface
                            )
                        }

                        IconButton(
                            onClick = { viewModel.nextMonth(token) },
                            modifier = Modifier.size(36.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.ChevronRight,
                                contentDescription = "Next Month",
                                tint = MaterialTheme.colorScheme.primary
                            )
                        }
                    }
                }
            }
        }

        if (isLoading && analyticsData == null) {
            item {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(200.dp),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator(color = MaterialTheme.colorScheme.primary)
                }
            }
        } else if (analyticsData != null) {
            val data = analyticsData!!
            val summary = data.summary

            // 2. Best Seller Spotlight Card
            data.bestSeller?.let { bestSeller ->
                item {
                    BestSellerCard(bestSeller = bestSeller)
                }
            }

            // 3. Primary KPI Cards Grid (Total Profit, Total Investment, Repair Costs, Shipping Costs)
            item {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    // Row 1: Total Profit & Net Profit
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        AnalyticsKpiCard(
                            modifier = Modifier.weight(1f),
                            title = "TOTAL PROFIT",
                            value = "BDT ${formatIndianNumber(summary.totalProfit)}",
                            subValue = "Net: BDT ${formatIndianNumber(summary.netProfit)}",
                            icon = Icons.Default.TrendingUp,
                            accentColor = Color(0xFF10B981),
                            badge = if (summary.profitMargin > 0) "${summary.profitMargin}% Margin" else null
                        )

                        AnalyticsKpiCard(
                            modifier = Modifier.weight(1f),
                            title = "TOTAL INVESTMENT",
                            value = "BDT ${formatIndianNumber(summary.totalInvestment)}",
                            subValue = "${summary.totalDevicesInvested} devices (Avg ${formatIndianNumber(summary.avgInvestmentPerDevice)})",
                            icon = Icons.Default.AccountBalanceWallet,
                            accentColor = Color(0xFF6366F1),
                            badge = if (summary.roiPercentage > 0) "${summary.roiPercentage}% ROI" else null
                        )
                    }

                    // Row 2: Repairs & Shipping Costs
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        AnalyticsKpiCard(
                            modifier = Modifier.weight(1f),
                            title = "REPAIR COSTS",
                            value = "BDT ${formatIndianNumber(summary.totalRepairCost)}",
                            subValue = "${summary.repairDevicesCount} units (${summary.repairsInProgress} in progress)",
                            icon = Icons.Default.Build,
                            accentColor = Color(0xFFF59E0B)
                        )

                        AnalyticsKpiCard(
                            modifier = Modifier.weight(1f),
                            title = "SHIPPING COSTS",
                            value = "BDT ${formatIndianNumber(summary.totalShippingCost)}",
                            subValue = "${summary.shipmentBatchesCount} batches (${summary.shipmentDevicesCount} units)",
                            icon = Icons.Default.LocalShipping,
                            accentColor = Color(0xFF06B6D4)
                        )
                    }
                }
            }

            // 4. Best Seller & Team Performance Leaderboard
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                    shape = RoundedCornerShape(16.dp),
                    elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Surface(
                                color = Color(0xFFF59E0B).copy(alpha = 0.15f),
                                shape = CircleShape,
                                modifier = Modifier.size(32.dp)
                            ) {
                                Box(contentAlignment = Alignment.Center) {
                                    Icon(
                                        imageVector = Icons.Default.EmojiEvents,
                                        contentDescription = null,
                                        tint = Color(0xFFF59E0B),
                                        modifier = Modifier.size(18.dp)
                                    )
                                }
                            }
                            Spacer(modifier = Modifier.width(10.dp))
                            Column {
                                Text(
                                    text = "Team Sales Leaderboard",
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 16.sp,
                                    color = MaterialTheme.colorScheme.onSurface
                                )
                                Text(
                                    text = "Ranked by total profit & sales turnaround speed",
                                    fontSize = 11.sp,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                        }

                        Spacer(modifier = Modifier.height(14.dp))

                        if (data.sellersRanking.isEmpty()) {
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(vertical = 16.dp),
                                contentAlignment = Alignment.Center
                            ) {
                                Text(
                                    text = "No sales recorded for this month",
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    fontSize = 13.sp
                                )
                            }
                        } else {
                            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                data.sellersRanking.forEachIndexed { index, seller ->
                                    SellerLeaderboardRow(rank = index + 1, seller = seller)
                                    if (index < data.sellersRanking.size - 1) {
                                        HorizontalDivider(
                                            modifier = Modifier.padding(vertical = 4.dp),
                                            color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f)
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            }

            // 5. Top Selling Models
            if (data.topModels.isNotEmpty()) {
                item {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                        shape = RoundedCornerShape(16.dp),
                        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
                    ) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Surface(
                                    color = Color(0xFF3B82F6).copy(alpha = 0.15f),
                                    shape = CircleShape,
                                    modifier = Modifier.size(32.dp)
                                ) {
                                    Box(contentAlignment = Alignment.Center) {
                                        Icon(
                                            imageVector = Icons.Default.PhoneAndroid,
                                            contentDescription = null,
                                            tint = Color(0xFF3B82F6),
                                            modifier = Modifier.size(18.dp)
                                        )
                                    }
                                }
                                Spacer(modifier = Modifier.width(10.dp))
                                Column {
                                    Text(
                                        text = "Top Selling Models",
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 16.sp,
                                        color = MaterialTheme.colorScheme.onSurface
                                    )
                                    Text(
                                        text = "High volume & high profit device types",
                                        fontSize = 11.sp,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                }
                            }

                            Spacer(modifier = Modifier.height(12.dp))

                            data.topModels.forEachIndexed { index, model ->
                                TopModelRow(model = model)
                                if (index < data.topModels.size - 1) {
                                    HorizontalDivider(
                                        modifier = Modifier.padding(vertical = 4.dp),
                                        color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f)
                                    )
                                }
                            }
                        }
                    }
                }
            }

            item {
                Spacer(modifier = Modifier.height(20.dp))
            }
        }
    }
}

@Composable
fun BestSellerCard(bestSeller: SellerRankingDto) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .border(
                width = 1.5.dp,
                brush = Brush.linearGradient(
                    colors = listOf(Color(0xFFF59E0B), Color(0xFF10B981))
                ),
                shape = RoundedCornerShape(16.dp)
            ),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface
        ),
        shape = RoundedCornerShape(16.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 3.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Surface(
                        color = Color(0xFFF59E0B),
                        shape = CircleShape,
                        modifier = Modifier.size(36.dp)
                    ) {
                        Box(contentAlignment = Alignment.Center) {
                            Icon(
                                imageVector = Icons.Default.EmojiEvents,
                                contentDescription = null,
                                tint = Color.White,
                                modifier = Modifier.size(20.dp)
                            )
                        }
                    }
                    Spacer(modifier = Modifier.width(10.dp))
                    Column {
                        Text(
                            text = "★ BEST SELLER OF THE MONTH",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFFD97706),
                            letterSpacing = 0.5.sp
                        )
                        Text(
                            text = bestSeller.displayName.ifBlank { bestSeller.username },
                            fontSize = 18.sp,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                    }
                }

                Surface(
                    color = Color(0xFF10B981).copy(alpha = 0.15f),
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Text(
                        text = "Rank #1",
                        color = Color(0xFF059669),
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.height(14.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Column {
                    Text(
                        text = "Total Profit Generated",
                        fontSize = 11.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Text(
                        text = "BDT ${formatIndianNumber(bestSeller.totalProfit)}",
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color(0xFF10B981)
                    )
                }

                Column(horizontalAlignment = Alignment.End) {
                    Text(
                        text = "Units Sold",
                        fontSize = 11.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Text(
                        text = "${bestSeller.unitsSold} devices",
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.primary
                    )
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text(
                    text = "Turnaround: ${bestSeller.avgTurnaroundDays} days/unit",
                    fontSize = 11.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Text(
                    text = "Consistency: ${bestSeller.consistencyScore}%",
                    fontSize = 11.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = Color(0xFFF59E0B)
                )
            }
        }
    }
}

@Composable
fun AnalyticsKpiCard(
    modifier: Modifier = Modifier,
    title: String,
    value: String,
    subValue: String,
    icon: ImageVector,
    accentColor: Color,
    badge: String? = null
) {
    Card(
        modifier = modifier,
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        shape = RoundedCornerShape(14.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Surface(
                    color = accentColor.copy(alpha = 0.12f),
                    shape = RoundedCornerShape(8.dp),
                    modifier = Modifier.size(30.dp)
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Icon(
                            imageVector = icon,
                            contentDescription = null,
                            tint = accentColor,
                            modifier = Modifier.size(16.dp)
                        )
                    }
                }

                if (badge != null) {
                    Surface(
                        color = accentColor.copy(alpha = 0.12f),
                        shape = RoundedCornerShape(6.dp)
                    ) {
                        Text(
                            text = badge,
                            color = accentColor,
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(10.dp))

            Text(
                text = title,
                fontSize = 10.sp,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                letterSpacing = 0.5.sp
            )

            Text(
                text = value,
                fontSize = 15.sp,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onSurface,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )

            Spacer(modifier = Modifier.height(2.dp))

            Text(
                text = subValue,
                fontSize = 10.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
        }
    }
}

@Composable
fun SellerLeaderboardRow(rank: Int, seller: SellerRankingDto) {
    val rankBadgeColor = when (rank) {
        1 -> Color(0xFFF59E0B)
        2 -> Color(0xFF94A3B8)
        3 -> Color(0xFFB45309)
        else -> MaterialTheme.colorScheme.surfaceVariant
    }
    val rankTextColor = if (rank <= 3) Color.White else MaterialTheme.colorScheme.onSurfaceVariant

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier.weight(1f)
        ) {
            Surface(
                color = rankBadgeColor,
                shape = CircleShape,
                modifier = Modifier.size(24.dp)
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Text(
                        text = "#$rank",
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        color = rankTextColor
                    )
                }
            }

            Spacer(modifier = Modifier.width(10.dp))

            Column {
                Text(
                    text = seller.displayName.ifBlank { seller.username },
                    fontWeight = FontWeight.Bold,
                    fontSize = 13.sp,
                    color = MaterialTheme.colorScheme.onSurface,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                Text(
                    text = "${seller.unitsSold} sold • ${seller.avgTurnaroundDays}d speed",
                    fontSize = 11.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }

        Column(horizontalAlignment = Alignment.End) {
            Text(
                text = "BDT ${formatIndianNumber(seller.totalProfit)}",
                fontWeight = FontWeight.Bold,
                fontSize = 13.sp,
                color = Color(0xFF10B981)
            )
            Text(
                text = "Rev: ${formatIndianNumber(seller.totalRevenue)}",
                fontSize = 11.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

@Composable
fun TopModelRow(model: TopModelDto) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = model.model,
                fontWeight = FontWeight.Bold,
                fontSize = 13.sp,
                color = MaterialTheme.colorScheme.onSurface,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
            Text(
                text = "${model.unitsSold} units sold",
                fontSize = 11.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }

        Column(horizontalAlignment = Alignment.End) {
            Text(
                text = "BDT ${formatIndianNumber(model.totalProfit)}",
                fontWeight = FontWeight.Bold,
                fontSize = 13.sp,
                color = Color(0xFF10B981)
            )
            Text(
                text = "Rev: ${formatIndianNumber(model.totalRevenue)}",
                fontSize = 11.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}
