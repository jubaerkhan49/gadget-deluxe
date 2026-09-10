package com.imei.inventory.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.imei.inventory.data.api.ApiClient
import com.imei.inventory.data.model.*
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

data class DashboardStats(
    val totalDevices: Int = 0,
    val inStock: Int = 0,
    val sold: Int = 0,
    val underRepair: Int = 0,
    val totalSalesAmount: Double = 0.0,
    val totalProfit: Double = 0.0
)

class MainInventoryViewModel : ViewModel() {

    // Devices State
    private val _devices = MutableStateFlow<List<DeviceDto>>(emptyList())
    val devices: StateFlow<List<DeviceDto>> = _devices

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading

    private val _errorMessage = MutableStateFlow<String?>(null)
    val errorMessage: StateFlow<String?> = _errorMessage

    // Stats State
    private val _stats = MutableStateFlow(DashboardStats())
    val stats: StateFlow<DashboardStats> = _stats

    // Shipments State
    private val _shipments = MutableStateFlow<List<ShipmentDto>>(emptyList())
    val shipments: StateFlow<List<ShipmentDto>> = _shipments

    // Sales State
    private val _sales = MutableStateFlow<List<SaleDto>>(emptyList())
    val sales: StateFlow<List<SaleDto>> = _sales

    // Repairs State
    private val _repairs = MutableStateFlow<List<RepairDto>>(emptyList())
    val repairs: StateFlow<List<RepairDto>> = _repairs

    // Users / Owners State
    private val _users = MutableStateFlow<List<UserDto>>(emptyList())
    val users: StateFlow<List<UserDto>> = _users

    // Selected filter
    private val _selectedStatusFilter = MutableStateFlow<String?>(null)
    val selectedStatusFilter: StateFlow<String?> = _selectedStatusFilter

    fun setStatusFilter(status: String?) {
        _selectedStatusFilter.value = status
    }

    private var realtimeJob: kotlinx.coroutines.Job? = null

    fun loadAllData(token: String) {
        fetchUsers(token)
        fetchDevices(token)
        fetchShipments(token)
        fetchSales(token)
        fetchRepairs(token)
        startRealtimeSync(token)
    }

    fun startRealtimeSync(token: String) {
        realtimeJob?.cancel()
        realtimeJob = viewModelScope.launch {
            while (true) {
                kotlinx.coroutines.delay(4000) // Poll sync every 4 seconds quietly in background
                try {
                    val bearer = "Bearer $token"
                    val devRes = ApiClient.apiService.getDevices(bearer, null, _selectedStatusFilter.value)
                    if (devRes.isSuccessful && devRes.body() != null) {
                        val list = devRes.body()!!.results
                        _devices.value = list
                        computeStats(list, _sales.value)
                    }
                    val shipRes = ApiClient.apiService.getShipments(bearer)
                    if (shipRes.isSuccessful && shipRes.body() != null) {
                        _shipments.value = shipRes.body()!!.results
                    }
                } catch (e: Exception) {
                    // silent background sync
                }
            }
        }
    }

    fun stopRealtimeSync() {
        realtimeJob?.cancel()
    }

    override fun onCleared() {
        super.onCleared()
        realtimeJob?.cancel()
    }

    fun fetchDevices(token: String, query: String? = null) {
        viewModelScope.launch {
            _isLoading.value = true
            _errorMessage.value = null
            try {
                val bearer = "Bearer $token"
                val response = ApiClient.apiService.getDevices(
                    token = bearer,
                    search = if (query.isNullOrBlank()) null else query.trim(),
                    status = _selectedStatusFilter.value
                )
                if (response.isSuccessful && response.body() != null) {
                    val list = response.body()!!.results
                    _devices.value = list
                    computeStats(list, _sales.value)
                } else {
                    _errorMessage.value = "Failed to load inventory (${response.code()})"
                }
            } catch (e: Exception) {
                _errorMessage.value = "Connection error: ${e.localizedMessage}"
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun createDevice(token: String, device: DeviceDto, onSuccess: () -> Unit, onError: (String) -> Unit) {
        viewModelScope.launch {
            _isLoading.value = true
            try {
                val bearer = "Bearer $token"
                val response = ApiClient.apiService.createDevice(bearer, device)
                if (response.isSuccessful && response.body() != null) {
                    onSuccess()
                    fetchDevices(token)
                } else {
                    onError("Failed to create device: ${response.code()}")
                }
            } catch (e: Exception) {
                onError("Network error: ${e.localizedMessage}")
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun fetchUsers(token: String) {
        viewModelScope.launch {
            try {
                val response = ApiClient.apiService.getUsers("Bearer $token")
                if (response.isSuccessful && response.body() != null) {
                    _users.value = response.body()!!.results
                }
            } catch (e: Exception) {
                // silent failure
            }
        }
    }

    fun updateDevice(token: String, deviceId: Int, updates: Map<String, Any?>, onSuccess: () -> Unit = {}) {
        viewModelScope.launch {
            try {
                val bearer = "Bearer $token"
                val response = ApiClient.apiService.updateDevice(bearer, deviceId, updates)
                if (response.isSuccessful) {
                    onSuccess()
                    fetchDevices(token)
                }
            } catch (e: Exception) {
                // error handling
            }
        }
    }

    fun deleteDevice(token: String, deviceId: Int, onSuccess: () -> Unit = {}) {
        viewModelScope.launch {
            try {
                val bearer = "Bearer $token"
                val response = ApiClient.apiService.deleteDevice(bearer, deviceId)
                if (response.isSuccessful) {
                    onSuccess()
                    fetchDevices(token)
                }
            } catch (e: Exception) {
                // error handling
            }
        }
    }

    fun fetchShipments(token: String) {
        viewModelScope.launch {
            try {
                val response = ApiClient.apiService.getShipments("Bearer $token")
                if (response.isSuccessful && response.body() != null) {
                    _shipments.value = response.body()!!.results
                }
            } catch (e: Exception) {
                // ignore
            }
        }
    }

    fun createBatchShipment(
        token: String,
        payload: Map<String, Any>,
        onSuccess: () -> Unit = {},
        onError: (String) -> Unit = {}
    ) {
        viewModelScope.launch {
            _isLoading.value = true
            try {
                val bearer = "Bearer $token"
                val response = ApiClient.apiService.createBatchShipment(bearer, payload)
                if (response.isSuccessful) {
                    onSuccess()
                    loadAllData(token)
                } else {
                    onError("Failed to create shipment (HTTP ${response.code()})")
                }
            } catch (e: Exception) {
                onError(e.localizedMessage ?: "Network error creating shipment")
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun fetchSales(token: String) {
        viewModelScope.launch {
            try {
                val response = ApiClient.apiService.getSales("Bearer $token")
                if (response.isSuccessful && response.body() != null) {
                    val salesList = response.body()!!.results
                    _sales.value = salesList
                    computeStats(_devices.value, salesList)
                }
            } catch (e: Exception) {
                // ignore
            }
        }
    }

    fun fetchRepairs(token: String) {
        viewModelScope.launch {
            try {
                val response = ApiClient.apiService.getRepairs("Bearer $token")
                if (response.isSuccessful && response.body() != null) {
                    _repairs.value = response.body()!!.results
                }
            } catch (e: Exception) {
                // ignore
            }
        }
    }

    private fun computeStats(deviceList: List<DeviceDto>, salesList: List<SaleDto>) {
        val total = deviceList.size
        val inStock = deviceList.count { it.currentStatus == "IN_STOCK" }
        val sold = deviceList.count { it.currentStatus == "SOLD" }
        val repair = deviceList.count { it.currentStatus == "UNDER_REPAIR" }
        val totalSales = salesList.sumOf { it.finalPrice }
        val totalProfit = salesList.sumOf { it.profit ?: 0.0 }

        _stats.value = DashboardStats(
            totalDevices = total,
            inStock = inStock,
            sold = sold,
            underRepair = repair,
            totalSalesAmount = totalSales,
            totalProfit = totalProfit
        )
    }
}
