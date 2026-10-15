package com.imei.inventory.ui.screens

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.imei.inventory.data.model.DeviceDto
import com.imei.inventory.data.model.DeviceSaleRequestDto
import com.imei.inventory.data.model.UserDto
import com.imei.inventory.ui.theme.*
import com.imei.inventory.ui.components.CopyableText
import com.imei.inventory.ui.components.StatCard
import com.imei.inventory.ui.components.StatusBadge
import com.imei.inventory.ui.components.VariantBadge
import com.imei.inventory.ui.components.formatDateToDDMMYYYY
import com.imei.inventory.ui.components.formatIndianNumber
import com.imei.inventory.viewmodel.MainInventoryViewModel

@Composable
fun DashboardTab(
    token: String,
    viewModel: MainInventoryViewModel,
    currentUser: UserDto? = null,
    onNavigateToTab: (Int) -> Unit,
    onSelectDevice: (DeviceDto) -> Unit,
    onOpenScanner: () -> Unit,
    onOpenAddShipment: () -> Unit,
    onOpenSaleApproval: (DeviceSaleRequestDto) -> Unit = {}
) {
    val stats by viewModel.stats.collectAsState()
    val devices by viewModel.devices.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()
    val pendingSaleRequests by viewModel.pendingSaleRequests.collectAsState()
    val vmUser by viewModel.currentUser.collectAsState()
    val effectiveUser = currentUser ?: vmUser

    // Filter devices in current user's physical custody (not B2B, not SOLD), sorted descending by date
    val myAssignedDevices = remember(devices, effectiveUser) {
        devices.filter { dev ->
            val matchId = dev.currentOwner != null && effectiveUser?.id != null && dev.currentOwner == effectiveUser.id
            val matchName = !dev.currentOwnerName.isNullOrBlank() && (
                (effectiveUser?.username != null && dev.currentOwnerName.equals(effectiveUser.username, ignoreCase = true)) ||
                (effectiveUser?.displayName != null && dev.currentOwnerName.equals(effectiveUser.displayName, ignoreCase = true))
            )
            (matchId || matchName) && !dev.isB2B && !dev.currentStatus.equals("SOLD", ignoreCase = true)
        }.sortedWith(
            compareByDescending<DeviceDto> { it.receivedDateBd ?: it.createdAt ?: "" }
                .thenByDescending { it.id }
        )
    }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Pending Sale Approvals Alert Banner (Admin) - Harmonized M3 Expressive
        if (pendingSaleRequests.isNotEmpty()) {
            item {
                val firstReq = pendingSaleRequests.first()
                Surface(
                    onClick = { onOpenSaleApproval(firstReq) },
                    shape = RoundedCornerShape(18.dp),
                    color = MaterialTheme.colorScheme.tertiaryContainer.copy(alpha = 0.45f),
                    border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.tertiary.copy(alpha = 0.35f)),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 14.dp, vertical = 10.dp),
                        verticalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                Surface(
                                    color = MaterialTheme.colorScheme.tertiary,
                                    shape = RoundedCornerShape(10.dp),
                                    modifier = Modifier.size(24.dp)
                                ) {
                                    Box(contentAlignment = Alignment.Center) {
                                        Icon(
                                            imageVector = Icons.Default.NotificationsActive,
                                            contentDescription = null,
                                            tint = Color.White,
                                            modifier = Modifier.size(14.dp)
                                        )
                                    }
                                }
                                Text(
                                    text = if (pendingSaleRequests.size == 1) "Sale Approval Pending" else "${pendingSaleRequests.size} Sale Approvals Pending",
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 12.5.sp,
                                    color = MaterialTheme.colorScheme.onTertiaryContainer
                                )
                                Surface(
                                    color = AccentRose,
                                    shape = RoundedCornerShape(percent = 50)
                                ) {
                                    Text(
                                        text = "${pendingSaleRequests.size}",
                                        color = Color.White,
                                        fontSize = 9.sp,
                                        fontWeight = FontWeight.Bold,
                                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 1.dp)
                                    )
                                }
                            }

                            Surface(
                                shape = RoundedCornerShape(percent = 50),
                                color = MaterialTheme.colorScheme.tertiary,
                                modifier = Modifier.height(26.dp)
                            ) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    modifier = Modifier.padding(horizontal = 10.dp)
                                ) {
                                    Text(
                                        text = "Review →",
                                        color = Color.White,
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 11.sp
                                    )
                                }
                            }
                        }

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = "${firstReq.deviceModel ?: "Device"} • ${firstReq.employeeName ?: (firstReq.employeeUsername ?: "Staff")}",
                                fontSize = 11.5.sp,
                                fontWeight = FontWeight.Medium,
                                color = MaterialTheme.colorScheme.onSurface,
                                maxLines = 1,
                                overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis,
                                modifier = Modifier.weight(1f, fill = false)
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                text = "BDT ${formatIndianNumber(firstReq.proposedPrice)}",
                                fontSize = 11.5.sp,
                                fontWeight = FontWeight.Bold,
                                color = AccentEmerald
                            )
                        }
                    }
                }
            }
        }

        // Top Header
        item {
            Column {
                Text(
                    text = "Operational Dashboard",
                    color = MaterialTheme.colorScheme.onBackground,
                    fontSize = 22.sp,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    text = "Real-time inventory status & sales performance",
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    fontSize = 13.sp
                )
            }
        }

        // Stats Grid
        item {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    StatCard(
                        title = "TOTAL DEVICES",
                        value = "${stats.totalDevices}",
                        imageVector = Icons.Default.PhoneAndroid,
                        accentColor = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.weight(1f)
                    )
                    StatCard(
                        title = "IN STOCK",
                        value = "${stats.inStock}",
                        imageVector = Icons.Default.CheckCircle,
                        accentColor = AccentEmerald,
                        modifier = Modifier.weight(1f)
                    )
                }
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    StatCard(
                        title = "UNDER REPAIR",
                        value = "${stats.underRepair}",
                        imageVector = Icons.Default.Build,
                        accentColor = AccentAmber,
                        modifier = Modifier.weight(1f)
                    )
                    StatCard(
                        title = "SOLD UNITS",
                        value = "${stats.sold}",
                        imageVector = Icons.Default.ShoppingBag,
                        accentColor = AccentBlue,
                        modifier = Modifier.weight(1f)
                    )
                }
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    StatCard(
                        title = "TODAY'S SALES",
                        value = formatIndianNumber(stats.todaySalesAmount),
                        imageVector = Icons.Default.AttachMoney,
                        accentColor = AccentEmerald,
                        modifier = Modifier.weight(1f)
                    )
                    StatCard(
                        title = "TOTAL ASSETS",
                        value = formatIndianNumber(stats.totalAssets),
                        imageVector = Icons.Default.AccountBalance,
                        accentColor = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.weight(1f)
                    )
                }
            }
        }

        // Quick Action Buttons
        item {
            Text(
                text = "Quick Actions",
                color = MaterialTheme.colorScheme.onSurface,
                fontSize = 15.sp,
                fontWeight = FontWeight.SemiBold
            )
            Spacer(modifier = Modifier.height(8.dp))
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                Button(
                    onClick = onOpenScanner,
                    colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary),
                    shape = RoundedCornerShape(percent = 50),
                    contentPadding = PaddingValues(horizontal = 16.dp, vertical = 10.dp),
                    modifier = Modifier.weight(1f).height(42.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.QrCodeScanner,
                        contentDescription = null,
                        tint = Color.White,
                        modifier = Modifier.size(17.dp)
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text("Scan IMEI", color = Color.White, fontSize = 13.sp, fontWeight = FontWeight.Bold)
                }
                FilledTonalButton(
                    onClick = onOpenAddShipment,
                    colors = ButtonDefaults.filledTonalButtonColors(
                        containerColor = MaterialTheme.colorScheme.primary.copy(alpha = 0.10f),
                        contentColor = MaterialTheme.colorScheme.primary
                    ),
                    shape = RoundedCornerShape(percent = 50),
                    contentPadding = PaddingValues(horizontal = 16.dp, vertical = 10.dp),
                    modifier = Modifier.weight(1f).height(42.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.LocalShipping,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.size(17.dp)
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text("New Shipment", color = MaterialTheme.colorScheme.primary, fontSize = 13.sp, fontWeight = FontWeight.Bold)
                }
            }
        }

        // My Assigned Devices in Physical Custody Section Header
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "My Assigned Devices (${myAssignedDevices.size})",
                    color = MaterialTheme.colorScheme.onBackground,
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Bold
                )
            }
        }

        // List of Assigned Devices
        if (myAssignedDevices.isEmpty()) {
            item {
                Surface(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(20.dp),
                    color = MaterialTheme.colorScheme.surfaceContainerLow,
                    border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.4f))
                ) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(28.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.Center
                    ) {
                        if (isLoading) {
                            CircularProgressIndicator(
                                color = MaterialTheme.colorScheme.primary,
                                modifier = Modifier.size(32.dp)
                            )
                            Spacer(modifier = Modifier.height(12.dp))
                            Text(
                                text = "Loading assigned inventory...",
                                fontSize = 13.sp,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        } else {
                            Surface(
                                shape = RoundedCornerShape(16.dp),
                                color = MaterialTheme.colorScheme.surfaceContainerHigh,
                                modifier = Modifier.size(52.dp)
                            ) {
                                Box(contentAlignment = Alignment.Center) {
                                    Icon(
                                        imageVector = Icons.Default.PhoneAndroid,
                                        contentDescription = null,
                                        tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.6f),
                                        modifier = Modifier.size(28.dp)
                                    )
                                }
                            }
                            Spacer(modifier = Modifier.height(12.dp))
                            Text(
                                text = "No devices are currently assigned to your custody.",
                                fontSize = 13.sp,
                                fontWeight = FontWeight.Medium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                }
            }
        } else {
            items(myAssignedDevices, key = { it.id }) { device ->
                AdminAssignedDeviceCard(
                    device = device,
                    onClick = { onSelectDevice(device) }
                )
            }
        }
    }
}

@Composable
fun AdminAssignedDeviceCard(
    device: DeviceDto,
    onClick: () -> Unit
) {
    Card(
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(12.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
        border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f))
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 12.dp, vertical = 7.dp),
            verticalArrangement = Arrangement.spacedBy(4.5.dp)
        ) {
            // Row 1: Model & Specs (Left) + StatusBadge (Right)
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.Top
            ) {
                Column(modifier = Modifier.weight(1f, fill = false)) {
                    Text(
                        text = device.model,
                        fontWeight = FontWeight.Bold,
                        fontSize = 14.5.sp,
                        color = MaterialTheme.colorScheme.onSurface,
                        maxLines = 1
                    )
                    val specParts = listOfNotNull(
                        device.capacity?.takeIf { it.isNotBlank() }?.let { cap ->
                            cap.replace("gb", "", ignoreCase = true).trim() + "GB"
                        },
                        device.color?.takeIf { it.isNotBlank() }?.trim()
                    )
                    if (specParts.isNotEmpty()) {
                        Text(
                            text = specParts.joinToString(" • "),
                            fontSize = 11.5.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            maxLines = 1
                        )
                    }
                }
                Spacer(modifier = Modifier.width(8.dp))
                StatusBadge(device.currentStatus, device.statusDisplay)
            }

            // Row 2: Monospace Copyable IMEI + Variant Badge (compact inline row)
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                CopyableText(label = "IMEI", value = device.imei)
                VariantBadge(device.variant)
            }

            // Row 3: Battery Health & Cycle Count (Left) + Received Date (Right)
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Battery Health + CC
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    Text(
                        text = "Battery:",
                        fontSize = 11.5.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Text(
                        text = device.batteryHealth?.let { "$it%" } ?: "—",
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                    device.batteryCycle?.let { cc ->
                        Surface(
                            color = AccentBlue.copy(alpha = 0.12f),
                            shape = RoundedCornerShape(percent = 50),
                            border = androidx.compose.foundation.BorderStroke(0.8.dp, AccentBlue.copy(alpha = 0.3f))
                        ) {
                            Text(
                                text = "CC $cc",
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold,
                                fontFamily = FontFamily.Monospace,
                                color = AccentBlue,
                                modifier = Modifier.padding(horizontal = 7.dp, vertical = 2.dp)
                            )
                        }
                    }
                }

                // Received Date
                val recDate = formatDateToDDMMYYYY(device.receivedDateBd ?: device.createdAt)
                if (recDate.isNotBlank()) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            imageVector = Icons.Default.CalendarToday,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.7f),
                            modifier = Modifier.size(12.dp)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            text = recDate,
                            fontSize = 11.5.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            }
        }
    }
}
