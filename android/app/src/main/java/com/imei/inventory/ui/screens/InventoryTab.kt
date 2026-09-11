package com.imei.inventory.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
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
import com.imei.inventory.ui.components.CopyableText
import com.imei.inventory.ui.components.StatusBadge
import com.imei.inventory.ui.components.VariantBadge
import com.imei.inventory.viewmodel.MainInventoryViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun InventoryTab(
    token: String,
    viewModel: MainInventoryViewModel,
    onSelectDevice: (DeviceDto) -> Unit,
    onOpenAddDevice: () -> Unit
) {
    // 0 = Active Inventory, 1 = Archive / Sold
    var selectedTab by remember { mutableStateOf(0) }

    var searchQuery by remember { mutableStateOf("") }
    var selectedVariantFilter by remember { mutableStateOf<String?>(null) }
    var selectedOwnerFilter by remember { mutableStateOf<String?>(null) }
    val selectedStatusFilter by viewModel.selectedStatusFilter.collectAsState()

    val devices by viewModel.devices.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()

    val activeCount = remember(devices) {
        devices.count { !it.currentStatus.equals("SOLD", ignoreCase = true) }
    }
    val archiveCount = remember(devices) {
        devices.count { it.currentStatus.equals("SOLD", ignoreCase = true) }
    }

    val activeStatusOptions = listOf(
        null to "All Status",
        "IN_STOCK" to "In Stock",
        "WAITING_SHIPMENT" to "Waiting Shipment",
        "UNDER_REPAIR" to "Under Repair"
    )

    val variantOptions = listOf(
        null to "All Variants",
        "Modified" to "Modified",
        "USA eSim" to "USA eSim",
        "Canada" to "Canada",
        "Mexican" to "Mexican",
        "Korea" to "Korea",
        "Singapore" to "Singapore",
        "Bypass" to "Bypass"
    )

    // Distinct owners extracted dynamically
    val ownerOptions = remember(devices) {
        devices.mapNotNull { it.currentOwnerName?.trim() }
            .filter { it.isNotBlank() && !it.equals("admin", ignoreCase = true) }
            .distinct()
            .sorted()
    }

    val statusPriority = mapOf(
        "IN_STOCK" to 1,
        "UNDER_REPAIR" to 2,
        "WAITING_SHIPMENT" to 3,
        "SOLD" to 4
    )

    // Filter and sort devices based on selected tab and filters
    val filteredDevices = remember(
        devices,
        selectedTab,
        selectedVariantFilter,
        selectedOwnerFilter,
        selectedStatusFilter,
        searchQuery
    ) {
        val tabFiltered = if (selectedTab == 0) {
            // Active Inventory: Exclude SOLD
            devices.filter { !it.currentStatus.equals("SOLD", ignoreCase = true) }
        } else {
            // Archive: Only SOLD
            devices.filter { it.currentStatus.equals("SOLD", ignoreCase = true) }
        }

        val filtered = tabFiltered.filter { dev ->
            val matchesStatus = selectedStatusFilter == null || dev.currentStatus.equals(selectedStatusFilter, ignoreCase = true)
            val matchesVariant = selectedVariantFilter == null || dev.variant?.equals(selectedVariantFilter, ignoreCase = true) == true
            val matchesOwner = selectedOwnerFilter == null || dev.currentOwnerName?.equals(selectedOwnerFilter, ignoreCase = true) == true
            val matchesQuery = searchQuery.isBlank() ||
                    dev.model.contains(searchQuery, ignoreCase = true) ||
                    dev.imei.contains(searchQuery, ignoreCase = true) ||
                    (dev.serialNumber?.contains(searchQuery, ignoreCase = true) == true) ||
                    (dev.capacity?.contains(searchQuery, ignoreCase = true) == true) ||
                    (dev.color?.contains(searchQuery, ignoreCase = true) == true) ||
                    (dev.currentOwnerName?.contains(searchQuery, ignoreCase = true) == true)
            matchesStatus && matchesVariant && matchesOwner && matchesQuery
        }

        // Sort: IN_STOCK first in active tab
        filtered.sortedWith(
            compareBy<DeviceDto> { statusPriority[it.currentStatus] ?: 99 }
                .thenByDescending { it.id }
        )
    }

    Scaffold(
        floatingActionButton = {
            if (selectedTab == 0) {
                FloatingActionButton(
                    onClick = onOpenAddDevice,
                    containerColor = MaterialTheme.colorScheme.primary,
                    contentColor = Color.White,
                    shape = RoundedCornerShape(16.dp),
                    modifier = Modifier.size(52.dp)
                ) {
                    Text("+", fontSize = 26.sp, fontWeight = FontWeight.Bold)
                }
            }
        },
        containerColor = MaterialTheme.colorScheme.background
    ) { padding ->
        Column(
            modifier = Modifier
                .padding(padding)
                .fillMaxSize()
                .padding(horizontal = 14.dp, vertical = 6.dp)
        ) {
            // Top Segmented Pill Toggle: [ Active Inventory | Archive (Sold) ]
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(42.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(MaterialTheme.colorScheme.surfaceVariant)
                    .padding(3.dp),
                horizontalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                // Active Inventory Tab
                Box(
                    modifier = Modifier
                        .weight(1f)
                        .fillMaxHeight()
                        .clip(RoundedCornerShape(9.dp))
                        .background(
                            if (selectedTab == 0) MaterialTheme.colorScheme.primary
                            else Color.Transparent
                        )
                        .clickable {
                            selectedTab = 0
                            viewModel.setStatusFilter(null)
                        },
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = "📱 Active Inventory ($activeCount)",
                        color = if (selectedTab == 0) Color.White else MaterialTheme.colorScheme.onSurfaceVariant,
                        fontSize = 12.sp,
                        fontWeight = if (selectedTab == 0) FontWeight.Bold else FontWeight.Medium
                    )
                }

                // Archive / Sold Tab
                Box(
                    modifier = Modifier
                        .weight(1f)
                        .fillMaxHeight()
                        .clip(RoundedCornerShape(9.dp))
                        .background(
                            if (selectedTab == 1) Color(0xFF8B5CF6)
                            else Color.Transparent
                        )
                        .clickable {
                            selectedTab = 1
                            viewModel.setStatusFilter(null)
                        },
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = "📦 Archive / Sold ($archiveCount)",
                        color = if (selectedTab == 1) Color.White else MaterialTheme.colorScheme.onSurfaceVariant,
                        fontSize = 12.sp,
                        fontWeight = if (selectedTab == 1) FontWeight.Bold else FontWeight.Medium
                    )
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            // Search Input (Compact 44dp height)
            OutlinedTextField(
                value = searchQuery,
                onValueChange = { searchQuery = it },
                placeholder = {
                    Text(
                        if (selectedTab == 0) "Search Active IMEI, Model, Owner..."
                        else "Search Sold Archive IMEI, Model...",
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        fontSize = 13.sp
                    )
                },
                singleLine = true,
                shape = RoundedCornerShape(10.dp),
                trailingIcon = {
                    if (searchQuery.isNotBlank()) {
                        IconButton(onClick = { searchQuery = "" }) {
                            Text("✕", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 12.sp)
                        }
                    }
                },
                colors = OutlinedTextFieldDefaults.colors(
                    focusedContainerColor = MaterialTheme.colorScheme.surface,
                    unfocusedContainerColor = MaterialTheme.colorScheme.surface,
                    focusedTextColor = MaterialTheme.colorScheme.onSurface,
                    unfocusedTextColor = MaterialTheme.colorScheme.onSurface,
                    focusedBorderColor = MaterialTheme.colorScheme.primary,
                    unfocusedBorderColor = MaterialTheme.colorScheme.outline.copy(alpha = 0.5f)
                ),
                modifier = Modifier
                    .fillMaxWidth()
                    .height(50.dp)
            )

            Spacer(modifier = Modifier.height(6.dp))

            // Status Filter Row (only on Active Tab)
            if (selectedTab == 0) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .horizontalScroll(rememberScrollState()),
                    horizontalArrangement = Arrangement.spacedBy(5.dp)
                ) {
                    activeStatusOptions.forEach { (statusKey, label) ->
                        val isSelected = selectedStatusFilter == statusKey
                        FilterChip(
                            selected = isSelected,
                            onClick = { viewModel.setStatusFilter(statusKey) },
                            label = {
                                Text(
                                    text = label,
                                    fontSize = 11.sp,
                                    fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal
                                )
                            },
                            shape = RoundedCornerShape(6.dp),
                            modifier = Modifier.height(28.dp),
                            colors = FilterChipDefaults.filterChipColors(
                                selectedContainerColor = MaterialTheme.colorScheme.primary,
                                selectedLabelColor = Color.White,
                                containerColor = MaterialTheme.colorScheme.surfaceVariant,
                                labelColor = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        )
                    }
                }

                Spacer(modifier = Modifier.height(4.dp))
            }

            // Variant & Owner Filter Row
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .horizontalScroll(rememberScrollState()),
                horizontalArrangement = Arrangement.spacedBy(5.dp)
            ) {
                // Owner Filters
                ownerOptions.forEach { ownerName ->
                    val isSelected = selectedOwnerFilter == ownerName
                    FilterChip(
                        selected = isSelected,
                        onClick = { selectedOwnerFilter = if (isSelected) null else ownerName },
                        label = {
                            Text(
                                text = "👤 $ownerName",
                                fontSize = 11.sp,
                                fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal
                            )
                        },
                        shape = RoundedCornerShape(6.dp),
                        modifier = Modifier.height(28.dp),
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = Color(0xFF0284C7),
                            selectedLabelColor = Color.White,
                            containerColor = MaterialTheme.colorScheme.surfaceVariant,
                            labelColor = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    )
                }

                // Variant Filters
                variantOptions.drop(1).forEach { (vKey, label) ->
                    val isSelected = selectedVariantFilter == vKey
                    FilterChip(
                        selected = isSelected,
                        onClick = { selectedVariantFilter = if (isSelected) null else vKey },
                        label = {
                            Text(
                                text = label,
                                fontSize = 11.sp,
                                fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal
                            )
                        },
                        shape = RoundedCornerShape(6.dp),
                        modifier = Modifier.height(28.dp),
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = Color(0xFFF97316),
                            selectedLabelColor = Color.White,
                            containerColor = MaterialTheme.colorScheme.surfaceVariant,
                            labelColor = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    )
                }
            }

            Spacer(modifier = Modifier.height(6.dp))

            // Results count + reset button
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "${filteredDevices.size} ${if (selectedTab == 0) "Active" else "Archived"} Devices Listed",
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    fontSize = 11.sp,
                    fontWeight = FontWeight.SemiBold
                )
                if (selectedStatusFilter != null || selectedVariantFilter != null || selectedOwnerFilter != null || searchQuery.isNotBlank()) {
                    Text(
                        text = "Clear Filters",
                        color = MaterialTheme.colorScheme.primary,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.clickable {
                            searchQuery = ""
                            selectedVariantFilter = null
                            selectedOwnerFilter = null
                            viewModel.setStatusFilter(null)
                        }
                    )
                }
            }

            Spacer(modifier = Modifier.height(6.dp))

            // Compact Devices List
            if (isLoading && filteredDevices.isEmpty()) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = MaterialTheme.colorScheme.primary)
                }
            } else if (filteredDevices.isEmpty()) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Text(
                        text = if (selectedTab == 0) "No active devices match filters" else "No archived sold devices found",
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        fontSize = 13.sp
                    )
                }
            } else {
                LazyColumn(
                    verticalArrangement = Arrangement.spacedBy(6.dp),
                    modifier = Modifier.fillMaxSize()
                ) {
                    items(filteredDevices) { device ->
                        CompactDeviceCard(
                            device = device,
                            isArchiveView = selectedTab == 1,
                            onClick = { onSelectDevice(device) },
                            onStatusChange = { newStatus ->
                                viewModel.updateDevice(token, device.id, mapOf("current_status" to newStatus)) {}
                            },
                            onRestoreToStock = {
                                viewModel.updateDevice(token, device.id, mapOf("current_status" to "IN_STOCK")) {}
                            }
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun CompactDeviceCard(
    device: DeviceDto,
    isArchiveView: Boolean = false,
    onClick: () -> Unit,
    onStatusChange: (String) -> Unit,
    onRestoreToStock: () -> Unit = {}
) {
    var expandedMenu by remember { mutableStateOf(false) }

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() },
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        shape = RoundedCornerShape(10.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.5.dp)
    ) {
        Column(modifier = Modifier.padding(horizontal = 12.dp, vertical = 9.dp)) {
            // Row 1: Model Name + Variant Badge + Status Badge
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = device.model,
                    color = MaterialTheme.colorScheme.onSurface,
                    fontWeight = FontWeight.Bold,
                    fontSize = 14.sp,
                    modifier = Modifier.weight(1f)
                )
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalAlignment = Alignment.CenterVertically) {
                    VariantBadge(device.variant)
                    StatusBadge(device.currentStatus, device.statusDisplay)
                }
            }

            Spacer(modifier = Modifier.height(4.dp))

            // Row 2: IMEI + Storage + Battery Health & Cycle Count
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                CopyableText(label = "IMEI", value = device.imei)

                Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                    device.capacity?.let {
                        Text(it, color = MaterialTheme.colorScheme.primary, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                    }
                    if (device.batteryHealth != null || device.batteryCycle != null) {
                        val batteryText = buildString {
                            append("🔋 ")
                            if (device.batteryHealth != null) append("${device.batteryHealth}%")
                            if (device.batteryCycle != null) {
                                if (device.batteryHealth != null) append(" • ")
                                append("${device.batteryCycle}c")
                            }
                        }
                        Text(batteryText, color = Color(0xFF16A34A), fontSize = 11.sp, fontWeight = FontWeight.Medium)
                    }
                }
            }

            Spacer(modifier = Modifier.height(4.dp))

            // Row 3: Owner / Pricing + Quick Status or Restore Action
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                if (isArchiveView) {
                    val priceDisplay = if (device.sellingPrice != null) {
                        "💰 Sold: ৳${Math.round(device.sellingPrice).toInt()}"
                    } else {
                        "💰 Sold Device"
                    }
                    Text(
                        text = priceDisplay,
                        color = Color(0xFF16A34A),
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold
                    )

                    // Quick Un-Archive Button
                    Button(
                        onClick = onRestoreToStock,
                        colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary.copy(alpha = 0.15f)),
                        contentPadding = PaddingValues(horizontal = 8.dp, vertical = 0.dp),
                        shape = RoundedCornerShape(6.dp),
                        modifier = Modifier.height(26.dp)
                    ) {
                        Text(
                            text = "↺ Restore to Stock",
                            fontSize = 10.sp,
                            color = MaterialTheme.colorScheme.primary,
                            fontWeight = FontWeight.Bold
                        )
                    }
                } else {
                    val ownerDisplay = if (!device.currentOwnerName.isNullOrBlank()) {
                        "👤 ${device.currentOwnerName}"
                    } else {
                        "👤 Unassigned"
                    }

                    Text(
                        text = ownerDisplay,
                        color = if (device.currentOwnerName.isNullOrBlank()) MaterialTheme.colorScheme.onSurfaceVariant else Color(0xFF0284C7),
                        fontSize = 11.sp,
                        fontWeight = FontWeight.SemiBold
                    )

                    Box {
                        Button(
                            onClick = { expandedMenu = true },
                            colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
                            contentPadding = PaddingValues(horizontal = 8.dp, vertical = 0.dp),
                            shape = RoundedCornerShape(6.dp),
                            modifier = Modifier.height(26.dp)
                        ) {
                            Text(
                                text = "Status ▾",
                                fontSize = 10.sp,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                fontWeight = FontWeight.SemiBold
                            )
                        }
                        DropdownMenu(
                            expanded = expandedMenu,
                            onDismissRequest = { expandedMenu = false }
                        ) {
                            DropdownMenuItem(
                                text = { Text("In Stock", fontSize = 13.sp) },
                                onClick = {
                                    expandedMenu = false
                                    onStatusChange("IN_STOCK")
                                }
                            )
                            DropdownMenuItem(
                                text = { Text("Under Repair", fontSize = 13.sp) },
                                onClick = {
                                    expandedMenu = false
                                    onStatusChange("UNDER_REPAIR")
                                }
                            )
                            DropdownMenuItem(
                                text = { Text("Sold (Archive)", fontSize = 13.sp) },
                                onClick = {
                                    expandedMenu = false
                                    onStatusChange("SOLD")
                                }
                            )
                        }
                    }
                }
            }
        }
    }
}
