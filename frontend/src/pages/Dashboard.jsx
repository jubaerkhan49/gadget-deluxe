import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Stack,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  IconButton,
  TextField,
  InputAdornment,
  Tooltip,
  Chip
} from '@mui/material';
import {
  Smartphone as PhoneIcon,
  AccountBalanceWallet as AssetsIcon,
  CheckCircleOutline as InStockIcon,
  CheckCircle as SoldIcon,
  LocalShipping as ShippingIcon,
  Build as RepairIcon,
  TrendingUp as TodaySalesIcon,
  Group as GroupIcon,
  Add as AddIcon,
  QrCodeScanner as ScanIcon,
  Search as SearchIcon,
  ArrowForward as ArrowForwardIcon,
  PointOfSale as SaleIcon,
  Person as PersonIcon,
  AssignmentInd as AssignmentIndIcon,
  NotificationImportant as AlertBadgeIcon,
  People as PeopleIcon,
  HourglassEmpty as HourglassIcon,
  EventAvailable as EventIcon,
  EmojiEvents as TrophyIcon,
  Stars as StarsIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import { useAuth } from '../context/AuthContext';
import { dashboardApi, deviceApi, saleApi } from '../api/client';
import StatusBadge from '../components/common/StatusBadge';
import VariantBadge from '../components/common/VariantBadge';
import CopyableText from '../components/common/CopyableText';
import AddDeviceDialog from '../dialogs/AddDeviceDialog';
import AddShipmentDialog from '../dialogs/AddShipmentDialog';
import RecordSaleDialog from '../dialogs/RecordSaleDialog';
import DeviceDetailDrawer from '../dialogs/DeviceDetailDrawer';
import EditDeviceDialog from '../dialogs/EditDeviceDialog';
import ManageEmployeesDialog from '../dialogs/ManageEmployeesDialog';
import MarkSoldDialog from '../dialogs/MarkSoldDialog';
import { formatNumber, formatDate } from '../utils/formatters';

export default function Dashboard() {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const { user, isAdmin } = useAuth();

  const [stats, setStats] = useState(null);
  const [recentDevices, setRecentDevices] = useState([]);
  const [myAssignedDevices, setMyAssignedDevices] = useState([]);
  const [recentSales, setRecentSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assignedSearch, setAssignedSearch] = useState('');

  // Modals & Drawers state
  const [addDeviceOpen, setAddDeviceOpen] = useState(false);
  const [addShipmentOpen, setAddShipmentOpen] = useState(false);
  const [recordSaleOpen, setRecordSaleOpen] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editDevice, setEditDevice] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [manageEmployeesOpen, setManageEmployeesOpen] = useState(false);
  const [manageEmployeesTab, setManageEmployeesTab] = useState(0);
  const [markSoldOpen, setMarkSoldOpen] = useState(false);
  const [markSoldDevice, setMarkSoldDevice] = useState(null);

  // Quick Scan/Search bar
  const [scanCode, setScanCode] = useState('');
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [statsRes, devsRes, salesRes] = await Promise.all([
        dashboardApi.getStats(),
        deviceApi.getAll(),
        saleApi.getAll()
      ]);
      setStats(statsRes.data);
      const allDevs = devsRes.data.results || devsRes.data || [];
      setRecentDevices(allDevs.slice(0, 6));

      // Filter devices assigned to current user and exclude SOLD devices
      const activeDevs = allDevs.filter((d) => d.current_status !== 'SOLD');
      const myDevs = activeDevs.filter((d) => {
        if (!d.current_owner) return false;
        if (typeof d.current_owner === 'object') {
          return d.current_owner.id === user?.id || d.current_owner.username === user?.username;
        }
        return d.current_owner === user?.id || d.current_owner === user?.username;
      });
      setMyAssignedDevices(myDevs.length > 0 ? myDevs : activeDevs);

      const allSales = salesRes.data.results || salesRes.data || [];
      setRecentSales(allSales.slice(0, 5));
    } catch (err) {
      console.error(err);
      enqueueSnackbar('Failed to load dashboard metrics', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleScanSearch = async (e) => {
    e.preventDefault();
    if (!scanCode.trim()) return;
    try {
      setScanning(true);
      const res = await deviceApi.scan(scanCode.trim());
      if (res.data.found && res.data.device) {
        setSelectedDevice(res.data.device);
        setDrawerOpen(true);
        setScanCode('');
      } else {
        enqueueSnackbar('No device found matching this IMEI or code', { variant: 'warning' });
      }
    } catch (err) {
      enqueueSnackbar('Device not found with that code', { variant: 'error' });
    } finally {
      setScanning(false);
    }
  };

  // ==========================================
  // 1. DEDICATED EMPLOYEE / STAFF CUSTODY VIEW
  // ==========================================
  if (!isAdmin) {
    const filteredAssigned = myAssignedDevices.filter((d) => {
      if (!assignedSearch) return true;
      const q = assignedSearch.toLowerCase();
      return (
        d.model?.toLowerCase().includes(q) ||
        d.imei?.toLowerCase().includes(q) ||
        d.serial_number?.toLowerCase().includes(q) ||
        d.color?.toLowerCase().includes(q)
      );
    });

    // Compute custody dates and max duration
    const now = new Date();
    let computedLongestDays = stats?.longest_held_days ?? 0;
    let computedLongestDate = stats?.longest_held_date;
    let computedLatestDate = stats?.latest_assigned_date;

    if (myAssignedDevices.length > 0 && (computedLongestDays === 0 || !computedLatestDate)) {
      const dates = myAssignedDevices.map((d) => {
        const raw = d.assigned_date || d.received_date_bd || d.created_at;
        return raw ? new Date(raw) : null;
      }).filter(Boolean);

      if (dates.length > 0) {
        const oldest = new Date(Math.min(...dates));
        const newest = new Date(Math.max(...dates));
        computedLongestDate = oldest;
        computedLatestDate = newest;
        computedLongestDays = Math.max(0, Math.floor((now - oldest) / (1000 * 60 * 60 * 24)));
      }
    }

    const performanceValue = stats?.performance || 'Good';
    const performanceDesc = stats?.performance_desc || (
      performanceValue === 'Good'
        ? "You're doing great. Please keep it up!"
        : performanceValue === 'Average'
          ? "Need to put in more effort"
          : "Hey! Please wake up! Post ASAP"
    );

    const employeeMetricCards = [
      {
        title: 'Devices in Custody',
        value: myAssignedDevices.length,
        subtitle: 'In-hand physical stock',
        icon: <PhoneIcon sx={{ fontSize: 20 }} />,
        color: '#2563EB',
        bgLight: 'rgba(37, 99, 235, 0.1)',
        isNumber: true
      },
      {
        title: 'Last Sold Date',
        value: stats?.last_sold_date ? formatDate(stats.last_sold_date) : 'No Sales Yet',
        subtitle: stats?.last_sold_date ? 'Most recent sale closed' : 'No sales recorded yet',
        icon: <SaleIcon sx={{ fontSize: 20 }} />,
        color: '#10B981',
        bgLight: 'rgba(16, 185, 129, 0.1)',
        isDate: true
      },
      {
        title: 'Longest in Custody',
        value: `${computedLongestDays} Days`,
        subtitle: computedLongestDate ? `Since ${formatDate(computedLongestDate)}` : 'Max holding duration',
        icon: <HourglassIcon sx={{ fontSize: 20 }} />,
        color: '#F59E0B',
        bgLight: 'rgba(245, 158, 11, 0.1)',
        isHighlight: true
      },
      {
        title: 'Latest Received',
        value: computedLatestDate ? formatDate(computedLatestDate) : '—',
        subtitle: 'Newest device handover',
        icon: <EventIcon sx={{ fontSize: 20 }} />,
        color: '#8B5CF6',
        bgLight: 'rgba(139, 92, 246, 0.1)',
        isDate: true
      },
      {
        title: 'Sales Performance',
        value: performanceValue,
        subtitle: performanceDesc,
        icon: <TrophyIcon sx={{ fontSize: 20 }} />,
        color: performanceValue === 'Good' ? '#10B981' : performanceValue === 'Average' ? '#2563EB' : '#F59E0B',
        bgLight: performanceValue === 'Good' ? 'rgba(16, 185, 129, 0.1)' : performanceValue === 'Average' ? 'rgba(37, 99, 235, 0.1)' : 'rgba(245, 158, 11, 0.1)',
        isBadge: true
      }
    ];

    return (
      <Box sx={{ pb: 4 }}>
        {/* Employee Header */}
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2, sm: 2.5 },
            mb: { xs: 2, sm: 3 },
            borderRadius: 2,
            border: 1,
            borderColor: 'divider',
            bgcolor: 'background.paper'
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1.5, sm: 2 } }}>
              <Box
                sx={{
                  width: { xs: 40, sm: 46 },
                  height: { xs: 40, sm: 46 },
                  borderRadius: 2,
                  bgcolor: 'primary.main',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                <AssignmentIndIcon sx={{ fontSize: { xs: 22, sm: 26 } }} />
              </Box>
              <Box>
                <Typography variant="h5" fontWeight={800} sx={{ fontSize: { xs: '1.15rem', sm: '1.45rem' } }}>
                  Staff Custody Dashboard
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.78rem', sm: '0.85rem' } }}>
                  Welcome, <strong>{user?.first_name || user?.username}</strong>. You are viewing devices assigned to your custody.
                </Typography>
              </Box>
            </Box>

            <Box component="form" onSubmit={handleScanSearch} sx={{ width: { xs: '100%', sm: 300 } }}>
              <TextField
                fullWidth
                size="small"
                placeholder="Scan or Search My IMEI..."
                value={scanCode}
                onChange={(e) => setScanCode(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <ScanIcon color="primary" fontSize="small" />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton type="submit" size="small" disabled={scanning || !scanCode.trim()}>
                        {scanning ? <CircularProgress size={16} /> : <SearchIcon fontSize="small" />}
                      </IconButton>
                    </InputAdornment>
                  )
                }}
              />
            </Box>
          </Box>
        </Paper>

        {/* Employee Summary 5 KPIs */}
        <Grid container spacing={{ xs: 1.5, sm: 2 }} sx={{ mb: { xs: 2.5, sm: 3.5 } }}>
          {employeeMetricCards.map((card, idx) => (
            <Grid item xs={idx === 4 ? 12 : 6} sm={6} md={4} lg={2.4} key={idx}>
              <Card
                sx={{
                  p: { xs: 1.6, sm: 2 },
                  borderRadius: 2,
                  border: 1,
                  borderColor: 'divider',
                  bgcolor: 'background.paper',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: (theme) =>
                      theme.palette.mode === 'dark' ? '0 8px 24px rgba(0,0,0,0.4)' : '0 8px 24px rgba(0,0,0,0.06)'
                  }
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1, mb: 0.8 }}>
                  <Typography
                    variant="caption"
                    fontWeight={800}
                    color="text.secondary"
                    sx={{
                      textTransform: 'uppercase',
                      letterSpacing: 0.4,
                      fontSize: { xs: '0.68rem', sm: '0.72rem' },
                      lineHeight: 1.25,
                      minHeight: { xs: '2.5em', sm: 'auto' },
                      flex: 1
                    }}
                  >
                    {card.title}
                  </Typography>
                  <Box
                    sx={{
                      width: { xs: 28, sm: 32 },
                      height: { xs: 28, sm: 32 },
                      minWidth: { xs: 28, sm: 32 },
                      borderRadius: 1.5,
                      bgcolor: card.bgLight,
                      color: card.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}
                  >
                    {card.icon}
                  </Box>
                </Box>

                <Box sx={{ my: 0.4 }}>
                  {card.isBadge ? (
                    <Chip
                      label={card.value}
                      size="small"
                      sx={{
                        fontWeight: 800,
                        fontSize: { xs: '0.78rem', sm: '0.85rem' },
                        height: { xs: 26, sm: 28 },
                        px: 0.8,
                        bgcolor: card.bgLight,
                        color: card.color,
                        border: 1,
                        borderColor: card.color,
                        borderRadius: 1.5
                      }}
                    />
                  ) : (
                    <Typography
                      variant={card.isNumber ? 'h4' : 'h6'}
                      fontWeight={800}
                      sx={{
                        fontFamily: card.isNumber ? '"JetBrains Mono", monospace' : 'inherit',
                        color: card.color,
                        lineHeight: 1.2,
                        fontSize: {
                          xs: card.isNumber ? '1.35rem' : '0.95rem',
                          sm: card.isNumber ? '1.65rem' : '1.05rem'
                        }
                      }}
                    >
                      {loading ? '...' : card.value}
                    </Typography>
                  )}
                </Box>

                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{
                    mt: 0.6,
                    fontSize: { xs: '0.68rem', sm: '0.72rem' },
                    lineHeight: 1.25,
                    display: 'block'
                  }}
                >
                  {card.subtitle}
                </Typography>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Assigned Devices Section */}
        <Paper variant="outlined" sx={{ p: { xs: 2, sm: 2.5 }, borderRadius: 2, bgcolor: 'background.paper' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1.5 }}>
            <Typography variant="subtitle1" fontWeight={800}>
              Assigned Devices List ({filteredAssigned.length})
            </Typography>
            <Box sx={{ width: { xs: '100%', sm: 260 } }}>
              <TextField
                fullWidth
                size="small"
                placeholder="Filter by model, IMEI..."
                value={assignedSearch}
                onChange={(e) => setAssignedSearch(e.target.value)}
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

          {/* 1. Mobile Cards View (xs & sm) */}
          <Box sx={{ display: { xs: 'flex', md: 'none' }, flexDirection: 'column', gap: 1.5 }}>
            {filteredAssigned.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
                <Typography variant="body2">No devices are currently assigned to your custody.</Typography>
              </Box>
            ) : (
              filteredAssigned.map((dev) => (
                <Card
                  key={dev.id}
                  variant="outlined"
                  onClick={() => {
                    setSelectedDevice(dev);
                    setDrawerOpen(true);
                  }}
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    cursor: 'pointer',
                    transition: 'border-color 0.2s, box-shadow 0.2s',
                    '&:hover': {
                      borderColor: 'primary.main',
                      boxShadow: (theme) =>
                        theme.palette.mode === 'dark'
                          ? '0 4px 16px rgba(0,0,0,0.3)'
                          : '0 4px 16px rgba(0,0,0,0.06)'
                    }
                  }}
                >
                  {/* Card Top: Model, Specs & Status */}
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1, mb: 1.2 }}>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography variant="subtitle2" fontWeight={800} noWrap>
                        {dev.model}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
                        {dev.capacity || ''} {dev.color ? `• ${dev.color}` : ''}
                      </Typography>
                    </Box>
                    <StatusBadge status={dev.current_status} />
                  </Box>

                  {/* Card Mid Row: IMEI + Variant */}
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      p: 1,
                      mb: 1.2,
                      borderRadius: 1.5,
                      bgcolor: (theme) =>
                        theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <CopyableText text={dev.imei} />
                    <VariantBadge variant={dev.variant} />
                  </Box>

                  {/* Card Bottom Specs: Battery Health + Cycle & Assigned Date */}
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      mb: 1.5,
                      flexWrap: 'wrap',
                      gap: 1
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                      <Typography variant="caption" fontWeight={700} color="text.secondary">
                        Battery:
                      </Typography>
                      <Typography variant="caption" fontWeight={800}>
                        {dev.battery_health ? `${dev.battery_health}%` : '—'}
                      </Typography>
                      {(dev.battery_cycle !== null && dev.battery_cycle !== undefined && dev.battery_cycle !== '') ? (
                        <Chip
                          label={`CC ${dev.battery_cycle}`}
                          size="small"
                          sx={{ height: 18, fontSize: '0.65rem', fontWeight: 700 }}
                        />
                      ) : (dev.battery_cycles !== null && dev.battery_cycles !== undefined && dev.battery_cycles !== '') ? (
                        <Chip
                          label={`CC ${dev.battery_cycles}`}
                          size="small"
                          sx={{ height: 18, fontSize: '0.65rem', fontWeight: 700 }}
                        />
                      ) : null}
                    </Box>

                    <Typography variant="caption" color="text.secondary">
                      {formatDate(dev.assigned_date || dev.received_date_bd || dev.created_at)}
                    </Typography>
                  </Box>

                  {/* Action Button: Mark as Sold or Pending Sale Chip */}
                  <Box onClick={(e) => e.stopPropagation()}>
                    {dev.current_status === 'IN_STOCK' ? (
                      <Button
                        fullWidth
                        size="small"
                        variant="contained"
                        color="success"
                        startIcon={<SaleIcon sx={{ fontSize: '16px !important' }} />}
                        onClick={() => {
                          setMarkSoldDevice(dev);
                          setMarkSoldOpen(true);
                        }}
                        sx={{
                          py: 0.8,
                          fontWeight: 700,
                          borderRadius: 2,
                          textTransform: 'none',
                          fontSize: '0.8rem'
                        }}
                      >
                        Mark as Sold
                      </Button>
                    ) : dev.current_status === 'PENDING_SALE' ? (
                      <Box
                        sx={{
                          py: 0.7,
                          px: 1.5,
                          textAlign: 'center',
                          borderRadius: 2,
                          bgcolor: 'rgba(245, 158, 11, 0.12)',
                          color: '#D97706',
                          border: '1px solid rgba(245, 158, 11, 0.3)',
                          fontWeight: 800,
                          fontSize: '0.78rem'
                        }}
                      >
                        ⏳ Pending Sale — Awaiting Admin Confirmation
                      </Box>
                    ) : null}
                  </Box>
                </Card>
              ))
            )}
          </Box>

          {/* 2. Desktop Table View (md+) */}
          <TableContainer sx={{ display: { xs: 'none', md: 'block' } }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'action.hover' }}>
                  <TableCell sx={{ fontWeight: 700 }}>Model</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>IMEI Number</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Variant</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Battery Health</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Current Status</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Assigned Date</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="right">Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredAssigned.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                      No devices are currently assigned to your custody.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAssigned.map((dev) => (
                    <TableRow
                      key={dev.id}
                      hover
                      sx={{ cursor: 'pointer' }}
                      onClick={() => {
                        setSelectedDevice(dev);
                        setDrawerOpen(true);
                      }}
                    >
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>
                          {dev.model}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {dev.capacity || ''} {dev.color ? `• ${dev.color}` : ''}
                        </Typography>
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <CopyableText text={dev.imei} />
                      </TableCell>
                      <TableCell>
                        <VariantBadge variant={dev.variant} />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, flexWrap: 'nowrap' }}>
                          <Typography variant="body2" fontWeight={700}>
                            {dev.battery_health ? `${dev.battery_health}%` : '—'}
                          </Typography>
                          {(dev.battery_cycle !== null && dev.battery_cycle !== undefined && dev.battery_cycle !== '') ? (
                            <Chip
                              label={`CC ${dev.battery_cycle}`}
                              size="small"
                              sx={{
                                height: 20,
                                fontSize: '0.7rem',
                                fontWeight: 700,
                                bgcolor: (theme) =>
                                  theme.palette.mode === 'dark' ? 'rgba(148, 163, 184, 0.15)' : '#F1F5F9',
                                color: (theme) =>
                                  theme.palette.mode === 'dark' ? '#CBD5E1' : '#475569',
                                borderRadius: 1
                              }}
                            />
                          ) : (dev.battery_cycles !== null && dev.battery_cycles !== undefined && dev.battery_cycles !== '') ? (
                            <Chip
                              label={`CC ${dev.battery_cycles}`}
                              size="small"
                              sx={{
                                height: 20,
                                fontSize: '0.7rem',
                                fontWeight: 700,
                                bgcolor: (theme) =>
                                  theme.palette.mode === 'dark' ? 'rgba(148, 163, 184, 0.15)' : '#F1F5F9',
                                color: (theme) =>
                                  theme.palette.mode === 'dark' ? '#CBD5E1' : '#475569',
                                borderRadius: 1
                              }}
                            />
                          ) : null}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={dev.current_status} />
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" color="text.secondary">
                          {formatDate(dev.assigned_date || dev.received_date_bd || dev.created_at)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                        {dev.current_status === 'IN_STOCK' ? (
                          <Button
                            size="small"
                            variant="contained"
                            color="success"
                            startIcon={<SaleIcon sx={{ fontSize: '15px !important' }} />}
                            onClick={() => {
                              setMarkSoldDevice(dev);
                              setMarkSoldOpen(true);
                            }}
                            sx={{
                              fontSize: '0.72rem',
                              py: 0.4,
                              px: 1.2,
                              fontWeight: 700,
                              borderRadius: 1.5,
                              textTransform: 'none',
                              boxShadow: 'none',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            Mark as Sold
                          </Button>
                        ) : dev.current_status === 'PENDING_SALE' ? (
                          <Chip
                            label="Pending Sale"
                            size="small"
                            sx={{
                              height: 24,
                              fontSize: '0.72rem',
                              fontWeight: 800,
                              bgcolor: 'rgba(245, 158, 11, 0.15)',
                              color: '#D97706',
                              border: '1px solid rgba(245, 158, 11, 0.3)'
                            }}
                          />
                        ) : (
                          <Typography variant="caption" color="text.secondary">
                            —
                          </Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>

        <DeviceDetailDrawer
          open={drawerOpen}
          onClose={() => {
            setDrawerOpen(false);
            setSelectedDevice(null);
          }}
          device={selectedDevice}
          onDeviceUpdated={() => fetchDashboardData()}
          onMarkSoldRequested={(dev) => {
            setMarkSoldDevice(dev);
            setMarkSoldOpen(true);
          }}
        />

        <MarkSoldDialog
          open={markSoldOpen}
          onClose={() => {
            setMarkSoldOpen(false);
            setMarkSoldDevice(null);
          }}
          device={markSoldDevice}
          onSubmitted={() => fetchDashboardData()}
        />
      </Box>
    );
  }

  // ==========================================
  // 2. FULL ADMINISTRATOR DASHBOARD VIEW
  // ==========================================

  // 8 Uniform Metric Cards configuration
  const statCards = [
    {
      title: 'TOTAL DEVICES',
      value: stats ? stats.total_devices : 0,
      icon: <PhoneIcon sx={{ fontSize: 26 }} />,
      color: '#3B82F6',
      bgLight: 'rgba(59, 130, 246, 0.12)'
    },
    {
      title: 'TOTAL ASSETS',
      value: stats ? formatNumber(stats.total_assets) : '0',
      icon: <AssetsIcon sx={{ fontSize: 26 }} />,
      color: '#10B981',
      bgLight: 'rgba(16, 185, 129, 0.12)'
    },
    {
      title: 'IN STOCK',
      value: stats ? stats.in_stock : 0,
      icon: <InStockIcon sx={{ fontSize: 26 }} />,
      color: '#06B6D4',
      bgLight: 'rgba(6, 182, 212, 0.12)'
    },
    {
      title: 'SOLD',
      value: stats ? stats.sold : 0,
      icon: <SoldIcon sx={{ fontSize: 26 }} />,
      color: '#8B5CF6',
      bgLight: 'rgba(139, 92, 246, 0.12)'
    },
    {
      title: 'WAITING SHIPMENT',
      value: stats ? stats.waiting_shipment : 0,
      icon: <ShippingIcon sx={{ fontSize: 26 }} />,
      color: '#F59E0B',
      bgLight: 'rgba(245, 158, 11, 0.12)'
    },
    {
      title: 'UNDER REPAIR',
      value: stats ? stats.under_repair : 0,
      icon: <RepairIcon sx={{ fontSize: 26 }} />,
      color: '#EC4899',
      bgLight: 'rgba(236, 72, 153, 0.12)'
    },
    {
      title: "TODAY'S SALES",
      value: stats ? formatNumber(stats.today_sales) : '0',
      icon: <TodaySalesIcon sx={{ fontSize: 26 }} />,
      color: '#14B8A6',
      bgLight: 'rgba(20, 184, 166, 0.12)'
    },
    {
      title: 'OTHER OWNERS',
      value: stats ? (stats.others_owned ?? 0) : 0,
      icon: <GroupIcon sx={{ fontSize: 26 }} />,
      color: '#6366F1',
      bgLight: 'rgba(99, 102, 241, 0.12)'
    }
  ];

  return (
    <Box sx={{ pb: 4 }}>
      {/* Pending Sale Requests Alert Banner for Admins */}
      {stats?.pending_sale_requests_count > 0 && (
        <Paper
          variant="outlined"
          sx={{
            p: 2,
            mb: 2.5,
            borderRadius: 2.5,
            bgcolor: (t) => (t.palette.mode === 'dark' ? 'rgba(245, 158, 11, 0.15)' : '#FFFBEB'),
            borderColor: 'warning.main',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 2
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <SaleIcon sx={{ color: '#F59E0B' }} />
            <Typography variant="body2" fontWeight={600}>
              <strong>{stats.pending_sale_requests_count} device sale request(s)</strong> submitted by staff awaiting sold price confirmation & approval.
            </Typography>
          </Box>
          <Button
            variant="contained"
            color="warning"
            size="small"
            startIcon={<SaleIcon />}
            onClick={() => {
              setManageEmployeesTab(2);
              setManageEmployeesOpen(true);
            }}
            sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2, bgcolor: '#F59E0B', color: '#FFF' }}
          >
            Review Sale Requests
          </Button>
        </Paper>
      )}

      {/* Pending Applications Alert Banner for Admins */}
      {stats?.pending_applications_count > 0 && (
        <Paper
          variant="outlined"
          sx={{
            p: 2,
            mb: 3,
            borderRadius: 2.5,
            bgcolor: (t) => (t.palette.mode === 'dark' ? 'rgba(239, 68, 68, 0.15)' : '#FEF2F2'),
            borderColor: 'error.main',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 2
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <AlertBadgeIcon color="error" />
            <Typography variant="body2" fontWeight={600}>
              <strong>{stats.pending_applications_count} new employee join application(s)</strong> awaiting administrator approval.
            </Typography>
          </Box>
          <Button
            variant="contained"
            color="error"
            size="small"
            startIcon={<PeopleIcon />}
            onClick={() => {
              setManageEmployeesTab(0);
              setManageEmployeesOpen(true);
            }}
            sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2 }}
          >
            Review Applications
          </Button>
        </Paper>
      )}

      {/* Top Banner: Quick Scan & Quick Action Buttons */}
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2, sm: 2.5 },
          mb: { xs: 2.5, sm: 3.5 },
          borderRadius: 2,
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
          border: 1,
          borderColor: 'divider',
          background: (theme) =>
            theme.palette.mode === 'dark'
              ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.9) 100%)'
              : 'linear-gradient(135deg, #FFFFFF 0%, #F8FAFC 100%)'
        }}
      >
        {/* Quick Scan IMEI Search Input */}
        <Box
          component="form"
          onSubmit={handleScanSearch}
          sx={{ width: { xs: '100%', md: 380 } }}
        >
          <TextField
            fullWidth
            size="small"
            placeholder="Scan or Enter IMEI Number..."
            value={scanCode}
            onChange={(e) => setScanCode(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <ScanIcon color="primary" fontSize="small" />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton type="submit" size="small" disabled={scanning || !scanCode.trim()}>
                    {scanning ? <CircularProgress size={16} /> : <SearchIcon fontSize="small" />}
                  </IconButton>
                </InputAdornment>
              )
            }}
          />
        </Box>

        {/* Action Buttons */}
        <Stack direction="row" spacing={1.5} sx={{ width: { xs: '100%', md: 'auto' }, flexWrap: 'wrap' }}>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => setAddDeviceOpen(true)}
            sx={{ fontWeight: 600, flex: { xs: 1, sm: 'auto' } }}
          >
            Add Device
          </Button>
          <Button
            variant="outlined"
            color="primary"
            startIcon={<ShippingIcon />}
            onClick={() => setAddShipmentOpen(true)}
            sx={{ fontWeight: 600, flex: { xs: 1, sm: 'auto' } }}
          >
            New Shipment
          </Button>
          <Button
            variant="outlined"
            color="success"
            startIcon={<SaleIcon />}
            onClick={() => setRecordSaleOpen(true)}
            sx={{ fontWeight: 600, flex: { xs: 1, sm: 'auto' } }}
          >
            Record Sale
          </Button>
        </Stack>
      </Paper>

      {/* 8 Uniform Metric Cards Grid */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        {statCards.map((card, idx) => (
          <Grid item xs={12} sm={6} md={3} key={idx}>
            <Card
              sx={{
                height: 108,
                display: 'flex',
                alignItems: 'center',
                p: 2,
                borderRadius: 2,
                border: 1,
                borderColor: 'divider',
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: (theme) =>
                    theme.palette.mode === 'dark'
                      ? '0 8px 24px rgba(0,0,0,0.4)'
                      : '0 8px 24px rgba(0,0,0,0.06)'
                }
              }}
            >
              {/* Uniform 52px Icon Container */}
              <Box
                sx={{
                  width: 52,
                  height: 52,
                  minWidth: 52,
                  borderRadius: '12px',
                  backgroundColor: card.bgLight,
                  color: card.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mr: 2
                }}
              >
                {card.icon}
              </Box>

              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  fontWeight={700}
                  sx={{
                    textTransform: 'uppercase',
                    letterSpacing: 0.6,
                    fontSize: '0.72rem',
                    display: 'block'
                  }}
                  noWrap
                >
                  {card.title}
                </Typography>
                <Typography
                  variant="h5"
                  fontWeight={800}
                  sx={{
                    mt: 0.3,
                    fontFamily: '"JetBrains Mono", monospace',
                    letterSpacing: -0.5
                  }}
                  noWrap
                >
                  {loading ? '...' : card.value}
                </Typography>
              </Box>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Employee Assigned Devices Custody Section */}
      {(user?.role === 'EMPLOYEE' || myAssignedDevices.length > 0) && (
        <Paper
          variant="outlined"
          sx={{
            p: { xs: 2, sm: 2.5 },
            mb: 4,
            borderRadius: 3,
            borderColor: 'primary.main',
            bgcolor: (t) => (t.palette.mode === 'dark' ? 'rgba(30, 41, 59, 0.4)' : '#FFFFFF')
          }}
        >
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: 2,
              flexWrap: 'wrap',
              gap: 1.5
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box
                sx={{
                  width: { xs: 34, sm: 38 },
                  height: { xs: 34, sm: 38 },
                  borderRadius: 2,
                  bgcolor: 'primary.main',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                <AssignmentIndIcon sx={{ fontSize: { xs: 18, sm: 20 } }} />
              </Box>
              <Box>
                <Typography variant="subtitle1" fontWeight={800} sx={{ fontSize: { xs: '0.95rem', sm: '1.05rem' } }}>
                  My Assigned Devices in Physical Custody
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {myAssignedDevices.length} device{myAssignedDevices.length === 1 ? '' : 's'} currently assigned to your account
                </Typography>
              </Box>
            </Box>

            <Box sx={{ width: { xs: '100%', sm: 260 } }}>
              <TextField
                fullWidth
                size="small"
                placeholder="Filter assigned devices..."
                value={assignedSearch}
                onChange={(e) => setAssignedSearch(e.target.value)}
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

          {/* 1. Mobile Cards View for Admin Custody (xs & sm) */}
          <Box sx={{ display: { xs: 'flex', md: 'none' }, flexDirection: 'column', gap: 1.5 }}>
            {myAssignedDevices.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 3, color: 'text.secondary' }}>
                <Typography variant="body2">No devices are currently assigned to your custody.</Typography>
              </Box>
            ) : (
              myAssignedDevices
                .filter((d) => {
                  if (!assignedSearch) return true;
                  const q = assignedSearch.toLowerCase();
                  return (
                    d.model?.toLowerCase().includes(q) ||
                    d.imei?.toLowerCase().includes(q) ||
                    d.serial_number?.toLowerCase().includes(q) ||
                    d.color?.toLowerCase().includes(q)
                  );
                })
                .map((dev) => (
                  <Card
                    key={dev.id}
                    variant="outlined"
                    onClick={() => {
                      setSelectedDevice(dev);
                      setDrawerOpen(true);
                    }}
                    sx={{
                      p: 2,
                      borderRadius: 2.5,
                      cursor: 'pointer',
                      transition: 'border-color 0.2s, box-shadow 0.2s',
                      '&:hover': {
                        borderColor: 'primary.main',
                        boxShadow: (theme) =>
                          theme.palette.mode === 'dark'
                            ? '0 4px 16px rgba(0,0,0,0.3)'
                            : '0 4px 16px rgba(0,0,0,0.06)'
                      }
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1, mb: 1.2 }}>
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography variant="subtitle2" fontWeight={800} noWrap>
                          {dev.model}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
                          {dev.capacity || ''} {dev.color ? `• ${dev.color}` : ''}
                        </Typography>
                      </Box>
                      <StatusBadge status={dev.current_status} />
                    </Box>

                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        p: 1,
                        mb: 1.2,
                        borderRadius: 1.5,
                        bgcolor: (theme) =>
                          theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <CopyableText text={dev.imei} />
                      <VariantBadge variant={dev.variant} />
                    </Box>

                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: 1
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                        <Typography variant="caption" fontWeight={700} color="text.secondary">
                          Battery:
                        </Typography>
                        <Typography variant="caption" fontWeight={800}>
                          {dev.battery_health ? `${dev.battery_health}%` : '—'}
                        </Typography>
                        {(dev.battery_cycle !== null && dev.battery_cycle !== undefined && dev.battery_cycle !== '') ? (
                          <Chip
                            label={`CC ${dev.battery_cycle}`}
                            size="small"
                            sx={{ height: 18, fontSize: '0.65rem', fontWeight: 700 }}
                          />
                        ) : (dev.battery_cycles !== null && dev.battery_cycles !== undefined && dev.battery_cycles !== '') ? (
                          <Chip
                            label={`CC ${dev.battery_cycles}`}
                            size="small"
                            sx={{ height: 18, fontSize: '0.65rem', fontWeight: 700 }}
                          />
                        ) : null}
                      </Box>

                      <Typography variant="caption" color="text.secondary">
                        {dev.received_date_bd || formatDate(dev.created_at)}
                      </Typography>
                    </Box>
                  </Card>
                ))
            )}
          </Box>

          {/* 2. Desktop Table View (md+) */}
          <TableContainer sx={{ display: { xs: 'none', md: 'block' } }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'action.hover' }}>
                  <TableCell sx={{ fontWeight: 700 }}>Model</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>IMEI Number</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Variant</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Battery Health</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Current Status</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Received Date</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {myAssignedDevices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                      No devices are currently assigned to your custody.
                    </TableCell>
                  </TableRow>
                ) : (
                  myAssignedDevices
                    .filter((d) => {
                      if (!assignedSearch) return true;
                      const q = assignedSearch.toLowerCase();
                      return (
                        d.model?.toLowerCase().includes(q) ||
                        d.imei?.toLowerCase().includes(q) ||
                        d.serial_number?.toLowerCase().includes(q) ||
                        d.color?.toLowerCase().includes(q)
                      );
                    })
                    .map((dev) => (
                      <TableRow
                        key={dev.id}
                        hover
                        sx={{ cursor: 'pointer' }}
                        onClick={() => {
                          setSelectedDevice(dev);
                          setDrawerOpen(true);
                        }}
                      >
                        <TableCell>
                          <Typography variant="body2" fontWeight={600}>
                            {dev.model}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {dev.capacity || ''} {dev.color ? `• ${dev.color}` : ''}
                          </Typography>
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <CopyableText text={dev.imei} />
                        </TableCell>
                        <TableCell>
                          <VariantBadge variant={dev.variant} />
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, flexWrap: 'nowrap' }}>
                            <Typography variant="body2" fontWeight={700}>
                              {dev.battery_health ? `${dev.battery_health}%` : '—'}
                            </Typography>
                            {(dev.battery_cycle !== null && dev.battery_cycle !== undefined && dev.battery_cycle !== '') ? (
                              <Chip
                                label={`CC ${dev.battery_cycle}`}
                                size="small"
                                sx={{
                                  height: 20,
                                  fontSize: '0.7rem',
                                  fontWeight: 700,
                                  bgcolor: (theme) =>
                                    theme.palette.mode === 'dark' ? 'rgba(148, 163, 184, 0.15)' : '#F1F5F9',
                                  color: (theme) =>
                                    theme.palette.mode === 'dark' ? '#CBD5E1' : '#475569',
                                  borderRadius: 1
                                }}
                              />
                            ) : (dev.battery_cycles !== null && dev.battery_cycles !== undefined && dev.battery_cycles !== '') ? (
                              <Chip
                                label={`CC ${dev.battery_cycles}`}
                                size="small"
                                sx={{
                                  height: 20,
                                  fontSize: '0.7rem',
                                  fontWeight: 700,
                                  bgcolor: (theme) =>
                                    theme.palette.mode === 'dark' ? 'rgba(148, 163, 184, 0.15)' : '#F1F5F9',
                                  color: (theme) =>
                                    theme.palette.mode === 'dark' ? '#CBD5E1' : '#475569',
                                  borderRadius: 1
                                }}
                              />
                            ) : null}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={dev.current_status} />
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" color="text.secondary">
                            {dev.received_date_bd || formatDate(dev.created_at)}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* Tables Section: Recent Inventory & Recent Sales */}
      <Grid container spacing={3}>
        {/* Recent Inventory Devices */}
        <Grid item xs={12} lg={6}>
          <Paper
            variant="outlined"
            sx={{
              p: 2.5,
              borderRadius: 3,
              height: '100%',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="subtitle1" fontWeight={700}>
                Recent Inventory Additions
              </Typography>
              <Button
                size="small"
                endIcon={<ArrowForwardIcon />}
                onClick={() => navigate('/inventory')}
              >
                View All
              </Button>
            </Box>

            <TableContainer sx={{ flex: 1 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Model</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Variant</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>IMEI</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {recentDevices.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                        No devices found in inventory.
                      </TableCell>
                    </TableRow>
                  ) : (
                    recentDevices.map((dev) => (
                      <TableRow
                        key={dev.id}
                        hover
                        sx={{ cursor: 'pointer' }}
                        onClick={() => {
                          setSelectedDevice(dev);
                          setDrawerOpen(true);
                        }}
                      >
                        <TableCell>
                          <Typography variant="body2" fontWeight={600}>
                            {dev.model}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {dev.capacity || ''} {dev.color ? `• ${dev.color}` : ''}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <VariantBadge variant={dev.variant} />
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <CopyableText text={dev.imei} />
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={dev.current_status} />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        {/* Recent Sales */}
        <Grid item xs={12} lg={6}>
          <Paper
            variant="outlined"
            sx={{
              p: 2.5,
              borderRadius: 3,
              height: '100%',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="subtitle1" fontWeight={700}>
                Recent Sales & Invoices
              </Typography>
              <Button
                size="small"
                endIcon={<ArrowForwardIcon />}
                onClick={() => navigate('/sales')}
              >
                View Sales
              </Button>
            </Box>

            <TableContainer sx={{ flex: 1 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Device</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Sold Date</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Selling Price</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Sold By</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {recentSales.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                        No sales recorded yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    recentSales.map((sale) => (
                      <TableRow key={sale.id} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight={600}>
                            {sale.device_model || 'Device Unit'}
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, mt: 0.3, flexWrap: 'wrap' }}>
                            {sale.device_variant && (
                              <VariantBadge variant={sale.device_variant} />
                            )}
                            {(sale.device_capacity || sale.device_color) && (
                              <Typography variant="caption" color="text.secondary">
                                {sale.device_capacity || ''} {sale.device_color ? `• ${sale.device_color}` : ''}
                              </Typography>
                            )}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {formatDate(sale.sale_date || sale.created_at)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight={700} color="primary.main">
                            {formatNumber(sale.selling_price || sale.final_price)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            icon={<PersonIcon sx={{ fontSize: '13px !important', color: '#0284c7 !important' }} />}
                            label={sale.sold_by || sale.seller_name || 'Store'}
                            sx={{
                              bgcolor: 'rgba(2, 132, 199, 0.1)',
                              color: '#0284c7',
                              fontWeight: 600,
                              fontSize: '0.75rem',
                              height: 24
                            }}
                          />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>
      </Grid>

      {/* Dialogs & Drawers */}
      <AddDeviceDialog
        open={addDeviceOpen}
        onClose={() => setAddDeviceOpen(false)}
        onDeviceCreated={() => fetchDashboardData()}
      />

      <AddShipmentDialog
        open={addShipmentOpen}
        onClose={() => setAddShipmentOpen(false)}
        onShipmentCreated={() => fetchDashboardData()}
      />

      <RecordSaleDialog
        open={recordSaleOpen}
        onClose={() => setRecordSaleOpen(false)}
        onSaleRecorded={() => fetchDashboardData()}
      />

      <DeviceDetailDrawer
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setSelectedDevice(null);
        }}
        device={selectedDevice}
        onDeviceUpdated={(updated) => {
          setSelectedDevice(updated);
          fetchDashboardData();
        }}
        onEditRequested={(dev) => {
          setEditDevice(dev);
          setEditDialogOpen(true);
        }}
        onDeviceDeleted={() => fetchDashboardData()}
      />

      <EditDeviceDialog
        open={editDialogOpen}
        onClose={() => {
          setEditDialogOpen(false);
          setEditDevice(null);
        }}
        device={editDevice}
        onDeviceUpdated={() => fetchDashboardData()}
      />

      <ManageEmployeesDialog
        open={manageEmployeesOpen}
        onClose={() => setManageEmployeesOpen(false)}
        onEmployeeUpdated={() => fetchDashboardData()}
        initialTab={manageEmployeesTab}
      />
    </Box>
  );
}
