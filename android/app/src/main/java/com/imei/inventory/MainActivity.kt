package com.imei.inventory

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.viewModels
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import com.imei.inventory.ui.screens.DashboardScreen
import com.imei.inventory.ui.screens.LoginScreen
import com.imei.inventory.ui.screens.ScannerScreen
import com.imei.inventory.viewmodel.AuthViewModel
import com.imei.inventory.viewmodel.DeviceViewModel

class MainActivity : ComponentActivity() {
    private val authViewModel: AuthViewModel by viewModels()
    private val deviceViewModel: DeviceViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            MaterialTheme {
                Surface(modifier = Modifier.fillMaxSize()) {
                    var userToken by remember { mutableStateOf<String?>(null) }
                    var currentScreen by remember { mutableStateOf("login") }

                    if (userToken == null) {
                        LoginScreen(
                            authViewModel = authViewModel,
                            onLoginSuccess = { token ->
                                userToken = token
                                currentScreen = "dashboard"
                            }
                        )
                    } else {
                        when (currentScreen) {
                            "dashboard" -> DashboardScreen(
                                token = userToken!!,
                                deviceViewModel = deviceViewModel,
                                onOpenScanner = { currentScreen = "scanner" }
                            )
                            "scanner" -> ScannerScreen(
                                token = userToken!!,
                                onBack = { currentScreen = "dashboard" }
                            )
                        }
                    }
                }
            }
        }
    }
}
