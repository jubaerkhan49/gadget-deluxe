package com.imei.inventory.ui.screens

import androidx.compose.animation.*
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ReceiptLong
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.imei.inventory.data.model.SaleDto
import com.imei.inventory.data.model.UserDto
import com.imei.inventory.ui.components.CopyableText
import com.imei.inventory.ui.components.ExpressiveSearchBar
import com.imei.inventory.ui.components.formatDateToDDMMYYYY
import com.imei.inventory.ui.components.formatIndianNumber
import com.imei.inventory.ui.theme.*
import com.imei.inventory.viewmodel.MainInventoryViewModel
import java.time.YearMonth
import java.time.format.TextStyle
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun StaffAnalyticsTab(
    token: String,
    viewModel: MainInventoryViewModel,
    currentUser: UserDto? = null
) {
    val sales by viewModel.sales.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()

    var currentYearMonth by remember { mutableStateOf(YearMonth.now()) }
    var selectedCalendarDay by remember { mutableStateOf<Int?>(null) }
    var searchQuery by remember { mutableStateOf("") }
    // 0 = Calendar & Performance View, 1 = Sales Ledger View
    var viewMode by remember { mutableStateOf(0) }

    LaunchedEffect(Unit) {
        viewModel.fetchSales(token)
    }

    // 1. Filter sales specifically belonging to this logged-in staff member
    val mySales = remember(sales, currentUser) {
        val user = currentUser
        if (user == null) emptyList()
        else {
            sales.filter { sale ->
                val usernameMatch = !user.username.isNullOrBlank() && (
                    sale.soldBy?.equals(user.username, ignoreCase = true) == true ||
                    sale.sellerName?.equals(user.username, ignoreCase = true) == true
                )
                val displayNameMatch = !user.displayName.isNullOrBlank() && (
                    sale.soldBy?.equals(user.displayName, ignoreCase = true) == true ||
                    sale.sellerName?.equals(user.displayName, ignoreCase = true) == true
                )
                usernameMatch || displayNameMatch
            }
        }
    }

    // 2. Filter sales for selected Year & Month
    val monthSales = remember(mySales, currentYearMonth) {
        val prefix = "%04d-%02d".format(currentYearMonth.year, currentYearMonth.monthValue)
        mySales.filter { sale ->
            val date = sale.createdAt
            date != null && date.startsWith(prefix)
        }
    }

    // 3. Group month sales by day (1..daysInMonth)
    val daysInMonth = currentYearMonth.lengthOfMonth()
    val salesByDay = remember(monthSales, daysInMonth) {
        val map = mutableMapOf<Int, MutableList<SaleDto>>()
        monthSales.forEach { sale ->
            val dateStr = sale.createdAt
            if (!dateStr.isNullOrBlank() && dateStr.length >= 10) {
                val dayStr = dateStr.substring(8, 10)
                val dayInt = dayStr.toIntOrNull()
                if (dayInt != null && dayInt in 1..daysInMonth) {
                    map.getOrPut(dayInt) { mutableListOf() }.add(sale)
                }
            }
        }
        map
    }

    // 4. Metrics: Early, Mid, Late breakdown
    val earlyUnits = remember(salesByDay) {
        (1..10).sumOf { salesByDay[it]?.size ?: 0 }
    }
    val midUnits = remember(salesByDay) {
        (11..20).sumOf { salesByDay[it]?.size ?: 0 }
    }
    val lateUnits = remember(salesByDay, daysInMonth) {
        (21..daysInMonth).sumOf { salesByDay[it]?.size ?: 0 }
    }

    // 5. Active selling days & Consistency Score
    val activeSellingDaysCount = remember(salesByDay) {
        salesByDay.count { it.value.isNotEmpty() }
    }
    val isCurrentMonth = currentYearMonth == YearMonth.now()
    val elapsedDays = if (isCurrentMonth) maxOf(1, java.time.LocalDate.now().dayOfMonth) else daysInMonth
    val consistencyPercent = minOf(100, ((activeSellingDaysCount.toFloat() / maxOf(1, elapsedDays)) * 100).toInt())

    val consistencyRating = when {
        consistencyPercent >= 40 -> "High Consistency" to AccentEmerald
        consistencyPercent >= 20 -> "Moderate Pace" to AccentBlue
        else -> "Needs Consistency" to AccentAmber
    }

    // 6. Peak selling day calculation
    val peakDayInfo = remember(salesByDay) {
        var maxUnits = 0
        val peakDays = mutableListOf<Int>()
        for (day in 1..daysInMonth) {
            val count = salesByDay[day]?.size ?: 0
            if (count > maxUnits) {
                maxUnits = count
                peakDays.clear()
                peakDays.add(day)
            } else if (count == maxUnits && count > 0) {
                peakDays.add(day)
            }
        }
        maxUnits to peakDays
    }

    // 7. Filtered sales ledger
    val filteredSalesLedger = remember(monthSales, searchQuery) {
        if (searchQuery.isBlank()) monthSales
        else {
            val q = searchQuery.trim().lowercase()
            monthSales.filter { s ->
                s.deviceModel?.lowercase()?.contains(q) == true ||
                s.deviceImei?.lowercase()?.contains(q) == true ||
                s.paymentMethod?.lowercase()?.contains(q) == true ||
                s.customerName?.lowercase()?.contains(q) == true
            }
        }
    }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 14.dp, vertical = 6.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
        contentPadding = PaddingValues(bottom = 80.dp)
    ) {
        // Mode Selector: [ Monthly Analytics | Sales Ledger ]
        item {
            Card(
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                shape = RoundedCornerShape(12.dp),
                border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.45f)),
                elevation = CardDefaults.cardElevation(defaultElevation = 0.5.dp)
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(3.dp),
                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    Surface(
                        onClick = { viewMode = 0 },
                        shape = RoundedCornerShape(percent = 50),
                        color = if (viewMode == 0) AccentEmerald else Color.Transparent,
                        modifier = Modifier.weight(1f).height(34.dp)
                    ) {
                        Row(
                            modifier = Modifier.fillMaxSize(),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.Center
                        ) {
                            Icon(
                                imageVector = Icons.Default.CalendarMonth,
                                contentDescription = null,
                                tint = if (viewMode == 0) Color.White else MaterialTheme.colorScheme.onSurfaceVariant,
                                modifier = Modifier.size(15.dp)
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                text = "Monthly Analytics",
                                color = if (viewMode == 0) Color.White else MaterialTheme.colorScheme.onSurfaceVariant,
                                fontSize = 11.5.sp,
                                fontWeight = if (viewMode == 0) FontWeight.Bold else FontWeight.Medium
                            )
                        }
                    }

                    Surface(
                        onClick = { viewMode = 1 },
                        shape = RoundedCornerShape(percent = 50),
                        color = if (viewMode == 1) MaterialTheme.colorScheme.primary else Color.Transparent,
                        modifier = Modifier.weight(1f).height(34.dp)
                    ) {
                        Row(
                            modifier = Modifier.fillMaxSize(),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.Center
                        ) {
                            Icon(
                                imageVector = Icons.AutoMirrored.Filled.ReceiptLong,
                                contentDescription = null,
                                tint = if (viewMode == 1) Color.White else MaterialTheme.colorScheme.onSurfaceVariant,
                                modifier = Modifier.size(15.dp)
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                text = "My Invoices (${monthSales.size})",
                                color = if (viewMode == 1) Color.White else MaterialTheme.colorScheme.onSurfaceVariant,
                                fontSize = 11.5.sp,
                                fontWeight = if (viewMode == 1) FontWeight.Bold else FontWeight.Medium
                            )
                        }
                    }
                }
            }
        }

        // Month Selector Bar
        item {
            Card(
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                shape = RoundedCornerShape(12.dp),
                border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.45f))
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 8.dp, vertical = 4.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    IconButton(
                        onClick = {
                            currentYearMonth = currentYearMonth.minusMonths(1)
                            selectedCalendarDay = null
                        },
                        modifier = Modifier.size(30.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.ChevronLeft,
                            contentDescription = "Previous Month",
                            tint = MaterialTheme.colorScheme.onSurface
                        )
                    }

                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            text = "${currentYearMonth.month.getDisplayName(TextStyle.FULL, Locale.ENGLISH)} ${currentYearMonth.year}",
                            fontWeight = FontWeight.ExtraBold,
                            fontSize = 14.sp,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                        if (!isCurrentMonth) {
                            Spacer(modifier = Modifier.width(8.dp))
                            Surface(
                                onClick = {
                                    currentYearMonth = YearMonth.now()
                                    selectedCalendarDay = null
                                },
                                shape = RoundedCornerShape(percent = 50),
                                color = MaterialTheme.colorScheme.primary.copy(alpha = 0.12f)
                            ) {
                                Text(
                                    text = "Today",
                                    color = MaterialTheme.colorScheme.primary,
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.Bold,
                                    modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                )
                            }
                        }
                    }

                    IconButton(
                        onClick = {
                            currentYearMonth = currentYearMonth.plusMonths(1)
                            selectedCalendarDay = null
                        },
                        modifier = Modifier.size(30.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.ChevronRight,
                            contentDescription = "Next Month",
                            tint = MaterialTheme.colorScheme.onSurface
                        )
                    }
                }
            }
        }

        // Summary Performance Cards
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                StaffMiniMetric(
                    title = "Units Sold",
                    value = "${monthSales.size} Units",
                    color = AccentBlue,
                    modifier = Modifier.weight(1f)
                )
                StaffMiniMetric(
                    title = "Consistency",
                    value = "${consistencyPercent}% (${consistencyRating.first.split(" ").first()})",
                    color = consistencyRating.second,
                    modifier = Modifier.weight(1.2f)
                )
                StaffMiniMetric(
                    title = "Active Days",
                    value = "$activeSellingDaysCount / $elapsedDays",
                    color = AccentPurple,
                    modifier = Modifier.weight(1f)
                )
            }
        }

        // Period Breakdown Chips (Early / Mid / Late)
        item {
            Surface(
                shape = RoundedCornerShape(10.dp),
                color = MaterialTheme.colorScheme.surfaceContainerLow,
                border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.35f)),
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 10.dp, vertical = 6.dp),
                    horizontalArrangement = Arrangement.SpaceAround,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    PeriodPill(label = "Early (1-10)", count = earlyUnits)
                    Box(modifier = Modifier.width(1.dp).height(16.dp).background(MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f)))
                    PeriodPill(label = "Mid (11-20)", count = midUnits)
                    Box(modifier = Modifier.width(1.dp).height(16.dp).background(MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f)))
                    PeriodPill(label = "Late (21-${daysInMonth})", count = lateUnits)
                }
            }
        }

        if (viewMode == 0) {
            // Interactive Monthly Calendar
            item {
                Card(
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                    shape = RoundedCornerShape(12.dp),
                    border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.45f)),
                    elevation = CardDefaults.cardElevation(defaultElevation = 0.5.dp)
                ) {
                    Column(
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 8.dp),
                        verticalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        StaffMonthCalendarGrid(
                            yearMonth = currentYearMonth,
                            salesByDay = salesByDay,
                            selectedDay = selectedCalendarDay,
                            onDayClick = { day ->
                                selectedCalendarDay = if (selectedCalendarDay == day) null else day
                            }
                        )
                    }
                }
            }

            // Invoices for Selected Day (if any day clicked)
            if (selectedCalendarDay != null) {
                val daySales = salesByDay[selectedCalendarDay] ?: emptyList()
                item {
                    Row(
                        modifier = Modifier.fillMaxWidth().padding(top = 2.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "Sales on ${currentYearMonth.month.getDisplayName(TextStyle.SHORT, Locale.ENGLISH)} $selectedCalendarDay (${daySales.size} units)",
                            color = MaterialTheme.colorScheme.onBackground,
                            fontWeight = FontWeight.Bold,
                            fontSize = 13.sp
                        )
                        IconButton(
                            onClick = { selectedCalendarDay = null },
                            modifier = Modifier.size(24.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.Close,
                                contentDescription = "Close",
                                tint = MaterialTheme.colorScheme.onSurfaceVariant,
                                modifier = Modifier.size(15.dp)
                            )
                        }
                    }
                }

                if (daySales.isEmpty()) {
                    item {
                        Surface(
                            shape = RoundedCornerShape(10.dp),
                            color = MaterialTheme.colorScheme.surfaceContainerLow,
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Text(
                                text = "No sales recorded on this day.",
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                fontSize = 12.sp,
                                modifier = Modifier.padding(10.dp),
                                textAlign = TextAlign.Center
                            )
                        }
                    }
                } else {
                    items(daySales, key = { it.id }) { sale ->
                        StaffSaleInvoiceCard(sale)
                    }
                }
            }
        } else {
            // MODE 1: All Invoices Ledger View
            item {
                ExpressiveSearchBar(
                    query = searchQuery,
                    onQueryChange = { searchQuery = it },
                    placeholder = "Search your sales by model, IMEI, customer, payment..."
                )
            }

            if (isLoading && sales.isEmpty()) {
                item {
                    Box(modifier = Modifier.fillMaxWidth().height(100.dp), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator(color = MaterialTheme.colorScheme.primary)
                    }
                }
            } else if (filteredSalesLedger.isEmpty()) {
                item {
                    Box(modifier = Modifier.fillMaxWidth().height(100.dp), contentAlignment = Alignment.Center) {
                        Text("No matching sales recorded this month", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 13.sp)
                    }
                }
            } else {
                items(filteredSalesLedger, key = { it.id }) { sale ->
                    StaffSaleInvoiceCard(sale)
                }
            }
        }
    }
}

@Composable
private fun StaffMiniMetric(
    title: String,
    value: String,
    color: Color,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier,
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        shape = RoundedCornerShape(10.dp),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.4f)),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.5.dp)
    ) {
        Column(
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 6.dp),
            verticalArrangement = Arrangement.spacedBy(2.dp)
        ) {
            Text(
                text = title.uppercase(),
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                fontSize = 8.5.sp,
                fontWeight = FontWeight.Bold,
                letterSpacing = 0.3.sp,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
            Text(
                text = value,
                color = color,
                fontSize = 12.sp,
                fontWeight = FontWeight.ExtraBold,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
        }
    }
}

@Composable
private fun PeriodPill(label: String, count: Int) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Text(
            text = label,
            fontSize = 10.5.sp,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            fontWeight = FontWeight.Medium
        )
        Spacer(modifier = Modifier.width(4.dp))
        Surface(
            shape = RoundedCornerShape(percent = 50),
            color = if (count > 0) AccentEmerald.copy(alpha = 0.15f) else MaterialTheme.colorScheme.surfaceContainerHigh
        ) {
            Text(
                text = "$count",
                fontSize = 10.5.sp,
                fontWeight = FontWeight.Bold,
                color = if (count > 0) AccentEmerald else MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(horizontal = 6.dp, vertical = 1.dp)
            )
        }
    }
}

@Composable
private fun StaffMonthCalendarGrid(
    yearMonth: YearMonth,
    salesByDay: Map<Int, List<SaleDto>>,
    selectedDay: Int?,
    onDayClick: (Int) -> Unit
) {
    val daysInMonth = yearMonth.lengthOfMonth()
    val firstDayOfWeek = yearMonth.atDay(1).dayOfWeek.value % 7
    val weekDays = listOf("Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat")

    Column(
        modifier = Modifier.fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(3.dp)
    ) {
        // Weekday header
        Row(modifier = Modifier.fillMaxWidth()) {
            weekDays.forEach { dayName ->
                Text(
                    text = dayName,
                    modifier = Modifier.weight(1f),
                    textAlign = TextAlign.Center,
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.8f)
                )
            }
        }

        Spacer(modifier = Modifier.height(2.dp))

        // Days Grid
        val totalCells = firstDayOfWeek + daysInMonth
        val rows = (totalCells + 6) / 7

        for (row in 0 until rows) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(2.dp)
            ) {
                for (col in 0 until 7) {
                    val cellIndex = row * 7 + col
                    val day = cellIndex - firstDayOfWeek + 1

                    if (day in 1..daysInMonth) {
                        val count = salesByDay[day]?.size ?: 0
                        val hasSales = count > 0
                        val isSelected = selectedDay == day

                        Column(
                            modifier = Modifier
                                .weight(1f)
                                .clickable { onDayClick(day) }
                                .padding(vertical = 1.dp),
                            horizontalAlignment = Alignment.CenterHorizontally,
                            verticalArrangement = Arrangement.Center
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(28.dp)
                                    .background(
                                        color = when {
                                            isSelected -> MaterialTheme.colorScheme.primary
                                            hasSales -> AccentEmerald.copy(alpha = 0.18f)
                                            else -> Color.Transparent
                                        },
                                        shape = CircleShape
                                    )
                                    .border(
                                        width = 1.dp,
                                        color = when {
                                            isSelected -> MaterialTheme.colorScheme.primary
                                            hasSales -> AccentEmerald.copy(alpha = 0.5f)
                                            else -> Color.Transparent
                                        },
                                        shape = CircleShape
                                    ),
                                contentAlignment = Alignment.Center
                            ) {
                                Text(
                                    text = "$day",
                                    fontSize = 11.5.sp,
                                    fontWeight = if (hasSales || isSelected) FontWeight.Bold else FontWeight.Medium,
                                    color = when {
                                        isSelected -> Color.White
                                        hasSales -> AccentEmerald
                                        else -> MaterialTheme.colorScheme.onSurface
                                    }
                                )
                            }

                            Spacer(modifier = Modifier.height(2.dp))

                            Box(
                                modifier = Modifier.height(18.dp),
                                contentAlignment = Alignment.Center
                            ) {
                                if (hasSales) {
                                    Surface(
                                        color = if (isSelected) MaterialTheme.colorScheme.primary.copy(alpha = 0.15f) else AccentEmerald.copy(alpha = 0.15f),
                                        shape = RoundedCornerShape(percent = 50)
                                    ) {
                                        Text(
                                            text = if (count == 1) "1 sold" else "$count sold",
                                            fontSize = 8.5.sp,
                                            lineHeight = 10.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = if (isSelected) MaterialTheme.colorScheme.primary else AccentEmerald,
                                            maxLines = 1,
                                            modifier = Modifier.padding(horizontal = 4.dp, vertical = 2.dp)
                                        )
                                    }
                                }
                            }
                        }
                    } else {
                        Spacer(modifier = Modifier.weight(1f))
                    }
                }
            }
        }
    }
}

@Composable
fun StaffSaleInvoiceCard(sale: SaleDto) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        shape = RoundedCornerShape(10.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.5.dp),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.4f))
    ) {
        Column(
            modifier = Modifier.padding(horizontal = 10.dp, vertical = 8.dp),
            verticalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            // Row 1: Model Name + Price
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.weight(1f, fill = false)
                ) {
                    Surface(
                        shape = RoundedCornerShape(8.dp),
                        color = MaterialTheme.colorScheme.primary.copy(alpha = 0.12f),
                        modifier = Modifier.size(24.dp)
                    ) {
                        Box(contentAlignment = Alignment.Center) {
                            Icon(
                                imageVector = Icons.Default.PhoneAndroid,
                                contentDescription = null,
                                tint = MaterialTheme.colorScheme.primary,
                                modifier = Modifier.size(14.dp)
                            )
                        }
                    }
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = sale.deviceModel ?: "Device Sale",
                        fontWeight = FontWeight.Bold,
                        fontSize = 13.5.sp,
                        color = MaterialTheme.colorScheme.onSurface,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }

                Text(
                    text = "৳ ${formatIndianNumber(sale.displayPrice)}",
                    fontWeight = FontWeight.ExtraBold,
                    fontSize = 13.5.sp,
                    color = AccentEmerald
                )
            }

            // Row 2: Monospace IMEI + Payment Method
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                sale.deviceImei?.let { imei ->
                    CopyableText(label = "IMEI", value = imei)
                }

                sale.paymentMethod?.takeIf { it.isNotBlank() }?.let { pm ->
                    Surface(
                        shape = RoundedCornerShape(percent = 50),
                        color = MaterialTheme.colorScheme.surfaceContainerHighest,
                        border = BorderStroke(0.6.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.4f))
                    ) {
                        Text(
                            text = pm.uppercase(),
                            fontSize = 9.sp,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                        )
                    }
                }
            }

            // Row 3: Date & Customer / Notes info
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = Icons.Default.CalendarToday,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.6f),
                        modifier = Modifier.size(11.dp)
                    )
                    Spacer(modifier = Modifier.width(3.dp))
                    Text(
                        text = formatDateToDDMMYYYY(sale.createdAt, "Recent"),
                        fontSize = 10.5.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }

                sale.customerName?.takeIf { it.isNotBlank() }?.let { cust ->
                    Text(
                        text = "Customer: $cust",
                        fontSize = 10.5.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        fontWeight = FontWeight.Medium,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }
            }
        }
    }
}
