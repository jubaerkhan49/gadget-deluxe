package com.imei.inventory.ui.screens

import android.widget.Toast
import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Archive
import androidx.compose.material.icons.filled.Clear
import androidx.compose.material.icons.filled.ContentCopy
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.LocalShipping
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.imei.inventory.data.model.ShipmentDto
import com.imei.inventory.ui.components.formatDateToDDMMYYYY
import com.imei.inventory.ui.theme.*
import com.imei.inventory.ui.components.CopyableText
import com.imei.inventory.ui.components.ExpressiveSearchBar
import com.imei.inventory.ui.dialogs.EditShipmentDialog
import com.imei.inventory.viewmodel.MainInventoryViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ShipmentsTab(
    token: String,
    viewModel: MainInventoryViewModel,
    onSelectShipment: (ShipmentDto) -> Unit,
    onOpenAddShipment: () -> Unit
) {
    // 0 = Active Shipment, 1 = Archive (Completed Batches)
    var selectedTab by remember { mutableStateOf(0) }
    var searchQuery by remember { mutableStateOf("") }

    val shipments by viewModel.shipments.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()

    var shipmentToEdit by remember { mutableStateOf<ShipmentDto?>(null) }
    var shipmentToDelete by remember { mutableStateOf<ShipmentDto?>(null) }

    LaunchedEffect(Unit) {
        viewModel.fetchShipments(token)
    }

    // Helper: Determine if a shipment batch is complete / archived
    fun isShipmentArchived(s: ShipmentDto): Boolean {
        if (s.devicesCount == 0) return false
        if (s.isArchived) return true
        return (s.pendingDevicesCount == 0 && s.devicesCount > 0) || (s.receivedDevicesCount == s.devicesCount && s.devicesCount > 0)
    }

    val activeCount = remember(shipments) {
        shipments.count { !isShipmentArchived(it) }
    }
    val archiveCount = remember(shipments) {
        shipments.count { isShipmentArchived(it) }
    }

    val filteredShipments = remember(shipments, selectedTab, searchQuery) {
        val tabFiltered = if (selectedTab == 0) {
            shipments.filter { !isShipmentArchived(it) }
        } else {
            shipments.filter { isShipmentArchived(it) }
        }

        if (searchQuery.isBlank()) {
            tabFiltered
        } else {
            tabFiltered.filter { s ->
                s.trackingNumber.contains(searchQuery, ignoreCase = true) ||
                        (s.supplierName?.contains(searchQuery, ignoreCase = true) == true) ||
                        (s.shippingCompany?.contains(searchQuery, ignoreCase = true) == true) ||
                        (s.country?.contains(searchQuery, ignoreCase = true) == true)
            }
        }
    }

    Scaffold(
        floatingActionButton = {
            if (selectedTab == 0) {
                FloatingActionButton(
                    onClick = onOpenAddShipment,
                    containerColor = MaterialTheme.colorScheme.primary,
                    contentColor = Color.White,
                    shape = RoundedCornerShape(20.dp),
                    modifier = Modifier.size(56.dp)
                ) {
                    Text("+", fontSize = 28.sp, fontWeight = FontWeight.Bold)
                }
            }
        },
        containerColor = MaterialTheme.colorScheme.background
    ) { padding ->
        Column(
            modifier = Modifier
                .padding(padding)
                .fillMaxSize()
                .padding(horizontal = 14.dp, vertical = 8.dp)
        ) {
            val activeBgColor by animateColorAsState(
                targetValue = if (selectedTab == 0) MaterialTheme.colorScheme.primary else Color.Transparent,
                animationSpec = tween(220),
                label = "activeBg"
            )
            val activeContentColor by animateColorAsState(
                targetValue = if (selectedTab == 0) Color.White else MaterialTheme.colorScheme.onSurfaceVariant,
                animationSpec = tween(220),
                label = "activeContent"
            )
            val archiveBgColor by animateColorAsState(
                targetValue = if (selectedTab == 1) MaterialTheme.colorScheme.primary else Color.Transparent,
                animationSpec = tween(220),
                label = "archiveBg"
            )
            val archiveContentColor by animateColorAsState(
                targetValue = if (selectedTab == 1) Color.White else MaterialTheme.colorScheme.onSurfaceVariant,
                animationSpec = tween(220),
                label = "archiveContent"
            )

            // Top Segmented Pill Toggle: [ Active Shipment | Archive ] - M3 Expressive
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(44.dp)
                    .clip(RoundedCornerShape(percent = 50))
                    .background(MaterialTheme.colorScheme.surfaceContainer)
                    .padding(3.dp),
                horizontalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                // Active Shipment Tab
                Box(
                    modifier = Modifier
                        .weight(1f)
                        .fillMaxHeight()
                        .clip(RoundedCornerShape(percent = 50))
                        .background(activeBgColor)
                        .clickable { selectedTab = 0 },
                    contentAlignment = Alignment.Center
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.Center
                    ) {
                        Icon(
                            imageVector = Icons.Default.LocalShipping,
                            contentDescription = null,
                            modifier = Modifier.size(16.dp),
                            tint = activeContentColor
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            text = "Active Shipment ($activeCount)",
                            color = activeContentColor,
                            fontSize = 12.sp,
                            fontWeight = if (selectedTab == 0) FontWeight.Bold else FontWeight.Medium
                        )
                    }
                }

                // Archive Tab
                Box(
                    modifier = Modifier
                        .weight(1f)
                        .fillMaxHeight()
                        .clip(RoundedCornerShape(percent = 50))
                        .background(archiveBgColor)
                        .clickable { selectedTab = 1 },
                    contentAlignment = Alignment.Center
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.Center
                    ) {
                        Icon(
                            imageVector = Icons.Default.Archive,
                            contentDescription = null,
                            modifier = Modifier.size(16.dp),
                            tint = archiveContentColor
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            text = "Archive ($archiveCount)",
                            color = archiveContentColor,
                            fontSize = 12.sp,
                            fontWeight = if (selectedTab == 1) FontWeight.Bold else FontWeight.Medium
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(6.dp))

            // Search Bar (M3 Expressive Compact Pill)
            ExpressiveSearchBar(
                query = searchQuery,
                onQueryChange = { searchQuery = it },
                placeholder = if (selectedTab == 0) "Search active batches by tracking, supplier, agent..." else "Search archived batches..."
            )

            Spacer(modifier = Modifier.height(6.dp))

            AnimatedContent(
                targetState = selectedTab,
                transitionSpec = {
                    fadeIn(animationSpec = tween(150, easing = FastOutSlowInEasing))
                        .togetherWith(fadeOut(animationSpec = tween(100, easing = FastOutLinearInEasing)))
                },
                label = "ShipmentListTransition"
            ) { tabIndex ->
                if (isLoading && shipments.isEmpty()) {
                    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator(color = MaterialTheme.colorScheme.primary)
                    }
                } else if (filteredShipments.isEmpty()) {
                    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Icon(
                                imageVector = if (tabIndex == 0) Icons.Default.LocalShipping else Icons.Default.Archive,
                                contentDescription = null,
                                tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.4f),
                                modifier = Modifier.size(48.dp)
                            )
                            Spacer(modifier = Modifier.height(8.dp))
                            Text(
                                text = if (searchQuery.isNotBlank()) "No matching shipments found"
                                else if (tabIndex == 0) "No active shipment batches in transit"
                                else "No archived shipment batches yet",
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                fontSize = 14.sp,
                                fontWeight = FontWeight.Medium
                            )
                            if (tabIndex == 1 && searchQuery.isBlank()) {
                                Text(
                                    text = "Batches with all devices received into stock will appear here",
                                    color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.7f),
                                    fontSize = 12.sp,
                                    modifier = Modifier.padding(top = 4.dp)
                                )
                            }
                        }
                    }
                } else {
                    LazyColumn(
                        verticalArrangement = Arrangement.spacedBy(6.dp),
                        contentPadding = PaddingValues(bottom = 80.dp)
                    ) {
                        items(filteredShipments, key = { it.id }) { shipment ->
                            ShipmentCard(
                                shipment = shipment,
                                isArchived = tabIndex == 1,
                                onClick = { onSelectShipment(shipment) },
                                onEdit = { shipmentToEdit = shipment },
                                onDelete = { shipmentToDelete = shipment }
                            )
                        }
                    }
                }
            }
        }
    }

    // Edit Shipment Dialog
    shipmentToEdit?.let { s ->
        EditShipmentDialog(
            shipment = s,
            onDismiss = { shipmentToEdit = null },
            onSave = { updates ->
                viewModel.updateShipment(
                    token = token,
                    shipmentId = s.id,
                    updates = updates,
                    onSuccess = { shipmentToEdit = null }
                )
            }
        )
    }

    // Delete Confirmation Dialog
    shipmentToDelete?.let { s ->
        AlertDialog(
            onDismissRequest = { shipmentToDelete = null },
            shape = RoundedCornerShape(20.dp),
            containerColor = MaterialTheme.colorScheme.surface,
            title = { Text("Delete Shipment?", fontWeight = FontWeight.Bold, fontSize = 16.sp) },
            text = { Text("Are you sure you want to delete shipment #${s.trackingNumber}? Any linked devices will be detached from this shipment.", fontSize = 13.sp) },
            confirmButton = {
                Button(
                    onClick = {
                        val toDel = s
                        shipmentToDelete = null
                        viewModel.deleteShipment(token, toDel.id)
                    },
                    shape = RoundedCornerShape(percent = 50),
                    modifier = Modifier.height(32.dp),
                    contentPadding = PaddingValues(horizontal = 14.dp, vertical = 2.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error)
                ) {
                    Text("Delete", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 12.sp)
                }
            },
            dismissButton = {
                TextButton(
                    onClick = { shipmentToDelete = null },
                    shape = RoundedCornerShape(percent = 50),
                    modifier = Modifier.height(32.dp),
                    contentPadding = PaddingValues(horizontal = 12.dp, vertical = 2.dp)
                ) {
                    Text("Cancel", fontSize = 12.sp)
                }
            }
        )
    }
}

@Composable
fun ShipmentCard(
    shipment: ShipmentDto,
    isArchived: Boolean = false,
    onClick: () -> Unit,
    onEdit: () -> Unit,
    onDelete: () -> Unit
) {
    val count = shipment.devicesCount
    val pendingCount = shipment.pendingDevicesCount
    val receivedCount = shipment.receivedDevicesCount
    val clipboardManager = LocalClipboardManager.current
    val context = LocalContext.current

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() },
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        shape = RoundedCornerShape(12.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f))
    ) {
        Column(
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
            verticalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            // Header: Supplier Name & Units Pill
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.weight(1f, fill = false).padding(end = 8.dp)
                ) {
                    Box(
                        modifier = Modifier
                            .size(24.dp)
                            .background(MaterialTheme.colorScheme.primary.copy(alpha = 0.10f), RoundedCornerShape(6.dp)),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = Icons.Default.LocalShipping,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.primary,
                            modifier = Modifier.size(14.dp)
                        )
                    }
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = shipment.supplierName ?: "Supplier Order",
                        color = MaterialTheme.colorScheme.onSurface,
                        fontWeight = FontWeight.Bold,
                        fontSize = 14.sp,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }

                // Status / Units Pill
                if (isArchived) {
                    Surface(
                        color = AccentEmerald.copy(alpha = 0.12f),
                        shape = RoundedCornerShape(percent = 50),
                        border = BorderStroke(1.dp, AccentEmerald.copy(alpha = 0.25f))
                    ) {
                        Text(
                            text = "Received ($count)",
                            color = AccentEmerald,
                            fontSize = 10.5.sp,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp)
                        )
                    }
                } else {
                    val isPartiallyReceived = pendingCount > 0 && receivedCount > 0
                    Surface(
                        color = if (isPartiallyReceived) AccentAmber.copy(alpha = 0.12f) else MaterialTheme.colorScheme.surfaceContainerHighest,
                        shape = RoundedCornerShape(percent = 50),
                        border = BorderStroke(
                            1.dp,
                            if (isPartiallyReceived) AccentAmber.copy(alpha = 0.35f) else MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.7f)
                        )
                    ) {
                        Text(
                            text = if (isPartiallyReceived) "$receivedCount/$count in BD" else "$count Units",
                            color = if (isPartiallyReceived) AccentAmber else MaterialTheme.colorScheme.onSurfaceVariant,
                            fontSize = 10.5.sp,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp)
                        )
                    }
                }
            }

            // Middle: Tracking (copyable) & Shipping Agent
            Surface(
                shape = RoundedCornerShape(8.dp),
                color = MaterialTheme.colorScheme.surfaceContainerLow,
                border = BorderStroke(0.5.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.4f)),
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 8.dp, vertical = 4.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    // Tracking Click-to-copy
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier
                            .clickable {
                                clipboardManager.setText(AnnotatedString(shipment.trackingNumber))
                                Toast.makeText(context, "Copied tracking: ${shipment.trackingNumber}", Toast.LENGTH_SHORT).show()
                            }
                    ) {
                        Text(
                            text = "Tracking: ",
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            fontSize = 11.5.sp
                        )
                        Text(
                            text = shipment.trackingNumber,
                            color = MaterialTheme.colorScheme.onSurface,
                            fontSize = 11.5.sp,
                            fontWeight = FontWeight.SemiBold
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Icon(
                            imageVector = Icons.Default.ContentCopy,
                            contentDescription = "Copy",
                            tint = MaterialTheme.colorScheme.primary.copy(alpha = 0.8f),
                            modifier = Modifier.size(11.dp)
                        )
                    }

                    // Agent
                    Text(
                        text = shipment.shippingCompany ?: "Standard Freight",
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        fontSize = 11.5.sp,
                        fontWeight = FontWeight.Medium,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }
            }

            // Bottom: Date (left) + Action Buttons (right)
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                if (!shipment.receiveDate.isNullOrBlank()) {
                    Text(
                        text = "CN: ${formatDateToDDMMYYYY(shipment.receiveDate)}",
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Medium
                    )
                } else {
                    Text(
                        text = "CN: Pending",
                        color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.7f),
                        fontSize = 11.sp
                    )
                }

                Row(
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Surface(
                        onClick = onDelete,
                        shape = CircleShape,
                        color = MaterialTheme.colorScheme.error.copy(alpha = 0.08f),
                        modifier = Modifier.size(26.dp)
                    ) {
                        Box(contentAlignment = Alignment.Center) {
                            Icon(
                                imageVector = Icons.Default.Delete,
                                contentDescription = "Delete",
                                tint = MaterialTheme.colorScheme.error,
                                modifier = Modifier.size(13.dp)
                            )
                        }
                    }

                    FilledTonalButton(
                        onClick = onEdit,
                        shape = RoundedCornerShape(percent = 50),
                        contentPadding = PaddingValues(horizontal = 10.dp, vertical = 0.dp),
                        modifier = Modifier.height(26.dp),
                        colors = ButtonDefaults.filledTonalButtonColors(
                            containerColor = MaterialTheme.colorScheme.surfaceContainerHighest,
                            contentColor = MaterialTheme.colorScheme.onSurface
                        )
                    ) {
                        Text("Edit", fontSize = 11.sp, fontWeight = FontWeight.SemiBold)
                    }

                    Button(
                        onClick = onClick,
                        shape = RoundedCornerShape(percent = 50),
                        contentPadding = PaddingValues(horizontal = 12.dp, vertical = 0.dp),
                        modifier = Modifier.height(26.dp)
                    ) {
                        Text("Details", color = Color.White, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
    }
}
