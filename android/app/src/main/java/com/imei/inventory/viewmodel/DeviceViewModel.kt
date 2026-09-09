package com.imei.inventory.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.imei.inventory.data.api.ApiClient
import com.imei.inventory.data.model.DeviceDto
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

sealed class DeviceListState {
    object Loading : DeviceListState()
    data class Success(val devices: List<DeviceDto>) : DeviceListState()
    data class Error(val message: String) : DeviceListState()
}

class DeviceViewModel : ViewModel() {
    private val _devicesState = MutableStateFlow<DeviceListState>(DeviceListState.Loading)
    val devicesState: StateFlow<DeviceListState> = _devicesState

    fun fetchDevices(token: String, query: String? = null) {
        viewModelScope.launch {
            _devicesState.value = DeviceListState.Loading
            try {
                val bearerToken = "Bearer $token"
                val response = ApiClient.apiService.getDevices(bearerToken, search = query)
                if (response.isSuccessful && response.body() != null) {
                    _devicesState.value = DeviceListState.Success(response.body()!!)
                } else {
                    _devicesState.value = DeviceListState.Error("Error fetching devices (${response.code()})")
                }
            } catch (e: Exception) {
                _devicesState.value = DeviceListState.Error("Network error: ${e.localizedMessage}")
            }
        }
    }
}
