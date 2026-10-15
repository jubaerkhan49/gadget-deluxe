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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.imei.inventory.data.model.DeviceDto
import com.imei.inventory.data.model.SaleDto
import com.imei.inventory.data.model.UserDto
import com.imei.inventory.ui.components.CopyableText
import com.imei.inventory.ui.components.formatDateToDDMMYYYY
import com.imei.inventory.ui.theme.*
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

fun formatReadableDate(dateStr: String?): String {
    return formatDateToDDMMYYYY(dateStr, "N/A")
}

fun getDeviceAssignedDateStr(dev: DeviceDto, currentUser: UserDto?): String? {
    val userAssignment = dev.assignments?.firstOrNull { assign ->
        (currentUser?.id != null && assign.employee == currentUser.id) ||
        (currentUser?.username != null && assign.employeeUsername.equals(currentUser.username, ignoreCase = true)) ||
        (currentUser?.displayName != null && assign.employeeName.equals(currentUser.displayName, ignoreCase = true))
    }
    if (!userAssignment?.assignedDate.isNullOrBlank()) {
        return userAssignment?.assignedDate
    }
    if (!dev.assignedDate.isNullOrBlank()) {
        return dev.assignedDate
    }
    return dev.receivedDateBd ?: dev.createdAt
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

    // Rule 1: Devices held for 7 days or more from assignment date
    val staleCustodyDevices = remember(myCustodyDevices, currentUser) {
        myCustodyDevices.mapNotNull { dev ->
            val assignDate = getDeviceAssignedDateStr(dev, currentUser)
            val days = calculateDaysAgo(assignDate) ?: 0L
            if (days >= 7L) Pair(dev, days) else null
        }.sortedByDescending { it.second }
    }

    // Rule 2: Inability to sell within 3 days
    val latestSale = remember(mySales) {
        mySales.maxByOrNull { it.createdAt ?: "" }
    }
    val daysSinceLastSale = remember(latestSale) {
        calculateDaysAgo(latestSale?.createdAt)
    }
    val showInactivityAlert = remember(daysSinceLastSale, myCustodyDevices, mySales, currentUser) {
        if (daysSinceLastSale != null && daysSinceLastSale >= 3L) {
            true
        } else if (mySales.isEmpty() && myCustodyDevices.isNotEmpty()) {
            val oldestCustody = myCustodyDevices.mapNotNull {
                calculateDaysAgo(getDeviceAssignedDateStr(it, currentUser))
            }.maxOrNull() ?: 0L
            oldestCustody >= 3L
        } else {
            false
        }
    }

    // Rule 3: Monthly selling target (15 devices per month)
    val currentCal = Calendar.getInstance()
    val curYear = currentCal.get(Calendar.YEAR)
    val curMonth = currentCal.get(Calendar.MONTH)
    val curDayOfMonth = currentCal.get(Calendar.DAY_OF_MONTH)
    val maxDaysInMonth = currentCal.getActualMaximum(Calendar.DAY_OF_MONTH)
    val daysLeftInMonth = maxOf(1, maxDaysInMonth - curDayOfMonth + 1)

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

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 12.dp, vertical = 8.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        // Rule 3: Monthly Target Card (M3 Expressive)
        item {
            Surface(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(20.dp),
                color = MaterialTheme.colorScheme.surfaceContainerLow,
                border = BorderStroke(1.dp, MaterialTheme.colorScheme.primary.copy(alpha = 0.25f))
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
                            Surface(
                                shape = RoundedCornerShape(10.dp),
                                color = AccentAmber.copy(alpha = 0.15f),
                                modifier = Modifier.size(28.dp)
                            ) {
                                Box(contentAlignment = Alignment.Center) {
                                    Icon(
                                        imageVector = Icons.Default.EmojiEvents,
                                        contentDescription = null,
                                        tint = AccentAmber,
                                        modifier = Modifier.size(16.dp)
                                    )
                                }
                            }
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = "Monthly Sales Target",
                                fontWeight = FontWeight.Bold,
                                fontSize = 14.sp,
                                color = MaterialTheme.colorScheme.onSurface
                            )
                        }
                        Surface(
                            shape = RoundedCornerShape(percent = 50),
                            color = if (remainingForTarget == 0) AccentEmerald.copy(alpha = 0.15f) else MaterialTheme.colorScheme.primary.copy(alpha = 0.15f),
                            border = BorderStroke(1.dp, (if (remainingForTarget == 0) AccentEmerald else MaterialTheme.colorScheme.primary).copy(alpha = 0.3f))
                        ) {
                            Text(
                                text = "$currentMonthSalesCount / $monthlyTarget Sold",
                                color = if (remainingForTarget == 0) AccentEmerald else MaterialTheme.colorScheme.primary,
                                fontWeight = FontWeight.Bold,
                                fontSize = 11.sp,
                                modifier = Modifier.padding(horizontal = 9.dp, vertical = 3.dp)
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
                                .clip(RoundedCornerShape(percent = 50)),
                            color = if (remainingForTarget == 0) AccentEmerald else MaterialTheme.colorScheme.primary,
                            trackColor = MaterialTheme.colorScheme.surfaceContainerHigh
                        )
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text(
                                text = "${(targetProgress * 100).toInt()}% completed",
                                fontSize = 10.5.sp,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                            Text(
                                text = "$daysLeftInMonth day${if (daysLeftInMonth > 1) "s" else ""} left in month",
                                fontSize = 10.5.sp,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }

                    // User Required Target Update Text
                    Surface(
                        shape = RoundedCornerShape(12.dp),
                        color = (if (remainingForTarget == 0) AccentEmerald else MaterialTheme.colorScheme.primary).copy(alpha = 0.08f),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                imageVector = if (remainingForTarget == 0) Icons.Default.CheckCircle else Icons.Default.TrendingUp,
                                contentDescription = null,
                                tint = if (remainingForTarget == 0) AccentEmerald else MaterialTheme.colorScheme.primary,
                                modifier = Modifier.size(16.dp)
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = if (remainingForTarget == 0) {
                                    "🎉 Target Achieved: You reached your 15-devices monthly target!"
                                } else {
                                    "Target Update: You are $remainingForTarget device${if (remainingForTarget > 1) "s" else ""} away from reaching your 15-devices monthly target."
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

        // Rule 2: Sales Inactivity Alert (M3 Expressive)
        if (showInactivityAlert) {
            item {
                Surface(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(20.dp),
                    color = MaterialTheme.colorScheme.surfaceContainerLow,
                    border = BorderStroke(1.dp, AccentAmber.copy(alpha = 0.35f))
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
                                    shape = RoundedCornerShape(10.dp),
                                    color = AccentAmber.copy(alpha = 0.15f),
                                    modifier = Modifier.size(28.dp)
                                ) {
                                    Box(contentAlignment = Alignment.Center) {
                                        Icon(
                                            imageVector = Icons.Default.Warning,
                                            contentDescription = null,
                                            tint = AccentAmber,
                                            modifier = Modifier.size(16.dp)
                                        )
                                    }
                                }
                                Spacer(modifier = Modifier.width(8.dp))
                                Text(
                                    text = "Sales Activity Alert",
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 14.sp,
                                    color = MaterialTheme.colorScheme.onSurface
                                )
                            }

                            val daysCount = daysSinceLastSale ?: 3L
                            Surface(
                                shape = RoundedCornerShape(percent = 50),
                                color = AccentAmber.copy(alpha = 0.15f),
                                border = BorderStroke(1.dp, AccentAmber.copy(alpha = 0.3f))
                            ) {
                                Text(
                                    text = "$daysCount Days Inactive",
                                    color = AccentAmber,
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 10.5.sp,
                                    modifier = Modifier.padding(horizontal = 9.dp, vertical = 3.dp)
                                )
                            }
                        }

                        // Suggestion Container
                        val daysCount = daysSinceLastSale ?: 3L
                        Surface(
                            shape = RoundedCornerShape(12.dp),
                            color = AccentAmber.copy(alpha = 0.08f),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Row(
                                modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Icon(
                                    imageVector = Icons.Default.Speed,
                                    contentDescription = null,
                                    tint = AccentAmber,
                                    modifier = Modifier.size(15.dp)
                                )
                                Spacer(modifier = Modifier.width(8.dp))
                                Text(
                                    text = "No sales recorded in the last $daysCount days. Time to close new sales!",
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
                    .padding(top = 2.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(
                    imageVector = Icons.Default.AccessTime,
                    contentDescription = null,
                    tint = if (staleCustodyDevices.isNotEmpty()) AccentRose else MaterialTheme.colorScheme.primary,
                    modifier = Modifier.size(15.dp)
                )
                Spacer(modifier = Modifier.width(5.dp))
                Text(
                    text = "DEVICES HELD OVER 7 DAYS (${staleCustodyDevices.size})",
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    letterSpacing = 0.4.sp
                )
            }
        }

        if (staleCustodyDevices.isEmpty()) {
            item {
                Surface(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(20.dp),
                    color = AccentEmerald.copy(alpha = 0.08f),
                    border = BorderStroke(1.dp, AccentEmerald.copy(alpha = 0.25f))
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Surface(
                            shape = RoundedCornerShape(12.dp),
                            color = AccentEmerald.copy(alpha = 0.15f),
                            modifier = Modifier.size(36.dp)
                        ) {
                            Box(contentAlignment = Alignment.Center) {
                                Icon(
                                    imageVector = Icons.Default.CheckCircle,
                                    contentDescription = null,
                                    tint = AccentEmerald,
                                    modifier = Modifier.size(20.dp)
                                )
                            }
                        }
                        Spacer(modifier = Modifier.width(12.dp))
                        Column {
                            Text(
                                text = "All Custody Devices Are Fresh",
                                fontWeight = FontWeight.Bold,
                                fontSize = 13.sp,
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
                    currentUser = currentUser,
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
    currentUser: UserDto? = null,
    onClick: () -> Unit,
    onMarkSold: () -> Unit
) {
    val isPendingSale = device.currentStatus.equals("PENDING_SALE", ignoreCase = true)
    val assignedDateStr = remember(device, currentUser) {
        getDeviceAssignedDateStr(device, currentUser)
    }
    val readableDate = remember(assignedDateStr) {
        formatReadableDate(assignedDateStr)
    }

    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(20.dp),
        color = MaterialTheme.colorScheme.surfaceContainerLow,
        border = BorderStroke(
            1.dp,
            if (daysInCustody >= 14) AccentRose.copy(alpha = 0.40f)
            else AccentAmber.copy(alpha = 0.35f)
        )
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(14.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            // Row 1: Model Name + Days in Custody Chip
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.weight(1f, fill = false)
                ) {
                    Surface(
                        shape = RoundedCornerShape(10.dp),
                        color = MaterialTheme.colorScheme.primary.copy(alpha = 0.12f),
                        modifier = Modifier.size(28.dp)
                    ) {
                        Box(contentAlignment = Alignment.Center) {
                            Icon(
                                imageVector = Icons.Default.PhoneAndroid,
                                contentDescription = null,
                                tint = MaterialTheme.colorScheme.primary,
                                modifier = Modifier.size(15.dp)
                            )
                        }
                    }
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = device.model,
                        fontWeight = FontWeight.Bold,
                        fontSize = 14.5.sp,
                        color = MaterialTheme.colorScheme.onSurface,
                        maxLines = 1
                    )
                }
                Spacer(modifier = Modifier.width(6.dp))
                Surface(
                    shape = RoundedCornerShape(percent = 50),
                    color = (if (daysInCustody >= 14) AccentRose else AccentAmber).copy(alpha = 0.12f),
                    border = BorderStroke(1.dp, (if (daysInCustody >= 14) AccentRose else AccentAmber).copy(alpha = 0.3f))
                ) {
                    Text(
                        text = "⚠️ $daysInCustody Days in Custody",
                        color = if (daysInCustody >= 14) AccentRose else AccentAmber,
                        fontWeight = FontWeight.Bold,
                        fontSize = 10.5.sp,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp),
                        maxLines = 1,
                        softWrap = false
                    )
                }
            }

            // Row 2: Specs Pill Chips & Battery Info
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
                    NotifSpecPill(text = v.trim(), color = AccentPurple)
                }

                // Battery Info
                if (device.batteryHealth != null) {
                    val bHealth = device.batteryHealth
                    val bCycle = device.batteryCycle
                    val bColor = if (bHealth >= 80) AccentEmerald else AccentAmber
                    Surface(
                        color = bColor.copy(alpha = 0.10f),
                        shape = RoundedCornerShape(percent = 50),
                        border = BorderStroke(0.8.dp, bColor.copy(alpha = 0.25f))
                    ) {
                        Text(
                            text = "🔋 ${bHealth}%" + (if (bCycle != null) " ($bCycle)" else ""),
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold,
                            color = bColor,
                            modifier = Modifier.padding(horizontal = 7.dp, vertical = 2.dp),
                            maxLines = 1,
                            softWrap = false
                        )
                    }
                }
            }

            // Row 3: Monospace Copyable IMEI
            Surface(
                shape = RoundedCornerShape(12.dp),
                color = MaterialTheme.colorScheme.surfaceContainerHighest.copy(alpha = 0.45f),
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 9.dp, vertical = 5.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    CopyableText(label = "IMEI", value = device.imei)
                }
            }

            // Row 4: Shortened Suggestion Message
            Surface(
                shape = RoundedCornerShape(10.dp),
                color = (if (daysInCustody >= 14) AccentRose else AccentAmber).copy(alpha = 0.08f),
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 9.dp, vertical = 6.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        imageVector = Icons.Default.Info,
                        contentDescription = null,
                        tint = if (daysInCustody >= 14) AccentRose else AccentAmber,
                        modifier = Modifier.size(14.dp)
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = "It has been in your custody for $daysInCustody days!",
                        fontSize = 11.5.sp,
                        fontWeight = FontWeight.Medium,
                        color = MaterialTheme.colorScheme.onSurface,
                        lineHeight = 15.sp
                    )
                }
            }

            // Row 5: Formatted Assigned Date + Action Button
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Assigned: $readableDate",
                    fontSize = 11.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )

                if (isPendingSale) {
                    Surface(
                        shape = RoundedCornerShape(percent = 50),
                        color = AccentAmber.copy(alpha = 0.12f),
                        border = BorderStroke(1.dp, AccentAmber.copy(alpha = 0.3f))
                    ) {
                        Text(
                            text = "⏳ Pending Approval",
                            color = AccentAmber,
                            fontWeight = FontWeight.Bold,
                            fontSize = 11.sp,
                            modifier = Modifier.padding(horizontal = 9.dp, vertical = 3.5.dp)
                        )
                    }
                } else {
                    Button(
                        onClick = onMarkSold,
                        colors = ButtonDefaults.buttonColors(containerColor = AccentEmerald),
                        shape = RoundedCornerShape(percent = 50),
                        contentPadding = PaddingValues(horizontal = 12.dp, vertical = 4.dp),
                        modifier = Modifier.height(30.dp)
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
        shape = RoundedCornerShape(percent = 50),
        border = BorderStroke(0.8.dp, color.copy(alpha = 0.25f))
    ) {
        Text(
            text = text,
            fontSize = 10.5.sp,
            fontWeight = FontWeight.SemiBold,
            color = color,
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp),
            maxLines = 1,
            softWrap = false
        )
    }
}
