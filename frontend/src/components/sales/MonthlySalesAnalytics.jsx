import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Grid,
  Card,
  Typography,
  Paper,
  Chip,
  IconButton,
  MenuItem,
  Select,
  FormControl,
  Stack,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  ToggleButtonGroup,
  ToggleButton,
  TextField,
  InputAdornment,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Avatar,
  Divider,
  useTheme
} from '@mui/material';
import {
  CalendarMonth as CalendarIcon,
  PointOfSale as SaleIcon,
  BarChart as BarChartIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  CheckCircle as CheckCircleIcon,
  Close as CloseIcon,
  Whatshot as FireIcon,
  Smartphone as PhoneIcon,
  TrendingUp as ProfitIcon,
  AttachMoney as RevenueIcon,
  Person as PersonIcon,
  People as PeopleIcon,
  Search as SearchIcon,
  ContentCopy as CopyIcon,
  Receipt as InvoiceIcon,
  FilterList as FilterIcon,
  WorkspacePremium as TrophyIcon,
  Speed as SpeedIcon,
  ArrowForward as ArrowForwardIcon
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { saleApi } from '../../api/client';
import { apiCache } from '../../utils/apiCache';
import VariantBadge from '../common/VariantBadge';
import CopyableText from '../common/CopyableText';
import { formatNumber, formatDate } from '../../utils/formatters';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function MonthlySalesAnalytics({ sales: initialSales = [], onRecordSale }) {
  const theme = useTheme();
  const { enqueueSnackbar } = useSnackbar();

  const cachedSales = apiCache.get('/api/sales/');
  const [sales, setSales] = useState(() => initialSales?.length ? initialSales : (cachedSales?.results || cachedSales || []));
  const [loading, setLoading] = useState(() => !cachedSales && !initialSales?.length);

  const today = new Date();
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth()); // 0-indexed
  const [selectedEmployee, setSelectedEmployee] = useState('ALL'); // 'ALL' | employee identifier
  const [chartMetric, setChartMetric] = useState('UNITS'); // 'UNITS' | 'REVENUE' | 'PROFIT'
  const [searchQuery, setSearchQuery] = useState('');

  const [hoveredDay, setHoveredDay] = useState(null);
  const [selectedDayModal, setSelectedDayModal] = useState(null);

  // Sync / fetch sales data
  useEffect(() => {
    let isMounted = true;
    const loadSales = async () => {
      try {
        if (!cachedSales && !initialSales?.length) setLoading(true);
        const res = await saleApi.getAll();
        const fresh = res.data?.results || res.data || [];
        apiCache.set('/api/sales/', fresh);
        if (isMounted) {
          setSales(fresh);
        }
      } catch (err) {
        console.error('Failed to load sales for analytics:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadSales();
    return () => { isMounted = false; };
  }, []);

  // Helper to get normalized employee name from a sale
  const getSaleEmployeeName = (sale) => {
    if (sale.sold_by && String(sale.sold_by).trim() && sale.sold_by !== 'Unassigned') {
      return String(sale.sold_by).trim();
    }
    if (sale.seller_name && String(sale.seller_name).trim()) {
      return String(sale.seller_name).trim();
    }
    if (typeof sale.seller === 'object' && sale.seller?.username) {
      return String(sale.seller.username).trim();
    }
    if (typeof sale.seller === 'string' && sale.seller.trim()) {
      return sale.seller.trim();
    }
    return 'Store / Direct';
  };

  // Extract all distinct employees who have made sales
  const allEmployeesList = useMemo(() => {
    const employeeSet = new Set();
    sales.forEach((s) => {
      const emp = getSaleEmployeeName(s);
      if (emp) employeeSet.add(emp);
    });
    return Array.from(employeeSet).sort();
  }, [sales]);

  // Helper to extract exact sale date string (YYYY-MM-DD)
  const getSaleDateStr = (sale) => {
    const raw = sale.sale_date || sale.created_at;
    if (!raw) return null;
    const str = String(raw).trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
      return str.slice(0, 10);
    }
    try {
      const d = new Date(str);
      if (isNaN(d.getTime())) return null;
      return d.toISOString().slice(0, 10);
    } catch {
      return null;
    }
  };

  // Filter sales for selected month & year (across all or specific employee)
  const monthAllSales = useMemo(() => {
    if (!Array.isArray(sales)) return [];
    return sales.filter((sale) => {
      const dateStr = getSaleDateStr(sale);
      if (!dateStr) return false;
      const parts = dateStr.split('-').map(Number);
      const d = new Date(parts[0], parts[1] - 1, parts[2]);
      if (isNaN(d.getTime())) return false;
      return d.getFullYear() === selectedYear && d.getMonth() === selectedMonth;
    });
  }, [sales, selectedYear, selectedMonth]);

  // Active month sales filtered by selected employee (or all)
  const activeMonthSales = useMemo(() => {
    if (selectedEmployee === 'ALL') return monthAllSales;
    return monthAllSales.filter((s) => getSaleEmployeeName(s) === selectedEmployee);
  }, [monthAllSales, selectedEmployee]);

  // Days in selected month
  const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
  const firstDayWeekday = new Date(selectedYear, selectedMonth, 1).getDay();

  // Group active sales by day (1 to daysInMonth)
  const daySalesMap = useMemo(() => {
    const map = {};
    for (let day = 1; day <= daysInMonth; day++) {
      map[day] = [];
    }

    activeMonthSales.forEach((sale) => {
      const dateStr = getSaleDateStr(sale);
      if (!dateStr) return;
      const parts = dateStr.split('-').map(Number);
      const d = new Date(parts[0], parts[1] - 1, parts[2]);
      if (!isNaN(d.getTime())) {
        const dayNum = d.getDate();
        if (map[dayNum]) {
          map[dayNum].push(sale);
        }
      }
    });

    return map;
  }, [activeMonthSales, daysInMonth]);

  // Summary Metrics
  const totalUnitsSold = activeMonthSales.length;
  const totalRevenue = activeMonthSales.reduce((acc, s) => acc + (parseFloat(s.selling_price) || 0), 0);
  const totalProfit = activeMonthSales.reduce((acc, s) => acc + (parseFloat(s.profit) || 0), 0);
  const avgMargin = totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : 0;

  // 10-Day Volume Breakdowns (Units)
  const earlyMonthUnits = useMemo(() => {
    let count = 0;
    for (let day = 1; day <= Math.min(10, daysInMonth); day++) {
      count += (daySalesMap[day] || []).length;
    }
    return count;
  }, [daySalesMap, daysInMonth]);

  const midMonthUnits = useMemo(() => {
    let count = 0;
    for (let day = 11; day <= Math.min(20, daysInMonth); day++) {
      count += (daySalesMap[day] || []).length;
    }
    return count;
  }, [daySalesMap, daysInMonth]);

  const lateMonthUnits = useMemo(() => {
    let count = 0;
    for (let day = 21; day <= daysInMonth; day++) {
      count += (daySalesMap[day] || []).length;
    }
    return count;
  }, [daySalesMap, daysInMonth]);

  // Active selling days in this month
  const activeSellingDaysCount = useMemo(() => {
    let active = 0;
    for (let day = 1; day <= daysInMonth; day++) {
      if (daySalesMap[day]?.length > 0) active++;
    }
    return active;
  }, [daySalesMap, daysInMonth]);

  // Peak Day Calculations for Bar Chart
  const peakDayInfo = useMemo(() => {
    let maxMetricVal = 0;
    let peakDays = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const items = daySalesMap[day] || [];
      let val = 0;
      if (chartMetric === 'UNITS') {
        val = items.length;
      } else if (chartMetric === 'REVENUE') {
        val = items.reduce((acc, s) => acc + (parseFloat(s.selling_price) || 0), 0);
      } else if (chartMetric === 'PROFIT') {
        val = items.reduce((acc, s) => acc + (parseFloat(s.profit) || 0), 0);
      }

      if (val > maxMetricVal) {
        maxMetricVal = val;
        peakDays = [day];
      } else if (val === maxMetricVal && val > 0) {
        peakDays.push(day);
      }
    }

    return { maxMetricVal, peakDays };
  }, [daySalesMap, daysInMonth, chartMetric]);

  // Employee Performance Matrix for this month ("under which employee is doing what")
  const employeePerformanceList = useMemo(() => {
    const map = {};

    monthAllSales.forEach((sale) => {
      const empName = getSaleEmployeeName(sale);
      if (!map[empName]) {
        map[empName] = {
          name: empName,
          unitsSold: 0,
          revenue: 0,
          profit: 0,
          modelsMap: {},
          activeDaysSet: new Set(),
          recentSales: []
        };
      }

      const item = map[empName];
      item.unitsSold += 1;
      item.revenue += parseFloat(sale.selling_price) || 0;
      item.profit += parseFloat(sale.profit) || 0;

      const model = sale.device_model || 'Device';
      item.modelsMap[model] = (item.modelsMap[model] || 0) + 1;

      const dateStr = getSaleDateStr(sale);
      if (dateStr) item.activeDaysSet.add(dateStr);

      if (item.recentSales.length < 3) {
        item.recentSales.push(sale);
      }
    });

    const list = Object.values(map).map((emp) => {
      const margin = emp.revenue > 0 ? ((emp.profit / emp.revenue) * 100).toFixed(1) : 0;
      const topModels = Object.entries(emp.modelsMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([m, qty]) => ({ model: m, qty }));

      return {
        ...emp,
        activeDays: emp.activeDaysSet.size,
        margin,
        topModels
      };
    });

    // Sort by units sold descending
    return list.sort((a, b) => b.unitsSold - a.unitsSold);
  }, [monthAllSales]);

  // Group selected day sales by Employee -> Devices sold
  const dayEmployeeGroups = useMemo(() => {
    if (!selectedDayModal?.sales) return [];
    const groups = {};

    selectedDayModal.sales.forEach((s) => {
      const emp = getSaleEmployeeName(s);
      if (!groups[emp]) {
        groups[emp] = {
          employee: emp,
          totalUnits: 0,
          totalRevenue: 0,
          totalProfit: 0,
          items: []
        };
      }
      groups[emp].totalUnits += 1;
      groups[emp].totalRevenue += parseFloat(s.selling_price) || 0;
      groups[emp].totalProfit += parseFloat(s.profit) || 0;
      groups[emp].items.push(s);
    });

    return Object.values(groups).sort((a, b) => b.totalUnits - a.totalUnits);
  }, [selectedDayModal]);

  // Copy day sales report to clipboard (ready for management WhatsApp/Telegram)
  const handleCopyDayReport = () => {
    if (!selectedDayModal?.sales?.length) return;
    const dateFormatted = `${selectedDayModal.day} ${MONTH_NAMES[selectedMonth]} ${selectedYear}`;
    const dayTotalRev = selectedDayModal.sales.reduce((a, s) => a + (parseFloat(s.selling_price) || 0), 0);
    const dayTotalProf = selectedDayModal.sales.reduce((a, s) => a + (parseFloat(s.profit) || 0), 0);

    let text = `📊 Daily Sales Performance Report (${dateFormatted})\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `🎯 Total Sold: ${selectedDayModal.sales.length} units\n`;
    text += `💰 Total Revenue: ${formatNumber(dayTotalRev)} BDT\n`;
    text += `📈 Realized Profit: ${formatNumber(dayTotalProf)} BDT\n\n`;
    text += `👥 EMPLOYEE BREAKDOWN:\n`;

    dayEmployeeGroups.forEach((g, idx) => {
      text += `\n${idx + 1}. 👤 ${g.employee.toUpperCase()}: ${g.totalUnits} unit(s) | Rev: ৳${formatNumber(g.totalRevenue)} | Profit: ৳${formatNumber(g.totalProfit)}\n`;
      g.items.forEach((item) => {
        text += `   • ${item.device_model || 'Device'} [${item.device_variant || 'Std'}] (${item.device_capacity || ''} ${item.device_color || ''}) - ৳${formatNumber(item.selling_price)} (IMEI: ${item.device_imei || '—'})\n`;
      });
    });

    navigator.clipboard.writeText(text.trim()).then(() => {
      enqueueSnackbar('Daily sales performance report copied to clipboard!', { variant: 'success' });
    }).catch(() => {
      enqueueSnackbar('Failed to copy report to clipboard', { variant: 'error' });
    });
  };

  // Filtered sales for the monthly ledger table
  const filteredLedger = useMemo(() => {
    let list = activeMonthSales;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((s) => {
        const emp = getSaleEmployeeName(s).toLowerCase();
        return (
          s.device_model?.toLowerCase().includes(q) ||
          s.device_imei?.toLowerCase().includes(q) ||
          s.device_color?.toLowerCase().includes(q) ||
          s.device_variant?.toLowerCase().includes(q) ||
          s.invoice_number?.toLowerCase().includes(q) ||
          s.customer_name?.toLowerCase().includes(q) ||
          emp.includes(q)
        );
      });
    }
    return list;
  }, [activeMonthSales, searchQuery]);

  // Navigation handlers
  const handlePrevMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear((y) => y - 1);
    } else {
      setSelectedMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear((y) => y + 1);
    } else {
      setSelectedMonth((m) => m + 1);
    }
  };

  return (
    <Box sx={{ pb: 4 }}>
      {/* 1. Top Header Toolbar: Employee Filter, Month Selector & Metric Switcher */}
      <Paper
        elevation={0}
        sx={{
          p: { xs: 1.5, sm: 2.25 },
          mb: 2.5,
          borderRadius: { xs: 2, sm: 2.5 },
          border: 1,
          borderColor: 'divider',
          bgcolor: 'background.paper',
          display: 'flex',
          alignItems: { xs: 'stretch', sm: 'center' },
          justifyContent: 'space-between',
          flexDirection: { xs: 'column', md: 'row' },
          gap: 1.5
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: { xs: 40, sm: 46 },
              height: { xs: 40, sm: 46 },
              borderRadius: 2.2,
              bgcolor: '#10B981',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)',
              flexShrink: 0
            }}
          >
            <SaleIcon sx={{ fontSize: { xs: 22, sm: 26 } }} />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h6" fontWeight={800} sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }} noWrap>
              Monthly Sales & Staff Performance
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.74rem', sm: '0.82rem' } }}>
              {selectedEmployee === 'ALL'
                ? `All staff sales, revenue & volume across ${MONTH_NAMES[selectedMonth]} ${selectedYear}`
                : `Sales performance for ${selectedEmployee} in ${MONTH_NAMES[selectedMonth]} ${selectedYear}`}
            </Typography>
          </Box>
        </Box>

        {/* Right Controls: Staff Filter + Month/Year Navigator */}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems="center" sx={{ width: { xs: '100%', md: 'auto' } }}>
          {/* Employee Filter Dropdown */}
          <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 170 } }}>
            <Select
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
              displayEmpty
              startAdornment={
                <InputAdornment position="start">
                  <PersonIcon sx={{ fontSize: 18, color: selectedEmployee === 'ALL' ? 'text.secondary' : '#10B981' }} />
                </InputAdornment>
              }
              sx={{
                fontWeight: 700,
                fontSize: '0.82rem',
                borderRadius: 2,
                bgcolor: 'action.hover',
                '& .MuiSelect-select': { py: 0.65, px: 1 }
              }}
            >
              <MenuItem value="ALL" sx={{ fontWeight: 700 }}>
                👥 All Staff ({employeePerformanceList.length})
              </MenuItem>
              <Divider sx={{ my: 0.5 }} />
              {allEmployeesList.map((emp) => (
                <MenuItem key={emp} value={emp}>
                  👤 {emp}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Month / Year Navigator */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              bgcolor: 'action.hover',
              p: 0.4,
              borderRadius: 2,
              width: { xs: '100%', sm: 'auto' }
            }}
          >
            <IconButton size="small" onClick={handlePrevMonth}>
              <ChevronLeftIcon fontSize="small" />
            </IconButton>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, px: 0.5 }}>
              <FormControl size="small" sx={{ minWidth: 105 }}>
                <Select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  sx={{
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    borderRadius: 1.5,
                    bgcolor: 'background.paper',
                    '& .MuiSelect-select': { py: 0.5, px: 1 }
                  }}
                >
                  {MONTH_NAMES.map((m, idx) => (
                    <MenuItem key={m} value={idx}>
                      {m}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl size="small" sx={{ minWidth: 85 }}>
                <Select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  sx={{
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    borderRadius: 1.5,
                    bgcolor: 'background.paper',
                    '& .MuiSelect-select': { py: 0.5, px: 1 }
                  }}
                >
                  {[2024, 2025, 2026, 2027].map((y) => (
                    <MenuItem key={y} value={y}>
                      {y}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            <IconButton size="small" onClick={handleNextMonth}>
              <ChevronRightIcon fontSize="small" />
            </IconButton>
          </Box>
        </Stack>
      </Paper>

      {/* 2. Top Summary KPI Cards */}
      <Grid container spacing={{ xs: 1.5, sm: 2 }} sx={{ mb: 2.5 }}>
        {/* Total Units Sold */}
        <Grid item xs={6} md={3}>
          <Card
            variant="outlined"
            sx={{
              p: { xs: 1.5, sm: 2 },
              borderRadius: 2.25,
              height: '100%',
              bgcolor: 'background.paper',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="caption" fontWeight={800} color="text.secondary" textTransform="uppercase" sx={{ fontSize: '0.65rem' }}>
                Units Sold
              </Typography>
              <Box sx={{ p: 0.6, borderRadius: 1.2, bgcolor: 'rgba(16, 185, 129, 0.12)', color: '#059669' }}>
                <PhoneIcon sx={{ fontSize: 16 }} />
              </Box>
            </Box>
            <Typography variant="h4" fontWeight={800} sx={{ color: '#059669', my: 0.25, fontSize: { xs: '1.45rem', sm: '1.85rem' } }}>
              {totalUnitsSold} <Typography component="span" variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>Units</Typography>
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.68rem' }} noWrap>
              In {MONTH_NAMES[selectedMonth].slice(0, 3)} {selectedYear} • {activeSellingDaysCount} selling days
            </Typography>
          </Card>
        </Grid>

        {/* Total Revenue */}
        <Grid item xs={6} md={3}>
          <Card
            variant="outlined"
            sx={{
              p: { xs: 1.5, sm: 2 },
              borderRadius: 2.25,
              height: '100%',
              bgcolor: 'background.paper',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="caption" fontWeight={800} color="text.secondary" textTransform="uppercase" sx={{ fontSize: '0.65rem' }}>
                Total Revenue
              </Typography>
              <Box sx={{ p: 0.6, borderRadius: 1.2, bgcolor: 'rgba(59, 130, 246, 0.1)', color: '#2563EB' }}>
                <RevenueIcon sx={{ fontSize: 16 }} />
              </Box>
            </Box>
            <Typography variant="h5" fontWeight={800} sx={{ color: '#2563EB', my: 0.25, fontSize: { xs: '1.25rem', sm: '1.65rem' } }}>
              ৳{formatNumber(totalRevenue)}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.68rem' }} noWrap>
              Gross invoiced turnover
            </Typography>
          </Card>
        </Grid>

        {/* Realized Gross Profit */}
        <Grid item xs={6} md={3}>
          <Card
            variant="outlined"
            sx={{
              p: { xs: 1.5, sm: 2 },
              borderRadius: 2.25,
              height: '100%',
              bgcolor: 'background.paper',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="caption" fontWeight={800} color="text.secondary" textTransform="uppercase" sx={{ fontSize: '0.65rem' }}>
                Realized Profit
              </Typography>
              <Box sx={{ p: 0.6, borderRadius: 1.2, bgcolor: 'rgba(99, 102, 241, 0.12)', color: '#6366F1' }}>
                <ProfitIcon sx={{ fontSize: 16 }} />
              </Box>
            </Box>
            <Box sx={{ my: 0.25, display: 'flex', alignItems: 'baseline', gap: 0.75, flexWrap: 'wrap' }}>
              <Typography variant="h5" fontWeight={800} sx={{ color: '#6366F1', fontSize: { xs: '1.25rem', sm: '1.65rem' } }}>
                ৳{formatNumber(totalProfit)}
              </Typography>
              <Chip
                label={`${avgMargin}% Margin`}
                size="small"
                sx={{
                  fontWeight: 700,
                  fontSize: '0.62rem',
                  height: 18,
                  bgcolor: 'rgba(99, 102, 241, 0.12)',
                  color: '#6366F1',
                  borderRadius: 1
                }}
              />
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.68rem' }} noWrap>
              Net difference over purchase cost
            </Typography>
          </Card>
        </Grid>

        {/* 10-Day Volume Breakdown */}
        <Grid item xs={6} md={3}>
          <Card
            variant="outlined"
            sx={{
              p: { xs: 1.5, sm: 2 },
              borderRadius: 2.25,
              height: '100%',
              bgcolor: 'background.paper',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="caption" fontWeight={800} color="text.secondary" textTransform="uppercase" sx={{ fontSize: '0.65rem' }}>
                10-Day Cadence
              </Typography>
              <Box sx={{ p: 0.6, borderRadius: 1.2, bgcolor: 'rgba(245, 158, 11, 0.12)', color: '#F59E0B' }}>
                <SpeedIcon sx={{ fontSize: 16 }} />
              </Box>
            </Box>
            <Grid container spacing={0.5} sx={{ my: 0.25 }}>
              <Grid item xs={4}>
                <Box sx={{ p: 0.5, borderRadius: 1, bgcolor: 'action.hover', textAlign: 'center' }}>
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '0.58rem', fontWeight: 700 }}>1-10</Typography>
                  <Typography variant="body2" fontWeight={800} color="#2563EB" sx={{ fontSize: '0.85rem' }}>{earlyMonthUnits}</Typography>
                </Box>
              </Grid>
              <Grid item xs={4}>
                <Box sx={{ p: 0.5, borderRadius: 1, bgcolor: 'action.hover', textAlign: 'center' }}>
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '0.58rem', fontWeight: 700 }}>11-20</Typography>
                  <Typography variant="body2" fontWeight={800} color="#7C3AED" sx={{ fontSize: '0.85rem' }}>{midMonthUnits}</Typography>
                </Box>
              </Grid>
              <Grid item xs={4}>
                <Box sx={{ p: 0.5, borderRadius: 1, bgcolor: 'action.hover', textAlign: 'center' }}>
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '0.58rem', fontWeight: 700 }}>21-{daysInMonth}</Typography>
                  <Typography variant="body2" fontWeight={800} color="#059669" sx={{ fontSize: '0.85rem' }}>{lateMonthUnits}</Typography>
                </Box>
              </Grid>
            </Grid>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.68rem' }} noWrap>
              Early • Mid • Late month pace
            </Typography>
          </Card>
        </Grid>
      </Grid>

      {/* 3. SIDE-BY-SIDE: Compact Month Calendar on Left & Daily Sales Plot Bar Chart on Right */}
      <Grid container spacing={{ xs: 1.5, sm: 2 }} sx={{ mb: 3 }} alignItems="stretch">
        {/* LEFT COLUMN: Compact Month Calendar */}
        <Grid item xs={12} lg={5}>
          <Paper
            variant="outlined"
            sx={{
              p: { xs: 1.5, sm: 2 },
              borderRadius: { xs: 2, sm: 2.25 },
              height: '100%',
              bgcolor: 'background.paper',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CalendarIcon sx={{ color: '#10B981', fontSize: 19 }} />
                <Typography variant="subtitle2" fontWeight={800} sx={{ fontSize: { xs: '0.85rem', sm: '0.95rem' } }}>
                  {MONTH_NAMES[selectedMonth]} {selectedYear}
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#10B981' }} />
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.68rem' }}>Sold</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'text.disabled', opacity: 0.4 }} />
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.68rem' }}>No Sales</Typography>
                </Box>
              </Box>
            </Box>

            {/* Weekday Header */}
            <Grid container spacing={0.5} sx={{ mb: 0.5 }}>
              {WEEKDAY_NAMES.map((d) => (
                <Grid item xs={12 / 7} key={d} sx={{ textAlign: 'center' }}>
                  <Typography
                    variant="caption"
                    fontWeight={800}
                    color="text.secondary"
                    sx={{ fontSize: { xs: '0.64rem', sm: '0.7rem' }, textTransform: 'uppercase' }}
                  >
                    {d.charAt(0)}
                  </Typography>
                </Grid>
              ))}
            </Grid>

            {/* Calendar Compact Squares */}
            <Grid container spacing={0.5} sx={{ flex: 1, alignItems: 'center' }}>
              {Array.from({ length: firstDayWeekday }).map((_, idx) => (
                <Grid item xs={12 / 7} key={`empty-${idx}`}>
                  <Box
                    sx={{
                      height: { xs: 34, sm: 38 },
                      borderRadius: 1.5,
                      bgcolor: (t) => (t.palette.mode === 'dark' ? 'rgba(255,255,255,0.01)' : 'rgba(0,0,0,0.01)'),
                      opacity: 0.15
                    }}
                  />
                </Grid>
              ))}

              {Array.from({ length: daysInMonth }).map((_, idx) => {
                const dayNum = idx + 1;
                const daySales = daySalesMap[dayNum] || [];
                const hasSales = daySales.length > 0;
                const count = daySales.length;
                const isToday =
                  today.getFullYear() === selectedYear &&
                  today.getMonth() === selectedMonth &&
                  today.getDate() === dayNum;
                const isHovered = hoveredDay === dayNum;

                const dayRev = daySales.reduce((a, s) => a + (parseFloat(s.selling_price) || 0), 0);

                return (
                  <Grid item xs={12 / 7} key={`day-${dayNum}`}>
                    <Tooltip
                      title={
                        hasSales
                          ? `Day ${dayNum}: ${count} device(s) sold (৳${formatNumber(dayRev)}) — Click to inspect by staff`
                          : `Day ${dayNum}: No sales recorded`
                      }
                      arrow
                    >
                      <Paper
                        variant="outlined"
                        onMouseEnter={() => setHoveredDay(dayNum)}
                        onMouseLeave={() => setHoveredDay(null)}
                        onClick={() => hasSales && setSelectedDayModal({ day: dayNum, sales: daySales })}
                        sx={{
                          height: { xs: 34, sm: 38 },
                          p: 0.3,
                          borderRadius: 1.75,
                          cursor: hasSales ? 'pointer' : 'default',
                          border: '1px solid',
                          borderColor: isHovered
                            ? '#2563EB'
                            : hasSales
                            ? '#10B981'
                            : isToday
                            ? 'primary.main'
                            : 'divider',
                          bgcolor: isHovered
                            ? (t) => (t.palette.mode === 'dark' ? 'rgba(37, 99, 235, 0.35)' : '#DBEAFE')
                            : hasSales
                            ? (t) => (t.palette.mode === 'dark' ? 'rgba(16, 185, 129, 0.22)' : '#D1FAE5')
                            : isToday
                            ? (t) => (t.palette.mode === 'dark' ? 'rgba(37, 99, 235, 0.08)' : '#EFF6FF')
                            : 'background.paper',
                          transition: 'all 0.15s ease-in-out',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: isHovered
                            ? '0 3px 8px rgba(37, 99, 235, 0.25)'
                            : hasSales
                            ? '0 2px 5px rgba(16, 185, 129, 0.15)'
                            : 'none',
                          zIndex: isHovered ? 2 : 1
                        }}
                      >
                        <Typography
                          variant="caption"
                          fontWeight={isHovered || hasSales || isToday ? 800 : 500}
                          sx={{
                            fontSize: { xs: '0.72rem', sm: '0.78rem' },
                            lineHeight: 1,
                            color: isHovered
                              ? '#1D4ED8'
                              : hasSales
                              ? '#047857'
                              : isToday
                              ? 'primary.main'
                              : 'text.primary'
                          }}
                        >
                          {dayNum}
                        </Typography>
                      </Paper>
                    </Tooltip>
                  </Grid>
                );
              })}
            </Grid>
          </Paper>
        </Grid>

        {/* RIGHT COLUMN: Daily Sales Volume Plot Graph (Bar Chart) */}
        <Grid item xs={12} lg={7}>
          <Paper
            variant="outlined"
            sx={{
              p: { xs: 1.5, sm: 2 },
              borderRadius: { xs: 2, sm: 2.25 },
              height: '100%',
              bgcolor: 'background.paper',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}
          >
            {/* Top Graph Header with Metric Toggle & Peak Badge */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5, flexWrap: 'wrap', gap: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <BarChartIcon sx={{ color: '#10B981', fontSize: 20 }} />
                <Typography variant="subtitle2" fontWeight={800} sx={{ fontSize: { xs: '0.85rem', sm: '0.95rem' } }}>
                  Daily Sales Plot {chartMetric === 'UNITS' ? '(Units Sold)' : chartMetric === 'REVENUE' ? '(Revenue ৳)' : '(Profit ৳)'}
                </Typography>
              </Box>

              <Stack direction="row" spacing={1} alignItems="center">
                {/* Metric Selector Toggle */}
                <ToggleButtonGroup
                  value={chartMetric}
                  exclusive
                  onChange={(_, val) => val && setChartMetric(val)}
                  size="small"
                  sx={{
                    bgcolor: 'action.hover',
                    p: 0.2,
                    borderRadius: 1.5,
                    '& .MuiToggleButton-root': {
                      border: 'none',
                      borderRadius: 1,
                      px: 1,
                      py: 0.3,
                      fontWeight: 700,
                      fontSize: '0.68rem',
                      textTransform: 'none',
                      '&.Mui-selected': {
                        bgcolor: 'background.paper',
                        color: '#10B981',
                        boxShadow: '0 2px 5px rgba(0,0,0,0.08)'
                      }
                    }
                  }}
                >
                  <ToggleButton value="UNITS">Units</ToggleButton>
                  <ToggleButton value="REVENUE">Revenue</ToggleButton>
                  <ToggleButton value="PROFIT">Profit</ToggleButton>
                </ToggleButtonGroup>

                {peakDayInfo.maxMetricVal > 0 && (
                  <Chip
                    icon={<FireIcon sx={{ fontSize: '13px !important', color: '#F59E0B' }} />}
                    label={`Peak: ${chartMetric === 'UNITS' ? `${peakDayInfo.maxMetricVal} units` : `৳${formatNumber(peakDayInfo.maxMetricVal)}`} (Day ${peakDayInfo.peakDays.join(', ')})`}
                    size="small"
                    sx={{
                      fontWeight: 700,
                      fontSize: '0.68rem',
                      height: 22,
                      bgcolor: (t) => (t.palette.mode === 'dark' ? 'rgba(245, 158, 11, 0.12)' : '#FEF3C7'),
                      color: '#D97706',
                      border: '1px solid rgba(245, 158, 11, 0.3)'
                    }}
                  />
                )}
              </Stack>
            </Box>

            {/* Custom Interactive Daily Bar Chart */}
            <Box sx={{ flex: 1, minHeight: 140, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', pt: 1, pb: 0.5 }}>
              {totalUnitsSold === 0 ? (
                <Box sx={{ my: 'auto', textAlign: 'center', py: 3, color: 'text.secondary' }}>
                  <SaleIcon sx={{ fontSize: 32, opacity: 0.3, mb: 0.5 }} />
                  <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.82rem' }}>
                    No sales recorded in {MONTH_NAMES[selectedMonth]} {selectedYear}.
                  </Typography>
                  <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>
                    Sales will automatically plot on this chart when recorded.
                  </Typography>
                </Box>
              ) : (
                <Box sx={{ width: '100%' }}>
                  {/* The Plot Columns */}
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'flex-end',
                      gap: { xs: '2px', sm: '3px', md: '4px' },
                      height: { xs: 110, sm: 125 },
                      px: 0.5,
                      borderBottom: '2px solid',
                      borderColor: 'divider'
                    }}
                  >
                    {Array.from({ length: daysInMonth }).map((_, idx) => {
                      const dayNum = idx + 1;
                      const daySales = daySalesMap[dayNum] || [];
                      const count = daySales.length;

                      let metricVal = 0;
                      if (chartMetric === 'UNITS') metricVal = count;
                      else if (chartMetric === 'REVENUE') metricVal = daySales.reduce((a, s) => a + (parseFloat(s.selling_price) || 0), 0);
                      else if (chartMetric === 'PROFIT') metricVal = daySales.reduce((a, s) => a + (parseFloat(s.profit) || 0), 0);

                      const maxPossible = Math.max(1, peakDayInfo.maxMetricVal);
                      const barHeightPercent = metricVal > 0 ? Math.max(18, (metricVal / maxPossible) * 100) : 0;
                      const isHovered = hoveredDay === dayNum;

                      const tooltipLabel = chartMetric === 'UNITS'
                        ? `${count} unit(s) sold`
                        : chartMetric === 'REVENUE'
                        ? `৳${formatNumber(metricVal)} Revenue (${count} units)`
                        : `৳${formatNumber(metricVal)} Profit (${count} units)`;

                      return (
                        <Tooltip
                          key={`sales-plot-${dayNum}`}
                          title={`Day ${dayNum}: ${tooltipLabel} — Click to inspect by staff`}
                          arrow
                        >
                          <Box
                            onMouseEnter={() => setHoveredDay(dayNum)}
                            onMouseLeave={() => setHoveredDay(null)}
                            onClick={() => count > 0 && setSelectedDayModal({ day: dayNum, sales: daySales })}
                            sx={{
                              flex: 1,
                              height: '100%',
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'flex-end',
                              alignItems: 'center',
                              cursor: count > 0 ? 'pointer' : 'default'
                            }}
                          >
                            {count > 0 && (
                              <Typography
                                variant="caption"
                                fontWeight={800}
                                sx={{
                                  fontSize: '0.56rem',
                                  color: isHovered ? '#2563EB' : '#059669',
                                  mb: 0.2,
                                  lineHeight: 1
                                }}
                              >
                                {chartMetric === 'UNITS' ? count : `${Math.round(metricVal / 1000)}k`}
                              </Typography>
                            )}

                            <Box
                              sx={{
                                width: '100%',
                                height: `${barHeightPercent}%`,
                                minHeight: count > 0 ? 6 : 0,
                                borderRadius: '3px 3px 0 0',
                                bgcolor: count > 0
                                  ? isHovered
                                    ? '#2563EB'
                                    : chartMetric === 'PROFIT'
                                    ? '#6366F1'
                                    : '#10B981'
                                  : 'transparent',
                                transition: 'all 0.15s ease-in-out',
                                opacity: count > 0 ? 1 : 0.2
                              }}
                            />
                          </Box>
                        </Tooltip>
                      );
                    })}
                  </Box>

                  {/* Day Ticks / Labels */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.6, px: 0.5 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem', fontWeight: 600 }}>
                      Day 1
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem', fontWeight: 600 }}>
                      Day 10
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem', fontWeight: 600 }}>
                      Day 20
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem', fontWeight: 600 }}>
                      Day {daysInMonth}
                    </Typography>
                  </Box>
                </Box>
              )}
            </Box>

            {/* Bottom 3 Phase Cluster Badges */}
            <Box sx={{ pt: 1.2, borderTop: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 0.75 }}>
              <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ fontSize: '0.7rem' }}>
                Selling Cadence:
              </Typography>
              <Stack direction="row" spacing={0.75} flexWrap="wrap" sx={{ gap: 0.5 }}>
                <Chip
                  label={`Early (1-10): ${earlyMonthUnits} units`}
                  size="small"
                  sx={{
                    fontWeight: 700,
                    fontSize: '0.65rem',
                    height: 22,
                    bgcolor: (t) => (t.palette.mode === 'dark' ? 'rgba(59, 130, 246, 0.12)' : '#EFF6FF'),
                    color: '#2563EB',
                    borderRadius: 1
                  }}
                />
                <Chip
                  label={`Mid (11-20): ${midMonthUnits} units`}
                  size="small"
                  sx={{
                    fontWeight: 700,
                    fontSize: '0.65rem',
                    height: 22,
                    bgcolor: (t) => (t.palette.mode === 'dark' ? 'rgba(139, 92, 246, 0.12)' : '#F5F3FF'),
                    color: '#7C3AED',
                    borderRadius: 1
                  }}
                />
                <Chip
                  label={`Late (21-${daysInMonth}): ${lateMonthUnits} units`}
                  size="small"
                  sx={{
                    fontWeight: 700,
                    fontSize: '0.65rem',
                    height: 22,
                    bgcolor: (t) => (t.palette.mode === 'dark' ? 'rgba(16, 185, 129, 0.12)' : '#ECFDF5'),
                    color: '#059669',
                    borderRadius: 1
                  }}
                />
              </Stack>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* 4. EMPLOYEE PERFORMANCE BREAKDOWN ("under which employee is doing what") */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5, flexWrap: 'wrap', gap: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PeopleIcon sx={{ color: '#10B981', fontSize: 22 }} />
            <div>
              <Typography variant="subtitle1" fontWeight={800} sx={{ fontSize: { xs: '0.95rem', sm: '1.1rem' } }}>
                Staff Sales & Activity Breakdown ({MONTH_NAMES[selectedMonth]} {selectedYear})
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Detailed contributions, sold units, revenue, and top models by each staff member
              </Typography>
            </div>
          </Box>
          {selectedEmployee !== 'ALL' && (
            <Button
              size="small"
              variant="outlined"
              onClick={() => setSelectedEmployee('ALL')}
              sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 1.5 }}
            >
              Show All Staff Leaderboard
            </Button>
          )}
        </Box>

        {employeePerformanceList.length === 0 ? (
          <Paper variant="outlined" sx={{ p: 4, textAlign: 'center', borderRadius: 2 }}>
            <PeopleIcon sx={{ fontSize: 36, opacity: 0.3, mb: 1 }} />
            <Typography variant="body2" color="text.secondary" fontWeight={600}>
              No employee sales recorded in {MONTH_NAMES[selectedMonth]} {selectedYear}.
            </Typography>
          </Paper>
        ) : (
          <Grid container spacing={2}>
            {employeePerformanceList.map((emp, index) => {
              const isSelected = selectedEmployee === emp.name;
              const isLeader = index === 0 && emp.unitsSold > 0;

              return (
                <Grid item xs={12} sm={6} md={4} key={`emp-card-${emp.name}`}>
                  <Paper
                    variant="outlined"
                    onClick={() => setSelectedEmployee(isSelected ? 'ALL' : emp.name)}
                    sx={{
                      p: 2,
                      borderRadius: 2.25,
                      cursor: 'pointer',
                      border: '1.5px solid',
                      borderColor: isSelected
                        ? '#10B981'
                        : isLeader
                        ? 'rgba(245, 158, 11, 0.4)'
                        : 'divider',
                      bgcolor: isSelected
                        ? (t) => (t.palette.mode === 'dark' ? 'rgba(16, 185, 129, 0.08)' : '#F0FDF4')
                        : 'background.paper',
                      boxShadow: isSelected
                        ? '0 4px 14px rgba(16, 185, 129, 0.2)'
                        : 'none',
                      transition: 'all 0.15s ease-in-out',
                      '&:hover': {
                        borderColor: '#10B981',
                        transform: 'translateY(-2px)'
                      }
                    }}
                  >
                    {/* Employee Card Header */}
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                        <Avatar
                          sx={{
                            width: 38,
                            height: 38,
                            bgcolor: isLeader ? '#F59E0B' : '#2563EB',
                            fontSize: '0.95rem',
                            fontWeight: 800,
                            boxShadow: isLeader ? '0 2px 8px rgba(245, 158, 11, 0.35)' : 'none'
                          }}
                        >
                          {emp.name.charAt(0).toUpperCase()}
                        </Avatar>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography variant="subtitle2" fontWeight={800} noWrap>
                            {emp.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {emp.activeDays} active selling {emp.activeDays === 1 ? 'day' : 'days'}
                          </Typography>
                        </Box>
                      </Box>

                      {isLeader && (
                        <Chip
                          icon={<TrophyIcon sx={{ fontSize: '13px !important', color: '#F59E0B' }} />}
                          label="Top Seller"
                          size="small"
                          sx={{
                            fontWeight: 800,
                            fontSize: '0.65rem',
                            height: 22,
                            bgcolor: 'rgba(245, 158, 11, 0.12)',
                            color: '#D97706',
                            border: '1px solid rgba(245, 158, 11, 0.3)'
                          }}
                        />
                      )}
                    </Box>

                    {/* Stats Grid */}
                    <Grid container spacing={1} sx={{ mb: 1.5 }}>
                      <Grid item xs={4}>
                        <Box sx={{ p: 0.8, borderRadius: 1.5, bgcolor: 'action.hover', textAlign: 'center' }}>
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.62rem', fontWeight: 700 }}>
                            Units
                          </Typography>
                          <Typography variant="body2" fontWeight={800} color="#059669">
                            {emp.unitsSold}
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={4}>
                        <Box sx={{ p: 0.8, borderRadius: 1.5, bgcolor: 'action.hover', textAlign: 'center' }}>
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.62rem', fontWeight: 700 }}>
                            Revenue
                          </Typography>
                          <Typography variant="body2" fontWeight={800} color="#2563EB" noWrap>
                            ৳{Math.round(emp.revenue / 1000)}k
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={4}>
                        <Box sx={{ p: 0.8, borderRadius: 1.5, bgcolor: 'action.hover', textAlign: 'center' }}>
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.62rem', fontWeight: 700 }}>
                            Profit
                          </Typography>
                          <Typography variant="body2" fontWeight={800} color="#6366F1" noWrap>
                            ৳{Math.round(emp.profit / 1000)}k
                          </Typography>
                        </Box>
                      </Grid>
                    </Grid>

                    {/* Top Models Sold */}
                    {emp.topModels.length > 0 && (
                      <Box sx={{ pt: 1, borderTop: 1, borderColor: 'divider' }}>
                        <Typography variant="caption" color="text.secondary" fontWeight={700} display="block" sx={{ fontSize: '0.65rem', mb: 0.5 }}>
                          Top Models Sold:
                        </Typography>
                        <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ gap: 0.5 }}>
                          {emp.topModels.map((m) => (
                            <Chip
                              key={m.model}
                              label={`${m.model} (${m.qty})`}
                              size="small"
                              sx={{
                                fontWeight: 700,
                                fontSize: '0.65rem',
                                height: 20,
                                bgcolor: (t) => (t.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : '#F1F5F9')
                              }}
                            />
                          ))}
                        </Stack>
                      </Box>
                    )}

                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', mt: 1 }}>
                      <Typography variant="caption" color="primary" fontWeight={700} sx={{ fontSize: '0.7rem' }}>
                        {isSelected ? '✓ Filtered (Click to Reset)' : 'Click to Filter Month'} →
                      </Typography>
                    </Box>
                  </Paper>
                </Grid>
              );
            })}
          </Grid>
        )}
      </Box>

      {/* 5. Detailed Monthly Sales Ledger Table */}
      <Paper
        variant="outlined"
        sx={{
          p: { xs: 1.5, sm: 2.5 },
          borderRadius: { xs: 2, sm: 2.5 },
          bgcolor: 'background.paper'
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1.5 }}>
          <Box>
            <Typography variant="subtitle1" fontWeight={800} sx={{ fontSize: { xs: '0.95rem', sm: '1.1rem' } }}>
              Monthly Sales Ledger ({filteredLedger.length})
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Individual transactions in {MONTH_NAMES[selectedMonth]} {selectedYear}
              {selectedEmployee !== 'ALL' && ` by ${selectedEmployee}`}
            </Typography>
          </Box>

          <Box sx={{ width: { xs: '100%', sm: 300 } }}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search model, IMEI, seller, customer, invoice..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                )
              }}
            />
          </Box>
        </Box>

        {filteredLedger.length === 0 ? (
          <Box sx={{ py: 4, textAlign: 'center', color: 'text.secondary' }}>
            <SaleIcon sx={{ fontSize: 36, opacity: 0.4, mb: 1 }} />
            <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.85rem' }}>
              No sales records match your criteria in {MONTH_NAMES[selectedMonth]} {selectedYear}.
            </Typography>
            <Typography variant="caption" sx={{ fontSize: '0.72rem' }}>
              Switch months, change employee filter, or clear search.
            </Typography>
          </Box>
        ) : (
          <>
            {/* MOBILE VIEW */}
            <Box sx={{ display: { xs: 'flex', sm: 'none' }, flexDirection: 'column', gap: 1.25 }}>
              {filteredLedger.map((s) => {
                const emp = getSaleEmployeeName(s);
                return (
                  <Paper
                    key={`mob-sales-ledger-${s.id}`}
                    variant="outlined"
                    sx={{
                      p: 1.5,
                      borderRadius: 2,
                      bgcolor: (t) => (t.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : '#F8FAFC'),
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 0.8
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1 }}>
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography variant="subtitle2" fontWeight={800} noWrap>
                          {s.device_model || 'Device'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {s.device_capacity || ''} {s.device_color || ''} {s.device_variant ? `• ${s.device_variant}` : ''}
                        </Typography>
                      </Box>
                      <Chip
                        label={`Profit: ৳${s.profit ? formatNumber(s.profit) : '0'}`}
                        size="small"
                        sx={{
                          fontWeight: 800,
                          fontSize: '0.68rem',
                          height: 22,
                          bgcolor: Number(s.profit || 0) >= 0 ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                          color: Number(s.profit || 0) >= 0 ? '#059669' : '#DC2626'
                        }}
                      />
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 0.75, pt: 0.3 }}>
                      <CopyableText text={s.device_imei || '—'} />
                      <Typography variant="caption" color="text.secondary">
                        {formatDate(s.sale_date || s.created_at)}
                      </Typography>
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: 1, borderColor: 'divider', pt: 0.6 }}>
                      <Chip
                        size="small"
                        icon={<PersonIcon sx={{ fontSize: '13px !important' }} />}
                        label={emp}
                        sx={{
                          bgcolor: 'rgba(2, 132, 199, 0.1)',
                          color: '#0284c7',
                          fontWeight: 600,
                          fontSize: '0.7rem',
                          height: 22
                        }}
                      />
                      <Typography variant="body2" fontWeight={800} color="primary">
                        ৳{s.selling_price ? formatNumber(s.selling_price) : '0'}
                      </Typography>
                    </Box>
                  </Paper>
                );
              })}
            </Box>

            {/* DESKTOP TABLE VIEW */}
            <TableContainer sx={{ display: { xs: 'none', sm: 'block' } }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: 'action.hover' }}>
                    <TableCell sx={{ fontWeight: 700 }}>Device Model & Spec</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>IMEI</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Sold By</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Sale Date</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Selling Price</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Profit</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="right">Invoice</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredLedger.map((s) => {
                    const emp = getSaleEmployeeName(s);
                    return (
                      <TableRow key={`sales-ledger-row-${s.id}`} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight={700}>
                            {s.device_model || 'Device'}
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, mt: 0.2 }}>
                            {s.device_variant && <VariantBadge variant={s.device_variant} size="small" />}
                            <Typography variant="caption" color="text.secondary">
                              {s.device_capacity || ''} {s.device_color || ''}
                            </Typography>
                          </Box>
                        </TableCell>

                        <TableCell>
                          <CopyableText text={s.device_imei || '—'} />
                        </TableCell>

                        <TableCell>
                          <Chip
                            size="small"
                            icon={<PersonIcon sx={{ fontSize: '13px !important', color: '#0284c7 !important' }} />}
                            label={emp}
                            sx={{
                              bgcolor: 'rgba(2, 132, 199, 0.1)',
                              color: '#0284c7',
                              fontWeight: 600,
                              fontSize: '0.72rem',
                              height: 22
                            }}
                          />
                        </TableCell>

                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {formatDate(s.sale_date || s.created_at)}
                          </Typography>
                        </TableCell>

                        <TableCell>
                          <Typography variant="body2" fontWeight={700} color="primary">
                            ৳{s.selling_price ? formatNumber(s.selling_price) : '0'}
                          </Typography>
                        </TableCell>

                        <TableCell>
                          <Typography
                            variant="body2"
                            fontWeight={700}
                            sx={{ color: Number(s.profit || 0) >= 0 ? '#059669' : '#DC2626' }}
                          >
                            ৳{s.profit ? formatNumber(s.profit) : '0'}
                          </Typography>
                        </TableCell>

                        <TableCell align="right">
                          <Typography variant="caption" fontFamily="monospace" color="text.secondary">
                            {s.invoice_number || `#INV-${s.id}`}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        )}
      </Paper>

      {/* 6. INTERACTIVE DAY SALES MODAL (Grouped by Employee) */}
      <Dialog
        open={Boolean(selectedDayModal)}
        onClose={() => setSelectedDayModal(null)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 3 }
        }}
      >
        {selectedDayModal && (
          <>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                <Box
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: 1.5,
                    bgcolor: 'rgba(16, 185, 129, 0.12)',
                    color: '#059669',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <CalendarIcon sx={{ fontSize: 20 }} />
                </Box>
                <Box>
                  <Typography variant="h6" fontWeight={800} sx={{ fontSize: '1.1rem' }}>
                    Sales on {selectedDayModal.day} {MONTH_NAMES[selectedMonth]} {selectedYear}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {selectedDayModal.sales.length} device(s) sold across {dayEmployeeGroups.length} staff member(s)
                  </Typography>
                </Box>
              </Box>

              <IconButton size="small" onClick={() => setSelectedDayModal(null)}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </DialogTitle>

            <DialogContent dividers sx={{ p: { xs: 1.5, sm: 2.5 } }}>
              {/* Day KPI Recap Bar */}
              <Paper
                variant="outlined"
                sx={{
                  p: 1.5,
                  mb: 2.5,
                  borderRadius: 2,
                  bgcolor: (t) => (t.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : '#F8FAFC'),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-around',
                  flexWrap: 'wrap',
                  gap: 1.5
                }}
              >
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={700}>TOTAL UNITS</Typography>
                  <Typography variant="h6" fontWeight={800} color="#059669">{selectedDayModal.sales.length}</Typography>
                </Box>
                <Divider orientation="vertical" flexItem />
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={700}>TOTAL REVENUE</Typography>
                  <Typography variant="h6" fontWeight={800} color="#2563EB">
                    ৳{formatNumber(selectedDayModal.sales.reduce((a, s) => a + (parseFloat(s.selling_price) || 0), 0))}
                  </Typography>
                </Box>
                <Divider orientation="vertical" flexItem />
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={700}>TOTAL PROFIT</Typography>
                  <Typography variant="h6" fontWeight={800} color="#6366F1">
                    ৳{formatNumber(selectedDayModal.sales.reduce((a, s) => a + (parseFloat(s.profit) || 0), 0))}
                  </Typography>
                </Box>
              </Paper>

              {/* Staff Grouping */}
              <Stack spacing={2}>
                {dayEmployeeGroups.map((group) => (
                  <Paper
                    key={`modal-group-${group.employee}`}
                    variant="outlined"
                    sx={{
                      p: 2,
                      borderRadius: 2.25,
                      bgcolor: 'background.paper'
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5, flexWrap: 'wrap', gap: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar sx={{ width: 28, height: 28, fontSize: '0.75rem', fontWeight: 800, bgcolor: '#2563EB' }}>
                          {group.employee.charAt(0).toUpperCase()}
                        </Avatar>
                        <Typography variant="subtitle2" fontWeight={800}>
                          {group.employee}
                        </Typography>
                        <Chip
                          label={`${group.totalUnits} unit${group.totalUnits === 1 ? '' : 's'}`}
                          size="small"
                          sx={{ fontWeight: 800, fontSize: '0.65rem', height: 20, bgcolor: 'rgba(16, 185, 129, 0.12)', color: '#059669' }}
                        />
                      </Box>

                      <Typography variant="caption" fontWeight={700} color="text.secondary">
                        Rev: <strong style={{ color: '#2563EB' }}>৳{formatNumber(group.totalRevenue)}</strong> • Profit: <strong style={{ color: '#059669' }}>৳{formatNumber(group.totalProfit)}</strong>
                      </Typography>
                    </Box>

                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow sx={{ bgcolor: 'action.hover' }}>
                            <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem' }}>Device</TableCell>
                            <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem' }}>IMEI</TableCell>
                            <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem' }}>Selling Price</TableCell>
                            <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem' }}>Profit</TableCell>
                            <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem' }} align="right">Invoice</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {group.items.map((item) => (
                            <TableRow key={`day-item-${item.id}`} hover>
                              <TableCell sx={{ fontSize: '0.78rem' }}>
                                <strong>{item.device_model || 'Device'}</strong>
                                <Typography variant="caption" color="text.secondary" display="block">
                                  {item.device_capacity || ''} {item.device_color || ''} {item.device_variant ? `• ${item.device_variant}` : ''}
                                </Typography>
                              </TableCell>
                              <TableCell sx={{ fontSize: '0.78rem' }}>
                                <CopyableText text={item.device_imei || '—'} />
                              </TableCell>
                              <TableCell sx={{ fontSize: '0.78rem', fontWeight: 700, color: 'primary.main' }}>
                                ৳{item.selling_price ? formatNumber(item.selling_price) : '0'}
                              </TableCell>
                              <TableCell sx={{ fontSize: '0.78rem', fontWeight: 700, color: '#059669' }}>
                                ৳{item.profit ? formatNumber(item.profit) : '0'}
                              </TableCell>
                              <TableCell align="right" sx={{ fontSize: '0.72rem', fontFamily: 'monospace', color: 'text.secondary' }}>
                                {item.invoice_number || `#INV-${item.id}`}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Paper>
                ))}
              </Stack>
            </DialogContent>

            <DialogActions sx={{ px: 2.5, py: 1.5, justifyContent: 'space-between' }}>
              <Button
                variant="outlined"
                startIcon={<CopyIcon />}
                onClick={handleCopyDayReport}
                sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2 }}
              >
                Copy Day Report
              </Button>
              <Button
                variant="contained"
                onClick={() => setSelectedDayModal(null)}
                sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2 }}
              >
                Done
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
}
