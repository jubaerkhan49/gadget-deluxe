package com.imei.inventory.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
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

    var searchQuery by remember { mutableStateOf("") }

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

    // Filtered list for display by search query only (status filter chips removed)
    val filteredAssigned = remember(myDevices, searchQuery) {
        if (searchQuery.isBlank()) {
            myDevices
        } else {
            val q = searchQuery.trim().lowercase()
            myDevices.filter { dev ->
                dev.model.lowercase().contains(q) ||
                dev.imei.lowercase().contains(q) ||
                dev.imei2?.lowercase()?.contains(q) == true ||
                dev.serialNumber?.lowercase()?.contains(q) == true ||
                dev.color?.lowercase()?.contains(q) == true ||
                dev.capacity?.lowercase()?.contains(q) == true
            }
        }
    }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 16.dp, vertical = 12.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        // 1. Staff Hero Card with non-squished horizontal badge
        item {
            Surface(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(20.dp),
                color = MaterialTheme.colorScheme.surface,
                tonalElevation = 2.dp,
                shadowElevation = 3.dp
            ) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(
                            brush = Brush.linearGradient(
                                colors = listOf(
                                    MaterialTheme.colorScheme.primary.copy(alpha = 0.12f),
                                    MaterialTheme.colorScheme.surface
                                )
                            )
                        )
                        .padding(16.dp)
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
                                modifier = Modifier.size(44.dp)
                            ) {
                                Box(contentAlignment = Alignment.Center) {
                                    Text(
                                        text = (currentUser?.firstName?.firstOrNull() ?: currentUser?.username?.firstOrNull() ?: 'S').uppercase(),
                                        color = Color.White,
                                        fontWeight = FontWeight.ExtraBold,
                                        fontSize = 19.sp
                                    )
                                }
                            }
                            Spacer(modifier = Modifier.width(12.dp))
                            Column {
                                Text(
                                    text = "Welcome, ${currentUser?.firstName ?: (currentUser?.username ?: "Staff")} 👋",
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 17.sp,
                                    color = MaterialTheme.colorScheme.onSurface,
                                    maxLines = 1
                                )
                                Text(
                                    text = "Staff Custody Portal • @${currentUser?.username ?: "employee"}",
                                    fontSize = 11.5.sp,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    maxLines = 1
                                )
                            }
                        }

                        Spacer(modifier = Modifier.width(8.dp))

                        Surface(
                            color = Color(0xFF16A34A).copy(alpha = 0.12f),
                            shape = RoundedCornerShape(20.dp)
                        ) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp)
                            ) {
                                Box(
                                    modifier = Modifier
                                        .size(6.dp)
                                        .background(Color(0xFF16A34A), CircleShape)
                                )
                                Spacer(modifier = Modifier.width(5.dp))
                                Text(
                                    text = "In Custody",
                                    color = Color(0xFF16A34A),
                                    fontSize = 11.sp,
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
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
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
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
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

        // 3. Search & Scan Action Bar
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                OutlinedTextField(
                    value = searchQuery,
                    onValueChange = { searchQuery = it },
                    placeholder = { Text("Filter by model, IMEI...", fontSize = 13.sp) },
                    leadingIcon = {
                        Icon(
                            imageVector = Icons.Default.Search,
                            contentDescription = "Search",
                            tint = MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.size(18.dp)
                        )
                    },
                    trailingIcon = {
                        if (searchQuery.isNotEmpty()) {
                            IconButton(onClick = { searchQuery = "" }) {
                                Icon(
                                    imageVector = Icons.Default.Clear,
                                    contentDescription = "Clear",
                                    modifier = Modifier.size(16.dp)
                                )
                            }
                        }
                    },
                    singleLine = true,
                    shape = RoundedCornerShape(12.dp),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedContainerColor = MaterialTheme.colorScheme.surface,
                        unfocusedContainerColor = MaterialTheme.colorScheme.surface
                    ),
                    modifier = Modifier.weight(1f)
                )

                FilledTonalIconButton(
                    onClick = onOpenScanner,
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier.size(50.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.QrCodeScanner,
                        contentDescription = "Scan IMEI",
                        tint = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.size(22.dp)
                    )
                }
            }
        }

        // 4. Section Header
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Assigned Devices List (${filteredAssigned.size})",
                    fontWeight = FontWeight.Bold,
                    fontSize = 15.sp,
                    color = MaterialTheme.colorScheme.onSurface
                )
            }
        }

        // 5. Device Cards List
        if (filteredAssigned.isEmpty()) {
            item {
                Surface(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.35f)
                ) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(28.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.Center
                    ) {
                        Icon(
                            imageVector = Icons.Default.PhoneAndroid,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.5f),
                            modifier = Modifier.size(40.dp)
                        )
                        Spacer(modifier = Modifier.height(10.dp))
                        Text(
                            text = if (searchQuery.isNotBlank())
                                "No assigned devices match '$searchQuery'."
                            else
                                "No devices are currently in your custody.",
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Medium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            }
        } else {
            items(filteredAssigned, key = { it.id }) { dev ->
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
        shape = RoundedCornerShape(16.dp),
        color = MaterialTheme.colorScheme.surface,
        tonalElevation = 2.dp,
        shadowElevation = 2.dp,
        border = androidx.compose.foundation.BorderStroke(
            1.dp,
            if (isPendingSale) Color(0xFFF59E0B).copy(alpha = 0.4f)
            else MaterialTheme.colorScheme.outline.copy(alpha = 0.12f)
        )
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(14.dp),
            verticalArrangement = Arrangement.spacedBy(9.dp)
        ) {
            // Top Row: Model & Status Badge
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = device.model,
                    fontWeight = FontWeight.Bold,
                    fontSize = 15.5.sp,
                    color = MaterialTheme.colorScheme.onSurface,
                    modifier = Modifier.weight(1f, fill = false),
                    maxLines = 1
                )
                Spacer(modifier = Modifier.width(8.dp))
                StatusBadge(device.currentStatus, device.statusDisplay)
            }

            // Specs row (Chips for Variant, Storage, Color)
            val specsList = listOfNotNull(
                device.capacity?.replace("gb", "", ignoreCase = true)?.trim()?.let { "${it}GB" },
                device.color?.trim()?.split(" ")?.firstOrNull(),
                device.variant?.takeIf { it.isNotBlank() }
            )
            if (specsList.isNotEmpty()) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    specsList.forEach { spec ->
                        Surface(
                            color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.6f),
                            shape = RoundedCornerShape(6.dp)
                        ) {
                            Text(
                                text = spec,
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Medium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                modifier = Modifier.padding(horizontal = 7.dp, vertical = 2.5.dp)
                            )
                        }
                    }
                }
            }

            // IMEI Row
            Surface(
                shape = RoundedCornerShape(10.dp),
                color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.4f),
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 10.dp, vertical = 7.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    CopyableText(label = "IMEI", value = device.imei)
                }
            }

            // Battery Health + Assigned Date Row
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = Icons.Default.BatteryChargingFull,
                        contentDescription = null,
                        tint = Color(0xFF16A34A),
                        modifier = Modifier.size(15.dp)
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        text = if (device.batteryHealth != null) "BH ${device.batteryHealth}%" else "BH —",
                        fontSize = 11.5.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                    if (device.batteryCycle != null) {
                        Text(
                            text = " (${device.batteryCycle} cyc)",
                            fontSize = 11.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }

                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = Icons.Default.CalendarToday,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.size(13.dp)
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        text = device.receivedDateBd ?: device.createdAt?.take(10) ?: "Assigned",
                        fontSize = 11.5.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }

            // Bottom Action: Mark as Sold
            if (isPendingSale) {
                Surface(
                    shape = RoundedCornerShape(10.dp),
                    color = Color(0xFFF59E0B).copy(alpha = 0.15f),
                    border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFF59E0B).copy(alpha = 0.35f)),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 9.dp, horizontal = 12.dp),
                        horizontalArrangement = Arrangement.Center,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "⏳ Pending Admin Sale Approval",
                            color = Color(0xFFD97706),
                            fontWeight = FontWeight.Bold,
                            fontSize = 12.sp
                        )
                    }
                }
            } else if (!isSold) {
                Button(
                    onClick = onMarkSold,
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF10B981)),
                    shape = RoundedCornerShape(10.dp),
                    modifier = Modifier.fillMaxWidth(),
                    contentPadding = PaddingValues(vertical = 10.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.PointOfSale,
                        contentDescription = null,
                        tint = Color.White,
                        modifier = Modifier.size(16.dp)
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = "Mark as Sold",
                        color = Color.White,
                        fontWeight = FontWeight.Bold,
                        fontSize = 13.sp
                    )
                }
            }
        }
    }
}
