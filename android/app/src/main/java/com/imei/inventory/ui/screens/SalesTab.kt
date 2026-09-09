package com.imei.inventory.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
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
import com.imei.inventory.viewmodel.MainInventoryViewModel

@Composable
fun SalesTab(
    token: String,
    viewModel: MainInventoryViewModel
) {
    val sales by viewModel.sales.collectAsState()
    val stats by viewModel.stats.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()

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

        // Revenue summary card
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
                    Text("Total Revenue", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 12.sp)
                    Text("BDT ${stats.totalSalesAmount.toInt()}", color = Color(0xFF16A34A), fontSize = 18.sp, fontWeight = FontWeight.Bold)
                }
                VerticalDivider(modifier = Modifier.height(36.dp), color = MaterialTheme.colorScheme.outline)
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text("Total Profit", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 12.sp)
                    Text("BDT ${stats.totalProfit.toInt()}", color = MaterialTheme.colorScheme.primary, fontSize = 18.sp, fontWeight = FontWeight.Bold)
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
        Column(modifier = Modifier.padding(14.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = sale.invoiceNumber,
                    color = MaterialTheme.colorScheme.primary,
                    fontWeight = FontWeight.Bold,
                    fontSize = 14.sp
                )
                Text(
                    text = "BDT ${sale.finalPrice.toInt()}",
                    color = Color(0xFF16A34A),
                    fontWeight = FontWeight.Bold,
                    fontSize = 15.sp
                )
            }

            Spacer(modifier = Modifier.height(6.dp))

            sale.deviceImei?.let {
                CopyableText(label = "Device IMEI", value = it)
            }

            Spacer(modifier = Modifier.height(6.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text("Customer: ${sale.customerName ?: "Direct Sale"}", color = MaterialTheme.colorScheme.onSurface, fontSize = 12.sp)
                sale.profit?.let {
                    Text("+BDT ${it.toInt()} profit", color = MaterialTheme.colorScheme.primary, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                }
            }
        }
    }
}
