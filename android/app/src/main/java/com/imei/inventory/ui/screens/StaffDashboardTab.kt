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
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.imei.inventory.data.model.DeviceDto
import com.imei.inventory.data.model.UserDto
import com.imei.inventory.ui.theme.*
import com.imei.inventory.ui.components.CopyableText
import com.imei.inventory.ui.components.DeviceCameraBadge
import com.imei.inventory.ui.components.StatCard
import com.imei.inventory.ui.components.StatusBadge
import com.imei.inventory.ui.components.VariantBadge
import com.imei.inventory.ui.components.formatDateToDDMMYYYY
import com.imei.inventory.viewmodel.MainInventoryViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun StaffDashboardTab(
    token: String,
    viewModel: MainInventoryViewModel,
    currentUser: UserDto? = null,
    onOpenScanner: () -> Unit = {},
    onSelectDevice: (DeviceDto) -> Unit = {},
    onOpenMarkSold: (DeviceDto) -> Unit = {}
) {
    val devices by viewModel.devices.collectAsState()
    val sales by viewModel.sales.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()

    // Filter devices assigned to this staff member
    val myDevices = remember(devices, currentUser) {
        devices.filter { dev ->
            val matchId = dev.currentOwner != null && currentUser?.id != null && dev.currentOwner == currentUser.id
            val matchName = !dev.currentOwnerName.isNullOrBlank() && (
                (currentUser?.username != null && dev.currentOwnerName.equals(currentUser.username, ignoreCase = true)) ||
                (currentUser?.displayName != null && dev.currentOwnerName.equals(currentUser.displayName, ignoreCase = true))
            )
            (matchId || matchName) && !dev.isB2B
        }
    }

    val inCustodyCount = remember(myDevices) {
        myDevices.count { !it.currentStatus.equals("SOLD", ignoreCase = true) }
    }

    // Latest sale by this user
    val mySales = remember(sales, currentUser) {
        sales.filter { sale ->
            (currentUser?.username != null && sale.soldBy?.equals(currentUser.username, ignoreCase = true) == true) ||
            (currentUser?.username != null && sale.sellerName?.equals(currentUser.username, ignoreCase = true) == true) ||
            (currentUser?.displayName != null && sale.sellerName?.equals(currentUser.displayName, ignoreCase = true) == true)
        }
    }

    val lastSoldDate = remember(mySales) {
        formatDateToDDMMYYYY(mySales.firstOrNull()?.createdAt, "None yet")
    }

    val latestReceivedDate = remember(myDevices) {
        val raw = myDevices.mapNotNull { it.receivedDateBd ?: it.createdAt }.maxOrNull()
        formatDateToDDMMYYYY(raw, "Recent")
    }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 10.dp, vertical = 6.dp),
        verticalArrangement = Arrangement.spacedBy(6.dp)
    ) {
        // 1. Staff Hero Card - M3 Expressive
        item {
            Surface(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(14.dp),
                color = MaterialTheme.colorScheme.surfaceContainerLow,
                border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.4f))
            ) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(
                            brush = Brush.linearGradient(
                                colors = listOf(
                                    MaterialTheme.colorScheme.primary.copy(alpha = 0.08f),
                                    MaterialTheme.colorScheme.surfaceContainerLow
                                )
                            )
                        )
                        .padding(horizontal = 12.dp, vertical = 8.dp)
                ) {
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
                                color = MaterialTheme.colorScheme.primary,
                                shape = RoundedCornerShape(10.dp),
                                modifier = Modifier.size(34.dp)
                            ) {
                                Box(contentAlignment = Alignment.Center) {
                                    Text(
                                        text = (currentUser?.firstName?.firstOrNull() ?: currentUser?.username?.firstOrNull() ?: 'S').uppercase(),
                                        color = Color.White,
                                        fontWeight = FontWeight.ExtraBold,
                                        fontSize = 15.sp
                                    )
                                }
                            }
                            Spacer(modifier = Modifier.width(8.dp))
                            Column {
                                Text(
                                    text = "Welcome, ${currentUser?.firstName ?: (currentUser?.username ?: "Staff")} 👋",
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 14.5.sp,
                                    color = MaterialTheme.colorScheme.onSurface,
                                    maxLines = 1
                                )
                                Text(
                                    text = "Staff Custody Portal • @${currentUser?.username ?: "employee"}",
                                    fontSize = 11.sp,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    maxLines = 1
                                )
                            }
                        }

                        Spacer(modifier = Modifier.width(6.dp))

                        Surface(
                            color = AccentEmerald.copy(alpha = 0.12f),
                            shape = RoundedCornerShape(percent = 50),
                            border = BorderStroke(1.dp, AccentEmerald.copy(alpha = 0.25f))
                        ) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                            ) {
                                Box(
                                    modifier = Modifier
                                        .size(5.dp)
                                        .background(AccentEmerald, CircleShape)
                                )
                                Spacer(modifier = Modifier.width(4.dp))
                                Text(
                                    text = "In Custody",
                                    color = AccentEmerald,
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.Bold,
                                    maxLines = 1,
                                    softWrap = false
                                )
                            }
                        }
                    }
                }
            }
        }

        // 2. Focused 4 Stat Cards (Original Design Preserved)
        item {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    StatCard(
                        title = "IN CUSTODY",
                        value = "$inCustodyCount",
                        imageVector = Icons.Default.PhoneAndroid,
                        accentColor = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.weight(1f)
                    )
                    StatCard(
                        title = "LAST SOLD",
                        value = lastSoldDate,
                        imageVector = Icons.Default.CalendarToday,
                        accentColor = AccentEmerald,
                        modifier = Modifier.weight(1f)
                    )
                }
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    StatCard(
                        title = "LATEST RECEIVED",
                        value = latestReceivedDate,
                        imageVector = Icons.Default.LocalShipping,
                        accentColor = AccentPurple,
                        modifier = Modifier.weight(1f)
                    )
                    StatCard(
                        title = "PERFORMANCE",
                        value = if (mySales.size >= 5) "Top Seller" else if (mySales.isNotEmpty()) "Good" else "Active",
                        imageVector = Icons.Default.EmojiEvents,
                        accentColor = AccentAmber,
                        modifier = Modifier.weight(1f)
                    )
                }
            }
        }

        // Device Cards List
        if (myDevices.isEmpty()) {
            item {
                Surface(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(14.dp),
                    color = MaterialTheme.colorScheme.surfaceContainerLow,
                    border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.4f))
                ) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(20.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.Center
                    ) {
                        Surface(
                            shape = RoundedCornerShape(12.dp),
                            color = MaterialTheme.colorScheme.surfaceContainerHigh,
                            modifier = Modifier.size(42.dp)
                        ) {
                            Box(contentAlignment = Alignment.Center) {
                                Icon(
                                    imageVector = Icons.Default.PhoneAndroid,
                                    contentDescription = null,
                                    tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.6f),
                                    modifier = Modifier.size(22.dp)
                                )
                            }
                        }
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = "No devices are currently in your custody.",
                            fontSize = 12.5.sp,
                            fontWeight = FontWeight.Medium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            }
        } else {
            items(myDevices, key = { it.id }) { dev ->
                StaffDeviceCard(
                    device = dev,
                    onClick = { onSelectDevice(dev) },
                    onMarkSold = { onOpenMarkSold(dev) }
                )
            }
        }
    }
}

@Composable
private fun StaffDashboardStatCard(
    title: String,
    value: String,
    imageVector: androidx.compose.ui.graphics.vector.ImageVector,
    accentColor: Color,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier,
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLow),
        shape = RoundedCornerShape(10.dp),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.35f)),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 9.dp, vertical = 6.dp),
            verticalArrangement = Arrangement.spacedBy(2.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = title.uppercase(),
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    fontSize = 8.5.sp,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 0.3.sp,
                    maxLines = 1,
                    overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis,
                    modifier = Modifier.weight(1f, fill = false)
                )
                Surface(
                    color = accentColor.copy(alpha = 0.15f),
                    shape = RoundedCornerShape(6.dp),
                    modifier = Modifier.size(20.dp)
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Icon(
                            imageVector = imageVector,
                            contentDescription = null,
                            tint = accentColor,
                            modifier = Modifier.size(12.dp)
                        )
                    }
                }
            }

            Text(
                text = value,
                color = MaterialTheme.colorScheme.onSurface,
                fontSize = 13.sp,
                fontWeight = FontWeight.ExtraBold,
                maxLines = 1,
                overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis
            )
        }
    }
}

@Composable
fun StaffDeviceCard(
    device: DeviceDto,
    onClick: () -> Unit,
    onMarkSold: () -> Unit
) {
    val isPendingSale = device.currentStatus.equals("PENDING_SALE", ignoreCase = true)
    val isSold = device.currentStatus.equals("SOLD", ignoreCase = true)

    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(12.dp),
        color = MaterialTheme.colorScheme.surfaceContainerLow,
        border = BorderStroke(
            1.dp,
            if (isPendingSale) Color(0xFFF59E0B).copy(alpha = 0.4f)
            else MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.35f)
        )
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 10.dp, vertical = 8.dp),
            verticalArrangement = Arrangement.spacedBy(5.dp)
        ) {
            // Row 1: Model Name + Status Badge
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
                        shape = RoundedCornerShape(8.dp),
                        color = MaterialTheme.colorScheme.primary.copy(alpha = 0.12f),
                        modifier = Modifier.size(24.dp)
                    ) {
                        Box(contentAlignment = Alignment.Center) {
                            Icon(
                                imageVector = Icons.Default.PhoneAndroid,
                                contentDescription = null,
                                tint = MaterialTheme.colorScheme.primary,
                                modifier = Modifier.size(14.dp)
                            )
                        }
                    }
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = device.model,
                        fontWeight = FontWeight.Bold,
                        fontSize = 13.5.sp,
                        color = MaterialTheme.colorScheme.onSurface,
                        maxLines = 1,
                        overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis
                    )
                    val photoCount = device.allPhotos.size
                    if (photoCount > 0) {
                        Spacer(modifier = Modifier.width(6.dp))
                        DeviceCameraBadge(count = photoCount)
                    }
                }
                Spacer(modifier = Modifier.width(6.dp))
                StatusBadge(device.currentStatus, device.statusDisplay)
            }

            // Row 2: Specs Pill Chips
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(4.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                device.capacity?.takeIf { it.isNotBlank() }?.let { cap ->
                    val cleanCap = cap.replace("gb", "", ignoreCase = true).trim() + "GB"
                    SpecPill(text = cleanCap, color = MaterialTheme.colorScheme.primary)
                }
                device.color?.takeIf { it.isNotBlank() }?.let { col ->
                    val firstColorWord = col.trim().split(Regex("[ /,-]")).firstOrNull { it.isNotBlank() } ?: col.trim()
                    SpecPill(text = firstColorWord, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                device.variant?.takeIf { it.isNotBlank() }?.let { v ->
                    SpecPill(text = v.trim(), color = AccentPurple)
                }
                if (device.batteryHealth != null) {
                    SpecPill(
                        text = "🔋 ${device.batteryHealth}%" + (device.batteryCycle?.let { " ($it)" } ?: ""),
                        color = if ((device.batteryHealth ?: 100) >= 80) AccentEmerald else AccentAmber
                    )
                }
            }

            // Row 3: Monospace IMEI (Reduced Compact Area)
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                CopyableText(label = "IMEI", value = device.imei)
            }

            // Row 4: Assigned Date (Left) + Action Button (Right)
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = Icons.Default.CalendarToday,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.7f),
                        modifier = Modifier.size(11.dp)
                    )
                    Spacer(modifier = Modifier.width(3.dp))
                    Text(
                        text = formatDateToDDMMYYYY(device.receivedDateBd ?: device.createdAt, "Assigned"),
                        fontSize = 11.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }

                if (isPendingSale) {
                    Surface(
                        shape = RoundedCornerShape(percent = 50),
                        color = AccentAmber.copy(alpha = 0.12f),
                        border = BorderStroke(0.8.dp, AccentAmber.copy(alpha = 0.3f))
                    ) {
                        Text(
                            text = "⏳ Pending Approval",
                            color = AccentAmber,
                            fontWeight = FontWeight.Bold,
                            fontSize = 10.5.sp,
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp)
                        )
                    }
                } else if (!isSold) {
                    Button(
                        onClick = onMarkSold,
                        colors = ButtonDefaults.buttonColors(containerColor = AccentEmerald),
                        shape = RoundedCornerShape(percent = 50),
                        contentPadding = PaddingValues(horizontal = 10.dp, vertical = 2.dp),
                        modifier = Modifier.height(28.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.PointOfSale,
                            contentDescription = null,
                            tint = Color.White,
                            modifier = Modifier.size(12.dp)
                        )
                        Spacer(modifier = Modifier.width(3.dp))
                        Text(
                            text = "Mark as Sold",
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
private fun SpecPill(
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
            color = color,
            fontSize = 9.5.sp,
            fontWeight = FontWeight.SemiBold,
            modifier = Modifier.padding(horizontal = 5.dp, vertical = 1.dp)
        )
    }
}
