package com.imei.inventory.ui.screens

import android.widget.Toast
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.imei.inventory.data.model.DeviceDto
import com.imei.inventory.ui.components.CopyableText
import com.imei.inventory.viewmodel.MainInventoryViewModel

@Composable
fun SickwParserTab(
    token: String,
    viewModel: MainInventoryViewModel,
    onDeviceCreated: (DeviceDto) -> Unit
) {
    var rawText by remember { mutableStateOf("") }
    var parsedModel by remember { mutableStateOf("") }
    var parsedImei by remember { mutableStateOf("") }
    var parsedCapacity by remember { mutableStateOf("") }
    var parsedColor by remember { mutableStateOf("") }
    var parsedVariant by remember { mutableStateOf("USA eSim") }
    var parsedICloud by remember { mutableStateOf("") }
    var parsedSimLock by remember { mutableStateOf("") }
    var parsedCountry by remember { mutableStateOf("") }

    var isParsed by remember { mutableStateOf(false) }
    var isImporting by remember { mutableStateOf(false) }
    val context = LocalContext.current

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        Column {
            Text(
                text = "⚡ Sickw & IMEI Parser",
                color = MaterialTheme.colorScheme.onBackground,
                fontSize = 22.sp,
                fontWeight = FontWeight.ExtraBold
            )
            Text(
                text = "Paste raw Sickw check report to auto-extract specs",
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                fontSize = 13.sp
            )
        }

        OutlinedTextField(
            value = rawText,
            onValueChange = { rawText = it },
            placeholder = {
                Text(
                    "Paste Sickw output here...\nExample:\nModel: iPhone 15 Pro 256GB Natural Titanium\nIMEI: 356789012345678\niCloud: CLEAN\nSIM Lock: Unlocked\nPurchase Country: United States",
                    color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.7f),
                    fontSize = 12.sp
                )
            },
            minLines = 5,
            maxLines = 8,
            shape = RoundedCornerShape(16.dp),
            colors = OutlinedTextFieldDefaults.colors(
                focusedContainerColor = MaterialTheme.colorScheme.surfaceContainerLow,
                unfocusedContainerColor = MaterialTheme.colorScheme.surfaceContainerLow,
                focusedTextColor = MaterialTheme.colorScheme.onSurface,
                unfocusedTextColor = MaterialTheme.colorScheme.onSurface,
                focusedBorderColor = MaterialTheme.colorScheme.primary,
                unfocusedBorderColor = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f)
            ),
            modifier = Modifier.fillMaxWidth()
        )

        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            Button(
                onClick = {
                    if (rawText.isBlank()) return@Button
                    val text = rawText
                    val lines = text.lines()

                    var foundImei = ""
                    var foundModel = ""
                    var foundCap = ""
                    var foundCol = ""
                    var foundICloud = ""
                    var foundSim = ""
                    var foundCountry = ""

                    for (line in lines) {
                        val lower = line.lowercase()
                        when {
                            lower.contains("imei:") || lower.contains("imei 1:") -> {
                                foundImei = line.substringAfter(":").trim().take(15)
                            }
                            lower.contains("model description:") || lower.contains("model:") -> {
                                val m = line.substringAfter(":").trim()
                                foundModel = m
                                if (m.contains("128GB", true)) foundCap = "128GB"
                                else if (m.contains("256GB", true)) foundCap = "256GB"
                                else if (m.contains("512GB", true)) foundCap = "512GB"
                                else if (m.contains("1TB", true)) foundCap = "1TB"
                                else if (m.contains("64GB", true)) foundCap = "64GB"
                            }
                            lower.contains("icloud:") || lower.contains("find my:") -> {
                                foundICloud = line.substringAfter(":").trim()
                            }
                            lower.contains("sim lock:") || lower.contains("carrier:") -> {
                                foundSim = line.substringAfter(":").trim()
                            }
                            lower.contains("purchase country:") || lower.contains("sold to:") -> {
                                foundCountry = line.substringAfter(":").trim()
                            }
                        }
                    }

                    if (foundImei.isBlank()) {
                        val imeiRegex = Regex("\\b\\d{15}\\b")
                        foundImei = imeiRegex.find(text)?.value ?: ""
                    }

                    parsedImei = foundImei
                    parsedModel = if (foundModel.isNotBlank()) foundModel else "iPhone Device"
                    parsedCapacity = if (foundCap.isNotBlank()) foundCap else "128GB"
                    parsedColor = foundCol
                    parsedICloud = foundICloud
                    parsedSimLock = foundSim
                    parsedCountry = foundCountry
                    isParsed = true
                },
                colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary),
                shape = RoundedCornerShape(percent = 50),
                modifier = Modifier.weight(1f)
            ) {
                Text("⚡ Parse Specs", color = Color.White, fontWeight = FontWeight.Bold)
            }

            OutlinedButton(
                onClick = {
                    rawText = ""
                    isParsed = false
                },
                shape = RoundedCornerShape(percent = 50),
                modifier = Modifier.weight(0.5f)
            ) {
                Text("Clear", color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }

        if (isParsed) {
            Card(
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLow),
                shape = RoundedCornerShape(20.dp),
                border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.35f)),
                elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text("✅ Parsed Specification Preview", color = Color(0xFF10B981), fontWeight = FontWeight.Bold, fontSize = 15.sp)

                    OutlinedTextField(
                        value = parsedModel,
                        onValueChange = { parsedModel = it },
                        label = { Text("Model Name") },
                        shape = RoundedCornerShape(12.dp),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedTextColor = MaterialTheme.colorScheme.onSurface,
                            unfocusedTextColor = MaterialTheme.colorScheme.onSurface
                        ),
                        modifier = Modifier.fillMaxWidth()
                    )

                    OutlinedTextField(
                        value = parsedImei,
                        onValueChange = { parsedImei = it },
                        label = { Text("IMEI") },
                        shape = RoundedCornerShape(12.dp),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedTextColor = MaterialTheme.colorScheme.onSurface,
                            unfocusedTextColor = MaterialTheme.colorScheme.onSurface
                        ),
                        modifier = Modifier.fillMaxWidth()
                    )

                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        OutlinedTextField(
                            value = parsedCapacity,
                            onValueChange = { parsedCapacity = it },
                            label = { Text("Storage") },
                            shape = RoundedCornerShape(12.dp),
                            modifier = Modifier.weight(1f),
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedTextColor = MaterialTheme.colorScheme.onSurface,
                                unfocusedTextColor = MaterialTheme.colorScheme.onSurface
                            )
                        )
                        OutlinedTextField(
                            value = parsedVariant,
                            onValueChange = { parsedVariant = it },
                            label = { Text("Variant") },
                            shape = RoundedCornerShape(12.dp),
                            modifier = Modifier.weight(1f),
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedTextColor = MaterialTheme.colorScheme.onSurface,
                                unfocusedTextColor = MaterialTheme.colorScheme.onSurface
                            )
                        )
                    }

                    if (parsedICloud.isNotBlank()) {
                        CopyableText(label = "iCloud Status", value = parsedICloud)
                    }
                    if (parsedSimLock.isNotBlank()) {
                        CopyableText(label = "SIM Lock", value = parsedSimLock)
                    }
                    if (parsedCountry.isNotBlank()) {
                        CopyableText(label = "Country", value = parsedCountry)
                    }

                    Spacer(modifier = Modifier.height(6.dp))

                    Button(
                        onClick = {
                            if (parsedImei.isBlank()) {
                                Toast.makeText(context, "IMEI is required", Toast.LENGTH_SHORT).show()
                                return@Button
                            }
                            isImporting = true
                            val newDevice = DeviceDto(
                                imei = parsedImei.trim(),
                                model = parsedModel.trim(),
                                capacity = parsedCapacity.ifBlank { null },
                                color = parsedColor.ifBlank { null },
                                variant = parsedVariant,
                                icloudStatus = parsedICloud.ifBlank { null },
                                simLockStatus = parsedSimLock.ifBlank { null },
                                purchaseCountry = parsedCountry.ifBlank { null },
                                currentStatus = "IN_STOCK"
                            )
                            viewModel.createDevice(
                                token = token,
                                device = newDevice,
                                onSuccess = {
                                    isImporting = false
                                    Toast.makeText(context, "Successfully imported to cloud inventory!", Toast.LENGTH_LONG).show()
                                    onDeviceCreated(newDevice)
                                },
                                onError = { err ->
                                    isImporting = false
                                    Toast.makeText(context, err, Toast.LENGTH_LONG).show()
                                }
                            )
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF10B981)),
                        shape = RoundedCornerShape(percent = 50),
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(48.dp)
                    ) {
                        if (isImporting) {
                            CircularProgressIndicator(color = Color.White, modifier = Modifier.size(20.dp))
                        } else {
                            Text("⚡ Save & Import to Cloud Inventory", color = Color.White, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        }
    }
}
