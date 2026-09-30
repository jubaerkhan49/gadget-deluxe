package com.imei.inventory.util

import android.content.Context
import android.content.SharedPreferences
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import com.imei.inventory.data.model.*
import com.imei.inventory.viewmodel.DashboardStats

class LocalDataCache(context: Context) {
    private val prefs: SharedPreferences = context.getSharedPreferences("gadget_deluxe_local_cache", Context.MODE_PRIVATE)
    private val gson = Gson()

    companion object {
        private const val KEY_CACHED_DEVICES = "cached_devices"
        private const val KEY_CACHED_SHIPMENTS = "cached_shipments"
        private const val KEY_CACHED_SALES = "cached_sales"
        private const val KEY_CACHED_REPAIRS = "cached_repairs"
        private const val KEY_CACHED_USERS = "cached_users"
        private const val KEY_CACHED_STATS = "cached_dashboard_stats"
        private const val KEY_CACHED_ANALYTICS = "cached_analytics"
        private const val KEY_CACHED_SALE_REQUESTS = "cached_sale_requests"
        private const val KEY_LAST_SYNC_TIME = "cached_last_sync_time"
    }

    // Devices
    fun saveDevices(devices: List<DeviceDto>) {
        try {
            val json = gson.toJson(devices)
            prefs.edit().putString(KEY_CACHED_DEVICES, json).apply()
        } catch (_: Exception) {}
    }

    fun getDevices(): List<DeviceDto> {
        return try {
            val json = prefs.getString(KEY_CACHED_DEVICES, null) ?: return emptyList()
            val type = object : TypeToken<List<DeviceDto>>() {}.type
            gson.fromJson(json, type) ?: emptyList()
        } catch (_: Exception) {
            emptyList()
        }
    }

    // Shipments
    fun saveShipments(shipments: List<ShipmentDto>) {
        try {
            val json = gson.toJson(shipments)
            prefs.edit().putString(KEY_CACHED_SHIPMENTS, json).apply()
        } catch (_: Exception) {}
    }

    fun getShipments(): List<ShipmentDto> {
        return try {
            val json = prefs.getString(KEY_CACHED_SHIPMENTS, null) ?: return emptyList()
            val type = object : TypeToken<List<ShipmentDto>>() {}.type
            gson.fromJson(json, type) ?: emptyList()
        } catch (_: Exception) {
            emptyList()
        }
    }

    // Sales
    fun saveSales(sales: List<SaleDto>) {
        try {
            val json = gson.toJson(sales)
            prefs.edit().putString(KEY_CACHED_SALES, json).apply()
        } catch (_: Exception) {}
    }

    fun getSales(): List<SaleDto> {
        return try {
            val json = prefs.getString(KEY_CACHED_SALES, null) ?: return emptyList()
            val type = object : TypeToken<List<SaleDto>>() {}.type
            gson.fromJson(json, type) ?: emptyList()
        } catch (_: Exception) {
            emptyList()
        }
    }

    // Repairs
    fun saveRepairs(repairs: List<RepairDto>) {
        try {
            val json = gson.toJson(repairs)
            prefs.edit().putString(KEY_CACHED_REPAIRS, json).apply()
        } catch (_: Exception) {}
    }

    fun getRepairs(): List<RepairDto> {
        return try {
            val json = prefs.getString(KEY_CACHED_REPAIRS, null) ?: return emptyList()
            val type = object : TypeToken<List<RepairDto>>() {}.type
            gson.fromJson(json, type) ?: emptyList()
        } catch (_: Exception) {
            emptyList()
        }
    }

    // Users
    fun saveUsers(users: List<UserDto>) {
        try {
            val json = gson.toJson(users)
            prefs.edit().putString(KEY_CACHED_USERS, json).apply()
        } catch (_: Exception) {}
    }

    fun getUsers(): List<UserDto> {
        return try {
            val json = prefs.getString(KEY_CACHED_USERS, null) ?: return emptyList()
            val type = object : TypeToken<List<UserDto>>() {}.type
            gson.fromJson(json, type) ?: emptyList()
        } catch (_: Exception) {
            emptyList()
        }
    }

    // Dashboard Stats
    fun saveDashboardStats(stats: DashboardStats) {
        try {
            val json = gson.toJson(stats)
            prefs.edit().putString(KEY_CACHED_STATS, json).apply()
        } catch (_: Exception) {}
    }

    fun getDashboardStats(): DashboardStats? {
        return try {
            val json = prefs.getString(KEY_CACHED_STATS, null) ?: return null
            gson.fromJson(json, DashboardStats::class.java)
        } catch (_: Exception) {
            null
        }
    }

    // Analytics
    fun saveAnalytics(analytics: AnalyticsResponseDto) {
        try {
            val json = gson.toJson(analytics)
            prefs.edit().putString(KEY_CACHED_ANALYTICS, json).apply()
        } catch (_: Exception) {}
    }

    fun getAnalytics(): AnalyticsResponseDto? {
        return try {
            val json = prefs.getString(KEY_CACHED_ANALYTICS, null) ?: return null
            gson.fromJson(json, AnalyticsResponseDto::class.java)
        } catch (_: Exception) {
            null
        }
    }

    // Pending Sale Requests
    fun savePendingSaleRequests(requests: List<DeviceSaleRequestDto>) {
        try {
            val json = gson.toJson(requests)
            prefs.edit().putString(KEY_CACHED_SALE_REQUESTS, json).apply()
        } catch (_: Exception) {}
    }

    fun getPendingSaleRequests(): List<DeviceSaleRequestDto> {
        return try {
            val json = prefs.getString(KEY_CACHED_SALE_REQUESTS, null) ?: return emptyList()
            val type = object : TypeToken<List<DeviceSaleRequestDto>>() {}.type
            gson.fromJson(json, type) ?: emptyList()
        } catch (_: Exception) {
            emptyList()
        }
    }

    // Sync timestamp
    fun setLastSyncTime(timestamp: Long = System.currentTimeMillis()) {
        prefs.edit().putLong(KEY_LAST_SYNC_TIME, timestamp).apply()
    }

    fun getLastSyncTime(): Long = prefs.getLong(KEY_LAST_SYNC_TIME, 0L)

    fun clearCache() {
        prefs.edit().clear().apply()
    }
}
