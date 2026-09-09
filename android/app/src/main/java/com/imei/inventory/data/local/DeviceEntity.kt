package com.imei.inventory.data.local

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "cached_devices")
data class DeviceEntity(
    @PrimaryKey val id: Int,
    val imei: String,
    val imei2: String?,
    val serialNumber: String?,
    val model: String,
    val modelDescription: String?,
    val capacity: String?,
    val color: String?,
    val batteryHealth: Int?,
    val currentStatus: String,
    val lastSyncedAt: Long = System.currentTimeMillis()
)
