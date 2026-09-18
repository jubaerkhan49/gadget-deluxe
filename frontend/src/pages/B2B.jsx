import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  InputAdornment,
  Chip,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  IconButton,
  CircularProgress,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Tooltip,
  Grid,
  Card,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions
} from '@mui/material';
import {
  Storefront as B2bIcon,
  Search as SearchIcon,
  Add as AddIcon,
  Refresh as RefreshIcon,
  Edit as EditIcon,
  Build as RepairIcon,
  CheckCircle as DeliveredIcon,
  Warning as IssueIcon,
  CheckCircleOutline as CleanIcon,
  DeleteOutline as DeleteIcon,
  BatteryChargingFull as BatteryIcon,
  AttachMoney as MoneyIcon,
  CalendarToday as DateIcon,
  Clear as ClearIcon,
  LocalShipping as ShippingIcon,
  Inventory2 as InventoryIcon
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { deviceApi } from '../api/client';
import VariantBadge from '../components/common/VariantBadge';
import CopyableText from '../components/common/CopyableText';
import { formatNumber } from '../utils/formatters';
import EditB2BDeviceDialog from '../dialogs/EditB2BDeviceDialog';
import AddRepairDialog from '../dialogs/AddRepairDialog';

export default function B2B() {
  const { enqueueSnackbar } = useSnackbar();

  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedShop, setSelectedShop] = useState('ALL');
  const [selectedIssueFilter, setSelectedIssueFilter] = useState('ALL');

  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  // Dialog states
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState(null);

  const [repairDialogOpen, setRepairDialogOpen] = useState(false);
  const [repairDevice, setRepairDevice] = useState(null);

  const [addDeviceOpen, setAddDeviceOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deviceToDelete, setDeviceToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Quick Add State
  const [newDevice, setNewDevice] = useState({
    model: '',
    variant: 'USA eSim',
    capacity: '256GB',
    color: '',
    imei: '',
    buying_price: '',
    b2b_selling_price: '',
    b2b_shop_name: '',
    b2b_delivery_date: new Date().toISOString().split('T')[0],
    battery_health: '',
    b2b_has_issues: false,
    b2b_issue_notes: ''
  });
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    fetchB2BDevices();
    const interval = setInterval(() => {
      fetchB2BDevices(true);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchB2BDevices = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const res = await deviceApi.getAll({ is_b2b: true });
      const allDevs = res.data.results || res.data || [];
      // Additional safety filter for client-side
      setDevices(allDevs.filter((d) => d.is_b2b));
    } catch (err) {
      console.error(err);
      if (!silent) enqueueSnackbar('Failed to fetch B2B inventory', { variant: 'error' });
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const handleManualRefresh = async () => {
    setRefreshing(true);
    await fetchB2BDevices(true);
    setRefreshing(false);
    enqueueSnackbar('B2B inventory synced live', { variant: 'success', autoHideDuration: 1500 });
  };

  // Distinct shop names for filter
  const distinctShops = useMemo(() => {
    const shops = new Set();
    devices.forEach((d) => {
      if (d.b2b_shop_name?.trim()) shops.add(d.b2b_shop_name.trim());
    });
    return Array.from(shops).sort();
  }, [devices]);

  // Key KPI metrics
  const totalB2B = devices.length;
  const deliveredCount = devices.filter((d) => d.b2b_status === 'DELIVERED').length;
  const underRepairCount = devices.filter((d) => d.b2b_status === 'SENT_FOR_REPAIR' || d.current_status === 'UNDER_REPAIR').length;
  const inInventoryCount = devices.filter((d) => d.b2b_status === 'IN_INVENTORY' && d.current_status !== 'UNDER_REPAIR').length;

  const totalCalculatedProfit = useMemo(() => {
    return devices.reduce((sum, d) => {
      const profit = Number(d.b2b_profit) || 0;
      return sum + profit;
    }, 0);
  }, [devices]);

  // Filtering
  const filteredDevices = useMemo(() => {
    return devices.filter((d) => {
      if (selectedStatus !== 'ALL') {
        if (selectedStatus === 'UNDER_REPAIR') {
          if (d.b2b_status !== 'SENT_FOR_REPAIR' && d.current_status !== 'UNDER_REPAIR') return false;
        } else if (d.b2b_status !== selectedStatus) {
          return false;
        }
      }

      if (selectedShop !== 'ALL') {
        if ((d.b2b_shop_name || '').trim().toLowerCase() !== selectedShop.toLowerCase()) return false;
      }

      if (selectedIssueFilter !== 'ALL') {
        if (selectedIssueFilter === 'ISSUES' && !d.b2b_has_issues) return false;
        if (selectedIssueFilter === 'CLEAN' && d.b2b_has_issues) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const modelMatch = (d.model || '').toLowerCase().includes(q);
        const imeiMatch = (d.imei || '').toLowerCase().includes(q);
        const imei2Match = (d.imei2 || '').toLowerCase().includes(q);
        const serialMatch = (d.serial_number || '').toLowerCase().includes(q);
        const shopMatch = (d.b2b_shop_name || '').toLowerCase().includes(q);
        const issueMatch = (d.b2b_issue_notes || '').toLowerCase().includes(q);
        if (!modelMatch && !imeiMatch && !imei2Match && !serialMatch && !shopMatch && !issueMatch) {
          return false;
        }
      }

      return true;
    });
  }, [devices, selectedStatus, selectedShop, selectedIssueFilter, searchQuery]);

  const paginatedDevices = useMemo(() => {
    return filteredDevices.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  }, [filteredDevices, page, rowsPerPage]);

  const handleEditDevice = (device) => {
    setSelectedDevice(device);
    setEditDialogOpen(true);
  };

  const handleSendToRepair = (device) => {
    setRepairDevice(device);
    setRepairDialogOpen(true);
  };

  const handleQuickMarkDelivered = async (device) => {
    try {
      const nextStatus = device.b2b_status === 'DELIVERED' ? 'IN_INVENTORY' : 'DELIVERED';
      await deviceApi.update(device.id, {
        b2b_status: nextStatus,
        b2b_delivery_date: nextStatus === 'DELIVERED' ? new Date().toISOString().split('T')[0] : device.b2b_delivery_date
      });
      enqueueSnackbar(
        nextStatus === 'DELIVERED'
          ? `Marked as Delivered to ${device.b2b_shop_name || 'Client'}`
          : 'Status returned to In Inventory',
        { variant: 'success' }
      );
      fetchB2BDevices(true);
    } catch (err) {
      enqueueSnackbar('Failed to update status', { variant: 'error' });
    }
  };

  const handleDeletePrompt = (device) => {
    setDeviceToDelete(device);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteDevice = async () => {
    if (!deviceToDelete) return;
    try {
      setDeleting(true);
      await deviceApi.delete(deviceToDelete.id);
      enqueueSnackbar('Device deleted successfully', { variant: 'success' });
      setDeleteConfirmOpen(false);
      setDeviceToDelete(null);
      fetchB2BDevices(true);
    } catch (err) {
      enqueueSnackbar('Failed to delete device', { variant: 'error' });
    } finally {
      setDeleting(false);
    }
  };

  const handleCreateB2bDevice = async (e) => {
    e.preventDefault();
    if (!newDevice.model.trim() || !newDevice.imei.trim() || !newDevice.b2b_shop_name.trim()) {
      enqueueSnackbar('Model, IMEI, and Shop Name are required', { variant: 'warning' });
      return;
    }

    try {
      setAdding(true);
      const payload = {
        model: newDevice.model.trim(),
        variant: newDevice.variant,
        capacity: newDevice.capacity.trim(),
        color: newDevice.color.trim(),
        imei: newDevice.imei.trim(),
        buying_price: newDevice.buying_price !== '' ? Number(newDevice.buying_price) : null,
        b2b_selling_price: newDevice.b2b_selling_price !== '' ? Number(newDevice.b2b_selling_price) : null,
        battery_health: newDevice.battery_health !== '' ? parseInt(newDevice.battery_health, 10) : null,
        b2b_shop_name: newDevice.b2b_shop_name.trim(),
        b2b_delivery_date: newDevice.b2b_delivery_date || null,
        b2b_has_issues: newDevice.b2b_has_issues,
        b2b_issue_notes: newDevice.b2b_has_issues ? newDevice.b2b_issue_notes.trim() : '',
        is_b2b: true,
        b2b_status: 'IN_INVENTORY',
        current_status: 'IN_STOCK',
        received_date_bd: new Date().toISOString().split('T')[0]
      };

      await deviceApi.create(payload);
      enqueueSnackbar('B2B Device created successfully!', { variant: 'success' });
      setAddDeviceOpen(false);
      setNewDevice({
        model: '',
        variant: 'USA eSim',
        capacity: '256GB',
        color: '',
        imei: '',
        buying_price: '',
        b2b_selling_price: '',
        b2b_shop_name: '',
        b2b_delivery_date: new Date().toISOString().split('T')[0],
        battery_health: '',
        b2b_has_issues: false,
        b2b_issue_notes: ''
      });
      fetchB2BDevices(true);
    } catch (err) {
      console.error(err);
      enqueueSnackbar(err.response?.data?.detail || 'Failed to add B2B device', { variant: 'error' });
    } finally {
      setAdding(false);
    }
  };

  const getStatusChip = (device) => {
    if (device.current_status === 'UNDER_REPAIR' || device.b2b_status === 'SENT_FOR_REPAIR') {
      return (
        <Chip
          size="small"
          icon={<RepairIcon sx={{ fontSize: '0.9rem !important' }} />}
          label="Under Repair"
          sx={{
            bgcolor: 'rgba(245, 158, 11, 0.15)',
            color: '#D97706',
            fontWeight: 700,
            border: '1px solid rgba(245, 158, 11, 0.3)'
          }}
        />
      );
    }
    if (device.b2b_status === 'DELIVERED') {
      return (
        <Chip
          size="small"
          icon={<DeliveredIcon sx={{ fontSize: '0.9rem !important' }} />}
          label="Delivered"
          sx={{
            bgcolor: 'rgba(16, 185, 129, 0.15)',
            color: '#059669',
            fontWeight: 700,
            border: '1px solid rgba(16, 185, 129, 0.3)'
          }}
        />
      );
    }
    if (device.b2b_status === 'CANCELLED') {
      return <Chip size="small" label="Cancelled" color="error" variant="outlined" sx={{ fontWeight: 700 }} />;
    }
    return (
      <Chip
        size="small"
        label="In Inventory"
        sx={{
          bgcolor: 'rgba(147, 51, 234, 0.12)',
          color: '#9333EA',
          fontWeight: 700,
          border: '1px solid rgba(147, 51, 234, 0.25)'
        }}
      />
    );
  };

  return (
    <Box sx={{ pb: 4 }}>
      {/* Page Header */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', sm: 'center' },
          gap: 2,
          mb: 3
        }}
      >
        <div>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: 2.5,
                bgcolor: 'rgba(147, 51, 234, 0.15)',
                color: '#9333EA',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <B2bIcon fontSize="medium" />
            </Box>
            <div>
              <Typography variant="h5" fontWeight={800}>
                B2B (Business to Business)
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Client pre-orders, partner equipment, repair round-trips, and trade profits.
              </Typography>
            </div>
          </Box>
        </div>

        <Stack direction="row" spacing={1.5} sx={{ width: { xs: '100%', sm: 'auto' } }}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<RefreshIcon sx={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />}
            onClick={handleManualRefresh}
            disabled={refreshing}
            sx={{ borderRadius: 2 }}
          >
            Live Sync
          </Button>

          <Button
            variant="contained"
            size="small"
            startIcon={<AddIcon />}
            onClick={() => setAddDeviceOpen(true)}
            sx={{
              borderRadius: 2,
              fontWeight: 700,
              background: 'linear-gradient(135deg, #9333EA 0%, #7928CA 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #7E22CE 0%, #6B21A8 100%)'
              }
            }}
          >
            Add B2B Device
          </Button>
        </Stack>
      </Box>

      {/* KPI Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card
            sx={{
              p: 2,
              borderRadius: 3,
              border: 1,
              borderColor: 'divider',
              background: (theme) => theme.palette.mode === 'dark' ? 'rgba(147, 51, 234, 0.05)' : '#FAF5FF'
            }}
          >
            <Typography variant="caption" color="text.secondary" fontWeight={700}>
              TOTAL B2B DEVICES
            </Typography>
            <Typography variant="h4" fontWeight={800} sx={{ color: '#9333EA', my: 0.5 }}>
              {totalB2B}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Client-funded equipment
            </Typography>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={2.4}>
          <Card
            sx={{
              p: 2,
              borderRadius: 3,
              border: 1,
              borderColor: 'divider',
              background: (theme) => theme.palette.mode === 'dark' ? 'rgba(59, 130, 246, 0.05)' : '#EFF6FF'
            }}
          >
            <Typography variant="caption" color="text.secondary" fontWeight={700}>
              READY / IN STOCK
            </Typography>
            <Typography variant="h4" fontWeight={800} color="primary.main" sx={{ my: 0.5 }}>
              {inInventoryCount}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Awaiting delivery to shop
            </Typography>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={2.4}>
          <Card
            sx={{
              p: 2,
              borderRadius: 3,
              border: 1,
              borderColor: 'divider',
              background: (theme) => theme.palette.mode === 'dark' ? 'rgba(245, 158, 11, 0.05)' : '#FFFBEB'
            }}
          >
            <Typography variant="caption" color="text.secondary" fontWeight={700}>
              IN REPAIRS
            </Typography>
            <Typography variant="h4" fontWeight={800} sx={{ color: '#D97706', my: 0.5 }}>
              {underRepairCount}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Shenzhen Lab / Under Service
            </Typography>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={2.4}>
          <Card
            sx={{
              p: 2,
              borderRadius: 3,
              border: 1,
              borderColor: 'divider',
              background: (theme) => theme.palette.mode === 'dark' ? 'rgba(16, 185, 129, 0.05)' : '#ECFDF5'
            }}
          >
            <Typography variant="caption" color="text.secondary" fontWeight={700}>
              DELIVERED
            </Typography>
            <Typography variant="h4" fontWeight={800} sx={{ color: '#059669', my: 0.5 }}>
              {deliveredCount}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Completed client orders
            </Typography>
          </Card>
        </Grid>

        <Grid item xs={12} sm={12} md={2.4}>
          <Card
            sx={{
              p: 2,
              borderRadius: 3,
              border: 1,
              borderColor: 'divider',
              background: (theme) => theme.palette.mode === 'dark' ? 'rgba(16, 185, 129, 0.1)' : '#F0FDF4'
            }}
          >
            <Typography variant="caption" color="text.secondary" fontWeight={700}>
              TOTAL NET PROFIT
            </Typography>
            <Typography variant="h4" fontWeight={800} color="success.main" sx={{ my: 0.5 }}>
              ৳ {totalCalculatedProfit.toLocaleString()}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Selling - Buying - Repairs
            </Typography>
          </Card>
        </Grid>
      </Grid>

      {/* Filter Bar */}
      <Paper variant="outlined" sx={{ p: 2, mb: 3, borderRadius: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search by Model, IMEI, Shop Name, or Issue..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" color="action" />
                  </InputAdornment>
                ),
                endAdornment: searchQuery ? (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setSearchQuery('')}>
                      <ClearIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ) : null
              }}
            />
          </Grid>

          <Grid item xs={6} sm={4} md={2.6}>
            <FormControl fullWidth size="small">
              <InputLabel>Client Shop</InputLabel>
              <Select
                value={selectedShop}
                label="Client Shop"
                onChange={(e) => setSelectedShop(e.target.value)}
              >
                <MenuItem value="ALL">All Shops ({distinctShops.length})</MenuItem>
                {distinctShops.map((shop) => (
                  <MenuItem key={shop} value={shop}>
                    {shop}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={6} sm={4} md={2.6}>
            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select
                value={selectedStatus}
                label="Status"
                onChange={(e) => setSelectedStatus(e.target.value)}
              >
                <MenuItem value="ALL">All Statuses</MenuItem>
                <MenuItem value="IN_INVENTORY">In Inventory (Ready)</MenuItem>
                <MenuItem value="UNDER_REPAIR">Under Repair</MenuItem>
                <MenuItem value="DELIVERED">Delivered</MenuItem>
                <MenuItem value="CANCELLED">Cancelled</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={4} md={2.8}>
            <FormControl fullWidth size="small">
              <InputLabel>Diagnostic Condition</InputLabel>
              <Select
                value={selectedIssueFilter}
                label="Diagnostic Condition"
                onChange={(e) => setSelectedIssueFilter(e.target.value)}
              >
                <MenuItem value="ALL">All Conditions</MenuItem>
                <MenuItem value="CLEAN">Clean (No Issues)</MenuItem>
                <MenuItem value="ISSUES">Has Issues / Defects</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {/* Equipment Table */}
      <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
        <TableContainer>
          <Table size="medium">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Device Model</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>IMEI / Serial</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Client Shop</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Battery & Cycles</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Delivery Date</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Diagnostics</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Pricing & Net Profit</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, pr: 2.5, minWidth: 160 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 6 }}>
                    <CircularProgress size={32} />
                  </TableCell>
                </TableRow>
              ) : paginatedDevices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                    <Box sx={{ py: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                      <B2bIcon sx={{ fontSize: 44, color: 'text.secondary', opacity: 0.5 }} />
                      <Typography variant="body1" fontWeight={600}>
                        No B2B devices found
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Assign devices from shipments via "Move to B2B" or click "Add B2B Device".
                      </Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedDevices.map((dev) => {
                  const buy = Number(dev.buying_price) || 0;
                  const sell = Number(dev.b2b_selling_price) || 0;
                  const repairs = Number(dev.b2b_repair_cost) || 0;
                  const netProfit = Number(dev.b2b_profit) || (sell > 0 ? sell - buy - repairs : 0);

                  return (
                    <TableRow key={dev.id} hover>
                      {/* Model & Specs */}
                      <TableCell>
                        <Typography variant="body2" fontWeight={700}>
                          {dev.model}
                        </Typography>
                        <Stack direction="row" spacing={0.8} alignItems="center" sx={{ mt: 0.4 }}>
                          <VariantBadge variant={dev.variant} />
                          <Typography variant="caption" color="text.secondary">
                            {dev.capacity || ''} {dev.color ? `• ${dev.color}` : ''}
                          </Typography>
                        </Stack>
                      </TableCell>

                      {/* IMEI & Serial */}
                      <TableCell>
                        <CopyableText text={dev.imei} />
                        {dev.serial_number && (
                          <Typography variant="caption" color="text.secondary" display="block">
                            SN: {dev.serial_number}
                          </Typography>
                        )}
                      </TableCell>

                      {/* Client Shop */}
                      <TableCell>
                        <Box
                          sx={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 0.6,
                            px: 1.2,
                            py: 0.4,
                            borderRadius: 1.5,
                            bgcolor: 'rgba(147, 51, 234, 0.1)',
                            border: '1px solid rgba(147, 51, 234, 0.25)',
                            color: '#9333EA',
                            fontWeight: 700,
                            fontSize: '0.8rem'
                          }}
                        >
                          <B2bIcon sx={{ fontSize: 15 }} />
                          {dev.b2b_shop_name || 'Unassigned'}
                        </Box>
                      </TableCell>

                      {/* Battery Health & Cycles */}
                      <TableCell>
                        {dev.battery_health !== null && dev.battery_health !== undefined ? (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                            <Box
                              sx={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 0.4,
                                px: 0.8,
                                py: 0.2,
                                borderRadius: 1,
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                bgcolor: dev.battery_health >= 85 ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                                color: dev.battery_health >= 85 ? '#059669' : '#DC2626'
                              }}
                            >
                              <BatteryIcon sx={{ fontSize: 14 }} />
                              {dev.battery_health}%
                            </Box>
                            {dev.battery_cycles !== null && dev.battery_cycles !== undefined && (
                              <Typography variant="caption" color="text.secondary">
                                {dev.battery_cycles}c
                              </Typography>
                            )}
                          </Box>
                        ) : (
                          <Typography variant="caption" color="text.secondary">
                            —
                          </Typography>
                        )}
                      </TableCell>

                      {/* Delivery Date */}
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>
                          {dev.b2b_delivery_date || '—'}
                        </Typography>
                      </TableCell>

                      {/* Diagnostics */}
                      <TableCell>
                        {dev.b2b_has_issues ? (
                          <Tooltip title={dev.b2b_issue_notes || 'Defect reported'} arrow>
                            <Chip
                              size="small"
                              icon={<IssueIcon sx={{ fontSize: '0.9rem !important' }} />}
                              label="Issue Reported"
                              sx={{
                                bgcolor: 'rgba(239, 68, 68, 0.12)',
                                color: '#DC2626',
                                fontWeight: 700,
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                cursor: 'help'
                              }}
                            />
                          </Tooltip>
                        ) : (
                          <Chip
                            size="small"
                            icon={<CleanIcon sx={{ fontSize: '0.9rem !important' }} />}
                            label="Clean"
                            sx={{
                              bgcolor: 'rgba(16, 185, 129, 0.1)',
                              color: '#059669',
                              fontWeight: 700,
                              border: '1px solid rgba(16, 185, 129, 0.25)'
                            }}
                          />
                        )}
                      </TableCell>

                      {/* Pricing & Net Profit */}
                      <TableCell>
                        <Typography variant="body2" fontWeight={800} color="success.main">
                          {sell > 0 ? `+৳ ${netProfit.toLocaleString()}` : '—'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" display="block">
                          Sell: {sell ? formatNumber(sell) : '—'} • Buy: {buy ? formatNumber(buy) : '—'}
                          {repairs > 0 && ` • Rep: ${formatNumber(repairs)}`}
                        </Typography>
                      </TableCell>

                      {/* Status */}
                      <TableCell>
                        {getStatusChip(dev)}
                      </TableCell>

                      {/* Actions */}
                      <TableCell align="right" sx={{ pr: 2.5 }}>
                        <Stack direction="row" spacing={0.8} justifyContent="flex-end" alignItems="center">
                          {/* Send to Repair */}
                          <Tooltip title="Send to Repair Lab">
                            <IconButton
                              size="small"
                              onClick={() => handleSendToRepair(dev)}
                              sx={{
                                color: '#D97706',
                                bgcolor: 'rgba(245, 158, 11, 0.1)',
                                '&:hover': { bgcolor: 'rgba(245, 158, 11, 0.2)' }
                              }}
                            >
                              <RepairIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>

                          {/* Quick Delivered Toggle */}
                          <Tooltip title={dev.b2b_status === 'DELIVERED' ? 'Mark In Inventory' : 'Mark Delivered to Shop'}>
                            <IconButton
                              size="small"
                              onClick={() => handleQuickMarkDelivered(dev)}
                              sx={{
                                color: dev.b2b_status === 'DELIVERED' ? '#059669' : 'action.active',
                                bgcolor: dev.b2b_status === 'DELIVERED' ? 'rgba(16, 185, 129, 0.1)' : 'transparent',
                                '&:hover': { bgcolor: 'rgba(16, 185, 129, 0.2)' }
                              }}
                            >
                              <DeliveredIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>

                          {/* Edit Details */}
                          <Tooltip title="Edit B2B Equipment Details">
                            <IconButton
                              size="small"
                              onClick={() => handleEditDevice(dev)}
                              sx={{ color: '#9333EA' }}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>

                          {/* Delete */}
                          <Tooltip title="Delete Device">
                            <IconButton
                              size="small"
                              onClick={() => handleDeletePrompt(dev)}
                              sx={{ color: 'error.main' }}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          rowsPerPageOptions={[10, 25, 50, 100]}
          component="div"
          count={filteredDevices.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
        />
      </Paper>

      {/* Edit B2B Device Dialog */}
      {selectedDevice && (
        <EditB2BDeviceDialog
          open={editDialogOpen}
          device={selectedDevice}
          onClose={() => {
            setEditDialogOpen(false);
            setSelectedDevice(null);
          }}
          onUpdated={() => fetchB2BDevices(true)}
        />
      )}

      {/* Send to Repair Dialog */}
      {repairDevice && (
        <AddRepairDialog
          open={repairDialogOpen}
          initialDevice={repairDevice}
          onClose={() => {
            setRepairDialogOpen(false);
            setRepairDevice(null);
          }}
          onRepairCreated={() => {
            fetchB2BDevices(true);
          }}
        />
      )}

      {/* Quick Add B2B Device Modal */}
      <Dialog open={addDeviceOpen} onClose={() => setAddDeviceOpen(false)} maxWidth="sm" fullWidth>
        <form onSubmit={handleCreateB2bDevice}>
          <DialogTitle sx={{ pb: 1, borderBottom: 1, borderColor: 'divider' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box
                sx={{
                  width: 38,
                  height: 38,
                  borderRadius: 2,
                  bgcolor: 'rgba(147, 51, 234, 0.12)',
                  color: '#9333EA',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <B2bIcon />
              </Box>
              <div>
                <Typography variant="h6" fontWeight={800}>
                  Add New B2B Device
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Direct client order entry (isolated from personal capital)
                </Typography>
              </div>
            </Box>
          </DialogTitle>

          <DialogContent sx={{ pt: 2.5 }}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Shop / Business Name"
                  placeholder="e.g. Apple Hub, Gadget Corner"
                  value={newDevice.b2b_shop_name}
                  onChange={(e) => setNewDevice((p) => ({ ...p, b2b_shop_name: e.target.value }))}
                  required
                  autoFocus
                />
              </Grid>

              <Grid item xs={12} sm={7}>
                <TextField
                  fullWidth
                  label="Device Model"
                  placeholder="e.g. iPhone 15 Pro Max"
                  value={newDevice.model}
                  onChange={(e) => setNewDevice((p) => ({ ...p, model: e.target.value }))}
                  required
                />
              </Grid>

              <Grid item xs={12} sm={5}>
                <TextField
                  fullWidth
                  label="Variant"
                  select
                  value={newDevice.variant}
                  onChange={(e) => setNewDevice((p) => ({ ...p, variant: e.target.value }))}
                >
                  {['USA eSim', 'Modified', 'Canada', 'Mexican', 'Korea', 'Singapore', 'Bypass', 'Other'].map((v) => (
                    <MenuItem key={v} value={v}>
                      {v}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Storage Capacity"
                  placeholder="256GB"
                  value={newDevice.capacity}
                  onChange={(e) => setNewDevice((p) => ({ ...p, capacity: e.target.value }))}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Color"
                  placeholder="Natural Titanium"
                  value={newDevice.color}
                  onChange={(e) => setNewDevice((p) => ({ ...p, color: e.target.value }))}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Primary IMEI"
                  value={newDevice.imei}
                  onChange={(e) => setNewDevice((p) => ({ ...p, imei: e.target.value }))}
                  required
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Buying Cost (৳)"
                  value={newDevice.buying_price}
                  onChange={(e) => setNewDevice((p) => ({ ...p, buying_price: e.target.value }))}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Selling Price to Shop (৳)"
                  value={newDevice.b2b_selling_price}
                  onChange={(e) => setNewDevice((p) => ({ ...p, b2b_selling_price: e.target.value }))}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="date"
                  label="Expected Delivery Date"
                  value={newDevice.b2b_delivery_date}
                  onChange={(e) => setNewDevice((p) => ({ ...p, b2b_delivery_date: e.target.value }))}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Battery Health (%)"
                  placeholder="95"
                  value={newDevice.battery_health}
                  onChange={(e) => setNewDevice((p) => ({ ...p, battery_health: e.target.value }))}
                />
              </Grid>
            </Grid>
          </DialogContent>

          <DialogActions sx={{ p: 2.5, borderTop: 1, borderColor: 'divider' }}>
            <Button onClick={() => setAddDeviceOpen(false)} disabled={adding}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={adding}
              startIcon={adding && <CircularProgress size={16} color="inherit" />}
              sx={{
                background: 'linear-gradient(135deg, #9333EA 0%, #7928CA 100%)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #7E22CE 0%, #6B21A8 100%)'
                }
              }}
            >
              Create B2B Device
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Delete B2B Device?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete <strong>{deviceToDelete?.model}</strong> (IMEI: {deviceToDelete?.imei})? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setDeleteConfirmOpen(false)} disabled={deleting}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDeleteDevice}
            disabled={deleting}
            startIcon={deleting ? <CircularProgress size={16} color="inherit" /> : <DeleteIcon />}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
