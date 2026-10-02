import React, { useState, useMemo } from 'react';
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
  useTheme
} from '@mui/material';
import {
  CalendarMonth as CalendarIcon,
  LocalShipping as ShippingIcon,
  BarChart as BarChartIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  CheckCircle as CheckCircleIcon,
  Close as CloseIcon,
  Whatshot as FireIcon,
  Inventory2 as BoxIcon,
  OpenInNew as OpenInNewIcon,
  Business as SupplierIcon,
  Search as SearchIcon,
  AccessTime as TimeIcon
} from '@mui/icons-material';
import StatusBadge from '../common/StatusBadge';
import CopyableText from '../common/CopyableText';
import { formatDate } from '../../utils/formatters';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function ShipmentInflowAnalytics({ shipments = [], onSelectShipment }) {
  const theme = useTheme();

  const today = new Date();
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth()); // 0-indexed
  const [dateField, setDateField] = useState('received_date_bd'); // 'received_date_bd' | 'shipping_date'
  const [searchQuery, setSearchQuery] = useState('');

  const [hoveredDay, setHoveredDay] = useState(null);
  const [selectedDayModal, setSelectedDayModal] = useState(null);

  // Filter shipments matching the selected month and year based on selected dateField
  const monthShipments = useMemo(() => {
    if (!Array.isArray(shipments)) return [];
    return shipments.filter((s) => {
      const rawDate = s[dateField] || (dateField === 'received_date_bd' ? s.created_at : null);
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
  }, [shipments, selectedYear, selectedMonth, dateField]);

  // Total days in selected month
  const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
  const firstDayWeekday = new Date(selectedYear, selectedMonth, 1).getDay();

  // Group shipments by day (1 to daysInMonth)
  const dayShipmentsMap = useMemo(() => {
    const map = {};
    for (let day = 1; day <= daysInMonth; day++) {
      map[day] = [];
    }

    monthShipments.forEach((s) => {
      const rawDate = s[dateField] || (dateField === 'received_date_bd' ? s.created_at : null);
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
          map[dayNum].push(s);
        }
      }
    });

    return map;
  }, [monthShipments, daysInMonth, dateField]);

  // Aggregate stats
  const totalBatches = monthShipments.length;
  const totalDevices = useMemo(() => {
    return monthShipments.reduce((sum, s) => sum + (s.devices_count || 0), 0);
  }, [monthShipments]);

  // 10-Day Volume Breakdowns (Device counts)
  const earlyMonthDevices = useMemo(() => {
    let count = 0;
    for (let day = 1; day <= Math.min(10, daysInMonth); day++) {
      (dayShipmentsMap[day] || []).forEach((s) => {
        count += s.devices_count || 0;
      });
    }
    return count;
  }, [dayShipmentsMap, daysInMonth]);

  const midMonthDevices = useMemo(() => {
    let count = 0;
    for (let day = 11; day <= Math.min(20, daysInMonth); day++) {
      (dayShipmentsMap[day] || []).forEach((s) => {
        count += s.devices_count || 0;
      });
    }
    return count;
  }, [dayShipmentsMap, daysInMonth]);

  const lateMonthDevices = useMemo(() => {
    let count = 0;
    for (let day = 21; day <= daysInMonth; day++) {
      (dayShipmentsMap[day] || []).forEach((s) => {
        count += s.devices_count || 0;
      });
    }
    return count;
  }, [dayShipmentsMap, daysInMonth]);

  // Active Arrival Days
  const activeArrivalDaysCount = useMemo(() => {
    let active = 0;
    for (let day = 1; day <= daysInMonth; day++) {
      if (dayShipmentsMap[day]?.length > 0) active++;
    }
    return active;
  }, [dayShipmentsMap, daysInMonth]);

  // Peak Day Calculation
  const peakDayInfo = useMemo(() => {
    let maxDevices = 0;
    let peakDays = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const dayList = dayShipmentsMap[day] || [];
      const dayDeviceCount = dayList.reduce((sum, s) => sum + (s.devices_count || 0), 0);
      if (dayDeviceCount > maxDevices) {
        maxDevices = dayDeviceCount;
        peakDays = [day];
      } else if (dayDeviceCount === maxDevices && dayDeviceCount > 0) {
        peakDays.push(day);
      }
    }
    return { maxDevices, peakDays };
  }, [dayShipmentsMap, daysInMonth]);

  // Filtered shipments for ledger table
  const filteredLedger = useMemo(() => {
    if (!searchQuery.trim()) return monthShipments;
    const q = searchQuery.toLowerCase().trim();
    return monthShipments.filter(
      (s) =>
        s.supplier_name?.toLowerCase().includes(q) ||
        s.shipping_company?.toLowerCase().includes(q) ||
        s.tracking_number?.toLowerCase().includes(q)
    );
  }, [monthShipments, searchQuery]);

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
      {/* 1. Header Toolbar with Month Selector & Date Dimension Toggle */}
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
              width: { xs: 38, sm: 44 },
              height: { xs: 38, sm: 44 },
              borderRadius: 2,
              bgcolor: '#6366F1',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(99, 102, 241, 0.35)',
              flexShrink: 0
            }}
          >
            <ShippingIcon sx={{ fontSize: { xs: 22, sm: 26 } }} />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h6" fontWeight={800} sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }} noWrap>
              Inbound Shipment Analytics
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.74rem', sm: '0.82rem' } }}>
              Arrival calendar & cargo volume distribution across {MONTH_NAMES[selectedMonth]} {selectedYear}
            </Typography>
          </Box>
        </Box>

        {/* Right Controls: Date Type Toggle + Month Navigator */}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems="center" sx={{ width: { xs: '100%', md: 'auto' } }}>
          {/* Dimension Toggle: Received in BD vs Shipped from China */}
          <ToggleButtonGroup
            value={dateField}
            exclusive
            onChange={(_, val) => val && setDateField(val)}
            size="small"
            sx={{
              bgcolor: 'action.hover',
              p: 0.3,
              borderRadius: 2,
              width: { xs: '100%', sm: 'auto' },
              '& .MuiToggleButton-root': {
                border: 'none',
                borderRadius: 1.5,
                px: 1.2,
                py: 0.5,
                fontWeight: 700,
                fontSize: '0.74rem',
                textTransform: 'none',
                flex: { xs: 1, sm: 'initial' },
                '&.Mui-selected': {
                  bgcolor: 'background.paper',
                  color: '#6366F1',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.08)'
                }
              }
            }}
          >
            <ToggleButton value="received_date_bd">
              🇧🇩 Received in BD
            </ToggleButton>
            <ToggleButton value="shipping_date">
              🇨🇳 Dispatched Date
            </ToggleButton>
          </ToggleButtonGroup>

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
        {/* Total Devices & Batches */}
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
                Monthly Inflow
              </Typography>
              <Box sx={{ p: 0.6, borderRadius: 1.2, bgcolor: 'rgba(99, 102, 241, 0.1)', color: '#6366F1' }}>
                <BoxIcon sx={{ fontSize: 16 }} />
              </Box>
            </Box>
            <Typography variant="h4" fontWeight={800} sx={{ color: '#6366F1', my: 0.25, fontSize: { xs: '1.45rem', sm: '1.85rem' } }}>
              {totalDevices} <Typography component="span" variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>Devices</Typography>
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.68rem' }} noWrap>
              {totalBatches} {totalBatches === 1 ? 'batch' : 'batches'} in {MONTH_NAMES[selectedMonth].slice(0, 3)} {selectedYear}
            </Typography>
          </Card>
        </Grid>

        {/* Arrival Days & Frequency */}
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
                Arrival Days
              </Typography>
              <Box sx={{ p: 0.6, borderRadius: 1.2, bgcolor: 'rgba(59, 130, 246, 0.1)', color: '#2563EB' }}>
                <CalendarIcon sx={{ fontSize: 16 }} />
              </Box>
            </Box>
            <Box sx={{ my: 0.25, display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
              <Typography variant="h4" fontWeight={800} sx={{ color: '#2563EB', fontSize: { xs: '1.45rem', sm: '1.85rem' } }}>
                {activeArrivalDaysCount} <Typography component="span" variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>Days</Typography>
              </Typography>
              <Chip
                label={activeArrivalDaysCount >= 3 ? 'Regular Inflow' : 'Intermittent'}
                size="small"
                sx={{
                  fontWeight: 700,
                  fontSize: '0.62rem',
                  height: 18,
                  bgcolor: activeArrivalDaysCount >= 3 ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                  color: activeArrivalDaysCount >= 3 ? '#10B981' : '#F59E0B',
                  borderRadius: 1
                }}
              />
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.68rem' }} noWrap>
              Active delivery days out of {daysInMonth}
            </Typography>
          </Card>
        </Grid>

        {/* 10-Day Volume Breakdown */}
        <Grid item xs={12} md={6}>
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
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="caption" fontWeight={800} color="text.secondary" textTransform="uppercase" sx={{ fontSize: '0.65rem' }}>
                10-Day Inflow Volume (Devices)
              </Typography>
              <Typography variant="caption" fontWeight={700} color="#6366F1" sx={{ fontSize: '0.7rem' }}>
                {MONTH_NAMES[selectedMonth]} Inflow
              </Typography>
            </Box>

            <Grid container spacing={1}>
              {/* Early Month (1-10) */}
              <Grid item xs={4}>
                <Paper
                  variant="outlined"
                  sx={{
                    p: { xs: 0.8, sm: 1 },
                    borderRadius: 1.75,
                    bgcolor: (t) => (t.palette.mode === 'dark' ? 'rgba(59, 130, 246, 0.08)' : '#EFF6FF'),
                    borderColor: 'rgba(59, 130, 246, 0.3)',
                    textAlign: 'center'
                  }}
                >
                  <Typography variant="caption" color="text.secondary" fontWeight={700} display="block" sx={{ fontSize: '0.62rem' }}>
                    Days 1 – 10
                  </Typography>
                  <Typography variant="h6" fontWeight={800} color="#2563EB" sx={{ fontSize: { xs: '0.95rem', sm: '1.15rem' } }}>
                    {earlyMonthDevices}
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
                    p: { xs: 0.8, sm: 1 },
                    borderRadius: 1.75,
                    bgcolor: (t) => (t.palette.mode === 'dark' ? 'rgba(99, 102, 241, 0.08)' : '#EEF2FF'),
                    borderColor: 'rgba(99, 102, 241, 0.3)',
                    textAlign: 'center'
                  }}
                >
                  <Typography variant="caption" color="text.secondary" fontWeight={700} display="block" sx={{ fontSize: '0.62rem' }}>
                    Days 11 – 20
                  </Typography>
                  <Typography variant="h6" fontWeight={800} color="#6366F1" sx={{ fontSize: { xs: '0.95rem', sm: '1.15rem' } }}>
                    {midMonthDevices}
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
                    p: { xs: 0.8, sm: 1 },
                    borderRadius: 1.75,
                    bgcolor: (t) => (t.palette.mode === 'dark' ? 'rgba(16, 185, 129, 0.08)' : '#ECFDF5'),
                    borderColor: 'rgba(16, 185, 129, 0.3)',
                    textAlign: 'center'
                  }}
                >
                  <Typography variant="caption" color="text.secondary" fontWeight={700} display="block" sx={{ fontSize: '0.62rem' }}>
                    Days 21 – {daysInMonth}
                  </Typography>
                  <Typography variant="h6" fontWeight={800} color="#059669" sx={{ fontSize: { xs: '0.95rem', sm: '1.15rem' } }}>
                    {lateMonthDevices}
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
                <CalendarIcon sx={{ color: '#6366F1', fontSize: 19 }} />
                <Typography variant="subtitle2" fontWeight={800} sx={{ fontSize: { xs: '0.85rem', sm: '0.95rem' } }}>
                  {MONTH_NAMES[selectedMonth]} {selectedYear}
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#6366F1' }} />
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.68rem' }}>Arrived</Typography>
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
                const dayBatches = dayShipmentsMap[dayNum] || [];
                const hasShipments = dayBatches.length > 0;
                const dayDeviceCount = dayBatches.reduce((acc, s) => acc + (s.devices_count || 0), 0);
                const isToday =
                  today.getFullYear() === selectedYear &&
                  today.getMonth() === selectedMonth &&
                  today.getDate() === dayNum;
                const isHovered = hoveredDay === dayNum;

                return (
                  <Grid item xs={12 / 7} key={`day-${dayNum}`}>
                    <Tooltip
                      title={
                        hasShipments
                          ? `Day ${dayNum}: ${dayBatches.length} batch (${dayDeviceCount} devices) — Click to view`
                          : `Day ${dayNum}: No inbound shipments`
                      }
                      arrow
                    >
                      <Paper
                        variant="outlined"
                        onMouseEnter={() => setHoveredDay(dayNum)}
                        onMouseLeave={() => setHoveredDay(null)}
                        onClick={() => hasShipments && setSelectedDayModal({ day: dayNum, batches: dayBatches, totalDevices: dayDeviceCount })}
                        sx={{
                          height: { xs: 34, sm: 38 },
                          p: 0.3,
                          borderRadius: 1.75,
                          cursor: hasShipments ? 'pointer' : 'default',
                          border: '1px solid',
                          borderColor: isHovered
                            ? '#2563EB'
                            : hasShipments
                            ? '#6366F1'
                            : isToday
                            ? 'primary.main'
                            : 'divider',
                          bgcolor: isHovered
                            ? (t) => (t.palette.mode === 'dark' ? 'rgba(37, 99, 235, 0.35)' : '#DBEAFE')
                            : hasShipments
                            ? (t) => (t.palette.mode === 'dark' ? 'rgba(99, 102, 241, 0.22)' : '#EEF2FF')
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
                            : hasShipments
                            ? '0 2px 6px rgba(99, 102, 241, 0.2)'
                            : 'none',
                          zIndex: isHovered ? 2 : 1
                        }}
                      >
                        <Typography
                          variant="caption"
                          fontWeight={isHovered || hasShipments || isToday ? 800 : 500}
                          sx={{
                            fontSize: { xs: '0.72rem', sm: '0.78rem' },
                            lineHeight: 1,
                            color: isHovered
                              ? '#1D4ED8'
                              : hasShipments
                              ? '#4F46E5'
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

        {/* RIGHT COLUMN: Daily Inflow Volume Plot Graph */}
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
            {/* Top Graph Header */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5, flexWrap: 'wrap', gap: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <BarChartIcon sx={{ color: '#6366F1', fontSize: 20 }} />
                <Typography variant="subtitle2" fontWeight={800} sx={{ fontSize: { xs: '0.85rem', sm: '0.95rem' } }}>
                  Daily Inbound Cargo Plot (Units)
                </Typography>
              </Box>

              {peakDayInfo.maxDevices > 0 && (
                <Chip
                  icon={<FireIcon sx={{ fontSize: '13px !important', color: '#F59E0B' }} />}
                  label={`Peak Inflow: ${peakDayInfo.maxDevices} units (Day ${peakDayInfo.peakDays.join(', ')})`}
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
              {totalDevices === 0 ? (
                <Box sx={{ my: 'auto', textAlign: 'center', py: 3, color: 'text.secondary' }}>
                  <ShippingIcon sx={{ fontSize: 32, opacity: 0.3, mb: 0.5 }} />
                  <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.82rem' }}>
                    No shipments received in {MONTH_NAMES[selectedMonth]} {selectedYear}.
                  </Typography>
                  <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>
                    Cargo arrivals will plot automatically as batches arrive.
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
                      const dayBatches = dayShipmentsMap[dayNum] || [];
                      const count = dayBatches.reduce((acc, s) => acc + (s.devices_count || 0), 0);
                      const maxPossible = Math.max(1, peakDayInfo.maxDevices);
                      const barHeightPercent = count > 0 ? Math.max(18, (count / maxPossible) * 100) : 0;
                      const isHovered = hoveredDay === dayNum;

                      return (
                        <Tooltip
                          key={`shipment-plot-${dayNum}`}
                          title={`Day ${dayNum}: ${dayBatches.length} batch (${count} devices)`}
                          arrow
                        >
                          <Box
                            onMouseEnter={() => setHoveredDay(dayNum)}
                            onMouseLeave={() => setHoveredDay(null)}
                            onClick={() => count > 0 && setSelectedDayModal({ day: dayNum, batches: dayBatches, totalDevices: count })}
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
                                  color: isHovered ? '#2563EB' : '#6366F1',
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
                                    : '#6366F1'
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
                Inflow Phases:
              </Typography>
              <Stack direction="row" spacing={0.75} flexWrap="wrap" sx={{ gap: 0.5 }}>
                <Chip
                  label={`Early (1-10): ${earlyMonthDevices} devices`}
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
                  label={`Mid (11-20): ${midMonthDevices} devices`}
                  size="small"
                  sx={{
                    fontWeight: 700,
                    fontSize: '0.65rem',
                    height: 22,
                    bgcolor: (t) => (t.palette.mode === 'dark' ? 'rgba(99, 102, 241, 0.12)' : '#EEF2FF'),
                    color: '#6366F1',
                    borderRadius: 1
                  }}
                />
                <Chip
                  label={`Late (21-${daysInMonth}): ${lateMonthDevices} devices`}
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

      {/* 4. Detailed Monthly Inbound Shipments Ledger */}
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
              Monthly Inbound Batches Ledger ({filteredLedger.length})
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Batches received in {MONTH_NAMES[selectedMonth]} {selectedYear}
            </Typography>
          </Box>

          <Box sx={{ width: { xs: '100%', sm: 280 } }}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search supplier, tracking..."
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
            <ShippingIcon sx={{ fontSize: 36, opacity: 0.4, mb: 1 }} />
            <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.85rem' }}>
              No shipment records found for {MONTH_NAMES[selectedMonth]} {selectedYear}.
            </Typography>
            <Typography variant="caption" sx={{ fontSize: '0.72rem' }}>
              Switch months or date criteria above.
            </Typography>
          </Box>
        ) : (
          <>
            {/* MOBILE VIEW */}
            <Box sx={{ display: { xs: 'flex', sm: 'none' }, flexDirection: 'column', gap: 1.25 }}>
              {filteredLedger.map((s) => (
                <Paper
                  key={`mob-shipment-${s.id}`}
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
                        {s.supplier_name || 'International Supplier'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Carrier: {s.shipping_company || 'Standard Cargo'}
                      </Typography>
                    </Box>
                    <StatusBadge status={s.status} />
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 0.75, pt: 0.3 }}>
                    <CopyableText text={s.tracking_number} />
                    <Chip
                      label={`${s.devices_count || 0} Units`}
                      size="small"
                      sx={{ fontWeight: 700, fontSize: '0.7rem', height: 22 }}
                    />
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: 1, borderColor: 'divider', pt: 0.6 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                      Received: {formatDate(s.received_date_bd || s.created_at)}
                    </Typography>

                    {onSelectShipment && (
                      <Button
                        size="small"
                        variant="outlined"
                        endIcon={<OpenInNewIcon sx={{ fontSize: '13px !important' }} />}
                        onClick={() => onSelectShipment(s)}
                        sx={{ fontSize: '0.72rem', py: 0.2, px: 1, borderRadius: 1.5, textTransform: 'none', fontWeight: 700 }}
                      >
                        View
                      </Button>
                    )}
                  </Box>
                </Paper>
              ))}
            </Box>

            {/* DESKTOP TABLE VIEW */}
            <TableContainer sx={{ display: { xs: 'none', sm: 'block' } }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: 'action.hover' }}>
                    <TableCell sx={{ fontWeight: 700 }}>Supplier & Carrier</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Tracking Number</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Device Volume</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Received in BD</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredLedger.map((s) => (
                    <TableRow key={`shipment-row-${s.id}`} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight={700}>
                          {s.supplier_name || 'International Supplier'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {s.shipping_company || 'Standard Cargo'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <CopyableText text={s.tracking_number} />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={700}>
                          {s.devices_count || 0} Total
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {s.received_devices_count || 0} received • {s.pending_devices_count || 0} pending
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>
                          {formatDate(s.received_date_bd || s.created_at)}
                        </Typography>
                        {s.shipping_date && (
                          <Typography variant="caption" color="text.secondary">
                            Shipped: {formatDate(s.shipping_date)}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={s.status} />
                      </TableCell>
                      <TableCell align="right">
                        {onSelectShipment && (
                          <Button
                            size="small"
                            variant="outlined"
                            endIcon={<OpenInNewIcon sx={{ fontSize: '13px !important' }} />}
                            onClick={() => onSelectShipment(s)}
                            sx={{
                              fontSize: '0.72rem',
                              py: 0.3,
                              px: 1.2,
                              borderRadius: 1.5,
                              textTransform: 'none',
                              fontWeight: 700
                            }}
                          >
                            Details
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        )}
      </Paper>

      {/* 5. Day Shipments Inspection Modal */}
      <Dialog
        open={Boolean(selectedDayModal)}
        onClose={() => setSelectedDayModal(null)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: { xs: 2, sm: 3 }, p: 0.5, m: { xs: 1.5, sm: 2 } } }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1.2, px: { xs: 1.5, sm: 2 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0, flex: 1, pr: 1 }}>
            <CheckCircleIcon sx={{ color: '#6366F1', fontSize: 20, flexShrink: 0 }} />
            <Typography variant="subtitle1" fontWeight={800} noWrap sx={{ fontSize: { xs: '0.88rem', sm: '1.05rem' } }}>
              Inbound Batches: {selectedDayModal?.day} {MONTH_NAMES[selectedMonth]} {selectedYear}
            </Typography>
            <Chip
              label={`${selectedDayModal?.totalDevices || 0} Devices`}
              size="small"
              sx={{ fontWeight: 800, fontSize: '0.68rem', height: 22, bgcolor: '#EEF2FF', color: '#6366F1', borderRadius: 1.2, flexShrink: 0 }}
            />
          </Box>
          <IconButton size="small" onClick={() => setSelectedDayModal(null)}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ p: { xs: 1.5, sm: 2 } }}>
          <Stack spacing={1.5}>
            {selectedDayModal?.batches?.map((batch) => (
              <Paper
                key={`modal-batch-${batch.id}`}
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
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography variant="subtitle2" fontWeight={800} noWrap>
                      {batch.supplier_name || 'International Supplier'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Carrier: {batch.shipping_company || 'Standard Air Cargo'}
                    </Typography>
                  </Box>
                  <StatusBadge status={batch.status} />
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1, pt: 0.3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CopyableText text={batch.tracking_number} />
                    <Chip
                      label={`${batch.devices_count || 0} Units`}
                      size="small"
                      sx={{ fontWeight: 700, fontSize: '0.7rem', height: 20 }}
                    />
                  </Box>

                  {onSelectShipment && (
                    <Button
                      size="small"
                      variant="outlined"
                      endIcon={<OpenInNewIcon sx={{ fontSize: '13px !important' }} />}
                      onClick={() => {
                        setSelectedDayModal(null);
                        onSelectShipment(batch);
                      }}
                      sx={{
                        fontSize: '0.72rem',
                        py: 0.3,
                        px: 1,
                        borderRadius: 1.5,
                        textTransform: 'none',
                        fontWeight: 700
                      }}
                    >
                      View Batch
                    </Button>
                  )}
                </Box>
              </Paper>
            ))}
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
