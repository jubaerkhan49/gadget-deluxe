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
            Text("IMEI / QR Scanner", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 20.sp)
            Button(onClick = onBack, colors = ButtonDefaults.buttonColors(containerColor = Color.DarkGray)) {
                Text("Close")
            }
        }

        Spacer(modifier = Modifier.height(24.dp))

        Card(
            modifier = Modifier
                .fillMaxWidth()
                .height(200.dp),
            colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B))
        ) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Text("Camera Scanner View\n(CameraX / ML Kit Active)", color = Color.Gray)
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        OutlinedTextField(
            value = scannedCode,
            onValueChange = { scannedCode = it },
            label = { Text("Or Type Scanned Code / IMEI") },
            colors = OutlinedTextFieldDefaults.colors(
                focusedTextColor = Color.White,
                unfocusedTextColor = Color.White,
                focusedBorderColor = Color(0xFF6366F1)
            ),
            modifier = Modifier.fillMaxWidth()
        )

        Spacer(modifier = Modifier.height(12.dp))

        Button(
            onClick = {
                if (scannedCode.isBlank()) return@Button
                scope.launch {
                    try {
                        val response = ApiClient.apiService.scanCode("Bearer $token", scannedCode.trim())
                        if (response.isSuccessful && response.body()?.found == true) {
                            scannedDevice = response.body()?.device
                            errorMessage = null
                        } else {
                            scannedDevice = null
                            errorMessage = "No device found matching code: $scannedCode"
                        }
                    } catch (e: Exception) {
                        errorMessage = "Error: ${e.localizedMessage}"
                    }
                }
            },
            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF4F46E5)),
            modifier = Modifier.fillMaxWidth()
        ) {
            Text("Verify Code & Fetch Device")
        }

        Spacer(modifier = Modifier.height(24.dp))

        scannedDevice?.let { dev ->
            Card(
                colors = CardDefaults.cardColors(containerColor = Color(0xFF065F46)),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text(text = "MATCH FOUND", color = Color.Green, fontWeight = FontWeight.Bold)
                    Text(text = dev.model, color = Color.White, fontWeight = FontWeight.Bold)
                    Text(text = "IMEI: ${dev.imei}", color = Color.White)
                    Text(text = "Status: ${dev.currentStatus}", color = Color.White)
                }
            }
        }

        errorMessage?.let { err ->
            Text(text = err, color = Color.Red, modifier = Modifier.padding(top = 12.dp))
        }
    }
}
