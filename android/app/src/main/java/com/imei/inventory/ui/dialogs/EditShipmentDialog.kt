package com.imei.inventory.ui.dialogs

import android.app.DatePickerDialog
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CalendarToday
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.imei.inventory.data.model.ShipmentDto
import java.util.Calendar
import java.util.Locale

@Composable
fun EditShipmentDialog(
    shipment: ShipmentDto,
    onDismiss: () -> Unit,
    onSave: (Map<String, Any?>) -> Unit
) {
    val context = LocalContext.current
    var trackingNumber by remember { mutableStateOf(shipment.trackingNumber) }
    var shippingCompany by remember { mutableStateOf(shipment.shippingCompany ?: "") }
    var supplierName by remember { mutableStateOf(shipment.supplierName ?: "") }
    var receiveDateCn by remember { mutableStateOf(shipment.receiveDate?.take(10) ?: "") }
    var shippingCost by remember { mutableStateOf(shipment.shippingCost ?: "") }
    var discount by remember { mutableStateOf(shipment.discount ?: "") }
    var notes by remember { mutableStateOf(shipment.notes ?: "") }
    var errorMessage by remember { mutableStateOf<String?>(null) }

    fun openDatePicker() {
        val cal = Calendar.getInstance()
        if (receiveDateCn.isNotBlank()) {
            try {
                val parts = receiveDateCn.split("-")
                if (parts.size == 3) {
                    cal.set(parts[0].toInt(), parts[1].toInt() - 1, parts[2].toInt())
                }
            } catch (e: Exception) { }
        }
        DatePickerDialog(
            context,
            { _, year, month, dayOfMonth ->
                receiveDateCn = String.format(Locale.US, "%04d-%02d-%02d", year, month + 1, dayOfMonth)
            },
            cal.get(Calendar.YEAR),
            cal.get(Calendar.MONTH),
            cal.get(Calendar.DAY_OF_MONTH)
        ).show()
    }

    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = MaterialTheme.colorScheme.surface,
        shape = RoundedCornerShape(18.dp),
        title = {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Icon(
                    imageVector = Icons.Default.Edit,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.primary,
                    modifier = Modifier.size(22.dp)
                )
                Text(
                    text = "Edit Shipment Details",
                    color = MaterialTheme.colorScheme.onSurface,
                    fontWeight = FontWeight.Bold,
                    fontSize = 18.sp
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
                errorMessage?.let { err ->
                    Surface(
                        color = MaterialTheme.colorScheme.error.copy(alpha = 0.12f),
                        shape = RoundedCornerShape(8.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text(
                            text = err,
                            color = MaterialTheme.colorScheme.error,
                            fontSize = 12.sp,
                            modifier = Modifier.padding(8.dp)
                        )
                    }
                }

                // 1. Receive Date (CN)
                Text(
                    text = "Receive Date (China)",
                    color = MaterialTheme.colorScheme.primary,
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 13.sp
                )
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    OutlinedButton(
                        onClick = { openDatePicker() },
                        shape = RoundedCornerShape(10.dp),
                        modifier = Modifier.weight(1f)
                    ) {
                        Icon(
                            imageVector = Icons.Default.CalendarToday,
                            contentDescription = "Pick Date",
                            modifier = Modifier.size(16.dp),
                            tint = MaterialTheme.colorScheme.primary
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            text = if (receiveDateCn.isNotBlank()) receiveDateCn else "Select Receive Date (CN)",
                            color = if (receiveDateCn.isNotBlank()) MaterialTheme.colorScheme.onSurface else MaterialTheme.colorScheme.onSurfaceVariant,
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Medium
                        )
                    }

                    if (receiveDateCn.isNotBlank()) {
                        IconButton(
                            onClick = { receiveDateCn = "" },
                            modifier = Modifier.size(36.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.Close,
                                contentDescription = "Clear Date",
                                tint = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                }

                // 2. Tracking Number
                OutlinedTextField(
                    value = trackingNumber,
                    onValueChange = { trackingNumber = it },
                    label = { Text("Tracking Number *") },
                    singleLine = true,
                    shape = RoundedCornerShape(10.dp),
                    modifier = Modifier.fillMaxWidth()
                )

                // 3. Shipping Agent
                OutlinedTextField(
                    value = shippingCompany,
                    onValueChange = { shippingCompany = it },
                    label = { Text("Shipping Agent") },
                    placeholder = { Text("e.g. AB Group, SF Express") },
                    singleLine = true,
                    shape = RoundedCornerShape(10.dp),
                    modifier = Modifier.fillMaxWidth()
                )

                // 4. Supplier
                OutlinedTextField(
                    value = supplierName,
                    onValueChange = { supplierName = it },
                    label = { Text("Supplier Name") },
                    placeholder = { Text("e.g. Qifeng, Nanfeng") },
                    singleLine = true,
                    shape = RoundedCornerShape(10.dp),
                    modifier = Modifier.fillMaxWidth()
                )

                // 5. Financials
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedTextField(
                        value = shippingCost,
                        onValueChange = { shippingCost = it },
                        label = { Text("Shipment Fee (BDT)") },
                        placeholder = { Text("0.00") },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                        singleLine = true,
                        shape = RoundedCornerShape(10.dp),
                        modifier = Modifier.weight(1f)
                    )

                    OutlinedTextField(
                        value = discount,
                        onValueChange = { discount = it },
                        label = { Text("Cashback (BDT)") },
                        placeholder = { Text("0.00") },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                        singleLine = true,
                        shape = RoundedCornerShape(10.dp),
                        modifier = Modifier.weight(1f)
                    )
                }

                // 6. Notes
                OutlinedTextField(
                    value = notes,
                    onValueChange = { notes = it },
                    label = { Text("Notes / Remarks") },
                    maxLines = 3,
                    shape = RoundedCornerShape(10.dp),
                    modifier = Modifier.fillMaxWidth()
                )
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    if (trackingNumber.isBlank()) {
                        errorMessage = "Tracking Number is required."
                        return@Button
                    }
                    val updates = mutableMapOf<String, Any?>()
                    updates["tracking_number"] = trackingNumber.trim()
                    updates["shipping_company"] = if (shippingCompany.isNotBlank()) shippingCompany.trim() else null
                    if (supplierName.isNotBlank()) {
                        updates["supplier_name"] = supplierName.trim()
                    }
                    updates["receive_date"] = if (receiveDateCn.isNotBlank()) receiveDateCn.trim() else null
                    updates["shipping_cost"] = shippingCost.toDoubleOrNull() ?: 0.0
                    updates["discount"] = discount.toDoubleOrNull() ?: 0.0
                    updates["notes"] = if (notes.isNotBlank()) notes.trim() else null

                    onSave(updates)
                },
                shape = RoundedCornerShape(8.dp),
                colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary)
            ) {
                Text("Save Changes", color = Color.White, fontWeight = FontWeight.Bold)
            }
        },
        dismissButton = {
            TextButton(
                onClick = onDismiss,
                shape = RoundedCornerShape(8.dp)
            ) {
                Text("Cancel", color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
    )
}
