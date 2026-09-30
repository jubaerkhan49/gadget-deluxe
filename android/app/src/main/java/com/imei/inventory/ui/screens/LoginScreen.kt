package com.imei.inventory.ui.screens

import android.widget.Toast
import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AdminPanelSettings
import androidx.compose.material.icons.filled.Badge
import androidx.compose.material.icons.filled.Fingerprint
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.PhoneAndroid
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.filled.VisibilityOff
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.fragment.app.FragmentActivity
import com.imei.inventory.data.model.UserDto
import com.imei.inventory.util.BiometricHelper
import com.imei.inventory.util.PreferencesManager
import com.imei.inventory.viewmodel.AuthState
import com.imei.inventory.viewmodel.AuthViewModel

@Composable
fun LoginScreen(
    authViewModel: AuthViewModel,
    onLoginSuccess: (String, UserDto) -> Unit
) {
    val context = LocalContext.current
    val prefsManager = remember { PreferencesManager(context) }
    
    // 0 = Admin Gateway, 1 = Staff Portal
    var selectedRoleIndex by remember {
        mutableStateOf(if (prefsManager.getSavedRole()?.equals("EMPLOYEE", ignoreCase = true) == true) 1 else 0)
    }

    var username by remember { mutableStateOf(prefsManager.getSavedUsername() ?: "") }
    var password by remember { mutableStateOf("") }
    var showPassword by remember { mutableStateOf(false) }
    var localErrorMessage by remember { mutableStateOf<String?>(null) }
    val authState by authViewModel.authState.collectAsState()
    val scrollState = rememberScrollState()

    val currentGatewayRole = if (selectedRoleIndex == 0) "admin" else "employee"
    val accentColor = if (selectedRoleIndex == 0) MaterialTheme.colorScheme.primary else Color(0xFF10B981)

    fun triggerBiometricAuth() {
        localErrorMessage = null
        val activity = context as? FragmentActivity
        if (activity == null) {
            localErrorMessage = "Activity not found for Biometric auth"
            return
        }

        if (!BiometricHelper.isBiometricAvailable(context)) {
            localErrorMessage = "Biometric authentication is not supported or setup on this device."
            return
        }

        val savedUser = prefsManager.getSavedUsername()
        val savedPass = prefsManager.getSavedPassword()

        if (savedUser.isNullOrBlank() || savedPass.isNullOrBlank()) {
            localErrorMessage = "Please sign in with password first to enable Fingerprint login."
            Toast.makeText(context, "Sign in with password first to enable Fingerprint login", Toast.LENGTH_SHORT).show()
            return
        }

        BiometricHelper.showBiometricPrompt(
            activity = activity,
            title = "Biometric Sign-In",
            subtitle = "Verify fingerprint to unlock Gadget Deluxe",
            onSuccess = {
                username = savedUser
                password = savedPass
                authViewModel.login(savedUser, savedPass, currentGatewayRole)
            },
            onError = { err ->
                localErrorMessage = err
            }
        )
    }

    // Auto-prompt biometric on launch if credentials exist
    LaunchedEffect(Unit) {
        if (prefsManager.isBiometricEnabled()) {
            triggerBiometricAuth()
        }
    }

    LaunchedEffect(authState) {
        if (authState is AuthState.Success) {
            val success = authState as AuthState.Success
            val token = success.token
            val user = success.user
            if (username.isNotBlank() && password.isNotBlank()) {
                prefsManager.saveCredentials(
                    username = username.trim(),
                    password = password.trim(),
                    token = token,
                    role = user.role,
                    firstName = user.firstName,
                    userId = user.id
                )
            }
            onLoginSuccess(token, user)
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .imePadding()
            .systemBarsPadding(),
        contentAlignment = Alignment.Center
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(scrollState)
                .padding(horizontal = 20.dp, vertical = 24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .widthIn(max = 440.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                shape = RoundedCornerShape(24.dp),
                elevation = CardDefaults.cardElevation(defaultElevation = 8.dp)
            ) {
                Column(
                    modifier = Modifier
                        .padding(22.dp)
                        .fillMaxWidth(),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    // Top App Logo
                    Surface(
                        color = accentColor.copy(alpha = 0.14f),
                        shape = RoundedCornerShape(18.dp),
                        modifier = Modifier.size(64.dp)
                    ) {
                        Box(contentAlignment = Alignment.Center) {
                            Icon(
                                imageVector = if (selectedRoleIndex == 0) Icons.Default.AdminPanelSettings else Icons.Default.Badge,
                                contentDescription = "Logo",
                                tint = accentColor,
                                modifier = Modifier.size(34.dp)
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(12.dp))

                    Text(
                        text = "Gadget Deluxe",
                        color = MaterialTheme.colorScheme.onSurface,
                        fontSize = 23.sp,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = if (selectedRoleIndex == 0) "Enterprise Admin Command Center" else "Staff Custody & Field Operations",
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        fontSize = 12.5.sp,
                        modifier = Modifier.padding(top = 2.dp, bottom = 16.dp)
                    )

                    // Role Gateway Switcher Tabs
                    Surface(
                        shape = RoundedCornerShape(14.dp),
                        color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.6f),
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(bottom = 18.dp)
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(4.dp),
                            horizontalArrangement = Arrangement.spacedBy(4.dp)
                        ) {
                            // Admin Tab
                            val adminSelected = selectedRoleIndex == 0
                            val adminBg by animateColorAsState(
                                if (adminSelected) MaterialTheme.colorScheme.surface else Color.Transparent,
                                label = "admin_tab_bg"
                            )
                            Surface(
                                shape = RoundedCornerShape(10.dp),
                                color = adminBg,
                                shadowElevation = if (adminSelected) 2.dp else 0.dp,
                                modifier = Modifier
                                    .weight(1f)
                                    .clip(RoundedCornerShape(10.dp))
                                    .clickable {
                                        selectedRoleIndex = 0
                                        localErrorMessage = null
                                    }
                            ) {
                                Row(
                                    modifier = Modifier.padding(vertical = 9.dp),
                                    horizontalArrangement = Arrangement.Center,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.AdminPanelSettings,
                                        contentDescription = null,
                                        tint = if (adminSelected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant,
                                        modifier = Modifier.size(16.dp)
                                    )
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Text(
                                        text = "Admin Gateway",
                                        fontSize = 12.sp,
                                        fontWeight = if (adminSelected) FontWeight.Bold else FontWeight.Medium,
                                        color = if (adminSelected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                }
                            }

                            // Staff Tab
                            val staffSelected = selectedRoleIndex == 1
                            val staffBg by animateColorAsState(
                                if (staffSelected) MaterialTheme.colorScheme.surface else Color.Transparent,
                                label = "staff_tab_bg"
                            )
                            Surface(
                                shape = RoundedCornerShape(10.dp),
                                color = staffBg,
                                shadowElevation = if (staffSelected) 2.dp else 0.dp,
                                modifier = Modifier
                                    .weight(1f)
                                    .clip(RoundedCornerShape(10.dp))
                                    .clickable {
                                        selectedRoleIndex = 1
                                        localErrorMessage = null
                                    }
                            ) {
                                Row(
                                    modifier = Modifier.padding(vertical = 9.dp),
                                    horizontalArrangement = Arrangement.Center,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.Badge,
                                        contentDescription = null,
                                        tint = if (staffSelected) Color(0xFF10B981) else MaterialTheme.colorScheme.onSurfaceVariant,
                                        modifier = Modifier.size(16.dp)
                                    )
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Text(
                                        text = "Staff Portal",
                                        fontSize = 12.sp,
                                        fontWeight = if (staffSelected) FontWeight.Bold else FontWeight.Medium,
                                        color = if (staffSelected) Color(0xFF10B981) else MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                }
                            }
                        }
                    }

                    // Username Field
                    OutlinedTextField(
                        value = username,
                        onValueChange = { 
                            username = it
                            localErrorMessage = null
                        },
                        label = { Text("Username") },
                        placeholder = { Text(if (selectedRoleIndex == 0) "e.g. admin" else "e.g. emon / ochi / ashraf", fontSize = 12.sp) },
                        leadingIcon = {
                            Icon(
                                imageVector = Icons.Default.Person,
                                contentDescription = null,
                                tint = MaterialTheme.colorScheme.onSurfaceVariant,
                                modifier = Modifier.size(18.dp)
                            )
                        },
                        singleLine = true,
                        shape = RoundedCornerShape(14.dp),
                        keyboardOptions = KeyboardOptions(
                            keyboardType = KeyboardType.Text,
                            imeAction = ImeAction.Next
                        ),
                        modifier = Modifier.fillMaxWidth()
                    )

                    Spacer(modifier = Modifier.height(12.dp))

                    // Password Field
                    OutlinedTextField(
                        value = password,
                        onValueChange = { 
                            password = it
                            localErrorMessage = null
                        },
                        label = { Text("Password") },
                        placeholder = { Text("••••••••") },
                        leadingIcon = {
                            Icon(
                                imageVector = Icons.Default.Lock,
                                contentDescription = null,
                                tint = MaterialTheme.colorScheme.onSurfaceVariant,
                                modifier = Modifier.size(18.dp)
                            )
                        },
                        trailingIcon = {
                            IconButton(onClick = { showPassword = !showPassword }) {
                                Icon(
                                    imageVector = if (showPassword) Icons.Default.VisibilityOff else Icons.Default.Visibility,
                                    contentDescription = if (showPassword) "Hide password" else "Show password",
                                    tint = MaterialTheme.colorScheme.onSurfaceVariant,
                                    modifier = Modifier.size(19.dp)
                                )
                            }
                        },
                        singleLine = true,
                        visualTransformation = if (showPassword) VisualTransformation.None else PasswordVisualTransformation(),
                        shape = RoundedCornerShape(14.dp),
                        keyboardOptions = KeyboardOptions(
                            keyboardType = KeyboardType.Password,
                            imeAction = ImeAction.Done
                        ),
                        keyboardActions = KeyboardActions(
                            onDone = {
                                if (username.isNotBlank() && password.isNotBlank()) {
                                    authViewModel.login(username.trim(), password.trim(), currentGatewayRole)
                                }
                            }
                        ),
                        modifier = Modifier.fillMaxWidth()
                    )

                    if (authState is AuthState.Error) {
                        Spacer(modifier = Modifier.height(10.dp))
                        Text(
                            text = (authState as AuthState.Error).message,
                            color = Color(0xFFDC2626),
                            fontSize = 12.5.sp,
                            fontWeight = FontWeight.Medium
                        )
                    } else if (localErrorMessage != null) {
                        Spacer(modifier = Modifier.height(10.dp))
                        Text(
                            text = localErrorMessage!!,
                            color = Color(0xFFDC2626),
                            fontSize = 12.5.sp,
                            fontWeight = FontWeight.Medium
                        )
                    }

                    Spacer(modifier = Modifier.height(20.dp))

                    if (authState is AuthState.Loading) {
                        CircularProgressIndicator(color = accentColor)
                    } else {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(10.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Button(
                                onClick = {
                                    if (username.isNotBlank() && password.isNotBlank()) {
                                        authViewModel.login(username.trim(), password.trim(), currentGatewayRole)
                                    } else {
                                        localErrorMessage = "Please enter both username and password"
                                    }
                                },
                                colors = ButtonDefaults.buttonColors(containerColor = accentColor),
                                shape = RoundedCornerShape(14.dp),
                                modifier = Modifier
                                    .weight(1f)
                                    .height(50.dp)
                            ) {
                                Text(
                                    text = if (selectedRoleIndex == 0) "Sign In as Admin" else "Sign In as Staff",
                                    fontSize = 14.5.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Color.White
                                )
                            }

                            FilledTonalIconButton(
                                onClick = { triggerBiometricAuth() },
                                shape = RoundedCornerShape(14.dp),
                                colors = IconButtonDefaults.filledTonalIconButtonColors(
                                    containerColor = accentColor.copy(alpha = 0.15f),
                                    contentColor = accentColor
                                ),
                                modifier = Modifier.size(50.dp)
                            ) {
                                Icon(
                                    imageVector = Icons.Default.Fingerprint,
                                    contentDescription = "Fingerprint Sign-In",
                                    modifier = Modifier.size(28.dp)
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}
