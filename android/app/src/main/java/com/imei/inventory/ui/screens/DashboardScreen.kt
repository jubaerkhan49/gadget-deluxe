package com.imei.inventory.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.imei.inventory.data.model.DeviceDto
import com.imei.inventory.viewmodel.DeviceListState
import com.imei.inventory.viewmodel.DeviceViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DashboardScreen(
    token: String,
    deviceViewModel: DeviceViewModel,
    onOpenScanner: () -> Unit
) {
    var searchQuery by remember { mutableStateOf("") }
    val deviceState by deviceViewModel.devicesState.collectAsState()

    LaunchedEffect(Unit) {
        deviceViewModel.fetchDevices(token)
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Gadget Deluxe", color = Color.White, fontWeight = FontWeight.Bold) },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Color(0xFF0F172A)),
                actions = {
                    IconButton(onClick = { deviceViewModel.fetchDevices(token, searchQuery) }) {
                        Text("🔄", fontSize = 18.sp)
                    }
                    Button(
                        onClick = onOpenScanner,
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF6366F1)),
                        modifier = Modifier.padding(end = 8.dp)
                    ) {
                        Text("Scan Barcode", color = Color.White)
                    }
                }
            )
        },
        containerColor = Color(0xFF0F172A)
    ) { padding ->
        Column(
            modifier = Modifier
                .padding(padding)
                .fillMaxSize()
                .padding(16.dp)
        ) {
            OutlinedTextField(
                value = searchQuery,
                onValueChange = {
                    searchQuery = it
                    deviceViewModel.fetchDevices(token, searchQuery)
                },
                placeholder = { Text("Search IMEI, Model, Serial...", color = Color(0xFF64748B)) },
                singleLine = true,
                colors = OutlinedTextFieldDefaults.colors(
                    focusedTextColor = Color.White,
                    unfocusedTextColor = Color.White,
                    focusedBorderColor = Color(0xFF6366F1),
                    unfocusedBorderColor = Color(0xFF334155)
                ),
                modifier = Modifier.fillMaxWidth()
            )

            Spacer(modifier = Modifier.height(16.dp))

            when (val state = deviceState) {
                is DeviceListState.Loading -> {
                    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator(color = Color(0xFF6366F1))
                    }
                }
                is DeviceListState.Success -> {
                    if (state.devices.isEmpty()) {
                        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                            Text("No devices found", color = Color(0xFF94A3B8))
                        }
                    } else {
                        LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                            items(state.devices) { device ->
                                DeviceItemCard(
                                    device = device,
                                    onStatusChange = { newStatus ->
                                        deviceViewModel.updateStatus(token, device.id, newStatus)
                                    }
                                )
                            }
                        }
                    }
                }
                is DeviceListState.Error -> {
                    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text(text = state.message, color = Color(0xFFF87171))
                            Spacer(modifier = Modifier.height(8.dp))
                            Button(onClick = { deviceViewModel.fetchDevices(token, searchQuery) }) {
                                Text("Retry")
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun DeviceItemCard(
    device: DeviceDto,
    onStatusChange: (String) -> Unit
) {
    var expandedMenu by remember { mutableStateOf(false) }

    Card(
        colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B)),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
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
                
                val statusColor = when (device.currentStatus) {
                    "IN_STOCK" -> Color(0xFF22C55E)
                    "SOLD" -> Color(0xFF3B82F6)
                    "UNDER_REPAIR" -> Color(0xFFEAB308)
                    else -> Color(0xFF94A3B8)
                }

                Surface(
                    color = statusColor.copy(alpha = 0.2f),
                    shape = MaterialTheme.shapes.small
                ) {
                    Text(
                        text = device.statusDisplay ?: device.currentStatus,
                        color = statusColor,
                        fontWeight = FontWeight.SemiBold,
                        fontSize = 12.sp,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            Text("IMEI: ${device.imei}", color = Color(0xFFCBD5E1), fontSize = 13.sp)
            if (!device.serialNumber.isNullOrBlank()) {
                Text("Serial: ${device.serialNumber}", color = Color(0xFF94A3B8), fontSize = 12.sp)
            }
            if (!device.variant.isNullOrBlank()) {
                Text("Variant: ${device.variant}", color = Color(0xFFF59E0B), fontSize = 12.sp)
            }

            Spacer(modifier = Modifier.height(10.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    device.capacity?.let {
                        Text(it, color = Color(0xFF818CF8), fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                    }
                    device.batteryHealth?.let {
                        Text("🔋 $it%", color = Color(0xFF4ADE80), fontSize = 12.sp)
                    }
                }

                Box {
                    Button(
                        onClick = { expandedMenu = true },
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF334155)),
                        contentPadding = PaddingValues(horizontal = 10.dp, vertical = 4.dp),
                        modifier = Modifier.height(32.dp)
                    ) {
                        Text("Update Status ▾", fontSize = 11.sp, color = Color.White)
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
