package com.imei.inventory.ui.dialogs

import android.Manifest
import android.content.pm.PackageManager
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.annotation.OptIn
import androidx.camera.core.*
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import androidx.core.content.ContextCompat
import com.google.mlkit.vision.barcode.BarcodeScanning
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.latin.TextRecognizerOptions
import java.util.concurrent.Executors

data class ScannedBarcodeResult(
    val primaryImei: String,
    val secondaryImei: String? = null,
    val eid: String? = null,
    val rawText: String
)

fun parseScannedBarcodeText(raw: String): ScannedBarcodeResult {
    val trimmed = raw.trim()

    // 1. Line-by-line inspection for labeled IMEI (strictly avoiding IMEI2 / Secondary / eSIM)
    val lines = trimmed.lines().map { it.trim() }.filter { it.isNotBlank() }
    var detectedPrimaryImei: String? = null
    var detectedImei2: String? = null
    var detectedEid: String? = null

    for (i in lines.indices) {
        val line = lines[i]

        // Check for EID
        if (line.contains("EID", ignoreCase = true)) {
            val digits = line.filter { it.isDigit() }
            if (digits.length >= 20) {
                detectedEid = digits
            } else if (i + 1 < lines.size) {
                val nextDigits = lines[i + 1].filter { it.isDigit() }
                if (nextDigits.length >= 20) detectedEid = nextDigits
            }
        }

        // Check for IMEI2 (Secondary / eSIM)
        if (line.contains("IMEI2", ignoreCase = true) || 
            line.contains("IMEI 2", ignoreCase = true) || 
            line.contains("IMEI(2)", ignoreCase = true) ||
            line.contains("2. IMEI", ignoreCase = true) ||
            line.contains("eSIM", ignoreCase = true) || 
            line.contains("Secondary", ignoreCase = true)) {
            val digits = line.filter { it.isDigit() }
            if (digits.length in 14..16) {
                detectedImei2 = digits
            } else if (i + 1 < lines.size) {
                val nextDigits = lines[i + 1].filter { it.isDigit() }
                if (nextDigits.length in 14..16) detectedImei2 = nextDigits
            }
            continue
        }

        // Check for Primary IMEI (must NOT contain 2 or Secondary or eSIM)
        if ((line.contains("IMEI", ignoreCase = true) || line.contains("MEID", ignoreCase = true)) && 
            !line.contains("2") && 
            !line.contains("eSIM", ignoreCase = true) && 
            !line.contains("Secondary", ignoreCase = true)) {
            val digits = line.filter { it.isDigit() }
            if (digits.length in 14..16) {
                detectedPrimaryImei = digits
            } else if (i + 1 < lines.size) {
                val nextDigits = lines[i + 1].filter { it.isDigit() }
                if (nextDigits.length in 14..16) detectedPrimaryImei = nextDigits
            }
        }
    }

    if (detectedPrimaryImei != null) {
        return ScannedBarcodeResult(
            primaryImei = detectedPrimaryImei,
            secondaryImei = detectedImei2,
            eid = detectedEid,
            rawText = trimmed
        )
    }

    // 2. Regex pattern for structured text
    val imeiRegex = Regex("""(?:\bIMEI\b|\bIMEI1\b|\bIMEI\s*1\b|Primary\s*IMEI)\s*[:\-]?\s*(\d{14,16})""", setOf(RegexOption.IGNORE_CASE, RegexOption.MULTILINE))
    val imei2Regex = Regex("""(?:\bIMEI2\b|\bIMEI\s*2\b|Secondary\s*IMEI|eSIM\s*IMEI)\s*[:\-]?\s*(\d{14,16})""", setOf(RegexOption.IGNORE_CASE, RegexOption.MULTILINE))
    val eidRegex = Regex("""(?:\bEID\b)\s*[:\-]?\s*(\d{20,32})""", setOf(RegexOption.IGNORE_CASE, RegexOption.MULTILINE))

    val imeiMatch = imeiRegex.find(trimmed)?.groupValues?.get(1)
    val imei2Match = imei2Regex.find(trimmed)?.groupValues?.get(1)
    val eidMatch = eidRegex.find(trimmed)?.groupValues?.get(1)

    if (imeiMatch != null) {
        return ScannedBarcodeResult(
            primaryImei = imeiMatch,
            secondaryImei = imei2Match,
            eid = eidMatch,
            rawText = trimmed
        )
    }

    // 3. Find any 14-16 digit numbers in the text (ignoring IMEI2 if known)
    val allNumbers = Regex("""\b\d{14,16}\b""").findAll(trimmed).map { it.value }.toList()
    val nonImei2Numbers = if (detectedImei2 != null) allNumbers.filter { it != detectedImei2 } else allNumbers
    if (nonImei2Numbers.isNotEmpty()) {
        return ScannedBarcodeResult(
            primaryImei = nonImei2Numbers[0],
            secondaryImei = detectedImei2,
            eid = eidMatch,
            rawText = trimmed
        )
    }

    // 4. Clean any digits from raw barcode
    val onlyDigits = trimmed.filter { it.isDigit() }
    if (onlyDigits.length in 14..16 && onlyDigits != detectedImei2) {
        return ScannedBarcodeResult(
            primaryImei = onlyDigits,
            rawText = trimmed
        )
    }

    return ScannedBarcodeResult(
        primaryImei = trimmed,
        rawText = trimmed
    )
}

@Composable
fun CameraBarcodeScannerDialog(
    onDismiss: () -> Unit,
    onBarcodeScanned: (ScannedBarcodeResult) -> Unit
) {
    val context = LocalContext.current
    var hasCameraPermission by remember {
        mutableStateOf(
            ContextCompat.checkSelfPermission(
                context,
                Manifest.permission.CAMERA
            ) == PackageManager.PERMISSION_GRANTED
        )
    }

    val launcher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestPermission(),
        onResult = { granted ->
            hasCameraPermission = granted
        }
    )

    LaunchedEffect(Unit) {
        if (!hasCameraPermission) {
            launcher.launch(Manifest.permission.CAMERA)
        }
    }

    var manualInput by remember { mutableStateOf("") }
    var flashEnabled by remember { mutableStateOf(false) }
    var cameraControl by remember { mutableStateOf<CameraControl?>(null) }
    var lockingCandidate by remember { mutableStateOf<String?>(null) }
    var lockingProgress by remember { mutableFloatStateOf(0f) }

    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(usePlatformDefaultWidth = false)
    ) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(Color.Black)
        ) {
            if (hasCameraPermission) {
                CameraPreviewView(
                    onBarcodeDetected = { rawValue ->
                        val parsed = parseScannedBarcodeText(rawValue)
                        onBarcodeScanned(parsed)
                    },
                    onLockProgress = { candidate, progress ->
                        lockingCandidate = candidate
                        lockingProgress = progress
                    },
                    onCameraReady = { control ->
                        cameraControl = control
                    }
                )

                // Laser Scanner Animation
                val infiniteTransition = rememberInfiniteTransition(label = "laser")
                val laserPosition by infiniteTransition.animateFloat(
                    initialValue = 0f,
                    targetValue = 1f,
                    animationSpec = infiniteRepeatable(
                        animation = tween(1800, easing = LinearEasing),
                        repeatMode = RepeatMode.Reverse
                    ),
                    label = "laser_anim"
                )

                // Viewfinder Target Overlay
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(horizontal = 32.dp, vertical = 110.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.Center
                    ) {
                        // Viewfinder Box
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(230.dp)
                                .border(
                                    width = if (lockingCandidate != null) 3.dp else 2.dp,
                                    color = if (lockingCandidate != null) Color(0xFF22C55E) else Color(0xFF3B82F6),
                                    shape = RoundedCornerShape(16.dp)
                                )
                                .background(if (lockingCandidate != null) Color(0xFF22C55E).copy(alpha = 0.05f) else Color.Transparent)
                        ) {
                            // Animated Scanning Line (only when searching)
                            if (lockingCandidate == null) {
                                Box(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .height(2.dp)
                                        .offset(y = (230 * laserPosition).dp)
                                        .background(Color(0xFF60A5FA))
                                )
                            }
                        }

                        Spacer(modifier = Modifier.height(16.dp))

                        // Live Target Status Pill
                        Surface(
                            color = if (lockingCandidate != null) Color(0xEE16A34A) else Color(0xAA0F172A),
                            shape = RoundedCornerShape(20.dp),
                            modifier = Modifier.padding(horizontal = 8.dp)
                        ) {
                            Column(
                                modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
                                horizontalAlignment = Alignment.CenterHorizontally
                            ) {
                                if (lockingCandidate != null) {
                                    Text(
                                        text = "Verifying Primary IMEI...",
                                        color = Color.White,
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.Medium
                                    )
                                    Text(
                                        text = lockingCandidate ?: "",
                                        color = Color.White,
                                        fontSize = 14.sp,
                                        fontWeight = FontWeight.Bold
                                    )
                                    Spacer(modifier = Modifier.height(4.dp))
                                    LinearProgressIndicator(
                                        progress = { lockingProgress },
                                        color = Color.White,
                                        trackColor = Color.White.copy(alpha = 0.3f),
                                        modifier = Modifier
                                            .width(160.dp)
                                            .height(4.dp)
                                    )
                                } else {
                                    Text(
                                        text = "Align Primary IMEI in frame (1-2s)",
                                        color = Color(0xFF94A3B8),
                                        fontSize = 12.sp,
                                        fontWeight = FontWeight.Medium
                                    )
                                }
                            }
                        }
                    }
                }
            } else {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(32.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.Center
                ) {
                    Icon(
                        imageVector = Icons.Default.CameraAlt,
                        contentDescription = null,
                        tint = Color.White,
                        modifier = Modifier.size(54.dp)
                    )
                    Spacer(modifier = Modifier.height(16.dp))
                    Text(
                        text = "Camera Permission Required",
                        color = Color.White,
                        fontWeight = FontWeight.Bold,
                        fontSize = 18.sp
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = "Camera access is required to scan IMEI barcodes directly from device screens or packaging.",
                        color = Color(0xFF94A3B8),
                        fontSize = 13.sp,
                        textAlign = TextAlign.Center
                    )
                    Spacer(modifier = Modifier.height(20.dp))
                    Button(
                        onClick = { launcher.launch(Manifest.permission.CAMERA) },
                        colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary)
                    ) {
                        Text("Grant Permission", color = Color.White)
                    }
                }
            }

            // Top Bar Overlay
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .statusBarsPadding()
                    .padding(16.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                IconButton(
                    onClick = onDismiss,
                    modifier = Modifier
                        .background(Color(0x88000000), CircleShape)
                        .size(42.dp)
                ) {
                    Icon(Icons.Default.Close, contentDescription = "Close", tint = Color.White)
                }

                Text(
                    text = "Scan IMEI",
                    color = Color.White,
                    fontWeight = FontWeight.Bold,
                    fontSize = 17.sp
                )

                IconButton(
                    onClick = {
                        flashEnabled = !flashEnabled
                        cameraControl?.enableTorch(flashEnabled)
                    },
                    modifier = Modifier
                        .background(if (flashEnabled) Color(0xFFF59E0B) else Color(0x88000000), CircleShape)
                        .size(42.dp)
                ) {
                    Icon(
                        imageVector = if (flashEnabled) Icons.Default.FlashOn else Icons.Default.FlashOff,
                        contentDescription = "Flashlight",
                        tint = Color.White
                    )
                }
            }

            // Bottom Manual Entry Card
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .align(Alignment.BottomCenter)
                    .navigationBarsPadding()
                    .padding(16.dp)
                    .background(Color(0xEE1E293B), RoundedCornerShape(16.dp))
                    .padding(16.dp)
            ) {
                Text(
                    text = "Point camera at IMEI or enter manually:",
                    color = Color(0xFF94A3B8),
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Medium
                )
                Spacer(modifier = Modifier.height(8.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    OutlinedTextField(
                        value = manualInput,
                        onValueChange = { manualInput = it },
                        placeholder = { Text("Enter 15-digit IMEI...", color = Color(0xFF64748B), fontSize = 13.sp) },
                        singleLine = true,
                        shape = RoundedCornerShape(10.dp),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedTextColor = Color.White,
                            unfocusedTextColor = Color.White,
                            focusedBorderColor = MaterialTheme.colorScheme.primary,
                            unfocusedBorderColor = Color(0xFF475569)
                        ),
                        modifier = Modifier.weight(1f)
                    )

                    Button(
                        onClick = {
                            if (manualInput.isNotBlank()) {
                                val parsed = parseScannedBarcodeText(manualInput)
                                onBarcodeScanned(parsed)
                            }
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary),
                        shape = RoundedCornerShape(10.dp),
                        modifier = Modifier.height(52.dp)
                    ) {
                        Text("Search", color = Color.White, fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalGetImage::class)
@Composable
fun CameraPreviewView(
    onBarcodeDetected: (String) -> Unit,
    onLockProgress: (candidate: String?, progress: Float) -> Unit = { _, _ -> },
    onCameraReady: (CameraControl) -> Unit
) {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current
    var hasDetected by remember { mutableStateOf(false) }

    AndroidView(
        factory = { ctx ->
            val previewView = PreviewView(ctx)
            val cameraProviderFuture = ProcessCameraProvider.getInstance(ctx)

            cameraProviderFuture.addListener({
                val cameraProvider = cameraProviderFuture.get()

                val preview = Preview.Builder().build().also {
                    it.setSurfaceProvider(previewView.surfaceProvider)
                }

                val imageAnalysis = ImageAnalysis.Builder()
                    .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                    .build()

                val textRecognizer = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS)
                val barcodeScanner = BarcodeScanning.getClient()
                val executor = Executors.newSingleThreadExecutor()

                // Stabilization & Verification tracking (1.3 seconds stable verification)
                var currentCandidate: String? = null
                var candidateFirstSeenMs: Long = 0L
                var lastSeenCandidateMs: Long = 0L
                val REQUIRED_CONFIRMATION_MS = 1300L // 1.3 seconds stable verification window
                val GRACE_PERIOD_MS = 350L

                imageAnalysis.setAnalyzer(executor) { imageProxy ->
                    val mediaImage = imageProxy.image
                    if (mediaImage != null && !hasDetected) {
                        val inputImage = InputImage.fromMediaImage(mediaImage, imageProxy.imageInfo.rotationDegrees)

                        // 1. Primary Analyzer: OCR Text Recognition
                        textRecognizer.process(inputImage)
                            .addOnSuccessListener { visionText ->
                                if (!hasDetected && visionText.text.isNotBlank()) {
                                    val parsed = parseScannedBarcodeText(visionText.text)
                                    val candidate = if (parsed.primaryImei.length in 14..16) parsed.primaryImei else null

                                    if (candidate != null) {
                                        val now = System.currentTimeMillis()
                                        lastSeenCandidateMs = now
                                        if (candidate == currentCandidate) {
                                            val elapsed = now - candidateFirstSeenMs
                                            val progress = (elapsed.toFloat() / REQUIRED_CONFIRMATION_MS).coerceIn(0f, 1f)
                                            ContextCompat.getMainExecutor(ctx).execute {
                                                onLockProgress(candidate, progress)
                                            }

                                            if (elapsed >= REQUIRED_CONFIRMATION_MS && !hasDetected) {
                                                hasDetected = true
                                                ContextCompat.getMainExecutor(ctx).execute {
                                                    onBarcodeDetected(candidate)
                                                }
                                                return@addOnSuccessListener
                                            }
                                        } else {
                                            currentCandidate = candidate
                                            candidateFirstSeenMs = now
                                            ContextCompat.getMainExecutor(ctx).execute {
                                                onLockProgress(candidate, 0.1f)
                                            }
                                        }
                                        return@addOnSuccessListener
                                    }
                                }

                                // 2. Fallback: Barcode lines (only if no text is recognized on screen)
                                if (!hasDetected && visionText.text.isBlank()) {
                                    barcodeScanner.process(inputImage)
                                        .addOnSuccessListener { barcodes ->
                                            val imeiBarcodes = barcodes.filter {
                                                val digits = it.rawValue?.filter { c -> c.isDigit() } ?: ""
                                                digits.length in 14..16
                                            }.sortedBy { it.boundingBox?.top ?: 0 }

                                            if (imeiBarcodes.isNotEmpty() && !hasDetected) {
                                                val candidate = imeiBarcodes[0].rawValue?.filter { it.isDigit() }
                                                if (!candidate.isNullOrBlank() && candidate.length in 14..16) {
                                                    val now = System.currentTimeMillis()
                                                    lastSeenCandidateMs = now
                                                    if (candidate == currentCandidate) {
                                                        val elapsed = now - candidateFirstSeenMs
                                                        val progress = (elapsed.toFloat() / REQUIRED_CONFIRMATION_MS).coerceIn(0f, 1f)
                                                        ContextCompat.getMainExecutor(ctx).execute {
                                                            onLockProgress(candidate, progress)
                                                        }

                                                        if (elapsed >= REQUIRED_CONFIRMATION_MS && !hasDetected) {
                                                            hasDetected = true
                                                            ContextCompat.getMainExecutor(ctx).execute {
                                                                onBarcodeDetected(candidate)
                                                            }
                                                        }
                                                    } else {
                                                        currentCandidate = candidate
                                                        candidateFirstSeenMs = now
                                                        ContextCompat.getMainExecutor(ctx).execute {
                                                            onLockProgress(candidate, 0.1f)
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                }

                                // Reset candidate if disappeared for longer than grace period
                                val now = System.currentTimeMillis()
                                if (currentCandidate != null && (now - lastSeenCandidateMs > GRACE_PERIOD_MS) && !hasDetected) {
                                    currentCandidate = null
                                    candidateFirstSeenMs = 0L
                                    ContextCompat.getMainExecutor(ctx).execute {
                                        onLockProgress(null, 0f)
                                    }
                                }
                            }
                            .addOnCompleteListener {
                                imageProxy.close()
                            }
                    } else {
                        imageProxy.close()
                    }
                }

                val cameraSelector = CameraSelector.DEFAULT_BACK_CAMERA

                try {
                    cameraProvider.unbindAll()
                    val camera = cameraProvider.bindToLifecycle(
                        lifecycleOwner,
                        cameraSelector,
                        preview,
                        imageAnalysis
                    )
                    onCameraReady(camera.cameraControl)
                } catch (exc: Exception) {
                    exc.printStackTrace()
                }
            }, ContextCompat.getMainExecutor(ctx))

            previewView
        },
        modifier = Modifier.fillMaxSize()
    )
}
