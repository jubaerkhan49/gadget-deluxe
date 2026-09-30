package com.imei.inventory.ui.components

import android.widget.Toast
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ContentCopy
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.font.FontWeight
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

@Composable
fun VariantBadge(variant: String?) {
    if (variant.isNullOrBlank()) return

    val (bgColor, textColor) = when (variant.trim()) {
        "Modified" -> Color(0x1EF97316) to Color(0xFFEA580C)
        "USA eSim" -> Color(0x1E10B981) to Color(0xFF059669)
        "Canada" -> Color(0x1E3B82F6) to Color(0xFF2563EB)
        "Mexican" -> Color(0x1E06B6D4) to Color(0xFF0891B2)
        "Korea" -> Color(0x1EA855F7) to Color(0xFF9333EA)
        "Singapore" -> Color(0x1EEF4444) to Color(0xFFDC2626)
        "Bypass" -> Color(0x1EF59E0B) to Color(0xFFD97706)
        else -> Color(0x1E64748B) to Color(0xFF475569)
    }

    Surface(
        color = bgColor,
        shape = RoundedCornerShape(7.dp),
        border = BorderStroke(1.dp, textColor.copy(alpha = 0.25f))
    ) {
        Text(
            text = variant,
            color = textColor,
            fontSize = 11.sp,
            fontWeight = FontWeight.Bold,
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.5.dp)
        )
    }
}

@Composable
fun StatusBadge(status: String?, statusDisplay: String? = null) {
    if (status.isNullOrBlank()) return

    val (bgColor, textColor) = when (status) {
        "IN_STOCK" -> Color(0x1E22C55E) to Color(0xFF16A34A)
        "SOLD" -> Color(0x1E3B82F6) to Color(0xFF2563EB)
        "UNDER_REPAIR" -> Color(0x1EEAB308) to Color(0xFFCA8A04)
        "IN_TRANSIT" -> Color(0x1E8B5CF6) to Color(0xFF7C3AED)
        else -> Color(0x1E64748B) to Color(0xFF475569)
    }

    Surface(
        color = bgColor,
        shape = RoundedCornerShape(7.dp),
        border = BorderStroke(1.dp, textColor.copy(alpha = 0.25f))
    ) {
        Text(
            text = statusDisplay ?: status.replace("_", " "),
            color = textColor,
            fontSize = 11.sp,
            fontWeight = FontWeight.Bold,
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.5.dp)
        )
    }
}

@Composable
fun CopyableText(
    label: String,
    value: String,
    modifier: Modifier = Modifier
) {
    val clipboardManager = LocalClipboardManager.current
    val context = LocalContext.current

    Row(
        modifier = modifier
            .clickable {
                clipboardManager.setText(AnnotatedString(value))
                Toast.makeText(context, "Copied $label: $value", Toast.LENGTH_SHORT).show()
            },
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text("$label: ", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 12.sp)
        Text(
            text = value,
            color = MaterialTheme.colorScheme.onSurface,
            fontSize = 12.sp,
            fontWeight = FontWeight.Medium
        )
        Spacer(modifier = Modifier.width(4.dp))
        Icon(
            imageVector = Icons.Default.ContentCopy,
            contentDescription = "Copy",
            tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.7f),
            modifier = Modifier.size(12.dp)
        )
    }
}

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
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        shape = RoundedCornerShape(14.dp),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.12f)),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 12.dp, vertical = 10.dp),
            verticalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = title.uppercase(),
                    color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.8f),
                    fontSize = 9.5.sp,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 0.5.sp,
                    maxLines = 1,
                    overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis,
                    modifier = Modifier.weight(1f, fill = false)
                )
                Spacer(modifier = Modifier.width(6.dp))
                Surface(
                    color = accentColor.copy(alpha = 0.12f),
                    shape = RoundedCornerShape(7.dp),
                    modifier = Modifier.size(24.dp)
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Icon(
                            imageVector = imageVector,
                            contentDescription = null,
                            tint = accentColor,
                            modifier = Modifier.size(13.dp)
                        )
                    }
                }
            }

            Text(
                text = value,
                color = accentColor,
                fontSize = if (value.length > 7) 14.5.sp else 18.sp,
                fontWeight = FontWeight.ExtraBold,
                maxLines = 1,
                overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis
            )
        }
    }
}

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
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        shape = RoundedCornerShape(14.dp),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.12f)),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 12.dp, vertical = 10.dp),
            verticalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = title.uppercase(),
                    color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.8f),
                    fontSize = 9.5.sp,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 0.5.sp,
                    maxLines = 1,
                    overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis,
                    modifier = Modifier.weight(1f, fill = false)
                )
                Spacer(modifier = Modifier.width(6.dp))
                Text(text = icon, fontSize = 14.sp)
            }

            Text(
                text = value,
                color = accentColor,
                fontSize = if (value.length > 7) 14.5.sp else 18.sp,
                fontWeight = FontWeight.ExtraBold,
                maxLines = 1,
                overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis
            )
        }
    }
}
