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
import com.imei.inventory.ui.theme.*
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
            .padding(horizontal = 12.dp, vertical = 8.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp)
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
                            fontSize = 18.sp,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onBackground
                        )
                        Text(
                            text = "Monthly ROI, Team Rankings & Costs",
                            fontSize = 11.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }

                    if (!isCurrentMonth) {
                        Surface(
                            onClick = { viewModel.resetToCurrentMonth(token) },
                            color = MaterialTheme.colorScheme.primary.copy(alpha = 0.12f),
                            shape = RoundedCornerShape(percent = 50),
                            border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.primary.copy(alpha = 0.25f))
                        ) {
                            Text(
                                text = "Current Month",
                                color = MaterialTheme.colorScheme.primary,
                                fontSize = 10.5.sp,
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp)
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(6.dp))

                // Month Switcher Card - M3 Expressive Pill
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLow),
                    shape = RoundedCornerShape(percent = 50),
                    elevation = CardDefaults.cardElevation(defaultElevation = 0.5.dp),
                    border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.4f))
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 6.dp, vertical = 2.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        IconButton(
                            onClick = { viewModel.prevMonth(token) },
                            modifier = Modifier.size(30.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.ChevronLeft,
                                contentDescription = "Previous Month",
                                tint = MaterialTheme.colorScheme.primary,
                                modifier = Modifier.size(18.dp)
                            )
                        }

                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Surface(
                                shape = RoundedCornerShape(8.dp),
                                color = MaterialTheme.colorScheme.primary.copy(alpha = 0.12f),
                                modifier = Modifier.size(22.dp)
                            ) {
                                Box(contentAlignment = Alignment.Center) {
                                    Icon(
                                        imageVector = Icons.Default.CalendarMonth,
                                        contentDescription = null,
                                        tint = MaterialTheme.colorScheme.primary,
                                        modifier = Modifier.size(13.dp)
                                    )
                                }
                            }
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                text = analyticsData?.monthLabel ?: "Loading...",
                                fontWeight = FontWeight.Bold,
                                fontSize = 13.5.sp,
                                color = MaterialTheme.colorScheme.onSurface
                            )
                        }

                        IconButton(
                            onClick = { viewModel.nextMonth(token) },
                            modifier = Modifier.size(30.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.ChevronRight,
                                contentDescription = "Next Month",
                                tint = MaterialTheme.colorScheme.primary,
                                modifier = Modifier.size(18.dp)
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
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    // Row 1: Total Profit & Net Profit
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        AnalyticsKpiCard(
                            modifier = Modifier.weight(1f),
                            title = "TOTAL PROFIT",
                            value = "BDT ${formatIndianNumber(summary.totalProfit)}",
                            subValue = "Net: BDT ${formatIndianNumber(summary.netProfit)}",
                            icon = Icons.Default.TrendingUp,
                            accentColor = AccentEmerald,
                            badge = if (summary.profitMargin > 0) "${summary.profitMargin}% Margin" else null
                        )

                        AnalyticsKpiCard(
                            modifier = Modifier.weight(1f),
                            title = "TOTAL INVESTMENT",
                            value = "BDT ${formatIndianNumber(summary.totalInvestment)}",
                            subValue = "${summary.totalDevicesInvested} devices (Avg ${formatIndianNumber(summary.avgInvestmentPerDevice)})",
                            icon = Icons.Default.AccountBalanceWallet,
                            accentColor = MaterialTheme.colorScheme.primary,
                            badge = if (summary.roiPercentage > 0) "${summary.roiPercentage}% ROI" else null
                        )
                    }

                    // Row 2: Repairs & Shipping Costs
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        AnalyticsKpiCard(
                            modifier = Modifier.weight(1f),
                            title = "REPAIR COSTS",
                            value = "BDT ${formatIndianNumber(summary.totalRepairCost)}",
                            subValue = "${summary.repairDevicesCount} units (${summary.repairsInProgress} in progress)",
                            icon = Icons.Default.Build,
                            accentColor = AccentAmber
                        )

                        AnalyticsKpiCard(
                            modifier = Modifier.weight(1f),
                            title = "SHIPPING COSTS",
                            value = "BDT ${formatIndianNumber(summary.totalShippingCost)}",
                            subValue = "${summary.shipmentBatchesCount} batches (${summary.shipmentDevicesCount} units)",
                            icon = Icons.Default.LocalShipping,
                            accentColor = AccentSky
                        )
                    }
                }
            }

            // 4. Best Seller & Team Performance Leaderboard
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLow),
                    shape = RoundedCornerShape(14.dp),
                    elevation = CardDefaults.cardElevation(defaultElevation = 0.5.dp),
                    border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.4f))
                ) {
                    Column(modifier = Modifier.padding(12.dp)) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Surface(
                                color = Color(0xFFF59E0B).copy(alpha = 0.15f),
                                shape = RoundedCornerShape(10.dp),
                                modifier = Modifier.size(28.dp)
                            ) {
                                Box(contentAlignment = Alignment.Center) {
                                    Icon(
                                        imageVector = Icons.Default.EmojiEvents,
                                        contentDescription = null,
                                        tint = Color(0xFFF59E0B),
                                        modifier = Modifier.size(16.dp)
                                    )
                                }
                            }
                            Spacer(modifier = Modifier.width(10.dp))
                            Column {
                                Text(
                                    text = "Team Sales Leaderboard",
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 13.5.sp,
                                    color = MaterialTheme.colorScheme.onSurface
                                )
                                Text(
                                    text = "Ranked by total profit & sales turnaround speed",
                                    fontSize = 10.5.sp,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                        }

                        Spacer(modifier = Modifier.height(10.dp))

                        if (data.sellersRanking.isEmpty()) {
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(vertical = 12.dp),
                                contentAlignment = Alignment.Center
                            ) {
                                Text(
                                    text = "No sales recorded for this month",
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    fontSize = 12.sp
                                )
                            }
                        } else {
                            Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                                data.sellersRanking.forEachIndexed { index, seller ->
                                    SellerLeaderboardRow(rank = index + 1, seller = seller)
                                    if (index < data.sellersRanking.size - 1) {
                                        HorizontalDivider(
                                            modifier = Modifier.padding(vertical = 2.dp),
                                            color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.35f)
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
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLow),
                        shape = RoundedCornerShape(14.dp),
                        elevation = CardDefaults.cardElevation(defaultElevation = 0.5.dp),
                        border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.4f))
                    ) {
                        Column(modifier = Modifier.padding(12.dp)) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Surface(
                                    color = Color(0xFF3B82F6).copy(alpha = 0.15f),
                                    shape = RoundedCornerShape(10.dp),
                                    modifier = Modifier.size(28.dp)
                                ) {
                                    Box(contentAlignment = Alignment.Center) {
                                        Icon(
                                            imageVector = Icons.Default.PhoneAndroid,
                                            contentDescription = null,
                                            tint = Color(0xFF3B82F6),
                                            modifier = Modifier.size(16.dp)
                                        )
                                    }
                                }
                                Spacer(modifier = Modifier.width(10.dp))
                                Column {
                                    Text(
                                        text = "Top Selling Models",
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 13.5.sp,
                                        color = MaterialTheme.colorScheme.onSurface
                                    )
                                    Text(
                                        text = "High volume & high profit device types",
                                        fontSize = 10.5.sp,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                }
                            }

                            Spacer(modifier = Modifier.height(10.dp))

                            data.topModels.forEachIndexed { index, model ->
                                TopModelRow(model = model)
                                if (index < data.topModels.size - 1) {
                                    HorizontalDivider(
                                        modifier = Modifier.padding(vertical = 2.dp),
                                        color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.35f)
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
                width = 1.dp,
                brush = Brush.linearGradient(
                    colors = listOf(AccentAmber, AccentEmerald)
                ),
                shape = RoundedCornerShape(14.dp)
            ),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceContainerLow
        ),
        shape = RoundedCornerShape(14.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Column(modifier = Modifier.padding(horizontal = 12.dp, vertical = 10.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Surface(
                        color = AccentAmber,
                        shape = RoundedCornerShape(8.dp),
                        modifier = Modifier.size(30.dp)
                    ) {
                        Box(contentAlignment = Alignment.Center) {
                            Icon(
                                imageVector = Icons.Default.EmojiEvents,
                                contentDescription = null,
                                tint = Color.White,
                                modifier = Modifier.size(16.dp)
                            )
                        }
                    }
                    Spacer(modifier = Modifier.width(8.dp))
                    Column {
                        Text(
                            text = "★ BEST SELLER OF THE MONTH",
                            fontSize = 9.sp,
                            fontWeight = FontWeight.Bold,
                            color = AccentAmber,
                            letterSpacing = 0.5.sp
                        )
                        Text(
                            text = bestSeller.displayName.ifBlank { bestSeller.username },
                            fontSize = 14.5.sp,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                    }
                }

                Surface(
                    color = AccentEmerald.copy(alpha = 0.15f),
                    shape = RoundedCornerShape(percent = 50),
                    border = androidx.compose.foundation.BorderStroke(1.dp, AccentEmerald.copy(alpha = 0.3f))
                ) {
                    Text(
                        text = "Rank #1",
                        color = AccentEmerald,
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.height(6.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Column {
                    Text(
                        text = "Total Profit Generated",
                        fontSize = 9.5.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Text(
                        text = "BDT ${formatIndianNumber(bestSeller.totalProfit)}",
                        fontSize = 13.5.sp,
                        fontWeight = FontWeight.Bold,
                        color = AccentEmerald
                    )
                }

                Column(horizontalAlignment = Alignment.End) {
                    Text(
                        text = "Units Sold",
                        fontSize = 9.5.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Text(
                        text = "${bestSeller.unitsSold} devices",
                        fontSize = 13.5.sp,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.primary
                    )
                }
            }

            Spacer(modifier = Modifier.height(4.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text(
                    text = "Turnaround: ${bestSeller.avgTurnaroundDays} days/unit",
                    fontSize = 9.5.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Text(
                    text = "Consistency: ${bestSeller.consistencyScore}%",
                    fontSize = 9.5.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = AccentAmber
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
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLow),
        shape = RoundedCornerShape(12.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.5.dp),
        border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.4f))
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 10.dp, vertical = 8.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Surface(
                    color = accentColor.copy(alpha = 0.12f),
                    shape = RoundedCornerShape(7.dp),
                    modifier = Modifier.size(26.dp)
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Icon(
                            imageVector = icon,
                            contentDescription = null,
                            tint = accentColor,
                            modifier = Modifier.size(14.dp)
                        )
                    }
                }

                if (badge != null) {
                    Surface(
                        color = accentColor.copy(alpha = 0.12f),
                        shape = RoundedCornerShape(percent = 50),
                        border = androidx.compose.foundation.BorderStroke(0.8.dp, accentColor.copy(alpha = 0.25f))
                    ) {
                        Text(
                            text = badge,
                            color = accentColor,
                            fontSize = 9.sp,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 1.5.dp)
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(5.dp))

            Text(
                text = title,
                fontSize = 9.sp,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                letterSpacing = 0.5.sp
            )

            Text(
                text = value,
                fontSize = 13.5.sp,
                fontWeight = FontWeight.ExtraBold,
                color = MaterialTheme.colorScheme.onSurface,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )

            Spacer(modifier = Modifier.height(1.dp))

            Text(
                text = subValue,
                fontSize = 9.5.sp,
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
        1 -> AccentAmber
        2 -> MaterialTheme.colorScheme.surfaceContainerHighest
        3 -> AccentAmber.copy(alpha = 0.7f)
        else -> MaterialTheme.colorScheme.surfaceVariant
    }
    val rankTextColor = if (rank <= 3) Color.White else MaterialTheme.colorScheme.onSurfaceVariant

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 2.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier.weight(1f)
        ) {
            Surface(
                color = rankBadgeColor,
                shape = RoundedCornerShape(percent = 50),
                modifier = Modifier.size(22.dp)
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Text(
                        text = "#$rank",
                        fontSize = 9.5.sp,
                        fontWeight = FontWeight.Bold,
                        color = rankTextColor
                    )
                }
            }

            Spacer(modifier = Modifier.width(8.dp))

            Column {
                Text(
                    text = seller.displayName.ifBlank { seller.username },
                    fontWeight = FontWeight.Bold,
                    fontSize = 12.sp,
                    color = MaterialTheme.colorScheme.onSurface,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                Text(
                    text = "${seller.unitsSold} sold • ${seller.avgTurnaroundDays}d speed",
                    fontSize = 10.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }

        Column(horizontalAlignment = Alignment.End) {
            Text(
                text = "BDT ${formatIndianNumber(seller.totalProfit)}",
                fontWeight = FontWeight.Bold,
                fontSize = 12.sp,
                color = AccentEmerald
            )
            Text(
                text = "Rev: ${formatIndianNumber(seller.totalRevenue)}",
                fontSize = 10.sp,
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
            .padding(vertical = 2.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = model.model,
                fontWeight = FontWeight.Bold,
                fontSize = 12.sp,
                color = MaterialTheme.colorScheme.onSurface,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
            Text(
                text = "${model.unitsSold} units sold",
                fontSize = 10.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }

        Column(horizontalAlignment = Alignment.End) {
            Text(
                text = "BDT ${formatIndianNumber(model.totalProfit)}",
                fontWeight = FontWeight.Bold,
                fontSize = 12.sp,
                color = AccentEmerald
            )
            Text(
                text = "Rev: ${formatIndianNumber(model.totalRevenue)}",
                fontSize = 10.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}
