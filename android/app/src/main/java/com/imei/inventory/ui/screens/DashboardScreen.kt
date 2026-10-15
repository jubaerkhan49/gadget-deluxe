package com.imei.inventory.ui.screens

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.QrCodeScanner
import androidx.compose.material.icons.filled.Refresh
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
import com.imei.inventory.ui.components.ExpressiveSearchBar
import com.imei.inventory.ui.components.StatusBadge
import com.imei.inventory.ui.components.VariantBadge
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
                title = { Text("Gadget Deluxe", fontWeight = FontWeight.Bold) },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface,
                    titleContentColor = MaterialTheme.colorScheme.onSurface
                ),
                actions = {
                    IconButton(onClick = { deviceViewModel.fetchDevices(token, searchQuery) }) {
                        Icon(
                            imageVector = Icons.Default.Refresh,
                            contentDescription = "Refresh",
                            tint = MaterialTheme.colorScheme.primary
                        )
                    }
                    Button(
                        onClick = onOpenScanner,
                        colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary),
                        shape = RoundedCornerShape(percent = 50),
                        modifier = Modifier.padding(end = 8.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.QrCodeScanner,
                            contentDescription = null,
                            tint = Color.White,
                            modifier = Modifier.size(16.dp)
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("Scan Barcode", color = Color.White, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                    }
                }
            )
        },
        containerColor = MaterialTheme.colorScheme.background
    ) { padding ->
        Column(
            modifier = Modifier
                .padding(padding)
                .fillMaxSize()
                .padding(16.dp)
        ) {
            ExpressiveSearchBar(
                query = searchQuery,
                onQueryChange = {
                    searchQuery = it
                    deviceViewModel.fetchDevices(token, searchQuery)
                },
                placeholder = "Search IMEI, Model, Serial..."
            )

            Spacer(modifier = Modifier.height(16.dp))

            when (val state = deviceState) {
                is DeviceListState.Loading -> {
                    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator(color = MaterialTheme.colorScheme.primary)
                    }
                }
                is DeviceListState.Success -> {
                    if (state.devices.isEmpty()) {
                        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                            Text("No devices found", color = MaterialTheme.colorScheme.onSurfaceVariant)
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
                            Text(text = state.message, color = MaterialTheme.colorScheme.error)
                            Spacer(modifier = Modifier.height(8.dp))
                            Button(
                                onClick = { deviceViewModel.fetchDevices(token, searchQuery) },
                                shape = RoundedCornerShape(percent = 50)
                            ) {
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
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLow),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
        shape = RoundedCornerShape(20.dp),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.35f)),
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
                    color = MaterialTheme.colorScheme.onSurface,
                    fontWeight = FontWeight.Bold,
                    fontSize = 16.sp
                )
                
                StatusBadge(status = device.currentStatus, statusDisplay = device.statusDisplay)
            }

            Spacer(modifier = Modifier.height(8.dp))

            CopyableText(label = "IMEI", value = device.imei)

            if (!device.serialNumber.isNullOrBlank()) {
                Spacer(modifier = Modifier.height(4.dp))
                Text("Serial: ${device.serialNumber}", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 12.sp)
            }
            if (!device.variant.isNullOrBlank()) {
                Spacer(modifier = Modifier.height(4.dp))
                VariantBadge(device.variant)
            }

            Spacer(modifier = Modifier.height(10.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    device.capacity?.let {
                        Text(it, color = MaterialTheme.colorScheme.primary, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                    }
                    device.batteryHealth?.let {
                        Text("🔋 $it%", color = Color(0xFF10B981), fontSize = 12.sp, fontWeight = FontWeight.Bold)
                    }
                }

                Box {
                    Button(
                        onClick = { expandedMenu = true },
                        colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.surfaceContainerHigh),
                        contentPadding = PaddingValues(horizontal = 12.dp, vertical = 4.dp),
                        shape = RoundedCornerShape(percent = 50),
                        modifier = Modifier.height(32.dp)
                    ) {
                        Text("Update Status ▾", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurface)
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
