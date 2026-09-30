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
import androidx.compose.material.icons.filled.Inventory2
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

import androidx.compose.material.icons.filled.Badge
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Shield
import com.imei.inventory.data.model.UserDto
import com.imei.inventory.ui.dialogs.ChangePasswordDialog
import com.imei.inventory.ui.dialogs.MarkSoldDialog

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
                    var currentUser by remember { mutableStateOf<UserDto?>(null) }
                    var selectedTab by remember { mutableStateOf(0) }
                    var inventorySubTab by remember { mutableStateOf(0) }
                    var selectedDeviceForDetail by remember { mutableStateOf<DeviceDto?>(null) }
                    var selectedShipmentForDetail by remember { mutableStateOf<ShipmentDto?>(null) }
                    var selectedShipmentForEdit by remember { mutableStateOf<ShipmentDto?>(null) }
                    var deviceForMarkSold by remember { mutableStateOf<DeviceDto?>(null) }
                    var showChangePasswordDialog by remember { mutableStateOf(false) }
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

                    // Dynamic role check
                    val isAdmin = currentUser?.isAdmin ?: (authViewModel.currentUser.value?.isAdmin ?: true)

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
                            onLoginSuccess = { token, user ->
                                userToken = token
                                currentUser = user
                                mainViewModel.setCurrentUser(user)
                                mainViewModel.loadAllData(token)
                            }
                        )
                    } else {
                        val token = userToken!!
                        val drawerState = rememberDrawerState(initialValue = DrawerValue.Closed)
                        
                        // For staff, filter custody devices
                        val myCustodyDevices = remember(devices, currentUser) {
                            if (isAdmin) devices else devices.filter { dev ->
                                dev.currentOwner == currentUser?.id ||
                                dev.currentOwnerName.equals(currentUser?.username, ignoreCase = true) ||
                                (currentUser?.displayName?.isNotBlank() == true && dev.currentOwnerName.equals(currentUser?.displayName, ignoreCase = true))
                            }
                        }
                        val activeCount = remember(myCustodyDevices) { myCustodyDevices.count { !it.currentStatus.equals("SOLD", ignoreCase = true) && !it.isB2B } }
                        val b2bCount = remember(devices) { devices.count { it.isB2B } }
                        val archiveCount = remember(myCustodyDevices) { myCustodyDevices.count { it.currentStatus.equals("SOLD", ignoreCase = true) } }

                        ModalNavigationDrawer(
                            drawerState = drawerState,
                            drawerContent = {
                                ModalDrawerSheet(
                                    drawerContainerColor = MaterialTheme.colorScheme.surface,
                                    drawerTonalElevation = 2.dp,
                                    modifier = Modifier.width(270.dp)
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
                                                            if (isAdmin) MaterialTheme.colorScheme.primary.copy(alpha = 0.14f) else Color(0xFF10B981).copy(alpha = 0.14f),
                                                            MaterialTheme.colorScheme.surface
                                                        )
                                                    )
                                                )
                                                .padding(horizontal = 14.dp, vertical = 12.dp)
                                        ) {
                                            Row(
                                                verticalAlignment = Alignment.CenterVertically,
                                                horizontalArrangement = Arrangement.SpaceBetween,
                                                modifier = Modifier.fillMaxWidth()
                                            ) {
                                                Row(verticalAlignment = Alignment.CenterVertically) {
                                                    Surface(
                                                        color = if (isAdmin) MaterialTheme.colorScheme.primary else Color(0xFF10B981),
                                                        shape = RoundedCornerShape(8.dp),
                                                        modifier = Modifier.size(32.dp)
                                                    ) {
                                                        Box(contentAlignment = Alignment.Center) {
                                                            Icon(
                                                                imageVector = if (isAdmin) Icons.Default.Shield else Icons.Default.Badge,
                                                                contentDescription = null,
                                                                tint = Color.White,
                                                                modifier = Modifier.size(17.dp)
                                                            )
                                                        }
                                                    }
                                                    Spacer(modifier = Modifier.width(9.dp))
                                                    Column {
                                                        Text(
                                                            text = if (isAdmin) "Gadget Deluxe" else (currentUser?.displayName ?: "Staff Member"),
                                                            fontWeight = FontWeight.Bold,
                                                            fontSize = 14.sp,
                                                            color = MaterialTheme.colorScheme.onSurface
                                                        )
                                                        Text(
                                                            text = if (isAdmin) "Enterprise Workspace" else "Staff Custody Portal",
                                                            fontSize = 10.sp,
                                                            color = MaterialTheme.colorScheme.onSurfaceVariant
                                                        )
                                                    }
                                                }
                                                Surface(
                                                    color = (if (isAdmin) Color(0xFF16A34A) else Color(0xFF10B981)).copy(alpha = 0.12f),
                                                    shape = RoundedCornerShape(10.dp)
                                                ) {
                                                    Row(
                                                        verticalAlignment = Alignment.CenterVertically,
                                                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                                    ) {
                                                        Box(
                                                            modifier = Modifier
                                                                .size(5.dp)
                                                                .background(if (isAdmin) Color(0xFF16A34A) else Color(0xFF10B981), CircleShape)
                                                        )
                                                        Spacer(modifier = Modifier.width(4.dp))
                                                        Text(
                                                            text = if (isAdmin) "Admin" else "Staff",
                                                            color = if (isAdmin) Color(0xFF16A34A) else Color(0xFF10B981),
                                                            fontSize = 9.5.sp,
                                                            fontWeight = FontWeight.Bold
                                                        )
                                                    }
                                                }
                                            }
                                        }

                                        HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.08f))

                                        Spacer(modifier = Modifier.height(4.dp))

                                        // Navigation Items Section
                                        Text(
                                            text = if (isAdmin) "WORKSPACE NAVIGATION" else "CUSTODY WORKSPACE",
                                            fontSize = 9.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.65f),
                                            letterSpacing = 0.8.sp,
                                            modifier = Modifier.padding(horizontal = 14.dp, vertical = 2.dp)
                                        )

                                        if (isAdmin) {
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
                                                selected = selectedTab == 1 && inventorySubTab == 0,
                                                badgeText = if (activeCount > 0) "$activeCount" else null,
                                                badgeColor = MaterialTheme.colorScheme.primary,
                                                onClick = {
                                                    selectedTab = 1
                                                    inventorySubTab = 0
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

                                            Spacer(modifier = Modifier.height(3.dp))
                                            HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.08f))
                                            Spacer(modifier = Modifier.height(3.dp))

                                            // Operations & Quick Tools
                                            Text(
                                                text = "OPERATIONS & TOOLS",
                                                fontSize = 9.sp,
                                                fontWeight = FontWeight.Bold,
                                                color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.65f),
                                                letterSpacing = 0.8.sp,
                                                modifier = Modifier.padding(horizontal = 14.dp, vertical = 2.dp)
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
                                                icon = Icons.Default.PhoneAndroid,
                                                label = "B2B Wholesale",
                                                iconTint = Color(0xFF8B5CF6),
                                                selected = selectedTab == 1 && inventorySubTab == 1,
                                                badgeText = if (b2bCount > 0) "$b2bCount" else null,
                                                badgeColor = Color(0xFF8B5CF6),
                                                onClick = {
                                                    selectedTab = 1
                                                    inventorySubTab = 1
                                                    coroutineScope.launch { drawerState.close() }
                                                }
                                            )

                                            CompactDrawerItem(
                                                icon = Icons.Default.Inventory2,
                                                label = "Archive (Sold)",
                                                iconTint = Color(0xFFF59E0B),
                                                selected = selectedTab == 1 && inventorySubTab == 2,
                                                badgeText = if (archiveCount > 0) "$archiveCount" else null,
                                                badgeColor = Color(0xFFF59E0B),
                                                onClick = {
                                                    selectedTab = 1
                                                    inventorySubTab = 2
                                                    coroutineScope.launch { drawerState.close() }
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
                                        } else {
                                            // Staff items
                                            CompactDrawerItem(
                                                icon = Icons.Default.Dashboard,
                                                label = "Custody Dashboard",
                                                selected = selectedTab == 0,
                                                onClick = {
                                                    selectedTab = 0
                                                    coroutineScope.launch { drawerState.close() }
                                                }
                                            )

                                            CompactDrawerItem(
                                                icon = Icons.Default.PhoneAndroid,
                                                label = "Assigned Devices",
                                                selected = selectedTab == 1 && inventorySubTab == 0,
                                                badgeText = if (activeCount > 0) "$activeCount" else null,
                                                badgeColor = Color(0xFF10B981),
                                                onClick = {
                                                    selectedTab = 1
                                                    inventorySubTab = 0
                                                    coroutineScope.launch { drawerState.close() }
                                                }
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
                                                icon = Icons.Default.Inventory2,
                                                label = "Archive (Sold)",
                                                iconTint = Color(0xFFF59E0B),
                                                selected = selectedTab == 1 && inventorySubTab == 2,
                                                badgeText = if (archiveCount > 0) "$archiveCount" else null,
                                                badgeColor = Color(0xFFF59E0B),
                                                onClick = {
                                                    selectedTab = 1
                                                    inventorySubTab = 2
                                                    coroutineScope.launch { drawerState.close() }
                                                }
                                            )
                                        }

                                        Spacer(modifier = Modifier.height(3.dp))
                                        HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.08f))
                                        Spacer(modifier = Modifier.height(3.dp))

                                        // Account Security
                                        Text(
                                            text = "SECURITY & SETTINGS",
                                            fontSize = 9.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.65f),
                                            letterSpacing = 0.8.sp,
                                            modifier = Modifier.padding(horizontal = 14.dp, vertical = 2.dp)
                                        )

                                        CompactDrawerItem(
                                            icon = Icons.Default.Lock,
                                            label = "Change Password",
                                            iconTint = Color(0xFF3B82F6),
                                            onClick = {
                                                coroutineScope.launch { drawerState.close() }
                                                showChangePasswordDialog = true
                                            }
                                        )

                                        // Footer Actions
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
                                                currentUser = null
                                            }
                                        )

                                        Spacer(modifier = Modifier.height(2.dp))
                                        Text(
                                            text = if (isAdmin) "Gadget Deluxe ERP • Admin v1.2.0" else "Gadget Deluxe • Staff Portal v1.2.0",
                                            fontSize = 8.5.sp,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.45f),
                                            modifier = Modifier.padding(horizontal = 14.dp, vertical = 4.dp)
                                        )
                                        Spacer(modifier = Modifier.height(6.dp))
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
                                                    text = if (isAdmin) "Gadget Deluxe" else "Staff Custody",
                                                    fontWeight = FontWeight.Bold,
                                                    fontSize = 16.sp,
                                                    color = MaterialTheme.colorScheme.onBackground
                                                )
                                                Row(verticalAlignment = Alignment.CenterVertically) {
                                                    Box(
                                                        modifier = Modifier
                                                            .size(6.dp)
                                                            .background(if (isAdmin) Color(0xFF16A34A) else Color(0xFF10B981), CircleShape)
                                                    )
                                                    Spacer(modifier = Modifier.width(4.dp))
                                                    Text(
                                                        text = if (isAdmin) {
                                                            when (selectedTab) {
                                                                0 -> "Dashboard Overview"
                                                                1 -> "Inventory Management"
                                                                2 -> "Shipment Batches"
                                                                3 -> "Business Analytics"
                                                                else -> "Cloud Sync Active"
                                                            }
                                                        } else {
                                                            when (selectedTab) {
                                                                0 -> "Custody Overview • ${currentUser?.displayName ?: "Staff"}"
                                                                1 -> "Assigned Device Portfolio"
                                                                else -> "Active Staff Session"
                                                            }
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

                                            if (isAdmin) {
                                                Spacer(modifier = Modifier.width(6.dp))

                                                // + Add Device Quick Button (Admin only)
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
                                            } else {
                                                Spacer(modifier = Modifier.width(6.dp))

                                                // Change Password Button (Staff quick access)
                                                IconButton(
                                                    onClick = { showChangePasswordDialog = true },
                                                    modifier = Modifier
                                                        .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.6f), CircleShape)
                                                        .size(36.dp)
                                                ) {
                                                    Icon(
                                                        imageVector = Icons.Default.Lock,
                                                        contentDescription = "Change Password",
                                                        tint = Color(0xFF3B82F6),
                                                        modifier = Modifier.size(18.dp)
                                                    )
                                                }
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
                                        if (isAdmin) {
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
                                        } else {
                                            // Staff bottom bar
                                            NavigationBarItem(
                                                icon = { Icon(Icons.Default.Dashboard, contentDescription = "Custody", modifier = Modifier.size(20.dp)) },
                                                label = { Text("Custody", fontSize = 10.sp, fontWeight = if (selectedTab == 0) FontWeight.Bold else FontWeight.Normal) },
                                                selected = selectedTab == 0,
                                                onClick = { selectedTab = 0 },
                                                colors = NavigationBarItemDefaults.colors(
                                                    selectedIconColor = Color(0xFF10B981),
                                                    selectedTextColor = Color(0xFF10B981),
                                                    unselectedIconColor = MaterialTheme.colorScheme.onSurfaceVariant,
                                                    unselectedTextColor = MaterialTheme.colorScheme.onSurfaceVariant,
                                                    indicatorColor = Color(0xFF10B981).copy(alpha = 0.12f)
                                                )
                                            )
                                            NavigationBarItem(
                                                icon = { Icon(Icons.Default.PhoneAndroid, contentDescription = "My Devices", modifier = Modifier.size(20.dp)) },
                                                label = { Text("My Devices", fontSize = 10.sp, fontWeight = if (selectedTab == 1 && inventorySubTab == 0) FontWeight.Bold else FontWeight.Normal) },
                                                selected = selectedTab == 1 && inventorySubTab == 0,
                                                onClick = {
                                                    selectedTab = 1
                                                    inventorySubTab = 0
                                                },
                                                colors = NavigationBarItemDefaults.colors(
                                                    selectedIconColor = Color(0xFF10B981),
                                                    selectedTextColor = Color(0xFF10B981),
                                                    unselectedIconColor = MaterialTheme.colorScheme.onSurfaceVariant,
                                                    unselectedTextColor = MaterialTheme.colorScheme.onSurfaceVariant,
                                                    indicatorColor = Color(0xFF10B981).copy(alpha = 0.12f)
                                                )
                                            )
                                            NavigationBarItem(
                                                icon = { Icon(Icons.Default.QrCodeScanner, contentDescription = "Scan QR", modifier = Modifier.size(20.dp)) },
                                                label = { Text("Scan QR", fontSize = 10.sp, fontWeight = FontWeight.Normal) },
                                                selected = false,
                                                onClick = { showScannerDialog = true },
                                                colors = NavigationBarItemDefaults.colors(
                                                    selectedIconColor = MaterialTheme.colorScheme.primary,
                                                    selectedTextColor = MaterialTheme.colorScheme.primary,
                                                    unselectedIconColor = MaterialTheme.colorScheme.onSurfaceVariant,
                                                    unselectedTextColor = MaterialTheme.colorScheme.onSurfaceVariant,
                                                    indicatorColor = MaterialTheme.colorScheme.primary.copy(alpha = 0.12f)
                                                )
                                            )
                                            NavigationBarItem(
                                                icon = { Icon(Icons.Default.Inventory2, contentDescription = "Archive", modifier = Modifier.size(20.dp)) },
                                                label = { Text("Archive", fontSize = 10.sp, fontWeight = if (selectedTab == 1 && inventorySubTab == 2) FontWeight.Bold else FontWeight.Normal) },
                                                selected = selectedTab == 1 && inventorySubTab == 2,
                                                onClick = {
                                                    selectedTab = 1
                                                    inventorySubTab = 2
                                                },
                                                colors = NavigationBarItemDefaults.colors(
                                                    selectedIconColor = Color(0xFFF59E0B),
                                                    selectedTextColor = Color(0xFFF59E0B),
                                                    unselectedIconColor = MaterialTheme.colorScheme.onSurfaceVariant,
                                                    unselectedTextColor = MaterialTheme.colorScheme.onSurfaceVariant,
                                                    indicatorColor = Color(0xFFF59E0B).copy(alpha = 0.12f)
                                                )
                                            )
                                        }
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
                                        0 -> {
                                            if (isAdmin) {
                                                DashboardTab(
                                                    token = token,
                                                    viewModel = mainViewModel,
                                                    onNavigateToTab = { tabIndex -> selectedTab = tabIndex },
                                                    onSelectDevice = { dev -> selectedDeviceForDetail = dev },
                                                    onOpenScanner = { showScannerDialog = true },
                                                    onOpenAddShipment = { showAddShipmentDialog = true }
                                                )
                                            } else {
                                                StaffDashboardTab(
                                                    token = token,
                                                    viewModel = mainViewModel,
                                                    currentUser = currentUser,
                                                    onOpenScanner = { showScannerDialog = true },
                                                    onSelectDevice = { dev -> selectedDeviceForDetail = dev },
                                                    onOpenMarkSold = { dev -> deviceForMarkSold = dev }
                                                )
                                            }
                                        }
                                        1 -> InventoryTab(
                                            token = token,
                                            viewModel = mainViewModel,
                                            initialTab = inventorySubTab,
                                            onSelectDevice = { dev -> selectedDeviceForDetail = dev },
                                            onOpenAddDevice = {
                                                if (isAdmin) {
                                                    scannedImeiForAdd = null
                                                    showAddDeviceDialog = true
                                                }
                                            }
                                        )
                                        2 -> {
                                            if (isAdmin) {
                                                ShipmentsTab(
                                                    token = token,
                                                    viewModel = mainViewModel,
                                                    onSelectShipment = { shipment -> selectedShipmentForDetail = shipment },
                                                    onOpenAddShipment = { showAddShipmentDialog = true }
                                                )
                                            }
                                        }
                                        3 -> {
                                            if (isAdmin) {
                                                AnalyticsTab(
                                                    token = token,
                                                    viewModel = mainViewModel
                                                )
                                            }
                                        }
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
                                        // FOUND -> Open Check-In Dialog (Admin) or Detail Dialog (Staff)
                                        if (isAdmin) {
                                            scannedDeviceForCheckIn = matchedDevice
                                        } else {
                                            selectedDeviceForDetail = matchedDevice
                                        }
                                    } else {
                                        if (isAdmin) {
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
                                initialImei = scannedImeiForAdd,
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

                        // Mark Device as Sold Dialog (Staff flow)
                        deviceForMarkSold?.let { dev ->
                            MarkSoldDialog(
                                device = dev,
                                onDismiss = { deviceForMarkSold = null },
                                onSubmitSale = { sellingPrice, paymentMethod, saleNotes ->
                                    mainViewModel.requestDeviceSale(
                                        token = token,
                                        deviceId = dev.id,
                                        sellingPrice = sellingPrice,
                                        paymentMethod = paymentMethod,
                                        saleNotes = saleNotes,
                                        onSuccess = {
                                            deviceForMarkSold = null
                                        }
                                    )
                                }
                            )
                        }

                        // Change Password Dialog
                        if (showChangePasswordDialog) {
                            ChangePasswordDialog(
                                onDismiss = { showChangePasswordDialog = false },
                                onChangePassword = { oldPassword, newPassword ->
                                    mainViewModel.changePassword(
                                        token = token,
                                        oldPassword = oldPassword,
                                        newPassword = newPassword,
                                        onSuccess = {
                                            showChangePasswordDialog = false
                                        }
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
                                isAdmin = isAdmin,
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
                                },
                                onOpenMarkSold = { dev ->
                                    deviceForMarkSold = dev
                                }
                            )
                        }
                    }
                }
            }
        }
    }
} }
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
        shape = RoundedCornerShape(7.dp),
        color = if (selected) MaterialTheme.colorScheme.primary.copy(alpha = 0.12f) else Color.Transparent,
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 6.dp, vertical = 1.dp)
            .heightIn(min = 34.dp)
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp)
        ) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                tint = iconTint,
                modifier = Modifier.size(16.dp)
            )
            Spacer(modifier = Modifier.width(9.dp))
            Text(
                text = label,
                color = textColor,
                fontSize = 12.5.sp,
                fontWeight = if (selected) FontWeight.Bold else FontWeight.Medium,
                modifier = Modifier.weight(1f)
            )
            if (badgeText != null) {
                Surface(
                    color = if (selected) badgeColor else badgeColor.copy(alpha = 0.14f),
                    shape = RoundedCornerShape(5.dp)
                ) {
                    Text(
                        text = badgeText,
                        color = if (selected) Color.White else badgeColor,
                        fontSize = 9.5.sp,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(horizontal = 5.dp, vertical = 1.5.dp)
                    )
                }
            }
            trailingContent?.invoke()
        }
    }
}


