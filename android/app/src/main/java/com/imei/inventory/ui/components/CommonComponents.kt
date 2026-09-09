package com.imei.inventory.ui.components

import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

@Composable
fun VariantBadge(variant: String?) {
    if (variant.isNullOrBlank()) return

    val (bgColor, textColor) = when (variant.trim()) {
        "Modified" -> Color(0x33F97316) to Color(0xFFFB923C)
        "USA eSim" -> Color(0x3310B981) to Color(0xFF34D399)
        "Canada" -> Color(0x333B82F6) to Color(0xFF60A5FA)
        "Mexican" -> Color(0x3306B6D4) to Color(0xFF22D3EE)
        "Korea" -> Color(0x33A855F7) to Color(0xFFC084FC)
        "Singapore" -> Color(0x33EF4444) to Color(0xFFF87171)
        "Bypass" -> Color(0x33F59E0B) to Color(0xFFFBBF24)
        else -> Color(0x3364748B) to Color(0xFF94A3B8)
    }

    Surface(
        color = bgColor,
        shape = RoundedCornerShape(6.dp)
    ) {
        Text(
            text = variant,
            color = textColor,
            fontSize = 11.sp,
            fontWeight = FontWeight.Bold,
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
        )
    }
}

@Composable
fun StatusBadge(status: String, statusDisplay: String? = null) {
    val (bgColor, textColor) = when (status) {
        "IN_STOCK" -> Color(0x3322C55E) to Color(0xFF4ADE80)
        "SOLD" -> Color(0x333B82F6) to Color(0xFF60A5FA)
        "UNDER_REPAIR" -> Color(0x33EAB308) to Color(0xFFFDE047)
        "IN_TRANSIT" -> Color(0x338B5CF6) to Color(0xFFA78BFA)
        else -> Color(0x3364748B) to Color(0xFF94A3B8)
    }

    Surface(
        color = bgColor,
        shape = RoundedCornerShape(6.dp)
    ) {
        Text(
            text = statusDisplay ?: status.replace("_", " "),
            color = textColor,
            fontSize = 11.sp,
            fontWeight = FontWeight.Bold,
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
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
        Text("$label: ", color = Color(0xFF94A3B8), fontSize = 12.sp)
        Text(
            text = value,
            color = Color(0xFFE2E8F0),
            fontSize = 12.sp,
            fontWeight = FontWeight.Medium
        )
        Spacer(modifier = Modifier.width(4.dp))
        Text("📋", fontSize = 10.sp)
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
        colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B)),
        shape = RoundedCornerShape(12.dp)
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(text = title, color = Color(0xFF94A3B8), fontSize = 12.sp, fontWeight = FontWeight.Medium)
                Text(text = icon, fontSize = 18.sp)
            }
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = value,
                color = accentColor,
                fontSize = 20.sp,
                fontWeight = FontWeight.Bold
            )
        }
    }
}
