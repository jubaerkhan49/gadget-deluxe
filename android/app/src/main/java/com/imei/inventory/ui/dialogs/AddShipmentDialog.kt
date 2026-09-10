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
import com.imei.inventory.data.model.ShipmentDto

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AddShipmentDialog(
    existingShipments: List<ShipmentDto> = emptyList(),
    onDismiss: () -> Unit,
    onSave: (Map<String, Any>) -> Unit
) {
    var trackingNumber by remember { mutableStateOf("") }
    var supplierName by remember { mutableStateOf("") }
    var shippingCompany by remember { mutableStateOf("") }

    var productName by remember { mutableStateOf("iPhone 15 Pro Max") }
    var variant by remember { mutableStateOf("Modified") }
    var capacity by remember { mutableStateOf("128GB") }
    var color by remember { mutableStateOf("Natural Titanium") }
    var imeisText by remember { mutableStateOf("") }

    var itemPriceStr by remember { mutableStateOf("0.00") }
    var shipmentFeeStr by remember { mutableStateOf("0.00") }
    var discountStr by remember { mutableStateOf("0.00") }

    val variants = listOf(
        "Modified",
        "USA eSim",
        "Canada",
        "Mexican",
        "Korea",
        "Singapore",
        "Bypass"
    )
    var variantMenuExpanded by remember { mutableStateOf(false) }

    // Auto-fill existing shipment when tracking matches
    LaunchedEffect(trackingNumber) {
        val trimmed = trackingNumber.trim()
        if (trimmed.isNotEmpty()) {
            val matched = existingShipments.firstOrNull { it.trackingNumber.equals(trimmed, ignoreCase = true) }
            if (matched != null) {
                if (supplierName.isBlank() && matched.supplierName != null) {
                    supplierName = matched.supplierName
                }
                if (shippingCompany.isBlank() && matched.shippingCompany != null) {
                    shippingCompany = matched.shippingCompany
                }
                if (shipmentFeeStr == "0.00" || shipmentFeeStr.isBlank()) {
                    matched.unitShippingCost?.let { shipmentFeeStr = it }
                }
            }
        }
    }

    // Calculations
    val parsedCount = remember(imeisText) {
        val items = imeisText.split(Regex("[\\r\\n,\\s]+")).filter { it.isNotBlank() }
        if (items.isEmpty()) 1 else items.size
    }

    val itemPrice = itemPriceStr.toDoubleOrNull() ?: 0.0
    val feePerUnit = shipmentFeeStr.toDoubleOrNull() ?: 0.0
    val discountVal = discountStr.toDoubleOrNull() ?: 0.0

    val grossFreight = feePerUnit * parsedCount
    val netFreight = maxOf(grossFreight - discountVal, 0.0)
    val effectiveUnitFee = if (parsedCount > 0) (netFreight / parsedCount) else 0.0
    val totalBuyingPerUnit = itemPrice + effectiveUnitFee

    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = MaterialTheme.colorScheme.surface,
        shape = RoundedCornerShape(18.dp),
        title = {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    text = "📦 New Shipment Entry",
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
                // 1. Shipment Logistics Header
                Text(
                    text = "Shipment Logistics",
                    color = MaterialTheme.colorScheme.primary,
                    fontWeight = FontWeight.Bold,
                    fontSize = 13.sp
                )

                OutlinedTextField(
                    value = trackingNumber,
                    onValueChange = { trackingNumber = it },
                    label = { Text("Tracking Number *") },
                    singleLine = true,
                    shape = RoundedCornerShape(10.dp),
                    modifier = Modifier.fillMaxWidth()
                )

                OutlinedTextField(
                    value = supplierName,
                    onValueChange = { supplierName = it },
                    label = { Text("Supplier Name *") },
                    singleLine = true,
                    shape = RoundedCornerShape(10.dp),
                    modifier = Modifier.fillMaxWidth()
                )

                OutlinedTextField(
                    value = shippingCompany,
                    onValueChange = { shippingCompany = it },
                    label = { Text("Shipping Agent") },
                    placeholder = { Text("e.g. SF Express, DHL, Standard Freight") },
                    singleLine = true,
                    shape = RoundedCornerShape(10.dp),
                    modifier = Modifier.fillMaxWidth()
                )

                Spacer(modifier = Modifier.height(4.dp))

                // 2. Device Specifications
                Text(
                    text = "Device Specs & Variant",
                    color = MaterialTheme.colorScheme.primary,
                    fontWeight = FontWeight.Bold,
                    fontSize = 13.sp
                )

                OutlinedTextField(
                    value = productName,
                    onValueChange = { productName = it },
                    label = { Text("Product / Model Name") },
                    placeholder = { Text("e.g. iPhone 15 Pro Max") },
                    singleLine = true,
                    shape = RoundedCornerShape(10.dp),
                    modifier = Modifier.fillMaxWidth()
                )

                // Variant Dropdown
                ExposedDropdownMenuBox(
                    expanded = variantMenuExpanded,
                    onExpandedChange = { variantMenuExpanded = !variantMenuExpanded }
                ) {
                    OutlinedTextField(
                        value = variant,
                        onValueChange = {},
                        readOnly = true,
                        label = { Text("Variant") },
                        trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = variantMenuExpanded) },
                        shape = RoundedCornerShape(10.dp),
                        modifier = Modifier
                            .fillMaxWidth()
                            .menuAnchor()
                    )
                    ExposedDropdownMenu(
                        expanded = variantMenuExpanded,
                        onDismissRequest = { variantMenuExpanded = false }
                    ) {
                        variants.forEach { v ->
                            DropdownMenuItem(
                                text = { Text(v) },
                                onClick = {
                                    variant = v
                                    variantMenuExpanded = false
                                }
                            )
                        }
                    }
                }

                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedTextField(
                        value = capacity,
                        onValueChange = { capacity = it },
                        label = { Text("Storage") },
                        placeholder = { Text("128GB") },
                        shape = RoundedCornerShape(10.dp),
                        modifier = Modifier.weight(1f)
                    )
                    OutlinedTextField(
                        value = color,
                        onValueChange = { color = it },
                        label = { Text("Color") },
                        placeholder = { Text("Black") },
                        shape = RoundedCornerShape(10.dp),
                        modifier = Modifier.weight(1f)
                    )
                }

                // IMEI Multi-line Entry
                OutlinedTextField(
                    value = imeisText,
                    onValueChange = { imeisText = it },
                    label = { Text("IMEIs / Identifiers ($parsedCount items)") },
                    placeholder = { Text("Paste IMEIs (one per line or separated by comma)") },
                    minLines = 3,
                    maxLines = 5,
                    shape = RoundedCornerShape(10.dp),
                    modifier = Modifier.fillMaxWidth()
                )

                Spacer(modifier = Modifier.height(4.dp))

                // 3. Costs & Pricing
                Text(
                    text = "Cost & Pricing per Unit",
                    color = MaterialTheme.colorScheme.primary,
                    fontWeight = FontWeight.Bold,
                    fontSize = 13.sp
                )

                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedTextField(
                        value = itemPriceStr,
                        onValueChange = { itemPriceStr = it },
                        label = { Text("Item Price (BDT)") },
                        shape = RoundedCornerShape(10.dp),
                        modifier = Modifier.weight(1f)
                    )
                    OutlinedTextField(
                        value = shipmentFeeStr,
                        onValueChange = { shipmentFeeStr = it },
                        label = { Text("Ship Fee/Unit") },
                        shape = RoundedCornerShape(10.dp),
                        modifier = Modifier.weight(1f)
                    )
                }

                OutlinedTextField(
                    value = discountStr,
                    onValueChange = { discountStr = it },
                    label = { Text("Agent Cashback / Discount (BDT)") },
                    shape = RoundedCornerShape(10.dp),
                    modifier = Modifier.fillMaxWidth()
                )

                // 4. Live Calculation Pill Container
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.6f), RoundedCornerShape(10.dp))
                        .padding(12.dp),
                    verticalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text("Unit Buying Cost:", fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                        Text(
                            text = "BDT ${String.format("%.2f", totalBuyingPerUnit)}",
                            color = MaterialTheme.colorScheme.primary,
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text("Net Shipment Bill ($parsedCount items):", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Text(
                            text = "BDT ${String.format("%.2f", netFreight)}",
                            color = Color(0xFFD97706),
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    if (trackingNumber.isNotBlank() && supplierName.isNotBlank()) {
                        val payload = mapOf(
                            "tracking_number" to trackingNumber.trim(),
                            "supplier_name" to supplierName.trim(),
                            "shipping_company" to shippingCompany.trim(),
                            "product_name" to productName.trim(),
                            "variant" to variant.trim(),
                            "capacity" to capacity.trim(),
                            "color" to color.trim(),
                            "product_identifier" to imeisText.trim(),
                            "item_price" to (itemPriceStr.toDoubleOrNull() ?: 0.0),
                            "shipment_fees" to (shipmentFeeStr.toDoubleOrNull() ?: 0.0),
                            "discount" to (discountStr.toDoubleOrNull() ?: 0.0)
                        )
                        onSave(payload)
                    }
                },
                enabled = trackingNumber.isNotBlank() && supplierName.isNotBlank(),
                shape = RoundedCornerShape(10.dp),
                colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary)
            ) {
                Text("Save & Register Items", fontWeight = FontWeight.Bold, fontSize = 12.sp)
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Cancel", color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
    )
}
