package com.imei.inventory

import android.os.Bundle
import androidx.activity.compose.setContent
import androidx.activity.viewModels
import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Bolt
import androidx.compose.material.icons.filled.Dashboard
import androidx.compose.material.icons.filled.LocalShipping
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material.icons.filled.PhoneAndroid
import androidx.compose.material.icons.filled.ReceiptLong
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.fragment.app.FragmentActivity
import com.imei.inventory.data.model.DeviceDto
import com.imei.inventory.data.model.ShipmentDto
import com.imei.inventory.ui.dialogs.AddDeviceDialog
import com.imei.inventory.ui.dialogs.AddShipmentDialog
import com.imei.inventory.ui.dialogs.DeviceDetailDialog
import com.imei.inventory.ui.dialogs.ShipmentDetailDialog
import com.imei.inventory.ui.dialogs.SickwParserDialog
import com.imei.inventory.ui.screens.*
import com.imei.inventory.ui.theme.AppTheme
import com.imei.inventory.viewmodel.AuthViewModel
import com.imei.inventory.viewmodel.MainInventoryViewModel

class MainActivity : FragmentActivity() {
    private val authViewModel: AuthViewModel by viewModels()
    private val mainViewModel: MainInventoryViewModel by viewModels()

    @OptIn(ExperimentalMaterial3Api::class)
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            AppTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    var userToken by remember { mutableStateOf<String?>(null) }
                    var selectedTab by remember { mutableStateOf(0) }
                    var selectedDeviceForDetail by remember { mutableStateOf<DeviceDto?>(null) }
                    var selectedShipmentForDetail by remember { mutableStateOf<ShipmentDto?>(null) }
                    var showAddDeviceDialog by remember { mutableStateOf(false) }
                    var showAddShipmentDialog by remember { mutableStateOf(false) }
                    var showSickwDialog by remember { mutableStateOf(false) }
                    var showTopMenu by remember { mutableStateOf(false) }

                    val isLoading by mainViewModel.isLoading.collectAsState()
                    val devices by mainViewModel.devices.collectAsState()
                    val shipments by mainViewModel.shipments.collectAsState()
                    val users by mainViewModel.users.collectAsState()

                    // Rotation animation for sync button
                    val infiniteTransition = rememberInfiniteTransition(label = "sync_spin")
                    val rotation by infiniteTransition.animateFloat(
                        initialValue = 0f,
                        targetValue = 360f,
                        animationSpec = infiniteRepeatable(
                            animation = tween(800, easing = LinearEasing),
                            repeatMode = RepeatMode.Restart
                        ),
                        label = "spin_angle"
                    )

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
                                        Row(verticalAlignment = Alignment.CenterVertically) {
                                            Surface(
                                                color = MaterialTheme.colorScheme.primary.copy(alpha = 0.15f),
                                                shape = RoundedCornerShape(8.dp),
                                                modifier = Modifier.size(34.dp)
                                            ) {
                                                Box(contentAlignment = Alignment.Center) {
                                                    Icon(
                                                        imageVector = Icons.Default.PhoneAndroid,
                                                        contentDescription = null,
                                                        tint = MaterialTheme.colorScheme.primary,
                                                        modifier = Modifier.size(20.dp)
                                                    )
                                                }
                                            }
                                            Spacer(modifier = Modifier.width(10.dp))
                                            Column {
                                                Text(
                                                    text = "Gadget Deluxe",
                                                    fontWeight = FontWeight.Bold,
                                                    fontSize = 17.sp,
                                                    color = MaterialTheme.colorScheme.onBackground
                                                )
                                                Text(
                                                    text = "Cloud Sync Active",
                                                    fontSize = 11.sp,
                                                    color = Color(0xFF16A34A),
                                                    fontWeight = FontWeight.Medium
                                                )
                                            }
                                        }
                                    },
                                    colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.surface),
                                    actions = {
                                        // Sleek Material Sync Button
                                        IconButton(
                                            onClick = { mainViewModel.loadAllData(token) },
                                            modifier = Modifier
                                                .background(MaterialTheme.colorScheme.surfaceVariant, CircleShape)
                                                .size(36.dp)
                                        ) {
                                            Icon(
                                                imageVector = Icons.Default.Refresh,
                                                contentDescription = "Sync",
                                                tint = MaterialTheme.colorScheme.primary,
                                                modifier = Modifier
                                                    .size(20.dp)
                                                    .rotate(if (isLoading) rotation else 0f)
                                            )
                                        }

                                        Spacer(modifier = Modifier.width(6.dp))

                                        // Vertical 3-Dot Overflow Menu
                                        Box {
                                            IconButton(
                                                onClick = { showTopMenu = true },
                                                modifier = Modifier
                                                    .background(MaterialTheme.colorScheme.surfaceVariant, CircleShape)
                                                    .size(36.dp)
                                            ) {
                                                Icon(
                                                    imageVector = Icons.Default.MoreVert,
                                                    contentDescription = "More Options",
                                                    tint = MaterialTheme.colorScheme.onSurface,
                                                    modifier = Modifier.size(20.dp)
                                                )
                                            }

                                            DropdownMenu(
                                                expanded = showTopMenu,
                                                onDismissRequest = { showTopMenu = false }
                                            ) {
                                                DropdownMenuItem(
                                                    text = { Text("⚡ Sickw IMEI Parser", fontWeight = FontWeight.Medium) },
                                                    onClick = {
                                                        showTopMenu = false
                                                        showSickwDialog = true
                                                    }
                                                )
                                                DropdownMenuItem(
                                                    text = { Text("📦 New Shipment Entry", fontWeight = FontWeight.Medium) },
                                                    onClick = {
                                                        showTopMenu = false
                                                        showAddShipmentDialog = true
                                                    }
                                                )
                                                DropdownMenuItem(
                                                    text = { Text("📱 Add Single Device", fontWeight = FontWeight.Medium) },
                                                    onClick = {
                                                        showTopMenu = false
                                                        showAddDeviceDialog = true
                                                    }
                                                )
                                                DropdownMenuItem(
                                                    text = { Text("🔄 Sync Cloud Data", fontWeight = FontWeight.Medium) },
                                                    onClick = {
                                                        showTopMenu = false
                                                        mainViewModel.loadAllData(token)
                                                    }
                                                )
                                                HorizontalDivider()
                                                DropdownMenuItem(
                                                    text = { Text("🚪 Logout", color = Color(0xFFDC2626), fontWeight = FontWeight.Bold) },
                                                    onClick = {
                                                        showTopMenu = false
                                                        authViewModel.logout()
                                                        mainViewModel.stopRealtimeSync()
                                                        userToken = null
                                                    }
                                                )
                                            }
                                        }

                                        Spacer(modifier = Modifier.width(4.dp))
                                    }
                                )
                            },
                            bottomBar = {
                                NavigationBar(
                                    containerColor = MaterialTheme.colorScheme.surface,
                                    tonalElevation = 6.dp
                                ) {
                                    NavigationBarItem(
                                        icon = { Icon(Icons.Default.Dashboard, contentDescription = "Dashboard", modifier = Modifier.size(22.dp)) },
                                        label = { Text("Dashboard", fontSize = 10.sp, fontWeight = if (selectedTab == 0) FontWeight.Bold else FontWeight.Normal) },
                                        selected = selectedTab == 0,
                                        onClick = { selectedTab = 0 },
                                        colors = NavigationBarItemDefaults.colors(
                                            selectedIconColor = MaterialTheme.colorScheme.primary,
                                            selectedTextColor = MaterialTheme.colorScheme.primary,
                                            unselectedIconColor = MaterialTheme.colorScheme.onSurfaceVariant,
                                            unselectedTextColor = MaterialTheme.colorScheme.onSurfaceVariant,
                                            indicatorColor = MaterialTheme.colorScheme.surfaceVariant
                                        )
                                    )
                                    NavigationBarItem(
                                        icon = { Icon(Icons.Default.PhoneAndroid, contentDescription = "Inventory", modifier = Modifier.size(22.dp)) },
                                        label = { Text("Inventory", fontSize = 10.sp, fontWeight = if (selectedTab == 1) FontWeight.Bold else FontWeight.Normal) },
                                        selected = selectedTab == 1,
                                        onClick = { selectedTab = 1 },
                                        colors = NavigationBarItemDefaults.colors(
                                            selectedIconColor = MaterialTheme.colorScheme.primary,
                                            selectedTextColor = MaterialTheme.colorScheme.primary,
                                            unselectedIconColor = MaterialTheme.colorScheme.onSurfaceVariant,
                                            unselectedTextColor = MaterialTheme.colorScheme.onSurfaceVariant,
                                            indicatorColor = MaterialTheme.colorScheme.surfaceVariant
                                        )
                                    )
                                    NavigationBarItem(
                                        icon = { Icon(Icons.Default.LocalShipping, contentDescription = "Shipments", modifier = Modifier.size(22.dp)) },
                                        label = { Text("Shipments", fontSize = 10.sp, fontWeight = if (selectedTab == 2) FontWeight.Bold else FontWeight.Normal) },
                                        selected = selectedTab == 2,
                                        onClick = { selectedTab = 2 },
                                        colors = NavigationBarItemDefaults.colors(
                                            selectedIconColor = MaterialTheme.colorScheme.primary,
                                            selectedTextColor = MaterialTheme.colorScheme.primary,
                                            unselectedIconColor = MaterialTheme.colorScheme.onSurfaceVariant,
                                            unselectedTextColor = MaterialTheme.colorScheme.onSurfaceVariant,
                                            indicatorColor = MaterialTheme.colorScheme.surfaceVariant
                                        )
                                    )
                                    NavigationBarItem(
                                        icon = { Icon(Icons.Default.ReceiptLong, contentDescription = "Sales", modifier = Modifier.size(22.dp)) },
                                        label = { Text("Sales", fontSize = 10.sp, fontWeight = if (selectedTab == 3) FontWeight.Bold else FontWeight.Normal) },
                                        selected = selectedTab == 3,
                                        onClick = { selectedTab = 3 },
                                        colors = NavigationBarItemDefaults.colors(
                                            selectedIconColor = MaterialTheme.colorScheme.primary,
                                            selectedTextColor = MaterialTheme.colorScheme.primary,
                                            unselectedIconColor = MaterialTheme.colorScheme.onSurfaceVariant,
                                            unselectedTextColor = MaterialTheme.colorScheme.onSurfaceVariant,
                                            indicatorColor = MaterialTheme.colorScheme.surfaceVariant
                                        )
                                    )
                                }
                            },
                            containerColor = MaterialTheme.colorScheme.background
                        ) { padding ->
                            Surface(
                                modifier = Modifier
                                    .fillMaxSize()
                                    .padding(padding),
                                color = MaterialTheme.colorScheme.background
                            ) {
                                when (selectedTab) {
                                    0 -> DashboardTab(
                                        token = token,
                                        viewModel = mainViewModel,
                                        onNavigateToTab = { tabIndex -> selectedTab = tabIndex },
                                        onSelectDevice = { dev -> selectedDeviceForDetail = dev },
                                        onOpenAddDevice = { showAddDeviceDialog = true },
                                        onOpenAddShipment = { showAddShipmentDialog = true }
                                    )
                                    1 -> InventoryTab(
                                        token = token,
                                        viewModel = mainViewModel,
                                        onSelectDevice = { dev -> selectedDeviceForDetail = dev },
                                        onOpenAddDevice = { showAddDeviceDialog = true }
                                    )
                                    2 -> ShipmentsTab(
                                        token = token,
                                        viewModel = mainViewModel,
                                        onSelectShipment = { shipment -> selectedShipmentForDetail = shipment },
                                        onOpenAddShipment = { showAddShipmentDialog = true }
                                    )
                                    3 -> SalesTab(
                                        token = token,
                                        viewModel = mainViewModel
                                    )
                                }
                            }
                        }

                        // Add Shipment Modal (Full Batch Entry like Web App)
                        if (showAddShipmentDialog) {
                            AddShipmentDialog(
                                existingShipments = shipments,
                                onDismiss = { showAddShipmentDialog = false },
                                onSave = { payload ->
                                    mainViewModel.createBatchShipment(
                                        token = token,
                                        payload = payload,
                                        onSuccess = { showAddShipmentDialog = false },
                                        onError = { /* show error */ }
                                    )
                                }
                            )
                        }

                        // Sickw Parser Dialog (Opened from 3-dot overflow menu)
                        if (showSickwDialog) {
                            SickwParserDialog(
                                token = token,
                                viewModel = mainViewModel,
                                onDismiss = { showSickwDialog = false },
                                onDeviceCreated = {
                                    selectedTab = 1
                                }
                            )
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

                        // Shipment Detail & Device Status Edit Modal
                        selectedShipmentForDetail?.let { shipment ->
                            val devicesInShipment = devices.filter { it.currentShipment == shipment.id }
                            ShipmentDetailDialog(
                                shipment = shipment,
                                devicesInShipment = devicesInShipment,
                                onDismiss = { selectedShipmentForDetail = null },
                                onUpdateDeviceStatus = { devId, newStatus ->
                                    mainViewModel.updateDevice(
                                        token = token,
                                        deviceId = devId,
                                        updates = mapOf("current_status" to newStatus),
                                        onSuccess = {}
                                    )
                                },
                                onReceiveAllToInStock = {
                                    devicesInShipment.forEach { dev ->
                                        mainViewModel.updateDevice(
                                            token = token,
                                            deviceId = dev.id,
                                            updates = mapOf("current_status" to "IN_STOCK"),
                                            onSuccess = {}
                                        )
                                    }
                                }
                            )
                        }

                        // Device Detail & Edit Modal
                        selectedDeviceForDetail?.let { device ->
                            DeviceDetailDialog(
                                device = device,
                                users = users,
                                onDismiss = { selectedDeviceForDetail = null },
                                onStatusChange = { newStatus ->
                                    mainViewModel.updateDevice(
                                        token = token,
                                        deviceId = device.id,
                                        updates = mapOf("current_status" to newStatus)
                                    ) {
                                        selectedDeviceForDetail = device.copy(
                                            currentStatus = newStatus,
                                            sellingPrice = if (newStatus != "SOLD") null else device.sellingPrice
                                        )
                                    }
                                },
                                onOwnerChange = { newOwnerId, newOwnerName ->
                                    mainViewModel.updateDevice(
                                        token = token,
                                        deviceId = device.id,
                                        updates = mapOf("current_owner" to newOwnerId)
                                    ) {
                                        selectedDeviceForDetail = device.copy(
                                            currentOwner = newOwnerId,
                                            currentOwnerName = newOwnerName
                                        )
                                    }
                                },
                                onUpdateSpecs = { updates ->
                                    mainViewModel.updateDevice(
                                        token = token,
                                        deviceId = device.id,
                                        updates = updates
                                    ) {
                                        selectedDeviceForDetail = device.copy(
                                            batteryHealth = if (updates.containsKey("battery_health")) updates["battery_health"] as? Int else device.batteryHealth,
                                            batteryCycle = if (updates.containsKey("battery_cycle")) updates["battery_cycle"] as? Int else device.batteryCycle,
                                            capacity = if (updates.containsKey("capacity")) updates["capacity"] as? String else device.capacity,
                                            color = if (updates.containsKey("color")) updates["color"] as? String else device.color,
                                            buyingPrice = if (updates.containsKey("buying_price")) updates["buying_price"] as? Double else device.buyingPrice,
                                            sellingPrice = if (updates.containsKey("selling_price")) updates["selling_price"] as? Double else device.sellingPrice,
                                            currentStatus = if (updates.containsKey("current_status")) (updates["current_status"] as? String) ?: device.currentStatus else device.currentStatus
                                        )
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
