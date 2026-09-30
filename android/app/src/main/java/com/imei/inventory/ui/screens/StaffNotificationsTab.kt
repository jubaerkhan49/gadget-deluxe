package com.imei.inventory.ui.screens

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.imei.inventory.data.model.DeviceDto
import com.imei.inventory.data.model.SaleDto
import com.imei.inventory.data.model.UserDto
import com.imei.inventory.ui.components.CopyableText
import com.imei.inventory.ui.components.StatusBadge
import com.imei.inventory.ui.components.VariantBadge
import com.imei.inventory.viewmodel.MainInventoryViewModel
import java.text.SimpleDateFormat
import java.util.*

fun calculateDaysAgo(dateStr: String?): Long? {
    if (dateStr.isNullOrBlank()) return null
    val formats = listOf(
        SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.US),
        SimpleDateFormat("yyyy-MM-dd", Locale.US)
    )
    for (fmt in formats) {
        try {
            val cleanStr = if (dateStr.length >= 10) dateStr.substring(0, minOf(dateStr.length, 19)) else dateStr
            val date = fmt.parse(cleanStr)
            if (date != null) {
                val diffMs = System.currentTimeMillis() - date.time
                return maxOf(0L, diffMs / (1000L * 60 * 60 * 24))
            }
        } catch (_: Exception) {}
    }
    return null
}

@Composable
fun StaffNotificationsTab(
    token: String,
    viewModel: MainInventoryViewModel,
    currentUser: UserDto? = null,
    onSelectDevice: (DeviceDto) -> Unit = {},
    onOpenMarkSold: (DeviceDto) -> Unit = {},
    onNavigateToCustody: () -> Unit = {}
) {
    val devices by viewModel.devices.collectAsState()
    val sales by viewModel.sales.collectAsState()

    // 1. Filter staff custody devices
    val myCustodyDevices = remember(devices, currentUser) {
        devices.filter { dev ->
            val matchId = dev.currentOwner != null && currentUser?.id != null && dev.currentOwner == currentUser.id
            val matchName = !dev.currentOwnerName.isNullOrBlank() && (
                (currentUser?.username != null && dev.currentOwnerName.equals(currentUser.username, ignoreCase = true)) ||
                (currentUser?.displayName != null && dev.currentOwnerName.equals(currentUser.displayName, ignoreCase = true))
            )
            (matchId || matchName) && !dev.isB2B && !dev.currentStatus.equals("SOLD", ignoreCase = true)
        }
    }

    // Filter staff sales
    val mySales = remember(sales, currentUser) {
        sales.filter { sale ->
            (currentUser?.username != null && sale.soldBy?.equals(currentUser.username, ignoreCase = true) == true) ||
            (currentUser?.username != null && sale.sellerName?.equals(currentUser.username, ignoreCase = true) == true) ||
            (currentUser?.displayName != null && sale.sellerName?.equals(currentUser.displayName, ignoreCase = true) == true)
        }
    }

    // Rule 1: Devices held for 7 days or more (show exact days like 7, 8, etc.)
    val staleCustodyDevices = remember(myCustodyDevices) {
        myCustodyDevices.mapNotNull { dev ->
            val days = calculateDaysAgo(dev.receivedDateBd ?: dev.createdAt) ?: 0L
            if (days >= 7L) Pair(dev, days) else null
        }.sortedByDescending { it.second }
    }

    // Rule 2: Inability to sell within 3 days (no sales recorded in >= 3 days)
    val latestSale = remember(mySales) {
        mySales.maxByOrNull { it.createdAt ?: "" }
    }
    val daysSinceLastSale = remember(latestSale) {
        calculateDaysAgo(latestSale?.createdAt)
    }
    val showInactivityAlert = remember(daysSinceLastSale, myCustodyDevices, mySales) {
        if (daysSinceLastSale != null && daysSinceLastSale >= 3L) {
            true
        } else if (mySales.isEmpty() && myCustodyDevices.isNotEmpty()) {
            val oldestCustody = myCustodyDevices.mapNotNull { calculateDaysAgo(it.receivedDateBd ?: it.createdAt) }.maxOrNull() ?: 0L
            oldestCustody >= 3L
        } else {
            false
        }
    }

    // Rule 3: Monthly selling target (15 devices per month)
    val currentCal = Calendar.getInstance()
    val curYear = currentCal.get(Calendar.YEAR)
    val curMonth = currentCal.get(Calendar.MONTH) // 0-indexed
    val curDayOfMonth = currentCal.get(Calendar.DAY_OF_MONTH)
    val maxDaysInMonth = currentCal.getActualMaximum(Calendar.DAY_OF_MONTH)
    val daysLeftInMonth = maxDaysInMonth - curDayOfMonth

    val currentMonthSalesCount = remember(mySales, curYear, curMonth) {
        mySales.count { sale ->
            val sDate = sale.createdAt
            if (!sDate.isNullOrBlank() && sDate.length >= 7) {
                try {
                    val parts = sDate.substring(0, 7).split("-")
                    val yr = parts[0].toIntOrNull()
                    val mo = parts[1].toIntOrNull()
                    yr == curYear && mo == (curMonth + 1)
                } catch (_: Exception) {
                    false
                }
            } else false
        }
    }
    val monthlyTarget = 15
    val remainingForTarget = maxOf(0, monthlyTarget - currentMonthSalesCount)
    val targetProgress = (currentMonthSalesCount.toFloat() / monthlyTarget.toFloat()).coerceIn(0f, 1f)

    val totalAlerts = staleCustodyDevices.size + (if (showInactivityAlert) 1 else 0) + (if (remainingForTarget > 0) 1 else 0)

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 14.dp, vertical = 10.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        // Top Header Banner
        item {
            Surface(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(18.dp),
                color = MaterialTheme.colorScheme.surface,
                tonalElevation = 2.dp,
                shadowElevation = 2.dp
            ) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(
                            brush = Brush.linearGradient(
                                colors = listOf(
                                    Color(0xFF6366F1).copy(alpha = 0.12f),
                                    MaterialTheme.colorScheme.surface
                                )
                            )
                        )
                        .padding(horizontal = 16.dp, vertical = 14.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Surface(
                                color = Color(0xFF6366F1),
                                shape = CircleShape,
                                modifier = Modifier.size(38.dp)
                            ) {
                                Box(contentAlignment = Alignment.Center) {
                                    Icon(
                                        imageVector = Icons.Default.NotificationsActive,
                                        contentDescription = null,
                                        tint = Color.White,
                                        modifier = Modifier.size(19.dp)
                                    )
                                }
                            }
                            Spacer(modifier = Modifier.width(10.dp))
                            Column {
                                Text(
                                    text = "Automated Staff Alerts",
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 15.sp,
                                    color = MaterialTheme.colorScheme.onSurface
                                )
                                Text(
                                    text = "Smart custody rules & selling targets",
                                    fontSize = 11.sp,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                        }

                        Surface(
                            color = if (totalAlerts > 0) Color(0xFFEF4444).copy(alpha = 0.12f) else Color(0xFF10B981).copy(alpha = 0.12f),
                            shape = RoundedCornerShape(14.dp)
                        ) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                modifier = Modifier.padding(horizontal = 9.dp, vertical = 4.dp)
                            ) {
                                Box(
                                    modifier = Modifier
                                        .size(6.dp)
                                        .background(if (totalAlerts > 0) Color(0xFFEF4444) else Color(0xFF10B981), CircleShape)
                                )
                                Spacer(modifier = Modifier.width(4.dp))
                                Text(
                                    text = if (totalAlerts > 0) "$totalAlerts Alert${if (totalAlerts > 1) "s" else ""}" else "All Good",
                                    color = if (totalAlerts > 0) Color(0xFFEF4444) else Color(0xFF10B981),
                                    fontSize = 10.5.sp,
                                    fontWeight = FontWeight.Bold
                                )
                            }
                        }
                    }
                }
            }
        }

        // Rule 3: Monthly Target Card
        item {
            Surface(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(14.dp),
                color = MaterialTheme.colorScheme.surface,
                tonalElevation = 2.dp,
                shadowElevation = 1.dp,
                border = BorderStroke(1.dp, Color(0xFF6366F1).copy(alpha = 0.25f))
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(14.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                imageVector = Icons.Default.EmojiEvents,
                                contentDescription = null,
                                tint = Color(0xFFF59E0B),
                                modifier = Modifier.size(18.dp)
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                text = "Monthly Sales Target",
                                fontWeight = FontWeight.Bold,
                                fontSize = 13.5.sp,
                                color = MaterialTheme.colorScheme.onSurface
                            )
                        }
                        Surface(
                            shape = RoundedCornerShape(6.dp),
                            color = if (remainingForTarget == 0) Color(0xFF10B981).copy(alpha = 0.12f) else Color(0xFF6366F1).copy(alpha = 0.12f)
                        ) {
                            Text(
                                text = "$currentMonthSalesCount / $monthlyTarget Sold",
                                color = if (remainingForTarget == 0) Color(0xFF10B981) else Color(0xFF6366F1),
                                fontWeight = FontWeight.Bold,
                                fontSize = 11.sp,
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.5.dp)
                            )
                        }
                    }

                    // Progress Bar
                    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        LinearProgressIndicator(
                            progress = { targetProgress },
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(8.dp)
                                .clip(RoundedCornerShape(4.dp)),
                            color = if (remainingForTarget == 0) Color(0xFF10B981) else Color(0xFF6366F1),
                            trackColor = MaterialTheme.colorScheme.surfaceVariant
                        )
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text(
                                text = "${(targetProgress * 100).toInt()}% completed",
                                fontSize = 10.sp,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                            Text(
                                text = "$daysLeftInMonth days left in month",
                                fontSize = 10.sp,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }

                    // Suggestion Box
                    Surface(
                        shape = RoundedCornerShape(8.dp),
                        color = (if (remainingForTarget == 0) Color(0xFF10B981) else Color(0xFF6366F1)).copy(alpha = 0.08f),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Row(
                            modifier = Modifier.padding(10.dp),
                            verticalAlignment = Alignment.Top
                        ) {
                            Icon(
                                imageVector = if (remainingForTarget == 0) Icons.Default.CheckCircle else Icons.Default.TrendingUp,
                                contentDescription = null,
                                tint = if (remainingForTarget == 0) Color(0xFF10B981) else Color(0xFF6366F1),
                                modifier = Modifier
                                    .size(16.dp)
                                    .padding(top = 1.dp)
                            )
                            Spacer(modifier = Modifier.width(7.dp))
                            Text(
                                text = if (remainingForTarget == 0) {
                                    "🎉 Target Achieved! Great work reaching your 15-device target this month! Keep closing sales to earn extra incentives."
                                } else {
                                    "🎯 Target Update: You are $remainingForTarget device${if (remainingForTarget > 1) "s" else ""} away from reaching your 15-device monthly target. Push your active custody devices to reach your goal!"
                                },
                                fontSize = 11.5.sp,
                                color = MaterialTheme.colorScheme.onSurface,
                                lineHeight = 16.sp
                            )
                        }
                    }
                }
            }
        }

        // Rule 2: Sales Inactivity Alert (No sales in 3+ days)
        if (showInactivityAlert) {
            item {
                Surface(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(14.dp),
                    color = MaterialTheme.colorScheme.surface,
                    tonalElevation = 2.dp,
                    shadowElevation = 1.dp,
                    border = BorderStroke(1.dp, Color(0xFFF59E0B).copy(alpha = 0.35f))
                ) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(14.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Surface(
                                    color = Color(0xFFF59E0B).copy(alpha = 0.15f),
                                    shape = CircleShape,
                                    modifier = Modifier.size(26.dp)
                                ) {
                                    Box(contentAlignment = Alignment.Center) {
                                        Icon(
                                            imageVector = Icons.Default.Warning,
                                            contentDescription = null,
                                            tint = Color(0xFFD97706),
                                            modifier = Modifier.size(14.dp)
                                        )
                                    }
                                }
                                Spacer(modifier = Modifier.width(8.dp))
                                Text(
                                    text = "Sales Activity Alert",
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 13.5.sp,
                                    color = MaterialTheme.colorScheme.onSurface
                                )
                            }

                            val daysCount = daysSinceLastSale ?: 3L
                            Surface(
                                shape = RoundedCornerShape(6.dp),
                                color = Color(0xFFF59E0B).copy(alpha = 0.12f)
                            ) {
                                Text(
                                    text = "$daysCount Days Inactive",
                                    color = Color(0xFFD97706),
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 10.5.sp,
                                    modifier = Modifier.padding(horizontal = 7.dp, vertical = 2.5.dp)
                                )
                            }
                        }

                        // Suggestion
                        Surface(
                            shape = RoundedCornerShape(8.dp),
                            color = Color(0xFFF59E0B).copy(alpha = 0.08f),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Row(
                                modifier = Modifier.padding(10.dp),
                                verticalAlignment = Alignment.Top
                            ) {
                                Icon(
                                    imageVector = Icons.Default.Speed,
                                    contentDescription = null,
                                    tint = Color(0xFFD97706),
                                    modifier = Modifier
                                        .size(15.dp)
                                        .padding(top = 1.dp)
                                )
                                Spacer(modifier = Modifier.width(7.dp))
                                Text(
                                    text = if (daysSinceLastSale != null) {
                                        "⚡ No sales recorded in the last $daysSinceLastSale days. Please do more work, connect with customers, and actively pitch your in-custody devices to close deals!"
                                    } else {
                                        "⚡ You haven't made a sale in over 3 days. You currently have ${myCustodyDevices.size} device(s) in custody. Engage buyers to make your next sale!"
                                    },
                                    fontSize = 11.5.sp,
                                    color = MaterialTheme.colorScheme.onSurface,
                                    lineHeight = 16.sp
                                )
                            }
                        }
                    }
                }
            }
        }

        // Rule 1 Section: Overdue Custody Devices (7+ Days)
        item {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 4.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = Icons.Default.AccessTime,
                        contentDescription = null,
                        tint = if (staleCustodyDevices.isNotEmpty()) Color(0xFFEF4444) else MaterialTheme.colorScheme.primary,
                        modifier = Modifier.size(16.dp)
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = "DEVICES HELD OVER 7 DAYS (${staleCustodyDevices.size})",
                        fontSize = 11.5.sp,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        letterSpacing = 0.5.sp
                    )
                }
            }
        }

        if (staleCustodyDevices.isEmpty()) {
            item {
                Surface(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    color = Color(0xFF10B981).copy(alpha = 0.08f),
                    border = BorderStroke(1.dp, Color(0xFF10B981).copy(alpha = 0.2f))
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(14.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            imageVector = Icons.Default.CheckCircle,
                            contentDescription = null,
                            tint = Color(0xFF10B981),
                            modifier = Modifier.size(22.dp)
                        )
                        Spacer(modifier = Modifier.width(10.dp))
                        Column {
                            Text(
                                text = "All Custody Devices Are Fresh",
                                fontWeight = FontWeight.Bold,
                                fontSize = 12.5.sp,
                                color = MaterialTheme.colorScheme.onSurface
                            )
                            Text(
                                text = "None of your custody devices have exceeded 7 days.",
                                fontSize = 11.sp,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                }
            }
        } else {
            items(staleCustodyDevices, key = { it.first.id }) { (device, days) ->
                StaleDeviceNotificationCard(
                    device = device,
                    daysInCustody = days,
                    onClick = { onSelectDevice(device) },
                    onMarkSold = { onOpenMarkSold(device) }
                )
            }
        }
    }
}

@Composable
fun StaleDeviceNotificationCard(
    device: DeviceDto,
    daysInCustody: Long,
    onClick: () -> Unit,
    onMarkSold: () -> Unit
) {
    val isPendingSale = device.currentStatus.equals("PENDING_SALE", ignoreCase = true)

    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(14.dp),
        color = MaterialTheme.colorScheme.surface,
        tonalElevation = 2.dp,
        shadowElevation = 2.dp,
        border = BorderStroke(
            1.2.dp,
            if (daysInCustody >= 14) Color(0xFFEF4444).copy(alpha = 0.45f)
            else Color(0xFFF59E0B).copy(alpha = 0.4f)
        )
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(13.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            // Header: Model Name + Days in Custody Warning Chip
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.weight(1f, fill = false)
                ) {
                    Icon(
                        imageVector = Icons.Default.PhoneAndroid,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.size(16.dp)
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = device.model,
                        fontWeight = FontWeight.Bold,
                        fontSize = 14.5.sp,
                        color = MaterialTheme.colorScheme.onSurface,
                        maxLines = 1
                    )
                }
                Spacer(modifier = Modifier.width(8.dp))
                Surface(
                    shape = RoundedCornerShape(7.dp),
                    color = (if (daysInCustody >= 14) Color(0xFFEF4444) else Color(0xFFD97706)).copy(alpha = 0.12f),
                    border = BorderStroke(1.dp, (if (daysInCustody >= 14) Color(0xFFEF4444) else Color(0xFFD97706)).copy(alpha = 0.25f))
                ) {
                    Text(
                        text = "⚠️ $daysInCustody Days in Custody",
                        color = if (daysInCustody >= 14) Color(0xFFEF4444) else Color(0xFFD97706),
                        fontWeight = FontWeight.Bold,
                        fontSize = 10.5.sp,
                        modifier = Modifier.padding(horizontal = 7.dp, vertical = 2.5.dp)
                    )
                }
            }

            // Specs Row + Battery Info
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(5.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                device.capacity?.takeIf { it.isNotBlank() }?.let { cap ->
                    val cleanCap = cap.replace("gb", "", ignoreCase = true).trim() + "GB"
                    NotifSpecPill(text = cleanCap, color = MaterialTheme.colorScheme.primary)
                }
                device.color?.takeIf { it.isNotBlank() }?.let { col ->
                    val firstColor = col.trim().split(Regex("[ /,-]")).firstOrNull { it.isNotBlank() } ?: col.trim()
                    NotifSpecPill(text = firstColor, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                device.variant?.takeIf { it.isNotBlank() }?.let { v ->
                    NotifSpecPill(text = v.trim(), color = Color(0xFF8B5CF6))
                }

                // Battery Info (Health & Cycle)
                if (device.batteryHealth != null) {
                    val bHealth = device.batteryHealth
                    val bCycle = device.batteryCycle
                    val bColor = if (bHealth >= 80) Color(0xFF16A34A) else Color(0xFFEAB308)
                    Surface(
                        color = bColor.copy(alpha = 0.10f),
                        shape = RoundedCornerShape(6.dp),
                        border = BorderStroke(0.8.dp, bColor.copy(alpha = 0.25f))
                    ) {
                        Text(
                            text = "🔋 ${bHealth}%" + (if (bCycle != null) " • ${bCycle}c" else ""),
                            fontSize = 10.5.sp,
                            fontWeight = FontWeight.Bold,
                            color = bColor,
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                        )
                    }
                }
            }

            // IMEI Container
            Surface(
                shape = RoundedCornerShape(8.dp),
                color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.35f),
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 8.dp, vertical = 4.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    CopyableText(label = "IMEI", value = device.imei)
                }
            }

            // Rule 1 Suggestion Message Box
            Surface(
                shape = RoundedCornerShape(8.dp),
                color = (if (daysInCustody >= 14) Color(0xFFEF4444) else Color(0xFFD97706)).copy(alpha = 0.08f),
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(
                    modifier = Modifier.padding(8.dp),
                    verticalAlignment = Alignment.Top
                ) {
                    Icon(
                        imageVector = Icons.Default.Info,
                        contentDescription = null,
                        tint = if (daysInCustody >= 14) Color(0xFFEF4444) else Color(0xFFD97706),
                        modifier = Modifier
                            .size(14.dp)
                            .padding(top = 1.dp)
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = "You need to work on this device—it has been in your custody for $daysInCustody days. Expedite testing and push for a sale immediately!",
                        fontSize = 11.sp,
                        color = MaterialTheme.colorScheme.onSurface,
                        lineHeight = 15.sp
                    )
                }
            }

            // Action Buttons (View Details + Mark as Sold)
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Received: ${device.receivedDateBd ?: device.createdAt?.take(10) ?: "N/A"}",
                    fontSize = 10.5.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )

                if (isPendingSale) {
                    Surface(
                        shape = RoundedCornerShape(7.dp),
                        color = Color(0xFFF59E0B).copy(alpha = 0.12f),
                        border = BorderStroke(1.dp, Color(0xFFF59E0B).copy(alpha = 0.3f))
                    ) {
                        Text(
                            text = "⏳ Pending Approval",
                            color = Color(0xFFD97706),
                            fontWeight = FontWeight.Bold,
                            fontSize = 11.sp,
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.5.dp)
                        )
                    }
                } else {
                    Button(
                        onClick = onMarkSold,
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF10B981)),
                        shape = RoundedCornerShape(8.dp),
                        contentPadding = PaddingValues(horizontal = 10.dp, vertical = 4.dp),
                        modifier = Modifier.height(28.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.PointOfSale,
                            contentDescription = null,
                            tint = Color.White,
                            modifier = Modifier.size(12.dp)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            text = "Mark Sold",
                            color = Color.White,
                            fontWeight = FontWeight.Bold,
                            fontSize = 11.sp,
                            maxLines = 1,
                            softWrap = false
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun NotifSpecPill(
    text: String,
    color: Color
) {
    Surface(
        color = color.copy(alpha = 0.09f),
        shape = RoundedCornerShape(6.dp),
        border = BorderStroke(0.7.dp, color.copy(alpha = 0.2f))
    ) {
        Text(
            text = text,
            fontSize = 10.5.sp,
            fontWeight = FontWeight.SemiBold,
            color = color,
            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
            maxLines = 1,
            softWrap = false
        )
    }
}
