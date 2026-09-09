package com.imei.inventory.data.local

import androidx.room.*
import kotlinx.coroutines.flow.Flow

@Dao
interface DeviceDao {
    @Query("SELECT * FROM cached_devices ORDER BY lastSyncedAt DESC")
    fun getAllCachedDevices(): Flow<List<DeviceEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(devices: List<DeviceEntity>)

    @Query("DELETE FROM cached_devices")
    suspend fun clearAll()
}
