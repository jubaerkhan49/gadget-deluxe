package com.imei.inventory

import android.os.Bundle
import android.widget.Toast
import androidx.activity.compose.BackHandler
import androidx.activity.compose.setContent
import androidx.activity.viewModels
import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.selection.selectableGroup
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
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
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
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
import com.imei.inventory.ui.screens.ShipmentDetailScreen
import com.imei.inventory.ui.dialogs.SickwParserDialog
import com.imei.inventory.ui.screens.*
import com.imei.inventory.ui.screens.calculateDaysAgo
import java.util.Calendar
import com.imei.inventory.ui.theme.*
import com.imei.inventory.viewmodel.AuthViewModel
import com.imei.inventory.viewmodel.MainInventoryViewModel
import kotlinx.coroutines.launch

import android.os.Build
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.material.icons.filled.Badge
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.NotificationsActive
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Shield
import com.imei.inventory.data.model.DeviceSaleRequestDto
import com.imei.inventory.data.model.UserDto
import com.imei.inventory.ui.dialogs.AdminSaleApprovalDialog
import com.imei.inventory.ui.dialogs.ChangePasswordDialog
import com.imei.inventory.ui.dialogs.MarkSoldDialog
import com.imei.inventory.util.NotificationHelper
import com.google.firebase.messaging.FirebaseMessaging
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers

class MainActivity : FragmentActivity() {
    private val authViewModel: AuthViewModel by viewModels()
    private val mainViewModel: MainInventoryViewModel by viewModels()
    private val pendingIntentState = mutableStateOf<android.content.Intent?>(null)

    override fun onResume() {
        super.onResume()
        // Resume polling only when app is actively visible in foreground
        val prefs = com.imei.inventory.util.PreferencesManager(this)
        val token = prefs.getSavedToken()
        if (!token.isNullOrBlank()) {
            mainViewModel.startRealtimeSync(token, this)
            syncFcmTokenWithBackend(token)
        }
    }

    override fun onPause() {
        super.onPause()
        // Instantly stop all polling when app is minimized, locked, or backgrounded so Neon can sleep
        mainViewModel.stopRealtimeSync()
    }

    override fun onNewIntent(intent: android.content.Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        pendingIntentState.value = intent
    }

    fun syncFcmTokenWithBackend(authToken: String) {
        FirebaseMessaging.getInstance().token.addOnCompleteListener { task ->
            if (task.isSuccessful) {
                val fcmToken = task.result
                if (!fcmToken.isNullOrBlank()) {
                    val prefs = com.imei.inventory.util.PreferencesManager(this)
                    prefs.saveFcmToken(fcmToken)
                    CoroutineScope(Dispatchers.IO).launch {
                        try {
                            val resp = ApiClient.apiService.registerFcmToken(
                                "Bearer $authToken",
                                mapOf("token" to fcmToken, "device_type" to "android")
                            )
                            if (resp.isSuccessful) {
                                android.util.Log.d("FCM", "Successfully synced FCM token with backend server: ${resp.body()}")
                            } else {
                                android.util.Log.w("FCM", "Backend rejected FCM token registration: ${resp.code()} - ${resp.errorBody()?.string()}")
                            }
                        } catch (e: Exception) {
                            android.util.Log.e("FCM", "Failed to sync FCM token with backend: ${e.message}")
                        }
                    }
                }
            }
        }
    }

    @OptIn(ExperimentalMaterial3Api::class)
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        NotificationHelper.createNotificationChannel(this)
        pendingIntentState.value = intent
        setContent {
            AppTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    val coroutineScope = rememberCoroutineScope()
                    val context = LocalContext.current
                    val prefsManager = remember { com.imei.inventory.util.PreferencesManager(context) }

                    // Persistent Session: Initialize directly from saved preferences if available
                    var userToken by remember { mutableStateOf<String?>(prefsManager.getSavedToken()) }
                    var currentUser by remember { mutableStateOf<UserDto?>(prefsManager.getSavedUser()) }
                    var selectedTab by remember { mutableStateOf(0) }
                    var inventorySubTab by remember { mutableStateOf(0) }
                    var selectedDeviceForDetail by remember { mutableStateOf<DeviceDto?>(null) }
                    var selectedShipmentForDetail by remember { mutableStateOf<ShipmentDto?>(null) }
                    var selectedShipmentForEdit by remember { mutableStateOf<ShipmentDto?>(null) }
                    var deviceForMarkSold by remember { mutableStateOf<DeviceDto?>(null) }
                    var selectedSaleRequestForApproval by remember { mutableStateOf<DeviceSaleRequestDto?>(null) }
                    var showChangePasswordDialog by remember { mutableStateOf(false) }
                    var showAddDeviceDialog by remember { mutableStateOf(false) }
                    var showAddShipmentDialog by remember { mutableStateOf(false) }
                    var showSickwDialog by remember { mutableStateOf(false) }
                    var showTopMenu by remember { mutableStateOf(false) }

                    // Barcode / QR Scanner states
                    var showScannerDialog by remember { mutableStateOf(false) }
                    var scannedDeviceForCheckIn by remember { mutableStateOf<DeviceDto?>(null) }
                    var scannedImeiForAdd by remember { mutableStateOf<String?>(null) }

                    val isLoading by mainViewModel.isLoading.collectAsState()
                    val devices by mainViewModel.devices.collectAsState()
                    val shipments by mainViewModel.shipments.collectAsState()
                    val users by mainViewModel.users.collectAsState()
                    val pendingSaleRequests by mainViewModel.pendingSaleRequests.collectAsState()
                    val sales by mainViewModel.sales.collectAsState()

                    // Auto-restore & verify session on app startup (instantly loads local cache)
                    LaunchedEffect(Unit) {
                        mainViewModel.initCache(context)
                        val savedToken = prefsManager.getSavedToken()
                        val savedUser = prefsManager.getSavedUser()
                        if (!savedToken.isNullOrBlank() && savedUser != null) {
                            userToken = savedToken
                            currentUser = savedUser
                            mainViewModel.setCurrentUser(savedUser)
                            mainViewModel.loadAllData(savedToken, context)
                            authViewModel.setCurrentUser(savedUser)
                            syncFcmTokenWithBackend(savedToken)

                            authViewModel.verifyOrRefreshSession(context) { validToken, refreshedUser ->
                                if (validToken != null && refreshedUser != null) {
                                    userToken = validToken
                                    currentUser = refreshedUser
                                    mainViewModel.setCurrentUser(refreshedUser)
                                    syncFcmTokenWithBackend(validToken)
                                }
                            }
                        }
                    }

                    // Notification permission launcher for Android 13+ (API 33)
                    val permissionLauncher = rememberLauncherForActivityResult(
                        contract = ActivityResultContracts.RequestPermission()
                    ) { /* granted handled silently */ }

                    LaunchedEffect(Unit) {
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                            permissionLauncher.launch(android.Manifest.permission.POST_NOTIFICATIONS)
                        }
                    }

                    // Handle system notification click Intent (supports cold start & onNewIntent background click)
                    LaunchedEffect(pendingIntentState.value, pendingSaleRequests) {
                        val current = pendingIntentState.value ?: intent
                        val reqId = current?.getIntExtra(NotificationHelper.EXTRA_SALE_REQ_ID, 0) ?: 0
                        if (reqId > 0) {
                            if (pendingSaleRequests.isNotEmpty()) {
                                val targetReq = pendingSaleRequests.find { it.id == reqId }
                                if (targetReq != null) {
                                    selectedSaleRequestForApproval = targetReq
                                    current.removeExtra(NotificationHelper.EXTRA_SALE_REQ_ID)
                                    intent?.removeExtra(NotificationHelper.EXTRA_SALE_REQ_ID)
                                    pendingIntentState.value = null
                                }
                            } else if (!userToken.isNullOrBlank()) {
                                mainViewModel.fetchPendingSaleRequests(userToken!!)
                            }
                        }
                    }

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
                                mainViewModel.loadAllData(token, context)
                                syncFcmTokenWithBackend(token)
                            }
                        )
                    } else {
                        val token = userToken!!
                        val drawerState = rememberDrawerState(initialValue = DrawerValue.Closed)
                        
                        // For staff, filter custody devices
                        val myCustodyDevices = remember(devices, currentUser) {
                            val user = currentUser
                            if (isAdmin) devices else devices.filter { dev ->
                                dev.currentOwner == user?.id ||
                                dev.currentOwnerName.equals(user?.username, ignoreCase = true) ||
                                (user?.displayName?.isNotBlank() == true && dev.currentOwnerName.equals(user?.displayName, ignoreCase = true))
                            }
                        }
                        val activeCount = remember(myCustodyDevices) { myCustodyDevices.count { !it.currentStatus.equals("SOLD", ignoreCase = true) && !it.isB2B } }
                        val b2bCount = remember(devices) { devices.count { it.isB2B } }
                        val archiveCount = remember(myCustodyDevices) { myCustodyDevices.count { it.currentStatus.equals("SOLD", ignoreCase = true) } }

                        // Automated rules alert count for staff notifications
                        val staffAlertCount = remember(devices, sales, currentUser, isAdmin) {
                            val user = currentUser
                            if (isAdmin) 0 else {
                                val myDevs = devices.filter { dev ->
                                    val matchId = dev.currentOwner != null && user?.id != null && dev.currentOwner == user.id
                                    val matchName = !dev.currentOwnerName.isNullOrBlank() && (
                                        (user?.username != null && dev.currentOwnerName.equals(user.username, ignoreCase = true)) ||
                                        (user?.displayName != null && dev.currentOwnerName.equals(user.displayName, ignoreCase = true))
                                    )
                                    (matchId || matchName) && !dev.isB2B && !dev.currentStatus.equals("SOLD", ignoreCase = true)
                                }
                                val staleCount = myDevs.count { dev ->
                                    (calculateDaysAgo(getDeviceAssignedDateStr(dev, user)) ?: 0L) >= 7L
                                }
                                val mySales = sales.filter { sale ->
                                    (user?.username != null && sale.soldBy?.equals(user.username, ignoreCase = true) == true) ||
                                    (user?.username != null && sale.sellerName?.equals(user.username, ignoreCase = true) == true) ||
                                    (user?.displayName != null && sale.sellerName?.equals(user.displayName, ignoreCase = true) == true)
                                }
                                val latestSale = mySales.maxByOrNull { it.createdAt ?: "" }
                                val daysSinceLastSale = calculateDaysAgo(latestSale?.createdAt)
                                val inactivityAlert = if (daysSinceLastSale != null && daysSinceLastSale >= 3L) 1 else if (mySales.isEmpty() && myDevs.isNotEmpty() && (myDevs.mapNotNull { calculateDaysAgo(getDeviceAssignedDateStr(it, user)) }.maxOrNull() ?: 0L) >= 3L) 1 else 0

                                val cal = Calendar.getInstance()
                                val curYr = cal.get(Calendar.YEAR)
                                val curMo = cal.get(Calendar.MONTH) + 1
                                val curMonthSales = mySales.count { sale ->
                                    val sDate = sale.createdAt
                                    if (!sDate.isNullOrBlank() && sDate.length >= 7) {
                                        try {
                                            val parts = sDate.substring(0, 7).split("-")
                                            parts[0].toIntOrNull() == curYr && parts[1].toIntOrNull() == curMo
                                        } catch (_: Exception) { false }
                                    } else false
                                }
                                val targetAlert = if (curMonthSales < 15) 1 else 0

                                staleCount + inactivityAlert + targetAlert
                            }
                        }

                        // Intercept Back button: Close drawer, close shipment detail, or return to Dashboard (tab 0)
                        BackHandler(enabled = drawerState.isOpen || selectedShipmentForDetail != null || selectedTab != 0) {
                            if (drawerState.isOpen) {
                                coroutineScope.launch { drawerState.close() }
                            } else if (selectedShipmentForDetail != null) {
                                selectedShipmentForDetail = null
                            } else if (selectedTab != 0) {
                                selectedTab = 0
                                inventorySubTab = 0
                            }
                        }

                        AnimatedContent(
                            targetState = selectedShipmentForDetail,
                            transitionSpec = {
                                if (targetState != null) {
                                    (slideInHorizontally(animationSpec = tween(200, easing = FastOutSlowInEasing)) { width -> width / 4 } + fadeIn(animationSpec = tween(180, easing = FastOutSlowInEasing)))
                                        .togetherWith(slideOutHorizontally(animationSpec = tween(150, easing = FastOutLinearInEasing)) { width -> -width / 6 } + fadeOut(animationSpec = tween(130)))
                                } else {
                                    (slideInHorizontally(animationSpec = tween(180, easing = FastOutSlowInEasing)) { width -> -width / 6 } + fadeIn(animationSpec = tween(160, easing = FastOutSlowInEasing)))
                                        .togetherWith(slideOutHorizontally(animationSpec = tween(150, easing = FastOutLinearInEasing)) { width -> width / 4 } + fadeOut(animationSpec = tween(130)))
                                }
                            },
                            label = "ShipmentDetailFullPageTransition"
                        ) { activeShipment ->
                            if (activeShipment != null) {
                                val devicesInShipment = devices.filter { it.currentShipment == activeShipment.id }
                                ShipmentDetailScreen(
                                    shipment = activeShipment,
                                    devicesInShipment = devicesInShipment,
                                    onBack = { selectedShipmentForDetail = null },
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
                                        selectedShipmentForEdit = s
                                    },
                                    onDeleteShipment = { s ->
                                        selectedShipmentForDetail = null
                                        mainViewModel.deleteShipment(token, s.id)
                                    }
                                )
                            } else {
                                ModalNavigationDrawer(
                                    drawerState = drawerState,
                            drawerContent = {
                                ModalDrawerSheet(
                                    drawerContainerColor = MaterialTheme.colorScheme.surfaceContainerLow,
                                    drawerTonalElevation = 0.dp,
                                    drawerShape = RoundedCornerShape(0.dp),
                                    modifier = Modifier.width(280.dp)
                                ) {
                                    Column(
                                        modifier = Modifier
                                            .fillMaxSize()
                                            .verticalScroll(rememberScrollState())
                                    ) {
                                        // Material 3 Expressive Drawer Header
                                        Column(
                                            modifier = Modifier
                                                .fillMaxWidth()
                                                .background(
                                                    brush = androidx.compose.ui.graphics.Brush.linearGradient(
                                                        colors = listOf(
                                                            if (isAdmin) MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.5f) else Color(0x2210B981),
                                                            MaterialTheme.colorScheme.surfaceContainerLow
                                                        )
                                                    )
                                                )
                                                .padding(horizontal = 16.dp, vertical = 16.dp)
                                        ) {
                                            Row(
                                                verticalAlignment = Alignment.CenterVertically,
                                                horizontalArrangement = Arrangement.SpaceBetween,
                                                modifier = Modifier.fillMaxWidth()
                                            ) {
                                                Row(verticalAlignment = Alignment.CenterVertically) {
                                                    Surface(
                                                        color = if (isAdmin) MaterialTheme.colorScheme.primary else Color(0xFF10B981),
                                                        shape = RoundedCornerShape(12.dp),
                                                        modifier = Modifier.size(36.dp)
                                                    ) {
                                                        Box(contentAlignment = Alignment.Center) {
                                                            Icon(
                                                                imageVector = if (isAdmin) Icons.Default.Shield else Icons.Default.Badge,
                                                                contentDescription = null,
                                                                tint = Color.White,
                                                                modifier = Modifier.size(19.dp)
                                                            )
                                                        }
                                                    }
                                                    Spacer(modifier = Modifier.width(10.dp))
                                                    Column {
                                                        Text(
                                                            text = if (isAdmin) "Gadget Deluxe" else (currentUser?.displayName ?: "Staff Member"),
                                                            fontWeight = FontWeight.ExtraBold,
                                                            fontSize = 15.sp,
                                                            color = MaterialTheme.colorScheme.onSurface
                                                        )
                                                        Text(
                                                            text = if (isAdmin) "Enterprise Workspace" else "Staff Custody Portal",
                                                            fontSize = 10.5.sp,
                                                            color = MaterialTheme.colorScheme.onSurfaceVariant
                                                        )
                                                    }
                                                }
                                                Surface(
                                                    color = (if (isAdmin) Color(0xFF16A34A) else Color(0xFF10B981)).copy(alpha = 0.15f),
                                                    shape = RoundedCornerShape(percent = 50)
                                                ) {
                                                    Row(
                                                        verticalAlignment = Alignment.CenterVertically,
                                                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
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
                                                            fontSize = 10.sp,
                                                            fontWeight = FontWeight.Bold
                                                        )
                                                    }
                                                }
                                            }
                                        }

                                        HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.35f))

                                        Spacer(modifier = Modifier.height(6.dp))

                                        // Navigation Items Section
                                        Text(
                                            text = if (isAdmin) "WORKSPACE NAVIGATION" else "CUSTODY WORKSPACE",
                                            fontSize = 9.5.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.75f),
                                            letterSpacing = 0.8.sp,
                                            modifier = Modifier.padding(horizontal = 16.dp, vertical = 4.dp)
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
                                                onClick = {
                                                    coroutineScope.launch { drawerState.close() }
                                                    showScannerDialog = true
                                                }
                                            )

                                            CompactDrawerItem(
                                                icon = Icons.Default.ReceiptLong,
                                                label = "Commercial Sales",
                                                selected = selectedTab == 5,
                                                badgeText = if (sales.isNotEmpty()) "${sales.size}" else null,
                                                onClick = {
                                                    coroutineScope.launch { drawerState.close() }
                                                    selectedTab = 5
                                                }
                                            )

                                            CompactDrawerItem(
                                                icon = Icons.Default.PhoneAndroid,
                                                label = "B2B Wholesale",
                                                selected = selectedTab == 1 && inventorySubTab == 1,
                                                badgeText = if (b2bCount > 0) "$b2bCount" else null,
                                                badgeColor = MaterialTheme.colorScheme.primary,
                                                onClick = {
                                                    selectedTab = 1
                                                    inventorySubTab = 1
                                                    coroutineScope.launch { drawerState.close() }
                                                }
                                            )

                                            CompactDrawerItem(
                                                icon = Icons.Default.Inventory2,
                                                label = "Archive (Sold)",
                                                selected = selectedTab == 1 && inventorySubTab == 2,
                                                badgeText = if (archiveCount > 0) "$archiveCount" else null,
                                                badgeColor = MaterialTheme.colorScheme.primary,
                                                onClick = {
                                                    selectedTab = 1
                                                    inventorySubTab = 2
                                                    coroutineScope.launch { drawerState.close() }
                                                }
                                            )
                                        } else {
                                            // Staff items: Custody Dashboard, Sales Analytics, and Notifications
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
                                                icon = Icons.Default.Insights,
                                                label = "Sales Analytics",
                                                selected = selectedTab == 6,
                                                onClick = {
                                                    selectedTab = 6
                                                    coroutineScope.launch { drawerState.close() }
                                                }
                                            )

                                            CompactDrawerItem(
                                                icon = Icons.Default.Notifications,
                                                label = "Notifications",
                                                selected = selectedTab == 4,
                                                badgeText = if (staffAlertCount > 0) "$staffAlertCount" else null,
                                                badgeColor = AccentRose,
                                                iconTint = if (staffAlertCount > 0) AccentRose else MaterialTheme.colorScheme.onSurfaceVariant,
                                                onClick = {
                                                    selectedTab = 4
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
                                            onClick = {
                                                coroutineScope.launch { drawerState.close() }
                                                showChangePasswordDialog = true
                                            }
                                        )

                                        // Footer Actions
                                        CompactDrawerItem(
                                            icon = Icons.Default.Logout,
                                            label = "Logout",
                                            iconTint = AccentRose,
                                            textColor = AccentRose,
                                            onClick = {
                                                coroutineScope.launch { drawerState.close() }
                                                prefsManager.clearCredentials()
                                                mainViewModel.clearLocalCache()
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
                                    BackHandler(enabled = selectedTab == 5) {
                                        selectedTab = 0
                                    }

                                    TopAppBar(
                                        navigationIcon = {
                                            val isBackNeeded = selectedTab == 5
                                            IconButton(
                                                onClick = {
                                                    if (isBackNeeded) {
                                                        selectedTab = 0
                                                    } else {
                                                        coroutineScope.launch { drawerState.open() }
                                                    }
                                                },
                                                colors = IconButtonDefaults.iconButtonColors(
                                                    containerColor = Color.Transparent,
                                                    contentColor = MaterialTheme.colorScheme.onSurface
                                                )
                                            ) {
                                                Icon(
                                                    imageVector = if (isBackNeeded) Icons.AutoMirrored.Filled.ArrowBack else Icons.Default.Menu,
                                                    contentDescription = if (isBackNeeded) "Back to Dashboard" else "Navigation Menu",
                                                    tint = MaterialTheme.colorScheme.onSurface,
                                                    modifier = Modifier.size(24.dp)
                                                )
                                            }
                                        },
                                        title = {
                                            Column(modifier = Modifier.padding(start = 2.dp)) {
                                                val topTitle = if (isAdmin) {
                                                    when (selectedTab) {
                                                        1 -> "Inventory"
                                                        2 -> "Shipments"
                                                        3 -> "Analytics"
                                                        5 -> "Commercial Sales"
                                                        else -> "Gadget Deluxe"
                                                    }
                                                } else {
                                                    when (selectedTab) {
                                                        0 -> "Custody"
                                                        6 -> "Analytics"
                                                        4 -> "Alerts"
                                                        else -> "Custody"
                                                    }
                                                }

                                                val topSubtitle = if (isAdmin) {
                                                    when (selectedTab) {
                                                        0 -> "Dashboard Overview"
                                                        1 -> "Device Inventory Management"
                                                        2 -> "Shipment Batches"
                                                        3 -> "Business Analytics"
                                                        5 -> "Commercial Sales & Analytics"
                                                        else -> "Cloud Sync Active"
                                                    }
                                                } else {
                                                    when (selectedTab) {
                                                        0 -> currentUser?.displayName ?: (currentUser?.username ?: "Staff Custody Portal")
                                                        6 -> "Sales Performance & History"
                                                        4 -> "Notifications & Alerts"
                                                        else -> currentUser?.displayName ?: "Online"
                                                    }
                                                }

                                                Text(
                                                    text = topTitle,
                                                    fontWeight = FontWeight.ExtraBold,
                                                    fontSize = 17.sp,
                                                    color = MaterialTheme.colorScheme.onBackground,
                                                    maxLines = 1
                                                )
                                                Row(verticalAlignment = Alignment.CenterVertically) {
                                                    Box(
                                                        modifier = Modifier
                                                            .size(6.dp)
                                                            .background(AccentEmerald, CircleShape)
                                                    )
                                                    Spacer(modifier = Modifier.width(5.dp))
                                                    Text(
                                                        text = topSubtitle,
                                                        fontSize = 11.5.sp,
                                                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                                                        fontWeight = FontWeight.Medium,
                                                        maxLines = 1,
                                                        overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis
                                                    )
                                                }
                                            }
                                        },
                                        colors = TopAppBarDefaults.topAppBarColors(
                                            containerColor = MaterialTheme.colorScheme.surface,
                                            titleContentColor = MaterialTheme.colorScheme.onSurface
                                        ),
                                        actions = {
                                            if (isAdmin) {
                                                // Sale Approval Notification Bell with Badge
                                                IconButton(
                                                    onClick = {
                                                        if (pendingSaleRequests.isNotEmpty()) {
                                                            selectedSaleRequestForApproval = pendingSaleRequests.first()
                                                        } else {
                                                            Toast.makeText(context, "No pending sale approval requests", Toast.LENGTH_SHORT).show()
                                                        }
                                                    }
                                                ) {
                                                    BadgedBox(
                                                        badge = {
                                                            if (pendingSaleRequests.isNotEmpty()) {
                                                                Badge(
                                                                    containerColor = AccentRose,
                                                                    contentColor = Color.White
                                                                ) {
                                                                    Text(
                                                                        text = "${pendingSaleRequests.size}",
                                                                        fontSize = 10.sp,
                                                                        fontWeight = FontWeight.Bold
                                                                    )
                                                                }
                                                            }
                                                        }
                                                    ) {
                                                        Icon(
                                                            imageVector = if (pendingSaleRequests.isNotEmpty()) Icons.Default.NotificationsActive else Icons.Default.Notifications,
                                                            contentDescription = "Sale Approvals",
                                                            tint = if (pendingSaleRequests.isNotEmpty()) AccentAmber else MaterialTheme.colorScheme.onSurfaceVariant,
                                                            modifier = Modifier.size(20.dp)
                                                        )
                                                    }
                                                }
                                            }

                                            if (!isAdmin) {
                                                // Staff Notification Bell with Badge
                                                IconButton(
                                                    onClick = {
                                                        selectedTab = if (selectedTab == 4) 0 else 4
                                                    }
                                                ) {
                                                    BadgedBox(
                                                        badge = {
                                                            if (staffAlertCount > 0) {
                                                                Badge(
                                                                    containerColor = AccentRose,
                                                                    contentColor = Color.White
                                                                ) {
                                                                    Text(
                                                                        text = "$staffAlertCount",
                                                                        fontSize = 10.sp,
                                                                        fontWeight = FontWeight.Bold
                                                                    )
                                                                }
                                                            }
                                                        }
                                                    ) {
                                                        Icon(
                                                            imageVector = if (staffAlertCount > 0) Icons.Default.NotificationsActive else Icons.Default.Notifications,
                                                            contentDescription = "Notifications",
                                                            tint = if (selectedTab == 4) MaterialTheme.colorScheme.primary
                                                            else if (staffAlertCount > 0) AccentRose
                                                            else MaterialTheme.colorScheme.onSurfaceVariant,
                                                            modifier = Modifier.size(20.dp)
                                                        )
                                                    }
                                                }
                                            }

                                            // Scanner button
                                            IconButton(onClick = { showScannerDialog = true }) {
                                                Icon(
                                                    imageVector = Icons.Default.QrCodeScanner,
                                                    contentDescription = "Scan QR",
                                                    tint = MaterialTheme.colorScheme.primary,
                                                    modifier = Modifier.size(20.dp)
                                                )
                                            }

                                            if (!isAdmin) {
                                                // Change Password Button (Staff quick access)
                                                IconButton(onClick = { showChangePasswordDialog = true }) {
                                                    Icon(
                                                        imageVector = Icons.Default.Lock,
                                                        contentDescription = "Change Password",
                                                        tint = MaterialTheme.colorScheme.primary,
                                                        modifier = Modifier.size(20.dp)
                                                    )
                                                }
                                            }

                                            // Sync Button
                                            IconButton(onClick = { mainViewModel.loadAllData(token, context) }) {
                                                Icon(
                                                    imageVector = Icons.Default.Refresh,
                                                    contentDescription = "Sync",
                                                    tint = MaterialTheme.colorScheme.onSurface,
                                                    modifier = Modifier
                                                        .size(20.dp)
                                                        .rotate(if (isLoading) rotation else 0f)
                                                )
                                            }
                                        }
                                    )
                                },
                                bottomBar = {
                                    Surface(
                                        color = MaterialTheme.colorScheme.surfaceContainer,
                                        tonalElevation = 0.dp,
                                        modifier = Modifier.fillMaxWidth()
                                    ) {
                                        Row(
                                            modifier = Modifier
                                                .fillMaxWidth()
                                                .windowInsetsPadding(NavigationBarDefaults.windowInsets)
                                                .height(54.dp)
                                                .selectableGroup(),
                                            horizontalArrangement = Arrangement.SpaceAround,
                                            verticalAlignment = Alignment.CenterVertically
                                        ) {
                                            if (isAdmin) {
                                                CompactNavBarItem(
                                                    icon = { Icon(Icons.Default.Dashboard, contentDescription = "Dashboard", modifier = Modifier.size(20.dp)) },
                                                    label = "Dashboard",
                                                    selected = selectedTab == 0,
                                                    onClick = { selectedTab = 0 }
                                                )
                                                CompactNavBarItem(
                                                    icon = { Icon(Icons.Default.PhoneAndroid, contentDescription = "Inventory", modifier = Modifier.size(20.dp)) },
                                                    label = "Inventory",
                                                    selected = selectedTab == 1,
                                                    onClick = { selectedTab = 1 }
                                                )
                                                CompactNavBarItem(
                                                    icon = { Icon(Icons.Default.LocalShipping, contentDescription = "Shipments", modifier = Modifier.size(20.dp)) },
                                                    label = "Shipments",
                                                    selected = selectedTab == 2,
                                                    onClick = { selectedTab = 2 }
                                                )
                                                CompactNavBarItem(
                                                    icon = { Icon(Icons.Default.Insights, contentDescription = "Analytics", modifier = Modifier.size(20.dp)) },
                                                    label = "Analytics",
                                                    selected = selectedTab == 3,
                                                    onClick = { selectedTab = 3 }
                                                )
                                            } else {
                                                CompactNavBarItem(
                                                    icon = { Icon(Icons.Default.Dashboard, contentDescription = "Custody", modifier = Modifier.size(20.dp)) },
                                                    label = "Custody",
                                                    selected = selectedTab == 0,
                                                    onClick = { selectedTab = 0 }
                                                )
                                                CompactNavBarItem(
                                                    icon = { Icon(Icons.Default.Insights, contentDescription = "Analytics", modifier = Modifier.size(20.dp)) },
                                                    label = "Analytics",
                                                    selected = selectedTab == 6,
                                                    onClick = { selectedTab = 6 }
                                                )
                                                CompactNavBarItem(
                                                    icon = {
                                                        BadgedBox(
                                                            badge = {
                                                                if (staffAlertCount > 0) {
                                                                    Badge(containerColor = AccentRose, contentColor = Color.White) {
                                                                        Text("$staffAlertCount", fontSize = 9.sp, fontWeight = FontWeight.Bold)
                                                                    }
                                                                }
                                                            }
                                                        ) {
                                                            Icon(
                                                                imageVector = if (staffAlertCount > 0) Icons.Default.NotificationsActive else Icons.Default.Notifications,
                                                                contentDescription = "Alerts",
                                                                modifier = Modifier.size(20.dp)
                                                            )
                                                        }
                                                    },
                                                    label = "Alerts",
                                                    selected = selectedTab == 4,
                                                    onClick = { selectedTab = 4 }
                                                )
                                            }
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
                                    AnimatedContent(
                                        targetState = selectedTab,
                                        transitionSpec = {
                                            val forward = targetState > initialState
                                            (fadeIn(animationSpec = tween(260, easing = FastOutSlowInEasing)) +
                                                slideInHorizontally(animationSpec = tween(260, easing = FastOutSlowInEasing)) { width ->
                                                    if (forward) width / 5 else -width / 5
                                                }
                                            ).togetherWith(
                                                fadeOut(animationSpec = tween(180, easing = FastOutLinearInEasing)) +
                                                slideOutHorizontally(animationSpec = tween(180, easing = FastOutLinearInEasing)) { width ->
                                                    if (forward) -width / 5 else width / 5
                                                }
                                            )
                                        },
                                        label = "TabTransition"
                                    ) { targetTab ->
                                        when (targetTab) {
                                            0 -> {
                                                if (isAdmin) {
                                                    DashboardTab(
                                                        token = token,
                                                        viewModel = mainViewModel,
                                                        currentUser = currentUser,
                                                        onNavigateToTab = { tabIndex -> selectedTab = tabIndex },
                                                        onSelectDevice = { dev -> selectedDeviceForDetail = dev },
                                                        onOpenScanner = { showScannerDialog = true },
                                                        onOpenAddShipment = { showAddShipmentDialog = true },
                                                        onOpenSaleApproval = { req -> selectedSaleRequestForApproval = req }
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
                                            4 -> {
                                                if (!isAdmin) {
                                                    StaffNotificationsTab(
                                                        token = token,
                                                        viewModel = mainViewModel,
                                                        currentUser = currentUser,
                                                        onSelectDevice = { dev -> selectedDeviceForDetail = dev },
                                                        onOpenMarkSold = { dev -> deviceForMarkSold = dev },
                                                        onNavigateToCustody = { selectedTab = 0 }
                                                    )
                                                }
                                            }
                                            5 -> {
                                                SalesTab(
                                                    token = token,
                                                    viewModel = mainViewModel
                                                )
                                            }
                                            6 -> {
                                                if (!isAdmin) {
                                                    StaffAnalyticsTab(
                                                        token = token,
                                                        viewModel = mainViewModel,
                                                        currentUser = currentUser
                                                    )
                                                }
                                            }
                                        }
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

                                    if (isAdmin) {
                                        if (matchedDevice != null) {
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
                                    } else {
                                        // Staff mode: check if device is in current staff member's assigned custody
                                        val user = currentUser
                                        val isAssignedToMe = matchedDevice != null && !matchedDevice.isB2B && (
                                            (matchedDevice.currentOwner != null && user?.id != null && matchedDevice.currentOwner == user.id) ||
                                            (!matchedDevice.currentOwnerName.isNullOrBlank() && (
                                                (user?.username != null && matchedDevice.currentOwnerName.equals(user.username, ignoreCase = true)) ||
                                                (user?.displayName != null && matchedDevice.currentOwnerName.equals(user.displayName, ignoreCase = true))
                                            ))
                                        )

                                        if (isAssignedToMe && matchedDevice != null) {
                                            selectedDeviceForDetail = matchedDevice
                                        } else {
                                            Toast.makeText(context, "Device not found in your assigned custody: $cleanImei", Toast.LENGTH_LONG).show()
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
                                token = token,
                                onDeviceUpdated = { updated ->
                                    scannedDeviceForCheckIn = updated
                                    mainViewModel.fetchDevices(token)
                                },
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
                                onSubmit = { proposedPrice, paymentMethod, notes ->
                                    mainViewModel.requestDeviceSale(
                                        token = token,
                                        deviceId = dev.id,
                                        proposedPrice = proposedPrice,
                                        paymentMethod = paymentMethod,
                                        notes = notes,
                                        onSuccess = {
                                            deviceForMarkSold = null
                                            Toast.makeText(context, "Sale request submitted to Admin for approval", Toast.LENGTH_LONG).show()
                                        }
                                    )
                                }
                            )
                        }

                        // Admin Sale Approval Dialog
                        selectedSaleRequestForApproval?.let { saleReq ->
                            AdminSaleApprovalDialog(
                                saleRequest = saleReq,
                                onDismiss = { selectedSaleRequestForApproval = null },
                                onApprove = { reqId, confirmedPrice, commissionAmount, paymentMethod, notes ->
                                    mainViewModel.confirmSaleRequest(
                                        token = token,
                                        requestId = reqId,
                                        confirmedPrice = confirmedPrice,
                                        paymentMethod = paymentMethod,
                                        notes = notes,
                                        commissionAmount = commissionAmount,
                                        onSuccess = {
                                            selectedSaleRequestForApproval = null
                                            Toast.makeText(context, "Sale approved & device marked as Sold!", Toast.LENGTH_SHORT).show()
                                        },
                                        onError = { err ->
                                            Toast.makeText(context, err, Toast.LENGTH_LONG).show()
                                        }
                                    )
                                },
                                onReject = { reqId, notes ->
                                    mainViewModel.rejectSaleRequest(
                                        token = token,
                                        requestId = reqId,
                                        notes = notes,
                                        onSuccess = {
                                            selectedSaleRequestForApproval = null
                                            Toast.makeText(context, "Sale request rejected.", Toast.LENGTH_SHORT).show()
                                        },
                                        onError = { err ->
                                            Toast.makeText(context, err, Toast.LENGTH_LONG).show()
                                        }
                                    )
                                }
                            )
                        }

                        // Change Password Dialog
                        if (showChangePasswordDialog) {
                            ChangePasswordDialog(
                                onDismiss = { showChangePasswordDialog = false },
                                onSubmit = { oldPass, newPass ->
                                    mainViewModel.changePassword(
                                        token = token,
                                        oldPass = oldPass,
                                        newPass = newPass,
                                        onSuccess = {
                                            showChangePasswordDialog = false
                                        }
                                    )
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
                                token = token,
                                onDeviceUpdated = { updated ->
                                    selectedDeviceForDetail = updated
                                    mainViewModel.fetchDevices(token)
                                },
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
        shape = RoundedCornerShape(percent = 50),
        color = if (selected) MaterialTheme.colorScheme.primary.copy(alpha = 0.10f) else Color.Transparent,
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 10.dp, vertical = 2.dp)
            .heightIn(min = 40.dp)
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier.padding(horizontal = 14.dp, vertical = 8.dp)
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
                    color = if (selected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.surfaceContainerHighest,
                    shape = RoundedCornerShape(percent = 50),
                    border = BorderStroke(
                        1.dp,
                        if (selected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outlineVariant
                    )
                ) {
                    Text(
                        text = badgeText,
                        color = if (selected) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSurface,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp)
                    )
                }
            }
            trailingContent?.invoke()
        }
    }
}

@Composable
private fun RowScope.CompactNavBarItem(
    icon: @Composable () -> Unit,
    label: String,
    selected: Boolean,
    onClick: () -> Unit
) {
    val activeColor = MaterialTheme.colorScheme.primary
    val inactiveColor = MaterialTheme.colorScheme.onSurfaceVariant
    val indicatorColor = MaterialTheme.colorScheme.primaryContainer

    val animatedPillColor by animateColorAsState(
        targetValue = if (selected) indicatorColor else Color.Transparent,
        animationSpec = tween(durationMillis = 220, easing = FastOutSlowInEasing),
        label = "nav_pill_color"
    )
    val animatedPillWidth by animateDpAsState(
        targetValue = if (selected) 48.dp else 26.dp,
        animationSpec = spring(dampingRatio = Spring.DampingRatioMediumBouncy, stiffness = Spring.StiffnessMediumLow),
        label = "nav_pill_width"
    )
    val animatedScale by animateFloatAsState(
        targetValue = if (selected) 1.12f else 0.94f,
        animationSpec = spring(dampingRatio = Spring.DampingRatioMediumBouncy, stiffness = Spring.StiffnessMediumLow),
        label = "nav_icon_scale"
    )
    val animatedTextColor by animateColorAsState(
        targetValue = if (selected) activeColor else inactiveColor,
        animationSpec = tween(180),
        label = "nav_text_color"
    )

    Column(
        modifier = Modifier
            .weight(1f)
            .clickable(
                interactionSource = remember { MutableInteractionSource() },
                indication = null,
                onClick = onClick
            )
            .padding(vertical = 3.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Box(
            modifier = Modifier
                .height(28.dp)
                .width(animatedPillWidth)
                .background(
                    color = animatedPillColor,
                    shape = RoundedCornerShape(percent = 50)
                )
                .scale(animatedScale),
            contentAlignment = Alignment.Center
        ) {
            CompositionLocalProvider(
                LocalContentColor provides (if (selected) MaterialTheme.colorScheme.onPrimaryContainer else inactiveColor)
            ) {
                icon()
            }
        }
        Spacer(modifier = Modifier.height(2.dp))
        Text(
            text = label,
            fontSize = 10.sp,
            lineHeight = 12.sp,
            fontWeight = if (selected) FontWeight.ExtraBold else FontWeight.Medium,
            color = animatedTextColor,
            maxLines = 1
        )
    }
}


