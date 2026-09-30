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
import androidx.compose.material.icons.filled.*
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
import com.imei.inventory.data.model.DeviceSaleRequestDto
import com.imei.inventory.ui.components.formatIndianNumber

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AdminSaleApprovalDialog(
    saleRequest: DeviceSaleRequestDto,
    onDismiss: () -> Unit,
    onApprove: (requestId: Int, confirmedPrice: Double, commissionAmount: Double, paymentMethod: String, notes: String?) -> Unit,
    onReject: (requestId: Int, notes: String?) -> Unit
) {
    val context = LocalContext.current
    var employeePriceText by remember {
        mutableStateOf(
            if (saleRequest.proposedPrice % 1.0 == 0.0) saleRequest.proposedPrice.toLong().toString()
            else saleRequest.proposedPrice.toString()
        )
    }
    var commissionText by remember { mutableStateOf("0") }
    var paymentMethod by remember { mutableStateOf(saleRequest.paymentMethod ?: "CASH") }
    var notes by remember { mutableStateOf(saleRequest.notes ?: "") }
    var isSubmitting by remember { mutableStateOf(false) }
    var paymentDropdownExpanded by remember { mutableStateOf(false) }

    // Computed Final Selling Amount = Employee Price - Commission
    val employeePrice = employeePriceText.toDoubleOrNull() ?: 0.0
    val commissionVal = commissionText.toDoubleOrNull() ?: 0.0
    val finalSellingAmount = (employeePrice - commissionVal).coerceAtLeast(0.0)

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
                .padding(vertical = 10.dp),
            shape = RoundedCornerShape(18.dp),
            color = MaterialTheme.colorScheme.surface,
            tonalElevation = 6.dp,
            shadowElevation = 12.dp
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .verticalScroll(rememberScrollState())
                    .padding(horizontal = 14.dp, vertical = 12.dp),
                verticalArrangement = Arrangement.spacedBy(9.dp)
            ) {
                // Header (Ultra Compact)
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Surface(
                            color = Color(0xFFF59E0B).copy(alpha = 0.15f),
                            shape = RoundedCornerShape(8.dp),
                            modifier = Modifier.size(28.dp)
                        ) {
                            Box(contentAlignment = Alignment.Center) {
                                Icon(
                                    imageVector = Icons.Default.Verified,
                                    contentDescription = null,
                                    tint = Color(0xFFD97706),
                                    modifier = Modifier.size(16.dp)
                                )
                            }
                        }
                        Spacer(modifier = Modifier.width(8.dp))
                        Column {
                            Text(
                                text = "Approve Sale Request",
                                fontWeight = FontWeight.Bold,
                                fontSize = 14.5.sp,
                                color = MaterialTheme.colorScheme.onSurface
                            )
                            Text(
                                text = "Review, set commission & confirm",
                                fontSize = 10.sp,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                    IconButton(
                        onClick = onDismiss,
                        enabled = !isSubmitting,
                        modifier = Modifier.size(26.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.Close,
                            contentDescription = "Close",
                            tint = MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.size(16.dp)
                        )
                    }
                }

                HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.08f))

                // Submitter & Device Card (Compact Combined)
                Surface(
                    shape = RoundedCornerShape(10.dp),
                    color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.35f),
                    border = BorderStroke(0.8.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.12f))
                ) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(8.dp),
                        verticalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        // Submitter Line
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(
                                    imageVector = Icons.Default.Person,
                                    contentDescription = null,
                                    tint = MaterialTheme.colorScheme.primary,
                                    modifier = Modifier.size(13.dp)
                                )
                                Spacer(modifier = Modifier.width(4.dp))
                                Text(
                                    text = "${saleRequest.employeeName ?: (saleRequest.employeeUsername ?: "Staff")} (@${saleRequest.employeeUsername ?: "staff"})",
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 11.5.sp,
                                    color = MaterialTheme.colorScheme.onSurface
                                )
                            }
                            Text(
                                text = saleRequest.createdAt?.take(16)?.replace("T", " ") ?: "",
                                fontSize = 9.5.sp,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }

                        // Device Specs Line
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = saleRequest.deviceModel ?: "Device",
                                fontWeight = FontWeight.Bold,
                                fontSize = 13.sp,
                                color = MaterialTheme.colorScheme.primary
                            )
                            saleRequest.deviceImei?.let {
                                Text(
                                    text = "IMEI: $it",
                                    fontSize = 10.sp,
                                    fontFamily = FontFamily.Monospace,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                        }

                        // Badges Row
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(4.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            saleRequest.deviceVariant?.takeIf { it.isNotBlank() }?.let { v ->
                                SummaryBadge(text = v, color = Color(0xFF8B5CF6))
                            }
                            saleRequest.deviceCapacity?.takeIf { it.isNotBlank() }?.let { c ->
                                val cleanC = c.replace("gb", "", ignoreCase = true).trim() + "GB"
                                SummaryBadge(text = cleanC, color = MaterialTheme.colorScheme.primary)
                            }
                            saleRequest.deviceColor?.takeIf { it.isNotBlank() }?.let { col ->
                                val cleanCol = col.trim().split(Regex("[ /,-]")).firstOrNull { it.isNotBlank() } ?: col.trim()
                                SummaryBadge(text = cleanCol, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                            if (saleRequest.deviceBatteryHealth != null) {
                                SummaryBadge(text = "🔋 ${saleRequest.deviceBatteryHealth}%", color = Color(0xFF16A34A))
                            }
                        }
                    }
                }

                // Price & Commission Inputs (Side by Side Row)
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    // Employee Selling Price
                    OutlinedTextField(
                        value = employeePriceText,
                        onValueChange = { employeePriceText = it },
                        label = { Text("Sold Price *", fontSize = 10.5.sp) },
                        prefix = { Text("৳", fontWeight = FontWeight.Bold, color = Color(0xFF059669), fontSize = 11.5.sp) },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        singleLine = true,
                        shape = RoundedCornerShape(8.dp),
                        modifier = Modifier.weight(1f)
                    )

                    // Commission Input (Default 0)
                    OutlinedTextField(
                        value = commissionText,
                        onValueChange = { commissionText = it },
                        label = { Text("Commission", fontSize = 10.5.sp) },
                        prefix = { Text("৳", fontWeight = FontWeight.Bold, color = Color(0xFFD97706), fontSize = 11.5.sp) },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        singleLine = true,
                        shape = RoundedCornerShape(8.dp),
                        modifier = Modifier.weight(1f)
                    )
                }

                // Auto-computed Final Net Amount Banner
                Surface(
                    shape = RoundedCornerShape(8.dp),
                    color = Color(0xFF10B981).copy(alpha = 0.10f),
                    border = BorderStroke(0.8.dp, Color(0xFF10B981).copy(alpha = 0.35f)),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 10.dp, vertical = 7.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text(
                                text = "Final Selling Amount (Net)",
                                fontSize = 10.5.sp,
                                fontWeight = FontWeight.SemiBold,
                                color = Color(0xFF065F46)
                            )
                            Text(
                                text = "৳${formatIndianNumber(employeePrice)} - ৳${formatIndianNumber(commissionVal)}",
                                fontSize = 9.5.sp,
                                color = Color(0xFF047857)
                            )
                        }
                        Text(
                            text = "BDT ${formatIndianNumber(finalSellingAmount)}",
                            fontWeight = FontWeight.ExtraBold,
                            fontSize = 14.5.sp,
                            color = Color(0xFF059669)
                        )
                    }
                }

                // Payment Method Dropdown
                ExposedDropdownMenuBox(
                    expanded = paymentDropdownExpanded,
                    onExpandedChange = { paymentDropdownExpanded = it }
                ) {
                    OutlinedTextField(
                        value = paymentOptions.find { it.first == paymentMethod }?.second ?: "Cash Payment",
                        onValueChange = {},
                        readOnly = true,
                        label = { Text("Payment Method", fontSize = 11.sp) },
                        leadingIcon = {
                            Icon(
                                imageVector = Icons.Default.AccountBalanceWallet,
                                contentDescription = null,
                                tint = MaterialTheme.colorScheme.primary,
                                modifier = Modifier.size(16.dp)
                            )
                        },
                        trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = paymentDropdownExpanded) },
                        shape = RoundedCornerShape(8.dp),
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
                                text = { Text(label, fontSize = 12.sp) },
                                onClick = {
                                    paymentMethod = code
                                    paymentDropdownExpanded = false
                                }
                            )
                        }
                    }
                }

                // Admin Review Notes
                OutlinedTextField(
                    value = notes,
                    onValueChange = { notes = it },
                    label = { Text("Review Notes (Optional)", fontSize = 11.sp) },
                    placeholder = { Text("e.g. Approved", fontSize = 11.sp) },
                    leadingIcon = {
                        Icon(
                            imageVector = Icons.Default.Notes,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.size(16.dp)
                        )
                    },
                    singleLine = true,
                    shape = RoundedCornerShape(8.dp),
                    modifier = Modifier.fillMaxWidth()
                )

                // Actions: Reject vs Approve
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(top = 2.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    OutlinedButton(
                        onClick = {
                            isSubmitting = true
                            onReject(saleRequest.id, notes.ifEmpty { null })
                        },
                        enabled = !isSubmitting,
                        colors = ButtonDefaults.outlinedButtonColors(contentColor = Color(0xFFEF4444)),
                        border = BorderStroke(1.dp, Color(0xFFEF4444).copy(alpha = 0.5f)),
                        shape = RoundedCornerShape(8.dp),
                        contentPadding = PaddingValues(horizontal = 8.dp, vertical = 6.dp),
                        modifier = Modifier
                            .weight(1f)
                            .height(38.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.Cancel,
                            contentDescription = null,
                            tint = Color(0xFFEF4444),
                            modifier = Modifier.size(14.dp)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("Reject", fontWeight = FontWeight.Bold, fontSize = 11.5.sp)
                    }

                    Button(
                        onClick = {
                            if (finalSellingAmount <= 0.0) {
                                Toast.makeText(context, "Final Selling Amount must be greater than 0", Toast.LENGTH_SHORT).show()
                                return@Button
                            }
                            isSubmitting = true
                            onApprove(saleRequest.id, finalSellingAmount, commissionVal, paymentMethod, notes.ifEmpty { null })
                        },
                        enabled = !isSubmitting,
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF10B981)),
                        shape = RoundedCornerShape(8.dp),
                        contentPadding = PaddingValues(horizontal = 8.dp, vertical = 6.dp),
                        modifier = Modifier
                            .weight(1.6f)
                            .height(38.dp)
                    ) {
                        if (isSubmitting) {
                            CircularProgressIndicator(
                                color = Color.White,
                                strokeWidth = 2.dp,
                                modifier = Modifier.size(15.dp)
                            )
                        } else {
                            Icon(
                                imageVector = Icons.Default.CheckCircle,
                                contentDescription = null,
                                tint = Color.White,
                                modifier = Modifier.size(14.dp)
                            )
                            Spacer(modifier = Modifier.width(4.dp))
                            Text(
                                text = "Approve & Sell",
                                fontWeight = FontWeight.Bold,
                                fontSize = 11.5.sp,
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
private fun SummaryBadge(text: String, color: Color) {
    Surface(
        color = color.copy(alpha = 0.08f),
        shape = RoundedCornerShape(4.dp),
        border = BorderStroke(0.6.dp, color.copy(alpha = 0.2f))
    ) {
        Text(
            text = text,
            fontSize = 9.5.sp,
            fontWeight = FontWeight.SemiBold,
            color = color,
            modifier = Modifier.padding(horizontal = 4.dp, vertical = 1.dp),
            maxLines = 1,
            softWrap = false
        )
    }
}
