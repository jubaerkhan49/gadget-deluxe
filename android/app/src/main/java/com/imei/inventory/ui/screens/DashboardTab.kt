package com.imei.inventory.ui.screens

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
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
import com.imei.inventory.ui.components.StatCard
import com.imei.inventory.ui.components.StatusBadge
import com.imei.inventory.ui.components.VariantBadge
import com.imei.inventory.viewmodel.MainInventoryViewModel

@Composable
fun DashboardTab(
    token: String,
    viewModel: MainInventoryViewModel,
    onNavigateToTab: (Int) -> Unit,
    onSelectDevice: (DeviceDto) -> Unit,
    onOpenAddDevice: () -> Unit
) {
    val stats by viewModel.stats.collectAsState()
    val devices by viewModel.devices.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Top Banner / Header
        item {
            Column {
                Text(
                    text = "Operational Overview",
                    color = Color.White,
                    fontSize = 22.sp,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    text = "Live inventory & commercial tracking",
                    color = Color(0xFF94A3B8),
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
                        icon = "📦",
                        accentColor = Color(0xFF818CF8),
                        modifier = Modifier.weight(1f)
                    )
                    StatCard(
                        title = "IN STOCK",
                        value = "${stats.inStock}",
                        icon = "🏢",
                        accentColor = Color(0xFF4ADE80),
                        modifier = Modifier.weight(1f)
                    )
                }
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    StatCard(
                        title = "UNDER REPAIR",
                        value = "${stats.underRepair}",
                        icon = "🛠️",
                        accentColor = Color(0xFFFBBF24),
                        modifier = Modifier.weight(1f)
                    )
                    StatCard(
                        title = "SOLD UNITS",
                        value = "${stats.sold}",
                        icon = "🛍️",
                        accentColor = Color(0xFF60A5FA),
                        modifier = Modifier.weight(1f)
                    )
                }
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    StatCard(
                        title = "TOTAL REVENUE",
                        value = "BDT ${stats.totalSalesAmount.toInt()}",
                        icon = "💵",
                        accentColor = Color(0xFF34D399),
                        modifier = Modifier.weight(1f)
                    )
                    StatCard(
                        title = "TOTAL PROFIT",
                        value = "BDT ${stats.totalProfit.toInt()}",
                        icon = "📈",
                        accentColor = Color(0xFF38BDF8),
                        modifier = Modifier.weight(1f)
                    )
                }
            }
        }

        // Quick Action Buttons
        item {
            Text(
                text = "Quick Actions",
                color = Color(0xFFCBD5E1),
                fontSize = 15.sp,
                fontWeight = FontWeight.SemiBold
            )
            Spacer(modifier = Modifier.height(8.dp))
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Button(
                    onClick = onOpenAddDevice,
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF4F46E5)),
                    shape = RoundedCornerShape(10.dp),
                    modifier = Modifier.weight(1f)
                ) {
                    Text("+ Add Device", color = Color.White, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                }
                Button(
                    onClick = { onNavigateToTab(4) }, // Scanner / Sickw
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF334155)),
                    shape = RoundedCornerShape(10.dp),
                    modifier = Modifier.weight(1f)
                ) {
                    Text("⚡ Sickw Parser", color = Color.White, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                }
            }
        }

        // Recent Devices
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Recent Inventory",
                    color = Color.White,
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Bold
                )
                TextButton(onClick = { onNavigateToTab(1) }) {
                    Text("View All (${devices.size}) →", color = Color(0xFF818CF8), fontSize = 12.sp)
                }
            }
        }

        if (devices.isEmpty()) {
            item {
                Card(
                    colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B)),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Box(modifier = Modifier.padding(24.dp).fillMaxWidth(), contentAlignment = Alignment.Center) {
                        if (isLoading) {
                            CircularProgressIndicator(color = Color(0xFF6366F1))
                        } else {
                            Text("No devices found", color = Color(0xFF94A3B8))
                        }
                    }
                }
            }
        } else {
            items(devices.take(6)) { device ->
                Card(
                    colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B)),
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { onSelectDevice(device) },
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Column(modifier = Modifier.padding(14.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(device.model, color = Color.White, fontWeight = FontWeight.Bold, fontSize = 15.sp)
                            StatusBadge(device.currentStatus, device.statusDisplay)
                        }
                        Spacer(modifier = Modifier.height(6.dp))
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            CopyableText(label = "IMEI", value = device.imei)
                            VariantBadge(device.variant)
                        }
                    }
                }
            }
        }
    }
}
