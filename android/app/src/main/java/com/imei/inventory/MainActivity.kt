package com.imei.inventory

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.viewModels
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.imei.inventory.data.model.DeviceDto
import com.imei.inventory.ui.dialogs.AddDeviceDialog
import com.imei.inventory.ui.dialogs.DeviceDetailDialog
import com.imei.inventory.ui.screens.*
import com.imei.inventory.viewmodel.AuthViewModel
import com.imei.inventory.viewmodel.MainInventoryViewModel

class MainActivity : ComponentActivity() {
    private val authViewModel: AuthViewModel by viewModels()
    private val mainViewModel: MainInventoryViewModel by viewModels()

    @OptIn(ExperimentalMaterial3Api::class)
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            MaterialTheme(
                colorScheme = darkColorScheme(
                    primary = Color(0xFF6366F1),
                    background = Color(0xFF0F172A),
                    surface = Color(0xFF1E293B)
                )
            ) {
                Surface(modifier = Modifier.fillMaxSize(), color = Color(0xFF0F172A)) {
                    var userToken by remember { mutableStateOf<String?>(null) }
                    var selectedTab by remember { mutableStateOf(0) }
                    var selectedDeviceForDetail by remember { mutableStateOf<DeviceDto?>(null) }
                    var showAddDeviceDialog by remember { mutableStateOf(false) }

                    if (userToken == null) {
                        LoginScreen(
                            authViewModel = authViewModel,
                            onLoginSuccess = { token ->
                                userToken = token
                                mainViewModel.loadAllData(token)
                            }
                        )
                    } else {
                        val token = userToken!!

                        Scaffold(
                            topBar = {
                                TopAppBar(
                                    title = {
                                        Text(
                                            text = "Gadget Deluxe",
                                            fontWeight = FontWeight.Bold,
                                            fontSize = 18.sp,
                                            color = Color.White
                                        )
                                    },
                                    colors = TopAppBarDefaults.topAppBarColors(containerColor = Color(0xFF0F172A)),
                                    actions = {
                                        IconButton(onClick = { mainViewModel.loadAllData(token) }) {
                                            Text("🔄", fontSize = 16.sp)
                                        }
                                        TextButton(onClick = { userToken = null }) {
                                            Text("Logout", color = Color(0xFFF87171), fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                                        }
                                    }
                                )
                            },
                            bottomBar = {
                                NavigationBar(
                                    containerColor = Color(0xFF0B1120),
                                    tonalElevation = 8.dp
                                ) {
                                    NavigationBarItem(
                                        icon = { Text("📊", fontSize = 18.sp) },
                                        label = { Text("Overview", fontSize = 11.sp) },
                                        selected = selectedTab == 0,
                                        onClick = { selectedTab = 0 },
                                        colors = NavigationBarItemDefaults.colors(
                                            selectedIconColor = Color(0xFF818CF8),
                                            selectedTextColor = Color(0xFF818CF8),
                                            unselectedIconColor = Color.Gray,
                                            unselectedTextColor = Color.Gray,
                                            indicatorColor = Color(0xFF1E293B)
                                        )
                                    )
                                    NavigationBarItem(
                                        icon = { Text("📱", fontSize = 18.sp) },
                                        label = { Text("Inventory", fontSize = 11.sp) },
                                        selected = selectedTab == 1,
                                        onClick = { selectedTab = 1 },
                                        colors = NavigationBarItemDefaults.colors(
                                            selectedIconColor = Color(0xFF818CF8),
                                            selectedTextColor = Color(0xFF818CF8),
                                            unselectedIconColor = Color.Gray,
                                            unselectedTextColor = Color.Gray,
                                            indicatorColor = Color(0xFF1E293B)
                                        )
                                    )
                                    NavigationBarItem(
                                        icon = { Text("🚚", fontSize = 18.sp) },
                                        label = { Text("Shipments", fontSize = 11.sp) },
                                        selected = selectedTab == 2,
                                        onClick = { selectedTab = 2 },
                                        colors = NavigationBarItemDefaults.colors(
                                            selectedIconColor = Color(0xFF818CF8),
                                            selectedTextColor = Color(0xFF818CF8),
                                            unselectedIconColor = Color.Gray,
                                            unselectedTextColor = Color.Gray,
                                            indicatorColor = Color(0xFF1E293B)
                                        )
                                    )
                                    NavigationBarItem(
                                        icon = { Text("💵", fontSize = 18.sp) },
                                        label = { Text("Sales", fontSize = 11.sp) },
                                        selected = selectedTab == 3,
                                        onClick = { selectedTab = 3 },
                                        colors = NavigationBarItemDefaults.colors(
                                            selectedIconColor = Color(0xFF818CF8),
                                            selectedTextColor = Color(0xFF818CF8),
                                            unselectedIconColor = Color.Gray,
                                            unselectedTextColor = Color.Gray,
                                            indicatorColor = Color(0xFF1E293B)
                                        )
                                    )
                                    NavigationBarItem(
                                        icon = { Text("⚡", fontSize = 18.sp) },
                                        label = { Text("Sickw", fontSize = 11.sp) },
                                        selected = selectedTab == 4,
                                        onClick = { selectedTab = 4 },
                                        colors = NavigationBarItemDefaults.colors(
                                            selectedIconColor = Color(0xFF818CF8),
                                            selectedTextColor = Color(0xFF818CF8),
                                            unselectedIconColor = Color.Gray,
                                            unselectedTextColor = Color.Gray,
                                            indicatorColor = Color(0xFF1E293B)
                                        )
                                    )
                                }
                            },
                            containerColor = Color(0xFF0F172A)
                        ) { padding ->
                            Surface(
                                modifier = Modifier
                                    .fillMaxSize()
                                    .padding(padding),
                                color = Color(0xFF0F172A)
                            ) {
                                when (selectedTab) {
                                    0 -> DashboardTab(
                                        token = token,
                                        viewModel = mainViewModel,
                                        onNavigateToTab = { tabIndex -> selectedTab = tabIndex },
                                        onSelectDevice = { dev -> selectedDeviceForDetail = dev },
                                        onOpenAddDevice = { showAddDeviceDialog = true }
                                    )
                                    1 -> InventoryTab(
                                        token = token,
                                        viewModel = mainViewModel,
                                        onSelectDevice = { dev -> selectedDeviceForDetail = dev },
                                        onOpenAddDevice = { showAddDeviceDialog = true }
                                    )
                                    2 -> ShipmentsTab(
                                        token = token,
                                        viewModel = mainViewModel
                                    )
                                    3 -> SalesTab(
                                        token = token,
                                        viewModel = mainViewModel
                                    )
                                    4 -> SickwParserTab(
                                        token = token,
                                        viewModel = mainViewModel,
                                        onDeviceCreated = {
                                            selectedTab = 1
                                        }
                                    )
                                }
                            }
                        }

                        // Add Device Modal
                        if (showAddDeviceDialog) {
                            AddDeviceDialog(
                                onDismiss = { showAddDeviceDialog = false },
                                onSave = { newDevice ->
                                    mainViewModel.createDevice(
                                        token = token,
                                        device = newDevice,
                                        onSuccess = { showAddDeviceDialog = false },
                                        onError = { /* show error */ }
                                    )
                                }
                            )
                        }

                        // Device Detail & Edit Modal
                        selectedDeviceForDetail?.let { device ->
                            DeviceDetailDialog(
                                device = device,
                                onDismiss = { selectedDeviceForDetail = null },
                                onStatusChange = { newStatus ->
                                    mainViewModel.updateDevice(
                                        token = token,
                                        deviceId = device.id,
                                        updates = mapOf("current_status" to newStatus)
                                    ) {
                                        selectedDeviceForDetail = device.copy(currentStatus = newStatus)
                                    }
                                },
                                onDelete = {
                                    mainViewModel.deleteDevice(token, device.id) {
                                        selectedDeviceForDetail = null
                                    }
                                }
                            )
                        }
                    }
                }
            }
        }
    }
}
