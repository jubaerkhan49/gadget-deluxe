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
  Smartphone as PhoneIcon,
  OpenInNew as OpenInNewIcon,
  Search as SearchIcon,
  AccessTime as TimeIcon,
  BatteryChargingFull as BatteryIcon,
  QrCode as QrCodeIcon,
  ContentCopy as CopyIcon,
  Business as SupplierIcon
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { deviceApi, shipmentApi } from '../../api/client';
import { apiCache } from '../../utils/apiCache';
import StatusBadge from '../common/StatusBadge';
import VariantBadge from '../common/VariantBadge';
import CopyableText from '../common/CopyableText';
import { formatDate } from '../../utils/formatters';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function ShipmentInflowAnalytics({ shipments: initialShipments = [], onSelectShipment, onSelectDevice }) {
  const theme = useTheme();
  const { enqueueSnackbar } = useSnackbar();

  const cachedDevices = apiCache.get('/api/devices/');
  const cachedShipments = apiCache.get('/api/shipments/');

  const [devices, setDevices] = useState(() => cachedDevices?.results || cachedDevices || []);
  const [shipments, setShipments] = useState(() => initialShipments?.length ? initialShipments : (cachedShipments?.results || cachedShipments || []));
  const [loading, setLoading] = useState(() => !cachedDevices);

  const today = new Date();
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth()); // 0-indexed
  const [dateField, setDateField] = useState('BD'); // 'BD' (received_date_bd) | 'CN' (shipment_receive_date_cn)
  const [searchQuery, setSearchQuery] = useState('');

  const [hoveredDay, setHoveredDay] = useState(null);
  const [selectedDayModal, setSelectedDayModal] = useState(null);

  // Fetch full device dataset for accurate received_date_bd counts
  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      try {
        if (!cachedDevices) setLoading(true);
        const [devRes, shipRes] = await Promise.all([
          deviceApi.getAll(),
          initialShipments.length ? Promise.resolve({ data: initialShipments }) : shipmentApi.getAll()
        ]);
        const freshDevs = devRes.data?.results || devRes.data || [];
        const freshShips = shipRes.data?.results || shipRes.data || [];

        apiCache.set('/api/devices/', freshDevs);
        apiCache.set('/api/shipments/', freshShips);

        if (isMounted) {
          setDevices(freshDevs);
          setShipments(freshShips);
        }
      } catch (err) {
        console.error('Failed to load devices for inflow analytics:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadData();
    return () => { isMounted = false; };
  }, []);

  // Shipment lookup map by ID
  const shipmentMap = useMemo(() => {
    const map = {};
    shipments.forEach((s) => {
      map[s.id] = s;
    });
    return map;
  }, [shipments]);

  // Helper to extract exact received date string (YYYY-MM-DD) for a device
  const getDeviceDateStr = (dev) => {
    if (dateField === 'BD') {
      if (dev.received_date_bd) {
        return String(dev.received_date_bd).trim().slice(0, 10);
      }
      const s = dev.current_shipment ? shipmentMap[dev.current_shipment] : null;
      if (s && s.received_date_bd && (s.status === 'RECEIVED_BD' || s.status === 'STOCKED' || s.status === 'ARCHIVED')) {
        return String(s.received_date_bd).trim().slice(0, 10);
      }
      return null;
    } else {
      if (dev.shipment_receive_date_cn) {
        return String(dev.shipment_receive_date_cn).trim().slice(0, 10);
      }
      const s = dev.current_shipment ? shipmentMap[dev.current_shipment] : null;
      if (s && (s.receive_date || s.shipping_date)) {
        return String(s.receive_date || s.shipping_date).trim().slice(0, 10);
      }
      return null;
    }
  };

  // Filter devices received in the selected month & year
  const monthDevices = useMemo(() => {
    if (!Array.isArray(devices)) return [];
    return devices.filter((dev) => {
      const dateStr = getDeviceDateStr(dev);
      if (!dateStr || !/^\d{4}-\d{2}-\d{2}/.test(dateStr)) return false;
      const parts = dateStr.slice(0, 10).split('-').map(Number);
      const d = new Date(parts[0], parts[1] - 1, parts[2]);
      if (isNaN(d.getTime())) return false;
      return d.getFullYear() === selectedYear && d.getMonth() === selectedMonth;
    });
  }, [devices, selectedYear, selectedMonth, dateField, shipmentMap]);

  // Total days in selected month
  const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
  const firstDayWeekday = new Date(selectedYear, selectedMonth, 1).getDay();

  // Group devices by day (1 to daysInMonth)
  const dayDevicesMap = useMemo(() => {
    const map = {};
    for (let day = 1; day <= daysInMonth; day++) {
      map[day] = [];
    }

    monthDevices.forEach((dev) => {
      const dateStr = getDeviceDateStr(dev);
      if (!dateStr) return;
      const parts = dateStr.slice(0, 10).split('-').map(Number);
      const d = new Date(parts[0], parts[1] - 1, parts[2]);
      if (!isNaN(d.getTime())) {
        const dayNum = d.getDate();
        if (map[dayNum]) {
          map[dayNum].push(dev);
        }
      }
    });

    return map;
  }, [monthDevices, daysInMonth, dateField, shipmentMap]);

  // Aggregate stats
  const totalReceivedDevices = monthDevices.length;

  // Distinct batches represented by these received devices
  const activeBatchesCount = useMemo(() => {
    const batchSet = new Set();
    monthDevices.forEach((d) => {
      if (d.current_shipment) batchSet.add(d.current_shipment);
      else if (d.shipment_tracking) batchSet.add(d.shipment_tracking);
    });
    return batchSet.size;
  }, [monthDevices]);

  // 10-Day Volume Breakdowns (Exact devices received)
  const earlyMonthDevices = useMemo(() => {
    let count = 0;
    for (let day = 1; day <= Math.min(10, daysInMonth); day++) {
      count += (dayDevicesMap[day] || []).length;
    }
    return count;
  }, [dayDevicesMap, daysInMonth]);

  const midMonthDevices = useMemo(() => {
    let count = 0;
    for (let day = 11; day <= Math.min(20, daysInMonth); day++) {
      count += (dayDevicesMap[day] || []).length;
    }
    return count;
  }, [dayDevicesMap, daysInMonth]);

  const lateMonthDevices = useMemo(() => {
    let count = 0;
    for (let day = 21; day <= daysInMonth; day++) {
      count += (dayDevicesMap[day] || []).length;
    }
    return count;
  }, [dayDevicesMap, daysInMonth]);

  // Active Reception Days
  const activeArrivalDaysCount = useMemo(() => {
    let active = 0;
    for (let day = 1; day <= daysInMonth; day++) {
      if (dayDevicesMap[day]?.length > 0) active++;
    }
    return active;
  }, [dayDevicesMap, daysInMonth]);

  // Peak Reception Day Calculation
  const peakDayInfo = useMemo(() => {
    let maxDevices = 0;
    let peakDays = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const count = (dayDevicesMap[day] || []).length;
      if (count > maxDevices) {
        maxDevices = count;
        peakDays = [day];
      } else if (count === maxDevices && count > 0) {
        peakDays.push(day);
      }
    }
    return { maxDevices, peakDays };
  }, [dayDevicesMap, daysInMonth]);

  // Group selected day devices by Shipping Agent -> Supplier -> devices
  const dayAgentGroups = useMemo(() => {
    if (!selectedDayModal?.devices) return [];
    const groups = {};
    selectedDayModal.devices.forEach((d) => {
      const s = d.current_shipment ? shipmentMap[d.current_shipment] : null;
      const agentName = (d.shipment_agent || s?.shipping_company || 'Direct / Unassigned').trim();
      const supplierName = (d.shipment_supplier || s?.supplier_name || s?.supplier?.name || 'Direct / Unknown').trim();

      if (!groups[agentName]) {
        groups[agentName] = {
          agent: agentName,
          total: 0,
          suppliers: {}
        };
      }
      groups[agentName].total += 1;

      if (!groups[agentName].suppliers[supplierName]) {
        groups[agentName].suppliers[supplierName] = [];
      }
      groups[agentName].suppliers[supplierName].push(d);
    });
    return Object.values(groups);
  }, [selectedDayModal, shipmentMap]);

  // Copy day reception report to clipboard
  const handleCopyDayReport = () => {
    if (!selectedDayModal?.devices?.length) return;
    const dateFormatted = `${selectedDayModal.day} ${MONTH_NAMES[selectedMonth]} ${selectedYear}`;
    let text = `📦 Daily Reception Report (${dateFormatted})\n`;
    text += `Type: Received at Bangladesh (BD)\n`;
    text += `Total Devices: ${selectedDayModal.devices.length}\n\n`;

    dayAgentGroups.forEach((ag) => {
      text += `🚚 Shipping Agent: ${ag.agent} (${ag.total} ${ag.total === 1 ? 'device' : 'devices'})\n`;
      Object.entries(ag.suppliers).forEach(([sup, devs]) => {
        text += `  • Supplier: ${sup} (${devs.length} devices)\n`;
        devs.forEach((dev) => {
          text += `     - ${dev.model || dev.model_name} [${dev.variant || 'Std'}] (${dev.capacity || ''} ${dev.color || ''}) - IMEI: ${dev.imei}\n`;
        });
      });
      text += `\n`;
    });

    navigator.clipboard.writeText(text.trim()).then(() => {
      enqueueSnackbar('Day reception report copied to clipboard!', { variant: 'success' });
    }).catch(() => {
      enqueueSnackbar('Failed to copy to clipboard', { variant: 'error' });
    });
  };

  // Filtered devices for the monthly ledger
  const filteredLedger = useMemo(() => {
    if (!searchQuery.trim()) return monthDevices;
    const q = searchQuery.toLowerCase().trim();
    return monthDevices.filter((d) => {
      const s = d.current_shipment ? shipmentMap[d.current_shipment] : null;
      return (
        d.model?.toLowerCase().includes(q) ||
        d.model_name?.toLowerCase().includes(q) ||
        d.imei?.toLowerCase().includes(q) ||
        d.imei2?.toLowerCase().includes(q) ||
        d.serial_number?.toLowerCase().includes(q) ||
        d.supplier_name?.toLowerCase().includes(q) ||
        d.shipment_supplier?.toLowerCase().includes(q) ||
        d.shipment_agent?.toLowerCase().includes(q) ||
        d.shipment_tracking?.toLowerCase().includes(q) ||
        s?.tracking_number?.toLowerCase().includes(q) ||
        s?.supplier_name?.toLowerCase().includes(q)
      );
    });
  }, [monthDevices, searchQuery, shipmentMap]);

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
              bgcolor: '#10B981',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)',
              flexShrink: 0
            }}
          >
            <ShippingIcon sx={{ fontSize: { xs: 22, sm: 26 } }} />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h6" fontWeight={800} sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }} noWrap>
              Inbound Received Analytics
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.74rem', sm: '0.82rem' } }}>
              Physical device receptions across {MONTH_NAMES[selectedMonth]} {selectedYear}
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
                  color: '#059669',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.08)'
                }
              }
            }}
          >
            <ToggleButton value="BD">
              🇧🇩 Received at BD
            </ToggleButton>
            <ToggleButton value="CN">
              🇨🇳 Received at CN
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
        {/* Total Devices Received */}
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
                Devices Received
              </Typography>
              <Box sx={{ p: 0.6, borderRadius: 1.2, bgcolor: 'rgba(16, 185, 129, 0.12)', color: '#059669' }}>
                <PhoneIcon sx={{ fontSize: 16 }} />
              </Box>
            </Box>
            <Typography variant="h4" fontWeight={800} sx={{ color: '#059669', my: 0.25, fontSize: { xs: '1.45rem', sm: '1.85rem' } }}>
              {totalReceivedDevices} <Typography component="span" variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>Units</Typography>
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.68rem' }} noWrap>
              Across {activeBatchesCount} shipment {activeBatchesCount === 1 ? 'batch' : 'batches'} in {MONTH_NAMES[selectedMonth].slice(0, 3)} {selectedYear}
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
                Reception Days
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
                10-Day Reception Breakdown (Devices)
              </Typography>
              <Typography variant="caption" fontWeight={700} color="#059669" sx={{ fontSize: '0.7rem' }}>
                {MONTH_NAMES[selectedMonth]} Receptions
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
                    bgcolor: (t) => (t.palette.mode === 'dark' ? 'rgba(139, 92, 246, 0.08)' : '#F5F3FF'),
                    borderColor: 'rgba(139, 92, 246, 0.3)',
                    textAlign: 'center'
                  }}
                >
                  <Typography variant="caption" color="text.secondary" fontWeight={700} display="block" sx={{ fontSize: '0.62rem' }}>
                    Days 11 – 20
                  </Typography>
                  <Typography variant="h6" fontWeight={800} color="#7C3AED" sx={{ fontSize: { xs: '0.95rem', sm: '1.15rem' } }}>
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
                <CalendarIcon sx={{ color: '#10B981', fontSize: 19 }} />
                <Typography variant="subtitle2" fontWeight={800} sx={{ fontSize: { xs: '0.85rem', sm: '0.95rem' } }}>
                  {MONTH_NAMES[selectedMonth]} {selectedYear}
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#10B981' }} />
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.68rem' }}>Received</Typography>
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
                const dayDevs = dayDevicesMap[dayNum] || [];
                const hasReceptions = dayDevs.length > 0;
                const count = dayDevs.length;
                const isToday =
                  today.getFullYear() === selectedYear &&
                  today.getMonth() === selectedMonth &&
                  today.getDate() === dayNum;
                const isHovered = hoveredDay === dayNum;

                return (
                  <Grid item xs={12 / 7} key={`day-${dayNum}`}>
                    <Tooltip
                      title={
                        hasReceptions
                          ? `Day ${dayNum}: ${count} device(s) received — Click to inspect by Agent`
                          : `Day ${dayNum}: No devices received`
                      }
                      arrow
                    >
                      <Paper
                        variant="outlined"
                        onMouseEnter={() => setHoveredDay(dayNum)}
                        onMouseLeave={() => setHoveredDay(null)}
                        onClick={() => hasReceptions && setSelectedDayModal({ day: dayNum, devices: dayDevs })}
                        sx={{
                          height: { xs: 34, sm: 38 },
                          p: 0.3,
                          borderRadius: 1.75,
                          cursor: hasReceptions ? 'pointer' : 'default',
                          border: '1px solid',
                          borderColor: isHovered
                            ? '#2563EB'
                            : hasReceptions
                            ? '#10B981'
                            : isToday
                            ? 'primary.main'
                            : 'divider',
                          bgcolor: isHovered
                            ? (t) => (t.palette.mode === 'dark' ? 'rgba(37, 99, 235, 0.35)' : '#DBEAFE')
                            : hasReceptions
                            ? (t) => (t.palette.mode === 'dark' ? 'rgba(16, 185, 129, 0.22)' : '#D1FAE5')
                            : isToday
                            ? (t) => (t.palette.mode === 'dark' ? 'rgba(37, 99, 235, 0.08)' : '#EFF6FF')
                            : 'background.paper',
                          transition: 'all 0.15s ease-in-out',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transform: 'none',
                          boxShadow: isHovered
                            ? '0 3px 8px rgba(37, 99, 235, 0.25)'
                            : hasReceptions
                            ? '0 2px 5px rgba(16, 185, 129, 0.15)'
                            : 'none',
                          zIndex: isHovered ? 2 : 1
                        }}
                      >
                        <Typography
                          variant="caption"
                          fontWeight={isHovered || hasReceptions || isToday ? 800 : 500}
                          sx={{
                            fontSize: { xs: '0.72rem', sm: '0.78rem' },
                            lineHeight: 1,
                            color: isHovered
                              ? '#1D4ED8'
                              : hasReceptions
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
                <BarChartIcon sx={{ color: '#10B981', fontSize: 20 }} />
                <Typography variant="subtitle2" fontWeight={800} sx={{ fontSize: { xs: '0.85rem', sm: '0.95rem' } }}>
                  Daily Devices Received Plot (Units)
                </Typography>
              </Box>

              {peakDayInfo.maxDevices > 0 && (
                <Chip
                  icon={<FireIcon sx={{ fontSize: '13px !important', color: '#F59E0B' }} />}
                  label={`Peak Inflow: ${peakDayInfo.maxDevices} devices (Day ${peakDayInfo.peakDays.join(', ')})`}
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
              {totalReceivedDevices === 0 ? (
                <Box sx={{ my: 'auto', textAlign: 'center', py: 3, color: 'text.secondary' }}>
                  <ShippingIcon sx={{ fontSize: 32, opacity: 0.3, mb: 0.5 }} />
                  <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.82rem' }}>
                    No devices recorded as received in {MONTH_NAMES[selectedMonth]} {selectedYear}.
                  </Typography>
                  <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>
                    Devices will plot automatically based on their exact BD receive date.
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
                      const dayDevs = dayDevicesMap[dayNum] || [];
                      const count = dayDevs.length;
                      const maxPossible = Math.max(1, peakDayInfo.maxDevices);
                      const barHeightPercent = count > 0 ? Math.max(18, (count / maxPossible) * 100) : 0;
                      const isHovered = hoveredDay === dayNum;

                      return (
                        <Tooltip
                          key={`shipment-plot-${dayNum}`}
                          title={`Day ${dayNum}: ${count} device(s) received — Click to inspect by Agent`}
                          arrow
                        >
                          <Box
                            onMouseEnter={() => setHoveredDay(dayNum)}
                            onMouseLeave={() => setHoveredDay(null)}
                            onClick={() => count > 0 && setSelectedDayModal({ day: dayNum, devices: dayDevs })}
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
                                  color: isHovered ? '#2563EB' : '#059669',
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
                                transition: 'all 0.15s ease-in-out',
                                transform: 'none',
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
                Reception Phases:
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
                    bgcolor: (t) => (t.palette.mode === 'dark' ? 'rgba(139, 92, 246, 0.12)' : '#F5F3FF'),
                    color: '#7C3AED',
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

      {/* 4. Detailed Monthly Received Devices Ledger */}
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
              Monthly Received Devices Ledger ({filteredLedger.length})
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Individual devices physically received in {MONTH_NAMES[selectedMonth]} {selectedYear}
            </Typography>
          </Box>

          <Box sx={{ width: { xs: '100%', sm: 300 } }}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search model, IMEI, supplier, tracking..."
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
            <PhoneIcon sx={{ fontSize: 36, opacity: 0.4, mb: 1 }} />
            <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.85rem' }}>
              No devices recorded as received in {MONTH_NAMES[selectedMonth]} {selectedYear}.
            </Typography>
            <Typography variant="caption" sx={{ fontSize: '0.72rem' }}>
              Switch months or date criteria above.
            </Typography>
          </Box>
        ) : (
          <>
            {/* MOBILE VIEW */}
            <Box sx={{ display: { xs: 'flex', sm: 'none' }, flexDirection: 'column', gap: 1.25 }}>
              {filteredLedger.map((d) => {
                const s = d.current_shipment ? shipmentMap[d.current_shipment] : null;
                const recDate = getDeviceDateStr(d);
                return (
                  <Paper
                    key={`mob-device-${d.id}`}
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
                          {d.model || d.model_name || 'iPhone'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {d.capacity || ''} {d.color || ''} {d.variant ? `• ${d.variant}` : ''}
                        </Typography>
                      </Box>
                      <StatusBadge status={d.current_status || d.status} />
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 0.75, pt: 0.3 }}>
                      <CopyableText text={d.imei} />
                      {d.battery_health && (
                        <Chip
                          icon={<BatteryIcon sx={{ fontSize: '13px !important' }} />}
                          label={`${d.battery_health}%`}
                          size="small"
                          sx={{ fontWeight: 700, fontSize: '0.7rem', height: 22 }}
                        />
                      )}
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: 1, borderColor: 'divider', pt: 0.6 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                        Received: {formatDate(recDate)}
                      </Typography>

                      <Typography variant="caption" color="primary.main" fontWeight={700} sx={{ fontSize: '0.72rem' }}>
                        {d.shipment_agent || s?.shipping_company || 'Direct'}
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
                    <TableCell sx={{ fontWeight: 700 }}>IMEI / Serial</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Shipping Agent & Supplier</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Received Date</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="right">Shipment Batch</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredLedger.map((d) => {
                    const s = d.current_shipment ? shipmentMap[d.current_shipment] : null;
                    const recDate = getDeviceDateStr(d);
                    return (
                      <TableRow key={`device-row-${d.id}`} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight={700}>
                            {d.model || d.model_name || 'iPhone'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {d.capacity || ''} {d.color || ''} {d.variant ? `• ${d.variant}` : ''}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <CopyableText text={d.imei} />
                          {d.battery_health && (
                            <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '0.68rem' }}>
                              Battery: {d.battery_health}% {d.battery_cycle ? `(${d.battery_cycle} CC)` : ''}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight={700} sx={{ color: '#2563EB' }}>
                            {d.shipment_agent || s?.shipping_company || 'Direct / Unassigned'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Supplier: {d.shipment_supplier || s?.supplier_name || 'Supplier'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight={700} sx={{ color: '#059669' }}>
                            {formatDate(recDate)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={d.current_status || d.status} />
                        </TableCell>
                        <TableCell align="right">
                          {s ? (
                            <Button
                              size="small"
                              variant="outlined"
                              endIcon={<OpenInNewIcon sx={{ fontSize: '13px !important' }} />}
                              onClick={() => onSelectShipment && onSelectShipment(s)}
                              sx={{
                                fontSize: '0.72rem',
                                py: 0.3,
                                px: 1.2,
                                borderRadius: 1.5,
                                textTransform: 'none',
                                fontWeight: 700
                              }}
                            >
                              {s.tracking_number ? s.tracking_number.slice(0, 10) + '...' : 'Batch'}
                            </Button>
                          ) : (
                            <Typography variant="caption" color="text.secondary">—</Typography>
                          )}
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

      {/* 5. Day Devices Received Inspection Modal — Grouped by Shipping Agent */}
      <Dialog
        open={Boolean(selectedDayModal)}
        onClose={() => setSelectedDayModal(null)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: { xs: 2, sm: 3 }, p: 0.5, m: { xs: 1.5, sm: 2 } } }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1.2, px: { xs: 1.5, sm: 2.5 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0, flex: 1, pr: 1 }}>
            <CheckCircleIcon sx={{ color: '#10B981', fontSize: 22, flexShrink: 0 }} />
            <Typography variant="subtitle1" fontWeight={800} noWrap sx={{ fontSize: { xs: '0.88rem', sm: '1.05rem' } }}>
              Received: {selectedDayModal?.day} {MONTH_NAMES[selectedMonth]} {selectedYear}
            </Typography>
            <Chip
              label={`${selectedDayModal?.devices?.length || 0} Devices`}
              size="small"
              sx={{ fontWeight: 800, fontSize: '0.68rem', height: 22, bgcolor: '#D1FAE5', color: '#047857', borderRadius: 1.2, flexShrink: 0 }}
            />
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Button
              size="small"
              variant="outlined"
              startIcon={<CopyIcon sx={{ fontSize: '13px !important' }} />}
              onClick={handleCopyDayReport}
              sx={{
                fontSize: '0.72rem',
                textTransform: 'none',
                fontWeight: 700,
                borderRadius: 1.5,
                py: 0.3,
                px: 1
              }}
            >
              Copy Report
            </Button>
            <IconButton size="small" onClick={() => setSelectedDayModal(null)}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers sx={{ p: { xs: 1.5, sm: 2.5 } }}>
          <Stack spacing={2.5}>
            {dayAgentGroups.map((agGroup) => (
              <Paper
                key={`agent-group-${agGroup.agent}`}
                variant="outlined"
                sx={{
                  p: { xs: 1.5, sm: 2 },
                  borderRadius: 2.5,
                  bgcolor: (t) => (t.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : '#F8FAFC'),
                  border: '1px solid',
                  borderColor: (t) => (t.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : '#E2E8F0')
                }}
              >
                {/* Agent Group Header */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5, pb: 1, borderBottom: '1px dashed', borderColor: 'divider' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ p: 0.5, borderRadius: 1.5, bgcolor: 'rgba(37, 99, 235, 0.1)', color: '#2563EB', display: 'flex' }}>
                      <ShippingIcon sx={{ fontSize: 18 }} />
                    </Box>
                    <Typography variant="subtitle2" fontWeight={800} sx={{ fontSize: { xs: '0.88rem', sm: '1rem' } }}>
                      Shipping Agent: {agGroup.agent}
                    </Typography>
                  </Box>
                  <Chip
                    label={`${agGroup.total} ${agGroup.total === 1 ? 'device' : 'devices'}`}
                    size="small"
                    sx={{ fontWeight: 800, fontSize: '0.7rem', height: 22, bgcolor: '#DBEAFE', color: '#1D4ED8', borderRadius: 1.2 }}
                  />
                </Box>

                {/* Sub-group by Supplier */}
                <Stack spacing={1.5}>
                  {Object.entries(agGroup.suppliers).map(([supName, devs]) => (
                    <Box key={`agent-sup-${supName}`}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1 }}>
                        <SupplierIcon sx={{ fontSize: 15, color: 'text.secondary' }} />
                        <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                          Supplier: <strong>{supName}</strong> ({devs.length} units)
                        </Typography>
                      </Box>

                      {/* Device Cards for this Supplier */}
                      <Grid container spacing={1}>
                        {devs.map((dev) => {
                          const s = dev.current_shipment ? shipmentMap[dev.current_shipment] : null;
                          return (
                            <Grid item xs={12} sm={6} key={`modal-dev-${dev.id}`}>
                              <Paper
                                variant="outlined"
                                sx={{
                                  p: 1.2,
                                  borderRadius: 2,
                                  bgcolor: 'background.paper',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: 0.6
                                }}
                              >
                                <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 0.5 }}>
                                  <Box sx={{ minWidth: 0, flex: 1 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, flexWrap: 'wrap' }}>
                                      <Typography variant="subtitle2" fontWeight={800} sx={{ fontSize: '0.82rem' }}>
                                        {dev.model || dev.model_name}
                                      </Typography>
                                      <VariantBadge variant={dev.variant} />
                                    </Box>
                                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.68rem' }}>
                                      {dev.capacity || ''} {dev.color || ''}
                                    </Typography>
                                  </Box>
                                  <StatusBadge status={dev.current_status || dev.status} />
                                </Box>

                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 0.5, pt: 0.2 }}>
                                  <CopyableText text={dev.imei} />
                                  {dev.battery_health && (
                                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.68rem', fontWeight: 600 }}>
                                      🔋 {dev.battery_health}% {dev.battery_cycle ? `(${dev.battery_cycle} CC)` : ''}
                                    </Typography>
                                  )}
                                </Box>

                                {s && (
                                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: 1, borderColor: 'divider', pt: 0.4, mt: 0.2 }}>
                                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }} noWrap>
                                      Tracking: {s.tracking_number || '—'}
                                    </Typography>
                                    {onSelectShipment && (
                                      <Button
                                        size="small"
                                        variant="text"
                                        onClick={() => {
                                          setSelectedDayModal(null);
                                          onSelectShipment(s);
                                        }}
                                        sx={{ fontSize: '0.68rem', py: 0, px: 0.5, minWidth: 'auto', textTransform: 'none', fontWeight: 700 }}
                                      >
                                        Batch Details
                                      </Button>
                                    )}
                                  </Box>
                                )}
                              </Paper>
                            </Grid>
                          );
                        })}
                      </Grid>
                    </Box>
                  ))}
                </Stack>
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
