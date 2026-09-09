package com.imei.inventory.ui.dialogs

import androidx.compose.foundation.background
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
import com.imei.inventory.data.model.ShipmentDto
import com.imei.inventory.ui.components.CopyableText
import com.imei.inventory.ui.components.StatusBadge
import com.imei.inventory.ui.components.VariantBadge

@Composable
fun ShipmentDetailDialog(
    shipment: ShipmentDto,
    devicesInShipment: List<DeviceDto>,
    onDismiss: () -> Unit,
    onUpdateDeviceStatus: (Int, String) -> Unit,
    onReceiveAllToInStock: () -> Unit
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = MaterialTheme.colorScheme.surface,
        shape = RoundedCornerShape(18.dp),
        title = {
            Column {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = shipment.shippingCompany ?: "Shipment Details",
                        color = MaterialTheme.colorScheme.onSurface,
                        fontWeight = FontWeight.Bold,
                        fontSize = 18.sp
                    )
                    Surface(
                        color = MaterialTheme.colorScheme.primary.copy(alpha = 0.15f),
                        shape = RoundedCornerShape(6.dp)
                    ) {
                        Text(
                            text = "📦 ${devicesInShipment.size} Devices",
                            color = MaterialTheme.colorScheme.primary,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                        )
                    }
                }
                Spacer(modifier = Modifier.height(4.dp))
                CopyableText(label = "Tracking #", value = shipment.trackingNumber)
            }
        },
        text = {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .heightIn(max = 440.dp)
            ) {
                // Shipment Metadata
                val count = if (devicesInShipment.isNotEmpty()) devicesInShipment.size else shipment.devicesCount
                val totalGrossCost = shipment.shippingCost?.toDoubleOrNull() ?: 0.0
                val discountAmount = shipment.discount?.toDoubleOrNull() ?: 0.0
                val netCost = shipment.netShippingCost?.toDoubleOrNull() ?: maxOf(totalGrossCost - discountAmount, 0.0)
                val unitFee = shipment.unitShippingCost?.toDoubleOrNull() 
                    ?: if (count > 0 && netCost > 0) (netCost / count) else 0.0
                val totalBatchCost = devicesInShipment.sumOf { it.buyingPrice ?: 0.0 }

                Column(
                    verticalArrangement = Arrangement.spacedBy(4.dp),
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.35f), RoundedCornerShape(10.dp))
                        .padding(10.dp)
                ) {
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text("Supplier:", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 12.sp)
                        Text(shipment.supplierName ?: "Unknown", color = MaterialTheme.colorScheme.onSurface, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                    }
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text("Shipping Agent:", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 12.sp)
                        Text(shipment.shippingCompany ?: "Standard Freight", color = MaterialTheme.colorScheme.onSurface, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                    }

                    if (netCost > 0 || totalGrossCost > 0) {
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text("Net Shipment Bill:", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 12.sp)
                            Text("BDT ${String.format("%.2f", netCost)}", color = Color(0xFFD97706), fontSize = 12.sp, fontWeight = FontWeight.Bold)
                        }
                        if (discountAmount > 0) {
                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                Text("Agent Cashback:", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 11.sp)
                                Text("- BDT ${String.format("%.2f", discountAmount)}", color = Color(0xFF16A34A), fontSize = 11.sp, fontWeight = FontWeight.SemiBold)
                            }
                        }
                        if (count > 0 && unitFee > 0) {
                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                Text("Net Freight / Unit:", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 11.sp)
                                Text("BDT ${String.format("%.2f", unitFee)} × $count units", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 11.sp)
                            }
                        }
                    }

                    if (totalBatchCost > 0) {
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text("Total Batch Cost:", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 12.sp)
                            Text("BDT ${String.format("%.2f", totalBatchCost)}", color = Color(0xFF16A34A), fontSize = 12.sp, fontWeight = FontWeight.Bold)
                        }
                    }

                    shipment.createdAt?.let { date ->
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text("Registered Date:", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 11.sp)
                            Text(date.take(10), color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 11.sp)
                        }
                    }
                }

                Spacer(modifier = Modifier.height(10.dp))

                // Bulk Quick Action
                Button(
                    onClick = onReceiveAllToInStock,
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF16A34A)),
                    shape = RoundedCornerShape(8.dp),
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(34.dp)
                ) {
                    Text("✅ Receive All (Set All to In Stock)", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Color.White)
                }

                Spacer(modifier = Modifier.height(10.dp))
                HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.5f))
                Spacer(modifier = Modifier.height(8.dp))

                Text(
                    text = "Devices in this Shipment Batch ($count units):",
                    color = MaterialTheme.colorScheme.onSurface,
                    fontWeight = FontWeight.Bold,
                    fontSize = 13.sp
                )

                Spacer(modifier = Modifier.height(6.dp))

                if (devicesInShipment.isEmpty()) {
                    Box(modifier = Modifier.fillMaxWidth().padding(16.dp), contentAlignment = Alignment.Center) {
                        Text("No devices linked to this shipment ID", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 12.sp)
                    }
                } else {
                    LazyColumn(
                        verticalArrangement = Arrangement.spacedBy(6.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        items(devicesInShipment) { dev ->
                            ShipmentDeviceItem(
                                device = dev,
                                onStatusChange = { newStatus -> onUpdateDeviceStatus(dev.id, newStatus) }
                            )
                        }
                    }
                }
            }
        },
        confirmButton = {
            Button(
                onClick = onDismiss,
                shape = RoundedCornerShape(8.dp),
                colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
            ) {
                Text("Close", color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
    )
}

@Composable
fun ShipmentDeviceItem(
    device: DeviceDto,
    onStatusChange: (String) -> Unit
) {
    var expandedMenu by remember { mutableStateOf(false) }

    Card(
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)),
        shape = RoundedCornerShape(8.dp),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(modifier = Modifier.padding(10.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = device.model,
                    color = MaterialTheme.colorScheme.onSurface,
                    fontWeight = FontWeight.Bold,
                    fontSize = 13.sp
                )
                VariantBadge(device.variant)
            }

            Spacer(modifier = Modifier.height(4.dp))

            CopyableText(label = "IMEI", value = device.imei)

            device.buyingPrice?.let { bp ->
                Spacer(modifier = Modifier.height(3.dp))
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text("Cost (Item + Ship):", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 11.sp)
                    Text("BDT ${String.format("%.2f", bp)}", color = Color(0xFF16A34A), fontSize = 11.sp, fontWeight = FontWeight.SemiBold)
                }
            }

            Spacer(modifier = Modifier.height(6.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                StatusBadge(device.currentStatus, device.statusDisplay)

                Box {
                    Button(
                        onClick = { expandedMenu = true },
                        colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.surface),
                        contentPadding = PaddingValues(horizontal = 8.dp, vertical = 2.dp),
                        shape = RoundedCornerShape(6.dp),
                        modifier = Modifier.height(24.dp)
                    ) {
                        Text("Change ▾", fontSize = 10.sp, color = MaterialTheme.colorScheme.onSurface)
                    }
                    DropdownMenu(
                        expanded = expandedMenu,
                        onDismissRequest = { expandedMenu = false }
                    ) {
                        DropdownMenuItem(
                            text = { Text("In Stock", fontSize = 12.sp) },
                            onClick = {
                                expandedMenu = false
                                onStatusChange("IN_STOCK")
                            }
                        )
                        DropdownMenuItem(
                            text = { Text("Under Repair", fontSize = 12.sp) },
                            onClick = {
                                expandedMenu = false
                                onStatusChange("UNDER_REPAIR")
                            }
                        )
                        DropdownMenuItem(
                            text = { Text("Sold", fontSize = 12.sp) },
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
