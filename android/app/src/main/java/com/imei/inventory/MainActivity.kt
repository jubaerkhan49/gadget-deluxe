package com.imei.inventory

import android.os.Bundle
import androidx.activity.compose.setContent
import androidx.activity.viewModels
import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Bolt
import androidx.compose.material.icons.filled.Dashboard
import androidx.compose.material.icons.filled.Insights
import androidx.compose.material.icons.filled.LocalShipping
import androidx.compose.material.icons.filled.Logout
import androidx.compose.material.icons.filled.Menu
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material.icons.filled.PhoneAndroid
import androidx.compose.material.icons.filled.QrCodeScanner
import androidx.compose.material.icons.filled.ReceiptLong
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Sync
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.fragment.app.FragmentActivity
import com.imei.inventory.data.api.ApiClient
import com.imei.inventory.data.model.DeviceDto
import com.imei.inventory.data.model.ShipmentDto
import com.imei.inventory.ui.dialogs.AddDeviceDialog
import com.imei.inventory.ui.dialogs.AddShipmentDialog
import com.imei.inventory.ui.dialogs.CameraBarcodeScannerDialog
import com.imei.inventory.ui.dialogs.DeviceCheckInDialog
import com.imei.inventory.ui.dialogs.DeviceDetailDialog
import com.imei.inventory.ui.dialogs.EditShipmentDialog
import com.imei.inventory.ui.dialogs.SalesDialog
import com.imei.inventory.ui.dialogs.ShipmentDetailDialog
import com.imei.inventory.ui.dialogs.SickwParserDialog
import com.imei.inventory.ui.screens.*
import com.imei.inventory.ui.theme.AppTheme
import com.imei.inventory.viewmodel.AuthViewModel
import com.imei.inventory.viewmodel.MainInventoryViewModel
import kotlinx.coroutines.launch

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
                    var selectedShipmentForEdit by remember { mutableStateOf<ShipmentDto?>(null) }
                    var showAddDeviceDialog by remember { mutableStateOf(false) }
                    var showAddShipmentDialog by remember { mutableStateOf(false) }
                    var showSickwDialog by remember { mutableStateOf(false) }
                    var showSalesDialog by remember { mutableStateOf(false) }
                    var showTopMenu by remember { mutableStateOf(false) }

                    // Barcode / QR Scanner states
                    var showScannerDialog by remember { mutableStateOf(false) }
                    var scannedDeviceForCheckIn by remember { mutableStateOf<DeviceDto?>(null) }
                    var scannedImeiForAdd by remember { mutableStateOf<String?>(null) }

                    val coroutineScope = rememberCoroutineScope()
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
                        val drawerState = rememberDrawerState(initialValue = DrawerValue.Closed)
                        val activeCount = remember(devices) { devices.count { !it.currentStatus.equals("SOLD", ignoreCase = true) } }

                        ModalNavigationDrawer(
                            drawerState = drawerState,
                            drawerContent = {
                                ModalDrawerSheet(
                                    drawerContainerColor = MaterialTheme.colorScheme.surface,
                                    drawerTonalElevation = 2.dp,
                                    modifier = Modifier.width(290.dp)
                                ) {
                                    Column(
                                        modifier = Modifier
                                            .fillMaxSize()
                                            .verticalScroll(rememberScrollState())
                                    ) {
                                        // Compact Minimalist Drawer Header
                                        Column(
                                            modifier = Modifier
                                                .fillMaxWidth()
                                                .background(
                                                    brush = androidx.compose.ui.graphics.Brush.linearGradient(
                                                        colors = listOf(
                                                            MaterialTheme.colorScheme.primary.copy(alpha = 0.12f),
                                                            MaterialTheme.colorScheme.surface
                                                        )
                                                    )
                                                )
                                                .padding(horizontal = 16.dp, vertical = 14.dp)
                                        ) {
                                            Row(
                                                verticalAlignment = Alignment.CenterVertically,
                                                horizontalArrangement = Arrangement.SpaceBetween,
                                                modifier = Modifier.fillMaxWidth()
                                            ) {
                                                Row(verticalAlignment = Alignment.CenterVertically) {
                                                    Surface(
                                                        color = MaterialTheme.colorScheme.primary,
                                                        shape = RoundedCornerShape(10.dp),
                                                        modifier = Modifier.size(34.dp)
                                                    ) {
                                                        Box(contentAlignment = Alignment.Center) {
                                                            Icon(
                                                                imageVector = Icons.Default.PhoneAndroid,
                                                                contentDescription = null,
                                                                tint = Color.White,
                                                                modifier = Modifier.size(18.dp)
                                                            )
                                                        }
                                                    }
                                                    Spacer(modifier = Modifier.width(10.dp))
                                                    Column {
                                                        Text(
                                                            text = "Gadget Deluxe",
                                                            fontWeight = FontWeight.Bold,
                                                            fontSize = 15.sp,
                                                            color = MaterialTheme.colorScheme.onSurface
                                                        )
                                                        Text(
                                                            text = "Admin Enterprise",
                                                            fontSize = 11.sp,
                                                            color = MaterialTheme.colorScheme.onSurfaceVariant
                                                        )
                                                    }
                                                }
                                                Surface(
                                                    color = Color(0xFF16A34A).copy(alpha = 0.12f),
                                                    shape = RoundedCornerShape(12.dp)
                                                ) {
                                                    Row(
                                                        verticalAlignment = Alignment.CenterVertically,
                                                        modifier = Modifier.padding(horizontal = 7.dp, vertical = 3.dp)
                                                    ) {
                                                        Box(
                                                            modifier = Modifier
                                                                .size(5.dp)
                                                                .background(Color(0xFF16A34A), CircleShape)
                                                        )
                                                        Spacer(modifier = Modifier.width(4.dp))
                                                        Text(
                                                            text = "Live",
                                                            color = Color(0xFF16A34A),
                                                            fontSize = 10.sp,
                                                            fontWeight = FontWeight.Bold
                                                        )
                                                    }
                                                }
                                            }
                                        }

                                        HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.12f))

                                        Spacer(modifier = Modifier.height(6.dp))

                                        // Navigation Items Section
                                        Text(
                                            text = "WORKSPACE NAVIGATION",
                                            fontSize = 10.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.65f),
                                            letterSpacing = 0.8.sp,
                                            modifier = Modifier.padding(horizontal = 16.dp, vertical = 4.dp)
                                        )

                                        CompactDrawerItem(
                                            icon = Icons.Default.Dashboard,
                                            label = "Dashboard",
                                            selected = selectedTab == 0,
                                            onClick = {
                                                selectedTab = 0
                                                coroutineScope.launch { drawerState.close() }
                                            }
                                        )

                                        CompactDrawerItem(
                                            icon = Icons.Default.PhoneAndroid,
                                            label = "Inventory",
                                            selected = selectedTab == 1,
                                            badgeText = if (activeCount > 0) "$activeCount" else null,
                                            badgeColor = MaterialTheme.colorScheme.primary,
                                            onClick = {
                                                selectedTab = 1
                                                coroutineScope.launch { drawerState.close() }
                                            }
                                        )

                                        CompactDrawerItem(
                                            icon = Icons.Default.LocalShipping,
                                            label = "Shipments",
                                            selected = selectedTab == 2,
                                            badgeText = if (shipments.isNotEmpty()) "${shipments.size}" else null,
                                            badgeColor = MaterialTheme.colorScheme.primary,
                                            onClick = {
                                                selectedTab = 2
                                                coroutineScope.launch { drawerState.close() }
                                            }
                                        )

                                        CompactDrawerItem(
                                            icon = Icons.Default.Insights,
                                            label = "Analytics",
                                            selected = selectedTab == 3,
                                            onClick = {
                                                selectedTab = 3
                                                coroutineScope.launch { drawerState.close() }
                                            }
                                        )

                                        Spacer(modifier = Modifier.height(6.dp))
                                        HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.12f))
                                        Spacer(modifier = Modifier.height(6.dp))

                                        // Operations & Quick Tools
                                        Text(
                                            text = "OPERATIONS & TOOLS",
                                            fontSize = 10.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.65f),
                                            letterSpacing = 0.8.sp,
                                            modifier = Modifier.padding(horizontal = 16.dp, vertical = 4.dp)
                                        )

                                        CompactDrawerItem(
                                            icon = Icons.Default.QrCodeScanner,
                                            label = "Scan Barcode / QR",
                                            iconTint = MaterialTheme.colorScheme.primary,
                                            onClick = {
                                                coroutineScope.launch { drawerState.close() }
                                                showScannerDialog = true
                                            }
                                        )

                                        CompactDrawerItem(
                                            icon = Icons.Default.ReceiptLong,
                                            label = "Commercial Sales",
                                            iconTint = Color(0xFF10B981),
                                            onClick = {
                                                coroutineScope.launch { drawerState.close() }
                                                showSalesDialog = true
                                            }
                                        )

                                        CompactDrawerItem(
                                            icon = Icons.Default.Bolt,
                                            label = "Sickw IMEI Parser",
                                            iconTint = Color(0xFFF59E0B),
                                            onClick = {
                                                coroutineScope.launch { drawerState.close() }
                                                showSickwDialog = true
                                            }
                                        )

                                        CompactDrawerItem(
                                            icon = Icons.Default.Add,
                                            label = "Add Single Device",
                                            iconTint = Color(0xFF06B6D4),
                                            onClick = {
                                                coroutineScope.launch { drawerState.close() }
                                                scannedImeiForAdd = null
                                                showAddDeviceDialog = true
                                            }
                                        )

                                        CompactDrawerItem(
                                            icon = Icons.Default.LocalShipping,
                                            label = "New Shipment Batch",
                                            iconTint = MaterialTheme.colorScheme.primary,
                                            onClick = {
                                                coroutineScope.launch { drawerState.close() }
                                                showAddShipmentDialog = true
                                            }
                                        )

                                        Spacer(modifier = Modifier.height(6.dp))
                                        HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.12f))
                                        Spacer(modifier = Modifier.height(6.dp))

                                        // Footer Actions
                                        CompactDrawerItem(
                                            icon = Icons.Default.Sync,
                                            label = "Sync Cloud Data",
                                            iconTint = Color(0xFF10B981),
                                            trailingContent = {
                                                if (isLoading) {
                                                    CircularProgressIndicator(
                                                        modifier = Modifier.size(14.dp),
                                                        strokeWidth = 2.dp,
                                                        color = Color(0xFF10B981)
                                                    )
                                                }
                                            },
                                            onClick = {
                                                coroutineScope.launch { drawerState.close() }
                                                mainViewModel.loadAllData(token)
                                            }
                                        )

                                        CompactDrawerItem(
                                            icon = Icons.Default.Logout,
                                            label = "Logout",
                                            iconTint = Color(0xFFEF4444),
                                            textColor = Color(0xFFEF4444),
                                            onClick = {
                                                coroutineScope.launch { drawerState.close() }
                                                authViewModel.logout()
                                                mainViewModel.stopRealtimeSync()
                                                userToken = null
                                            }
                                        )

                                        Spacer(modifier = Modifier.height(4.dp))
                                        Text(
                                            text = "Gadget Deluxe ERP • v1.2.0",
                                            fontSize = 9.sp,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.45f),
                                            modifier = Modifier.padding(horizontal = 16.dp, vertical = 6.dp)
                                        )
                                        Spacer(modifier = Modifier.height(12.dp))
                                    }
                                }
                            }
                        ) {
                            Scaffold(
                                topBar = {
                                    TopAppBar(
                                        navigationIcon = {
                                            IconButton(
                                                onClick = {
                                                    coroutineScope.launch { drawerState.open() }
                                                },
                                                modifier = Modifier
                                                    .padding(start = 6.dp)
                                                    .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.6f), CircleShape)
                                                    .size(38.dp)
                                            ) {
                                                Icon(
                                                    imageVector = Icons.Default.Menu,
                                                    contentDescription = "Menu",
                                                    tint = MaterialTheme.colorScheme.onSurface,
                                                    modifier = Modifier.size(20.dp)
                                                )
                                            }
                                        },
                                        title = {
                                            Column(modifier = Modifier.padding(start = 4.dp)) {
                                                Text(
                                                    text = "Gadget Deluxe",
                                                    fontWeight = FontWeight.Bold,
                                                    fontSize = 16.sp,
                                                    color = MaterialTheme.colorScheme.onBackground
                                                )
                                                Row(verticalAlignment = Alignment.CenterVertically) {
                                                    Box(
                                                        modifier = Modifier
                                                            .size(6.dp)
                                                            .background(Color(0xFF16A34A), CircleShape)
                                                    )
                                                    Spacer(modifier = Modifier.width(4.dp))
                                                    Text(
                                                        text = when (selectedTab) {
                                                            0 -> "Dashboard Overview"
                                                            1 -> "Inventory Management"
                                                            2 -> "Shipment Batches"
                                                            3 -> "Business Analytics"
                                                            else -> "Cloud Sync Active"
                                                        },
                                                        fontSize = 11.sp,
                                                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                                                        fontWeight = FontWeight.Medium
                                                    )
                                                }
                                            }
                                        },
                                        colors = TopAppBarDefaults.topAppBarColors(
                                            containerColor = MaterialTheme.colorScheme.surface,
                                            titleContentColor = MaterialTheme.colorScheme.onSurface
                                        ),
                                        actions = {
                                            // Scanner button
                                            IconButton(
                                                onClick = { showScannerDialog = true },
                                                modifier = Modifier
                                                    .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.6f), CircleShape)
                                                    .size(36.dp)
                                            ) {
                                                Icon(
                                                    imageVector = Icons.Default.QrCodeScanner,
                                                    contentDescription = "Scan QR",
                                                    tint = MaterialTheme.colorScheme.primary,
                                                    modifier = Modifier.size(18.dp)
                                                )
                                            }

                                            Spacer(modifier = Modifier.width(6.dp))

                                            // + Add Device Quick Button
                                            IconButton(
                                                onClick = {
                                                    scannedImeiForAdd = null
                                                    showAddDeviceDialog = true
                                                },
                                                modifier = Modifier
                                                    .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.6f), CircleShape)
                                                    .size(36.dp)
                                            ) {
                                                Icon(
                                                    imageVector = Icons.Default.Add,
                                                    contentDescription = "+ Add Device",
                                                    tint = MaterialTheme.colorScheme.primary,
                                                    modifier = Modifier.size(19.dp)
                                                )
                                            }

                                            Spacer(modifier = Modifier.width(6.dp))

                                            // Sync Button
                                            IconButton(
                                                onClick = { mainViewModel.loadAllData(token) },
                                                modifier = Modifier
                                                    .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.6f), CircleShape)
                                                    .size(36.dp)
                                            ) {
                                                Icon(
                                                    imageVector = Icons.Default.Refresh,
                                                    contentDescription = "Sync",
                                                    tint = MaterialTheme.colorScheme.onSurface,
                                                    modifier = Modifier
                                                        .size(19.dp)
                                                        .rotate(if (isLoading) rotation else 0f)
                                                )
                                            }

                                            Spacer(modifier = Modifier.width(6.dp))
                                        }
                                    )
                                },
                                bottomBar = {
                                    NavigationBar(
                                        containerColor = MaterialTheme.colorScheme.surface,
                                        tonalElevation = 4.dp
                                    ) {
                                        NavigationBarItem(
                                            icon = { Icon(Icons.Default.Dashboard, contentDescription = "Dashboard", modifier = Modifier.size(20.dp)) },
                                            label = { Text("Dashboard", fontSize = 10.sp, fontWeight = if (selectedTab == 0) FontWeight.Bold else FontWeight.Normal) },
                                            selected = selectedTab == 0,
                                            onClick = { selectedTab = 0 },
                                            colors = NavigationBarItemDefaults.colors(
                                                selectedIconColor = MaterialTheme.colorScheme.primary,
                                                selectedTextColor = MaterialTheme.colorScheme.primary,
                                                unselectedIconColor = MaterialTheme.colorScheme.onSurfaceVariant,
                                                unselectedTextColor = MaterialTheme.colorScheme.onSurfaceVariant,
                                                indicatorColor = MaterialTheme.colorScheme.primary.copy(alpha = 0.12f)
                                            )
                                        )
                                        NavigationBarItem(
                                            icon = { Icon(Icons.Default.PhoneAndroid, contentDescription = "Inventory", modifier = Modifier.size(20.dp)) },
                                            label = { Text("Inventory", fontSize = 10.sp, fontWeight = if (selectedTab == 1) FontWeight.Bold else FontWeight.Normal) },
                                            selected = selectedTab == 1,
                                            onClick = { selectedTab = 1 },
                                            colors = NavigationBarItemDefaults.colors(
                                                selectedIconColor = MaterialTheme.colorScheme.primary,
                                                selectedTextColor = MaterialTheme.colorScheme.primary,
                                                unselectedIconColor = MaterialTheme.colorScheme.onSurfaceVariant,
                                                unselectedTextColor = MaterialTheme.colorScheme.onSurfaceVariant,
                                                indicatorColor = MaterialTheme.colorScheme.primary.copy(alpha = 0.12f)
                                            )
                                        )
                                        NavigationBarItem(
                                            icon = { Icon(Icons.Default.LocalShipping, contentDescription = "Shipments", modifier = Modifier.size(20.dp)) },
                                            label = { Text("Shipments", fontSize = 10.sp, fontWeight = if (selectedTab == 2) FontWeight.Bold else FontWeight.Normal) },
                                            selected = selectedTab == 2,
                                            onClick = { selectedTab = 2 },
                                            colors = NavigationBarItemDefaults.colors(
                                                selectedIconColor = MaterialTheme.colorScheme.primary,
                                                selectedTextColor = MaterialTheme.colorScheme.primary,
                                                unselectedIconColor = MaterialTheme.colorScheme.onSurfaceVariant,
                                                unselectedTextColor = MaterialTheme.colorScheme.onSurfaceVariant,
                                                indicatorColor = MaterialTheme.colorScheme.primary.copy(alpha = 0.12f)
                                            )
                                        )
                                        NavigationBarItem(
                                            icon = { Icon(Icons.Default.Insights, contentDescription = "Analytics", modifier = Modifier.size(20.dp)) },
                                            label = { Text("Analytics", fontSize = 10.sp, fontWeight = if (selectedTab == 3) FontWeight.Bold else FontWeight.Normal) },
                                            selected = selectedTab == 3,
                                            onClick = { selectedTab = 3 },
                                            colors = NavigationBarItemDefaults.colors(
                                                selectedIconColor = MaterialTheme.colorScheme.primary,
                                                selectedTextColor = MaterialTheme.colorScheme.primary,
                                                unselectedIconColor = MaterialTheme.colorScheme.onSurfaceVariant,
                                                unselectedTextColor = MaterialTheme.colorScheme.onSurfaceVariant,
                                                indicatorColor = MaterialTheme.colorScheme.primary.copy(alpha = 0.12f)
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
                                            onOpenScanner = { showScannerDialog = true },
                                            onOpenAddShipment = { showAddShipmentDialog = true }
                                        )
                                        1 -> InventoryTab(
                                            token = token,
                                            viewModel = mainViewModel,
                                            onSelectDevice = { dev -> selectedDeviceForDetail = dev },
                                            onOpenAddDevice = {
                                                scannedImeiForAdd = null
                                                showAddDeviceDialog = true
                                            }
                                        )
                                        2 -> ShipmentsTab(
                                            token = token,
                                            viewModel = mainViewModel,
                                            onSelectShipment = { shipment -> selectedShipmentForDetail = shipment },
                                            onOpenAddShipment = { showAddShipmentDialog = true }
                                        )
                                        3 -> AnalyticsTab(
                                            token = token,
                                            viewModel = mainViewModel
                                        )
                                    }
                                }
                            }
                        }

                        // Camera Barcode / QR Scanner Modal
                        if (showScannerDialog) {
                            CameraBarcodeScannerDialog(
                                onDismiss = { showScannerDialog = false },
                                onBarcodeScanned = { result ->
                                    showScannerDialog = false
                                    val cleanImei = result.primaryImei.trim()

                                     // Search in local devices (supports primary IMEI, IMEI2, Serial, or MEID)
                                     val matchedDevice = devices.find { dev ->
                                         dev.imei.equals(cleanImei, ignoreCase = true) ||
                                         dev.imei2?.equals(cleanImei, ignoreCase = true) == true ||
                                         dev.serialNumber?.equals(cleanImei, ignoreCase = true) == true ||
                                         dev.meid?.equals(cleanImei, ignoreCase = true) == true ||
                                         (result.secondaryImei != null && (
                                             dev.imei.equals(result.secondaryImei, ignoreCase = true) ||
                                             dev.imei2?.equals(result.secondaryImei, ignoreCase = true) == true
                                         ))
                                     }

                                    if (matchedDevice != null) {
                                        // FOUND -> Open Check-In Dialog
                                        scannedDeviceForCheckIn = matchedDevice
                                    } else {
                                        // Query backend scan API in case it was created recently
                                        coroutineScope.launch {
                                            try {
                                                val res = ApiClient.apiService.scanCode("Bearer $token", cleanImei)
                                                if (res.isSuccessful && res.body()?.found == true && res.body()?.device != null) {
                                                    scannedDeviceForCheckIn = res.body()?.device
                                                } else {
                                                    // NOT FOUND -> Open Add Device with pre-populated IMEI
                                                    scannedImeiForAdd = cleanImei
                                                    showAddDeviceDialog = true
                                                }
                                            } catch (e: Exception) {
                                                scannedImeiForAdd = cleanImei
                                                showAddDeviceDialog = true
                                            }
                                        }
                                    }
                                }
                            )
                        }

                        // Scanned Device Check-In & In-Stock Update Dialog
                        scannedDeviceForCheckIn?.let { dev ->
                            DeviceCheckInDialog(
                                device = dev,
                                users = users,
                                onDismiss = { scannedDeviceForCheckIn = null },
                                onSaveCheckIn = { updates ->
                                    mainViewModel.updateDevice(
                                        token = token,
                                        deviceId = dev.id,
                                        updates = updates,
                                        onSuccess = {
                                            scannedDeviceForCheckIn = null
                                            mainViewModel.loadAllData(token)
                                        }
                                    )
                                }
                            )
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

                        // Commercial Sales Dialog (Opened from 3-dot overflow menu)
                        if (showSalesDialog) {
                            SalesDialog(
                                token = token,
                                viewModel = mainViewModel,
                                onDismiss = { showSalesDialog = false }
                            )
                        }

                        // Add Device Modal (Supports prefilled IMEI from scanner)
                        if (showAddDeviceDialog) {
                            AddDeviceDialog(
                                initialImei = scannedImeiForAdd ?: "",
                                onDismiss = {
                                    showAddDeviceDialog = false
                                    scannedImeiForAdd = null
                                },
                                onSave = { newDevice ->
                                    mainViewModel.createDevice(
                                        token = token,
                                        device = newDevice,
                                        onSuccess = {
                                            showAddDeviceDialog = false
                                            scannedImeiForAdd = null
                                            mainViewModel.loadAllData(token)
                                        },
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
                                onUpdateDeviceStatus = { devId, newStatus, receiveDate ->
                                    val updates = mutableMapOf<String, Any>("current_status" to newStatus)
                                    if (newStatus == "IN_STOCK" && receiveDate != null) {
                                        updates["received_date_bd"] = receiveDate
                                    }
                                    mainViewModel.updateDevice(
                                        token = token,
                                        deviceId = devId,
                                        updates = updates,
                                        onSuccess = {}
                                    )
                                },
                                onReceiveAllToInStock = { receiveDate ->
                                    val updates = mutableMapOf<String, Any>("current_status" to "IN_STOCK")
                                    if (receiveDate != null) {
                                        updates["received_date_bd"] = receiveDate
                                    }
                                    devicesInShipment.forEach { dev ->
                                        mainViewModel.updateDevice(
                                            token = token,
                                            deviceId = dev.id,
                                            updates = updates,
                                            onSuccess = {}
                                        )
                                    }
                                },
                                onEditShipment = { s ->
                                    selectedShipmentForDetail = null
                                    selectedShipmentForEdit = s
                                },
                                onDeleteShipment = { s ->
                                    selectedShipmentForDetail = null
                                    mainViewModel.deleteShipment(token, s.id)
                                }
                            )
                        }

                        // Edit Shipment Modal
                        selectedShipmentForEdit?.let { shipment ->
                            EditShipmentDialog(
                                shipment = shipment,
                                onDismiss = { selectedShipmentForEdit = null },
                                onSave = { updates ->
                                    mainViewModel.updateShipment(
                                        token = token,
                                        shipmentId = shipment.id,
                                        updates = updates,
                                        onSuccess = { selectedShipmentForEdit = null }
                                    )
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

@Composable
private fun CompactDrawerItem(
    icon: ImageVector,
    label: String,
    selected: Boolean = false,
    iconTint: Color = if (selected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant,
    textColor: Color = if (selected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurface,
    badgeText: String? = null,
    badgeColor: Color = MaterialTheme.colorScheme.primary,
    trailingContent: (@Composable () -> Unit)? = null,
    onClick: () -> Unit
) {
    Surface(
        onClick = onClick,
        shape = RoundedCornerShape(8.dp),
        color = if (selected) MaterialTheme.colorScheme.primary.copy(alpha = 0.12f) else Color.Transparent,
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 10.dp, vertical = 2.dp)
            .heightIn(min = 38.dp)
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp)
        ) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                tint = iconTint,
                modifier = Modifier.size(18.dp)
            )
            Spacer(modifier = Modifier.width(12.dp))
            Text(
                text = label,
                color = textColor,
                fontSize = 13.sp,
                fontWeight = if (selected) FontWeight.Bold else FontWeight.Medium,
                modifier = Modifier.weight(1f)
            )
            if (badgeText != null) {
                Surface(
                    color = if (selected) badgeColor else badgeColor.copy(alpha = 0.15f),
                    shape = RoundedCornerShape(6.dp)
                ) {
                    Text(
                        text = badgeText,
                        color = if (selected) Color.White else badgeColor,
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                    )
                }
            }
            trailingContent?.invoke()
        }
    }
}

