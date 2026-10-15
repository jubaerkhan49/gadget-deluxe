package com.imei.inventory.ui.components

import android.widget.Toast
import com.imei.inventory.ui.theme.*
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Clear
import androidx.compose.material.icons.filled.ContentCopy
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

fun formatIndianNumber(number: Number): String {
    val numStr = number.toLong().toString()
    if (numStr.length <= 3) return numStr
    val lastThree = numStr.substring(numStr.length - 3)
    val remaining = numStr.substring(0, numStr.length - 3)
    val result = StringBuilder()
    var count = 0
    for (i in remaining.length - 1 downTo 0) {
        if (count == 2) {
            result.insert(0, ',')
            count = 0
        }
        result.insert(0, remaining[i])
        count++
    }
    result.append(',').append(lastThree)
    return result.toString()
}

/**
 * Universal Date Formatter: converts any date string (ISO, timestamp, YYYY-MM-DD)
 * to DD-MM-YYYY format across both admin and employee modes.
 */
fun formatDateToDDMMYYYY(dateStr: String?, defaultVal: String = ""): String {
    if (dateStr.isNullOrBlank()) return defaultVal
    val trimmed = dateStr.trim()
    // Match YYYY-MM-DD or YYYY/MM/DD prefix (with optional time after)
    val isoMatch = Regex("""^(\d{4})[-/](\d{1,2})[-/](\d{1,2})""").find(trimmed)
    if (isoMatch != null) {
        val year = isoMatch.groupValues[1]
        val month = isoMatch.groupValues[2].padStart(2, '0')
        val day = isoMatch.groupValues[3].padStart(2, '0')
        return "$day-$month-$year"
    }
    // Already DD-MM-YYYY
    val dmyMatch = Regex("""^(\d{1,2})[-/](\d{1,2})[-/](\d{4})""").find(trimmed)
    if (dmyMatch != null) {
        val day = dmyMatch.groupValues[1].padStart(2, '0')
        val month = dmyMatch.groupValues[2].padStart(2, '0')
        val year = dmyMatch.groupValues[3]
        return "$day-$month-$year"
    }
    return trimmed
}

/**
 * Material 3 Expressive Variant Badge
 * Uses rounded pill shape, expressive tonal container, and micro dot indicator
 */
@Composable
fun VariantBadge(variant: String?) {
    if (variant.isNullOrBlank()) return

    val (bgColor, textColor) = when (variant.trim()) {
        "Modified" -> Color(0x22F97316) to Color(0xFFF97316)
        "USA eSim" -> AccentEmerald.copy(alpha = 0.14f) to AccentEmerald
        "Canada" -> AccentBlue.copy(alpha = 0.14f) to AccentBlue
        "Mexican" -> AccentSky.copy(alpha = 0.14f) to AccentSky
        "Korea" -> AccentPurple.copy(alpha = 0.14f) to AccentPurple
        "Singapore" -> AccentRose.copy(alpha = 0.14f) to AccentRose
        "Bypass" -> AccentAmber.copy(alpha = 0.14f) to AccentAmber
        else -> MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.14f) to MaterialTheme.colorScheme.onSurfaceVariant
    }

    Surface(
        color = bgColor,
        shape = RoundedCornerShape(percent = 50),
        border = BorderStroke(1.dp, textColor.copy(alpha = 0.35f))
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier.padding(horizontal = 9.dp, vertical = 3.dp)
        ) {
            Box(
                modifier = Modifier
                    .size(5.dp)
                    .background(textColor, CircleShape)
            )
            Spacer(modifier = Modifier.width(4.5.dp))
            Text(
                text = variant,
                color = textColor,
                fontSize = 11.sp,
                fontWeight = FontWeight.Bold,
                letterSpacing = 0.2.sp
            )
        }
    }
}

/**
 * Material 3 Expressive Status Badge
 * Uses rounded pill shape, high-contrast expressive container with state indicator
 */
@Composable
fun StatusBadge(status: String?, statusDisplay: String? = null) {
    if (status.isNullOrBlank()) return

    val (bgColor, textColor, dotColor) = when (status) {
        "IN_STOCK" -> Triple(AccentEmerald.copy(alpha = 0.14f), AccentEmerald, AccentEmerald)
        "SOLD" -> Triple(AccentBlue.copy(alpha = 0.14f), AccentBlue, AccentBlue)
        "UNDER_REPAIR" -> Triple(AccentAmber.copy(alpha = 0.14f), AccentAmber, AccentAmber)
        "WAITING_SHIPMENT" -> Triple(AccentPurple.copy(alpha = 0.14f), AccentPurple, AccentPurple)
        "IN_TRANSIT" -> Triple(AccentSky.copy(alpha = 0.14f), AccentSky, AccentSky)
        "PENDING_SALE" -> Triple(AccentAmber.copy(alpha = 0.14f), AccentAmber, AccentAmber)
        else -> Triple(MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.14f), MaterialTheme.colorScheme.onSurfaceVariant, MaterialTheme.colorScheme.onSurfaceVariant)
    }

    Surface(
        color = bgColor,
        shape = RoundedCornerShape(percent = 50),
        border = BorderStroke(1.dp, dotColor.copy(alpha = 0.32f))
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier.padding(horizontal = 9.dp, vertical = 3.dp)
        ) {
            Box(
                modifier = Modifier
                    .size(6.dp)
                    .background(dotColor, CircleShape)
            )
            Spacer(modifier = Modifier.width(5.dp))
            Text(
                text = statusDisplay ?: status.replace("_", " "),
                color = textColor,
                fontSize = 11.sp,
                fontWeight = FontWeight.Bold,
                letterSpacing = 0.2.sp
            )
        }
    }
}

/**
 * Material 3 Expressive Copyable Text
 * Includes subtle interactive container feedback and copy toast
 */
@Composable
fun CopyableText(
    label: String,
    value: String,
    modifier: Modifier = Modifier
) {
    val clipboardManager = LocalClipboardManager.current
    val context = LocalContext.current

    Surface(
        onClick = {
            clipboardManager.setText(AnnotatedString(value))
            Toast.makeText(context, "Copied $label: $value", Toast.LENGTH_SHORT).show()
        },
        shape = RoundedCornerShape(6.dp),
        color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.35f),
        border = BorderStroke(0.5.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f)),
        modifier = modifier
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 6.dp, vertical = 1.5.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "$label: ",
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                fontSize = 11.5.sp,
                fontWeight = FontWeight.Normal
            )
            Text(
                text = value,
                color = MaterialTheme.colorScheme.onSurface,
                fontSize = 11.5.sp,
                fontWeight = FontWeight.SemiBold
            )
            Spacer(modifier = Modifier.width(4.dp))
            Icon(
                imageVector = Icons.Default.ContentCopy,
                contentDescription = "Copy",
                tint = MaterialTheme.colorScheme.primary.copy(alpha = 0.8f),
                modifier = Modifier.size(11.dp)
            )
        }
    }
}

/**
 * Material 3 Expressive Stat Card with Vector Icon
 * Uses 20dp smooth corners, squircle icon badge, and expressive typography scale
 */
@Composable
fun StatCard(
    title: String,
    value: String,
    imageVector: ImageVector,
    accentColor: Color,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier,
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLow),
        shape = RoundedCornerShape(20.dp),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.35f)),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 14.dp, vertical = 12.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = title.uppercase(),
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 0.6.sp,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.weight(1f, fill = false)
                )
                Spacer(modifier = Modifier.width(6.dp))
                Surface(
                    color = accentColor.copy(alpha = 0.15f),
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier.size(28.dp)
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Icon(
                            imageVector = imageVector,
                            contentDescription = null,
                            tint = accentColor,
                            modifier = Modifier.size(15.dp)
                        )
                    }
                }
            }

            Text(
                text = value,
                color = accentColor,
                fontSize = if (value.length > 8) 15.sp else 19.sp,
                fontWeight = FontWeight.ExtraBold,
                letterSpacing = (-0.3).sp,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
        }
    }
}

/**
 * Material 3 Expressive Stat Card with Emoji/Text Icon
 */
@Composable
fun StatCard(
    title: String,
    value: String,
    icon: String,
    accentColor: Color,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier,
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLow),
        shape = RoundedCornerShape(20.dp),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.35f)),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 14.dp, vertical = 12.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = title.uppercase(),
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 0.6.sp,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.weight(1f, fill = false)
                )
                Spacer(modifier = Modifier.width(6.dp))
                Surface(
                    color = accentColor.copy(alpha = 0.14f),
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier.size(28.dp)
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Text(text = icon, fontSize = 14.sp)
                    }
                }
            }

            Text(
                text = value,
                color = accentColor,
                fontSize = if (value.length > 8) 15.sp else 19.sp,
                fontWeight = FontWeight.ExtraBold,
                letterSpacing = (-0.3).sp,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
        }
    }
}

/**
 * Material 3 Expressive Compact Search Bar
 * Sleek 38dp pill shape with leading search icon and trailing clear button
 */
@Composable
fun ExpressiveSearchBar(
    query: String,
    onQueryChange: (String) -> Unit,
    placeholder: String,
    modifier: Modifier = Modifier
) {
    Surface(
        modifier = modifier
            .fillMaxWidth()
            .height(38.dp),
        shape = RoundedCornerShape(percent = 50),
        color = MaterialTheme.colorScheme.surface,
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.6f)),
        shadowElevation = 0.5.dp
    ) {
        Row(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                imageVector = Icons.Default.Search,
                contentDescription = "Search",
                tint = MaterialTheme.colorScheme.primary,
                modifier = Modifier.size(16.dp)
            )
            Spacer(modifier = Modifier.width(8.dp))
            Box(
                modifier = Modifier.weight(1f),
                contentAlignment = Alignment.CenterStart
            ) {
                if (query.isEmpty()) {
                    Text(
                        text = placeholder,
                        color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.7f),
                        fontSize = 12.5.sp,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }
                BasicTextField(
                    value = query,
                    onValueChange = onQueryChange,
                    singleLine = true,
                    textStyle = TextStyle(
                        color = MaterialTheme.colorScheme.onSurface,
                        fontSize = 12.5.sp,
                        fontWeight = FontWeight.Medium
                    ),
                    cursorBrush = SolidColor(MaterialTheme.colorScheme.primary),
                    modifier = Modifier.fillMaxWidth()
                )
            }
            if (query.isNotEmpty()) {
                IconButton(
                    onClick = { onQueryChange("") },
                    modifier = Modifier.size(22.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.Clear,
                        contentDescription = "Clear",
                        tint = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.size(14.dp)
                    )
                }
            }
        }
    }
}

/**
 * Material 3 Expressive Empty State Component
 */
@Composable
fun ExpressiveEmptyState(
    icon: ImageVector,
    title: String,
    subtitle: String,
    actionText: String? = null,
    onAction: (() -> Unit)? = null,
    modifier: Modifier = Modifier
) {
    Surface(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(24.dp),
        color = MaterialTheme.colorScheme.surfaceContainerLow,
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.35f))
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(vertical = 32.dp, horizontal = 24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Surface(
                shape = RoundedCornerShape(20.dp),
                color = MaterialTheme.colorScheme.surfaceContainerHigh,
                modifier = Modifier.size(64.dp)
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(
                        imageVector = icon,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.size(32.dp)
                    )
                }
            }
            Spacer(modifier = Modifier.height(16.dp))
            Text(
                text = title,
                fontSize = 16.sp,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onSurface,
                textAlign = TextAlign.Center
            )
            Spacer(modifier = Modifier.height(6.dp))
            Text(
                text = subtitle,
                fontSize = 13.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                textAlign = TextAlign.Center
            )
            if (actionText != null && onAction != null) {
                Spacer(modifier = Modifier.height(18.dp))
                Button(
                    onClick = onAction,
                    shape = RoundedCornerShape(percent = 50),
                    colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary)
                ) {
                    Text(text = actionText, fontSize = 13.sp, fontWeight = FontWeight.Bold, color = Color.White)
                }
            }
        }
    }
}
