import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Grid,
  Card,
  Typography,
  Button,
  Stack,
  Paper,
  Chip,
  IconButton,
  MenuItem,
  Select,
  FormControl,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  InputAdornment,
  Tooltip,
  useTheme,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  useMediaQuery
} from '@mui/material';
import {
  Insights as InsightsIcon,
  CalendarMonth as CalendarIcon,
  TrendingUp as TrendingUpIcon,
  CheckCircle as CheckCircleIcon,
  EmojiEvents as TrophyIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Search as SearchIcon,
  PointOfSale as SaleIcon,
  Close as CloseIcon,
  Whatshot as FireIcon,
  BarChart as BarChartIcon,
  BatteryChargingFull as BatteryIcon,
  AccessTime as TimeIcon
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { saleApi } from '../api/client';
import { apiCache } from '../utils/apiCache';
import { useSmartPolling } from '../utils/useSmartPolling';
import CopyableText from '../components/common/CopyableText';
import { formatDate } from '../utils/formatters';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function StaffSalesAnalytics() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { user } = useAuth();

  const today = new Date();
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth()); // 0-indexed

  const cachedSales = apiCache.get('/api/sales/');
  const [sales, setSales] = useState(() => cachedSales?.results || cachedSales || []);
  const [loading, setLoading] = useState(() => !cachedSales);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDayModal, setSelectedDayModal] = useState(null);
  const [hoveredDay, setHoveredDay] = useState(null);

  const fetchSalesData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const res = await saleApi.getAll();
      const freshSales = res.data.results || res.data || [];
      apiCache.set('/api/sales/', freshSales);
      setSales(freshSales);
    } catch (e) {
      console.error('Failed to load sales analytics data', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSalesData(Boolean(cachedSales));
  }, []);

  useSmartPolling(() => {
    fetchSalesData(true);
  }, 30000);

  // 1. Filter sales specifically belonging to this logged-in employee
  const mySales = useMemo(() => {
    if (!user || !Array.isArray(sales)) return [];
    return sales.filter((sale) => {
      const rawSellerId =
        typeof sale.seller === 'object' && sale.seller !== null
          ? sale.seller.id
          : typeof sale.seller === 'number'
            ? sale.seller
            : sale.seller_id;

      if (user.id && rawSellerId && Number(rawSellerId) === Number(user.id)) {
        return true;
      }

      const possibleNames = [
        typeof sale.seller === 'object' && sale.seller !== null ? sale.seller.username : null,
        sale.seller_name,
        sale.sold_by,
        typeof sale.seller === 'string' ? sale.seller : null
      ]
        .filter(Boolean)
        .map((s) => String(s).trim().toLowerCase());

      const targetUsername = String(user.username || '').trim().toLowerCase();
      const targetDisplayName = String(user.display_name || '').trim().toLowerCase();
      const targetFullName = String(
        `${user.first_name || ''} ${user.last_name || ''}`
      ).trim().toLowerCase();

      return (
        (targetUsername && possibleNames.includes(targetUsername)) ||
        (targetDisplayName && possibleNames.includes(targetDisplayName)) ||
        (targetFullName && possibleNames.includes(targetFullName))
      );
    });
  }, [sales, user]);

  // 2. Filter sales for selected Year & Month
  const monthSales = useMemo(() => {
    return mySales.filter((sale) => {
      const rawDate = sale.sale_date || sale.created_at;
      if (!rawDate) return false;
      const str = String(rawDate).trim();
      let d;
      if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
        const parts = str.slice(0, 10).split('-').map(Number);
        d = new Date(parts[0], parts[1] - 1, parts[2]);
      } else {
        d = new Date(str);
      }
      if (isNaN(d.getTime())) return false;
      return d.getFullYear() === selectedYear && d.getMonth() === selectedMonth;
    });
  }, [mySales, selectedYear, selectedMonth]);

  // 3. Group month sales by day of the month (1 to daysInMonth)
  const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
  const firstDayWeekday = new Date(selectedYear, selectedMonth, 1).getDay(); // 0 = Sun, 1 = Mon...

  const daySalesMap = useMemo(() => {
    const map = {};
    for (let day = 1; day <= daysInMonth; day++) {
      map[day] = [];
    }
    monthSales.forEach((sale) => {
      const rawDate = sale.sale_date || sale.created_at;
      if (!rawDate) return;
      const str = String(rawDate).trim();
      let d;
      if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
        const parts = str.slice(0, 10).split('-').map(Number);
        d = new Date(parts[0], parts[1] - 1, parts[2]);
      } else {
        d = new Date(str);
      }
      if (!isNaN(d.getTime())) {
        const dayNum = d.getDate();
        if (map[dayNum]) {
          map[dayNum].push(sale);
        }
      }
    });
    return map;
  }, [monthSales, daysInMonth]);

  // 4. Calculations: Early (1-10), Mid (11-20), Late (21-30/31)
  const totalUnitsSold = monthSales.length;

  const earlyMonthUnits = useMemo(() => {
    let count = 0;
    for (let day = 1; day <= Math.min(10, daysInMonth); day++) {
      count += daySalesMap[day]?.length || 0;
    }
    return count;
  }, [daySalesMap, daysInMonth]);

  const midMonthUnits = useMemo(() => {
    let count = 0;
    for (let day = 11; day <= Math.min(20, daysInMonth); day++) {
      count += daySalesMap[day]?.length || 0;
    }
    return count;
  }, [daySalesMap, daysInMonth]);

  const lateMonthUnits = useMemo(() => {
    let count = 0;
    for (let day = 21; day <= daysInMonth; day++) {
      count += daySalesMap[day]?.length || 0;
    }
    return count;
  }, [daySalesMap, daysInMonth]);

  // 5. Active selling days & Consistency Score
  const activeSellingDaysCount = useMemo(() => {
    let active = 0;
    for (let day = 1; day <= daysInMonth; day++) {
      if (daySalesMap[day]?.length > 0) active++;
    }
    return active;
  }, [daySalesMap, daysInMonth]);

  const isCurrentMonth = today.getFullYear() === selectedYear && today.getMonth() === selectedMonth;
  const elapsedDays = isCurrentMonth ? Math.max(1, today.getDate()) : daysInMonth;
  const consistencyPercent = Math.min(100, Math.round((activeSellingDaysCount / Math.max(1, elapsedDays)) * 100));

  const consistencyRating = consistencyPercent >= 40
    ? { label: 'High Consistency', color: '#10B981', bg: 'rgba(16, 185, 129, 0.12)' }
    : consistencyPercent >= 20
      ? { label: 'Moderate Pace', color: '#3B82F6', bg: 'rgba(59, 130, 246, 0.12)' }
      : { label: 'Needs Consistency', color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.12)' };

  // Peak sales day calculation
  const peakDayInfo = useMemo(() => {
    let maxUnits = 0;
    let peakDays = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const count = daySalesMap[day]?.length || 0;
      if (count > maxUnits) {
        maxUnits = count;
        peakDays = [day];
      } else if (count === maxUnits && count > 0) {
        peakDays.push(day);
      }
    }
    return { maxUnits, peakDays };
  }, [daySalesMap, daysInMonth]);

  // Month navigation helpers
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

  // Filtered sales ledger for the table/cards
  const filteredSalesLedger = useMemo(() => {
    if (!searchQuery.trim()) return monthSales;
    const q = searchQuery.toLowerCase();
    return monthSales.filter(
      (s) =>
        s.device_model?.toLowerCase().includes(q) ||
        s.device_imei?.toLowerCase().includes(q) ||
        s.device_variant?.toLowerCase().includes(q) ||
        s.payment_method?.toLowerCase().includes(q)
    );
  }, [monthSales, searchQuery]);

  return (
    <Box sx={{ pb: { xs: 8, sm: 6 } }}>
      {/* 1. Header Card with Responsive Month Navigator */}
      <Paper
        elevation={0}
        sx={{
          p: { xs: 1.75, sm: 2.5 },
          mb: { xs: 2, sm: 3 },
          borderRadius: { xs: 2, sm: 2.5 },
          border: 1,
          borderColor: 'divider',
          bgcolor: 'background.paper',
          display: 'flex',
          alignItems: { xs: 'stretch', sm: 'center' },
          justifyContent: 'space-between',
          flexDirection: { xs: 'column', sm: 'row' },
          gap: 1.5
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: { xs: 38, sm: 46 },
              height: { xs: 38, sm: 46 },
              borderRadius: 2,
              bgcolor: 'primary.main',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)',
              flexShrink: 0
            }}
          >
            <InsightsIcon sx={{ fontSize: { xs: 20, sm: 26 } }} />
          </Box>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography variant="h5" fontWeight={800} sx={{ fontSize: { xs: '1.05rem', sm: '1.4rem' } }} noWrap>
              Sale Analytics
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.74rem', sm: '0.85rem' } }} noWrap>
              Sales performance for{' '}
              <strong>{user?.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : (user?.display_name || user?.username)}</strong>
            </Typography>
          </Box>
        </Box>

        {/* Month / Year Navigator Bar */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            bgcolor: 'action.hover',
            p: 0.5,
            borderRadius: 2,
            width: { xs: '100%', sm: 'auto' }
          }}
        >
          <IconButton size="small" onClick={handlePrevMonth}>
            <ChevronLeftIcon fontSize="small" />
          </IconButton>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flex: 1, justifyContent: 'center' }}>
            <FormControl size="small" sx={{ minWidth: { xs: 95, sm: 120 } }}>
              <Select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                sx={{
                  fontWeight: 700,
                  fontSize: { xs: '0.8rem', sm: '0.88rem' },
                  borderRadius: 1.5,
                  bgcolor: 'background.paper',
                  '& .MuiSelect-select': { py: 0.6, px: 1 }
                }}
              >
                {MONTH_NAMES.map((m, idx) => (
                  <MenuItem key={m} value={idx}>
                    {m}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: { xs: 75, sm: 90 } }}>
              <Select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                sx={{
                  fontWeight: 700,
                  fontSize: { xs: '0.8rem', sm: '0.88rem' },
                  borderRadius: 1.5,
                  bgcolor: 'background.paper',
                  '& .MuiSelect-select': { py: 0.6, px: 1 }
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
      </Paper>

      {/* 2. Top Summary KPI Cards */}
      <Grid container spacing={{ xs: 1.5, sm: 2 }} sx={{ mb: { xs: 2, sm: 3 } }}>
        {/* Total Units Sold */}
        <Grid item xs={6} md={3}>
          <Card
            variant="outlined"
            sx={{
              p: { xs: 1.5, sm: 2 },
              borderRadius: { xs: 2, sm: 2.5 },
              height: '100%',
              bgcolor: 'background.paper',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="caption" fontWeight={800} color="text.secondary" textTransform="uppercase" sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>
                Monthly Volume
              </Typography>
              <Box sx={{ p: 0.6, borderRadius: 1.2, bgcolor: 'rgba(16, 185, 129, 0.1)', color: '#10B981' }}>
                <TrophyIcon sx={{ fontSize: 16 }} />
              </Box>
            </Box>
            <Typography variant="h4" fontWeight={800} sx={{ color: '#10B981', my: 0.25, fontSize: { xs: '1.45rem', sm: '2rem' } }}>
              {totalUnitsSold} <Typography component="span" variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>Units</Typography>
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.68rem' }} noWrap>
              {MONTH_NAMES[selectedMonth]} {selectedYear}
            </Typography>
          </Card>
        </Grid>

        {/* Consistency & Active Days */}
        <Grid item xs={6} md={3}>
          <Card
            variant="outlined"
            sx={{
              p: { xs: 1.5, sm: 2 },
              borderRadius: { xs: 2, sm: 2.5 },
              height: '100%',
              bgcolor: 'background.paper',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="caption" fontWeight={800} color="text.secondary" textTransform="uppercase" sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>
                Consistency
              </Typography>
              <Box sx={{ p: 0.6, borderRadius: 1.2, bgcolor: consistencyRating.bg, color: consistencyRating.color }}>
                <FireIcon sx={{ fontSize: 16 }} />
              </Box>
            </Box>
            <Box sx={{ my: 0.25, display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
              <Typography variant="h4" fontWeight={800} sx={{ color: consistencyRating.color, fontSize: { xs: '1.45rem', sm: '2rem' } }}>
                {activeSellingDaysCount} <Typography component="span" variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>Days</Typography>
              </Typography>
              <Chip
                label={consistencyRating.label}
                size="small"
                sx={{
                  fontWeight: 700,
                  fontSize: '0.62rem',
                  height: 18,
                  bgcolor: consistencyRating.bg,
                  color: consistencyRating.color,
                  borderRadius: 1
                }}
              />
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.68rem' }} noWrap>
              {activeSellingDaysCount} of {elapsedDays} days ({consistencyPercent}%)
            </Typography>
          </Card>
        </Grid>

        {/* 10-Day Phase Breakdown Overview */}
        <Grid item xs={12} md={6}>
          <Card
            variant="outlined"
            sx={{
              p: { xs: 1.5, sm: 2 },
              borderRadius: { xs: 2, sm: 2.5 },
              height: '100%',
              bgcolor: 'background.paper',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="caption" fontWeight={800} color="text.secondary" textTransform="uppercase" sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>
                10-Day Volume Breakdown
              </Typography>
              <Typography variant="caption" fontWeight={700} color="primary.main" sx={{ fontSize: '0.7rem' }}>
                {MONTH_NAMES[selectedMonth]} Phases
              </Typography>
            </Box>

            <Grid container spacing={1}>
              {/* Early Month (1-10) */}
              <Grid item xs={4}>
                <Paper
                  variant="outlined"
                  sx={{
                    p: { xs: 0.8, sm: 1.2 },
                    borderRadius: 1.75,
                    bgcolor: (t) => (t.palette.mode === 'dark' ? 'rgba(59, 130, 246, 0.08)' : '#EFF6FF'),
                    borderColor: 'rgba(59, 130, 246, 0.3)',
                    textAlign: 'center'
                  }}
                >
                  <Typography variant="caption" color="text.secondary" fontWeight={700} display="block" sx={{ fontSize: { xs: '0.62rem', sm: '0.7rem' } }}>
                    Days 1 – 10
                  </Typography>
                  <Typography variant="h6" fontWeight={800} color="#2563EB" sx={{ fontSize: { xs: '1rem', sm: '1.2rem' } }}>
                    {earlyMonthUnits}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.62rem' }}>
                    Early
                  </Typography>
                </Paper>
              </Grid>

              {/* Mid Month (11-20) */}
              <Grid item xs={4}>
                <Paper
                  variant="outlined"
                  sx={{
                    p: { xs: 0.8, sm: 1.2 },
                    borderRadius: 1.75,
                    bgcolor: (t) => (t.palette.mode === 'dark' ? 'rgba(139, 92, 246, 0.08)' : '#F5F3FF'),
                    borderColor: 'rgba(139, 92, 246, 0.3)',
                    textAlign: 'center'
                  }}
                >
                  <Typography variant="caption" color="text.secondary" fontWeight={700} display="block" sx={{ fontSize: { xs: '0.62rem', sm: '0.7rem' } }}>
                    Days 11 – 20
                  </Typography>
                  <Typography variant="h6" fontWeight={800} color="#7C3AED" sx={{ fontSize: { xs: '1rem', sm: '1.2rem' } }}>
                    {midMonthUnits}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.62rem' }}>
                    Mid
                  </Typography>
                </Paper>
              </Grid>

              {/* Late Month (21-30/31) */}
              <Grid item xs={4}>
                <Paper
                  variant="outlined"
                  sx={{
                    p: { xs: 0.8, sm: 1.2 },
                    borderRadius: 1.75,
                    bgcolor: (t) => (t.palette.mode === 'dark' ? 'rgba(16, 185, 129, 0.08)' : '#ECFDF5'),
                    borderColor: 'rgba(16, 185, 129, 0.3)',
                    textAlign: 'center'
                  }}
                >
                  <Typography variant="caption" color="text.secondary" fontWeight={700} display="block" sx={{ fontSize: { xs: '0.62rem', sm: '0.7rem' } }}>
                    Days 21 – {daysInMonth}
                  </Typography>
                  <Typography variant="h6" fontWeight={800} color="#059669" sx={{ fontSize: { xs: '1rem', sm: '1.2rem' } }}>
                    {lateMonthUnits}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.62rem' }}>
                    Late
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
          </Card>
        </Grid>
      </Grid>

      {/* 3. SIDE-BY-SIDE: Compact Calendar on Left & Daily Volume Plot on Right */}
      <Grid container spacing={{ xs: 2, sm: 2.5 }} sx={{ mb: { xs: 2, sm: 3 } }} alignItems="stretch">
        {/* LEFT COLUMN: Compact Month Calendar */}
        <Grid item xs={12} lg={5}>
          <Paper
            variant="outlined"
            sx={{
              p: { xs: 1.5, sm: 2.25 },
              borderRadius: { xs: 2, sm: 2.5 },
              height: '100%',
              bgcolor: 'background.paper',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CalendarIcon sx={{ color: 'primary.main', fontSize: 20 }} />
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
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.68rem' }}>Empty</Typography>
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
                const daySalesList = daySalesMap[dayNum] || [];
                const hasSales = daySalesList.length > 0;
                const isToday =
                  today.getFullYear() === selectedYear &&
                  today.getMonth() === selectedMonth &&
                  today.getDate() === dayNum;
                const isHovered = hoveredDay === dayNum;

                return (
                  <Grid item xs={12 / 7} key={`day-${dayNum}`}>
                    <Tooltip
                      title={
                        hasSales
                          ? `Day ${dayNum}: ${daySalesList.length} unit(s) sold (Tap for details)`
                          : `Day ${dayNum}: No sales`
                      }
                      arrow
                    >
                      <Paper
                        variant="outlined"
                        onMouseEnter={() => setHoveredDay(dayNum)}
                        onMouseLeave={() => setHoveredDay(null)}
                        onClick={() => hasSales && setSelectedDayModal({ day: dayNum, sales: daySalesList })}
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
                          transform: isHovered ? 'scale(1.12)' : 'none',
                          boxShadow: isHovered
                            ? '0 4px 12px rgba(37, 99, 235, 0.35)'
                            : hasSales
                              ? '0 2px 6px rgba(16, 185, 129, 0.15)'
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

        {/* RIGHT COLUMN: Daily Sales Volume Plot Graph */}
        <Grid item xs={12} lg={7}>
          <Paper
            variant="outlined"
            sx={{
              p: { xs: 1.5, sm: 2.25 },
              borderRadius: { xs: 2, sm: 2.5 },
              height: '100%',
              bgcolor: 'background.paper',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}
          >
            {/* Top Graph Header */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5, flexWrap: 'wrap', gap: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <BarChartIcon sx={{ color: 'primary.main', fontSize: 20 }} />
                <Typography variant="subtitle2" fontWeight={800} sx={{ fontSize: { xs: '0.85rem', sm: '0.95rem' } }}>
                  Daily Sales Volume Plot
                </Typography>
              </Box>

              {peakDayInfo.maxUnits > 0 && (
                <Chip
                  icon={<FireIcon sx={{ fontSize: '13px !important', color: '#F59E0B' }} />}
                  label={`Peak: ${peakDayInfo.maxUnits} units (Day ${peakDayInfo.peakDays.join(', ')})`}
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
            </Box>

            {/* Custom Interactive SVG Daily Histogram */}
            <Box sx={{ flex: 1, minHeight: 140, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', pt: 1, pb: 0.5 }}>
              {totalUnitsSold === 0 ? (
                <Box sx={{ my: 'auto', textAlign: 'center', py: 3, color: 'text.secondary' }}>
                  <TrendingUpIcon sx={{ fontSize: 32, opacity: 0.3, mb: 0.5 }} />
                  <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.82rem' }}>
                    No sales recorded in {MONTH_NAMES[selectedMonth]} {selectedYear}.
                  </Typography>
                  <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>
                    Daily activity will plot automatically as units are sold.
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
                      const count = daySalesMap[dayNum]?.length || 0;
                      const maxPossible = Math.max(1, peakDayInfo.maxUnits);
                      const barHeightPercent = count > 0 ? Math.max(18, (count / maxPossible) * 100) : 0;
                      const isHovered = hoveredDay === dayNum;

                      return (
                        <Tooltip
                          key={`plot-${dayNum}`}
                          title={`Day ${dayNum}: ${count} unit(s) sold`}
                          arrow
                        >
                          <Box
                            onMouseEnter={() => setHoveredDay(dayNum)}
                            onMouseLeave={() => setHoveredDay(null)}
                            onClick={() => count > 0 && setSelectedDayModal({ day: dayNum, sales: daySalesMap[dayNum] })}
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
                                  fontSize: '0.58rem',
                                  color: isHovered ? 'primary.main' : '#10B981',
                                  mb: 0.2,
                                  lineHeight: 1
                                }}
                              >
                                {count}
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
                                    : '#10B981'
                                  : 'transparent',
                                transition: 'all 0.2s',
                                transform: isHovered && count > 0 ? 'scaleY(1.05)' : 'none',
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
                Distribution:
              </Typography>
              <Stack direction="row" spacing={0.75} flexWrap="wrap" sx={{ gap: 0.5 }}>
                <Chip
                  label={`Early (1-10): ${earlyMonthUnits}u`}
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
                  label={`Mid (11-20): ${midMonthUnits}u`}
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
                  label={`Late (21-${daysInMonth}): ${lateMonthUnits}u`}
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

      {/* 4. Detailed Sales Ledger for the Month */}
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
              Sold Devices Ledger ({filteredSalesLedger.length})
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Units sold in {MONTH_NAMES[selectedMonth]} {selectedYear}
            </Typography>
          </Box>

          <Box sx={{ width: { xs: '100%', sm: 280 } }}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search model, IMEI..."
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

        {filteredSalesLedger.length === 0 ? (
          <Box sx={{ py: 4, textAlign: 'center', color: 'text.secondary' }}>
            <CalendarIcon sx={{ fontSize: 36, opacity: 0.4, mb: 1 }} />
            <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.85rem' }}>
              No sales records found for {MONTH_NAMES[selectedMonth]} {selectedYear}.
            </Typography>
            <Typography variant="caption" sx={{ fontSize: '0.72rem' }}>
              Use the month selector above to view other periods.
            </Typography>
          </Box>
        ) : (
          <>
            {/* MOBILE CARD VIEW (xs only) */}
            <Box sx={{ display: { xs: 'flex', sm: 'none' }, flexDirection: 'column', gap: 1.25 }}>
              {filteredSalesLedger.map((sale) => {
                const specsParts = [
                  sale.device_capacity || '',
                  sale.device_color || '',
                  sale.device_variant || ''
                ].filter(Boolean);
                const specsText = specsParts.join(' • ');

                return (
                  <Paper
                    key={`mob-sale-${sale.id || Math.random()}`}
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
                    {/* Top row: Model & Payment Method */}
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1 }}>
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography variant="subtitle2" fontWeight={800} noWrap>
                          {sale.device_model || 'Standard Device'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
                          {specsText || '—'}
                        </Typography>
                      </Box>
                      <Chip
                        label={sale.payment_method || 'CASH'}
                        size="small"
                        sx={{
                          fontWeight: 700,
                          fontSize: '0.68rem',
                          height: 22,
                          borderRadius: 1.2,
                          bgcolor: (t) => (t.palette.mode === 'dark' ? 'rgba(59, 130, 246, 0.15)' : '#EFF6FF'),
                          color: (t) => (t.palette.mode === 'dark' ? '#93C5FD' : '#1D4ED8'),
                          border: '1px solid',
                          borderColor: (t) => (t.palette.mode === 'dark' ? 'rgba(59, 130, 246, 0.3)' : '#BFDBFE')
                        }}
                      />
                    </Box>

                    {/* Middle row: IMEI & Battery Health */}
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 0.75, pt: 0.3 }}>
                      <CopyableText text={sale.device_imei} />
                      {sale.device_battery_health ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <BatteryIcon sx={{ fontSize: 14, color: Number(sale.device_battery_health) >= 80 ? '#10B981' : '#F59E0B' }} />
                          <Typography variant="caption" fontWeight={700} sx={{ color: Number(sale.device_battery_health) >= 80 ? 'success.main' : 'warning.main', fontSize: '0.72rem' }}>
                            {sale.device_battery_health}% {sale.device_battery_cycle ? `(${sale.device_battery_cycle} CC)` : ''}
                          </Typography>
                        </Box>
                      ) : (
                        <Typography variant="caption" color="text.disabled">—</Typography>
                      )}
                    </Box>

                    {/* Bottom row: Sale Date */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, borderTop: 1, borderColor: 'divider', pt: 0.6 }}>
                      <TimeIcon sx={{ fontSize: 13, color: 'text.secondary' }} />
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                        Sold on {formatDate(sale.sale_date || sale.created_at)}
                      </Typography>
                    </Box>
                  </Paper>
                );
              })}
            </Box>

            {/* DESKTOP/TABLET TABLE VIEW (sm and up) */}
            <TableContainer sx={{ display: { xs: 'none', sm: 'block' } }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: 'action.hover' }}>
                    <TableCell sx={{ fontWeight: 700 }}>Model & Specs</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>IMEI Number</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Battery Health</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Sale Date</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="right">Payment Method</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredSalesLedger.map((sale) => {
                    const specsParts = [
                      sale.device_capacity || '',
                      sale.device_color || '',
                      sale.device_variant || ''
                    ].filter(Boolean);
                    const specsText = specsParts.join(' • ');

                    return (
                      <TableRow key={sale.id || Math.random()} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight={700}>
                            {sale.device_model || 'Standard Device'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
                            {specsText || '—'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <CopyableText text={sale.device_imei} />
                        </TableCell>
                        <TableCell>
                          {sale.device_battery_health ? (
                            <Box>
                              <Typography variant="body2" fontWeight={700} sx={{ color: Number(sale.device_battery_health) >= 80 ? 'success.main' : 'warning.main' }}>
                                {sale.device_battery_health}%
                              </Typography>
                              {sale.device_battery_cycle ? (
                                <Typography variant="caption" color="text.secondary">
                                  {sale.device_battery_cycle} cycles
                                </Typography>
                              ) : null}
                            </Box>
                          ) : (
                            <Typography variant="caption" color="text.disabled">
                              —
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight={600}>
                            {formatDate(sale.sale_date || sale.created_at)}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Chip
                            label={sale.payment_method || 'CASH'}
                            size="small"
                            sx={{
                              fontWeight: 700,
                              fontSize: '0.72rem',
                              height: 24,
                              borderRadius: 1.5,
                              bgcolor: (t) => (t.palette.mode === 'dark' ? 'rgba(59, 130, 246, 0.15)' : '#EFF6FF'),
                              color: (t) => (t.palette.mode === 'dark' ? '#93C5FD' : '#1D4ED8'),
                              border: '1px solid',
                              borderColor: (t) => (t.palette.mode === 'dark' ? 'rgba(59, 130, 246, 0.3)' : '#BFDBFE')
                            }}
                          />
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

      {/* 5. Day Sales Inspection Modal (Mobile-Optimized) */}
      <Dialog
        open={Boolean(selectedDayModal)}
        onClose={() => setSelectedDayModal(null)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: { xs: 2, sm: 3 }, p: 0.5, m: { xs: 1.5, sm: 2 } } }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1.2, px: { xs: 1.5, sm: 2 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0, flex: 1, pr: 1 }}>
            <CheckCircleIcon sx={{ color: '#10B981', fontSize: 20, flexShrink: 0 }} />
            <Typography variant="subtitle1" fontWeight={800} noWrap sx={{ fontSize: { xs: '0.88rem', sm: '1.05rem' } }}>
              {selectedDayModal?.day} {MONTH_NAMES[selectedMonth]} {selectedYear}
            </Typography>
            <Chip
              label={`${selectedDayModal?.sales?.length || 0} ${selectedDayModal?.sales?.length === 1 ? 'Unit' : 'Units'}`}
              size="small"
              color="success"
              sx={{ fontWeight: 800, fontSize: '0.68rem', height: 22, borderRadius: 1.2, flexShrink: 0 }}
            />
          </Box>
          <IconButton size="small" onClick={() => setSelectedDayModal(null)}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ p: { xs: 1.5, sm: 2 } }}>
          <Stack spacing={1.25}>
            {selectedDayModal?.sales?.map((sale) => {
              const specsParts = [
                sale.device_capacity || '',
                sale.device_color || '',
                sale.device_variant || ''
              ].filter(Boolean);
              const specsText = specsParts.join(' • ');

              return (
                <Paper
                  key={sale.id}
                  variant="outlined"
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    bgcolor: (t) => (t.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : '#F8FAFC'),
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 0.6
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography variant="subtitle2" fontWeight={800} noWrap>
                        {sale.device_model}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {specsText || '—'}
                      </Typography>
                    </Box>
                    <Chip
                      label={sale.payment_method || 'CASH'}
                      size="small"
                      sx={{ fontWeight: 700, fontSize: '0.68rem', height: 22 }}
                    />
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 0.75, pt: 0.2 }}>
                    <CopyableText text={sale.device_imei} />
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {sale.device_battery_health && (
                        <Typography variant="caption" fontWeight={700} sx={{ color: 'success.main', fontSize: '0.72rem' }}>
                          BH {sale.device_battery_health}% {sale.device_battery_cycle ? `(${sale.device_battery_cycle} CC)` : ''}
                        </Typography>
                      )}
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.68rem' }}>
                        {formatDate(sale.sale_date || sale.created_at)}
                      </Typography>
                    </Box>
                  </Box>
                </Paper>
              );
            })}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: { xs: 1.5, sm: 2.5 }, py: 1.2 }}>
          <Button variant="contained" onClick={() => setSelectedDayModal(null)} fullWidth sx={{ borderRadius: 2 }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
