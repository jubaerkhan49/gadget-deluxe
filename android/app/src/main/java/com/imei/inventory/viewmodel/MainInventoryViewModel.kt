package com.imei.inventory.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.imei.inventory.data.api.ApiClient
import com.imei.inventory.data.model.*
import com.imei.inventory.util.LocalDataCache
import java.util.Calendar
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

data class DashboardStats(
    val totalDevices: Int = 0,
    val inStock: Int = 0,
    val sold: Int = 0,
    val underRepair: Int = 0,
    val todaySalesAmount: Double = 0.0,
    val totalSalesAmount: Double = 0.0,
    val todayProfit: Double = 0.0,
    val totalProfit: Double = 0.0,
    val totalAssets: Double = 0.0
)

class MainInventoryViewModel : ViewModel() {

    // Local Storage Cache
    private var localDataCache: LocalDataCache? = null

    // Current User / Role
    private val _currentUser = MutableStateFlow<UserDto?>(null)
    val currentUser: StateFlow<UserDto?> = _currentUser

    fun setCurrentUser(user: UserDto?) {
        _currentUser.value = user
    }

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

    // Analytics State
    private val _analyticsData = MutableStateFlow<AnalyticsResponseDto?>(null)
    val analyticsData: StateFlow<AnalyticsResponseDto?> = _analyticsData

    private val _isAnalyticsLoading = MutableStateFlow(false)
    val isAnalyticsLoading: StateFlow<Boolean> = _isAnalyticsLoading

    private val _analyticsYear = MutableStateFlow(Calendar.getInstance().get(Calendar.YEAR))
    val analyticsYear: StateFlow<Int> = _analyticsYear

    private val _analyticsMonth = MutableStateFlow(Calendar.getInstance().get(Calendar.MONTH) + 1)
    val analyticsMonth: StateFlow<Int> = _analyticsMonth

    // Shipments State
    private val _shipments = MutableStateFlow<List<ShipmentDto>>(emptyList())
    val shipments: StateFlow<List<ShipmentDto>> = _shipments

    // Sales State
    private val _sales = MutableStateFlow<List<SaleDto>>(emptyList())
    val sales: StateFlow<List<SaleDto>> = _sales

    // Repairs State
    private val _repairs = MutableStateFlow<List<RepairDto>>(emptyList())
    val repairs: StateFlow<List<RepairDto>> = _repairs

    // Pending Sale Requests State (Admin)
    private val _pendingSaleRequests = MutableStateFlow<List<DeviceSaleRequestDto>>(emptyList())
    val pendingSaleRequests: StateFlow<List<DeviceSaleRequestDto>> = _pendingSaleRequests

    private val seenSaleRequestIds = mutableSetOf<Int>()
    private var isFirstSyncCompleted = false

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

    /**
     * Instantly restores all cached data from local storage into memory.
     * Guarantees 0ms UI render time on startup.
     */
    fun initCache(context: android.content.Context) {
        if (localDataCache == null) {
            val cache = LocalDataCache(context)
            localDataCache = cache
            loadFromLocalCache(cache)
        }
    }

    private fun loadFromLocalCache(cache: LocalDataCache) {
        val cachedStats = cache.getDashboardStats()
        if (cachedStats != null) _stats.value = cachedStats

        val cachedDevs = cache.getDevices()
        if (cachedDevs.isNotEmpty()) _devices.value = cachedDevs

        val cachedShips = cache.getShipments()
        if (cachedShips.isNotEmpty()) _shipments.value = cachedShips

        val cachedSales = cache.getSales()
        if (cachedSales.isNotEmpty()) _sales.value = cachedSales

        val cachedRepairs = cache.getRepairs()
        if (cachedRepairs.isNotEmpty()) _repairs.value = cachedRepairs

        val cachedUsers = cache.getUsers()
        if (cachedUsers.isNotEmpty()) _users.value = cachedUsers

        val cachedAnalytics = cache.getAnalytics()
        if (cachedAnalytics != null) _analyticsData.value = cachedAnalytics

        val cachedRequests = cache.getPendingSaleRequests()
        if (cachedRequests.isNotEmpty()) _pendingSaleRequests.value = cachedRequests
    }

    fun clearLocalCache() {
        localDataCache?.clearCache()
        _devices.value = emptyList()
        _shipments.value = emptyList()
        _sales.value = emptyList()
        _repairs.value = emptyList()
        _users.value = emptyList()
        _pendingSaleRequests.value = emptyList()
        _analyticsData.value = null
        _stats.value = DashboardStats()
    }

    fun loadAllData(token: String, context: android.content.Context? = null) {
        if (context != null) {
            initCache(context)
        }
        fetchDashboardStats(token)
        fetchUsers(token)
        fetchDevices(token)
        fetchShipments(token)
        fetchSales(token)
        fetchRepairs(token)
        fetchAnalytics(token)
        if (_currentUser.value?.isAdmin == true) {
            fetchPendingSaleRequests(token)
        }
        startRealtimeSync(token, context)
    }

    fun fetchDashboardStats(token: String) {
        viewModelScope.launch {
            try {
                val bearer = "Bearer $token"
                val statsRes = ApiClient.apiService.getDashboardStats(bearer)
                if (statsRes.isSuccessful && statsRes.body() != null) {
                    val s = statsRes.body()!!
                    val localSalesSum = _sales.value.sumOf { it.displayPrice }
                    val localProfitSum = _sales.value.sumOf { it.profit ?: 0.0 }
                    val newStats = DashboardStats(
                        totalDevices = s.totalDevices,
                        inStock = s.inStock,
                        sold = s.sold,
                        underRepair = s.underRepair,
                        todaySalesAmount = s.todaySales,
                        totalSalesAmount = if (s.totalSales > 0) s.totalSales else localSalesSum,
                        todayProfit = s.todayProfit,
                        totalProfit = if (s.totalProfit > 0) s.totalProfit else localProfitSum,
                        totalAssets = s.totalAssets
                    )
                    _stats.value = newStats
                    localDataCache?.saveDashboardStats(newStats)
                }
            } catch (e: Exception) {
                // ignore, keep cached stats
            }
        }
    }

    fun fetchPendingSaleRequests(token: String) {
        viewModelScope.launch {
            try {
                val bearer = "Bearer $token"
                val res = ApiClient.apiService.getDeviceSaleRequests(bearer, status = "PENDING", pageSize = 100)
                if (res.isSuccessful && res.body() != null) {
                    val list = res.body()!!.results
                    _pendingSaleRequests.value = list
                    localDataCache?.savePendingSaleRequests(list)
                    if (!isFirstSyncCompleted) {
                        list.forEach { seenSaleRequestIds.add(it.id) }
                    }
                }
            } catch (e: Exception) {
                // ignore
            }
        }
    }

    fun startRealtimeSync(token: String, context: android.content.Context? = null) {
        realtimeJob?.cancel()
        realtimeJob = viewModelScope.launch {
            while (true) {
                kotlinx.coroutines.delay(30000) // Poll sync every 30 seconds quietly in background to save battery & data
                try {
                    val bearer = "Bearer $token"
                    val isAdminUser = _currentUser.value?.isAdmin == true

                    // 1. Fetch real-time dashboard analytics
                    val statsRes = ApiClient.apiService.getDashboardStats(bearer)
                    if (statsRes.isSuccessful && statsRes.body() != null) {
                        val s = statsRes.body()!!
                        val localSalesSum = _sales.value.sumOf { it.displayPrice }
                        val localProfitSum = _sales.value.sumOf { it.profit ?: 0.0 }
                        val newStats = DashboardStats(
                            totalDevices = s.totalDevices,
                            inStock = s.inStock,
                            sold = s.sold,
                            underRepair = s.underRepair,
                            todaySalesAmount = s.todaySales,
                            totalSalesAmount = if (s.totalSales > 0) s.totalSales else localSalesSum,
                            todayProfit = s.todayProfit,
                            totalProfit = if (s.totalProfit > 0) s.totalProfit else localProfitSum,
                            totalAssets = s.totalAssets
                        )
                        if (_stats.value != newStats) {
                            _stats.value = newStats
                            localDataCache?.saveDashboardStats(newStats)
                        }
                    }

                    // 2. Fetch full device inventory
                    val devRes = ApiClient.apiService.getDevices(bearer, null, null, 500)
                    if (devRes.isSuccessful && devRes.body() != null) {
                        val list = devRes.body()!!.results
                        if (_devices.value != list) {
                            _devices.value = list
                            localDataCache?.saveDevices(list)
                        }
                    }

                    // 3. For Admin: Check for new pending sale approval requests and notify
                    if (isAdminUser) {
                        val reqRes = ApiClient.apiService.getDeviceSaleRequests(bearer, status = "PENDING", pageSize = 100)
                        if (reqRes.isSuccessful && reqRes.body() != null) {
                            val requests = reqRes.body()!!.results
                            if (_pendingSaleRequests.value != requests) {
                                _pendingSaleRequests.value = requests
                                localDataCache?.savePendingSaleRequests(requests)
                            }

                            if (isFirstSyncCompleted && context != null) {
                                for (req in requests) {
                                    if (!seenSaleRequestIds.contains(req.id)) {
                                        seenSaleRequestIds.add(req.id)
                                        com.imei.inventory.util.NotificationHelper.showSaleApprovalNotification(context, req)
                                    }
                                }
                            } else {
                                requests.forEach { seenSaleRequestIds.add(it.id) }
                                isFirstSyncCompleted = true
                            }
                        }
                    }

                    // 4. Fetch shipments
                    val shipRes = ApiClient.apiService.getShipments(bearer)
                    if (shipRes.isSuccessful && shipRes.body() != null) {
                        val list = shipRes.body()!!.results
                        if (_shipments.value != list) {
                            _shipments.value = list
                            localDataCache?.saveShipments(list)
                        }
                    }

                    // 5. Fetch sales
                    val salesRes = ApiClient.apiService.getSales(bearer)
                    if (salesRes.isSuccessful && salesRes.body() != null) {
                        val list = salesRes.body()!!.results
                        if (_sales.value != list) {
                            _sales.value = list
                            localDataCache?.saveSales(list)
                        }
                    }

                    localDataCache?.setLastSyncTime()
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
            if (_devices.value.isEmpty()) {
                _isLoading.value = true
            }
            _errorMessage.value = null
            try {
                val bearer = "Bearer $token"
                val response = ApiClient.apiService.getDevices(
                    token = bearer,
                    search = if (query.isNullOrBlank()) null else query.trim(),
                    status = null,
                    pageSize = 500
                )
                if (response.isSuccessful && response.body() != null) {
                    val list = response.body()!!.results
                    _devices.value = list
                    if (query.isNullOrBlank()) {
                        localDataCache?.saveDevices(list)
                    }
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
                    loadAllData(token)
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
                    val usersList = response.body()!!.results.filter { !it.username.equals("admin", ignoreCase = true) }
                    _users.value = usersList
                    localDataCache?.saveUsers(usersList)
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
                    loadAllData(token)
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
                    loadAllData(token)
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
                    val list = response.body()!!.results
                    _shipments.value = list
                    localDataCache?.saveShipments(list)
                }
            } catch (e: Exception) {
                // ignore
            }
        }
    }

    fun updateShipment(token: String, shipmentId: Int, updates: Map<String, Any?>, onSuccess: () -> Unit = {}) {
        viewModelScope.launch {
            try {
                val bearer = "Bearer $token"
                val response = ApiClient.apiService.updateShipment(bearer, shipmentId, updates)
                if (response.isSuccessful) {
                    onSuccess()
                    loadAllData(token)
                }
            } catch (e: Exception) {
                // ignore
            }
        }
    }

    fun deleteShipment(token: String, shipmentId: Int, onSuccess: () -> Unit = {}) {
        viewModelScope.launch {
            try {
                val bearer = "Bearer $token"
                val response = ApiClient.apiService.deleteShipment(bearer, shipmentId)
                if (response.isSuccessful) {
                    onSuccess()
                    loadAllData(token)
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
                    localDataCache?.saveSales(salesList)
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
                    val list = response.body()!!.results
                    _repairs.value = list
                    localDataCache?.saveRepairs(list)
                }
            } catch (e: Exception) {
                // ignore
            }
        }
    }

    fun fetchAnalytics(token: String, year: Int? = null, month: Int? = null) {
        val y = year ?: _analyticsYear.value
        val m = month ?: _analyticsMonth.value
        _analyticsYear.value = y
        _analyticsMonth.value = m

        viewModelScope.launch {
            if (_analyticsData.value == null) {
                _isAnalyticsLoading.value = true
            }
            try {
                val res = ApiClient.apiService.getAnalytics("Bearer $token", y, m)
                if (res.isSuccessful && res.body() != null) {
                    val body = res.body()!!
                    _analyticsData.value = body
                    localDataCache?.saveAnalytics(body)
                }
            } catch (e: Exception) {
                // ignore
            } finally {
                _isAnalyticsLoading.value = false
            }
        }
    }

    fun prevMonth(token: String) {
        var y = _analyticsYear.value
        var m = _analyticsMonth.value - 1
        if (m < 1) {
            m = 12
            y -= 1
        }
        fetchAnalytics(token, y, m)
    }

    fun nextMonth(token: String) {
        var y = _analyticsYear.value
        var m = _analyticsMonth.value + 1
        if (m > 12) {
            m = 1
            y += 1
        }
        fetchAnalytics(token, y, m)
    }

    fun resetToCurrentMonth(token: String) {
        val curYear = Calendar.getInstance().get(Calendar.YEAR)
        val curMonth = Calendar.getInstance().get(Calendar.MONTH) + 1
        fetchAnalytics(token, curYear, curMonth)
    }

    fun requestDeviceSale(
        token: String,
        deviceId: Int,
        proposedPrice: Double,
        paymentMethod: String,
        notes: String?,
        onSuccess: () -> Unit = {},
        onError: (String) -> Unit = {}
    ) {
        viewModelScope.launch {
            try {
                val bearer = "Bearer $token"
                val payload = mutableMapOf<String, Any?>(
                    "proposed_price" to proposedPrice,
                    "payment_method" to paymentMethod,
                    "notes" to notes
                )
                val res = ApiClient.apiService.requestDeviceSale(bearer, deviceId, payload)
                if (res.isSuccessful) {
                    fetchDevices(token)
                    onSuccess()
                } else {
                    onError("Failed to submit sale request (${res.code()})")
                }
            } catch (e: Exception) {
                onError("Network error: ${e.localizedMessage}")
            }
        }
    }

    fun changePassword(
        token: String,
        oldPass: String,
        newPass: String,
        onSuccess: () -> Unit = {},
        onError: (String) -> Unit = {}
    ) {
        viewModelScope.launch {
            try {
                val bearer = "Bearer $token"
                val payload = mapOf(
                    "old_password" to oldPass,
                    "new_password" to newPass
                )
                val res = ApiClient.apiService.changePassword(bearer, payload)
                if (res.isSuccessful) {
                    onSuccess()
                } else {
                    onError("Failed to update password (${res.code()})")
                }
            } catch (e: Exception) {
                onError("Network error: ${e.localizedMessage}")
            }
        }
    }

    fun confirmSaleRequest(
        token: String,
        requestId: Int,
        confirmedPrice: Double,
        paymentMethod: String,
        notes: String?,
        commissionAmount: Double = 0.0,
        onSuccess: () -> Unit = {},
        onError: (String) -> Unit = {}
    ) {
        viewModelScope.launch {
            try {
                val bearer = "Bearer $token"
                val payload = mutableMapOf<String, Any?>(
                    "confirmed_price" to confirmedPrice,
                    "selling_price" to confirmedPrice,
                    "commission_amount" to commissionAmount,
                    "payment_method" to paymentMethod,
                    "notes" to notes
                )
                val res = ApiClient.apiService.confirmDeviceSaleRequest(bearer, requestId, payload)
                if (res.isSuccessful) {
                    loadAllData(token)
                    onSuccess()
                } else {
                    onError("Failed to confirm sale request (${res.code()})")
                }
            } catch (e: Exception) {
                onError("Network error: ${e.localizedMessage}")
            }
        }
    }

    fun rejectSaleRequest(
        token: String,
        requestId: Int,
        notes: String?,
        onSuccess: () -> Unit = {},
        onError: (String) -> Unit = {}
    ) {
        viewModelScope.launch {
            try {
                val bearer = "Bearer $token"
                val payload = mutableMapOf<String, Any?>(
                    "notes" to notes
                )
                val res = ApiClient.apiService.rejectDeviceSaleRequest(bearer, requestId, payload)
                if (res.isSuccessful) {
                    loadAllData(token)
                    onSuccess()
                } else {
                    onError("Failed to reject sale request (${res.code()})")
                }
            } catch (e: Exception) {
                onError("Network error: ${e.localizedMessage}")
            }
        }
    }
}
