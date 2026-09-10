package com.imei.inventory.ui.screens

import androidx.compose.foundation.background
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
import com.imei.inventory.data.model.ShipmentDto
import com.imei.inventory.ui.components.CopyableText
import com.imei.inventory.viewmodel.MainInventoryViewModel

import androidx.compose.ui.text.style.TextOverflow

@Composable
fun ShipmentsTab(
    token: String,
    viewModel: MainInventoryViewModel,
    onSelectShipment: (ShipmentDto) -> Unit,
    onOpenAddShipment: () -> Unit
) {
    val shipments by viewModel.shipments.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()

    LaunchedEffect(Unit) {
        viewModel.fetchShipments(token)
    }

    Scaffold(
        floatingActionButton = {
            FloatingActionButton(
                onClick = onOpenAddShipment,
                containerColor = MaterialTheme.colorScheme.primary,
                contentColor = Color.White,
                shape = RoundedCornerShape(16.dp),
                modifier = Modifier.size(52.dp)
            ) {
                Text("+", fontSize = 26.sp, fontWeight = FontWeight.Bold)
            }
        },
        containerColor = MaterialTheme.colorScheme.background
    ) { padding ->
        Column(
            modifier = Modifier
                .padding(padding)
                .fillMaxSize()
                .padding(horizontal = 16.dp, vertical = 12.dp)
        ) {
            Column {
                Text(
                    text = "Inbound Shipments",
                    color = MaterialTheme.colorScheme.onBackground,
                    fontSize = 22.sp,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    text = "Tap any shipment card to view & update devices",
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    fontSize = 13.sp
                )
            }

            Spacer(modifier = Modifier.height(14.dp))

            if (isLoading && shipments.isEmpty()) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = MaterialTheme.colorScheme.primary)
                }
            } else if (shipments.isEmpty()) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Text(
                        text = "No shipment batches registered in cloud",
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            } else {
                LazyColumn(
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                    contentPadding = PaddingValues(bottom = 80.dp)
                ) {
                    items(shipments) { shipment ->
                        ShipmentCard(
                            shipment = shipment,
                            onClick = { onSelectShipment(shipment) }
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun ShipmentCard(
    shipment: ShipmentDto,
    onClick: () -> Unit
) {
    val count = shipment.devicesCount
    val totalGrossCost = shipment.shippingCost?.toDoubleOrNull() ?: 0.0
    val discountAmount = shipment.discount?.toDoubleOrNull() ?: 0.0
    val netCost = shipment.netShippingCost?.toDoubleOrNull() ?: maxOf(totalGrossCost - discountAmount, 0.0)
    val unitFee = shipment.unitShippingCost?.toDoubleOrNull() 
        ?: if (count > 0 && netCost > 0) (netCost / count) else 0.0

    val totalFormatted = if (netCost % 1.0 == 0.0) "${netCost.toLong()}" else String.format(java.util.Locale.US, "%.2f", netCost)
    val unitFormatted = if (unitFee % 1.0 == 0.0) "${unitFee.toLong()}" else String.format(java.util.Locale.US, "%.2f", unitFee)

    val billText = if (count > 0 && unitFee > 0) {
        "Shipment Bill: $totalFormatted ($unitFormatted x $count)"
    } else {
        "Shipment Bill: $totalFormatted"
    }

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() },
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        shape = RoundedCornerShape(14.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            // Header Row: Top Title & Device Units Badge
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = shipment.supplierName ?: "Supplier Order",
                    color = MaterialTheme.colorScheme.onSurface,
                    fontWeight = FontWeight.Bold,
                    fontSize = 15.sp,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier
                        .weight(1f, fill = false)
                        .padding(end = 8.dp)
                )
                Surface(
                    color = MaterialTheme.colorScheme.primary.copy(alpha = 0.15f),
                    shape = RoundedCornerShape(6.dp)
                ) {
                    Text(
                        text = "📦 $count Units →",
                        color = MaterialTheme.colorScheme.primary,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        maxLines = 1,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            // 1. Tracking #
            CopyableText(label = "Tracking #", value = shipment.trackingNumber)

            Spacer(modifier = Modifier.height(6.dp))

            // 2. Shipping Agent
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text("Shipping Agent:", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 12.sp)
                Text(
                    text = shipment.shippingCompany ?: "Standard Freight",
                    color = MaterialTheme.colorScheme.onSurface,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Medium
                )
            }

            Spacer(modifier = Modifier.height(4.dp))

            // 3. Supplier
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text("Supplier:", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 12.sp)
                Text(
                    text = shipment.supplierName ?: "Unknown",
                    color = MaterialTheme.colorScheme.onSurface,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Medium
                )
            }

            Spacer(modifier = Modifier.height(8.dp))

            // 4. Shipment Bill (Clean distinct row under Supplier matching requirement exactly)
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(Color(0xFFD97706).copy(alpha = 0.08f), RoundedCornerShape(8.dp))
                    .padding(horizontal = 10.dp, vertical = 8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = billText,
                    color = Color(0xFFD97706),
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold
                )
            }
        }
    }
}
