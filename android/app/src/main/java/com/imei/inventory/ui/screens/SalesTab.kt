package com.imei.inventory.ui.screens

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.imei.inventory.data.model.SaleDto
import com.imei.inventory.ui.components.CopyableText
import com.imei.inventory.ui.components.ExpressiveSearchBar
import com.imei.inventory.ui.components.VariantBadge
import com.imei.inventory.ui.components.formatDateToDDMMYYYY
import com.imei.inventory.ui.components.formatIndianNumber
import com.imei.inventory.ui.theme.*
import com.imei.inventory.viewmodel.MainInventoryViewModel
import java.time.LocalDate
import java.time.YearMonth
import java.time.format.TextStyle
import java.util.Locale

@Composable
fun SalesTab(
    token: String,
    viewModel: MainInventoryViewModel
) {
    val sales by viewModel.sales.collectAsState()
    val stats by viewModel.stats.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()

    // View Mode: 0 = Monthly Calendar & Analytics, 1 = All Invoices
    var viewMode by remember { mutableStateOf(0) }
    var searchQuery by remember { mutableStateOf("") }

    // Analytics Month State
    var currentYearMonth by remember { mutableStateOf(YearMonth.now()) }
    var selectedEmployee by remember { mutableStateOf("ALL") }
    var selectedCalendarDay by remember { mutableStateOf<Int?>(null) }

    LaunchedEffect(Unit) {
        viewModel.fetchSales(token)
    }

    // Helper to parse Sale date string
    fun parseSaleLocalDate(dateStr: String?): LocalDate? {
        if (dateStr.isNullOrBlank()) return null
        return try {
            if (dateStr.length >= 10) {
                LocalDate.parse(dateStr.substring(0, 10))
            } else null
        } catch (_: Exception) {
            null
        }
    }

    // Filter sales for the selected YearMonth
    val monthlySales = remember(sales, currentYearMonth, selectedEmployee) {
        sales.filter { sale ->
            val localDate = parseSaleLocalDate(sale.createdAt)
            if (localDate == null) {
                false
            } else {
                val matchesMonth = localDate.year == currentYearMonth.year && localDate.monthValue == currentYearMonth.monthValue
                val matchesEmp = selectedEmployee == "ALL" || sale.displaySoldBy.equals(selectedEmployee, ignoreCase = true)
                matchesMonth && matchesEmp
            }
        }
    }

    // Group sales by day of the month for the calendar
    val salesByDay = remember(monthlySales) {
        monthlySales.groupBy { sale ->
            parseSaleLocalDate(sale.createdAt)?.dayOfMonth ?: -1
        }
    }

    // Distinct employees in current month
    val monthEmployees = remember(sales, currentYearMonth) {
        sales
            .filter { sale ->
                val ld = parseSaleLocalDate(sale.createdAt)
                ld != null && ld.year == currentYearMonth.year && ld.monthValue == currentYearMonth.monthValue
            }
            .map { it.displaySoldBy }
            .distinct()
            .sorted()
    }

    // Employee performance breakdown
    val employeeBreakdown = remember(monthlySales) {
        monthlySales.groupBy { it.displaySoldBy }
            .map { (emp, list) ->
                Triple(
                    emp,
                    list.size,
                    Pair(list.sumOf { it.displayPrice }, list.sumOf { it.profit ?: 0.0 })
                )
            }
            .sortedByDescending { it.second }
    }

    // Overall metrics for the month
    val monthUnits = monthlySales.size
    val monthRevenue = monthlySales.sumOf { it.displayPrice }
    val monthProfit = monthlySales.sumOf { it.profit ?: 0.0 }

    // Overall all-time metrics
    val cumulativeSales = remember(sales, stats.totalSalesAmount) {
        val sum = sales.sumOf { it.displayPrice }
        if (sum > 0) sum else stats.totalSalesAmount
    }
    val cumulativeProfit = remember(sales, stats.totalProfit) {
        val sum = sales.sumOf { it.profit ?: 0.0 }
        if (sum > 0) sum else stats.totalProfit
    }

    // Filtered invoices for All Invoices tab
    val filteredInvoices = remember(sales, searchQuery) {
        if (searchQuery.isBlank()) sales
        else {
            val q = searchQuery.trim().lowercase()
            sales.filter { s ->
                (s.deviceModel?.lowercase()?.contains(q) == true) ||
                (s.deviceImei?.lowercase()?.contains(q) == true) ||
                (s.invoiceNumber.lowercase().contains(q)) ||
                (s.displaySoldBy.lowercase().contains(q)) ||
                (s.customerName?.lowercase()?.contains(q) == true)
            }
        }
    }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 14.dp, vertical = 10.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
        contentPadding = PaddingValues(bottom = 24.dp)
    ) {
        // Mode Switcher & Record Sale Header
        item {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                // Header Segmented Tabs
                Surface(
                    shape = RoundedCornerShape(percent = 50),
                    color = MaterialTheme.colorScheme.surfaceContainerHighest,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(
                        modifier = Modifier.padding(3.dp),
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
                                    imageVector = Icons.Default.ReceiptLong,
                                    contentDescription = null,
                                    tint = if (viewMode == 1) Color.White else MaterialTheme.colorScheme.onSurfaceVariant,
                                    modifier = Modifier.size(15.dp)
                                )
                                Spacer(modifier = Modifier.width(6.dp))
                                Text(
                                    text = "All Invoices (${sales.size})",
                                    color = if (viewMode == 1) Color.White else MaterialTheme.colorScheme.onSurfaceVariant,
                                    fontSize = 11.5.sp,
                                    fontWeight = if (viewMode == 1) FontWeight.Bold else FontWeight.Medium
                                )
                            }
                        }
                    }
                }

                // Summary Stat Cards Row
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    val units = if (viewMode == 0) monthUnits else sales.size
                    val revenue = if (viewMode == 0) monthRevenue else cumulativeSales
                    val profit = if (viewMode == 0) monthProfit else cumulativeProfit

                    SalesMiniStatCard(
                        title = if (viewMode == 0) "Units Sold" else "Total Invoices",
                        value = "$units Units",
                        color = AccentBlue,
                        modifier = Modifier.weight(1f)
                    )
                    SalesMiniStatCard(
                        title = "Revenue",
                        value = "৳ ${formatIndianNumber(revenue)}",
                        color = AccentEmerald,
                        modifier = Modifier.weight(1f)
                    )
                    SalesMiniStatCard(
                        title = "Realized Profit",
                        value = "৳ ${formatIndianNumber(profit)}",
                        color = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.weight(1f)
                    )
                }
            }
        }

        // MODE 0: Monthly Calendar & Analytics View
        if (viewMode == 0) {
            // Month Selector & Navigation Bar
            item {
                Card(
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                    shape = RoundedCornerShape(12.dp),
                    border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f))
                ) {
                    Column(
                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        // Month & Year Row
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            IconButton(
                                onClick = {
                                    currentYearMonth = currentYearMonth.minusMonths(1)
                                    selectedCalendarDay = null
                                },
                                modifier = Modifier.size(32.dp)
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
                                    fontSize = 15.sp,
                                    color = MaterialTheme.colorScheme.onSurface
                                )
                                val isCurrent = currentYearMonth == YearMonth.now()
                                if (!isCurrent) {
                                    Spacer(modifier = Modifier.width(6.dp))
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
                                modifier = Modifier.size(32.dp)
                            ) {
                                Icon(
                                    imageVector = Icons.Default.ChevronRight,
                                    contentDescription = "Next Month",
                                    tint = MaterialTheme.colorScheme.onSurface
                                )
                            }
                        }

                        // Employee Filter Chips Row
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .horizontalScroll(rememberScrollState()),
                            horizontalArrangement = Arrangement.spacedBy(6.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            // "ALL" Chip
                            FilterChip(
                                selected = selectedEmployee == "ALL",
                                onClick = { selectedEmployee = "ALL" },
                                label = {
                                    Text(
                                        text = "All Staff (${monthlySales.size})",
                                        fontSize = 11.sp,
                                        fontWeight = if (selectedEmployee == "ALL") FontWeight.Bold else FontWeight.Medium
                                    )
                                },
                                shape = RoundedCornerShape(percent = 50),
                                modifier = Modifier.height(28.dp),
                                colors = FilterChipDefaults.filterChipColors(
                                    selectedContainerColor = AccentEmerald,
                                    selectedLabelColor = Color.White
                                )
                            )

                            // Individual Employees
                            monthEmployees.forEach { emp ->
                                val empCount = sales.count { s ->
                                    val ld = parseSaleLocalDate(s.createdAt)
                                    ld != null && ld.year == currentYearMonth.year && ld.monthValue == currentYearMonth.monthValue && s.displaySoldBy.equals(emp, ignoreCase = true)
                                }
                                FilterChip(
                                    selected = selectedEmployee.equals(emp, ignoreCase = true),
                                    onClick = {
                                        selectedEmployee = if (selectedEmployee.equals(emp, ignoreCase = true)) "ALL" else emp
                                    },
                                    label = {
                                        Text(
                                            text = "$emp ($empCount)",
                                            fontSize = 11.sp,
                                            fontWeight = if (selectedEmployee.equals(emp, ignoreCase = true)) FontWeight.Bold else FontWeight.Medium
                                        )
                                    },
                                    shape = RoundedCornerShape(percent = 50),
                                    modifier = Modifier.height(28.dp),
                                    colors = FilterChipDefaults.filterChipColors(
                                        selectedContainerColor = MaterialTheme.colorScheme.primary,
                                        selectedLabelColor = Color.White
                                    )
                                )
                            }
                        }

                        // Calendar Grid
                        MonthlySalesCalendar(
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
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "Sales on ${currentYearMonth.month.getDisplayName(TextStyle.SHORT, Locale.ENGLISH)} $selectedCalendarDay (${daySales.size} units)",
                            color = MaterialTheme.colorScheme.onBackground,
                            fontWeight = FontWeight.Bold,
                            fontSize = 13.5.sp
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
                            modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp)
                        ) {
                            Text(
                                text = "No sales recorded on this day.",
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                fontSize = 12.sp,
                                modifier = Modifier.padding(12.dp),
                                textAlign = TextAlign.Center
                            )
                        }
                    }
                } else {
                    items(daySales, key = { it.id }) { sale ->
                        CommercialSaleCard(sale)
                    }
                }
            }

            // Employee Performance Breakdown Section
            item {
                Text(
                    text = "Staff Sales Breakdown",
                    color = MaterialTheme.colorScheme.onBackground,
                    fontWeight = FontWeight.Bold,
                    fontSize = 14.sp,
                    modifier = Modifier.padding(top = 4.dp)
                )
            }

            if (employeeBreakdown.isEmpty()) {
                item {
                    Surface(
                        shape = RoundedCornerShape(10.dp),
                        color = MaterialTheme.colorScheme.surfaceContainerLow,
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text(
                            text = "No employee sales recorded in ${currentYearMonth.month.getDisplayName(TextStyle.FULL, Locale.ENGLISH)} ${currentYearMonth.year}",
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            fontSize = 12.sp,
                            modifier = Modifier.padding(14.dp),
                            textAlign = TextAlign.Center
                        )
                    }
                }
            } else {
                items(employeeBreakdown) { (emp, count, fin) ->
                    val (revenue, profit) = fin
                    val avatarPalettes = listOf(
                        Color(0xFF3B82F6) to Color(0x263B82F6), // Blue
                        Color(0xFF10B981) to Color(0x2610B981), // Emerald
                        Color(0xFF8B5CF6) to Color(0x268B5CF6), // Purple
                        Color(0xFFF59E0B) to Color(0x26F59E0B), // Amber
                        Color(0xFFEC4899) to Color(0x26EC4899), // Pink
                        Color(0xFF06B6D4) to Color(0x2606B6D4), // Cyan
                        Color(0xFF6366F1) to Color(0x266366F1), // Indigo
                        Color(0xFFF97316) to Color(0x26F97316)  // Orange
                    )
                    val colorIdx = kotlin.math.abs(emp.lowercase().hashCode()) % avatarPalettes.size
                    val (avatarColor, avatarBg) = avatarPalettes[colorIdx]

                    Card(
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                        shape = RoundedCornerShape(10.dp),
                        elevation = CardDefaults.cardElevation(defaultElevation = 0.5.dp),
                        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.4f)),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 12.dp, vertical = 8.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Box(
                                    modifier = Modifier
                                        .size(30.dp)
                                        .background(avatarBg, CircleShape),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.Person,
                                        contentDescription = null,
                                        tint = avatarColor,
                                        modifier = Modifier.size(16.dp)
                                    )
                                }
                                Spacer(modifier = Modifier.width(10.dp))
                                Column {
                                    Text(
                                        text = emp,
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 13.sp,
                                        color = MaterialTheme.colorScheme.onSurface
                                    )
                                    Text(
                                        text = "Revenue: ৳ ${formatIndianNumber(revenue)}",
                                        fontSize = 11.sp,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                }
                            }

                            Column(horizontalAlignment = Alignment.End) {
                                Surface(
                                    shape = RoundedCornerShape(percent = 50),
                                    color = MaterialTheme.colorScheme.primary.copy(alpha = 0.12f),
                                    border = BorderStroke(0.8.dp, MaterialTheme.colorScheme.primary.copy(alpha = 0.3f))
                                ) {
                                    Text(
                                        text = "$count Units",
                                        color = MaterialTheme.colorScheme.primary,
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 11.sp,
                                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp)
                                    )
                                }
                                Spacer(modifier = Modifier.height(2.dp))
                                Text(
                                    text = "+৳ ${formatIndianNumber(profit)}",
                                    color = AccentEmerald,
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 11.sp
                                )
                            }
                        }
                    }
                }
            }
        }

        // MODE 1: All Invoices Ledger View
        if (viewMode == 1) {
            // Search Bar
            item {
                ExpressiveSearchBar(
                    query = searchQuery,
                    onQueryChange = { searchQuery = it },
                    placeholder = "Search invoices by model, IMEI, seller, invoice #..."
                )
            }

            if (isLoading && sales.isEmpty()) {
                item {
                    Box(modifier = Modifier.fillMaxWidth().height(120.dp), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator(color = MaterialTheme.colorScheme.primary)
                    }
                }
            } else if (filteredInvoices.isEmpty()) {
                item {
                    Box(modifier = Modifier.fillMaxWidth().height(120.dp), contentAlignment = Alignment.Center) {
                        Text("No matching sales invoices found", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 13.sp)
                    }
                }
            } else {
                items(filteredInvoices, key = { it.id }) { sale ->
                    CommercialSaleCard(sale)
                }
            }
        }
    }
}

/**
 * Compact Stat Card for Sales Metrics
 */
@Composable
private fun SalesMiniStatCard(
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
            modifier = Modifier.padding(horizontal = 10.dp, vertical = 8.dp),
            verticalArrangement = Arrangement.spacedBy(2.dp)
        ) {
            Text(
                text = title.uppercase(),
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                fontSize = 9.sp,
                fontWeight = FontWeight.Bold,
                letterSpacing = 0.4.sp,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
            Text(
                text = value,
                color = color,
                fontSize = 12.5.sp,
                fontWeight = FontWeight.ExtraBold,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
        }
    }
}

/**
 * Interactive Monthly Sales Calendar Grid
 */
@Composable
private fun MonthlySalesCalendar(
    yearMonth: YearMonth,
    salesByDay: Map<Int, List<SaleDto>>,
    selectedDay: Int?,
    onDayClick: (Int) -> Unit
) {
    val daysInMonth = yearMonth.lengthOfMonth()
    // Sunday start: 0 = Sun, 1 = Mon, ... 6 = Sat
    val firstDayOfWeek = yearMonth.atDay(1).dayOfWeek.value % 7
    val weekDays = listOf("Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat")

    Column(
        modifier = Modifier.fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(3.dp)
    ) {
        // Weekday header row
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
                            // Circular Day Number Container with Green Tint for Sales
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

                            // Fixed-height container for "x sold" badge so baseline across all days is consistent
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

/**
 * Material 3 Expressive Commercial Sale Card
 */
@Composable
fun CommercialSaleCard(sale: SaleDto) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        shape = RoundedCornerShape(12.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.45f))
    ) {
        Column(
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
            verticalArrangement = Arrangement.spacedBy(4.5.dp)
        ) {
            // Row 1: Model Title + Sold Price
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.weight(1f, fill = false).padding(end = 6.dp)
                ) {
                    Text(
                        text = sale.deviceModel ?: "Device Unit",
                        color = MaterialTheme.colorScheme.onSurface,
                        fontWeight = FontWeight.Bold,
                        fontSize = 13.5.sp,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                    sale.deviceVariant?.let { variant ->
                        if (variant.isNotBlank()) {
                            Spacer(modifier = Modifier.width(6.dp))
                            VariantBadge(variant)
                        }
                    }
                }

                Text(
                    text = "৳ ${formatIndianNumber(sale.displayPrice)}",
                    color = AccentEmerald,
                    fontWeight = FontWeight.ExtraBold,
                    fontSize = 14.sp
                )
            }

            // Row 2: Specs & Monospace Copyable IMEI
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                sale.deviceImei?.let {
                    CopyableText(label = "IMEI", value = it)
                }

                val specs = listOfNotNull(sale.deviceCapacity, sale.deviceColor).filter { it.isNotBlank() }
                if (specs.isNotEmpty()) {
                    Text(
                        text = specs.joinToString(" • "),
                        fontSize = 11.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }

            // Row 3: Sold By on left, Invoice # + Date + Profit on right
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Surface(
                    shape = RoundedCornerShape(percent = 50),
                    color = AccentSky.copy(alpha = 0.12f),
                    border = BorderStroke(0.6.dp, AccentSky.copy(alpha = 0.3f))
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 7.dp, vertical = 2.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            imageVector = Icons.Default.Person,
                            contentDescription = null,
                            modifier = Modifier.size(11.dp),
                            tint = AccentSky
                        )
                        Spacer(modifier = Modifier.width(3.dp))
                        Text(
                            text = sale.displaySoldBy,
                            color = AccentSky,
                            fontSize = 10.5.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }

                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    val dateText = formatDateToDDMMYYYY(sale.createdAt)
                    if (dateText.isNotBlank()) {
                        Text(
                            text = dateText,
                            fontSize = 10.5.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }

                    sale.profit?.let { profit ->
                        Surface(
                            color = AccentEmerald.copy(alpha = 0.12f),
                            shape = RoundedCornerShape(percent = 50),
                            border = BorderStroke(0.8.dp, AccentEmerald.copy(alpha = 0.3f))
                        ) {
                            Text(
                                text = "+৳ ${formatIndianNumber(profit)}",
                                color = AccentEmerald,
                                fontSize = 10.5.sp,
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier.padding(horizontal = 7.dp, vertical = 2.dp)
                            )
                        }
                    }
                }
            }
        }
    }
}
