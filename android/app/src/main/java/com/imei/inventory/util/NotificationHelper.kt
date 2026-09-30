package com.imei.inventory.util

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import com.imei.inventory.MainActivity
import com.imei.inventory.R
import com.imei.inventory.data.model.DeviceSaleRequestDto

object NotificationHelper {

    const val CHANNEL_ID = "admin_sale_approval_channel"
    const val CHANNEL_NAME = "Sale Approval Alerts"
    const val EXTRA_SALE_REQ_ID = "extra_pending_sale_req_id"

    fun createNotificationChannel(context: Context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val importance = NotificationManager.IMPORTANCE_HIGH
            val channel = NotificationChannel(CHANNEL_ID, CHANNEL_NAME, importance).apply {
                description = "Notifies administrator when an employee submits a device sale for price confirmation and approval."
                enableVibration(true)
                vibrationPattern = longArrayOf(0, 250, 150, 250)
                setShowBadge(true)
            }
            val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
            notificationManager?.createNotificationChannel(channel)
        }
    }

    fun showSaleApprovalNotification(context: Context, saleRequest: DeviceSaleRequestDto) {
        createNotificationChannel(context)

        val sellerName = saleRequest.employeeName ?: (saleRequest.employeeUsername ?: "An employee")
        val model = saleRequest.deviceModel ?: "Device"
        val imei = saleRequest.deviceImei?.let { " (IMEI: $it)" } ?: ""
        val price = String.format("৳ %,.0f", saleRequest.proposedPrice)

        val intent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
            putExtra(EXTRA_SALE_REQ_ID, saleRequest.id)
        }

        val pendingIntent = PendingIntent.getActivity(
            context,
            saleRequest.id,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or (if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0)
        )

        val builder = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_launcher_foreground)
            .setContentTitle("🔔 Sale Approval Required: $model")
            .setContentText("$sellerName submitted sale for $price$imei. Tap to review & approve.")
            .setStyle(NotificationCompat.BigTextStyle().bigText("$sellerName submitted a sale request for $model$imei with proposed amount $price. Tap to review and confirm sale approval."))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_EVENT)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .setVibrate(longArrayOf(0, 250, 150, 250))

        try {
            val notificationManager = NotificationManagerCompat.from(context)
            notificationManager.notify(saleRequest.id + 10000, builder.build())
        } catch (e: SecurityException) {
            // Permission not granted yet on Android 13+
        } catch (e: Exception) {
            // Safe fallback
        }
    }
}
