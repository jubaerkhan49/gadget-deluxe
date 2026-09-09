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
                title = { Text("IMEI Pro Inventory", color = Color.White, fontWeight = FontWeight.Bold) },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Color(0xFF0F172A)),
                actions = {
                    Button(
                        onClick = onOpenScanner,
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF6366F1)),
                        modifier = Modifier.padding(end = 8.dp)
                    ) {
                        Text("Scan QR/Barcode")
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
                placeholder = { Text("Search IMEI, Model, Serial...", color = Color.Gray) },
                colors = OutlinedTextFieldDefaults.colors(
                    focusedTextColor = Color.White,
                    unfocusedTextColor = Color.White,
                    focusedBorderColor = Color(0xFF6366F1)
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
                    LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        items(state.devices) { device ->
                            DeviceItemCard(device)
                        }
                    }
                }
                is DeviceListState.Error -> {
                    Text(text = state.message, color = Color.Red)
                }
            }
        }
    }
}

@Composable
fun DeviceItemCard(device: DeviceDto) {
    Card(
        colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B)),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text(text = device.model, color = Color.White, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                Text(
                    text = device.currentStatus,
                    color = Color(0xFF10B981),
                    fontWeight = FontWeight.Bold,
                    fontSize = 12.sp
                )
            }
            Spacer(modifier = Modifier.height(4.dp))
            Text(text = "IMEI: ${device.imei}", color = Color(0xFF818CF8), fontSize = 14.sp)
            Text(
                text = "${device.capacity ?: ""} ${device.color ?: ""} | Battery: ${device.batteryHealth ?: "N/A"}%",
                color = Color.Gray,
                fontSize = 12.sp
            )
        }
    }
}
