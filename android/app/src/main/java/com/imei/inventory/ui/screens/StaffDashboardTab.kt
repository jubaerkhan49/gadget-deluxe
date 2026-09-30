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
import com.imei.inventory.ui.components.CopyableText
import com.imei.inventory.ui.components.StatCard
import com.imei.inventory.ui.components.StatusBadge
import com.imei.inventory.ui.components.VariantBadge
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
        mySales.firstOrNull()?.createdAt?.take(10) ?: "None yet"
    }

    val latestReceivedDate = remember(myDevices) {
        myDevices.mapNotNull { it.receivedDateBd ?: it.createdAt?.take(10) }.maxOrNull() ?: "Recent"
    }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 14.dp, vertical = 10.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        // 1. Staff Hero Card
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
                                    MaterialTheme.colorScheme.primary.copy(alpha = 0.10f),
                                    MaterialTheme.colorScheme.surface
                                )
                            )
                        )
                        .padding(horizontal = 14.dp, vertical = 12.dp)
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
                                shape = CircleShape,
                                modifier = Modifier.size(40.dp)
                            ) {
                                Box(contentAlignment = Alignment.Center) {
                                    Text(
                                        text = (currentUser?.firstName?.firstOrNull() ?: currentUser?.username?.firstOrNull() ?: 'S').uppercase(),
                                        color = Color.White,
                                        fontWeight = FontWeight.ExtraBold,
                                        fontSize = 17.sp
                                    )
                                }
                            }
                            Spacer(modifier = Modifier.width(10.dp))
                            Column {
                                Text(
                                    text = "Welcome, ${currentUser?.firstName ?: (currentUser?.username ?: "Staff")} 👋",
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 15.5.sp,
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
                            color = Color(0xFF16A34A).copy(alpha = 0.12f),
                            shape = RoundedCornerShape(14.dp)
                        ) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                modifier = Modifier.padding(horizontal = 9.dp, vertical = 4.5.dp)
                            ) {
                                Box(
                                    modifier = Modifier
                                        .size(5.dp)
                                        .background(Color(0xFF16A34A), CircleShape)
                                )
                                Spacer(modifier = Modifier.width(4.dp))
                                Text(
                                    text = "In Custody",
                                    color = Color(0xFF16A34A),
                                    fontSize = 10.5.sp,
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

        // 2. Focused 4 Stat Cards
        item {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    StatCard(
                        title = "DEVICES IN CUSTODY",
                        value = "$inCustodyCount",
                        imageVector = Icons.Default.PhoneAndroid,
                        accentColor = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.weight(1f)
                    )
                    StatCard(
                        title = "LAST SOLD DATE",
                        value = lastSoldDate,
                        imageVector = Icons.Default.CalendarToday,
                        accentColor = Color(0xFF10B981),
                        modifier = Modifier.weight(1f)
                    )
                }
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    StatCard(
                        title = "LATEST RECEIVED",
                        value = latestReceivedDate,
                        imageVector = Icons.Default.LocalShipping,
                        accentColor = Color(0xFF8B5CF6),
                        modifier = Modifier.weight(1f)
                    )
                    StatCard(
                        title = "SALES PERFORMANCE",
                        value = if (mySales.size >= 5) "Top Seller" else if (mySales.isNotEmpty()) "Good" else "Active",
                        imageVector = Icons.Default.EmojiEvents,
                        accentColor = Color(0xFFF59E0B),
                        modifier = Modifier.weight(1f)
                    )
                }
            }
        }

        // 3. Section Header
        item {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 2.dp, bottom = 2.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Assigned Devices (${myDevices.size})",
                    fontWeight = FontWeight.Bold,
                    fontSize = 14.5.sp,
                    color = MaterialTheme.colorScheme.onSurface
                )
            }
        }

        // 4. Device Cards List
        if (myDevices.isEmpty()) {
            item {
                Surface(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(14.dp),
                    color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.35f)
                ) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(24.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.Center
                    ) {
                        Icon(
                            imageVector = Icons.Default.PhoneAndroid,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.4f),
                            modifier = Modifier.size(36.dp)
                        )
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
        shape = RoundedCornerShape(14.dp),
        color = MaterialTheme.colorScheme.surface,
        tonalElevation = 1.dp,
        shadowElevation = 1.dp,
        border = BorderStroke(
            1.dp,
            if (isPendingSale) Color(0xFFF59E0B).copy(alpha = 0.35f)
            else MaterialTheme.colorScheme.outline.copy(alpha = 0.12f)
        )
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
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
                        fontSize = 15.sp,
                        color = MaterialTheme.colorScheme.onSurface,
                        maxLines = 1
                    )
                }
                Spacer(modifier = Modifier.width(8.dp))
                StatusBadge(device.currentStatus, device.statusDisplay)
            }

            // Row 2: Specs Pill Chips
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(5.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                device.capacity?.takeIf { it.isNotBlank() }?.let { cap ->
                    val cleanCap = cap.replace("gb", "", ignoreCase = true).trim() + "GB"
                    SpecPill(text = cleanCap, color = MaterialTheme.colorScheme.primary)
                }
                device.color?.takeIf { it.isNotBlank() }?.let { col ->
                    SpecPill(text = col.trim(), color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                device.variant?.takeIf { it.isNotBlank() }?.let { v ->
                    SpecPill(text = v.trim(), color = Color(0xFF8B5CF6))
                }
                if (device.batteryHealth != null) {
                    SpecPill(
                        text = "🔋 ${device.batteryHealth}%" + (device.batteryCycle?.let { " ($it)" } ?: ""),
                        color = if ((device.batteryHealth ?: 100) >= 80) Color(0xFF16A34A) else Color(0xFFEAB308)
                    )
                }
            }

            // Row 3: IMEI Container
            Surface(
                shape = RoundedCornerShape(8.dp),
                color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.35f),
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 8.dp, vertical = 5.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    CopyableText(label = "IMEI", value = device.imei)
                }
            }

            // Row 4: Footer - Received Date & Action Button
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
                        modifier = Modifier.size(12.dp)
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        text = device.receivedDateBd ?: device.createdAt?.take(10) ?: "Assigned",
                        fontSize = 11.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }

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
                } else if (!isSold) {
                    Button(
                        onClick = onMarkSold,
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF10B981)),
                        shape = RoundedCornerShape(8.dp),
                        contentPadding = PaddingValues(horizontal = 10.dp, vertical = 4.dp),
                        modifier = Modifier.height(30.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.PointOfSale,
                            contentDescription = null,
                            tint = Color.White,
                            modifier = Modifier.size(13.dp)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            text = "Mark as Sold",
                            color = Color.White,
                            fontWeight = FontWeight.Bold,
                            fontSize = 11.5.sp,
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
