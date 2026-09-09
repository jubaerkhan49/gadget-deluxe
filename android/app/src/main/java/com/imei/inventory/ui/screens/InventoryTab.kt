package com.imei.inventory.ui.screens

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
    var searchQuery by remember { mutableStateOf("") }
    var selectedVariantFilter by remember { mutableStateOf<String?>(null) }
    val selectedStatusFilter by viewModel.selectedStatusFilter.collectAsState()

    val devices by viewModel.devices.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()

    val statusOptions = listOf(
        null to "All Status",
        "IN_STOCK" to "In Stock",
        "UNDER_REPAIR" to "Under Repair",
        "SOLD" to "Sold"
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

    // Filter devices in-memory for instant responsive search + variant matching
    val filteredDevices = remember(devices, selectedVariantFilter, searchQuery) {
        devices.filter { dev ->
            val matchesVariant = selectedVariantFilter == null || dev.variant?.equals(selectedVariantFilter, ignoreCase = true) == true
            val matchesQuery = searchQuery.isBlank() ||
                    dev.model.contains(searchQuery, ignoreCase = true) ||
                    dev.imei.contains(searchQuery, ignoreCase = true) ||
                    (dev.serialNumber?.contains(searchQuery, ignoreCase = true) == true) ||
                    (dev.capacity?.contains(searchQuery, ignoreCase = true) == true)
            matchesVariant && matchesQuery
        }
    }

    Scaffold(
        floatingActionButton = {
            FloatingActionButton(
                onClick = onOpenAddDevice,
                containerColor = MaterialTheme.colorScheme.primary,
                contentColor = Color.White,
                shape = RoundedCornerShape(16.dp)
            ) {
                Text("+", fontSize = 28.sp, fontWeight = FontWeight.Bold)
            }
        },
        containerColor = MaterialTheme.colorScheme.background
    ) { padding ->
        Column(
            modifier = Modifier
                .padding(padding)
                .fillMaxSize()
                .padding(horizontal = 16.dp, vertical = 8.dp)
        ) {
            // Search Input
            OutlinedTextField(
                value = searchQuery,
                onValueChange = { searchQuery = it },
                placeholder = { Text("Search IMEI, Model, Serial...", color = MaterialTheme.colorScheme.onSurfaceVariant) },
                singleLine = true,
                shape = RoundedCornerShape(12.dp),
                trailingIcon = {
                    if (searchQuery.isNotBlank()) {
                        IconButton(onClick = { searchQuery = "" }) {
                            Text("✕", color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }
                },
                colors = OutlinedTextFieldDefaults.colors(
                    focusedContainerColor = MaterialTheme.colorScheme.surface,
                    unfocusedContainerColor = MaterialTheme.colorScheme.surface,
                    focusedTextColor = MaterialTheme.colorScheme.onSurface,
                    unfocusedTextColor = MaterialTheme.colorScheme.onSurface,
                    focusedBorderColor = MaterialTheme.colorScheme.primary,
                    unfocusedBorderColor = MaterialTheme.colorScheme.outline
                ),
                modifier = Modifier.fillMaxWidth()
            )

            Spacer(modifier = Modifier.height(10.dp))

            // Status Filter Chips
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .horizontalScroll(rememberScrollState()),
                horizontalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                statusOptions.forEach { (statusKey, label) ->
                    val isSelected = selectedStatusFilter == statusKey
                    FilterChip(
                        selected = isSelected,
                        onClick = {
                            viewModel.setStatusFilter(statusKey)
                            viewModel.fetchDevices(token, searchQuery)
                        },
                        label = {
                            Text(
                                text = label,
                                fontSize = 11.sp,
                                fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal
                            )
                        },
                        shape = RoundedCornerShape(8.dp),
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = MaterialTheme.colorScheme.primary,
                            selectedLabelColor = Color.White,
                            containerColor = MaterialTheme.colorScheme.surfaceVariant,
                            labelColor = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    )
                }
            }

            Spacer(modifier = Modifier.height(6.dp))

            // Variant Filter Chips
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .horizontalScroll(rememberScrollState()),
                horizontalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                variantOptions.forEach { (vKey, label) ->
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
                        shape = RoundedCornerShape(8.dp),
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = Color(0xFFF97316),
                            selectedLabelColor = Color.White,
                            containerColor = MaterialTheme.colorScheme.surfaceVariant,
                            labelColor = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    )
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            // Results summary header
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "${filteredDevices.size} Devices Found",
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.SemiBold
                )
                if (selectedStatusFilter != null || selectedVariantFilter != null || searchQuery.isNotBlank()) {
                    Text(
                        text = "Reset Filters",
                        color = MaterialTheme.colorScheme.primary,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.clickable {
                            searchQuery = ""
                            selectedVariantFilter = null
                            viewModel.setStatusFilter(null)
                            viewModel.fetchDevices(token, "")
                        }
                    )
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            // Devices List
            if (isLoading && filteredDevices.isEmpty()) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = MaterialTheme.colorScheme.primary)
                }
            } else if (filteredDevices.isEmpty()) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Text(
                        text = "No matching devices found",
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        fontSize = 14.sp
                    )
                }
            } else {
                LazyColumn(
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                    modifier = Modifier.fillMaxSize()
                ) {
                    items(filteredDevices) { device ->
                        InventoryDeviceCard(
                            device = device,
                            onClick = { onSelectDevice(device) },
                            onStatusChange = { newStatus ->
                                viewModel.updateDevice(token, device.id, mapOf("current_status" to newStatus)) {}
                            }
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun InventoryDeviceCard(
    device: DeviceDto,
    onClick: () -> Unit,
    onStatusChange: (String) -> Unit
) {
    var expandedMenu by remember { mutableStateOf(false) }

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() },
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        shape = RoundedCornerShape(14.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            // Top: Model + Status Badge
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = device.model,
                    color = MaterialTheme.colorScheme.onSurface,
                    fontWeight = FontWeight.Bold,
                    fontSize = 16.sp
                )
                StatusBadge(device.currentStatus, device.statusDisplay)
            }

            Spacer(modifier = Modifier.height(6.dp))

            // IMEI + Variant
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                CopyableText(label = "IMEI", value = device.imei)
                VariantBadge(device.variant)
            }

            device.serialNumber?.let { serial ->
                Spacer(modifier = Modifier.height(4.dp))
                CopyableText(label = "Serial", value = serial)
            }

            Spacer(modifier = Modifier.height(10.dp))

            // Bottom Bar: Specs + Status Action Button
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp), verticalAlignment = Alignment.CenterVertically) {
                    device.capacity?.let {
                        Text(it, color = MaterialTheme.colorScheme.primary, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                    }
                    device.batteryHealth?.let {
                        Text("🔋 $it%", color = Color(0xFF16A34A), fontSize = 12.sp, fontWeight = FontWeight.Medium)
                    }
                    device.buyingPrice?.let {
                        Text("৳${it.toInt()}", color = Color(0xFFD97706), fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                    }
                }

                Box {
                    Button(
                        onClick = { expandedMenu = true },
                        colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
                        contentPadding = PaddingValues(horizontal = 10.dp, vertical = 2.dp),
                        shape = RoundedCornerShape(8.dp),
                        modifier = Modifier.height(30.dp)
                    ) {
                        Text("Status ▾", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, fontWeight = FontWeight.SemiBold)
                    }
                    DropdownMenu(
                        expanded = expandedMenu,
                        onDismissRequest = { expandedMenu = false }
                    ) {
                        DropdownMenuItem(
                            text = { Text("In Stock") },
                            onClick = {
                                expandedMenu = false
                                onStatusChange("IN_STOCK")
                            }
                        )
                        DropdownMenuItem(
                            text = { Text("Under Repair") },
                            onClick = {
                                expandedMenu = false
                                onStatusChange("UNDER_REPAIR")
                            }
                        )
                        DropdownMenuItem(
                            text = { Text("Sold") },
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
