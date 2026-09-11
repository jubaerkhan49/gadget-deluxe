package com.imei.inventory.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Person
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.imei.inventory.data.model.SaleDto
import com.imei.inventory.ui.components.CopyableText
import com.imei.inventory.ui.components.VariantBadge
import com.imei.inventory.ui.components.formatIndianNumber
import com.imei.inventory.viewmodel.MainInventoryViewModel

@Composable
fun SalesTab(
    token: String,
    viewModel: MainInventoryViewModel
) {
    val sales by viewModel.sales.collectAsState()
    val stats by viewModel.stats.collectAsState()
    val cumulativeSales = remember(sales, stats.totalSalesAmount) {
        val listSum = sales.sumOf { it.displayPrice }
        if (listSum > 0) listSum else stats.totalSalesAmount
    }
    val cumulativeProfit = remember(sales, stats.totalProfit) {
        val listProfit = sales.sumOf { it.profit ?: 0.0 }
        if (listProfit > 0) listProfit else stats.totalProfit
    }

    LaunchedEffect(Unit) {
        viewModel.fetchSales(token)
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
    ) {
        Column {
            Text("Commercial Sales", color = MaterialTheme.colorScheme.onBackground, fontSize = 22.sp, fontWeight = FontWeight.Bold)
            Text("Customer orders & margin performance", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 13.sp)
        }

        Spacer(modifier = Modifier.height(14.dp))

        // Sales summary card
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
            shape = RoundedCornerShape(14.dp),
            elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                horizontalArrangement = Arrangement.SpaceAround,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text("Total Sales", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 12.sp)
                    Text("BDT ${formatIndianNumber(cumulativeSales)}", color = Color(0xFF16A34A), fontSize = 18.sp, fontWeight = FontWeight.Bold)
                }
                VerticalDivider(modifier = Modifier.height(36.dp), color = MaterialTheme.colorScheme.outline)
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text("Total Profit", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 12.sp)
                    Text("BDT ${formatIndianNumber(cumulativeProfit)}", color = MaterialTheme.colorScheme.primary, fontSize = 18.sp, fontWeight = FontWeight.Bold)
                }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        if (isLoading && sales.isEmpty()) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = MaterialTheme.colorScheme.primary)
            }
        } else if (sales.isEmpty()) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Text("No sales invoices recorded yet", color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        } else {
            LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                items(sales) { sale ->
                    SaleCard(sale)
                }
            }
        }
    }
}

@Composable
fun SaleCard(sale: SaleDto) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        shape = RoundedCornerShape(14.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(
            modifier = Modifier.padding(14.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            // Row 1: Model Title + Sold Price
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = sale.deviceModel ?: "Device Unit",
                    color = MaterialTheme.colorScheme.onSurface,
                    fontWeight = FontWeight.Bold,
                    fontSize = 15.sp,
                    modifier = Modifier.weight(1f, fill = false)
                )

                Text(
                    text = "BDT ${formatIndianNumber(sale.displayPrice)}",
                    color = Color(0xFF16A34A),
                    fontWeight = FontWeight.Bold,
                    fontSize = 15.sp
                )
            }

            // Row 2: Specs Badges (Variant, Capacity, Color)
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(6.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                sale.deviceVariant?.let { variant ->
                    if (variant.isNotBlank()) {
                        VariantBadge(variant)
                    }
                }

                if (!sale.deviceCapacity.isNullOrBlank()) {
                    Surface(
                        color = MaterialTheme.colorScheme.primary.copy(alpha = 0.12f),
                        shape = RoundedCornerShape(6.dp)
                    ) {
                        Text(
                            text = sale.deviceCapacity,
                            color = MaterialTheme.colorScheme.primary,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier.padding(horizontal = 7.dp, vertical = 3.dp)
                        )
                    }
                }

                if (!sale.deviceColor.isNullOrBlank()) {
                    Surface(
                        color = MaterialTheme.colorScheme.surfaceVariant,
                        shape = RoundedCornerShape(6.dp)
                    ) {
                        Text(
                            text = sale.deviceColor,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Medium,
                            modifier = Modifier.padding(horizontal = 7.dp, vertical = 3.dp)
                        )
                    }
                }
            }

            // Row 3: IMEI with copy icon
            sale.deviceImei?.let {
                CopyableText(label = "IMEI", value = it)
            }

            HorizontalDivider(
                color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.35f),
                thickness = 0.5.dp
            )

            // Row 4: Sold By on left, Profit on right
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.Person,
                        contentDescription = null,
                        modifier = Modifier.size(13.dp),
                        tint = Color(0xFF0284C7)
                    )
                    Text(
                        text = "Sold By: ${sale.displaySoldBy}",
                        color = Color(0xFF0284C7),
                        fontSize = 11.sp,
                        fontWeight = FontWeight.SemiBold
                    )
                }

                sale.profit?.let {
                    Surface(
                        color = MaterialTheme.colorScheme.primary.copy(alpha = 0.12f),
                        shape = RoundedCornerShape(6.dp)
                    ) {
                        Text(
                            text = "+BDT ${formatIndianNumber(it)} profit",
                            color = MaterialTheme.colorScheme.primary,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier.padding(horizontal = 7.dp, vertical = 2.dp)
                        )
                    }
                }
            }
        }
    }
}
