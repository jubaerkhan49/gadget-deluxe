package com.imei.inventory.ui.dialogs

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
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
import java.text.SimpleDateFormat
import java.util.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DeviceCheckInDialog(
    device: DeviceDto,
    users: List<UserDto> = emptyList(),
    onDismiss: () -> Unit,
    onSaveCheckIn: (updates: Map<String, Any?>) -> Unit
) {
    val todayStr = remember { SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date()) }
    val isAlreadyInStock = device.currentStatus.equals("IN_STOCK", ignoreCase = true)

    var isEditing by remember { mutableStateOf(!isAlreadyInStock) }
    var currentStatus by remember { mutableStateOf(device.currentStatus) }
    var batteryHealth by remember { mutableStateOf(device.batteryHealth?.toString() ?: "") }
    var batteryCycle by remember { mutableStateOf(device.batteryCycle?.toString() ?: "") }
    var receivedDateBd by remember { mutableStateOf(device.receivedDateBd ?: todayStr) }
    var notes by remember { mutableStateOf(device.notes ?: "") }
    var statusDropdownExpanded by remember { mutableStateOf(false) }

    val defaultOwnerUser = users.find { it.username.equals("jubaer", ignoreCase = true) }
    var selectedOwnerId by remember {
        mutableStateOf<Int?>(
            device.currentOwner ?: defaultOwnerUser?.id ?: 1
        )
    }
    var selectedOwnerName by remember {
        mutableStateOf(
            device.currentOwnerName ?: defaultOwnerUser?.username ?: "jubaer"
        )
    }
    var ownerDropdownExpanded by remember { mutableStateOf(false) }
    var showDirectOwnerDropdown by remember { mutableStateOf(false) }

    val statusOptions = listOf(
        "IN_STOCK" to "In Stock",
        "UNDER_REPAIR" to "Under Repair",
        "WAITING_SHIPMENT" to "Waiting Shipment",
        "SOLD" to "Sold"
    )

    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = MaterialTheme.colorScheme.surface,
        shape = RoundedCornerShape(20.dp),
        title = {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(
                    modifier = Modifier.weight(1f),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    Surface(
                        color = if (isAlreadyInStock) Color(0xFF16A34A).copy(alpha = 0.15f) else Color(0xFF3B82F6).copy(alpha = 0.15f),
                        shape = RoundedCornerShape(8.dp),
                        modifier = Modifier.size(36.dp)
                    ) {
                        Box(contentAlignment = Alignment.Center) {
                            Icon(
                                imageVector = if (isAlreadyInStock) Icons.Default.CheckCircle else Icons.Default.Inventory2,
                                contentDescription = null,
                                tint = if (isAlreadyInStock) Color(0xFF16A34A) else Color(0xFF3B82F6),
                                modifier = Modifier.size(20.dp)
                            )
                        }
                    }
                    Column {
                        Text(
                            text = if (isAlreadyInStock) "Device Details" else "Device Check-In",
                            color = MaterialTheme.colorScheme.onSurface,
                            fontWeight = FontWeight.Bold,
                            fontSize = 18.sp
                        )
                        Text(
                            text = "Found in database",
                            color = Color(0xFF94A3B8),
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Medium
                        )
                    }
                }

                IconButton(onClick = onDismiss, modifier = Modifier.size(28.dp)) {
                    Icon(Icons.Default.Close, contentDescription = "Close", tint = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
        },
        text = {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                // Notice banner if already in stock or waiting shipment
                if (isAlreadyInStock) {
                    Surface(
                        color = Color(0xFF16A34A).copy(alpha = 0.12f),
                        shape = RoundedCornerShape(10.dp),
                        border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF16A34A).copy(alpha = 0.35f)),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 12.dp, vertical = 9.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.CheckCircle,
                                contentDescription = null,
                                tint = Color(0xFF16A34A),
                                modifier = Modifier.size(16.dp)
                            )
                            Text(
                                text = "Current Status: Already In Stock",
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color(0xFF16A34A)
                            )
                        }
                    }
                } else if (device.currentStatus.equals("WAITING_SHIPMENT", ignoreCase = true)) {
                    Surface(
                        color = Color(0xFFF59E0B).copy(alpha = 0.12f),
                        shape = RoundedCornerShape(10.dp),
                        border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFF59E0B).copy(alpha = 0.35f)),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 12.dp, vertical = 9.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.LocalShipping,
                                contentDescription = null,
                                tint = Color(0xFFF59E0B),
                                modifier = Modifier.size(16.dp)
                            )
                            Text(
                                text = "Current Status: Waiting Shipment",
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color(0xFFF59E0B)
                            )
                        }
                    }
                }

                // Device Header Card
                Card(
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.6f)
                    ),
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(modifier = Modifier.padding(12.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = device.model,
                                fontWeight = FontWeight.Bold,
                                fontSize = 16.sp,
                                color = MaterialTheme.colorScheme.onSurface
                            )
                            VariantBadge(device.variant)
                        }

                        Spacer(modifier = Modifier.height(4.dp))

                        // Capacity • Color
                        Row(
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            device.capacity?.let {
                                Text(it, fontSize = 12.sp, color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.SemiBold)
                            }
                            device.color?.let {
                                Text("•  $it", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                        }

                        // Battery Health & Cycle Count Badges
                        if (device.batteryHealth != null || device.batteryCycle != null) {
                            Spacer(modifier = Modifier.height(4.dp))
                            Row(
                                horizontalArrangement = Arrangement.spacedBy(8.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                device.batteryHealth?.let { bh ->
                                    Surface(
                                        color = Color(0xFF22C55E).copy(alpha = 0.12f),
                                        shape = RoundedCornerShape(6.dp),
                                        border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF22C55E).copy(alpha = 0.3f))
                                    ) {
                                        Row(
                                            modifier = Modifier.padding(horizontal = 7.dp, vertical = 3.dp),
                                            verticalAlignment = Alignment.CenterVertically,
                                            horizontalArrangement = Arrangement.spacedBy(4.dp)
                                        ) {
                                            Icon(Icons.Default.BatteryChargingFull, contentDescription = null, modifier = Modifier.size(12.dp), tint = Color(0xFF22C55E))
                                            Text("Battery: $bh%", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Color(0xFF22C55E))
                                        }
                                    }
                                }
                                device.batteryCycle?.let { cc ->
                                    Surface(
                                        color = MaterialTheme.colorScheme.surface.copy(alpha = 0.7f),
                                        shape = RoundedCornerShape(6.dp),
                                        border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.25f))
                                    ) {
                                        Row(
                                            modifier = Modifier.padding(horizontal = 7.dp, vertical = 3.dp),
                                            verticalAlignment = Alignment.CenterVertically,
                                            horizontalArrangement = Arrangement.spacedBy(4.dp)
                                        ) {
                                            Icon(Icons.Default.Autorenew, contentDescription = null, modifier = Modifier.size(11.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant)
                                            Text("Cycles: $cc", fontSize = 11.sp, fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                        }
                                    }
                                }
                            }
                        }

                        Spacer(modifier = Modifier.height(6.dp))
                        CopyableText(label = "Primary IMEI", value = device.imei)
                        if (!device.imei2.isNullOrBlank()) {
                            CopyableText(label = "IMEI 2", value = device.imei2)
                        }

                        Spacer(modifier = Modifier.height(8.dp))
                        HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.2f))
                        Spacer(modifier = Modifier.height(6.dp))

                        // Current Status Row
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = "Current Status:",
                                fontSize = 12.sp,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(6.dp)
                            ) {
                                StatusBadge(device.currentStatus)
                                if (isAlreadyInStock) {
                                    Surface(
                                        color = Color(0xFF16A34A).copy(alpha = 0.15f),
                                        shape = RoundedCornerShape(6.dp)
                                    ) {
                                        Text(
                                            text = "✓ In Stock",
                                            color = Color(0xFF16A34A),
                                            fontSize = 10.sp,
                                            fontWeight = FontWeight.Bold,
                                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                        )
                                    }
                                }
                            }
                        }

                        // Interactive Assigned to Row with Direct Dropdown Picker
                        if (!device.currentStatus.equals("WAITING_SHIPMENT", ignoreCase = true)) {
                            Spacer(modifier = Modifier.height(4.dp))
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    text = "Assigned to:",
                                    fontSize = 12.sp,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                                
                                Box {
                                    Surface(
                                        onClick = { showDirectOwnerDropdown = true },
                                        color = MaterialTheme.colorScheme.primary.copy(alpha = 0.12f),
                                        shape = RoundedCornerShape(8.dp)
                                    ) {
                                        Row(
                                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                                            verticalAlignment = Alignment.CenterVertically,
                                            horizontalArrangement = Arrangement.spacedBy(4.dp)
                                        ) {
                                            Text(
                                                text = selectedOwnerName.ifBlank { "Unassigned" },
                                                color = if (selectedOwnerId != null) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant,
                                                fontWeight = FontWeight.SemiBold,
                                                fontSize = 12.sp
                                            )
                                            Text(
                                                text = "▾",
                                                color = MaterialTheme.colorScheme.primary,
                                                fontSize = 11.sp,
                                                fontWeight = FontWeight.Bold
                                            )
                                        }
                                    }

                                    DropdownMenu(
                                        expanded = showDirectOwnerDropdown,
                                        onDismissRequest = { showDirectOwnerDropdown = false },
                                        modifier = Modifier.background(MaterialTheme.colorScheme.surface)
                                    ) {
                                        DropdownMenuItem(
                                            text = {
                                                Text(
                                                    text = "-- Unassigned (None) --",
                                                    color = Color(0xFFDC2626),
                                                    fontWeight = if (selectedOwnerId == null) FontWeight.Bold else FontWeight.Normal
                                                )
                                            },
                                            onClick = {
                                                showDirectOwnerDropdown = false
                                                selectedOwnerId = null
                                                selectedOwnerName = "Unassigned"
                                                onSaveCheckIn(mapOf("current_owner" to null))
                                            }
                                        )

                                        HorizontalDivider()

                                        val availableUsers = (if (users.isNotEmpty()) {
                                            users
                                        } else {
                                            listOf(
                                                UserDto(id = 1, username = "jubaer", role = "ADMIN"),
                                                UserDto(id = 2, username = "ochi", role = "EMPLOYEE"),
                                                UserDto(id = 3, username = "ashraf", role = "EMPLOYEE"),
                                                UserDto(id = 4, username = "emon", role = "EMPLOYEE")
                                            )
                                        }).filter { !it.username.equals("admin", ignoreCase = true) }

                                        availableUsers.forEach { user ->
                                            DropdownMenuItem(
                                                text = {
                                                    Row(
                                                        modifier = Modifier.fillMaxWidth(),
                                                        horizontalArrangement = Arrangement.SpaceBetween,
                                                        verticalAlignment = Alignment.CenterVertically
                                                    ) {
                                                        Text(
                                                            text = user.username,
                                                            color = if (user.id == selectedOwnerId) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurface,
                                                            fontWeight = if (user.id == selectedOwnerId) FontWeight.Bold else FontWeight.Medium
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
                                                    showDirectOwnerDropdown = false
                                                    selectedOwnerId = user.id
                                                    selectedOwnerName = user.username
                                                    onSaveCheckIn(mapOf("current_owner" to user.id))
                                                }
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                // Related Inbound / Shipment Info
                Text(
                    text = "INBOUND & SHIPMENT DETAILS",
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.primary,
                    letterSpacing = 0.5.sp
                )

                Card(
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.4f)
                    ),
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(
                        modifier = Modifier.padding(12.dp),
                        verticalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                                Icon(Icons.Default.Business, contentDescription = null, modifier = Modifier.size(14.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant)
                                Text("Supplier:", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                            Text(
                                text = device.shipmentSupplier ?: "Direct / Unknown",
                                fontSize = 12.sp,
                                fontWeight = FontWeight.SemiBold,
                                color = MaterialTheme.colorScheme.onSurface
                            )
                        }

                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                                Icon(Icons.Default.LocalShipping, contentDescription = null, modifier = Modifier.size(14.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant)
                                Text("Shipping Agent:", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                            Text(
                                text = device.shipmentAgent ?: "None",
                                fontSize = 12.sp,
                                fontWeight = FontWeight.SemiBold,
                                color = MaterialTheme.colorScheme.onSurface
                            )
                        }

                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                                Icon(Icons.Default.CalendarToday, contentDescription = null, modifier = Modifier.size(14.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant)
                                Text("Received Date (CN):", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                            Text(
                                text = device.shipmentReceiveDateCn ?: "Pending",
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.primary
                            )
                        }

                        // If already in stock, show Received Date (BD) here
                        if (isAlreadyInStock && !device.receivedDateBd.isNullOrBlank()) {
                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                                    Icon(Icons.Default.EventAvailable, contentDescription = null, modifier = Modifier.size(14.dp), tint = Color(0xFF16A34A))
                                    Text("Received Date (BD):", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                }
                                Text(
                                    text = device.receivedDateBd,
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Color(0xFF16A34A)
                                )
                            }
                        }

                        if (!device.shipmentTracking.isNullOrBlank()) {
                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                Text("Tracking Batch:", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                Text(
                                    text = "#${device.shipmentTracking}",
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Medium,
                                    color = MaterialTheme.colorScheme.onSurface
                                )
                            }
                        }
                    }
                }

                // Remarks / Notes section when not in editing mode (only shown if notes exist)
                if (!isEditing && !device.notes.isNullOrBlank()) {
                    Text(
                        text = "REMARKS / NOTES",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.primary,
                        letterSpacing = 0.5.sp
                    )

                    Card(
                        colors = CardDefaults.cardColors(
                            containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.4f)
                        ),
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column(
                            modifier = Modifier.padding(12.dp),
                            verticalArrangement = Arrangement.spacedBy(4.dp)
                        ) {
                            Text(
                                text = device.notes ?: "",
                                fontSize = 12.sp,
                                color = MaterialTheme.colorScheme.onSurface
                            )
                        }
                    }
                }

                // Check-In Stock & Battery Updates (Only in editing mode)
                if (isEditing) {
                    HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.4f))

                    Text(
                        text = "RECEIVE & UPDATE STATUS",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.primary,
                        letterSpacing = 0.5.sp
                    )

                    // Status Dropdown
                    Box(modifier = Modifier.fillMaxWidth()) {
                        OutlinedTextField(
                            value = statusOptions.find { it.first == currentStatus }?.second ?: currentStatus,
                            onValueChange = {},
                            readOnly = true,
                            label = { Text("Inventory Status *") },
                            shape = RoundedCornerShape(10.dp),
                            trailingIcon = {
                                Icon(Icons.Default.ArrowDropDown, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant)
                            },
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedTextColor = MaterialTheme.colorScheme.onSurface,
                                unfocusedTextColor = MaterialTheme.colorScheme.onSurface
                            ),
                            modifier = Modifier.fillMaxWidth()
                        )
                        Box(
                            modifier = Modifier
                                .matchParentSize()
                                .clickable { statusDropdownExpanded = true }
                        )
                        DropdownMenu(
                            expanded = statusDropdownExpanded,
                            onDismissRequest = { statusDropdownExpanded = false },
                            modifier = Modifier.background(MaterialTheme.colorScheme.surface)
                        ) {
                            statusOptions.forEach { (valKey, label) ->
                                DropdownMenuItem(
                                    text = { Text(label, fontWeight = if (valKey == currentStatus) FontWeight.Bold else FontWeight.Normal) },
                                    onClick = {
                                        currentStatus = valKey
                                        statusDropdownExpanded = false
                                    }
                                )
                            }
                        }
                    }

                    // Assigned to Dropdown
                    Box(modifier = Modifier.fillMaxWidth()) {
                        OutlinedTextField(
                            value = if (selectedOwnerId == null) "-- Unassigned --" else selectedOwnerName,
                            onValueChange = {},
                            readOnly = true,
                            label = { Text("Assigned to") },
                            shape = RoundedCornerShape(10.dp),
                            trailingIcon = {
                                Icon(Icons.Default.ArrowDropDown, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant)
                            },
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedTextColor = MaterialTheme.colorScheme.onSurface,
                                unfocusedTextColor = MaterialTheme.colorScheme.onSurface
                            ),
                            modifier = Modifier.fillMaxWidth()
                        )
                        Box(
                            modifier = Modifier
                                .matchParentSize()
                                .clickable { ownerDropdownExpanded = true }
                        )
                        DropdownMenu(
                            expanded = ownerDropdownExpanded,
                            onDismissRequest = { ownerDropdownExpanded = false },
                            modifier = Modifier.background(MaterialTheme.colorScheme.surface)
                        ) {
                            DropdownMenuItem(
                                text = {
                                    Text(
                                        text = "-- Unassigned (None) --",
                                        color = Color(0xFFDC2626),
                                        fontWeight = if (selectedOwnerId == null) FontWeight.Bold else FontWeight.Normal
                                    )
                                },
                                onClick = {
                                    selectedOwnerId = null
                                    selectedOwnerName = "Unassigned"
                                    ownerDropdownExpanded = false
                                }
                            )

                            HorizontalDivider()

                            val availableUsers = (if (users.isNotEmpty()) {
                                users
                            } else {
                                listOf(
                                    UserDto(id = 1, username = "jubaer", role = "ADMIN"),
                                    UserDto(id = 2, username = "ochi", role = "EMPLOYEE"),
                                    UserDto(id = 3, username = "ashraf", role = "EMPLOYEE"),
                                    UserDto(id = 4, username = "emon", role = "EMPLOYEE")
                                )
                            }).filter { !it.username.equals("admin", ignoreCase = true) }

                            availableUsers.forEach { user ->
                                DropdownMenuItem(
                                    text = {
                                        Row(
                                            modifier = Modifier.fillMaxWidth(),
                                            horizontalArrangement = Arrangement.SpaceBetween,
                                            verticalAlignment = Alignment.CenterVertically
                                        ) {
                                            Text(
                                                text = user.username,
                                                color = if (user.id == selectedOwnerId) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurface,
                                                fontWeight = if (user.id == selectedOwnerId) FontWeight.Bold else FontWeight.Medium
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
                                        selectedOwnerId = user.id
                                        selectedOwnerName = user.username
                                        ownerDropdownExpanded = false
                                    }
                                )
                            }
                        }
                    }

                    // Battery Health & Cycle Count
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        OutlinedTextField(
                            value = batteryHealth,
                            onValueChange = { batteryHealth = it },
                            label = { Text("Battery %") },
                            placeholder = { Text("e.g. 100") },
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                            singleLine = true,
                            shape = RoundedCornerShape(10.dp),
                            modifier = Modifier.weight(1f),
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedTextColor = MaterialTheme.colorScheme.onSurface,
                                unfocusedTextColor = MaterialTheme.colorScheme.onSurface
                            )
                        )

                        OutlinedTextField(
                            value = batteryCycle,
                            onValueChange = { batteryCycle = it },
                            label = { Text("Cycle Count (CC)") },
                            placeholder = { Text("250") },
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                            singleLine = true,
                            shape = RoundedCornerShape(10.dp),
                            modifier = Modifier.weight(1f),
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedTextColor = MaterialTheme.colorScheme.onSurface,
                                unfocusedTextColor = MaterialTheme.colorScheme.onSurface
                            )
                        )
                    }

                    // Received Date BD (Only show editable input if device is not already in stock)
                    if (!isAlreadyInStock) {
                        OutlinedTextField(
                            value = receivedDateBd,
                            onValueChange = { receivedDateBd = it },
                            label = { Text("Received Date (BD)") },
                            placeholder = { Text("YYYY-MM-DD") },
                            singleLine = true,
                            shape = RoundedCornerShape(10.dp),
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedTextColor = MaterialTheme.colorScheme.onSurface,
                                unfocusedTextColor = MaterialTheme.colorScheme.onSurface
                            ),
                            modifier = Modifier.fillMaxWidth()
                        )
                    }

                    // Notes
                    OutlinedTextField(
                        value = notes,
                        onValueChange = { notes = it },
                        label = { Text("Remarks / Condition Notes") },
                        maxLines = 2,
                        shape = RoundedCornerShape(10.dp),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedTextColor = MaterialTheme.colorScheme.onSurface,
                            unfocusedTextColor = MaterialTheme.colorScheme.onSurface
                        ),
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            }
        },
        confirmButton = {
            if (isEditing) {
                Button(
                    onClick = {
                        val updates = mutableMapOf<String, Any?>()
                        updates["current_status"] = currentStatus
                        updates["received_date_bd"] = receivedDateBd.ifBlank { null }
                        if (batteryHealth.isNotBlank()) {
                            updates["battery_health"] = batteryHealth.toIntOrNull()
                        } else {
                            updates["battery_health"] = null
                        }
                        if (batteryCycle.isNotBlank()) {
                            updates["battery_cycle"] = batteryCycle.toIntOrNull()
                        } else {
                            updates["battery_cycle"] = null
                        }
                        updates["notes"] = notes.trim().ifBlank { null }
                        updates["current_owner"] = selectedOwnerId

                        onSaveCheckIn(updates)
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary),
                    shape = RoundedCornerShape(10.dp),
                    contentPadding = PaddingValues(horizontal = 18.dp, vertical = 10.dp)
                ) {
                    Icon(Icons.Default.Save, contentDescription = null, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(if (isAlreadyInStock) "Save Changes" else "Confirm & In Stock", color = Color.White, fontWeight = FontWeight.Bold)
                }
            } else {
                Button(
                    onClick = onDismiss,
                    colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary),
                    shape = RoundedCornerShape(10.dp),
                    contentPadding = PaddingValues(horizontal = 20.dp, vertical = 10.dp)
                ) {
                    Text("Done", color = Color.White, fontWeight = FontWeight.Bold)
                }
            }
        },
        dismissButton = {
            if (isAlreadyInStock && !isEditing) {
                OutlinedButton(
                    onClick = { isEditing = true },
                    shape = RoundedCornerShape(10.dp),
                    contentPadding = PaddingValues(horizontal = 14.dp, vertical = 10.dp)
                ) {
                    Icon(Icons.Default.Edit, contentDescription = "Edit Info", modifier = Modifier.size(15.dp))
                    Spacer(modifier = Modifier.width(6.dp))
                    Text("Edit Info", fontSize = 13.sp)
                }
            } else {
                TextButton(onClick = {
                    if (isAlreadyInStock && isEditing) {
                        isEditing = false
                    } else {
                        onDismiss()
                    }
                }) {
                    Text("Cancel", color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
        }
    )
}
