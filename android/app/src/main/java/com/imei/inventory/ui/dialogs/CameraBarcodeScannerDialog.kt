package com.imei.inventory.ui.dialogs

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.media.AudioAttributes
import android.media.AudioFormat
import android.media.AudioManager
import android.media.AudioTrack
import android.media.ToneGenerator
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.annotation.OptIn
import androidx.camera.core.*
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.*
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
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
import com.google.android.gms.tasks.Tasks
import com.google.mlkit.vision.barcode.BarcodeScannerOptions
import com.google.mlkit.vision.barcode.BarcodeScanning
import com.google.mlkit.vision.barcode.common.Barcode
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.Text
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.latin.TextRecognizerOptions
import java.util.concurrent.Executors

data class ScannedBarcodeResult(
    val primaryImei: String,
    val secondaryImei: String? = null,
    val eid: String? = null,
    val rawText: String
)

/**
 * Supermarket Barcode Scanner Sound & Haptic Manager.
 * Uses high-priority AudioTrack with pre-buffered 2850Hz pure PCM tone (70ms)
 * to replicate the exact, iconic retail cash counter barcode scanner chirp.
 */
object ScannerFeedbackHelper {
    private var supermarketBeepTrack: AudioTrack? = null

    init {
        try {
            val sampleRate = 44100
            val durationMs = 70 // 70ms crisp supermarket laser chirp
            val frequency = 2850.0 // 2850 Hz classic retail scanner pitch
            val numSamples = (sampleRate * durationMs) / 1000
            val buffer = ShortArray(numSamples)

            val attackSamples = (sampleRate * 0.003).toInt() // 3ms attack
            val decaySamples = (sampleRate * 0.006).toInt() // 6ms decay

            for (i in 0 until numSamples) {
                val envelope = when {
                    i < attackSamples -> i.toFloat() / attackSamples
                    i > numSamples - decaySamples -> (numSamples - i).toFloat() / decaySamples
                    else -> 1.0f
                }
                val angle = 2.0 * Math.PI * i * frequency / sampleRate
                buffer[i] = (Math.sin(angle) * Short.MAX_VALUE * 0.95f * envelope).toInt().toShort()
            }

            supermarketBeepTrack = AudioTrack.Builder()
                .setAudioAttributes(
                    AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_ASSISTANCE_SONIFICATION)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                        .build()
                )
                .setAudioFormat(
                    AudioFormat.Builder()
                        .setEncoding(AudioFormat.ENCODING_PCM_16BIT)
                        .setSampleRate(sampleRate)
                        .setChannelMask(AudioFormat.CHANNEL_OUT_MONO)
                        .build()
                )
                .setBufferSizeInBytes(buffer.size * 2)
                .setTransferMode(AudioTrack.MODE_STATIC)
                .build()

            supermarketBeepTrack?.write(buffer, 0, buffer.size)
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    fun playBeep() {
        try {
            supermarketBeepTrack?.let { track ->
                track.stop()
                track.reloadStaticData()
                track.play()
                return
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
        try {
            ToneGenerator(AudioManager.STREAM_NOTIFICATION, 100).startTone(ToneGenerator.TONE_PROP_BEEP, 70)
        } catch (_: Exception) {}
    }

    fun vibrate(context: Context) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val vibrator = context.getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
                vibrator?.vibrate(VibrationEffect.createOneShot(55, VibrationEffect.DEFAULT_AMPLITUDE))
            } else {
                @Suppress("DEPRECATION")
                val vibrator = context.getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
                vibrator?.vibrate(55)
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }
}

/**
 * Validates a 15-digit number against the international Luhn IMEI checksum algorithm.
 */
fun isValidLuhn(number: String): Boolean {
    if (number.length != 15 || !number.all { it.isDigit() }) return false
    var sum = 0
    for (i in 0 until 15) {
        var digit = number[i] - '0'
        if (i % 2 == 1) { // odd index: 1, 3, 5, 7, 9, 11, 13
            digit *= 2
            if (digit > 9) digit -= 9
        }
        sum += digit
    }
    return sum % 10 == 0
}

/**
 * Converts a 14-digit MEID into a 15-digit IMEI by calculating the matching Luhn check digit.
 */
fun meidToImei15(meid14: String): String {
    if (meid14.length != 14 || !meid14.all { it.isDigit() }) return meid14
    for (d in 0..9) {
        val candidate = meid14 + d
        if (isValidLuhn(candidate)) return candidate
    }
    return meid14
}

/**
 * STRICT Primary IMEI OCR Parser.
 * Strictly captures ONLY the Primary IMEI.
 * Explicitly rejects and blacklists:
 * - IMEI2 / Secondary / eSIM
 * - EID (20-32 digits)
 * - ICCID (19-20 digits)
 * Handles both labeled ("IMEI: 35...", "IMEI 35...") and plain unlabeled 15-digit numbers,
 * as well as spaced formats ("35 737082 940705 1").
 */
fun parseVisionText(visionText: Text): ScannedBarcodeResult? {
    val fullRawText = visionText.text
    if (fullRawText.isBlank()) return null

    val forbiddenImeis = mutableSetOf<String>()

    data class CandidateItem(
        val imei: String,
        val top: Int,
        val isExplicitPrimary: Boolean,
        val isValidLuhn: Boolean
    )

    val candidates = mutableListOf<CandidateItem>()

    // Pass 1: Collect all forbidden IMEI2 / Secondary numbers
    for (block in visionText.textBlocks) {
        for (line in block.lines) {
            val raw = line.text.trim()
            val isSecondary = raw.contains("IMEI2", ignoreCase = true) ||
                    raw.contains("IMEI 2", ignoreCase = true) ||
                    raw.contains("IMEI(2)", ignoreCase = true) ||
                    raw.contains("2. IMEI", ignoreCase = true) ||
                    raw.contains("2nd IMEI", ignoreCase = true) ||
                    raw.contains("Secondary", ignoreCase = true) ||
                    raw.contains("eSIM", ignoreCase = true)

            if (isSecondary) {
                val clean = raw.replace(
                    Regex("(?i)\\b(IMEI\\s*2|IMEI2|2nd\\s*IMEI|Secondary|eSIM|IMEI\\s*1|IMEI1|IMEI|MEID|EID|ICCID)\\s*[:=-]?"),
                    " "
                ).trim()
                val d = clean.filter { it.isDigit() }
                if (d.length in 14..16) {
                    val full = if (d.length == 14) meidToImei15(d) else d
                    forbiddenImeis.add(full)
                }
            }
        }
    }

    // Also look for spaced IMEI2 in text
    val spacedSecondaryRegex = Regex("""(?i)\b(IMEI\s*2|IMEI2|2nd\\s*IMEI|Secondary|eSIM)\s*[:=-]?\s*(\d{2}[\s.-]*\d{6}[\s.-]*\d{6}[\s.-]*\d{1})\b""")
    for (match in spacedSecondaryRegex.findAll(fullRawText)) {
        val num = match.groupValues[2].filter { it.isDigit() }
        if (num.length in 14..16) {
            val full = if (num.length == 14) meidToImei15(num) else num
            forbiddenImeis.add(full)
        }
    }

    // Pass 2: Extract candidate lines from individual text lines
    for (block in visionText.textBlocks) {
        for (line in block.lines) {
            val raw = line.text.trim()
            val isSecondary = raw.contains("IMEI2", ignoreCase = true) ||
                    raw.contains("IMEI 2", ignoreCase = true) ||
                    raw.contains("IMEI(2)", ignoreCase = true) ||
                    raw.contains("2. IMEI", ignoreCase = true) ||
                    raw.contains("2nd IMEI", ignoreCase = true) ||
                    raw.contains("Secondary", ignoreCase = true) ||
                    raw.contains("eSIM", ignoreCase = true)

            if (isSecondary) continue // strictly skip

            // Skip EID (20-32 digits) and ICCID (19-20 digits)
            if (raw.contains("EID", ignoreCase = true) || raw.contains("ICCID", ignoreCase = true)) {
                continue
            }

            val isExplicitPrimary = (raw.contains("IMEI", ignoreCase = true) || raw.contains("MEID", ignoreCase = true))
            val box = line.boundingBox
            val top = box?.top ?: 0

            val clean = raw.replace(
                Regex("(?i)\\b(IMEI\\s*1|IMEI1|IMEI|MEID)\\s*[:=-]?"),
                " "
            ).trim()
            val digits = clean.filter { it.isDigit() }

            if (digits.length in 14..16) {
                val fullImei = if (digits.length == 14) meidToImei15(digits) else digits
                if (!forbiddenImeis.contains(fullImei)) {
                    candidates.add(
                        CandidateItem(
                            imei = fullImei,
                            top = top,
                            isExplicitPrimary = isExplicitPrimary,
                            isValidLuhn = isValidLuhn(fullImei)
                        )
                    )
                }
            }
        }
    }

    // Pass 3: Regex scan across full text for any spaced 15-digit number (e.g., 35 737082 940705 1 or 35 722209 004824 9)
    val spacedImeiRegex = Regex("""\b(\d{2})[\s.-]+(\d{6})[\s.-]+(\d{6})[\s.-]+(\d{1})\b""")
    for (match in spacedImeiRegex.findAll(fullRawText)) {
        val full = match.groupValues[1] + match.groupValues[2] + match.groupValues[3] + match.groupValues[4]
        if (full.length == 15 && !forbiddenImeis.contains(full)) {
            if (candidates.none { it.imei == full }) {
                candidates.add(
                    CandidateItem(
                        imei = full,
                        top = 0,
                        isExplicitPrimary = true, // 2-6-6-1 format is the official GSM display format
                        isValidLuhn = isValidLuhn(full)
                    )
                )
            }
        }
    }

    // Pass 4: Regex scan for any 15-digit contiguous number in document
    val contiguousRegex = Regex("""\b\d{15}\b""")
    for (match in contiguousRegex.findAll(fullRawText)) {
        val num = match.value
        if (!forbiddenImeis.contains(num)) {
            if (candidates.none { it.imei == num }) {
                candidates.add(
                    CandidateItem(
                        imei = num,
                        top = 0,
                        isExplicitPrimary = false,
                        isValidLuhn = isValidLuhn(num)
                    )
                )
            }
        }
    }

    // Filter out forbidden secondary IMEIs
    val validCandidates = candidates.filter { !forbiddenImeis.contains(it.imei) }

    // Best selection:
    // 1. Explicit primary with valid Luhn
    // 2. Any candidate with valid Luhn starting with standard TAC prefix (35, 01, 86, 99)
    // 3. Any candidate with valid Luhn
    // 4. Explicit primary
    // 5. Any candidate
    val chosen = validCandidates.firstOrNull { it.isExplicitPrimary && it.isValidLuhn }
        ?: validCandidates.firstOrNull { it.isValidLuhn && (it.imei.startsWith("35") || it.imei.startsWith("01") || it.imei.startsWith("86") || it.imei.startsWith("99")) }
        ?: validCandidates.firstOrNull { it.isValidLuhn }
        ?: validCandidates.firstOrNull { it.isExplicitPrimary }
        ?: validCandidates.firstOrNull()

    if (chosen != null) {
        return ScannedBarcodeResult(
            primaryImei = chosen.imei,
            secondaryImei = null, // Strictly null: never capture secondary
            eid = null,           // Strictly null: never capture EID
            rawText = fullRawText
        )
    }

    return parseScannedBarcodeText(fullRawText)
}

fun parseScannedBarcodeText(raw: String): ScannedBarcodeResult? {
    val trimmed = raw.trim()
    val lines = trimmed.lines().map { it.trim() }.filter { it.isNotBlank() }

    val forbiddenImeis = mutableSetOf<String>()
    val primaryCandidates = mutableListOf<String>()

    for (line in lines) {
        val isSecondary = line.contains("IMEI2", ignoreCase = true) ||
                line.contains("IMEI 2", ignoreCase = true) ||
                line.contains("Secondary", ignoreCase = true) ||
                line.contains("eSIM", ignoreCase = true)

        val clean = line.replace(
            Regex("(?i)\\b(IMEI\\s*2|IMEI2|2nd\\s*IMEI|Secondary|eSIM|IMEI\\s*1|IMEI1|IMEI|MEID|EID|ICCID)\\s*[:=-]?"),
            " "
        ).trim()
        val d = clean.filter { it.isDigit() }
        val full = if (d.length == 14) meidToImei15(d) else d

        if (isSecondary && full.length in 14..16) {
            forbiddenImeis.add(full)
        } else if (full.length in 14..16 && !line.contains("EID", ignoreCase = true) && !line.contains("ICCID", ignoreCase = true)) {
            primaryCandidates.add(full)
        }
    }

    val filtered = primaryCandidates.filter { !forbiddenImeis.contains(it) }
    val luhnMatch = filtered.firstOrNull { isValidLuhn(it) } ?: filtered.firstOrNull()

    if (luhnMatch != null) {
        return ScannedBarcodeResult(
            primaryImei = luhnMatch,
            secondaryImei = null,
            eid = null,
            rawText = trimmed
        )
    }

    val fallbackDigits = trimmed.filter { it.isDigit() }
    if (fallbackDigits.length == 15 && isValidLuhn(fallbackDigits)) {
        return ScannedBarcodeResult(
            primaryImei = fallbackDigits,
            secondaryImei = null,
            eid = null,
            rawText = trimmed
        )
    }

    return null
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
    var isConfirmed by remember { mutableStateOf(false) }

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
                    onBarcodeDetected = { result ->
                        isConfirmed = true
                        onBarcodeScanned(result)
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
                        animation = tween(1500, easing = LinearEasing),
                        repeatMode = RepeatMode.Reverse
                    ),
                    label = "laser_anim"
                )

                val borderColor by animateColorAsState(
                    targetValue = when {
                        isConfirmed -> Color(0xFF10B981) // Emerald locked
                        lockingCandidate != null -> Color(0xFF22C55E) // Green verifying
                        else -> Color(0xFF3B82F6) // Blue searching
                    },
                    animationSpec = tween(140),
                    label = "border_color"
                )

                // Viewfinder Target Overlay
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(horizontal = 28.dp, vertical = 110.dp),
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
                                .height(220.dp)
                                .border(
                                    width = if (lockingCandidate != null || isConfirmed) 3.dp else 2.dp,
                                    color = borderColor,
                                    shape = RoundedCornerShape(18.dp)
                                )
                                .background(if (lockingCandidate != null) Color(0xFF22C55E).copy(alpha = 0.08f) else Color.Transparent)
                        ) {
                            // Animated Scanning Line (only when searching)
                            if (lockingCandidate == null && !isConfirmed) {
                                Box(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .height(2.5.dp)
                                        .offset(y = (220 * laserPosition).dp)
                                        .background(Color(0xFF60A5FA))
                                )
                            }
                        }

                        Spacer(modifier = Modifier.height(14.dp))

                        // Target Status Pill: Only shown when locking/verifying or confirmed
                        AnimatedVisibility(
                            visible = lockingCandidate != null || isConfirmed,
                            enter = fadeIn(tween(150)),
                            exit = fadeOut(tween(150))
                        ) {
                            Surface(
                                color = Color(0xEE16A34A),
                                shape = RoundedCornerShape(20.dp),
                                modifier = Modifier.padding(horizontal = 8.dp)
                            ) {
                                Column(
                                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
                                    horizontalAlignment = Alignment.CenterHorizontally
                                ) {
                                    if (isConfirmed) {
                                        Row(verticalAlignment = Alignment.CenterVertically) {
                                            Icon(
                                                imageVector = Icons.Default.CheckCircle,
                                                contentDescription = null,
                                                tint = Color.White,
                                                modifier = Modifier.size(16.dp)
                                            )
                                            Spacer(modifier = Modifier.width(6.dp))
                                            Text(
                                                text = "IMEI Captured!",
                                                color = Color.White,
                                                fontSize = 13.sp,
                                                fontWeight = FontWeight.Bold
                                            )
                                        }
                                    } else if (lockingCandidate != null) {
                                        Text(
                                            text = "Targeting IMEI...",
                                            color = Color.White,
                                            fontSize = 11.sp,
                                            fontWeight = FontWeight.Medium
                                        )
                                        Text(
                                            text = lockingCandidate ?: "",
                                            color = Color.White,
                                            fontSize = 14.5.sp,
                                            fontWeight = FontWeight.Bold,
                                            letterSpacing = 0.5.sp
                                        )
                                        Spacer(modifier = Modifier.height(4.dp))
                                        LinearProgressIndicator(
                                            progress = { lockingProgress },
                                            color = Color.White,
                                            trackColor = Color.White.copy(alpha = 0.3f),
                                            modifier = Modifier
                                                .width(160.dp)
                                                .height(4.dp)
                                                .clip(RoundedCornerShape(2.dp))
                                        )
                                    }
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
                        text = "Camera access is required to scan IMEI barcodes or text directly from device screens and packaging.",
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

            // Top Bar Overlay: Clean layout without upper text
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
                            val clean = manualInput.filter { it.isDigit() }
                            if (clean.length in 14..16) {
                                val full = if (clean.length == 14) meidToImei15(clean) else clean
                                ScannerFeedbackHelper.playBeep()
                                ScannerFeedbackHelper.vibrate(context)
                                onBarcodeScanned(
                                    ScannedBarcodeResult(
                                        primaryImei = full,
                                        rawText = manualInput
                                    )
                                )
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
    onBarcodeDetected: (ScannedBarcodeResult) -> Unit,
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
                val barcodeScanner = BarcodeScanning.getClient(
                    BarcodeScannerOptions.Builder()
                        .setBarcodeFormats(
                            Barcode.FORMAT_CODE_128,
                            Barcode.FORMAT_CODE_39,
                            Barcode.FORMAT_QR_CODE,
                            Barcode.FORMAT_DATA_MATRIX,
                            Barcode.FORMAT_EAN_13,
                            Barcode.FORMAT_ITF,
                            Barcode.FORMAT_UPC_A
                        )
                        .build()
                )
                val executor = Executors.newSingleThreadExecutor()

                // Stabilization & Verification tracking
                var currentCandidateResult: ScannedBarcodeResult? = null
                var candidateFirstSeenMs: Long = 0L
                var lastSeenCandidateMs: Long = 0L
                val BARCODE_CONFIRMATION_MS = 80L  // Fast 80ms confirmation for barcodes
                val OCR_CONFIRMATION_MS = 140L      // Fast 140ms (~2 frames) confirmation for plain text
                val GRACE_PERIOD_MS = 300L

                fun handleCandidateMatch(result: ScannedBarcodeResult, isBarcode: Boolean) {
                    val candidate = result.primaryImei
                    val now = System.currentTimeMillis()
                    val requiredMs = if (isBarcode) BARCODE_CONFIRMATION_MS else OCR_CONFIRMATION_MS

                    if (currentCandidateResult == null) {
                        currentCandidateResult = result
                        candidateFirstSeenMs = now
                        lastSeenCandidateMs = now
                        ContextCompat.getMainExecutor(ctx).execute {
                            onLockProgress(candidate, 0.25f)
                        }
                    } else if (currentCandidateResult?.primaryImei == candidate) {
                        lastSeenCandidateMs = now
                        val elapsed = now - candidateFirstSeenMs
                        val progress = (elapsed.toFloat() / requiredMs).coerceIn(0f, 1f)
                        ContextCompat.getMainExecutor(ctx).execute {
                            onLockProgress(candidate, progress)
                        }

                        if (elapsed >= requiredMs && !hasDetected) {
                            hasDetected = true
                            // 🔊 Trigger authentic supermarket scanner beep & tactile vibration!
                            ScannerFeedbackHelper.playBeep()
                            ScannerFeedbackHelper.vibrate(ctx)
                            ContextCompat.getMainExecutor(ctx).execute {
                                onBarcodeDetected(result)
                            }
                        }
                    } else {
                        if (now - lastSeenCandidateMs > GRACE_PERIOD_MS) {
                            currentCandidateResult = result
                            candidateFirstSeenMs = now
                            lastSeenCandidateMs = now
                            ContextCompat.getMainExecutor(ctx).execute {
                                onLockProgress(candidate, 0.25f)
                            }
                        }
                    }
                }

                imageAnalysis.setAnalyzer(executor) { imageProxy ->
                    val mediaImage = imageProxy.image
                    if (mediaImage != null && !hasDetected) {
                        val inputImage = InputImage.fromMediaImage(mediaImage, imageProxy.imageInfo.rotationDegrees)

                        // Run BOTH Barcode and OCR simultaneously on the live frame
                        val barcodeTask = barcodeScanner.process(inputImage)
                        val textTask = textRecognizer.process(inputImage)

                        // Safely synchronize: ONLY close imageProxy after BOTH engines have finished reading the frame
                        Tasks.whenAllComplete(barcodeTask, textTask)
                            .addOnSuccessListener {
                                if (hasDetected) return@addOnSuccessListener

                                // 1. Check 1D/2D Barcodes first
                                val barcodes = try { barcodeTask.result } catch (_: Exception) { null }
                                val imeiBarcodes = barcodes?.mapNotNull { b ->
                                    val digits = b.rawValue?.filter { it.isDigit() } ?: ""
                                    if (digits.length in 14..16) {
                                        val full = if (digits.length == 14) meidToImei15(digits) else digits
                                        b to full
                                    } else null
                                }?.sortedBy { it.first.boundingBox?.top ?: 0 }

                                if (!imeiBarcodes.isNullOrEmpty()) {
                                    val primaryBarcodeImei = imeiBarcodes[0].second
                                    val result = ScannedBarcodeResult(
                                        primaryImei = primaryBarcodeImei,
                                        secondaryImei = null,
                                        eid = null,
                                        rawText = primaryBarcodeImei
                                    )
                                    handleCandidateMatch(result, isBarcode = true)
                                    return@addOnSuccessListener
                                }

                                // 2. Check Text Recognition (OCR) for plain text IMEIs
                                val visionText = try { textTask.result } catch (_: Exception) { null }
                                if (visionText != null && visionText.text.isNotBlank()) {
                                    val parsed = parseVisionText(visionText)
                                    if (parsed != null && parsed.primaryImei.isNotBlank()) {
                                        handleCandidateMatch(parsed, isBarcode = false)
                                        return@addOnSuccessListener
                                    }
                                }

                                // Reset candidate tracking if lost
                                val now = System.currentTimeMillis()
                                if (currentCandidateResult != null && (now - lastSeenCandidateMs > GRACE_PERIOD_MS) && !hasDetected) {
                                    currentCandidateResult = null
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
