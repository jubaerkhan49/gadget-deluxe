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
    val devices by viewModel.devices.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()
    val selectedFilter by viewModel.selectedStatusFilter.collectAsState()

    val filterOptions = listOf(
        null to "All Devices",
        "IN_STOCK" to "In Stock",
        "UNDER_REPAIR" to "Under Repair",
        "SOLD" to "Sold"
    )

    Scaffold(
        floatingActionButton = {
            FloatingActionButton(
                onClick = onOpenAddDevice,
                containerColor = Color(0xFF6366F1),
                contentColor = Color.White
            ) {
                Text("+", fontSize = 28.sp, fontWeight = FontWeight.Bold)
            }
        },
        containerColor = Color(0xFF0F172A)
    ) { padding ->
        Column(
            modifier = Modifier
                .padding(padding)
                .fillMaxSize()
                .padding(horizontal = 16.dp, vertical = 12.dp)
        ) {
            // Search Input
            OutlinedTextField(
                value = searchQuery,
                onValueChange = {
                    searchQuery = it
                    viewModel.fetchDevices(token, searchQuery)
                },
                placeholder = { Text("Search IMEI, Model, Serial...", color = Color(0xFF64748B)) },
                singleLine = true,
                trailingIcon = {
                    if (searchQuery.isNotBlank()) {
                        IconButton(onClick = {
                            searchQuery = ""
                            viewModel.fetchDevices(token, "")
                        }) {
                            Text("✕", color = Color.Gray)
                        }
                    }
                },
                colors = OutlinedTextFieldDefaults.colors(
                    focusedTextColor = Color.White,
                    unfocusedTextColor = Color.White,
                    focusedBorderColor = Color(0xFF6366F1),
                    unfocusedBorderColor = Color(0xFF334155)
                ),
                modifier = Modifier.fillMaxWidth()
            )

            Spacer(modifier = Modifier.height(10.dp))

            // Filter Chips
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .horizontalScroll(rememberScrollState()),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                filterOptions.forEach { (statusKey, label) ->
                    val isSelected = selectedFilter == statusKey
                    FilterChip(
                        selected = isSelected,
                        onClick = {
                            viewModel.setStatusFilter(statusKey)
                            viewModel.fetchDevices(token, searchQuery)
                        },
                        label = {
                            Text(
                                text = label,
                                color = if (isSelected) Color.White else Color(0xFF94A3B8),
                                fontSize = 12.sp,
                                fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal
                            )
                        },
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = Color(0xFF4F46E5),
                            containerColor = Color(0xFF1E293B)
                        )
                    )
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            // Devices List
            if (isLoading) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = Color(0xFF6366F1))
                }
            } else if (devices.isEmpty()) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Text("No matching devices found in cloud inventory", color = Color(0xFF94A3B8), fontSize = 14.sp)
                }
            } else {
                LazyColumn(
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                    modifier = Modifier.fillMaxSize()
                ) {
                    items(devices) { device ->
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
        colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B)),
        shape = RoundedCornerShape(12.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            // Header: Model + Status Badge
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = device.model,
                    color = Color.White,
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

            // Bottom Bar: Specs + Status Action Dropdown
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp), verticalAlignment = Alignment.CenterVertically) {
                    device.capacity?.let {
                        Text(it, color = Color(0xFF818CF8), fontSize = 12.sp, fontWeight = FontWeight.Bold)
                    }
                    device.batteryHealth?.let {
                        Text("🔋 $it%", color = Color(0xFF4ADE80), fontSize = 12.sp, fontWeight = FontWeight.Medium)
                    }
                    device.buyingPrice?.let {
                        Text("৳${it.toInt()}", color = Color(0xFFFBBF24), fontSize = 12.sp)
                    }
                }

                Box {
                    Button(
                        onClick = { expandedMenu = true },
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF334155)),
                        contentPadding = PaddingValues(horizontal = 8.dp, vertical = 2.dp),
                        modifier = Modifier.height(30.dp)
                    ) {
                        Text("Status ▾", fontSize = 11.sp, color = Color.White)
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
