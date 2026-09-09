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

    LaunchedEffect(Unit) {
        viewModel.fetchSales(token)
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column {
                Text("Commercial Sales", color = Color.White, fontSize = 22.sp, fontWeight = FontWeight.Bold)
                Text("Completed customer transactions", color = Color(0xFF94A3B8), fontSize = 13.sp)
            }
            IconButton(onClick = { viewModel.fetchSales(token) }) {
                Text("🔄", fontSize = 18.sp)
            }
        }

        Spacer(modifier = Modifier.height(14.dp))

        // Revenue summary card
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B)),
            shape = RoundedCornerShape(12.dp)
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                horizontalArrangement = Arrangement.SpaceAround,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text("Total Revenue", color = Color(0xFF94A3B8), fontSize = 12.sp)
                    Text("BDT ${stats.totalSalesAmount.toInt()}", color = Color(0xFF34D399), fontSize = 18.sp, fontWeight = FontWeight.Bold)
                }
                VerticalDivider(modifier = Modifier.height(36.dp), color = Color(0xFF334155))
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text("Total Profit", color = Color(0xFF94A3B8), fontSize = 12.sp)
                    Text("BDT ${stats.totalProfit.toInt()}", color = Color(0xFF38BDF8), fontSize = 18.sp, fontWeight = FontWeight.Bold)
                }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        if (sales.isEmpty()) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Text("No sales invoices recorded yet", color = Color(0xFF94A3B8))
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
        colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B)),
        shape = RoundedCornerShape(12.dp)
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = sale.invoiceNumber,
                    color = Color(0xFF818CF8),
                    fontWeight = FontWeight.Bold,
                    fontSize = 14.sp
                )
                Text(
                    text = "BDT ${sale.finalPrice.toInt()}",
                    color = Color(0xFF4ADE80),
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
                Text("Customer: ${sale.customerName ?: "Direct Sale"}", color = Color(0xFFCBD5E1), fontSize = 12.sp)
                sale.profit?.let {
                    Text("+BDT ${it.toInt()} profit", color = Color(0xFF38BDF8), fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                }
            }
        }
    }
}
