package com.imei.inventory

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.viewModels
import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
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
import com.imei.inventory.data.model.DeviceDto
import com.imei.inventory.ui.dialogs.AddDeviceDialog
import com.imei.inventory.ui.dialogs.DeviceDetailDialog
import com.imei.inventory.ui.screens.*
import com.imei.inventory.ui.theme.AppTheme
import com.imei.inventory.viewmodel.AuthViewModel
import com.imei.inventory.viewmodel.MainInventoryViewModel

class MainActivity : ComponentActivity() {
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
                    var showAddDeviceDialog by remember { mutableStateOf(false) }

                    val isLoading by mainViewModel.isLoading.collectAsState()

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
                                                    Text("📱", fontSize = 18.sp)
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

                                        Spacer(modifier = Modifier.width(8.dp))

                                        // Logout Action
                                        TextButton(
                                            onClick = { userToken = null },
                                            contentPadding = PaddingValues(horizontal = 10.dp, vertical = 4.dp),
                                            shape = RoundedCornerShape(8.dp),
                                            colors = ButtonDefaults.textButtonColors(contentColor = Color(0xFFDC2626))
                                        ) {
                                            Text("Logout", fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                                        }
                                    }
                                )
                            },
                            bottomBar = {
                                NavigationBar(
                                    containerColor = MaterialTheme.colorScheme.surface,
                                    tonalElevation = 6.dp
                                ) {
                                    NavigationBarItem(
                                        icon = { Text("📊", fontSize = 18.sp) },
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
                                        icon = { Text("📱", fontSize = 18.sp) },
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
                                        icon = { Text("🚚", fontSize = 18.sp) },
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
                                        icon = { Text("💵", fontSize = 18.sp) },
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
                                    NavigationBarItem(
                                        icon = { Text("⚡", fontSize = 18.sp) },
                                        label = { Text("Sickw", fontSize = 10.sp, fontWeight = if (selectedTab == 4) FontWeight.Bold else FontWeight.Normal) },
                                        selected = selectedTab == 4,
                                        onClick = { selectedTab = 4 },
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
