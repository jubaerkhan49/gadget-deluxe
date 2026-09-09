package com.imei.inventory.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.imei.inventory.data.api.ApiClient
import com.imei.inventory.data.model.DeviceDto
import kotlinx.coroutines.launch

@Composable
fun ScannerScreen(
    token: String,
    onBack: () -> Unit
) {
    var scannedCode by remember { mutableStateOf("") }
    var scannedDevice by remember { mutableStateOf<DeviceDto?>(null) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    var isSearching by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF0F172A))
            .padding(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text("IMEI / Barcode Scanner", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 20.sp)
            Button(
                onClick = onBack,
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF334155))
            ) {
                Text("Back", color = Color.White)
            }
        }

        Spacer(modifier = Modifier.height(20.dp))

        OutlinedTextField(
            value = scannedCode,
            onValueChange = { scannedCode = it },
            label = { Text("Scan or Enter IMEI / Serial") },
            placeholder = { Text("e.g. 356789012345678", color = Color.DarkGray) },
            singleLine = true,
            colors = OutlinedTextFieldDefaults.colors(
                focusedTextColor = Color.White,
                unfocusedTextColor = Color.White,
                focusedBorderColor = Color(0xFF6366F1),
                unfocusedBorderColor = Color(0xFF334155),
                focusedLabelColor = Color(0xFF818CF8),
                unfocusedLabelColor = Color(0xFF94A3B8)
            ),
            modifier = Modifier.fillMaxWidth()
        )

        Spacer(modifier = Modifier.height(12.dp))

        Button(
            onClick = {
                if (scannedCode.isBlank()) return@Button
                isSearching = true
                scope.launch {
                    try {
                        val response = ApiClient.apiService.scanCode("Bearer $token", scannedCode.trim())
                        if (response.isSuccessful && response.body()?.found == true) {
                            scannedDevice = response.body()?.device
                            errorMessage = null
                        } else {
                            scannedDevice = null
                            errorMessage = "No matching device found for '$scannedCode'"
                        }
                    } catch (e: Exception) {
                        errorMessage = "Scan error: ${e.localizedMessage}"
                    } finally {
                        isSearching = false
                    }
                }
            },
            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF4F46E5)),
            modifier = Modifier
                .fillMaxWidth()
                .height(48.dp)
        ) {
            if (isSearching) {
                CircularProgressIndicator(color = Color.White, modifier = Modifier.size(24.dp))
            } else {
                Text("Search & Verify IMEI", fontSize = 15.sp, color = Color.White)
            }
        }

        errorMessage?.let {
            Spacer(modifier = Modifier.height(14.dp))
            Text(text = it, color = Color(0xFFF87171), fontSize = 13.sp)
        }

        Spacer(modifier = Modifier.height(20.dp))

        scannedDevice?.let { dev ->
            Card(
                colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B)),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text(text = "✅ Device Found in Cloud DB", color = Color(0xFF4ADE80), fontWeight = FontWeight.Bold, fontSize = 14.sp)
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(text = dev.model, color = Color.White, fontWeight = FontWeight.Bold, fontSize = 18.sp)
                    Text(text = "IMEI: ${dev.imei}", color = Color(0xFFCBD5E1), fontSize = 13.sp)
                    dev.serialNumber?.let { Text(text = "Serial: $it", color = Color(0xFF94A3B8), fontSize = 12.sp) }
                    dev.variant?.let { Text(text = "Variant: $it", color = Color(0xFFF59E0B), fontSize = 12.sp) }
                    Text(text = "Status: ${dev.statusDisplay ?: dev.currentStatus}", color = Color(0xFF818CF8), fontSize = 13.sp)
                }
            }
        }
    }
}
