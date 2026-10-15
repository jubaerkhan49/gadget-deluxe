package com.imei.inventory.ui.screens

import android.app.DatePickerDialog
import android.widget.Toast
import androidx.activity.compose.BackHandler
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.expandVertically
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.shrinkVertically
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.imei.inventory.data.model.DeviceDto
import com.imei.inventory.data.model.ShipmentDto
import com.imei.inventory.ui.components.CopyableText
import com.imei.inventory.ui.components.ExpressiveSearchBar
import com.imei.inventory.ui.components.StatusBadge
import com.imei.inventory.ui.components.VariantBadge
import com.imei.inventory.ui.components.formatDateToDDMMYYYY
import com.imei.inventory.ui.theme.*
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ShipmentDetailScreen(
    shipment: ShipmentDto,
    devicesInShipment: List<DeviceDto>,
    onBack: () -> Unit,
    onUpdateDeviceStatus: (deviceId: Int, newStatus: String, receiveDate: String?) -> Unit,
    onReceiveAllToInStock: (receiveDate: String?) -> Unit,
    onEditShipment: ((ShipmentDto) -> Unit)? = null,
    onDeleteShipment: ((ShipmentDto) -> Unit)? = null
) {
    val context = LocalContext.current
    val clipboardManager = LocalClipboardManager.current
    var searchQuery by remember { mutableStateOf("") }
    var statusFilter by remember { mutableStateOf("ALL") } // "ALL" | "IN_STOCK" | "PENDING"
    var showDeleteConfirm by remember { mutableStateOf(false) }
    var showReceiveAllDateSection by remember { mutableStateOf(false) }

    var receiveAllDate by remember {
        val sdf = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())
        mutableStateOf(shipment.receiveDate?.take(10) ?: sdf.format(Date()))
    }

    // Intercept back button to return to Shipments list
    BackHandler(onBack = onBack)

    val totalCount = if (devicesInShipment.isNotEmpty()) devicesInShipment.size else shipment.devicesCount
    val inStockCount = devicesInShipment.count { it.currentStatus == "IN_STOCK" }
    val pendingCount = totalCount - inStockCount
    val progress = if (totalCount > 0) inStockCount.toFloat() / totalCount else 0f

    // Filter devices in shipment
    val filteredDevices = remember(devicesInShipment, searchQuery, statusFilter) {
        devicesInShipment.filter { dev ->
            val matchesSearch = searchQuery.isBlank() ||
                dev.model.contains(searchQuery, ignoreCase = true) ||
                dev.imei.contains(searchQuery, ignoreCase = true) ||
                (dev.color?.contains(searchQuery, ignoreCase = true) == true) ||
                (dev.capacity?.contains(searchQuery, ignoreCase = true) == true)

            val matchesFilter = when (statusFilter) {
                "IN_STOCK" -> dev.currentStatus == "IN_STOCK"
                "PENDING" -> dev.currentStatus != "IN_STOCK"
                else -> true
            }
            matchesSearch && matchesFilter
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = "Back",
                            tint = MaterialTheme.colorScheme.onSurface
                        )
                    }
                },
                title = {
                    Column {
                        Text(
                            text = shipment.shippingCompany ?: (shipment.supplierName ?: "Shipment Batch"),
                            fontWeight = FontWeight.ExtraBold,
                            fontSize = 16.5.sp,
                            color = MaterialTheme.colorScheme.onSurface,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier.clickable {
                                clipboardManager.setText(AnnotatedString(shipment.trackingNumber))
                                Toast.makeText(context, "Copied tracking: ${shipment.trackingNumber}", Toast.LENGTH_SHORT).show()
                            }
                        ) {
                            Text(
                                text = "Tracking: #${shipment.trackingNumber}",
                                fontSize = 11.5.sp,
                                color = MaterialTheme.colorScheme.primary,
                                fontWeight = FontWeight.SemiBold
                            )
                            Spacer(modifier = Modifier.width(4.dp))
                            Icon(
                                imageVector = Icons.Default.ContentCopy,
                                contentDescription = "Copy",
                                tint = MaterialTheme.colorScheme.primary,
                                modifier = Modifier.size(11.dp)
                            )
                        }
                    }
                },
                actions = {
                    if (onEditShipment != null) {
                        IconButton(onClick = { onEditShipment(shipment) }) {
                            Icon(
                                imageVector = Icons.Default.Edit,
                                contentDescription = "Edit Shipment",
                                tint = MaterialTheme.colorScheme.primary,
                                modifier = Modifier.size(20.dp)
                            )
                        }
                    }
                    if (onDeleteShipment != null) {
                        IconButton(onClick = { showDeleteConfirm = true }) {
                            Icon(
                                imageVector = Icons.Default.Delete,
                                contentDescription = "Delete Shipment",
                                tint = MaterialTheme.colorScheme.error,
                                modifier = Modifier.size(20.dp)
                            )
                        }
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface,
                    titleContentColor = MaterialTheme.colorScheme.onSurface
                )
            )
        },
        containerColor = MaterialTheme.colorScheme.background
    ) { paddingValues ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .padding(horizontal = 14.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp),
            contentPadding = PaddingValues(top = 8.dp, bottom = 40.dp)
        ) {
            // 1. Batch Hero Details Card
            item {
                Card(
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                    shape = RoundedCornerShape(14.dp),
                    border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f)),
                    elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
                ) {
                    Column(
                        modifier = Modifier.padding(14.dp),
                        verticalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        // Header Row: Supplier & Progress Status Pill
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Box(
                                    modifier = Modifier
                                        .size(36.dp)
                                        .background(MaterialTheme.colorScheme.primary.copy(alpha = 0.12f), RoundedCornerShape(10.dp)),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.LocalShipping,
                                        contentDescription = null,
                                        tint = MaterialTheme.colorScheme.primary,
                                        modifier = Modifier.size(20.dp)
                                    )
                                }
                                Spacer(modifier = Modifier.width(10.dp))
                                Column {
                                    Text(
                                        text = shipment.supplierName ?: "Supplier Order",
                                        fontWeight = FontWeight.ExtraBold,
                                        fontSize = 15.sp,
                                        color = MaterialTheme.colorScheme.onSurface
                                    )
                                    Text(
                                        text = "Agent: ${shipment.shippingCompany ?: "Standard Freight"}",
                                        fontSize = 12.sp,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                }
                            }

                            Surface(
                                color = if (inStockCount == totalCount && totalCount > 0) AccentEmerald.copy(alpha = 0.14f) else AccentAmber.copy(alpha = 0.14f),
                                shape = RoundedCornerShape(percent = 50),
                                border = BorderStroke(
                                    1.dp,
                                    if (inStockCount == totalCount && totalCount > 0) AccentEmerald.copy(alpha = 0.35f) else AccentAmber.copy(alpha = 0.35f)
                                )
                            ) {
                                Text(
                                    text = if (inStockCount == totalCount && totalCount > 0) "All In Stock" else "$inStockCount/$totalCount In Stock",
                                    color = if (inStockCount == totalCount && totalCount > 0) AccentEmerald else AccentAmber,
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 11.5.sp,
                                    modifier = Modifier.padding(horizontal = 9.dp, vertical = 3.dp)
                                )
                            }
                        }

                        // Progress Bar & Stats
                        Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Text(
                                    text = "$inStockCount Delivered to BD (${(progress * 100).toInt()}%)",
                                    fontSize = 11.5.sp,
                                    fontWeight = FontWeight.SemiBold,
                                    color = AccentEmerald
                                )
                                Text(
                                    text = "$pendingCount In Transit",
                                    fontSize = 11.5.sp,
                                    fontWeight = FontWeight.SemiBold,
                                    color = if (pendingCount > 0) AccentAmber else MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                            LinearProgressIndicator(
                                progress = { progress },
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(6.dp),
                                color = AccentEmerald,
                                trackColor = MaterialTheme.colorScheme.surfaceContainerHighest
                            )
                        }

                        // Logistics Details Grid
                        Surface(
                            shape = RoundedCornerShape(10.dp),
                            color = MaterialTheme.colorScheme.surfaceContainerLow,
                            border = BorderStroke(0.6.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.35f))
                        ) {
                            Column(
                                modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                                verticalArrangement = Arrangement.spacedBy(4.dp)
                            ) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween
                                ) {
                                    Text("CN Receive Date:", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 11.5.sp)
                                    Text(
                                        text = formatDateToDDMMYYYY(shipment.receiveDate, "Pending"),
                                        color = AccentEmerald,
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 11.5.sp
                                    )
                                }
                                shipment.createdAt?.let { date ->
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween
                                    ) {
                                        Text("Registered in ERP:", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 11.5.sp)
                                        Text(
                                            text = formatDateToDDMMYYYY(date),
                                            color = MaterialTheme.colorScheme.onSurface,
                                            fontWeight = FontWeight.Medium,
                                            fontSize = 11.5.sp
                                        )
                                    }
                                }
                            }
                        }

                        // Receive All Action Button
                        AnimatedVisibility(
                            visible = !showReceiveAllDateSection,
                            enter = fadeIn() + expandVertically(),
                            exit = fadeOut() + shrinkVertically()
                        ) {
                            Button(
                                onClick = { showReceiveAllDateSection = true },
                                colors = ButtonDefaults.buttonColors(containerColor = AccentEmerald),
                                shape = RoundedCornerShape(10.dp),
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(38.dp)
                            ) {
                                Icon(
                                    imageVector = Icons.Default.CheckCircle,
                                    contentDescription = null,
                                    tint = Color.White,
                                    modifier = Modifier.size(16.dp)
                                )
                                Spacer(modifier = Modifier.width(6.dp))
                                Text(
                                    text = "Receive All Devices into Stock (BD)",
                                    fontSize = 12.5.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Color.White
                                )
                            }
                        }

                        // Expandable Receive All Date Selector
                        AnimatedVisibility(
                            visible = showReceiveAllDateSection,
                            enter = fadeIn() + expandVertically(),
                            exit = fadeOut() + shrinkVertically()
                        ) {
                            Surface(
                                color = AccentEmerald.copy(alpha = 0.09f),
                                shape = RoundedCornerShape(10.dp),
                                border = BorderStroke(1.dp, AccentEmerald.copy(alpha = 0.35f)),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Column(
                                    modifier = Modifier.padding(10.dp),
                                    verticalArrangement = Arrangement.spacedBy(6.dp)
                                ) {
                                    Text(
                                        text = "Select BD In-Stock Arrival Date:",
                                        color = MaterialTheme.colorScheme.onSurface,
                                        fontSize = 11.5.sp,
                                        fontWeight = FontWeight.Bold
                                    )
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.spacedBy(8.dp),
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
                                            shape = RoundedCornerShape(8.dp),
                                            contentPadding = PaddingValues(horizontal = 10.dp, vertical = 0.dp),
                                            modifier = Modifier.weight(1f).height(34.dp)
                                        ) {
                                            Text(
                                                text = "📅 $receiveAllDate",
                                                fontSize = 12.sp,
                                                fontWeight = FontWeight.SemiBold,
                                                color = MaterialTheme.colorScheme.onSurface
                                            )
                                        }

                                        Button(
                                            onClick = {
                                                showReceiveAllDateSection = false
                                                onReceiveAllToInStock(receiveAllDate)
                                            },
                                            colors = ButtonDefaults.buttonColors(containerColor = AccentEmerald),
                                            shape = RoundedCornerShape(8.dp),
                                            contentPadding = PaddingValues(horizontal = 14.dp, vertical = 0.dp),
                                            modifier = Modifier.height(34.dp)
                                        ) {
                                            Text("Confirm All", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 12.sp)
                                        }

                                        IconButton(
                                            onClick = { showReceiveAllDateSection = false },
                                            modifier = Modifier.size(32.dp)
                                        ) {
                                            Icon(
                                                imageVector = Icons.Default.Close,
                                                contentDescription = "Cancel",
                                                tint = MaterialTheme.colorScheme.onSurfaceVariant,
                                                modifier = Modifier.size(16.dp)
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }

            // 2. Search & Filter Bar
            item {
                Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    ExpressiveSearchBar(
                        query = searchQuery,
                        onQueryChange = { searchQuery = it },
                        placeholder = "Search ${devicesInShipment.size} devices by model, IMEI, specs..."
                    )

                    // Filter Chips Row
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        FilterChip(
                            selected = statusFilter == "ALL",
                            onClick = { statusFilter = "ALL" },
                            label = { Text("All (${devicesInShipment.size})", fontSize = 11.5.sp) },
                            shape = RoundedCornerShape(percent = 50),
                            modifier = Modifier.height(28.dp)
                        )
                        FilterChip(
                            selected = statusFilter == "PENDING",
                            onClick = { statusFilter = if (statusFilter == "PENDING") "ALL" else "PENDING" },
                            label = { Text("In Transit ($pendingCount)", fontSize = 11.5.sp) },
                            shape = RoundedCornerShape(percent = 50),
                            modifier = Modifier.height(28.dp),
                            colors = FilterChipDefaults.filterChipColors(
                                selectedContainerColor = AccentAmber,
                                selectedLabelColor = Color.White
                            )
                        )
                        FilterChip(
                            selected = statusFilter == "IN_STOCK",
                            onClick = { statusFilter = if (statusFilter == "IN_STOCK") "ALL" else "IN_STOCK" },
                            label = { Text("In Stock ($inStockCount)", fontSize = 11.5.sp) },
                            shape = RoundedCornerShape(percent = 50),
                            modifier = Modifier.height(28.dp),
                            colors = FilterChipDefaults.filterChipColors(
                                selectedContainerColor = AccentEmerald,
                                selectedLabelColor = Color.White
                            )
                        )
                    }
                }
            }

            // 3. Section Title
            item {
                Text(
                    text = "Devices in Batch (${filteredDevices.size} of $totalCount)",
                    color = MaterialTheme.colorScheme.onBackground,
                    fontWeight = FontWeight.Bold,
                    fontSize = 14.sp
                )
            }

            // 4. Device Items List
            if (filteredDevices.isEmpty()) {
                item {
                    Surface(
                        shape = RoundedCornerShape(12.dp),
                        color = MaterialTheme.colorScheme.surfaceContainerLow,
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 12.dp)
                    ) {
                        Column(
                            modifier = Modifier.padding(24.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Icon(
                                imageVector = Icons.Default.SearchOff,
                                contentDescription = null,
                                tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.5f),
                                modifier = Modifier.size(36.dp)
                            )
                            Spacer(modifier = Modifier.height(8.dp))
                            Text(
                                text = "No devices match your search or filter",
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                fontSize = 13.sp,
                                fontWeight = FontWeight.Medium
                            )
                        }
                    }
                }
            } else {
                items(filteredDevices, key = { it.id }) { dev ->
                    ShipmentPageDeviceCard(
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

    // Delete Confirmation Dialog
    if (showDeleteConfirm) {
        AlertDialog(
            onDismissRequest = { showDeleteConfirm = false },
            title = { Text("Delete Shipment?", fontWeight = FontWeight.Bold, fontSize = 16.sp) },
            text = { Text("Are you sure you want to delete shipment #${shipment.trackingNumber}? Any linked devices will be detached from this shipment.", fontSize = 13.sp) },
            confirmButton = {
                Button(
                    onClick = {
                        showDeleteConfirm = false
                        onDeleteShipment?.invoke(shipment)
                        onBack()
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error),
                    shape = RoundedCornerShape(percent = 50),
                    modifier = Modifier.height(34.dp),
                    contentPadding = PaddingValues(horizontal = 16.dp, vertical = 0.dp)
                ) {
                    Text("Delete", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 12.sp)
                }
            },
            dismissButton = {
                TextButton(
                    onClick = { showDeleteConfirm = false },
                    modifier = Modifier.height(34.dp)
                ) {
                    Text("Cancel", fontSize = 12.sp)
                }
            }
        )
    }
}

/**
 * Dedicated Full-Page Shipment Device Card with Smooth Animations
 */
@Composable
fun ShipmentPageDeviceCard(
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
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        shape = RoundedCornerShape(12.dp),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.45f)),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.5.dp),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 9.dp),
            verticalArrangement = Arrangement.spacedBy(5.dp)
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
                        fontSize = 14.sp,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                    val specs = listOfNotNull(device.capacity, device.color).filter { it.isNotBlank() }
                    if (specs.isNotEmpty()) {
                        Text(
                            text = " • " + specs.joinToString(" • "),
                            fontSize = 11.5.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                }

                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    VariantBadge(device.variant)
                    StatusBadge(device.currentStatus, device.statusDisplay)
                }
            }

            // Row 2: Copyable IMEI (Left) | BD Date & Quick Actions (Right)
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                CopyableText(label = "IMEI", value = device.imei)

                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    if (!device.receivedDateBd.isNullOrBlank()) {
                        Surface(
                            color = AccentEmerald.copy(alpha = 0.12f),
                            shape = RoundedCornerShape(percent = 50)
                        ) {
                            Text(
                                text = "BD: ${formatDateToDDMMYYYY(device.receivedDateBd)}",
                                color = AccentEmerald,
                                fontSize = 10.5.sp,
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                            )
                        }
                    }

                    Box {
                        Surface(
                            onClick = { expandedMenu = true },
                            shape = RoundedCornerShape(percent = 50),
                            color = MaterialTheme.colorScheme.surfaceContainerHighest,
                            border = BorderStroke(0.7.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.6f))
                        ) {
                            Row(
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    text = "Change ▾",
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.SemiBold,
                                    color = MaterialTheme.colorScheme.onSurface
                                )
                            }
                        }

                        DropdownMenu(
                            expanded = expandedMenu,
                            onDismissRequest = { expandedMenu = false }
                        ) {
                            DropdownMenuItem(
                                text = { Text("In Stock", fontSize = 12.5.sp, color = AccentEmerald, fontWeight = FontWeight.Bold) },
                                onClick = {
                                    expandedMenu = false
                                    showReceiveDateInput = true
                                }
                            )
                            DropdownMenuItem(
                                text = { Text("Under Repair", fontSize = 12.5.sp, color = AccentAmber) },
                                onClick = {
                                    expandedMenu = false
                                    showReceiveDateInput = false
                                    onStatusChange("UNDER_REPAIR", null)
                                }
                            )
                            DropdownMenuItem(
                                text = { Text("Sold", fontSize = 12.5.sp, color = AccentBlue) },
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

            // Expandable Date Picker with AnimatedVisibility
            AnimatedVisibility(
                visible = showReceiveDateInput,
                enter = fadeIn() + expandVertically(),
                exit = fadeOut() + shrinkVertically()
            ) {
                Surface(
                    color = AccentEmerald.copy(alpha = 0.08f),
                    shape = RoundedCornerShape(8.dp),
                    border = BorderStroke(0.8.dp, AccentEmerald.copy(alpha = 0.35f)),
                    modifier = Modifier.fillMaxWidth().padding(top = 2.dp)
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
                            shape = RoundedCornerShape(6.dp),
                            contentPadding = PaddingValues(horizontal = 8.dp, vertical = 0.dp),
                            modifier = Modifier.weight(1f).height(28.dp)
                        ) {
                            Text("📅 $selectedReceiveDate", fontSize = 11.sp, fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.onSurface)
                        }

                        Button(
                            onClick = {
                                showReceiveDateInput = false
                                onStatusChange("IN_STOCK", selectedReceiveDate)
                            },
                            shape = RoundedCornerShape(6.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = AccentEmerald),
                            contentPadding = PaddingValues(horizontal = 10.dp, vertical = 0.dp),
                            modifier = Modifier.height(28.dp)
                        ) {
                            Text("Confirm", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 11.sp)
                        }

                        IconButton(
                            onClick = { showReceiveDateInput = false },
                            modifier = Modifier.size(24.dp)
                        ) {
                            Icon(Icons.Default.Close, contentDescription = "Cancel", modifier = Modifier.size(13.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }
                }
            }
        }
    }
}
