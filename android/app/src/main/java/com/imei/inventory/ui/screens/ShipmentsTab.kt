package com.imei.inventory.ui.screens

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
import com.imei.inventory.data.model.ShipmentDto
import com.imei.inventory.ui.components.CopyableText
import com.imei.inventory.ui.components.StatusBadge
import com.imei.inventory.viewmodel.MainInventoryViewModel

@Composable
fun ShipmentsTab(
    token: String,
    viewModel: MainInventoryViewModel
) {
    val shipments by viewModel.shipments.collectAsState()

    LaunchedEffect(Unit) {
        viewModel.fetchShipments(token)
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column {
                Text("Inbound Shipments", color = Color.White, fontSize = 22.sp, fontWeight = FontWeight.Bold)
                Text("Track bulk supplier orders & cargo", color = Color(0xFF94A3B8), fontSize = 13.sp)
            }
            IconButton(onClick = { viewModel.fetchShipments(token) }) {
                Text("🔄", fontSize = 18.sp)
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        if (shipments.isEmpty()) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Text("No shipment batches registered", color = Color(0xFF94A3B8))
            }
        } else {
            LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                items(shipments) { shipment ->
                    ShipmentCard(shipment)
                }
            }
        }
    }
}

@Composable
fun ShipmentCard(shipment: ShipmentDto) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B)),
        shape = RoundedCornerShape(12.dp)
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = shipment.shippingCompany ?: "Direct Shipment",
                    color = Color.White,
                    fontWeight = FontWeight.Bold,
                    fontSize = 15.sp
                )
                StatusBadge(shipment.status)
            }

            Spacer(modifier = Modifier.height(6.dp))

            CopyableText(label = "Tracking #", value = shipment.trackingNumber)

            Spacer(modifier = Modifier.height(8.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Supplier: ${shipment.supplierName ?: "Unknown"}",
                    color = Color(0xFF94A3B8),
                    fontSize = 12.sp
                )
                Surface(
                    color = Color(0x336366F1),
                    shape = RoundedCornerShape(6.dp)
                ) {
                    Text(
                        text = "📦 ${shipment.devicesCount} Units",
                        color = Color(0xFF818CF8),
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                    )
                }
            }
        }
    }
}
