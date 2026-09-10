package com.imei.inventory.ui.dialogs

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.imei.inventory.data.model.DeviceDto
import com.imei.inventory.data.model.UserDto
import com.imei.inventory.ui.components.CopyableText
import com.imei.inventory.ui.components.StatusBadge
import com.imei.inventory.ui.components.VariantBadge

@Composable
fun DeviceDetailDialog(
    device: DeviceDto,
    users: List<UserDto> = emptyList(),
    onDismiss: () -> Unit,
    onStatusChange: (String) -> Unit,
    onOwnerChange: (newOwnerId: Int?, newOwnerName: String?) -> Unit = { _, _ -> },
    onUpdateSpecs: (Map<String, Any?>) -> Unit = {},
    onDelete: () -> Unit
) {
    var showDeleteConfirm by remember { mutableStateOf(false) }
    var showOwnerDropdown by remember { mutableStateOf(false) }
    var showEditSpecsDialog by remember { mutableStateOf(false) }

    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = MaterialTheme.colorScheme.surface,
        shape = RoundedCornerShape(18.dp),
        title = {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = device.model,
                    color = MaterialTheme.colorScheme.onSurface,
                    fontWeight = FontWeight.Bold,
                    fontSize = 19.sp
                )
                VariantBadge(device.variant)
            }
        },
        text = {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text("Current Status:", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 13.sp)
                    StatusBadge(device.currentStatus, device.statusDisplay)
                }

                HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.5f))

                // Identifiers
                CopyableText(label = "Primary IMEI", value = device.imei)
                device.imei2?.let { CopyableText(label = "IMEI 2", value = it) }
                device.serialNumber?.let { CopyableText(label = "Serial Number", value = it) }
                device.meid?.let { CopyableText(label = "MEID", value = it) }

                HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.5f))

                // Specs
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text("Storage Capacity:", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 13.sp)
                    Text(device.capacity ?: "N/A", color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.SemiBold)
                }
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text("Color:", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 13.sp)
                    Text(device.color ?: "N/A", color = MaterialTheme.colorScheme.onSurface)
                }
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text("Battery Health:", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 13.sp)
                    Text(
                        if (device.batteryHealth != null) "${device.batteryHealth}%" else "N/A",
                        color = Color(0xFF16A34A),
                        fontWeight = FontWeight.Bold
                    )
                }
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text("Battery Cycle Count:", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 13.sp)
                    Text(
                        if (device.batteryCycle != null) "${device.batteryCycle} Cycles" else "N/A",
                        color = Color(0xFF16A34A),
                        fontWeight = FontWeight.Bold
                    )
                }
                device.buyingPrice?.let { price ->
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text("Buying Price:", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 13.sp)
                        Text("BDT $price", color = Color(0xFFD97706), fontWeight = FontWeight.SemiBold)
                    }
                }

                // Interactive Assigned Owner Row with Dropdown Picker
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text("Assigned Owner:", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 13.sp)
                    
                    Box {
                        Surface(
                            onClick = { showOwnerDropdown = true },
                            color = MaterialTheme.colorScheme.primary.copy(alpha = 0.12f),
                            shape = RoundedCornerShape(8.dp)
                        ) {
                            Row(
                                modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(4.dp)
                            ) {
                                Text(
                                    text = device.currentOwnerName ?: "Unassigned",
                                    color = if (device.currentOwnerName != null) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant,
                                    fontWeight = FontWeight.SemiBold,
                                    fontSize = 13.sp
                                )
                                Text(
                                    text = "▾",
                                    color = MaterialTheme.colorScheme.primary,
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Bold
                                )
                            }
                        }

                        DropdownMenu(
                            expanded = showOwnerDropdown,
                            onDismissRequest = { showOwnerDropdown = false },
                            modifier = Modifier.background(MaterialTheme.colorScheme.surface)
                        ) {
                            DropdownMenuItem(
                                text = {
                                    Text(
                                        text = "-- Unassigned (None) --",
                                        color = Color(0xFFDC2626),
                                        fontWeight = if (device.currentOwnerName == null) FontWeight.Bold else FontWeight.Normal
                                    )
                                },
                                onClick = {
                                    showOwnerDropdown = false
                                    onOwnerChange(null, null)
                                }
                            )

                            if (users.isNotEmpty()) {
                                HorizontalDivider()
                                users.forEach { user ->
                                    DropdownMenuItem(
                                        text = {
                                            Row(
                                                modifier = Modifier.fillMaxWidth(),
                                                horizontalArrangement = Arrangement.SpaceBetween,
                                                verticalAlignment = Alignment.CenterVertically
                                            ) {
                                                Text(
                                                    text = user.username,
                                                    color = if (user.username == device.currentOwnerName) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurface,
                                                    fontWeight = if (user.username == device.currentOwnerName) FontWeight.Bold else FontWeight.Medium
                                                )
                                                user.role?.let { role ->
                                                    Text(
                                                        text = role.lowercase().replaceFirstChar { it.uppercase() },
                                                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                                                        fontSize = 11.sp,
                                                        modifier = Modifier.padding(start = 8.dp)
                                                    )
                                                }
                                            }
                                        },
                                        onClick = {
                                            showOwnerDropdown = false
                                            onOwnerChange(user.id, user.username)
                                        }
                                    )
                                }
                            }
                        }
                    }
                }

                HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.5f))

                // Quick Status Changer
                Text("Update Device Status:", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    Button(
                        onClick = { onStatusChange("IN_STOCK") },
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0x2222C55E)),
                        shape = RoundedCornerShape(8.dp),
                        modifier = Modifier.weight(1f),
                        contentPadding = PaddingValues(horizontal = 4.dp, vertical = 6.dp)
                    ) {
                        Text("In Stock", color = Color(0xFF16A34A), fontSize = 11.sp, fontWeight = FontWeight.Bold)
                    }
                    Button(
                        onClick = { onStatusChange("UNDER_REPAIR") },
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0x22EAB308)),
                        shape = RoundedCornerShape(8.dp),
                        modifier = Modifier.weight(1f),
                        contentPadding = PaddingValues(horizontal = 4.dp, vertical = 6.dp)
                    ) {
                        Text("Repair", color = Color(0xFFCA8A04), fontSize = 11.sp, fontWeight = FontWeight.Bold)
                    }
                    Button(
                        onClick = { onStatusChange("SOLD") },
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0x223B82F6)),
                        shape = RoundedCornerShape(8.dp),
                        modifier = Modifier.weight(1f),
                        contentPadding = PaddingValues(horizontal = 4.dp, vertical = 6.dp)
                    ) {
                        Text("Sold", color = Color(0xFF2563EB), fontSize = 11.sp, fontWeight = FontWeight.Bold)
                    }
                }
            }
        },
        confirmButton = {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                IconButton(
                    onClick = { showDeleteConfirm = true }
                ) {
                    Icon(
                        imageVector = Icons.Default.Delete,
                        contentDescription = "Delete Device",
                        tint = Color(0xFFDC2626)
                    )
                }

                Row(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    OutlinedButton(
                        onClick = { showEditSpecsDialog = true },
                        shape = RoundedCornerShape(8.dp),
                        contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.Edit,
                            contentDescription = null,
                            modifier = Modifier.size(16.dp),
                            tint = MaterialTheme.colorScheme.primary
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            text = "Edit",
                            color = MaterialTheme.colorScheme.primary,
                            fontWeight = FontWeight.SemiBold,
                            fontSize = 13.sp
                        )
                    }

                    Button(
                        onClick = onDismiss,
                        shape = RoundedCornerShape(8.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
                        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 6.dp)
                    ) {
                        Text(
                            text = "Done",
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            fontWeight = FontWeight.SemiBold,
                            fontSize = 13.sp
                        )
                    }
                }
            }
        },
        dismissButton = null
    )

    if (showEditSpecsDialog) {
        EditDeviceSpecsDialog(
            device = device,
            onDismiss = { showEditSpecsDialog = false },
            onSave = { updates ->
                onUpdateSpecs(updates)
            }
        )
    }

    if (showDeleteConfirm) {
        AlertDialog(
            onDismissRequest = { showDeleteConfirm = false },
            containerColor = MaterialTheme.colorScheme.surface,
            shape = RoundedCornerShape(16.dp),
            title = { Text("Delete Device?", color = MaterialTheme.colorScheme.onSurface, fontWeight = FontWeight.Bold) },
            text = { Text("Are you sure you want to delete ${device.model} (${device.imei})? This cannot be undone.", color = MaterialTheme.colorScheme.onSurfaceVariant) },
            confirmButton = {
                Button(
                    onClick = {
                        showDeleteConfirm = false
                        onDelete()
                    },
                    shape = RoundedCornerShape(8.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFDC2626))
                ) {
                    Text("Yes, Delete", color = Color.White)
                }
            },
            dismissButton = {
                TextButton(onClick = { showDeleteConfirm = false }) {
                    Text("Cancel", color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
        )
    }
}

@Composable
fun EditDeviceSpecsDialog(
    device: DeviceDto,
    onDismiss: () -> Unit,
    onSave: (Map<String, Any?>) -> Unit
) {
    var batteryHealth by remember { mutableStateOf(device.batteryHealth?.toString() ?: "") }
    var batteryCycle by remember { mutableStateOf(device.batteryCycle?.toString() ?: "") }
    var capacity by remember { mutableStateOf(device.capacity ?: "") }
    var color by remember { mutableStateOf(device.color ?: "") }
    var buyingPrice by remember {
        mutableStateOf(
            device.buyingPrice?.let {
                if (it % 1.0 == 0.0) it.toLong().toString() else it.toString()
            } ?: ""
        )
    }

    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = MaterialTheme.colorScheme.surface,
        shape = RoundedCornerShape(18.dp),
        title = {
            Column {
                Text(
                    text = "Edit Device Specs",
                    color = MaterialTheme.colorScheme.onSurface,
                    fontWeight = FontWeight.Bold,
                    fontSize = 18.sp
                )
                Text(
                    text = "${device.model} (${device.imei})",
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    fontSize = 12.sp
                )
            }
        },
        text = {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                OutlinedTextField(
                    value = batteryHealth,
                    onValueChange = { if (it.length <= 3 && it.all { c -> c.isDigit() }) batteryHealth = it },
                    label = { Text("Battery Health (%)") },
                    placeholder = { Text("e.g. 95") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(10.dp)
                )

                OutlinedTextField(
                    value = batteryCycle,
                    onValueChange = { if (it.all { c -> c.isDigit() }) batteryCycle = it },
                    label = { Text("Battery Cycle Count") },
                    placeholder = { Text("e.g. 120") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(10.dp)
                )

                OutlinedTextField(
                    value = capacity,
                    onValueChange = { capacity = it },
                    label = { Text("Storage Capacity") },
                    placeholder = { Text("e.g. 256GB") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(10.dp)
                )

                OutlinedTextField(
                    value = color,
                    onValueChange = { color = it },
                    label = { Text("Color") },
                    placeholder = { Text("e.g. Natural Titanium") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(10.dp)
                )

                OutlinedTextField(
                    value = buyingPrice,
                    onValueChange = { buyingPrice = it },
                    label = { Text("Buying Price (BDT)") },
                    placeholder = { Text("e.g. 71700") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(10.dp)
                )
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    val updates = mutableMapOf<String, Any?>()
                    updates["battery_health"] = batteryHealth.toIntOrNull()
                    updates["battery_cycle"] = batteryCycle.toIntOrNull()
                    updates["capacity"] = capacity.trim().ifEmpty { null }
                    updates["color"] = color.trim().ifEmpty { null }
                    updates["buying_price"] = buyingPrice.toDoubleOrNull()

                    onSave(updates)
                    onDismiss()
                },
                shape = RoundedCornerShape(8.dp),
                colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary)
            ) {
                Text("Save Changes", color = Color.White, fontWeight = FontWeight.SemiBold)
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Cancel", color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
    )
}

