import React, { useState, useEffect } from 'react';
import { useSmartPolling } from '../utils/useSmartPolling';
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
  Divider,
  Menu
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  FileDownload as ExportIcon,
  Edit as EditIcon,
  DeleteOutline as DeleteIcon,
  Visibility as ViewIcon,
  Clear as ClearIcon,
  MoreVert as MoreVertIcon,
  Refresh as RefreshIcon,
  SwapVert as SortIcon,
  ArrowDownward as ArrowDownwardIcon,
  ArrowUpward as ArrowUpwardIcon
} from '@mui/icons-material';
import { formatNumber, formatDate, downloadCSVBlob, exportDevicesToCSV } from '../utils/formatters';
import { useSnackbar } from 'notistack';
import { deviceApi, userApi } from '../api/client';
import { apiCache } from '../utils/apiCache';
import StatusBadge from '../components/common/StatusBadge';
import VariantBadge from '../components/common/VariantBadge';
import CopyableText from '../components/common/CopyableText';
import AddDeviceDialog from '../dialogs/AddDeviceDialog';
import EditDeviceDialog from '../dialogs/EditDeviceDialog';
import DeviceDetailDrawer from '../dialogs/DeviceDetailDrawer';

const VARIANTS = [
  'All',
  'Modified',
  'USA eSim',
  'Canada',
  'Mexican',
  'Korea',
  'Singapore',
  'WIFI'
];

const STATUS_CHOICES = [
  { value: 'ALL', label: 'All Active Statuses' },
  { value: 'IN_STOCK', label: 'In Stock' },
  { value: 'WAITING_SHIPMENT', label: 'Waiting Shipment' },
  { value: 'UNDER_REPAIR', label: 'Under Repair' }
];

export default function Inventory() {
  const { enqueueSnackbar } = useSnackbar();

  const cachedDevices = apiCache.get('/api/devices/?is_b2b=false') || apiCache.get('/api/devices/');
  const cachedUsers = apiCache.get('/api/users/');

  const [devices, setDevices] = useState(() => {
    if (!cachedDevices) return [];
    const all = cachedDevices.results || cachedDevices || [];
    return all.filter((d) => !d.is_b2b);
  });
  const [users, setUsers] = useState(() => cachedUsers?.results || cachedUsers || []);
  const [loading, setLoading] = useState(() => !cachedDevices);

  // Filters & Sort state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVariant, setSelectedVariant] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedOwner, setSelectedOwner] = useState('ALL');
  const [assignedDateSort, setAssignedDateSort] = useState(null); // null | 'desc' | 'asc'

  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  // Modals / Drawers
  const [addDeviceOpen, setAddDeviceOpen] = useState(false);
  const [editDevice, setEditDevice] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchInventory(Boolean(cachedDevices));
    fetchUsers(Boolean(cachedUsers));
  }, []);

  // Live smart polling every 30s (pauses automatically when tab is minimized/hidden)
  useSmartPolling(() => {
    fetchInventory(true);
  }, 30000);

  const fetchInventory = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const res = await deviceApi.getAll({ is_b2b: false });
      const allDevs = res.data.results || res.data || [];
      const nonB2b = allDevs.filter((d) => !d.is_b2b);
      apiCache.set('/api/devices/?is_b2b=false', nonB2b);
      apiCache.set('/api/devices/', allDevs);
      setDevices(nonB2b);
    } catch (err) {
      console.error(err);
      if (!silent) {
        enqueueSnackbar('Failed to load inventory', { variant: 'error' });
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const handleManualRefresh = async () => {
    try {
      setRefreshing(true);
      await Promise.all([fetchInventory(true), fetchUsers(true)]);
      enqueueSnackbar('Inventory synced live', { variant: 'success', autoHideDuration: 1500 });
    } catch (err) {
      enqueueSnackbar('Failed to sync data', { variant: 'error' });
    } finally {
      setRefreshing(false);
    }
  };

  const fetchUsers = async (silent = false) => {
    try {
      const res = await userApi.getAll();
      const userData = res.data.results || res.data || [];
      apiCache.set('/api/users/', userData);
      setUsers(userData);
    } catch (err) {
      console.error(err);
    }
  };

  const [exporting, setExporting] = useState(false);

  const handleExportCSV = async () => {
    try {
      setExporting(true);
      const res = await deviceApi.exportCSV();
      downloadCSVBlob(res.data, 'inventory_active_devices.csv');
      enqueueSnackbar('Active devices CSV exported successfully', { variant: 'success' });
    } catch (err) {
      console.warn('Backend CSV export failed, using local export fallback:', err);
      try {
        exportDevicesToCSV(filteredDevices.length > 0 ? filteredDevices : devices, 'inventory_active_devices.csv');
        enqueueSnackbar('Active devices CSV exported successfully', { variant: 'success' });
      } catch (fallbackErr) {
        enqueueSnackbar('Failed to export CSV', { variant: 'error' });
      }
    } finally {
      setExporting(false);
    }
  };

  const nonAdminUsers = users.filter((u) => u.username?.toLowerCase() !== 'admin');

  const STATUS_PRIORITY = {
    'IN_STOCK': 1,
    'UNDER_REPAIR': 2,
    'WAITING_SHIPMENT': 3,
    'SOLD': 4,
    'RETURNED': 5,
    'LOST': 6
  };

  // Filter devices in memory for instant responsiveness
  const filteredDevices = devices.filter((dev) => {
    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchImei = dev.imei?.toLowerCase().includes(q);
      const matchImei2 = dev.imei2?.toLowerCase().includes(q);
      const matchSerial = dev.serial_number?.toLowerCase().includes(q);
      const matchModel = dev.model?.toLowerCase().includes(q);
      const matchColor = dev.color?.toLowerCase().includes(q);
      if (!matchImei && !matchImei2 && !matchSerial && !matchModel && !matchColor) {
        return false;
      }
    }

    // Exclude SOLD devices from active inventory (accessible in Archive page)
    if (dev.current_status === 'SOLD') {
      return false;
    }

    // Variant Filter
    if (selectedVariant !== 'ALL') {
      if (selectedVariant === 'WIFI' && dev.variant !== 'WIFI' && dev.variant !== 'Bypass') {
        return false;
      } else if (selectedVariant !== 'WIFI' && dev.variant !== selectedVariant) {
        return false;
      }
    }

    // Status Filter
    if (selectedStatus !== 'ALL' && dev.current_status !== selectedStatus) {
      return false;
    }

    // Owner Filter
    if (selectedOwner !== 'ALL' && String(dev.current_owner) !== String(selectedOwner)) {
      return false;
    }

    return true;
  });

  const handleToggleAssignedDateSort = () => {
    setPage(0);
    setAssignedDateSort((prev) => {
      if (prev === null) return 'desc';
      if (prev === 'desc') return 'asc';
      return null;
    });
  };

  const getAssignedDate = (dev) => {
    if (!dev.current_owner && !dev.current_owner_name) {
      return null;
    }

    // Look for all assignments matching current owner
    const matchingAssignments = (dev.assignments || []).filter(
      (a) => String(a.employee) === String(dev.current_owner) || a.employee_username === dev.current_owner_name
    );

    let assignDateStr = dev.assigned_date || null;

    if (matchingAssignments.length > 0) {
      const latest = matchingAssignments.reduce((prev, curr) => {
        const timeP = new Date(prev.assigned_date || prev.created_at).getTime();
        const timeC = new Date(curr.assigned_date || curr.created_at).getTime();
        return timeC > timeP ? curr : prev;
      }, matchingAssignments[0]);
      assignDateStr = latest.assigned_date || latest.created_at || assignDateStr;
    } else if (!assignDateStr) {
      const anyActive = (dev.assignments || []).find((a) => a.is_active);
      assignDateStr = anyActive?.assigned_date || anyActive?.created_at || dev.created_at;
    }

    return assignDateStr;
  };

  // Sort devices: if assignedDateSort is active, sort by assigned date; otherwise default status priority
  const sortedDevices = [...filteredDevices].sort((a, b) => {
    if (assignedDateSort) {
      const dateStrA = getAssignedDate(a);
      const dateStrB = getAssignedDate(b);

      if (dateStrA && !dateStrB) return -1;
      if (!dateStrA && dateStrB) return 1;
      if (dateStrA && dateStrB) {
        const timeA = new Date(dateStrA).getTime();
        const timeB = new Date(dateStrB).getTime();
        if (timeA !== timeB) {
          return assignedDateSort === 'desc' ? timeB - timeA : timeA - timeB;
        }
      }
    }

    const pA = STATUS_PRIORITY[a.current_status] || 99;
    const pB = STATUS_PRIORITY[b.current_status] || 99;
    if (pA !== pB) {
      return pA - pB;
    }
    const dateA = new Date(a.created_at || 0).getTime();
    const dateB = new Date(b.created_at || 0).getTime();
    return dateB - dateA;
  });

  const paginatedDevices = sortedDevices.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  return (
    <Box sx={{ pb: 4 }}>
      {/* Top Header & Actions */}
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
          <Typography variant="h5" fontWeight={800} letterSpacing={-0.5}>
            Device Inventory
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage, filter and audit active mobile phone assets ({filteredDevices.length} active)
          </Typography>
        </div>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Tooltip title="Live Sync / Refresh">
            <Button
              variant="outlined"
              color="primary"
              onClick={handleManualRefresh}
              disabled={refreshing}
              startIcon={
                <RefreshIcon
                  fontSize="small"
                  sx={{
                    animation: refreshing ? 'spin 0.8s linear infinite' : 'none',
                    '@keyframes spin': {
                      '0%': { transform: 'rotate(0deg)' },
                      '100%': { transform: 'rotate(360deg)' }
                    }
                  }}
                />
              }
              sx={{ fontWeight: 600, borderRadius: 2 }}
            >
              {refreshing ? 'Syncing...' : 'Sync'}
            </Button>
          </Tooltip>
          <Button
            variant="outlined"
            startIcon={exporting ? <CircularProgress size={16} color="inherit" /> : <ExportIcon />}
            onClick={handleExportCSV}
            disabled={exporting}
            sx={{ borderRadius: 2 }}
          >
            {exporting ? 'Exporting...' : 'Export CSV'}
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => setAddDeviceOpen(true)}
            sx={{ borderRadius: 2 }}
          >
            Add Device
          </Button>
        </Stack>
      </Box>

      {/* Filter Control Box */}
      <Paper variant="outlined" sx={{ p: 2.5, mb: 3, borderRadius: 3 }}>
        <Stack spacing={2}>
          {/* Top Filter Bar: Search, Variant, Status & Owner Selectors */}
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', md: 'row' },
              gap: 2,
              alignItems: 'center',
              flexWrap: 'wrap'
            }}
          >
            <TextField
              size="small"
              placeholder="Search by Model, IMEI, Serial, Color..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(0);
              }}
              sx={{ width: { xs: '100%', md: 280, lg: 320 } }}
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

            <FormControl size="small" sx={{ minWidth: 140, width: { xs: '100%', md: 'auto' } }}>
              <InputLabel>Variant</InputLabel>
              <Select
                value={selectedVariant}
                label="Variant"
                onChange={(e) => {
                  setSelectedVariant(e.target.value);
                  setPage(0);
                }}
              >
                <MenuItem value="ALL">All Variants</MenuItem>
                {VARIANTS.filter((v) => v !== 'All').map((v) => (
                  <MenuItem key={v} value={v}>
                    {v}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 150, width: { xs: '100%', md: 'auto' } }}>
              <InputLabel>Status</InputLabel>
              <Select
                value={selectedStatus}
                label="Status"
                onChange={(e) => {
                  setSelectedStatus(e.target.value);
                  setPage(0);
                }}
              >
                {STATUS_CHOICES.map((s) => (
                  <MenuItem key={s.value} value={s.value}>
                    {s.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 170, width: { xs: '100%', md: 'auto' } }}>
              <InputLabel>Assigned To</InputLabel>
              <Select
                value={selectedOwner}
                label="Assigned To"
                onChange={(e) => {
                  setSelectedOwner(e.target.value);
                  setPage(0);
                }}
              >
                <MenuItem value="ALL">All Assignees</MenuItem>
                {nonAdminUsers.map((u) => (
                  <MenuItem key={u.id} value={u.id}>
                    {u.username}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          <Divider />

          {/* Quick Filter Chips */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ mr: 1, textTransform: 'uppercase' }}>
              Filters:
            </Typography>

            {/* All */}
            <Chip
              label="All"
              size="small"
              clickable
              onClick={() => {
                setSelectedStatus('ALL');
                setSelectedOwner('ALL');
                setSelectedVariant('ALL');
                setPage(0);
              }}
              color={selectedStatus === 'ALL' && selectedOwner === 'ALL' && selectedVariant === 'ALL' ? 'primary' : 'default'}
              variant={selectedStatus === 'ALL' && selectedOwner === 'ALL' && selectedVariant === 'ALL' ? 'filled' : 'outlined'}
              sx={{
                fontWeight: selectedStatus === 'ALL' && selectedOwner === 'ALL' && selectedVariant === 'ALL' ? 700 : 500,
                borderRadius: '8px'
              }}
            />

            {/* In Stock */}
            <Chip
              label="In Stock"
              size="small"
              clickable
              onClick={() => {
                setSelectedStatus('IN_STOCK');
                setSelectedOwner('ALL');
                setPage(0);
              }}
              color={selectedStatus === 'IN_STOCK' && selectedOwner === 'ALL' ? 'primary' : 'default'}
              variant={selectedStatus === 'IN_STOCK' && selectedOwner === 'ALL' ? 'filled' : 'outlined'}
              sx={{
                fontWeight: selectedStatus === 'IN_STOCK' && selectedOwner === 'ALL' ? 700 : 500,
                borderRadius: '8px'
              }}
            />

            {/* Owner Names */}
            {nonAdminUsers.map((u) => {
              const isSelected = String(selectedOwner) === String(u.id) && selectedStatus === 'IN_STOCK';
              return (
                <Chip
                  key={u.id}
                  label={u.username}
                  size="small"
                  clickable
                  onClick={() => {
                    setSelectedOwner(u.id);
                    setSelectedStatus('IN_STOCK');
                    setPage(0);
                  }}
                  color={isSelected ? 'primary' : 'default'}
                  variant={isSelected ? 'filled' : 'outlined'}
                  sx={{
                    fontWeight: isSelected ? 700 : 500,
                    borderRadius: '8px',
                    textTransform: 'capitalize'
                  }}
                />
              );
            })}

            {/* Waiting Shipment */}
            <Chip
              label="Waiting Shipment"
              size="small"
              clickable
              onClick={() => {
                setSelectedStatus('WAITING_SHIPMENT');
                setSelectedOwner('ALL');
                setPage(0);
              }}
              color={selectedStatus === 'WAITING_SHIPMENT' && selectedOwner === 'ALL' ? 'primary' : 'default'}
              variant={selectedStatus === 'WAITING_SHIPMENT' && selectedOwner === 'ALL' ? 'filled' : 'outlined'}
              sx={{
                fontWeight: selectedStatus === 'WAITING_SHIPMENT' && selectedOwner === 'ALL' ? 700 : 500,
                borderRadius: '8px'
              }}
            />

            {/* Under Repair */}
            <Chip
              label="Under Repair"
              size="small"
              clickable
              onClick={() => {
                setSelectedStatus('UNDER_REPAIR');
                setSelectedOwner('ALL');
                setPage(0);
              }}
              color={selectedStatus === 'UNDER_REPAIR' && selectedOwner === 'ALL' ? 'primary' : 'default'}
              variant={selectedStatus === 'UNDER_REPAIR' && selectedOwner === 'ALL' ? 'filled' : 'outlined'}
              sx={{
                fontWeight: selectedStatus === 'UNDER_REPAIR' && selectedOwner === 'ALL' ? 700 : 500,
                borderRadius: '8px'
              }}
            />
          </Box>
        </Stack>
      </Paper>

      {/* Devices Count Indicator */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5, px: 0.5 }}>
        <Typography variant="body2" color="text.secondary" fontWeight={600}>
          {filteredDevices.length} {filteredDevices.length === 1 ? 'Device' : 'Devices'} Listed
        </Typography>
      </Box>

      {/* Inventory Mobile Cards View (xs to md) */}
      <Box sx={{ display: { xs: 'flex', md: 'none' }, flexDirection: 'column', gap: 1.5, mb: 2 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress size={32} />
          </Box>
        ) : filteredDevices.length === 0 ? (
          <Paper variant="outlined" sx={{ p: 4, textAlign: 'center', borderRadius: 2 }}>
            <Typography variant="body2" color="text.secondary">
              No devices match your current filters.
            </Typography>
          </Paper>
        ) : (
          paginatedDevices.map((dev) => {
            const cleanCap = dev.capacity ? String(dev.capacity).replace(/gb/gi, '').trim() : '';
            const cleanCol = dev.color ? String(dev.color).trim().split(/\s+/)[0] : '';
            const specs = [cleanCap, cleanCol].filter(Boolean).join(' • ');

            return (
              <Card
                key={`mob-inv-${dev.id}`}
                variant="outlined"
                onClick={() => {
                  setSelectedDevice(dev);
                  setDrawerOpen(true);
                }}
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 1
                }}
              >
                {/* Top Row: Model, Specs & Status */}
                <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1 }}>
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography variant="subtitle2" fontWeight={800} noWrap>
                      {dev.model}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, flexWrap: 'wrap', mt: 0.2 }}>
                      {specs && (
                        <Typography variant="caption" color="text.secondary">
                          {specs}
                        </Typography>
                      )}
                      {dev.variant && <VariantBadge variant={dev.variant} size="small" />}
                    </Box>
                  </Box>
                  <StatusBadge status={dev.current_status} />
                </Box>

                {/* Mid Row: IMEI & Battery */}
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    p: 0.8,
                    borderRadius: 1.5,
                    bgcolor: (theme) =>
                      theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <CopyableText text={dev.imei} />
                  {dev.battery_health ? (
                    <Typography variant="caption" fontWeight={700} color="text.primary">
                      🔋 {dev.battery_health}% {dev.battery_cycle ? `(${dev.battery_cycle} CC)` : ''}
                    </Typography>
                  ) : null}
                </Box>

                {/* Bottom Row: Assigned Owner & Actions */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pt: 0.3 }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '0.68rem' }}>
                      Assigned to:
                    </Typography>
                    {dev.current_owner_name ? (
                      <Chip
                        size="small"
                        label={dev.current_owner_name}
                        variant="outlined"
                        sx={{ fontSize: '0.72rem', height: 20, textTransform: 'capitalize', fontWeight: 600 }}
                      />
                    ) : (
                      <Typography variant="caption" color="text.secondary" fontWeight={500}>
                        Unassigned
                      </Typography>
                    )}
                  </Box>

                  <Stack direction="row" spacing={0.5} onClick={(e) => e.stopPropagation()}>
                    <IconButton
                      size="small"
                      color="primary"
                      onClick={() => {
                        setEditDevice(dev);
                        setEditDialogOpen(true);
                      }}
                      sx={{ p: 0.5 }}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                </Box>
              </Card>
            );
          })
        )}
      </Box>

      {/* Inventory Desktop Table (md+) */}
      <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden', display: { xs: 'none', md: 'block' } }}>
        <TableContainer>
          <Table size="medium">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Device Model</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>IMEI Number</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Battery</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Assigned To</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>
                  <Tooltip
                    title={
                      assignedDateSort === 'desc'
                        ? 'Sorted by Assigned Date (Descending - Newest first). Click to sort Ascending.'
                        : assignedDateSort === 'asc'
                        ? 'Sorted by Assigned Date (Ascending - Oldest first). Click to reset.'
                        : 'Click to sort by Assigned Date (Descending order)'
                    }
                  >
                    <Box
                      component="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleAssignedDateSort();
                      }}
                      sx={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 0.5,
                        cursor: 'pointer',
                        background: assignedDateSort ? 'rgba(59, 130, 246, 0.08)' : 'none',
                        border: 'none',
                        p: 0,
                        font: 'inherit',
                        color: assignedDateSort ? 'primary.main' : 'inherit',
                        fontWeight: 700,
                        borderRadius: 1.5,
                        px: 0.75,
                        py: 0.4,
                        transition: 'all 0.15s ease-in-out',
                        '&:hover': {
                          bgcolor: (theme) =>
                            theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)',
                          color: 'primary.main'
                        }
                      }}
                    >
                      <span>Assigned Date</span>
                      {assignedDateSort === 'desc' ? (
                        <ArrowDownwardIcon sx={{ fontSize: 16, color: 'primary.main' }} />
                      ) : assignedDateSort === 'asc' ? (
                        <ArrowUpwardIcon sx={{ fontSize: 16, color: 'primary.main' }} />
                      ) : (
                        <SortIcon sx={{ fontSize: 16, color: 'text.secondary', opacity: 0.7 }} />
                      )}
                    </Box>
                  </Tooltip>
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                    <CircularProgress size={32} />
                  </TableCell>
                </TableRow>
              ) : filteredDevices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                    No devices match your current filters.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedDevices.map((dev) => {
                  const cleanCap = dev.capacity ? String(dev.capacity).replace(/gb/gi, '').trim() : '';
                  const cleanCol = dev.color ? String(dev.color).trim().split(/\s+/)[0] : '';
                  const specs = [cleanCap, cleanCol].filter(Boolean).join(' • ');

                  return (
                    <TableRow
                      key={dev.id}
                      hover
                      sx={{ cursor: 'pointer' }}
                      onClick={() => {
                        setSelectedDevice(dev);
                        setDrawerOpen(true);
                      }}
                    >
                      {/* Device Model & Specs with Inline Variant Chip */}
                      <TableCell>
                        <Typography variant="body2" fontWeight={700}>
                          {dev.model}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, flexWrap: 'wrap', mt: 0.3 }}>
                          {specs && (
                            <Typography variant="caption" color="text.secondary" fontWeight={500}>
                              {specs}
                            </Typography>
                          )}
                          {specs && dev.variant && (
                            <Typography variant="caption" color="text.secondary" sx={{ opacity: 0.5 }}>
                              •
                            </Typography>
                          )}
                          {dev.variant && <VariantBadge variant={dev.variant} size="small" />}
                        </Box>
                      </TableCell>

                    {/* IMEI / Serial */}
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <CopyableText text={dev.imei} />
                      {dev.serial_number && (
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.2 }}>
                          SN: {dev.serial_number}
                        </Typography>
                      )}
                    </TableCell>

                    {/* Status Badge */}
                    <TableCell>
                      <StatusBadge status={dev.current_status} />
                    </TableCell>

                    {/* Battery Health & Cycle Count */}
                    <TableCell>
                      {dev.battery_health ? (
                        <Box>
                          <Typography variant="body2" fontWeight={600}>
                            {dev.battery_health}%
                          </Typography>
                          {dev.battery_cycle && (
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{ display: 'block', fontWeight: 600, fontSize: '0.72rem', letterSpacing: 0.2 }}
                            >
                              CC {dev.battery_cycle}
                            </Typography>
                          )}
                        </Box>
                      ) : dev.battery_cycle ? (
                        <Typography
                          variant="body2"
                          fontWeight={600}
                          color="text.secondary"
                          sx={{ fontSize: '0.8rem' }}
                        >
                          CC {dev.battery_cycle}
                        </Typography>
                      ) : (
                        <Typography variant="caption" color="text.secondary">
                          —
                        </Typography>
                      )}
                    </TableCell>

                    {/* Assigned Owner */}
                    <TableCell>
                      {dev.current_owner_name ? (
                        <Chip
                          size="small"
                          label={dev.current_owner_name}
                          variant="outlined"
                          sx={{ fontSize: '0.75rem', textTransform: 'capitalize' }}
                        />
                      ) : (
                        <Typography variant="caption" color="text.secondary">
                          Unassigned
                        </Typography>
                      )}
                    </TableCell>

                    {/* Assigned Date */}
                    <TableCell>
                      {dev.current_owner_name ? (
                        <Typography variant="body2" fontWeight={600} color="text.primary">
                          {formatDate(getAssignedDate(dev))}
                        </Typography>
                      ) : (
                        <Typography variant="caption" color="text.secondary">
                          —
                        </Typography>
                      )}
                    </TableCell>

                    {/* Actions */}
                    <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                      <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                        <Tooltip title="View Details">
                          <IconButton
                            size="small"
                            onClick={() => {
                              setSelectedDevice(dev);
                              setDrawerOpen(true);
                            }}
                          >
                            <ViewIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Edit Device Specs">
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => {
                              setEditDevice(dev);
                              setEditDialogOpen(true);
                            }}
                          >
                            <EditIcon fontSize="small" />
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
          onPageChange={(e, newPage) => setPage(newPage)}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
        />
      </Paper>

      {/* Modals & Drawers */}
      <AddDeviceDialog
        open={addDeviceOpen}
        onClose={() => setAddDeviceOpen(false)}
        onDeviceCreated={() => fetchInventory()}
      />

      <EditDeviceDialog
        open={editDialogOpen}
        onClose={() => {
          setEditDialogOpen(false);
          setEditDevice(null);
        }}
        device={editDevice}
        onDeviceUpdated={() => fetchInventory()}
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
          fetchInventory();
        }}
        onEditRequested={(dev) => {
          setEditDevice(dev);
          setEditDialogOpen(true);
        }}
        onDeviceDeleted={() => fetchInventory()}
      />
    </Box>
  );
}
