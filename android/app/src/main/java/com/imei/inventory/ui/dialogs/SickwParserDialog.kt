package com.imei.inventory.ui.dialogs

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import com.imei.inventory.data.model.DeviceDto
import com.imei.inventory.ui.screens.SickwParserTab
import com.imei.inventory.viewmodel.MainInventoryViewModel

@Composable
fun SickwParserDialog(
    token: String,
    viewModel: MainInventoryViewModel,
    onDismiss: () -> Unit,
    onDeviceCreated: (DeviceDto) -> Unit
) {
    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(usePlatformDefaultWidth = false)
    ) {
        Surface(
            modifier = Modifier
                .fillMaxWidth(0.95f)
                .fillMaxHeight(0.90f),
            shape = RoundedCornerShape(18.dp),
            color = MaterialTheme.colorScheme.background,
            tonalElevation = 6.dp
        ) {
            Column(modifier = Modifier.fillMaxSize()) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 12.dp),
                    horizontalArrangement = Arrangement.End
                ) {
                    TextButton(onClick = onDismiss) {
                        Text("Close", color = MaterialTheme.colorScheme.primary)
                    }
                }
                Box(modifier = Modifier.weight(1f)) {
                    SickwParserTab(
                        token = token,
                        viewModel = viewModel,
                        onDeviceCreated = { dev ->
                            onDeviceCreated(dev)
                            onDismiss()
                        }
                    )
                }
            }
        }
    }
}
