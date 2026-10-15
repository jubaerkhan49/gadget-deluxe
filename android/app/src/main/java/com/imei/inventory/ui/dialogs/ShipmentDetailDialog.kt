package com.imei.inventory.ui.dialogs

import android.app.DatePickerDialog
import android.widget.Toast
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import com.imei.inventory.data.model.DeviceDto
import com.imei.inventory.data.model.ShipmentDto
import com.imei.inventory.ui.components.CopyableText
import com.imei.inventory.ui.components.StatusBadge
import com.imei.inventory.ui.components.VariantBadge
import com.imei.inventory.ui.components.formatDateToDDMMYYYY
import com.imei.inventory.ui.theme.*
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale

@Composable
fun ShipmentDetailDialog(
    shipment: ShipmentDto,
    devicesInShipment: List<DeviceDto>,
    onDismiss: () -> Unit,
    onUpdateDeviceStatus: (deviceId: Int, newStatus: String, receiveDate: String?) -> Unit,
    onReceiveAllToInStock: (receiveDate: String?) -> Unit,
    onEditShipment: ((ShipmentDto) -> Unit)? = null,
    onDeleteShipment: ((ShipmentDto) -> Unit)? = null
) {
    val context = LocalContext.current
    var showReceiveAllDateSection by remember { mutableStateOf(false) }
    var showDeleteConfirm by remember { mutableStateOf(false) }
    var receiveAllDate by remember {
        val sdf = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())
        mutableStateOf(shipment.receiveDate?.take(10) ?: sdf.format(Date()))
    }

    val count = if (devicesInShipment.isNotEmpty()) devicesInShipment.size else shipment.devicesCount
    val inStockCount = devicesInShipment.count { it.currentStatus == "IN_STOCK" }

    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(usePlatformDefaultWidth = false)
    ) {
        Surface(
            modifier = Modifier
                .fillMaxWidth(0.95f)
                .fillMaxHeight(0.92f),
            shape = RoundedCornerShape(16.dp),
            color = MaterialTheme.colorScheme.surface,
            border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f)),
            tonalElevation = 6.dp
        ) {
            Column(modifier = Modifier.fillMaxSize()) {
                // 1. Compact Header Bar
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 14.dp, vertical = 8.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(modifier = Modifier.weight(1f, fill = false).padding(end = 8.dp)) {
                        Text(
                            text = shipment.shippingCompany ?: (shipment.supplierName ?: "Shipment Batch"),
                            color = MaterialTheme.colorScheme.onSurface,
                            fontWeight = FontWeight.ExtraBold,
                            fontSize = 15.sp,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                        Spacer(modifier = Modifier.height(2.dp))
                        CopyableText(label = "Tracking", value = shipment.trackingNumber)
                    }

                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        Surface(
                            color = if (inStockCount == count && count > 0) AccentEmerald.copy(alpha = 0.15f) else MaterialTheme.colorScheme.primary.copy(alpha = 0.12f),
                            shape = RoundedCornerShape(percent = 50),
                            border = BorderStroke(
                                0.8.dp,
                                if (inStockCount == count && count > 0) AccentEmerald.copy(alpha = 0.35f) else MaterialTheme.colorScheme.primary.copy(alpha = 0.3f)
                            )
                        ) {
                            Text(
                                text = if (inStockCount == count && count > 0) "$count Received" else "$count Units",
                                color = if (inStockCount == count && count > 0) AccentEmerald else MaterialTheme.colorScheme.primary,
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.5.dp)
                            )
                        }

                        IconButton(
                            onClick = onDismiss,
                            modifier = Modifier.size(28.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.Close,
                                contentDescription = "Close",
                                tint = MaterialTheme.colorScheme.onSurfaceVariant,
                                modifier = Modifier.size(17.dp)
                            )
                        }
                    }
                }

                HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.4f), thickness = 0.5.dp)

                // 2. Compact 2-Line Metadata Strip
                Surface(
                    color = MaterialTheme.colorScheme.surfaceContainerLow,
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 12.dp, vertical = 6.dp),
                    shape = RoundedCornerShape(8.dp),
                    border = BorderStroke(0.6.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.35f))
                ) {
                    Column(
                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp),
                        verticalArrangement = Arrangement.spacedBy(2.dp)
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text("Supplier: ", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 11.sp)
                                Text(shipment.supplierName ?: "Unknown", color = MaterialTheme.colorScheme.onSurface, fontSize = 11.sp, fontWeight = FontWeight.SemiBold)
                            }
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text("Agent: ", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 11.sp)
                                Text(shipment.shippingCompany ?: "Standard", color = MaterialTheme.colorScheme.onSurface, fontSize = 11.sp, fontWeight = FontWeight.SemiBold)
                            }
                        }
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text("CN Date: ", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 11.sp)
                                Text(formatDateToDDMMYYYY(shipment.receiveDate, "Pending"), color = AccentEmerald, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                            }
                            shipment.createdAt?.let { date ->
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Text("Created: ", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 11.sp)
                                    Text(formatDateToDDMMYYYY(date), color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 11.sp)
                                }
                            }
                        }
                    }
                }

                // 3. Compact "Receive All" Action Section
                Box(modifier = Modifier.padding(horizontal = 12.dp, vertical = 2.dp)) {
                    if (!showReceiveAllDateSection) {
                        Button(
                            onClick = { showReceiveAllDateSection = true },
                            colors = ButtonDefaults.buttonColors(containerColor = AccentEmerald),
                            shape = RoundedCornerShape(8.dp),
                            contentPadding = PaddingValues(horizontal = 12.dp, vertical = 4.dp),
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(30.dp)
                        ) {
                            Text("✓ Receive All (Set All to In Stock)", fontSize = 11.5.sp, fontWeight = FontWeight.Bold, color = Color.White)
                        }
                    } else {
                        Surface(
                            color = AccentEmerald.copy(alpha = 0.09f),
                            shape = RoundedCornerShape(8.dp),
                            border = BorderStroke(0.8.dp, AccentEmerald.copy(alpha = 0.35f)),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Row(
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                                horizontalArrangement = Arrangement.spacedBy(6.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                OutlinedButton(
                                    onClick = {
                                        val cal = Calendar.getInstance()
                                        try {
                                            val parts = receiveAllDate.split("-")
                                            if (parts.size == 3) {
                                                cal.set(parts[0].toInt(), parts[1].toInt() - 1, parts[2].toInt())
                                            }
                                        } catch (_: Exception) { }

                                        DatePickerDialog(
                                            context,
                                            { _, y, m, d ->
                                                receiveAllDate = String.format(Locale.US, "%04d-%02d-%02d", y, m + 1, d)
                                            },
                                            cal.get(Calendar.YEAR),
                                            cal.get(Calendar.MONTH),
                                            cal.get(Calendar.DAY_OF_MONTH)
                                        ).show()
                                    },
                                    shape = RoundedCornerShape(6.dp),
                                    contentPadding = PaddingValues(horizontal = 8.dp, vertical = 2.dp),
                                    modifier = Modifier.weight(1f).height(28.dp)
                                ) {
                                    Text("📅 $receiveAllDate", fontSize = 11.sp, fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.onSurface)
                                }

                                Button(
                                    onClick = {
                                        showReceiveAllDateSection = false
                                        onReceiveAllToInStock(receiveAllDate)
                                    },
                                    colors = ButtonDefaults.buttonColors(containerColor = AccentEmerald),
                                    shape = RoundedCornerShape(6.dp),
                                    contentPadding = PaddingValues(horizontal = 10.dp, vertical = 2.dp),
                                    modifier = Modifier.height(28.dp)
                                ) {
                                    Text("Confirm All", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 11.sp)
                                }

                                IconButton(
                                    onClick = { showReceiveAllDateSection = false },
                                    modifier = Modifier.size(24.dp)
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.Close,
                                        contentDescription = "Cancel",
                                        tint = MaterialTheme.colorScheme.onSurfaceVariant,
                                        modifier = Modifier.size(14.dp)
                                    )
                                }
                            }
                        }
                    }
                }

                // 4. Section Subhead
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 14.dp, vertical = 4.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "Devices in Batch ($count units):",
                        color = MaterialTheme.colorScheme.onSurface,
                        fontWeight = FontWeight.Bold,
                        fontSize = 12.sp
                    )
                    Text(
                        text = "$inStockCount/$count in Stock",
                        color = if (inStockCount == count && count > 0) AccentEmerald else MaterialTheme.colorScheme.onSurfaceVariant,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.SemiBold
                    )
                }

                // 5. High-Density Scrollable Device List
                Box(
                    modifier = Modifier
                        .weight(1f)
                        .padding(horizontal = 12.dp)
                ) {
                    if (devicesInShipment.isEmpty()) {
                        Box(
                            modifier = Modifier.fillMaxSize(),
                            contentAlignment = Alignment.Center
                        ) {
                            Text("No devices linked to this shipment ID", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 12.sp)
                        }
                    } else {
                        LazyColumn(
                            verticalArrangement = Arrangement.spacedBy(4.dp),
                            contentPadding = PaddingValues(vertical = 2.dp),
                            modifier = Modifier.fillMaxSize()
                        ) {
                            items(devicesInShipment, key = { it.id }) { dev ->
                                CompactShipmentDeviceItem(
                                    device = dev,
                                    defaultReceiveDate = shipment.receiveDate?.take(10),
                                    onStatusChange = { newStatus, receiveDate ->
                                        onUpdateDeviceStatus(dev.id, newStatus, receiveDate)
                                    }
                                )
                            }
                        }
                    }
                }

                HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.4f), thickness = 0.5.dp)

                // 6. Compact Bottom Action Bar
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 12.dp, vertical = 6.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    if (onDeleteShipment != null) {
                        Surface(
                            onClick = { showDeleteConfirm = true },
                            shape = RoundedCornerShape(percent = 50),
                            color = MaterialTheme.colorScheme.error.copy(alpha = 0.10f),
                            modifier = Modifier.size(32.dp)
                        ) {
                            Box(contentAlignment = Alignment.Center) {
                                Icon(
                                    imageVector = Icons.Default.Delete,
                                    contentDescription = "Delete Shipment",
                                    tint = MaterialTheme.colorScheme.error,
                                    modifier = Modifier.size(16.dp)
                                )
                            }
                        }
                    } else {
                        Spacer(modifier = Modifier.width(1.dp))
                    }

                    Row(
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        if (onEditShipment != null) {
                            FilledTonalButton(
                                onClick = {
                                    onDismiss()
                                    onEditShipment(shipment)
                                },
                                shape = RoundedCornerShape(percent = 50),
                                contentPadding = PaddingValues(horizontal = 14.dp, vertical = 0.dp),
                                modifier = Modifier.height(32.dp)
                            ) {
                                Icon(
                                    imageVector = Icons.Default.Edit,
                                    contentDescription = null,
                                    modifier = Modifier.size(13.dp),
                                    tint = MaterialTheme.colorScheme.primary
                                )
                                Spacer(modifier = Modifier.width(4.dp))
                                Text(
                                    text = "Edit",
                                    color = MaterialTheme.colorScheme.primary,
                                    fontWeight = FontWeight.SemiBold,
                                    fontSize = 12.sp
                                )
                            }
                        }

                        Button(
                            onClick = onDismiss,
                            shape = RoundedCornerShape(percent = 50),
                            colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary),
                            contentPadding = PaddingValues(horizontal = 20.dp, vertical = 0.dp),
                            modifier = Modifier.height(32.dp)
                        ) {
                            Text("Done", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 12.sp)
                        }
                    }
                }
            }
        }
    }

    if (showDeleteConfirm) {
        AlertDialog(
            onDismissRequest = { showDeleteConfirm = false },
            title = { Text("Delete Shipment?", fontWeight = FontWeight.Bold, fontSize = 15.sp) },
            text = { Text("Are you sure you want to delete shipment #${shipment.trackingNumber}? Any linked devices will be detached from this shipment.", fontSize = 13.sp) },
            confirmButton = {
                Button(
                    onClick = {
                        showDeleteConfirm = false
                        onDismiss()
                        onDeleteShipment?.invoke(shipment)
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error),
                    shape = RoundedCornerShape(percent = 50),
                    modifier = Modifier.height(32.dp),
                    contentPadding = PaddingValues(horizontal = 14.dp, vertical = 0.dp)
                ) {
                    Text("Delete", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 12.sp)
                }
            },
            dismissButton = {
                TextButton(
                    onClick = { showDeleteConfirm = false },
                    modifier = Modifier.height(32.dp)
                ) {
                    Text("Cancel", fontSize = 12.sp)
                }
            }
        )
    }
}

/**
 * Ultra-Compact High-Density Shipment Device Item (Fits 7+ on screen)
 */
@Composable
fun CompactShipmentDeviceItem(
    device: DeviceDto,
    defaultReceiveDate: String? = null,
    onStatusChange: (String, String?) -> Unit
) {
    var expandedMenu by remember { mutableStateOf(false) }
    var showReceiveDateInput by remember { mutableStateOf(false) }
    val context = LocalContext.current

    var selectedReceiveDate by remember {
        val sdf = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())
        mutableStateOf(defaultReceiveDate ?: sdf.format(Date()))
    }

    Card(
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLow),
        shape = RoundedCornerShape(8.dp),
        border = BorderStroke(0.7.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.45f)),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(
            modifier = Modifier.padding(horizontal = 9.dp, vertical = 5.dp),
            verticalArrangement = Arrangement.spacedBy(3.dp)
        ) {
            // Row 1: Model Title + Specs (Left) | Badges (Right)
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.weight(1f, fill = false).padding(end = 6.dp)
                ) {
                    Text(
                        text = device.model,
                        color = MaterialTheme.colorScheme.onSurface,
                        fontWeight = FontWeight.Bold,
                        fontSize = 12.5.sp,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                    val specs = listOfNotNull(device.capacity, device.color).filter { it.isNotBlank() }
                    if (specs.isNotEmpty()) {
                        Text(
                            text = " • " + specs.joinToString(" • "),
                            fontSize = 11.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                }

                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    VariantBadge(device.variant)
                    StatusBadge(device.currentStatus, device.statusDisplay)
                }
            }

            // Row 2: Copyable IMEI (Left) | BD Date & Quick Status Menu (Right)
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                CopyableText(label = "IMEI", value = device.imei)

                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(5.dp)
                ) {
                    if (!device.receivedDateBd.isNullOrBlank()) {
                        Text(
                            text = "BD: ${formatDateToDDMMYYYY(device.receivedDateBd)}",
                            color = AccentEmerald,
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }

                    Box {
                        Surface(
                            onClick = { expandedMenu = true },
                            shape = RoundedCornerShape(percent = 50),
                            color = MaterialTheme.colorScheme.surfaceContainerHighest,
                            border = BorderStroke(0.6.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.6f))
                        ) {
                            Text(
                                text = "Change ▾",
                                fontSize = 10.sp,
                                fontWeight = FontWeight.SemiBold,
                                color = MaterialTheme.colorScheme.onSurface,
                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                            )
                        }

                        DropdownMenu(
                            expanded = expandedMenu,
                            onDismissRequest = { expandedMenu = false }
                        ) {
                            DropdownMenuItem(
                                text = { Text("In Stock", fontSize = 12.sp, color = AccentEmerald, fontWeight = FontWeight.SemiBold) },
                                onClick = {
                                    expandedMenu = false
                                    showReceiveDateInput = true
                                }
                            )
                            DropdownMenuItem(
                                text = { Text("Under Repair", fontSize = 12.sp, color = AccentAmber) },
                                onClick = {
                                    expandedMenu = false
                                    showReceiveDateInput = false
                                    onStatusChange("UNDER_REPAIR", null)
                                }
                            )
                            DropdownMenuItem(
                                text = { Text("Sold", fontSize = 12.sp, color = AccentBlue) },
                                onClick = {
                                    expandedMenu = false
                                    showReceiveDateInput = false
                                    onStatusChange("SOLD", null)
                                }
                            )
                        }
                    }
                }
            }

            // Expandable Date Picker if user clicked "In Stock"
            if (showReceiveDateInput) {
                Surface(
                    color = AccentEmerald.copy(alpha = 0.08f),
                    shape = RoundedCornerShape(6.dp),
                    border = BorderStroke(0.6.dp, AccentEmerald.copy(alpha = 0.3f)),
                    modifier = Modifier.fillMaxWidth().padding(top = 2.dp)
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 3.dp),
                        horizontalArrangement = Arrangement.spacedBy(5.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        OutlinedButton(
                            onClick = {
                                val cal = Calendar.getInstance()
                                try {
                                    val parts = selectedReceiveDate.split("-")
                                    if (parts.size == 3) {
                                        cal.set(parts[0].toInt(), parts[1].toInt() - 1, parts[2].toInt())
                                    }
                                } catch (_: Exception) { }

                                DatePickerDialog(
                                    context,
                                    { _, y, m, d ->
                                        selectedReceiveDate = String.format(Locale.US, "%04d-%02d-%02d", y, m + 1, d)
                                    },
                                    cal.get(Calendar.YEAR),
                                    cal.get(Calendar.MONTH),
                                    cal.get(Calendar.DAY_OF_MONTH)
                                ).show()
                            },
                            shape = RoundedCornerShape(4.dp),
                            contentPadding = PaddingValues(horizontal = 6.dp, vertical = 0.dp),
                            modifier = Modifier.weight(1f).height(26.dp)
                        ) {
                            Text("📅 $selectedReceiveDate", fontSize = 10.5.sp, fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.onSurface)
                        }

                        Button(
                            onClick = {
                                showReceiveDateInput = false
                                onStatusChange("IN_STOCK", selectedReceiveDate)
                            },
                            shape = RoundedCornerShape(4.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = AccentEmerald),
                            contentPadding = PaddingValues(horizontal = 8.dp, vertical = 0.dp),
                            modifier = Modifier.height(26.dp)
                        ) {
                            Text("Confirm", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 10.5.sp)
                        }

                        IconButton(
                            onClick = { showReceiveDateInput = false },
                            modifier = Modifier.size(20.dp)
                        ) {
                            Icon(Icons.Default.Close, contentDescription = "Cancel", modifier = Modifier.size(12.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }
                }
            }
        }
    }
}
