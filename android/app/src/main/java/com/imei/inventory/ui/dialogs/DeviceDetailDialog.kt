package com.imei.inventory.ui.dialogs

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
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
import com.imei.inventory.ui.components.StatusBadge
import com.imei.inventory.ui.components.VariantBadge

@Composable
fun DeviceDetailDialog(
    device: DeviceDto,
    onDismiss: () -> Unit,
    onStatusChange: (String) -> Unit,
    onDelete: () -> Unit
) {
    var showDeleteConfirm by remember { mutableStateOf(false) }

    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = Color(0xFF1E293B),
        title = {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = device.model,
                    color = Color.White,
                    fontWeight = FontWeight.Bold,
                    fontSize = 20.sp
                )
                VariantBadge(device.variant)
            }
        },
        text = {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(14.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text("Current Status:", color = Color(0xFF94A3B8), fontSize = 13.sp)
                    StatusBadge(device.currentStatus, device.statusDisplay)
                }

                HorizontalDivider(color = Color(0xFF334155))

                // Identifiers
                CopyableText(label = "Primary IMEI", value = device.imei)
                device.imei2?.let { CopyableText(label = "IMEI 2", value = it) }
                device.serialNumber?.let { CopyableText(label = "Serial Number", value = it) }
                device.meid?.let { CopyableText(label = "MEID", value = it) }

                HorizontalDivider(color = Color(0xFF334155))

                // Specs
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text("Storage Capacity:", color = Color(0xFF94A3B8), fontSize = 13.sp)
                    Text(device.capacity ?: "N/A", color = Color(0xFF818CF8), fontWeight = FontWeight.SemiBold)
                }
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text("Color:", color = Color(0xFF94A3B8), fontSize = 13.sp)
                    Text(device.color ?: "N/A", color = Color.White)
                }
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text("Battery Health:", color = Color(0xFF94A3B8), fontSize = 13.sp)
                    Text(
                        if (device.batteryHealth != null) "${device.batteryHealth}%" else "N/A",
                        color = Color(0xFF4ADE80),
                        fontWeight = FontWeight.Bold
                    )
                }
                device.buyingPrice?.let { price ->
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text("Buying Price:", color = Color(0xFF94A3B8), fontSize = 13.sp)
                        Text("BDT $price", color = Color(0xFFFBBF24), fontWeight = FontWeight.SemiBold)
                    }
                }
                device.currentOwnerName?.let { owner ->
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text("Assigned Owner:", color = Color(0xFF94A3B8), fontSize = 13.sp)
                        Text(owner, color = Color(0xFF38BDF8), fontWeight = FontWeight.SemiBold)
                    }
                }

                HorizontalDivider(color = Color(0xFF334155))

                // Quick Status Changer
                Text("Change Device Status:", color = Color(0xFF94A3B8), fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    Button(
                        onClick = { onStatusChange("IN_STOCK") },
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0x3322C55E)),
                        modifier = Modifier.weight(1f),
                        contentPadding = PaddingValues(horizontal = 4.dp, vertical = 6.dp)
                    ) {
                        Text("In Stock", color = Color(0xFF4ADE80), fontSize = 11.sp, fontWeight = FontWeight.Bold)
                    }
                    Button(
                        onClick = { onStatusChange("UNDER_REPAIR") },
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0x33EAB308)),
                        modifier = Modifier.weight(1f),
                        contentPadding = PaddingValues(horizontal = 4.dp, vertical = 6.dp)
                    ) {
                        Text("Repair", color = Color(0xFFFDE047), fontSize = 11.sp, fontWeight = FontWeight.Bold)
                    }
                    Button(
                        onClick = { onStatusChange("SOLD") },
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0x333B82F6)),
                        modifier = Modifier.weight(1f),
                        contentPadding = PaddingValues(horizontal = 4.dp, vertical = 6.dp)
                    ) {
                        Text("Sold", color = Color(0xFF60A5FA), fontSize = 11.sp, fontWeight = FontWeight.Bold)
                    }
                }
            }
        },
        confirmButton = {
            Button(
                onClick = onDismiss,
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF334155))
            ) {
                Text("Close", color = Color.White)
            }
        },
        dismissButton = {
            TextButton(onClick = { showDeleteConfirm = true }) {
                Text("Delete Device", color = Color(0xFFF87171))
            }
        }
    )

    if (showDeleteConfirm) {
        AlertDialog(
            onDismissRequest = { showDeleteConfirm = false },
            containerColor = Color(0xFF1E293B),
            title = { Text("Delete Device?", color = Color.White, fontWeight = FontWeight.Bold) },
            text = { Text("Are you sure you want to delete ${device.model} (${device.imei})? This cannot be undone.", color = Color(0xFFCBD5E1)) },
            confirmButton = {
                Button(
                    onClick = {
                        showDeleteConfirm = false
                        onDelete()
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFDC2626))
                ) {
                    Text("Yes, Delete", color = Color.White)
                }
            },
            dismissButton = {
                TextButton(onClick = { showDeleteConfirm = false }) {
                    Text("Cancel", color = Color.White)
                }
            }
        )
    }
}
