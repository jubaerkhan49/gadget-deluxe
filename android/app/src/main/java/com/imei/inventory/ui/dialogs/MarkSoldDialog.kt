package com.imei.inventory.ui.dialogs

import android.widget.Toast
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.Payments
import androidx.compose.material.icons.filled.PhoneAndroid
import androidx.compose.material.icons.filled.PointOfSale
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import com.imei.inventory.data.model.DeviceDto
import com.imei.inventory.ui.components.StatusBadge

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MarkSoldDialog(
    device: DeviceDto,
    onDismiss: () -> Unit,
    onSubmit: (proposedPrice: Double, paymentMethod: String, notes: String?) -> Unit
) {
    val context = LocalContext.current
    var proposedPrice by remember {
        mutableStateOf(
            device.sellingPrice?.let {
                if (it % 1.0 == 0.0) it.toLong().toString() else it.toString()
            } ?: ""
        )
    }
    var paymentMethod by remember { mutableStateOf("CASH") }
    var notes by remember { mutableStateOf("") }
    var isSubmitting by remember { mutableStateOf(false) }
    var paymentDropdownExpanded by remember { mutableStateOf(false) }

    val paymentOptions = listOf(
        "CASH" to "Cash Payment",
        "BANK" to "Bank Transfer",
        "MOBILE" to "Mobile Banking (bKash/Nagad)",
        "CARD" to "Credit / Debit Card"
    )

    Dialog(
        onDismissRequest = { if (!isSubmitting) onDismiss() },
        properties = DialogProperties(usePlatformDefaultWidth = false)
    ) {
        Surface(
            modifier = Modifier
                .fillMaxWidth(0.92f)
                .wrapContentHeight()
                .padding(vertical = 12.dp),
            shape = RoundedCornerShape(20.dp),
            color = MaterialTheme.colorScheme.surface,
            tonalElevation = 6.dp,
            shadowElevation = 12.dp
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .verticalScroll(rememberScrollState())
                    .padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(11.dp)
            ) {
                // Header
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Surface(
                            color = Color(0xFF10B981).copy(alpha = 0.12f),
                            shape = RoundedCornerShape(10.dp),
                            modifier = Modifier.size(36.dp)
                        ) {
                            Box(contentAlignment = Alignment.Center) {
                                Icon(
                                    imageVector = Icons.Default.PointOfSale,
                                    contentDescription = null,
                                    tint = Color(0xFF10B981),
                                    modifier = Modifier.size(19.dp)
                                )
                            }
                        }
                        Spacer(modifier = Modifier.width(10.dp))
                        Column {
                            Text(
                                text = "Mark Device as Sold",
                                fontWeight = FontWeight.Bold,
                                fontSize = 16.sp,
                                color = MaterialTheme.colorScheme.onSurface
                            )
                            Text(
                                text = "Submit sale for Admin confirmation",
                                fontSize = 11.sp,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                    IconButton(
                        onClick = onDismiss,
                        enabled = !isSubmitting,
                        modifier = Modifier.size(30.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.Close,
                            contentDescription = "Close",
                            tint = MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.size(17.dp)
                        )
                    }
                }

                HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.10f))

                // Compact Device Summary Card
                Surface(
                    shape = RoundedCornerShape(12.dp),
                    color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.4f),
                    border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.12f))
                ) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(10.dp),
                        verticalArrangement = Arrangement.spacedBy(5.dp)
                    ) {
                        // Top row: Model + StatusBadge
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                modifier = Modifier.weight(1f, fill = false)
                            ) {
                                Icon(
                                    imageVector = Icons.Default.PhoneAndroid,
                                    contentDescription = null,
                                    tint = MaterialTheme.colorScheme.primary,
                                    modifier = Modifier.size(15.dp)
                                )
                                Spacer(modifier = Modifier.width(5.dp))
                                Text(
                                    text = device.model,
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 14.sp,
                                    color = MaterialTheme.colorScheme.onSurface,
                                    maxLines = 1
                                )
                            }
                            Spacer(modifier = Modifier.width(6.dp))
                            StatusBadge(device.currentStatus, device.statusDisplay)
                        }

                        // IMEI Monospace
                        Text(
                            text = "IMEI: ${device.imei}",
                            fontSize = 11.sp,
                            fontFamily = FontFamily.Monospace,
                            fontWeight = FontWeight.SemiBold,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )

                        // Specs Row: Variant, Storage, Color chips
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(5.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            device.variant?.takeIf { it.isNotBlank() }?.let { v ->
                                SummaryChip(text = v.trim(), color = Color(0xFF8B5CF6))
                            }
                            device.capacity?.takeIf { it.isNotBlank() }?.let { cap ->
                                val cleanCap = cap.replace("gb", "", ignoreCase = true).trim() + "GB"
                                SummaryChip(text = cleanCap, color = MaterialTheme.colorScheme.primary)
                            }
                            device.color?.takeIf { it.isNotBlank() }?.let { col ->
                                val firstColorWord = col.trim().split(Regex("[ /,-]")).firstOrNull { it.isNotBlank() } ?: col.trim()
                                SummaryChip(text = firstColorWord, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                        }
                    }
                }

                // Info Alert Banner
                Surface(
                    shape = RoundedCornerShape(10.dp),
                    color = Color(0xFF3B82F6).copy(alpha = 0.08f),
                    border = BorderStroke(1.dp, Color(0xFF3B82F6).copy(alpha = 0.2f))
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(8.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            imageVector = Icons.Default.Info,
                            contentDescription = null,
                            tint = Color(0xFF2563EB),
                            modifier = Modifier.size(16.dp)
                        )
                        Spacer(modifier = Modifier.width(7.dp))
                        Text(
                            text = "Status will change to Pending Sale until Admin approves.",
                            fontSize = 10.5.sp,
                            lineHeight = 14.sp,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                    }
                }

                // Form Fields
                Column(verticalArrangement = Arrangement.spacedBy(9.dp)) {
                    // Proposed Price
                    OutlinedTextField(
                        value = proposedPrice,
                        onValueChange = { proposedPrice = it },
                        label = { Text("Selling Amount (BDT) *", fontSize = 12.sp) },
                        placeholder = { Text("e.g. 115000", fontSize = 12.sp) },
                        leadingIcon = {
                            Text(
                                text = "BDT",
                                fontWeight = FontWeight.Bold,
                                fontSize = 11.sp,
                                color = Color(0xFF10B981),
                                modifier = Modifier.padding(start = 6.dp)
                            )
                        },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        singleLine = true,
                        shape = RoundedCornerShape(10.dp),
                        modifier = Modifier.fillMaxWidth()
                    )

                    // Payment Method Dropdown
                    ExposedDropdownMenuBox(
                        expanded = paymentDropdownExpanded,
                        onExpandedChange = { paymentDropdownExpanded = it }
                    ) {
                        OutlinedTextField(
                            value = paymentOptions.find { it.first == paymentMethod }?.second ?: "Cash Payment",
                            onValueChange = {},
                            readOnly = true,
                            label = { Text("Payment Method", fontSize = 12.sp) },
                            trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = paymentDropdownExpanded) },
                            shape = RoundedCornerShape(10.dp),
                            modifier = Modifier
                                .menuAnchor()
                                .fillMaxWidth()
                        )
                        ExposedDropdownMenu(
                            expanded = paymentDropdownExpanded,
                            onDismissRequest = { paymentDropdownExpanded = false }
                        ) {
                            paymentOptions.forEach { (code, label) ->
                                DropdownMenuItem(
                                    text = { Text(label, fontSize = 12.5.sp) },
                                    onClick = {
                                        paymentMethod = code
                                        paymentDropdownExpanded = false
                                    }
                                )
                            }
                        }
                    }

                    // Sale Notes
                    OutlinedTextField(
                        value = notes,
                        onValueChange = { notes = it },
                        label = { Text("Sale Notes (Optional)", fontSize = 12.sp) },
                        placeholder = { Text("Remarks, customer request, etc.", fontSize = 12.sp) },
                        maxLines = 2,
                        shape = RoundedCornerShape(10.dp),
                        modifier = Modifier.fillMaxWidth()
                    )
                }

                Spacer(modifier = Modifier.height(2.dp))

                // Actions
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    OutlinedButton(
                        onClick = onDismiss,
                        enabled = !isSubmitting,
                        shape = RoundedCornerShape(10.dp),
                        contentPadding = PaddingValues(horizontal = 12.dp, vertical = 8.dp),
                        modifier = Modifier
                            .weight(1f)
                            .height(42.dp)
                    ) {
                        Text("Cancel", fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
                    }

                    Button(
                        onClick = {
                            val priceVal = proposedPrice.toDoubleOrNull()
                            if (priceVal == null || priceVal <= 0.0) {
                                Toast.makeText(context, "Please enter a valid Selling Amount", Toast.LENGTH_SHORT).show()
                                return@Button
                            }
                            isSubmitting = true
                            onSubmit(priceVal, paymentMethod, notes.trim().ifEmpty { null })
                        },
                        enabled = !isSubmitting,
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF10B981)),
                        shape = RoundedCornerShape(10.dp),
                        contentPadding = PaddingValues(horizontal = 10.dp, vertical = 8.dp),
                        modifier = Modifier
                            .weight(1.4f)
                            .height(42.dp)
                    ) {
                        if (isSubmitting) {
                            CircularProgressIndicator(
                                color = Color.White,
                                strokeWidth = 2.dp,
                                modifier = Modifier.size(16.dp)
                            )
                        } else {
                            Icon(
                                imageVector = Icons.Default.Payments,
                                contentDescription = null,
                                tint = Color.White,
                                modifier = Modifier.size(15.dp)
                            )
                            Spacer(modifier = Modifier.width(4.dp))
                            Text(
                                text = "Submit Request",
                                fontWeight = FontWeight.Bold,
                                fontSize = 12.sp,
                                maxLines = 1,
                                softWrap = false
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun SummaryChip(
    text: String,
    color: Color
) {
    Surface(
        color = color.copy(alpha = 0.09f),
        shape = RoundedCornerShape(5.dp),
        border = BorderStroke(0.6.dp, color.copy(alpha = 0.2f))
    ) {
        Text(
            text = text,
            fontSize = 10.sp,
            fontWeight = FontWeight.SemiBold,
            color = color,
            modifier = Modifier.padding(horizontal = 5.dp, vertical = 1.5.dp),
            maxLines = 1,
            softWrap = false
        )
    }
}
