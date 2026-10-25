package com.imei.inventory.ui.components

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Matrix
import android.net.Uri
import android.widget.Toast
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.gestures.rememberTransformableState
import androidx.compose.foundation.gestures.transformable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.ui.draw.clipToBounds
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import androidx.core.content.FileProvider
import androidx.exifinterface.media.ExifInterface
import coil.compose.AsyncImage
import com.imei.inventory.data.api.ApiClient
import com.imei.inventory.data.model.DeviceDto
import com.imei.inventory.data.model.DevicePhotoDto
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.asRequestBody
import okhttp3.RequestBody.Companion.toRequestBody
import java.io.File
import java.io.FileOutputStream
import java.io.InputStream
import java.util.Locale

val PHOTO_TAG_CHOICES = listOf(
    "ABOUT" to "About",
    "BATTERY" to "Battery",
    "LEFT" to "Left",
    "RIGHT" to "Right",
    "TOP" to "Top",
    "BOTTOM" to "Bottom",
    "FRONT" to "Front",
    "REAR" to "Rear",
    "HOME" to "Home",
    "CAMERA" to "Camera"
)

/**
 * Sleek Blue Camera Count Badge for Inventory & Scanner
 */
@Composable
fun DeviceCameraBadge(
    count: Int,
    modifier: Modifier = Modifier
) {
    if (count <= 0) return
    Surface(
        color = Color(0xFF2563EB).copy(alpha = 0.12f),
        contentColor = Color(0xFF2563EB),
        shape = RoundedCornerShape(6.dp),
        border = BorderStroke(1.dp, Color(0xFF2563EB).copy(alpha = 0.35f)),
        modifier = modifier
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(3.dp),
            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
        ) {
            Icon(
                imageVector = Icons.Default.CameraAlt,
                contentDescription = null,
                modifier = Modifier.size(11.dp)
            )
            Text(
                text = count.toString(),
                fontSize = 11.sp,
                fontWeight = FontWeight.ExtraBold
            )
        }
    }
}

/**
 * Compact Horizontal Photo Gallery Strip
 */
@Composable
fun DevicePhotoStrip(
    device: DeviceDto,
    token: String,
    isAdmin: Boolean = false,
    onDeviceUpdated: ((DeviceDto) -> Unit)? = null,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val photos = (device.photos ?: device.images ?: emptyList()).filter { it.url.isNotBlank() }

    var lightboxIndex by remember { mutableStateOf<Int?>(null) }
    var showCaptureDialog by remember { mutableStateOf(false) }

    // If not admin and no photos, keep zero clutter
    if (!isAdmin && photos.isEmpty()) {
        return
    }

    Surface(
        color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.35f),
        shape = RoundedCornerShape(14.dp),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f)),
        modifier = modifier.fillMaxWidth()
    ) {
        Column(modifier = Modifier.padding(10.dp)) {
            // Header Row
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.PhotoLibrary,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.size(16.dp)
                    )
                    Text(
                        text = "Photos",
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                    if (photos.isNotEmpty()) {
                        DeviceCameraBadge(count = photos.size)
                    }
                }

                if (isAdmin) {
                    FilledTonalButton(
                        onClick = { showCaptureDialog = true },
                        contentPadding = PaddingValues(horizontal = 10.dp, vertical = 4.dp),
                        shape = RoundedCornerShape(8.dp),
                        modifier = Modifier.height(28.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.AddAPhoto,
                            contentDescription = null,
                            modifier = Modifier.size(14.dp)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("Add Photos", fontSize = 11.5.sp, fontWeight = FontWeight.Bold)
                    }
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            // Photos Row
            if (photos.isEmpty()) {
                Surface(
                    color = MaterialTheme.colorScheme.surface,
                    shape = RoundedCornerShape(10.dp),
                    border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.4f)),
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable(enabled = isAdmin) { showCaptureDialog = true }
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 12.dp, horizontal = 14.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.Center
                    ) {
                        Icon(
                            imageVector = Icons.Default.CloudUpload,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.primary,
                            modifier = Modifier.size(18.dp)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = if (isAdmin) "Tap to snap photos (About, Screen, Battery)" else "No photos attached",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Medium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            } else {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .horizontalScroll(rememberScrollState()),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    photos.forEachIndexed { index, photo ->
                        Box(
                            modifier = Modifier
                                .size(82.dp)
                                .clip(RoundedCornerShape(6.dp))
                                .background(Color.Black)
                                .clickable { lightboxIndex = index }
                        ) {
                            AsyncImage(
                                model = photo.url,
                                contentDescription = photo.caption ?: "Device photo",
                                contentScale = ContentScale.Crop,
                                modifier = Modifier.fillMaxSize()
                            )

                            // Tag Badge on Top-Left
                            Surface(
                                color = Color.Black.copy(alpha = 0.7f),
                                shape = RoundedCornerShape(4.dp),
                                modifier = Modifier
                                    .padding(4.dp)
                                    .align(Alignment.TopStart)
                            ) {
                                Text(
                                    text = photo.photoTypeDisplay ?: photo.photoType.lowercase().replaceFirstChar { it.uppercase() },
                                    fontSize = 9.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Color.White,
                                    modifier = Modifier.padding(horizontal = 4.dp, vertical = 1.dp)
                                )
                            }
                        }
                    }

                    // Admin Quick Add Card at the end of the strip
                    if (isAdmin) {
                        Surface(
                            color = MaterialTheme.colorScheme.primary.copy(alpha = 0.08f),
                            shape = RoundedCornerShape(10.dp),
                            border = BorderStroke(1.dp, MaterialTheme.colorScheme.primary.copy(alpha = 0.35f)),
                            modifier = Modifier
                                .size(82.dp)
                                .clickable { showCaptureDialog = true }
                        ) {
                            Column(
                                modifier = Modifier.fillMaxSize(),
                                horizontalAlignment = Alignment.CenterHorizontally,
                                verticalArrangement = Arrangement.Center
                            ) {
                                Icon(
                                    imageVector = Icons.Default.AddAPhoto,
                                    contentDescription = null,
                                    tint = MaterialTheme.colorScheme.primary,
                                    modifier = Modifier.size(20.dp)
                                )
                                Spacer(modifier = Modifier.height(4.dp))
                                Text(
                                    text = "Add More",
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = MaterialTheme.colorScheme.primary
                                )
                            }
                        }
                    }
                }
            }
        }
    }

    // Lightbox Dialog
    lightboxIndex?.let { idx ->
        PhotoLightboxDialog(
            photos = photos,
            initialIndex = idx,
            deviceModel = device.model,
            token = token,
            isAdmin = isAdmin,
            deviceId = device.id,
            onDismiss = { lightboxIndex = null },
            onPhotoDeleted = { deletedId ->
                val remaining = photos.filter { it.id != deletedId }
                val updated = device.copy(photos = remaining, images = remaining)
                onDeviceUpdated?.invoke(updated)
                if (remaining.isEmpty()) {
                    lightboxIndex = null
                } else if (idx >= remaining.size) {
                    lightboxIndex = remaining.size - 1
                }
            }
        )
    }

    // Capture & Upload Dialog
    if (showCaptureDialog) {
        DevicePhotoCaptureDialog(
            device = device,
            token = token,
            onDismiss = { showCaptureDialog = false },
            onPhotosUploaded = { updatedDev ->
                onDeviceUpdated?.invoke(updatedDev)
            }
        )
    }
}

/**
 * Zoomable Image component with two-finger pinch-to-zoom, pan, and double-tap zoom
 */
@Composable
fun ZoomableAsyncImage(
    imageUrl: String,
    contentDescription: String?,
    onIsZoomedChanged: (Boolean) -> Unit
) {
    var scale by remember(imageUrl) { mutableFloatStateOf(1f) }
    var offset by remember(imageUrl) { mutableStateOf(Offset.Zero) }

    LaunchedEffect(scale) {
        onIsZoomedChanged(scale > 1.05f)
    }

    val transformState = rememberTransformableState { zoomChange, panChange, _ ->
        val newScale = (scale * zoomChange).coerceIn(1f, 5f)
        scale = newScale
        if (newScale > 1.05f) {
            val maxPanX = (newScale - 1f) * 600f
            val maxPanY = (newScale - 1f) * 600f
            offset = Offset(
                x = (offset.x + panChange.x).coerceIn(-maxPanX, maxPanX),
                y = (offset.y + panChange.y).coerceIn(-maxPanY, maxPanY)
            )
        } else {
            offset = Offset.Zero
        }
    }

    val isZoomed = scale > 1.05f

    Box(
        modifier = Modifier
            .fillMaxSize()
            .clipToBounds()
            .then(
                if (isZoomed) {
                    Modifier.pointerInput(Unit) {
                        detectDragGestures { change, dragAmount ->
                            change.consume()
                            val maxPanX = (scale - 1f) * 600f
                            val maxPanY = (scale - 1f) * 600f
                            offset = Offset(
                                x = (offset.x + dragAmount.x).coerceIn(-maxPanX, maxPanX),
                                y = (offset.y + dragAmount.y).coerceIn(-maxPanY, maxPanY)
                            )
                        }
                    }
                } else {
                    Modifier
                }
            )
            .transformable(
                state = transformState,
                lockRotationOnZoomPan = true
            )
            .pointerInput(Unit) {
                detectTapGestures(
                    onDoubleTap = {
                        if (scale > 1.05f) {
                            scale = 1f
                            offset = Offset.Zero
                        } else {
                            scale = 2.5f
                        }
                    }
                )
            },
        contentAlignment = Alignment.Center
    ) {
        AsyncImage(
            model = imageUrl,
            contentDescription = contentDescription,
            contentScale = ContentScale.Fit,
            modifier = Modifier
                .fillMaxSize()
                .graphicsLayer {
                    scaleX = scale
                    scaleY = scale
                    translationX = offset.x
                    translationY = offset.y
                }
        )
    }
}

/**
 * Fullscreen Interactive Lightbox
 */
@OptIn(androidx.compose.foundation.ExperimentalFoundationApi::class)
@Composable
fun PhotoLightboxDialog(
    photos: List<DevicePhotoDto>,
    initialIndex: Int,
    deviceModel: String,
    token: String,
    isAdmin: Boolean,
    deviceId: Int,
    onDismiss: () -> Unit,
    onPhotoDeleted: (Int) -> Unit
) {
    val pagerState = rememberPagerState(
        initialPage = initialIndex.coerceIn(0, (photos.size - 1).coerceAtLeast(0)),
        pageCount = { photos.size }
    )
    val currentIndex = pagerState.currentPage
    val currentPhoto = photos.getOrNull(currentIndex)
    var isCurrentPageZoomed by remember { mutableStateOf(false) }

    var isDeleting by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    val context = LocalContext.current

    // Reset zoom state when navigating to another page
    LaunchedEffect(currentIndex) {
        isCurrentPageZoomed = false
    }

    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(usePlatformDefaultWidth = false)
    ) {
        Surface(
            color = Color(0xFF030712),
            modifier = Modifier.fillMaxSize()
        ) {
            Column(modifier = Modifier.fillMaxSize()) {
                // Top Action Bar (Redesigned for mobile)
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 14.dp, vertical = 10.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    // Left: Title + Counter below it
                    Column(
                        modifier = Modifier
                            .weight(1f, fill = false)
                            .padding(end = 8.dp),
                        verticalArrangement = Arrangement.spacedBy(3.dp)
                    ) {
                        Text(
                            text = deviceModel,
                            color = Color.White,
                            fontWeight = FontWeight.Bold,
                            fontSize = 13.sp,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                        Surface(
                            color = Color.White.copy(alpha = 0.15f),
                            shape = RoundedCornerShape(3.dp)
                        ) {
                            Text(
                                text = "${currentIndex + 1} of ${photos.size}",
                                color = Color.White.copy(alpha = 0.85f),
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier.padding(horizontal = 5.dp, vertical = 1.dp)
                            )
                        }
                    }

                    // Right: Tag Chip, Download, Delete, Close
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        currentPhoto?.let { p ->
                            Surface(
                                color = Color(0xFF2563EB),
                                shape = RoundedCornerShape(4.dp)
                            ) {
                                Text(
                                    text = p.photoTypeDisplay ?: p.photoType,
                                    color = Color.White,
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold,
                                    modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                )
                            }
                        }

                        // Download Photo
                        IconButton(
                            onClick = {
                                currentPhoto?.url?.let { url ->
                                    try {
                                        val dm = context.getSystemService(Context.DOWNLOAD_SERVICE) as android.app.DownloadManager
                                        val request = android.app.DownloadManager.Request(Uri.parse(url))
                                            .setTitle("${deviceModel}_photo_${currentIndex + 1}.jpg")
                                            .setDescription("Downloading photo")
                                            .setNotificationVisibility(android.app.DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
                                            .setDestinationInExternalPublicDir(android.os.Environment.DIRECTORY_DOWNLOADS, "${deviceModel}_photo_${currentIndex + 1}.jpg")
                                            .setAllowedOverMetered(true)
                                            .setAllowedOverRoaming(true)
                                        dm.enqueue(request)
                                        Toast.makeText(context, "Download started...", Toast.LENGTH_SHORT).show()
                                    } catch (e: Exception) {
                                        try {
                                            val browserIntent = android.content.Intent(android.content.Intent.ACTION_VIEW, Uri.parse(url))
                                            context.startActivity(browserIntent)
                                        } catch (ex: Exception) {
                                            Toast.makeText(context, "Cannot download: ${ex.localizedMessage}", Toast.LENGTH_SHORT).show()
                                        }
                                    }
                                }
                            }
                        ) {
                            Icon(Icons.Default.Download, contentDescription = "Download Photo", tint = Color.White.copy(alpha = 0.9f))
                        }

                        if (isAdmin && currentPhoto != null) {
                            IconButton(
                                onClick = {
                                    if (isDeleting) return@IconButton
                                    isDeleting = true
                                    scope.launch {
                                        try {
                                            val res = ApiClient.apiService.deleteDevicePhoto("Bearer $token", deviceId, currentPhoto.id)
                                            if (res.isSuccessful) {
                                                Toast.makeText(context, "Photo deleted", Toast.LENGTH_SHORT).show()
                                                onPhotoDeleted(currentPhoto.id)
                                            } else {
                                                Toast.makeText(context, "Failed to delete photo", Toast.LENGTH_SHORT).show()
                                            }
                                        } catch (e: Exception) {
                                            Toast.makeText(context, "Error: ${e.localizedMessage}", Toast.LENGTH_SHORT).show()
                                        } finally {
                                            isDeleting = false
                                        }
                                    }
                                }
                            ) {
                                if (isDeleting) {
                                    CircularProgressIndicator(color = Color.Red, modifier = Modifier.size(18.dp))
                                } else {
                                    Icon(Icons.Default.Delete, contentDescription = "Delete", tint = Color(0xFFEF4444))
                                }
                            }
                        }

                        IconButton(onClick = onDismiss) {
                            Icon(Icons.Default.Close, contentDescription = "Close", tint = Color.White)
                        }
                    }
                }

                // Photo Display & Navigation with HorizontalPager animated sliding & pinch-to-zoom
                HorizontalPager(
                    state = pagerState,
                    userScrollEnabled = !isCurrentPageZoomed,
                    modifier = Modifier
                        .weight(1f)
                        .fillMaxWidth()
                ) { page ->
                    val photo = photos.getOrNull(page)
                    if (photo != null) {
                        ZoomableAsyncImage(
                            imageUrl = photo.url,
                            contentDescription = photo.caption,
                            onIsZoomedChanged = { isZoomed ->
                                if (page == pagerState.currentPage) {
                                    isCurrentPageZoomed = isZoomed
                                }
                            }
                        )
                    }
                }

                // Rectangular Bottom Thumbnails Strip
                if (photos.size > 1) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(Color.Black.copy(alpha = 0.6f))
                            .padding(horizontal = 12.dp, vertical = 8.dp)
                            .horizontalScroll(rememberScrollState()),
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        photos.forEachIndexed { idx, p ->
                            val isSelected = idx == currentIndex
                            Box(
                                modifier = Modifier
                                    .size(46.dp)
                                    .clip(RoundedCornerShape(4.dp))
                                    .border(
                                        width = if (isSelected) 2.dp else 1.dp,
                                        color = if (isSelected) Color(0xFF2563EB) else Color.White.copy(alpha = 0.25f),
                                        shape = RoundedCornerShape(4.dp)
                                    )
                                    .clickable {
                                        scope.launch {
                                            pagerState.animateScrollToPage(idx)
                                        }
                                    }
                            ) {
                                AsyncImage(
                                    model = p.url,
                                    contentDescription = null,
                                    contentScale = ContentScale.Crop,
                                    modifier = Modifier.fillMaxSize()
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

/**
 * Mobile Camera / Gallery Photo Intake Dialog
 */
@OptIn(ExperimentalLayoutApi::class)
@Composable
fun DevicePhotoCaptureDialog(
    device: DeviceDto,
    token: String,
    onDismiss: () -> Unit,
    onPhotosUploaded: (DeviceDto) -> Unit
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()

    var currentDevice by remember(device) { mutableStateOf(device) }
    val uploadedTags = remember(currentDevice.allPhotos) {
        currentDevice.allPhotos.map { it.photoType.uppercase() }.toSet()
    }

    // Default to the first missing tag if available
    val initialTag = remember(device.id) {
        PHOTO_TAG_CHOICES.firstOrNull { (value, _) -> !device.allPhotos.any { it.photoType.equals(value, ignoreCase = true) } }?.first ?: "ABOUT"
    }
    var selectedTag by remember { mutableStateOf(initialTag) }

    var isUploading by remember { mutableStateOf(false) }
    var tempCameraUri by remember { mutableStateOf<Uri?>(null) }
    var tempCameraFile by remember { mutableStateOf<File?>(null) }

    // Upload helper
    val uploadFile: (File, String) -> Unit = { file, tag ->
        isUploading = true
        scope.launch {
            try {
                val compressedFile = withContext(Dispatchers.IO) {
                    compressImageForUpload(context, file)
                }

                val reqFile = compressedFile.asRequestBody("image/jpeg".toMediaTypeOrNull())
                val body = MultipartBody.Part.createFormData("images", compressedFile.name, reqFile)
                val tagBody = tag.toRequestBody("text/plain".toMediaTypeOrNull())
                val isPrimaryBody = "false".toRequestBody("text/plain".toMediaTypeOrNull())

                val res = ApiClient.apiService.uploadDevicePhoto(
                    token = "Bearer $token",
                    id = currentDevice.id,
                    images = body,
                    photoType = tagBody,
                    isPrimary = isPrimaryBody
                )

                if (res.isSuccessful && res.body()?.device != null) {
                    Toast.makeText(context, "Uploaded $tag photo!", Toast.LENGTH_SHORT).show()
                    val updated = res.body()?.device!!
                    currentDevice = updated
                    onPhotosUploaded(updated)

                    // Auto-advance to the next missing tag for guided rapid capture flow
                    val nextMissing = PHOTO_TAG_CHOICES.firstOrNull { (valKey, _) ->
                        !updated.allPhotos.any { it.photoType.equals(valKey, ignoreCase = true) }
                    }?.first
                    if (nextMissing != null) {
                        selectedTag = nextMissing
                    } else {
                        val currentIndex = PHOTO_TAG_CHOICES.indexOfFirst { it.first == tag }
                        if (currentIndex != -1 && currentIndex < PHOTO_TAG_CHOICES.size - 1) {
                            selectedTag = PHOTO_TAG_CHOICES[currentIndex + 1].first
                        }
                    }
                } else {
                    val errMsg = res.errorBody()?.string() ?: res.body()?.error ?: "Upload failed"
                    Toast.makeText(context, "Upload failed: $errMsg", Toast.LENGTH_LONG).show()
                }
            } catch (e: Exception) {
                Toast.makeText(context, "Error: ${e.localizedMessage}", Toast.LENGTH_LONG).show()
            } finally {
                isUploading = false
            }
        }
    }

    // Camera Launcher
    val cameraLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.TakePicture()
    ) { success ->
        if (success && tempCameraFile != null && tempCameraFile!!.exists()) {
            uploadFile(tempCameraFile!!, selectedTag)
        }
    }

    // Gallery Picker Launcher
    val galleryLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent()
    ) { uri: Uri? ->
        uri?.let {
            scope.launch {
                val file = withContext(Dispatchers.IO) {
                    copyUriToTempFile(context, it)
                }
                file?.let { f ->
                    uploadFile(f, selectedTag)
                }
            }
        }
    }

    AlertDialog(
        onDismissRequest = { if (!isUploading) onDismiss() },
        title = {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        Text(
                            text = "Snap Condition Photo",
                            fontSize = 17.sp,
                            fontWeight = FontWeight.ExtraBold
                        )
                        val count = currentDevice.allPhotos.size
                        if (count > 0) {
                            DeviceCameraBadge(count = count)
                        }
                    }
                    Text(
                        text = currentDevice.model,
                        fontSize = 12.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
                IconButton(onClick = onDismiss, enabled = !isUploading) {
                    Icon(Icons.Default.Close, contentDescription = "Close")
                }
            }
        },
        text = {
            val isCurrentTagUploaded = uploadedTags.contains(selectedTag.uppercase())
            Column(modifier = Modifier.fillMaxWidth()) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = if (isCurrentTagUploaded) "Selected: $selectedTag (Replace)" else "Select Tag for Next Photo:",
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold,
                        color = if (isCurrentTagUploaded) Color(0xFFD97706) else MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Text(
                        text = "${uploadedTags.size}/${PHOTO_TAG_CHOICES.size} Done",
                        fontSize = 11.5.sp,
                        fontWeight = FontWeight.Bold,
                        color = if (uploadedTags.size == PHOTO_TAG_CHOICES.size) Color(0xFF10B981) else Color(0xFF2563EB)
                    )
                }

                Spacer(modifier = Modifier.height(8.dp))

                // Tag Chips with Green Indicator for Already-Uploaded Tags & Clear Borders for Missing Tags
                FlowRow(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                    verticalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    PHOTO_TAG_CHOICES.forEach { (value, label) ->
                        val isSelected = selectedTag == value
                        val isUploaded = uploadedTags.contains(value.uppercase())

                        FilterChip(
                            selected = isSelected,
                            onClick = { selectedTag = value },
                            label = {
                                Text(
                                    text = if (isUploaded) "✓ $label" else label,
                                    fontSize = 11.5.sp,
                                    fontWeight = if (isSelected || isUploaded) FontWeight.Bold else FontWeight.Medium
                                )
                            },
                            colors = FilterChipDefaults.filterChipColors(
                                selectedContainerColor = if (isUploaded) Color(0xFF10B981) else MaterialTheme.colorScheme.primary,
                                selectedLabelColor = Color.White,
                                containerColor = if (isUploaded) Color(0xFF10B981).copy(alpha = 0.15f) else MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.45f),
                                labelColor = if (isUploaded) Color(0xFF047857) else MaterialTheme.colorScheme.onSurface
                            ),
                            border = FilterChipDefaults.filterChipBorder(
                                enabled = true,
                                selected = isSelected,
                                borderColor = if (isUploaded) Color(0xFF10B981).copy(alpha = 0.65f) else Color(0xFF94A3B8),
                                selectedBorderColor = Color.Transparent,
                                borderWidth = 1.dp
                            ),
                            shape = RoundedCornerShape(8.dp),
                            modifier = Modifier.height(28.dp)
                        )
                    }
                }

                Spacer(modifier = Modifier.height(18.dp))

                if (isUploading) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 14.dp),
                        horizontalArrangement = Arrangement.Center,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        CircularProgressIndicator(modifier = Modifier.size(24.dp))
                        Spacer(modifier = Modifier.width(12.dp))
                        Text(if (isCurrentTagUploaded) "Replacing photo on Cloudinary..." else "Uploading photo to Cloudinary...", fontSize = 13.sp, fontWeight = FontWeight.Medium)
                    }
                } else {
                    // Action Buttons: Direct Camera vs Gallery (Single-line, unclipped)
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        Button(
                            onClick = {
                                val photoFile = File.createTempFile("dev_${currentDevice.id}_${selectedTag}_", ".jpg", context.cacheDir)
                                tempCameraFile = photoFile
                                val uri = FileProvider.getUriForFile(
                                    context,
                                    "${context.packageName}.fileprovider",
                                    photoFile
                                )
                                tempCameraUri = uri
                                cameraLauncher.launch(uri)
                            },
                            contentPadding = PaddingValues(horizontal = 8.dp, vertical = 0.dp),
                            shape = RoundedCornerShape(12.dp),
                            modifier = Modifier
                                .weight(1f)
                                .height(46.dp)
                        ) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.Center
                            ) {
                                Icon(Icons.Default.CameraAlt, contentDescription = null, modifier = Modifier.size(18.dp))
                                Spacer(modifier = Modifier.width(6.dp))
                                Text(
                                    text = if (isCurrentTagUploaded) "Replace Photo" else "Take Photo",
                                    fontSize = 13.sp,
                                    fontWeight = FontWeight.Bold,
                                    maxLines = 1,
                                    softWrap = false
                                )
                            }
                        }

                        OutlinedButton(
                            onClick = { galleryLauncher.launch("image/*") },
                            contentPadding = PaddingValues(horizontal = 8.dp, vertical = 0.dp),
                            shape = RoundedCornerShape(12.dp),
                            modifier = Modifier
                                .weight(1f)
                                .height(46.dp)
                        ) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.Center
                            ) {
                                Icon(Icons.Default.PhotoLibrary, contentDescription = null, modifier = Modifier.size(18.dp))
                                Spacer(modifier = Modifier.width(6.dp))
                                Text(
                                    text = "Gallery",
                                    fontSize = 13.sp,
                                    fontWeight = FontWeight.Bold,
                                    maxLines = 1,
                                    softWrap = false
                                )
                            }
                        }
                    }
                }
            }
        },
        confirmButton = {
            TextButton(onClick = onDismiss, enabled = !isUploading) {
                Text("Done", fontWeight = FontWeight.Bold)
            }
        }
    )
}

/**
 * Image compression utility to convert large phone camera photos down to 1080p-1600p JPG (~250-400KB)
 * for rapid uploading without clogging network bandwidth.
 */
private fun compressImageForUpload(context: Context, originalFile: File): File {
    return try {
        val maxDimension = 1600
        val boundsOptions = BitmapFactory.Options().apply { inJustDecodeBounds = true }
        BitmapFactory.decodeFile(originalFile.absolutePath, boundsOptions)

        var sampleSize = 1
        while (boundsOptions.outWidth / sampleSize > maxDimension || boundsOptions.outHeight / sampleSize > maxDimension) {
            sampleSize *= 2
        }

        val decodeOptions = BitmapFactory.Options().apply { inSampleSize = sampleSize }
        val decodedBitmap = BitmapFactory.decodeFile(originalFile.absolutePath, decodeOptions) ?: return originalFile

        // Correct orientation from EXIF if needed
        val exif = ExifInterface(originalFile.absolutePath)
        val orientation = exif.getAttributeInt(ExifInterface.TAG_ORIENTATION, ExifInterface.ORIENTATION_NORMAL)
        val matrix = Matrix()
        when (orientation) {
            ExifInterface.ORIENTATION_ROTATE_90 -> matrix.postRotate(90f)
            ExifInterface.ORIENTATION_ROTATE_180 -> matrix.postRotate(180f)
            ExifInterface.ORIENTATION_ROTATE_270 -> matrix.postRotate(270f)
        }
        val rotatedBitmap = Bitmap.createBitmap(decodedBitmap, 0, 0, decodedBitmap.width, decodedBitmap.height, matrix, true)

        val outputFile = File.createTempFile("upload_comp_", ".jpg", context.cacheDir)
        FileOutputStream(outputFile).use { out ->
            rotatedBitmap.compress(Bitmap.CompressFormat.JPEG, 82, out)
        }
        outputFile
    } catch (e: Exception) {
        originalFile
    }
}

private fun copyUriToTempFile(context: Context, uri: Uri): File? {
    return try {
        val inputStream: InputStream? = context.contentResolver.openInputStream(uri)
        val tempFile = File.createTempFile("picker_", ".jpg", context.cacheDir)
        FileOutputStream(tempFile).use { output ->
            inputStream?.copyTo(output)
        }
        tempFile
    } catch (e: Exception) {
        null
    }
}
