package com.imei.inventory.ui.screens

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.QrCodeScanner
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
import com.imei.inventory.ui.components.CopyableText
import com.imei.inventory.ui.components.DeviceCameraBadge
import com.imei.inventory.ui.components.DevicePhotoStrip
import com.imei.inventory.ui.components.ExpressiveSearchBar
import com.imei.inventory.ui.components.StatusBadge
import com.imei.inventory.ui.components.VariantBadge
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
            .padding(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Surface(
                    color = MaterialTheme.colorScheme.primary.copy(alpha = 0.15f),
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier.size(36.dp)
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Icon(
                            imageVector = Icons.Default.QrCodeScanner,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.primary,
                            modifier = Modifier.size(20.dp)
                        )
                    }
                }
                Spacer(modifier = Modifier.width(10.dp))
                Column {
                    Text(
                        text = "IMEI / Barcode Scanner",
                        color = MaterialTheme.colorScheme.onBackground,
                        fontWeight = FontWeight.ExtraBold,
                        fontSize = 18.sp
                    )
                    Text(
                        text = "Verify device status instantly",
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        fontSize = 11.5.sp
                    )
                }
            }

            IconButton(
                onClick = onBack,
                modifier = Modifier.size(36.dp)
            ) {
                Icon(
                    imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                    contentDescription = "Back",
                    tint = MaterialTheme.colorScheme.onSurface
                )
            }
        }

        Spacer(modifier = Modifier.height(20.dp))

        ExpressiveSearchBar(
            query = scannedCode,
            onQueryChange = { scannedCode = it },
            placeholder = "Scan or Enter IMEI / Serial..."
        )

        Spacer(modifier = Modifier.height(14.dp))

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
            colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary),
            shape = RoundedCornerShape(percent = 50),
            modifier = Modifier
                .fillMaxWidth()
                .height(50.dp)
        ) {
            if (isSearching) {
                CircularProgressIndicator(color = Color.White, modifier = Modifier.size(22.dp))
            } else {
                Text("Verify IMEI in Cloud DB", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = Color.White)
            }
        }

        errorMessage?.let {
            Spacer(modifier = Modifier.height(14.dp))
            Surface(
                color = MaterialTheme.colorScheme.errorContainer,
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Text(
                    text = it,
                    color = MaterialTheme.colorScheme.onErrorContainer,
                    fontSize = 12.5.sp,
                    fontWeight = FontWeight.Medium,
                    modifier = Modifier.padding(12.dp)
                )
            }
        }

        Spacer(modifier = Modifier.height(20.dp))

        scannedDevice?.let { dev ->
            Card(
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLow),
                shape = RoundedCornerShape(20.dp),
                border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.35f)),
                elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(
                    modifier = Modifier.padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.CheckCircle,
                            contentDescription = null,
                            tint = Color(0xFF10B981),
                            modifier = Modifier.size(18.dp)
                        )
                        Text(
                            text = "Device Verified in Cloud DB",
                            color = Color(0xFF10B981),
                            fontWeight = FontWeight.Bold,
                            fontSize = 13.sp
                        )
                    }

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                            modifier = Modifier.weight(1f)
                        ) {
                            Text(
                                text = dev.model,
                                color = MaterialTheme.colorScheme.onSurface,
                                fontWeight = FontWeight.ExtraBold,
                                fontSize = 17.sp
                            )
                            val photoCount = (dev.photos ?: dev.images ?: emptyList()).filter { it.url.isNotBlank() }.size
                            if (photoCount > 0) {
                                DeviceCameraBadge(count = photoCount)
                            }
                        }
                        StatusBadge(status = dev.currentStatus, statusDisplay = dev.statusDisplay)
                    }

                    CopyableText(label = "IMEI", value = dev.imei)

                    if (!dev.serialNumber.isNullOrBlank()) {
                        Text("Serial: ${dev.serialNumber}", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 12.sp)
                    }
                    if (!dev.variant.isNullOrBlank()) {
                        VariantBadge(dev.variant)
                    }

                    // Condition Photos Strip for Scanned Device
                    DevicePhotoStrip(
                        device = dev,
                        token = token,
                        isAdmin = true,
                        onDeviceUpdated = { updated ->
                            scannedDevice = updated
                        }
                    )
                }
            }
        }
    }
}
